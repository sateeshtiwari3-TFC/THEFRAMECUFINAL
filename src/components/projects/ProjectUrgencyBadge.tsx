import React from 'react';
import { 
  AlertTriangle, 
  Flame, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Check, 
  HelpCircle 
} from 'lucide-react';
import { ProjectStatus } from '../../types';
import { MS_PER_DAY } from '../../utils';

export type UrgencyLevel = 
  | 'overdue' 
  | 'due_today' 
  | 'critical' 
  | 'moderate' 
  | 'normal' 
  | 'relaxed' 
  | 'delivered' 
  | 'none';

export interface UrgencyInfo {
  daysRemaining: number | null;
  urgencyLevel: UrgencyLevel;
  label: string;
  detailedLabel: string;
  badgeClass: string;
  dotClass: string;
  iconColorClass: string;
  glowClass: string;
  icon: React.ComponentType<{ className?: string }>;
  formattedDate: string;
}

/**
 * Calculates urgency information based on the delivery date and project status.
 * Handles YYYY-MM-DD strings and ISO timestamps accurately relative to local calendar day.
 */
export function calculateUrgency(deliveryDate?: string | null, status?: ProjectStatus | string): UrgencyInfo {
  // If project is already delivered or closed, urgency is completed
  if (status === 'delivered' || status === 'closed') {
    return {
      daysRemaining: null,
      urgencyLevel: 'delivered',
      label: 'Delivered',
      detailedLabel: 'Project delivered & completed',
      badgeClass: 'bg-emerald-500/10 text-emerald-300/90 border-emerald-500/25',
      dotClass: 'bg-emerald-400/80',
      iconColorClass: 'text-emerald-400',
      glowClass: 'shadow-emerald-500/10',
      icon: Check,
      formattedDate: deliveryDate ? formatDeliveryDate(deliveryDate) : 'Delivered',
    };
  }

  // If no delivery date specified
  if (!deliveryDate || deliveryDate.trim() === '') {
    return {
      daysRemaining: null,
      urgencyLevel: 'none',
      label: 'No Deadline',
      detailedLabel: 'Delivery deadline not scheduled',
      badgeClass: 'bg-charcoal-950/80 text-gray-400 border-white/10',
      dotClass: 'bg-gray-500',
      iconColorClass: 'text-gray-500',
      glowClass: '',
      icon: Calendar,
      formattedDate: 'Not Scheduled',
    };
  }

  // Parse delivery date safely to midnight local time
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let deliveryStart: number;
  const parts = deliveryDate.split(/[-T :]/);
  if (parts.length >= 3 && parts[0].length === 4) {
    deliveryStart = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
  } else {
    const parsed = new Date(deliveryDate);
    deliveryStart = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
  }

  const diffMs = deliveryStart - todayStart;
  const days = Math.round(diffMs / MS_PER_DAY);
  const formattedDate = formatDeliveryDate(deliveryDate);

  // Level 1: Overdue (< 0 days)
  if (days < 0) {
    const overdueDays = Math.abs(days);
    return {
      daysRemaining: days,
      urgencyLevel: 'overdue',
      label: `${overdueDays}d Overdue`,
      detailedLabel: `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'} (${formattedDate})`,
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse',
      dotClass: 'bg-rose-400',
      iconColorClass: 'text-rose-400',
      glowClass: 'shadow-rose-500/30',
      icon: AlertTriangle,
      formattedDate,
    };
  }

  // Level 2: Due Today (0 days)
  if (days === 0) {
    return {
      daysRemaining: 0,
      urgencyLevel: 'due_today',
      label: 'Due Today',
      detailedLabel: `Delivery deadline is today (${formattedDate})`,
      badgeClass: 'bg-red-500/25 text-red-200 border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.35)] animate-pulse',
      dotClass: 'bg-red-400',
      iconColorClass: 'text-red-400',
      glowClass: 'shadow-red-500/30',
      icon: Flame,
      formattedDate,
    };
  }

  // Level 3: Critical Urgency (1 to 2 days left)
  if (days <= 2) {
    return {
      daysRemaining: days,
      urgencyLevel: 'critical',
      label: `${days}d left`,
      detailedLabel: `Urgent: ${days} day${days === 1 ? '' : 's'} remaining (${formattedDate})`,
      badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.25)]',
      dotClass: 'bg-amber-400',
      iconColorClass: 'text-amber-400',
      glowClass: 'shadow-amber-500/20',
      icon: Clock,
      formattedDate,
    };
  }

  // Level 4: Moderate Urgency / Approaching (3 to 7 days left)
  if (days <= 7) {
    return {
      daysRemaining: days,
      urgencyLevel: 'moderate',
      label: `${days}d left`,
      detailedLabel: `Approaching deadline: ${days} days remaining (${formattedDate})`,
      badgeClass: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/40',
      dotClass: 'bg-yellow-400',
      iconColorClass: 'text-yellow-400',
      glowClass: 'shadow-yellow-500/10',
      icon: Clock,
      formattedDate,
    };
  }

  // Level 5: Normal / Standard Runway (8 to 14 days left)
  if (days <= 14) {
    return {
      daysRemaining: days,
      urgencyLevel: 'normal',
      label: `${days}d left`,
      detailedLabel: `On track: ${days} days remaining (${formattedDate})`,
      badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      dotClass: 'bg-sky-400',
      iconColorClass: 'text-sky-400',
      glowClass: 'shadow-sky-500/10',
      icon: Calendar,
      formattedDate,
    };
  }

  // Level 6: Relaxed / Ample Buffer (> 14 days left)
  return {
    daysRemaining: days,
    urgencyLevel: 'relaxed',
    label: `${days}d left`,
    detailedLabel: `Ample buffer: ${days} days remaining (${formattedDate})`,
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotClass: 'bg-emerald-400',
    iconColorClass: 'text-emerald-400',
    glowClass: 'shadow-emerald-500/10',
    icon: CheckCircle2,
    formattedDate,
  };
}

