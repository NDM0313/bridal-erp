/**
 * Test Page for Injecting Dummy Salesmen
 * Quick way to add test data
 */

'use client';

import React, { useState } from 'react';
import { ModernDashboardLayout } from '@/components/layout/ModernDashboardLayout';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { injectDummySalesmen } from '@/scripts/inject-dummy-salesmen';

export default function TestDummySalesmenPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleInject = async () => {
    setLoading(true);
    setResults([]);
    
    try {
      const results = await injectDummySalesmen();
      setResults(results);
      
      const successCount = results.filter(r => r.status === 'success').length;
      toast.success(`Created ${successCount} out of ${results.length} salesmen`);
    } catch (err: any) {
      console.error('Error:', err);
      toast.error(`Failed: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModernDashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Inject Dummy Salesmen</h1>
          <p className="text-sm text-gray-400 mt-1">Create 3 test salesmen for testing</p>
        </div>

        <Button
          onClick={handleInject}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {loading ? 'Creating...' : 'Inject Dummy Salesmen'}
        </Button>

        {results.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Results:</h3>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div key={index} className="p-3 bg-slate-700/50 rounded">
                  <div className="font-medium text-white">{result.name}</div>
                  <div className="text-sm text-gray-400">
                    Status: <span className={result.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                      {result.status}
                    </span>
                  </div>
                  {result.salary && (
                    <div className="text-sm text-gray-400">
                      Salary: {result.salary.toFixed(2)}, Commission: {result.commission_percentage}%
                    </div>
                  )}
                  {result.error && (
                    <div className="text-sm text-red-400">Error: {result.error}</div>
                  )}
                  {result.note && (
                    <div className="text-sm text-yellow-400">Note: {result.note}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModernDashboardLayout>
  );
}

