'use client';

import React from 'react';
import { Calendar, User, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ProductionOrder } from '@/lib/types/modern-erp';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

interface ProductionOrderCardProps {
  order: ProductionOrder;
  onClick?: () => void;
}

export const ProductionOrderCard = ({ order, onClick }: ProductionOrderCardProps) => {
  const deadlineDate = order.deadline_date ? new Date(order.deadline_date) : null;
  const currentDate = new Date();
  const isDeadlineClose = deadlineDate
    ? differenceInDays(deadlineDate, currentDate) <= 3 && differenceInDays(deadlineDate, currentDate) >= 0
    : false;
  const isDeadlineOverdue = deadlineDate ? currentDate > deadlineDate : false;

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer transition-all hover:border-gray-600 hover:shadow-lg',
        onClick && 'hover:scale-[1.02]'
      )}
    >
      {/* Header: Design # */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Design #</p>
          <p className="text-sm font-bold text-white font-mono">{order.order_no}</p>
        </div>
        {isDeadlineOverdue && (
          <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-900/50 text-xs">
            <AlertCircle size={12} className="mr-1" />
            Overdue
          </Badge>
        )}
        {isDeadlineClose && !isDeadlineOverdue && (
          <Badge variant="outline" className="bg-yellow-900/20 text-yellow-400 border-yellow-900/50 text-xs">
            <AlertCircle size={12} className="mr-1" />
            Due Soon
          </Badge>
        )}
      </div>

      {/* Customer Name */}
      <div className="flex items-center gap-2 mb-3">
        <User size={14} className="text-gray-500" />
        <p className="text-sm text-gray-300">
          {order.customer?.name || 'No Customer'}
        </p>
      </div>

      {/* Deadline */}
      {deadlineDate && (
        <div className="flex items-center gap-2 mb-3">
          <Calendar
            size={14}
            className={cn(
              isDeadlineOverdue ? 'text-red-400' : isDeadlineClose ? 'text-yellow-400' : 'text-gray-500'
            )}
          />
          <p
            className={cn(
              'text-xs',
              isDeadlineOverdue
                ? 'text-red-400 font-semibold'
                : isDeadlineClose
                ? 'text-yellow-400 font-medium'
                : 'text-gray-400'
            )}
          >
            {format(deadlineDate, 'MMM dd, yyyy')}
            {isDeadlineOverdue && ` (${differenceInDays(currentDate, deadlineDate)} days late)`}
            {isDeadlineClose && !isDeadlineOverdue && ` (${differenceInDays(deadlineDate, currentDate)} days left)`}
          </p>
        </div>
      )}

      {/* Status Badge */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <Badge
          variant="outline"
          className={cn(
            'text-xs',
            order.status === 'new' && 'bg-gray-900/20 text-gray-400 border-gray-800',
            order.status === 'dyeing' && 'bg-blue-900/20 text-blue-400 border-blue-900/50',
            order.status === 'stitching' && 'bg-yellow-900/20 text-yellow-400 border-yellow-900/50',
            order.status === 'handwork' && 'bg-purple-900/20 text-purple-400 border-purple-900/50',
            order.status === 'completed' && 'bg-green-900/20 text-green-400 border-green-900/50',
            order.status === 'dispatched' && 'bg-indigo-900/20 text-indigo-400 border-indigo-900/50',
            order.status === 'cancelled' && 'bg-red-900/20 text-red-400 border-red-900/50'
          )}
        >
          {order.status === 'new' && 'Pending'}
          {order.status === 'dyeing' && 'In Dyeing'}
          {order.status === 'stitching' && 'In Stitching'}
          {order.status === 'handwork' && 'Handwork'}
          {order.status === 'completed' && 'Ready / QC'}
          {order.status === 'dispatched' && 'Dispatched'}
          {order.status === 'cancelled' && 'Cancelled'}
        </Badge>
      </div>
    </div>
  );
};

