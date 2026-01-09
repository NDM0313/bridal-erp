# 🛡️ BULLETPROOF Branch Selection Solution

## Executive Summary

After analyzing the current implementation, I've identified **3 critical issues** causing unreliable branch selection:

1. **Race Condition**: useEffect writing to localStorage conflicts with setActiveBranch
2. **Reload Timing**: 200ms is arbitrary and unreliable
3. **Complex Fallback Logic**: Too many code paths make debugging difficult

## The Bulletproof Solution

### Architecture Principles

1. **Single Source of Truth**: localStorage is the ONLY source of truth
2. **Synchronous Operations**: No async state updates before reload
3. **Defensive Programming**: Validate everything, log everything
4. **Simple Fallback**: One clear fallback path

---

## Implementation

### Step 1: Create New Simplified BranchContext

```typescript
// lib/context/BranchContextV2.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/utils/supabase/client';
import { isDemoMode } from '@/lib/config/demoConfig';

interface Branch {
  id: number;
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
  switchBranch: (branchId: number) => void;
  refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

// CRITICAL: localStorage keys
const STORAGE_KEY_BRANCH_ID = 'active_branch_id_v2';
const STORAGE_KEY_BRANCHES = 'branches_cache_v2';

export function BranchProvider({ children }: { children: ReactNode }) {
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // STEP 1: Load branches from DB or cache
  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    const timestamp = Date.now();
    console.log(`[${timestamp}] 🔄 loadBranches: START`);
    
    try {
      setLoading(true);

      // Try to load from cache first
      const cachedBranchesStr = localStorage.getItem(STORAGE_KEY_BRANCHES);
      if (cachedBranchesStr) {
        try {
          const cachedBranches = JSON.parse(cachedBranchesStr);
          console.log(`[${timestamp}] 📦 Loaded ${cachedBranches.length} branches from cache`);
          setBranches(cachedBranches);
          
          // Set active branch from localStorage
          const savedBranchId = localStorage.getItem(STORAGE_KEY_BRANCH_ID);
          if (savedBranchId) {
            const branch = cachedBranches.find((b: Branch) => b.id.toString() === savedBranchId);
            if (branch) {
              setActiveBranch(branch);
              console.log(`[${timestamp}] ✅ Active branch restored: ${branch.name} (ID: ${branch.id})`);
              setLoading(false);
              return; // SUCCESS - exit early
            }
          }
        } catch (e) {
          console.warn(`[${timestamp}] ⚠️ Failed to parse cached branches`);
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
        
        console.log(`[${timestamp}] 🎭 Demo mode: Using ${dummyBranches.length} dummy branches`);
        setBranches(dummyBranches);
        localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(dummyBranches));
        
        // Set active branch
        const savedBranchId = localStorage.getItem(STORAGE_KEY_BRANCH_ID);
        const branch = savedBranchId 
          ? dummyBranches.find(b => b.id.toString() === savedBranchId) || dummyBranches[0]
          : dummyBranches[0];
        
        setActiveBranch(branch);
        console.log(`[${timestamp}] ✅ Active branch set: ${branch.name} (ID: ${branch.id})`);
        setLoading(false);
        return;
      }

      // Real database fetch
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn(`[${timestamp}] ⚠️ No session found`);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('business_id')
        .eq('user_id', session.user.id)
        .single();

      if (!profile) {
        console.warn(`[${timestamp}] ⚠️ No profile found`);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('business_locations')
        .select('*')
        .eq('business_id', profile.business_id)
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

      console.log(`[${timestamp}] ✅ Loaded ${branchesData.length} branches from database`);
      setBranches(branchesData);
      localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(branchesData));

      // Set active branch
      const savedBranchId = localStorage.getItem(STORAGE_KEY_BRANCH_ID);
      const branch = savedBranchId 
        ? branchesData.find(b => b.id.toString() === savedBranchId) || branchesData[0]
        : branchesData[0];

      if (branch) {
        setActiveBranch(branch);
        console.log(`[${timestamp}] ✅ Active branch set: ${branch.name} (ID: ${branch.id})`);
      }

    } catch (err) {
      console.error(`[${timestamp}] ❌ Failed to load branches:`, err);
    } finally {
      setLoading(false);
      console.log(`[${timestamp}] 🔄 loadBranches: END`);
    }
  };

  // CRITICAL: This is the ONLY function that changes active branch
  const switchBranch = (branchId: number) => {
    const timestamp = Date.now();
    console.log(`[${timestamp}] 🔀 switchBranch: START (ID: ${branchId})`);
    
    // Find branch in current list
    const branch = branches.find(b => b.id === branchId);
    if (!branch) {
      console.error(`[${timestamp}] ❌ Branch not found: ${branchId}`);
      return;
    }

    console.log(`[${timestamp}] 📝 Switching to: ${branch.name} (ID: ${branch.id})`);
    
    // STEP 1: Write to localStorage SYNCHRONOUSLY
    try {
      localStorage.setItem(STORAGE_KEY_BRANCH_ID, branchId.toString());
      console.log(`[${timestamp}] ✅ localStorage written: ${branchId}`);
      
      // STEP 2: Verify write
      const verifyRead = localStorage.getItem(STORAGE_KEY_BRANCH_ID);
      console.log(`[${timestamp}] 🔍 localStorage verify read: ${verifyRead}`);
      
      if (verifyRead !== branchId.toString()) {
        console.error(`[${timestamp}] ❌ localStorage write FAILED! Expected: ${branchId}, Got: ${verifyRead}`);
        alert('Failed to save branch selection. Please try again.');
        return;
      }
      
      console.log(`[${timestamp}] ✅ localStorage write verified`);
      
    } catch (e) {
      console.error(`[${timestamp}] ❌ localStorage write error:`, e);
      alert('Failed to save branch selection. localStorage might be disabled.');
      return;
    }

    // STEP 3: Reload page IMMEDIATELY (no timeout)
    console.log(`[${timestamp}] 🔄 Reloading page NOW...`);
    window.location.reload();
  };

  const refreshBranches = async () => {
    // Clear cache and reload
    localStorage.removeItem(STORAGE_KEY_BRANCHES);
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

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
```

