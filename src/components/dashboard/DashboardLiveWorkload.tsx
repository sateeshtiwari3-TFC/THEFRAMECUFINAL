import React, { useState, useMemo } from 'react';
import { 
  Film, 
  Clock, 
  User, 
  AlertCircle, 
  MessageSquare, 
  ArrowUpRight, 
  SlidersHorizontal,
  ChevronRight,
  Flame,
  CheckCircle2,
  Eye,
  LayoutGrid,
  List,
  IndianRupee,
  Building2,
  Calendar,
  ArrowUpDown,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Editor } from '../../types';
import { PRIORITY_ORDER, getPriorityConfig, getDaysRemaining, formatINR } from '../../utils';
import ProjectStatusBadge from './ProjectStatusBadge';
import NewBadge from '../common/NewBadge';

export type DashboardProjectSort = 'deadline' | 'priority' | 'amount_desc' | 'amount_asc';

interface DashboardLiveWorkloadProps {
  projects: Project[];
  editors: Editor[];
  onInspectProject: (project: Project) => void;
  onQuickAction: (tab: string, subAction?: string) => void;
  sortBy?: DashboardProjectSort;
  onSortChange?: (sort: DashboardProjectSort) => void;
}

export default function DashboardLiveWorkload({
  projects,
  editors,
  onInspectProject,
  onQuickAction,
  sortBy,
  onSortChange
}: DashboardLiveWorkloadProps) {
  const [filterStage, setFilterStage] = useState<'all' | 'data_received' | 'assigned' | 'editing' | 'revision' | 'review' | 'rendering' | 'urgent'>('all');
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('grid');
  const [internalSort, setInternalSort] = useState<DashboardProjectSort>('deadline');
  const [showAllCards, setShowAllCards] = useState(false);

  const currentSort = sortBy ?? internalSort;
  const handleSortChange = (newSort: DashboardProjectSort) => {
    if (onSortChange) {
      onSortChange(newSort);
    } else {
      setInternalSort(newSort);
    }
  };

  // Active / in-progress projects (excluding delivered / closed) sorted by administrator preference
  const activeWorkingProjects = useMemo(() => {
    return [...projects]
      .filter(p => p.status !== 'closed' && p.status !== 'delivered')
      .sort((a, b) => {
        if (currentSort === 'deadline') {
          // Nearest delivery date first (overdue < today < future < no deadline)
          const dateA = a.deliveryDate ? new Date(a.deliveryDate).getTime() : null;
          const dateB = b.deliveryDate ? new Date(b.deliveryDate).getTime() : null;

          if (dateA !== null && dateB !== null) {
            if (dateA !== dateB) return dateA - dateB;
          } else if (dateA !== null) {
            return -1; // Projects with deadline come before projects without
          } else if (dateB !== null) {
            return 1;
          }

          // Secondary tiebreaker: priority
          const rankA = PRIORITY_ORDER[a.priority || 'medium'] ?? 2;
          const rankB = PRIORITY_ORDER[b.priority || 'medium'] ?? 2;
          return rankA - rankB;
        }

        if (currentSort === 'priority') {
          // Urgent & High priority first
          const rankA = PRIORITY_ORDER[a.priority || 'medium'] ?? 2;
          const rankB = PRIORITY_ORDER[b.priority || 'medium'] ?? 2;
          if (rankA !== rankB) return rankA - rankB;

          // Secondary tiebreaker: nearest deadline
          const dateA = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 9999999999999;
          const dateB = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 9999999999999;
          return dateA - dateB;
        }

        if (currentSort === 'amount_desc') {
          // Highest project amount first
          const amtA = Number(a.projectAmount) || 0;
          const amtB = Number(b.projectAmount) || 0;
          if (amtB !== amtA) return amtB - amtA;

          // Secondary: nearest deadline
          const dateA = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 9999999999999;
          const dateB = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 9999999999999;
          return dateA - dateB;
        }

        if (currentSort === 'amount_asc') {
          // Lowest project amount first
          const amtA = Number(a.projectAmount) || 0;
          const amtB = Number(b.projectAmount) || 0;
          if (amtA !== amtB) return amtA - amtB;

          const dateA = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 9999999999999;
          const dateB = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 9999999999999;
          return dateA - dateB;
        }

        return 0;
      });
  }, [projects, currentSort]);

  const filteredProjects = useMemo(() => {
    if (filterStage === 'all') return activeWorkingProjects;
    if (filterStage === 'urgent') {
      return activeWorkingProjects.filter(p => p.priority === 'urgent' || p.priority === 'high');
    }
    return activeWorkingProjects.filter(p => p.status === filterStage);
  }, [activeWorkingProjects, filterStage]);

  const pingEditorWhatsApp = (e: React.MouseEvent, editor: Editor | undefined, project: Project) => {
    e.stopPropagation();
    if (!editor || !editor.phone) {
      alert('Editor phone number not registered.');
      return;
    }
    const cleanPhone = editor.phone.replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = encodeURIComponent(
      `*The Frame Cut Studio OS — Edit Pipeline Update*\n\nHi ${editor.name},\nRegarding wedding film *${project.coupleName}* (${project.eventType}):\nCurrent status: *${project.status.toUpperCase()}*.\nKindly update the latest timeline/render status.\n\nThank you!`
    );
    window.open(`https://wa.me/${targetPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0c2019] via-[#081813] to-[#040e0b] border border-luxury-green-700/50 p-6 md:p-8 shadow-2xl relative overflow-hidden space-y-6">
      
      {/* Background soft ambient */}
      <div className="absolute top-0 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Row & Live Pipeline Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10 relative z-10">
        
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl shadow-md">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono text-gold-400 uppercase tracking-widest font-bold block">
                Active Edit Suite • Chalu Kaam
              </span>
              <h3 className="text-xl font-serif italic text-white">
                Live Video Editing Pipeline
              </h3>
            </div>
          </div>
          <p className="text-xs text-gray-300 font-light max-w-xl">
            Real-time visual monitoring of wedding films currently on the timeline with dynamic status badges, editor loads, and delivery horizons.
          </p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Layout Switcher (Grid vs Table) */}
          <div className="flex items-center p-1 rounded-xl bg-black/60 border border-white/10 text-xs font-mono mr-1">
            <button
              onClick={() => setViewLayout('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                viewLayout === 'grid'
                  ? 'bg-gold-500 text-charcoal-950 font-bold shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Cards Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewLayout('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1 ${
                viewLayout === 'table'
                  ? 'bg-gold-500 text-charcoal-950 font-bold shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Dense Workload Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Production Sorting Dropdown with Red NEW badge */}
          <div className="flex items-center gap-1.5 bg-black/60 border border-gold-500/30 hover:border-gold-500/50 rounded-xl px-2.5 py-1.5 shadow-sm text-xs transition-colors">
            <ArrowUpDown className="w-3.5 h-3.5 text-gold-400 shrink-0" />
            <span className="text-[11px] font-mono text-gold-300 font-semibold hidden sm:inline">Sort:</span>
            <select
              id="dashboard-workload-sort"
              aria-label="Sort projects"
              value={currentSort}
              onChange={(e) => handleSortChange(e.target.value as DashboardProjectSort)}
              className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value="deadline" className="bg-charcoal-900 text-gray-100">⏳ Deadline (Nearest First)</option>
              <option value="priority" className="bg-charcoal-900 text-gray-100">⚡ Priority (Urgent First)</option>
              <option value="amount_desc" className="bg-charcoal-900 text-gray-100">💰 Project Amount (High to Low)</option>
              <option value="amount_asc" className="bg-charcoal-900 text-gray-100">📉 Project Amount (Low to High)</option>
            </select>
            <NewBadge releaseDate="2026-09-12" daysThreshold={10} size="xs" />
          </div>

          {/* Filter Chips */}
          <button
            onClick={() => setFilterStage('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              filterStage === 'all'
                ? 'bg-gold-500 text-charcoal-950 font-bold border-gold-400 shadow-md'
                : 'bg-black/40 text-gray-400 border-white/10 hover:text-white'
            }`}
          >
            All ({activeWorkingProjects.length})
          </button>

          <button
            onClick={() => setFilterStage('editing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              filterStage === 'editing'
                ? 'bg-amber-500 text-charcoal-950 font-bold border-amber-400 shadow-md'
                : 'bg-black/40 text-amber-300/80 border-amber-500/30 hover:text-amber-200'
            }`}
          >
            Editing ({activeWorkingProjects.filter(p => p.status === 'editing').length})
          </button>

          <button
            onClick={() => setFilterStage('revision')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              filterStage === 'revision'
                ? 'bg-rose-500 text-white font-bold border-rose-400 shadow-md'
                : 'bg-black/40 text-rose-300/80 border-rose-500/30 hover:text-rose-200'
            }`}
          >
            Revision ({activeWorkingProjects.filter(p => p.status === 'revision').length})
          </button>

          <button
            onClick={() => setFilterStage('data_received')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              filterStage === 'data_received'
                ? 'bg-sky-500 text-white font-bold border-sky-400 shadow-md'
                : 'bg-black/40 text-sky-300/80 border-sky-500/30 hover:text-sky-200'
            }`}
          >
            Ingested ({activeWorkingProjects.filter(p => p.status === 'data_received').length})
          </button>

          <button
            onClick={() => setFilterStage('urgent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              filterStage === 'urgent'
                ? 'bg-rose-600 text-white font-bold border-rose-400 shadow-md animate-pulse'
                : 'bg-black/40 text-rose-400 border-rose-500/30 hover:bg-rose-950/40'
            }`}
          >
            🔥 Urgent ({activeWorkingProjects.filter(p => p.priority === 'urgent' || p.priority === 'high').length})
          </button>

          <button
            onClick={() => onQuickAction('projects')}
            className="text-xs text-gold-400 hover:text-gold-200 font-mono flex items-center space-x-1 pl-2 hover:underline cursor-pointer"
          >
            <span>Full Deck</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>

      {/* Main Content Area: Grid or Table */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-2xl bg-black/30 border border-white/5 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-80 animate-pulse" />
          <p className="text-sm font-semibold text-white font-display">
            {filterStage === 'all' ? 'All Wedding Films Delivered!' : `No projects matching "${filterStage}" stage`}
          </p>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            Your live timeline is fully cleared. You can onboard new wedding raw footage or switch view filters.
          </p>
          <button
            onClick={() => onQuickAction('projects', 'add_project')}
            className="mt-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-gold-500 to-amber-400 text-charcoal-950 font-bold text-xs shadow-lg cursor-pointer hover:scale-[1.02] transition-all inline-flex items-center space-x-1.5"
          >
            <span>+ Add Wedding Project</span>
          </button>
        </div>
      ) : viewLayout === 'table' ? (
        /* ================= 1. DENSE WORKLOAD TABLE VIEW ================= */
        <div className="relative z-10 overflow-x-auto custom-scrollbar rounded-2xl border border-white/10 bg-black/40 shadow-inner">
          <table className="w-full min-w-[720px] text-left text-xs font-mono text-gray-300">
            <thead className="bg-charcoal-950/90 text-[10px] text-gold-400 uppercase tracking-wider border-b border-white/10 sticky top-0">
              <tr>
                <th className="py-3 px-4">Wedding Film / Couple</th>
                <th className="py-3 px-3">Studio Partner</th>
                <th className="py-3 px-3">Live Status</th>
                <th className="py-3 px-3">Deadline Horizon</th>
                <th className="py-3 px-3">Assigned Editor</th>
                <th className="py-3 px-3 text-right">Contract & Advance</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProjects.slice(0, showAllCards ? undefined : 10).map((proj) => {
                const editor = editors.find(e => e.id === proj.assignedEditorId);
                const daysLeft = getDaysRemaining(proj.deliveryDate);
                const pConfig = getPriorityConfig(proj.priority);
                const projectAmt = Number(proj.projectAmount) || 0;
                const advanceAmt = Number(proj.advancePayment) || 0;
                const pendingAmt = Math.max(0, projectAmt - advanceAmt);

                return (
                  <tr
                    key={proj.id}
                    onClick={() => onInspectProject(proj)}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    {/* Couple Name & Priority */}
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-white group-hover:text-gold-300 transition-colors font-display text-sm">
                              {proj.coupleName || 'Cinematic Film'}
                            </span>
                            {proj.priority === 'urgent' && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold border border-rose-500/30 animate-pulse">
                                Urgent
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 block font-mono">
                            {proj.eventType || 'Wedding Highlight'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Studio */}
                    <td className="py-3 px-3 text-gray-300">
                      <div className="flex items-center space-x-1 truncate max-w-[140px]">
                        <Building2 className="w-3 h-3 text-gold-400/80 shrink-0" />
                        <span className="truncate">{proj.studioName || 'Direct Client'}</span>
                      </div>
                    </td>

                    {/* Dynamic Color-Coded Status Badge */}
                    <td className="py-3 px-3">
                      <ProjectStatusBadge 
                        status={proj.status} 
                        size="xs" 
                        showDot={true} 
                        showIcon={true}
                      />
                    </td>

                    {/* Deadline Countdown */}
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-lg border text-[10px] ${
                        daysLeft !== null && daysLeft <= 2
                          ? 'bg-rose-500/25 text-rose-200 border-rose-400/60 animate-pulse font-bold shadow-md shadow-rose-950/50 ring-1 ring-rose-500/30'
                          : daysLeft !== null && daysLeft <= 5
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                            : 'bg-black/30 text-gray-400 border-white/10'
                      }`}>
                        {daysLeft !== null && daysLeft <= 2 ? (
                          <span className="relative flex h-1.5 w-1.5 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-400"></span>
                          </span>
                        ) : (
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                        )}
                        <span>
                          {daysLeft === null
                            ? 'No Date'
                            : daysLeft < 0
                              ? `Overdue (${Math.abs(daysLeft)}d)`
                              : daysLeft === 0
                                ? 'Due Today'
                                : `${daysLeft}d remaining`}
                        </span>
                      </span>
                    </td>

                    {/* Editor Avatar & Name */}
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1.5 truncate max-w-[130px]">
                        <div className="w-5 h-5 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-300 text-[9px] font-bold shrink-0">
                          {editor?.name?.charAt(0) || proj.assignedEditorName?.charAt(0) || 'E'}
                        </div>
                        <span className="text-gray-200 truncate text-[11px]">
                          {editor?.name || proj.assignedEditorName || 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* Financial Progress */}
                    <td className="py-3 px-3 text-right">
                      <div className="space-y-0.5">
                        <span className="font-bold text-white text-xs block">
                          ₹{projectAmt.toLocaleString('en-IN')}
                        </span>
                        <span className={`text-[10px] block ${pendingAmt > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {pendingAmt > 0 ? `₹${pendingAmt.toLocaleString('en-IN')} Due` : 'Fully Paid'}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        {editor && (
                          <button
                            onClick={(e) => pingEditorWhatsApp(e, editor, proj)}
                            title="WhatsApp Editor"
                            className="p-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 transition-all cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => onInspectProject(proj)}
                          title="Inspect Project"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-gold-500/20 border border-white/10 hover:border-gold-500/40 text-gray-300 hover:text-gold-300 transition-all cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ================= 2. BENTO CARDS GRID VIEW ================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
          {filteredProjects.slice(0, showAllCards ? undefined : 8).map((proj, idx) => {
            const editor = editors.find(e => e.id === proj.assignedEditorId);
            const pConfig = getPriorityConfig(proj.priority);
            const daysLeft = getDaysRemaining(proj.deliveryDate);

            return (
              <motion.div
                key={proj.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.03 }}
                onClick={() => onInspectProject(proj)}
                className={`group relative rounded-3xl bg-gradient-to-br ${pConfig.glow} border ${pConfig.border} p-5 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between space-y-4`}
              >
                {/* Top Row: Event Type, Amount & Priority Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-black/50 text-gold-300 border border-gold-500/30 uppercase font-semibold truncate">
                      {proj.eventType || 'Wedding Film'}
                    </span>
                    {Number(proj.projectAmount) > 0 && (
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border truncate ${
                        currentSort.startsWith('amount')
                          ? 'bg-gold-500/20 text-gold-300 border-gold-400/60 shadow-[0_0_8px_rgba(234,179,8,0.25)]'
                          : 'bg-black/40 text-gray-300 border-white/10'
                      }`}>
                        ₹{Number(proj.projectAmount).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                  
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold shrink-0 ${pConfig.badge}`}>
                    {pConfig.label}
                  </span>
                </div>

                {/* Mid: Couple Name & Studio */}
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-white font-display group-hover:text-gold-300 transition-colors line-clamp-1">
                    {proj.coupleName || 'Cinematic Film'}
                  </h4>
                  <p className="text-xs text-gray-300 flex items-center space-x-1.5 truncate">
                    <span className="text-gold-400 font-mono">🏢</span>
                    <span className="truncate">{proj.studioName || 'Direct Client'}</span>
                  </p>
                </div>

                {/* Metadata Pill Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px] font-mono min-w-0">
                  
                  {/* Dynamic Color-Coded Status Badge */}
                  <div className="flex items-center min-w-0">
                    <ProjectStatusBadge
                      status={proj.status}
                      size="xs"
                      showDot={true}
                      showIcon={true}
                      className="w-full justify-center"
                    />
                  </div>

                  {/* Deadline Countdown */}
                  <div className={`px-2.5 py-1 rounded-xl border flex items-center space-x-1.5 min-w-0 ${
                    daysLeft !== null && daysLeft <= 2
                      ? 'bg-rose-500/25 text-rose-200 border-rose-400/60 animate-pulse font-bold shadow-md shadow-rose-950/50 ring-1 ring-rose-500/30'
                      : daysLeft !== null && daysLeft <= 5
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                        : 'bg-black/40 text-gray-300 border-white/10'
                  }`}>
                    {daysLeft !== null && daysLeft <= 2 ? (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
                      </span>
                    ) : (
                      <Clock className="w-3 h-3 shrink-0 text-gold-400" />
                    )}
                    <span className="truncate min-w-0">
                      {daysLeft === null
                        ? 'No Date'
                        : daysLeft < 0
                          ? `Overdue (${Math.abs(daysLeft)}d)`
                          : daysLeft === 0
                            ? 'Due Today'
                            : `Due in ${daysLeft}d`}
                    </span>
                  </div>

                </div>

                {/* Bottom Row: Lead Editor & Quick Action Icons */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  
                  {/* Editor Info */}
                  <div className="flex items-center space-x-2 truncate">
                    <div className="w-6 h-6 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center text-gold-300 text-[10px] font-bold font-mono shrink-0">
                      {editor?.name?.charAt(0) || proj.assignedEditorName?.charAt(0) || 'E'}
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-semibold text-white truncate block">
                        {editor?.name || proj.assignedEditorName || 'Unassigned'}
                      </span>
                    </div>
                  </div>

                  {/* Action Icons */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    {editor && (
                      <button
                        onClick={(e) => pingEditorWhatsApp(e, editor, proj)}
                        title="WhatsApp Lead Editor"
                        className="p-1.5 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="p-1.5 rounded-xl bg-white/5 group-hover:bg-gold-500/20 border border-white/10 group-hover:border-gold-500/40 text-gray-300 group-hover:text-gold-300 transition-all">
                      <Eye className="w-3.5 h-3.5" />
                    </div>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer Banner if more projects */}
      {filteredProjects.length > (viewLayout === 'table' ? 10 : 8) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setShowAllCards(!showAllCards)}
            className="px-4 py-2 rounded-2xl bg-charcoal-900/90 hover:bg-charcoal-800 border border-gold-500/40 text-gold-300 text-xs font-mono font-bold transition-all cursor-pointer inline-flex items-center space-x-1.5 shadow-md"
          >
            <span>{showAllCards ? `Show Top ${viewLayout === 'table' ? 10 : 8}` : `Show All ${filteredProjects.length} Cards`}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllCards ? 'rotate-180' : ''}`} />
          </button>

          <button
            onClick={() => onQuickAction('projects')}
            className="px-5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-mono transition-all cursor-pointer inline-flex items-center space-x-2 shadow-md"
          >
            <span>Open Projects Full Deck</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
}
