/**
 * Supabase Client Configuration
 * Frontend client using anon key - respects RLS policies
 * 
 * SECURITY: This client uses NEXT_PUBLIC_SUPABASE_ANON_KEY only.
 * Service role key is NEVER used in frontend code.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Better error handling with helpful messages
if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = []
  if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
  if (!supabaseAnonKey) missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  
  console.error('❌ Missing Supabase environment variables:')
  console.error('Missing:', missingVars.join(', '))
  console.error('')
  console.error('📝 To fix:')
  console.error('1. Create .env.local file in my-pos-system folder')
  console.error('2. Add these variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key')
  console.error('3. Get keys from: Supabase Dashboard → Settings → API')
  console.error('4. Restart server (npm run dev)')
  console.error('')
  console.error('📖 See ENV_SETUP_GUIDE.md for detailed instructions')
  
  throw new Error(
    `Missing Supabase environment variables: ${missingVars.join(', ')}. ` +
    `Please create .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. ` +
    `See ENV_SETUP_GUIDE.md for help.`
  )
}

// Validate URL format
if (!supabaseUrl.startsWith('https://')) {
  console.error('❌ Invalid Supabase URL format. Should start with https://')
  throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL format. Must start with https://')
}

// Validate key format (can be new format sb_publishable_ or legacy anon key)
if (supabaseAnonKey.length < 20) {
  console.error('❌ Supabase API key seems too short. Please check your key.')
  throw new Error('Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY. Key seems too short. Please check your Supabase Dashboard.')
}

/**
 * Supabase client for frontend use
 * - Uses anon key (safe to expose)
 * - Respects RLS policies
 * - Requires JWT token for authenticated operations
 * - Automatically includes JWT in requests when user is logged in
 * 
 * SECURITY VERIFICATION:
 * ✅ Uses NEXT_PUBLIC_SUPABASE_ANON_KEY only (publishable key)
 * ✅ NEVER uses service_role key in frontend
 * ✅ All operations respect RLS policies
 */
// Create AbortController for timeout (browser-compatible)
const createTimeoutSignal = (timeoutMs: number = 60000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cleanup: () => clearTimeout(timeoutId) };
};

// Enhanced fetch with retry logic and better error handling
const enhancedFetch = async (url: string, options: RequestInit = {}, retries = 3): Promise<Response> => {
  let lastError: any = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    // Create a NEW timeout signal for each attempt
    const { signal, cleanup } = createTimeoutSignal(60000); // 60 seconds per attempt
    
    try {
      const response = await fetch(url, {
        ...options,
        signal,
      });
      
      cleanup();
      
      // Check if response is OK
      if (!response.ok && response.status >= 500) {
        // Server error - retry
        cleanup();
        lastError = new Error(`Server error: ${response.status}`);
        if (attempt < retries) {
          console.warn(`⚠️ Server error ${response.status}, retrying... (${attempt + 1}/${retries + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          continue;
        }
      }
      
      return response;
    } catch (error: any) {
      cleanup();
      lastError = error;
      
      // Don't retry on last attempt
      if (attempt === retries) {
        // Provide user-friendly error messages
        if (error.name === 'AbortError') {
          console.error('⏱️ Request timeout after 60s');
          console.error('💡 This might indicate:');
          console.error('   1. Slow internet connection');
          console.error('   2. Supabase service is slow or overloaded');
          console.error('   3. Network connectivity issues');
          // Return a graceful error response instead of throwing
          return new Response(JSON.stringify({ 
            error: 'timeout',
            message: 'Connection timed out. Please check your internet connection and try again.' 
          }), { 
            status: 504,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        if (error.message === 'Failed to fetch' || error.message?.includes('fetch') || error.message?.includes('network')) {
          console.error('🌐 Network error:', error.message);
          console.error('💡 Possible causes:');
          console.error('   1. No internet connection');
          console.error('   2. Supabase project paused/not accessible');
          console.error('   3. Incorrect SUPABASE_URL in .env.local');
          console.error('   4. Firewall blocking connection');
          // Return graceful error response for offline mode
          return new Response(JSON.stringify({ 
            error: 'offline',
            message: 'Unable to connect to server. Please check your internet connection.' 
          }), { 
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        // For other errors, return a generic error response
        console.error('❌ Request failed:', error.message);
        return new Response(JSON.stringify({ 
          error: 'request_failed',
          message: error.message || 'Request failed. Please try again.' 
        }), { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Wait before retry (exponential backoff: 1s, 2s, 4s)
      const delay = 1000 * Math.pow(2, attempt);
      console.warn(`⚠️ Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Fallback (should never reach here)
  return new Response(JSON.stringify({ 
    error: 'max_retries',
    message: 'Request failed after multiple attempts. Please try again later.' 
  }), { 
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce',
  },
  global: {
    fetch: enhancedFetch,
  },
})

// Safe console verification (no secrets leaked - only first 6 chars)
if (typeof window !== 'undefined') {
  const keyPrefix = supabaseAnonKey ? supabaseAnonKey.substring(0, 6) + '...' : 'Missing';
  const keyFormat = supabaseAnonKey?.startsWith('sb_publishable_') 
    ? 'New (publishable)' 
    : supabaseAnonKey?.startsWith('eyJ') 
    ? 'Legacy (anon)' 
    : 'Unknown';
  
  console.log('✅ Supabase Frontend Client Initialized');
  console.log('   URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('   Key prefix:', keyPrefix);
  console.log('   Key format:', keyFormat);
  console.log('   Key length:', supabaseAnonKey?.length || 0, 'characters');
  console.log('   ✅ Using ANON/PUBLISHABLE key only (safe for frontend)');
  console.log('   ✅ Service role key NEVER used in frontend');
}

