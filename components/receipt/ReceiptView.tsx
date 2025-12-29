'use client';

/**
 * Receipt View Component
 * Thermal printer-friendly receipt layout
 * 
 * SECURITY: Read-only component, data is RLS-protected
 */

import { InvoiceData } from '@/lib/services/invoiceService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ReceiptViewProps {
  invoice: InvoiceData;
  onPrint?: () => void;
}

export function ReceiptView({ invoice, onPrint }: ReceiptViewProps) {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="bg-white p-4 max-w-sm mx-auto" id="receipt-content">
      {/* Print Button - Hidden when printing */}
      <div className="mb-4 print:hidden">
        <Button onClick={handlePrint} size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
      </div>

      {/* Receipt Content - Thermal-friendly layout */}
      <div className="text-center space-y-2 print:text-black">
        {/* Business Header */}
        <div className="border-b border-dashed border-gray-400 pb-2">
          <h1 className="text-lg font-bold uppercase">{invoice.business.name}</h1>
          {invoice.location.name && <p className="text-xs">{invoice.location.name}</p>}
          {invoice.location.address && <p className="text-xs">{invoice.location.address}</p>}
          {invoice.location.city && invoice.location.state && (
            <p className="text-xs">
              {invoice.location.city}, {invoice.location.state}
            </p>
          )}
          {invoice.business.tax_number_1 && (
            <p className="text-xs">
              {invoice.business.tax_label_1 || 'Tax'}: {invoice.business.tax_number_1}
            </p>
          )}
        </div>

        {/* Receipt Info */}
        <div className="border-b border-dashed border-gray-400 pb-2 text-xs">
          <p>Receipt #: {invoice.transaction.invoice_no}</p>
          <p>Date: {formatDate(invoice.transaction.transaction_date)}</p>
          {invoice.contact && <p>Customer: {invoice.contact.name}</p>}
        </div>

        {/* Items */}
        <div className="border-b border-dashed border-gray-400 pb-2">
          <div className="text-left text-xs space-y-1">
            {invoice.items.map((item, index) => (
              <div key={item.id} className="flex justify-between">
                <div className="flex-1">
                  <div className="font-medium">
                    {item.product_name}
                    {item.variation_name && ` - ${item.variation_name}`}
                  </div>
                  <div className="text-gray-600">
                    {item.quantity} {item.unit_name} @ {formatCurrency(item.unit_price)}
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="font-medium">{formatCurrency(item.line_total)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-b border-dashed border-gray-400 pb-2 text-xs">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(invoice.summary.subtotal)}</span>
          </div>
          {invoice.summary.total_discount > 0 && (
            <div className="flex justify-between">
              <span>Discount:</span>
              <span>-{formatCurrency(invoice.summary.total_discount)}</span>
            </div>
          )}
          {invoice.summary.total_tax > 0 && (
            <div className="flex justify-between">
              <span>Tax:</span>
              <span>{formatCurrency(invoice.summary.total_tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base mt-1">
            <span>TOTAL:</span>
            <span>{formatCurrency(invoice.summary.grand_total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-center space-y-1">
          <p>Thank you for your purchase!</p>
          <p className="text-gray-500">This is a computer-generated receipt.</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-content,
          #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            max-width: 80mm;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

