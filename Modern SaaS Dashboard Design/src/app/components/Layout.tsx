import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Contact, 
  Package, 
  ShoppingCart, 
  ArrowLeftRight, 
  Receipt, 
  BarChart3, 
  Settings, 
  Menu, 
  Bell, 
  Search, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  ShoppingBag,
  ClipboardList,
  CreditCard,
  Calculator,
  Blocks,
  Printer
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'POS', icon: Printer },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'sales', label: 'Sales', icon: FileText },
  { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { id: 'stock_transfers', label: 'Stock Transfers', icon: ArrowLeftRight },
  { id: 'stock_adjustments', label: 'Stock Adjustments', icon: ClipboardList },
  { id: 'expenses', label: 'Expenses', icon: CreditCard },
  { id: 'contacts', label: 'Contacts', icon: Contact },
  { id: 'accounting', label: 'Accounting', icon: Calculator },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'modules', label: 'Modules', icon: Blocks },
  { id: 'notifications', label: 'Notification Templates', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (id: string) => void;
}

import { Toaster } from './ui/sonner';

export function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="dark min-h-screen bg-slate-950 text-slate-100 flex overflow-hidden font-sans">
      {/* Mobile Overlay */}
      {mobileMenuOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static z-50 h-full bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 transition-all duration-300 ease-in-out flex flex-col",
          collapsed ? "w-[80px]" : "w-[280px]",
          isMobile && !mobileMenuOpen ? "-translate-x-full" : "translate-x-0"
        )}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/50">
          {!collapsed && (
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              NexusPOS
            </span>
          )}
          {collapsed && (
            <div className="w-full flex justify-center">
              <span className="text-xl font-bold text-blue-500">N</span>
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

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) setMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center p-3 rounded-xl transition-all duration-200 group relative",
                activeTab === item.id 
                  ? "bg-blue-600/10 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] border border-blue-500/20" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100",
                collapsed ? "justify-center" : "justify-start"
              )}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} className={cn("transition-transform group-hover:scale-110", activeTab === item.id && "text-blue-400")} />
              
              {!collapsed && (
                <span className="ml-3 font-medium text-sm">{item.label}</span>
              )}
              
              {/* Tooltip for collapsed state */}
              {collapsed && (
                <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity border border-slate-700">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* User Profile Snippet */}
        <div className="p-4 border-t border-slate-800/50">
          <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between")}>
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-slate-700">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">Admin User</span>
                  <span className="text-xs text-slate-500">Store Manager</span>
                </div>
              )}
            </div>
            {!collapsed && (
              <button className="text-slate-400 hover:text-white transition-colors">
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-slate-950 relative">
        <Toaster />
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {isMobile && (
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="p-2 -ml-2 text-slate-400 hover:text-white"
              >
                <Menu size={24} />
              </button>
            )}
            <div className="hidden md:flex items-center gap-2 text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800/50 focus-within:border-blue-500/50 focus-within:text-blue-400 transition-colors w-64 lg:w-96">
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search products, orders, customers..." 
                className="bg-transparent border-none outline-none text-sm w-full text-slate-200 placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-6">
            <button className="relative text-slate-400 hover:text-white transition-colors">
              <Bell size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <div className="h-6 w-px bg-slate-800 hidden md:block"></div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-sm font-bold text-emerald-400">$24,500.00</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Today's Sales</span>
              </div>
              <Button 
                variant="default" 
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] border border-blue-500/50"
                onClick={() => setActiveTab('pos')}
              >
                <ShoppingCart className="mr-2 h-4 w-4" /> POS
              </Button>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth scrollbar-thin scrollbar-thumb-slate-800">
          <div className="max-w-7xl mx-auto h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
