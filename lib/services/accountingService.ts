/**
 * Accounting Service
 * Handles default accounts, account transactions, and accounting entries
 */

import { supabase } from '@/utils/supabase/client';

export interface DefaultAccount {
  id: number;
  name: string;
  type: 'cash' | 'bank';
}

/**
 * Get or create default accounts for a business
 * Returns Cash in Hand (cash) and Bank Account (bank)
 */
export async function getOrCreateDefaultAccounts(
  businessId: number,
  userId: string
): Promise<{ cashAccount: DefaultAccount; bankAccount: DefaultAccount }> {
  // Get or create Cash in Hand account
  let { data: cashAccount, error: cashError } = await supabase
    .from('financial_accounts')
    .select('id, name, type')
    .eq('business_id', businessId)
    .eq('name', 'Cash in Hand')
    .eq('type', 'cash')
    .single();

  if (!cashAccount || cashError) {
    const { data: newCash, error: createCashError } = await supabase
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
      .select('id, name, type')
      .single();

    if (createCashError) {
      throw new Error(`Failed to create Cash in Hand account: ${createCashError.message}`);
    }
    cashAccount = newCash;
  }

  // Get or create Bank Account
  let { data: bankAccount, error: bankError } = await supabase
    .from('financial_accounts')
    .select('id, name, type')
    .eq('business_id', businessId)
    .eq('name', 'Bank Account')
    .eq('type', 'bank')
    .single();

  if (!bankAccount || bankError) {
    const { data: newBank, error: createBankError } = await supabase
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
      .select('id, name, type')
      .single();

    if (createBankError) {
      throw new Error(`Failed to create Bank Account: ${createBankError.message}`);
    }
    bankAccount = newBank;
  }

  return {
    cashAccount: cashAccount as DefaultAccount,
    bankAccount: bankAccount as DefaultAccount,
  };
}

/**
 * Create an account transaction for a sale/purchase
 * Automatically links to default account based on payment method
 */
export async function createAccountTransactionForSale(
  businessId: number,
  transactionId: number,
  amount: number,
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer',
  userId: string,
  description?: string
): Promise<void> {
  // Get default accounts
  const { cashAccount, bankAccount } = await getOrCreateDefaultAccounts(businessId, userId);

  // Determine which account to use based on payment method
  let accountId: number;
  if (paymentMethod === 'Cash') {
    accountId = cashAccount.id;
  } else {
    // Card or Bank Transfer goes to Bank Account
    accountId = bankAccount.id;
  }

  // Create credit transaction (money coming in from sale)
  const { error: txError } = await supabase.from('account_transactions').insert({
    account_id: accountId,
    business_id: businessId,
    type: 'credit', // Credit = money coming in
    amount: amount,
    reference_type: 'sell',
    reference_id: transactionId,
    description: description || `Sale payment via ${paymentMethod}`,
    transaction_date: new Date().toISOString(),
    created_by: userId,
  });

  if (txError) {
    console.error('Failed to create account transaction:', txError);
    // Don't throw - log but continue (account balance will be updated by trigger)
  }
}

/**
 * Create an account transaction for a purchase
 * Automatically links to default account based on payment method
 */
export async function createAccountTransactionForPurchase(
  businessId: number,
  transactionId: number,
  amount: number,
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer',
  userId: string,
  description?: string
): Promise<void> {
  // Get default accounts
  const { cashAccount, bankAccount } = await getOrCreateDefaultAccounts(businessId, userId);

  // Determine which account to use based on payment method
  let accountId: number;
  if (paymentMethod === 'Cash') {
    accountId = cashAccount.id;
  } else {
    // Card or Bank Transfer goes to Bank Account
    accountId = bankAccount.id;
  }

  // Create debit transaction (money going out for purchase)
  const { error: txError } = await supabase.from('account_transactions').insert({
    account_id: accountId,
    business_id: businessId,
    type: 'debit', // Debit = money going out
    amount: amount,
    reference_type: 'purchase',
    reference_id: transactionId,
    description: description || `Purchase payment via ${paymentMethod}`,
    transaction_date: new Date().toISOString(),
    created_by: userId,
  });

  if (txError) {
    console.error('Failed to create account transaction:', txError);
    // Don't throw - log but continue (account balance will be updated by trigger)
  }
}

/**
 * Get default account ID for a payment method
 */
export async function getDefaultAccountId(
  businessId: number,
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer',
  userId: string
): Promise<number> {
  const { cashAccount, bankAccount } = await getOrCreateDefaultAccounts(businessId, userId);

  if (paymentMethod === 'Cash') {
    return cashAccount.id;
  } else {
    return bankAccount.id;
  }
}

