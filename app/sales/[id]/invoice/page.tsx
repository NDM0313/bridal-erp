'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { InvoiceView } from '@/components/invoice/InvoiceView';
import { ReceiptView } from '@/components/receipt/ReceiptView';
import { generateInvoice } from '@/lib/services/invoiceService';
import type { InvoiceData } from '@/lib/services/invoiceService';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, FileText, Receipt } from 'lucide-react';

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = parseInt(params.id as string);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'invoice' | 'receipt'>('invoice');

  useEffect(() => {
    if (transactionId) {
      loadInvoice();
    }
  }, [transactionId]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await generateInvoice(transactionId);
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ModernDashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ModernDashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <ModernDashboardLayout>
        <div className="space-y-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg">
            {error || 'Invoice not found'}
          </div>
        </div>
      </ModernDashboardLayout>
    );
  }

  return (
    <ModernDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => router.back()} className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-100">Invoice #{invoice.transaction.invoice_no}</h1>
              <p className="mt-1 text-sm text-slate-400">
                {invoice.transaction.status === 'final' ? 'Finalized' : 'Draft'} -{' '}
                {formatDate(invoice.transaction.transaction_date)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'invoice' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('invoice')}
              className={viewMode === 'invoice' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}
            >
              <FileText className="h-4 w-4 mr-2" />
              Invoice
            </Button>
            <Button
              variant={viewMode === 'receipt' ? 'primary' : 'ghost'}
              onClick={() => setViewMode('receipt')}
              className={viewMode === 'receipt' ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Receipt
            </Button>
          </div>
        </div>

        {/* Invoice/Receipt View */}
        {viewMode === 'invoice' ? (
          <InvoiceView invoice={invoice} />
        ) : (
          <ReceiptView invoice={invoice} />
        )}
      </div>
    </ModernDashboardLayout>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

