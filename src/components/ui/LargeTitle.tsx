import { useEffect, useRef, useState, type ReactNode } from 'react'

interface LargeTitleProps {
  title: string
  subtitle?: ReactNode
  /** Bar buttons, top right: an Add button, a menu. */
  trailing?: ReactNode
}

/**
 * The iOS large title: 34pt, bold, at the top of a screen's content. On a
 * phone, once it scrolls out of view a compact bar fades in over the top of
 * the screen carrying the title at 17pt, on the translucent bar material, the
 * way a UINavigationBar collapses.
 */
export function LargeTitle({ title, subtitle, trailing }: LargeTitleProps) {
  const ref = useRef<HTMLHeadingElement>(null)
  const [compact, setCompact] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    // The title counts as gone once its baseline passes under the bar.
    const io = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), {
      rootMargin: '-52px 0px 0px 0px',
    })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <div
        aria-hidden="true"
        data-open={compact || undefined}
        className={`md:hidden fixed inset-x-0 top-0 z-20 pointer-events-none transition-opacity duration-200 ease-out ${compact ? 'opacity-100' : 'opacity-0'}`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="bar-material h-11 flex items-center justify-center px-16 border-b border-separator">
          <span className="text-[17px] font-semibold text-label truncate">{title}</span>
        </div>
      </div>

      <header className="flex items-end justify-between gap-3 pt-1 pb-4">
        <div className="min-w-0">
          <h1 ref={ref} className="text-[34px] leading-[41px] font-bold tracking-[0.01em] text-label">
            {title}
          </h1>
          {subtitle && <p className="text-[15px] text-label-2 mt-0.5">{subtitle}</p>}
        </div>
        {trailing && <div className="flex items-center gap-2 shrink-0 pb-1">{trailing}</div>}
      </header>
    </>
  )
}
