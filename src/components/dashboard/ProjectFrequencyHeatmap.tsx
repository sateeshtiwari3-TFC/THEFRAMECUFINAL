import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Flame, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Building2, 
  User, 
  Layers, 
  BarChart2, 
  Grid, 
  ChevronRight, 
  ArrowUpRight, 
  X, 
  Filter, 
  CheckCircle2, 
  Sparkles,
  Info,
  CalendarDays,
  Activity,
  ArrowRight,
  SlidersHorizontal,
  Film
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
  ReferenceLine
} from 'recharts';
import { SafeChartContainer } from '../common/SafeChartContainer';
import ProjectStatusBadge from '../ProjectStatusBadge';
import { Project, Studio, Editor, ProjectStatus } from '../../types';
import { MS_PER_DAY } from '../../utils';

interface ProjectFrequencyHeatmapProps {
  projects: Project[];
  studios?: Studio[];
  editors?: Editor[];
  onInspectProject?: (project: Project) => void;
  onNavigateTab?: (tab: string, subAction?: string) => void;
}

type DateMetric = 'deliveryDate' | 'shootDate' | 'createdAt';
type TimeRange = 'next12' | 'past12' | 'year2026' | 'all';
type ViewMode = 'heatmap' | 'chart';

interface WeekData {
  key: string;
  year: number;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  formattedRange: string;
  shortLabel: string;
  monthLabel: string;
  isCurrentWeek: boolean;
  isPast: boolean;
  projects: Project[];
  count: number;
  statusCounts: Partial<Record<ProjectStatus, number>>;
  activeCount: number;
}

// Helper to get ISO week number & start/end dates
function getWeekDetails(date: Date): { year: number; weekNumber: number; startDate: Date; endDate: Date } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / MS_PER_DAY) + 1) / 7);

  // Monday of this week
  const start = new Date(date);
  const day = start.getDay();
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  start.setDate(start.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  // Sunday of this week
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { year: d.getUTCFullYear(), weekNumber, startDate: start, endDate: end };
}

