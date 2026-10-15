import { Icon } from '@/components/ui/icons'
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center min-h-dvh" style={{ backgroundColor: 'var(--color-bg)' }}>
          <Icon name="alert" size={48} strokeWidth={1.4} className="text-label-3 mb-3 mx-auto" />
          <h2 className="text-[20px] leading-[25px] font-bold mb-1 text-label">
            Something went wrong
          </h2>
          <p className="text-[15px] mb-5 text-label-2 max-w-xs">An unexpected error occurred.</p>
          {/* The raw message is for whoever reports the problem, not the
              headline: tucked under Details rather than shown as the answer. */}
          {this.state.error?.message && (
            <details className="mb-5 max-w-xs text-[13px] text-label-2">
              <summary className="cursor-pointer text-tint">Details</summary>
              <p className="mt-1.5 break-words font-mono">{this.state.error.message}</p>
            </details>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="min-h-11 px-5 rounded-xl text-[17px] font-semibold bg-tint text-on-tint active:opacity-70 transition-opacity"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
