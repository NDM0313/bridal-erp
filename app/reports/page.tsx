'use client';

import { useEffect, useState } from 'react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { getDailySalesTotal, getMonthlySalesSummary, getProductWiseSales } from '@/lib/services/reportsService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Calendar, TrendingUp, Package } from 'lucide-react';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'products'>('daily');
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [year, setYear] = useState(new Date().getFullYear());

  const [dailySales, setDailySales] = useState<any[]>([]);
  const [monthlySales, setMonthlySales] = useState<any[]>([]);
  const [productSales, setProductSales] = useState<any[]>([]);

  const [error, setError] = useState<string | null>(null);

  const loadDailySales = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDailySalesTotal(dateFrom, dateTo);
      setDailySales(data);
    } catch (error) {
      console.error('Failed to load daily sales:', error);
      setError(error instanceof Error ? error.message : 'Failed to load daily sales');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlySales = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMonthlySalesSummary(year);
      setMonthlySales(data);
    } catch (error) {
      console.error('Failed to load monthly sales:', error);
      setError(error instanceof Error ? error.message : 'Failed to load monthly sales');
    } finally {
      setLoading(false);
    }
  };

  const loadProductSales = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProductWiseSales(dateFrom, dateTo);
      setProductSales(data);
    } catch (error) {
      console.error('Failed to load product sales:', error);
      setError(error instanceof Error ? error.message : 'Failed to load product sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily') {
      loadDailySales();
    } else if (activeTab === 'monthly') {
      loadMonthlySales();
    } else if (activeTab === 'products') {
      loadProductSales();
    }
  }, [activeTab, dateFrom, dateTo, year]);

  return (
    <ModernDashboardLayout>
      <div className="space-y-6 p-6 standard-page-container">
        <div className="animate-entrance">
          <h1 className="page-title text-slate-100">Reports</h1>
          <p className="page-subtitle">View sales and business reports</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-800">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('daily')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'daily'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              <Calendar className="h-4 w-4 inline mr-2" />
              Daily Sales
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'monthly'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              <TrendingUp className="h-4 w-4 inline mr-2" />
              Monthly Summary
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Product Sales
            </button>
          </nav>
        </div>

        {/* Date Filters */}
        {activeTab !== 'monthly' && (
          <div className="p-4 rounded-lg bg-slate-900/40 backdrop-blur-md border border-slate-800/50 flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'monthly' && (
          <div className="p-4 rounded-lg bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
            <label className="block text-sm font-medium text-slate-300 mb-2">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading reports</p>
            <p className="text-sm mt-1">{error}</p>
            <p className="text-xs mt-2 text-rose-300">
              Please ensure you are logged in and have the necessary permissions.
            </p>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 overflow-hidden">
            {activeTab === 'daily' && (
              dailySales.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No daily sales data"
                  description="Daily sales data will appear here once you have sales transactions."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Total Sales</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Transactions</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Retail</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Wholesale</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-950/50 divide-y divide-slate-800">
                      {dailySales.map((day) => (
                        <tr key={day.date} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{formatDate(day.date)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-100">
                            {formatCurrency(day.total_sales)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-400">{day.transaction_count}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-400">{formatCurrency(day.retail_sales)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-400">{formatCurrency(day.wholesale_sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {activeTab === 'monthly' && (
              monthlySales.length === 0 ? (
                <EmptyState
                  icon={TrendingUp}
                  title="No monthly sales data"
                  description="Monthly sales data will appear here once you have sales transactions."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Month</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Total Sales</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Transactions</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Average</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-950/50 divide-y divide-slate-800">
                      {monthlySales.map((month) => (
                        <tr key={month.month} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">{month.month}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-100">
                            {formatCurrency(month.total_sales)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-400">{month.transaction_count}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-400">{formatCurrency(month.average_transaction)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}

            {activeTab === 'products' && (
              productSales.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No product sales data"
                  description="Product sales data will appear here once you have sales transactions."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">SKU</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Quantity</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Total Sales</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Transactions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-950/50 divide-y divide-slate-800">
                      {productSales.map((product) => (
                        <tr key={product.product_id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">{product.product_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{product.sku}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-400">{product.total_quantity.toFixed(2)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-100">
                            {formatCurrency(product.total_sales)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-400">{product.transaction_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}
