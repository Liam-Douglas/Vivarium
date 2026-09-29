// Build the app with placeholder credentials, then serve it.
//
// The placeholders are not a convenience: lib/supabase.ts throws at module
// scope without them, and Vite inlines them at build time, so a build with no
// values produces a bundle the bundler has stripped the whole app out of.
// scripts/check-bundle.mjs is the assertion that catches that; this is the
// other half, which is to always pass values.
import { spawn } from 'node:child_process'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseStub.mjs'

export const PORT = 4183
export const ORIGIN = `http://127.0.0.1:${PORT}`

function run(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    })
    let output = ''
    child.stdout.on('data', (d) => { output += d })
    child.stderr.on('data', (d) => { output += d })
    child.on('error', reject)
    child.on('close', (code) => code === 0
      ? resolve(output)
      : reject(new Error(`${command} ${args.join(' ')} failed:\n${output}`)))
  })
}

export async function build() {
  await run('npm', ['run', 'build'], {
    VITE_SUPABASE_URL: SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
  })
}

/** Serve dist/ and resolve once it answers. Returns a stop function. */
export async function serve() {
  const child = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  })
  let log = ''
  child.stdout.on('data', (d) => { log += d })
  child.stderr.on('data', (d) => { log += d })

  const stop = () => { try { child.kill('SIGTERM') } catch { /* already gone */ } }

  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`vite preview exited:\n${log}`)
    try {
      const res = await fetch(ORIGIN + '/', { signal: AbortSignal.timeout(500) })
      if (res.ok) return stop
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 100))
  }
  stop()
  throw new Error(`vite preview never answered on ${ORIGIN}:\n${log}`)
}
