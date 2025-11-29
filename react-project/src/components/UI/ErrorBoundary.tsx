import React, { Component, ErrorInfo, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Registra el error para diagnóstico
    console.error('ErrorBoundary capturó un error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded bg-red-50 text-red-700">
          Ha ocurrido un error inesperado. Por favor, recargue la página.
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;