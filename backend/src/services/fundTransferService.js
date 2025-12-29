/**
 * Fund Transfer Service
 * Handles account-to-account fund transfers with double-entry accounting
 */

import { supabase } from '../config/supabase.js';

/**
 * Transfer funds between accounts (creates double-entry transactions)
 * @param {object} transferData - Transfer data
 * @param {number} businessId - Business ID
 * @param {string} userId - User ID (created_by)
 * @returns {Promise<object>} Created transfer with transactions
 */
export async function createFundTransfer(transferData, businessId, userId) {
  const {
    fromAccountId,
    toAccountId,
    amount,
    transferDate = new Date().toISOString(),
    referenceNo = null,
    notes = null,
  } = transferData;

  // Validate required fields
  if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
    throw new Error('Missing required fields: fromAccountId, toAccountId, amount (must be > 0)');
  }

  if (fromAccountId === toAccountId) {
    throw new Error('From and To accounts cannot be the same');
  }

  // Verify both accounts belong to business
  const { data: accounts, error: accountsError } = await supabase
    .from('financial_accounts')
    .select('id, name, current_balance, type')
    .eq('business_id', businessId)
    .in('id', [fromAccountId, toAccountId]);

  if (accountsError) {
    throw new Error(`Failed to verify accounts: ${accountsError.message}`);
  }

  if (accounts.length !== 2) {
    throw new Error('One or both accounts not found or do not belong to this business');
  }

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);

  // Check if from account has sufficient balance
  if (fromAccount.current_balance < amount) {
    throw new Error(
      `Insufficient balance. Available: ${fromAccount.current_balance}, Required: ${amount}`
    );
  }

  // Create fund transfer record
  // Note: The trigger will automatically create the account_transactions
  const { data: transfer, error: transferError } = await supabase
    .from('fund_transfers')
    .insert({
      business_id: businessId,
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount,
      transfer_date: transferDate,
      reference_no: referenceNo,
      notes,
      created_by: userId,
    })
    .select(`
      *,
      from_account:financial_accounts!fund_transfers_from_account_id_fkey(id, name, type, current_balance),
      to_account:financial_accounts!fund_transfers_to_account_id_fkey(id, name, type, current_balance)
    `)
    .single();

  if (transferError) {
    throw new Error(`Failed to create fund transfer: ${transferError.message}`);
  }

  // Fetch the account transactions created by the trigger
  const { data: transactions, error: transactionsError } = await supabase
    .from('account_transactions')
    .select('*')
    .eq('reference_type', 'transfer')
    .eq('reference_id', transfer.id)
    .order('created_at', { ascending: true });

  if (transactionsError) {
    console.error('Failed to fetch transfer transactions:', transactionsError);
  }

  return {
    ...transfer,
    transactions: transactions || [],
  };
}

/**
 * Get all fund transfers for a business
 * @param {number} businessId - Business ID
 * @param {object} options - Query options
 * @returns {Promise<object>} Transfers list
 */
export async function getFundTransfers(businessId, options = {}) {
  const {
    page = 1,
    perPage = 20,
    accountId = null,
    startDate = null,
    endDate = null,
  } = options;

  let query = supabase
    .from('fund_transfers')
    .select(`
      *,
      from_account:financial_accounts!fund_transfers_from_account_id_fkey(id, name, type),
      to_account:financial_accounts!fund_transfers_to_account_id_fkey(id, name, type)
    `)
    .eq('business_id', businessId)
    .order('transfer_date', { ascending: false });

  if (accountId) {
    query = query.or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`);
  }

  if (startDate) {
    query = query.gte('transfer_date', startDate);
  }

  if (endDate) {
    query = query.lte('transfer_date', endDate);
  }

  // Pagination
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  query = query.range(from, to);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch fund transfers: ${error.message}`);
  }

  // Get total count
  const { count: totalCount } = await supabase
    .from('fund_transfers')
    .select('*', { count: 'exact', head: true })
    .eq('business_id', businessId);

  return {
    data: data || [],
    meta: {
      page,
      perPage,
      total: totalCount || 0,
      totalPages: Math.ceil((totalCount || 0) / perPage),
    },
  };
}

/**
 * Get financial accounts for a business
 * @param {number} businessId - Business ID
 * @returns {Promise<array>} Financial accounts
 */
export async function getFinancialAccounts(businessId) {
  const { data, error } = await supabase
    .from('financial_accounts')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('type', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch financial accounts: ${error.message}`);
  }

  return data || [];
}

/**
 * Create a financial account
 * @param {object} accountData - Account data
 * @param {number} businessId - Business ID
 * @param {string} userId - User ID (created_by)
 * @returns {Promise<object>} Created account
 */
export async function createFinancialAccount(accountData, businessId, userId) {
  const {
    name,
    type,
    accountNumber = null,
    bankName = null,
    branchName = null,
    openingBalance = 0,
    notes = null,
  } = accountData;

  // Validate required fields
  if (!name || !type) {
    throw new Error('Missing required fields: name, type');
  }

  // Check if account name already exists for this business
  const { data: existing } = await supabase
    .from('financial_accounts')
    .select('id')
    .eq('business_id', businessId)
    .eq('name', name)
    .single();

  if (existing) {
    throw new Error('Account name already exists for this business');
  }

  // Insert account
  const { data: account, error: accountError } = await supabase
    .from('financial_accounts')
    .insert({
      business_id: businessId,
      name,
      type,
      account_number: accountNumber,
      bank_name: bankName,
      branch_name: branchName,
      opening_balance: openingBalance,
      current_balance: openingBalance,
      notes,
      created_by: userId,
    })
    .select()
    .single();

  if (accountError) {
    throw new Error(`Failed to create financial account: ${accountError.message}`);
  }

  // If opening balance > 0, create an opening balance transaction
  if (openingBalance > 0) {
    await supabase.from('account_transactions').insert({
      account_id: account.id,
      business_id: businessId,
      type: 'credit',
      amount: openingBalance,
      reference_type: 'opening_balance',
      reference_id: account.id,
      description: 'Opening balance',
      created_by: userId,
    });
  }

  return account;
}

