import React from 'react';
import { 
  TrendingUp, 
  Users, 
  Package, 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShoppingBag,
  AlertCircle,
  Plus,
  FileText,
  CreditCard,
  Store
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
  Line
} from 'recharts';
import { cn } from '../../../lib/utils';
import { Button } from '../ui/button';

// Mock Data
const revenueData = [
  { name: 'Mon', income: 4000, expense: 2400 },
  { name: 'Tue', income: 3000, expense: 1398 },
  { name: 'Wed', income: 2000, expense: 9800 }, // High expense event
  { name: 'Thu', income: 2780, expense: 3908 },
  { name: 'Fri', income: 1890, expense: 4800 },
  { name: 'Sat', income: 2390, expense: 3800 },
  { name: 'Sun', income: 3490, expense: 4300 },
];

const branchPerformance = [
  { name: 'Main St.', sales: 45000 },
  { name: 'Mall Plaza', sales: 32000 },
  { name: 'Westside', sales: 28000 },
  { name: 'Airport', sales: 19000 },
];

const KPICard = ({ title, value, change, trend, icon: Icon, color }: any) => (
  <div className="relative overflow-hidden p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50 hover:bg-slate-800/40 transition-all duration-300 group">
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
      <Icon size={80} />
    </div>
    <div className="relative z-10 flex flex-col h-full justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-white`}>
          <Icon size={24} className={color.replace('text-', 'text-')} />
        </div>
        <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
          {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {change}
        </div>
      </div>
      <div>
        <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
      </div>
    </div>
  </div>
);

export function DashboardHome() {
  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-slate-400">Welcome back, here's what's happening with your store today.</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
          <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white">
            <FileText className="mr-2 h-4 w-4" /> Create Sale
          </Button>
          <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white">
            <ShoppingBag className="mr-2 h-4 w-4" /> Create Purchase
          </Button>
          <Button variant="outline" className="border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white">
            <CreditCard className="mr-2 h-4 w-4" /> Record Payment
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        <KPICard 
          title="Today's Sales" 
          value="$12,450.00" 
          change="+15% vs yesterday" 
          trend="up" 
          icon={DollarSign} 
          color="text-emerald-500"
        />
        <KPICard 
          title="Outstanding Credit" 
          value="$3,200.00" 
          change="+5% vs last week" 
          trend="up" 
          icon={CreditCard} 
          color="text-orange-500"
        />
        <KPICard 
          title="Low Stock Alerts" 
          value="12 Items" 
          change="Requires Attention" 
          trend="down" 
          icon={AlertCircle} 
          color="text-rose-500"
        />
         <KPICard 
          title="Total Branches" 
          value="4 Active" 
          change="All systems operational" 
          trend="up" 
          icon={Store} 
          color="text-blue-500"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Expense vs Income Chart */}
        <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-200">Income vs Expense</h3>
            <select className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-sm text-slate-300 focus:outline-none focus:border-blue-500">
              <option>This Week</option>
              <option>Last Month</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#64748b" 
                  tick={{fill: '#64748b', fontSize: 12}} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `$${value}`} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                  itemStyle={{ color: '#94a3b8' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorIncome)" 
                  name="Income"
                />
                <Area 
                  type="monotone" 
                  dataKey="expense" 
                  stroke="#f43f5e" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorExpense)" 
                  name="Expense"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Branch Performance Chart */}
        <div className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-200">Branch Performance</h3>
            <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">View Report</Button>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchPerformance} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#94a3b8" 
                  tick={{fill: '#94a3b8', fontSize: 14}} 
                  tickLine={false} 
                  axisLine={false}
                  width={100}
                />
                <Tooltip 
                  cursor={{fill: '#1e293b', opacity: 0.4}}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                />
                <Bar 
                  dataKey="sales" 
                  fill="#3b82f6" 
                  radius={[0, 4, 4, 0]} 
                  barSize={32}
                  name="Total Sales"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
