import React, { useRef, useEffect, useState } from 'react';
import { 
  Sparkles, 
  FolderOpen, 
  UserCheck, 
  Film, 
  Eye, 
  RotateCcw, 
  Flame, 
  CheckCircle2, 
  Archive,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, ProjectStatus } from '../../types';

export interface StatusTabItem {
  id: string; // 'all' | ProjectStatus
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  activeBgClass: string;
  badgeBg: string;
}

export const PROJECT_STATUS_TABS: StatusTabItem[] = [
  { 
    id: 'all', 
    label: 'All Films', 
    shortLabel: 'All', 
    icon: Sparkles, 
    colorClass: 'text-gold-400',
    activeBgClass: 'bg-gradient-to-r from-gold-500 to-amber-500 text-charcoal-950 font-black shadow-lg shadow-gold-500/25',
    badgeBg: 'bg-charcoal-900/80 text-gold-300 border border-gold-500/40' 
  },
  { 
    id: 'data_received', 
    label: 'Data Received', 
    shortLabel: 'Received', 
    icon: FolderOpen, 
    colorClass: 'text-sky-400',
    activeBgClass: 'bg-gradient-to-r from-sky-500 to-cyan-500 text-charcoal-950 font-black shadow-lg shadow-sky-500/25',
    badgeBg: 'bg-charcoal-900/80 text-sky-300 border border-sky-500/40' 
  },
  { 
    id: 'assigned', 
    label: 'Assigned', 
    shortLabel: 'Assigned', 
    icon: UserCheck, 
    colorClass: 'text-indigo-400',
    activeBgClass: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black shadow-lg shadow-indigo-500/25',
    badgeBg: 'bg-charcoal-900/80 text-indigo-300 border border-indigo-500/40' 
  },
  { 
    id: 'editing', 
    label: 'Active Editing', 
    shortLabel: 'Editing', 
    icon: Film, 
    colorClass: 'text-amber-400',
    activeBgClass: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-charcoal-950 font-black shadow-lg shadow-amber-500/25',
    badgeBg: 'bg-charcoal-900/80 text-amber-300 border border-amber-500/40' 
  },
  { 
    id: 'review', 
    label: 'Review', 
    shortLabel: 'Review', 
    icon: Eye, 
    colorClass: 'text-purple-400',
    activeBgClass: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black shadow-lg shadow-purple-500/25',
    badgeBg: 'bg-charcoal-900/80 text-purple-300 border border-purple-500/40' 
  },
  { 
    id: 'revision', 
    label: 'Revision', 
    shortLabel: 'Revision', 
    icon: RotateCcw, 
    colorClass: 'text-rose-400',
    activeBgClass: 'bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black shadow-lg shadow-rose-500/25',
    badgeBg: 'bg-charcoal-900/80 text-rose-300 border border-rose-500/40' 
  },
  { 
    id: 'rendering', 
    label: 'Rendering', 
    shortLabel: 'Render', 
    icon: Flame, 
    colorClass: 'text-teal-400',
    activeBgClass: 'bg-gradient-to-r from-teal-500 to-emerald-500 text-charcoal-950 font-black shadow-lg shadow-teal-500/25',
    badgeBg: 'bg-charcoal-900/80 text-teal-300 border border-teal-500/40' 
  },
  { 
    id: 'delivered', 
    label: 'Delivered', 
    shortLabel: 'Delivered', 
    icon: CheckCircle2, 
    colorClass: 'text-emerald-400',
    activeBgClass: 'bg-gradient-to-r from-emerald-500 to-green-500 text-charcoal-950 font-black shadow-lg shadow-emerald-500/25',
    badgeBg: 'bg-charcoal-900/80 text-emerald-300 border border-emerald-500/40' 
  },
  { 
    id: 'closed', 
    label: 'Closed / Archived', 
    shortLabel: 'Closed', 
    icon: Archive, 
    colorClass: 'text-slate-400',
    activeBgClass: 'bg-gradient-to-r from-slate-600 to-slate-700 text-white font-black shadow-lg shadow-slate-600/25',
    badgeBg: 'bg-charcoal-900/80 text-slate-300 border border-slate-500/40' 
  }
];

interface ProjectStatusTabsStripProps {
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  projects: Project[];
  totalFilteredCount: number;
}

