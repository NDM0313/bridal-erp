'use client';

import { useEffect, useState } from 'react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { DateRangeFilter } from '@/components/filters/DateRangeFilter';
import {
  getProfitMarginReport,
  getStockValuationReport,
  getTopSellingProducts,
  type ProfitMarginReport,
  type StockValuationReport,
  type TopSellingProduct,
} from '@/lib/services/advancedReportsService';
import { getTodayRange } from '@/lib/utils/dateFilters';
import type { DateRange } from '@/lib/utils/dateFilters';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, Package, Award } from 'lucide-react';
import { Skeleton } from '@/components/placeholders/SkeletonLoader';
import { EmptyState } from '@/components/placeholders/EmptyState';

export default function AdvancedReportsPage() {
  const [activeTab, setActiveTab] = useState<'profit' | 'stock' | 'top'>('profit');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(getTodayRange());

  const [profitReport, setProfitReport] = useState<ProfitMarginReport | null>(null);
  const [stockReport, setStockReport] = useState<StockValuationReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);

  useEffect(() => {
    loadReport();
  }, [activeTab, dateRange]);

  const loadReport = async () => {
    setLoading(true);
    try {
      if (activeTab === 'profit') {
        const data = await getProfitMarginReport(dateRange.from, dateRange.to);
        setProfitReport(data);
      } else if (activeTab === 'stock') {
        const data = await getStockValuationReport();
        setStockReport(data);
      } else if (activeTab === 'top') {
        const data = await getTopSellingProducts(dateRange.from, dateRange.to, 20);
        setTopProducts(data);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModernDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Advanced Reports</h1>
          <p className="mt-1 text-sm text-slate-400">Profit, stock valuation, and top products</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-800">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profit')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                activeTab === 'profit'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Profit & Margin
            </button>
            <button
              onClick={() => setActiveTab('stock')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                activeTab === 'stock'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              <Package className="h-4 w-4 mr-2" />
              Stock Valuation
            </button>
            <button
              onClick={() => setActiveTab('top')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                activeTab === 'top'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-700'
              }`}
            >
              <Award className="h-4 w-4 mr-2" />
              Top Products
            </button>
          </nav>
        </div>

        {/* Date Filter (for profit and top products) */}
        {(activeTab === 'profit' || activeTab === 'top') && (
          <div className="p-4 rounded-lg bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
            <Skeleton className="h-64" />
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 overflow-hidden">
            {/* Profit & Margin Report */}
            {activeTab === 'profit' && (
              profitReport ? (
                <div>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-100 mb-4">Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-sm text-slate-400">Total Sales</p>
                        <p className="text-xl font-bold text-blue-400">
                          {formatCurrency(profitReport.summary.total_sales)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20">
                        <p className="text-sm text-slate-400">Total Cost</p>
                        <p className="text-xl font-bold text-rose-400">
                          {formatCurrency(profitReport.summary.total_cost)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-sm text-slate-400">Total Profit</p>
                        <p className="text-xl font-bold text-emerald-400">
                          {formatCurrency(profitReport.summary.total_profit)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-sm text-slate-400">Margin %</p>
                        <p className="text-xl font-bold text-yellow-400">
                          {profitReport.summary.overall_margin_percent.toFixed(2)}%
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <p className="text-sm text-slate-400">Items Sold</p>
                        <p className="text-xl font-bold text-slate-100">
                          {profitReport.summary.total_items_sold.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {profitReport.items.length === 0 ? (
                    <EmptyState
                      icon={TrendingUp}
                      title="No profit data"
                      description="Profit data will appear here once you have sales transactions."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-800">
                        <thead className="bg-slate-900/50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Product</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Sales</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Cost</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Profit</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Margin %</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Qty Sold</th>
                          </tr>
                        </thead>
                        <tbody className="bg-slate-950/50 divide-y divide-slate-800">
                          {profitReport.items.map((item) => (
                            <tr key={item.product_id} className="hover:bg-slate-900/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-100">{item.product_name}</div>
                                <div className="text-xs text-slate-400">{item.sku}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-100">
                                {formatCurrency(item.total_sales)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-400">
                                {formatCurrency(item.total_cost)}
                              </td>
                              <td
                                className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                                  item.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {formatCurrency(item.profit)}
                              </td>
                              <td
                                className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                                  item.margin_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {item.margin_percent.toFixed(2)}%
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-400">
                                {item.total_quantity_sold.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="No profit data"
                  description="Profit data will appear here once you have sales transactions."
                />
              )
            )}

            {/* Stock Valuation Report */}
            {activeTab === 'stock' && (
              stockReport ? (
                <div>
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-100 mb-4">Summary</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-sm text-slate-400">Total Items</p>
                        <p className="text-xl font-bold text-blue-400">{stockReport.summary.total_items}</p>
                      </div>
                      <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-sm text-slate-400">Total Quantity</p>
                        <p className="text-xl font-bold text-emerald-400">
                          {stockReport.summary.total_quantity.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-sm text-slate-400">Total Value</p>
                        <p className="text-xl font-bold text-yellow-400">
                          {formatCurrency(stockReport.summary.total_value)}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
                        <p className="text-sm text-slate-400">Locations</p>
                        <p className="text-xl font-bold text-slate-100">{stockReport.summary.locations_count}</p>
                      </div>
                    </div>
                  </div>

                  {stockReport.items.length === 0 ? (
                    <EmptyState
                      icon={Package}
                      title="No stock data"
                      description="Stock valuation data will appear here once you have stock items."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-800">
                        <thead className="bg-slate-900/50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Location</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Quantity</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Unit Cost</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Total Value</th>
                          </tr>
                        </thead>
                        <tbody className="bg-slate-950/50 divide-y divide-slate-800">
                          {stockReport.items.map((item, index) => (
                            <tr key={`${item.variation_id}-${item.location_id}-${index}`} className="hover:bg-slate-900/50 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-100">{item.product_name}</div>
                                {item.variation_name && (
                                  <div className="text-xs text-slate-400">{item.variation_name}</div>
                                )}
                                <div className="text-xs text-slate-500">{item.sku}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{item.location_name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-100">
                                {item.qty_available.toFixed(2)} {item.base_unit}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-400">
                                {formatCurrency(item.unit_cost)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-100">
                                {formatCurrency(item.total_value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={Package}
                  title="No stock data"
                  description="Stock valuation data will appear here once you have stock items."
                />
              )
            )}

            {/* Top Selling Products */}
            {activeTab === 'top' && (
              topProducts.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="No top products data"
                  description="Top selling products data will appear here once you have sales transactions."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-800">
                    <thead className="bg-slate-900/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Product</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Qty Sold</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Total Sales</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Avg Price</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase">Transactions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-slate-950/50 divide-y divide-slate-800">
                      {topProducts.map((product, index) => (
                        <tr key={product.product_id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-100">
                            #{index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-100">{product.product_name}</div>
                            <div className="text-xs text-slate-400">{product.sku}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-100">
                            {product.total_quantity_sold.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-slate-100">
                            {formatCurrency(product.total_sales)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-400">
                            {formatCurrency(product.average_price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-400">
                            {product.transaction_count}
                          </td>
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

