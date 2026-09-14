import React from 'react';
import { 
  Clock, 
  User, 
  Calendar, 
  IndianRupee, 
  HardDrive, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Eye, 
  StickyNote, 
  Share2, 
  Printer, 
  FileDown, 
  MessageSquare, 
  Sparkles, 
  Flame, 
  Film,
  Building2,
  Layers,
  ChevronRight,
  FolderOpen,
  RotateCcw,
  ShieldCheck,
  Coins,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Studio, Editor, Revision, UserRole, ProjectStatus } from '../../types';
import { ProjectTagList } from '../ProjectTagBadge';
import SwipeableCard from '../SwipeableCard';
import ProjectStatusBadge, { WORKFLOW_STAGES } from '../ProjectStatusBadge';
import ProjectUrgencyBadge, { calculateUrgency } from './ProjectUrgencyBadge';
import NewBadge from '../common/NewBadge';
import { LazyImage } from '../common/LazyImage';

interface ProjectCardGridProps {
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
  onOpenWorksheet: (proj: Project) => void;
  onOpenQuickPrintInvoice: (proj: Project) => void;
  onToggleTag: (projectId: string, tagId: string, e: React.MouseEvent) => void;
  onUpdateStatus: (projectId: string, status: ProjectStatus) => Promise<void>;
  onResetProject?: (proj: Project, e: React.MouseEvent) => void;
  setHoveredPhoto: (photo: { url: string; title: string; subtitle: string } | null) => void;
  onOpenQualityControl?: (proj: Project) => void;
}

const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600';

const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02
    }
  }
};

const cardItemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 26,
      mass: 0.8,
      delay: Math.min(i * 0.03, 0.3)
    }
  }),
  exit: { opacity: 0, scale: 0.95, y: -10, transition: { duration: 0.15 } }
};

