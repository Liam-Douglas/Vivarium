import type { ReactNode } from 'react'
import { BrandMark } from '@/components/ui/BrandMark'

/** The logo-over-card frame shared by the auth screens. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="flex flex-col items-center gap-3">
            <BrandMark size="xl" />
            <span className="text-[28px] leading-[34px] font-bold text-label">
              Vivarium
            </span>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
