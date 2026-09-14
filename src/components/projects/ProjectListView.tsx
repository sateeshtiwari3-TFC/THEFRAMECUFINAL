import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Film, 
  Flame, 
  Eye, 
  FolderOpen, 
  Clock, 
  User, 
  IndianRupee, 
  Edit, 
  Trash2, 
  StickyNote, 
  MessageSquare, 
  Printer, 
  FileDown,
  Building2,
  AlertCircle,
  Activity,
  RotateCcw,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { Project, Studio, Editor, Revision, UserRole, ProjectStatus } from '../../types';
import { ProjectTagList } from '../ProjectTagBadge';
import ProjectStatusBadge, { WORKFLOW_STAGES } from '../ProjectStatusBadge';
import ProjectUrgencyBadge from './ProjectUrgencyBadge';
import NewBadge from '../common/NewBadge';
import { LazyImage } from '../common/LazyImage';

interface ProjectListViewProps {
  projects: Project[];
  studios: Studio[];
  editors: Editor[];
  revisions: Revision[];
  userRole: UserRole;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  deadlineFilter: string;
  setDeadlineFilter: (deadline: string) => void;
  searchQuery?: string;
  onSelectProject: (proj: Project) => void;
  onEditProject: (proj: Project, e: React.MouseEvent) => void;
  onDeleteProject: (id: string, e: React.MouseEvent) => void;
  onOpenQuickNote: (proj: Project) => void;
  onOpenWhatsAppShare: (proj: Project) => void;
  onOpenWorksheet: (proj: Project) => void;
  onOpenQuickPrintInvoice: (proj: Project) => void;
  onToggleTag: (projectId: string, tagId: string, e: React.MouseEvent) => void;
  onUpdateStatus: (projectId: string, status: ProjectStatus) => Promise<void>;
  onResetProject?: (proj: Project, e: React.MouseEvent) => void;
  setHoveredPhoto: (photo: { url: string; title: string; subtitle: string } | null) => void;
  onOpenQualityControl?: (proj: Project) => void;
}

const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600';

// Stagger animation variants for project list container & rows
const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02
    }
  }
};

const rowVariants = {
  hidden: { 
    opacity: 0, 
    y: 12, 
    scale: 0.985 
  },
  visible: (i: number = 0) => ({ 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 26,
      mass: 0.8,
      delay: Math.min(i * 0.035, 0.35)
    }
  }),
  exit: { 
    opacity: 0, 
    scale: 0.97, 
    y: -8, 
    transition: { duration: 0.15, ease: 'easeOut' } 
  }
};

