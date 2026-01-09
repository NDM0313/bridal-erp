/**
 * Demo Mode Configuration
 * Enables full-access testing mode with mock saving
 */

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || false;

export const demoConfig = {
  enabled: DEMO_MODE,
  
  // Mock save delay (ms) - simulates network delay
  mockSaveDelay: 500,
  
  // Show demo badge in UI
  showBadge: true,
  
  // Auto-inject dummy data if empty
  autoInjectDummyData: true,
  
  // Full-access mode: Bypass all permissions
  bypassPermissions: true,
  
  // Reload page on branch switch for complete data refresh
  reloadOnBranchSwitch: true,
};

/**
 * Mock save function - simulates database save
 */
export async function mockSave<T>(data: T, delay: number = demoConfig.mockSaveDelay): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(data);
    }, delay);
  });
}

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  return demoConfig.enabled;
}

