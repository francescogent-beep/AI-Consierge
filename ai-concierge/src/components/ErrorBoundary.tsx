import * as React from 'react';
import { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: string | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorInfo: error.message };
  }

  render() {
    if (this.state.hasError) {
      let displayMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.errorInfo || '{}');
        if (parsed.error) displayMessage = `Permission Error: ${parsed.error}`;
      } catch {
        displayMessage = this.state.errorInfo || displayMessage;
      }

      return (
        <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Application Error</h2>
          <p className="text-red-600 mb-6 max-w-md">{displayMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
