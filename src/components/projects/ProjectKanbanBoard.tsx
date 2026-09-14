import React, { useState } from 'react';
import { 
  Clock, 
  User, 
  ArrowLeft, 
  ArrowRight, 
  Edit, 
  StickyNote, 
  MessageSquare, 
  GripVertical,
  CheckCircle2,
  Sparkles,
  Search,
  Filter,
  Film,
  Building2,
  ArrowRightCircle,
  LayoutGrid,
  Columns,
  Layers,
  ChevronDown,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Studio, Editor, Revision, UserRole, ProjectStatus } from '../../types';
import ProjectUrgencyBadge, { calculateUrgency } from './ProjectUrgencyBadge';
import ProjectStatusBadge from '../ProjectStatusBadge';
import NewBadge from '../common/NewBadge';
import { LazyImage } from '../common/LazyImage';

interface ProjectKanbanBoardProps {
  projects: Project[];
  studios: Studio[];
  editors: Editor[];
  revisions: Revision[];
  userRole: UserRole;
  onSelectProject: (proj: Project) => void;
  onEditProject: (proj: Project, e: React.MouseEvent) => void;
  onDeleteProject: (id: string, e: React.MouseEvent) => void;
  onOpenQuickNote: (proj: Project) => void;
  onOpenWhatsAppShare: (proj: Project) => void;
  onUpdateStatus: (projectId: string, status: ProjectStatus) => Promise<void>;
  onResetProject?: (proj: Project, e: React.MouseEvent) => void;
  setHoveredPhoto: (photo: { url: string; title: string; subtitle: string } | null) => void;
}

// 3-Stage Core Quick-Update Workflow definition
interface KanbanColumnConfig {
  id: ProjectStatus;
  label: string;
  subLabel: string;
  dotColor: string;
  headerBg: string;
  borderColor: string;
  accentColor: string;
  statusMatcher: (status: ProjectStatus) => boolean;
}

const COMPACT_3_STAGES: KanbanColumnConfig[] = [
  { 
    id: 'data_received', 
    label: 'Data Received', 
    subLabel: 'Raw Footage & Prep',
    dotColor: 'bg-sky-400', 
    headerBg: 'from-sky-950/60 via-charcoal-900 to-charcoal-900', 
    borderColor: 'border-sky-500/30',
    accentColor: 'text-sky-400',
    statusMatcher: (status) => status === 'data_received' || status === 'assigned'
  },
  { 
    id: 'editing', 
    label: 'Editing', 
    subLabel: 'Cuts, Color & Sound',
    dotColor: 'bg-amber-400', 
    headerBg: 'from-amber-950/60 via-charcoal-900 to-charcoal-900', 
    borderColor: 'border-amber-500/30',
    accentColor: 'text-amber-400',
    statusMatcher: (status) => status === 'editing'
  },
  { 
    id: 'review', 
    label: 'Final Review', 
    subLabel: 'Studio & Client QC',
    dotColor: 'bg-purple-400', 
    headerBg: 'from-purple-950/60 via-charcoal-900 to-charcoal-900', 
    borderColor: 'border-purple-500/30',
    accentColor: 'text-purple-400',
    statusMatcher: (status) => status === 'review' || status === 'revision' || status === 'rendering'
  }
];

// Full 8-Stage Granular Pipeline
const FULL_STAGES: KanbanColumnConfig[] = [
  { id: 'data_received', label: 'Data Received', subLabel: 'Raw Ingest', dotColor: 'bg-sky-400', headerBg: 'from-sky-950/40 to-charcoal-900', borderColor: 'border-sky-500/30', accentColor: 'text-sky-400', statusMatcher: (s) => s === 'data_received' },
  { id: 'assigned', label: 'Assigned', subLabel: 'Editor Allocated', dotColor: 'bg-indigo-400', headerBg: 'from-indigo-950/40 to-charcoal-900', borderColor: 'border-indigo-500/30', accentColor: 'text-indigo-400', statusMatcher: (s) => s === 'assigned' },
  { id: 'editing', label: 'Active Editing', subLabel: 'Cutting in Progress', dotColor: 'bg-amber-400', headerBg: 'from-amber-950/40 to-charcoal-900', borderColor: 'border-amber-500/30', accentColor: 'text-amber-400', statusMatcher: (s) => s === 'editing' },
  { id: 'review', label: 'Client Review', subLabel: 'Draft Preview', dotColor: 'bg-purple-400', headerBg: 'from-purple-950/40 to-charcoal-900', borderColor: 'border-purple-500/30', accentColor: 'text-purple-400', statusMatcher: (s) => s === 'review' },
  { id: 'revision', label: 'Revisions', subLabel: 'Client Fixes', dotColor: 'bg-rose-400', headerBg: 'from-rose-950/40 to-charcoal-900', borderColor: 'border-rose-500/30', accentColor: 'text-rose-400', statusMatcher: (s) => s === 'revision' },
  { id: 'rendering', label: 'Rendering', subLabel: 'Master Export', dotColor: 'bg-teal-400', headerBg: 'from-teal-950/40 to-charcoal-900', borderColor: 'border-teal-500/30', accentColor: 'text-teal-400', statusMatcher: (s) => s === 'rendering' },
  { id: 'delivered', label: 'Delivered', subLabel: 'Dispatched', dotColor: 'bg-emerald-400', headerBg: 'from-emerald-950/40 to-charcoal-900', borderColor: 'border-emerald-500/30', accentColor: 'text-emerald-400', statusMatcher: (s) => s === 'delivered' },
  { id: 'closed', label: 'Closed', subLabel: 'Archived', dotColor: 'bg-slate-400', headerBg: 'from-slate-900 to-charcoal-900', borderColor: 'border-slate-700', accentColor: 'text-slate-400', statusMatcher: (s) => s === 'closed' }
];

