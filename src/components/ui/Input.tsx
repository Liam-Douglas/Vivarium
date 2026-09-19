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

const inputBase = `w-full rounded-xl px-4 py-2.5 text-sm border transition-colors duration-150 focus:outline-none`
const inputStyle = {
  backgroundColor: '#1a1a18',
  borderColor: 'rgba(255,255,255,0.1)',
  color: '#f0ece0',
}

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
    <label htmlFor={htmlFor} className="text-sm font-medium" style={{ color: '#a8a090' }}>
      {children}
    </label>
  )
}

function Messages({ hintId, errorId, hint, error }: { hintId: string; errorId: string; hint?: string; error?: string }) {
  return (
    <>
      {hint && !error && <p id={hintId} className="text-xs" style={{ color: '#a8a090' }}>{hint}</p>}
      {/* role="alert" so a validation failure is announced when it appears. */}
      {error && <p id={errorId} role="alert" className="text-xs" style={{ color: '#c45a5a' }}>{error}</p>}
    </>
  )
}

export function Input({ label, error, hint, className = '', id, ...props }: InputProps) {
  const { fieldId, hintId, errorId, describedBy } = useField(id, error, hint)
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label htmlFor={fieldId}>{label}</Label>}
      <input
        {...props}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputBase} ${error ? 'border-[#c45a5a]' : 'border-white/10'} focus:border-[#8fbe5a] ${className}`}
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
        className={`${inputBase} resize-none ${error ? 'border-[#c45a5a]' : 'border-white/10'} focus:border-[#8fbe5a] ${className}`}
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
        className={`${inputBase} ${error ? 'border-[#c45a5a]' : 'border-white/10'} focus:border-[#8fbe5a] ${className}`}
        style={{ ...inputStyle, ...props.style }}
      >
        {children}
      </select>
      <Messages hintId={hintId} errorId={errorId} hint={hint} error={error} />
    </div>
  )
}
