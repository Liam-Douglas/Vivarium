import { Icon } from './icons'
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
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-orange) 12%, transparent)' }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium text-orange">
            Showing what loaded earlier
          </p>
          <p className="text-[13px] mt-0.5 text-label-2">
            {message ?? `Could not refresh ${subject}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="tap-target text-[15px] font-semibold text-tint shrink-0 active:opacity-60"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" role="alert">
      <Icon name="alert" size={48} strokeWidth={1.4} className="text-label-3 mb-3" />
      <h3 className="text-[20px] leading-[25px] font-bold mb-1 text-label">
        Couldn't load {subject}
      </h3>
      {/* The message is shown rather than summarised: "failed to fetch" and
          "JWT expired" need different things from the keeper. */}
      <p className="text-[15px] mb-5 max-w-xs text-label-2">
        {message ?? 'Something went wrong. Your records are safe — this is a problem reading them.'}
      </p>
      <Button variant="secondary" onClick={onRetry}>Try again</Button>
    </div>
  )
}
