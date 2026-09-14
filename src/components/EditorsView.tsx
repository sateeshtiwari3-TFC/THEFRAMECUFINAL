import React, { useState, useMemo, useEffect } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  Star, 
  Calendar, 
  Briefcase, 
  Plus, 
  Edit, 
  Trash2, 
  IndianRupee, 
  CheckCircle, 
  TrendingUp, 
  PlusCircle,
  Clock,
  Download,
  Receipt,
  Sparkles,
  ArrowRightLeft,
  Globe,
  Instagram,
  Linkedin,
  Film,
  HardDrive,
  MessageSquare,
  ExternalLink,
  ChevronDown,
  Check,
  X,
  Layers,
  ShieldCheck,
  Laptop,
  Camera,
  Upload,
  Image as ImageIcon,
  Play,
  AlertTriangle,
  Search,
  ArrowRight,
  Filter,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Editor, Project, PaymentHistory, Studio } from '../types';
import EditorLoadIndicator, { calculateEditorLoad } from './EditorLoadIndicator';
import EditorPdfExportModal from './EditorPdfExportModal';
import EditorInvoicesHub from './EditorInvoicesHub';
import QuickReassignModal from './QuickReassignModal';
import { MS_PER_DAY } from '../utils';

interface EditorsViewProps {
  editors: Editor[];
  projects: Project[];
  payments: PaymentHistory[];
  studios?: Studio[];
  userRole?: string;
  currentEditorId?: string;
  currentUserEmail?: string;
  onAddEditor: (editor: Omit<Editor, 'id'>) => Promise<void>;
  onUpdateEditor: (id: string, updates: Partial<Editor>) => Promise<void>;
  onDeleteEditor: (id: string) => Promise<void>;
  onLogPayment: (payment: Omit<PaymentHistory, 'id' | 'createdAt'>) => Promise<void>;
  onDeletePayment?: (id: string) => Promise<void>;
  onUpdateProject?: (id: string, updates: Partial<Project>) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
}

// Fallback high-contrast moody portraits matching the VELO editorial aesthetic
const CINEMATIC_EDITORIAL_PORTRAITS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=1200'
];

type ActiveSectionTab = 'overview' | 'deliveries' | 'running_projects' | 'roster' | 'invoices' | 'ledger' | 'contact';

