import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trash2, Archive, Check } from 'lucide-react';

interface SwipeableCardProps {
  id: string;
  key?: React.Key;
  onSwipeLeft?: () => void | Promise<void>; // Delete
  onSwipeRight?: () => void | Promise<void>; // Archive
  onTap?: () => void;
  leftLabel?: string;
  rightLabel?: string;
  leftBgColor?: string;
  rightBgColor?: string;
  leftColor?: string;
  rightColor?: string;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  layout?: boolean | 'position' | 'size';
  layoutId?: string;
  transition?: any;
  enableCardDrag?: boolean;
}

export default function SwipeableCard({
  id,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  leftLabel = "Archive",
  rightLabel = "Delete",
  leftBgColor = "bg-emerald-950/40 border-emerald-500/20",
  rightBgColor = "bg-red-950/40 border-red-500/20",
  leftColor = "text-emerald-400",
  rightColor = "text-red-400",
  children,
  className = "",
  containerClassName = "",
  layout,
  layoutId,
  transition,
  enableCardDrag
}: SwipeableCardProps) {
  const [dragProgress, setDragProgress] = useState(0); // -1 to 1 representing left/right swipe progress
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // On touch/mobile devices, let view-level horizontal swipe gestures handle tab switching without card drag trapping touches
  const shouldDragCard = enableCardDrag !== undefined ? enableCardDrag : false;

  const swipeThreshold = 130;

  return (
    <motion.div
      layout={layout}
      layoutId={layoutId}
      transition={transition || {
        layout: { type: 'spring', stiffness: 350, damping: 30 },
        opacity: { duration: 0.2 }
      }}
      className={`relative overflow-hidden rounded-3xl ${containerClassName}`}
    >
      {/* Background Actions Layer (revealed only if card drag is enabled) */}
      {shouldDragCard && (
        <div className="absolute inset-0 z-0 flex items-center justify-between px-6 rounded-3xl select-none pointer-events-none">
          {/* Left Side Action (Visible when dragging Right) */}
          <div 
            className={`flex items-center space-x-2.5 py-2 px-4 rounded-xl border transition-all duration-200 ${leftBgColor} ${leftColor}`}
            style={{
              opacity: dragProgress > 0 ? Math.min(dragProgress * 1.5, 1) : 0,
              transform: `scale(${dragProgress > 0 ? 0.8 + dragProgress * 0.2 : 0.8})`,
            }}
          >
            <Archive className="w-4 h-4" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{leftLabel}</span>
          </div>

          {/* Right Side Action (Visible when dragging Left) */}
          <div 
            className={`flex items-center space-x-2.5 py-2 px-4 rounded-xl border transition-all duration-200 ${rightBgColor} ${rightColor}`}
            style={{
              opacity: dragProgress < 0 ? Math.min(Math.abs(dragProgress) * 1.5, 1) : 0,
              transform: `scale(${dragProgress < 0 ? 0.8 + Math.abs(dragProgress) * 0.2 : 0.8})`,
            }}
          >
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{rightLabel}</span>
            <Trash2 className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* Foreground Card */}
      <motion.div
        drag={shouldDragCard ? "x" : false}
        dragDirectionLock={shouldDragCard}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.6, right: 0.6 }}
        onDrag={(event, info) => {
          if (!shouldDragCard) return;
          const progress = info.offset.x / swipeThreshold;
          setDragProgress(Math.max(-1.2, Math.min(1.2, progress)));
        }}
        onDragEnd={async (event, info) => {
          if (!shouldDragCard) return;
          setDragProgress(0);
          if (info.offset.x > swipeThreshold && onSwipeRight) {
            await onSwipeRight();
          } else if (info.offset.x < -swipeThreshold && onSwipeLeft) {
            await onSwipeLeft();
          }
        }}
        onTap={() => {
          if (onTap) onTap();
        }}
        className={`relative z-10 select-none ${className}`}
        style={shouldDragCard ? { x: 0, touchAction: 'pan-y' } : undefined}
        whileTap={isTouch ? { scale: 0.985 } : undefined}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
