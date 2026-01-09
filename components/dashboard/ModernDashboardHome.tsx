/**
 * Modern Dashboard Home
 * Real-time statistics and command center
 * Shows Rentals, Production, Finance, and Alerts
 */

'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  AlertCircle,
  AlertTriangle,
  Plus,
  ShoppingBag,
  Scissors,
  Wallet,
  Calendar,
  Clock,
  ArrowRight,
  Loader2,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import apiClient, { getErrorMessage, ApiResponse } from '@/lib/api/apiClient';
import { FinancialAccount, RentalBooking, ProductionOrder } from '@/lib/types/modern-erp';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ensureDefaultResourcesExist } from '@/lib/services/businessSetupService';
import { useBranchV2 } from '@/lib/context/BranchContextV2';

interface DashboardStats {
  totalBalance: number;
  activeRentals: number;
  activeProduction: number;
  pendingTasks: number;
  // New stats for Figma design
  totalReceivables: number;
  totalPayables: number;
  netProfit: number;
  totalSales: number;
  productionInDyeing: number;
  productionReady: number;
  receivablesTrend: number; // percentage
  payablesTrend: number; // percentage
  profitTrend: number; // percentage
  salesTrend: number; // percentage
}

interface RecentActivity {
  id: string;
  type: 'rental' | 'production' | 'finance' | 'alert';
  title: string;
  description: string;
  timestamp: Date;
  link?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  loading?: boolean;
  trend?: number; // percentage trend
  onClick?: () => void;
}

