import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Project, 
  Studio, 
  Editor, 
  Revision, 
  UserRole, 
  CalendarEvent, 
  PaymentHistory, 
  ProjectStatus, 
  ProjectPriority 
} from '../types';
import { ProjectsHeaderKpi } from './projects/ProjectsHeaderKpi';
import { ProjectsFilterBar } from './projects/ProjectsFilterBar';
import { ProjectCardGrid } from './projects/ProjectCardGrid';
import { ProjectListView } from './projects/ProjectListView';
import { ProjectKanbanBoard } from './projects/ProjectKanbanBoard';
import { ProjectDetailDrawer } from './projects/ProjectDetailDrawer';
import { ProjectFormModal } from './projects/ProjectFormModal';
import { ProjectQuickNoteModal } from './projects/ProjectQuickNoteModal';
import { WhatsAppShareModal } from './projects/WhatsAppShareModal';
import ProjectWorksheetModal from './ProjectWorksheetModal';
import QuickPrintInvoiceModal from './QuickPrintInvoiceModal';
import { ProjectPdfExportModal } from './ProjectPdfExportModal';
import { ProjectQualityControlModal } from './projects/ProjectQualityControlModal';
import { ProjectsTimelineGanttView } from './projects/ProjectsTimelineGanttView';
import { calculateUrgency } from './projects/ProjectUrgencyBadge';
import { PRIORITY_ORDER } from '../utils';
import { ProjectStatusTabsStrip, PROJECT_STATUS_TABS } from './projects/ProjectStatusTabsStrip';
import { MobileStatusSwipeNavigator } from './projects/MobileStatusSwipeNavigator';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  AlertCircle
} from 'lucide-react';