export const ProjectListView: React.FC<ProjectListViewProps> = ({
  projects,
  studios,
  editors,
  revisions,
  userRole,
  statusFilter,
  setStatusFilter,
  deadlineFilter,
  setDeadlineFilter,
  searchQuery = '',
  onSelectProject,
  onEditProject,
  onDeleteProject,
  onOpenQuickNote,
  onOpenWhatsAppShare,
  onOpenWorksheet,
  onOpenQuickPrintInvoice,
  onToggleTag,
  onUpdateStatus,
  onResetProject,
  setHoveredPhoto,
  onOpenQualityControl
}) => {
  // Real-time breakdown counts
  const breakdown = React.useMemo(() => {
    let completed = 0;
    let editing = 0;
    let delayed = 0;
    let reviewRevision = 0;
    let pipeline = 0;

    const now = Date.now();

    projects.forEach((p) => {
      const isDeliveredOrClosed = ['delivered', 'closed'].includes(p.status);
      if (p.deliveryDate && !isDeliveredOrClosed) {
        const diffDays = Math.ceil((new Date(p.deliveryDate).getTime() - now) / (1000 * 3600 * 24));
        if (diffDays < 0) {
          delayed++;
          return;
        }
      }

      if (isDeliveredOrClosed) completed++;
      else if (p.status === 'editing') editing++;
      else if (p.status === 'review' || p.status === 'revision') reviewRevision++;
      else pipeline++;
    });

    return { completed, editing, delayed, reviewRevision, pipeline };
  }, [projects]);

  return (
    <div className="space-y-4">
      {/* Live Status Breakdown Bar */}
      <div className="p-3 sm:p-4 bg-charcoal-900/90 rounded-2xl border border-luxury-green-800/25 backdrop-blur-md flex items-center justify-between gap-3 flex-wrap shadow-md">
        <div className="flex items-center gap-2 text-xs text-gray-300 font-mono">
          <Activity className="w-4 h-4 text-gold-400" />
          <span className="font-bold text-gray-200">Pipeline Health:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          {/* Completed Pill */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'delivered' ? 'all' : 'delivered')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer ${
              statusFilter === 'delivered'
                ? 'bg-emerald-500 text-charcoal-950 border-emerald-400 font-black shadow-md'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Completed:</span>
            <span className="font-extrabold">{breakdown.completed}</span>
          </button>

          {/* Active Editing Pill */}
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'editing' ? 'all' : 'editing')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer ${
              statusFilter === 'editing'
                ? 'bg-amber-500 text-charcoal-950 border-amber-400 font-black shadow-md'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span>Editing:</span>
            <span className="font-extrabold">{breakdown.editing}</span>
          </button>

          {/* Delayed / Overdue Pill */}
          <button
            type="button"
            onClick={() => setDeadlineFilter(deadlineFilter === 'due_7_days' ? 'all' : 'due_7_days')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all cursor-pointer ${
              breakdown.delayed > 0
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.3)] font-bold'
                : 'bg-charcoal-950 text-gray-500 border-white/5'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${breakdown.delayed > 0 ? 'text-rose-400 animate-pulse' : 'text-gray-500'}`} />
            <span>Delayed:</span>
            <span className="font-extrabold">{breakdown.delayed}</span>
          </button>

          {/* Review / Revisions Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span>Review/Rev:</span>
            <span className="font-extrabold">{breakdown.reviewRevision}</span>
          </div>

          {/* Pipeline Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
            <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
            <span>Received:</span>
            <span className="font-extrabold">{breakdown.pipeline}</span>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="rounded-3xl bg-charcoal-900 border border-luxury-green-800/25 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-[1100px]">
            {/* Grid Header */}
            <div className="grid grid-cols-[minmax(220px,2fr)_minmax(130px,1fr)_minmax(140px,1.1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(180px,1.3fr)_minmax(110px,0.9fr)_minmax(150px,auto)] items-center px-6 py-4 bg-charcoal-950 border-b border-luxury-green-800/30 text-[11px] uppercase font-mono tracking-wider text-gray-400 select-none">
              <div>ID & Couple</div>
              <div>Studio Partner</div>
              <div>Tags & Deliverables</div>
              <div>Delivery Deadline</div>
              <div>Lead Editor</div>
              <div>Workflow Status</div>
              <div>{userRole === 'admin' ? 'Contract / Due' : 'Your Share'}</div>
              <div className="text-right pr-2">Actions</div>
            </div>

            {/* List Body with Staggered Entrance and Motion Layout Reordering */}
            <motion.div 
              key={`project-list-${statusFilter}-${deadlineFilter}-${searchQuery}-${projects.length}`}
              layout 
              variants={listContainerVariants}
              initial="hidden"
              animate="visible"
              className="divide-y divide-white/5 font-display"
              transition={{
                layout: { type: "spring", stiffness: 350, damping: 32 }
              }}
            >
              <AnimatePresence mode="popLayout" initial={true}>
                {projects.length === 0 ? (
                  <motion.div
                    key="empty-state"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    className="py-12 text-center text-gray-500 font-mono text-xs"
                  >
                    No matching wedding projects found in this filter view.
                  </motion.div>
                ) : (
                  projects.map((proj, index) => {
                    const stage = WORKFLOW_STAGES.find(s => s.id === proj.status) || WORKFLOW_STAGES[0];
                    const editor = editors.find(e => e.id === proj.assignedEditorId || e.name === proj.assignedEditorName);
                    const studio = studios.find(s => s.id === proj.studioId || s.name === proj.studioName);
                    
                    const amount = Number(proj.projectAmount) || 0;
                    const advance = Number(proj.advancePayment) || 0;
                    const pendingBalance = Math.max(0, amount - advance);

                    const now = Date.now();
                    const deliveryTime = proj.deliveryDate ? new Date(proj.deliveryDate).getTime() : null;
                    const remainingDays = deliveryTime ? Math.ceil((deliveryTime - now) / (1000 * 3600 * 24)) : null;
                    const isOverdue = remainingDays !== null && remainingDays < 0 && !['delivered', 'closed'].includes(proj.status);
                    const isUrgent = remainingDays !== null && remainingDays >= 0 && remainingDays <= 3 && !['delivered', 'closed'].includes(proj.status);

                    return (
                      <motion.div
                        key={proj.id}
                        layout="position"
                        custom={index}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={() => onSelectProject(proj)}
                        className="grid grid-cols-[minmax(220px,2fr)_minmax(130px,1fr)_minmax(140px,1.1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(180px,1.3fr)_minmax(110px,0.9fr)_minmax(150px,auto)] items-center px-6 py-3.5 hover:bg-charcoal-800/60 transition-colors cursor-pointer group"
                      >
                        {/* ID & Couple with Cover Photo */}
                        <div>
                          <div className="flex items-center space-x-3">
                            <LazyImage
                              src={proj.couplePhoto || DEFAULT_COVER_IMAGE}
                              fallbackSrc={DEFAULT_COVER_IMAGE}
                              alt=""
                              containerClassName="w-10 h-10 rounded-xl shrink-0 ring-1 ring-white/10 group-hover:ring-gold-500/60 transition-all"
                              className="w-full h-full object-cover cursor-zoom-in"
                              rootMargin="100px 0px"
                              onMouseEnter={() => setHoveredPhoto({
                                url: proj.couplePhoto || DEFAULT_COVER_IMAGE,
                                title: proj.coupleName,
                                subtitle: `${proj.projectName || 'Wedding Film'} • ${proj.eventType}`
                              })}
                              onMouseLeave={() => setHoveredPhoto(null)}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-gold-400 font-bold">{proj.id}</span>
                                {proj.priority === 'urgent' && (
                                  <span className="text-[9px] font-mono text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/30">URGENT</span>
                                )}
                              </div>
                              <span className="text-xs font-bold text-gray-100 group-hover:text-gold-300 transition-colors block truncate">
                                {proj.projectName || proj.coupleName}
                              </span>
                              {proj.projectName && (
                                <span className="text-[10px] text-gray-400 font-mono block truncate">{proj.coupleName}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Studio Partner */}
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                            <span className="truncate">{proj.studioName || studio?.name || 'Direct Client'}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <ProjectTagList
                            tags={proj.tags}
                            projectId={proj.id}
                            onToggleTag={(t, e) => onToggleTag(proj.id, t, e)}
                            showAddButton={false}
                            maxVisible={2}
                            size="xs"
                          />
                        </div>

                        {/* Deadline & Urgency Indicator */}
                        <div>
                          <div className="flex flex-col gap-1 items-start">
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
                            {proj.deliveryDate && (
                              <span className="text-[10px] font-mono text-gray-400">
                                {proj.deliveryDate}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Lead Editor */}
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-300">
                            <User className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                            <span className="truncate">{editor ? editor.name : (proj.assignedEditorName || 'Unassigned')}</span>
                          </div>
                        </div>

                        {/* Inline Workflow Status Dynamic Color Badge */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <ProjectStatusBadge
                            status={proj.status}
                            variant="interactive"
                            size="sm"
                            onStatusChange={(newStatus) => onUpdateStatus(proj.id, newStatus)}
                          />
                        </div>

                        {/* Financials */}
                        <div>
                          {userRole === 'admin' ? (
                            <div className="text-xs font-mono">
                              <span className="text-gray-200 font-bold block">₹{amount.toLocaleString('en-IN')}</span>
                              <span className={`text-[10px] ${pendingBalance > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400'}`}>
                                {pendingBalance > 0 ? `Due: ₹${pendingBalance.toLocaleString('en-IN')}` : 'Paid ✓'}
                              </span>
                              {amount > 0 && (() => {
                                const profit = amount - ((proj.editorPayment || 0) + (proj.otherExpenses || 0));
                                const margin = Math.round((profit / amount) * 100);
                                return (
                                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border block mt-0.5 w-fit ${
                                    margin >= 50 ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' : margin >= 25 ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' : 'text-rose-400 bg-rose-500/15 border-rose-500/30'
                                  }`}>
                                    Margin: {margin}%
                                  </span>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="text-xs font-mono text-gold-400 font-bold">
                              ₹{(proj.isSplitProject ? (proj.firstEditorShare || 0) : (proj.editorPayment || 0)).toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="text-right pr-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {onOpenQualityControl && (
                              <button
                                type="button"
                                onClick={() => onOpenQualityControl(proj)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  proj.qcStatus === 'passed'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                                    : 'bg-white/5 hover:bg-gold-500/20 text-gold-400 border-white/5 hover:border-gold-500/30'
                                }`}
                                title="SAP QM Quality Inspection"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => onOpenWhatsAppShare(proj)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all cursor-pointer"
                              title="WhatsApp Update"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenQuickNote(proj)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                proj.notes
                                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                                  : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
                              }`}
                              title="Quick Note"
                            >
                              <StickyNote className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onOpenQuickPrintInvoice(proj)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                              title="Quick Print Invoice"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => onEditProject(proj, e)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-gold-500/20 text-gray-400 hover:text-gold-400 transition-all cursor-pointer"
                              title="Edit Specifications"
                            >
                              <Edit className="w-3.5 h-3.5" />
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
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-sky-500/20 text-gray-400 hover:text-sky-400 transition-all cursor-pointer"
                              title="Reset Stage to Data Received"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>

                            {(userRole === 'admin' || userRole === 'editor') && (
                              <button
                                type="button"
                                onClick={(e) => onDeleteProject(proj.id, e)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all cursor-pointer"
                                title="Delete Project"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
