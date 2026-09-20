import { describe, it, expect, vi } from 'vitest'
import { signOutSequence } from './signOut'

describe('signOutSequence', () => {
  it('clears the caches after signing out, in that order', async () => {
    const order: string[] = []
    const result = await signOutSequence({
      signOut: async () => { order.push('signOut') },
      clearCaches: async () => { order.push('clear'); return 1 },
    })
    expect(order).toEqual(['signOut', 'clear'])
    expect(result).toEqual({ error: null, cachesCleared: 1 })
  })

  it('clears the caches even when the sign-out request fails', async () => {
    // A sign-out that never reached the server is a reason the local copy
    // matters more, not less.
    const clearCaches = vi.fn(async () => 2)
    const result = await signOutSequence({
      signOut: async () => { throw new Error('Failed to fetch') },
      clearCaches,
    })
    expect(clearCaches).toHaveBeenCalled()
    expect(result).toEqual({ error: 'Failed to fetch', cachesCleared: 2 })
  })

  it('reports a failure rather than throwing it', async () => {
    // The bug this covers: letting the rejection through a `finally` meant the
    // navigation after it never ran, stranding the keeper on the page they
    // were trying to leave.
    await expect(signOutSequence({
      signOut: async () => { throw new Error('offline') },
      clearCaches: async () => 0,
    })).resolves.toMatchObject({ error: 'offline' })
  })

  it('does not throw when clearing the caches fails', async () => {
    const result = await signOutSequence({
      signOut: async () => {},
      clearCaches: async () => { throw new Error('cache store denied') },
    })
    expect(result).toEqual({ error: null, cachesCleared: 0 })
  })

  it('handles a rejection that is not an Error', async () => {
    const result = await signOutSequence({
      signOut: async () => { throw { message: 'from supabase-js' } },
      clearCaches: async () => 0,
    })
    expect(result.error).toBe('from supabase-js')
  })
})
