'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/utils/supabase/client';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

/**
 * Registration Page
 */
export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(email, password);
      
      // FIX: Safely check if data exists and has user
      // Note: data.user may be null if email confirmation is required
      if (!result) {
        setError('Registration failed: No response received');
        setIsLoading(false);
        return;
      }

      const { user, session } = result;

      // FIX: Handle email confirmation scenario properly
      // If user exists and session exists, create organization immediately
      // If user exists but no session (email confirmation required), wait for confirmation
      if (!user) {
        // Email confirmation required - user will be created after email confirmation
        setError('');
        alert('Registration successful! Please check your email to verify your account, then log in. Your organization will be created automatically after you confirm your email.');
        router.push('/login');
        setIsLoading(false);
        return;
      }

      // User created successfully - check if we have a session
      if (!session) {
        // User exists but no session (email confirmation required)
        // console.log('ℹ️ Email confirmation required - user created but no session yet');
        setError('');
        alert('Registration successful! Please check your email to verify your account, then log in. Your organization will be created automatically after you confirm your email.');
        router.push('/login');
        setIsLoading(false);
        return;
      }

      // User and session both exist - create organization immediately
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        
        // console.log('🏢 Creating organization for new user...');
        
        const orgResponse = await fetch(`${API_BASE_URL}/onboarding/create-organization`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            name: email.split('@')[0] + ' Organization',
            slug: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '-'),
          }),
        });

        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          // console.log('✅ Organization created successfully:', orgData);
          setError('');
          // Redirect to dashboard
          router.push('/dashboard');
        } else {
          const errorData = await orgResponse.json().catch(() => ({}));
          console.warn('⚠️ Organization creation failed:', errorData);
          // User created but org creation failed - still allow login
          setError('');
          alert('Account created! Please log in to complete setup.');
          router.push('/login');
        }
      } catch (orgError) {
        // User created but org creation failed - still allow login
        console.error('❌ Failed to create organization:', orgError);
        setError('');
        alert('Account created! Please log in to complete setup.');
        router.push('/login');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      
      // Better error messages
      if (errorMessage.includes('Invalid API key') || errorMessage.includes('API key')) {
        setError('Configuration error: Please check Supabase API keys in .env.local file');
      } else if (errorMessage.includes('User already registered') || errorMessage.includes('already registered')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (errorMessage.includes('Password')) {
        setError('Password must be at least 6 characters long.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create Account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign up for POS System
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password (min 6 characters)"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm password"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create Account
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

