import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

// Every control here gets an id and its label an htmlFor. Without that pairing
// the label is decoration: a screen reader announces an unlabelled field, and
// clicking the label does not focus the control. The hint and error are wired
// through aria-describedby for the same reason — they were visible but not
// announced, so the one piece of text explaining why a field was rejected went
// only to people who could see it.

interface FieldProps {
  label?: string
  error?: string
  hint?: string
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldProps
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
type SelectProps = InputHTMLAttributes<HTMLSelectElement> & FieldProps & { children: React.ReactNode }

// iOS fields: a gray fill, no border, 17px text at 44px tall. Focus and errors
// draw as a ring, so they show without shifting the layout.
const inputBase = `w-full rounded-[10px] px-3.5 py-2.5 min-h-11 text-[17px] bg-fill text-label placeholder:text-label-3 border-0 outline-none transition-shadow duration-150 focus:ring-2`
// No borderColor here: an inline style outranks every class, so it used to
// override the leaf focus border and the red error border, and a focused or
// rejected field looked exactly like an idle one.
const inputStyle = {}

/** Shared wiring: a stable id, and which message describes the control. */
function useField(id: string | undefined, error?: string, hint?: string) {
  const generated = useId()
  const fieldId = id ?? generated
  return {
    fieldId,
    hintId: `${fieldId}-hint`,
    errorId: `${fieldId}-error`,
    describedBy: error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined,
  }
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium text-label-2 px-1">
      {children}
    </label>
  )
}

function Messages({ hintId, errorId, hint, error }: { hintId: string; errorId: string; hint?: string; error?: string }) {
  return (
    <>
      {hint && !error && <p id={hintId} className="text-xs" style={{ color: 'var(--color-label-2)' }}>{hint}</p>}
      {/* role="alert" so a validation failure is announced when it appears. */}
      {error && <p id={errorId} role="alert" className="text-xs" style={{ color: 'var(--color-red)' }}>{error}</p>}
    </>
  )
}

export function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const { fieldId, hintId, errorId, describedBy } = useField(id, error, hint)
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <input
        // Number fields get the decimal keypad on phones (weights and money
        // take decimals) unless the caller asks for another.
        inputMode={props.type === 'number' ? 'decimal' : undefined}
        {...props}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputBase} ${error ? 'ring-2 ring-red focus:ring-red' : 'focus:ring-tint'} ${className}`}
        style={{ ...inputStyle, ...props.style }}
      />
      <Messages hintId={hintId} errorId={errorId} hint={hint} error={error} />
    </div>
  )
}

export function Textarea({ label, error, hint, className = '', id, ...props }: TextareaProps) {
  const { fieldId, hintId, errorId, describedBy } = useField(id, error, hint)
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <textarea
        {...props}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputBase} resize-none ${error ? 'ring-2 ring-red focus:ring-red' : 'focus:ring-tint'} ${className}`}
        style={{ ...inputStyle, ...props.style }}
        rows={props.rows ?? 3}
      />
      <Messages hintId={hintId} errorId={errorId} hint={hint} error={error} />
    </div>
  )
}

export function Select({ label, error, hint, className = '', children, id, ...props }: SelectProps) {
  const { fieldId, hintId, errorId, describedBy } = useField(id, error, hint)
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <select
        {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputBase} ${error ? 'ring-2 ring-red focus:ring-red' : 'focus:ring-tint'} ${className}`}
        style={{ ...inputStyle, ...props.style }}
      >
        {children}
      </select>
      <Messages hintId={hintId} errorId={errorId} hint={hint} error={error} />
    </div>
  )
}
