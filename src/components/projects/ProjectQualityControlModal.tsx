import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  Volume2, 
  Palette, 
  Film, 
  Smartphone, 
  FileCheck, 
  UserCheck, 
  RotateCcw,
  Check,
  Clock,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, QcCheckItem, UserRole } from '../../types';

interface ProjectQualityControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  userRole: UserRole;
  currentUserName?: string;
}

export const DEFAULT_QC_ITEMS: QcCheckItem[] = [
  {
    id: 'qc-meta',
    category: 'metadata',
    label: 'Couple Names, Date & Title Typography',
    description: 'Verify exact spelling of Bride & Groom names on teaser/film intro, correct wedding date, and studio logo watermark.',
    checked: false
  },
  {
    id: 'qc-audio',
    category: 'audio',
    label: 'Audio Loudness & Mastering (-14 LUFS)',
    description: 'Dialogue balanced clearly above background music, zero peak audio clipping/distortion, clean ambience noise reduction.',
    checked: false
  },
  {
    id: 'qc-color',
    category: 'color',
    label: 'Color Grade & Skin Tone Fidelity',
    description: 'Natural Indian skin tones in Rec.709 color gamut, zero crushed black shadow clipping, highlights preserved on wedding dress/sherwani.',
    checked: false
  },
  {
    id: 'qc-edit',
    category: 'editorial',
    label: 'Editorial Continuity & Lip-Sync Lock',
    description: 'Zero accidental black frames or visual glitches, seamless music cuts, and tight sync on couple vows, laughs, and ceremony speeches.',
    checked: false
  },
  {
    id: 'qc-aspect',
    category: 'editorial',
    label: 'Aspect Ratio & Social Safe Zones',
    description: 'Vertical 9:16 Instagram Reels text & action stay within safe zones (no UI overlap), Cinematic Teaser in crisp 16:9.',
    checked: false
  },
  {
    id: 'qc-export',
    category: 'export',
    label: 'Master Export Codec & File Integrity',
    description: 'Master ProRes / H.264 high-bitrate export verified with no corrupted render blocks, proper file naming, and full duration intact.',
    checked: false
  }
];

