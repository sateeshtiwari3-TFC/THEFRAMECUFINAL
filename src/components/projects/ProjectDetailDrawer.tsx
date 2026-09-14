import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  FileDown, 
  Edit, 
  Trash2, 
  Clock, 
  Calendar, 
  Building2, 
  User, 
  IndianRupee, 
  HardDrive, 
  ExternalLink, 
  CheckCircle2, 
  StickyNote, 
  MessageSquare, 
  Plus, 
  Sparkles,
  Layers,
  Coins,
  ShieldCheck,
  Percent,
  History,
  Tag as TagIcon,
  Music,
  Share2,
  RotateCcw,
  Volume2,
  Palette,
  Film,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  Check,
  Camera
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Studio, Editor, Revision, UserRole, ProjectStatus, CalendarEvent, QcCheckItem } from '../../types';
import { ProjectTagList } from '../ProjectTagBadge';
import { DEFAULT_QC_ITEMS } from './ProjectQualityControlModal';
import { ProjectReferencePhotosGallery } from './ProjectReferencePhotosGallery';
import ProjectUrgencyBadge from './ProjectUrgencyBadge';
import ProjectStatusBadge, { WORKFLOW_STAGES } from '../ProjectStatusBadge';
import NewBadge from '../common/NewBadge';

interface ProjectDetailDrawerProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  studios: Studio[];
  editors: Editor[];
  revisions: Revision[];
  calendarEvents?: CalendarEvent[];
  userRole: UserRole;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onAddRevision: (rev: Omit<Revision, 'id' | 'createdAt'>) => Promise<void>;
  onResolveRevision: (revId: string) => Promise<void>;
  onEditSpecs: (project: Project) => void;
  onOpenQuickPrintInvoice: (project: Project) => void;
  onOpenWorksheet: (project: Project) => void;
  onOpenPdfExport: (project: Project) => void;
  onOpenWhatsAppShare: (project: Project) => void;
  onOpenQuickNote: (project: Project) => void;
  onToggleTag: (projectId: string, tagId: string, e: React.MouseEvent) => void;
  onOpenCreativeTool?: (mode: "soundtrack" | "captions", projectId: string) => void;
  onResetProject?: (project: Project) => void;
  onOpenQualityControl?: (project: Project) => void;
}

const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600';

