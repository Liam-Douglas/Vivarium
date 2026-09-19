// Browser storage that cannot take a screen down.
//
// localStorage throws on access in some privacy modes, and a value written by
// an older build — or corrupted by anything at all — will throw from
// JSON.parse. Both of those were happening inside render, where the only
// outcome is the error boundary replacing the page. Nothing kept here is
// important enough to be worth that: it is budgets and a target weight.

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw)
    return (parsed ?? fallback) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Private mode, or the quota is full. The in-memory value still stands for
    // this session; it just will not survive a reload.
    return false
  }
}

/** A finite number, or null. Rejects '', 'abc', 'NaN', Infinity and negatives. */
export function readPositiveNumber(key: string): number | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null || raw.trim() === '') return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Nothing to do; the caller has already dropped it from state.
  }
}
