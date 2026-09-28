import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Film, 
  Download, 
  Play, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Share2, 
  ExternalLink, 
  Lock, 
  ShieldCheck, 
  MessageSquare, 
  Send, 
  Calendar, 
  MapPin, 
  User, 
  Users, 
  Scissors, 
  FileVideo, 
  FolderCheck, 
  ArrowRight, 
  ChevronRight, 
  Copy, 
  Check, 
  LogOut, 
  Eye, 
  Heart, 
  Camera,
  AlertCircle,
  HelpCircle,
  X,
  Layers,
  HardDrive
} from 'lucide-react';
import { Project, Studio, Editor, Revision, ProjectDeliverableItem } from '../types';
import Logo from './Logo';

interface ClientPreviewViewProps {
  projectId: string;
  project?: Project | null;
  projects?: Project[];
  studios?: Studio[];
  editors?: Editor[];
  revisions?: Revision[];
  onAddRevision?: (revision: Omit<Revision, 'id' | 'createdAt'>) => Promise<void>;
  onExit: () => void;
  isStaffViewing?: boolean;
}

export default function ClientPreviewView({
  projectId,
  project,
  projects = [],
  studios = [],
  editors = [],
  revisions = [],
  onAddRevision,
  onExit,
  isStaffViewing = false
}: ClientPreviewViewProps) {
  // Find project if not directly passed
  const currentProject = project || projects.find(p => 
    p.id?.toLowerCase() === projectId?.toLowerCase() ||
    p.projectName?.toLowerCase() === projectId?.toLowerCase()
  );

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  
  // Feedback / Revision Modal State
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionDeliverable, setRevisionDeliverable] = useState('Cinematic Highlight Film (4K)');
  const [revisionTimestamp, setRevisionTimestamp] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [revisionClientName, setRevisionClientName] = useState('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);
  const [revisionSuccess, setRevisionSuccess] = useState(false);

  // Compliment Modal State
  const [isComplimentModalOpen, setIsComplimentModalOpen] = useState(false);
  const [complimentText, setComplimentText] = useState('');
  const [complimentSent, setComplimentSent] = useState(false);

  // Video Preview Modal State
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewVideoTitle, setPreviewVideoTitle] = useState<string>('');

  // Find Studio & Editor
  const studio = studios.find(s => s.id === currentProject?.studioId);
  const leadEditor = editors.find(e => e.id === currentProject?.assignedEditorId);
  const secondEditor = editors.find(e => e.id === currentProject?.secondEditorId);

  // Filter revisions for this project (clean, client-relevant only)
  const clientRevisions = revisions.filter(r => 
    r.projectId === currentProject?.id &&
    (!r.category || r.category === 'revision' || r.type === 'revision')
  );

  // Copy shareable link
  const handleCopyLink = () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}?preview=${encodeURIComponent(currentProject?.id || projectId)}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyId = () => {
    try {
      navigator.clipboard.writeText(currentProject?.id || projectId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  // Submit client revision
  const handleSubmitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNotes.trim() || !currentProject) return;

    setIsSubmittingRevision(true);
    try {
      if (onAddRevision) {
        const fullNotes = `[Client Feedback - ${revisionDeliverable}${revisionTimestamp ? ` @ ${revisionTimestamp}` : ''}]: ${revisionNotes.trim()}`;
        await onAddRevision({
          projectId: currentProject.id,
          notes: fullNotes,
          date: new Date().toISOString().split('T')[0],
          status: 'pending',
          type: 'revision',
          category: 'revision',
          projectCoupleName: currentProject.coupleName,
          studioName: currentProject.studioName,
          performedBy: revisionClientName.trim() || currentProject.coupleName || 'Client',
          performedByRole: 'client',
          isSystemGenerated: false
        });
      }
      setRevisionSuccess(true);
      setTimeout(() => {
        setRevisionSuccess(false);
        setIsRevisionModalOpen(false);
        setRevisionNotes('');
        setRevisionTimestamp('');
      }, 2000);
    } catch (err) {
      console.error("Error submitting revision:", err);
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  // Submit editor compliment
  const handleSubmitCompliment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complimentText.trim() || !currentProject) return;

    if (onAddRevision) {
      await onAddRevision({
        projectId: currentProject.id,
        notes: `💌 [Client Compliment for ${leadEditor?.name || 'Editor'}]: "${complimentText.trim()}"`,
        date: new Date().toISOString().split('T')[0],
        status: 'resolved',
        type: 'general',
        category: 'general',
        projectCoupleName: currentProject.coupleName,
        studioName: currentProject.studioName,
        performedBy: currentProject.coupleName || 'Client',
        performedByRole: 'client',
        isSystemGenerated: false
      });
    }
    setComplimentSent(true);
    setTimeout(() => {
      setComplimentSent(false);
      setIsComplimentModalOpen(false);
      setComplimentText('');
    }, 2000);
  };

  // If project not found
  if (!currentProject) {
    return (
      <div className="min-h-screen bg-charcoal-950 text-gray-200 flex flex-col justify-center items-center p-6 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-md w-full bg-black/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl text-center relative z-10 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-5 text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2 font-display">Project Not Found</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            We could not locate any active project matching ID <span className="text-gold-400 font-mono font-semibold">"{projectId}"</span>. Please verify your Project ID with your wedding studio.
          </p>
          <div className="space-y-3">
            <button
              onClick={onExit}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 text-black font-semibold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Back to Studio Access Portal</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Calculate Stage Progress ---
  const stages = [
    {
      id: 1,
      title: 'Footage Ingestion & Vault',
      subtitle: 'Raw 4K media verified & cloud-backed',
      icon: HardDrive,
      progressThreshold: 'data_received',
      isCompleted: ['assigned', 'editing', 'review', 'revision', 'rendering', 'delivered', 'closed'].includes(currentProject.status),
      isActive: currentProject.status === 'data_received'
    },
    {
      id: 2,
      title: 'Rough Cut & Story Assembly',
      subtitle: 'Emotion, narrative pacing & song sync',
      icon: Film,
      progressThreshold: 'editing',
      isCompleted: ['review', 'revision', 'rendering', 'delivered', 'closed'].includes(currentProject.status),
      isActive: currentProject.status === 'editing' || currentProject.status === 'assigned'
    },
    {
      id: 3,
      title: 'Cinematic Color & Audio Master',
      subtitle: 'Hollywood film LUTs & sound design',
      icon: Sparkles,
      progressThreshold: 'review',
      isCompleted: ['rendering', 'delivered', 'closed'].includes(currentProject.status),
      isActive: currentProject.status === 'review' || currentProject.status === 'revision'
    },
    {
      id: 4,
      title: 'Studio Quality Control (QC)',
      subtitle: 'Multi-screen playback & final polish',
      icon: ShieldCheck,
      progressThreshold: 'rendering',
      isCompleted: ['delivered', 'closed'].includes(currentProject.status),
      isActive: currentProject.status === 'rendering'
    },
    {
      id: 5,
      title: '4K Master Deliverables Ready',
      subtitle: 'High-speed cloud vault unlocked',
      icon: FolderCheck,
      progressThreshold: 'delivered',
      isCompleted: currentProject.status === 'delivered' || currentProject.status === 'closed',
      isActive: currentProject.status === 'delivered' || currentProject.status === 'closed'
    }
  ];

  // Numerical progress calculation
  const getOverallProgressPercentage = () => {
    switch (currentProject.status) {
      case 'data_received': return 20;
      case 'assigned': return 35;
      case 'editing': return 58;
      case 'review': return 75;
      case 'revision': return 82;
      case 'rendering': return 92;
      case 'delivered':
      case 'closed': return 100;
      default: return 30;
    }
  };

  const progressPercent = getOverallProgressPercentage();

  // Status human label & styling
  const getStatusDisplay = () => {
    switch (currentProject.status) {
      case 'data_received':
        return { label: 'Footage Ingested & Backed Up', color: 'from-blue-500/20 to-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'assigned':
        return { label: 'Assigned to Master Editor', color: 'from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40' };
      case 'editing':
        return { label: 'In Post-Production / Editing', color: 'from-indigo-500/20 to-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'review':
        return { label: 'Under Color Grading & Review', color: 'from-purple-500/20 to-pink-500/20 text-pink-300 border-pink-500/40' };
      case 'revision':
        return { label: 'Client Polish / Revisions in Progress', color: 'from-rose-500/20 to-amber-500/20 text-rose-300 border-rose-500/40' };
      case 'rendering':
        return { label: 'Final 4K Master Rendering', color: 'from-amber-500/20 to-emerald-500/20 text-amber-300 border-amber-500/40' };
      case 'delivered':
      case 'closed':
        return { label: 'Master 4K Deliverables Ready', color: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/40' };
      default:
        return { label: 'Production Active', color: 'from-gold-500/20 to-amber-500/20 text-gold-300 border-gold-500/40' };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Primary cloud drive download link
  const primaryDriveLink = currentProject.googleDriveLink || currentProject.cloudDriveLink || currentProject.deliveryFolder || currentProject.finalExportFolder;

  // Deliverables catalogue
  const isDeliveredOrReview = ['review', 'rendering', 'delivered', 'closed'].includes(currentProject.status);
  const isDelivered = currentProject.status === 'delivered' || currentProject.status === 'closed';

  // Standard deliverables list
  const defaultDeliverables = [
    {
      id: 'del-film',
      title: '4K Cinematic Wedding Film',
      subtitle: 'Complete feature-length cinematic montage with emotional narrative',
      category: 'film',
      format: '4K Ultra-HD 60fps (ProRes 422 / H.265 Master)',
      duration: '18 - 25 Mins',
      status: isDelivered ? 'ready' : isDeliveredOrReview ? 'processing' : 'queued',
      downloadUrl: primaryDriveLink,
      resolution: '3840 x 2160',
      badge: 'Main Feature'
    },
    {
      id: 'del-teaser',
      title: 'Cinematic Teaser Trailer',
      subtitle: 'High-energy cinematic preview crafted for social announcement',
      category: 'teaser',
      format: '4K UHD (Widescreen 2.39:1)',
      duration: '60 - 90 Secs',
      status: isDeliveredOrReview ? 'ready' : 'queued',
      downloadUrl: primaryDriveLink,
      resolution: '3840 x 2160',
      badge: 'Social Teaser'
    },
    {
      id: 'del-reels',
      title: 'Instagram Reels & Vertical Cuts',
      subtitle: 'Curated 9:16 vertical edits tailored for Instagram & YouTube Shorts',
      category: 'reel',
      format: 'Vertical 9:16 (1080 x 1920 HDR)',
      duration: '3x 30s-60s',
      status: isDeliveredOrReview ? 'ready' : 'queued',
      downloadUrl: primaryDriveLink,
      resolution: '1080 x 1920',
      badge: 'Instagram 9:16'
    },
    {
      id: 'del-rituals',
      title: 'Full Traditional Ceremony & Rituals',
      subtitle: 'Uncut documentary coverage of Phere, Varmala, and sacred rituals',
      category: 'raw',
      format: '1080p / 4K Multi-Cam Extended Cut',
      duration: '45 - 90 Mins',
      status: isDelivered ? 'ready' : 'queued',
      downloadUrl: primaryDriveLink,
      resolution: '1920 x 1080',
      badge: 'Extended Documentary'
    },
    {
      id: 'del-stills',
      title: 'Color-Graded 4K Film Stills',
      subtitle: 'Print-ready high-resolution digital master frame grabs (300 DPI)',
      category: 'stills',
      format: 'High-Res TIFF / JPEG (300 DPI)',
      duration: '25+ Master Frames',
      status: isDeliveredOrReview ? 'ready' : 'queued',
      downloadUrl: primaryDriveLink,
      resolution: '3840 x 2160',
      badge: 'Print Stills'
    }
  ];

  // Combined deliverables list with any custom ones attached to project
  const deliverables = currentProject.deliverableItems && currentProject.deliverableItems.length > 0
    ? currentProject.deliverableItems
    : defaultDeliverables;

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // WhatsApp Contact link
  const studioPhone = studio?.phone || '918889995988';
  const cleanPhone = studioPhone.replace(/[^0-9]/g, '');
  const whatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Hello ${studio?.name || currentProject.studioName} Team, I am viewing the wedding film preview for ${currentProject.coupleName} (Project ID: ${currentProject.id}). Could you provide a quick update?`
  )}`;

  return (
    <div className="min-h-screen bg-charcoal-950 text-gray-200 flex flex-col font-sans selection:bg-gold-500 selection:text-black">
      {/* Staff Preview Notice Banner if viewing from inside studio workspace */}
      {isStaffViewing && (
        <div className="bg-gradient-to-r from-amber-600 via-gold-600 to-amber-600 text-black px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>STUDIO PREVIEW SIMULATOR — You are seeing the exact read-only experience your client sees. Internal financials & studio data are completely hidden.</span>
          </div>
          <button
            onClick={onExit}
            className="px-2.5 py-1 bg-black text-white rounded-lg text-[11px] font-bold hover:bg-black/80 transition-all cursor-pointer"
          >
            Return to Studio Dashboard
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-charcoal-950/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <Logo size={32} />
            <div className="h-4 w-px bg-white/20 hidden sm:block" />
            <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 text-gold-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-gold-300 font-bold">
                Client Preview Portal
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title="Copy shareable link for family or partner"
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 text-gold-400" />}
              <span className="hidden sm:inline">{copiedLink ? 'Link Copied!' : 'Share Preview'}</span>
            </button>

            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 hover:bg-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp Studio</span>
            </a>

            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300 border border-white/15 text-xs text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isStaffViewing ? 'Exit' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        
        {/* HERO BANNER: Cinematic Wedding Showcase Header */}
        <section className="relative rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-br from-charcoal-900 via-charcoal-950 to-black shadow-2xl p-6 sm:p-10">
          {/* Subtle gold specular hairline */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
          
          {/* Background Ambient Imagery & Gradients */}
          {currentProject.couplePhoto ? (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-[2px] scale-105 transition-all duration-1000"
              style={{ backgroundImage: `url(${currentProject.couplePhoto})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-500/10 via-charcoal-950/80 to-black opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950 via-charcoal-950/80 to-transparent" />

          {/* Hero Content */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              {/* Badges strip */}
              <div className="flex flex-wrap items-center gap-2">
                <div 
                  onClick={handleCopyId}
                  className="group flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-gold-500/30 text-gold-300 text-xs font-mono cursor-pointer hover:border-gold-400 transition-all shadow-sm"
                  title="Click to copy Project ID"
                >
                  <span className="font-bold">{currentProject.id}</span>
                  {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />}
                </div>

                <span className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-xs text-white/90 font-medium">
                  {currentProject.eventType || 'Cinematic Wedding'}
                </span>

                <div className={`px-3 py-1 rounded-full border backdrop-blur-md text-xs font-semibold flex items-center gap-1.5 ${statusDisplay.color}`}>
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  <span>{statusDisplay.label}</span>
                </div>
              </div>

              {/* Couple & Project Title */}
              <div>
                <h1 className="text-3xl sm:text-5xl font-extrabold text-white font-display tracking-tight drop-shadow-md">
                  {currentProject.coupleName || currentProject.projectName || 'Cinematic Wedding Film'}
                </h1>
                <p className="text-sm sm:text-base text-gray-300 font-sans mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {currentProject.venue && (
                    <span className="flex items-center gap-1.5 text-gray-300">
                      <MapPin className="w-4 h-4 text-gold-400 shrink-0" />
                      <span>{currentProject.venue}</span>
                    </span>
                  )}
                  {currentProject.shootDate && (
                    <span className="flex items-center gap-1.5 text-gray-300">
                      <Calendar className="w-4 h-4 text-gold-400 shrink-0" />
                      <span>Event Date: {formatDate(currentProject.shootDate)}</span>
                    </span>
                  )}
                  <span className="text-xs text-white/50">
                    Produced by <strong className="text-white/80">{currentProject.studioName}</strong>
                  </span>
                </p>
              </div>
            </div>

            {/* Target Delivery Card */}
            <div className="bg-black/60 backdrop-blur-md border border-white/15 p-4 rounded-2xl md:min-w-[240px] text-right space-y-1 shrink-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gold-400 font-bold block">
                Target Master Delivery
              </span>
              <div className="text-xl sm:text-2xl font-bold text-white font-display">
                {formatDate(currentProject.deliveryDate)}
              </div>
              <p className="text-xs text-emerald-400 font-medium flex items-center justify-end gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Quality Assured by Studio QC</span>
              </p>
            </div>
          </div>
        </section>

        {/* SECTION: Interactive 5-Stage Production Progress Tracker */}
        <section className="bg-charcoal-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-400" />
                <h2 className="text-lg font-bold text-white font-display">
                  Post-Production Roadmap & Timeline
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Live synchronization with The Frame Cut Studio editing bay & color suites
              </p>
            </div>

            {/* Overall Percentage Pill */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-400">Total Completion:</span>
              <div className="px-3 py-1 rounded-full bg-gradient-to-r from-gold-500/20 to-amber-500/20 border border-gold-500/40 text-gold-300 font-mono font-bold text-sm">
                {progressPercent}% Complete
              </div>
            </div>
          </div>

          {/* Progress Bar Track */}
          <div className="w-full bg-black/60 rounded-full h-2.5 p-0.5 border border-white/10 overflow-hidden relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-gold-500 via-amber-400 to-emerald-400 shadow-[0_0_12px_rgba(212,175,55,0.6)]"
            />
          </div>

          {/* 5 Stages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
            {stages.map((stage) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.id}
                  className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                    stage.isCompleted
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : stage.isActive
                      ? 'bg-gradient-to-b from-gold-500/15 to-transparent border-gold-500/50 shadow-lg'
                      : 'bg-black/30 border-white/5 opacity-60'
                  }`}
                >
                  {/* Top stage number and indicator */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-gray-400 uppercase font-bold">
                      Stage 0{stage.id}
                    </span>
                    {stage.isCompleted ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    ) : stage.isActive ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-500/20 border border-gold-400/40 text-gold-300 text-[9px] font-bold uppercase animate-pulse">
                        Active
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-white/20" />
                    )}
                  </div>

                  {/* Icon & Title */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${stage.isCompleted ? 'text-emerald-400' : stage.isActive ? 'text-gold-400' : 'text-gray-500'}`} />
                      <h3 className="text-xs font-bold text-white leading-tight">
                        {stage.title}
                      </h3>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-snug">
                      {stage.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION: Assigned Creative Team (Strictly Read-Only, No Financials) */}
        <section className="bg-charcoal-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-gold-400" />
                <h2 className="text-lg font-bold text-white font-display">
                  Your Assigned Creative Suite
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Master craft artists dedicated to your wedding film's grading, narrative and sound
              </p>
            </div>

            <button
              onClick={() => setIsComplimentModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-xs font-semibold text-gold-300 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30" />
              <span>Send Compliment to Team</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary / Lead Editor */}
            <div className="bg-black/40 border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:border-gold-500/30 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-500/20 to-amber-500/10 border border-gold-500/30 flex items-center justify-center text-gold-300 shrink-0 font-display text-xl font-bold">
                {leadEditor?.name ? leadEditor.name.charAt(0) : (currentProject.assignedEditorName?.charAt(0) || 'E')}
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate">
                    {leadEditor?.name || currentProject.assignedEditorName || 'Lead Cinematic Artist'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-gold-500/20 border border-gold-400/40 text-[9px] font-mono text-gold-300 uppercase font-bold">
                    Lead Editor
                  </span>
                </div>
                <p className="text-xs text-gold-200/80 font-medium">
                  {leadEditor?.specialty || 'Cinematic Wedding Teasers & 4K Color Grading'}
                </p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {leadEditor?.bio || 'Certified specialist in emotion pacing, seamless audio mixing, and film LUT color fidelity.'}
                </p>
                <div className="flex items-center gap-3 pt-1 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Active on Edit Bay</span>
                  </span>
                  <span>•</span>
                  <span>4K Workstation Calibrated</span>
                </div>
              </div>
            </div>

            {/* Second Editor or Studio Director */}
            {currentProject.isSplitProject && currentProject.secondEditorName ? (
              <div className="bg-black/40 border border-white/10 rounded-2xl p-5 flex items-start gap-4 hover:border-gold-500/30 transition-all">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0 font-display text-xl font-bold">
                  {currentProject.secondEditorName.charAt(0)}
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">
                      {currentProject.secondEditorName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-[9px] font-mono text-purple-300 uppercase font-bold">
                      Co-Editor & Montage
                    </span>
                  </div>
                  <p className="text-xs text-purple-200/80 font-medium">
                    Rituals Montage & Multi-Camera Sync
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Collaborative specialist harmonizing secondary cameras, traditional ceremony coverage, and dialogue clarity.
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Sync Verified</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-black/40 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30 flex items-center justify-center text-blue-300 shrink-0 font-display text-xl font-bold">
                  {studio?.ownerName?.charAt(0) || 'S'}
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white truncate">
                      {studio?.ownerName || currentProject.studioName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-[9px] font-mono text-blue-300 uppercase font-bold">
                      Creative Director
                    </span>
                  </div>
                  <p className="text-xs text-blue-200/80 font-medium">
                    Executive Production & Creative Supervision
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Overseeing project delivery standards, client brief compliance, and post-production quality assurance.
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Studio QC Officer</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SECTION: Deliverables & Download Vault */}
        <section className="bg-charcoal-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FolderCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="text-lg font-bold text-white font-display">
                  Deliverables & 4K Download Vault
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Official high-speed download links, video preview streams, and master film assets
              </p>
            </div>

            {/* Master drive link button if available */}
            {primaryDriveLink && (
              <a
                href={primaryDriveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg self-start sm:self-auto"
              >
                <Download className="w-4 h-4" />
                <span>Open Complete Cloud Vault</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            )}
          </div>

          {/* Deliverables Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliverables.map((item: any, idx: number) => {
              const isReady = item.status === 'ready' || item.status === 'delivered';
              const downloadTarget = item.downloadUrl || primaryDriveLink;

              return (
                <div
                  key={item.id || idx}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                    isReady
                      ? 'bg-black/50 border-emerald-500/30 hover:border-emerald-500/60 shadow-lg'
                      : 'bg-black/30 border-white/10 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-mono uppercase text-gray-300 font-bold">
                        {item.badge || item.category || 'Master Cut'}
                      </span>
                      {isReady ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ready</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          <span>In Render</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 leading-snug">
                        {item.subtitle || item.notes || 'Full master cinematic grade'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1 text-[11px] text-gray-300 font-mono">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Format:</span>
                        <span className="text-gray-200">{item.format || '4K Ultra-HD'}</span>
                      </div>
                      {item.duration && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Length:</span>
                          <span className="text-gray-200">{item.duration}</span>
                        </div>
                      )}
                      {item.resolution && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Resolution:</span>
                          <span className="text-gray-200">{item.resolution}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-2 border-t border-white/10 flex items-center gap-2">
                    {isReady && downloadTarget ? (
                      <a
                        href={downloadTarget}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download 4K</span>
                        <ExternalLink className="w-3 h-3 opacity-70" />
                      </a>
                    ) : (
                      <div className="flex-1 py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-xs font-medium flex items-center justify-center gap-1.5 cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5 opacity-60" />
                        <span>Available Upon Render</span>
                      </div>
                    )}

                    {item.previewVideoUrl && (
                      <button
                        onClick={() => {
                          setPreviewVideoUrl(item.previewVideoUrl);
                          setPreviewVideoTitle(item.title);
                        }}
                        className="py-2 px-3 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/40 text-gold-300 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        title="Stream Cinematic Preview"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Preview</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION: Client Feedback & Revision History */}
        <section className="bg-charcoal-900/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gold-400" />
                <h2 className="text-lg font-bold text-white font-display">
                  Revisions & Client Feedback Hub
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Submit specific timestamp requests or view status of adjustments made by the editing bay
              </p>
            </div>

            <button
              onClick={() => setIsRevisionModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:opacity-90 text-black font-semibold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md self-start sm:self-auto"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Revision Request</span>
            </button>
          </div>

          {/* Revisions list */}
          {clientRevisions.length > 0 ? (
            <div className="space-y-3">
              {clientRevisions.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        rev.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {rev.status === 'resolved' ? 'Implemented & Resolved' : 'Under Review / Editing'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(rev.date)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200 font-sans">
                      {rev.notes}
                    </p>
                  </div>
                  {rev.status === 'resolved' && (
                    <div className="flex items-center gap-1 text-xs text-emerald-400 shrink-0 font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>QC Approved</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-black/30 border border-white/5 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400/80 mx-auto" />
              <h3 className="text-sm font-semibold text-white">No Pending Revisions</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                If you would like any scene re-trimmed, color adjusted, or music volume refined, use the button above to send notes directly to the editor.
              </p>
            </div>
          )}
        </section>

        {/* SECTION: Studio Support & Direct Verification */}
        <section className="bg-gradient-to-r from-charcoal-900 via-charcoal-950 to-charcoal-900 border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-[10px] font-mono uppercase tracking-widest text-gold-400 font-bold">
              Post-Production Partner
            </span>
            <h3 className="text-xl font-bold text-white font-display">
              {studio?.name || currentProject.studioName}
            </h3>
            <p className="text-xs text-gray-400 max-w-lg leading-relaxed">
              Have questions regarding physical hard-disk delivery, raw footage archival, or timeline adjustments? Contact your studio directly via phone or WhatsApp.
            </p>
            {studio?.phone && (
              <p className="text-xs text-gray-300 font-mono">
                Direct Line: <span className="text-gold-300 font-bold">{studio.phone}</span>
                {studio.email && ` • ${studio.email}`}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <a
              href={whatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>Chat on WhatsApp</span>
            </a>
            <button
              onClick={handleCopyLink}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-all flex items-center gap-2 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>{copiedLink ? 'Link Copied!' : 'Copy Portal Link'}</span>
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-6 text-xs text-gray-500 space-y-1">
          <p>© {new Date().getFullYear()} {currentProject.studioName} • Mastered in partnership with The Frame Cut Studio OS</p>
          <p className="text-[11px] text-gray-600">Private Read-Only Access Node • Project Reference ID: {currentProject.id}</p>
        </footer>
      </main>

      {/* MODAL: Submit Revision Request */}
      <AnimatePresence>
        {isRevisionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-charcoal-900 border border-white/15 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl relative"
            >
              <button
                onClick={() => setIsRevisionModalOpen(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-lg font-bold text-white font-display">
                  Submit Client Feedback & Revision
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Your notes are routed directly to {leadEditor?.name || 'the editing bay'} and the studio director.
                </p>
              </div>

              {revisionSuccess ? (
                <div className="p-6 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Revision Request Dispatched!</h4>
                  <p className="text-xs text-emerald-200">
                    The editor has been notified and will review your notes shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitRevision} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono uppercase text-gray-300 font-semibold mb-1.5">
                      Target Deliverable
                    </label>
                    <select
                      value={revisionDeliverable}
                      onChange={(e) => setRevisionDeliverable(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-gold-400"
                    >
                      <option value="Cinematic Highlight Film (4K)">Cinematic Highlight Film (4K)</option>
                      <option value="60s Instagram Teaser">60s Instagram Teaser</option>
                      <option value="Vertical Reels Edit">Vertical Reels Edit</option>
                      <option value="Traditional Ceremony Cut">Traditional Ceremony Cut</option>
                      <option value="Song / Music Selection">Song / Music Selection</option>
                      <option value="Color Grading & Brightness">Color Grading & Brightness</option>
                      <option value="General Film Notes">General Film Notes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-gray-300 font-semibold mb-1.5">
                      Video Timestamp (Optional, e.g. "02:15")
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 02:15 (Varmala shot) or Opening title"
                      value={revisionTimestamp}
                      onChange={(e) => setRevisionTimestamp(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-gold-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-gray-300 font-semibold mb-1.5">
                      Your Specific Revision Request
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Describe what you would like adjusted (e.g. Please swap the entrance song with track B, or include more family laughter frames in the montage)..."
                      value={revisionNotes}
                      onChange={(e) => setRevisionNotes(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-gold-400 resize-none font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-gray-300 font-semibold mb-1.5">
                      Your Name / Contact Note
                    </label>
                    <input
                      type="text"
                      placeholder={currentProject.coupleName || 'Client Name'}
                      value={revisionClientName}
                      onChange={(e) => setRevisionClientName(e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-gold-400"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsRevisionModalOpen(false)}
                      className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-gray-300 font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingRevision || !revisionNotes.trim()}
                      className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 hover:opacity-90 disabled:opacity-50 text-black font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg"
                    >
                      {isSubmittingRevision ? (
                        <span>Sending to Bay...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Revision</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Send Compliment to Editor */}
      <AnimatePresence>
        {isComplimentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-charcoal-900 border border-white/15 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl relative"
            >
              <button
                onClick={() => setIsComplimentModalOpen(false)}
                className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5">
                <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
                <h3 className="text-lg font-bold text-white font-display">
                  Send Compliment to Creative Team
                </h3>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                Loved the cut or colors? Share a quick note of appreciation directly with your editors. It means the world to our post-production artists!
              </p>

              {complimentSent ? (
                <div className="p-5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-center space-y-1.5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-white">Compliment Delivered!</h4>
                  <p className="text-xs text-emerald-200">
                    The creative team has received your warm feedback. Thank you!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitCompliment} className="space-y-4">
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. Loved the music transition during the Sangeet montage! You captured the joy of our families so beautifully..."
                    value={complimentText}
                    onChange={(e) => setComplimentText(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-gold-400 resize-none font-sans"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsComplimentModalOpen(false)}
                      className="py-2 px-3 rounded-xl bg-white/10 text-xs text-gray-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!complimentText.trim()}
                      className="py-2 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:opacity-90 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Love</span>
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Video Preview Player */}
      <AnimatePresence>
        {previewVideoUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-black border border-white/20 rounded-3xl overflow-hidden shadow-2xl relative"
            >
              <div className="p-4 bg-charcoal-900 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-gold-400" />
                  <span className="text-xs font-bold text-white font-display">
                    {previewVideoTitle || 'Cinematic Preview Stream'}
                  </span>
                </div>
                <button
                  onClick={() => setPreviewVideoUrl(null)}
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="aspect-video w-full bg-black relative flex items-center justify-center">
                <iframe
                  src={previewVideoUrl}
                  title={previewVideoTitle}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
