'use client';

import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { ExpensesDashboard } from '@/components/expenses/ExpensesDashboard';

export default function ExpensesPage() {
  return (
    <ModernDashboardLayout>
      <div className="flex flex-col h-full" style={{ backgroundColor: '#0B0F1A' }}>
      <div className="flex-1 overflow-y-auto px-6 py-6 standard-page-container">
        <ExpensesDashboard />
      </div>
      </div>
    </ModernDashboardLayout>
  );
}
