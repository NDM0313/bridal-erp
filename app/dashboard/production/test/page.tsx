/**
 * Production Dashboard Test Page
 * Check data and mark products for production
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function ProductionTestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnostics: any = {};

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not logged in');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        toast.error('Profile not found');
        return;
      }

      diagnostics.business_id = profile.business_id;

      // Check 1: Products with requires_production
      const { data: productionProducts, error: prodError } = await supabase
        .from('products')
        .select('id, name, sku, requires_production')
        .eq('business_id', profile.business_id)
        .eq('requires_production', true);

      diagnostics.production_products = {
        count: productionProducts?.length || 0,
        items: productionProducts || [],
        error: prodError,
      };

      // Check 2: Recent sales
      const { data: recentSales, error: salesError } = await supabase
        .from('transactions')
        .select('id, invoice_no, transaction_date, status')
        .eq('business_id', profile.business_id)
        .eq('type', 'sell')
        .eq('status', 'final')
        .order('transaction_date', { ascending: false })
        .limit(10);

      diagnostics.recent_sales = {
        count: recentSales?.length || 0,
        items: recentSales || [],
        error: salesError,
      };

      // Check 3: Sales with production products
      if (recentSales && recentSales.length > 0) {
        const salesWithProduction = [];
        for (const sale of recentSales) {
          const { data: items } = await supabase
            .from('transaction_sell_lines')
            .select('product_id')
            .eq('transaction_id', sale.id);

          if (items && items.length > 0) {
            const productIds = items.map(i => i.product_id);
            const { data: products } = await supabase
              .from('products')
              .select('id, name, requires_production')
              .in('id', productIds);

            const hasProduction = products?.some(p => p.requires_production);
            if (hasProduction) {
              salesWithProduction.push({
                ...sale,
                products: products,
              });
            }
          }
        }
        diagnostics.sales_with_production = {
          count: salesWithProduction.length,
          items: salesWithProduction,
        };
      }

      // Check 4: Existing production orders
      const { data: prodOrders } = await supabase
        .from('production_orders')
        .select('id, order_no, transaction_id, status')
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false })
        .limit(10);

      diagnostics.production_orders = {
        count: prodOrders?.length || 0,
        items: prodOrders || [],
      };

      setResults(diagnostics);
      toast.success('Diagnostics complete');

    } catch (err: any) {
      console.error('Diagnostics error:', err);
      toast.error(err.message || 'Diagnostics failed');
    } finally {
      setLoading(false);
    }
  };

  const markProductsForProduction = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not logged in');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        toast.error('Profile not found');
        return;
      }

      // Get first 3 products
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .eq('business_id', profile.business_id)
        .limit(3);

      if (!products || products.length === 0) {
        toast.error('No products found');
        return;
      }

      // Mark them for production
      const { error } = await supabase
        .from('products')
        .update({ requires_production: true })
        .in('id', products.map(p => p.id));

      if (error) throw error;

      toast.success(`Marked ${products.length} products for production`);
      runDiagnostics(); // Re-run diagnostics

    } catch (err: any) {
      console.error('Mark products error:', err);
      toast.error(err.message || 'Failed to mark products');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModernDashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Production Dashboard Test</h1>
          <p className="text-gray-400 mt-1">Diagnose why studio sales aren't showing</p>
        </div>

        <div className="flex gap-3">
          <Button onClick={runDiagnostics} disabled={loading}>
            {loading ? 'Running...' : 'Run Diagnostics'}
          </Button>
          <Button onClick={markProductsForProduction} disabled={loading} variant="outline">
            Mark 3 Products for Production
          </Button>
        </div>

        {results && (
          <div className="space-y-4">
            {/* Business ID */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-2">Business ID</h3>
                <p className="text-gray-300">{results.business_id}</p>
              </CardContent>
            </Card>

            {/* Production Products */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Products Requiring Production</h3>
                  <Badge className={results.production_products.count > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                    {results.production_products.count > 0 ? <CheckCircle size={14} className="mr-1" /> : <XCircle size={14} className="mr-1" />}
                    {results.production_products.count}
                  </Badge>
                </div>
                {results.production_products.error && (
                  <p className="text-red-400 text-sm mb-2">Error: {results.production_products.error.message}</p>
                )}
                {results.production_products.count === 0 ? (
                  <p className="text-amber-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    No products marked for production! Click "Mark 3 Products for Production" button above.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {results.production_products.items.map((p: any) => (
                      <div key={p.id} className="text-sm text-gray-300">
                        • {p.name} ({p.sku})
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Sales */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Recent Final Sales</h3>
                  <Badge className={results.recent_sales.count > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                    {results.recent_sales.count > 0 ? <CheckCircle size={14} className="mr-1" /> : <XCircle size={14} className="mr-1" />}
                    {results.recent_sales.count}
                  </Badge>
                </div>
                {results.recent_sales.count === 0 ? (
                  <p className="text-amber-400 text-sm flex items-center gap-2">
                    <AlertTriangle size={16} />
                    No final sales found! Create some sales first.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {results.recent_sales.items.map((s: any) => (
                      <div key={s.id} className="text-sm text-gray-300">
                        • {s.invoice_no} - {new Date(s.transaction_date).toLocaleDateString()}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sales with Production Products */}
            {results.sales_with_production && (
              <Card className="bg-gray-900/50 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-semibold">Sales with Production Products</h3>
                    <Badge className={results.sales_with_production.count > 0 ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}>
                      {results.sales_with_production.count > 0 ? <CheckCircle size={14} className="mr-1" /> : <AlertTriangle size={14} className="mr-1" />}
                      {results.sales_with_production.count}
                    </Badge>
                  </div>
                  {results.sales_with_production.count === 0 ? (
                    <p className="text-amber-400 text-sm flex items-center gap-2">
                      <AlertTriangle size={16} />
                      No sales contain production products! Create a sale with marked products.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {results.sales_with_production.items.map((s: any) => (
                        <div key={s.id} className="text-sm bg-gray-800/50 p-2 rounded">
                          <p className="text-white font-medium">{s.invoice_no}</p>
                          <p className="text-gray-400">Products: {s.products.map((p: any) => p.name).join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Production Orders */}
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Existing Production Orders</h3>
                  <Badge className="bg-blue-500/20 text-blue-400">
                    {results.production_orders.count}
                  </Badge>
                </div>
                {results.production_orders.count === 0 ? (
                  <p className="text-gray-400 text-sm">No production orders yet (expected for new setup)</p>
                ) : (
                  <div className="space-y-1">
                    {results.production_orders.items.map((po: any) => (
                      <div key={po.id} className="text-sm text-gray-300">
                        • {po.order_no} - Transaction: {po.transaction_id || 'N/A'}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
