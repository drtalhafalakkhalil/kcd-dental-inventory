import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="mx-auto w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {this.props.fallbackTitle || "Something went wrong"}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              An unexpected error occurred while rendering this page. This is usually temporary.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button
                onClick={this.handleRetry}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
                data-testid="button-error-retry"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={this.handleReload}
                data-testid="button-error-reload"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