const EditorsView = React.memo(function EditorsView({
  editors,
  projects,
  payments,
  studios = [],
  userRole = 'admin',
  currentEditorId,
  currentUserEmail,
  onAddEditor,
  onUpdateEditor,
  onDeleteEditor,
  onLogPayment,
  onDeletePayment,
  onUpdateProject,
  onDeleteProject
}: EditorsViewProps) {
  // Determine user's active editor
  const loggedInEditor = useMemo(() => {
    return editors.find(
      e => e.id === currentEditorId || (e.email && currentUserEmail && e.email.toLowerCase() === currentUserEmail.toLowerCase())
    );
  }, [editors, currentEditorId, currentUserEmail]);

  // Selected editor for display
  const [selectedEditorId, setSelectedEditorId] = useState<string>('');

  useEffect(() => {
    if (userRole === 'editor' && loggedInEditor) {
      setSelectedEditorId(loggedInEditor.id);
    } else if (editors.length > 0 && (!selectedEditorId || !editors.some(e => e.id === selectedEditorId))) {
      setSelectedEditorId(editors[0].id);
    }
  }, [editors, userRole, loggedInEditor, selectedEditorId]);

  const activeEditor = useMemo(() => {
    if (userRole === 'editor') {
      return loggedInEditor || editors[0] || null;
    }
    return editors.find(e => e.id === selectedEditorId) || editors[0] || null;
  }, [editors, selectedEditorId, userRole, loggedInEditor]);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<ActiveSectionTab>('overview');

  // Editor Selector Dropdown Toggle State
  const [isEditorDropdownOpen, setIsEditorDropdownOpen] = useState(false);

  // Modals & Drawers state
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [editingEditor, setEditingEditor] = useState<Editor | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfModalEditor, setPdfModalEditor] = useState<Editor | null>(null);
  const [pdfModalDefaultTab, setPdfModalDefaultTab] = useState<'profile' | 'invoice'>('profile');
  const [pdfModalProjectId, setPdfModalProjectId] = useState<string>('all');
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignSourceEditor, setReassignSourceEditor] = useState<Editor | null>(null);
  const [editorToDeleteId, setEditorToDeleteId] = useState<string | null>(null);

  // Project Stage Reset Modal State
  const [projectToReset, setProjectToReset] = useState<Project | null>(null);
  const [isResettingProject, setIsResettingProject] = useState(false);

  // Project Delete Modal State
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // Quick Project Edit Modal State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSavingProjectEdit, setIsSavingProjectEdit] = useState(false);
  const [projectEditTitle, setProjectEditTitle] = useState('');
  const [projectEditStudio, setProjectEditStudio] = useState('');
  const [projectEditStatus, setProjectEditStatus] = useState<string>('editing');
  const [projectEditPriority, setProjectEditPriority] = useState<string>('normal');
  const [projectEditDeliveryDate, setProjectEditDeliveryDate] = useState('');
  const [projectEditFee, setProjectEditFee] = useState<number>(0);
  const [projectEditNotes, setProjectEditNotes] = useState('');

  // Payment logging state
  const [isLoggingPayment, setIsLoggingPayment] = useState(false);
  const [paymentProjectId, setPaymentProjectId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer / UPI');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentToDeleteId, setPaymentToDeleteId] = useState<string | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{ title: string; desc: string } | null>(null);
  const triggerToast = (title: string, desc: string) => {
    setToast({ title, desc });
    setTimeout(() => setToast(null), 3500);
  };

  // Dedicated Photo Change Modal State
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoTargetEditor, setPhotoTargetEditor] = useState<Editor | null>(null);
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string>('');
  const [photoInputTab, setPhotoInputTab] = useState<'upload' | 'gallery' | 'url'>('upload');
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const openPhotoChangeModal = (editor: Editor, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPhotoTargetEditor(editor);
    setTempPhotoUrl(editor.photo || CINEMATIC_EDITORIAL_PORTRAITS[0]);
    setPhotoInputTab('upload');
    setIsPhotoModalOpen(true);
  };

  // Image file processor with canvas optimization for fast loading & Firestore safety
  const handleProcessImageFile = (file: File, onSuccess: (dataUrl: string) => void) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        setIsUploadingPhoto(false);
        return;
      }

      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.78);
          onSuccess(compressed);
        } else {
          onSuccess(rawDataUrl);
        }
        setIsUploadingPhoto(false);
      };
      img.onerror = () => {
        onSuccess(rawDataUrl);
        setIsUploadingPhoto(false);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleSavePhotoOnly = async () => {
    if (!photoTargetEditor) return;
    if (!tempPhotoUrl.trim()) {
      alert('Please choose or upload a valid portrait image.');
      return;
    }
    setIsSavingPhoto(true);
    try {
      await onUpdateEditor(photoTargetEditor.id, {
        photo: tempPhotoUrl.trim()
      });
      triggerToast('Portrait Updated', `${photoTargetEditor.name}'s editorial image updated successfully.`);
      setIsPhotoModalOpen(false);
    } catch (err: any) {
      alert('Failed to update photo: ' + (err?.message || String(err)));
    } finally {
      setIsSavingPhoto(false);
    }
  };

  // Editor Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPhoto, setFormPhoto] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formRating, setFormRating] = useState(4.8);
  const [formJoinedDate, setFormJoinedDate] = useState('');
  const [formSpecialties, setFormSpecialties] = useState('');

  const openCreateModal = () => {
    setEditingEditor(null);
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPhoto('');
    setFormBio('Lead Cinematic Film Editor & Colorist');
    setFormRating(4.9);
    setFormJoinedDate(new Date().toISOString().split('T')[0]);
    setFormSpecialties('Cinematic 4K, Color Grading, Teasers, Drone Cuts');
    setIsEditorModalOpen(true);
  };

  const openEditModal = (editor: Editor) => {
    setEditingEditor(editor);
    setFormName(editor.name);
    setFormEmail(editor.email || '');
    setFormPhone(editor.phone || '');
    setFormPhoto(editor.photo || '');
    setFormBio(editor.bio || 'Lead Cinematic Film Editor & Colorist');
    setFormRating(editor.rating || 4.8);
    setFormJoinedDate(editor.joinedDate || new Date().toISOString().split('T')[0]);
    setFormSpecialties(editor.specialties ? editor.specialties.join(', ') : 'Cinematic Teasers, Full Films');
    setIsEditorModalOpen(true);
  };

  const handleSaveEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please enter editor name');
      return;
    }

    const specialtiesList = formSpecialties
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    try {
      if (editingEditor) {
        await onUpdateEditor(editingEditor.id, {
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          photo: formPhoto.trim(),
          bio: formBio.trim(),
          rating: Number(formRating),
          joinedDate: formJoinedDate,
          specialties: specialtiesList
        });
        triggerToast('Profile Updated', `${formName} specification saved.`);
      } else {
        await onAddEditor({
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formPhone.trim(),
          photo: formPhoto.trim() || CINEMATIC_EDITORIAL_PORTRAITS[Math.floor(Math.random() * CINEMATIC_EDITORIAL_PORTRAITS.length)],
          bio: formBio.trim(),
          rating: Number(formRating),
          joinedDate: formJoinedDate || new Date().toISOString().split('T')[0],
          specialties: specialtiesList,
          experienceYears: 4
        });
        triggerToast('Editor Created', `${formName} added to the editorial roster.`);
      }
      setIsEditorModalOpen(false);
    } catch (err: any) {
      alert('Failed to save editor: ' + (err?.message || String(err)));
    }
  };

  const handleDeleteEditorConfirm = async () => {
    if (!editorToDeleteId) return;
    try {
      const editorName = editors.find(e => e.id === editorToDeleteId)?.name || 'Editor';
      const remaining = editors.filter(e => e.id !== editorToDeleteId);
      await onDeleteEditor(editorToDeleteId);
      if (remaining.length > 0) {
        setSelectedEditorId(remaining[0].id);
      }
      setEditorToDeleteId(null);
      triggerToast('Editor Retired', `${editorName} removed from registry.`);
    } catch (err: any) {
      alert('Failed to delete editor: ' + (err?.message || String(err)));
    }
  };

  // Project Stage Reset Handlers
  const handleConfirmResetProject = async () => {
    if (!projectToReset || !onUpdateProject) return;
    setIsResettingProject(true);
    try {
      await onUpdateProject(projectToReset.id, { status: 'data_received' });
      triggerToast('Workflow Stage Reset', `"${projectToReset.coupleName || projectToReset.projectName}" reset to Footage Ingest.`);
      setProjectToReset(null);
    } catch (err: any) {
      alert('Failed to reset project stage: ' + (err?.message || String(err)));
    } finally {
      setIsResettingProject(false);
    }
  };

  // Project Delete Handlers
  const handleConfirmDeleteProject = async () => {
    if (!projectToDelete || !onDeleteProject) return;
    setIsDeletingProject(true);
    try {
      await onDeleteProject(projectToDelete.id);
      triggerToast('Project Archived', `"${projectToDelete.coupleName || projectToDelete.projectName}" moved to Recycle Bin.`);
      setProjectToDelete(null);
    } catch (err: any) {
      alert('Failed to delete project: ' + (err?.message || String(err)));
    } finally {
      setIsDeletingProject(false);
    }
  };

  // Quick Project Edit Handlers
  const handleOpenEditProject = (proj: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProject(proj);
    setProjectEditTitle(proj.coupleName || proj.projectName || '');
    setProjectEditStudio(proj.studioName || '');
    setProjectEditStatus(proj.status || 'editing');
    setProjectEditPriority(proj.priority || 'normal');
    setProjectEditDeliveryDate(proj.deliveryDate || '');
    setProjectEditFee(proj.editorPayment || 0);
    setProjectEditNotes(proj.notes || '');
  };

  const handleSaveProjectEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !onUpdateProject) return;
    setIsSavingProjectEdit(true);
    try {
      await onUpdateProject(editingProject.id, {
        coupleName: projectEditTitle.trim(),
        projectName: projectEditTitle.trim(),
        studioName: projectEditStudio.trim(),
        status: projectEditStatus as any,
        priority: projectEditPriority as any,
        deliveryDate: projectEditDeliveryDate,
        editorPayment: Number(projectEditFee),
        notes: projectEditNotes.trim()
      });
      triggerToast('Project Updated', `Specifications updated successfully.`);
      setEditingProject(null);
    } catch (err: any) {
      alert('Failed to save project updates: ' + (err?.message || String(err)));
    } finally {
      setIsSavingProjectEdit(false);
    }
  };

  const handleOpenPdfModal = (
    editorToExport: Editor, 
    defaultTab: 'profile' | 'invoice' = 'profile', 
    e?: React.MouseEvent,
    projectId: string = 'all'
  ) => {
    if (e) e.stopPropagation();
    setPdfModalEditor(editorToExport);
    setPdfModalDefaultTab(defaultTab);
    setPdfModalProjectId(projectId);
    setIsPdfModalOpen(true);
  };

  const handleOpenReassignModal = (editor: Editor, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setReassignSourceEditor(editor);
    setIsReassignModalOpen(true);
  };

  // Metrics for active editor
  const editorProjects = useMemo(() => {
    if (!activeEditor) return [];
    return projects.filter(
      p => p.assignedEditorId === activeEditor.id || (p.isSplitProject && p.secondEditorId === activeEditor.id)
    );
  }, [projects, activeEditor]);

  const completedProjectsCount = useMemo(() => {
    return editorProjects.filter(p => p.status === 'delivered' || p.status === 'closed').length;
  }, [editorProjects]);

  const activeCutsCount = editorProjects.length - completedProjectsCount;

  // Currently Running in-progress projects (not delivered or closed)
  const runningProjects = useMemo(() => {
    return editorProjects.filter(p => p.status !== 'delivered' && p.status !== 'closed');
  }, [editorProjects]);

  const urgentRunningCount = useMemo(() => {
    return runningProjects.filter(p => p.priority === 'urgent' || p.priority === 'high').length;
  }, [runningProjects]);

  const runningEarnings = useMemo(() => {
    if (!activeEditor) return 0;
    return runningProjects.reduce((sum, p) => {
      if (p.isSplitProject) {
        if (p.assignedEditorId === activeEditor.id) return sum + (p.firstEditorShare || 0);
        if (p.secondEditorId === activeEditor.id) return sum + (p.secondEditorShare || 0);
      }
      return sum + (p.editorPayment || 0);
    }, 0);
  }, [runningProjects, activeEditor]);

  // Running projects filter & search state
  const [runningFilterStatus, setRunningFilterStatus] = useState<string>('all');
  const [runningSearchQuery, setRunningSearchQuery] = useState<string>('');

  const filteredRunningProjects = useMemo(() => {
    return runningProjects.filter(p => {
      if (runningFilterStatus !== 'all' && p.status !== runningFilterStatus) {
        return false;
      }
      if (runningSearchQuery.trim()) {
        const q = runningSearchQuery.toLowerCase();
        const couple = (p.coupleName || `${p.brideName || ''} ${p.groomName || ''}`).toLowerCase();
        const studio = (p.studioName || '').toLowerCase();
        const event = (p.eventType || '').toLowerCase();
        const id = (p.id || '').toLowerCase();
        if (!couple.includes(q) && !studio.includes(q) && !event.includes(q) && !id.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [runningProjects, runningFilterStatus, runningSearchQuery]);

  // Delivery deadline countdown helper
  const getDeliveryDaysInfo = (deliveryDateStr?: string) => {
    if (!deliveryDateStr) return { label: 'Flexible Deadline', urgency: 'normal' as const, days: null };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(deliveryDateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / MS_PER_DAY);
    
    if (diffDays < 0) {
      return { label: `Overdue by ${Math.abs(diffDays)}d`, urgency: 'overdue' as const, days: diffDays };
    }
    if (diffDays === 0) {
      return { label: 'Due Today', urgency: 'critical' as const, days: 0 };
    }
    if (diffDays === 1) {
      return { label: 'Due Tomorrow', urgency: 'critical' as const, days: 1 };
    }
    if (diffDays <= 3) {
      return { label: `${diffDays} days left`, urgency: 'warning' as const, days: diffDays };
    }
    return { label: `${diffDays} days left`, urgency: 'normal' as const, days: diffDays };
  };

  // Workflow pipeline step helper
  const getProjectStageInfo = (status: string) => {
    switch (status) {
      case 'data_received':
        return { step: 1, label: 'Footage Ingest', progress: 15, color: 'text-zinc-400', badgeBg: 'bg-zinc-800 text-zinc-300' };
      case 'assigned':
        return { step: 2, label: 'Story & Rough Cut', progress: 30, color: 'text-blue-400', badgeBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/30' };
      case 'editing':
        return { step: 3, label: 'In Edit Suite', progress: 55, color: 'text-amber-400', badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/30' };
      case 'review':
        return { step: 4, label: 'Studio Review', progress: 75, color: 'text-purple-400', badgeBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/30' };
      case 'revision':
        return { step: 4, label: 'Client Revision', progress: 80, color: 'text-rose-400', badgeBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/30' };
      case 'rendering':
        return { step: 5, label: '4K Color & Render', progress: 92, color: 'text-cyan-400', badgeBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' };
      case 'delivered':
        return { step: 5, label: 'Delivered', progress: 100, color: 'text-emerald-400', badgeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' };
      default:
        return { step: 2, label: 'In Production', progress: 40, color: 'text-zinc-300', badgeBg: 'bg-zinc-800 text-zinc-300' };
    }
  };

  // Quick project status updater
  const handleQuickStatusChange = async (projectId: string, newStatus: string) => {
    if (!onUpdateProject) return;
    try {
      await onUpdateProject(projectId, { status: newStatus as any });
      triggerToast('Pipeline Advanced', `Project moved to ${newStatus.replace('_', ' ').toUpperCase()}.`);
    } catch (err: any) {
      alert('Failed to update status: ' + (err?.message || String(err)));
    }
  };

  const totalEarnings = useMemo(() => {
    if (!activeEditor) return 0;
    return editorProjects.reduce((sum, p) => {
      if (p.isSplitProject) {
        if (p.assignedEditorId === activeEditor.id) return sum + (p.firstEditorShare || 0);
        if (p.secondEditorId === activeEditor.id) return sum + (p.secondEditorShare || 0);
      }
      return sum + (p.editorPayment || 0);
    }, 0);
  }, [editorProjects, activeEditor]);

  const totalPaid = useMemo(() => {
    if (!activeEditor) return 0;
    return payments
      .filter(pay => pay.entityId === activeEditor.id && pay.entityType === 'editor')
      .reduce((sum, pay) => sum + (pay.amount || 0), 0);
  }, [payments, activeEditor]);

  const outstandingBalance = totalEarnings - totalPaid;

  // Handle logging payment
  const handleLogPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEditor) return;
    if (paymentAmount <= 0) {
      alert('Please enter a valid amount greater than ₹0.');
      return;
    }

    try {
      const matchedProj = projects.find(p => p.id === paymentProjectId);
      await onLogPayment({
        entityId: activeEditor.id,
        entityType: 'editor',
        projectId: paymentProjectId || 'general_ledger',
        projectCoupleName: matchedProj ? (matchedProj.coupleName || matchedProj.projectName || 'Project Cut') : 'Office Advance / Bonus',
        amount: paymentAmount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod,
        notes: paymentNotes
      });

      setPaymentAmount(0);
      setPaymentNotes('');
      setIsLoggingPayment(false);
      triggerToast('Payment Logged', `₹${paymentAmount.toLocaleString('en-IN')} recorded on ${activeEditor.name}'s ledger.`);
    } catch (err: any) {
      alert('Failed to log payment: ' + (err?.message || String(err)));
    }
  };

  // If user is editor but profile is not linked
  if (userRole === 'editor' && !loggedInEditor) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-black text-white p-6 font-display">
        <div className="max-w-lg w-full bg-zinc-950 border border-zinc-800 p-8 rounded-3xl text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto text-amber-400">
            <Laptop className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Editor Registry Profile Needed</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Your login is authenticated, but not yet linked to an active editor registry.
          </p>
          <div className="p-3 bg-zinc-900/80 rounded-xl text-xs font-mono text-zinc-300 border border-zinc-800">
            Current Email: {currentUserEmail}
          </div>
          <p className="text-xs text-amber-400/90 font-mono">
            Please ask an Admin to register an Editor with this email address.
          </p>
        </div>
      </div>
    );
  }

  // If no editors exist at all
  if (editors.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-black text-white p-6 font-display">
        <div className="max-w-md w-full text-center space-y-6">
          <span className="text-xs font-mono tracking-[0.3em] text-zinc-500 uppercase">THE FRAME CUT STUDIO</span>
          <h1 className="text-6xl font-black tracking-tight uppercase text-white">VELO</h1>
          <p className="text-sm text-zinc-400">No editor profiles have been registered in the post-production studio yet.</p>
          {userRole === 'admin' && (
            <button
              onClick={openCreateModal}
              className="px-8 py-3.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-xl cursor-pointer"
            >
              + Create First Editor
            </button>
          )}
        </div>
      </div>
    );
  }

  // Active portrait image
  const displayPhoto = activeEditor?.photo || CINEMATIC_EDITORIAL_PORTRAITS[0];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans -mt-4 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pb-20">
      
      {/* ========================================================================= */}
      {/* 1. TOP MINIMALIST EDITORIAL NAVBAR (VELO HEADER)                          */}
      {/* ========================================================================= */}
      <header className="pt-6 pb-4 border-b border-zinc-900/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Brand Identity */}
        <div className="flex items-center space-x-4">
          <div className="flex flex-col">
            <span className="text-2xl lg:text-3xl font-bold tracking-[0.3em] font-display text-white uppercase select-none">
              VELO
            </span>
            <span className="text-[9px] font-mono tracking-[0.25em] text-zinc-500 uppercase -mt-0.5">
              POST-PRODUCTION • THE FRAME CUT
            </span>
          </div>

          {/* Admin Editor Selector Switcher */}
          {userRole === 'admin' && (
            <div className="relative ml-3 pl-3 border-l border-zinc-800">
              <button
                type="button"
                onClick={() => setIsEditorDropdownOpen(prev => !prev)}
                className="flex items-center space-x-1.5 text-xs text-zinc-300 bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5 transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-mono text-zinc-500 uppercase mr-1">Editor:</span>
                <span className="font-semibold text-white truncate max-w-[130px]">{activeEditor?.name}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isEditorDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isEditorDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsEditorDropdownOpen(false)} 
                  />
                  <div className="absolute left-3 top-full mt-2 w-64 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl py-1.5 z-50 backdrop-blur-xl">
                    <div className="px-3 py-1.5 text-[10px] font-mono text-zinc-500 uppercase border-b border-zinc-900 flex justify-between items-center">
                      <span>Switch Active Editor ({editors.length})</span>
                      <button 
                        type="button" 
                        onClick={() => { setActiveTab('roster'); setIsEditorDropdownOpen(false); }}
                        className="text-white hover:underline text-[9px]"
                      >
                        View All
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                      {editors.map(ed => (
                        <button
                          key={ed.id}
                          type="button"
                          onClick={() => {
                            setSelectedEditorId(ed.id);
                            setIsEditorDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-zinc-900 transition-colors ${
                            activeEditor?.id === ed.id ? 'text-white font-bold bg-zinc-900/50' : 'text-zinc-400'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <span className="w-2 h-2 rounded-full bg-zinc-700 shrink-0" />
                            <span className="truncate">{ed.name}</span>
                          </div>
                          {activeEditor?.id === ed.id && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                        </button>
                      ))}
                    </div>
                    <div className="p-1.5 border-t border-zinc-900">
                      <button
                        type="button"
                        onClick={() => {
                          openCreateModal();
                          setIsEditorDropdownOpen(false);
                        }}
                        className="w-full text-center py-1.5 text-[11px] font-mono text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg flex items-center justify-center space-x-1 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add New Editor</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Navigation Menu */}
        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {(['overview', 'running_projects', 'deliveries', 'roster', 'invoices', 'ledger', 'contact'] as ActiveSectionTab[]).map(tabKey => {
            const labels: Record<ActiveSectionTab, string> = {
              overview: 'Home',
              running_projects: 'Running Projects',
              deliveries: 'Deliveries',
              roster: 'All Editors',
              invoices: 'Invoices',
              ledger: 'Ledger',
              contact: 'Contact'
            };

            const isActive = activeTab === tabKey;

            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={`px-3.5 py-1.5 text-xs font-mono tracking-wider uppercase transition-all rounded-full cursor-pointer ${
                  isActive
                    ? 'text-white font-bold bg-zinc-900 border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-950'
                }`}
              >
                {labels[tabKey]}
              </button>
            );
          })}

          {/* Quick PDF Export Pill */}
          {activeEditor && (
            <button
              type="button"
              onClick={() => handleOpenPdfModal(activeEditor, 'profile')}
              className="ml-2 p-2 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all cursor-pointer"
              title="Download Editor Profile / Statement PDF"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Admin Edit / Add Actions */}
          {userRole === 'admin' && activeEditor && (
            <button
              type="button"
              onClick={() => openEditModal(activeEditor)}
              className="p-2 rounded-full border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all cursor-pointer"
              title="Edit Profile Specs & Photo"
            >
              <Edit className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. THE HERO SECTION (EXACT VELO EDITORIAL SPLIT SCREEN)                   */}
      {/* ========================================================================= */}
      {activeEditor && (
        <section className="relative min-h-[520px] lg:min-h-[580px] grid grid-cols-1 lg:grid-cols-12 items-center overflow-hidden border-b border-zinc-900">
          
          {/* Left Hero Content Column (Typography & Call-to-Actions) */}
          <div className="lg:col-span-7 py-12 lg:py-16 pr-4 z-20 flex flex-col justify-center space-y-6">
            
            {/* Kicker label */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex items-center space-x-3"
            >
              <span className="text-[11px] sm:text-xs font-mono font-bold tracking-[0.3em] text-zinc-400 uppercase">
                HELLO, MY NAME IS
              </span>
              <span className="w-6 h-px bg-zinc-700" />
            </motion.div>

            {/* Massive Bold Headline Name */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-black uppercase tracking-tight text-white leading-[0.95] font-display select-none"
            >
              {activeEditor.name}
            </motion.h1>

            {/* Subtitle / Role with Typewriter Cursor */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center text-sm sm:text-base md:text-lg text-zinc-300 font-sans tracking-wide"
            >
              <span>{activeEditor.bio || 'Lead Cinematic Film Editor & Colorist'}</span>
              <span className="inline-block w-0.5 h-5 bg-white ml-1.5 animate-pulse" />
            </motion.div>

            {/* Dual Pill Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              {/* White Solid Pill Button - Current Running Projects */}
              <button
                type="button"
                onClick={() => setActiveTab('running_projects')}
                className="px-7 py-3 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-xl cursor-pointer flex items-center space-x-2"
              >
                <span className={`w-2 h-2 rounded-full ${runningProjects.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
                <span>Running Projects</span>
                {runningProjects.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-black text-white text-[10px] font-mono font-bold">
                    {runningProjects.length}
                  </span>
                )}
              </button>

              {/* Dark Outlined Pill Button */}
              <button
                type="button"
                onClick={() => setActiveTab('contact')}
                className="px-8 py-3 rounded-full bg-transparent border border-zinc-600 hover:border-white text-white font-medium text-xs uppercase tracking-wider hover:bg-white/5 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
              >
                Contact me
              </button>

              {/* Change Portrait Action Pill Button */}
              <button
                type="button"
                onClick={(e) => openPhotoChangeModal(activeEditor, e)}
                className="px-5 py-3 rounded-full bg-zinc-950 border border-zinc-800 hover:border-zinc-500 text-zinc-300 hover:text-white font-mono text-xs transition-all cursor-pointer flex items-center space-x-2 hover:scale-[1.03] active:scale-[0.97]"
                title="Change or Upload Editor Portrait Image"
              >
                <Camera className="w-3.5 h-3.5 text-zinc-400" />
                <span>Change Photo</span>
              </button>

              {/* Direct Edit Editor Profile Button */}
              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => openEditModal(activeEditor)}
                  className="px-5 py-3 rounded-full bg-zinc-950 border border-zinc-800 hover:border-zinc-400 text-zinc-200 hover:text-white font-mono text-xs transition-all cursor-pointer flex items-center space-x-2 hover:scale-[1.03] active:scale-[0.97]"
                  title="Edit Editor Profile Specifications"
                >
                  <Edit className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Edit Editor</span>
                </button>
              )}

              {/* Direct Delete Editor Profile Button */}
              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => setEditorToDeleteId(activeEditor.id)}
                  className="px-5 py-3 rounded-full bg-zinc-950 border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 font-mono text-xs transition-all cursor-pointer flex items-center space-x-2 hover:scale-[1.03] active:scale-[0.97]"
                  title="Retire / Delete Editor Profile"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Delete Editor</span>
                </button>
              )}

              {/* Direct Invoices Pill */}
              <button
                type="button"
                onClick={() => setActiveTab('invoices')}
                className="px-5 py-3 rounded-full bg-zinc-950 border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white font-mono text-xs transition-all cursor-pointer flex items-center space-x-1.5"
                title="View & Generate 1-Click Work Invoices"
              >
                <Receipt className="w-3.5 h-3.5 text-zinc-400" />
                <span>Invoices Hub</span>
              </button>
            </motion.div>

            {/* Social & Workstation Icon Links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex items-center space-x-4 pt-3 text-zinc-400"
            >
              <button
                type="button"
                onClick={() => setActiveTab('running_projects')}
                className="w-8 h-8 rounded-full border border-zinc-800 hover:border-zinc-500 hover:text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                title="Current Running Projects"
              >
                <Play className="w-3.5 h-3.5" />
              </button>

              <a
                href={activeEditor.phone ? `tel:${activeEditor.phone}` : '#'}
                className="w-8 h-8 rounded-full border border-zinc-800 hover:border-zinc-500 hover:text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                title="Direct Phone Line"
              >
                <Phone className="w-3.5 h-3.5" />
              </a>

              <a
                href={activeEditor.email ? `mailto:${activeEditor.email}` : '#'}
                className="w-8 h-8 rounded-full border border-zinc-800 hover:border-zinc-500 hover:text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                title="Email Studio Desk"
              >
                <Mail className="w-3.5 h-3.5" />
              </a>

              <button
                type="button"
                onClick={() => setActiveTab('deliveries')}
                className="w-8 h-8 rounded-full border border-zinc-800 hover:border-zinc-500 hover:text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                title="Active Wedding Productions"
              >
                <Film className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className="w-8 h-8 rounded-full border border-zinc-800 hover:border-zinc-500 hover:text-white flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                title="Ledger & Wage Settlements"
              >
                <IndianRupee className="w-3.5 h-3.5" />
              </button>
            </motion.div>

            {/* Performance Indicators & Capacity Bar */}
            <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono">
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-300">
                <Star className="w-3 h-3 fill-white text-white" />
                <span>{activeEditor.rating.toFixed(1)} Editor Index</span>
              </div>

              <div className="flex items-center space-x-1.5 px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-300">
                <span className={`w-2 h-2 rounded-full ${activeCutsCount === 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span>{activeCutsCount === 0 ? 'Available for New Tasks' : `${activeCutsCount} Active Works`}</span>
              </div>

              <div className="flex items-center space-x-1.5 px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-full text-zinc-400">
                <Calendar className="w-3 h-3 text-zinc-500" />
                <span>Joined {activeEditor.joinedDate || '2025'}</span>
              </div>
            </div>
          </div>

          {/* Right Hero Cinematic Portrait Column (Seamless Vignette Fade + Interactive Photo Trigger) */}
          <div 
            onClick={(e) => openPhotoChangeModal(activeEditor, e)}
            className="lg:col-span-5 relative h-[380px] sm:h-[450px] lg:h-[580px] w-full flex items-center justify-center overflow-hidden select-none cursor-pointer group"
            title="Click to Change Editor Portrait"
          >
            
            {/* Portrait Image with Moody Black & White Contrast Filter */}
            <motion.img
              key={activeEditor.id + (activeEditor.photo || '')}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              src={displayPhoto}
              alt={activeEditor.name}
              className="w-full h-full object-cover object-top filter grayscale contrast-125 brightness-90 transition-all duration-700 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />

            {/* Seamless Vignette Gradients into Pure Pitch Black */}
            {/* Left Edge Seamless Dark Gradient */}
            <div className="absolute inset-y-0 left-0 w-32 sm:w-48 bg-gradient-to-r from-black via-black/80 to-transparent pointer-events-none z-10" />

            {/* Bottom Edge Seamless Dark Gradient */}
            <div className="absolute inset-x-0 bottom-0 h-32 sm:h-48 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />

            {/* Top Edge Soft Fade */}
            <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black via-black/40 to-transparent pointer-events-none z-10" />

            {/* Right Edge Soft Radial Shadow */}
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/60 to-transparent pointer-events-none z-10" />

            {/* Floating "Change Photo" Action Badge (Top Right) */}
            <div className="absolute top-4 right-4 z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openPhotoChangeModal(activeEditor, e);
                }}
                className="px-3.5 py-1.5 rounded-full bg-black/75 hover:bg-white hover:text-black text-white border border-white/20 hover:border-white text-xs font-mono backdrop-blur-md shadow-2xl transition-all duration-200 flex items-center space-x-1.5 cursor-pointer hover:scale-105"
                title="Change Portrait Image"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Change Photo</span>
              </button>
            </div>

            {/* Hover Indicator Overlay with Camera Icon */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-15 flex flex-col items-center justify-center pointer-events-none">
              <div className="p-3 rounded-full bg-black/80 border border-white/30 text-white mb-2 shadow-xl backdrop-blur-md transform group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold tracking-widest text-white uppercase bg-black/80 px-3 py-1 rounded-full border border-white/20">
                Click to Change Portrait Photo
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE EDITORIAL CONTENT MODULES ACCORDING TO ACTIVE TAB          */}
      {/* ========================================================================= */}
      <main className="mt-12 space-y-12">

        {/* Tab 1: OVERVIEW & HIGHLIGHTS */}
        {activeTab === 'overview' && activeEditor && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-10"
          >
            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col justify-between space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Assigned Productions</span>
                <span className="text-3xl font-black font-display tracking-tight text-white">{editorProjects.length}</span>
                <span className="text-[11px] font-mono text-zinc-400">{completedProjectsCount} Completed • {activeCutsCount} In Progress</span>
              </div>

              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col justify-between space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Total Work Earned</span>
                <span className="text-3xl font-black font-display tracking-tight text-white">₹{totalEarnings.toLocaleString('en-IN')}</span>
                <span className="text-[11px] font-mono text-zinc-400">Total contractual fees</span>
              </div>

              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col justify-between space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Disbursed Wages</span>
                <span className="text-3xl font-black font-display tracking-tight text-emerald-400">₹{totalPaid.toLocaleString('en-IN')}</span>
                <span className="text-[11px] font-mono text-zinc-400">Received in bank / UPI</span>
              </div>

              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl flex flex-col justify-between space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Outstanding Balance</span>
                <span className="text-3xl font-black font-display tracking-tight text-amber-400">
                  ₹{outstandingBalance >= 0 ? outstandingBalance.toLocaleString('en-IN') : 0}
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-mono text-zinc-400">Pending settlement</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('ledger');
                      setIsLoggingPayment(true);
                    }}
                    className="text-[10px] font-mono font-bold text-white underline hover:text-zinc-300 cursor-pointer"
                  >
                    + Log Payment
                  </button>
                </div>
              </div>
            </div>

            {/* Active Deliveries Snapshot */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <h3 className="text-xs font-mono font-bold tracking-[0.2em] text-zinc-400 uppercase">
                  ACTIVE WEDDING DELIVERIES
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('deliveries')}
                  className="text-xs font-mono text-zinc-400 hover:text-white uppercase transition-colors"
                >
                  View All ({editorProjects.length}) →
                </button>
              </div>

              {editorProjects.length === 0 ? (
                <div className="py-12 text-center text-zinc-600 font-mono text-xs border border-dashed border-zinc-900 rounded-2xl">
                  No wedding projects assigned to this editor yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {editorProjects.slice(0, 6).map(proj => (
                    <div
                      key={proj.id}
                      className="p-5 bg-zinc-950/80 border border-zinc-900 hover:border-zinc-800 rounded-2xl transition-all space-y-3 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-zinc-500">{proj.id}</span>
                          <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full ${
                            proj.status === 'delivered' || proj.status === 'closed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {proj.status}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white font-display mt-2 tracking-tight">
                          {proj.coupleName || proj.projectName}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-0.5">{proj.studioName || 'Direct Studio'} • {proj.eventType || 'Wedding'}</p>
                      </div>

                      <div className="pt-3 border-t border-zinc-900/80 flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-500">Contract Share:</span>
                        <span className="text-white font-bold">₹{(proj.isSplitProject ? (proj.firstEditorShare || 0) : proj.editorPayment).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Current Running Projects Spotlight (Replacing old static showcase) */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${runningProjects.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                  <h3 className="text-xs font-mono font-bold tracking-[0.2em] text-white uppercase">
                    CURRENT RUNNING PROJECTS ({runningProjects.length})
                  </h3>
                  {urgentRunningCount > 0 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                      {urgentRunningCount} Urgent
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('running_projects')}
                  className="text-xs font-mono text-zinc-400 hover:text-white uppercase transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <span>View Full Timeline →</span>
                </button>
              </div>

              {runningProjects.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950/60 border border-dashed border-zinc-900 rounded-2xl space-y-2">
                  <p className="text-sm text-zinc-300 font-medium">All assigned projects are completed and delivered.</p>
                  <p className="text-xs text-zinc-500 font-mono">No active editing cuts currently in progress for {activeEditor.name}.</p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('deliveries')}
                      className="text-xs font-mono text-white underline hover:text-zinc-300 cursor-pointer"
                    >
                      View Past Completed Deliveries ({completedProjectsCount})
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {runningProjects.map(proj => {
                    const stage = getProjectStageInfo(proj.status);
                    const deadline = getDeliveryDaysInfo(proj.deliveryDate);
                    const editorFee = proj.isSplitProject ? (proj.firstEditorShare || 0) : proj.editorPayment;

                    return (
                      <div
                        key={proj.id}
                        className="p-5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all space-y-4 flex flex-col justify-between group shadow-xl relative overflow-hidden"
                      >
                        {/* Status bar accent on top edge */}
                        <div 
                          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-white via-zinc-400 to-zinc-700" 
                          style={{ width: `${stage.progress}%` }} 
                        />

                        <div className="space-y-3">
                          {/* Header tags: Priority & Stage */}
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-semibold ${stage.badgeBg}`}>
                              {stage.label}
                            </span>

                            {/* Deadline Countdown Pill */}
                            <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
                              deadline.urgency === 'overdue'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                                : deadline.urgency === 'critical'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : deadline.urgency === 'warning'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                            }`}>
                              <Clock className="w-3 h-3" />
                              <span>{deadline.label}</span>
                            </span>
                          </div>

                          {/* Couple & Studio Info */}
                          <div>
                            <span className="text-[10px] font-mono text-zinc-500">{proj.id} • {proj.eventType || 'Wedding Film'}</span>
                            <h4 className="text-base font-bold text-white font-display mt-0.5 tracking-tight group-hover:text-zinc-200 transition-colors">
                              {proj.coupleName || `${proj.brideName || 'Bride'} & ${proj.groomName || 'Groom'}`}
                            </h4>
                            <p className="text-xs text-zinc-400 mt-0.5">{proj.studioName || 'Direct Studio'} {proj.venue ? `• ${proj.venue}` : ''}</p>
                          </div>

                          {/* 5-Step Pipeline Progress Indicator */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                              <span>Pipeline: <strong className="text-white">{stage.label}</strong></span>
                              <span className="text-zinc-500">{stage.progress}%</span>
                            </div>
                            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-white transition-all duration-500"
                                style={{ width: `${stage.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Bottom Actions & Fee */}
                        <div className="pt-3 border-t border-zinc-900 flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-zinc-500 block">Contract Share</span>
                            <span className="text-white font-bold">₹{editorFee.toLocaleString('en-IN')}</span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => setActiveTab('running_projects')}
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-white hover:text-black text-zinc-300 text-[11px] font-mono transition-all cursor-pointer flex items-center space-x-1"
                            >
                              <span>Manage</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tab 2: DELIVERIES & ASSIGNED PRODUCTIONS */}
        {activeTab === 'deliveries' && activeEditor && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
              <div>
                <h3 className="text-lg font-bold font-display tracking-tight text-white uppercase">
                  {activeEditor.name}’s Deliveries & Works
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                  {editorProjects.length} total wedding works • {completedProjectsCount} completed • {activeCutsCount} in active production
                </p>
              </div>

              {userRole !== 'editor' && onUpdateProject && (
                <button
                  type="button"
                  onClick={(e) => handleOpenReassignModal(activeEditor, e)}
                  className="px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 hover:text-white flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Quick Reassign Project</span>
                </button>
              )}
            </div>

            {editorProjects.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 font-mono text-xs border border-zinc-900 rounded-3xl">
                No assignments recorded for this editor yet.
              </div>
            ) : (
              <div className="space-y-3">
                {editorProjects.map(proj => (
                  <div
                    key={proj.id}
                    className="p-5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                        <img
                          src={proj.couplePhoto || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=300'}
                          alt={proj.coupleName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono text-zinc-500">{proj.id}</span>
                          <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-full ${
                            proj.status === 'delivered' || proj.status === 'closed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {proj.status}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white font-display mt-1">{proj.coupleName}</h4>
                        <p className="text-xs text-zinc-400">{proj.studioName} • Delivery: {proj.deliveryDate || 'Flexible'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end space-x-4 pt-3 md:pt-0 border-t md:border-t-0 border-zinc-900">
                      <div className="text-right">
                        <span className="text-sm font-bold text-white font-mono block">
                          ₹{(proj.isSplitProject ? (proj.firstEditorShare || 0) : proj.editorPayment).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">Editor Contract Fee</span>
                      </div>

                      {/* Reset Stage to Ingest */}
                      {onUpdateProject && (
                        <button
                          type="button"
                          onClick={() => setProjectToReset(proj)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-sky-500/20 border border-zinc-700 hover:border-sky-500/40 text-zinc-300 hover:text-sky-300 text-xs font-mono flex items-center space-x-1 transition-all cursor-pointer"
                          title="Reset Workflow Stage to Ingest (data_received)"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset</span>
                        </button>
                      )}

                      {/* Edit Project */}
                      {onUpdateProject && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditProject(proj)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-mono flex items-center space-x-1 transition-all cursor-pointer"
                          title="Edit Project Specifications"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleOpenPdfModal(activeEditor, 'invoice', e, proj.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono flex items-center space-x-1.5 transition-all cursor-pointer"
                        title="Generate Separate Single Work Invoice"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Work Invoice</span>
                      </button>

                      {/* Delete Project */}
                      {userRole === 'admin' && onDeleteProject && (
                        <button
                          type="button"
                          onClick={() => setProjectToDelete(proj)}
                          className="p-1.5 rounded-xl bg-zinc-900 hover:bg-red-500/20 border border-zinc-700 hover:border-red-500/40 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Archive / Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 3: CURRENT RUNNING PROJECTS (Replaces old Master Reel & Showcase) */}
        {activeTab === 'running_projects' && activeEditor && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Header & Section Title */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-900 pb-6">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono tracking-[0.25em] text-zinc-500 uppercase">ACTIVE PRODUCTION PIPELINE</span>
                  <span className={`w-2 h-2 rounded-full ${runningProjects.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                </div>
                <h3 className="text-2xl font-bold font-display tracking-tight text-white uppercase mt-1">
                  {activeEditor.name}’s Current Running Projects
                </h3>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Live cutting suites, real-time stage progression, client revisions, and delivery deadlines.
                </p>
              </div>

              {/* Summary KPIs */}
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-2xl text-right">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">Active In Progress</span>
                  <span className="text-lg font-bold font-mono text-white">{runningProjects.length} Projects</span>
                </div>
                <div className="px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-2xl text-right">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">Pipeline Value</span>
                  <span className="text-lg font-bold font-mono text-emerald-400">₹{runningEarnings.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950/90 border border-zinc-900 p-3 rounded-2xl">
              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: `All Running (${runningProjects.length})` },
                  { id: 'editing', label: 'In Edit Suite' },
                  { id: 'review', label: 'Under Review' },
                  { id: 'revision', label: 'In Revision' },
                  { id: 'rendering', label: 'Rendering' },
                  { id: 'assigned', label: 'Assigned' },
                  { id: 'data_received', label: 'Ingest' }
                ].map(chip => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setRunningFilterStatus(chip.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono whitespace-nowrap transition-all cursor-pointer ${
                      runningFilterStatus === chip.id
                        ? 'bg-white text-black font-bold shadow'
                        : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Search Box & Reset Filters */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {(runningFilterStatus !== 'all' || runningSearchQuery.trim() !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setRunningFilterStatus('all');
                      setRunningSearchQuery('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0"
                    title="Reset All Filters and Search"
                  >
                    <RotateCcw className="w-3 h-3 text-zinc-400" />
                    <span>Reset Filters</span>
                  </button>
                )}

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={runningSearchQuery}
                    onChange={(e) => setRunningSearchQuery(e.target.value)}
                    placeholder="Search couple, studio..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Running Projects Grid / List */}
            {filteredRunningProjects.length === 0 ? (
              <div className="py-16 text-center bg-zinc-950/40 border border-dashed border-zinc-900 rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                  <Play className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white font-display">
                  {runningProjects.length === 0 ? 'No Current Running Projects' : 'No Projects Match Filter'}
                </h4>
                <p className="text-xs text-zinc-400 max-w-md mx-auto font-mono">
                  {runningProjects.length === 0
                    ? `All assigned productions for ${activeEditor.name} have been delivered and completed. New assignments will appear here.`
                    : 'Try clearing the search filter or switching status tabs above.'}
                </p>
                {runningProjects.length === 0 && (
                  <div className="pt-2 flex justify-center space-x-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('deliveries')}
                      className="px-5 py-2 rounded-full bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-xs font-mono text-zinc-200"
                    >
                      View Past Deliveries ({completedProjectsCount})
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredRunningProjects.map(proj => {
                  const stage = getProjectStageInfo(proj.status);
                  const deadline = getDeliveryDaysInfo(proj.deliveryDate);
                  const editorFee = proj.isSplitProject ? (proj.firstEditorShare || 0) : proj.editorPayment;

                  return (
                    <div
                      key={proj.id}
                      className="p-6 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-3xl space-y-5 transition-all shadow-2xl relative overflow-hidden flex flex-col justify-between"
                    >
                      {/* Top Accent Gradient Bar */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-white via-zinc-400 to-zinc-700"
                        style={{ width: `${stage.progress}%` }}
                      />

                      <div className="space-y-4">
                        {/* Top Metadata Row: ID, Status, Deadline */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-[11px] font-mono text-zinc-500">{proj.id}</span>
                            <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full font-semibold ${stage.badgeBg}`}>
                              {stage.label}
                            </span>
                            {proj.priority === 'urgent' && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse font-bold">
                                Urgent
                              </span>
                            )}
                          </div>

                          {/* Deadline Tag */}
                          <div className={`px-3 py-1 rounded-full text-xs font-mono flex items-center space-x-1.5 ${
                            deadline.urgency === 'overdue'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                              : deadline.urgency === 'critical'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : deadline.urgency === 'warning'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                          }`}>
                            <Clock className="w-3.5 h-3.5" />
                            <span className="font-semibold">{deadline.label}</span>
                            {proj.deliveryDate && (
                              <span className="text-[10px] text-zinc-500 hidden sm:inline">({proj.deliveryDate})</span>
                            )}
                          </div>
                        </div>

                        {/* Project Title & Studio */}
                        <div>
                          <div className="text-xs font-mono text-zinc-400">{proj.eventType || 'Wedding'} • {proj.studioName || 'Studio Production'}</div>
                          <h4 className="text-xl font-bold font-display text-white mt-1 tracking-tight">
                            {proj.coupleName || `${proj.brideName || 'Bride'} & ${proj.groomName || 'Groom'}`}
                          </h4>
                          {proj.venue && (
                            <p className="text-xs text-zinc-400 mt-1">📍 {proj.venue}</p>
                          )}
                        </div>

                        {/* Interactive Workflow Progress Timeline (5 Stages) */}
                        <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-zinc-400">Current Phase: <strong className="text-white">{stage.label}</strong></span>
                            <span className="font-bold text-white">{stage.progress}%</span>
                          </div>
                          
                          {/* Segmented Pipeline Bar */}
                          <div className="grid grid-cols-5 gap-1 pt-1">
                            {[
                              { idx: 1, title: '1. Ingest' },
                              { idx: 2, title: '2. Story Cut' },
                              { idx: 3, title: '3. Picture Lock' },
                              { idx: 4, title: '4. Review/Revs' },
                              { idx: 5, title: '5. 4K Render' }
                            ].map(step => (
                              <div key={step.idx} className="space-y-1">
                                <div className={`h-1.5 rounded-full ${step.idx <= stage.step ? 'bg-white' : 'bg-zinc-800'}`} />
                                <span className={`text-[9px] font-mono block truncate ${step.idx <= stage.step ? 'text-zinc-300 font-semibold' : 'text-zinc-600'}`}>
                                  {step.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Quick Notes / Tags if available */}
                        {(proj.notes || (proj.tags && proj.tags.length > 0)) && (
                          <div className="text-xs text-zinc-400 bg-zinc-900/40 p-3 rounded-xl border border-zinc-900 space-y-1.5">
                            {proj.tags && proj.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {proj.tags.map((t, idx) => (
                                  <span key={idx} className="text-[9px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                            {proj.notes && (
                              <p className="text-[11px] text-zinc-400 italic line-clamp-2">
                                "{proj.notes}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Bottom Controls Bar: Quick Status Advance & Actions */}
                      <div className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-zinc-500 block uppercase">Contract Share</span>
                          <span className="text-base font-bold text-white">₹{editorFee.toLocaleString('en-IN')}</span>
                          {proj.isSplitProject && (
                            <span className="text-[10px] text-amber-400 block">Co-Edited Project</span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {/* Quick Status Advance Dropdown */}
                          {onUpdateProject && (
                            <div className="relative inline-block">
                              <select
                                value={proj.status}
                                onChange={(e) => handleQuickStatusChange(proj.id, e.target.value)}
                                className="bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-200 cursor-pointer focus:outline-none focus:border-white transition-colors"
                                title="Update Live Production Status"
                              >
                                <option value="data_received">Status: Ingest</option>
                                <option value="assigned">Status: Assigned</option>
                                <option value="editing">Status: Editing</option>
                                <option value="review">Status: Review</option>
                                <option value="revision">Status: Revision</option>
                                <option value="rendering">Status: Rendering</option>
                                <option value="delivered">Status: Delivered (Complete)</option>
                              </select>
                            </div>
                          )}

                          {/* Reset Workflow Stage to Ingest */}
                          {onUpdateProject && (
                            <button
                              type="button"
                              onClick={() => setProjectToReset(proj)}
                              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-sky-500/20 border border-zinc-700 hover:border-sky-500/40 text-zinc-300 hover:text-sky-300 text-xs font-mono flex items-center space-x-1 transition-all cursor-pointer"
                              title="Reset Workflow Stage to Ingest (data_received)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset</span>
                            </button>
                          )}

                          {/* Edit Project Specifications */}
                          {onUpdateProject && (
                            <button
                              type="button"
                              onClick={() => handleOpenEditProject(proj)}
                              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white text-xs font-mono flex items-center space-x-1 transition-all cursor-pointer"
                              title="Edit Project Specifications"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}

                          {/* Work Invoice 1-Click Button */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenPdfModal(activeEditor, 'invoice', e, proj.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono flex items-center space-x-1.5 transition-all cursor-pointer"
                            title="Generate Single Work Invoice PDF"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Invoice</span>
                          </button>

                          {/* Reassign Button for Admin */}
                          {userRole === 'admin' && onUpdateProject && (
                            <button
                              type="button"
                              onClick={() => {
                                setReassignSourceEditor(activeEditor);
                                setIsReassignModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-mono transition-colors"
                              title="Reassign to Another Editor"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete / Archive Project Button */}
                          {userRole === 'admin' && onDeleteProject && (
                            <button
                              type="button"
                              onClick={() => setProjectToDelete(proj)}
                              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-red-500/20 border border-zinc-700 hover:border-red-500/40 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Archive / Delete Project"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Tab 4: INVOICES & STATEMENTS HUB */}
        {activeTab === 'invoices' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="border-b border-zinc-900 pb-4">
              <h3 className="text-lg font-bold font-display tracking-tight text-white uppercase">
                Editor Work Invoices & Statements Hub
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                1-Click professional PDF generation for single deliveries, consolidated monthly statements, and payment acknowledgments.
              </p>
            </div>

            <EditorInvoicesHub
              editors={editors}
              projects={projects}
              payments={payments}
              studios={studios}
              userRole={userRole}
              currentEditor={activeEditor}
              onOpenPdfModal={handleOpenPdfModal}
              onLogPayment={onLogPayment}
            />
          </motion.div>
        )}

        {/* Tab 5: LEDGER & WAGE SETTLEMENTS */}
        {activeTab === 'ledger' && activeEditor && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
              <div>
                <h3 className="text-lg font-bold font-display tracking-tight text-white uppercase">
                  {activeEditor.name}’s Financial Ledger
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                  Real-time synchronization between project contract shares and disbursed payments.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsLoggingPayment(!isLoggingPayment)}
                className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-all cursor-pointer shadow-md"
              >
                {isLoggingPayment ? 'Close Log Form' : '+ Record Payment'}
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">Total Work Earned</span>
                <span className="text-4xl font-black font-display text-white tracking-tight block">
                  ₹{totalEarnings.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-mono text-zinc-400 block">{editorProjects.length} contracted assignments</span>
              </div>

              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-500 block">Disbursed Wages</span>
                <span className="text-4xl font-black font-display text-emerald-400 tracking-tight block">
                  ₹{totalPaid.toLocaleString('en-IN')}
                </span>
                <span className="text-xs font-mono text-zinc-400 block">Paid via bank/UPI settlements</span>
              </div>

              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-500 block">Outstanding Balance</span>
                <span className="text-4xl font-black font-display text-amber-400 tracking-tight block">
                  ₹{outstandingBalance >= 0 ? outstandingBalance.toLocaleString('en-IN') : 0}
                </span>
                <span className="text-xs font-mono text-zinc-400 block">Pending final delivery clearance</span>
              </div>
            </div>

            {/* Record Payment Form Modal/Panel */}
            {isLoggingPayment && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-zinc-950 border border-zinc-800 rounded-3xl space-y-4"
              >
                <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
                  <h4 className="text-xs font-mono font-bold tracking-wider text-white uppercase">
                    Record Payment on {activeEditor.name}’s Ledger
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsLoggingPayment(false)}
                    className="text-xs text-zinc-500 hover:text-white"
                  >
                    ✕ Close
                  </button>
                </div>

                <form onSubmit={handleLogPaymentSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Wedding Project</label>
                      <select
                        value={paymentProjectId}
                        onChange={(e) => setPaymentProjectId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white"
                      >
                        <option value="">General Advance / Studio Bonus</option>
                        {editorProjects.map(proj => (
                          <option key={proj.id} value={proj.id}>{proj.coupleName} (Fee: ₹{proj.editorPayment})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Amount (₹ INR)</label>
                      <input
                        type="number"
                        placeholder="Amount in INR"
                        value={paymentAmount || ''}
                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white"
                      >
                        <option value="Bank Transfer / UPI">Bank Transfer / UPI (GPay/PhonePe)</option>
                        <option value="Cash">Cash</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-zinc-400 uppercase mb-1">Settlement Notes</label>
                      <input
                        type="text"
                        placeholder="Transaction ref / milestone note..."
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-all cursor-pointer"
                    >
                      Confirm Ledger Entry
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Payment Settlement History */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono font-bold tracking-[0.2em] text-zinc-400 uppercase">
                SETTLEMENT RECEIPTS HISTORY
              </h4>

              {payments.filter(pay => pay.entityId === activeEditor.id && pay.entityType === 'editor').length === 0 ? (
                <div className="py-12 text-center text-zinc-600 font-mono text-xs border border-zinc-900 rounded-2xl">
                  No payment settlements recorded for this editor yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {payments
                    .filter(pay => pay.entityId === activeEditor.id && pay.entityType === 'editor')
                    .map(pay => (
                      <div
                        key={pay.id}
                        className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex items-center justify-between"
                      >
                        <div>
                          <span className="text-[9px] font-mono text-zinc-500">{pay.date} • {pay.paymentMethod}</span>
                          <h5 className="text-xs font-bold text-white mt-0.5">{pay.projectCoupleName}</h5>
                          {pay.notes && <p className="text-[10px] text-zinc-400 mt-0.5">Note: {pay.notes}</p>}
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-bold text-emerald-400 font-mono">
                            + ₹{pay.amount.toLocaleString('en-IN')}
                          </span>
                          {onDeletePayment && (
                            <button
                              type="button"
                              onClick={() => setPaymentToDeleteId(pay.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                              title="Delete Payment Log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tab 6: CONTACT & SPECS */}
        {activeTab === 'contact' && activeEditor && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8 max-w-4xl"
          >
            <div className="border-b border-zinc-900 pb-4">
              <h3 className="text-lg font-bold font-display tracking-tight text-white uppercase">
                Contact Desk & Production Specifications
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                Direct credentials, software suites, and studio communication lines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-4">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">Communication Lines</span>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 text-xs">
                    <Phone className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300 font-mono">{activeEditor.phone || 'Phone not registered'}</span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <Mail className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300 font-mono">{activeEditor.email || 'Email not registered'}</span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300 font-mono">Registry Member Since: {activeEditor.joinedDate}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-900 flex items-center space-x-3">
                  <a
                    href={activeEditor.phone ? `https://wa.me/${activeEditor.phone.replace(/[^0-9]/g, '')}` : '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-all"
                  >
                    WhatsApp Chat
                  </a>
                  <a
                    href={activeEditor.phone ? `tel:${activeEditor.phone}` : '#'}
                    className="px-5 py-2.5 rounded-full border border-zinc-700 hover:border-white text-white text-xs uppercase tracking-wider transition-all"
                  >
                    Call Editor
                  </a>
                </div>
              </div>

              {/* Editing Suite & Gear Specs */}
              <div className="p-6 bg-zinc-950 border border-zinc-900 rounded-3xl space-y-4">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">Specialties & Workstation</span>
                
                <div className="flex flex-wrap gap-2">
                  {(activeEditor.specialties && activeEditor.specialties.length > 0 
                    ? activeEditor.specialties 
                    : ['Cinematic 4K Master', 'Color Grading (DaVinci)', 'Highlight Teasers', 'Traditional Cuts', 'Drone Aesthetics']
                  ).map((spec, i) => (
                    <span key={i} className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-mono text-zinc-300">
                      {spec}
                    </span>
                  ))}
                </div>

                <div className="pt-2 text-xs text-zinc-400 leading-relaxed">
                  Equipped with dedicated high-speed NVMe storage, DaVinci Resolve Studio & Premiere Pro colour-managed pipelines for 10-bit Log footage.
                </div>

                {/* Profile Portrait & Specification Actions */}
                <div className="pt-4 border-t border-zinc-900 flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={(e) => openPhotoChangeModal(activeEditor, e)}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-full text-xs font-mono text-zinc-200 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Change Portrait Photo</span>
                    </button>

                    {userRole === 'admin' && (
                      <button
                        type="button"
                        onClick={() => openEditModal(activeEditor)}
                        className="text-xs font-mono text-zinc-400 hover:text-white underline cursor-pointer"
                      >
                        Edit Specifications
                      </button>
                    )}
                  </div>

                  {userRole === 'admin' && (
                    <button
                      type="button"
                      onClick={() => setEditorToDeleteId(activeEditor.id)}
                      className="text-xs font-mono text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      Retire Editor Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 6: ALL EDITORS ROSTER & TEAM DIRECTORY */}
        {activeTab === 'roster' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
              <div>
                <h3 className="text-xl font-bold font-display tracking-tight text-white uppercase">
                  All Editors & Post-Production Roster
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                  {editors.length} registered film editors • Switch active workspace, modify profiles, update photos, or assign projects.
                </p>
              </div>

              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-all cursor-pointer flex items-center space-x-1.5 shadow-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Editor</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {editors.map(ed => {
                const edProjects = projects.filter(
                  p => p.assignedEditorId === ed.id || (p.isSplitProject && p.secondEditorId === ed.id)
                );
                const edRunning = edProjects.filter(
                  p => p.status !== 'delivered' && p.status !== 'closed'
                );
                const edCompleted = edProjects.filter(
                  p => p.status === 'delivered' || p.status === 'closed'
                );
                const isCurrent = activeEditor?.id === ed.id;

                return (
                  <div
                    key={ed.id}
                    className={`p-6 bg-zinc-950 border rounded-3xl space-y-5 transition-all relative overflow-hidden flex flex-col justify-between ${
                      isCurrent ? 'border-white ring-1 ring-white/20' : 'border-zinc-900 hover:border-zinc-800'
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Top Bar: Photo & Meta */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="relative group">
                          <img
                            src={ed.photo || CINEMATIC_EDITORIAL_PORTRAITS[0]}
                            alt={ed.name}
                            className="w-16 h-16 rounded-2xl object-cover border border-zinc-800"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={(e) => openPhotoChangeModal(ed, e)}
                            className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                            title="Change Editor Photo"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full ${
                            isCurrent ? 'bg-white text-black font-bold' : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                          }`}>
                            {isCurrent ? 'Active Workspace' : 'Editor'}
                          </span>
                          <span className="text-xs text-amber-400 font-mono mt-1 flex items-center space-x-1">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span>{ed.rating || 5}.0</span>
                          </span>
                        </div>
                      </div>

                      {/* Info */}
                      <div>
                        <h4 className="text-lg font-bold font-display text-white">{ed.name}</h4>
                        <p className="text-xs text-zinc-400 line-clamp-1">{ed.bio || 'Film Editor & Colorist'}</p>
                        <div className="mt-2 space-y-1 text-xs text-zinc-500 font-mono">
                          {ed.phone && <div className="truncate">📞 {ed.phone}</div>}
                          {ed.email && <div className="truncate">✉️ {ed.email}</div>}
                        </div>
                      </div>

                      {/* Workload Stats */}
                      <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-900/50 rounded-2xl border border-zinc-900 text-center font-mono">
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase block">Total</span>
                          <span className="text-sm font-bold text-white">{edProjects.length}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase block">Running</span>
                          <span className="text-sm font-bold text-emerald-400">{edRunning.length}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-zinc-500 uppercase block">Done</span>
                          <span className="text-sm font-bold text-zinc-300">{edCompleted.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-zinc-900/80 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEditorId(ed.id);
                          setActiveTab('running_projects');
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-white text-black font-bold text-xs font-mono hover:bg-zinc-200 transition-all cursor-pointer flex items-center space-x-1"
                      >
                        <span>View Suite</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={(e) => openPhotoChangeModal(ed, e)}
                          className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                          title="Change Photo"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>

                        {userRole === 'admin' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openEditModal(ed)}
                              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Edit Editor Profile"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setEditorToDeleteId(ed.id)}
                              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-red-500/20 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Retire / Delete Editor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 4. MODALS & UTILITY ACTIONS (EDIT, PDF, REASSIGN, DELETE)                 */}
      {/* ========================================================================= */}

      {/* CREATE & EDIT EDITOR MODAL */}
      <AnimatePresence>
        {isEditorModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsEditorModalOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl z-10 font-sans max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">VELO REGISTRY</span>
                  <h3 className="text-xl font-bold font-display text-white mt-0.5">
                    {editingEditor ? 'Edit Editor Profile' : 'Register New Editor'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditorModalOpen(false)}
                  className="text-zinc-500 hover:text-white text-lg p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEditor} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Editor Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. John Doe / Sachin Verma"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-white focus:outline-none transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Email Address</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="editor@studio.com"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-mono text-zinc-400 uppercase">Editorial Portrait Photo</label>
                    <span className="text-[10px] font-mono text-zinc-500">Device Upload or Web URL</span>
                  </div>

                  {/* Photo Preview & Quick Device Upload Bar */}
                  <div className="flex items-center gap-3 p-3 bg-zinc-900/80 border border-zinc-800 rounded-2xl mb-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-black border border-zinc-700 flex-shrink-0 relative">
                      <img
                        src={formPhoto || CINEMATIC_EDITORIAL_PORTRAITS[0]}
                        alt="Portrait Preview"
                        className="w-full h-full object-cover object-top filter grayscale contrast-125 brightness-90"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="cursor-pointer inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white text-black hover:bg-zinc-200 rounded-full text-xs font-mono font-medium transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isUploadingPhoto ? 'Processing...' : 'Upload File'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleProcessImageFile(f, (url) => setFormPhoto(url));
                            }}
                          />
                        </label>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const next = CINEMATIC_EDITORIAL_PORTRAITS[Math.floor(Math.random() * CINEMATIC_EDITORIAL_PORTRAITS.length)];
                            setFormPhoto(next);
                          }}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-full text-xs font-mono transition-colors"
                        >
                          Random Preset
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-mono">Upload from phone/laptop or choose a preset below.</p>
                    </div>
                  </div>

                  {/* Quick Preset Selector Grid */}
                  <div className="mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1.5">Choose from Curated Studio Looks:</span>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                      {CINEMATIC_EDITORIAL_PORTRAITS.map((presetUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormPhoto(presetUrl)}
                          className={`relative h-12 rounded-lg overflow-hidden border transition-all ${
                            formPhoto === presetUrl ? 'border-white ring-2 ring-white/50 scale-105' : 'border-zinc-800 hover:border-zinc-500 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={presetUrl} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover filter grayscale contrast-125" referrerPolicy="no-referrer" />
                          {formPhoto === presetUrl && (
                            <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-white drop-shadow" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direct URL Input */}
                  <input
                    type="text"
                    value={formPhoto}
                    onChange={(e) => setFormPhoto(e.target.value)}
                    placeholder="Or enter direct image URL (https://...)"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:border-white focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Role / Tagline</label>
                  <input
                    type="text"
                    value={formBio}
                    onChange={(e) => setFormBio(e.target.value)}
                    placeholder="e.g. Lead Colorist & Cinematic Wedding Film Editor"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-white focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Performance Index (1-5)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="5"
                      value={formRating}
                      onChange={(e) => setFormRating(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-white focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Joined Date</label>
                    <input
                      type="date"
                      value={formJoinedDate}
                      onChange={(e) => setFormJoinedDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Specialties (Comma separated)</label>
                  <input
                    type="text"
                    value={formSpecialties}
                    onChange={(e) => setFormSpecialties(e.target.value)}
                    placeholder="Teasers, Full Film, DaVinci Resolve, Drone"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-sm text-white focus:border-white focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setIsEditorModalOpen(false)}
                    className="px-5 py-2.5 text-xs font-mono text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-all cursor-pointer shadow-lg"
                  >
                    {editingEditor ? 'Save Changes' : 'Register Editor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {editorToDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setEditorToDeleteId(null)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-950 border border-red-500/30 rounded-3xl p-6 space-y-4 shadow-2xl z-10"
            >
              <h3 className="text-lg font-bold text-white font-display">Retire Editor Profile</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Are you sure you want to retire this editor? Their profile will be removed from active assignments, but existing project records and payments remain in history.
              </p>

              <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setEditorToDeleteId(null)}
                  className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteEditorConfirm}
                  className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Confirm Retire
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE PAYMENT RECORD MODAL */}
      <AnimatePresence>
        {paymentToDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setPaymentToDeleteId(null)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4 shadow-2xl z-10"
            >
              <h3 className="text-lg font-bold text-white font-display">Delete Settlement Record</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Are you sure you want to remove this logged payment from the editor’s statement?
              </p>

              <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setPaymentToDeleteId(null)}
                  className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (paymentToDeleteId && onDeletePayment) {
                      await onDeletePayment(paymentToDeleteId);
                      setPaymentToDeleteId(null);
                      triggerToast('Record Removed', 'Payment log removed from ledger.');
                    }
                  }}
                  className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Delete Record
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM RESET PROJECT STAGE MODAL */}
      <AnimatePresence>
        {projectToReset && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setProjectToReset(null)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-950 border border-sky-500/40 rounded-3xl p-6 space-y-4 shadow-2xl z-10"
            >
              <div className="flex items-center space-x-2 text-sky-400">
                <RotateCcw className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white font-display">Reset Project Stage</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Are you sure you want to reset workflow progression for <strong className="text-white">{projectToReset.coupleName}</strong> back to the initial <span className="text-sky-300 font-mono">Ingest (data_received)</span> stage?
              </p>

              <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setProjectToReset(null)}
                  className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmResetProject}
                  className="px-5 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                >
                  Confirm Reset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE PROJECT MODAL */}
      <AnimatePresence>
        {projectToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setProjectToDelete(null)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-950 border border-red-500/40 rounded-3xl p-6 space-y-4 shadow-2xl z-10"
            >
              <div className="flex items-center space-x-2 text-red-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-lg font-bold text-white font-display">Delete Wedding Project</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                Are you sure you want to move <strong className="text-white">{projectToDelete.coupleName}</strong> to the recycle bin? It will be safely archived and unassigned from the editor.
              </p>

              <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  onClick={() => setProjectToDelete(null)}
                  className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteProject}
                  className="px-5 py-2 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                >
                  Delete Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT PROJECT DETAILS MODAL */}
      <AnimatePresence>
        {editingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md" onClick={() => setEditingProject(null)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl z-10 font-sans max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-zinc-900 pb-4">
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">PROJECT SPECS</span>
                  <h3 className="text-xl font-bold font-display text-white mt-0.5">
                    Edit Project: {editingProject.coupleName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="text-zinc-500 hover:text-white text-lg p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProjectEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Couple / Event Title</label>
                    <input
                      type="text"
                      value={projectEditTitle}
                      onChange={(e) => setProjectEditTitle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:border-white focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Target Delivery Date</label>
                    <input
                      type="date"
                      value={projectEditDeliveryDate}
                      onChange={(e) => setProjectEditDeliveryDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:border-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Production Status</label>
                    <select
                      value={projectEditStatus}
                      onChange={(e) => setProjectEditStatus(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:border-white focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="data_received">Ingest (Data Received)</option>
                      <option value="assigned">Assigned</option>
                      <option value="editing">Editing (Story Cut)</option>
                      <option value="review">Review (Picture Lock)</option>
                      <option value="revision">Revision</option>
                      <option value="rendering">Rendering</option>
                      <option value="delivered">Delivered (Completed)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Priority</label>
                    <select
                      value={projectEditPriority}
                      onChange={(e) => setProjectEditPriority(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:border-white focus:outline-none transition-colors cursor-pointer"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Editor Share (₹)</label>
                    <input
                      type="number"
                      value={projectEditFee}
                      onChange={(e) => setProjectEditFee(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white focus:border-white focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 uppercase mb-1">Production Notes & Directives</label>
                  <textarea
                    rows={3}
                    value={projectEditNotes}
                    onChange={(e) => setProjectEditNotes(e.target.value)}
                    placeholder="Audio sync requirements, LUT preferences, client revision requests..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-white focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => setEditingProject(null)}
                    className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingProjectEdit}
                    className="px-6 py-2 rounded-full bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-all cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    {isSavingProjectEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-white text-black px-5 py-3 rounded-full shadow-2xl flex items-center space-x-2 font-mono text-xs"
          >
            <span className="w-2 h-2 rounded-full bg-black" />
            <span className="font-bold">{toast.title}:</span>
            <span className="text-zinc-700">{toast.desc}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 5. DEDICATED CHANGE PORTRAIT PHOTO MODAL                                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isPhotoModalOpen && photoTargetEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="fixed inset-0 bg-black/85 backdrop-blur-md" 
              onClick={() => !isSavingPhoto && setIsPhotoModalOpen(false)} 
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl z-10 font-sans max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start border-b border-zinc-900 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">VELO CINEMATIC STUDIO</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-white mt-1">
                    Change Editor Portrait
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Update portrait photo for <span className="text-white font-medium">{photoTargetEditor.name}</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSavingPhoto}
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="text-zinc-500 hover:text-white text-lg p-1.5 rounded-full hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Split Preview & Method Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                {/* Visual Live Editorial Preview */}
                <div className="sm:col-span-5 flex flex-col items-center">
                  <div className="relative w-44 h-56 rounded-2xl overflow-hidden bg-black border border-zinc-800 shadow-2xl group">
                    <img
                      src={tempPhotoUrl || CINEMATIC_EDITORIAL_PORTRAITS[0]}
                      alt="Live Portrait Preview"
                      className="w-full h-full object-cover object-top filter grayscale contrast-125 brightness-90 transition-all duration-300"
                      referrerPolicy="no-referrer"
                    />
                    {/* Vignette Preview Gradients */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
                    <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/80 to-transparent pointer-events-none" />

                    <div className="absolute bottom-2 left-2 right-2 z-10">
                      <span className="text-[10px] font-mono font-bold text-white block truncate uppercase tracking-wider">
                        {photoTargetEditor.name}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-400 block">
                        Live Preview Look
                      </span>
                    </div>

                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/80 border border-white/20 text-[9px] font-mono text-zinc-300">
                      B&W Filter
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 mt-2">VELO High-Contrast Output</span>
                </div>

                {/* Mode Selector Tabs & Inputs */}
                <div className="sm:col-span-7 space-y-4">
                  {/* Tab Selector Bar */}
                  <div className="flex p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPhotoInputTab('upload')}
                      className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        photoInputTab === 'upload' ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoInputTab('gallery')}
                      className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        photoInputTab === 'gallery' ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Presets</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoInputTab('url')}
                      className={`flex-1 py-1.5 text-xs font-mono rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                        photoInputTab === 'url' ? 'bg-white text-black font-bold shadow' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Web URL</span>
                    </button>
                  </div>

                  {/* Tab 1: Direct File Upload */}
                  {photoInputTab === 'upload' && (
                    <div className="space-y-3">
                      <label className="block border-2 border-dashed border-zinc-800 hover:border-zinc-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-zinc-950/50 hover:bg-zinc-900/40">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 mx-auto flex items-center justify-center text-zinc-400 mb-3 group-hover:text-white">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-medium text-white block">
                          {isUploadingPhoto ? 'Optimizing Image...' : 'Click to select photo from device'}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500 block mt-1">Supports JPG, PNG, WEBP (Auto-optimized)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleProcessImageFile(file, (url) => setTempPhotoUrl(url));
                          }}
                        />
                      </label>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Tip: Photos are automatically resized and converted to studio-grade monochrome inside the VELO engine.
                      </p>
                    </div>
                  )}

                  {/* Tab 2: Studio Gallery Presets */}
                  {photoInputTab === 'gallery' && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                        Select a Cinematic Editorial Preset:
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {CINEMATIC_EDITORIAL_PORTRAITS.map((presetUrl, idx) => {
                          const isSelected = tempPhotoUrl === presetUrl;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setTempPhotoUrl(presetUrl)}
                              className={`relative h-16 rounded-xl overflow-hidden border transition-all cursor-pointer ${
                                isSelected ? 'border-white ring-2 ring-white/50 scale-105 z-10' : 'border-zinc-800 hover:border-zinc-500 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={presetUrl}
                                alt={`Preset ${idx + 1}`}
                                className="w-full h-full object-cover filter grayscale contrast-125"
                                referrerPolicy="no-referrer"
                              />
                              {isSelected && (
                                <div className="absolute inset-0 bg-white/20 flex items-center justify-center">
                                  <Check className="w-4 h-4 text-white drop-shadow" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Web Image URL */}
                  {photoInputTab === 'url' && (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono text-zinc-400 uppercase">Direct Image Link</label>
                      <input
                        type="text"
                        value={tempPhotoUrl}
                        onChange={(e) => setTempPhotoUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:border-white focus:outline-none transition-colors"
                      />
                      <p className="text-[10px] text-zinc-500 font-mono">
                        Paste any public image URL from Unsplash, Google Drive (direct link), Imgur, or cloud storage.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-900">
                <button
                  type="button"
                  disabled={isSavingPhoto}
                  onClick={() => setTempPhotoUrl(CINEMATIC_EDITORIAL_PORTRAITS[0])}
                  className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Reset to Default Preset
                </button>

                <div className="flex items-center space-x-3 w-full sm:w-auto">
                  <button
                    type="button"
                    disabled={isSavingPhoto}
                    onClick={() => setIsPhotoModalOpen(false)}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-full border border-zinc-800 hover:border-zinc-600 text-zinc-300 font-mono text-xs hover:bg-white/5 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={isSavingPhoto || !tempPhotoUrl.trim()}
                    onClick={handleSavePhotoOnly}
                    className="flex-1 sm:flex-initial px-7 py-2.5 rounded-full bg-white text-black hover:bg-zinc-200 font-bold text-xs uppercase tracking-wider transition-all hover:scale-105 shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isSavingPhoto ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Photo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1-CLICK PDF EXPORT MODAL */}
      <EditorPdfExportModal
        editor={pdfModalEditor}
        projects={projects}
        payments={payments}
        studios={studios}
        isOpen={isPdfModalOpen}
        onClose={() => {
          setIsPdfModalOpen(false);
          setPdfModalEditor(null);
        }}
        defaultTab={pdfModalDefaultTab}
        initialProjectId={pdfModalProjectId}
      />

      {/* QUICK REASSIGN PROJECT MODAL */}
      {reassignSourceEditor && onUpdateProject && (
        <QuickReassignModal
          isOpen={isReassignModalOpen}
          onClose={() => {
            setIsReassignModalOpen(false);
            setReassignSourceEditor(null);
          }}
          sourceEditor={reassignSourceEditor}
          editors={editors}
          projects={projects}
          studios={studios}
          onUpdateProject={onUpdateProject}
          onNotify={(message, type) => {
            triggerToast(type === 'error' ? 'Reassign Error' : 'Reassigned', message);
          }}
        />
      )}
    </div>
  );
});

export default EditorsView;
