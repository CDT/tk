import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application startup failed.', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="startup-error" role="alert">
        <div className="startup-error-card">
          <p className="section-label">Connection error</p>
          <h1>Could not load study cards</h1>
          <p>{this.state.error.message}</p>
        </div>
      </main>
    )
  }
}
