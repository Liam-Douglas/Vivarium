import { Button } from './Button'

interface LoadErrorProps {
  /** What failed to load, in the keeper's words: "your animals", "feedings". */
  subject: string
  message: string | null
  onRetry: () => void
  /**
   * Rows from an earlier load are still on screen, so this is a warning above
   * them rather than the whole answer.
   */
  inline?: boolean
}

/**
 * A load that failed, said so.
 *
 * Every list screen has three outcomes — loading, failed, genuinely empty — and
 * the app used to render two, so a dropped packet reported that the collection
 * was empty. This is the third.
 */
export function LoadError({ subject, message, onRetry, inline = false }: LoadErrorProps) {
  if (inline) {
    return (
      <div
        className="rounded-xl px-4 py-3 mb-4 flex items-center gap-3"
        role="status"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-orange) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-orange) 30%, transparent)' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--color-orange)' }}>
            Showing what loaded earlier
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-label-2)' }}>
            {message ?? `Could not refresh ${subject}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-medium underline shrink-0"
          style={{ color: 'var(--color-orange)' }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="alert">
      <div className="text-5xl mb-4 opacity-60">⚠️</div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-label)' }}>
        Couldn't load {subject}
      </h3>
      {/* The message is shown rather than summarised: "failed to fetch" and
          "JWT expired" need different things from the keeper. */}
      <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--color-label-2)' }}>
        {message ?? 'Something went wrong. Your records are safe — this is a problem reading them.'}
      </p>
      <Button variant="secondary" onClick={onRetry}>Try again</Button>
    </div>
  )
}
