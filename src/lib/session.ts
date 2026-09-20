import { supabase } from './supabase'
import { clearDataCaches } from './caches'

/**
 * Sign out, and leave nothing of this household behind on the device.
 *
 * Sign-out used to be `supabase.auth.signOut()` alone, which clears the session
 * but not the service worker's copy of everything that session fetched. The
 * cached records stayed readable on that device indefinitely.
 *
 * The cache is cleared whether or not the sign-out request succeeds: a network
 * failure is a reason the local data matters more, not less.
 */
export async function signOutAndClearCaches(): Promise<void> {
  try {
    await supabase.auth.signOut()
  } finally {
    await clearDataCaches(typeof caches !== 'undefined' ? caches : undefined)
  }
}
