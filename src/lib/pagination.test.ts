import { describe, it, expect } from 'vitest'
import { fetchAllRows } from './pagination'

// A table of `total` rows, answering range requests the way PostgREST does.
function table(total: number) {
  const calls: Array<[number, number]> = []
  const page = (from: number, to: number) => {
    calls.push([from, to])
    const rows = Array.from(
      { length: Math.max(0, Math.min(to, total - 1) - from + 1) },
      (_, i) => ({ id: from + i })
    )
    return Promise.resolve({ data: rows, error: null })
  }
  return { page, calls }
}

describe('fetchAllRows', () => {
  it('returns a short table in one request', async () => {
    const { page, calls } = table(42)
    const rows = await fetchAllRows<{ id: number }>(page)
    expect(rows).toHaveLength(42)
    expect(calls).toEqual([[0, 999]])
  })

  it('keeps paging past the 1000-row cap', async () => {
    const { page, calls } = table(2500)
    const rows = await fetchAllRows<{ id: number }>(page)
    expect(rows).toHaveLength(2500)
    expect(rows[0].id).toBe(0)
    expect(rows[2499].id).toBe(2499)
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]])
  })

  it('stops on the empty page when the total is an exact multiple', async () => {
    // The dangerous case: a full final page looks identical to "more to come".
    const { page, calls } = table(2000)
    const rows = await fetchAllRows<{ id: number }>(page)
    expect(rows).toHaveLength(2000)
    expect(calls).toHaveLength(3)
  })

  it('returns nothing for an empty table, in one request', async () => {
    const { page, calls } = table(0)
    expect(await fetchAllRows(page)).toEqual([])
    expect(calls).toHaveLength(1)
  })

  it('surfaces an error instead of returning a partial set', async () => {
    let n = 0
    const page = (from: number, to: number) => {
      n++
      if (n === 2) return Promise.resolve({ data: null, error: { message: 'boom' } })
      return Promise.resolve({
        data: Array.from({ length: to - from + 1 }, (_, i) => ({ id: from + i })),
        error: null,
      })
    }
    await expect(fetchAllRows(page)).rejects.toMatchObject({ message: 'boom' })
  })

  it('refuses to spin forever if the set never narrows', async () => {
    // Always a full page — a filter that stopped narrowing would loop.
    const page = (from: number, to: number) =>
      Promise.resolve({ data: Array.from({ length: to - from + 1 }, (_, i) => ({ id: from + i })), error: null })
    await expect(fetchAllRows(page)).rejects.toThrow(/Refusing to read beyond/)
  })

  it('treats a null data payload as the end', async () => {
    const page = () => Promise.resolve({ data: null, error: null })
    expect(await fetchAllRows(page)).toEqual([])
  })
})
