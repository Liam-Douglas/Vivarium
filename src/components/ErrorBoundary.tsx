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
          <h2 className="text-[20px] font-semibold mb-2 text-label">
            Something went wrong
          </h2>
          <p className="text-[15px] mb-6 text-label-2">
            {this.state.error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="px-5 py-2.5 rounded-xl text-[15px] font-medium"
            style={{ backgroundColor: 'var(--color-tint)', color: 'var(--color-bg)' }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
