import React from 'react';
import { 
  Film, 
  IndianRupee, 
  Plus, 
  MessageSquare, 
  Database,
  Sparkles, 
  Zap, 
  Clock, 
  ShieldCheck,
  ShieldAlert,
  Activity,
  Layers,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import LoginWeatherClockWidget from '../LoginWeatherClockWidget';
import { Project } from '../../types';
import { formatINR } from '../../utils';

interface DashboardHeaderProps {
  isOnline: boolean;
  projects?: Project[];
  onOpenPaymentModal: () => void;
  onQuickAction: (tab: string, subAction?: string) => void;
  onTriggerBackup: () => void;
  isBackupRecommended?: boolean;
  activeProjectsCount?: number;
  urgentRevisionsCount?: number;
  totalOutstandingBalance?: number;
  criticalDeadlinesCount?: number;
  overdueDeadlinesCount?: number;
  nearestDeadlineItem?: { coupleName?: string; daysLeft: number } | null;
  pendingStudiosWithBalanceCount?: number;
  unpaidEditorsCount?: number;
  onSelectPerspective?: (mode: 'mission_control' | 'edit_suite' | 'financials' | 'priority_radar' | 'forecast') => void;
}

export default function DashboardHeader({
  isOnline,
  projects = [],
  onOpenPaymentModal,
  onQuickAction,
  onTriggerBackup,
  isBackupRecommended = false,
  activeProjectsCount = 0,
  urgentRevisionsCount = 0,
  totalOutstandingBalance = 0,
  criticalDeadlinesCount = 0,
  overdueDeadlinesCount = 0,
  nearestDeadlineItem = null,
  pendingStudiosWithBalanceCount = 0,
  unpaidEditorsCount = 0,
  onSelectPerspective
}: DashboardHeaderProps) {
  const [isMobileExpanded, setIsMobileExpanded] = React.useState(false);
  const hasCriticalDeadlines = overdueDeadlinesCount > 0 || criticalDeadlinesCount > 0;
  const hasPendingPayments = totalOutstandingBalance > 0 || unpaidEditorsCount > 0;

  const handleDeadlineClick = () => {
    if (onSelectPerspective) {
      onSelectPerspective('priority_radar');
    }
    const el = document.getElementById('critical-deadlines-section') || document.getElementById('perspective-views-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      onQuickAction('projects');
    }
  };

  const handlePaymentClick = () => {
    if (totalOutstandingBalance > 0) {
      onOpenPaymentModal();
    } else if (onSelectPerspective) {
      onSelectPerspective('financials');
      const el = document.getElementById('perspective-views-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };
  return (
    <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0c1411] via-[#070d0b] to-[#040605] border border-gold-500/25 p-3.5 sm:p-5 md:p-8 shadow-2xl space-y-3 sm:space-y-4 md:space-y-6 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
      
      {/* Decorative ambient illumination & film grain glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-luxury-green-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Decorative Film Silhouette SVG Watermark */}
      <div className="absolute -right-6 -bottom-6 w-56 h-56 pointer-events-none opacity-[0.05] hidden lg:block text-gold-400">
        <svg viewBox="0 0 100 100" fill="currentColor" className="w-full h-full">
          <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="50" cy="50" r="15" fill="currentColor" />
          <circle cx="50" cy="20" r="8" fill="currentColor" />
          <circle cx="50" cy="80" r="8" fill="currentColor" />
          <circle cx="20" cy="50" r="8" fill="currentColor" />
          <circle cx="80" cy="50" r="8" fill="currentColor" />
        </svg>
      </div>

      {/* ================= TOP META STATUS & LIVE PILOT BAR ================= */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/[0.08] min-w-0">
        
        {/* Left: Suite Tag & Live Status */}
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <div className="px-3.5 py-1 rounded-full bg-black/60 border border-gold-500/35 flex items-center space-x-2 shadow-inner min-w-0">
            <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse shrink-0" />
            <span className="text-[10px] font-mono text-gold-300 font-bold uppercase tracking-widest truncate max-w-[220px] sm:max-w-none">
              The Frame Cut Studio OS • Mission Control
            </span>
          </div>

          <div className={`px-3 py-1 rounded-full text-[10px] font-mono flex items-center gap-1.5 border shadow-sm ${
            isOnline 
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="font-medium">{isOnline ? 'Cloud Database Synced' : 'Offline Cached'}</span>
          </div>

          {urgentRevisionsCount > 0 && (
            <div className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono flex items-center gap-1 animate-pulse font-medium">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span>{urgentRevisionsCount} Urgent Cuts</span>
            </div>
          )}

          {/* Top Quick Blinking Deadline Badge */}
          <button
            onClick={handleDeadlineClick}
            className={`px-3 py-1 rounded-full text-[10px] font-mono flex items-center gap-1.5 border shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 ${
              overdueDeadlinesCount > 0
                ? 'bg-rose-600/30 text-rose-200 border-rose-400/80 animate-pulse shadow-rose-950/50 ring-1 ring-rose-400/40'
                : criticalDeadlinesCount > 0
                ? 'bg-amber-500/25 text-amber-200 border-amber-400/70 animate-pulse shadow-amber-950/50'
                : 'bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:border-white/[0.15]'
            }`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                overdueDeadlinesCount > 0 ? 'bg-rose-400' : criticalDeadlinesCount > 0 ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                overdueDeadlinesCount > 0 ? 'bg-rose-400' : criticalDeadlinesCount > 0 ? 'bg-amber-400' : 'bg-emerald-500'
              }`} />
            </span>
            <span className="font-bold">
              {overdueDeadlinesCount > 0 
                ? `🚨 ${overdueDeadlinesCount} Overdue Deadline${overdueDeadlinesCount > 1 ? 's' : ''}`
                : criticalDeadlinesCount > 0
                ? `⚡ ${criticalDeadlinesCount} Due in 48h`
                : `⚡ Deadlines Normal`}
            </span>
          </button>

          {/* Top Quick Blinking Payment Badge */}
          <button
            onClick={handlePaymentClick}
            className={`px-3 py-1 rounded-full text-[10px] font-mono flex items-center gap-1.5 border shadow-sm cursor-pointer transition-all hover:scale-105 active:scale-95 ${
              totalOutstandingBalance > 0
                ? 'bg-amber-500/25 text-amber-200 border-amber-400/70 animate-pulse shadow-amber-950/50 ring-1 ring-amber-400/40'
                : 'bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:border-white/[0.15]'
            }`}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                totalOutstandingBalance > 0 ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                totalOutstandingBalance > 0 ? 'bg-amber-400' : 'bg-emerald-500'
              }`} />
            </span>
            <span className="font-bold">
              {totalOutstandingBalance > 0 
                ? `💰 ₹${(totalOutstandingBalance / 1000).toFixed(0)}k Dues Pending`
                : `💰 All Payments Settled`}
            </span>
          </button>
        </div>

        {/* Right: Lead Director & Quick Identity + Mobile Accordion Button */}
        <div className="flex items-center space-x-2 sm:space-x-3 text-right shrink-0">
          <div className="hidden sm:block text-right">
            <span className="text-[10px] font-mono text-zinc-400 block uppercase tracking-wider font-medium">Executive Lead</span>
            <span className="text-xs font-bold text-gold-300 font-display">Satish Tiwari</span>
          </div>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-gold-500/30 to-luxury-green-800 border border-gold-500/40 flex items-center justify-center text-gold-300 text-xs font-bold font-mono shadow-md">
            ST
          </div>
          
          {/* Mobile Accordion Toggle to avoid giant scrolling */}
          <button
            type="button"
            onClick={() => setIsMobileExpanded(!isMobileExpanded)}
            className="md:hidden flex items-center gap-1 px-2 py-1 rounded-xl bg-white/[0.05] border border-white/10 text-gold-300 text-[10px] font-mono font-bold hover:bg-white/10 active:scale-95 transition-all"
            title={isMobileExpanded ? 'Collapse extra tools' : 'Expand full header'}
          >
            <span>{isMobileExpanded ? 'Compact' : 'More'}</span>
            {isMobileExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

      </div>

      {/* ================= HERO TITLE & REALTIME CLOCK INTEGRATION ================= */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-6 min-w-0">
        
        <div className="space-y-1 sm:space-y-2 max-w-2xl min-w-0 w-full">
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-gold-400 min-w-0">
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-gold-400" />
            <span className="uppercase tracking-wider font-semibold truncate">Master Cinematography Command Center</span>
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-5xl font-serif italic text-white tracking-tight leading-tight break-words">
            The Frame Cut Studio OS
          </h1>
          <p className={`${isMobileExpanded ? 'block' : 'hidden md:block'} text-zinc-300 text-xs sm:text-sm font-normal leading-relaxed max-w-xl transition-all`}>
            Realtime operations suite for wedding film workflows, studio partner accounts, editor wage allocations, and scheduled balance recoveries.
          </p>

          {/* ================= LIVE BLINKING OPERATIONAL REMINDERS STRIP ================= */}
          <div className={`${isMobileExpanded ? 'flex' : 'hidden md:flex'} pt-2 flex-wrap items-center gap-3 w-full min-w-0`}>
            
            {/* 1. Project Deadline Reminder Card (Blinking) */}
            <div 
              onClick={handleDeadlineClick}
              className={`group px-3.5 py-2.5 rounded-2xl border flex items-center space-x-3 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto min-w-0 max-w-full ${
                overdueDeadlinesCount > 0
                  ? 'bg-rose-950/70 border-rose-500/60 text-rose-200 animate-pulse shadow-lg shadow-rose-950/60 ring-1 ring-rose-500/40'
                  : criticalDeadlinesCount > 0
                  ? 'bg-amber-950/70 border-amber-500/60 text-amber-200 animate-pulse shadow-lg shadow-amber-950/60 ring-1 ring-amber-500/40'
                  : 'bg-black/40 border-white/[0.08] hover:border-white/[0.15] text-zinc-300'
              }`}
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-black/50 border border-white/10 shrink-0">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    overdueDeadlinesCount > 0 ? 'bg-rose-400' : criticalDeadlinesCount > 0 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    overdueDeadlinesCount > 0 ? 'bg-rose-500' : criticalDeadlinesCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                </span>
              </div>
              <div className="min-w-0 flex-1 pr-1">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-400">
                    Deadline Reminder
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                    overdueDeadlinesCount > 0 
                      ? 'bg-rose-500/30 text-rose-200 border-rose-500/40 animate-pulse'
                      : criticalDeadlinesCount > 0 
                      ? 'bg-amber-500/30 text-amber-200 border-amber-500/40 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {overdueDeadlinesCount > 0 ? 'OVERDUE' : criticalDeadlinesCount > 0 ? 'URGENT 48H' : 'ACTIVE'}
                  </span>
                </div>
                <div className="text-xs font-bold font-mono tracking-tight text-white group-hover:text-gold-300 transition-colors truncate max-w-[240px] sm:max-w-[280px]">
                  {overdueDeadlinesCount > 0 
                    ? `🚨 ${overdueDeadlinesCount} Delivery Overdue!`
                    : criticalDeadlinesCount > 0 
                    ? `⚡ ${criticalDeadlinesCount} Due in 48h ${nearestDeadlineItem?.coupleName ? `(${nearestDeadlineItem.coupleName})` : ''}`
                    : `🟢 All ${activeProjectsCount} Projects On Schedule`}
                </div>
              </div>
            </div>

            {/* 2. Payment & Outstanding Dues Reminder Card (Blinking) */}
            <div 
              onClick={handlePaymentClick}
              className={`group px-3.5 py-2.5 rounded-2xl border flex items-center space-x-3 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto min-w-0 max-w-full ${
                totalOutstandingBalance > 0
                  ? 'bg-amber-950/70 border-amber-500/60 text-amber-200 animate-pulse shadow-lg shadow-amber-950/60 ring-1 ring-amber-500/40'
                  : 'bg-black/40 border-white/[0.08] hover:border-white/[0.15] text-zinc-300'
              }`}
            >
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-black/50 border border-white/10 shrink-0">
                <span className="relative flex h-3 w-3">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    totalOutstandingBalance > 0 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`} />
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${
                    totalOutstandingBalance > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                </span>
              </div>
              <div className="min-w-0 flex-1 pr-1">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-400">
                    Payment Reminder
                  </span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                    totalOutstandingBalance > 0 
                      ? 'bg-amber-500/30 text-amber-200 border-amber-500/40 animate-pulse'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {totalOutstandingBalance > 0 ? 'DUE NOW' : 'SETTLED'}
                  </span>
                </div>
                <div className="text-xs font-bold font-mono tracking-tight text-white group-hover:text-gold-300 transition-colors truncate max-w-[240px] sm:max-w-[280px]">
                  {totalOutstandingBalance > 0 
                    ? `💰 ${formatINR(totalOutstandingBalance)} Due (${pendingStudiosWithBalanceCount} Studio${pendingStudiosWithBalanceCount > 1 ? 's' : ''})`
                    : `🟢 All Studio Dues & Editor Payouts Cleared`}
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Live Weather & Analog/Digital Realtime Clock - Collapsed on mobile to save vertical space */}
        <div className={`${isMobileExpanded ? 'flex' : 'hidden md:flex'} w-full lg:w-auto shrink-0 items-center justify-center lg:justify-end min-w-0`}>
          <LoginWeatherClockWidget layout="horizontal" projects={projects} />
        </div>

      </div>

      {/* ================= QUICK OPERATIONS ACTION DESK ================= */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 pt-3 sm:pt-5 border-t border-white/[0.08]">
        
        <div className="hidden sm:flex items-center space-x-2 text-xs text-zinc-200 font-mono">
          <Zap className="w-4 h-4 text-gold-400" />
          <span className="font-semibold text-white">Instant Actions:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          
          {/* LEVEL 1: HERO PRIMARY CTA - New Wedding Film */}
          <button
            onClick={() => onQuickAction('projects', 'add_project')}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 sm:px-5 py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-gold-400 via-gold-500 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-charcoal-950 font-bold text-xs shadow-lg shadow-gold-500/25 ring-1 ring-gold-300/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer min-h-[44px]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Wedding Film</span>
          </button>

          {/* LEVEL 2: SECONDARY ACCENT - Record Payment Ledger */}
          <button
            onClick={onOpenPaymentModal}
            className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-3 sm:px-4 py-2.5 rounded-xl sm:rounded-2xl bg-white/[0.04] hover:bg-gold-500/15 text-gold-300 hover:text-gold-200 border border-gold-500/40 hover:border-gold-400/80 font-semibold text-xs shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer backdrop-blur-md min-h-[44px]"
          >
            <IndianRupee className="w-3.5 h-3.5 text-gold-400" />
            <span>Record Payment</span>
          </button>

          {/* LEVEL 3: UTILITY 1 - 5th WhatsApp Engine */}
          <button
            onClick={() => {
              const el = document.getElementById('whatsapp-reminders-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                onQuickAction('finance');
              }
            }}
            className={`${isMobileExpanded ? 'flex' : 'hidden md:flex'} items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/[0.03] hover:bg-emerald-950/50 border border-white/[0.08] hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-300 text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer backdrop-blur-md min-h-[44px]`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>5th WhatsApp</span>
          </button>

          {/* LEVEL 3: UTILITY 2 - Snapshot Cloud Backup */}
          <button
            onClick={onTriggerBackup}
            className={`${isMobileExpanded ? 'flex' : 'hidden md:flex'} items-center space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl border text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer backdrop-blur-md min-h-[44px] ${
              isBackupRecommended
                ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 animate-pulse shadow-lg shadow-amber-500/10'
                : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] hover:border-white/[0.15] text-zinc-300 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-gold-400" />
            <span>{isBackupRecommended ? 'Backup Advised' : 'Snapshot Backup'}</span>
          </button>

        </div>

      </div>

    </div>
  );
}
