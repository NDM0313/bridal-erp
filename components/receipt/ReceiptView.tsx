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
      <div className="text-center space-y-2 text-black">
        {/* Business Header */}
        <div className="border-b border-dashed border-gray-400 pb-2">
          <h1 className="text-lg font-bold uppercase text-black">{invoice.business.name}</h1>
          {invoice.location.name && <p className="text-xs text-black">{invoice.location.name}</p>}
          {invoice.location.address && <p className="text-xs text-black">{invoice.location.address}</p>}
          {invoice.location.city && invoice.location.state && (
            <p className="text-xs text-black">
              {invoice.location.city}, {invoice.location.state}
            </p>
          )}
          {invoice.business.tax_number_1 && (
            <p className="text-xs text-black">
              {invoice.business.tax_label_1 || 'Tax'}: {invoice.business.tax_number_1}
            </p>
          )}
        </div>

        {/* Receipt Info */}
        <div className="border-b border-dashed border-gray-400 pb-2 text-xs">
          <p className="text-black">Receipt #: {invoice.transaction.invoice_no}</p>
          <p className="text-black">Date: {formatDate(invoice.transaction.transaction_date)}</p>
          {invoice.contact && <p className="text-black">Customer: {invoice.contact.name}</p>}
        </div>

        {/* Items */}
        <div className="border-b border-dashed border-gray-400 pb-2">
          <div className="text-left text-xs space-y-1">
            {invoice.items.map((item, index) => (
              <div key={item.id} className="flex justify-between">
                <div className="flex-1">
                  <div className="font-medium text-black">
                    {item.product_name}
                    {item.variation_name && ` - ${item.variation_name}`}
                  </div>
                  <div className="text-black">
                    {item.quantity} {item.unit_name} @ {formatCurrency(item.unit_price)}
                  </div>
                </div>
                <div className="text-right ml-2">
                  <div className="font-medium text-black">{formatCurrency(item.line_total)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="border-b border-dashed border-gray-400 pb-2 text-xs">
          <div className="flex justify-between text-black">
            <span>Subtotal:</span>
            <span>{formatCurrency(invoice.summary.subtotal)}</span>
          </div>
          {invoice.summary.total_discount > 0 && (
            <div className="flex justify-between text-black">
              <span>Discount:</span>
              <span>-{formatCurrency(invoice.summary.total_discount)}</span>
            </div>
          )}
          {invoice.summary.total_tax > 0 && (
            <div className="flex justify-between text-black">
              <span>Tax:</span>
              <span>{formatCurrency(invoice.summary.total_tax)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base mt-1 text-black">
            <span>TOTAL:</span>
            <span>{formatCurrency(invoice.summary.grand_total)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-center space-y-1">
          <p className="text-black">Thank you for your purchase!</p>
          <p className="text-black">This is a computer-generated receipt.</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
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
            background: white !important;
            color: black !important;
          }
          #receipt-content * {
            color: black !important;
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
        @media screen {
          #receipt-content {
            background: white;
            color: black;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>
    </div>
  );
}

