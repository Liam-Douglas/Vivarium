import { Icon } from './icons'
import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from 'react'

interface ToastItem {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  action?: { label: string; onClick: () => void }
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastItem['type'], action?: ToastItem['action']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, type: ToastItem['type'] = 'info', action?: ToastItem['action']) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type, action }])
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* A live region: without one, "Feeding logged" and "Export failed" are
          shown and never announced, so the only confirmation an action worked
          goes to people who can see it. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-above-nav sm:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 w-full max-w-sm px-4"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

/** How long a toast stays, and how long it takes to leave. */
const SHOW_MS = 4000
const LEAVE_MS = 300

/**
 * Each toast owns its lifetime: it rises in from the bottom edge, stays, and
 * leaves down the same edge before it is removed. It used to be removed
 * outright, so it vanished mid-sentence; dismissing early takes the same path.
 */
function ToastItem({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    let second = 0
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setVisible(true)) })
    const stay = window.setTimeout(() => setLeaving(true), SHOW_MS)
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); window.clearTimeout(stay) }
  }, [])

  useEffect(() => {
    if (!leaving) return
    const t = window.setTimeout(onRemove, LEAVE_MS)
    return () => window.clearTimeout(t)
  }, [leaving, onRemove])

  const onDismiss = () => setLeaving(true)
  const shown = visible && !leaving

  const tone = {
    success: { color: 'var(--color-green)', icon: 'check' as const },
    error: { color: 'var(--color-red)', icon: 'alert' as const },
    info: { color: 'var(--color-tint)', icon: 'bell' as const },
  }[toast.type]

  // A banner as iOS draws its own notices: nearly opaque over a blur so what
  // passes beneath never muddies it, soft-shadowed, its kind told by a small
  // coloured glyph.
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`bg-surface-2/95 backdrop-blur-xl flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-[opacity,transform] duration-300 ease-drawer ${shown ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-full scale-95 motion-reduce:translate-y-0 motion-reduce:scale-100'}`}
    >
      <span aria-hidden="true" className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0" style={{ backgroundColor: tone.color }}>
        <Icon name={tone.icon} size={16} strokeWidth={2.4} />
      </span>
      <p className="flex-1 text-[15px] text-label">{toast.message}</p>
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onDismiss() }}
          className="tap-target text-[15px] font-semibold text-tint shrink-0 active:opacity-60"
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={onDismiss} aria-label="Dismiss" className="tap-target w-8 h-8 rounded-full flex items-center justify-center text-label-2 active:bg-fill">
        <Icon name="x" size={16} strokeWidth={2.2} />
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
