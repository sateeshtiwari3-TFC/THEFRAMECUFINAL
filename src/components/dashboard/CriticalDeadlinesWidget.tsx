import React, { useState, useMemo, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Flame, 
  Film, 
  Building2, 
  User, 
  MessageSquare, 
  Eye, 
  CheckCircle2, 
  Sparkles, 
  Calendar, 
  ArrowUpRight, 
  ChevronRight,
  ShieldAlert,
  Zap,
  Timer,
  RefreshCw,
  BellRing,
  IndianRupee
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Editor, Studio, ProjectStatus } from '../../types';
import { formatINR, MS_PER_DAY } from '../../utils';
import ProjectStatusBadge from './ProjectStatusBadge';

interface CriticalDeadlinesWidgetProps {
  projects: Project[];
  editors: Editor[];
  studios: Studio[];
  onInspectProject: (project: Project) => void;
  onUpdateProject?: (id: string, updates: Partial<Project>) => Promise<void>;
  onNavigateTab?: (tab: string, subAction?: string) => void;
}

export interface CriticalProjectItem {
  project: Project;
  editor?: Editor;
  studio?: Studio;
  deliveryDate: Date;
  diffMs: number;
  diffHours: number;
  diffDays: number;
  urgencyLevel: 'overdue' | 'critical_24h' | 'impending_48h' | 'warning_72h';
  urgencyScore: number; // For fine sorting
  formattedCountdown: string;
}

