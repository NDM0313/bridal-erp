/**
 * Supabase Client Configuration
 * Creates Supabase clients for different use cases
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Ensure dotenv is loaded (in case this is imported before server.js)
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:');
  console.error(`   SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.error(`   SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ Set' : '❌ Missing'}`);
  throw new Error('Missing Supabase environment variables. Check .env file in backend/ folder.');
}

// Safe console verification (no secrets leaked - only first 6 chars)
const anonKeyPrefix = supabaseAnonKey ? supabaseAnonKey.substring(0, 6) + '...' : 'Missing';
const serviceKeyPrefix = supabaseServiceRoleKey ? supabaseServiceRoleKey.substring(0, 6) + '...' : 'Missing';

console.log('✅ Supabase Backend Client Initialized');
console.log('   URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('   Anon key prefix:', anonKeyPrefix);
console.log('   Service role key prefix:', serviceKeyPrefix);
console.log('   ✅ Service role key used ONLY server-side (never exposed to frontend)');

if (!supabaseServiceRoleKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY is not set. Admin operations will not work.');
}

/**
 * Client for user-authenticated requests (uses anon key)
 * Respects Row Level Security (RLS)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin client for server-side operations (uses service role key)
 * Bypasses RLS - use with caution!
 */
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Get Supabase client with user's JWT token
 * Used in middleware to create authenticated client
 */
export function getSupabaseClient(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export default supabase;

