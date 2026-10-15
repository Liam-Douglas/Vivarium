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
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000)
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
          <ToastItem key={toast.id} toast={toast} onDismiss={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const colors = {
    success: 'var(--color-fern-green)',
    error: 'var(--color-clay-red)',
    info: 'var(--color-leaf)',
  }

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
      style={{ backgroundColor: 'var(--color-moss-stone)', border: `1px solid color-mix(in srgb, ${colors[toast.type]} 25%, transparent)` }}
    >
      <div aria-hidden="true" className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[toast.type] }} />
      <p className="flex-1 text-sm" style={{ color: 'var(--color-parchment)' }}>{toast.message}</p>
      {toast.action && (
        <button
          onClick={() => { toast.action!.onClick(); onDismiss() }}
          className="tap-target text-xs font-medium shrink-0"
          style={{ color: 'var(--color-leaf)' }}
        >
          {toast.action.label}
        </button>
      )}
      <button onClick={onDismiss} aria-label="Dismiss" className="tap-target" style={{ color: 'var(--color-sand)' }}>
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