export default function CriticalDeadlinesWidget({
  projects = [],
  editors = [],
  studios = [],
  onInspectProject,
  onUpdateProject,
  onNavigateTab
}: CriticalDeadlinesWidgetProps) {
  const [filterMode, setFilterMode] = useState<'all_48h' | 'overdue' | 'under_24h' | 'under_48h'>('all_48h');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [extendingProjectId, setExtendingProjectId] = useState<string | null>(null);
  const [markingDeliveredId, setMarkingDeliveredId] = useState<string | null>(null);

  // Re-calculate timestamps periodically or on demand
  const [nowTime, setNowTime] = useState(() => Date.now());

  useEffect(() => {
    // Tick every minute to keep countdowns razor sharp
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Compute all critical items
  const criticalItems = useMemo<CriticalProjectItem[]>(() => {
    const activeProjects = projects.filter(p => p.status !== 'delivered' && p.status !== 'closed');
    const items: CriticalProjectItem[] = [];

    activeProjects.forEach(p => {
      if (!p.deliveryDate) return;
      
      // Parse delivery date at end of day or standard timestamp
      const dDate = new Date(p.deliveryDate);
      if (isNaN(dDate.getTime())) return;

      // Set to 23:59:59 of delivery date to give full day credit
      const deadlineTimestamp = new Date(
        dDate.getFullYear(),
        dDate.getMonth(),
        dDate.getDate(),
        23,
        59,
        59
      ).getTime();

      const diffMs = deadlineTimestamp - nowTime;
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      const diffDays = Math.ceil(diffMs / MS_PER_DAY);

      // We focus on projects due within next 48 hours or overdue
      if (diffHours <= 48) {
        let urgencyLevel: CriticalProjectItem['urgencyLevel'] = 'impending_48h';
        let urgencyScore = 0;

        if (diffMs < 0) {
          urgencyLevel = 'overdue';
          // More overdue = higher urgency score
          urgencyScore = 10000 + Math.abs(diffHours);
        } else if (diffHours <= 24) {
          urgencyLevel = 'critical_24h';
          // Less hours remaining = higher score
          urgencyScore = 5000 + (24 - diffHours);
        } else {
          urgencyLevel = 'impending_48h';
          urgencyScore = 1000 + (48 - diffHours);
        }

        // Boost urgency for urgent priority projects
        if (p.priority === 'urgent') urgencyScore += 500;
        if (p.priority === 'high') urgencyScore += 200;

        // Human readable countdown
        let formattedCountdown = '';
        if (diffMs < 0) {
          const absHours = Math.abs(diffHours);
          if (absHours < 24) {
            formattedCountdown = `Overdue by ${absHours}h`;
          } else {
            const absDays = Math.floor(absHours / 24);
            const remHours = absHours % 24;
            formattedCountdown = `Overdue by ${absDays}d ${remHours}h`;
          }
        } else if (diffHours <= 1) {
          const remMins = Math.max(1, Math.round(diffMs / (1000 * 60)));
          formattedCountdown = `⚡ ${remMins}m remaining`;
        } else if (diffHours <= 24) {
          formattedCountdown = `🔥 ${diffHours}h remaining`;
        } else {
          const days = Math.floor(diffHours / 24);
          const hrs = diffHours % 24;
          formattedCountdown = `⏳ ${days}d ${hrs}h remaining`;
        }

        const editor = editors.find(e => e.id === p.assignedEditorId);
        const studio = studios.find(s => s.id === p.studioId);

        items.push({
          project: p,
          editor,
          studio,
          deliveryDate: new Date(deadlineTimestamp),
          diffMs,
          diffHours,
          diffDays,
          urgencyLevel,
          urgencyScore,
          formattedCountdown
        });
      }
    });

    // Sort strictly by urgency score descending (most critical / overdue first)
    return items.sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [projects, editors, studios, nowTime]);

  // Filtered by selected sub-tab
  const filteredItems = useMemo(() => {
    switch (filterMode) {
      case 'overdue':
        return criticalItems.filter(item => item.urgencyLevel === 'overdue');
      case 'under_24h':
        return criticalItems.filter(item => item.urgencyLevel === 'critical_24h');
      case 'under_48h':
        return criticalItems.filter(item => item.urgencyLevel === 'impending_48h');
      case 'all_48h':
      default:
        return criticalItems;
    }
  }, [criticalItems, filterMode]);

  // Aggregate stats
  const stats = useMemo(() => {
    const overdueCount = criticalItems.filter(i => i.urgencyLevel === 'overdue').length;
    const under24hCount = criticalItems.filter(i => i.urgencyLevel === 'critical_24h').length;
    const under48hCount = criticalItems.filter(i => i.urgencyLevel === 'impending_48h').length;
    const totalAtRiskValue = criticalItems.reduce((sum, i) => sum + (Number(i.project.projectAmount) || 0), 0);
    const totalPendingReceivables = criticalItems.reduce((sum, i) => {
      const pAmt = Number(i.project.projectAmount) || 0;
      const adv = Number(i.project.advancePayment) || 0;
      return sum + Math.max(0, pAmt - adv);
    }, 0);

    return {
      totalCritical: criticalItems.length,
      overdueCount,
      under24hCount,
      under48hCount,
      totalAtRiskValue,
      totalPendingReceivables
    };
  }, [criticalItems]);

  // Next upcoming project outside 48h (for clean empty state)
  const nextUpcomingProject = useMemo(() => {
    const activeWithDates = projects
      .filter(p => p.status !== 'delivered' && p.status !== 'closed' && p.deliveryDate)
      .map(p => ({
        project: p,
        date: new Date(p.deliveryDate).getTime()
      }))
      .filter(p => p.date > nowTime)
      .sort((a, b) => a.date - b.date);

    return activeWithDates.length > 0 ? activeWithDates[0] : null;
  }, [projects, nowTime]);

  const handlePingEditorWhatsApp = (e: React.MouseEvent, item: CriticalProjectItem) => {
    e.stopPropagation();
    const phone = item.editor?.phone || item.project.clientPhone;
    if (!phone) {
      alert('No editor or client contact registered for this project.');
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    
    let urgencyPrefix = 'URGENT 48-HOUR DEADLINE DISPATCH';
    if (item.urgencyLevel === 'overdue') urgencyPrefix = 'CRITICAL OVERDUE ESCALATION';
    if (item.urgencyLevel === 'critical_24h') urgencyPrefix = 'PRIORITY 24-HOUR RENDER CALL';

    const msg = encodeURIComponent(
      `*${urgencyPrefix} — The Frame Cut Studio OS*\n\n` +
      `Hi ${item.editor?.name || 'Editor'},\n` +
      `Regarding Wedding Film: *${item.project.coupleName}* (${item.project.eventType})\n` +
      `Studio: *${item.project.studioName || 'Direct Client'}*\n` +
      `Delivery Target: *${item.formattedCountdown}* (${item.project.deliveryDate})\n` +
      `Current Status: *${item.project.status.toUpperCase()}*\n\n` +
      `Kindly expedite the timeline cut/master render export and upload preview link immediately.\n\n` +
      `Thank you!`
    );
    window.open(`https://wa.me/${targetPhone}?text=${msg}`, '_blank');
  };

  const handleQuickExtend24h = async (e: React.MouseEvent, item: CriticalProjectItem) => {
    e.stopPropagation();
    if (!onUpdateProject) return;
    try {
      setExtendingProjectId(item.project.id);
      const curDate = new Date(item.project.deliveryDate);
      curDate.setDate(curDate.getDate() + 1);
      const newDateStr = curDate.toISOString().split('T')[0];
      await onUpdateProject(item.project.id, {
        deliveryDate: newDateStr
      });
    } catch (err) {
      console.error('Failed to extend deadline:', err);
    } finally {
      setExtendingProjectId(null);
    }
  };

  const handleQuickDeliver = async (e: React.MouseEvent, item: CriticalProjectItem) => {
    e.stopPropagation();
    if (!onUpdateProject) return;
    try {
      setMarkingDeliveredId(item.project.id);
      await onUpdateProject(item.project.id, {
        status: 'delivered'
      });
    } catch (err) {
      console.error('Failed to mark delivered:', err);
    } finally {
      setMarkingDeliveredId(null);
    }
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#1a0c0e] via-[#12080a] to-[#0a0506] border border-rose-500/30 p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6">
      
      {/* Ambient Pulsing Radar Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header & Ticker */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-rose-500/20 relative z-10">
        
        {/* Title and Icon */}
        <div className="flex items-center space-x-3.5">
          <div className="relative">
            <div className="p-3 bg-gradient-to-br from-rose-600 to-rose-950 text-white border border-rose-400/40 rounded-2xl shadow-lg shadow-rose-950/60">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            {stats.totalCritical > 0 && (
              <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold border-2 border-[#1a0c0e] shadow-md animate-bounce">
                {stats.totalCritical}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-rose-400 uppercase tracking-widest font-bold block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping inline-block" />
                ⚡ 48-Hour Deadline Radar • Critical Dispatch
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono border border-rose-500/40 font-bold animate-pulse">
                Live Urgency Sorter
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-serif italic text-white">
              Critical Delivery Deadlines
            </h3>
          </div>
        </div>

        {/* Filter Navigation Chips */}
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={() => setFilterMode('all_48h')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              filterMode === 'all_48h'
                ? 'bg-rose-500 text-white font-bold border-rose-400 shadow-lg shadow-rose-950/40'
                : 'bg-black/40 text-gray-300 border-white/10 hover:text-white hover:border-rose-500/30'
            }`}
          >
            All Critical ({criticalItems.length})
          </button>

          {stats.overdueCount > 0 && (
            <button
              onClick={() => setFilterMode('overdue')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border flex items-center space-x-1.5 ${
                filterMode === 'overdue'
                  ? 'bg-rose-600 text-white font-bold border-rose-300 shadow-lg shadow-rose-900/50'
                  : 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/40 animate-pulse'
              }`}
            >
              <span>🚨 Overdue</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                {stats.overdueCount}
              </span>
            </button>
          )}

          <button
            onClick={() => setFilterMode('under_24h')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              filterMode === 'under_24h'
                ? 'bg-amber-500 text-charcoal-950 font-bold border-amber-400 shadow-md'
                : 'bg-black/40 text-amber-300/80 border-amber-500/30 hover:text-amber-200'
            }`}
          >
            🔥 &lt; 24 Hours ({stats.under24hCount})
          </button>

          <button
            onClick={() => setFilterMode('under_48h')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              filterMode === 'under_48h'
                ? 'bg-gold-500 text-charcoal-950 font-bold border-gold-400 shadow-md'
                : 'bg-black/40 text-gold-300/80 border-gold-500/30 hover:text-gold-200'
            }`}
          >
            ⏳ 24h–48h ({stats.under48hCount})
          </button>

          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('calendar')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-gold-300 transition-all flex items-center space-x-1 cursor-pointer ml-1"
              title="Open Calendar Schedule"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Timeline</span>
            </button>
          )}

        </div>

      </div>

      {/* Quick At-A-Glance Stat Pills Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10 text-xs font-mono">
        <div className="p-3.5 rounded-2xl bg-black/50 border border-rose-500/20 flex flex-col justify-between">
          <span className="text-[10px] text-rose-400/90 uppercase tracking-wider block">🚨 At-Risk Deliverables</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xl font-bold text-white font-mono">{stats.totalCritical}</span>
            <span className="text-[11px] text-rose-400">Wedding Films</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/50 border border-amber-500/20 flex flex-col justify-between">
          <span className="text-[10px] text-amber-400/90 uppercase tracking-wider block">🔥 Next 24 Hours</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-xl font-bold text-amber-400 font-mono">{stats.under24hCount}</span>
            <span className="text-[11px] text-gray-400">Impending</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/50 border border-gold-500/20 flex flex-col justify-between">
          <span className="text-[10px] text-gold-400/90 uppercase tracking-wider block">💰 Contract Value At Risk</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-lg font-bold text-gold-300 font-mono">
              {formatINR(stats.totalAtRiskValue)}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/50 border border-emerald-500/20 flex flex-col justify-between">
          <span className="text-[10px] text-emerald-400/90 uppercase tracking-wider block">Pending Receivables</span>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {formatINR(stats.totalPendingReceivables)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Critical List / Cards */}
      {filteredItems.length === 0 ? (
        /* ================= EMPTY STATE: ZERO 48-HOUR BREACHES ================= */
        <div className="p-8 rounded-3xl bg-black/40 border border-emerald-500/30 text-center relative z-10 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/50">
            <CheckCircle2 className="w-8 h-8 animate-pulse" />
          </div>
          
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-white font-display">
              All Systems Clear • No 48-Hour Critical Breaches
            </h4>
            <p className="text-xs text-gray-300 font-light max-w-md mx-auto">
              There are currently no wedding films due in the next 48 hours or overdue. Your edit suite is operating smoothly ahead of schedule!
            </p>
          </div>

          {nextUpcomingProject && (
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-[#091b15] border border-gold-500/30 text-xs font-mono text-gray-300">
              <Calendar className="w-4 h-4 text-gold-400" />
              <span>Next Upcoming Delivery:</span>
              <strong className="text-white">{nextUpcomingProject.project.coupleName}</strong>
              <span className="text-gold-400">({nextUpcomingProject.project.deliveryDate})</span>
            </div>
          )}
        </div>
      ) : (
        /* ================= ACTIVE CRITICAL DEADLINE CARDS ================= */
        <div className="space-y-3.5 relative z-10">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item, idx) => {
              const isOverdue = item.urgencyLevel === 'overdue';
              const isUnder24 = item.urgencyLevel === 'critical_24h';
              const pAmt = Number(item.project.projectAmount) || 0;
              const advAmt = Number(item.project.advancePayment) || 0;
              const pendingAmt = Math.max(0, pAmt - advAmt);

              const cardBorder = isOverdue
                ? 'border-rose-500/60 bg-gradient-to-r from-rose-950/50 via-[#18080b] to-[#100507]'
                : isUnder24
                ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/40 via-[#160b09] to-[#0f0706]'
                : 'border-gold-500/30 bg-gradient-to-r from-[#170e0a] via-[#100908] to-[#0b0606]';

              return (
                <motion.div
                  key={item.project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  onClick={() => onInspectProject(item.project)}
                  className={`rounded-2xl border p-4 md:p-5 shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer group hover:scale-[1.01] ${cardBorder}`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    
                    {/* Left: Countdown Pill & Project Identity */}
                    <div className="flex items-start sm:items-center space-x-3.5 min-w-0">
                      
                      {/* Urgency Pill */}
                      <div className="shrink-0">
                        <div className={`px-3 py-2 rounded-xl font-mono text-xs font-bold border flex flex-col items-center justify-center min-w-[115px] text-center shadow-md relative overflow-hidden ${
                          isOverdue
                            ? 'bg-rose-600 text-white border-rose-400 shadow-rose-900/60 animate-pulse ring-2 ring-rose-500/40'
                            : isUnder24
                            ? 'bg-amber-500/25 text-amber-200 border-amber-400/70 shadow-amber-950/50 animate-pulse ring-1 ring-amber-400/30'
                            : 'bg-gold-500/20 text-gold-300 border-gold-500/40'
                        }`}>
                          <div className="flex items-center space-x-1.5">
                            {isOverdue ? (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                              </span>
                            ) : isUnder24 ? (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                              </span>
                            ) : (
                              <Clock className="w-3.5 h-3.5 shrink-0 text-gold-400" />
                            )}
                            <span className="tracking-wide">{isOverdue ? 'OVERDUE' : isUnder24 ? 'CRITICAL 24H' : 'DUE SOON'}</span>
                          </div>
                          <span className="text-[11px] font-bold mt-0.5 tracking-tight">
                            {item.formattedCountdown}
                          </span>
                        </div>
                      </div>

                      {/* Project Names & Studio */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <h4 className="text-base font-bold text-white font-display group-hover:text-gold-300 transition-colors truncate max-w-[220px] sm:max-w-[320px]">
                            {item.project.coupleName || 'Wedding Film'}
                          </h4>

                          {item.project.priority === 'urgent' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/25 text-rose-300 border border-rose-500/40 text-[9px] font-mono font-bold animate-pulse shrink-0">
                              🔥 URGENT PRIORITY
                            </span>
                          )}

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black/60 text-gray-300 border border-white/10 shrink-0">
                            {item.project.eventType || 'Wedding Highlight'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-300 font-mono min-w-0">
                          <span className="flex items-center space-x-1 text-gold-400 min-w-0">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[140px] sm:max-w-[200px]">{item.project.studioName || item.studio?.name || 'Direct Client'}</span>
                          </span>

                          <span className="text-gray-400 flex items-center space-x-1 shrink-0">
                            <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span>Target: {item.project.deliveryDate}</span>
                          </span>

                          <span className="text-emerald-400 font-semibold shrink-0">
                            {formatINR(pAmt)} {pendingAmt > 0 ? `(${formatINR(pendingAmt)} Due)` : '(Paid)'}
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Right: Dynamic Status Badge, Lead Editor, and Quick Action Controls */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/10 shrink-0 w-full lg:w-auto">
                      
                      {/* Dynamic Color-Coded Status Badge */}
                      <div className="shrink-0">
                        <ProjectStatusBadge
                          status={item.project.status}
                          size="sm"
                          showDot={true}
                          showIcon={true}
                        />
                      </div>

                      {/* Editor Tag */}
                      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
                        <div className="w-5 h-5 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-300 text-[10px] font-bold shrink-0">
                          {item.editor?.name?.charAt(0) || item.project.assignedEditorName?.charAt(0) || 'E'}
                        </div>
                        <span className="text-gray-200 truncate max-w-[100px]">
                          {item.editor?.name || item.project.assignedEditorName || 'Unassigned'}
                        </span>
                      </div>

                      {/* Quick Action Button Group */}
                      <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        
                        {/* WhatsApp Editor Ping */}
                        <button
                          type="button"
                          onClick={(e) => handlePingEditorWhatsApp(e, item)}
                          title="Send Urgent WhatsApp Ping to Editor"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center space-x-1.5 shadow-md transition-all cursor-pointer hover:scale-105"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>

                        {/* Quick Mark Delivered */}
                        {onUpdateProject && item.project.status !== 'delivered' && (
                          <button
                            type="button"
                            disabled={markingDeliveredId === item.project.id}
                            onClick={(e) => handleQuickDeliver(e, item)}
                            title="Mark Project as Delivered"
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center space-x-1 transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Delivered</span>
                          </button>
                        )}

                        {/* Quick Extend +24h */}
                        {onUpdateProject && (
                          <button
                            type="button"
                            disabled={extendingProjectId === item.project.id}
                            onClick={(e) => handleQuickExtend24h(e, item)}
                            title="Extend Deadline by +24 Hours"
                            className="px-2.5 py-1.5 rounded-xl bg-black/50 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-mono transition-all cursor-pointer"
                          >
                            +24h
                          </button>
                        )}

                        {/* Inspect Details */}
                        <button
                          type="button"
                          onClick={() => onInspectProject(item.project)}
                          title="Open Full Worksheet & Inspect"
                          className="p-1.5 rounded-xl bg-white/5 hover:bg-gold-500/20 border border-white/10 hover:border-gold-500/40 text-gray-300 hover:text-gold-300 transition-all cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                      </div>

                    </div>

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Footer Dispatch Advice */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-gray-400 border-t border-rose-500/15">
        <span className="flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-rose-400" />
          <span>Automated priority escalation active for deliveries within 48 hours.</span>
        </span>
        <span className="text-gray-400">
          Showing {filteredItems.length} of {criticalItems.length} flagged deliveries
        </span>
      </div>

    </div>
  );
}
