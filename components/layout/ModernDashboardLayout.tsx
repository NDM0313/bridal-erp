/**
 * Modern Dashboard Layout
 * Dark mode, glassmorphism design
 * Next.js App Router compatible
 * Integrated with Supabase Auth + RoleGuard
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRole } from '@/lib/hooks/useRole';
import { ModalProvider } from '@/lib/context/ModalContext';
import { GlobalModalHandler } from '@/components/modals/GlobalModalHandler';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  BarChart3,
  Menu,
  LogOut,
  Warehouse,
  CreditCard,
  Calculator,
  Contact,
  Users,
  Settings,
  Building2,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  Shirt,
  Scissors,
  Truck,
  Wallet,
  Receipt,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateNewButton } from '@/components/ui/CreateNewButton';
import { cn } from '@/lib/utils';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { NavLinkWithPrefetch } from './NavLinkWithPrefetch';
// Note: Install framer-motion if not already installed: npm install framer-motion
// For now, using simple CSS transitions instead
// import { motion, AnimatePresence } from 'framer-motion';

import type { RolePermissions } from '@/lib/types/roles';
import { UniversalSearch } from '@/components/header/UniversalSearch';
import { BranchSelector } from '@/components/header/BranchSelector';

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
  permission?: keyof RolePermissions; // Permission required to see this item
}

const navigation: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'POS', href: '/pos', icon: ShoppingCart, permission: 'canCreateSales' },
  { id: 'products', label: 'Products', href: '/products', icon: Package, permission: 'canViewProducts' },
  { id: 'sales', label: 'Sales', href: '/dashboard/sales', icon: FileText, permission: 'canViewSales' },
  { id: 'purchases', label: 'Purchases', href: '/purchases', icon: ShoppingBag },
  { id: 'expenses', label: 'Expenses', href: '/dashboard/expenses', icon: Receipt },
  { id: 'rentals', label: 'Rentals', href: '/dashboard/rentals', icon: Shirt },
  { id: 'studio', label: 'Studio', href: '/dashboard/studio', icon: Scissors },
  { id: 'vendors', label: 'Vendors', href: '/dashboard/vendors', icon: Truck },
  { id: 'accounts', label: 'Accounts', href: '/dashboard/finance', icon: Wallet },
  { id: 'inventory', label: 'Inventory', href: '/inventory', icon: Warehouse, permission: 'canViewStock' },
  { id: 'reports', label: 'Reports', href: '/reports', icon: BarChart3, permission: 'canViewBasicReports' },
  { id: 'contacts', label: 'Contacts', href: '/dashboard/contacts', icon: Contact },
  { id: 'users', label: 'Users', href: '/dashboard/users', icon: Users }, // ROLE-BLIND: No permission check
  { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: Settings }, // ROLE-BLIND: No permission check
  { id: 'branches', label: 'Branches', href: '/settings/branches', icon: Building2 }, // Branch Management
];

export function ModernDashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Handle mobile/responsive
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load module settings from localStorage
  const [moduleSettings, setModuleSettings] = useState<{
    module_rental?: boolean;
    module_pos?: boolean;
    module_studio?: boolean;
    module_vendors?: boolean;
    module_reporting?: boolean;
    module_accounting?: boolean;
  }>({});

  useEffect(() => {
    const loadModuleSettings = () => {
      const stored = localStorage.getItem('studio_rently_settings');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setModuleSettings({
            module_rental: parsed.module_rental ?? true,
            module_pos: parsed.module_pos ?? true,
            module_studio: parsed.module_studio ?? true,
            module_vendors: parsed.module_vendors ?? true,
            module_reporting: parsed.module_reporting ?? true,
            module_accounting: parsed.module_accounting ?? true,
          });
        } catch (e) {
          // Use defaults
          setModuleSettings({
            module_rental: true,
            module_pos: true,
            module_studio: true,
            module_vendors: true,
            module_reporting: true,
            module_accounting: true,
          });
        }
      } else {
        // Defaults
        setModuleSettings({
          module_rental: true,
          module_pos: true,
          module_studio: true,
          module_vendors: true,
          module_reporting: true,
          module_accounting: true,
        });
      }
    };
    loadModuleSettings();
    
    // Listen for storage changes (cross-tab) and custom events (same-tab)
    window.addEventListener('storage', loadModuleSettings);
    window.addEventListener('settingsUpdated', ((e: CustomEvent) => {
      const settings = e.detail;
      setModuleSettings({
        module_rental: settings.module_rental ?? true,
        module_pos: settings.module_pos ?? true,
        module_studio: settings.module_studio ?? true,
        module_vendors: settings.module_vendors ?? true,
        module_reporting: settings.module_reporting ?? true,
        module_accounting: settings.module_accounting ?? true,
      });
    }) as EventListener);
    
    return () => {
      window.removeEventListener('storage', loadModuleSettings);
      window.removeEventListener('settingsUpdated', loadModuleSettings);
    };
  }, []);

  // Filter navigation based on permissions and module settings
  const filteredNavigation = useMemo(() => {
    return navigation.filter((item) => {
      // Check module settings - hide items if their module is disabled
      if (item.id === 'rentals' && moduleSettings.module_rental === false) return false;
      if (item.id === 'pos' && moduleSettings.module_pos === false) return false;
      if (item.id === 'studio' && moduleSettings.module_studio === false) return false;
      if (item.id === 'vendors' && moduleSettings.module_vendors === false) return false;
      if (item.id === 'reports' && moduleSettings.module_reporting === false) return false;
      if (item.id === 'finance' && moduleSettings.module_accounting === false) return false;
      
      // Check permissions
      if (!item.permission) return true;
      // RoleGuard will handle permission check - but we show all items immediately
      return true; // Show all items, RoleGuard will hide based on permission
    });
  }, [moduleSettings]); // Include moduleSettings in deps

  // Memoized click handler for navigation items
  // MUST be called before any conditional returns (Rules of Hooks)
  const handleNavClick = useCallback(() => {
    if (isMobile) setMobileMenuOpen(false);
  }, [isMobile]);

  // Show optimized loading - skeleton instead of spinner for better UX
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
            <p className="text-slate-400 text-sm animate-pulse">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <ModalProvider>
      <GlobalModalHandler />
      <div className="dark min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden font-sans">
      {/* Mobile Overlay */}
      {mobileMenuOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Fixed height to prevent CLS - CRITICAL: Always accessible even when modals are open */}
      <aside 
        className={cn(
          "fixed lg:static h-screen bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 transition-all duration-300 ease-in-out flex flex-col flex-shrink-0",
          collapsed ? "w-[80px]" : "w-[280px]",
          isMobile && !mobileMenuOpen ? "-translate-x-full" : "translate-x-0"
        )}
        style={{
          // CRITICAL: Always allow pointer events so sidebar is clickable even when modals are open
          zIndex: 30, // Sidebar level
          pointerEvents: 'auto',
          isolation: 'isolate'
        }}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/50">
          {!collapsed && (
            <Link href="/dashboard" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              POS System
            </Link>
          )}
          {collapsed && (
            <div className="w-full flex justify-center">
              <span className="text-xl font-bold text-blue-500">P</span>
            </div>
          )}
          
          {!isMobile && (
            <button 
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          )}
        </div>

        {/* Sidebar Navigation - Render all items immediately, no conditional rendering */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {filteredNavigation.map((item) => {
            // Active state logic:
            // 1. Exact match: pathname === item.href
            // 2. Sub-route match: pathname starts with item.href + '/'
            // Special case: For /dashboard, only match if pathname is exactly /dashboard
            // (not /dashboard/rentals, etc.)
            const isActive = 
              pathname === item.href || 
              (item.href !== '/dashboard' && pathname?.startsWith(item.href + '/'));

            const NavButton = (
              <NavLinkWithPrefetch
                href={item.href}
                isActive={isActive}
                collapsed={collapsed}
                onClick={handleNavClick}
                router={router}
              >
                <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} className={cn("transition-transform group-hover:scale-110 shrink-0", isActive && "text-blue-400")} />
                
                {!collapsed && (
                  <span className="ml-3 font-medium text-sm whitespace-nowrap">
                    {item.label}
                  </span>
                )}
                
                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-slate-700">
                    {item.label}
                  </div>
                )}
              </NavLinkWithPrefetch>
            );

            // Wrap with RoleGuard if permission required
            // Users and Settings have NO permission, so they bypass RoleGuard and are always visible
            if (item.permission) {
              return (
                <RoleGuard key={item.id} permission={item.permission}>
                  {NavButton}
                </RoleGuard>
              );
            }

            // Users and Settings are returned WITHOUT RoleGuard - always visible
            return <div key={item.id}>{NavButton}</div>;
          })}
        </div>

        {/* User Profile Snippet */}
        <div className="p-4 border-t border-slate-800/50">
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-slate-700">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user.email?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">
                    {user.email}
                  </span>
                  <span className="text-xs text-slate-500 capitalize">
                    {role || 'User'}
                  </span>
                </div>
              )}
            </div>
            {!collapsed && (
              <button 
                onClick={() => signOut()}
                className="text-slate-400 hover:text-white transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-slate-950 relative">
        {/* Topbar - Fixed height to prevent CLS */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            {isMobile && (
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -ml-2 text-slate-400 hover:text-white"
              >
                <Menu size={24} />
              </button>
            )}
            {/* Universal Search - Hidden on mobile */}
            <div className="hidden md:block flex-1 max-w-md">
              <UniversalSearch />
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            {/* Branch Selector */}
            <BranchSelector />
            <button className="relative text-slate-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <div className="h-6 w-px bg-slate-800 hidden md:block"></div>
            <CreateNewButton />
            <RoleGuard permission="canCreateSales">
              <Button 
                variant="primary" 
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-blue-500/50"
                onClick={() => router.push('/pos')}
              >
                <ShoppingCart className="mr-2 h-4 w-4" /> POS
              </Button>
            </RoleGuard>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth scrollbar-thin scrollbar-thumb-slate-800">
          <div className="max-w-7xl mx-auto h-full">
            {/* Smooth fade transition - no page refresh */}
            <div 
              key={pathname} 
              className="h-full animate-in fade-in duration-200"
              style={{
                animation: 'fadeIn 0.2s ease-out',
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </main>
      </div>
    </ModalProvider>
  );
}

