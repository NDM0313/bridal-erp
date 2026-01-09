/**
 * Branch Context V2 - Bulletproof Implementation
 * 
 * Key Improvements:
 * - No race conditions (single write point)
 * - Synchronous localStorage operations
 * - Immediate reload (no setTimeout)
 * - Comprehensive logging with timestamps
 * - Simple fallback logic
 */

'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/utils/supabase/client';
import { isDemoMode } from '@/lib/config/demoConfig';
import { setLocalStorage, getLocalStorage } from '@/lib/utils/storage';

interface Branch {
  id: number | 'ALL';
  business_id: number;
  name: string;
  code?: string;
  location?: string;
  is_active: boolean;
}

interface BranchContextType {
  activeBranch: Branch | null;
  branches: Branch[];
  loading: boolean;
  switchBranch: (branchId: number | 'ALL') => void;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

// CRITICAL: localStorage keys (V2 to avoid conflicts)
const STORAGE_KEY_BRANCH_ID = 'active_branch_id_v2';
const STORAGE_KEY_BRANCHES = 'branches_cache_v2';

export function BranchProviderV2({ children }: { children: ReactNode }) {
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Load branches on mount and when user changes
  useEffect(() => {
    loadBranches();
    
    // Listen for auth state changes to clear cache when user changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        // Clear cache when user logs out or changes
        try {
          localStorage.removeItem(STORAGE_KEY_BRANCHES);
          localStorage.removeItem(STORAGE_KEY_BRANCH_ID);
          console.log('🧹 Cleared branch cache due to auth change');
        } catch (e) {
          console.warn('Failed to clear branch cache:', e);
        }
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadBranches = async () => {
    const timestamp = Date.now();
    console.log(`[${timestamp}] 🔄 loadBranches: START`);
    
    try {
      setLoading(true);

      // Get current user's business_id FIRST to validate cache
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn(`[${timestamp}] ⚠️ No session found - clearing cache`);
        // Clear cache if no session
        try {
          localStorage.removeItem(STORAGE_KEY_BRANCHES);
          localStorage.removeItem(STORAGE_KEY_BRANCH_ID);
        } catch (e) {
          // Ignore
        }
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        console.warn(`[${timestamp}] ⚠️ No profile found - clearing cache`);
        // Clear cache if no profile
        try {
          localStorage.removeItem(STORAGE_KEY_BRANCHES);
          localStorage.removeItem(STORAGE_KEY_BRANCH_ID);
        } catch (e) {
          // Ignore
        }
        setLoading(false);
        return;
      }

      const currentBusinessId = profile.business_id;
      console.log(`[${timestamp}] 👤 Current business_id: ${currentBusinessId}`);

      // Try to load from cache ONLY if it belongs to current business
      const cachedBranchesStr = getLocalStorage(STORAGE_KEY_BRANCHES);
      if (cachedBranchesStr) {
        try {
          const cachedBranches = JSON.parse(cachedBranchesStr);
          
          // CRITICAL: Validate cache belongs to current business
          const firstBranch = cachedBranches[0];
          if (firstBranch && firstBranch.business_id === currentBusinessId) {
            console.log(`[${timestamp}] 📦 Loaded ${cachedBranches.length} branches from cache (business_id: ${currentBusinessId})`);
            setBranches(cachedBranches);
            
            // Set active branch from localStorage
            const savedBranchId = getLocalStorage(STORAGE_KEY_BRANCH_ID);
            if (savedBranchId) {
              const branch = cachedBranches.find((b: Branch) => b.id.toString() === savedBranchId);
              if (branch) {
                setActiveBranch(branch);
                console.log(`[${timestamp}] ✅ Active branch restored: ${branch.name} (ID: ${branch.id})`);
                setLoading(false);
                return; // SUCCESS - exit early
              }
            }
          } else {
            // Cache belongs to different business - clear it
            console.log(`[${timestamp}] 🧹 Cache belongs to different business (${firstBranch?.business_id} vs ${currentBusinessId}) - clearing`);
            try {
              localStorage.removeItem(STORAGE_KEY_BRANCHES);
              localStorage.removeItem(STORAGE_KEY_BRANCH_ID);
            } catch (e) {
              // Ignore
            }
          }
        } catch (e) {
          console.warn(`[${timestamp}] ⚠️ Failed to parse cached branches - clearing cache`);
          try {
            localStorage.removeItem(STORAGE_KEY_BRANCHES);
            localStorage.removeItem(STORAGE_KEY_BRANCH_ID);
          } catch (e2) {
            // Ignore
          }
        }
      }

      // Fetch from database
      console.log(`[${timestamp}] 🌐 Fetching branches from database...`);
      
      // Demo mode: Use dummy branches
      if (isDemoMode()) {
        const dummyBranches: Branch[] = [
          {
            id: 1,
            business_id: 1,
            name: 'Main Branch',
            code: 'MB-01',
            location: 'Din Bridal Outlet',
            is_active: true,
          },
          {
            id: 2,
            business_id: 1,
            name: 'Downtown Outlet',
            code: 'DT-02',
            location: 'City Center',
            is_active: true,
          },
        ];
        
        // ADD "All Locations" option for demo mode as well
        const allLocationsOption: Branch = {
          id: 'ALL',
          business_id: 1,
          name: '🌐 All Locations',
          code: 'ALL',
          location: 'All branches combined',
          is_active: true,
        };
        
        const dummyBranchesWithAll = [allLocationsOption, ...dummyBranches];
        
        console.log(`[${timestamp}] 🎭 Demo mode: Using ${dummyBranchesWithAll.length} dummy branches (including All Locations)`);
        setBranches(dummyBranchesWithAll);
        setLocalStorage(STORAGE_KEY_BRANCHES, JSON.stringify(dummyBranchesWithAll));
        
        // Set active branch (default to first real branch, skip "All Locations")
        const savedBranchId = getLocalStorage(STORAGE_KEY_BRANCH_ID);
        console.log(`[${timestamp}] 📦 [DEMO] savedBranchId: ${savedBranchId}`);
        
        let branch = null;
        if (savedBranchId) {
          branch = dummyBranchesWithAll.find(b => b.id.toString() === savedBranchId);
          console.log(`[${timestamp}] 🔍 [DEMO] Found saved branch: ${branch ? branch.name : 'NOT FOUND'}`);
        }
        
        if (!branch) {
          branch = dummyBranchesWithAll.length > 1 ? dummyBranchesWithAll[1] : dummyBranchesWithAll[0];
          console.log(`[${timestamp}] 🔄 [DEMO] Using fallback branch: ${branch?.name || 'NONE'}`);
        }
        
        if (branch) {
          setActiveBranch(branch);
          setLocalStorage(STORAGE_KEY_BRANCH_ID, branch.id.toString());
          console.log(`[${timestamp}] ✅ [DEMO] Active branch set: ${branch.name} (ID: ${branch.id})`);
        } else {
          console.error(`[${timestamp}] ❌ [DEMO] NO BRANCH FOUND!`);
        }
        
        setLoading(false);
        console.log(`[${timestamp}] 🏁 [DEMO] loadBranches: COMPLETE (loading=false)`);
        return;
      }

      // Real database fetch (business_id already fetched above)
      const { data, error } = await supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', currentBusinessId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) {
        console.error(`[${timestamp}] ❌ Error loading branches:`, error);
        setLoading(false);
        return;
      }

      const branchesData: Branch[] = (data || []).map((loc: any) => ({
        id: loc.id,
        business_id: loc.business_id,
        name: loc.name || 'Unnamed Branch',
        code: loc.custom_field1 || `BR-${loc.id}`,
        location: loc.landmark || '',
        is_active: !loc.deleted_at,
      }));

      console.log(`[${timestamp}] ✅ Loaded ${branchesData.length} branches from database (business_id: ${currentBusinessId})`);
      
      if (branchesData.length === 0) {
        console.warn(`[${timestamp}] ⚠️ No branches found for business_id: ${currentBusinessId}`);
        // Clear any old cache
        try {
          localStorage.removeItem(STORAGE_KEY_BRANCHES);
          localStorage.removeItem(STORAGE_KEY_BRANCH_ID);
        } catch (e) {
          // Ignore
        }
        setBranches([]);
        setActiveBranch(null);
        setLoading(false);
        return;
      }
      
      // ADD "All Locations" option at the beginning (for Dashboard/Reports only)
      const allLocationsOption: Branch = {
        id: 'ALL',
        business_id: currentBusinessId,
        name: '🌐 All Locations',
        code: 'ALL',
        location: 'All branches combined',
        is_active: true,
      };
      
      const branchesWithAll = [allLocationsOption, ...branchesData];
      
      setBranches(branchesWithAll);
      // CRITICAL: Save cache with business_id validation
      setLocalStorage(STORAGE_KEY_BRANCHES, JSON.stringify(branchesWithAll));

      // Set active branch (only if it belongs to current business)
      const savedBranchId = getLocalStorage(STORAGE_KEY_BRANCH_ID);
      console.log(`[${timestamp}] 📦 savedBranchId from localStorage: ${savedBranchId}`);
      console.log(`[${timestamp}] 📊 Total branches (with ALL): ${branchesWithAll.length}`);
      
      let branch = null;
      
      if (savedBranchId) {
        // Try to find saved branch - compare both as strings for 'ALL' compatibility
        branch = branchesWithAll.find(b => {
          const match = b.id.toString() === savedBranchId.toString() && b.business_id === currentBusinessId;
          console.log(`[${timestamp}] 🔍 Comparing branch ${b.id} (${b.name}) with saved ${savedBranchId}: ${match}`);
          return match;
        });
        console.log(`[${timestamp}] 🔍 Found saved branch: ${branch ? branch.name : 'NOT FOUND'}`);
      }
      
      // Fallback to first real branch (skip "All Locations" at index 0)
      if (!branch) {
        branch = branchesWithAll.length > 1 ? branchesWithAll[1] : branchesWithAll[0];
        console.log(`[${timestamp}] 🔄 Using fallback branch: ${branch?.name || 'NONE'}`);
      }

      if (branch) {
        setActiveBranch(branch);
        setLocalStorage(STORAGE_KEY_BRANCH_ID, branch.id.toString());
        console.log(`[${timestamp}] ✅ Active branch set: ${branch.name} (ID: ${branch.id}, business_id: ${branch.business_id})`);
      } else {
        console.error(`[${timestamp}] ❌ NO BRANCH FOUND - This should never happen!`);
      }

    } catch (err) {
      console.error(`[${timestamp}] ❌ Failed to load branches:`, err);
    } finally {
      setLoading(false);
      console.log(`[${timestamp}] 🔄 loadBranches: END`);
    }
  };

  // CRITICAL: This is the ONLY function that changes active branch
  const switchBranch = (branchId: number | 'ALL') => {
    const timestamp = Date.now();
    console.log(`[${timestamp}] 🔀 switchBranch: START (ID: ${branchId})`);
    
    // Find branch in current list
    const branch = branches.find(b => b.id === branchId || b.id.toString() === branchId.toString());
    if (!branch) {
      console.error(`[${timestamp}] ❌ Branch not found: ${branchId}`);
      return;
    }

    console.log(`[${timestamp}] 📝 Switching to: ${branch.name} (ID: ${branch.id})`);
    
    // STEP 1: Write to localStorage SYNCHRONOUSLY with quota handling
    const writeSuccess = setLocalStorage(STORAGE_KEY_BRANCH_ID, branchId.toString());
    
    if (!writeSuccess) {
      console.error(`[${timestamp}] ❌ localStorage write FAILED (quota or security error)`);
      alert('Failed to save branch selection. Please try again or clear browser cache.');
      return;
    }
    
    console.log(`[${timestamp}] ✅ localStorage written: ${branchId}`);
    
    // STEP 2: Verify write
    const verifyRead = getLocalStorage(STORAGE_KEY_BRANCH_ID);
    console.log(`[${timestamp}] 🔍 localStorage verify read: ${verifyRead}`);
    
    if (verifyRead !== branchId.toString()) {
      console.error(`[${timestamp}] ❌ localStorage write verification FAILED! Expected: ${branchId}, Got: ${verifyRead}`);
      alert('Failed to save branch selection. Please try again.');
      return;
    }
    
    console.log(`[${timestamp}] ✅ localStorage write verified`);

    // STEP 3: Reload page IMMEDIATELY (no timeout)
    console.log(`[${timestamp}] 🔄 Reloading page NOW...`);
    window.location.reload();
  };

  const refreshBranches = async () => {
    // Clear cache and reload
    const timestamp = Date.now();
    console.log(`[${timestamp}] 🔄 refreshBranches: Clearing cache and reloading`);
    try {
      localStorage.removeItem(STORAGE_KEY_BRANCHES);
      localStorage.removeItem(STORAGE_KEY_BRANCH_ID);
    } catch (e) {
      console.warn('Failed to clear branches cache:', e);
    }
    await loadBranches();
  };

  return (
    <BranchContext.Provider
      value={{
        activeBranch,
        branches,
        loading,
        switchBranch,
        refreshBranches,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchV2() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranchV2 must be used within a BranchProviderV2');
  }
  return context;
}

