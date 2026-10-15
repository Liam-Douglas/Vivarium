import type { CSSProperties } from 'react'

/**
 * The Recharts tooltip, as a popover: the raised surface, no outline, the
 * popover shadow. Shared so every chart in the app shows the same one.
 */
export const CHART_TOOLTIP: CSSProperties = {
  backgroundColor: 'var(--color-surface-2)',
  border: 'none',
  borderRadius: 10,
  color: 'var(--color-label)',
  boxShadow: 'var(--shadow-popover)',
}

export const CHART_TOOLTIP_LABEL: CSSProperties = { color: 'var(--color-label-2)', fontSize: 12 }
