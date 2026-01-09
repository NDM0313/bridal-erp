'use client';

import { AlertTriangle, RefreshCw, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase/client';

export function SupabaseConnectionError() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking');

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      const { error } = await supabase.from('products').select('count').limit(1);
      if (error) {
        setConnectionStatus('failed');
      } else {
        setConnectionStatus('connected');
      }
    } catch (err) {
      setConnectionStatus('failed');
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    await checkConnection();
    setIsRetrying(false);
    
    if (connectionStatus === 'connected') {
      window.location.reload();
    }
  };

  if (connectionStatus === 'checking') {
    return null; // Don't show anything while checking
  }

  if (connectionStatus === 'connected') {
    return null; // Connection is good
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0f172a] border-2 border-red-500/50 rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle size={40} className="text-red-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-white text-center mb-3">
          Database Connection Failed
        </h2>
        <p className="text-gray-400 text-center mb-8">
          Unable to connect to Supabase database. Please follow the steps below to fix this.
        </p>

        {/* Steps */}
        <div className="space-y-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                1
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Create .env.local File</h3>
                <p className="text-sm text-gray-400 mb-2">
                  Create a file named <code className="bg-slate-900 px-2 py-0.5 rounded text-indigo-400">.env.local</code> in the <code className="bg-slate-900 px-2 py-0.5 rounded text-indigo-400">my-pos-system</code> folder
                </p>
                <code className="block bg-slate-900 p-2 rounded text-xs text-gray-300">
                  cd my-pos-system<br/>
                  type nul &gt; .env.local &nbsp;&nbsp;<span className="text-gray-500"># Windows</span><br/>
                  touch .env.local &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-gray-500"># Mac/Linux</span>
                </code>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                2
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Get Supabase Credentials</h3>
                <p className="text-sm text-gray-400 mb-2">
                  Go to Supabase Dashboard → Settings → API
                </p>
                <a
                  href="https://app.supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <ExternalLink size={14} />
                  Open Supabase Dashboard
                </a>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                3
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Add to .env.local</h3>
                <p className="text-sm text-gray-400 mb-2">
                  Copy your URL and anon key:
                </p>
                <code className="block bg-slate-900 p-2 rounded text-xs text-gray-300">
                  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co<br/>
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
                </code>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white">
                4
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold mb-1">Restart Server</h3>
                <p className="text-sm text-gray-400 mb-2">
                  Stop the dev server (Ctrl+C) and restart:
                </p>
                <code className="block bg-slate-900 p-2 rounded text-xs text-gray-300">
                  npm run dev
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRetrying ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Checking Connection...
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                Retry Connection
              </>
            )}
          </button>
          <a
            href="/SUPABASE_SETUP.md"
            target="_blank"
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink size={18} />
            View Full Guide
          </a>
        </div>

        {/* Status Indicators */}
        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Connection Status:</span>
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-red-400" />
              <span className="text-red-400 font-semibold">Offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

