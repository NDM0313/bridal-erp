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
  Plus,
  ShoppingBag,
  Scissors,
  Wallet,
  Calendar,
  Clock,
  ArrowRight,
  Loader2,
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

interface DashboardStats {
  totalBalance: number;
  activeRentals: number;
  activeProduction: number;
  pendingTasks: number;
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
  onClick?: () => void;
}

const StatCard = ({ title, value, icon: Icon, color, bgGradient, loading, onClick }: StatCardProps) => {
  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-[1.02]',
        bgGradient,
        onClick && 'hover:shadow-lg hover:shadow-blue-500/20'
      )}
    >
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Icon size={80} className={color} />
      </div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={cn('p-3 rounded-xl bg-white/10 backdrop-blur-sm', color)}>
            <Icon size={24} />
          </div>
        </div>
        <div>
          <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
};

export function ModernDashboardHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalBalance: 0,
    activeRentals: 0,
    activeProduction: 0,
    pendingTasks: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

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

      // Parallel fetch all stats
      const [accountsResult, rentalsResult, productionResult] = await Promise.allSettled([
        // Fetch financial accounts
        apiClient.get<ApiResponse<FinancialAccount[]>>('/accounting/accounts'),
        // Fetch active rentals (reserved or out)
        apiClient.get<ApiResponse<RentalBooking[]>>('/rentals?per_page=100'),
        // Fetch active production orders (new, dyeing, stitching)
        apiClient.get<ApiResponse<ProductionOrder[]>>('/production?per_page=100'),
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
      if (productionResult.status === 'fulfilled' && productionResult.value.data?.success) {
        const orders = productionResult.value.data.data || [];
        activeProduction = orders.filter(
          (o) => ['new', 'dyeing', 'stitching', 'handwork'].includes(o.status)
        ).length;

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

      setStats({
        totalBalance,
        activeRentals,
        activeProduction,
        pendingTasks,
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Command Center</h1>
          <p className="text-gray-400 mt-1">Real-time overview of your business</p>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Cash Balance"
          value={formatCurrency(stats.totalBalance)}
          icon={Wallet}
          color="text-green-400"
          bgGradient="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30"
          loading={loading}
          onClick={() => router.push('/dashboard/finance')}
        />
        <StatCard
          title="Active Rentals"
          value={stats.activeRentals}
          icon={ShoppingBag}
          color="text-blue-400"
          bgGradient="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30"
          loading={loading}
          onClick={() => router.push('/dashboard/rentals')}
        />
        <StatCard
          title="Active Production"
          value={stats.activeProduction}
          icon={Scissors}
          color="text-purple-400"
          bgGradient="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30"
          loading={loading}
          onClick={() => router.push('/dashboard/studio')}
        />
        <StatCard
          title="Pending Tasks"
          value={stats.pendingTasks}
          icon={AlertCircle}
          color="text-red-400"
          bgGradient="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30"
          loading={loading}
          onClick={() => {
            if (stats.pendingTasks > 0) {
              // Navigate to alerts or show modal
              toast.info(`${stats.pendingTasks} overdue items need attention`);
            }
          }}
        />
      </div>

      {/* Quick Actions Section */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-3 bg-blue-900/20 border-blue-500/30 hover:bg-blue-900/30 hover:border-blue-500/50 text-white"
            onClick={() => router.push('/dashboard/rentals')}
          >
            <ShoppingBag size={32} className="text-blue-400" />
            <span className="text-lg font-semibold">New Rental Booking</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-3 bg-purple-900/20 border-purple-500/30 hover:bg-purple-900/30 hover:border-purple-500/50 text-white"
            onClick={() => router.push('/dashboard/studio')}
          >
            <Scissors size={32} className="text-purple-400" />
            <span className="text-lg font-semibold">New Custom Order</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex flex-col items-center justify-center gap-3 bg-green-900/20 border-green-500/30 hover:bg-green-900/30 hover:border-green-500/50 text-white"
            onClick={() => router.push('/dashboard/finance')}
          >
            <DollarSign size={32} className="text-green-400" />
            <span className="text-lg font-semibold">Add Income</span>
          </Button>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/50 rounded-2xl overflow-hidden">
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
