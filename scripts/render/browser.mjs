// Finding a Chromium to drive, without downloading one.
//
// playwright-core rather than playwright: the full package's postinstall
// downloads browsers, which would add a few hundred megabytes to every
// `npm ci` in CI, including the jobs that never open a browser. This looks
// for a Chrome or Chromium that already exists instead — GitHub's runners
// ship Google Chrome, most developer machines have one, and $RENDER_CHROMIUM
// overrides all of it.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/** Playwright's own browser cache, when something has already populated it. */
function playwrightCached() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!root || !existsSync(root)) return []
  return readdirSync(root)
    .filter((d) => d.startsWith('chromium-'))
    .map((d) => join(root, d, 'chrome-linux', 'chrome'))
}

const CANDIDATES = [
  process.env.RENDER_CHROMIUM,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
]

export function findChromium() {
  for (const path of [...CANDIDATES, ...playwrightCached()]) {
    if (path && existsSync(path)) return path
  }
  throw new Error(
    'No Chrome or Chromium found. Install one, or point RENDER_CHROMIUM at it:\n' +
    '  RENDER_CHROMIUM=/path/to/chrome npm run render\n' +
    'Tried:\n' + CANDIDATES.filter(Boolean).map((p) => '  ' + p).join('\n')
  )
}