export const ProjectQualityControlModal: React.FC<ProjectQualityControlModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  userRole,
  currentUserName = 'Studio Lead'
}) => {
  const [items, setItems] = useState<QcCheckItem[]>(DEFAULT_QC_ITEMS);
  const [notes, setNotes] = useState('');
  const [inspector, setInspector] = useState(currentUserName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (project) {
      if (project.qcItems && project.qcItems.length > 0) {
        setItems(project.qcItems);
      } else {
        setItems(DEFAULT_QC_ITEMS.map(i => ({ ...i, checked: project.qcStatus === 'passed' })));
      }
      setNotes(project.qcNotes || '');
      setInspector(project.qcCheckedBy || currentUserName);
    }
  }, [project, currentUserName]);

  if (!isOpen || !project) return null;

  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
  const allPassed = checkedCount === totalCount && totalCount > 0;

  const handleToggleItem = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const handleCheckAll = (checkedState: boolean) => {
    setItems(prev => prev.map(item => ({ ...item, checked: checkedState })));
  };

  const handleSaveQc = async (finalStatus?: 'passed' | 'revision_needed' | 'in_progress') => {
    if (!project) return;
    setIsSaving(true);
    try {
      const determinedStatus = finalStatus || (allPassed ? 'passed' : checkedCount > 0 ? 'in_progress' : 'pending');
      const nowIso = new Date().toISOString();

      await onUpdateProject(project.id, {
        qcStatus: determinedStatus,
        qcScore: checkedCount,
        qcTotal: totalCount,
        qcItems: items,
        qcNotes: notes.trim(),
        qcCheckedBy: inspector.trim() || currentUserName,
        qcCheckedAt: nowIso
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error saving QC checklist:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'audio':
        return <Volume2 className="w-4 h-4 text-emerald-400" />;
      case 'color':
        return <Palette className="w-4 h-4 text-purple-400" />;
      case 'metadata':
        return <FileCheck className="w-4 h-4 text-gold-400" />;
      case 'export':
        return <Sparkles className="w-4 h-4 text-amber-400" />;
      default:
        return <Film className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-2xl bg-charcoal-900 border border-gold-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Top Header */}
        <div className="p-6 bg-gradient-to-r from-luxury-green-950/70 via-charcoal-900 to-black/80 border-b border-white/10 relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-gold-500/20 text-gold-300 border border-gold-500/30 flex items-center gap-1 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
                  <span>SAP QM Gatekeeper</span>
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

              <h2 className="text-xl font-bold text-white font-display">
                Quality Control (QC) Checklist
              </h2>
              <p className="text-xs text-gray-300 mt-1 font-mono">
                Project: <span className="text-gold-300 font-bold">{project.coupleName || project.projectName}</span> ({project.id})
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-gray-300">
                Quality Score: <strong className="text-gold-400">{checkedCount} / {totalCount} Passed</strong>
              </span>
              <span className={`font-bold ${progressPct === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {progressPct}% Ready
              </span>
            </div>
            <div className="w-full h-2 bg-charcoal-950 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all duration-300 ${
                  progressPct === 100 
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                    : 'bg-gradient-to-r from-gold-500 to-amber-400'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Checklist Content (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
              6-Point Luxury Master Inspection
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCheckAll(true)}
                className="text-[10px] font-mono text-gold-400 hover:text-gold-300 underline cursor-pointer"
              >
                Pass All
              </button>
              <span className="text-gray-600">•</span>
              <button
                type="button"
                onClick={() => handleCheckAll(false)}
                className="text-[10px] font-mono text-gray-400 hover:text-gray-300 underline cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {items.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => handleToggleItem(item.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                item.checked
                  ? 'bg-emerald-950/25 border-emerald-500/40 shadow-sm'
                  : 'bg-charcoal-950/60 border-white/5 hover:border-gold-500/20'
              }`}
            >
              {/* Checkbox Icon */}
              <div className={`w-6 h-6 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                item.checked
                  ? 'bg-emerald-500 border-emerald-400 text-charcoal-950 font-bold'
                  : 'border-white/20 bg-charcoal-900 text-transparent'
              }`}>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="shrink-0">{getCategoryIcon(item.category)}</span>
                  <span className={`text-xs font-semibold ${item.checked ? 'text-white' : 'text-gray-200'}`}>
                    {idx + 1}. {item.label}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                  {item.description}
                </p>
              </div>
            </div>
          ))}

          {/* Notes & Inspector */}
          <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                  Inspected By (Lead/QC Officer)
                </label>
                <input
                  type="text"
                  value={inspector}
                  onChange={(e) => setInspector(e.target.value)}
                  className="w-full bg-charcoal-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-gold-500/40 font-mono"
                  placeholder="e.g. Satish / Lead QC"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                  Last Inspected
                </label>
                <div className="w-full bg-charcoal-950/60 border border-white/5 rounded-xl px-3 py-1.5 text-xs text-gray-400 font-mono">
                  {project.qcCheckedAt ? new Date(project.qcCheckedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Never inspected'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">
                QC Feedback & Revision Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes: e.g. Audio ducking adjusted on vows; bride name spelling re-checked with wedding invite."
                className="w-full bg-charcoal-950 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/40 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-charcoal-950 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveQc('revision_needed')}
              className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 hover:text-rose-200 font-mono text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Flag Revision</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveQc('passed')}
              className={`px-4 py-2 font-mono font-bold text-xs rounded-xl transition-all shadow-lg flex items-center gap-1.5 cursor-pointer ${
                allPassed
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-charcoal-950 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-gold-500 to-amber-500 hover:from-gold-400 hover:to-amber-400 text-charcoal-950 shadow-gold-500/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : saveSuccess ? 'Approved ✓' : allPassed ? 'Certify & Pass QC ✓' : 'Save QC Report'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProjectQualityControlModal;
