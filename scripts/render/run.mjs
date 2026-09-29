#!/usr/bin/env node
// Render each scenario in a real browser and check what it says.
//
//   npm run render                   every scenario
//   npm run render -- dashboard      scenarios whose file name matches
//   npm run render -- --no-build     reuse the existing dist/
//   npm run render -- --shots        also write a png per scenario
//
// What this proves: that a screen, given known data, renders the text it
// should and leaves out the text it should not. What it does not prove is
// anything about real records — see docs/render-harness.md.
import { readdirSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import { findChromium } from './browser.mjs'
import { installSupabaseStub } from './supabaseStub.mjs'
import { build, serve, ORIGIN } from './server.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const SHOT_DIR = join(HERE, 'shots')

/** How long a screen gets to reach the state a scenario describes. */
const SETTLE_MS = 20000

/** How long any single Playwright action may block before the loop retries it. */
const ACTION_TIMEOUT_MS = 2000

const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const filters = args.filter((a) => !a.startsWith('--'))

async function loadScenarios() {
  const dir = join(HERE, 'scenarios')
  const files = readdirSync(dir).filter((f) => f.endsWith('.mjs')).sort()
  const chosen = filters.length === 0
    ? files
    : files.filter((f) => filters.some((needle) => f.includes(needle)))
  const loaded = await Promise.all(chosen.map(async (file) => {
    const mod = await import(pathToFileURL(join(dir, file)))
    return { file, ...mod.default }
  }))

  // A scenario with only `absent` expectations passes against a blank page:
  // the poll below stops the moment nothing fails, and nothing is present at
  // t=0. At least one `contains` is what forces the screen to actually render
  // before its absences mean anything.
  for (const s of loaded) {
    if ((s.expect?.contains ?? []).length === 0) {
      throw new Error(
        `${s.file}: needs at least one expect.contains. Without one the ` +
        `scenario passes against an empty page.`)
    }
  }
  return loaded
}

/**
 * Check rendered text against a scenario's expectations.
 *
 * `order` is the interesting one: a ranked list is the kind of thing that
 * passes a "contains" check while being in entirely the wrong order.
 */
function checkText(text, expect = {}) {
  const failures = []

  for (const needle of expect.contains ?? []) {
    if (!text.includes(needle)) failures.push(`missing: ${JSON.stringify(needle)}`)
  }
  for (const needle of expect.absent ?? []) {
    if (text.includes(needle)) failures.push(`should not be present: ${JSON.stringify(needle)}`)
  }

  const order = expect.order ?? []
  const positions = order.map((needle) => [needle, text.indexOf(needle)])
  for (const [needle, at] of positions) {
    if (at === -1) failures.push(`missing (ordered): ${JSON.stringify(needle)}`)
  }
  if (positions.every(([, at]) => at !== -1)) {
    for (let i = 1; i < positions.length; i++) {
      if (positions[i][1] < positions[i - 1][1]) {
        failures.push(
          `out of order: ${JSON.stringify(positions[i][0])} appears before ` +
          `${JSON.stringify(positions[i - 1][0])}`)
      }
    }
  }

  return failures
}

async function main() {
  const scenarios = await loadScenarios()
  if (scenarios.length === 0) {
    console.error(filters.length ? `No scenario matches ${filters.join(', ')}` : 'No scenarios found.')
    process.exit(1)
  }

  const executablePath = findChromium()

  if (!flags.has('--no-build')) {
    process.stdout.write('Building with placeholder credentials... ')
    await build()
    console.log('done')
  }

  const stop = await serve()
  const browser = await chromium.launch({ executablePath })
  if (flags.has('--shots')) mkdirSync(SHOT_DIR, { recursive: true })

  let failed = 0
  try {
    for (const scenario of scenarios) {
      const context = await browser.newContext({
        viewport: { width: 420, height: 1000 },
        deviceScaleFactor: 2,
      })
      // Playwright waits 30 seconds on an action by default, which is longer
      // than this runner's whole settle window: a click on a button React had
      // not yet wired up would block inside click() until after the deadline,
      // so the retry below never got a turn and the scenario failed having
      // made one attempt that was still in flight. Actions now give up quickly
      // and are retried by the loop, which is where the waiting belongs.
      context.setDefaultTimeout(ACTION_TIMEOUT_MS)
      const { requested } = await installSupabaseStub(context, scenario.fixtures ?? {})
      const page = await context.newPage()

      const pageErrors = []
      page.on('pageerror', (e) => pageErrors.push(e.message))

      await page.goto(ORIGIN + (scenario.path ?? '/'), { waitUntil: 'domcontentloaded' })

      // Retry the assertions rather than waiting for a moment and reading once.
      // The app has no single "ready" signal: it renders from eight or nine
      // queries that resolve independently, and AuthContext can drop back to
      // its splash mid-load — so any fixed wait is either flaky or slow, and a
      // wait on one anchor can catch the screen on its way through. Polling the
      // whole expectation set means the check passes as soon as the screen is
      // actually right, and a genuine failure still costs the full timeout once.
      const deadline = Date.now() + SETTLE_MS
      let text = ''
      let failures = []
      let actError = null
      for (let round = 0; ; round++) {
        // A scenario that needs the screen driven — a tab opened, a filter
        // chosen — says so with `act`. It is re-run about once a second for as
        // long as the expectations are failing, because Playwright will happily
        // click a button that React has rendered but not yet attached a handler
        // to, and that click goes nowhere. So `act` must be idempotent:
        // opening a tab or choosing a filter is, which is all it is for.
        //
        // Retried for the whole window rather than a few rounds at the start.
        // With a first-rounds-only cap this was flaky under load: eight
        // scenarios sharing one browser could push hydration past the last
        // attempt, and the remaining fifteen seconds then polled a page nobody
        // had clicked.
        if (scenario.act && round % 4 === 0) {
          await scenario.act(page).catch((e) => { actError = e.message })
        }
        text = await page.locator('body').innerText().catch(() => '')
        failures = checkText(text, scenario.expect)
        if (failures.length === 0 || Date.now() > deadline) break
        await page.waitForTimeout(250)
      }

      if (failures.length > 0 && scenario.act) {
        // An `act` scenario that fails usually failed to drive the screen, not
        // to render it, and the two look identical in the text dump.
        failures.push(`act: ${actError ? `last error: ${actError}` : 'ran without error'}`)
        failures.push(`url at failure: ${page.url()}`)
      }
      for (const message of pageErrors) failures.push(`page error: ${message}`)

      if (flags.has('--shots')) {
        await page.screenshot({
          path: join(SHOT_DIR, scenario.file.replace(/\.mjs$/, '.png')),
          fullPage: true,
        })
      }

      if (failures.length === 0) {
        console.log(`  ok    ${scenario.name}`)
      } else {
        failed++
        console.log(`  FAIL  ${scenario.name}`)
        for (const f of failures) console.log(`          ${f}`)
        console.log(`          tables read: ${[...new Set(requested)]
          .filter((p) => p.startsWith('/rest/v1/'))
          .map((p) => p.slice('/rest/v1/'.length)).join(', ') || '(none)'}`)
        console.log(`          rendered text:\n${text.split('\n')
          .filter(Boolean).map((l) => '            ' + l).join('\n') || '            (empty)'}`)
      }

      await context.close()
    }
  } finally {
    await browser.close()
    stop()
  }

  console.log(`\n${scenarios.length - failed}/${scenarios.length} scenarios passed.`)
  if (flags.has('--shots')) console.log(`Screenshots in ${SHOT_DIR}`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1) })
