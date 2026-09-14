import React, { useState, useRef, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Film, 
  Layers, 
  Eye, 
  RotateCcw, 
  Sparkles, 
  Archive, 
  DownloadCloud, 
  FolderOpen,
  Check, 
  ChevronDown,
  Activity,
  Scissors
} from 'lucide-react';
import { ProjectStatus } from '../../types';

export interface ProjectStatusConfig {
  id: ProjectStatus;
  label: string;
  shortLabel: string;
  badgeStyle: string;
  dotColor: string;
  glowColor: string;
  textColor: string;
  borderColor: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const PROJECT_STATUS_MAP: Record<string, ProjectStatusConfig> = {
  data_received: {
    id: 'data_received',
    label: 'Data Received',
    shortLabel: 'Data Received',
    badgeStyle: 'status-badge-data_received border shadow-sm',
    dotColor: 'status-dot-data_received',
    glowColor: 'shadow-sky-500/15',
    textColor: 'text-sky-300',
    borderColor: 'border-sky-400/40',
    bgColor: 'bg-sky-500/15',
    icon: FolderOpen,
    description: 'Raw footage & audio drives ingested and verified'
  },
  received: {
    id: 'data_received',
    label: 'Data Received',
    shortLabel: 'Data Received',
    badgeStyle: 'status-badge-data_received border shadow-sm',
    dotColor: 'status-dot-data_received',
    glowColor: 'shadow-sky-500/15',
    textColor: 'text-sky-300',
    borderColor: 'border-sky-400/40',
    bgColor: 'bg-sky-500/15',
    icon: FolderOpen,
    description: 'Raw footage & audio drives ingested and verified'
  },
  assigned: {
    id: 'assigned',
    label: 'Assigned',
    shortLabel: 'Assigned',
    badgeStyle: 'status-badge-assigned border shadow-sm',
    dotColor: 'status-dot-assigned',
    glowColor: 'shadow-indigo-500/15',
    textColor: 'text-indigo-300',
    borderColor: 'border-indigo-400/40',
    bgColor: 'bg-indigo-500/15',
    icon: Layers,
    description: 'Assigned to video editor queue'
  },
  editing: {
    id: 'editing',
    label: 'Editing',
    shortLabel: 'Editing',
    badgeStyle: 'status-badge-editing border shadow-sm',
    dotColor: 'status-dot-editing animate-pulse',
    glowColor: 'shadow-amber-500/20',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-400/45',
    bgColor: 'bg-amber-500/20',
    icon: Film,
    description: 'Active assembly, timeline editing & color grade'
  },
  in_progress: {
    id: 'editing',
    label: 'Editing',
    shortLabel: 'Editing',
    badgeStyle: 'status-badge-editing border shadow-sm',
    dotColor: 'status-dot-editing animate-pulse',
    glowColor: 'shadow-amber-500/20',
    textColor: 'text-amber-300',
    borderColor: 'border-amber-400/45',
    bgColor: 'bg-amber-500/20',
    icon: Film,
    description: 'Active assembly, timeline editing & color grade'
  },
  review: {
    id: 'review',
    label: 'Review',
    shortLabel: 'Review',
    badgeStyle: 'status-badge-review border shadow-sm',
    dotColor: 'status-dot-review',
    glowColor: 'shadow-purple-500/15',
    textColor: 'text-purple-300',
    borderColor: 'border-purple-400/40',
    bgColor: 'bg-purple-500/15',
    icon: Eye,
    description: 'Internal QC evaluation & client preview draft'
  },
  revision: {
    id: 'revision',
    label: 'Revision',
    shortLabel: 'Revision',
    badgeStyle: 'status-badge-revision border shadow-sm',
    dotColor: 'status-dot-revision animate-pulse',
    glowColor: 'shadow-rose-500/15',
    textColor: 'text-rose-300',
    borderColor: 'border-rose-400/40',
    bgColor: 'bg-rose-500/15',
    icon: RotateCcw,
    description: 'Incorporating client timestamped revision notes'
  },
  rendering: {
    id: 'rendering',
    label: 'Rendering',
    shortLabel: 'Rendering',
    badgeStyle: 'status-badge-rendering border shadow-sm',
    dotColor: 'status-dot-rendering animate-pulse',
    glowColor: 'shadow-teal-500/15',
    textColor: 'text-teal-300',
    borderColor: 'border-teal-400/40',
    bgColor: 'bg-teal-500/15',
    icon: Sparkles,
    description: 'Exporting 4K master ProRes / H.264 deliverables'
  },
  delivered: {
    id: 'delivered',
    label: 'Delivered',
    shortLabel: 'Delivered',
    badgeStyle: 'status-badge-delivered border shadow-sm',
    dotColor: 'status-dot-delivered',
    glowColor: 'shadow-emerald-500/20',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-400/45',
    bgColor: 'bg-emerald-500/20',
    icon: CheckCircle2,
    description: 'Master deliverables transmitted & approved'
  },
  completed: {
    id: 'delivered',
    label: 'Delivered',
    shortLabel: 'Delivered',
    badgeStyle: 'status-badge-delivered border shadow-sm',
    dotColor: 'status-dot-delivered',
    glowColor: 'shadow-emerald-500/20',
    textColor: 'text-emerald-300',
    borderColor: 'border-emerald-400/45',
    bgColor: 'bg-emerald-500/20',
    icon: CheckCircle2,
    description: 'Film completed and delivered successfully'
  },
  closed: {
    id: 'closed',
    label: 'Closed',
    shortLabel: 'Closed',
    badgeStyle: 'status-badge-closed border shadow-sm',
    dotColor: 'status-dot-closed',
    glowColor: 'shadow-slate-500/10',
    textColor: 'text-slate-300',
    borderColor: 'border-slate-600/45',
    bgColor: 'bg-slate-800/80',
    icon: Archive,
    description: 'Project finalized, all payments settled and cold storage backed up'
  }
};

export const WORKFLOW_STAGES: { id: ProjectStatus; label: string; color: string; bg: string }[] = [
  { id: 'data_received', label: 'Data Received', color: 'text-sky-300', bg: 'status-badge-data_received border-sky-400/40' },
  { id: 'assigned', label: 'Assigned', color: 'text-indigo-300', bg: 'status-badge-assigned border-indigo-400/40' },
  { id: 'editing', label: 'Editing', color: 'text-amber-300', bg: 'status-badge-editing border-amber-400/45' },
  { id: 'review', label: 'Review', color: 'text-purple-300', bg: 'status-badge-review border-purple-400/40' },
  { id: 'revision', label: 'Revision', color: 'text-rose-300', bg: 'status-badge-revision border-rose-400/40' },
  { id: 'rendering', label: 'Rendering', color: 'text-teal-300', bg: 'status-badge-rendering border-teal-400/40' },
  { id: 'delivered', label: 'Delivered', color: 'text-emerald-300', bg: 'status-badge-delivered border-emerald-400/45' },
  { id: 'closed', label: 'Closed', color: 'text-slate-300', bg: 'status-badge-closed border-slate-600/45' }
];

export const getProjectStatusConfig = (status?: string): ProjectStatusConfig => {
  if (!status) {
    return PROJECT_STATUS_MAP['data_received'];
  }
  const normalized = status.toLowerCase().trim().replace(/ /g, '_');
  if (PROJECT_STATUS_MAP[normalized]) {
    return PROJECT_STATUS_MAP[normalized];
  }
  
  // Generic Fallback
  return {
    id: 'data_received',
    label: status.replace(/_/g, ' ').toUpperCase(),
    shortLabel: status.slice(0, 10),
    badgeStyle: 'bg-gray-500/15 text-gray-300 border-gray-500/30',
    dotColor: 'bg-gray-400',
    glowColor: 'shadow-gray-500/10',
    textColor: 'text-gray-300',
    borderColor: 'border-gray-500/30',
    bgColor: 'bg-gray-500/15',
    icon: Activity,
    description: status
  };
};

interface ProjectStatusBadgeProps {
  status: string;
  size?: 'xs' | 'sm' | 'md';
  variant?: 'pill' | 'subtle' | 'compact' | 'interactive';
  showIcon?: boolean;
  showDot?: boolean;
  useShortLabel?: boolean;
  className?: string;
  onStatusChange?: (newStatus: ProjectStatus) => void | Promise<void>;
  disabled?: boolean;
}

export default function ProjectStatusBadge({
  status,
  size = 'sm',
  variant = 'pill',
  showIcon = true,
  showDot = true,
  useShortLabel = false,
  className = '',
  onStatusChange,
  disabled = false
}: ProjectStatusBadgeProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const config = getProjectStatusConfig(status);
  const Icon = config.icon;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px] space-x-1 rounded-lg',
    sm: 'px-2.5 py-1 text-xs space-x-1.5 rounded-xl',
    md: 'px-3.5 py-1.5 text-xs md:text-sm space-x-2 rounded-2xl'
  };

  const iconSizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5'
  };

  const dotSizes = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2'
  };

  const labelToRender = useShortLabel ? config.shortLabel : config.label;

  // Render Interactive Dropdown Mode
  if (onStatusChange && variant === 'interactive') {
    const ORDERED_STATUSES: ProjectStatus[] = [
      'data_received',
      'assigned',
      'editing',
      'review',
      'revision',
      'rendering',
      'delivered',
      'closed'
    ];

    return (
      <div className="relative inline-block" ref={dropdownRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            setIsDropdownOpen(!isDropdownOpen);
          }}
          className={`inline-flex items-center font-mono font-semibold border transition-all cursor-pointer select-none ${config.badgeStyle} ${sizeClasses[size]} ${className}`}
          title={`Status: ${config.label}. Click to change stage.`}
        >
          {showDot && (
            <span className={`rounded-full shrink-0 ${config.dotColor} ${dotSizes[size]}`} />
          )}
          {showIcon && <Icon className={`${iconSizes[size]} shrink-0`} />}
          <span className="truncate whitespace-nowrap">{labelToRender}</span>
          <ChevronDown className={`w-3 h-3 ml-0.5 shrink-0 opacity-70 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <div className="absolute left-0 top-full mt-1.5 w-48 rounded-2xl bg-[#091b15]/95 border border-gold-500/40 p-1.5 shadow-2xl backdrop-blur-xl z-50 space-y-1">
            <div className="px-2 py-1 text-[9px] font-mono uppercase tracking-wider text-gray-400 border-b border-white/10">
              Update Project Stage
            </div>
            {ORDERED_STATUSES.map((st) => {
              const itemCfg = PROJECT_STATUS_MAP[st];
              const ItemIcon = itemCfg.icon;
              const isSelected = itemCfg.id === config.id;

              return (
                <button
                  key={st}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange(st);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gold-500/20 text-gold-300 font-bold border border-gold-500/40'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${itemCfg.dotColor}`} />
                    <ItemIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{itemCfg.label}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-gold-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Render Subtle Pill (borderless or minimalist for dense rows)
  if (variant === 'subtle') {
    return (
      <span 
        className={`inline-flex items-center font-mono font-medium ${config.textColor} ${sizeClasses[size]} ${className}`}
        title={config.description}
      >
        {showDot && (
          <span className={`rounded-full shrink-0 mr-1.5 ${config.dotColor} ${dotSizes[size]}`} />
        )}
        {showIcon && <Icon className={`${iconSizes[size]} shrink-0 mr-1`} />}
        <span className="truncate whitespace-nowrap">{labelToRender}</span>
      </span>
    );
  }

  // Render Compact / Default Full Pill
  return (
    <span
      className={`inline-flex items-center font-mono font-semibold border transition-all ${config.badgeStyle} ${sizeClasses[size]} ${className}`}
      title={config.description}
    >
      {showDot && (
        <span className={`rounded-full shrink-0 ${config.dotColor} ${dotSizes[size]}`} />
      )}
      {showIcon && <Icon className={`${iconSizes[size]} shrink-0`} />}
      <span className="truncate whitespace-nowrap">{labelToRender}</span>
    </span>
  );
}