const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600';

export const ProjectKanbanBoard: React.FC<ProjectKanbanBoardProps> = ({
  projects,
  studios,
  editors,
  revisions,
  userRole,
  onSelectProject,
  onEditProject,
  onDeleteProject,
  onOpenQuickNote,
  onOpenWhatsAppShare,
  onUpdateStatus,
  onResetProject,
  setHoveredPhoto
}) => {
  // Mode: Compact 3-stage core workflow vs 8-stage full pipeline
  const [boardMode, setBoardMode] = useState<'compact3' | 'full8'>('compact3');
  
  // Card density
  const [cardDensity, setCardDensity] = useState<'compact' | 'comfortable'>('compact');

  // Drag and Drop States
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  const activeColumns = boardMode === 'compact3' ? COMPACT_3_STAGES : FULL_STAGES;

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, proj: Project) => {
    e.dataTransfer.setData('text/plain', proj.id);
    e.dataTransfer.setData('application/json', JSON.stringify({ id: proj.id, currentStatus: proj.status }));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedProjectId(proj.id);
  };

  // Handle Drag End
  const handleDragEnd = () => {
    setDraggedProjectId(null);
    setDragOverColumnId(null);
  };

  // Handle Drag Over Column
  const handleDragOverColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  // Handle Drag Leave Column
  const handleDragLeaveColumn = (e: React.DragEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related && e.currentTarget.contains(related)) {
      return;
    }
    setDragOverColumnId(null);
  };

  // Handle Drop on Column
  const handleDropOnColumn = async (e: React.DragEvent, targetStatus: ProjectStatus) => {
    e.preventDefault();
    const projectId = e.dataTransfer.getData('text/plain') || draggedProjectId;
    setDragOverColumnId(null);
    setDraggedProjectId(null);

    if (!projectId) return;

    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    // In 3-stage mode, check if status changed according to the matcher
    if (proj.status === targetStatus) return;

    try {
      setIsUpdatingStatus(projectId);
      await onUpdateStatus(projectId, targetStatus);
    } catch (err) {
      console.error('Failed to move project status via drag and drop:', err);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  return (
    <div className="space-y-4 select-none">
      
      {/* Top Kanban Sub-Toolbar: Mode Switcher & Drag-and-Drop Instructions */}
      <div className="p-3 bg-charcoal-900/90 border border-luxury-green-800/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg">
        
        {/* Left: Workflow Selector */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-charcoal-950 rounded-xl border border-luxury-green-800/40">
            <button
              type="button"
              id="kanban-mode-compact3-btn"
              onClick={() => setBoardMode('compact3')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                boardMode === 'compact3'
                  ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-charcoal-950 shadow-md font-black'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Compact 3-Stage Flow</span>
            </button>

            <button
              type="button"
              id="kanban-mode-full8-btn"
              onClick={() => setBoardMode('full8')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                boardMode === 'full8'
                  ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-charcoal-950 shadow-md font-black'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Full Pipeline ({FULL_STAGES.length})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-gray-400 pl-2 border-l border-white/10">
            <GripVertical className="w-3.5 h-3.5 text-gold-400 animate-pulse" />
            <span>Drag cards across columns to update status instantly</span>
          </div>
        </div>

        {/* Right: Quick Delivery Tray & Card Density Toggle */}
        <div className="flex items-center gap-2">
          {/* Quick Mark as Delivered Dropzone Pill in 3-Stage mode */}
          {boardMode === 'compact3' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverColumnId('delivered');
              }}
              onDragLeave={() => setDragOverColumnId(null)}
              onDrop={(e) => handleDropOnColumn(e, 'delivered')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                dragOverColumnId === 'delivered'
                  ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-105'
                  : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/50'
              }`}
              title="Drag here to mark project as Delivered"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Drop to Deliver</span>
            </div>
          )}

          {/* Density Switcher */}
          <div className="inline-flex p-0.5 bg-charcoal-950 rounded-lg border border-white/5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setCardDensity('compact')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                cardDensity === 'compact' ? 'bg-white/15 text-gold-300 font-bold' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Compact
            </button>
            <button
              type="button"
              onClick={() => setCardDensity('comfortable')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                cardDensity === 'comfortable' ? 'bg-white/15 text-gold-300 font-bold' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>

      </div>

      {/* Main Kanban Columns Grid */}
      <div className={`grid gap-4 overflow-x-auto pb-6 pt-1 select-none custom-scrollbar ${
        boardMode === 'compact3' 
          ? 'grid-cols-1 md:grid-cols-3' 
          : 'flex min-w-max'
      }`}>
        {activeColumns.map((col) => {
          const colProjects = projects.filter(p => col.statusMatcher(p.status));
          const colTotalValue = colProjects.reduce((sum, p) => sum + (Number(p.projectAmount) || 0), 0);
          const isOver = dragOverColumnId === col.id;

          return (
            <div
              key={col.id}
              id={`kanban-col-${col.id}`}
              onDragOver={(e) => handleDragOverColumn(e, col.id)}
              onDragLeave={handleDragLeaveColumn}
              onDrop={(e) => handleDropOnColumn(e, col.id)}
              className={`rounded-3xl border flex flex-col transition-all duration-200 overflow-hidden shadow-xl ${
                boardMode === 'compact3' ? 'min-h-[580px]' : 'w-80 shrink-0 min-h-[640px]'
              } ${
                isOver 
                  ? 'bg-charcoal-900/90 border-2 border-dashed border-gold-400 ring-4 ring-gold-500/20 shadow-2xl scale-[1.01]' 
                  : 'bg-charcoal-900/60 border-luxury-green-800/30'
              }`}
            >
              {/* Column Header */}
              <div className={`p-3.5 sm:p-4 bg-gradient-to-r ${col.headerBg} border-b border-white/5 flex items-center justify-between shrink-0`}>
                <div className="flex items-center space-x-2.5">
                  <span className={`w-3 h-3 rounded-full ${col.dotColor} shadow-sm ring-2 ring-white/20`} />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold font-display text-white tracking-wide uppercase flex items-center gap-1.5">
                      {col.label}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-mono">{col.subLabel}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold bg-charcoal-950 px-2.5 py-0.5 rounded-full text-gold-400 border border-gold-500/30 shadow-inner">
                    {colProjects.length}
                  </span>
                </div>
              </div>

              {/* Stage Value Header Strip */}
              <div className="px-4 py-2 bg-charcoal-950/50 border-b border-white/5 flex items-center justify-between text-[11px] font-mono text-gray-400">
                <span>Pipeline Value:</span>
                <span className="text-emerald-400 font-bold">₹{colTotalValue.toLocaleString('en-IN')}</span>
              </div>

              {/* Drop target prompt when dragging */}
              {isOver && (
                <div className="mx-3 mt-3 p-3 rounded-2xl border-2 border-dashed border-gold-400/80 bg-gold-500/10 flex items-center justify-center gap-2 text-gold-300 font-mono text-xs font-bold animate-pulse">
                  <ArrowRightCircle className="w-4 h-4" />
                  <span>Drop to set as "{col.label}"</span>
                </div>
              )}

              {/* Card List Area */}
              <div className="flex-1 p-3 space-y-2.5 overflow-y-auto custom-scrollbar max-h-[calc(100vh-280px)] min-h-[220px]">
                <AnimatePresence mode="popLayout">
                  {colProjects.map((proj) => {
                    const editor = editors.find(e => e.id === proj.assignedEditorId || e.name === proj.assignedEditorName);
                    const studio = studios.find(s => s.id === proj.studioId || s.name === proj.studioName);

                    const urgency = calculateUrgency(proj.deliveryDate, proj.status);

                    const isBeingDragged = draggedProjectId === proj.id;
                    const isUpdating = isUpdatingStatus === proj.id;

                    return (
                      <motion.div
                        key={proj.id}
                        layout
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: isBeingDragged ? 0.4 : 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{
                          layout: { type: "spring", stiffness: 350, damping: 30 },
                          opacity: { duration: 0.18 },
                          scale: { duration: 0.18 }
                        }}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, proj)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onSelectProject(proj)}
                        className={`rounded-2xl border bg-charcoal-950/95 transition-all shadow-md group relative cursor-grab active:cursor-grabbing ${
                          isBeingDragged 
                            ? 'border-gold-400 ring-2 ring-gold-500/50 shadow-2xl opacity-50' 
                            : urgency.urgencyLevel === 'overdue'
                            ? 'border-rose-500/50 hover:border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                            : urgency.urgencyLevel === 'due_today'
                            ? 'border-red-500/50 hover:border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                            : urgency.urgencyLevel === 'critical'
                            ? 'border-amber-500/40 hover:border-amber-500/70'
                            : 'border-luxury-green-800/30 hover:border-gold-500/60 hover:shadow-lg'
                        } ${
                          cardDensity === 'compact' ? 'p-3 space-y-2' : 'p-3.5 space-y-2.5'
                        }`}
                      >
                        {/* Top ID & Drag Handle Bar */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span 
                              className="text-gray-500 hover:text-gold-400 cursor-grab active:cursor-grabbing p-0.5 -ml-1" 
                              title="Drag this card to change stage"
                            >
                              <GripVertical className="w-3.5 h-3.5 shrink-0" />
                            </span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-charcoal-900 text-gold-400 border border-white/5">
                              {proj.id}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono truncate">
                              {proj.studioName || studio?.name || 'Studio'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {proj.priority === 'urgent' && (
                              <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                URGENT
                              </span>
                            )}
                            {proj.priority === 'high' && (
                              <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                HIGH
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle Content: Couple & Thumbnail */}
                        <div className="flex items-start gap-2.5">
                          <LazyImage
                            src={proj.couplePhoto || DEFAULT_COVER_IMAGE}
                            fallbackSrc={DEFAULT_COVER_IMAGE}
                            alt=""
                            containerClassName="w-10 h-10 rounded-xl shrink-0 ring-1 ring-white/10 group-hover:ring-gold-500/50 transition-all"
                            className="w-full h-full object-cover cursor-zoom-in"
                            rootMargin="100px 0px"
                            onMouseEnter={() => setHoveredPhoto({
                              url: proj.couplePhoto || DEFAULT_COVER_IMAGE,
                              title: proj.coupleName,
                              subtitle: `${proj.projectName || 'Wedding Film'} • ${proj.eventType}`
                            })}
                            onMouseLeave={() => setHoveredPhoto(null)}
                          />
                          <div className="min-w-0 flex-1">
                            <h5 className="text-xs font-bold text-gray-100 group-hover:text-gold-300 transition-colors truncate font-display">
                              {proj.projectName || proj.coupleName}
                            </h5>
                            {proj.projectName && (
                              <p className="text-[10px] text-gold-400/80 font-mono truncate">{proj.coupleName}</p>
                            )}
                            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 mt-0.5">
                              <span className="text-gray-300 truncate">
                                {editor ? editor.name : (proj.assignedEditorName || 'Unassigned')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Row: Deadline + 1-Tap Quick Move Controls */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                          
                          {/* Urgency Indicator Badge */}
                          <div className="flex items-center gap-1">
                            <NewBadge releaseDate="2026-09-12" daysThreshold={10} size="xs" />
                            <ProjectUrgencyBadge
                              deliveryDate={proj.deliveryDate}
                              status={proj.status}
                              size="xs"
                              showDot={true}
                              showIcon={true}
                            />
                          </div>

                          {/* Status Badge with Interactive 1-Tap Stage Switcher */}
                          <div className="relative">
                            <ProjectStatusBadge
                              status={proj.status}
                              variant="interactive"
                              size="xs"
                              onStatusChange={(newStatus) => onUpdateStatus(proj.id, newStatus)}
                            />
                          </div>

                          {/* Quick Actions: WhatsApp, Note, Edit, Reset, Delete */}
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => onOpenWhatsAppShare(proj)}
                              className="p-1 rounded text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                              title="WhatsApp Update"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenQuickNote(proj)}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                proj.notes ? 'text-amber-300 bg-amber-500/20' : 'text-gray-400 hover:text-amber-300 hover:bg-amber-500/10'
                              }`}
                              title="Quick Note"
                            >
                              <StickyNote className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => onEditProject(proj, e)}
                              className="p-1 rounded text-gray-400 hover:text-gold-400 hover:bg-gold-500/10 transition-colors cursor-pointer"
                              title="Edit Project"
                            >
                              <Edit className="w-3 h-3" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onResetProject) {
                                  onResetProject(proj, e);
                                } else {
                                  onUpdateStatus(proj.id, 'data_received');
                                }
                              }}
                              className="p-1 rounded text-gray-400 hover:text-sky-400 hover:bg-sky-500/10 transition-colors cursor-pointer"
                              title="Reset Stage to Data Received"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>

                            {(userRole === 'admin' || userRole === 'editor') && (
                              <button
                                type="button"
                                onClick={(e) => onDeleteProject(proj.id, e)}
                                className="p-1 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete Film (Move to Recycle Bin)"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                        </div>

                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {colProjects.length === 0 && (
                  <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-white/10 text-gray-500 font-mono text-xs space-y-1">
                    <p className="font-bold text-gray-400">No films in {col.label}</p>
                    <p className="text-[10px] text-gray-600">Drag any project card here</p>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
