import React from 'react';
import { ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PROJECT_STATUS_TABS } from './ProjectStatusTabsStrip';
import { Project } from '../../types';

interface MobileStatusSwipeNavigatorProps {
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  projects: Project[];
  swipeFeedback?: { label: string; count: number; direction: 'next' | 'prev' } | null;
}

export const MobileStatusSwipeNavigator: React.FC<MobileStatusSwipeNavigatorProps> = ({
  statusFilter,
  setStatusFilter,
  projects,
  swipeFeedback
}) => {
  const currentIndex = PROJECT_STATUS_TABS.findIndex(t => t.id === statusFilter);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const currentTab = PROJECT_STATUS_TABS[safeIndex];

  // Count for current status
  const currentCount = React.useMemo(() => {
    if (currentTab.id === 'all') return projects.length;
    return projects.filter(p => p.status === currentTab.id).length;
  }, [projects, currentTab.id]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = safeIndex > 0 ? safeIndex - 1 : PROJECT_STATUS_TABS.length - 1;
    setStatusFilter(PROJECT_STATUS_TABS[nextIdx].id);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch (_) {}
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIdx = safeIndex < PROJECT_STATUS_TABS.length - 1 ? safeIndex + 1 : 0;
    setStatusFilter(PROJECT_STATUS_TABS[nextIdx].id);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(10); } catch (_) {}
    }
  };

  const CurrentIcon = currentTab.icon;

  return (
    <>
      {/* 1. Transient Swipe Toast HUD (Flashes on screen when user swipes) */}
      <AnimatePresence>
        {swipeFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none md:hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-charcoal-950/95 border border-gold-500/60 text-white shadow-2xl backdrop-blur-xl ring-2 ring-gold-500/20">
              {swipeFeedback.direction === 'prev' ? (
                <ChevronLeft className="w-4 h-4 text-gold-400 animate-pulse" />
              ) : null}
              <div className="text-center">
                <span className="text-[10px] uppercase font-mono text-gold-400 block tracking-wider font-bold">
                  {swipeFeedback.direction === 'prev' ? 'Previous Stage' : 'Next Stage'}
                </span>
                <span className="text-xs font-bold text-white font-sans">
                  {swipeFeedback.label} ({swipeFeedback.count})
                </span>
              </div>
              {swipeFeedback.direction === 'next' ? (
                <ChevronRight className="w-4 h-4 text-gold-400 animate-pulse" />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Floating Mobile Status Dock (Sticky near bottom of mobile viewport) */}
      <div className="fixed bottom-4 left-0 right-0 z-30 md:hidden flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-charcoal-950/90 border border-gold-500/35 shadow-2xl backdrop-blur-xl p-2 flex flex-col gap-1.5 ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-2">
            
            {/* Prev Stage Button */}
            <button
              type="button"
              onClick={handlePrev}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/15 active:scale-90 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono transition-all shrink-0 min-h-[44px] min-w-[56px] cursor-pointer"
              title="Previous status tab"
              aria-label="Previous status tab"
            >
              <ChevronLeft className="w-4 h-4 text-gold-400" />
              <span className="font-bold">Prev</span>
            </button>

            {/* Active Status Badge in Center */}
            <div className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-charcoal-900/90 border border-gold-500/30 text-center min-w-0 min-h-[44px]">
              <CurrentIcon className={`w-4 h-4 shrink-0 ${currentTab.colorClass}`} />
              <span className="text-xs font-bold text-white truncate font-sans">
                {currentTab.label}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-gold-500/20 text-gold-300 font-black border border-gold-500/30 shrink-0">
                {currentCount}
              </span>
            </div>

            {/* Next Stage Button */}
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/15 active:scale-90 text-zinc-300 hover:text-white border border-white/10 text-xs font-mono transition-all shrink-0 min-h-[44px] min-w-[56px] cursor-pointer"
              title="Next status tab"
              aria-label="Next status tab"
            >
              <span className="font-bold">Next</span>
              <ChevronRight className="w-4 h-4 text-gold-400" />
            </button>
          </div>

          {/* Dots Indicator + Swipe Hint */}
          <div className="flex items-center justify-between px-2 pt-0.5 text-[9px] font-mono text-zinc-400">
            <div className="flex items-center gap-1">
              <MoveHorizontal className="w-2.5 h-2.5 text-gold-400" />
              <span>Swipe left / right anywhere</span>
            </div>
            
            {/* 9 Stage Dots */}
            <div className="flex items-center gap-1">
              {PROJECT_STATUS_TABS.map((tab, idx) => (
                <span
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === safeIndex 
                      ? 'w-3.5 bg-gold-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]' 
                      : 'w-1.5 bg-zinc-600 hover:bg-zinc-400'
                  }`}
                  title={tab.label}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
export default MobileStatusSwipeNavigator;
