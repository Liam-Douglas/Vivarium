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
    const { pathname } = new URL(route.request().url())
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
      return json(tables[pathname.slice('/rest/v1/'.length)] ?? [])
    }

    // Storage, realtime over HTTP, anything else: an empty 200 rather than a
    // failure, so an unstubbed corner shows up as a missing element and not as
    // an unhandled rejection three layers away.
    return json({})
  })

  return { requested }
}
