import React, { useRef } from 'react';
import { 
  Search, 
  X, 
  Grid, 
  List, 
  SlidersHorizontal, 
  Plus, 
  FileDown, 
  Printer, 
  Flame, 
  Building2, 
  Sparkles, 
  ArrowUpDown, 
  Film, 
  Tag as TagIcon,
  CheckCircle2,
  Clock,
  Columns,
  Calendar
} from 'lucide-react';
import { motion } from 'motion/react';
import { Studio, ProjectPriority, ProjectStatus, UserRole } from '../../types';
import { PREDEFINED_PROJECT_TAGS } from '../../projectTags';
import NewBadge from '../common/NewBadge';

interface ProjectsFilterBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  viewMode: 'grid' | 'list' | 'kanban' | 'timeline';
  setViewMode: (mode: 'grid' | 'list' | 'kanban' | 'timeline') => void;
  studios: Studio[];
  studioFilter: string;
  setStudioFilter: (studioId: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  tagFilter: string;
  setTagFilter: (tag: string) => void;
  deadlineFilter: string;
  setDeadlineFilter: (deadline: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  totalProjectsCount: number;
  filteredProjectsCount: number;
  onOpenNewProjectModal: () => void;
  onOpenPdfExportModal: () => void;
  userRole: UserRole;
}

const WORKFLOW_FILTER_OPTIONS: { id: string; label: string; icon?: string }[] = [
  { id: 'all', label: 'All Stages' },
  { id: 'data_received', label: 'Data Received' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'editing', label: 'Active Editing' },
  { id: 'review', label: 'Review' },
  { id: 'revision', label: 'Revision' },
  { id: 'rendering', label: 'Rendering' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'closed', label: 'Closed / Archived' }
];

export const ProjectsFilterBar: React.FC<ProjectsFilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  viewMode,
  setViewMode,
  studios,
  studioFilter,
  setStudioFilter,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  tagFilter,
  setTagFilter,
  deadlineFilter,
  setDeadlineFilter,
  sortBy,
  setSortBy,
  totalProjectsCount,
  filteredProjectsCount,
  onOpenNewProjectModal,
  onOpenPdfExportModal,
  userRole
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isAnyFilterActive = 
    searchQuery.trim() !== '' || 
    studioFilter !== 'all' || 
    statusFilter !== 'all' || 
    priorityFilter !== 'all' || 
    tagFilter !== 'all' || 
    deadlineFilter !== 'all';

  const handleResetFilters = () => {
    setSearchQuery('');
    setStudioFilter('all');
    setStatusFilter('all');
    setPriorityFilter('all');
    setTagFilter('all');
    setDeadlineFilter('all');
    setSortBy('delivery_asc');
  };

  return (
    <div className="space-y-3.5">
      {/* Primary Toolbar: Search + View Switcher + Primary Actions */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-charcoal-900/95 border border-gold-500/25 shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Main Search Input */}
          <div className="relative flex-1 group">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gold-400 group-focus-within:text-gold-300 transition-colors" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              id="projects-search-input"
              placeholder="Search by couple (e.g. 'Priya & Rahul'), project ID, studio, or editor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-24 py-2.5 bg-charcoal-950/90 border border-luxury-green-800/30 group-focus-within:border-gold-500/60 rounded-2xl text-xs sm:text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-gold-500/40 transition-all shadow-inner"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery ? (
                <button
                  type="button"
                  id="clear-projects-search-btn"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold bg-charcoal-900 text-gray-400 border border-white/10 rounded select-none">
                  /
                </kbd>
              )}
            </div>
          </div>

          {/* Controls Right Section */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
            
            {/* View Mode Toggle: Grid / Table / Kanban */}
            <div className="inline-flex items-center p-1 bg-charcoal-950 rounded-2xl border border-luxury-green-800/30 shadow-inner">
              <button
                type="button"
                id="btn-view-grid"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-charcoal-950 shadow-md font-black'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
                title="Cinematic Card Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>

              <button
                type="button"
                id="btn-view-list"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-charcoal-950 shadow-md font-black'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
                title="Executive Table List View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>

              <button
                type="button"
                id="btn-view-kanban"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-charcoal-950 shadow-md font-black'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
                title="Workflow Kanban Pipeline View"
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kanban</span>
              </button>

              <button
                type="button"
                id="btn-view-timeline"
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-gradient-to-r from-gold-500 to-amber-400 text-charcoal-950 shadow-md font-black'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
                title="Timeline & Gantt Schedule View"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Timeline</span>
              </button>
            </div>

            {/* Export & Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-projects-export-pdf"
                onClick={onOpenPdfExportModal}
                className="px-3 py-2 rounded-xl bg-charcoal-950 hover:bg-charcoal-900 border border-gold-500/30 hover:border-gold-500/60 text-gold-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="Export Filtered Projects to Styled PDF"
              >
                <FileDown className="w-3.5 h-3.5 text-gold-400" />
                <span className="hidden md:inline">Export PDF</span>
              </button>

              {(userRole === 'admin' || userRole === 'editor') && (
                <button
                  type="button"
                  id="btn-new-wedding-registry"
                  onClick={onOpenNewProjectModal}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-400 hover:from-gold-400 hover:to-amber-300 text-charcoal-950 text-xs font-bold font-display tracking-wider flex items-center gap-1.5 shadow-lg shadow-gold-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>New Project</span>
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Studio Partner Quick Strip */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar select-none">
          <span className="text-[10px] font-mono uppercase text-gray-500 font-bold shrink-0 mr-1 flex items-center gap-1">
            <Building2 className="w-3 h-3 text-gold-400" />
            <span>Studio:</span>
          </span>

          <button
            type="button"
            onClick={() => setStudioFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold shrink-0 transition-all cursor-pointer ${
              studioFilter === 'all'
                ? 'bg-gold-500 text-charcoal-950 font-black shadow-md'
                : 'bg-charcoal-950/80 text-gray-400 hover:text-white border border-white/5 hover:border-white/20'
            }`}
          >
            All Studios ({totalProjectsCount})
          </button>

          {studios.map((studio) => (
            <button
              key={studio.id}
              type="button"
              onClick={() => setStudioFilter(studioFilter === studio.id ? 'all' : studio.id)}
              className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold shrink-0 transition-all cursor-pointer ${
                studioFilter === studio.id
                  ? 'bg-gold-500 text-charcoal-950 font-black shadow-md'
                  : 'bg-charcoal-950/80 text-gray-300 hover:text-white border border-white/5 hover:border-gold-500/30'
              }`}
            >
              {studio.name}
            </button>
          ))}
        </div>

        {/* Secondary Filter Row: Priority + Status + Deadline + Sort + Tag */}
        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority Selector */}
            <div className="flex items-center gap-1 bg-charcoal-950 px-2.5 py-1.5 rounded-xl border border-white/5">
              <span className="text-gray-500 text-[10px] font-bold">Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer font-bold"
              >
                <option value="all" className="bg-charcoal-900">All Priorities</option>
                <option value="urgent" className="bg-charcoal-900 text-rose-400">🚨 Urgent</option>
                <option value="high" className="bg-charcoal-900 text-amber-400">🔥 High</option>
                <option value="medium" className="bg-charcoal-900 text-sky-400">⚡ Medium</option>
                <option value="low" className="bg-charcoal-900 text-emerald-400">🌱 Low</option>
              </select>
            </div>

            {/* Workflow Stage Selector */}
            <div className="flex items-center gap-1 bg-charcoal-950 px-2.5 py-1.5 rounded-xl border border-white/5">
              <span className="text-gray-500 text-[10px] font-bold">Stage:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer font-bold"
              >
                {WORKFLOW_FILTER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-charcoal-900">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Deadline Urgency Filter */}
            <div className="flex items-center gap-1.5 bg-charcoal-950 px-2.5 py-1.5 rounded-xl border border-white/5">
              <Clock className={`w-3.5 h-3.5 ${deadlineFilter === 'overdue' ? 'text-rose-400' : deadlineFilter === 'critical' ? 'text-amber-400' : 'text-gold-400'}`} />
              <select
                id="urgency-filter-select"
                value={deadlineFilter}
                onChange={(e) => setDeadlineFilter(e.target.value)}
                className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer font-bold"
              >
                <option value="all" className="bg-charcoal-900">All Deadlines</option>
                <option value="overdue" className="bg-charcoal-900">⚠️ Overdue Only</option>
                <option value="critical" className="bg-charcoal-900">⚡ Critical (≤ 2 Days)</option>
                <option value="due_7_days" className="bg-charcoal-900">⏳ Due ≤ 7 Days</option>
              </select>
              <NewBadge releaseDate="2026-09-12" daysThreshold={10} size="xs" />
            </div>

            {/* Project Tag Filter */}
            <div className="flex items-center gap-1 bg-charcoal-950 px-2.5 py-1.5 rounded-xl border border-white/5">
              <TagIcon className="w-3 h-3 text-gold-400" />
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-charcoal-900">All Tags</option>
                {PREDEFINED_PROJECT_TAGS.map((t) => (
                  <option key={t.id} value={t.id} className="bg-charcoal-900">
                    🏷️ {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1 bg-charcoal-950 px-2.5 py-1.5 rounded-xl border border-white/5">
              <ArrowUpDown className="w-3 h-3 text-gold-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-gray-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="delivery_asc" className="bg-charcoal-900">Deadline: Earliest First</option>
                <option value="priority_asc" className="bg-charcoal-900">Priority: Urgent First</option>
                <option value="delivery_desc" className="bg-charcoal-900">Deadline: Furthest</option>
                <option value="shoot_desc" className="bg-charcoal-900">Shoot Date: Newest</option>
                <option value="amount_desc" className="bg-charcoal-900">Highest Contract Value</option>
                <option value="balance_desc" className="bg-charcoal-900">Highest Pending Balance</option>
                <option value="name_asc" className="bg-charcoal-900">Couple Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Active Filter Indicators & Reset Button */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">
              Showing <strong className="text-gold-400 font-bold">{filteredProjectsCount}</strong> of {totalProjectsCount} films
            </span>
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="Reset all search and filter conditions"
              >
                <X className="w-3 h-3" />
                <span>Reset All</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
