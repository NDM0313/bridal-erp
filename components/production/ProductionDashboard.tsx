/**
 * Production Dashboard - NEW
 * Post-sale production pipeline
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, ArrowRight, Clock, User, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ProductionOrder {
  id: number;
  order_no: string;
  customer_name: string;
  status: string;
  deadline_date?: string;
  created_at: string;
  is_new_sale?: boolean; // Flag for sales awaiting setup
  sale_id?: number; // Original sale ID
}

export default function ProductionDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [newSales, setNewSales] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }

      if (!profile) {
        console.log('No profile found');
        return;
      }

      console.log('Fetching orders for business:', profile.business_id);

      // Fetch existing production orders
      console.log('Fetching production orders...');
      const { data, error } = await supabase
        .from('production_orders')
        .select(`
          id,
          order_no,
          status,
          deadline_date,
          created_at,
          transaction_id,
          customer:contacts(name)
        `)
        .eq('business_id', profile.business_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Production orders error:', error);
        throw error;
      }

      console.log('Production orders loaded:', data?.length || 0);

      // Fetch sales requiring production setup (Studio sales without production orders)
      console.log('Fetching transactions for setup...');
      const { data: salesData, error: salesError } = await supabase
        .from('transactions')
        .select(`
          id,
          invoice_no,
          transaction_date,
          contact_id
        `)
        .eq('business_id', profile.business_id)
        .eq('type', 'sell')
        .eq('status', 'final')
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (salesError) {
        console.error('Sales query error:', {
          message: salesError.message,
          code: salesError.code,
          details: salesError.details,
          hint: salesError.hint,
          raw: JSON.stringify(salesError, Object.getOwnPropertyNames(salesError)),
        });
        throw salesError;
      }

      console.log('Transactions loaded:', salesData?.length || 0);

      // Get customer names for sales
      const contactIds = (salesData || [])
        .map(s => s.contact_id)
        .filter((id): id is number => id !== null && id !== undefined);

      let contactsMap = new Map<number, string>();
      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name')
          .in('id', contactIds);

        if (contacts) {
          contacts.forEach(c => {
            contactsMap.set(c.id, c.name);
          });
        }
      }

      // Filter sales that don't have production orders yet and have studio products
      const existingTransactionIds = (data || [])
        .map(o => o.transaction_id)
        .filter(Boolean);

      console.log('Existing production order transaction IDs:', existingTransactionIds);

      const pendingSetupSales: ProductionOrder[] = [];
      
      for (const sale of (salesData || [])) {
        try {
          // Skip if already has production order
          if (existingTransactionIds.includes(sale.id)) {
            console.log('Skipping sale (has production order):', sale.id);
            continue;
          }

          // Check if sale has products requiring production
          const { data: saleItems, error: itemsError } = await supabase
            .from('transaction_sell_lines')
            .select('product_id')
            .eq('transaction_id', sale.id);

          if (itemsError) {
            console.warn('Failed to fetch sale items for', sale.id, itemsError);
            continue;
          }

          if (!saleItems || saleItems.length === 0) {
            console.log('Sale has no items:', sale.id);
            continue;
          }

          const productIds = saleItems.map(item => item.product_id);
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, requires_production')
            .in('id', productIds);

          if (productsError) {
            console.warn('Failed to fetch products for sale', sale.id, productsError);
            continue;
          }

          const requiresProduction = products?.some(p => p.requires_production === true);

          if (requiresProduction) {
            console.log('Found sale requiring production:', sale.id, sale.invoice_no);
            pendingSetupSales.push({
              id: sale.id,
              order_no: sale.invoice_no,
              customer_name: sale.contact_id ? contactsMap.get(sale.contact_id) || 'Unknown' : 'Walk-in',
              status: 'setup_required',
              created_at: sale.transaction_date,
              is_new_sale: true,
              sale_id: sale.id,
            });
          } else {
            console.log('Sale does not require production:', sale.id);
          }
        } catch (err) {
          console.warn('Error processing sale', sale.id, err);
          // Continue with next sale
        }
      }

      console.log('Pending setup sales:', pendingSetupSales.length);
      console.log('Pending setup sales details:', pendingSetupSales);
      setNewSales(pendingSetupSales);

      if (data) {
        const mappedOrders = data.map(o => ({
          ...o,
          customer_name: Array.isArray(o.customer) ? o.customer[0]?.name : o.customer?.name || 'Unknown',
        }));
        console.log('Production orders mapped:', mappedOrders.length);
        setOrders(mappedOrders);
      } else {
        console.log('No production orders data');
      }

      console.log('===== FINAL STATE =====');
      console.log('New Sales (Setup Required):', pendingSetupSales.length);
      console.log('Existing Production Orders:', data?.length || 0);
      console.log('=======================');
    } catch (err: any) {
      console.error('Failed to load orders:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        raw: JSON.stringify(err, Object.getOwnPropertyNames(err)),
        stack: err?.stack,
      });
      toast.error(err?.message || 'Failed to load production orders');
    } finally {
      setLoading(false);
    }
  };

  const groupedOrders = {
    dyeing: orders.filter(o => o.status === 'dyeing' || o.status === 'new'),
    handwork: orders.filter(o => o.status === 'handwork'),
    stitching: orders.filter(o => o.status === 'stitching'),
    completed: orders.filter(o => o.status === 'completed'),
  };

  const OrderCard: React.FC<{ order: ProductionOrder }> = ({ order }) => (
    <div
      onClick={() => {
        if (order.is_new_sale) {
          // Navigate to setup screen for new sales
          router.push(`/dashboard/production/setup/${order.sale_id}`);
        } else {
          router.push(`/dashboard/production/${order.id}`);
        }
      }}
      className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-indigo-500 hover:bg-gray-800 transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className="text-sm font-mono text-indigo-400">{order.order_no}</p>
          <p className="text-sm text-white mt-1">{order.customer_name}</p>
        </div>
        {order.is_new_sale && (
          <Sparkles size={14} className="text-blue-400" />
        )}
        {order.deadline_date && !order.is_new_sale && (
          <div className="text-right">
            <Clock size={12} className="text-gray-400 mb-1" />
            <p className="text-xs text-gray-400">
              {format(new Date(order.deadline_date), 'dd MMM')}
            </p>
          </div>
        )}
      </div>
      <Badge className={
        order.is_new_sale 
          ? "bg-blue-500/20 text-blue-400 text-xs"
          : "bg-gray-700 text-gray-300 text-xs"
      }>
        {order.is_new_sale ? 'Setup Required' : order.status}
      </Badge>
    </div>
  );

  const Section: React.FC<{
    title: string;
    orders: ProductionOrder[];
    color: string;
  }> = ({ title, orders, color }) => (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">{title}</h3>
          <Badge className={`${color}`}>
            {orders.length}
          </Badge>
        </div>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {orders.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">No orders</p>
          ) : (
            orders.map(order => <OrderCard key={order.id} order={order} />)
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package size={28} className="text-indigo-400" />
            Production Management
          </h1>
          <p className="text-gray-400 mt-1">Track post-sale production workflow</p>
        </div>
        <Button
          onClick={fetchOrders}
          variant="outline"
          size="sm"
          className="text-gray-300"
        >
          Refresh
        </Button>
      </div>

      {/* Debug Info */}
      {!loading && (
        <div className="bg-gray-900/50 border border-gray-800 rounded p-3 text-xs text-gray-400">
          <p>Setup Required: {newSales.length} | Dyeing: {groupedOrders.dyeing.length} | Handwork: {groupedOrders.handwork.length} | Stitching: {groupedOrders.stitching.length} | Completed: {groupedOrders.completed.length}</p>
          <p className="mt-1">Check browser console (F12) for detailed logs</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Section 
            title="Setup Required" 
            orders={newSales}
            color="bg-blue-500/20 text-blue-400"
          />
          <Section 
            title="Dyeing" 
            orders={groupedOrders.dyeing}
            color="bg-purple-500/20 text-purple-400"
          />
          <Section 
            title="Handwork" 
            orders={groupedOrders.handwork}
            color="bg-amber-500/20 text-amber-400"
          />
          <Section 
            title="Stitching" 
            orders={groupedOrders.stitching}
            color="bg-orange-500/20 text-orange-400"
          />
          <Section 
            title="Completed" 
            orders={groupedOrders.completed}
            color="bg-green-500/20 text-green-400"
          />
        </div>
      )}
    </div>
  );
}
