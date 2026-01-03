/**
 * Authentication Hook
 * 
 * SECURITY: Uses anon key only. JWT token is automatically included
 * in all Supabase requests when user is authenticated.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // console.log('🔐 Attempting sign in...');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ Sign in error:', error.message);
        // Check for network errors and provide better message
        if (
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('Network request failed')
        ) {
          const networkError = new Error('Failed to fetch: Cannot connect to Supabase. Please check your internet connection and Supabase configuration.');
          (networkError as any).code = 'NETWORK_ERROR';
          throw networkError;
        }
        throw error;
      }

      // Handle case where data might be null
      if (!data) {
        console.warn('⚠️ Sign in returned no data');
        throw new Error('Sign in failed: No data returned');
      }

      // console.log('✅ Sign in successful:', {
      //   user: data.user ? data.user.email : 'No user',
      //   session: data.session ? 'Session created' : 'No session',
      // });

      return data;
    } catch (err: any) {
      // Re-throw network errors with better context
      if (
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.code === 'NETWORK_ERROR'
      ) {
        const networkError = new Error('Failed to fetch: Cannot connect to Supabase. Please check your internet connection and Supabase configuration.');
        (networkError as any).code = 'NETWORK_ERROR';
        throw networkError;
      }
      throw err;
    }
  };

  const signOut = async () => {
    // console.log('🚪 Signing out...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('❌ Sign out error:', error.message);
      throw error;
    }
    // console.log('✅ Signed out successfully');
    router.push('/login');
  };

  const signUp = async (email: string, password: string) => {
    // console.log('📝 Attempting sign up...', { email });
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Allow email confirmation to be handled by Supabase settings
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
      },
    });

    if (error) {
      console.error('❌ Sign up error:', error.message);
      throw error;
    }

    // Handle case where data might be null or user might be null (email confirmation required)
    if (!data) {
      console.warn('⚠️ Sign up returned no data');
      throw new Error('Sign up failed: No data returned');
    }

    // console.log('✅ Sign up response received:', {
    //   user: data.user ? data.user.email : 'No user (email confirmation may be required)',
    //   session: data.session ? 'Session created' : 'No session (email confirmation may be required)',
    // });

    // Return data even if user is null (email confirmation scenario)
    return data;
  };

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
    signUp,
  };
}

