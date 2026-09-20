// Every list screen has three outcomes and the app renders two of them: a
// failed load falls through to the empty state, so a dropped packet reports
// that the keeper has no animals. Naming the states in one place is what stops
// each page inventing its own answer — which is how two pages ended up
// rendering their hook's error and ten did not.

export type LoadState =
  /** First load, nothing to show yet. */
  | 'loading'
  /** Load failed and there is nothing on screen to fall back to. */
  | 'error'
  /** A refresh failed, but rows from a previous load are still good to show. */
  | 'stale'
  /** Load succeeded and returned nothing. */
  | 'empty'
  | 'ready'

export interface LoadInput {
  loading: boolean
  error: string | null
  /** Rows currently held, from this load or a previous one. */
  count: number
}

export function loadState({ loading, error, count }: LoadInput): LoadState {
  // A background refresh over rows already on screen is not a loading state.
  // Blanking a list to a spinner every time it refetches loses the keeper's
  // place for no information gained.
  if (loading && count === 0) return 'loading'
  if (error) return count > 0 ? 'stale' : 'error'
  if (loading) return 'ready'
  return count === 0 ? 'empty' : 'ready'
}

/** True when the screen has nothing to render but a message. */
export function isBlocking(state: LoadState): boolean {
  return state === 'loading' || state === 'error' || state === 'empty'
}
