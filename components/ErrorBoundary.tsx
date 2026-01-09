/**
 * Global Error Boundary Component
 * Purpose: Catch unhandled errors and prevent white screen crashes
 * Status: CRITICAL PRODUCTION REQUIREMENT
 * Date: January 8, 2026
 */

'use client';

import React from 'react';
import { AlertTriangle, Home, RotateCcw, Bug } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('🔥 ErrorBoundary caught error:', error);
    console.error('📍 Component stack:', errorInfo.componentStack);
    console.error('📊 Error name:', error.name);
    console.error('📝 Error message:', error.message);
    console.error('🔍 Stack trace:', error.stack);
    
    // Store error info in state
    this.setState({ errorInfo });
    
    // TODO: Send to error logging service (Sentry, LogRocket, etc.)
    // Example:
    // logErrorToService({
    //   error,
    //   errorInfo,
    //   timestamp: new Date().toISOString(),
    //   userAgent: navigator.userAgent,
    //   url: window.location.href,
    // });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
    
    // Navigate to dashboard
    window.location.href = '/dashboard';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8">
          <div className="max-w-2xl w-full">
            {/* Error Card */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-8 shadow-2xl">
              
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <AlertTriangle size={32} className="text-red-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Something went wrong
                  </h1>
                  <p className="text-slate-400 text-sm mt-1">
                    An unexpected error occurred in the application
                  </p>
                </div>
              </div>

              {/* Error Message */}
              <div className="bg-slate-800 rounded-lg p-4 mb-6 border border-slate-700">
                <p className="text-red-400 font-mono text-sm break-words">
                  {this.state.error?.message || 'An unexpected error occurred'}
                </p>
              </div>

              {/* Error Details (Development Only) */}
              {isDevelopment && this.state.errorInfo && (
                <details className="mb-6 group">
                  <summary className="text-slate-400 cursor-pointer hover:text-white transition-colors flex items-center gap-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-indigo-500">
                    <Bug size={16} />
                    <span className="font-medium">Show error details</span>
                    <span className="text-xs text-slate-500 ml-auto">(development only)</span>
                  </summary>
                  <div className="mt-4 space-y-4">
                    {/* Error Stack */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-2">Error Stack:</h3>
                      <pre className="bg-slate-800 rounded-lg p-4 text-xs overflow-x-auto border border-slate-700">
                        <code className="text-red-300">{this.state.error?.stack}</code>
                      </pre>
                    </div>
                    
                    {/* Component Stack */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-2">Component Stack:</h3>
                      <pre className="bg-slate-800 rounded-lg p-4 text-xs overflow-x-auto border border-slate-700">
                        <code className="text-yellow-300">{this.state.errorInfo.componentStack}</code>
                      </pre>
                    </div>
                  </div>
                </details>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={this.handleReset}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2"
                >
                  <Home size={16} />
                  Return to Dashboard
                </Button>
                
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="border-slate-700 hover:bg-slate-800 text-white flex items-center gap-2"
                >
                  <RotateCcw size={16} />
                  Reload Page
                </Button>
              </div>

              {/* Help Text */}
              <div className="mt-6 pt-6 border-t border-slate-800">
                <p className="text-slate-400 text-sm">
                  {isDevelopment ? (
                    <>
                      💡 <strong>Development Mode:</strong> Check the console for detailed error logs.
                    </>
                  ) : (
                    <>
                      If this problem persists, please contact support with the error message above.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Production Hint */}
            {!isDevelopment && (
              <div className="mt-4 text-center">
                <p className="text-slate-500 text-sm">
                  Error ID: {Date.now().toString(36).toUpperCase()}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

