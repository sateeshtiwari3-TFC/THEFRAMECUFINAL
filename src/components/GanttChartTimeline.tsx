import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  User, 
  Building2, 
  Filter, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  Info,
  BarChart2,
  ListFilter,
  Eye,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ProjectStatusBadge from './ProjectStatusBadge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';
import { SafeChartContainer } from './common/SafeChartContainer';
import { Project, ProjectStatus, ProjectPriority } from '../types';
import { getPriorityConfig, MS_PER_DAY } from '../utils';

interface GanttChartTimelineProps {
  projects: Project[];
  onUpdateProject?: (id: string, updates: Partial<Project>) => Promise<void>;
  onSelectProject?: (projectId: string) => void;
}

export default function GanttChartTimeline({
  projects,
  onUpdateProject,
  onSelectProject
}: GanttChartTimelineProps) {
  const [viewMode, setViewMode] = useState<'gantt' | 'recharts' | 'overlap'>('gantt');
  const [timeHorizon, setTimeHorizon] = useState<'30days' | '90days' | 'all'>('90days');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  const [selectedDetailProject, setSelectedDetailProject] = useState<Project | null>(null);

  // Filter projects (Active or non-closed by default, or filtered by search/status)
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Exclude closed unless specifically selected
      if (selectedStatus === 'all' && p.status === 'closed') return false;
      if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;

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
  }, [projects, selectedStatus, searchQuery]);

  // Determine global timeline start and end dates
  const timelineDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let minDate = new Date(today);
    minDate.setDate(minDate.getDate() - 15); // 15 days in past

    let maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 75); // 75 days in future

    if (timeHorizon === '30days') {
      minDate = new Date(today);
      minDate.setDate(minDate.getDate() - 7);
      maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 30);
    } else if (timeHorizon === 'all') {
      // Find min and max from actual projects
      filteredProjects.forEach((p) => {
        const sDate = p.shootDate ? new Date(p.shootDate) : null;
        const dDate = p.deliveryDate ? new Date(p.deliveryDate) : null;
        if (sDate && !isNaN(sDate.getTime()) && sDate < minDate) minDate = new Date(sDate);
        if (dDate && !isNaN(dDate.getTime()) && dDate > maxDate) maxDate = new Date(dDate);
      });
    }

    const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / MS_PER_DAY));
    
    return { minDate, maxDate, totalDays, today };
  }, [filteredProjects, timeHorizon]);

  // Compute Overlapping Delivery & Editing Windows
  const overlaps = useMemo(() => {
    const map: { [key: string]: Project[] } = {};
    filteredProjects.forEach((p) => {
      if (!p.deliveryDate) return;
      const key = p.deliveryDate;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });

    const overlappingDates = Object.keys(map).filter((d) => map[d].length > 1);
    return overlappingDates.map((dateStr) => ({
      date: dateStr,
      projects: map[dateStr]
    }));
  }, [filteredProjects]);

  // Helper to calculate bar positioning for Gantt
  const getGanttPosition = React.useCallback((shootDateStr?: string, deliveryDateStr?: string) => {
    const { minDate, totalDays } = timelineDates;
    const shoot = shootDateStr ? new Date(shootDateStr) : new Date();
    const delivery = deliveryDateStr ? new Date(deliveryDateStr) : new Date(shoot.getTime() + 15 * MS_PER_DAY);

    const startDiffDays = (shoot.getTime() - minDate.getTime()) / MS_PER_DAY;
    const durationDays = Math.max(2, (delivery.getTime() - shoot.getTime()) / MS_PER_DAY);

    let leftPercent = (startDiffDays / totalDays) * 100;
    let widthPercent = (durationDays / totalDays) * 100;

    // Constrain percentages within 0-100% boundary
    if (leftPercent < 0) {
      widthPercent += leftPercent;
      leftPercent = 0;
    }
    if (leftPercent + widthPercent > 100) {
      widthPercent = 100 - leftPercent;
    }
    if (widthPercent < 2) widthPercent = 2; // Min width for visibility

    return {
      left: `${leftPercent.toFixed(2)}%`,
      width: `${widthPercent.toFixed(2)}%`,
      durationDays: Math.round(durationDays)
    };
  }, [timelineDates]);

  // Calculate Today marker position
  const todayPositionPercent = useMemo(() => {
    const { minDate, maxDate, totalDays, today } = timelineDates;
    if (today < minDate || today > maxDate) return null;
    const diffDays = (today.getTime() - minDate.getTime()) / MS_PER_DAY;
    return ((diffDays / totalDays) * 100).toFixed(2);
  }, [timelineDates]);

  // Recharts Gantt & Workload Data Preparation
  const rechartsData = useMemo(() => {
    return filteredProjects.map((p) => {
      const milestones = p.customMilestones || [];
      const completedCount = milestones.filter((m) => m.completed).length;
      const totalCount = milestones.length || 1;
      const progressPercent = Math.round((completedCount / totalCount) * 100);

      const shoot = p.shootDate ? new Date(p.shootDate) : new Date();
      const delivery = p.deliveryDate ? new Date(p.deliveryDate) : new Date();
      const duration = Math.max(1, Math.ceil((delivery.getTime() - shoot.getTime()) / MS_PER_DAY));

      return {
        name: p.coupleName.length > 16 ? p.coupleName.substring(0, 16) + '...' : p.coupleName,
        fullName: p.coupleName,
        studio: p.studioName,
        durationDays: duration,
        progress: progressPercent,
        completedMilestones: completedCount,
        totalMilestones: totalCount,
        priority: p.priority,
        status: p.status,
        projectAmount: Number(p.projectAmount) || 0,
        advancePayment: Number(p.advancePayment) || 0,
        remainingBalance: Number(p.remainingBalance) || 0
      };
    }).slice(0, 15);
  }, [filteredProjects]);

  // Priority color styling via shared utility
  const getPriorityBadge = (priority: ProjectPriority) => getPriorityConfig(priority);

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="glass-panel p-5 rounded-3xl border border-gold-500/20 bg-gradient-to-r from-charcoal-900/95 via-charcoal-900/80 to-charcoal-950/95 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-500/20 to-amber-600/20 border border-gold-500/40 flex items-center justify-center text-gold-400 font-bold shadow-lg gold-glow">
              <Calendar className="w-6 h-6 text-gold-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white font-display uppercase tracking-wide">
                  Active Wedding Gantt & Timeline Matrix
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold-500/15 text-gold-300 border border-gold-500/30">
                  {filteredProjects.length} Active Films
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Visual delivery schedules, overlapping editor workloads & custom milestone progress.
              </p>
            </div>
          </div>

          {/* VIEW SWITCHER & TIME HORIZON */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Buttons */}
            <div className="p-1 bg-charcoal-950/80 rounded-2xl border border-white/10 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setViewMode('gantt')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === 'gantt'
                    ? 'bg-gold-500 text-charcoal-950 shadow-md gold-glow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Gantt Chart</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('recharts')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === 'recharts'
                    ? 'bg-gold-500 text-charcoal-950 shadow-md gold-glow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Analytics Bar</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('overlap')}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === 'overlap'
                    ? 'bg-amber-500 text-charcoal-950 shadow-md gold-glow'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Overlaps ({overlaps.length})</span>
              </button>
            </div>

            {/* Time Horizon Selector */}
            <div className="p-1 bg-charcoal-950/80 rounded-2xl border border-white/10 flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setTimeHorizon('30days')}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  timeHorizon === '30days' ? 'bg-charcoal-800 text-gold-400 border border-gold-500/30' : 'text-gray-400 hover:text-white'
                }`}
              >
                30 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeHorizon('90days')}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  timeHorizon === '90days' ? 'bg-charcoal-800 text-gold-400 border border-gold-500/30' : 'text-gray-400 hover:text-white'
                }`}
              >
                90 Days
              </button>
              <button
                type="button"
                onClick={() => setTimeHorizon('all')}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  timeHorizon === 'all' ? 'bg-charcoal-800 text-gold-400 border border-gold-500/30' : 'text-gray-400 hover:text-white'
                }`}
              >
                Full Horizon
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH & STATUS FILTER ROW */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search couple, studio or editor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-charcoal-950/80 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/50 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white text-xs font-mono"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs font-mono">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider font-bold shrink-0">Filter Status:</span>
            {['all', 'assigned', 'editing', 'review', 'rendering', 'delivered'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition-all shrink-0 border cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-gold-500/20 text-gold-300 border-gold-500/40 shadow-sm'
                    : 'bg-charcoal-950/60 text-gray-400 border-white/5 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* OVERLAP WARNING BANNER */}
      {overlaps.length > 0 && viewMode !== 'overlap' && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-4 text-xs font-mono text-amber-300">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold uppercase text-amber-200">
                Timeline Overlap Warning Detected!
              </span>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                {overlaps.length} delivery date(s) have multiple active wedding projects due simultaneously.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('overlap')}
            className="px-3 py-1.5 rounded-xl bg-amber-500 text-charcoal-950 font-bold text-xs hover:bg-amber-400 transition-colors cursor-pointer shrink-0"
          >
            Inspect Overlaps
          </button>
        </div>
      )}

      {/* MAIN VIEW CONTENT */}
      {viewMode === 'gantt' && (
        <div className="glass-panel rounded-3xl border border-white/10 bg-charcoal-900/90 overflow-hidden shadow-2xl">
          {/* GANTT TIMELINE CONTAINER */}
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* TIMELINE HEADER AXIS */}
              <div className="grid grid-cols-12 bg-charcoal-950/90 border-b border-white/10 text-[10px] font-mono text-gray-400 uppercase py-3 px-4 sticky top-0 z-20">
                <div className="col-span-3 font-bold text-gold-400 tracking-wider">
                  Wedding Project / Details
                </div>
                <div className="col-span-9 relative flex justify-between items-center px-2">
                  <span>{timelineDates.minDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                  <span className="text-gray-500 font-bold uppercase tracking-widest">
                    Interactive Timeline Scale ({timelineDates.totalDays} Days)
                  </span>
                  <span>{timelineDates.maxDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>

                  {/* Today Marker Line Label */}
                  {todayPositionPercent && (
                    <div 
                      className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
                      style={{ left: `${todayPositionPercent}%` }}
                    >
                      <span className="bg-red-500 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-full shadow-md uppercase tracking-tighter -mt-1.5 z-10">
                        Today
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* PROJECT GANTT ROWS */}
              <div className="divide-y divide-white/5 relative">
                {/* Vertical Today Line through rows */}
                {todayPositionPercent && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500/40 border-r border-dashed border-red-500/80 pointer-events-none z-10"
                    style={{ left: `calc(25% + (75% * ${todayPositionPercent} / 100))` }}
                  />
                )}

                {filteredProjects.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 font-mono text-xs">
                    No active wedding films match the current filter criteria.
                  </div>
                ) : (
                  filteredProjects.map((project) => {
                    const pos = getGanttPosition(project.shootDate, project.deliveryDate);
                    const pColors = getPriorityBadge(project.priority);
                    const milestones = project.customMilestones || [];
                    const completedMilestones = milestones.filter(m => m.completed).length;
                    const isHovered = hoveredProjectId === project.id;

                    return (
                      <div
                        key={project.id}
                        onMouseEnter={() => setHoveredProjectId(project.id)}
                        onMouseLeave={() => setHoveredProjectId(null)}
                        className={`grid grid-cols-12 items-center py-3.5 px-4 transition-colors relative ${
                          isHovered ? 'bg-gold-500/[0.04]' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* LEFT COLUMN: Couple info */}
                        <div className="col-span-3 pr-3 space-y-1 z-10">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-bold text-white font-display truncate">
                              {project.coupleName}
                            </h4>
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase ${pColors.bg}`}>
                              {project.priority}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-gray-400">
                            <span className="flex items-center text-gold-300">
                              <Building2 className="w-3 h-3 mr-1" />
                              {project.studioName}
                            </span>
                            {project.assignedEditorName && (
                              <span className="flex items-center text-emerald-400">
                                <User className="w-3 h-3 mr-0.5" />
                                {project.assignedEditorName}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-[10px] font-mono pt-0.5">
                            <ProjectStatusBadge 
                              status={project.status} 
                              size="xs" 
                              showDot={true} 
                              showIcon={false}
                            />
                            <button
                              type="button"
                              onClick={() => setSelectedDetailProject(project)}
                              className="text-gray-400 hover:text-gold-400 transition-colors flex items-center cursor-pointer"
                              title="View Timeline Details"
                            >
                              <Eye className="w-3.5 h-3.5 mr-0.5" />
                              <span>Details</span>
                            </button>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: Gantt Bar Track */}
                        <div className="col-span-9 relative h-10 flex items-center px-2">
                          {/* Background Grid Lines */}
                          <div className="absolute inset-0 grid grid-cols-6 pointer-events-none opacity-20">
                            {[...Array(6)].map((_, i) => (
                              <div key={i} className="border-r border-white/20 h-full" />
                            ))}
                          </div>

                          {/* Interactive Timeline Bar */}
                          <div
                            style={{ left: pos.left, width: pos.width }}
                            onClick={() => setSelectedDetailProject(project)}
                            className={`absolute h-7 rounded-xl bg-gradient-to-r ${pColors.bar} p-0.5 shadow-lg border border-white/20 transition-all cursor-pointer hover:scale-[1.01] hover:brightness-110 flex items-center justify-between px-2.5 overflow-hidden group`}
                          >
                            <span className="text-[10px] font-mono font-bold text-slate-950 truncate drop-shadow-sm">
                              {project.eventType || 'Wedding Film'} ({pos.durationDays}d)
                            </span>

                            {/* Milestone Count pill if present */}
                            {milestones.length > 0 && (
                              <span className="text-[9px] font-mono font-bold bg-black/40 text-white px-1.5 py-0.5 rounded-full backdrop-blur-sm shrink-0 ml-1">
                                {completedMilestones}/{milestones.length} Step
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECHARTS ANALYTICS VIEW */}
      {viewMode === 'recharts' && (
        <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-charcoal-900/90 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Wedding Film Duration & Milestone Completion Matrix
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Bar metrics displaying total post-production schedule length (Days) & percentage completion.
              </p>
            </div>
          </div>

          <SafeChartContainer height={320} minHeight={260} className="pt-4">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={260}>
              <BarChart data={rechartsData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0b111a] border border-amber-500/40 p-3.5 rounded-2xl text-xs font-mono text-gray-200 shadow-2xl space-y-2 min-w-[220px] backdrop-blur-xl">
                          <div className="border-b border-white/10 pb-1.5 flex justify-between items-start">
                            <div>
                              <span className="font-bold text-white text-xs block font-display tracking-wide">{data.fullName || data.name}</span>
                              <span className="text-[10px] text-amber-400 font-mono">{data.studio}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${
                              data.priority === 'urgent' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                              data.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                              'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}>
                              {data.priority}
                            </span>
                          </div>
                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex justify-between items-center text-amber-300">
                              <span>Post-Production Span:</span>
                              <span className="font-bold">{data.durationDays} Days</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-400">
                              <span>Milestone Completion:</span>
                              <span className="font-bold">{data.progress}% ({data.completedMilestones}/{data.totalMilestones} Steps)</span>
                            </div>
                            {data.projectAmount > 0 && (
                              <div className="flex justify-between items-center text-gray-300 pt-1 border-t border-white/5 text-[10px]">
                                <span>Contract Value:</span>
                                <span className="font-bold text-emerald-400">₹{Number(data.projectAmount).toLocaleString('en-IN')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="durationDays" name="Editing Days Span" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                  {rechartsData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.priority === 'urgent' ? '#ef4444' : entry.priority === 'high' ? '#f59e0b' : '#38bdf8'}
                    />
                  ))}
                </Bar>
                <Bar dataKey="progress" name="Milestone Progress (%)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SafeChartContainer>
        </div>
      )}

      {/* OVERLAPS INSPECTION VIEW */}
      {viewMode === 'overlap' && (
        <div className="glass-panel p-6 rounded-3xl border border-amber-500/20 bg-charcoal-900/90 space-y-4 shadow-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">Overlapping Delivery Schedule Analysis</h3>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Dates where multiple wedding films share identical target delivery deadlines.
              </p>
            </div>
          </div>

          {overlaps.length === 0 ? (
            <div className="p-8 text-center text-emerald-400 font-mono text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
              ✨ No target delivery overlaps detected! Workload distribution is well spread out.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {overlaps.map((overlapItem, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-charcoal-800/80 border border-amber-500/30 rounded-2xl space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center">
                      <Calendar className="w-4 h-4 mr-1.5" />
                      Target Delivery Date: {overlapItem.date}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                      {overlapItem.projects.length} Overlapping Films
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {overlapItem.projects.map((proj) => (
                      <div
                        key={proj.id}
                        onClick={() => setSelectedDetailProject(proj)}
                        className="p-3 bg-charcoal-900/90 border border-white/10 rounded-xl hover:border-gold-500/40 transition-colors cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white font-display truncate">
                            {proj.coupleName}
                          </h4>
                          <span className="text-[9px] font-mono uppercase text-gold-400 font-bold">
                            {proj.priority}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 flex items-center justify-between">
                          <span>Studio: {proj.studioName}</span>
                          <span className="text-emerald-400">Ed: {proj.assignedEditorName || 'Unassigned'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PROJECT TIMELINE & MILESTONE DETAIL MODAL */}
      <AnimatePresence>
        {selectedDetailProject && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-charcoal-900 border border-gold-500/30 rounded-3xl w-full max-w-xl p-6 space-y-5 shadow-2xl relative"
            >
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gold-400 block">
                    {selectedDetailProject.eventType || 'Wedding Film'} Timeline Breakdown
                  </span>
                  <h3 className="text-xl font-bold text-white font-display mt-0.5">
                    {selectedDetailProject.coupleName}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Studio: {selectedDetailProject.studioName} | Editor: {selectedDetailProject.assignedEditorName || 'Unassigned'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDetailProject(null)}
                  className="p-2 rounded-xl bg-charcoal-800 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  ×
                </button>
              </div>

              {/* DATES & STATUS GRID */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-charcoal-800/80 rounded-2xl border border-white/5 text-xs font-mono">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block">Shoot / Event Date:</span>
                  <strong className="text-white">{selectedDetailProject.shootDate || 'Not Set'}</strong>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block">Target Delivery Deadline:</span>
                  <strong className="text-gold-300">{selectedDetailProject.deliveryDate || 'Not Set'}</strong>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block">Current Workflow Stage:</span>
                  <div className="mt-0.5">
                    <ProjectStatusBadge status={selectedDetailProject.status} size="xs" />
                  </div>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block">Priority Level:</span>
                  <strong className="text-amber-400 uppercase">{selectedDetailProject.priority}</strong>
                </div>
              </div>

              {/* CUSTOM MILESTONES CHECKLIST */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold uppercase text-gray-300 tracking-wider flex items-center justify-between">
                  <span>Workflow Milestones Checklist</span>
                  <span className="text-gold-400">
                    {(selectedDetailProject.customMilestones || []).filter(m => m.completed).length} / {(selectedDetailProject.customMilestones || []).length} Completed
                  </span>
                </h4>

                <div className="space-y-1.5 max-h-48 overflow-y-auto p-3 bg-charcoal-950/80 rounded-2xl border border-white/10 text-xs font-mono">
                  {(!selectedDetailProject.customMilestones || selectedDetailProject.customMilestones.length === 0) ? (
                    <div className="text-gray-500 italic text-[11px] py-2">
                      No custom milestones defined for this film. Apply a Project Blueprint Template in Registry to load milestones.
                    </div>
                  ) : (
                    selectedDetailProject.customMilestones.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-charcoal-900 border border-white/5 text-gray-200"
                      >
                        <span className={`text-xs ${m.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                          {m.label}
                        </span>
                        {m.completed ? (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center">
                            <Check className="w-3.5 h-3.5 mr-1" /> Done
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 font-bold">Pending</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    if (onSelectProject) onSelectProject(selectedDetailProject.id);
                    setSelectedDetailProject(null);
                  }}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-bold rounded-xl text-xs font-mono cursor-pointer"
                >
                  Open Full Project View
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDetailProject(null)}
                  className="px-4 py-2 bg-charcoal-800 hover:bg-charcoal-700 text-white rounded-xl text-xs font-mono cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