interface ProjectsViewProps {
  projects: Project[];
  studios: Studio[];
  editors: Editor[];
  revisions: Revision[];
  payments?: PaymentHistory[];
  calendarEvents?: CalendarEvent[];
  userRole: UserRole;
  currentStudioId?: string;
  onAddProject: (project: Omit<Project, 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onAddRevision: (revision: Omit<Revision, 'id' | 'createdAt'>) => Promise<void>;
  onResolveRevision: (revId: string) => Promise<void>;
  onDeleteRevision?: (revId: string) => Promise<void>;
  onRedirectToRegistry?: () => void;
  initialTriggerAction?: string;
  onOpenCreativeTool?: (mode: "soundtrack" | "captions", projectId?: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  studios,
  editors,
  revisions,
  payments = [],
  calendarEvents = [],
  userRole,
  currentStudioId,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onAddRevision,
  onResolveRevision,
  onDeleteRevision,
  onRedirectToRegistry,
  initialTriggerAction,
  onOpenCreativeTool
}) => {
  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'kanban' | 'timeline'>('grid');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [studioFilter, setStudioFilter] = useState<string>(currentStudioId || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('delivery_asc');

  // Modals and Drawer state
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<Project | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const [quickNoteProject, setQuickNoteProject] = useState<Project | null>(null);
  const [isQuickNoteModalOpen, setIsQuickNoteModalOpen] = useState(false);

  const [whatsAppProject, setWhatsAppProject] = useState<Project | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  const [worksheetProject, setWorksheetProject] = useState<Project | null>(null);
  const [isWorksheetModalOpen, setIsWorksheetModalOpen] = useState(false);

  const [invoiceProject, setInvoiceProject] = useState<Project | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false);
  const [qcModalProject, setQcModalProject] = useState<Project | null>(null);

  // In-app Action Confirmation Modals & Toast State
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [projectToReset, setProjectToReset] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [toast, setToast] = useState<{ title: string; desc: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const triggerToast = (title: string, desc: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ title, desc, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Photo Hover Zoom Preview lightbox
  const [hoveredPhoto, setHoveredPhoto] = useState<{ url: string; title: string; subtitle: string } | null>(null);

  // Keyboard shortcut listener for search '/'
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const searchInput = document.getElementById('projects-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mobile Touch-Swipe Gesture State for Switching Status Tabs
  const touchStartRef = React.useRef<{ x: number; y: number; time: number } | null>(null);
  const [swipeFeedback, setSwipeFeedback] = useState<{ label: string; count: number; direction: 'next' | 'prev' } | null>(null);
  const [swipeTransitionDirection, setSwipeTransitionDirection] = useState<'left' | 'right' | null>(null);

  const handleSwitchStatusTab = (direction: 'next' | 'prev') => {
    const currentIndex = PROJECT_STATUS_TABS.findIndex(t => t.id === statusFilter);
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    let nextIndex: number;
    if (direction === 'next') {
      nextIndex = safeIndex < PROJECT_STATUS_TABS.length - 1 ? safeIndex + 1 : 0;
      setSwipeTransitionDirection('left');
    } else {
      nextIndex = safeIndex > 0 ? safeIndex - 1 : PROJECT_STATUS_TABS.length - 1;
      setSwipeTransitionDirection('right');
    }
    const targetTab = PROJECT_STATUS_TABS[nextIndex];
    if (targetTab) {
      setStatusFilter(targetTab.id);

      // Compute count in targeted status
      const count = targetTab.id === 'all'
        ? projects.length
        : projects.filter(p => p.status === targetTab.id).length;

      // Haptic feedback if supported on mobile
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(12); } catch (_) {}
      }

      setSwipeFeedback({
        label: targetTab.label,
        count,
        direction
      });
      setTimeout(() => setSwipeFeedback(null), 1600);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    // Don't intercept touches inside interactive controls or overlays
    if (target && (
      target.closest('input') || 
      target.closest('textarea') || 
      target.closest('select') || 
      target.closest('button') || 
      target.closest('[role="dialog"]') ||
      target.closest('[data-no-swipe]')
    )) {
      return;
    }
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Intentional horizontal swipe detection:
    // Minimum 45px displacement, strictly horizontal (absX > absY * 1.35) so vertical scrolling isn't interrupted,
    // and completed within 700ms.
    if (absX >= 45 && absX > absY * 1.35 && deltaTime <= 700) {
      if (deltaX < 0) {
        // Swiped Left -> Next tab
        handleSwitchStatusTab('next');
      } else {
        // Swiped Right -> Previous tab
        handleSwitchStatusTab('prev');
      }
    }
  };

  // Handle Initial Trigger Action from Navigation if present
  useEffect(() => {
    if (initialTriggerAction === 'new-project') {
      setEditingProject(null);
      setIsFormModalOpen(true);
    }
  }, [initialTriggerAction]);

  // Main Filtering and Sorting computation
  const filteredProjects = useMemo(() => {
    const now = Date.now();
    const query = searchQuery.trim().toLowerCase();

    return projects.filter((project) => {
      // Studio filter
      if (studioFilter !== 'all' && project.studioId !== studioFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && project.priority !== priorityFilter) {
        return false;
      }

      // Tag filter
      if (tagFilter !== 'all') {
        if (!project.tags || !project.tags.includes(tagFilter)) {
          return false;
        }
      }

      // Deadline & Urgency filter
      if (deadlineFilter !== 'all') {
        const urgency = calculateUrgency(project.deliveryDate, project.status);
        if (deadlineFilter === 'overdue') {
          if (urgency.urgencyLevel !== 'overdue') return false;
        } else if (deadlineFilter === 'critical') {
          if (urgency.urgencyLevel !== 'critical' && urgency.urgencyLevel !== 'due_today' && urgency.urgencyLevel !== 'overdue') return false;
        } else if (deadlineFilter === 'due_7_days') {
          if (!project.deliveryDate || ['delivered', 'closed'].includes(project.status)) return false;
          if (urgency.daysRemaining === null || urgency.daysRemaining > 7) return false;
        }
      }

      // Search Query filter
      if (query) {
        const matchName = (project.projectName || '').toLowerCase().includes(query);
        const matchCouple = (project.coupleName || '').toLowerCase().includes(query);
        const matchId = (project.id || '').toLowerCase().includes(query);
        const matchStudio = (project.studioName || '').toLowerCase().includes(query);
        const matchEditor = (project.assignedEditorName || '').toLowerCase().includes(query);
        const matchNotes = (project.notes || '').toLowerCase().includes(query);
        if (!matchName && !matchCouple && !matchId && !matchStudio && !matchEditor && !matchNotes) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'priority' || sortBy === 'priority_asc') {
        const pa = PRIORITY_ORDER[a.priority || 'medium'] ?? 2;
        const pb = PRIORITY_ORDER[b.priority || 'medium'] ?? 2;
        if (pa !== pb) return pa - pb;
        const da = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 9999999999999;
        const db = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 9999999999999;
        return da - db;
      }
      if (sortBy === 'delivery_asc') {
        const da = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 9999999999999;
        const db = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 9999999999999;
        return da - db;
      }
      if (sortBy === 'delivery_desc') {
        const da = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
        const db = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
        return db - da;
      }
      if (sortBy === 'shoot_desc') {
        const sa = a.shootDate ? new Date(a.shootDate).getTime() : 0;
        const sb = b.shootDate ? new Date(b.shootDate).getTime() : 0;
        return sb - sa;
      }
      if (sortBy === 'amount_desc') {
        return (Number(b.projectAmount) || 0) - (Number(a.projectAmount) || 0);
      }
      if (sortBy === 'balance_desc') {
        const balA = Math.max(0, (Number(a.projectAmount) || 0) - (Number(a.advancePayment) || 0));
        const balB = Math.max(0, (Number(b.projectAmount) || 0) - (Number(b.advancePayment) || 0));
        return balB - balA;
      }
      if (sortBy === 'name_asc') {
        return (a.projectName || a.coupleName || '').localeCompare(b.projectName || b.coupleName || '');
      }
      return 0;
    });
  }, [projects, searchQuery, studioFilter, statusFilter, priorityFilter, tagFilter, deadlineFilter, sortBy]);

  // Status Updater
  const handleUpdateStatus = async (projectId: string, status: ProjectStatus) => {
    try {
      await onUpdateProject(projectId, { status });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Tag Toggler
  const handleToggleTag = async (projectId: string, tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;
    const current = proj.tags || [];
    const nextTags = current.includes(tagId) ? current.filter(t => t !== tagId) : [...current, tagId];
    await onUpdateProject(projectId, { tags: nextTags });
  };

  // Quick Note appender
  const handleSaveQuickNote = async (projectId: string, notes: string) => {
    await onUpdateProject(projectId, { notes });
  };

  // Open Specs Drawer
  const handleSelectProject = (proj: Project) => {
    setSelectedProjectForDetail(proj);
    setIsDetailDrawerOpen(true);
  };

  // Open Edit Modal
  const handleEditProject = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(proj);
    setIsFormModalOpen(true);
  };

  // Open Delete in-app confirmation
  const handleDeleteProject = (idOrProj: string | Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const proj = typeof idOrProj === 'string' ? projects.find(p => p.id === idOrProj) : idOrProj;
    if (proj) {
      setProjectToDelete(proj);
    } else if (typeof idOrProj === 'string') {
      // Fallback if not found in cache
      onDeleteProject(idOrProj);
      triggerToast('Project Archived', 'Project moved to Recycle Bin.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteProject(projectToDelete.id);
      if (selectedProjectForDetail?.id === projectToDelete.id) {
        setIsDetailDrawerOpen(false);
      }
      triggerToast(
        'Project Archived', 
        `"${projectToDelete.coupleName || projectToDelete.projectName}" moved to Recycle Bin.`
      );
      setProjectToDelete(null);
    } catch (err) {
      console.error('Error deleting project:', err);
      triggerToast('Delete Failed', 'Failed to delete project. Please try again.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Quick Note
  const handleOpenQuickNote = (proj: Project) => {
    setQuickNoteProject(proj);
    setIsQuickNoteModalOpen(true);
  };

  // Open WhatsApp
  const handleOpenWhatsAppShare = (proj: Project) => {
    setWhatsAppProject(proj);
    setIsWhatsAppModalOpen(true);
  };

  // Open Worksheet
  const handleOpenWorksheet = (proj: Project) => {
    setWorksheetProject(proj);
    setIsWorksheetModalOpen(true);
  };

  // Open Quick Print Invoice
  const handleOpenQuickPrintInvoice = (proj: Project) => {
    setInvoiceProject(proj);
    setIsInvoiceModalOpen(true);
  };

  // Quick Reset Project Stage in-app confirmation
  const handleResetProject = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProjectToReset(proj);
  };

  const handleConfirmReset = async () => {
    if (!projectToReset) return;
    setIsResetting(true);
    try {
      await onUpdateProject(projectToReset.id, { status: 'data_received' });
      triggerToast(
        'Workflow Stage Reset', 
        `"${projectToReset.coupleName || projectToReset.projectName}" workflow stage set back to 'Data Received'.`
      );
      setProjectToReset(null);
    } catch (err) {
      console.error("Error resetting project:", err);
      triggerToast('Reset Failed', 'Failed to reset project stage. Please try again.', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. Ultra-Premium Executive Production Header */}
      <ProjectsHeaderKpi
        projects={projects}
        filteredProjects={filteredProjects}
        studios={studios}
        editors={editors}
        onOpenWeekShoots={() => setDeadlineFilter('due_7_days')}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        deadlineFilter={deadlineFilter}
        setDeadlineFilter={setDeadlineFilter}
      />

      {/* 2. Unified Precision Toolbar */}
      <ProjectsFilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        studios={studios}
        studioFilter={studioFilter}
        setStudioFilter={setStudioFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        deadlineFilter={deadlineFilter}
        setDeadlineFilter={setDeadlineFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        totalProjectsCount={projects.length}
        filteredProjectsCount={filteredProjects.length}
        onOpenNewProjectModal={() => {
          setEditingProject(null);
          setIsFormModalOpen(true);
        }}
        onOpenPdfExportModal={() => setIsPdfExportModalOpen(true)}
        userRole={userRole}
      />

      {/* 3. Dedicated Status Tabs Strip with Quick Stage Switching */}
      <ProjectStatusTabsStrip
        statusFilter={statusFilter}
        setStatusFilter={(newStatus) => {
          setSwipeTransitionDirection(null);
          setStatusFilter(newStatus);
        }}
        projects={projects}
        totalFilteredCount={filteredProjects.length}
      />

      {/* 4. Primary Content Views: Grid / Table / Kanban with Mobile Touch-Swipe Gesture */}
      <div 
        id="projects-mobile-swipe-viewport"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="mt-4 relative min-h-[350px] touch-pan-y"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`view-${viewMode}-${statusFilter}`}
            initial={{ 
              opacity: 0.85, 
              x: swipeTransitionDirection === 'left' ? 24 : swipeTransitionDirection === 'right' ? -24 : 0 
            }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ 
              opacity: 0.85, 
              x: swipeTransitionDirection === 'left' ? -24 : swipeTransitionDirection === 'right' ? 24 : 0 
            }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {viewMode === 'grid' && (
              <ProjectCardGrid
                projects={filteredProjects}
                studios={studios}
                editors={editors}
                revisions={revisions}
                userRole={userRole}
                onSelectProject={handleSelectProject}
                onEditProject={handleEditProject}
                onDeleteProject={handleDeleteProject}
                onOpenQuickNote={handleOpenQuickNote}
                onOpenWhatsAppShare={handleOpenWhatsAppShare}
                onOpenWorksheet={handleOpenWorksheet}
                onOpenQuickPrintInvoice={handleOpenQuickPrintInvoice}
                onToggleTag={handleToggleTag}
                onUpdateStatus={handleUpdateStatus}
                onResetProject={handleResetProject}
                onOpenQualityControl={(p) => setQcModalProject(p)}
                setHoveredPhoto={setHoveredPhoto}
              />
            )}

            {viewMode === 'list' && (
              <ProjectListView
                projects={filteredProjects}
                studios={studios}
                editors={editors}
                revisions={revisions}
                userRole={userRole}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                deadlineFilter={deadlineFilter}
                setDeadlineFilter={setDeadlineFilter}
                searchQuery={searchQuery}
                onSelectProject={handleSelectProject}
                onEditProject={handleEditProject}
                onDeleteProject={handleDeleteProject}
                onOpenQuickNote={handleOpenQuickNote}
                onOpenWhatsAppShare={handleOpenWhatsAppShare}
                onOpenWorksheet={handleOpenWorksheet}
                onOpenQuickPrintInvoice={handleOpenQuickPrintInvoice}
                onToggleTag={handleToggleTag}
                onUpdateStatus={handleUpdateStatus}
                onResetProject={handleResetProject}
                onOpenQualityControl={(p) => setQcModalProject(p)}
                setHoveredPhoto={setHoveredPhoto}
              />
            )}

            {viewMode === 'kanban' && (
              <ProjectKanbanBoard
                projects={filteredProjects}
                studios={studios}
                editors={editors}
                revisions={revisions}
                userRole={userRole}
                onSelectProject={handleSelectProject}
                onEditProject={handleEditProject}
                onDeleteProject={handleDeleteProject}
                onOpenQuickNote={handleOpenQuickNote}
                onOpenWhatsAppShare={handleOpenWhatsAppShare}
                onUpdateStatus={handleUpdateStatus}
                onResetProject={handleResetProject}
                setHoveredPhoto={setHoveredPhoto}
              />
            )}

            {viewMode === 'timeline' && (
              <ProjectsTimelineGanttView
                projects={filteredProjects}
                studios={studios}
                editors={editors}
                revisions={revisions}
                userRole={userRole}
                currentStudioId={currentStudioId}
                onSelectProject={handleSelectProject}
                onEditProject={handleEditProject}
                onUpdateStatus={handleUpdateStatus}
                onOpenQuickNote={handleOpenQuickNote}
                onOpenWhatsAppShare={handleOpenWhatsAppShare}
                onOpenQualityControl={(p) => setQcModalProject(p)}
                onResetProject={handleResetProject}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 4. Full Specifications Slide-Over Drawer */}
      <ProjectDetailDrawer
        project={selectedProjectForDetail}
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        studios={studios}
        editors={editors}
        revisions={revisions}
        calendarEvents={calendarEvents}
        userRole={userRole}
        onUpdateProject={onUpdateProject}
        onDeleteProject={handleDeleteProject}
        onAddRevision={onAddRevision}
        onResolveRevision={onResolveRevision}
        onEditSpecs={(p) => {
          setIsDetailDrawerOpen(false);
          handleEditProject(p);
        }}
        onOpenQuickPrintInvoice={(p) => {
          setIsDetailDrawerOpen(false);
          handleOpenQuickPrintInvoice(p);
        }}
        onOpenWorksheet={(p) => {
          setIsDetailDrawerOpen(false);
          handleOpenWorksheet(p);
        }}
        onOpenPdfExport={(p) => {
          setIsDetailDrawerOpen(false);
          setIsPdfExportModalOpen(true);
        }}
        onOpenWhatsAppShare={(p) => handleOpenWhatsAppShare(p)}
        onOpenQuickNote={(p) => handleOpenQuickNote(p)}
        onToggleTag={handleToggleTag}
        onOpenCreativeTool={onOpenCreativeTool}
        onResetProject={handleResetProject}
      />

      {/* 5. New / Edit Wedding Registry Form Modal */}
      <ProjectFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={async (data) => {
          if (editingProject) {
            await onUpdateProject(editingProject.id, data);
            triggerToast('Specs Saved', `"${data.coupleName || data.projectName}" specifications updated successfully.`);
          } else {
            await onAddProject(data);
            triggerToast('Project Created', `"${data.coupleName || data.projectName}" registry created successfully.`);
          }
        }}
        editingProject={editingProject}
        studios={studios}
        editors={editors}
        projects={projects}
        userRole={userRole}
        currentStudioId={currentStudioId}
      />

      {/* 6. SAP QM Quality Control Gatekeeper Modal */}
      {qcModalProject && (
        <ProjectQualityControlModal
          isOpen={!!qcModalProject}
          onClose={() => setQcModalProject(null)}
          project={qcModalProject}
          onUpdateProject={async (id, updates) => {
            await onUpdateProject(id, updates);
            setQcModalProject(prev => prev ? ({ ...prev, ...updates }) : null);
            triggerToast('Quality Control Updated', 'QC milestone inspection status saved.');
          }}
          userRole={userRole}
        />
      )}

      {/* 7. Quick Note Logger Modal */}
      <ProjectQuickNoteModal
        project={quickNoteProject}
        isOpen={isQuickNoteModalOpen}
        onClose={() => setIsQuickNoteModalOpen(false)}
        onSaveNote={handleSaveQuickNote}
      />

      {/* 7. WhatsApp Dispatch Modal */}
      <WhatsAppShareModal
        project={whatsAppProject}
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        studios={studios}
      />

      {/* 8. Production Worksheet Modal */}
      {worksheetProject && (
        <ProjectWorksheetModal
          project={worksheetProject}
          studios={studios}
          editors={editors}
          revisions={revisions.filter(r => r.projectId === worksheetProject.id)}
          isOpen={isWorksheetModalOpen}
          onClose={() => setIsWorksheetModalOpen(false)}
        />
      )}

      {/* 9. Quick Print Invoice Modal */}
      {invoiceProject && (
        <QuickPrintInvoiceModal
          project={invoiceProject}
          studio={studios.find(s => s.id === invoiceProject.studioId || s.name === invoiceProject.studioName)}
          editor={editors.find(e => e.id === invoiceProject.assignedEditorId || e.name === invoiceProject.assignedEditorName)}
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
        />
      )}

      {/* 10. Multi-Project Styled PDF Export Modal */}
      <ProjectPdfExportModal
        isOpen={isPdfExportModalOpen}
        onClose={() => setIsPdfExportModalOpen(false)}
        projects={projects}
        filteredProjects={filteredProjects}
        studios={studios}
        editors={editors}
        revisions={revisions}
        userRole={userRole}
      />

      {/* 11. Floating Photo Lightbox Zoom Overlay on Hover */}
      <AnimatePresence>
        {hoveredPhoto && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-8 right-8 z-50 pointer-events-none hidden md:block"
          >
            <div className="p-2 rounded-3xl bg-charcoal-950/95 border-2 border-gold-500/60 shadow-2xl shadow-black/80 backdrop-blur-xl w-64 overflow-hidden">
              <img
                src={hoveredPhoto.url}
                alt={hoveredPhoto.title}
                className="w-full h-44 object-cover rounded-2xl"
              />
              <div className="p-2.5">
                <h4 className="text-xs font-bold text-white truncate font-display">{hoveredPhoto.title}</h4>
                <p className="text-[10px] text-gold-400 font-mono truncate">{hoveredPhoto.subtitle}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 12. In-App Delete Project Confirmation Modal */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-charcoal-950 border border-rose-500/30 rounded-2xl p-6 shadow-2xl shadow-rose-950/50 relative overflow-hidden"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white font-display">Delete / Archive Project?</h3>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    Are you sure you want to remove <span className="text-white font-semibold font-mono">"{projectToDelete.coupleName || projectToDelete.projectName}"</span>? The film will be moved to the Recycle Bin and can be restored if needed.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-gray-300 hover:text-white border border-white/5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono tracking-wide shadow-lg shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 13. In-App Reset Stage Confirmation Modal */}
      <AnimatePresence>
        {projectToReset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-charcoal-950 border border-sky-500/30 rounded-2xl p-6 shadow-2xl shadow-sky-950/50 relative overflow-hidden"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-white font-display">Reset Workflow Stage?</h3>
                  <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                    Reset stage for <span className="text-white font-semibold font-mono">"{projectToReset.coupleName || projectToReset.projectName}"</span> back to <span className="text-sky-400 font-mono font-semibold">'Data Received'</span>? All existing notes, specifications, and drives will remain intact.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setProjectToReset(null)}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-gray-300 hover:text-white border border-white/5 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={isResetting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold font-mono tracking-wide shadow-lg shadow-sky-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isResetting ? 'Resetting...' : 'Reset Stage'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 14. Real-Time Action Feedback Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[110] max-w-sm w-full pointer-events-auto"
          >
            <div className={`p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-start gap-3 ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-100 shadow-rose-950/60'
                : toast.type === 'info'
                ? 'bg-sky-950/90 border-sky-500/40 text-sky-100 shadow-sky-950/60'
                : 'bg-charcoal-950/95 border-gold-500/40 text-white shadow-black/80'
            }`}>
              <div className="shrink-0 mt-0.5">
                {toast.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-gold-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-bold font-display">{toast.title}</h5>
                <p className="text-[11px] text-gray-300 mt-0.5 leading-snug">{toast.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 15. Mobile Floating Status Navigator & Touch-Swipe Indicator */}
      <MobileStatusSwipeNavigator
        statusFilter={statusFilter}
        setStatusFilter={(newStatus) => {
          setSwipeTransitionDirection(null);
          setStatusFilter(newStatus);
        }}
        projects={projects}
        swipeFeedback={swipeFeedback}
      />

    </div>
  );
};

export default ProjectsView;