export const ProjectFrequencyHeatmap: React.FC<ProjectFrequencyHeatmapProps> = ({
  projects = [],
  studios = [],
  editors = [],
  onInspectProject,
  onNavigateTab
}) => {
  const [dateMetric, setDateMetric] = useState<DateMetric>('deliveryDate');
  const [timeRange, setTimeRange] = useState<TimeRange>('next12');
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [selectedStudioId, setSelectedStudioId] = useState<string>('all');
  const [selectedEditorId, setSelectedEditorId] = useState<string>('all');
  const [hideDelivered, setHideDelivered] = useState<boolean>(false);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);

  // Today reference
  const now = useMemo(() => new Date(), []);
  const currentWeekInfo = useMemo(() => getWeekDetails(now), [now]);
  const currentWeekKey = `${currentWeekInfo.year}-W${String(currentWeekInfo.weekNumber).padStart(2, '0')}`;

  // Filter projects by studio/editor/delivered
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (selectedStudioId !== 'all' && p.studioId !== selectedStudioId) return false;
      if (selectedEditorId !== 'all' && p.assignedEditorId !== selectedEditorId) return false;
      if (hideDelivered && (p.status === 'delivered' || p.status === 'closed')) return false;
      return true;
    });
  }, [projects, selectedStudioId, selectedEditorId, hideDelivered]);

  // Determine weeks range to generate
  const generatedWeeks = useMemo(() => {
    const weeksMap = new Map<string, WeekData>();
    let startOffset = 0;
    let totalWeeks = 12;

    if (timeRange === 'next12') {
      startOffset = -1; // 1 week back + next 11 weeks
      totalWeeks = 12;
    } else if (timeRange === 'past12') {
      startOffset = -11; // 12 weeks back
      totalWeeks = 12;
    } else if (timeRange === 'year2026') {
      // 52 weeks of 2026
      const firstMonday2026 = new Date(2026, 0, 5); // Jan 5, 2026 (Monday)
      const weeks: WeekData[] = [];
      for (let i = 0; i < 52; i++) {
        const wStart = new Date(firstMonday2026);
        wStart.setDate(firstMonday2026.getDate() + i * 7);
        const wInfo = getWeekDetails(wStart);
        const key = `${wInfo.year}-W${String(wInfo.weekNumber).padStart(2, '0')}`;
        const isCurrent = key === currentWeekKey;
        const isPast = wInfo.endDate < now;

        const monthLabel = wInfo.startDate.toLocaleDateString('en-IN', { month: 'short' });
        const shortLabel = `W${wInfo.weekNumber}`;
        const formattedRange = `${wInfo.startDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${wInfo.endDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;

        weeks.push({
          key,
          year: wInfo.year,
          weekNumber: wInfo.weekNumber,
          startDate: wInfo.startDate,
          endDate: wInfo.endDate,
          formattedRange,
          shortLabel,
          monthLabel,
          isCurrentWeek: isCurrent,
          isPast,
          projects: [],
          count: 0,
          statusCounts: {},
          activeCount: 0
        });
      }

      // Populate projects
      filteredProjects.forEach(p => {
        let targetDateStr = p.deliveryDate;
        if (dateMetric === 'shootDate') targetDateStr = p.shootDate;
        else if (dateMetric === 'createdAt') targetDateStr = p.createdAt;

        if (!targetDateStr) return;
        const pDate = new Date(targetDateStr);
        if (isNaN(pDate.getTime())) return;

        const info = getWeekDetails(pDate);
        const pKey = `${info.year}-W${String(info.weekNumber).padStart(2, '0')}`;
        const found = weeks.find(w => w.key === pKey);
        if (found) {
          found.projects.push(p);
          found.count += 1;
          found.statusCounts[p.status] = (found.statusCounts[p.status] || 0) + 1;
          if (p.status !== 'delivered' && p.status !== 'closed') {
            found.activeCount += 1;
          }
        }
      });

      return weeks;
    } else {
      // 'all': 26 weeks centered on current
      startOffset = -8;
      totalWeeks = 26;
    }

    // Default sequential week generator from startOffset
    const weeks: WeekData[] = [];
    const baseMonday = new Date(currentWeekInfo.startDate);

    for (let i = 0; i < totalWeeks; i++) {
      const wStart = new Date(baseMonday);
      wStart.setDate(baseMonday.getDate() + (startOffset + i) * 7);
      const wInfo = getWeekDetails(wStart);
      const key = `${wInfo.year}-W${String(wInfo.weekNumber).padStart(2, '0')}`;
      const isCurrent = key === currentWeekKey;
      const isPast = wInfo.endDate < now;

      const monthLabel = wInfo.startDate.toLocaleDateString('en-IN', { month: 'short' });
      const shortLabel = `W${wInfo.weekNumber}`;
      const formattedRange = `${wInfo.startDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${wInfo.endDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;

      weeks.push({
        key,
        year: wInfo.year,
        weekNumber: wInfo.weekNumber,
        startDate: wInfo.startDate,
        endDate: wInfo.endDate,
        formattedRange,
        shortLabel,
        monthLabel,
        isCurrentWeek: isCurrent,
        isPast,
        projects: [],
        count: 0,
        statusCounts: {},
        activeCount: 0
      });
    }

    // Populate projects
    filteredProjects.forEach(p => {
      let targetDateStr = p.deliveryDate;
      if (dateMetric === 'shootDate') targetDateStr = p.shootDate;
      else if (dateMetric === 'createdAt') targetDateStr = p.createdAt;

      if (!targetDateStr) return;
      const pDate = new Date(targetDateStr);
      if (isNaN(pDate.getTime())) return;

      const info = getWeekDetails(pDate);
      const pKey = `${info.year}-W${String(info.weekNumber).padStart(2, '0')}`;
      const found = weeks.find(w => w.key === pKey);
      if (found) {
        found.projects.push(p);
        found.count += 1;
        found.statusCounts[p.status] = (found.statusCounts[p.status] || 0) + 1;
        if (p.status !== 'delivered' && p.status !== 'closed') {
          found.activeCount += 1;
        }
      }
    });

    return weeks;
  }, [timeRange, currentWeekInfo, currentWeekKey, filteredProjects, dateMetric, now]);

  // Statistics across generated weeks
  const stats = useMemo(() => {
    let maxCount = 0;
    let peakWeek: WeekData | null = null;
    let totalProjectsAssigned = 0;
    let busyWeeksCount = 0; // >= 4 projects
    let overloadWeeksCount = 0; // >= 6 projects

    generatedWeeks.forEach(w => {
      totalProjectsAssigned += w.count;
      if (w.count > maxCount) {
        maxCount = w.count;
        peakWeek = w;
      }
      if (w.count >= 4) busyWeeksCount++;
      if (w.count >= 6) overloadWeeksCount++;
    });

    const averagePerWeek = generatedWeeks.length > 0 
      ? (totalProjectsAssigned / generatedWeeks.length).toFixed(1)
      : '0';

    const currentWeekData = generatedWeeks.find(w => w.isCurrentWeek) || null;

    return {
      totalWeeks: generatedWeeks.length,
      totalProjectsAssigned,
      maxCount,
      peakWeek,
      busyWeeksCount,
      overloadWeeksCount,
      averagePerWeek,
      currentWeekData
    };
  }, [generatedWeeks]);

  // Currently selected week data for the inspector
  const selectedWeek = useMemo(() => {
    if (!selectedWeekKey) return null;
    return generatedWeeks.find(w => w.key === selectedWeekKey) || null;
  }, [selectedWeekKey, generatedWeeks]);

  // Recharts Bar Data
  const rechartsData = useMemo(() => {
    return generatedWeeks.map(w => ({
      name: w.shortLabel,
      fullRange: w.formattedRange,
      count: w.count,
      active: w.activeCount,
      isCurrent: w.isCurrentWeek,
      isPeak: w.count >= 6,
      isBusy: w.count >= 4 && w.count < 6
    }));
  }, [generatedWeeks]);

  // Intensity color mapper based on project frequency
  const getIntensityClasses = (count: number, isCurrentWeek: boolean) => {
    if (count === 0) {
      return isCurrentWeek 
        ? 'bg-charcoal-950/80 border-gold-500/40 text-gray-400' 
        : 'bg-charcoal-950/60 border-white/5 text-gray-500 hover:border-white/20';
    }
    if (count <= 2) {
      // Light load
      return 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300 hover:border-emerald-400/60 shadow-sm';
    }
    if (count <= 4) {
      // Moderate load
      return 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:border-amber-400/70 shadow-sm';
    }
    if (count <= 6) {
      // Heavy load
      return 'bg-orange-500/25 border-orange-500/60 text-orange-200 hover:border-orange-400 font-bold shadow-md shadow-orange-950/40';
    }
    // Peak / Overload
    return 'bg-gradient-to-br from-amber-600/60 to-rose-600/60 border-rose-400 text-white font-black shadow-lg shadow-rose-950/50';
  };

  return (
    <div id="project-frequency-heatmap" className="space-y-4">
      {/* 1. HEATMAP HEADER & EXECUTIVE METRICS */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-charcoal-900/95 via-charcoal-900/85 to-charcoal-950/95 border border-gold-500/20 shadow-2xl space-y-4">
        
        {/* Title & Actions Strip */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-500/20 via-amber-500/15 to-charcoal-950 border border-gold-500/40 flex items-center justify-center text-gold-400 shadow-lg shadow-black/50 shrink-0">
              <Flame className="w-6 h-6 text-gold-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-base sm:text-lg font-bold text-white font-display tracking-wide uppercase">
                  Project Frequency & Production Load Heatmap
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold-500/15 text-gold-300 border border-gold-500/30">
                  Weekly Capacity
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Weekly film distribution to pinpoint high-volume peaks, editor workload spikes, and delivery bottlenecks.
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {/* Current Week Load */}
            <div className="px-3 py-1.5 rounded-xl bg-charcoal-950 border border-white/10 text-gray-300 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gold-400" />
              <span>This Week: <strong className="text-white">{stats.currentWeekData ? stats.currentWeekData.count : 0}</strong> Films</span>
            </div>

            {/* Peak Week Badge */}
            {stats.peakWeek && stats.peakWeek.count > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Peak: <strong>{stats.peakWeek.shortLabel}</strong> ({stats.peakWeek.count} Films)</span>
              </div>
            )}

            {/* Overload Warning */}
            {stats.overloadWeeksCount > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span><strong>{stats.overloadWeeksCount}</strong> Peak Weeks (≥6)</span>
              </div>
            )}

            {/* Average Load */}
            <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 flex items-center gap-1.5">
              <span>Avg: <strong className="text-gray-200">{stats.averagePerWeek}</strong> / wk</span>
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex items-center p-1 bg-charcoal-950 rounded-xl border border-white/10 ml-1">
              <button
                type="button"
                id="btn-viewmode-heatmap"
                onClick={() => setViewMode('heatmap')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  viewMode === 'heatmap'
                    ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-charcoal-950 font-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Matrix Heatmap View"
              >
                <Grid className="w-3 h-3" />
                <span>Heatmap</span>
              </button>

              <button
                type="button"
                id="btn-viewmode-chart"
                onClick={() => setViewMode('chart')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  viewMode === 'chart'
                    ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-charcoal-950 font-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Recharts Weekly Bar Chart"
              >
                <BarChart2 className="w-3 h-3" />
                <span>Bar Chart</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Date Metric Selector */}
            <div className="flex items-center gap-1 bg-charcoal-950 px-2.5 py-1.5 rounded-xl border border-white/10">
              <Calendar className="w-3.5 h-3.5 text-gold-400 mr-1" />
              <span className="text-gray-500 text-[10px] uppercase font-bold">Metric:</span>
              <select
                value={dateMetric}
                onChange={(e) => setDateMetric(e.target.value as DateMetric)}
                className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="deliveryDate" className="bg-charcoal-900">Delivery Deadline</option>
                <option value="shootDate" className="bg-charcoal-900">Shoot Event Date</option>
                <option value="createdAt" className="bg-charcoal-900">Booking / Ingest Date</option>
              </select>
            </div>

            {/* Time Horizon Selector */}
            <div className="flex items-center gap-1 bg-charcoal-950 px-2.5 py-1 rounded-xl border border-white/10">
              <span className="text-gray-500 text-[10px] uppercase font-bold">Horizon:</span>
              <div className="flex items-center space-x-1">
                {(['next12', 'past12', 'year2026', 'all'] as TimeRange[]).map((tr) => (
                  <button
                    key={tr}
                    type="button"
                    onClick={() => setTimeRange(tr)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      timeRange === tr
                        ? 'bg-gold-500 text-charcoal-950 font-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tr === 'next12' ? 'Next 12w' : tr === 'past12' ? 'Past 12w' : tr === 'year2026' ? '2026' : '6 Mos'}
                  </button>
                ))}
              </div>
            </div>

            {/* Studio Filter */}
            {studios.length > 0 && (
              <div className="flex items-center gap-1 bg-charcoal-950 px-2 py-1.5 rounded-xl border border-white/10">
                <Building2 className="w-3 h-3 text-gold-400" />
                <select
                  value={selectedStudioId}
                  onChange={(e) => setSelectedStudioId(e.target.value)}
                  className="bg-transparent text-gray-300 text-xs focus:outline-none cursor-pointer max-w-[120px] truncate"
                >
                  <option value="all" className="bg-charcoal-900">All Studios</option>
                  {studios.map(s => (
                    <option key={s.id} value={s.id} className="bg-charcoal-900">{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Editor Filter */}
            {editors.length > 0 && (
              <div className="flex items-center gap-1 bg-charcoal-950 px-2 py-1.5 rounded-xl border border-white/10">
                <User className="w-3 h-3 text-emerald-400" />
                <select
                  value={selectedEditorId}
                  onChange={(e) => setSelectedEditorId(e.target.value)}
                  className="bg-transparent text-gray-300 text-xs focus:outline-none cursor-pointer max-w-[120px] truncate"
                >
                  <option value="all" className="bg-charcoal-900">All Editors</option>
                  {editors.map(ed => (
                    <option key={ed.id} value={ed.id} className="bg-charcoal-900">{ed.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Hide Delivered toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white select-none">
            <input
              type="checkbox"
              checked={hideDelivered}
              onChange={(e) => setHideDelivered(e.target.checked)}
              className="rounded bg-charcoal-950 border-white/20 text-gold-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-[11px]">Hide Delivered</span>
          </label>
        </div>

        {/* Legend Scale */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-gray-400">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-[10px] uppercase font-bold">Load Scale:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-charcoal-950 border border-white/10" />
              <span>0 (None)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
              <span>1-2 (Calm)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/60" />
              <span>3-4 (Moderate)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-500/50 border border-orange-400" />
              <span>5-6 (Heavy)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-500 to-rose-600 border border-rose-400" />
              <span className="text-rose-300 font-bold">7+ (Peak Overload)</span>
            </div>
          </div>

          <div className="text-[10px] text-gray-500">
            *Click any week card to inspect all scheduled wedding films
          </div>
        </div>
      </div>

      {/* 2. OVERLOAD ADVISORY BANNER (IF ANY HIGH CAPACITY UPCOMING WEEKS) */}
      {stats.overloadWeeksCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/40 via-charcoal-900 to-charcoal-950 border border-rose-500/30 flex items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-xs font-mono">
              <div className="text-white font-bold">
                Capacity Alert: {stats.overloadWeeksCount} production week(s) exceed recommended load (≥6 films)
              </div>
              <div className="text-gray-400 text-[11px] mt-0.5">
                Consider reallocating upcoming deliverables or assigning secondary editors for workload balancing.
              </div>
            </div>
          </div>
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('projects', 'timeline')}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
            >
              <span>View Timeline</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* 3. HEATMAP MATRIX VIEW */}
      {viewMode === 'heatmap' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {generatedWeeks.map((week) => {
            const isSelected = selectedWeekKey === week.key;
            const intensityClass = getIntensityClasses(week.count, week.isCurrentWeek);
            const isPeak = week.count >= 6;
            const isHeavy = week.count >= 4 && week.count < 6;

            return (
              <div
                key={week.key}
                id={`heatmap-week-${week.key}`}
                onClick={() => setSelectedWeekKey(isSelected ? null : week.key)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col justify-between min-h-[110px] ${intensityClass} ${
                  isSelected ? 'ring-2 ring-gold-400 scale-[1.02] shadow-xl' : 'hover:scale-[1.01]'
                }`}
              >
                {/* Top: Week Label & Current Badge */}
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold font-mono uppercase tracking-wider">
                        {week.shortLabel}
                      </span>
                      {week.isCurrentWeek && (
                        <span className="px-1.5 py-0.2 rounded-full bg-gold-400 text-charcoal-950 text-[8px] font-black uppercase tracking-tight">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {week.formattedRange}
                    </div>
                  </div>

                  {/* Icon Indicator for Peak/Heavy */}
                  {isPeak ? (
                    <Flame className="w-4 h-4 text-rose-300 animate-pulse shrink-0" />
                  ) : isHeavy ? (
                    <Flame className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  ) : week.count > 0 ? (
                    <Film className="w-3.5 h-3.5 text-gray-400 opacity-60 group-hover:opacity-100 shrink-0" />
                  ) : null}
                </div>

                {/* Center: Count & Frequency Text */}
                <div className="my-2 flex items-baseline justify-between">
                  <div className="text-2xl font-black font-display tracking-tight">
                    {week.count}
                  </div>
                  <div className="text-[10px] font-mono opacity-80">
                    {week.count === 1 ? 'Film' : 'Films'}
                  </div>
                </div>

                {/* Bottom: Mini Status Dots or Active Breakdown */}
                <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                  {week.count > 0 ? (
                    <div className="flex items-center space-x-1">
                      {/* Show active count */}
                      <span className="text-gray-300 font-bold">
                        {week.activeCount} active
                      </span>
                      {week.count - week.activeCount > 0 && (
                        <span className="text-emerald-400 text-[9px]">
                          ({week.count - week.activeCount} done)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-500 text-[10px]">No deadlines</span>
                  )}

                  <ChevronRight className="w-3 h-3 text-gray-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. RECHARTS BAR CHART VIEW */}
      {viewMode === 'chart' && (
        <div className="p-6 rounded-3xl bg-charcoal-900/90 border border-white/10 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                Weekly Project Volume & Studio Capacity Trajectory
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Bars represent project count per week. Dashed line indicates safe studio capacity (5 films/week).
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-gray-300">
                <div className="w-3 h-3 rounded bg-emerald-500" />
                <span>Normal (&le;3)</span>
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>Busy (4-5)</span>
              </span>
              <span className="flex items-center gap-1.5 text-gray-300">
                <div className="w-3 h-3 rounded bg-rose-500" />
                <span>Peak (6+)</span>
              </span>
            </div>
          </div>

          <SafeChartContainer height={300} minHeight={240}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
              <BarChart data={rechartsData} margin={{ top: 15, right: 15, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a303c" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  interval={0}
                />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-3 bg-charcoal-950 border border-gold-500/30 rounded-2xl shadow-2xl text-xs font-mono text-white space-y-1.5">
                          <div className="font-bold text-gold-400 text-sm border-b border-white/10 pb-1">
                            {data.name} &bull; {data.fullRange}
                          </div>
                          <div className="text-gray-300 flex justify-between gap-4">
                            <span>Total Volume:</span>
                            <span className="text-white font-bold">{data.count} Films</span>
                          </div>
                          <div className="text-gray-300 flex justify-between gap-4">
                            <span>Active In Pipeline:</span>
                            <span className="text-amber-400 font-bold">{data.active} Films</span>
                          </div>
                          <div className="text-gray-300 flex justify-between gap-4">
                            <span>Status:</span>
                            <span className={`font-bold ${data.isPeak ? 'text-rose-400' : data.isBusy ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {data.isPeak ? 'Peak Overload' : data.isBusy ? 'High Volume' : 'Balanced'}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={5} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Capacity Limit (5/wk)', fill: '#f43f5e', fontSize: 10, position: 'top' }} />
                <Bar dataKey="count" name="Project Count" radius={[4, 4, 0, 0]}>
                  {rechartsData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.count >= 6 ? '#f43f5e' : entry.count >= 4 ? '#f59e0b' : '#10b981'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SafeChartContainer>
        </div>
      )}

      {/* 5. SELECTED WEEK EXPANDED INSPECTION PANEL */}
      <AnimatePresence>
        {selectedWeek && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 rounded-3xl bg-charcoal-900/95 border border-gold-500/30 shadow-2xl space-y-4"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gold-500/20 text-gold-400 border border-gold-500/40 flex items-center justify-center font-bold font-mono">
                  {selectedWeek.shortLabel}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white font-display">
                      Production Roster: {selectedWeek.formattedRange}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white/5 text-gold-400 border border-white/10">
                      {selectedWeek.count} Films Scheduled
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Projects categorized by {dateMetric === 'deliveryDate' ? 'Delivery Deadline' : dateMetric === 'shootDate' ? 'Shoot Date' : 'Booking Date'} for this week.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWeekKey(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Close Week Roster"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Projects List Grid */}
            {selectedWeek.projects.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-mono text-xs">
                No wedding projects found for {selectedWeek.formattedRange}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedWeek.projects.map((proj) => {
                  const targetDate = dateMetric === 'shootDate' 
                    ? proj.shootDate 
                    : dateMetric === 'createdAt' 
                    ? proj.createdAt 
                    : proj.deliveryDate;

                  return (
                    <div
                      key={proj.id}
                      onClick={() => onInspectProject && onInspectProject(proj)}
                      className="p-3.5 rounded-2xl bg-charcoal-950/80 border border-white/10 hover:border-gold-500/40 transition-all cursor-pointer space-y-2 hover:shadow-lg group"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white font-display truncate group-hover:text-gold-300 transition-colors">
                          {proj.coupleName}
                        </h4>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border uppercase shrink-0 ${
                          proj.priority === 'urgent'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : proj.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-white/5 text-gray-300 border-white/10'
                        }`}>
                          {proj.priority}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-gray-400 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center text-gold-400/90 truncate max-w-[140px]">
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
                            {targetDate ? new Date(targetDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : 'TBD'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                        <ProjectStatusBadge status={proj.status} size="xs" showIcon={false} />
                        <span className="text-gold-400 group-hover:underline flex items-center gap-0.5">
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ProjectFrequencyHeatmap;
