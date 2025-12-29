/**
 * Empty State Component
 * Displays when no data is available
 */

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title = 'No data available',
  description = 'There is no data to display at this time.',
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-4 text-center',
      className
    )}>
      {Icon && (
        <div className="p-4 rounded-full bg-slate-900/50 border border-slate-800/50 mb-4">
          <Icon size={48} className="text-slate-500 opacity-50" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-slate-200 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-slate-400 max-w-md mb-6">
          {description}
        </p>
      )}

      {children}

      {action && (
        <Button
          onClick={action.onClick}
          className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

import { Package, ShoppingCart, BarChart3 } from 'lucide-react';

/**
 * Empty State for Products
 */
export function EmptyProducts({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={Package}
      title="No products found"
      description="Get started by adding your first product to the catalog."
      action={{
        label: 'Add Product',
        onClick: onCreate,
      }}
    />
  );
}

/**
 * Empty State for Sales
 */
export function EmptySales() {
  return (
    <EmptyState
      icon={ShoppingCart}
      title="No sales yet"
      description="Sales transactions will appear here once you start making sales."
    />
  );
}

/**
 * Empty State for Reports
 */
export function EmptyReports() {
  return (
    <EmptyState
      icon={BarChart3}
      title="No report data"
      description="Report data will be available once you have sales transactions."
    />
  );
}

