/**
 * Dummy Salesmen Injection Script
 * Creates 3 test salesmen for testing purposes
 * 
 * Usage: Run this function from browser console or create a test page
 */

import { supabase } from '@/utils/supabase/client';

interface DummySalesman {
  name: string;
  email: string;
  password: string;
  commission_percentage: number;
  base_salary: number;
}

const DUMMY_SALESMEN: DummySalesman[] = [
  {
    name: 'Zaid Khan',
    email: 'zaid.khan@test.com',
    password: 'Test123!',
    commission_percentage: 2.5,
    base_salary: 25000
  },
  {
    name: 'Ahmed Ali',
    email: 'ahmed.ali@test.com',
    password: 'Test123!',
    commission_percentage: 3.0,
    base_salary: 30000
  },
  {
    name: 'Bilal Sheikh',
    email: 'bilal.sheikh@test.com',
    password: 'Test123!',
    commission_percentage: 2.0,
    base_salary: 22000
  }
];

export async function injectDummySalesmen() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Please log in first');
    }

    // Get business_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('business_id')
      .eq('user_id', session.user.id)
      .single();

    if (!profile?.business_id) {
      throw new Error('Business profile not found');
    }

    const results = [];

    for (const salesman of DUMMY_SALESMEN) {
      try {
        // Create auth user
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: salesman.email,
          password: salesman.password,
          options: {
            data: {
              full_name: salesman.name,
            },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          }
        });

        if (signUpError) {
          console.error(`Failed to create ${salesman.name}:`, signUpError);
          results.push({ name: salesman.name, status: 'failed', error: signUpError.message });
          continue;
        }

        if (signUpData?.user) {
          // Create user profile with salesman fields
          const profileData: any = {
            user_id: signUpData.user.id,
            business_id: profile.business_id,
            role: 'salesman',
            base_salary: salesman.base_salary,
            commission_percentage: salesman.commission_percentage,
          };

          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert(profileData);

          if (profileError) {
            // If columns don't exist, try without them
            if (profileError.message.includes('column')) {
              const { error: retryError } = await supabase
                .from('user_profiles')
                .insert({
                  user_id: signUpData.user.id,
                  business_id: profile.business_id,
                  role: 'salesman',
                });

              if (retryError) {
                throw retryError;
              }
              results.push({ 
                name: salesman.name, 
                status: 'created (without salary fields)', 
                note: 'Run migration to add base_salary and commission_percentage columns' 
              });
            } else {
              throw profileError;
            }
          } else {
            results.push({ 
              name: salesman.name, 
              status: 'success',
              salary: salesman.base_salary,
              commission: salesman.commission_percentage
            });
          }
        }
      } catch (err: any) {
        console.error(`Error creating ${salesman.name}:`, err);
        results.push({ name: salesman.name, status: 'failed', error: err.message });
      }
    }

    return results;
  } catch (err: any) {
    console.error('Failed to inject dummy salesmen:', err);
    throw err;
  }
}

// Make it available globally for console access
if (typeof window !== 'undefined') {
  (window as any).injectDummySalesmen = injectDummySalesmen;
}