---

### Step 2: Create Simplified BranchSelector

```typescript
// components/header/BranchSelectorV2.tsx
'use client';

import React, { useState } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { useBranch } from '@/lib/context/BranchContextV2';
import { cn } from '@/lib/utils';

export function BranchSelectorV2() {
  const { activeBranch, branches, switchBranch, loading } = useBranch();
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectBranch = (branchId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const timestamp = Date.now();
    console.log(`[${timestamp}] 🖱️ User clicked branch ID: ${branchId}`);
    
    // Close dropdown
    setIsOpen(false);
    
    // Switch branch (will reload page)
    switchBranch(branchId);
  };

  if (loading || !activeBranch) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
        <Building2 size={16} className="text-slate-400 animate-pulse" />
        <span className="text-sm text-slate-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border transition-all',
          'hover:bg-slate-800 hover:border-indigo-500/50',
          isOpen ? 'border-indigo-500 bg-slate-800' : 'border-slate-700'
        )}
      >
        <Building2 size={16} className="text-indigo-400" />
        <div className="flex flex-col items-start min-w-[120px]">
          <span className="text-xs text-slate-400">Branch</span>
          <span className="text-sm font-medium text-white truncate max-w-[150px]">
            {activeBranch.name}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-slate-400 transition-transform',
            isOpen ? 'rotate-180' : ''
          )}
        />
      </button>

      {/* Simple dropdown - NO PORTAL for debugging */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-50"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="max-h-64 overflow-y-auto">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={(e) => handleSelectBranch(branch.id, e)}
                onMouseDown={(e) => e.preventDefault()} // Prevent blur
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800 transition-colors text-left',
                  activeBranch.id === branch.id ? 'bg-indigo-500/10' : ''
                )}
              >
                <div className="flex flex-col">
                  <span className={cn(
                    'text-sm font-medium',
                    activeBranch.id === branch.id ? 'text-indigo-300' : 'text-white'
                  )}>
                    {branch.name}
                  </span>
                  {branch.code && (
                    <span className="text-xs text-slate-400">{branch.code}</span>
                  )}
                </div>
                {activeBranch.id === branch.id && (
                  <Check size={16} className="text-indigo-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### Step 3: Create Debug Test Page

```typescript
// app/test-branch/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useBranch } from '@/lib/context/BranchContextV2';
import { BranchSelectorV2 } from '@/components/header/BranchSelectorV2';

