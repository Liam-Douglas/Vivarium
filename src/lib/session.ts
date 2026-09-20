import { supabase } from './supabase'
import { clearDataCaches } from './caches'
import { signOutSequence, type SignOutResult } from './signOut'

/**
 * Sign out, and leave nothing of this household behind on the device.
 *
 * Sign-out used to be `supabase.auth.signOut()` alone, which clears the session
 * but not the service worker's copy of everything that session fetched, so the
 * cached records stayed readable on that device indefinitely.
 *
 * The ordering and the failure handling live in signOut.ts, where they can be
 * tested without a Supabase client. This binds them to the real one.
 */
export async function signOutAndClearCaches(): Promise<SignOutResult> {
  return signOutSequence({
    signOut: () => supabase.auth.signOut(),
    clearCaches: () => clearDataCaches(typeof caches !== 'undefined' ? caches : undefined),
  })
}
