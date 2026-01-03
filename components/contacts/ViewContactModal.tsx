/**
 * View Contact Details Modal
 * Shows detailed information about a contact
 */

'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Contact } from '@/components/rentals/QuickAddContactModal';

interface ContactWithBalance extends Contact {
  receivables?: number;
  payables?: number;
  balance?: number;
  status?: 'active' | 'inactive';
}

interface ViewContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: ContactWithBalance | null;
}

export function ViewContactModal({ isOpen, onClose, contact }: ViewContactModalProps) {
  if (!isOpen || !contact) return null;

  const initials = contact.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  const getTypeBadge = (type: Contact['type']) => {
    if (type === 'supplier') {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20">
          Supplier
        </Badge>
      );
    } else if (type === 'customer') {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
          Customer
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-gray-500/10 text-gray-400 border-gray-500/20">
          Both
        </Badge>
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-blue-600 text-white text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold text-white">{contact.name}</h2>
              <div className="mt-1">{getTypeBadge(contact.type)}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-800 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contact Information */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Mobile</p>
                <p className="text-white">{contact.mobile || '—'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Email</p>
                <p className="text-white">{contact.email || '—'}</p>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Financial Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Receivables</p>
                <p className={cn('text-xl font-bold', contact.receivables && contact.receivables > 0 ? 'text-yellow-400' : 'text-gray-500')}>
                  {contact.receivables && contact.receivables > 0 ? formatCurrency(contact.receivables) : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Payables</p>
                <p className={cn('text-xl font-bold', contact.payables && contact.payables > 0 ? 'text-red-400' : 'text-gray-500')}>
                  {contact.payables && contact.payables > 0 ? formatCurrency(contact.payables) : '—'}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Balance</p>
                <p className={cn('text-xl font-bold', contact.balance && contact.balance !== 0 ? (contact.balance > 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-500')}>
                  {contact.balance && contact.balance !== 0 ? formatCurrency(contact.balance) : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-gray-800/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
            <Badge variant="outline" className={cn(
              contact.status === 'active' 
                ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
            )}>
              {contact.status === 'active' ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 p-6 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

