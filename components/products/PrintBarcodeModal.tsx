/**
 * PrintBarcodeModal Component
 * Modal for printing product barcodes
 * Follows Products.md documentation - Code 128 or QR format
 */

'use client';

import { useState } from 'react';
import { X, Printer, Barcode as BarcodeIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Product } from '@/lib/types/modern-erp';

interface PrintBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export function PrintBarcodeModal({ isOpen, onClose, product }: PrintBarcodeModalProps) {
  const [quantity, setQuantity] = useState('1');
  const [labelSize, setLabelSize] = useState<'thermal' | 'a4'>('thermal');
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName] = useState(true);
  const [showBusinessName, setShowBusinessName] = useState(true);

  if (!isOpen || !product) return null;

  // Get product price (use retail_price or first variation price)
  const productPrice = 0; // TODO: Get from product variations

  const handlePrint = () => {
    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const barcodeValue = product.sku || product.id.toString();
    const quantityNum = parseInt(quantity) || 1;

    // Generate HTML for barcode labels
    let labelsHTML = '';
    for (let i = 0; i < quantityNum; i++) {
      labelsHTML += `
        <div style="
          width: ${labelSize === 'thermal' ? '38mm' : '50mm'};
          height: ${labelSize === 'thermal' ? '25mm' : '30mm'};
          border: 1px solid #000;
          padding: 4px;
          margin: 2px;
          display: inline-block;
          text-align: center;
          font-family: Arial, sans-serif;
          page-break-inside: avoid;
        ">
          ${showBusinessName ? '<div style="font-size: 6px; font-weight: bold; margin-bottom: 2px;">Din Collection</div>' : ''}
          ${showName ? `<div style="font-size: 8px; font-weight: bold; margin-bottom: 2px;">${product.name}</div>` : ''}
          <div style="height: 20px; display: flex; align-items: center; justify-content: center; margin: 2px 0;">
            <div style="font-family: monospace; font-size: 10px; letter-spacing: 1px;">${barcodeValue}</div>
          </div>
          <div style="font-size: 6px; font-family: monospace;">${barcodeValue}</div>
          ${showPrice && productPrice > 0 ? `<div style="font-size: 8px; font-weight: bold; margin-top: 2px;">Rs. ${productPrice.toFixed(2)}</div>` : ''}
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${product.name}</title>
          <style>
            @media print {
              body { margin: 0; padding: 10px; }
              @page { size: ${labelSize === 'thermal' ? '38mm 25mm' : 'A4'}; margin: 0; }
            }
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          ${labelsHTML}
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center ${
        isOpen ? 'animate-in fade-in duration-200' : 'hidden'
      }`}
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-800 bg-gray-950 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-500">
              <BarcodeIcon size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Print Barcode</h3>
              <p className="text-xs text-gray-400">{product.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Settings */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-gray-300 mb-2 block">Label Size</Label>
                <select
                  value={labelSize}
                  onChange={(e) => setLabelSize(e.target.value as 'thermal' | 'a4')}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="thermal">Thermal (38mm x 25mm)</option>
                  <option value="a4">A4 Grid</option>
                </select>
              </div>

              <div>
                <Label className="text-sm text-gray-300 mb-2 block">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-300">Display Options</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBusinessName}
                      onChange={(e) => setShowBusinessName(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    Show Business Name
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showName}
                      onChange={(e) => setShowName(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    Show Product Name
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPrice}
                      onChange={(e) => setShowPrice(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
                    />
                    Show Price
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div>
              <Label className="text-sm text-gray-300 mb-3 block">Preview</Label>
              <div className="bg-gray-800/50 rounded-xl border border-dashed border-gray-700 p-6 flex items-center justify-center min-h-[200px]">
                <div
                  className="bg-white text-black p-3 rounded-sm shadow-xl"
                  style={{
                    width: labelSize === 'thermal' ? '150px' : '180px',
                    textAlign: 'center',
                  }}
                >
                  {showBusinessName && (
                    <p className="text-[8px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                      Din Collection
                    </p>
                  )}
                  {showName && (
                    <p className="text-xs font-bold leading-tight mb-2 line-clamp-2">{product.name}</p>
                  )}
                  {/* Barcode Placeholder */}
                  <div className="h-12 w-full flex justify-center items-end gap-[1px] my-2 bg-gray-100 p-2 rounded">
                    <div className="text-[10px] font-mono font-bold">{product.sku || product.id}</div>
                  </div>
                  <p className="text-[10px] font-mono tracking-widest mb-1">{product.sku || product.id}</p>
                  {showPrice && productPrice > 0 && (
                    <p className="text-sm font-bold mt-1">Rs. {productPrice.toFixed(2)}</p>
                  )}
                </div>
              </div>
              <p className="text-center text-xs text-gray-500 mt-2">
                {labelSize === 'thermal' ? '38mm x 25mm Preview' : 'A4 Grid Preview'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-800 bg-gray-950 flex items-center justify-end gap-3 sticky bottom-0">
          <Button variant="outline" onClick={onClose} className="border-gray-700 text-gray-300 hover:bg-gray-800">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Printer size={16} className="mr-2" />
            Print {quantity} Label{parseInt(quantity) > 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}

