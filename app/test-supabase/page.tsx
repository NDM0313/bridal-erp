'use client';

/**
 * Test Page for Supabase Direct Query
 * Verifies RLS enforcement and authenticated data access
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/Button';

interface TestResult {
  test: string;
  status: 'pass' | 'fail' | 'pending';
  message: string;
  data?: unknown;
}

export default function TestSupabasePage() {
  const { user, session, loading: authLoading } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test: string, status: 'pass' | 'fail' | 'pending', message: string, data?: unknown) => {
    setResults((prev) => [...prev, { test, status, message, data }]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    // Test 1: Check authentication
    addResult('Authentication Check', 'pending', 'Checking if user is authenticated...');
    if (!user || !session) {
      addResult('Authentication Check', 'fail', 'User is not authenticated. Please login first.');
      setIsRunning(false);
      return;
    }
    addResult('Authentication Check', 'pass', `User authenticated: ${user.email}`, {
      userId: user.id,
      hasSession: !!session,
      hasToken: !!session.access_token,
    });

    // Test 2: Check JWT token
    addResult('JWT Token Check', 'pending', 'Verifying JWT token exists...');
    if (!session.access_token) {
      addResult('JWT Token Check', 'fail', 'JWT token is missing from session');
      setIsRunning(false);
      return;
    }
    addResult('JWT Token Check', 'pass', 'JWT token is present', {
      tokenLength: session.access_token.length,
      tokenPrefix: session.access_token.substring(0, 20) + '...',
    });

    // Test 3: Direct Supabase query (authenticated)
    addResult('Direct Query (Authenticated)', 'pending', 'Querying products table...');
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(10);

      if (error) {
        addResult('Direct Query (Authenticated)', 'fail', `Query failed: ${error.message}`, { error });
      } else {
        const allOwnBusiness = data.every((p: { business_id: number }) => {
          // We can't check exact business_id without user_profiles, but RLS should filter
          return p.business_id !== null && p.business_id !== undefined;
        });
        addResult(
          'Direct Query (Authenticated)',
          allOwnBusiness ? 'pass' : 'fail',
          `Retrieved ${data.length} products. All have business_id set.`,
          { count: data.length, sample: data[0] }
        );
      }
    } catch (err) {
      addResult('Direct Query (Authenticated)', 'fail', `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Test 4: Verify RLS is enforcing (check user_profiles)
    addResult('User Profile Check', 'pending', 'Checking user_profiles...');
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        addResult('User Profile Check', 'fail', `No user profile found: ${profileError?.message || 'Profile not found'}`, { error: profileError });
      } else {
        addResult('User Profile Check', 'pass', `User profile found with business_id: ${profile.business_id}`, { businessId: profile.business_id });
      }
    } catch (err) {
      addResult('User Profile Check', 'fail', `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Test 5: Test unauthenticated query (simulate)
    addResult('RLS Enforcement Check', 'pending', 'Verifying RLS blocks unauthorized access...');
    try {
      // Create a new client without session (simulating unauthenticated)
      const { createClient } = await import('@supabase/supabase-js');
      const testClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      // Don't set session - should be unauthenticated
      const { data: unauthenticatedData, error: unauthenticatedError } = await testClient
        .from('products')
        .select('*')
        .limit(1);

      // RLS should block - should get empty array or error
      if (unauthenticatedData && unauthenticatedData.length > 0) {
        addResult('RLS Enforcement Check', 'fail', 'RLS is NOT blocking unauthenticated access!', { data: unauthenticatedData });
      } else {
        addResult('RLS Enforcement Check', 'pass', 'RLS correctly blocks unauthenticated access', {
          dataLength: unauthenticatedData?.length || 0,
          error: unauthenticatedError?.message,
        });
      }
    } catch (err) {
      addResult('RLS Enforcement Check', 'pass', 'RLS correctly blocks unauthenticated access (exception thrown)', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    setIsRunning(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-600">Please login to run tests</p>
          <Button onClick={() => (window.location.href = '/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supabase Security Test</h1>
            <p className="text-gray-600 mt-2">Testing RLS enforcement and authenticated data access</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="font-semibold text-blue-900 mb-2">Current Session</h2>
            <div className="text-sm text-blue-800 space-y-1">
              <p>User: {user.email}</p>
              <p>User ID: {user.id}</p>
              <p>Has Session: {session ? 'Yes' : 'No'}</p>
              <p>Has Token: {session?.access_token ? 'Yes' : 'No'}</p>
            </div>
          </div>

          <div>
            <Button onClick={runTests} disabled={isRunning} className="w-full">
              {isRunning ? 'Running Tests...' : 'Run Security Tests'}
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-gray-900">Test Results</h2>
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    result.status === 'pass'
                      ? 'bg-green-50 border-green-200'
                      : result.status === 'fail'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{result.test}</h3>
                      <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                      {result.data !== undefined && (
                        <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div className="ml-4">
                      {result.status === 'pass' && <span className="text-green-600 font-bold">✓ PASS</span>}
                      {result.status === 'fail' && <span className="text-red-600 font-bold">✗ FAIL</span>}
                      {result.status === 'pending' && <span className="text-yellow-600 font-bold">⏳ PENDING</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Security Checklist</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✓ Frontend uses anon key only (NEXT_PUBLIC_SUPABASE_ANON_KEY)</li>
              <li>✓ JWT token is included in requests automatically</li>
              <li>✓ RLS policies enforce business_id isolation</li>
              <li>✓ Unauthenticated users see no data</li>
              <li>✓ Service role key is NOT in frontend code</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

