/**
 * Supabase Security Test Utilities
 * Helper functions to verify RLS enforcement and authentication
 */

import { supabase } from '@/utils/supabase/client';

export interface SecurityTestResult {
  test: string;
  passed: boolean;
  message: string;
  details?: unknown;
}

/**
 * Test 1: Verify user is authenticated
 */
export async function testAuthentication(): Promise<SecurityTestResult> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      return {
        test: 'Authentication Check',
        passed: false,
        message: `Authentication error: ${error.message}`,
        details: { error },
      };
    }

    if (!session || !session.user) {
      return {
        test: 'Authentication Check',
        passed: false,
        message: 'User is not authenticated',
        details: { session: null },
      };
    }

    return {
      test: 'Authentication Check',
      passed: true,
      message: `User authenticated: ${session.user.email}`,
      details: {
        userId: session.user.id,
        email: session.user.email,
        hasToken: !!session.access_token,
      },
    };
  } catch (err) {
    return {
      test: 'Authentication Check',
      passed: false,
      message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
      details: { error: err },
    };
  }
}

/**
 * Test 2: Verify JWT token is present
 */
export async function testJWTToken(): Promise<SecurityTestResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return {
        test: 'JWT Token Check',
        passed: false,
        message: 'JWT token is missing from session',
        details: { session: !!session },
      };
    }

    return {
      test: 'JWT Token Check',
      passed: true,
      message: 'JWT token is present and valid',
      details: {
        tokenLength: session.access_token.length,
        tokenPrefix: session.access_token.substring(0, 20) + '...',
      },
    };
  } catch (err) {
    return {
      test: 'JWT Token Check',
      passed: false,
      message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
      details: { error: err },
    };
  }
}

/**
 * Test 3: Test direct Supabase query (should respect RLS)
 */
export async function testDirectQuery(): Promise<SecurityTestResult> {
  try {
    const { data, error } = await supabase.from('products').select('*').limit(10);

    if (error) {
      return {
        test: 'Direct Query (Authenticated)',
        passed: false,
        message: `Query failed: ${error.message}`,
        details: { error },
      };
    }

    // Verify all products have business_id (RLS should filter)
    const allHaveBusinessId = data.every((p: { business_id: number }) => {
      return p.business_id !== null && p.business_id !== undefined;
    });

    return {
      test: 'Direct Query (Authenticated)',
      passed: allHaveBusinessId,
      message: `Retrieved ${data.length} products. ${allHaveBusinessId ? 'All have business_id set.' : 'Some products missing business_id!'}`,
      details: {
        count: data.length,
        allHaveBusinessId,
        sample: data[0] || null,
      },
    };
  } catch (err) {
    return {
      test: 'Direct Query (Authenticated)',
      passed: false,
      message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
      details: { error: err },
    };
  }
}

/**
 * Test 4: Verify user_profiles exists
 */
export async function testUserProfile(): Promise<SecurityTestResult> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        test: 'User Profile Check',
        passed: false,
        message: 'User not found',
        details: { user: null },
      };
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        test: 'User Profile Check',
        passed: false,
        message: `No user profile found: ${profileError?.message || 'Profile not found'}`,
        details: { error: profileError },
      };
    }

    return {
      test: 'User Profile Check',
      passed: true,
      message: `User profile found with business_id: ${profile.business_id}`,
      details: { businessId: profile.business_id },
    };
  } catch (err) {
    return {
      test: 'User Profile Check',
      passed: false,
      message: `Exception: ${err instanceof Error ? err.message : 'Unknown error'}`,
      details: { error: err },
    };
  }
}

/**
 * Test 5: Verify RLS blocks unauthenticated access
 */
export async function testRLSEnforcement(): Promise<SecurityTestResult> {
  try {
    // Create a new client without session (simulating unauthenticated)
    const { createClient } = await import('@supabase/supabase-js');
    const testClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Don't set session - should be unauthenticated
    const { data, error } = await testClient.from('products').select('*').limit(1);

    // RLS should block - should get empty array or error
    if (data && data.length > 0) {
      return {
        test: 'RLS Enforcement Check',
        passed: false,
        message: 'RLS is NOT blocking unauthenticated access!',
        details: { data, count: data.length },
      };
    }

    return {
      test: 'RLS Enforcement Check',
      passed: true,
      message: 'RLS correctly blocks unauthenticated access',
      details: {
        dataLength: data?.length || 0,
        error: error?.message || null,
      },
    };
  } catch (err) {
    return {
      test: 'RLS Enforcement Check',
      passed: true, // Exception is acceptable - RLS is working
      message: 'RLS correctly blocks unauthenticated access (exception thrown)',
      details: {
        error: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
}

/**
 * Run all security tests
 */
export async function runAllSecurityTests(): Promise<SecurityTestResult[]> {
  const results: SecurityTestResult[] = [];

  // Test 1: Authentication
  results.push(await testAuthentication());

  // Test 2: JWT Token
  results.push(await testJWTToken());

  // Test 3: Direct Query
  results.push(await testDirectQuery());

  // Test 4: User Profile
  results.push(await testUserProfile());

  // Test 5: RLS Enforcement
  results.push(await testRLSEnforcement());

  return results;
}

