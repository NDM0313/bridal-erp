import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { DashboardHome } from './components/dashboard/Home';
import { POS } from './components/pos/POS';
import { ProductList } from './components/inventory/ProductList';
import { Construction } from 'lucide-react';

const ComingSoon = ({ title }: { title: string }) => (
  <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
    <div className="p-6 rounded-full bg-slate-900/50 border border-slate-800">
      <Construction size={48} className="text-blue-500 opacity-50" />
    </div>
    <div className="text-center">
      <h2 className="text-xl font-bold text-slate-200 mb-2">{title} Module</h2>
      <p className="max-w-md text-slate-400">This module is currently under development. Check back later for updates.</p>
    </div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardHome />;
      case 'pos':
        return <POS />;
      case 'products':
        return <ProductList />;
      case 'sales':
        return <ComingSoon title="Sales & Quotations" />;
      case 'purchases':
        return <ComingSoon title="Purchase Management" />;
      case 'stock_transfers':
        return <ComingSoon title="Stock Transfers" />;
      case 'stock_adjustments':
        return <ComingSoon title="Stock Adjustments" />;
      case 'expenses':
        return <ComingSoon title="Expense Management" />;
      case 'contacts':
        return <ComingSoon title="Contacts (CRM)" />;
      case 'accounting':
        return <ComingSoon title="Accounting & Finance" />;
      case 'users':
        return <ComingSoon title="User Management" />;
      case 'reports':
        return <ComingSoon title="Reports & Analytics" />;
      case 'modules':
        return <ComingSoon title="Modules & Add-ons" />;
      case 'notifications':
        return <ComingSoon title="Notification Templates" />;
      case 'settings':
        return <ComingSoon title="Settings" />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