export const ProjectDetailDrawer: React.FC<ProjectDetailDrawerProps> = ({
  project,
  isOpen,
  onClose,
  studios,
  editors,
  revisions,
  calendarEvents = [],
  userRole,
  onUpdateProject,
  onDeleteProject,
  onAddRevision,
  onResolveRevision,
  onEditSpecs,
  onOpenQuickPrintInvoice,
  onOpenWorksheet,
  onOpenPdfExport,
  onOpenWhatsAppShare,
  onOpenQuickNote,
  onToggleTag,
  onOpenCreativeTool,
  onResetProject,
  onOpenQualityControl
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'photos' | 'financials' | 'qc' | 'storage' | 'revisions' | 'notes'>('overview');
  const [newRevisionNote, setNewRevisionNote] = useState('');
  const [isSubmittingRev, setIsSubmittingRev] = useState(false);

  if (!isOpen || !project) return null;

  const studio = studios.find(s => s.id === project.studioId || s.name === project.studioName);
  const editor = editors.find(e => e.id === project.assignedEditorId || e.name === project.assignedEditorName);
  const projectRevisions = revisions.filter(r => r.projectId === project.id);

  const amount = Number(project.projectAmount) || 0;
  const advance = Number(project.advancePayment) || 0;
  const pendingBalance = Math.max(0, amount - advance);
  const editorPayment = Number(project.editorPayment) || 0;
  const otherExpenses = Number(project.otherExpenses) || 0;
  const totalCost = editorPayment + otherExpenses;
  const netProfit = amount - totalCost;
  const profitMarginPct = amount > 0 ? Math.round((netProfit / amount) * 100) : 0;

  // Delivery countdown
  const now = Date.now();
  const deliveryTime = project.deliveryDate ? new Date(project.deliveryDate).getTime() : null;
  const remainingDays = deliveryTime ? Math.ceil((deliveryTime - now) / (1000 * 3600 * 24)) : null;

  const handleCreateRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRevisionNote.trim() || isSubmittingRev) return;
    setIsSubmittingRev(true);
    try {
      await onAddRevision({
        projectId: project.id,
        notes: newRevisionNote.trim(),
        status: 'pending',
        revisionNumber: projectRevisions.length + 1
      });
      setNewRevisionNote('');
    } catch (err) {
      console.error('Failed to add revision:', err);
    } finally {
      setIsSubmittingRev(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="w-screen max-w-3xl bg-charcoal-900 border-l border-gold-500/20 shadow-2xl flex flex-col justify-between overflow-hidden"
        >
          {/* Top Banner with Image Header */}
          <div className="relative h-56 shrink-0 overflow-hidden">
            <img
              src={project.couplePhoto || DEFAULT_COVER_IMAGE}
              alt={project.coupleName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900 via-charcoal-900/60 to-black/40" />

            {/* Top Header Buttons */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-gray-300 hover:text-white text-xs font-mono border border-white/10 flex items-center gap-1 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenWhatsAppShare(project)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  title="WhatsApp Update"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenQuickPrintInvoice(project)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Quick Print Minimalist Invoice"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenWorksheet(project)}
                  className="px-3 py-1.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                  title="Print Branded Production Worksheet"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Worksheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('photos')}
                  className="px-3 py-1.5 rounded-xl bg-charcoal-900/90 hover:bg-charcoal-800 border border-gold-500/40 text-gold-300 hover:text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  title="Camera Reference Photos & Stills"
                >
                  <Camera className="w-3.5 h-3.5 text-gold-400" />
                  <span>{(project.referencePhotos || []).length} Ref Photos</span>
                </button>
              </div>
            </div>

            {/* Bottom Title & Specs */}
            <div className="absolute bottom-4 left-6 right-6">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-gold-500/20 text-gold-400 border border-gold-500/40 text-[10px] font-mono font-bold uppercase">
                  {project.id}
                </span>
                <span className="text-xs text-gold-300 font-mono font-semibold">
                  {project.studioName || studio?.name || 'Studio Partner'}
                </span>
                <ProjectStatusBadge
                  status={project.status}
                  size="xs"
                  showDot={true}
                  showIcon={true}
                />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white mt-1">
                {project.projectName || project.coupleName}
              </h2>
              {project.projectName && (
                <p className="text-xs text-gold-400 font-mono">{project.coupleName}</p>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6 border-b border-white/10 bg-charcoal-950/80 flex items-center gap-2 overflow-x-auto select-none shrink-0 custom-scrollbar">
            {[
              { id: 'overview', label: 'Overview & Specs', icon: Layers },
              { 
                id: 'photos', 
                label: `Reference Photos (${(project.referencePhotos || []).length})`, 
                icon: Camera,
                badge: (project.referencePhotos || []).length > 0 ? 'bg-gold-500/20 text-gold-300' : undefined 
              },
              { 
                id: 'qc', 
                label: project.qcStatus === 'passed' ? 'QC Passed ✓' : 'QC Inspection', 
                icon: ShieldCheck,
                badge: project.qcStatus === 'passed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gold-500/20 text-gold-300'
              },
              { id: 'financials', label: 'Financial Ledger & Profit', icon: Coins },
              { id: 'storage', label: 'Media & Drives', icon: HardDrive },
              { id: 'revisions', label: `Revisions (${projectRevisions.length})`, icon: History },
              { id: 'notes', label: 'Notes Log', icon: StickyNote }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-3 text-xs font-mono font-bold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-gold-500 text-gold-400 bg-gold-500/5'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.id === 'photos' && (
                    <NewBadge releaseDate="2026-09-12" daysThreshold={10} size="xs" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content Scrolling Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                
                {/* Workflow Status Selector */}
                <div className="p-4 rounded-2xl bg-charcoal-950 border border-luxury-green-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                  <div>
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block mb-1.5">Current Workflow Stage</span>
                    <ProjectStatusBadge
                      status={project.status}
                      size="md"
                      showDot={true}
                      showIcon={true}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-gray-400 hidden sm:inline">Change Stage:</span>
                    <select
                      value={project.status}
                      onChange={(e) => onUpdateProject(project.id, { status: e.target.value as ProjectStatus })}
                      className="bg-charcoal-900 border border-gold-500/30 px-3.5 py-2 rounded-xl text-xs text-gold-400 font-bold font-mono focus:outline-none cursor-pointer hover:border-gold-400 transition-colors"
                    >
                      {WORKFLOW_STAGES.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* AI Wedding Creative Assistance */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-charcoal-950 via-luxury-green-950/40 to-charcoal-950 border border-gold-500/20 space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-gold-400" />
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-display">
                        AI Wedding Creative Tools
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-gold-400/80 bg-gold-500/10 px-2 py-0.5 rounded-full border border-gold-500/20">
                      Gemini 3.8 Flash
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Generate curated music soundtracks matching this couple's wedding aesthetic, or 1-click generate viral Instagram Reels captions, hooks, and YouTube descriptions.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCreativeTool?.('soundtrack', project.id);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-charcoal-900 border border-luxury-green-800/30 hover:border-gold-500 text-gold-400 hover:text-gold-300 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm group"
                    >
                      <Music className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span>Suggest Soundtracks</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCreativeTool?.('captions', project.id);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-charcoal-900 border border-luxury-green-800/30 hover:border-gold-500 text-gold-400 hover:text-gold-300 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm group"
                    >
                      <Share2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span>Reels & Captions</span>
                    </button>
                  </div>
                </div>

                {/* Delivery Deadline & Countdown */}
                <div className="p-4 rounded-2xl bg-charcoal-950 border border-gold-500/30 space-y-3 shadow-md">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-gold-400" />
                      <span>Delivery Deadline & Presets</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <NewBadge releaseDate="2026-09-12" daysThreshold={10} size="xs" />
                      <ProjectUrgencyBadge
                        deliveryDate={project.deliveryDate}
                        status={project.status}
                        size="sm"
                        showDot={true}
                        showIcon={true}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Target Date</label>
                      <input
                        type="date"
                        value={project.deliveryDate || ''}
                        onChange={(e) => onUpdateProject(project.id, { deliveryDate: e.target.value })}
                        onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
                        className="w-full bg-charcoal-900 border border-gold-500/30 rounded-xl px-3 py-2 text-xs text-gold-300 font-mono focus:outline-none cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Quick Presets</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { label: '+7d', days: 7 },
                          { label: '+15d', days: 15 },
                          { label: '+30d', days: 30 },
                          { label: '+45d', days: 45 },
                        ].map((preset) => (
                          <button
                            key={preset.days}
                            type="button"
                            onClick={() => {
                              const baseDate = project.shootDate || new Date().toISOString().split('T')[0];
                              const target = new Date(new Date(baseDate).getTime() + preset.days * 24 * 3600 * 1000);
                              onUpdateProject(project.id, { deliveryDate: target.toISOString().split('T')[0] });
                            }}
                            className="px-2.5 py-1 bg-charcoal-900 hover:bg-gold-500/20 border border-gold-500/30 text-gold-400 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team & Partner Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-charcoal-950/70 border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-gray-500">Studio Partner</span>
                    <p className="text-sm font-bold text-white">{project.studioName || studio?.name || 'Direct'}</p>
                    <p className="text-xs text-gray-400 font-mono">{studio?.phone || studio?.email || 'Partner Studio'}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-charcoal-950/70 border border-white/5 space-y-1">
                    <span className="text-[10px] font-mono uppercase text-gray-500">Lead Editor</span>
                    <p className="text-sm font-bold text-white">{project.assignedEditorName || editor?.name || 'Unassigned'}</p>
                    <p className="text-xs text-gold-400 font-mono">Comp: ₹{editorPayment.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Tags & Deliverables */}
                <div className="p-4 rounded-2xl bg-charcoal-950/70 border border-white/5 space-y-3">
                  <span className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <TagIcon className="w-3.5 h-3.5 text-gold-400" />
                    <span>Project Tags & Labels</span>
                  </span>
                  <ProjectTagList
                    tags={project.tags}
                    projectId={project.id}
                    onToggleTag={(t, e) => onToggleTag(project.id, t, e)}
                    showAddButton={true}
                    maxVisible={10}
                    size="sm"
                  />
                </div>

                {/* Production Reference Photos Gallery (Camera Access & Supabase Storage) */}
                <div className="pt-2">
                  <ProjectReferencePhotosGallery
                    project={project}
                    onUpdateProject={onUpdateProject}
                    compact={true}
                  />
                </div>

              </div>
            )}

            {/* 2. DEDICATED REFERENCE PHOTOS TAB */}
            {activeTab === 'photos' && (
              <div className="space-y-4">
                <ProjectReferencePhotosGallery
                  project={project}
                  onUpdateProject={onUpdateProject}
                  compact={false}
                />
              </div>
            )}

            {/* 2. QUALITY CONTROL (QC) TAB */}
            {activeTab === 'qc' && (
              <div className="space-y-5">
                <div className="p-5 rounded-3xl bg-charcoal-950 border border-gold-500/30 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-gold-500/20 text-gold-300 border border-gold-500/30 flex items-center gap-1 font-bold">
                          <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
                          <span>SAP QM Inspection Gate</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                          project.qcStatus === 'passed'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : project.qcStatus === 'revision_needed'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {project.qcStatus === 'passed' ? '✓ Passed' : project.qcStatus === 'revision_needed' ? '⚠️ Revision Needed' : 'In Progress'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold font-display text-white">Quality Assurance Checklist</h3>
                      <p className="text-xs text-gray-400 font-mono">
                        Verify 6 luxury deliverables before client delivery or export handoff.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const items = (project.qcItems && project.qcItems.length > 0) ? project.qcItems : DEFAULT_QC_ITEMS;
                          const allChecked = items.map(i => ({ ...i, checked: true }));
                          onUpdateProject(project.id, {
                            qcStatus: 'passed',
                            qcScore: allChecked.length,
                            qcTotal: allChecked.length,
                            qcItems: allChecked,
                            qcCheckedAt: new Date().toISOString()
                          });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Pass All Checks</span>
                      </button>

                      {onOpenQualityControl && (
                        <button
                          type="button"
                          onClick={() => onOpenQualityControl(project)}
                          className="px-3 py-1.5 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 text-gold-300 border border-gold-500/40 text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-gold-400" />
                          <span>Full Modal</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Checklist items */}
                  <div className="space-y-2.5 pt-2">
                    {((project.qcItems && project.qcItems.length > 0) ? project.qcItems : DEFAULT_QC_ITEMS.map(i => ({ ...i, checked: project.qcStatus === 'passed' }))).map((item, idx) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          const currentItems = (project.qcItems && project.qcItems.length > 0) ? [...project.qcItems] : DEFAULT_QC_ITEMS.map(i => ({ ...i, checked: project.qcStatus === 'passed' }));
                          const updated = currentItems.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i);
                          const passedCount = updated.filter(i => i.checked).length;
                          onUpdateProject(project.id, {
                            qcItems: updated,
                            qcScore: passedCount,
                            qcTotal: updated.length,
                            qcStatus: passedCount === updated.length ? 'passed' : passedCount > 0 ? 'in_progress' : 'pending'
                          });
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          item.checked 
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-white' 
                            : 'bg-charcoal-900/60 border-white/5 hover:border-gold-500/20 text-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          item.checked 
                            ? 'bg-emerald-500 border-emerald-400 text-charcoal-950' 
                            : 'border-white/20 bg-charcoal-950 text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${item.checked ? 'text-white' : 'text-gray-200'}`}>
                            {idx + 1}. {item.label}
                          </p>
                          <p className="text-[11px] text-gray-400 font-sans mt-0.5">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Inspector and Notes */}
                  <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-charcoal-900/60 border border-white/5">
                      <span className="text-[9px] text-gray-500 uppercase block mb-1">Inspected By</span>
                      <span className="text-gray-200 font-bold">{project.qcCheckedBy || 'Pending Lead Sign-off'}</span>
                      {project.qcCheckedAt && (
                        <span className="text-[10px] text-gray-400 block mt-0.5">
                          {new Date(project.qcCheckedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-charcoal-900/60 border border-white/5">
                      <span className="text-[9px] text-gray-500 uppercase block mb-1">Inspection Notes</span>
                      <span className="text-gray-300">{project.qcNotes || 'No issues reported.'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. FINANCIALS TAB */}
            {activeTab === 'financials' && (
              <div className="space-y-5">
                <div className="p-5 rounded-3xl bg-charcoal-950 border border-emerald-500/30 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold font-display text-white uppercase tracking-wider flex items-center gap-2">
                      <Coins className="w-4 h-4 text-emerald-400" />
                      <span>Project Financial Ledger</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => onOpenQuickPrintInvoice(project)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Print Invoice</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-3 bg-charcoal-900/80 rounded-xl border border-white/5">
                      <span className="text-[9px] text-gray-500 font-mono uppercase block">Total Contract</span>
                      <div className="text-sm font-bold text-white mt-1">₹{amount.toLocaleString('en-IN')}</div>
                    </div>

                    <div className="p-3 bg-charcoal-900/80 rounded-xl border border-white/5">
                      <span className="text-[9px] text-gray-500 font-mono uppercase block">Advance Paid</span>
                      <div className="text-sm font-bold text-emerald-400 mt-1">₹{advance.toLocaleString('en-IN')}</div>
                    </div>

                    <div className="p-3 bg-charcoal-900/80 rounded-xl border border-white/5">
                      <span className="text-[9px] text-gray-500 font-mono uppercase block">Editor Fee</span>
                      <div className="text-sm font-bold text-gold-400 mt-1">₹{editorPayment.toLocaleString('en-IN')}</div>
                    </div>

                    <div className="p-3 bg-charcoal-900/80 rounded-xl border border-white/5">
                      <span className="text-[9px] text-gray-500 font-mono uppercase block">Pending Due</span>
                      <div className={`text-sm font-bold mt-1 ${pendingBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        ₹{pendingBalance.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SAP FICO Job-Costing & Profit Margin Card */}
                <div className="p-5 rounded-3xl bg-charcoal-950 border border-gold-500/30 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-gold-500/20 text-gold-300 border border-gold-500/30 font-bold inline-flex items-center gap-1 mb-1">
                        <TrendingUp className="w-3.5 h-3.5 text-gold-400" />
                        <span>SAP FICO Job Costing</span>
                      </span>
                      <h4 className="text-sm font-bold font-display text-white">Project Profitability & Margin</h4>
                    </div>

                    <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${
                      profitMarginPct >= 50
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : profitMarginPct >= 25
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}>
                      Margin: {profitMarginPct}%
                    </span>
                  </div>

                  {/* Breakdown details */}
                  <div className="p-4 rounded-2xl bg-charcoal-900/80 border border-white/5 space-y-2.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-gray-300">
                      <span>Client Contract Revenue:</span>
                      <span className="font-bold text-white">₹{amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-300/90">
                      <span>Direct Editor Compensation:</span>
                      <span>- ₹{editorPayment.toLocaleString('en-IN')}</span>
                    </div>
                    {otherExpenses > 0 && (
                      <div className="flex items-center justify-between text-rose-300/90">
                        <span>Other Production Overhead:</span>
                        <span>- ₹{otherExpenses.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm">
                      <span className="font-bold text-gray-200">Net Studio Profit:</span>
                      <span className={`font-extrabold ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ₹{netProfit.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Margin Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono text-gray-400">
                      <span>Target Studio Margin (&gt;50%)</span>
                      <span className="text-gold-400 font-bold">{profitMarginPct}% Achieved</span>
                    </div>
                    <div className="w-full bg-charcoal-900 h-2 rounded-full overflow-hidden border border-white/5">
                      <div
                        className={`h-full transition-all duration-300 ${
                          profitMarginPct >= 50
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                            : profitMarginPct >= 25
                            ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                            : 'bg-gradient-to-r from-rose-500 to-rose-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, profitMarginPct))}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. STORAGE TAB */}
            {activeTab === 'storage' && (
              <div className="space-y-4">
                <div className="p-5 rounded-3xl bg-charcoal-950 border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-gold-400" />
                    <span>Media Storage & Backup Hard Drives</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-charcoal-900/70 border border-white/5">
                      <span className="text-[10px] font-mono text-gray-500 uppercase block">Primary Hard Drive</span>
                      <p className="text-sm font-bold text-white mt-1">{project.hardDriveNumber || 'Drive Not Assigned'}</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-charcoal-900/70 border border-white/5">
                      <span className="text-[10px] font-mono text-gray-500 uppercase block">Backup Mirror Drive</span>
                      <p className="text-sm font-bold text-white mt-1">{project.backupDriveNumber || 'Backup Not Configured'}</p>
                    </div>
                  </div>

                  {project.cloudDriveLink && (
                    <div className="p-4 rounded-2xl bg-charcoal-900/70 border border-gold-500/20 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono text-gold-400 uppercase block">Cloud Footage Link</span>
                        <p className="text-xs text-gray-300 font-mono truncate max-w-sm">{project.cloudDriveLink}</p>
                      </div>
                      <a
                        href={project.cloudDriveLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-gold-500/20 text-gold-300 hover:bg-gold-500/30 border border-gold-500/40 text-xs font-mono font-bold flex items-center gap-1 transition-all"
                      >
                        <span>Open Drive</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. REVISIONS TAB */}
            {activeTab === 'revisions' && (
              <div className="space-y-4">
                <form onSubmit={handleCreateRevision} className="p-4 rounded-2xl bg-charcoal-950 border border-white/5 space-y-3">
                  <span className="text-xs font-bold text-gold-400 font-display uppercase tracking-wider block">
                    + Log New Client Revision Request
                  </span>
                  <textarea
                    rows={3}
                    placeholder="Enter client revision notes (e.g. 'Replace bridal entry song at 03:20 with instrumental version')..."
                    value={newRevisionNote}
                    onChange={(e) => setNewRevisionNote(e.target.value)}
                    className="w-full bg-charcoal-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/40"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newRevisionNote.trim() || isSubmittingRev}
                      className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-bold font-mono text-xs cursor-pointer transition-all disabled:opacity-40"
                    >
                      {isSubmittingRev ? 'Adding...' : 'Add Revision Entry'}
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  {projectRevisions.length > 0 ? (
                    projectRevisions.map((rev) => (
                      <div key={rev.id} className="p-3.5 rounded-2xl bg-charcoal-950 border border-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-gold-400">
                            REV #{rev.revisionNumber}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                              rev.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {rev.status === 'pending' ? 'Pending' : 'Resolved ✓'}
                            </span>
                            {rev.status === 'pending' && (
                              <button
                                type="button"
                                onClick={() => onResolveRevision(rev.id)}
                                className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-mono font-bold cursor-pointer transition-all"
                              >
                                Mark Done
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-300 font-sans leading-relaxed">{rev.notes}</p>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-500 font-mono text-xs">
                      No revisions logged yet for this project.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. NOTES TAB */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-charcoal-950 border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 font-display uppercase tracking-wider flex items-center gap-1.5">
                      <StickyNote className="w-4 h-4 text-amber-400" />
                      <span>Production Notes & Client History</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenQuickNote(project)}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Append Note</span>
                    </button>
                  </div>

                  {project.notes ? (
                    <div className="p-3.5 rounded-xl bg-charcoal-900/80 border border-white/5 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto">
                      {project.notes}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 font-mono italic text-center py-6">
                      No production notes logged yet.
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="p-5 border-t border-white/10 bg-charcoal-950 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEditSpecs(project)}
                className="px-4 py-2.5 rounded-xl bg-luxury-green-800 hover:bg-luxury-green-700 text-gold-400 border border-gold-500/30 text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Specs</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenPdfExport(project)}
                className="px-4 py-2.5 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-gold-300 border border-gold-500/30 text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <FileDown className="w-4 h-4" />
                <span>Export PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onResetProject) {
                    onResetProject(project);
                  } else {
                    onUpdateProject(project.id, { status: 'data_received' });
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-charcoal-900 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                title="Reset Workflow Stage to Data Received"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Stage</span>
              </button>
            </div>

            {(userRole === 'admin' || userRole === 'editor') && (
              <button
                type="button"
                onClick={() => onDeleteProject(project.id)}
                className="px-3.5 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>

        </motion.div>
      </div>
    </div>
  );
};
