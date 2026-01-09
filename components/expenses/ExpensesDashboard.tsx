'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, Plus, Search, Eye, Edit, Trash2, MoreVertical,
  DollarSign, TrendingUp, TrendingDown, Building2, Users,
  Zap, ShoppingCart, Briefcase, Utensils, Home, Car, Work,
  Filter, X, Calendar, CreditCard, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { supabase } from '@/utils/supabase/client';
import { AddExpenseDrawer } from './AddExpenseDrawer';
import { ViewExpenseDrawer } from './ViewExpenseDrawer';
import { CategoriesView } from './CategoriesView';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';

// Skeleton Component
const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-slate-800 rounded", className)} />
);

interface Expense {
  id: number;
  expenseNumber?: string;
  transaction_date: string;
  ref_no?: string;
  additional_notes?: string;
  final_total: number;
  payment_status: 'paid' | 'partial' | 'due';
  expense_category_id?: number;
  expense_sub_category_id?: number;
  category_name?: string;
  sub_category_name?: string;
  vendor_name?: string;
  contact_id?: number;
  payment_method?: string;
  attachment_url?: string;
  tax_amount?: number;
  total_before_tax?: number;
}

type TabType = 'overview' | 'expenses' | 'categories';

export function ExpensesDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) return;

      const { data: expenseTransactions } = await supabase
        .from('transactions')
        .select(`
          id,
          transaction_date,
          ref_no,
          additional_notes,
          final_total,
          total_before_tax,
          tax_amount,
          payment_status,
          expense_category_id,
          expense_sub_category_id,
          contact_id
        `)
        .eq('business_id', profile.business_id)
        .eq('type', 'expense')
        .order('transaction_date', { ascending: false });

      if (expenseTransactions) {
        const enriched = await Promise.all(
          expenseTransactions.map(async (exp) => {
            let categoryName = 'Uncategorized';
            let subCategoryName = '';
            let vendorName = '';

            if (exp.expense_category_id) {
              const { data: cat } = await supabase
                .from('expense_categories')
                .select('name, parent_id')
                .eq('id', exp.expense_category_id)
                .single();

              if (cat) {
                if (cat.parent_id) {
                  const { data: parent } = await supabase
                    .from('expense_categories')
                    .select('name')
                    .eq('id', cat.parent_id)
                    .single();
                  categoryName = parent?.name || 'Uncategorized';
                  subCategoryName = cat.name;
                } else {
                  categoryName = cat.name;
                }
              }
            }

            if (exp.contact_id) {
              const { data: contact } = await supabase
                .from('contacts')
                .select('name, supplier_business_name')
                .eq('id', exp.contact_id)
                .single();
              vendorName = contact?.supplier_business_name || contact?.name || '';
            }

            const year = new Date(exp.transaction_date).getFullYear();
            const expenseNumber = `EXP-${String(exp.id).padStart(3, '0')}`;

            return {
              ...exp,
              expenseNumber,
              category_name: categoryName,
              sub_category_name: subCategoryName,
              vendor_name: vendorName,
            };
          })
        );

        setExpenses(enriched as Expense[]);
      }
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats for Overview
  const overviewStats = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonth = expenses.filter((e) => new Date(e.transaction_date) >= startOfMonth);
    const lastMonth = expenses.filter(
      (e) =>
        new Date(e.transaction_date) >= startOfLastMonth &&
        new Date(e.transaction_date) <= endOfLastMonth
    );

    const totalMonthly = thisMonth.reduce((sum, e) => sum + Number(e.final_total || 0), 0);
    const lastMonthTotal = lastMonth.reduce((sum, e) => sum + Number(e.final_total || 0), 0);
    const percentChange = lastMonthTotal > 0 ? ((totalMonthly - lastMonthTotal) / lastMonthTotal) * 100 : 0;

    // Highest category
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((e) => {
      const cat = e.category_name || 'Uncategorized';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(e.final_total || 0);
    });
    const highestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const highestCategoryPercent = totalMonthly > 0 ? (highestCategory?.[1] / totalMonthly) * 100 : 0;

    // Category breakdown for donut chart
    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([name, total]) => ({ name, value: total }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Monthly trend data (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthExpenses = expenses.filter(
        (e) =>
          new Date(e.transaction_date) >= monthStart &&
          new Date(e.transaction_date) <= monthEnd
      );
      const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.final_total || 0), 0);
      monthlyTrend.push({
        month: format(monthStart, 'MMM'),
        amount: monthTotal,
      });
    }

    return {
      totalMonthly,
      lastMonthTotal,
      percentChange,
      highestCategory: highestCategory?.[0] || 'N/A',
      highestCategoryPercent,
      categoryBreakdown,
      monthlyTrend,
    };
  }, [expenses]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let filtered = expenses;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.expenseNumber?.toLowerCase().includes(query) ||
          e.ref_no?.toLowerCase().includes(query) ||
          e.additional_notes?.toLowerCase().includes(query) ||
          e.category_name?.toLowerCase().includes(query) ||
          e.vendor_name?.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter((e) => e.category_name === categoryFilter);
    }

    return filtered;
  }, [expenses, searchQuery, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set(expenses.map((e) => e.category_name).filter(Boolean));
    return Array.from(cats);
  }, [expenses]);

  // Category colors mapping
  const categoryColors: Record<string, string> = {
    'Rent': 'bg-blue-500',
    'Salaries': 'bg-purple-500',
    'Utilities': 'bg-orange-500',
    'Stitching': 'bg-yellow-500',
    'Office Supplies': 'bg-gray-500',
    'Food & Meals': 'bg-red-500',
    'Misc': 'bg-gray-400',
  };

  // Chart colors - Professional Dark ERP palette
  const CHART_COLORS = {
    indigo: '#6366F1',
    emerald: '#10B981',
    rose: '#F43F5E',
    amber: '#F59E0B',
    purple: '#A855F7',
    blue: '#3B82F6',
  };

  const PIE_COLORS = [
    CHART_COLORS.indigo,
    CHART_COLORS.purple,
    CHART_COLORS.rose,
    CHART_COLORS.emerald,
    CHART_COLORS.amber,
    CHART_COLORS.blue,
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-entrance">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Expenses</h1>
          <p className="text-sm text-slate-400 mt-1">Track and manage business operational costs</p>
        </div>
        <Button
          onClick={() => setIsAddDrawerOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white transition-standard"
        >
          <Plus size={18} className="mr-2" />
          Record Expense
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800/50">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "px-6 py-4 border-b-2 transition-standard font-medium text-sm",
              activeTab === 'overview'
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={cn(
              "px-6 py-4 border-b-2 transition-standard font-medium text-sm",
              activeTab === 'expenses'
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            All Expenses
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              "px-6 py-4 border-b-2 transition-standard font-medium text-sm",
              activeTab === 'categories'
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            )}
          >
            Categories
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 relative transition-standard hover-lift animate-entrance">
              <div className="absolute top-4 right-4">
                <TrendingUp size={24} className="text-red-400" />
              </div>
              <div className="mb-2">
                <span className="text-sm text-slate-400">Total Monthly Expense</span>
              </div>
              <div className="text-3xl font-bold text-slate-100 mb-2">
                {loading ? <Skeleton className="h-10 w-32" /> : `$${overviewStats.totalMonthly.toLocaleString()}`}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp size={16} className="text-red-400" />
                <span className="text-red-400">
                  {overviewStats.percentChange > 0 ? '+' : ''}{overviewStats.percentChange.toFixed(1)}% vs last month
                </span>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 relative transition-standard hover-lift animate-entrance-delay-1">
              <div className="absolute top-4 right-4">
                <TrendingDown size={24} className="text-green-400" />
              </div>
              <div className="mb-2">
                <span className="text-sm text-slate-400">Last Month Comparison</span>
              </div>
              <div className="text-3xl font-bold text-slate-100 mb-2">
                {loading ? <Skeleton className="h-10 w-32" /> : `$${overviewStats.lastMonthTotal.toLocaleString()}`}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingDown size={16} className="text-green-400" />
                <span className="text-green-400">-5% budget utilization</span>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 relative transition-standard hover-lift animate-entrance-delay-2">
              <div className="absolute top-4 right-4">
                <DollarSign size={24} className="text-blue-400" />
              </div>
              <div className="mb-2">
                <span className="text-sm text-slate-400">Highest Category</span>
              </div>
              <div className="text-3xl font-bold text-slate-100 mb-2">
                {loading ? <Skeleton className="h-10 w-32" /> : overviewStats.highestCategory}
              </div>
              <div className="mt-4">
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${overviewStats.highestCategoryPercent}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {overviewStats.highestCategoryPercent.toFixed(0)}% of total expenses
                </p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Expense Trend */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 transition-standard hover-lift animate-entrance-delay-1">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Monthly Expense Trend</h3>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={overviewStats.monthlyTrend}>
                    <defs>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.indigo} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={CHART_COLORS.indigo} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      axisLine={{ stroke: '#475569' }}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                      axisLine={{ stroke: '#475569' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#F1F5F9',
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Expense']}
                    />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke={CHART_COLORS.indigo}
                      strokeWidth={2}
                      fill="url(#colorExpense)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category Wise Distribution */}
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 transition-standard hover-lift animate-entrance-delay-2">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Category Wise Distribution</h3>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : overviewStats.categoryBreakdown.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400">
                  No data available
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={overviewStats.categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {overviewStats.categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1E293B',
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          color: '#F1F5F9',
                        }}
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2.5">
                    {overviewStats.categoryBreakdown.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2.5">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <span className="text-sm text-slate-300">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* All Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses..."
                className="pl-10 bg-slate-950 border-slate-800 text-slate-200"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-sm hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Expenses Table */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-xl overflow-hidden transition-standard animate-entrance-delay-3">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-950/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">DATE</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">REFERENCE #</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">CATEGORY</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">EXPENSE FOR</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">PAID VIA</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">AMOUNT</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={7} className="px-4 py-4">
                          <Skeleton className="h-4 w-full" />
                        </td>
                      </tr>
                    ))
                  ) : filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Receipt size={48} className="text-slate-600" />
                          <p className="text-slate-400">No expenses found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((expense) => {
                      const categoryColor = categoryColors[expense.category_name || ''] || 'bg-gray-500';
                      return (
                        <tr key={expense.id} className="hover:bg-slate-800/30">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <Calendar size={16} className="text-slate-500" />
                              {format(new Date(expense.transaction_date), 'MMM dd, yyyy')}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-slate-200">
                            {expense.expenseNumber || `EXP-${expense.id}`}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1">
                              <Badge
                                className={cn(
                                  "px-3 py-1 rounded text-xs font-medium text-white border-0 w-fit",
                                  categoryColor
                                )}
                              >
                                {expense.category_name || 'Uncategorized'}
                              </Badge>
                              {expense.sub_category_name && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-slate-500 text-xs">└─</span>
                                  <Badge
                                    className={cn(
                                      "px-2 py-0.5 rounded text-[10px] font-medium text-slate-200 bg-slate-700/50 border border-slate-600/50 w-fit"
                                    )}
                                  >
                                    {expense.sub_category_name}
                                  </Badge>
                                  <span className="text-[10px] text-slate-500 font-medium">(Sub)</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-300">
                            {expense.additional_notes || expense.vendor_name || '-'}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-300">
                            {expense.payment_method ? (
                              expense.payment_method === 'cash' ? 'Cash Drawer' :
                              expense.payment_method === 'bank' ? 'Meezan Bank' :
                              expense.payment_method === 'card' ? 'Card' : expense.payment_method
                            ) : '-'}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium text-red-400">
                            -${Number(expense.final_total || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingExpense(expense)}
                              className="bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
                            >
                              <MoreVertical size={16} />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <CategoriesView onRefresh={loadExpenses} />
      )}

      {/* Drawers */}
      <AddExpenseDrawer
        open={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        onSave={() => {
          setIsAddDrawerOpen(false);
          loadExpenses();
        }}
      />

      <ViewExpenseDrawer
        expense={viewingExpense}
        open={!!viewingExpense}
        onClose={() => setViewingExpense(null)}
        onDelete={() => {
          setViewingExpense(null);
          loadExpenses();
        }}
      />
    </div>
  );
}
