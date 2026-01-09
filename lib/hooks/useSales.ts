'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useBranchV2 } from '@/lib/context/BranchContextV2';

interface Sale {
  id: number;
  invoice_no: string;
  transaction_date: string;
  final_total: number;
  payment_status: string;
  contact_id: number | null;
  status: string;
  customer_name?: string;
  paid_amount?: number;
  due_amount?: number;
  location_id?: number;
  branch_name?: string;
  branch_code?: string;
}

interface SalesQueryResult {
  sales: Sale[];
  stats: {
    totalSales: number;
    todaySales: number;
    monthlyRevenue: number;
  };
}

/**
 * Custom hook for Sales data with React Query
 * Implements stale-while-revalidate pattern
 */
export function useSales() {
  const { activeBranch } = useBranchV2();
  const activeBranchId = activeBranch?.id ? Number(activeBranch.id) : null;

  return useQuery<SalesQueryResult>({
    queryKey: ['sales', activeBranchId],
    enabled: !!activeBranchId,
    queryFn: async () => {
      console.log('🔍 BRANCH FILTER [useSales]', { activeBranchId, type: typeof activeBranchId });
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Authentication required');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile?.business_id) throw new Error('Business not found');

      if (!activeBranchId) {
        // Return empty data if no branch selected
        return {
          sales: [],
          stats: {
            totalSales: 0,
            todaySales: 0,
            monthlyRevenue: 0,
          },
        };
      }

      // Fetch transactions - FILTER BY BRANCH
      let query = supabase
        .from('transactions')
        .select('id, invoice_no, transaction_date, final_total, payment_status, contact_id, status, location_id')
        .eq('business_id', profile.business_id)
        .eq('type', 'sell')
        .in('status', ['final', 'draft']);

      // CRITICAL: Filter by active branch (ensure it's a number)
      const branchIdNum = Number(activeBranchId);
      console.log('🔍 BRANCH FILTER [useSales] Applying filter', { branchIdNum, type: typeof branchIdNum });
      query = query.eq('location_id', branchIdNum);

      const { data: transactions, error: transactionsError } = await query
        .order('transaction_date', { ascending: false })
        .limit(100);

      if (transactionsError) throw transactionsError;

      // Fetch contacts
      const contactIds = (transactions || [])
        .map(t => t.contact_id)
        .filter((id): id is number => id !== null && id !== undefined);

      let contactsMap = new Map<number, { id: number; name: string }>();
      if (contactIds.length > 0) {
        const { data: contacts } = await supabase
          .from('contacts')
          .select('id, name')
          .in('id', contactIds);

        if (contacts) {
          contacts.forEach(c => {
            contactsMap.set(c.id, { id: c.id, name: c.name });
          });
        }
      }

      // Fetch branch/location information
      const locationIds = (transactions || [])
        .map(t => t.location_id)
        .filter((id): id is number => id !== null && id !== undefined);

      let locationsMap = new Map<number, { id: number; name: string; code: string }>();
      if (locationIds.length > 0) {
        const { data: locations } = await supabase
          .from('business_locations')
          .select('id, name, custom_field1')
          .in('id', locationIds);

        if (locations) {
          locations.forEach(loc => {
            locationsMap.set(loc.id, { 
              id: loc.id, 
              name: loc.name || 'Unknown Branch', 
              code: loc.custom_field1 || '' 
            });
          });
        }
      }

      // Fetch payment data
      const transactionIds = (transactions || []).map(t => t.id);
      let paymentsMap = new Map<number, { total_paid: number; credit_due: number }>();
      if (transactionIds.length > 0) {
        const { data: payments } = await supabase
          .from('account_transactions')
          .select('reference_id, amount, type')
          .eq('reference_type', 'sell')
          .in('reference_id', transactionIds);

        if (payments) {
          transactionIds.forEach(txId => {
            const txPayments = payments.filter(p => p.reference_id === txId);
            const totalPaid = txPayments
              .filter(p => p.type === 'credit')
              .reduce((sum, p) => sum + parseFloat(p.amount?.toString() || '0'), 0);
            const finalTotal = transactions?.find(t => t.id === txId)?.final_total || 0;
            paymentsMap.set(txId, {
              total_paid: totalPaid,
              credit_due: Math.max(0, finalTotal - totalPaid),
            });
          });
        }
      }

      // Combine data
      const sales: Sale[] = (transactions || []).map(t => {
        const contact = t.contact_id ? contactsMap.get(t.contact_id) : null;
        const payment = paymentsMap.get(t.id) || { total_paid: 0, credit_due: t.final_total || 0 };
        const location = t.location_id ? locationsMap.get(t.location_id) : null;

        return {
          id: t.id,
          invoice_no: t.invoice_no || '',
          transaction_date: t.transaction_date,
          final_total: t.final_total || 0,
          payment_status: t.payment_status || 'pending',
          contact_id: t.contact_id,
          status: t.status,
          customer_name: contact?.name || 'Walk-in Customer',
          paid_amount: payment.total_paid,
          due_amount: payment.credit_due,
          location_id: t.location_id,
          branch_name: location?.name,
          branch_code: location?.code,
        };
      });

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().substring(0, 7);
      const todaySales = sales
        .filter(s => s.transaction_date?.startsWith(today) && s.status === 'final')
        .reduce((sum, s) => sum + s.final_total, 0);
      const monthlyRevenue = sales
        .filter(s => s.transaction_date?.startsWith(thisMonth) && s.status === 'final')
        .reduce((sum, s) => sum + s.final_total, 0);

      return {
        sales,
        stats: {
          totalSales: sales.length,
          todaySales,
          monthlyRevenue,
        },
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - sales data is fresh for 2 min
  });
}

/**
 * Optimistic mutation for creating a sale
 */
export function useCreateSale() {
  const queryClient = useQueryClient();
  const { activeBranch } = useBranchV2();
  const activeBranchId = activeBranch?.id ? Number(activeBranch.id) : null;

  return useMutation({
    mutationFn: async (saleData: any) => {
      // This will be called by AddSaleModal's handleSubmit
      // We just invalidate the cache after success
      return saleData;
    },
    onSuccess: () => {
      // CRITICAL FIX: Invalidate with branch ID to refetch correct branch data
      queryClient.invalidateQueries({ queryKey: ['sales', activeBranchId] });
      toast.success('Sale created successfully');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to create sale');
    },
  });
}

/**
 * Optimistic mutation for deleting a sale
 */
export function useDeleteSale() {
  const queryClient = useQueryClient();
  const { activeBranch } = useBranchV2();
  const activeBranchId = activeBranch?.id ? Number(activeBranch.id) : null;

  return useMutation({
    mutationFn: async (saleId: number) => {
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'void' })
        .eq('id', saleId);

      if (error) throw error;
    },
    onMutate: async (saleId) => {
      // CRITICAL FIX: Cancel with branch ID
      await queryClient.cancelQueries({ queryKey: ['sales', activeBranchId] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<SalesQueryResult>(['sales', activeBranchId]);

      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<SalesQueryResult>(['sales', activeBranchId], {
          ...previousData,
          sales: previousData.sales.filter(s => s.id !== saleId),
          stats: {
            ...previousData.stats,
            totalSales: Math.max(0, previousData.stats.totalSales - 1),
          },
        });
      }

      return { previousData };
    },
    onError: (err, saleId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['sales', activeBranchId], context.previousData);
      }
      toast.error('Failed to delete sale');
    },
    onSuccess: () => {
      toast.success('Sale deleted successfully');
    },
    onSettled: () => {
      // CRITICAL FIX: Refetch with branch ID
      queryClient.invalidateQueries({ queryKey: ['sales', activeBranchId] });
    },
  });
}

