import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const inputBase = `w-full rounded-xl px-4 py-2.5 text-sm border transition-colors duration-150 focus:outline-none`
const inputStyle = {
  backgroundColor: '#1a1a18',
  borderColor: 'rgba(255,255,255,0.1)',
  color: '#f0ece0',
}

export function Input({ label, error, hint, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" style={{ color: '#a8a090' }}>
          {label}
        </label>
      )}
      <input
        {...props}
        className={`${inputBase} ${error ? 'border-[#c45a5a]' : 'border-white/10'} focus:border-[#8fbe5a] ${className}`}
        style={{ ...inputStyle, ...props.style }}
      />
      {hint && !error && <p className="text-xs" style={{ color: '#6a6458' }}>{hint}</p>}
      {error && <p className="text-xs" style={{ color: '#c45a5a' }}>{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, hint, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" style={{ color: '#a8a090' }}>
          {label}
        </label>
      )}
      <textarea
        {...props}
        className={`${inputBase} resize-none ${error ? 'border-[#c45a5a]' : 'border-white/10'} focus:border-[#8fbe5a] ${className}`}
        style={{ ...inputStyle, ...props.style }}
        rows={props.rows ?? 3}
      />
      {hint && !error && <p className="text-xs" style={{ color: '#6a6458' }}>{hint}</p>}
      {error && <p className="text-xs" style={{ color: '#c45a5a' }}>{error}</p>}
    </div>
  )
}

interface SelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  children: React.ReactNode
}

export function Select({ label, error, hint, className = '', children, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium" style={{ color: '#a8a090' }}>
          {label}
        </label>
      )}
      <select
        {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
        className={`${inputBase} ${error ? 'border-[#c45a5a]' : 'border-white/10'} focus:border-[#8fbe5a] ${className}`}
        style={{ ...inputStyle, ...props.style }}
      >
        {children}
      </select>
      {hint && !error && <p className="text-xs" style={{ color: '#6a6458' }}>{hint}</p>}
      {error && <p className="text-xs" style={{ color: '#c45a5a' }}>{error}</p>}
    </div>
  )
}
