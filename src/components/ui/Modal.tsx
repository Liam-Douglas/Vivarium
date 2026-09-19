import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Button } from './Button'

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

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 flex flex-col"
        style={{ backgroundColor: '#2e2e2a', border: '1px solid rgba(255,255,255,0.08)', maxWidth, maxHeight: 'calc(100dvh - 2rem)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <h2 id={titleId} className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
