import React from 'react';
import { 
  LayoutDashboard, 
  Film, 
  Building2, 
  Users, 
  IndianRupee, 
  HardDrive, 
  BarChart3, 
  Calendar, 
  Bell, 
  Settings, 
  Plus, 
  Receipt, 
  Sparkles, 
  Laptop,
  Shield,
  Activity,
  History,
  Trash2,
  Search,
  Command,
  Zap,
  CloudOff
} from 'lucide-react';
import { UserProfile } from '../types';
import ThemeToggle, { AppTheme } from './ThemeToggle';
import { getTabTheme } from '../utils/navigationTheme';

interface TopHeaderBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: UserProfile | null;
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  unreadNotificationCount?: number;
  recycleBinCount?: number;
  onOpenSearch?: () => void;
  isOnline?: boolean;
}

const TAB_TITLES: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  dashboard: { label: 'Dashboard', icon: LayoutDashboard, description: 'Live Working Projects & ERP Overview' },
  payments: { label: 'Payment Center', icon: IndianRupee, description: 'Client Ledger & Editor Payout Tracking' },
  projects: { label: 'Projects Directory', icon: Film, description: 'All Wedding Video & Photo Assignments' },
  registry: { label: 'New Project Registry', icon: Plus, description: 'Register Client Order & Assign Sequences' },
  invoice: { label: 'Invoicing & GST Billing', icon: Receipt, description: 'Professional Invoice Generator & History' },
  studios: { label: 'Studios Directory', icon: Building2, description: 'Partner Photography Studio Clients' },
  editors: { label: 'Editors Portal', icon: Laptop, description: 'Video Editors, Rates & Task Statuses' },
  datamanager: { label: 'Data Manager', icon: HardDrive, description: 'Storage Codes, HDDs & Backup Tracking' },
  calendar: { label: 'Studio Calendar', icon: Calendar, description: 'Shoots, Deadlines & Events Timeline' },
  gemini: { label: 'Gemini AI Assistant', icon: Sparkles, description: 'AI Project Summary & Script Writing' },
  audit: { label: 'Audit & Revision Log', icon: History, description: 'Chronological Trail of Statuses, Amounts & Editor Assignments' },
  reports: { label: 'Reports & Audits', icon: BarChart3, description: 'Profitability, Expenses & GST Reports' },
  notifications: { label: 'Notifications Center', icon: Bell, description: 'Automated Reminders & Deadline Alerts' },
  automation: { label: 'Studio Automations', icon: Zap, description: '1-Click Workflows, WhatsApp Triggers & Studio AutoPilot' },
  recyclebin: { label: 'Recycle Bin & Safe Trash', icon: Trash2, description: 'Safety Net for Accidental Deletions & Instant 1-Click Restoration' },
  settings: { label: 'Studio Settings', icon: Settings, description: 'System Configuration & Theme Customization' },
};

