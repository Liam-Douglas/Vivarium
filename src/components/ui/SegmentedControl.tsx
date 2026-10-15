import { useId } from 'react'
import { motion } from 'motion/react'
import { SPRING_SELECTION } from '@/lib/motion'

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  /** Names the control for screen readers: "View", "Chart". */
  label: string
  className?: string
}

/**
 * The iOS segmented control: a gray track with the selected segment raised
 * on it. The raised piece slides to the new segment on a critically damped
 * spring rather than jumping, the same spring as every other selection, so the change reads as one control moving.
 */
export function SegmentedControl<T extends string>({ options, value, onChange, label, className = '' }: SegmentedControlProps<T>) {
  const id = useId()
  return (
    <div role="group" aria-label={label} className={`flex p-0.5 rounded-[9px] bg-fill ${className}`}>
      {options.map((o) => {
        const selected = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(o.value)}
            className="relative flex-1 min-h-8 pointer-coarse:min-h-9 px-3 text-[13px] font-semibold text-label rounded-[7px] select-none"
          >
            {selected && (
              <motion.span
                layoutId={`segment-${id}`}
                className="absolute inset-0 rounded-[7px] bg-segment shadow-[0_3px_8px_rgba(0,0,0,0.12),0_3px_1px_rgba(0,0,0,0.04)]"
                transition={SPRING_SELECTION}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
