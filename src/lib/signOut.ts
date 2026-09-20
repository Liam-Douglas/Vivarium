// The order and the failure handling of signing out, separated from the
// Supabase client so both can be tested. session.ts binds this to the real
// client; importing that module in a test throws, because it needs environment
// variables the test runner has no business holding.

export interface SignOutResult {
  /** The sign-out request's failure, or null when it succeeded. */
  error: string | null
  /** How many data caches were dropped. */
  cachesCleared: number
}

/**
 * Sign out, then clear the caches — in that order, and clear them either way.
 *
 * Never rejects. Sign-out is the one action whose whole point is to leave, so a
 * failed request must not strand the caller: an earlier version let the
 * rejection propagate through a `finally`, which meant the navigation after it
 * never ran and the keeper stayed on the settings page with no message.
 *
 * The caches are cleared even when the request fails, because a sign-out that
 * did not reach the server is a reason the local copy matters more, not less.
 */
export async function signOutSequence(steps: {
  signOut: () => Promise<unknown>
  clearCaches: () => Promise<number>
}): Promise<SignOutResult> {
  let error: string | null = null
  try {
    await steps.signOut()
  } catch (e) {
    error = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Sign out failed'
  }

  let cachesCleared = 0
  try {
    cachesCleared = await steps.clearCaches()
  } catch {
    // clearDataCaches already swallows its own failures; this is belt and
    // braces so nothing about leaving can throw.
  }

  return { error, cachesCleared }
}