export default function TopHeaderBar({
  activeTab,
  setActiveTab,
  currentUser,
  theme,
  onThemeChange,
  unreadNotificationCount = 0,
  recycleBinCount = 0,
  onOpenSearch,
  isOnline = true
}: TopHeaderBarProps) {
  const currentTab = TAB_TITLES[activeTab] || {
    label: activeTab,
    icon: LayoutDashboard,
    description: 'Frame Cut Studio OS'
  };

  const IconComponent = currentTab.icon;
  const tabTheme = getTabTheme(activeTab);

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator?.platform || navigator?.userAgent || '');
  const shortcutKey = isMac ? '⌘K' : 'Ctrl+K';

  return (
    <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 p-3.5 sm:p-4 md:px-5 md:pr-40 lg:px-6 lg:pr-44 md:py-3.5 rounded-2xl bg-charcoal-900/80 border border-white/10 backdrop-blur-xl shadow-xl relative z-30 transition-all duration-300 min-w-0">
      {/* Left side: Current View Breadcrumb / Title with Dynamic Accent Styling */}
      <div className="flex items-center space-x-3 shrink-0 min-w-0">
        <div className={`p-2 sm:p-2.5 rounded-xl ${tabTheme.headerBadgeGradient} border ${tabTheme.headerBadgeBorder} ${tabTheme.headerBadgeText} shrink-0 shadow-inner transition-all duration-300`}>
          <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 filter drop-shadow" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h1 className="text-sm sm:text-base font-black font-display tracking-wider text-white uppercase flex items-center gap-1.5 truncate">
              <span>{currentTab.label}</span>
              <span className={`w-2 h-2 rounded-full ${tabTheme.subDot} inline-block animate-pulse shrink-0`} />
            </h1>
            {!isOnline ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 shrink-0 animate-pulse">
                <CloudOff className="w-2.5 h-2.5" />
                Local Cache
              </span>
            ) : (
              <span className={`hidden xl:inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded-full ${tabTheme.bgActive} ${tabTheme.text} border ${tabTheme.borderActive} transition-colors duration-300 shrink-0`}>
                <Activity className="w-2.5 h-2.5 animate-pulse" />
                Live ERP
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] font-sans text-gray-400 hidden sm:block truncate max-w-[200px] lg:max-w-none">
            {currentTab.description}
          </p>
        </div>
      </div>

      {/* Middle: Universal Omni-Search Bar Trigger */}
      <div className="flex-1 min-w-0 max-w-md w-full md:w-auto px-0 md:px-2">
        <button
          type="button"
          id="topbar-search-trigger"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-charcoal-950/80 hover:bg-charcoal-950 border border-white/10 hover:border-gold-500/40 text-gray-400 hover:text-white transition-all shadow-inner group cursor-pointer min-w-0"
          title={`Quick Search across Projects, Studios, Editors & Views (${shortcutKey})`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Search className="w-4 h-4 text-gold-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-xs font-sans text-gray-400 group-hover:text-gray-200 truncate min-w-0 text-left">
              Search projects, studios, editors...
            </span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-charcoal-900 border border-white/10 text-[10px] font-mono text-gold-400/90 font-bold shrink-0 shadow-sm">
            <span>{shortcutKey}</span>
          </div>
        </button>
      </div>

      {/* Right side: Header Controls (Theme Switcher, Notifications, User Profile) */}
      <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 font-mono shrink-0">
        {/* Prominent Theme Toggle Button */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <span className="text-[10px] uppercase text-gray-400 tracking-widest font-bold hidden xl:inline-block">
            Theme:
          </span>
          <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
        </div>

        <div className="h-5 w-px bg-white/10 hidden sm:block" />

        {/* Recycle Bin Shortcut */}
        {currentUser?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setActiveTab('recyclebin')}
            className={`relative p-2 rounded-xl transition-all border cursor-pointer ${
              activeTab === 'recyclebin'
                ? 'bg-red-500/20 text-red-300 border-red-500/40 shadow-sm'
                : 'bg-charcoal-950/80 text-gray-400 hover:text-white border-white/10 hover:border-white/20'
            }`}
            title="Recycle Bin (Safe Trash & Deletion Protection)"
          >
            <Trash2 className="w-4 h-4" />
            {recycleBinCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-bold bg-red-500 text-white rounded-full border border-charcoal-950 animate-pulse">
                {recycleBinCount}
              </span>
            )}
          </button>
        )}

        {/* Notifications Shortcut */}
        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`relative p-2 rounded-xl transition-all border cursor-pointer ${
            activeTab === 'notifications'
              ? 'bg-gold-500/20 text-gold-300 border-gold-500/40'
              : 'bg-charcoal-950/80 text-gray-400 hover:text-white border-white/10 hover:border-white/20'
          }`}
          title="Notifications & Deadline Runner"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[9px] font-bold bg-amber-500 text-charcoal-950 rounded-full border border-charcoal-950 animate-bounce">
              {unreadNotificationCount}
            </span>
          )}
        </button>

        {/* User Profile Badge */}
        <div className="hidden sm:flex items-center space-x-2.5 pl-1">
          <div className="relative shrink-0">
            <img
              src={currentUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'}
              alt={currentUser?.name || 'User'}
              className="w-8 h-8 rounded-xl object-cover border border-gold-500/30"
            />
            <div className="absolute -bottom-1 -right-1 bg-gold-500 text-charcoal-950 rounded-full p-0.5 border border-charcoal-950">
              <Shield className="w-2 h-2" />
            </div>
          </div>
          <div className="hidden xl:flex flex-col text-left min-w-0 max-w-[120px]">
            <span className="text-xs font-bold text-gray-200 leading-none truncate">
              {currentUser?.name || 'Admin'}
            </span>
            <span className="text-[9px] text-gold-400 font-mono capitalize mt-0.5 truncate">
              {currentUser?.role || 'admin'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