export const ProjectCardGrid: React.FC<ProjectCardGridProps> = ({
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
  onOpenWorksheet,
  onOpenQuickPrintInvoice,
  onToggleTag,
  onUpdateStatus,
  onResetProject,
  setHoveredPhoto,
  onOpenQualityControl
}) => {
  if (projects.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="py-20 text-center rounded-3xl bg-charcoal-900/30 border border-dashed border-luxury-green-800/20"
      >
        <FolderOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <h3 className="text-sm font-bold font-display text-gray-300">No matching wedding records found</h3>
        <p className="text-xs text-gray-500 font-mono mt-1">Try adjusting your search query, studio partner, or filter criteria.</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      layout 
      variants={gridContainerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
    >
      <AnimatePresence mode="popLayout">
        {projects.map((proj, index) => {
          const stage = WORKFLOW_STAGES.find(s => s.id === proj.status) || WORKFLOW_STAGES[0];
          const editor = editors.find(e => e.id === proj.assignedEditorId || e.name === proj.assignedEditorName);
          const studio = studios.find(s => s.id === proj.studioId || s.name === proj.studioName);
          
          const amount = Number(proj.projectAmount) || 0;
          const advance = Number(proj.advancePayment) || 0;
          const pendingBalance = Math.max(0, amount - advance);
          const percentPaid = amount > 0 ? Math.min(100, Math.round((advance / amount) * 100)) : 0;

          // Urgency and Delivery calculations
          const urgency = calculateUrgency(proj.deliveryDate, proj.status);
          const isOverdue = urgency.urgencyLevel === 'overdue';

          // Revision count
          const projectRevisions = revisions.filter(r => r.projectId === proj.id);
          const pendingRevs = projectRevisions.filter(r => r.status === 'pending');

          // Stage progress percentage
          const stageIndex = WORKFLOW_STAGES.findIndex(s => s.id === proj.status);
          const stageProgress = Math.round(((stageIndex + 1) / WORKFLOW_STAGES.length) * 100);

          return (
            <motion.div
              key={proj.id}
              layout="position"
              custom={index}
              variants={cardItemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="h-full project-card-item"
            >
              <SwipeableCard
                id={proj.id}
                layout={false}
                onSwipeLeft={(userRole === 'admin' || userRole === 'editor') ? () => onDeleteProject(proj.id, { stopPropagation: () => {} } as any) : undefined}
                onSwipeRight={async () => {
                  await onUpdateStatus(proj.id, 'closed');
                }}
                onTap={() => onSelectProject(proj)}
                className={`rounded-3xl bg-gradient-to-b from-charcoal-900 via-charcoal-900/95 to-charcoal-950 border relative overflow-hidden flex flex-col justify-between cursor-pointer group shadow-xl hover:shadow-2xl transition-all duration-300 ${
                  urgency.urgencyLevel === 'overdue'
                    ? 'border-rose-500/60 hover:border-rose-500/85 shadow-[0_0_20px_rgba(244,63,94,0.18)]' 
                    : urgency.urgencyLevel === 'due_today'
                    ? 'border-red-500/60 hover:border-red-500/85 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                    : urgency.urgencyLevel === 'critical'
                    ? 'border-amber-500/50 hover:border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : proj.priority === 'urgent'
                    ? 'border-rose-500/40 hover:border-rose-500/70'
                    : proj.priority === 'high'
                    ? 'border-amber-500/40 hover:border-amber-500/70'
                    : urgency.urgencyLevel === 'moderate'
                    ? 'border-yellow-500/30 hover:border-yellow-500/60'
                    : 'border-luxury-green-800/30 hover:border-gold-500/50'
                }`}
              >
                {/* Photo Top Cover Header with IntersectionObserver Lazy Loading */}
                <div className="h-44 relative overflow-hidden shrink-0">
                  <LazyImage
                    src={proj.couplePhoto || DEFAULT_COVER_IMAGE}
                    fallbackSrc={DEFAULT_COVER_IMAGE}
                    alt={proj.coupleName}
                    containerClassName="w-full h-full"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                    rootMargin="150px 0px"
                    onMouseEnter={() => setHoveredPhoto({
                      url: proj.couplePhoto || DEFAULT_COVER_IMAGE,
                      title: proj.coupleName,
                      subtitle: `${proj.projectName || 'Wedding Film'} • ${proj.eventType}`
                    })}
                    onMouseLeave={() => setHoveredPhoto(null)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/50 to-transparent pointer-events-none" />

                  {/* Top Badges Floating Over Image */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      <span className="px-2.5 py-1 rounded-xl bg-charcoal-950/90 text-gold-400 border border-gold-500/40 font-mono font-bold text-[10px] shadow-md">
                        {proj.id}
                      </span>
                      {proj.priority === 'urgent' && (
                        <span className="px-2 py-0.5 rounded-xl bg-rose-500/90 text-white font-mono font-bold text-[9px] uppercase shadow-md flex items-center gap-1">
                          <Flame className="w-2.5 h-2.5" /> Urgent
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      {(proj.referencePhotos && proj.referencePhotos.length > 0) && (
                        <span 
                          className="px-2 py-0.5 rounded-xl bg-charcoal-950/90 text-gold-300 border border-gold-500/40 text-[9px] font-mono font-bold flex items-center gap-1 shadow-md"
                          title={`${proj.referencePhotos.length} Reference Photo(s)`}
                        >
                          <Camera className="w-2.5 h-2.5 text-gold-400" />
                          <span>{proj.referencePhotos.length}</span>
                        </span>
                      )}
                      <ProjectStatusBadge
                        status={proj.status}
                        size="xs"
                        showDot={true}
                        showIcon={true}
                      />
                    </div>
                  </div>

                  {/* Bottom Studio & Event Type Overlay */}
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between pointer-events-none">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-gold-300 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-gold-400" />
                        {proj.studioName || studio?.name || 'Independent Client'}
                      </span>
                      <h3 className="text-base font-bold font-display text-white group-hover:text-gold-300 transition-colors drop-shadow-md truncate">
                        {proj.projectName || proj.coupleName}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Card Main Body */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3.5">
                  
                  {/* Couple Names & Shoot Date */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {proj.projectName && (
                        <p className="text-xs font-mono font-semibold text-gold-400/90">
                          {proj.coupleName}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-luxury-green-500" />
                          <span>Shot: {proj.shootDate || 'N/A'}</span>
                        </span>
                        <span>•</span>
                        <span>{proj.eventType}</span>
                      </div>
                    </div>

                    {/* Visual Urgency Indicator Badge */}
                    <div className="shrink-0 text-right flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <NewBadge releaseDate="2026-09-12" daysThreshold={10} size="xs" />
                      <ProjectUrgencyBadge
                        deliveryDate={proj.deliveryDate}
                        status={proj.status}
                        size="sm"
                        showDot={true}
                        showIcon={true}
                      />
                    </div>
                  </div>

                  {/* Project Tags & Deliverables */}
                  <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <ProjectTagList
                      tags={proj.tags}
                      projectId={proj.id}
                      onToggleTag={(t, e) => onToggleTag(proj.id, t, e)}
                      showAddButton={true}
                      maxVisible={3}
                      size="xs"
                    />
                  </div>

                  {/* Visual Workflow Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-gray-400">Workflow Stage</span>
                      <span className="text-gold-400 font-bold">{stageProgress}% Complete</span>
                    </div>
                    <div className="w-full bg-charcoal-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          stage.id === 'delivered' || stage.id === 'closed'
                            ? 'bg-emerald-400'
                            : 'bg-gradient-to-r from-gold-500 to-amber-400'
                        }`}
                        style={{ width: `${stageProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Editor Assignment & Storage */}
                  <div className="p-2.5 rounded-2xl bg-charcoal-950/60 border border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/30 flex items-center justify-center font-bold text-[10px]">
                        {editor ? editor.name.charAt(0) : 'U'}
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono block">Lead Editor</span>
                        <span className="text-[11px] font-semibold text-gray-200 truncate">
                          {editor ? editor.name : (proj.assignedEditorName || 'Unassigned')}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-gray-500 font-mono block">Storage</span>
                      <span className="text-[11px] font-mono text-gray-300 flex items-center gap-1 justify-end">
                        <HardDrive className="w-3 h-3 text-gold-400" />
                        <span>{proj.hardDriveNumber || 'Drive #--'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Financial Overview Progress & SAP FICO Profit Margin */}
                  {userRole === 'admin' && (
                    <div className="p-2.5 rounded-2xl bg-charcoal-950/80 border border-emerald-500/20 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-gray-400">Contract: ₹{amount.toLocaleString('en-IN')}</span>
                        <span className={pendingBalance > 0 ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {pendingBalance > 0 ? `Due: ₹${pendingBalance.toLocaleString('en-IN')}` : 'Paid in Full ✓'}
                        </span>
                      </div>
                      <div className="w-full bg-charcoal-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${percentPaid}%` }}
                        />
                      </div>

                      {/* SAP FICO Job Costing Margin */}
                      {amount > 0 && (
                        <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-gray-400 flex items-center gap-1">
                            <Coins className="w-3 h-3 text-gold-400" />
                            <span>Job Profit:</span>
                          </span>
                          {(() => {
                            const cost = (proj.editorPayment || 0) + (proj.otherExpenses || 0);
                            const profit = amount - cost;
                            const margin = Math.round((profit / amount) * 100);
                            return (
                              <span className={`font-bold px-1.5 py-0.5 rounded ${
                                margin >= 50 ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30' : margin >= 25 ? 'text-amber-400 bg-amber-500/15 border border-amber-500/30' : 'text-rose-400 bg-rose-500/15 border border-rose-500/30'
                              }`}>
                                ₹{profit.toLocaleString('en-IN')} ({margin}%)
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Revisions, QC & Quick Notes Indicators */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* SAP QM QC Status Indicator */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenQualityControl?.(proj);
                        }}
                        className={`px-2 py-0.5 rounded-md border flex items-center gap-1 font-mono text-[10px] font-bold cursor-pointer transition-all ${
                          proj.qcStatus === 'passed'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : proj.qcStatus === 'revision_needed'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                            : 'bg-gold-500/15 text-gold-300 border-gold-500/30 hover:bg-gold-500/25'
                        }`}
                        title="Open Quality Control Checklist"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{proj.qcStatus === 'passed' ? `QC Pass (${proj.qcScore || 6}/6)` : 'QC Check'}</span>
                      </button>

                      {projectRevisions.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          {projectRevisions.length} Rev ({pendingRevs.length})
                        </span>
                      )}
                      {proj.notes && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <StickyNote className="w-2.5 h-2.5" /> Note
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenWhatsAppShare(proj)}
                      className="text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                      title="Send WhatsApp status update"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                </div>

                {/* Card Action Footer */}
                <div 
                  className="p-3 bg-charcoal-950 border-t border-white/5 flex items-center justify-between gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1">
                    {onOpenQualityControl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenQualityControl(proj);
                        }}
                        className={`p-2 rounded-xl text-xs font-mono flex items-center gap-1 transition-all cursor-pointer ${
                          proj.qcStatus === 'passed'
                            ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
                            : 'bg-charcoal-900 hover:bg-gold-500/20 text-gold-400 border border-white/5 hover:border-gold-500/30'
                        }`}
                        title="SAP QM Quality Control Inspection"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenQuickNote(proj)}
                      className={`p-2 rounded-xl text-xs font-mono flex items-center gap-1 transition-all cursor-pointer ${
                        proj.notes
                          ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40'
                          : 'bg-charcoal-900 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
                      }`}
                      title="Add or View Quick Note"
                    >
                      <StickyNote className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenQuickPrintInvoice(proj)}
                      className="p-2 rounded-xl bg-charcoal-900 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all cursor-pointer"
                      title="Quick Print Minimalist Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenWorksheet(proj)}
                      className="p-2 rounded-xl bg-charcoal-900 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 transition-all cursor-pointer"
                      title="Print Branded Production Worksheet"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => onEditProject(proj, e)}
                      className="p-2 rounded-xl bg-charcoal-900 hover:bg-gold-500/20 text-gray-400 hover:text-gold-400 border border-white/5 hover:border-gold-500/30 transition-all cursor-pointer"
                      title="Edit Project Specifications"
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
                      className="p-2 rounded-xl bg-charcoal-900 hover:bg-sky-500/20 text-gray-400 hover:text-sky-400 border border-white/5 hover:border-sky-500/30 transition-all cursor-pointer"
                      title="Reset Stage to Data Received"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectProject(proj)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-luxury-green-800 to-luxury-green-900 hover:from-luxury-green-700 hover:to-luxury-green-800 text-gold-400 text-xs font-bold font-mono flex items-center gap-1 border border-gold-500/20 hover:border-gold-500/40 shadow-sm transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Specs</span>
                    </button>

                    {(userRole === 'admin' || userRole === 'editor') && (
                      <button
                        type="button"
                        onClick={(e) => onDeleteProject(proj.id, e)}
                        className="p-2 rounded-xl bg-charcoal-900 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 transition-all cursor-pointer"
                        title="Delete / Archive Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

              </SwipeableCard>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
};
