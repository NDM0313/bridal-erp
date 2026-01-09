/**
 * Branch Validation Utility
 * Standard ERP rule: Data entry (Sales, Purchase, Expense, Stock) must be done for a specific branch.
 * "All Locations" is only for viewing dashboard/reports.
 */

import { toast } from 'sonner';

export function validateBranchForDataEntry(activeBranchId: number | 'ALL' | null | undefined): boolean {
  if (activeBranchId === 'ALL') {
    toast.error('Cannot create transaction for "All Locations"', {
      description: 'Please select a specific branch to create sales, purchases, or expenses.',
      duration: 5000,
    });
    return false;
  }
  
  if (!activeBranchId) {
    toast.error('No branch selected', {
      description: 'Please select a branch first to proceed with data entry.',
      duration: 5000,
    });
    return false;
  }
  
  return true;
}

export function getBranchFilterForQuery(activeBranchId: number | 'ALL' | null | undefined): number | null {
  // Returns null for 'ALL' (no filter), or the branch ID for specific branch
  if (activeBranchId === 'ALL' || !activeBranchId) {
    return null;
  }
  return typeof activeBranchId === 'number' ? activeBranchId : Number(activeBranchId);
}
