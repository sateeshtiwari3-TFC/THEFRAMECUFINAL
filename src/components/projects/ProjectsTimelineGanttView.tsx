import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Camera, 
  Flag, 
  User, 
  Building2, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Filter, 
  BarChart2, 
  ListFilter, 
  ShieldCheck, 
  Layers, 
  Search, 
  X, 
  MessageSquare, 
  Share2, 
  ArrowRight, 
  Hourglass, 
  Activity, 
  Info,
  CalendarDays,
  Flame,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend,
  ReferenceLine
} from 'recharts';
import { SafeChartContainer } from '../common/SafeChartContainer';
import ProjectStatusBadge from '../ProjectStatusBadge';
import { Project, Studio, Editor, Revision, UserRole, ProjectStatus, ProjectPriority } from '../../types';
import { MS_PER_DAY } from '../../utils';

interface ProjectsTimelineGanttViewProps {
  projects: Project[];
  studios: Studio[];
  editors: Editor[];
  revisions: Revision[];
  userRole: UserRole;
  currentStudioId?: string;
  currentEditorId?: string;
  onSelectProject: (project: Project) => void;
  onEditProject: (project: Project) => void;
  onUpdateStatus: (projectId: string, status: ProjectStatus) => Promise<void>;
  onOpenQuickNote: (project: Project) => void;
  onOpenWhatsAppShare: (project: Project) => void;
  onOpenQualityControl?: (proj: Project) => void;
  onResetProject?: (proj: Project, e: React.MouseEvent) => void;
}

type TimelineTab = 'gantt' | 'recharts' | 'deadlines';
type TimeHorizon = '30days' | '60days' | '90days' | 'all';
type GroupBy = 'none' | 'editor' | 'studio' | 'status';

