import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, User, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);

    this.setState({
      error,
      errorInfo: errorInfo?.componentStack || null
    });

    this.logErrorToBackend(error, errorInfo?.componentStack);
  }

  async logErrorToBackend(error: Error, componentStack: string | null) {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase.rpc('log_frontend_error', {
          p_error_message: error.message,
          p_error_stack: error.stack || null,
          p_component_stack: componentStack,
          p_user_agent: navigator.userAgent,
          p_url: window.location.href
        }).catch(() => {
          console.warn('[ErrorBoundary] Failed to log error to backend (RPC may not exist)');
        });
      }
    } catch (e) {
      console.warn('[ErrorBoundary] Failed to log error to backend:', e);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoToProfile = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/profile';
  };

  handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      window.location.href = '/login';
    } catch (error) {
      console.error('[ErrorBoundary] Sign out failed:', error);
      window.location.href = '/login';
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 p-8 text-white">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle size={32} />
                <h1 className="text-2xl font-bold">Something Went Wrong</h1>
              </div>
              <p className="text-red-100">
                The application encountered an unexpected error
              </p>
            </div>

            <div className="p-8 space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">Error Details</h3>
                <p className="text-sm text-red-800 font-mono">
                  {this.state.error?.message || 'Unknown error'}
                </p>
              </div>

              {this.state.errorInfo && (
                <details className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <summary className="font-semibold text-slate-900 cursor-pointer">
                    Technical Details (for support)
                  </summary>
                  <pre className="mt-2 text-xs text-slate-700 overflow-auto max-h-48">
                    {this.state.errorInfo}
                  </pre>
                </details>
              )}

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Recovery Options</h3>

                <button
                  onClick={this.handleReload}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw size={20} />
                  Reload Application
                </button>

                <button
                  onClick={this.handleGoToProfile}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <User size={20} />
                  Go to Profile
                </button>

                <button
                  onClick={this.handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              </div>

              <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4">
                <p className="font-semibold mb-1">Need help?</p>
                <p>
                  If this error persists, please contact support with the error details above.
                  The error has been automatically logged for investigation.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
