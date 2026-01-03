'use client';

/**
 * Invoice View Component
 * Displays invoice data in a printable format
 * 
 * SECURITY: Read-only component, data is RLS-protected
 */

import { InvoiceData } from '@/lib/services/invoiceService';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface InvoiceViewProps {
  invoice: InvoiceData;
  onPrint?: () => void;
}

export function InvoiceView({ invoice, onPrint }: InvoiceViewProps) {
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto" id="invoice-content">
      {/* Print Button - Hidden when printing */}
      <div className="mb-6 print:hidden">
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Invoice
        </Button>
      </div>

      {/* Invoice Header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{invoice.business.name}</h1>
            {invoice.location.address && (
              <div className="mt-2 text-sm text-gray-600">
                <p>{invoice.location.address}</p>
                {invoice.location.city && (
                  <p>
                    {invoice.location.city}
                    {invoice.location.state && `, ${invoice.location.state}`}
                    {invoice.location.zip_code && ` ${invoice.location.zip_code}`}
                  </p>
                )}
                {invoice.location.country && <p>{invoice.location.country}</p>}
              </div>
            )}
            {invoice.business.tax_number_1 && (
              <p className="mt-2 text-sm text-gray-600">
                {invoice.business.tax_label_1 || 'Tax'}: {invoice.business.tax_number_1}
              </p>
            )}
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
            <p className="mt-2 text-sm text-gray-600">
              Invoice #: {invoice.transaction.invoice_no}
            </p>
            <p className="text-sm text-gray-600">
              Date: {formatDate(invoice.transaction.transaction_date)}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      {invoice.contact && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Bill To:</h3>
          <div className="text-sm text-gray-600">
            <p className="font-medium">{invoice.contact.name}</p>
            {invoice.contact.address && <p>{invoice.contact.address}</p>}
            {invoice.contact.email && <p>{invoice.contact.email}</p>}
            {invoice.contact.mobile && <p>{invoice.contact.mobile}</p>}
          </div>
        </div>
      )}

      {/* Items Table */}
      <div className="mb-6">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                #
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                Product
              </th>
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700">
                SKU
              </th>
              <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">
                Qty
              </th>
              <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">
                Unit Price
              </th>
              <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">
                Discount
              </th>
              <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">
                Tax
              </th>
              <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">
                  {index + 1}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900">
                  <div>
                    <div className="font-medium">{item.product_name}</div>
                    {item.variation_name && (
                      <div className="text-xs text-gray-500">{item.variation_name}</div>
                    )}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600 font-mono">
                  {item.variation_sku ? item.variation_sku : (item.product_sku || '-')}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-700">
                  {item.quantity} {item.unit_name}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-700">
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-700">
                  {item.line_discount_amount > 0 ? formatCurrency(item.line_discount_amount) : '-'}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-right text-gray-700">
                  {item.item_tax > 0 ? formatCurrency(item.item_tax) : '-'}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-right font-medium text-gray-900">
                  {formatCurrency(item.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex justify-end mb-6">
        <div className="w-64">
          <div className="border border-gray-300">
            <div className="flex justify-between px-4 py-2 border-b border-gray-300">
              <span className="text-sm font-medium text-gray-700">Subtotal:</span>
              <span className="text-sm text-gray-900">{formatCurrency(invoice.summary.subtotal)}</span>
            </div>
            {invoice.summary.total_discount > 0 && (
              <div className="flex justify-between px-4 py-2 border-b border-gray-300">
                <span className="text-sm font-medium text-gray-700">
                  Discount ({invoice.transaction.discount_type === 'percentage' ? '%' : 'Fixed'}):
                </span>
                <span className="text-sm text-gray-900">
                  -{formatCurrency(invoice.summary.total_discount)}
                </span>
              </div>
            )}
            {invoice.summary.total_tax > 0 && (
              <div className="flex justify-between px-4 py-2 border-b border-gray-300">
                <span className="text-sm font-medium text-gray-700">Tax:</span>
                <span className="text-sm text-gray-900">{formatCurrency(invoice.summary.total_tax)}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-2 bg-gray-100">
              <span className="text-base font-bold text-gray-900">Grand Total:</span>
              <span className="text-base font-bold text-gray-900">
                {formatCurrency(invoice.summary.grand_total)}
              </span>
            </div>
            {/* Payment Information - Accounting Standard */}
            {invoice.payments ? (
              <>
                <div className="flex justify-between px-4 py-2 border-t-2 border-gray-400">
                  <span className="text-sm font-semibold text-gray-700">Total Amount:</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(invoice.summary.grand_total)}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-2">
                  <span className="text-sm font-semibold text-gray-700">Amount Paid:</span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(invoice.payments.total_paid)}
                  </span>
                </div>
                {invoice.payments.credit_due > 0 && (
                  <div className="flex justify-between px-4 py-2 bg-red-50">
                    <span className="text-sm font-semibold text-gray-700">Amount Due:</span>
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(invoice.payments.credit_due)}
                    </span>
                  </div>
                )}
                {invoice.payments.extra_payments > 0 && (
                  <div className="flex justify-between px-4 py-2 bg-yellow-50">
                    <span className="text-sm font-medium text-gray-700">Extra Payment:</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {formatCurrency(invoice.payments.extra_payments)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              // If no payment data, show based on payment_status
              <div className="flex justify-between px-4 py-2 border-t-2 border-gray-400">
                <span className="text-sm font-semibold text-gray-700">Payment Status:</span>
                <span className={cn(
                  "text-sm font-semibold",
                  invoice.transaction.status === 'final' ? "text-green-600" : "text-yellow-600"
                )}>
                  {invoice.transaction.status === 'final' ? 'Paid' : 'Pending'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.transaction.additional_notes && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes:</h3>
          <p className="text-sm text-gray-600">{invoice.transaction.additional_notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-300 pt-4 text-center text-xs text-gray-500">
        <p>Thank you for your business!</p>
        <p className="mt-1">This is a computer-generated invoice.</p>
      </div>
    </div>
  );
}

