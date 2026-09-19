import type { ReactNode } from 'react'

/** The logo-over-card frame shared by the auth screens. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: '#1a1a18' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg" style={{ backgroundColor: '#8fbe5a', color: '#1a1a18' }}>
              V
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#f0ece0' }}>
              Vivarium
            </span>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
