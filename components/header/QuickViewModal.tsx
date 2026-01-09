/**
 * Quick View Modal
 * Shows demo data preview for search results
 */

'use client';

import React from 'react';
import { X, Package, FileText, Users, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface QuickViewData {
  type: 'product' | 'invoice' | 'customer' | 'supplier';
  title: string;
  subtitle: string;
  details: Record<string, string>;
}

interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: QuickViewData | null;
}

export function QuickViewModal({ isOpen, onClose, data }: QuickViewModalProps) {
  if (!data) return null;

  const getIcon = () => {
    switch (data.type) {
      case 'product':
        return <Package size={24} className="text-blue-400" />;
      case 'invoice':
        return <FileText size={24} className="text-green-400" />;
      case 'customer':
        return <Users size={24} className="text-purple-400" />;
      case 'supplier':
        return <TrendingUp size={24} className="text-orange-400" />;
    }
  };

  const getTypeColor = () => {
    switch (data.type) {
      case 'product':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'invoice':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'customer':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'supplier':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 rounded-lg shadow-xl max-w-lg w-full p-0 z-[9999]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {getIcon()}
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                {data.title}
              </DialogTitle>
              <p className="text-sm text-slate-400 mt-1">{data.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Demo Mode Badge */}
        <div className="px-6 pt-4">
          <Badge className={cn('border', getTypeColor())}>
            {data.type.toUpperCase()} - DEMO DATA
          </Badge>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          {Object.entries(data.details).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-sm text-slate-400 font-medium">{key}:</span>
              <span className="text-sm text-white font-semibold">{value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-800 bg-slate-800/30">
          <p className="text-xs text-slate-500">
            This is demo data. No actual database record exists.
          </p>
          <Button
            onClick={onClose}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

