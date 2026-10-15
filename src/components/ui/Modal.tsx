import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useDragToDismiss } from '@/hooks/useDragToDismiss'

// Every logging action in this app happens in one of these, and until now the
// dialog was a plain div: no role, so nothing announced it as a dialog; no
// Escape, so the only way out was to hit a small close button or click exactly
// on the backdrop; and no focus management, so Tab walked straight out of the
// open dialog into the page behind it and left the caret somewhere arbitrary
// on close.

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ open, onClose, title, children, maxWidth = '480px' }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  // Held in a ref so an inline arrow from the caller does not re-run the effect
  // on every render, which would keep stealing focus back to the first field.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'

    const focusable = () =>
      Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      // Wrap at both ends so focus cannot leave the dialog.
      if (e.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    // After paint, so the panel's children exist to receive focus.
    const t = window.setTimeout(() => focusable()[0]?.focus(), 0)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(t)
      document.body.style.overflow = ''
      // Put the caret back where it was, so closing a dialog does not dump
      // keyboard users at the top of the page.
      previouslyFocused?.focus?.()
    }
  }, [open])

  // Stays mounted through its exit so it can leave the way it came. `shown`
  // flips a frame after mounting, which is what lets the entrance run.
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  if (open && !mounted) setMounted(true)

  // While it leaves, it keeps showing what it showed: callers often clear the
  // record that fills the dialog in the same breath as closing it, and the
  // panel would otherwise empty out on its way down.
  const [held, setHeld] = useState({ title, children })
  if (open && (held.title !== title || held.children !== children)) setHeld({ title, children })

  useEffect(() => {
    if (open) {
      let second = 0
      const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setShown(true)) })
      return () => { cancelAnimationFrame(first); cancelAnimationFrame(second) }
    }
    const hide = requestAnimationFrame(() => setShown(false))
    // Matches the 220ms exit in index.css, with room to finish.
    const unmount = window.setTimeout(() => setMounted(false), 260)
    return () => { cancelAnimationFrame(hide); window.clearTimeout(unmount) }
  }, [open])

  const drag = useDragToDismiss(panelRef, () => onCloseRef.current())

  if (!mounted) return null
  const isOpen = open && shown

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{
        // A tall form stops below the status bar rather than running under it.
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        pointerEvents: open ? undefined : 'none',
      }}
    >
      <div
        aria-hidden="true"
        data-open={isOpen || undefined}
        className="sheet-backdrop absolute inset-0"
        style={{ backgroundColor: 'var(--color-scrim)' }}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-open={isOpen || undefined}
        // Phone: an edge-to-edge bottom sheet, rounded at the top, padded
        // clear of the home indicator. From 640px: a centred dialog.
        className="sheet-panel relative w-full rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{
          backgroundColor: 'var(--color-surface)',
          maxWidth,
          maxHeight: 'calc(100dvh - 1rem - env(safe-area-inset-top, 0px))',
        }}
      >
        {/* Grab area: the grabber and the title row drag the sheet down. */}
        <div className="shrink-0 touch-none sm:touch-auto" {...drag}>
          <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
            <span className="w-9 h-1 rounded-full" style={{ backgroundColor: 'var(--color-fill-2)' }} />
          </div>
          {/* An iOS 17 sheet header: a bold title and a round gray close
              button, with no rule beneath. */}
          <div className="flex items-center justify-between gap-3 px-5 pt-2 pb-1 sm:pt-5">
            <h2 id={titleId} className="text-[20px] font-bold tracking-[0.01em] text-label">
              {open ? title : held.title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="tap-target shrink-0 w-[30px] h-[30px] rounded-full bg-fill text-label-2 flex items-center justify-center active:opacity-60 transition-opacity"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                <path strokeLinecap="round" d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>
        </div>
        <div
          className="px-5 pt-4 pb-6 overflow-y-auto overscroll-contain"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          {open ? children : held.children}
        </div>
      </div>
    </div>
  )
}
