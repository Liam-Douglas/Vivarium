// A Supabase that answers from a fixture object instead of a database.
//
// Two halves. A seeded localStorage entry so AuthContext finds a session and
// stops at the app rather than the sign-in screen, and a route interceptor
// that answers every call to the placeholder project host.
//
// The app is otherwise untouched: this drives the real built bundle, the real
// contexts and the real queries. What is replaced is the network, which is the
// only part that needs credentials.

import { HOUSEHOLD_ID, USER_ID } from './fixtures.mjs'

/**
 * Must match the host built into the bundle: supabase-js derives its storage
 * key from the project ref, so `placeholder.supabase.co` means the session
 * lives under `sb-placeholder-auth-token`.
 */
export const SUPABASE_URL = 'https://placeholder.supabase.co'
export const SUPABASE_ANON_KEY = 'placeholder-anon-key-not-a-secret'
const STORAGE_KEY = 'sb-placeholder-auth-token'

const HOUSEHOLD_NAME = 'Fixture Household'

const USER = {
  id: USER_ID, aud: 'authenticated', role: 'authenticated',
  email: 'fixture@example.test', phone: '',
  email_confirmed_at: new Date(0).toISOString(),
  confirmed_at: new Date(0).toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Fixture Keeper' },
  identities: [],
  created_at: new Date(0).toISOString(), updated_at: new Date().toISOString(),
}

const session = () => ({
  access_token: 'fixture-access-token', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'fixture-refresh-token', user: USER,
})

/** Rows every scenario gets unless it says otherwise. */
function baseFixtures() {
  return {
    households: [{ id: HOUSEHOLD_ID, name: HOUSEHOLD_NAME, invite_code: 'FIXTURE' }],
    household_members: [{
      id: 'member-0001', household_id: HOUSEHOLD_ID, user_id: USER_ID,
      role: 'owner', status: 'active', joined_at: new Date(0).toISOString(),
      profiles: { full_name: 'Fixture Keeper', avatar_url: null },
    }],
    profiles: [{
      id: USER_ID, full_name: 'Fixture Keeper', avatar_url: null,
      subscription_tier: 'pro', created_at: new Date(0).toISOString(),
    }],
  }
}

/**
 * The RPCs the app calls on load. Anything not here answers with an empty
 * array, which is what PostgREST returns for a set-returning function with no
 * rows — and what the app already handles.
 */
function rpcResponses() {
  return {
    get_household_for_user: [{
      household_id: HOUSEHOLD_ID, role: 'owner', status: 'active',
      household_name: HOUSEHOLD_NAME, invite_code: 'FIXTURE',
    }],
    get_household_members: [],
    get_pending_requests: [],
  }
}

/**
 * Wire a Playwright context to the fixtures.
 *
 * `fixtures` is keyed by table name. A table with no entry answers `[]`, so a
 * scenario lists only what it is about — the dashboard reads nine tables and a
 * scenario about shed prediction should mention two of them.
 */
/**
 * Apply PostgREST's `order=` to the fixture rows.
 *
 * Without this a scenario has to supply rows in the order the query happens to
 * return them, which is a trap: weightLogs[0] is "the latest weight" only
 * because the query sorts descending, and a fixture listed oldest-first makes
 * the page show a fall in weight that never happened. That is a failure the
 * app could never produce, and the scenario would be debugging the harness.
 *
 * Only what the app actually uses: column, direction, and several keys as
 * tiebreakers. Nullslast and referenced-table ordering are not implemented —
 * nothing here asks for them, and guessing at them would be worse than the
 * error they would cause.
 */
function applyOrder(rows, search) {
  const spec = new URLSearchParams(search).get('order')
  if (!spec || !Array.isArray(rows)) return rows

  const keys = spec.split(',').map((part) => {
    const [column, ...flags] = part.split('.')
    return { column, desc: flags.includes('desc') }
  })

  return [...rows].sort((a, b) => {
    for (const { column, desc } of keys) {
      const left = a?.[column], right = b?.[column]
      if (left === right) continue
      // Nulls sort last ascending, which is Postgres's default.
      if (left == null) return 1
      if (right == null) return -1
      const cmp = left < right ? -1 : 1
      return desc ? -cmp : cmp
    }
    return 0
  })
}

export async function installSupabaseStub(context, fixtures = {}) {
  const tables = { ...baseFixtures(), ...fixtures }
  const rpcs = rpcResponses()

  // What was asked for, so a scenario that renders nothing can be diagnosed
  // without guessing which query came back empty.
  const requested = []

  await context.addInitScript(([key, value]) => {
    window.localStorage.setItem(key, value)
  }, [STORAGE_KEY, JSON.stringify(session())])

  await context.route('**placeholder.supabase.co/**', async (route) => {
    const { pathname, search } = new URL(route.request().url())
    requested.push(pathname)

    const json = (body) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
      headers: {
        'access-control-allow-origin': '*',
        // Not required — fetchAllRows pages by counting rows, not by reading
        // this — but supabase-js parses it for `count`, and a real .range()
        // response always carries one.
        'content-range': `0-${Math.max(0, (Array.isArray(body) ? body.length : 1) - 1)}/*`,
      },
    })

    if (pathname.startsWith('/auth/v1/user')) return json(USER)
    if (pathname.startsWith('/auth/v1/token')) return json(session())
    if (pathname.startsWith('/auth/v1/logout')) return json({})

    if (pathname.startsWith('/rest/v1/rpc/')) {
      return json(rpcs[pathname.slice('/rest/v1/rpc/'.length)] ?? [])
    }
    if (pathname.startsWith('/rest/v1/')) {
      const rows = applyOrder(tables[pathname.slice('/rest/v1/'.length)] ?? [], search)
      // .single() asks PostgREST for one object rather than an array, through
      // an Accept header. Answering with an array anyway hands the caller a
      // shape it does not expect — getAnimal would return a list where the page
      // reads `.name` — so the header is honoured here too. Filtering is not:
      // the stub answers from the fixture list, so a scenario that renders one
      // record should supply the one it means.
      const wantsObject = (route.request().headers()['accept'] ?? '')
        .includes('application/vnd.pgrst.object+json')
      if (!wantsObject) return json(rows)
      if (rows.length === 0) {
        // What PostgREST says when .single() matches nothing, and what the page
        // is written to handle — a missing record, not a broken request.
        return route.fulfill({
          status: 406,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: JSON.stringify({
            code: 'PGRST116', details: 'Results contain 0 rows', hint: null,
            message: 'JSON object requested, multiple (or no) rows returned',
          }),
        })
      }
      return json(rows[0])
    }

    // Storage, realtime over HTTP, anything else: an empty 200 rather than a
    // failure, so an unstubbed corner shows up as a missing element and not as
    // an unhandled rejection three layers away.
    return json({})
  })

  return { requested }
}