export const ProjectsTimelineGanttView: React.FC<ProjectsTimelineGanttViewProps> = ({
  projects,
  studios,
  editors,
  revisions,
  userRole,
  currentStudioId,
  currentEditorId,
  onSelectProject,
  onEditProject,
  onUpdateStatus,
  onOpenQuickNote,
  onOpenWhatsAppShare,
  onOpenQualityControl,
  onResetProject
}) => {
  const [activeTab, setActiveTab] = useState<TimelineTab>('gantt');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('90days');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [hideDelivered, setHideDelivered] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);

  // Today reference
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Filtered dataset according to local search and hide-delivered
  const visibleProjects = useMemo(() => {
    return projects.filter((p) => {
      if (hideDelivered && (p.status === 'delivered' || p.status === 'closed')) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCouple = p.coupleName?.toLowerCase().includes(q);
        const matchStudio = p.studioName?.toLowerCase().includes(q);
        const matchEditor = p.assignedEditorName?.toLowerCase().includes(q);
        const matchType = p.eventType?.toLowerCase().includes(q);
        if (!matchCouple && !matchStudio && !matchEditor && !matchType) return false;
      }
      return true;
    });
  }, [projects, hideDelivered, searchQuery]);

  // Overall Timeline Boundary Dates
  const timelineDates = useMemo(() => {
    let minDate = new Date(today);
    let maxDate = new Date(today);

    if (timeHorizon === '30days') {
      minDate.setDate(minDate.getDate() - 7);
      maxDate.setDate(maxDate.getDate() + 30);
    } else if (timeHorizon === '60days') {
      minDate.setDate(minDate.getDate() - 14);
      maxDate.setDate(maxDate.getDate() + 60);
    } else if (timeHorizon === '90days') {
      minDate.setDate(minDate.getDate() - 15);
      maxDate.setDate(maxDate.getDate() + 75);
    } else {
      // 'all': derive from actual shoot & delivery dates
      minDate.setDate(minDate.getDate() - 30);
      maxDate.setDate(maxDate.getDate() + 90);
      visibleProjects.forEach((p) => {
        if (p.shootDate) {
          const s = new Date(p.shootDate);
          if (!isNaN(s.getTime()) && s < minDate) minDate = new Date(s);
        }
        if (p.deliveryDate) {
          const d = new Date(p.deliveryDate);
          if (!isNaN(d.getTime()) && d > maxDate) maxDate = new Date(d);
        }
      });
    }

    const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / MS_PER_DAY));
    return { minDate, maxDate, totalDays, today };
  }, [visibleProjects, timeHorizon, today]);

  // Generate date grid headers (weekly and major month labels)
  const timelineHeaders = useMemo(() => {
    const { minDate, totalDays } = timelineDates;
    const intervals: { label: string; date: Date; leftPercent: number; isMonthStart?: boolean }[] = [];
    
    // Step by 7 days or 3 days depending on horizon
    const stepDays = totalDays > 75 ? 7 : totalDays > 35 ? 5 : 3;

    for (let dayOffset = 0; dayOffset <= totalDays; dayOffset += stepDays) {
      const curDate = new Date(minDate);
      curDate.setDate(curDate.getDate() + dayOffset);
      const leftPercent = (dayOffset / totalDays) * 100;
      const isMonthStart = curDate.getDate() <= stepDays;

      intervals.push({
        label: curDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        date: curDate,
        leftPercent,
        isMonthStart
      });
    }

    return intervals;
  }, [timelineDates]);

  // Today marker percentage
  const todayPositionPercent = useMemo(() => {
    const { minDate, maxDate, totalDays, today } = timelineDates;
    if (today < minDate || today > maxDate) return null;
    const diffDays = (today.getTime() - minDate.getTime()) / MS_PER_DAY;
    return Math.max(0, Math.min(100, (diffDays / totalDays) * 100));
  }, [timelineDates]);

  // Helper to compute Gantt position for Shoot -> Delivery bar
  const getGanttPosition = React.useCallback((shootDateStr?: string, deliveryDateStr?: string) => {
    const { minDate, totalDays } = timelineDates;
    
    // Fallbacks if dates are missing
    let shoot = shootDateStr ? new Date(shootDateStr) : null;
    let delivery = deliveryDateStr ? new Date(deliveryDateStr) : null;

    if (!shoot && delivery) {
      shoot = new Date(delivery);
      shoot.setDate(shoot.getDate() - 15);
    } else if (shoot && !delivery) {
      delivery = new Date(shoot);
      delivery.setDate(delivery.getDate() + 20);
    } else if (!shoot && !delivery) {
      shoot = new Date(today);
      delivery = new Date(today);
      delivery.setDate(delivery.getDate() + 15);
    }

    const shootTime = shoot!.getTime();
    const deliveryTime = delivery!.getTime();

    const startDiffDays = (shootTime - minDate.getTime()) / MS_PER_DAY;
    const durationDays = Math.max(1, (deliveryTime - shootTime) / MS_PER_DAY);

    let leftPercent = (startDiffDays / totalDays) * 100;
    let widthPercent = (durationDays / totalDays) * 100;

    // Bounds check
    if (leftPercent < 0) {
      widthPercent += leftPercent;
      leftPercent = 0;
    }
    if (leftPercent + widthPercent > 100) {
      widthPercent = Math.max(2, 100 - leftPercent);
    }
    if (widthPercent < 2.5) widthPercent = 2.5; // Ensure clickability

    // Days remaining to deadline from today
    const diffFromToday = Math.ceil((deliveryTime - today.getTime()) / MS_PER_DAY);

    return {
      leftPercent: Math.max(0, Math.min(98, leftPercent)),
      widthPercent: Math.max(2, Math.min(100, widthPercent)),
      durationDays: Math.round(durationDays),
      daysRemaining: diffFromToday,
      isOverdue: diffFromToday < 0,
      isDueSoon: diffFromToday >= 0 && diffFromToday <= 7
    };
  }, [timelineDates, today]);

  // Quick summary statistics for the Timeline banner
  const timelineStats = useMemo(() => {
    let overdueCount = 0;
    let dueSoonCount = 0;
    let totalCycleDays = 0;
    let validCycleCount = 0;

    visibleProjects.forEach((p) => {
      if (p.status === 'delivered' || p.status === 'closed') return;
      if (p.deliveryDate) {
        const d = new Date(p.deliveryDate);
        d.setHours(0, 0, 0, 0);
        const diff = Math.ceil((d.getTime() - today.getTime()) / MS_PER_DAY);
        if (diff < 0) overdueCount++;
        else if (diff <= 7) dueSoonCount++;
      }
      if (p.shootDate && p.deliveryDate) {
        const s = new Date(p.shootDate);
        const d = new Date(p.deliveryDate);
        const diff = Math.ceil((d.getTime() - s.getTime()) / MS_PER_DAY);
        if (diff > 0 && diff < 365) {
          totalCycleDays += diff;
          validCycleCount++;
        }
      }
    });

    const avgCycleDays = validCycleCount > 0 ? Math.round(totalCycleDays / validCycleCount) : 25;

    return {
      total: visibleProjects.length,
      overdueCount,
      dueSoonCount,
      avgCycleDays
    };
  }, [visibleProjects, today]);

  // Grouped projects mapping if groupBy is selected
  const groupedProjectSections = useMemo(() => {
    if (groupBy === 'none') {
      return [{ id: 'all', title: 'All Wedding Films', projects: visibleProjects }];
    }

    if (groupBy === 'editor') {
      const map = new Map<string, { title: string; projects: Project[] }>();
      visibleProjects.forEach((p) => {
        const key = p.assignedEditorId || 'unassigned';
        const title = p.assignedEditorName || 'Unassigned Editor';
        if (!map.has(key)) {
          map.set(key, { title, projects: [] });
        }
        map.get(key)!.projects.push(p);
      });
      return Array.from(map.entries()).map(([id, group]) => ({ id, ...group }));
    }

    if (groupBy === 'studio') {
      const map = new Map<string, { title: string; projects: Project[] }>();
      visibleProjects.forEach((p) => {
        const key = p.studioId || 'unknown';
        const title = p.studioName || 'Unknown Studio';
        if (!map.has(key)) {
          map.set(key, { title, projects: [] });
        }
        map.get(key)!.projects.push(p);
      });
      return Array.from(map.entries()).map(([id, group]) => ({ id, ...group }));
    }

    if (groupBy === 'status') {
      const map = new Map<string, { title: string; projects: Project[] }>();
      const statusLabels: Record<string, string> = {
        data_received: '1. Data Received',
        assigned: '2. Assigned',
        editing: '3. Active Editing',
        review: '4. Client / Studio Review',
        revision: '5. Revision Work',
        rendering: '6. Master Rendering',
        delivered: '7. Delivered',
        closed: '8. Closed / Archived'
      };

      visibleProjects.forEach((p) => {
        const key = p.status;
        const title = statusLabels[key] || key.toUpperCase();
        if (!map.has(key)) {
          map.set(key, { title, projects: [] });
        }
        map.get(key)!.projects.push(p);
      });
      return Array.from(map.entries()).map(([id, group]) => ({ id, ...group }));
    }

    return [{ id: 'all', title: 'All Projects', projects: visibleProjects }];
  }, [visibleProjects, groupBy]);

  // Recharts Bar Data Preparation
  const rechartsData = useMemo(() => {
    return visibleProjects
      .filter(p => p.status !== 'closed')
      .map((p) => {
        const shoot = p.shootDate ? new Date(p.shootDate) : new Date(today);
        const delivery = p.deliveryDate ? new Date(p.deliveryDate) : new Date(today);
        const duration = Math.max(1, Math.ceil((delivery.getTime() - shoot.getTime()) / MS_PER_DAY));
        const daysLeft = Math.ceil((delivery.getTime() - today.getTime()) / MS_PER_DAY);
        
        const milestones = p.customMilestones || [];
        const completedMilestones = milestones.filter(m => m.completed).length;
        const milestonePercent = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

        return {
          id: p.id,
          name: p.coupleName.length > 14 ? p.coupleName.substring(0, 14) + '...' : p.coupleName,
          fullName: p.coupleName,
          studio: p.studioName,
          editor: p.assignedEditorName || 'Unassigned',
          status: p.status,
          priority: p.priority,
          durationDays: duration,
          daysLeft: daysLeft,
          milestonePercent,
          shootDate: p.shootDate || 'TBD',
          deliveryDate: p.deliveryDate || 'TBD',
          isOverdue: daysLeft < 0,
          isDueSoon: daysLeft >= 0 && daysLeft <= 7
        };
      })
      .slice(0, 20); // Top 20 active for legible rendering
  }, [visibleProjects, today]);

  // Upcoming Deadlines Card Groups
  const categorizedDeadlines = useMemo(() => {
    const overdue: Project[] = [];
    const dueThisWeek: Project[] = [];
    const dueTwoWeeks: Project[] = [];
    const dueMonth: Project[] = [];
    const future: Project[] = [];

    visibleProjects.forEach((p) => {
      if (p.status === 'delivered' || p.status === 'closed') return;
      if (!p.deliveryDate) {
        future.push(p);
        return;
      }
      const d = new Date(p.deliveryDate);
      d.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d.getTime() - today.getTime()) / MS_PER_DAY);

      if (diff < 0) overdue.push(p);
      else if (diff <= 7) dueThisWeek.push(p);
      else if (diff <= 15) dueTwoWeeks.push(p);
      else if (diff <= 30) dueMonth.push(p);
      else future.push(p);
    });

    return [
      { id: 'overdue', label: 'Overdue Attention Required', icon: AlertTriangle, color: 'rose', list: overdue },
      { id: 'thisWeek', label: 'Due This Week (Next 7 Days)', icon: Flame, color: 'amber', list: dueThisWeek },
      { id: 'twoWeeks', label: 'Due in 8 to 15 Days', icon: Clock, color: 'yellow', list: dueTwoWeeks },
      { id: 'month', label: 'Due in 16 to 30 Days', icon: CalendarDays, color: 'blue', list: dueMonth },
      { id: 'future', label: 'Longer Horizon (30+ Days)', icon: Calendar, color: 'slate', list: future }
    ].filter(section => section.list.length > 0);
  }, [visibleProjects, today]);

  // Bar Gradient color helper based on project status
  const getStatusBarGradient = (status: ProjectStatus, priority: ProjectPriority, isOverdue: boolean) => {
    if (isOverdue && status !== 'delivered') {
      return 'from-rose-600 to-red-700 border-rose-400/60 shadow-rose-950/50';
    }
    switch (status) {
      case 'data_received':
        return 'from-slate-700 to-slate-800 border-slate-500/40 shadow-black/40';
      case 'assigned':
        return 'from-indigo-600 to-indigo-700 border-indigo-400/50 shadow-indigo-950/40';
      case 'editing':
        return 'from-amber-600 to-amber-700 border-amber-400/50 shadow-amber-950/40';
      case 'review':
        return 'from-purple-600 to-purple-700 border-purple-400/50 shadow-purple-950/40';
      case 'revision':
        return 'from-orange-600 to-orange-700 border-orange-400/50 shadow-orange-950/40';
      case 'rendering':
        return 'from-cyan-600 to-blue-700 border-cyan-400/50 shadow-cyan-950/40';
      case 'delivered':
        return 'from-emerald-600 to-teal-700 border-emerald-400/50 shadow-emerald-950/40';
      case 'closed':
        return 'from-slate-600 to-slate-700 border-slate-400/40 shadow-black/40';
      default:
        return 'from-gold-600 to-amber-700 border-gold-400/50 shadow-gold-950/40';
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. TIMELINE TOP CONTROL STRIP */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-charcoal-900/95 via-charcoal-900/80 to-charcoal-950/95 border border-gold-500/20 shadow-xl space-y-3.5">
        
        {/* Title, Metrics & Main Tab Switcher */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-500/20 to-amber-600/20 border border-gold-500/40 flex items-center justify-center text-gold-400 shadow-md shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-base sm:text-lg font-bold text-white font-display uppercase tracking-wide">
                  Wedding Projects Timeline & Gantt Schedule
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold-500/15 text-gold-300 border border-gold-500/30">
                  {timelineStats.total} Films
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Shoot dates, active post-production windows, and client delivery deadlines.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {timelineStats.overdueCount > 0 && (
              <div className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span><strong>{timelineStats.overdueCount}</strong> Overdue</span>
              </div>
            )}
            {timelineStats.dueSoonCount > 0 && (
              <div className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span><strong>{timelineStats.dueSoonCount}</strong> Due ≤ 7 Days</span>
              </div>
            )}
            <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gold-400" />
              <span>Avg Cycle: <strong>{timelineStats.avgCycleDays}d</strong></span>
            </div>

            {/* Main Mode Tabs */}
            <div className="inline-flex items-center p-1 bg-charcoal-950 rounded-2xl border border-white/10">
              <button
                type="button"
                id="btn-timeline-gantt"
                onClick={() => setActiveTab('gantt')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeTab === 'gantt'
                    ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-charcoal-950 font-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Interactive Gantt Swimlane Schedule"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Gantt Schedule</span>
              </button>

              <button
                type="button"
                id="btn-timeline-recharts"
                onClick={() => setActiveTab('recharts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeTab === 'recharts'
                    ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-charcoal-950 font-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Recharts Duration & Countdown Analysis"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Recharts Workload</span>
              </button>

              <button
                type="button"
                id="btn-timeline-deadlines"
                onClick={() => setActiveTab('deadlines')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeTab === 'deadlines'
                    ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-charcoal-950 font-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Upcoming Deadlines Breakdown"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Deadlines Matrix</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters & Horizon Toolbar */}
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3 h-3 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by couple / editor..."
                className="bg-charcoal-950 border border-white/10 rounded-xl pl-8 pr-6 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/40 w-44 sm:w-56"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Time Horizon */}
            <div className="flex items-center gap-1 bg-charcoal-950 px-2 py-1 rounded-xl border border-white/5">
              <span className="text-gray-500 text-[10px] uppercase">Horizon:</span>
              {(['30days', '60days', '90days', 'all'] as TimeHorizon[]).map((hz) => (
                <button
                  key={hz}
                  type="button"
                  onClick={() => setTimeHorizon(hz)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                    timeHorizon === hz
                      ? 'bg-gold-500 text-charcoal-950 font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {hz === 'all' ? 'All' : hz.replace('days', 'd')}
                </button>
              ))}
            </div>

            {/* Group By Selector */}
            {activeTab === 'gantt' && (
              <div className="flex items-center gap-1 bg-charcoal-950 px-2 py-1 rounded-xl border border-white/5">
                <ListFilter className="w-3 h-3 text-gold-400" />
                <span className="text-gray-500 text-[10px] uppercase">Group:</span>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                  className="bg-transparent text-gray-300 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="none" className="bg-charcoal-900">None (Flat)</option>
                  <option value="editor" className="bg-charcoal-900">By Editor</option>
                  <option value="studio" className="bg-charcoal-900">By Studio</option>
                  <option value="status" className="bg-charcoal-900">By Stage</option>
                </select>
              </div>
            )}
          </div>

          {/* Hide delivered toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white select-none">
            <input
              type="checkbox"
              checked={hideDelivered}
              onChange={(e) => setHideDelivered(e.target.checked)}
              className="rounded bg-charcoal-950 border-white/20 text-gold-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-[11px]">Hide Delivered / Closed</span>
          </label>
        </div>
      </div>

      {/* 2. TAB CONTENT: GANTT SCHEDULE VIEW */}
      {activeTab === 'gantt' && (
        <div className="rounded-3xl border border-white/10 bg-charcoal-900/90 shadow-2xl overflow-hidden">
          
          {/* Legend Strip */}
          <div className="p-3 bg-charcoal-950/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-gray-400">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>Shoot Date</span>
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-500 border border-amber-300/40" />
                <span>Editing Window</span>
              </span>
              <span className="flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-gold-400" />
                <span>Delivery Deadline</span>
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-rose-300">Overdue Alert</span>
              </span>
            </div>
            <div className="text-[10px] text-gray-500">
              *Click any film bar or row to open full specifications
            </div>
          </div>

          {/* Timeline Scrollable Matrix */}
          <div className="overflow-x-auto">
            <div className="min-w-[960px]">
              
              {/* Header Time Axis */}
              <div className="grid grid-cols-12 bg-charcoal-950 border-b border-white/10 text-[10px] font-mono text-gray-400 uppercase py-2.5 px-4 sticky top-0 z-20">
                <div className="col-span-4 lg:col-span-3 font-bold text-gold-400 flex items-center gap-1.5">
                  <FilmIcon className="w-3.5 h-3.5 text-gold-400" />
                  <span>Film Project / Studio</span>
                </div>
                
                <div className="col-span-8 lg:col-span-9 relative h-7 flex items-center">
                  {timelineHeaders.map((hdr, idx) => (
                    <div
                      key={idx}
                      style={{ left: `${hdr.leftPercent}%` }}
                      className={`absolute -translate-x-1/2 flex flex-col items-center pointer-events-none whitespace-nowrap ${
                        hdr.isMonthStart ? 'text-gold-300 font-bold' : 'text-gray-500'
                      }`}
                    >
                      <span>{hdr.label}</span>
                      <div className="w-0.5 h-1.5 bg-white/20 mt-0.5" />
                    </div>
                  ))}

                  {/* Today Marker in Header */}
                  {todayPositionPercent !== null && (
                    <div
                      style={{ left: `${todayPositionPercent}%` }}
                      className="absolute -translate-x-1/2 top-0 z-30 flex flex-col items-center pointer-events-none"
                    >
                      <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[8px] uppercase tracking-tighter shadow-md">
                        Today
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rows List (Grouped or Flat) */}
              <div className="divide-y divide-white/5 relative">
                
                {/* Vertical "Today" Line through all rows */}
                {todayPositionPercent !== null && (
                  <div
                    style={{ left: `calc(25% + (75% * ${todayPositionPercent} / 100))` }}
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-500/40 border-r border-dashed border-rose-500/80 pointer-events-none z-10"
                  />
                )}

                {visibleProjects.length === 0 ? (
                  <div className="p-16 text-center text-gray-400 font-mono text-xs">
                    No wedding film projects match the selected timeline filters.
                  </div>
                ) : (
                  groupedProjectSections.map((section) => (
                    <div key={section.id} className="relative">
                      {/* Section Header if grouped */}
                      {groupBy !== 'none' && (
                        <div className="bg-charcoal-950/80 px-4 py-2 text-xs font-mono font-bold text-gold-400 border-y border-white/5 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5" />
                            <span>{section.title}</span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-normal">
                            {section.projects.length} Film(s)
                          </span>
                        </div>
                      )}

                      {section.projects.map((project) => {
                        const pos = getGanttPosition(project.shootDate, project.deliveryDate);
                        const isHovered = hoveredProjectId === project.id;
                        const barGradient = getStatusBarGradient(project.status, project.priority, pos.isOverdue);
                        const milestones = project.customMilestones || [];
                        const completedCount = milestones.filter(m => m.completed).length;

                        return (
                          <div
                            key={project.id}
                            id={`timeline-row-${project.id}`}
                            onMouseEnter={() => setHoveredProjectId(project.id)}
                            onMouseLeave={() => setHoveredProjectId(null)}
                            className={`grid grid-cols-12 items-center py-3 px-4 transition-colors relative group cursor-pointer ${
                              isHovered ? 'bg-gold-500/[0.04]' : 'hover:bg-white/[0.02]'
                            }`}
                            onClick={() => onSelectProject(project)}
                          >
                            {/* LEFT COLUMN: Couple & Studio Info */}
                            <div className="col-span-4 lg:col-span-3 pr-3 space-y-1 z-10" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-between">
                                <h4 
                                  onClick={() => onSelectProject(project)}
                                  className="text-sm font-bold text-white font-display truncate hover:text-gold-300 transition-colors cursor-pointer"
                                  title={project.coupleName}
                                >
                                  {project.coupleName}
                                </h4>
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase shrink-0 ${
                                  project.priority === 'urgent'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : project.priority === 'high'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-white/5 text-gray-300 border-white/10'
                                }`}>
                                  {project.priority}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-gray-400">
                                <span className="flex items-center text-gold-400/90 truncate max-w-[130px]" title={project.studioName}>
                                  <Building2 className="w-3 h-3 mr-1 shrink-0" />
                                  <span className="truncate">{project.studioName}</span>
                                </span>
                                {project.assignedEditorName && (
                                  <span className="flex items-center text-emerald-400 truncate max-w-[110px]" title={project.assignedEditorName}>
                                    <User className="w-3 h-3 mr-0.5 shrink-0" />
                                    <span className="truncate">{project.assignedEditorName}</span>
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-0.5 text-[10px] font-mono">
                                <ProjectStatusBadge status={project.status} size="xs" showIcon={false} />

                                <div className="flex items-center gap-1">
                                  {onOpenQualityControl && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenQualityControl(project)}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                                        project.qcStatus === 'passed'
                                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                                      }`}
                                      title="Quality Control Checklist"
                                    >
                                      QC
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => onOpenQuickNote(project)}
                                    className="p-1 rounded text-gray-400 hover:text-gold-400 hover:bg-white/5 transition-colors cursor-pointer"
                                    title="Quick Note"
                                  >
                                    <MessageSquare className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* RIGHT COLUMN: Gantt Track with Shoot Date, Window Bar, and Deadline Flag */}
                            <div className="col-span-8 lg:col-span-9 relative h-12 flex items-center px-1">
                              
                              {/* Background Day Guides */}
                              <div className="absolute inset-0 grid grid-cols-6 pointer-events-none opacity-15">
                                {[...Array(6)].map((_, i) => (
                                  <div key={i} className="border-r border-white/20 h-full" />
                                ))}
                              </div>

                              {/* GANTT BAR TRACK */}
                              <div
                                style={{ 
                                  left: `${pos.leftPercent}%`, 
                                  width: `${pos.widthPercent}%` 
                                }}
                                className={`absolute h-8 rounded-xl bg-gradient-to-r ${barGradient} border shadow-lg transition-all flex items-center justify-between px-2.5 overflow-hidden group/bar z-10`}
                              >
                                {/* Left Shoot marker inside/alongside bar */}
                                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-white shrink-0 drop-shadow-sm">
                                  <Camera className="w-3 h-3 text-sky-200 shrink-0" />
                                  <span className="hidden sm:inline">
                                    {project.shootDate ? new Date(project.shootDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'Shoot'}
                                  </span>
                                </div>

                                {/* Center window duration */}
                                <div className="text-[10px] font-mono font-bold text-white/90 truncate px-1 text-center">
                                  <span>{pos.durationDays}d Post-Prod</span>
                                  {milestones.length > 0 && (
                                    <span className="ml-1 text-[9px] bg-black/40 px-1 py-0.2 rounded text-gold-300">
                                      {completedCount}/{milestones.length}
                                    </span>
                                  )}
                                </div>

                                {/* Right Deadline info */}
                                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-white shrink-0 drop-shadow-sm">
                                  <Flag className={`w-3 h-3 shrink-0 ${pos.isOverdue ? 'text-rose-200' : 'text-gold-200'}`} />
                                  <span className="hidden md:inline">
                                    {pos.isOverdue 
                                      ? `${Math.abs(pos.daysRemaining)}d Late`
                                      : pos.daysRemaining === 0 
                                      ? 'Due Today' 
                                      : `${pos.daysRemaining}d Left`}
                                  </span>
                                </div>
                              </div>

                              {/* Deadline Countdown Pill for Overdue / Due Soon */}
                              {(pos.isOverdue || pos.isDueSoon) && project.status !== 'delivered' && project.status !== 'closed' && (
                                <div
                                  style={{ left: `min(94%, calc(${pos.leftPercent}% + ${pos.widthPercent}% + 8px))` }}
                                  className={`absolute hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold shadow-md z-20 pointer-events-none whitespace-nowrap ${
                                    pos.isOverdue
                                      ? 'bg-rose-500 text-white animate-pulse'
                                      : 'bg-amber-500 text-charcoal-950 font-black'
                                  }`}
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  <span>{pos.isOverdue ? `⚠️ ${Math.abs(pos.daysRemaining)}d Overdue` : `⏰ Due in ${pos.daysRemaining}d`}</span>
                                </div>
                              )}

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB CONTENT: RECHARTS WORKLOAD & TURNAROUND */}
      {activeTab === 'recharts' && (
        <div className="p-6 rounded-3xl bg-charcoal-900/90 border border-white/10 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Post-Production Duration & Deadline Proximity
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Total turnaround days allocated (Shoot-to-Delivery) and days remaining to deadline for active wedding projects.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-gray-300">
                <div className="w-3 h-3 rounded bg-gold-500" />
                <span>Duration (Days)</span>
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span>Days Remaining</span>
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <div className="w-3 h-3 rounded bg-rose-500" />
                <span>Overdue (Negative)</span>
              </span>
            </div>
          </div>

          <SafeChartContainer height={340} minHeight={260}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
              <BarChart data={rechartsData} margin={{ top: 15, right: 15, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a303c" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 bg-charcoal-950 border border-gold-500/30 rounded-2xl shadow-2xl text-xs font-mono text-white space-y-1.5 max-w-xs">
                          <div className="font-bold text-gold-400 text-sm border-b border-white/10 pb-1 font-display">
                            {data.fullName}
                          </div>
                          <div className="text-gray-300 flex justify-between gap-4">
                            <span>Studio:</span>
                            <span className="text-white font-bold">{data.studio}</span>
                          </div>
                          <div className="text-gray-300 flex justify-between gap-4">
                            <span>Editor:</span>
                            <span className="text-emerald-400 font-bold">{data.editor}</span>
                          </div>
                          <div className="text-gray-300 flex justify-between gap-4">
                            <span>Shoot Date:</span>
                            <span className="text-sky-300">{data.shootDate}</span>
                          </div>
                          <div className="text-gray-300 flex justify-between gap-4">
                            <span>Delivery Deadline:</span>
                            <span className="text-amber-300">{data.deliveryDate}</span>
                          </div>
                          <div className="text-gray-300 flex justify-between gap-4 pt-1 border-t border-white/5">
                            <span>Schedule Window:</span>
                            <span className="text-gold-300 font-bold">{data.durationDays} Days</span>
                          </div>
                          <div className="text-gray-300 flex justify-between gap-4">
                            <span>Deadline Status:</span>
                            <span className={`font-bold ${data.isOverdue ? 'text-rose-400' : data.isDueSoon ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {data.isOverdue ? `${Math.abs(data.daysLeft)} Days Overdue` : `${data.daysLeft} Days Remaining`}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#e11d48" strokeWidth={1.5} />
                <Bar dataKey="durationDays" name="Turnaround Window (d)" fill="#d4af37" radius={[4, 4, 0, 0]} />
                <Bar dataKey="daysLeft" name="Days to Deadline" radius={[4, 4, 0, 0]}>
                  {rechartsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.daysLeft < 0 ? '#f43f5e' : entry.daysLeft <= 7 ? '#f59e0b' : '#10b981'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SafeChartContainer>
        </div>
      )}

      {/* 4. TAB CONTENT: DEADLINES MATRIX */}
      {activeTab === 'deadlines' && (
        <div className="space-y-4">
          {categorizedDeadlines.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.id} className="p-4 rounded-3xl bg-charcoal-900/90 border border-white/10 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      group.color === 'rose' 
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                        : group.color === 'amber'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : group.color === 'yellow'
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                        : 'bg-white/5 text-gray-300 border border-white/10'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                      {group.label}
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/5 text-gray-300 border border-white/10">
                    {group.list.length} Film(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {group.list.map((proj) => {
                    const daysLeft = proj.deliveryDate ? Math.ceil((new Date(proj.deliveryDate).getTime() - today.getTime()) / MS_PER_DAY) : 0;
                    const isOverdue = daysLeft < 0;

                    return (
                      <div
                        key={proj.id}
                        onClick={() => onSelectProject(proj)}
                        className="p-3.5 rounded-2xl bg-charcoal-950/80 border border-white/10 hover:border-gold-500/40 transition-all cursor-pointer space-y-2 hover:shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white truncate font-display">
                            {proj.coupleName}
                          </h4>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            isOverdue
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : daysLeft <= 7
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}>
                            {isOverdue ? `${Math.abs(daysLeft)}d Late` : daysLeft === 0 ? 'Today' : `${daysLeft}d Left`}
                          </span>
                        </div>

                        <div className="text-[11px] font-mono text-gray-400 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center text-gold-400/90 truncate">
                              <Building2 className="w-3 h-3 mr-1 shrink-0" />
                              <span className="truncate">{proj.studioName}</span>
                            </span>
                            <span className="text-gray-500 text-[10px]">{proj.eventType}</span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            <span className="flex items-center text-emerald-400">
                              <User className="w-3 h-3 mr-1 shrink-0" />
                              <span>{proj.assignedEditorName || 'Unassigned'}</span>
                            </span>
                            <span className="text-gray-300 font-bold">
                              Due: {proj.deliveryDate ? new Date(proj.deliveryDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'TBD'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                          <ProjectStatusBadge status={proj.status} size="xs" showIcon={false} />
                          <span className="text-gold-400 hover:underline flex items-center gap-0.5">
                            <span>Open Details</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

// Helper internal film icon
function FilmIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M3 7.5h4" />
      <path d="M3 12h18" />
      <path d="M3 16.5h4" />
      <path d="M17 3v18" />
      <path d="M17 7.5h4" />
      <path d="M17 16.5h4" />
    </svg>
  );
}

export default ProjectsTimelineGanttView;