export default function TestBranchPage() {
  const { activeBranch, branches, switchBranch, loading } = useBranch();
  const [localStorageState, setLocalStorageState] = useState<any>({});

  // Refresh localStorage state every second
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalStorageState({
        branch_id: localStorage.getItem('active_branch_id_v2'),
        branches_cache: localStorage.getItem('branches_cache_v2'),
        timestamp: Date.now(),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleManualSwitch = (branchId: number) => {
    console.log('🧪 MANUAL TEST: Switching to branch', branchId);
    switchBranch(branchId);
  };

  const handleClearLocalStorage = () => {
    localStorage.removeItem('active_branch_id_v2');
    localStorage.removeItem('branches_cache_v2');
    console.log('🧹 localStorage cleared');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">🧪 Branch Selection Test Page</h1>

        {/* Branch Selector Component */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Branch Selector Component</h2>
          <BranchSelectorV2 />
        </div>

        {/* Context State */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Context State</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="text-slate-400">Loading:</span>{' '}
              <span className={loading ? 'text-yellow-400' : 'text-green-400'}>
                {loading ? 'true' : 'false'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Active Branch:</span>{' '}
              <span className="text-indigo-400">
                {activeBranch ? `${activeBranch.name} (ID: ${activeBranch.id})` : 'null'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Total Branches:</span>{' '}
              <span className="text-blue-400">{branches.length}</span>
            </div>
          </div>
        </div>

        {/* localStorage State */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">localStorage State (Live)</h2>
          <div className="space-y-2 font-mono text-sm">
            <div>
              <span className="text-slate-400">active_branch_id_v2:</span>{' '}
              <span className="text-green-400">{localStorageState.branch_id || 'null'}</span>
            </div>
            <div>
              <span className="text-slate-400">branches_cache_v2:</span>{' '}
              <span className="text-purple-400">
                {localStorageState.branches_cache ? `${localStorageState.branches_cache.length} chars` : 'null'}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              Last updated: {new Date(localStorageState.timestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Manual Test Buttons */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Manual Test Controls</h2>
          <div className="space-y-3">
            {branches.map((branch) => (
              <button
                key={branch.id}
                onClick={() => handleManualSwitch(branch.id)}
                className={cn(
                  'w-full px-4 py-3 rounded-lg border text-left transition-all',
                  activeBranch?.id === branch.id
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                )}
              >
                <div className="font-medium">{branch.name}</div>
                <div className="text-sm text-slate-400">ID: {branch.id} | Code: {branch.code}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Debug Actions */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Debug Actions</h2>
          <div className="space-y-2">
            <button
              onClick={handleClearLocalStorage}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              🧹 Clear localStorage & Reload
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors ml-2"
            >
              🔄 Reload Page
            </button>
            <button
              onClick={() => {
                console.log('📊 Context State:', { activeBranch, branches, loading });
                console.log('💾 localStorage:', {
                  branch_id: localStorage.getItem('active_branch_id_v2'),
                  branches_cache: localStorage.getItem('branches_cache_v2'),
                });
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors ml-2"
            >
              📊 Log State to Console
            </button>
          </div>
        </div>

        {/* Console Output */}
        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
          <h2 className="text-xl font-semibold mb-4">📝 Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-300">
            <li>Open browser DevTools Console (F12)</li>
            <li>Click on a branch in the dropdown or manual buttons</li>
            <li>Watch the console logs with timestamps</li>
            <li>After page reload, verify active branch matches selection</li>
            <li>Check localStorage state updates in real-time</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
```

---

## Key Improvements

### 1. **No Race Conditions**
- Removed the useEffect that writes to localStorage
- Only `switchBranch()` writes to localStorage
- Synchronous write + verify before reload

### 2. **Immediate Reload**
- No setTimeout delay
- Reload happens immediately after localStorage write
- Write is verified before reload

### 3. **Comprehensive Logging**
- Timestamps on every log
- Clear action names
- Verify reads after writes

### 4. **Simple Dropdown**
- No Portal (for debugging)
- Direct DOM rendering
- onMouseDown prevents blur issues

### 5. **Test Page**
- Live localStorage monitoring
- Manual test buttons
- Debug actions
- Clear instructions

---

## Testing Protocol

### Phase 1: Basic Functionality
1. Navigate to `/test-branch`
2. Open DevTools Console
3. Click "Downtown Outlet" in dropdown
4. **Expected**: Console shows:
   ```
   [timestamp] 🖱️ User clicked branch ID: 2
   [timestamp] 🔀 switchBranch: START (ID: 2)
   [timestamp] 📝 Switching to: Downtown Outlet (ID: 2)
   [timestamp] ✅ localStorage written: 2
   [timestamp] 🔍 localStorage verify read: 2
   [timestamp] ✅ localStorage write verified
   [timestamp] 🔄 Reloading page NOW...
   ```
5. **After reload**: Header shows "Downtown Outlet"

### Phase 2: localStorage Persistence
1. Select "Main Branch"
2. Wait for reload
3. Open DevTools Console
4. Run: `localStorage.getItem('active_branch_id_v2')`
5. **Expected**: Returns `"1"`
6. Hard refresh (Ctrl+F5)
7. **Expected**: Still shows "Main Branch"

### Phase 3: Manual localStorage Test
1. Open DevTools Console
2. Run:
   ```javascript
   localStorage.setItem('active_branch_id_v2', '2');
   window.location.reload();
   ```
3. **Expected**: After reload, shows "Downtown Outlet"

### Phase 4: Clear & Reset
1. Click "Clear localStorage & Reload"
2. **Expected**: Reverts to first branch (Main Branch)

---

## Debugging Checklist

If branch selection still doesn't work:

### Check 1: localStorage Availability
```javascript
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('✅ localStorage is available');
} catch (e) {
  console.error('❌ localStorage is NOT available:', e);
}
```

### Check 2: Browser Console Errors
- Look for any errors during branch switch
- Check Network tab for failed requests
- Check if page reload is actually happening

### Check 3: React DevTools
- Install React DevTools extension
- Check BranchContext state
- Verify `activeBranch` updates

### Check 4: Incognito Mode
- Test in incognito/private browsing
- Some browsers block localStorage in private mode

### Check 5: Different Browser
- Test in Chrome, Firefox, Edge
- Rule out browser-specific issues

---

## Migration Path

### Step 1: Test V2 Alongside V1
1. Keep old `BranchContext.tsx`
2. Add new `BranchContextV2.tsx`
3. Test on `/test-branch` page
4. Verify all functionality works

### Step 2: Gradual Rollout
1. Update one component at a time
2. Start with header
3. Then modals
4. Finally dashboard

### Step 3: Remove V1
1. Once V2 is proven stable
2. Delete old `BranchContext.tsx`
3. Rename V2 to remove "V2" suffix
4. Update all imports

---

## Success Criteria

Branch selection is considered "working reliably" when:

1. ✅ Clicking a branch ALWAYS updates the header after reload
2. ✅ localStorage ALWAYS contains correct branch ID
3. ✅ Page reload ALWAYS restores correct branch
4. ✅ Hard refresh (Ctrl+F5) ALWAYS restores correct branch
5. ✅ Incognito mode works correctly
6. ✅ Works across all major browsers
7. ✅ Console logs show clear success/failure messages
8. ✅ No race conditions or timing issues

---

## Next Steps

1. Implement `BranchContextV2.tsx`
2. Implement `BranchSelectorV2.tsx`
3. Create `/test-branch` page
4. Run testing protocol
5. Report results with console logs
6. If issues persist, we'll debug together using the test page

**This solution eliminates ALL known causes of unreliable branch selection.** 🛡️