/**
 * Format date string into human-friendly format (e.g. 15 Oct 2026)
 */
function formatDeliveryDate(dateStr: string): string {
  try {
    const parts = dateStr.split(/[-T :]/);
    if (parts.length >= 3 && parts[0].length === 4) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

interface ProjectUrgencyBadgeProps {
  deliveryDate?: string | null;
  status?: ProjectStatus | string;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  showIcon?: boolean;
  showDateSubtext?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const ProjectUrgencyBadge: React.FC<ProjectUrgencyBadgeProps> = ({
  deliveryDate,
  status,
  size = 'sm',
  showDot = true,
  showIcon = true,
  showDateSubtext = false,
  className = '',
  onClick,
}) => {
  const urgency = calculateUrgency(deliveryDate, status);
  const IconComponent = urgency.icon;

  // Size configurations
  const sizeStyles = {
    xs: {
      container: 'px-2 py-0.5 text-[9px] gap-1 rounded-lg',
      icon: 'w-2.5 h-2.5',
      dot: 'w-1.5 h-1.5',
    },
    sm: {
      container: 'px-2.5 py-1 text-[10px] gap-1.5 rounded-xl',
      icon: 'w-3 h-3',
      dot: 'w-1.5 h-1.5',
    },
    md: {
      container: 'px-3 py-1.5 text-xs gap-2 rounded-xl',
      icon: 'w-3.5 h-3.5',
      dot: 'w-2 h-2',
    },
  }[size];

  return (
    <div
      title={urgency.detailedLabel}
      onClick={onClick}
      className={`inline-flex items-center font-mono font-bold border transition-all cursor-default select-none ${urgency.badgeClass} ${sizeStyles.container} ${className}`}
    >
      {/* Visual glowing status dot */}
      {showDot && (
        <span className="relative flex shrink-0 items-center justify-center">
          {(urgency.urgencyLevel === 'overdue' || urgency.urgencyLevel === 'due_today') && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${urgency.dotClass}`}
            />
          )}
          <span className={`relative inline-flex rounded-full ${sizeStyles.dot} ${urgency.dotClass}`} />
        </span>
      )}

      {/* Urgency Icon */}
      {showIcon && (
        <IconComponent className={`${sizeStyles.icon} ${urgency.iconColorClass} shrink-0`} />
      )}

      {/* Main Countdown or Status Label */}
      <span className="truncate whitespace-nowrap">{urgency.label}</span>

      {/* Optional Date Subtext */}
      {showDateSubtext && urgency.formattedDate && (
        <span className="text-[9px] opacity-75 font-normal ml-1">
          ({urgency.formattedDate})
        </span>
      )}
    </div>
  );
};

export default ProjectUrgencyBadge;
