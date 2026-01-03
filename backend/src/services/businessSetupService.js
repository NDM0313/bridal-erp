/**
 * Business Setup Service (Backend)
 * Creates default accounts and contacts when a new business is registered
 */

import { supabase } from '../config/supabase.js';

/**
 * Create default resources for a new business
 * - Cash in Hand account
 * - Bank Account
 * - Walk-in Customer contact
 */
export async function setupDefaultBusinessResources(businessId, userId) {
  try {
    // 1. Create Cash in Hand account
    const { data: cashAccount, error: cashError } = await supabase
      .from('financial_accounts')
      .insert({
        business_id: businessId,
        name: 'Cash in Hand',
        type: 'cash',
        current_balance: 0,
        opening_balance: 0,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();

    if (cashError && cashError.code !== '23505') {
      // Ignore duplicate key errors (23505)
      console.error('Failed to create Cash in Hand account:', cashError);
      // Don't throw - log but continue
    }

    // 2. Create Bank Account
    const { data: bankAccount, error: bankError } = await supabase
      .from('financial_accounts')
      .insert({
        business_id: businessId,
        name: 'Bank Account',
        type: 'bank',
        current_balance: 0,
        opening_balance: 0,
        is_active: true,
        created_by: userId,
      })
      .select()
      .single();

    if (bankError && bankError.code !== '23505') {
      // Ignore duplicate key errors (23505)
      console.error('Failed to create Bank Account:', bankError);
      // Don't throw - log but continue
    }

    // 3. Create Walk-in Customer contact
    const { data: walkInCustomer, error: customerError } = await supabase
      .from('contacts')
      .insert({
        business_id: businessId,
        type: 'customer',
        name: 'Walk-in Customer',
        mobile: null,
        email: null,
        created_by: userId,
      })
      .select()
      .single();

    if (customerError && customerError.code !== '23505') {
      // Ignore duplicate key errors (23505)
      console.error('Failed to create Walk-in Customer:', customerError);
      // Don't throw - log but continue
    }

    console.log('✅ Default business resources created:', {
      businessId,
      cashAccount: cashAccount?.id,
      bankAccount: bankAccount?.id,
      walkInCustomer: walkInCustomer?.id,
    });

    return {
      cashAccount: cashAccount?.id,
      bankAccount: bankAccount?.id,
      walkInCustomer: walkInCustomer?.id,
    };
  } catch (err) {
    console.error('Error setting up default business resources:', err);
    // Don't throw - log but continue (business creation should not fail)
    // These can be created manually later if needed
    return null;
  }
}

/**
 * Check if default resources exist for a business
 * Returns true if all default resources exist
 */
export async function checkDefaultResourcesExist(businessId) {
  try {
    const [cashAccount, bankAccount, walkInCustomer] = await Promise.all([
      supabase
        .from('financial_accounts')
        .select('id')
        .eq('business_id', businessId)
        .eq('name', 'Cash in Hand')
        .eq('type', 'cash')
        .single(),
      supabase
        .from('financial_accounts')
        .select('id')
        .eq('business_id', businessId)
        .eq('name', 'Bank Account')
        .eq('type', 'bank')
        .single(),
      supabase
        .from('contacts')
        .select('id')
        .eq('business_id', businessId)
        .eq('name', 'Walk-in Customer')
        .eq('type', 'customer')
        .single(),
    ]);

    return (
      !cashAccount.error &&
      !bankAccount.error &&
      !walkInCustomer.error &&
      cashAccount.data !== null &&
      bankAccount.data !== null &&
      walkInCustomer.data !== null
    );
  } catch (err) {
    console.error('Error checking default resources:', err);
    return false;
  }
}

