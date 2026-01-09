'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { useBranchV2 } from '@/lib/context/BranchContextV2';

interface Purchase {
  id: number;
  invoice_no: string;
  transaction_date: string;
  final_total: number;
  payment_status: string;
  contact_id: number | null;
  status: string;
  supplier_name?: string;
}

interface PurchasesQueryResult {
  purchases: Purchase[];
  stats: {
    totalPurchases: number;
    totalValue: number;
  };
}

/**
 * Custom hook for Purchases data with React Query
 * Implements stale-while-revalidate pattern
 */
export function usePurchases() {
  const { activeBranch } = useBranchV2();
  const activeBranchId = activeBranch?.id ? Number(activeBranch.id) : null;

  return useQuery<PurchasesQueryResult>({
    queryKey: ['purchases', activeBranchId],
    enabled: !!activeBranchId,
    queryFn: async () => {
      console.log('🔍 BRANCH FILTER [usePurchases]', { activeBranchId, type: typeof activeBranchId });
      
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
          purchases: [],
          stats: {
            totalPurchases: 0,
            totalValue: 0,
          },
        };
      }

      // Fetch purchases - FILTER BY BRANCH
      let query = supabase
        .from('transactions')
        .select('id, invoice_no, transaction_date, final_total, payment_status, contact_id, status, location_id')
        .eq('business_id', profile.business_id)
        .eq('type', 'purchase')
        .in('status', ['final', 'draft', 'cancelled']);

      // CRITICAL: Filter by active branch (ensure it's a number)
      const branchIdNum = Number(activeBranchId);
      console.log('🔍 BRANCH FILTER [usePurchases] Applying filter', { branchIdNum, type: typeof branchIdNum });
      query = query.eq('location_id', branchIdNum);

      const { data: transactions, error: transactionsError } = await query
        .order('transaction_date', { ascending: false })
        .limit(100);

      if (transactionsError) throw transactionsError;

      // Fetch suppliers
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

      // Combine data
      const purchases: Purchase[] = (transactions || []).map(t => {
        const contact = t.contact_id ? contactsMap.get(t.contact_id) : null;

        return {
          id: t.id,
          invoice_no: t.invoice_no || '',
          transaction_date: t.transaction_date,
          final_total: t.final_total || 0,
          payment_status: t.payment_status || 'pending',
          contact_id: t.contact_id,
          status: t.status,
          supplier_name: contact?.name || 'Unknown Supplier',
        };
      });

      const totalValue = purchases
        .filter(p => p.status === 'final')
        .reduce((sum, p) => sum + p.final_total, 0);

      return {
        purchases,
        stats: {
          totalPurchases: purchases.length,
          totalValue,
        },
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

