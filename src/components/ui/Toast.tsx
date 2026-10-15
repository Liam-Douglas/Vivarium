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

  const colors = {
    success: 'var(--color-green)',
    error: 'var(--color-red)',
    info: 'var(--color-tint)',
  }

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-[opacity,transform] duration-300 ease-out ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full motion-reduce:translate-y-0'}`}
      style={{ backgroundColor: 'var(--color-surface-2)', border: `1px solid color-mix(in srgb, ${colors[toast.type]} 25%, transparent)` }}
    >
      <div aria-hidden="true" className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[toast.type] }} />
      <p className="flex-1 text-sm" style={{ color: 'var(--color-label)' }}>{toast.message}</p>
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onDismiss() }}
          className="tap-target text-xs font-medium shrink-0"
          style={{ color: 'var(--color-tint)' }}
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={onDismiss} aria-label="Dismiss" className="tap-target" style={{ color: 'var(--color-label-2)' }}>
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
