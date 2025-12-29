/**
 * Error State Component
 * Displays user-friendly error messages
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  variant?: 'default' | 'banner' | 'inline';
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
  variant = 'default',
}: ErrorStateProps) {
  if (variant === 'banner') {
    return (
      <div className={cn(
        'bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg',
        className
      )}>
        <div className="flex items-center gap-2">
          <AlertCircle size={18} />
          <div className="flex-1">
            <p className="font-medium">{title}</p>
            <p className="text-sm opacity-90">{message}</p>
          </div>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            >
              <RefreshCw size={16} className="mr-2" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('text-rose-400 text-sm flex items-center gap-2', className)}>
        <AlertCircle size={16} />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 mb-4">
        <AlertCircle size={48} className="text-rose-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-slate-200 mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-slate-400 max-w-md mb-6">
        {message}
      </p>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="border-slate-700 hover:bg-slate-800 text-slate-300"
        >
          <RefreshCw size={16} className="mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

