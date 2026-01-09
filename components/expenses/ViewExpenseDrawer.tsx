'use client';

import { useState } from 'react';
import { 
  X, Edit, Trash2, Download, Eye, Calendar, DollarSign,
  FileText, CreditCard, Building2, Tag, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter 
} from '@/components/ui/Sheet';
import { toast } from 'sonner';
import { supabase } from '@/utils/supabase/client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Expense {
  id: number;
  expenseNumber?: string;
  transaction_date: string;
  ref_no?: string;
  additional_notes?: string;
  final_total: number;
  total_before_tax?: number;
  tax_amount?: number;
  payment_status: 'paid' | 'partial' | 'due';
  expense_category_id?: number;
  expense_sub_category_id?: number;
  category_name?: string;
  sub_category_name?: string;
  vendor_name?: string;
  contact_id?: number;
  payment_method?: string;
  attachment_url?: string;
}

interface ViewExpenseDrawerProps {
  expense: Expense | null;
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
}

const statusBadges = {
  paid: 'bg-green-500/10 text-green-400 border-green-500/20',
  pending: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  partial: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  due: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function ViewExpenseDrawer({ expense, open, onClose, onDelete }: ViewExpenseDrawerProps) {
  const [deleting, setDeleting] = useState(false);

  if (!expense) return null;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', expense.id);

      if (error) throw error;

      toast.success('Expense deleted successfully');
      onDelete();
    } catch (error: any) {
      console.error('Failed to delete expense:', error);
      toast.error(error.message || 'Failed to delete expense');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[600px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Expense Details</SheetTitle>
            <Badge
              className={cn(
                "px-3 py-1 rounded text-sm font-medium border",
                statusBadges[expense.payment_status] || statusBadges.due
              )}
            >
              {expense.payment_status}
            </Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Expense Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <FileText size={20} />
              Expense Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400 text-xs mb-1">Expense Number</Label>
                <p className="text-slate-200 font-medium">
                  {expense.expenseNumber || `EXP-${expense.id}`}
                </p>
              </div>

              <div>
                <Label className="text-slate-400 text-xs mb-1">Date</Label>
                <p className="text-slate-200">
                  {format(new Date(expense.transaction_date), 'dd MMM, yyyy')}
                </p>
              </div>

              <div>
                <Label className="text-slate-400 text-xs mb-1">Category</Label>
                <p className="text-slate-200">
                  {expense.category_name || 'Uncategorized'}
                </p>
              </div>

              {expense.sub_category_name && (
                <div>
                  <Label className="text-slate-400 text-xs mb-1">Sub-Category</Label>
                  <p className="text-slate-200">{expense.sub_category_name}</p>
                </div>
              )}

              {expense.vendor_name && (
                <div>
                  <Label className="text-slate-400 text-xs mb-1">Vendor</Label>
                  <p className="text-slate-200">{expense.vendor_name}</p>
                </div>
              )}

              <div>
                <Label className="text-slate-400 text-xs mb-1">Reference</Label>
                <p className="text-slate-200">{expense.ref_no || '-'}</p>
              </div>
            </div>

            {expense.additional_notes && (
              <div>
                <Label className="text-slate-400 text-xs mb-1">Description</Label>
                <p className="text-slate-200">{expense.additional_notes}</p>
              </div>
            )}
          </div>

          {/* Amount Breakdown */}
          <div className="space-y-4 border-t border-slate-800 pt-6">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <DollarSign size={20} />
              Amount Breakdown
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Amount</span>
                <span className="text-slate-200">
                  PKR {Number(expense.total_before_tax || expense.final_total).toLocaleString()}
                </span>
              </div>
              {expense.tax_amount && expense.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Tax</span>
                  <span className="text-slate-200">
                    PKR {Number(expense.tax_amount).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-200 font-semibold">Total</span>
                <span className="text-slate-100 font-bold text-lg">
                  PKR {Number(expense.final_total).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="space-y-4 border-t border-slate-800 pt-6">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <CreditCard size={20} />
              Payment Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400 text-xs mb-1">Payment Status</Label>
                <Badge
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium border",
                    statusBadges[expense.payment_status] || statusBadges.due
                  )}
                >
                  {expense.payment_status}
                </Badge>
              </div>

              {expense.payment_method && (
                <div>
                  <Label className="text-slate-400 text-xs mb-1">Payment Method</Label>
                  <p className="text-slate-200 capitalize">{expense.payment_method}</p>
                </div>
              )}
            </div>
          </div>

          {/* Receipt */}
          {expense.attachment_url && (
            <div className="space-y-4 border-t border-slate-800 pt-6">
              <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Receipt size={20} />
                Receipt
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(expense.attachment_url, '_blank')}
                  className="bg-slate-900 border-slate-800 text-slate-200"
                >
                  <Eye size={16} className="mr-2" />
                  View
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = expense.attachment_url!;
                    link.download = `expense-receipt-${expense.id}.pdf`;
                    link.click();
                  }}
                  className="bg-slate-900 border-slate-800 text-slate-200"
                >
                  <Download size={16} className="mr-2" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="sticky bottom-0 bg-slate-950 border-t border-slate-800">
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/30"
            >
              <Trash2 size={18} className="mr-2" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
            >
              Close
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

