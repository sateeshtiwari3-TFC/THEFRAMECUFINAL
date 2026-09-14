import React from 'react';
import { 
  Film, 
  Layers, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  IndianRupee, 
  Calendar, 
  HardDrive, 
  Sparkles,
  TrendingUp,
  Flame,
  Zap,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { Project, Studio, Editor } from '../../types';

interface ProjectsHeaderKpiProps {
  projects: Project[];
  filteredProjects: Project[];
  studios: Studio[];
  editors: Editor[];
  onOpenWeekShoots: () => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  deadlineFilter: string;
  setDeadlineFilter: (deadline: string) => void;
}

export const ProjectsHeaderKpi: React.FC<ProjectsHeaderKpiProps> = ({
  projects,
  filteredProjects,
  studios,
  editors,
  onOpenWeekShoots,
  statusFilter,
  setStatusFilter,
  deadlineFilter,
  setDeadlineFilter
}) => {
  const [isMobileKpiOpen, setIsMobileKpiOpen] = React.useState(true);

  // Real-time calculations
  const stats = React.useMemo(() => {
    let totalContractValue = 0;
    let totalAdvanceCollected = 0;
    let totalPendingBalance = 0;
    let activeEditingCount = 0;
    let completedCount = 0;
    let overdueCount = 0;
    let dueIn7DaysCount = 0;
    let totalStorageGb = 0;

    const now = Date.now();

    projects.forEach((proj) => {
      const amount = Number(proj.projectAmount) || 0;
      const advance = Number(proj.advancePayment) || 0;
      const balance = Math.max(0, amount - advance);

      totalContractValue += amount;
      totalAdvanceCollected += advance;
      totalPendingBalance += balance;

      if (['data_received', 'assigned', 'editing', 'review', 'revision', 'rendering'].includes(proj.status)) {
        activeEditingCount += 1;
      }
      if (['delivered', 'closed'].includes(proj.status)) {
        completedCount += 1;
      }

      if (proj.deliveryDate && !['delivered', 'closed'].includes(proj.status)) {
        const diffDays = Math.ceil((new Date(proj.deliveryDate).getTime() - now) / (1000 * 3600 * 24));
        if (diffDays < 0) {
          overdueCount += 1;
        } else if (diffDays <= 7) {
          dueIn7DaysCount += 1;
        }
      }

      totalStorageGb += (proj.rawFootageSizeGB || 0) + (proj.finalExportSizeGB || 0);
    });

    // Shoots this week
    const oneWeekLater = new Date(now + 7 * 24 * 3600 * 1000);
    const thisWeekShoots = projects.filter((p) => {
      if (!p.shootDate) return false;
      const shoot = new Date(p.shootDate);
      return shoot >= new Date(now - 24 * 3600 * 1000) && shoot <= oneWeekLater;
    }).length;

    return {
      totalProjects: projects.length,
      filteredCount: filteredProjects.length,
      totalContractValue,
      totalAdvanceCollected,
      totalPendingBalance,
      activeEditingCount,
      completedCount,
      overdueCount,
      dueIn7DaysCount,
      totalStorageTb: (totalStorageGb / 1024).toFixed(1),
      thisWeekShoots
    };
  }, [projects, filteredProjects]);

  return (
    <div className="space-y-4">
      {/* Top Real-Time Production Executive Banner */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-charcoal-900 via-charcoal-900/95 to-luxury-green-950/40 border border-gold-500/30 p-3.5 sm:p-5 md:p-6 shadow-2xl backdrop-blur-xl">
        {/* Subtle ambient luxury lights */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-72 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        {/* Banner Header */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 pb-3 sm:pb-4 mb-3 sm:mb-5 border-b border-white/10 relative z-10">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-gold-500/20 to-luxury-green-800/40 border border-gold-500/40 flex items-center justify-center text-gold-400 shadow-md shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-gold-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base md:text-lg font-bold font-display text-white tracking-wide">
                  Production Hub
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span>LIVE</span>
                </span>
                {stats.filteredCount !== stats.totalProjects && (
                  <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold-500/15 text-gold-300 border border-gold-500/30">
                    MATCHING ({stats.filteredCount}/{stats.totalProjects})
                  </span>
                )}
              </div>
              <p className="hidden sm:block text-xs text-gray-400 font-sans mt-0.5">
                Real-time tracking of active editing pipelines, studio partner receivables, and delivery milestones.
              </p>
            </div>
          </div>

          {/* Quick Action Badges & Mobile Toggle */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onOpenWeekShoots}
              className="text-xs font-mono text-gray-200 hover:text-white bg-charcoal-950/90 hover:bg-charcoal-950 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl border border-gold-500/30 hover:border-gold-400 flex items-center gap-1.5 shadow-inner transition-all group cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-gold-400 group-hover:scale-110 transition-transform" />
              <span className="text-[11px] sm:text-xs">Shoots: <strong className="text-gold-300 font-bold">{stats.thisWeekShoots}</strong></span>
            </button>

            {/* Mobile Toggle to collapse 4 KPI cards */}
            <button
              type="button"
              onClick={() => setIsMobileKpiOpen(!isMobileKpiOpen)}
              className="md:hidden flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gold-400 border border-white/10 text-xs font-mono"
              title={isMobileKpiOpen ? 'Hide KPIs' : 'Show KPIs'}
            >
              <span className="text-[10px] uppercase font-bold">{isMobileKpiOpen ? 'Hide' : 'KPIs'}</span>
              {isMobileKpiOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 4 Core High-Impact KPI Summary Cards - 2 cols on mobile to save vertical space */}
        <div className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 relative z-10 ${isMobileKpiOpen ? 'grid' : 'hidden md:grid'}`}>
          
          {/* Card 1: Active Production Pipeline */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-charcoal-950/70 border border-gold-500/20 hover:border-gold-500/40 transition-all shadow-md group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1 sm:gap-1.5">
                <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gold-400 shrink-0" />
                <span className="truncate">Pipeline</span>
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold bg-gold-500/10 text-gold-300 border border-gold-500/30">
                {stats.totalProjects}
              </span>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
              <div className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
                {stats.activeEditingCount}
                <span className="text-[10px] sm:text-xs text-gray-400 font-normal ml-1">Active</span>
              </div>
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'editing' ? 'all' : 'editing')}
                className="hidden sm:flex text-[11px] font-mono text-gold-400 hover:text-gold-300 items-center gap-1 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                <span>Filter</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-white/5 flex items-center justify-between text-[9px] sm:text-[11px] text-gray-400 font-mono">
              <span className="text-emerald-400 flex items-center gap-1 truncate">
                <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 shrink-0" />
                <span>{stats.completedCount} Done</span>
              </span>
              <span className="hidden sm:inline">{stats.totalStorageTb} TB</span>
            </div>
          </motion.div>

          {/* Card 2: Total Contract Pipeline */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-charcoal-950/70 border border-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-md group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1 sm:gap-1.5">
                <IndianRupee className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">Contract</span>
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                LAKHS
              </span>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
                ₹{(stats.totalContractValue / 100000).toFixed(1)}L
              </div>
              <span className="hidden sm:inline text-[10px] font-mono text-emerald-400/80">
                ₹{stats.totalContractValue.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-white/5 flex items-center justify-between text-[9px] sm:text-[11px] text-gray-400 font-mono">
              <span className="text-emerald-300 truncate">
                Adv: ₹{(stats.totalAdvanceCollected / 100000).toFixed(1)}L
              </span>
              <span className="hidden sm:inline text-gray-500">
                ({stats.totalContractValue > 0 ? Math.round((stats.totalAdvanceCollected / stats.totalContractValue) * 100) : 0}%)
              </span>
            </div>
          </motion.div>

          {/* Card 3: Pending Balance Due */}
          <motion.div 
            whileHover={{ y: -2 }}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-charcoal-950/70 border border-amber-500/20 hover:border-amber-500/40 transition-all shadow-md group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1 sm:gap-1.5">
                <IndianRupee className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Receivables</span>
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                DUE
              </span>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 tracking-tight">
                ₹{(stats.totalPendingBalance / 100000).toFixed(1)}L
              </div>
              <span className="hidden sm:inline text-[10px] font-mono text-amber-300/80">
                ₹{stats.totalPendingBalance.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-white/5 flex items-center justify-between text-[9px] sm:text-[11px] text-gray-400 font-mono">
              <span className="text-amber-300/90 truncate">
                {projects.filter(p => (Number(p.projectAmount || 0) - Number(p.advancePayment || 0)) > 0).length} Due
              </span>
              <span className="hidden sm:inline text-gray-500">
                {studios.length} Studios
              </span>
            </div>
          </motion.div>

          {/* Card 4: Urgent & Approaching Deadlines */}
          <motion.div 
            whileHover={{ y: -2 }}
            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-charcoal-950/70 border transition-all shadow-md group ${
              stats.overdueCount > 0 
                ? 'border-rose-500/40 hover:border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1 sm:gap-1.5">
                <Clock className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${stats.overdueCount > 0 ? 'text-rose-400 animate-pulse' : 'text-gold-400'} shrink-0`} />
                <span className="truncate">Deadlines</span>
              </span>
              {stats.overdueCount > 0 ? (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 animate-pulse">
                  <Flame className="w-2.5 h-2.5 text-rose-400" />
                  {stats.overdueCount}
                </span>
              ) : (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  ON TIME
                </span>
              )}
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
              <div className="text-xl sm:text-2xl font-black font-display text-white tracking-tight">
                {stats.dueIn7DaysCount}
                <span className="text-[10px] sm:text-xs text-gray-400 font-normal ml-1">≤ 7 Days</span>
              </div>
              <button
                type="button"
                onClick={() => setDeadlineFilter(deadlineFilter === 'due_7_days' ? 'all' : 'due_7_days')}
                className="hidden sm:flex text-[11px] font-mono text-gold-400 hover:text-gold-300 items-center gap-1 group-hover:translate-x-0.5 transition-transform cursor-pointer"
              >
                <span>{deadlineFilter === 'due_7_days' ? 'Clear' : 'View'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-white/5 flex items-center justify-between text-[9px] sm:text-[11px] font-mono">
              <span className={`truncate ${stats.overdueCount > 0 ? 'text-rose-400 font-bold' : 'text-gray-400'}`}>
                {stats.overdueCount > 0 ? `⚠️ ${stats.overdueCount} Overdue` : '✓ 0 overdue'}
              </span>
              <span className="hidden sm:inline text-gray-500">{stats.thisWeekShoots} shoots</span>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
};