const StatCard = ({ title, value, icon: Icon, color, bgGradient, loading, trend, onClick }: StatCardProps) => {
  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const isPositiveTrend = trend !== undefined && trend > 0;
  const trendColor = isPositiveTrend ? 'text-green-500' : 'text-red-500';
  const TrendIcon = isPositiveTrend ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden p-5 rounded-xl border border-gray-800 bg-gray-900 transition-standard animate-entrance',
        onClick && 'cursor-pointer hover-lift hover:border-blue-500/50'
      )}
    >
      {/* Background Graphic */}
      <div className="absolute bottom-0 right-0 p-3 opacity-10">
        <Icon size={64} className={cn(color)} />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={cn('p-2.5 rounded-lg', color.includes('bg-') ? color : `bg-${color.split('-')[1]}-500/10`, color)}>
            <Icon size={20} strokeWidth={2} />
          </div>
          {trend !== undefined && (
            <div className={cn('flex items-center gap-1 text-xs font-medium px-2 py-1 rounded', isPositiveTrend ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500')}>
              <TrendIcon size={12} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div>
          <h3 className="text-gray-400 text-xs mb-1.5">{title}</h3>
          <p className={cn('text-xl font-bold', color)}>{value}</p>
        </div>
      </div>
    </div>
  );
};

export function ModernDashboardHome() {
  const router = useRouter();
  const { activeBranch } = useBranchV2();
  const activeBranchId = activeBranch?.id ? Number(activeBranch.id) : null;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    activeRentals: 0,
    activeProduction: 0,
    pendingTasks: 0,
    totalReceivables: 0,
    totalPayables: 0,
    netProfit: 0,
    totalSales: 0,
    productionInDyeing: 0,
    productionReady: 0,
    receivablesTrend: 0,
    payablesTrend: 0,
    profitTrend: 0,
    salesTrend: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Array<{ id: number; name: string; sku: string; stock: number; min_level: number }>>([]);

  useEffect(() => {
    // CRITICAL: Always load dashboard data once branch context is ready
    // activeBranchId can be 'ALL' or a specific branch ID
    if (activeBranchId !== null && activeBranchId !== undefined) {
      loadDashboardData();
    } else if (!loading) {
      // Only set empty state if branch context is done loading
      setStats({
        totalBalance: 0,
        activeRentals: 0,
        activeProduction: 0,
        pendingTasks: 0,
        totalReceivables: 0,
        totalPayables: 0,
        netProfit: 0,
        totalSales: 0,
        productionInDyeing: 0,
        productionReady: 0,
        receivablesTrend: 0,
        payablesTrend: 0,
        profitTrend: 0,
        salesTrend: 0,
      });
      setRecentActivities([]);
      setLowStockItems([]);
      setLoading(false);
    }
  }, [activeBranchId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }

      // Get business_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        throw new Error('Business not found');
      }

      // Ensure default resources exist (accounts and walk-in customer)
      // This runs in background and doesn't block dashboard loading
      ensureDefaultResourcesExist().catch((err) => {
        console.error('Failed to ensure default resources:', err);
        // Don't show error to user - this is a background operation
      });

      // CRITICAL: Handle 'ALL' locations vs specific branch
      const isAllLocations = activeBranchId === 'ALL';
      const branchIdNum = isAllLocations ? null : (activeBranchId ? Number(activeBranchId) : null);
      console.log('🔍 BRANCH FILTER [ModernDashboardHome.loadDashboardData]', { 
        activeBranchId, 
        isAllLocations, 
        branchIdNum, 
        type: typeof branchIdNum 
      });

      // Parallel fetch all stats - using Supabase directly to avoid API errors
      const [accountsResult, rentalsResult, productionResult, inventoryResult] = await Promise.allSettled([
        // Fetch financial accounts from Supabase
        supabase
          .from('financial_accounts')
          .select('*')
          .eq('business_id', profile.business_id)
          .then(({ data, error }) => {
            if (error) throw error;
            return { data: { success: true, data: data || [] } };
          }),
        // Fetch active rentals from Supabase
        supabase
          .from('rental_bookings')
          .select('*')
          .eq('business_id', profile.business_id)
          .in('status', ['reserved', 'out'])
          .limit(100)
          .then(({ data, error }) => {
            if (error) throw error;
            return { data: { success: true, data: data || [] } };
          }),
        // Fetch active production orders from Supabase
        supabase
          .from('production_orders')
          .select('*')
          .eq('business_id', profile.business_id)
          .in('status', ['new', 'dyeing', 'stitching'])
          .limit(100)
          .then(({ data, error }) => {
            if (error) throw error;
            return { data: { success: true, data: data || [] } };
          }),
        // Fetch low stock items from Supabase - CRITICAL: Filter by active branch OR all locations
        (async () => {
          let query = supabase
            .from('variation_location_details')
            .select(`
              variation_id,
              qty_available,
              location_id,
              variations:variation_id (
                product_id,
                products:product_id (
                  name,
                  alert_quantity
                )
              )
            `);
          
          // CRITICAL: Only filter by location if NOT "All Locations"
          if (branchIdNum !== null) {
            query = query.eq('location_id', branchIdNum);
          }
          
          const { data, error } = await query;
          if (error) throw error;
          
          // Filter low stock items
          const lowStock = (data || []).filter((item: any) => {
            const qty = parseFloat(item.qty_available?.toString() || '0');
            const alertQty = parseFloat(item.variations?.products?.alert_quantity?.toString() || '0');
            return qty <= alertQty;
          });
          return { data: { success: true, data: lowStock } };
        })(),
      ]);

      // Process accounts
      let totalBalance = 0;
      if (accountsResult.status === 'fulfilled' && accountsResult.value.data?.success) {
        const accounts = accountsResult.value.data.data || [];
        totalBalance = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
      }

      // Process active rentals
      let activeRentals = 0;
      let overdueRentals = 0;
      if (rentalsResult.status === 'fulfilled' && rentalsResult.value.data?.success) {
        const bookings = rentalsResult.value.data.data || [];
        activeRentals = bookings.filter((b) => b.status === 'reserved' || b.status === 'out').length;
        
        // Check overdue rentals
        const today = new Date();
        overdueRentals = bookings.filter((b) => {
          if (b.status === 'out' && b.return_date) {
            return new Date(b.return_date) < today;
          }
          return false;
        }).length;
      }

      // Process active production
      let activeProduction = 0;
      let overdueProduction = 0;
      let productionInDyeing = 0;
      let productionReady = 0;
      if (productionResult.status === 'fulfilled' && productionResult.value.data?.success) {
        const orders = productionResult.value.data.data || [];
        activeProduction = orders.filter(
          (o) => ['new', 'dyeing', 'stitching', 'handwork'].includes(o.status)
        ).length;
        productionInDyeing = orders.filter((o) => o.status === 'dyeing').length;
        productionReady = orders.filter((o) => o.status === 'completed' || o.status === 'dispatched').length;

        // Check overdue production deadlines
        const today = new Date();
        overdueProduction = orders.filter((o) => {
          if (o.deadline_date && ['new', 'dyeing', 'stitching', 'handwork'].includes(o.status)) {
            return new Date(o.deadline_date) < today;
          }
          return false;
        }).length;
      }

      // Calculate pending tasks (overdue items)
      const pendingTasks = overdueRentals + overdueProduction;

      // Calculate financial stats (mock for now, should come from API)
      const totalReceivables = 12450.0;
      const totalPayables = 4200.5;
      const netProfit = 48200.0;
      const totalSales = 124592.0;

      setStats({
        totalBalance,
        activeRentals,
        activeProduction,
        pendingTasks,
        totalReceivables,
        totalPayables,
        netProfit,
        totalSales,
        productionInDyeing,
        productionReady,
        receivablesTrend: 4.5,
        payablesTrend: -2.1,
        profitTrend: 14.2,
        salesTrend: 12.5,
      });

      // Build recent activities
      const activities: RecentActivity[] = [];

      // Add recent rentals
      if (rentalsResult.status === 'fulfilled' && rentalsResult.value.data?.success) {
        const bookings = rentalsResult.value.data.data || [];
        bookings.slice(0, 3).forEach((booking) => {
          activities.push({
            id: `rental-${booking.id}`,
            type: 'rental',
            title: `Booking #${booking.id}`,
            description: booking.status === 'out' ? 'Currently out' : booking.status === 'returned' ? 'Returned' : 'Reserved',
            timestamp: new Date(booking.created_at),
            link: `/dashboard/rentals`,
          });
        });
      }

      // Add recent production orders
      if (productionResult.status === 'fulfilled' && productionResult.value.data?.success) {
        const orders = productionResult.value.data.data || [];
        orders.slice(0, 2).forEach((order) => {
          activities.push({
            id: `production-${order.id}`,
            type: 'production',
            title: `Order #${order.order_no || order.id}`,
            description: `Status: ${order.status}`,
            timestamp: new Date(order.created_at),
            link: `/dashboard/studio`,
          });
        });
      }

      // Sort by timestamp and take latest 5
      activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setRecentActivities(activities.slice(0, 5));

      // Process low stock items
      if (inventoryResult.status === 'fulfilled' && inventoryResult.value.data?.success) {
        const inventory = inventoryResult.value.data.data || [];
        const lowStock = inventory.map((item: any) => {
          const variation = item.variations;
          const product = variation?.products;
          return {
            id: variation?.product_id || item.variation_id || item.id,
            name: product?.name || 'Unknown Product',
            sku: variation?.sub_sku || 'N/A',
            stock: parseFloat(item.qty_available?.toString() || '0'),
            min_level: parseFloat(product?.alert_quantity?.toString() || '0'),
          };
        });
        
        // Filter out duplicate IDs to ensure data integrity
        const seenIds = new Set<number>();
        const uniqueLowStock = lowStock.filter((item) => {
          if (seenIds.has(item.id)) {
            return false; // Skip duplicate
          }
          seenIds.add(item.id);
          return true;
        });
        
        setLowStockItems(uniqueLowStock);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace('PKR', 'Rs.');
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'rental':
        return <ShoppingBag size={16} className="text-blue-400" />;
      case 'production':
        return <Scissors size={16} className="text-purple-400" />;
      case 'finance':
        return <DollarSign size={16} className="text-green-400" />;
      case 'alert':
        return <AlertCircle size={16} className="text-red-400" />;
    }
  };

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'rental':
        return 'bg-blue-500/10 border-blue-500/20';
      case 'production':
        return 'bg-purple-500/10 border-purple-500/20';
      case 'finance':
        return 'bg-green-500/10 border-green-500/20';
      case 'alert':
        return 'bg-red-500/10 border-red-500/20';
    }
  };

  return (
    <div className="space-y-5 p-5 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-gray-400 mt-1 text-sm">Real-time overview of your business</p>
        </div>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between transition-standard animate-entrance">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg text-red-500">
              <AlertTriangle size={20} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-red-500 font-bold text-sm">Low Stock Alert</h3>
              <p className="text-red-400 text-xs">{lowStockItems.length} items are below minimum stock level</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-400 text-xs p-0 h-auto"
            onClick={() => router.push('/products?filter=low_stock')}
          >
            View Inventory →
          </Button>
        </div>
      )}

      {/* Stats Cards Row (5 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Production Status Card */}
        <div
          onClick={() => router.push('/dashboard/studio')}
          className="bg-gray-900 border border-gray-800 rounded-xl p-5 relative overflow-hidden cursor-pointer hover-lift hover:border-purple-500/50 transition-standard animate-entrance"
        >
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Scissors size={64} className="text-purple-500" strokeWidth={1} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Scissors size={20} strokeWidth={2} />
              </div>
            </div>
            <h3 className="text-gray-400 text-xs mb-3 font-medium">Production Status</h3>
            <div className="space-y-2 mb-4">
              <p className="text-sm text-white font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                {stats.productionInDyeing} Orders in Dyeing
              </p>
              <p className="text-sm text-white font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {stats.productionReady} Ready for Dispatch
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-400 hover:text-blue-300 text-xs p-0 h-auto"
              onClick={(e) => {
                e.stopPropagation();
                router.push('/dashboard/studio');
              }}
            >
              View Board →
            </Button>
          </div>
        </div>

        {/* Total Due (Receivables) Card */}
        <div className="animate-entrance-delay-1">
          <StatCard
            title="Total Due (Receivables)"
            value={formatCurrency(stats.totalReceivables)}
            icon={ArrowDownRight}
            color="text-blue-400"
            bgGradient="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30"
            loading={loading}
            trend={stats.receivablesTrend}
            onClick={() => router.push('/dashboard/contacts')}
          />
        </div>

        {/* Supplier Due (Payables) Card */}
        <div className="animate-entrance-delay-2">
          <StatCard
            title="Supplier Due (Payables)"
            value={formatCurrency(stats.totalPayables)}
            icon={ArrowUpRight}
            color="text-orange-400"
            bgGradient="bg-gradient-to-br from-orange-900/20 to-red-900/20 border-orange-500/30"
            loading={loading}
            trend={stats.payablesTrend}
            onClick={() => router.push('/purchases')}
          />
        </div>

        {/* Net Profit Card */}
        <div className="animate-entrance-delay-3">
          <StatCard
            title="Net Profit"
            value={formatCurrency(stats.netProfit)}
            icon={DollarSign}
            color="text-green-400"
            bgGradient="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30"
            loading={loading}
            trend={stats.profitTrend}
            onClick={() => router.push('/dashboard/finance')}
          />
        </div>

        {/* Total Sales Card */}
        <div className="animate-entrance-delay-3">
          <StatCard
            title="Total Sales"
            value={formatCurrency(stats.totalSales)}
            icon={ShoppingBag}
            color="text-purple-400"
            bgGradient="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30"
            loading={loading}
            trend={stats.salesTrend}
            onClick={() => router.push('/dashboard/sales')}
          />
        </div>
      </div>

      {/* Charts and Critical Stock Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Profit Chart */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6 transition-standard hover-lift animate-entrance-delay-1">
          <h3 className="text-lg font-bold text-white mb-4">Revenue & Profit</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            <p className="text-sm">Chart placeholder - Integrate Recharts AreaChart here</p>
          </div>
        </div>

        {/* Critical Stock Widget */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 transition-standard hover-lift animate-entrance-delay-2">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-red-500" size={20} strokeWidth={2} />
            <h3 className="text-base font-bold text-white">Critical Stock</h3>
          </div>
          {lowStockItems.length === 0 ? (
            <p className="text-gray-500 text-sm">No critical stock items</p>
          ) : (
            <div className="space-y-3">
              {lowStockItems.slice(0, 3).map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{item.name}</p>
                    <p className="text-gray-500 text-xs">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-medium">{item.stock}</p>
                    <p className="text-gray-500 text-xs">Min: {item.min_level}</p>
                  </div>
                </div>
              ))}
              {lowStockItems.length > 3 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/products?filter=low_stock')}
                  className="w-full text-blue-400 hover:text-blue-300"
                >
                  View All Low Stock
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden transition-standard hover-lift animate-entrance-delay-3">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Recent Activity</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
              onClick={loadDashboardData}
            >
              <Clock size={16} className="mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No recent activity"
              description="Activities will appear here as you create bookings and orders"
            />
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => activity.link && router.push(activity.link)}
                  className={cn(
                    'p-4 rounded-lg border transition-all cursor-pointer hover:bg-gray-800/50',
                    getActivityColor(activity.type)
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getActivityIcon(activity.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold text-white">{activity.title}</h4>
                        <span className="text-xs text-gray-500">
                          {format(activity.timestamp, 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{activity.description}</p>
                    </div>
                    {activity.link && (
                      <ArrowRight size={16} className="text-gray-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <AlertCircle size={24} className="text-red-400" />
            <div className="flex-1">
              <h3 className="text-red-400 font-semibold mb-1">Failed to load dashboard</h3>
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadDashboardData}>
              Retry
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
