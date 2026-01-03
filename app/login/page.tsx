'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

/**
 * Login Page
 * FIX: Added auth check to redirect authenticated users to dashboard
 * Added: Registration button and Demo login
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // FIX: Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setError(
          'Supabase is not configured. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
        );
        setIsLoading(false);
        return;
      }

      const result = await signIn(email, password);
      
      // Safely check if sign in was successful
      if (!result) {
        setError('Login failed: No response received');
        setIsLoading(false);
        return;
      }

      // Check if we have a session (required for authenticated access)
      if (!result.session) {
        setError('Login failed: No session created. Please try again.');
        setIsLoading(false);
        return;
      }

      // FIX: After successful login, check if user has organization
      // If not, create one automatically
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession) {
          // Check if user has organization
          const { data: orgUser } = await supabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', result.user.id)
            .single();

          if (!orgUser) {
            // User doesn't have organization - create one
            // console.log('🏢 User has no organization - creating one...');
            const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
            
            const orgResponse = await fetch(`${API_BASE_URL}/onboarding/create-organization`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentSession.access_token}`,
              },
              body: JSON.stringify({
                name: result.user.email?.split('@')[0] + ' Organization' || 'My Organization',
                slug: result.user.email?.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-') || 'my-org',
              }),
            });

            if (orgResponse.ok) {
              // console.log('✅ Organization created automatically after login');
            } else {
              console.warn('⚠️ Failed to create organization automatically');
            }
          }
        }
      } catch (orgError) {
        // Don't block login if org creation fails
        console.error('❌ Error checking/creating organization:', orgError);
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || 'Login failed';
      
      // Check for network errors first
      if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('fetch')
      ) {
        setError(
          'Network error: Cannot connect to Supabase. Please check:\n' +
          '1. Your internet connection\n' +
          '2. Supabase URL in .env.local is correct\n' +
          '3. Supabase service is running'
        );
      } else if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('Invalid')) {
        setError('Invalid email or password. Please try again.');
      } else if (errorMessage.includes('Email not confirmed') || errorMessage.includes('not confirmed')) {
        setError('Please check your email and confirm your account before logging in.');
      } else if (errorMessage.includes('Email rate limit')) {
        setError('Too many login attempts. Please try again later.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setIsDemoLoading(true);

    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setError(
          'Supabase is not configured. Please check your .env.local file and ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
        );
        setIsDemoLoading(false);
        return;
      }

      // Primary demo account
      const demoAccount = { email: 'demo@pos.com', password: 'demo123456' };
      
      try {
        const result = await signIn(demoAccount.email, demoAccount.password);
        
        if (result && result.session) {
          // Success - redirect to dashboard
          router.push('/dashboard');
          return;
        }
      } catch (err: any) {
        const errorMessage = err?.message || err?.toString() || 'Login failed';
        
        // Check for network errors
        if (
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('Network request failed') ||
          errorMessage.includes('fetch')
        ) {
          setError(
            'Network error: Cannot connect to Supabase. Please check:\n' +
            '1. Your internet connection\n' +
            '2. Supabase URL in .env.local is correct\n' +
            '3. Supabase service is running\n' +
            '4. No firewall blocking the connection'
          );
          setIsDemoLoading(false);
          return;
        }
        
        // Check if it's an email confirmation error
        if (errorMessage.includes('Email not confirmed') || errorMessage.includes('not confirmed')) {
          setError(
            'Demo account needs email confirmation. Please run AUTO_CONFIRM_DEMO_USER.sql in Supabase SQL Editor.'
          );
          setIsDemoLoading(false);
          return;
        }
        
        // Check if it's invalid credentials
        if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('Invalid')) {
          setError(
            'Demo account not found or password incorrect. Please run COMPLETE_DEMO_SETUP.sql in Supabase SQL Editor to create the demo account.'
          );
          setIsDemoLoading(false);
          return;
        }
        
        // Other errors
        setError(`Demo login failed: ${errorMessage}. Please check if demo account exists.`);
        setIsDemoLoading(false);
        return;
      }
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || 'Demo login failed. Please check if demo account is set up.';
      
      // Check for network errors in outer catch
      if (
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Network request failed')
      ) {
        setError(
          'Network error: Cannot connect to Supabase. Please check your internet connection and Supabase configuration.'
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            POS System
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign in
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleDemoLogin}
              isLoading={isDemoLoading}
            >
              Try Demo Account
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

