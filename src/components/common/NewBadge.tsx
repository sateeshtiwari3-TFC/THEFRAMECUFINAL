import React from 'react';
import { MS_PER_DAY } from '../../utils';

interface NewBadgeProps {
  /**
   * Release date in ISO string format (e.g., '2026-09-13' or '2026-09-12T20:00:00Z').
   */
  releaseDate: string;
  /**
   * Number of days the badge should remain visible. Defaults to 10 days.
   */
  daysThreshold?: number;
  /**
   * Optional custom styling or position adjustments.
   */
  className?: string;
  /**
   * Badge size: 'xs' (compact inline), 'sm' (standard pill), 'dot' (mini dot indicator)
   */
  size?: 'xs' | 'sm' | 'dot';
  /**
   * Optional custom label, defaults to 'NEW'
   */
  label?: string;
}

/**
 * Checks whether a feature release date is within the specified active window (default: 10 days).
 * Once 10 days have elapsed from the release date, this automatically returns false.
 */
export function isFeatureNew(releaseDate: string, daysThreshold: number = 10): boolean {
  if (!releaseDate) return false;
  try {
    const releaseTime = new Date(releaseDate).getTime();
    if (isNaN(releaseTime)) return false;

    const currentTime = Date.now();
    const diffMs = currentTime - releaseTime;
    const diffDays = diffMs / MS_PER_DAY;

    // Visible from release day until `daysThreshold` days after release (e.g., 10 days)
    return diffDays >= 0 && diffDays <= daysThreshold;
  } catch {
    return false;
  }
}

/**
 * Visual Red 'NEW' Badge for newly added features.
 * Automatically disappears after 10 days based on the release date.
 */
export const NewBadge: React.FC<NewBadgeProps> = ({
  releaseDate,
  daysThreshold = 10,
  className = '',
  size = 'xs',
  label = 'NEW',
}) => {
  const isNew = isFeatureNew(releaseDate, daysThreshold);

  if (!isNew) {
    return null; // Automatically disappears after 10 days
  }

  if (size === 'dot') {
    return (
      <span
        title="Newly added feature (< 10 days old)"
        className={`inline-flex items-center justify-center relative ${className}`}
      >
        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
      </span>
    );
  }

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.2 font-black tracking-wider uppercase rounded-md shadow-sm',
    sm: 'text-[10px] px-2 py-0.5 font-black tracking-wider uppercase rounded-lg shadow-md',
  }[size];

  return (
    <span
      title="Newly added feature (auto-expires after 10 days)"
      className={`inline-flex items-center gap-1 font-mono bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white border border-red-400/60 shadow-[0_0_10px_rgba(239,68,68,0.45)] select-none animate-pulse ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-ping" />
      <span>{label}</span>
    </span>
  );
};

export default NewBadge;
