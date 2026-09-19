// PostgREST caps a response at db.max_rows — 1000 on hosted Supabase — and
// returns the truncated set with no error, so a query whose answer must be
// complete has to page. Anything user-facing that only wants recent rows should
// take an explicit limit instead of calling this: paging a decade of history to
// render a dashboard would trade one silent bug for a slow screen.

export const PAGE_SIZE = 1000
// Refuse to spin forever if a filter ever stops narrowing the set.
export const MAX_PAGES = 200

export type PageResult<T> = { data: T[] | null; error: { message: string } | null }

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const all: T[] = []
  for (let i = 0; i < MAX_PAGES; i++) {
    const from = i * PAGE_SIZE
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return all
  }
  throw new Error(`Refusing to read beyond ${MAX_PAGES * PAGE_SIZE} rows`)
}
