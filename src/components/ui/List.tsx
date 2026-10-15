import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * An iOS inset grouped list: a section header in small caps, rows on a
 * rounded surface, inset separators between them, and an optional footer.
 */
export function ListSection({
  header,
  action,
  footer,
  prominent = false,
  children,
  className = '',
}: {
  header?: ReactNode
  /** A plain button at the right of the header, like "Select" or "See all". */
  action?: ReactNode
  footer?: ReactNode
  /** A bold title-size header, as on Things' Today, for a screen's own sections. */
  prominent?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      {(header || action) && (
        <div className={`flex items-end justify-between gap-3 pb-1.5 min-h-7 ${prominent ? 'px-1' : 'px-4'}`}>
          {header && (
            <h2 className={prominent ? 'text-[20px] leading-[25px] font-bold text-label' : 'text-[13px] font-semibold text-label-2'}>
              {header}
            </h2>
          )}
          {action}
        </div>
      )}
      <div className="rounded-xl bg-surface overflow-hidden">{children}</div>
      {footer && <p className="px-4 pt-1.5 text-[13px] text-label-2">{footer}</p>}
    </section>
  )
}

interface ListRowProps {
  children: ReactNode
  /** Leading element: an icon tile, an avatar. Moves the separator inset past it. */
  leading?: ReactNode
  trailing?: ReactNode
  /** A navigation row: draws a chevron and links. */
  to?: string
  onClick?: () => void
  className?: string
}

/**
 * One row. The separator above it is inset to start where the text does, as
 * in Settings, and is drawn by the row itself so a row that animates out
 * takes its line with it.
 */
export function ListRow({ children, leading, trailing, to, onClick, className = '' }: ListRowProps) {
  const inner = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="flex-1 min-w-0">{children}</span>
      {trailing && <span className="shrink-0 flex items-center gap-2">{trailing}</span>}
      {to && <Chevron />}
    </>
  )
  const cls = `list-row relative flex items-center gap-3 px-4 min-h-11 py-2.5 text-left w-full ${leading ? 'list-row-leading' : ''} ${to || onClick ? 'active:bg-fill transition-colors duration-150' : ''} ${className}`
  if (to) return <Link to={to} className={cls}>{inner}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>
  return <div className={cls}>{inner}</div>
}

export function Chevron() {
  return (
    <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth={2} className="shrink-0 text-label-3" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l6 6-6 6" />
    </svg>
  )
}
