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
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
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

