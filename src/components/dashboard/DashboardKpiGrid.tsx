import React from 'react';
import { 
  Film, 
  Calendar, 
  Clock, 
  TrendingUp, 
  IndianRupee, 
  AlertTriangle, 
  TrendingDown, 
  Sparkles, 
  Layers, 
  ArrowUpRight,
  ShieldAlert,
  Zap,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatINR } from '../../utils';

interface DashboardKpiGridProps {
  totalProjectsCount: number;
  completedProjectsCount: number;
  pendingProjectsCount: number;
  totalProjectsThisMonthCount: number;
  completedThisMonthCount: number;
  activeThisMonthCount: number;
  activeProjectsCount: number;
  totalRevenue: number;
  totalOutstandingBalance: number;
  projectsWithOutstandingBalanceCount: number;
  urgentRevisionPendingCount: number;
  allRevisionsPendingCount: number;
  totalExpenses: number;
  manualExpensesTotal: number;
  totalProfit: number;
  activeStudiosCount: number;
  activeEditorsCount: number;
  onNavigateTab?: (tab: string, subAction?: string) => void;
}

export default function DashboardKpiGrid({
  totalProjectsCount,
  completedProjectsCount,
  pendingProjectsCount,
  totalProjectsThisMonthCount,
  completedThisMonthCount,
  activeThisMonthCount,
  activeProjectsCount,
  totalRevenue,
  totalOutstandingBalance,
  projectsWithOutstandingBalanceCount,
  urgentRevisionPendingCount,
  allRevisionsPendingCount,
  totalExpenses,
  manualExpensesTotal,
  totalProfit,
  activeStudiosCount,
  activeEditorsCount,
  onNavigateTab
}: DashboardKpiGridProps) {
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';
  const deliveryRate = totalProjectsCount > 0 ? Math.round((completedProjectsCount / totalProjectsCount) * 100) : 0;

  const cards = [
    {
      id: 'active-pipeline',
      title: 'Active Video Pipeline',
      value: activeProjectsCount,
      unit: 'Films',
      sub: `${pendingProjectsCount} in post-production`,
      progress: Math.min(100, Math.round((activeProjectsCount / Math.max(1, totalProjectsCount)) * 100)),
      badge: `${deliveryRate}% Delivered`,
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      icon: Clock,
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      accentColor: 'from-emerald-400 to-teal-400',
      glowColor: 'bg-emerald-500/15',
      action: () => onNavigateTab && onNavigateTab('projects'),
      actionLabel: 'Explore Pipeline'
    },
    {
      id: 'projects-this-month',
      title: 'Monthly Film Velocity',
      value: totalProjectsThisMonthCount,
      unit: 'This Month',
      sub: `${completedThisMonthCount} delivered • ${activeThisMonthCount} active`,
      progress: totalProjectsThisMonthCount > 0 ? Math.round((completedThisMonthCount / totalProjectsThisMonthCount) * 100) : 0,
      badge: `${completedThisMonthCount} Closed`,
      badgeColor: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      icon: Calendar,
      iconBg: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
      accentColor: 'from-sky-400 to-cyan-400',
      glowColor: 'bg-sky-500/15',
      action: () => onNavigateTab && onNavigateTab('calendar'),
      actionLabel: 'View Schedule'
    },
    {
      id: 'gross-revenue',
      title: 'Gross Revenue Contracts',
      value: formatINR(totalRevenue),
      unit: '',
      sub: `Across ${totalProjectsCount} contracted wedding films`,
      progress: 100,
      badge: `${formatINR(Math.round(totalRevenue / Math.max(1, totalProjectsCount)))} / film avg`,
      badgeColor: 'bg-gold-500/15 text-gold-300 border-gold-500/30',
      icon: TrendingUp,
      iconBg: 'bg-gold-500/15 text-gold-400 border-gold-500/30',
      accentColor: 'from-gold-400 to-amber-400',
      glowColor: 'bg-gold-500/15',
      action: () => onNavigateTab && onNavigateTab('finance'),
      actionLabel: 'Open Ledger'
    },
    {
      id: 'outstanding-balance',
      title: 'Receivables Outstanding',
      value: formatINR(totalOutstandingBalance),
      unit: '',
      sub: `${projectsWithOutstandingBalanceCount} studio partners with balance`,
      progress: totalRevenue > 0 ? Math.min(100, Math.round((totalOutstandingBalance / totalRevenue) * 100)) : 0,
      badge: totalOutstandingBalance > 0 ? `${projectsWithOutstandingBalanceCount} Pending Dues` : 'All Settled',
      badgeColor: totalOutstandingBalance > 0 ? 'bg-amber-500/20 text-amber-200 border-amber-500/40' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      icon: IndianRupee,
      iconBg: totalOutstandingBalance > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      accentColor: totalOutstandingBalance > 0 ? 'from-amber-400 to-orange-400' : 'from-emerald-400 to-teal-400',
      glowColor: totalOutstandingBalance > 0 ? 'bg-amber-500/15' : 'bg-emerald-500/10',
      action: () => onNavigateTab && onNavigateTab('finance'),
      actionLabel: 'Collect Balances'
    },
    {
      id: 'urgent-revisions',
      title: 'Urgent Revision Radar',
      value: urgentRevisionPendingCount,
      unit: 'High Priority',
      sub: `${allRevisionsPendingCount} total revisions logged in queue`,
      progress: allRevisionsPendingCount > 0 ? Math.round((urgentRevisionPendingCount / allRevisionsPendingCount) * 100) : 0,
      badge: urgentRevisionPendingCount > 0 ? 'Action Required' : 'Queue Clear',
      badgeColor: urgentRevisionPendingCount > 0 ? 'bg-rose-500/25 text-rose-200 border-rose-500/50 animate-pulse' : 'bg-white/[0.04] text-zinc-300 border-white/[0.08]',
      icon: AlertTriangle,
      iconBg: urgentRevisionPendingCount > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-white/[0.05] text-zinc-300 border-white/10',
      accentColor: urgentRevisionPendingCount > 0 ? 'from-rose-500 to-pink-500' : 'from-zinc-400 to-zinc-600',
      glowColor: urgentRevisionPendingCount > 0 ? 'bg-rose-500/20' : 'bg-white/5',
      action: () => onNavigateTab && onNavigateTab('projects'),
      actionLabel: 'Inspect Queue'
    },
    {
      id: 'total-profit',
      title: 'Net Profit Yield',
      value: formatINR(totalProfit),
      unit: '',
      sub: `${profitMargin}% overall studio profit margin`,
      progress: Math.min(100, Math.max(0, Math.round(Number(profitMargin)))),
      badge: `${profitMargin}% Margin`,
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      icon: Sparkles,
      iconBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      accentColor: 'from-emerald-400 to-gold-400',
      glowColor: 'bg-emerald-500/15',
      action: () => onNavigateTab && onNavigateTab('finance'),
      actionLabel: 'Profit Matrix'
    },
    {
      id: 'total-expenses',
      title: 'Operational Cost Outflow',
      value: formatINR(totalExpenses),
      unit: '',
      sub: `${formatINR(manualExpensesTotal)} overhead & hard disks`,
      progress: totalRevenue > 0 ? Math.min(100, Math.round((totalExpenses / totalRevenue) * 100)) : 0,
      badge: `${totalRevenue > 0 ? Math.round((totalExpenses / totalRevenue) * 100) : 0}% of Bookings`,
      badgeColor: 'bg-red-500/15 text-red-300 border-red-500/30',
      icon: TrendingDown,
      iconBg: 'bg-red-500/15 text-red-400 border-red-500/30',
      accentColor: 'from-red-400 to-rose-400',
      glowColor: 'bg-red-500/15',
      action: () => onNavigateTab && onNavigateTab('finance'),
      actionLabel: 'View Outflows'
    },
    {
      id: 'alliances',
      title: 'Studio & Editor Alliance',
      value: activeStudiosCount + activeEditorsCount,
      unit: 'Partners',
      sub: `${activeStudiosCount} studios • ${activeEditorsCount} video editors`,
      progress: 100,
      badge: `${activeStudiosCount} B2B Studios`,
      badgeColor: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      icon: Layers,
      iconBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      accentColor: 'from-indigo-400 to-blue-400',
      glowColor: 'bg-indigo-500/15',
      action: () => onNavigateTab && onNavigateTab('studios'),
      actionLabel: 'Manage Alliances'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Grid of Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const isRupeeValue = typeof card.value === 'string' && card.value.startsWith('₹');
          const displayNumeric = isRupeeValue ? (card.value as string).substring(1) : card.value;

          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              onClick={card.action}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#131720]/90 via-[#0d1016]/90 to-[#090b0f]/95 border border-white/[0.08] hover:border-gold-500/40 p-5 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer flex flex-col justify-between backdrop-blur-xl before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent"
            >
              {/* Semantic ambient corner glow on hover */}
              <div className={`absolute -top-10 -right-10 w-32 h-32 ${card.glowColor} rounded-full blur-2xl group-hover:scale-150 transition-all duration-500 pointer-events-none opacity-60 group-hover:opacity-100`} />

              {/* Card Top: Icon & Badge */}
              <div className="flex items-center justify-between w-full gap-2 relative z-10">
                <div className={`p-2.5 rounded-2xl border ${card.iconBg} shadow-md backdrop-blur-md`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border font-semibold ${card.badgeColor} backdrop-blur-md`}>
                  {card.badge}
                </span>
              </div>

              {/* Card Mid: Main Metric (Centered) */}
              <div className="my-4 relative z-10 space-y-1.5 text-center flex flex-col items-center justify-center w-full min-w-0">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 group-hover:text-zinc-200 block font-semibold text-center truncate max-w-full transition-colors">
                  {card.title}
                </span>
                <div className="flex items-baseline justify-center space-x-1 w-full min-w-0 px-1">
                  {isRupeeValue && (
                    <span className="text-base sm:text-lg lg:text-xl font-bold font-sans text-gold-400 shrink-0">₹</span>
                  )}
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono text-white tracking-tight text-center truncate max-w-full">
                    {displayNumeric}
                  </h3>
                  {card.unit && (
                    <span className="text-xs font-mono text-zinc-400 font-normal shrink-0 ml-1">{card.unit}</span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 font-normal text-center truncate max-w-full">{card.sub}</p>
              </div>

              {/* Card Bottom: Micro Progress Bar & Quick Action (Centered) */}
              <div className="pt-3 border-t border-white/[0.08] relative z-10 space-y-2 w-full">
                {/* Progress track */}
                <div className="w-full h-1.5 rounded-full bg-black/50 overflow-hidden border border-white/5">
                  <div 
                    className={`h-full rounded-full bg-gradient-to-r ${card.accentColor} transition-all duration-700 mx-auto`}
                    style={{ width: `${Math.max(5, Math.min(100, card.progress))}%` }}
                  />
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400 font-mono group-hover:text-gold-300 transition-colors text-center">
                  <span>{card.actionLabel}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