export const ProjectStatusTabsStrip: React.FC<ProjectStatusTabsStripProps> = ({
  statusFilter,
  setStatusFilter,
  projects,
  totalFilteredCount
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Floating Long-Press Tooltip state
  const [activeTooltip, setActiveTooltip] = useState<{
    id: string;
    label: string;
    shortLabel: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
    x: number;
    y: number;
  } | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const showTooltip = (
    data: {
      id: string;
      label: string;
      shortLabel: string;
      count: number;
      icon: React.ComponentType<{ className?: string }>;
      colorClass: string;
      x: number;
      y: number;
    },
    duration = 2400
  ) => {
    if (tooltipDismissTimerRef.current) {
      clearTimeout(tooltipDismissTimerRef.current);
    }
    setActiveTooltip(data);
    tooltipDismissTimerRef.current = setTimeout(() => {
      setActiveTooltip(null);
      tooltipDismissTimerRef.current = null;
    }, duration);
  };

  const handleTouchStart = (
    tab: StatusTabItem,
    count: number,
    e: React.TouchEvent<HTMLButtonElement>
  ) => {
    clearLongPressTimer();
    isLongPressTriggeredRef.current = false;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    const btn = e.currentTarget;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      const rect = btn.getBoundingClientRect();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(20); } catch (_) {}
      }
      showTooltip({
        id: tab.id,
        label: tab.label,
        shortLabel: tab.shortLabel,
        count,
        icon: tab.icon,
        colorClass: tab.colorClass,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    }, 380);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 8 || dy > 8) {
      clearLongPressTimer();
    }
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
    touchStartPosRef.current = null;
    // Auto-dismiss tooltip smoothly after release
    if (isLongPressTriggeredRef.current) {
      if (tooltipDismissTimerRef.current) {
        clearTimeout(tooltipDismissTimerRef.current);
      }
      tooltipDismissTimerRef.current = setTimeout(() => {
        setActiveTooltip(null);
        tooltipDismissTimerRef.current = null;
      }, 1600);
    }
  };

  const handleMouseDown = (
    tab: StatusTabItem,
    count: number,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (e.button !== 0) return;
    clearLongPressTimer();
    isLongPressTriggeredRef.current = false;
    const btn = e.currentTarget;

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      const rect = btn.getBoundingClientRect();
      showTooltip({
        id: tab.id,
        label: tab.label,
        shortLabel: tab.shortLabel,
        count,
        icon: tab.icon,
        colorClass: tab.colorClass,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
    }, 380);
  };

  const handleMouseUp = () => {
    clearLongPressTimer();
    if (isLongPressTriggeredRef.current) {
      if (tooltipDismissTimerRef.current) {
        clearTimeout(tooltipDismissTimerRef.current);
      }
      tooltipDismissTimerRef.current = setTimeout(() => {
        setActiveTooltip(null);
        tooltipDismissTimerRef.current = null;
      }, 1600);
    }
  };

  const handleTabClick = (tabId: string) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch (_) {}
    }
    setStatusFilter(tabId);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
      if (tooltipDismissTimerRef.current) {
        clearTimeout(tooltipDismissTimerRef.current);
      }
    };
  }, []);

  // Compute counts for each status
  const counts = React.useMemo(() => {
    const map: Record<string, number> = { all: projects.length };
    projects.forEach(p => {
      const s = p.status || 'data_received';
      map[s] = (map[s] || 0) + 1;
    });
    return map;
  }, [projects]);

  // When active tab changes, smoothly scroll the active tab into view
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [statusFilter]);

  const currentIndex = PROJECT_STATUS_TABS.findIndex(t => t.id === statusFilter);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  const handlePrev = () => {
    const nextIdx = safeIndex > 0 ? safeIndex - 1 : PROJECT_STATUS_TABS.length - 1;
    setStatusFilter(PROJECT_STATUS_TABS[nextIdx].id);
  };

  const handleNext = () => {
    const nextIdx = safeIndex < PROJECT_STATUS_TABS.length - 1 ? safeIndex + 1 : 0;
    setStatusFilter(PROJECT_STATUS_TABS[nextIdx].id);
  };

  return (
    <div className="relative rounded-2xl bg-charcoal-900/90 border border-gold-500/20 shadow-lg p-2 backdrop-blur-md">
      {/* Header bar with title and mobile swipe hint */}
      <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-white/5 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 text-gold-400">
          <Film className="w-3.5 h-3.5 text-gold-400" />
          <span className="font-bold uppercase tracking-wider text-white">Workflow Status Stages</span>
          <span className="text-zinc-500 hidden sm:inline">({PROJECT_STATUS_TABS.length} stages)</span>
        </div>

        {/* Mobile Swipe Guidance Pill */}
        <div className="flex items-center gap-1.5">
          <div className="flex md:hidden items-center gap-1 px-2 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-300 text-[10px] font-mono">
            <MoveHorizontal className="w-3 h-3 text-gold-400 animate-pulse" />
            <span>Swipe ⟷ or hold icon</span>
          </div>

          {/* Quick step arrows */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Previous Stage"
              aria-label="Previous Stage"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] text-zinc-500 font-mono px-1">
              {safeIndex + 1}/{PROJECT_STATUS_TABS.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="Next Stage"
              aria-label="Next Stage"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Tabs Strip */}
      <div 
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto py-1 px-1 no-scrollbar select-none scroll-smooth"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {PROJECT_STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.id;
          const Icon = tab.icon;
          const count = counts[tab.id] || 0;

          return (
            <motion.button
              key={tab.id}
              ref={isActive ? activeTabRef : undefined}
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => handleTabClick(tab.id)}
              onTouchStart={(e) => handleTouchStart(tab, count, e)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={(e) => handleMouseDown(tab, count, e)}
              onMouseUp={handleMouseUp}
              onMouseLeave={clearLongPressTimer}
              onContextMenu={(e) => {
                if (isLongPressTriggeredRef.current) {
                  e.preventDefault();
                }
              }}
              title={`${tab.label} (${count} films)`}
              aria-label={tab.label}
              className={`group relative flex items-center justify-center shrink-0 transition-all cursor-pointer rounded-2xl touch-manipulation ${
                /* Mobile: 48px x 48px touch target icon-only button; Desktop: expanded pill with text */
                'w-12 h-12 min-w-[48px] min-h-[48px] sm:w-auto sm:h-auto sm:min-w-0 sm:min-h-0 sm:px-3.5 sm:py-2 sm:rounded-xl'
              } ${
                isActive
                  ? `${tab.activeBgClass} ring-2 ring-gold-400/50 shadow-lg shadow-gold-500/20`
                  : 'bg-charcoal-950/80 text-zinc-400 hover:text-white border border-white/10 hover:border-gold-500/40 hover:bg-charcoal-950 active:bg-white/10'
              }`}
            >
              {/* Lucide Icon: 20px on mobile for optimal visual clarity, 14px on desktop */}
              <Icon 
                className={`w-5 h-5 sm:w-3.5 sm:h-3.5 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-charcoal-950' : tab.colorClass
                }`} 
              />
              
              {/* Desktop Only Text Label (Hidden on mobile for icon-only bar) */}
              <span className="hidden sm:inline font-sans text-xs font-bold whitespace-nowrap ml-1.5">
                {tab.label}
              </span>

              {/* Numerical Count Badge: Floating top-right chip on mobile, inline badge on desktop */}
              <span 
                className={`transition-colors font-mono font-black ${
                  /* Mobile badge: floating top-right badge */
                  'absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 text-[9px] rounded-full flex items-center justify-center shadow-md'
                } ${
                  /* Desktop badge: inline pill */
                  'sm:static sm:top-auto sm:right-auto sm:min-w-0 sm:h-auto sm:text-[10px] sm:px-1.5 sm:py-0.5 sm:rounded-md sm:ml-1.5'
                } ${
                  isActive
                    ? 'bg-charcoal-950 text-gold-300 ring-1 ring-gold-400/60'
                    : 'bg-charcoal-900/95 text-zinc-300 border border-white/15 group-hover:border-gold-500/40 group-hover:text-gold-300'
                }`}
              >
                {count}
              </span>

              {/* Active Indicator Underline for Desktop */}
              {isActive && (
                <motion.div
                  layoutId="activeStatusTabGlow"
                  className="hidden sm:block absolute -bottom-1 left-3 right-3 h-0.5 bg-gold-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Floating Long-Press Tooltip Popover */}
      <AnimatePresence>
        {activeTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.84 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.88 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              left: `${activeTooltip.x}px`,
              top: `${activeTooltip.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="z-[150] pointer-events-none flex flex-col items-center select-none"
          >
            <div className="bg-charcoal-950/98 border border-gold-500/60 shadow-2xl shadow-black/95 px-3 py-1.5 rounded-xl flex items-center gap-2 backdrop-blur-xl ring-1 ring-white/15">
              <activeTooltip.icon className={`w-4 h-4 shrink-0 ${activeTooltip.colorClass}`} />
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold font-sans text-white tracking-wide whitespace-nowrap">
                  {activeTooltip.label}
                </span>
                <span className="text-[10px] font-mono font-black text-gold-300 bg-gold-500/20 px-1.5 py-0.5 rounded-md border border-gold-500/30">
                  {activeTooltip.count}
                </span>
              </div>
            </div>
            {/* Tooltip downward arrow */}
            <div className="w-0 h-0 border-x-[6px] border-x-transparent border-t-[6px] border-t-gold-500/60" />
            <div className="w-0 h-0 border-x-[5px] border-x-transparent border-t-[5px] border-t-charcoal-950 -mt-[7px]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile-Only Active Stage Clarity Strip (Explains current active icon clearly) */}
      <div className="sm:hidden mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2 px-1 text-xs font-mono">
        <div className="flex items-center gap-2 min-w-0">
          {(() => {
            const currentTab = PROJECT_STATUS_TABS[safeIndex];
            const CurrentIcon = currentTab.icon;
            const currentCount = counts[currentTab.id] || 0;
            return (
              <>
                <div className={`p-1.5 rounded-lg ${currentTab.activeBgClass} shrink-0`}>
                  <CurrentIcon className="w-3.5 h-3.5 text-charcoal-950" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white truncate text-xs font-sans">
                      {currentTab.label}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-black bg-gold-500/20 text-gold-300 border border-gold-500/30 shrink-0">
                      {currentCount}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block font-mono">
                    Stage {safeIndex + 1} of {PROJECT_STATUS_TABS.length}
                  </span>
                </div>
              </>
            );
          })()}
        </div>

        <div className="text-[10px] text-gold-400 font-mono flex items-center gap-1 shrink-0 bg-gold-500/10 px-2 py-1 rounded-lg border border-gold-500/20">
          <MoveHorizontal className="w-3 h-3 text-gold-400 animate-pulse" />
          <span>Swipe ⟷</span>
        </div>
      </div>
    </div>
  );
};
export default ProjectStatusTabsStrip;
