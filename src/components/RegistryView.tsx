import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Calendar, 
  User, 
  IndianRupee, 
  HardDrive, 
  Plus, 
  Trash2, 
  Edit,
  Film, 
  Info, 
  Sparkles, 
  Check, 
  ArrowRight,
  Upload,
  Link2,
  FolderClosed,
  Clock,
  ArrowLeft,
  X,
  AlertCircle,
  FileText,
  Workflow,
  Lock,
  Compass,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Bookmark,
  Layers,
  Save,
  Copy,
  FolderPlus,
  Sliders,
  Eye,
  CheckSquare,
  Square
} from 'lucide-react';
import { Project, Studio, Editor, ProjectStatus, ProjectPriority, UserRole, ProjectTemplate } from '../types';
import { generateUniqueProjectId, MS_PER_DAY } from '../utils';
import { 
  DEFAULT_BLUEPRINT_TEMPLATES, 
  getTemplatesFromFirestore, 
  saveTemplateToFirestore, 
  deleteTemplateFromFirestore, 
  createProjectTasksFromTemplate 
} from '../services/templateService';
import TemplateBuilderModal from './TemplateBuilderModal';
import TemplateLibraryModal from './TemplateLibraryModal';
import IntakeTabCouple from './intake/IntakeTabCouple';
import IntakeTabCrew from './intake/IntakeTabCrew';
import IntakeTabFinance from './intake/IntakeTabFinance';
import IntakeTabDeliverables from './intake/IntakeTabDeliverables';
import IntakeTabStorage from './intake/IntakeTabStorage';
import IntakeTabPreview from './intake/IntakeTabPreview';

interface RegistryViewProps {
  studios: Studio[];
  editors: Editor[];
  projects: Project[];
  userRole: UserRole;
  currentStudioId?: string;
  onAddProject: (project: Omit<Project, 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateProject?: (id: string, updates: Partial<Project>) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
  onRedirectToProjects: () => void;
}

const WORKFLOW_STAGES: { id: ProjectStatus; label: string; color: string; bg: string }[] = [
  { id: 'data_received', label: 'In Progress • Received', color: 'text-gold-300', bg: 'bg-gold-500/10 border border-gold-500/20 font-medium' },
  { id: 'assigned', label: 'In Progress • Assigned', color: 'text-gold-300', bg: 'bg-gold-500/10 border border-gold-500/20 font-medium' },
  { id: 'editing', label: 'Editing • Active', color: 'text-gold-400', bg: 'bg-gold-500/20 border border-gold-400/30 font-bold animate-pulse-slow' },
  { id: 'review', label: 'In Progress • Review', color: 'text-gold-300', bg: 'bg-gold-500/10 border border-gold-500/20 font-medium' },
  { id: 'revision', label: 'In Progress • Revision', color: 'text-gold-300', bg: 'bg-gold-500/10 border border-gold-500/20 font-medium' },
  { id: 'rendering', label: 'In Progress • Rendering', color: 'text-gold-300', bg: 'bg-gold-500/10 border border-gold-500/20 font-medium' },
  { id: 'delivered', label: 'Finished • Delivered', color: 'text-luxury-green-400', bg: 'bg-luxury-green-500/10 border border-luxury-green-500/20 font-bold' },
  { id: 'closed', label: 'Finished • Closed', color: 'text-luxury-green-500', bg: 'bg-luxury-green-950 border border-luxury-green-900/20 font-medium' }
];

const PRIORITIES: { id: ProjectPriority; label: string; color: string; bg: string }[] = [
  { id: 'low', label: 'Low', color: 'text-gray-400', bg: 'bg-gray-500/10' },
  { id: 'medium', label: 'Medium', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  { id: 'high', label: 'High', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { id: 'urgent', label: 'Urgent', color: 'text-red-400', bg: 'bg-red-500/10' }
];

const DEFAULT_COVERS = [
  { name: 'Sunset Romance', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600' },
  { name: 'Golden Hour', url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=600' },
  { name: 'Palace Celebration', url: 'https://images.unsplash.com/photo-1519225495810-7512c696505a?auto=format&fit=crop&q=80&w=600' },
  { name: 'Classic Portrait', url: 'https://images.unsplash.com/photo-1507504038482-7621c330dfcf?auto=format&fit=crop&q=80&w=600' }
];

const DEFAULT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl-royal-wedding',
    name: 'Grand Royal Wedding Suite',
    description: 'Comprehensive luxury wedding film blueprint including multi-cam sync, Sangeet cut, trailer & 4K master grade.',
    eventType: 'Wedding Film',
    deliverables: ['Full Wedding Film', 'Short Film', 'Highlight', 'Reels', 'Sangeet', 'Pre-Wedding'],
    milestones: [
      'Footage Sync & Multi-cam Setup',
      'Audio Cleaning & Speech Enhancement',
      'Pre-Wedding & Sangeet Assembly Cut',
      'Teaser & 60-Sec Highlight Trailer',
      'Rough Cut / First Assembly Review',
      'Main Feature Film Editing Pass',
      'Cinematic Color Grading & 4K Master Export',
      'Sound Design & Foley Balancing',
      'Final Quality Control & Cloud Link Delivery'
    ],
    priority: 'high',
    defaultProjectAmount: 150000,
    defaultEditorPayment: 35000,
    notes: 'Luxury 4K Master Delivery. Includes 3 Instagram Reels, original raw files hard disk backup, and Google Drive download link.',
    isDefault: true
  },
  {
    id: 'tpl-pre-wedding',
    name: 'Cinematic Pre-Wedding Story',
    description: 'Romantic stylized story edit with custom music sync, warm color palette, and vertical social cuts.',
    eventType: 'Pre-Wedding Film',
    deliverables: ['Pre-Wedding', 'Reels', 'Short Film'],
    milestones: [
      'Song Selection & Audio Licensing',
      'Storyline & Pace Assembly Cut',
      'Warm Cinematic Color Grading',
      'Animated Titles & Typography Pass',
      '4K Master Render & Vertical Reels Cut'
    ],
    priority: 'medium',
    defaultProjectAmount: 45000,
    defaultEditorPayment: 12000,
    notes: 'Stylized warm cinematic look. Focus on song beat transitions and emotional storyline.',
    isDefault: true
  },
  {
    id: 'tpl-express-reels',
    name: 'Teaser & Reels Express Cut',
    description: 'Ultra fast-turnaround social media teaser package (48h delivery) with 3 vertical Instagram reels.',
    eventType: 'Cinematic Highlight',
    deliverables: ['Highlight', 'Reels'],
    milestones: [
      'Golden Moment Selection & Audio Sync',
      '60-Second Teaser Trailer Edit',
      '3x Vertical Reels (Entry, Vows, Dance)',
      'Fast Color Grade & Punchy Audio Mix',
      'Express Delivery Upload'
    ],
    priority: 'urgent',
    defaultProjectAmount: 25000,
    defaultEditorPayment: 7000,
    notes: 'Express turnaround within 48 hours of ceremony completion for rapid social sharing.',
    isDefault: true
  },
  {
    id: 'tpl-traditional-wedding',
    name: 'Classic Traditional Ceremony',
    description: 'Full ritual coverage with multi-microphone audio mastering and traditional highlight.',
    eventType: 'Wedding Film',
    deliverables: ['Full Wedding Film', 'Highlight'],
    milestones: [
      'Ceremony Sequence Multi-cam Sync',
      'Mantra & Speech Audio Enhancement',
      'Full Rituals Sequence Assembly',
      'Highlight Montage Cut',
      'Standard Color Balance',
      'Final Master Export'
    ],
    priority: 'medium',
    defaultProjectAmount: 85000,
    defaultEditorPayment: 20000,
    notes: 'Ensure all traditional rituals and key family members are given prominent screen time.',
    isDefault: true
  }
];

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<string> => {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
  });
};

export default function RegistryView({
  studios,
  editors,
  projects,
  userRole,
  currentStudioId,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onRedirectToProjects
}: RegistryViewProps) {
  // Form States
  const [activeTab, setActiveTab] = useState<'couple' | 'crew' | 'finance' | 'deliverables' | 'storage' | 'preview'>('couple');
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [venue, setVenue] = useState('');
  const [musicVibe, setMusicVibe] = useState('');
  const [eventType, setEventType] = useState('Wedding Film');
  const [studioId, setStudioId] = useState('');
  const [shootDate, setShootDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [assignedEditorId, setAssignedEditorId] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('data_received');
  const [priority, setPriority] = useState<ProjectPriority>('medium');
  const [couplePhoto, setCouplePhoto] = useState('');
  const [notes, setNotes] = useState('');

  // Split project states
  const [isSplitProject, setIsSplitProject] = useState(false);
  const [secondEditorId, setSecondEditorId] = useState('');
  const [splitPreset, setSplitPreset] = useState('50-50');
  const [firstEditorShare, setFirstEditorShare] = useState<number>(0);
  const [secondEditorShare, setSecondEditorShare] = useState<number>(0);

  // Financial specs
  const [projectAmount, setProjectAmount] = useState<number>(0);
  const [editorPayment, setEditorPayment] = useState<number>(0);
  const [otherExpenses, setOtherExpenses] = useState<number>(0);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentDueDate, setPaymentDueDate] = useState('');

  // Sync split payments when editorPayment or presets change
  useEffect(() => {
    if (!isSplitProject) {
      setFirstEditorShare(editorPayment);
      setSecondEditorShare(0);
      return;
    }

    if (splitPreset === '50-50') {
      const p1 = Math.round(editorPayment * 0.5);
      setFirstEditorShare(p1);
      setSecondEditorShare(editorPayment - p1);
    } else if (splitPreset === '60-40') {
      const p1 = Math.round(editorPayment * 0.6);
      setFirstEditorShare(p1);
      setSecondEditorShare(editorPayment - p1);
    } else if (splitPreset === '70-30') {
      const p1 = Math.round(editorPayment * 0.7);
      setFirstEditorShare(p1);
      setSecondEditorShare(editorPayment - p1);
    } else if (splitPreset === '80-20') {
      const p1 = Math.round(editorPayment * 0.8);
      setFirstEditorShare(p1);
      setSecondEditorShare(editorPayment - p1);
    }
  }, [editorPayment, isSplitProject, splitPreset]);

  // Storage specs
  const [hardDiskName, setHardDiskName] = useState('');
  const [dataSize, setDataSize] = useState('');
  const [location, setLocation] = useState('');
  const [backupStatus, setBackupStatus] = useState<'pending' | 'backed_up'>('pending');
  const [googleDriveLink, setGoogleDriveLink] = useState('');
  const [rawDataFolder, setRawDataFolder] = useState('');
  const [deliveryFolder, setDeliveryFolder] = useState('');
  const [finalExportFolder, setFinalExportFolder] = useState('');

  // Deliverables Multi-select
  const DEFAULT_FUNCTIONS = ['Full Wedding Film', 'Short Film', 'Highlight', 'Reels', 'Sangeet', 'Pre-Wedding', 'Others'];
  const [availableFunctions, setAvailableFunctions] = useState<string[]>(DEFAULT_FUNCTIONS);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [customFunctionInput, setCustomFunctionInput] = useState('');

  // Custom Milestones State
  const DEFAULT_MILESTONES = [
    'Footage Sync & Multi-cam Setup',
    'Song Selection & Audio Sync',
    'Rough Cut / First Cut montage',
    'Main Highlight Draft Completed',
    'Cinematic Color Grading Pass',
    'Sound Design & Foley Balance',
    'Final Quality Check & Cloud Upload'
  ];
  const [customMilestones, setCustomMilestones] = useState<{ id: string; label: string; completed: boolean }[]>(() =>
    DEFAULT_MILESTONES.map((m, idx) => ({
      id: `milestone-${idx}-${Date.now()}`,
      label: m,
      completed: false
    }))
  );
  const [newMilestoneInput, setNewMilestoneInput] = useState('');

  // Project Blueprint Templates State
  const [templates, setTemplates] = useState<ProjectTemplate[]>(DEFAULT_BLUEPRINT_TEMPLATES);
  const [activeBlueprint, setActiveBlueprint] = useState<ProjectTemplate | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  
  // Modals state
  const [showTemplateLibrary, setShowTemplateLibrary] = useState<boolean>(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState<boolean>(false);
  const [editingTemplateForBuilder, setEditingTemplateForBuilder] = useState<ProjectTemplate | null>(null);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState<boolean>(false);
  const [saveTemplateName, setSaveTemplateName] = useState<string>('');
  const [saveTemplateDesc, setSaveTemplateDesc] = useState<string>('');

  // Load templates from Firestore on mount
  useEffect(() => {
    let isMounted = true;
    getTemplatesFromFirestore().then(loaded => {
      if (isMounted && loaded && loaded.length > 0) {
        setTemplates(loaded);
      }
    }).catch(err => {
      console.warn("Could not load templates from Firestore:", err);
    });
    return () => { isMounted = false; };
  }, []);

  // Interactive Template Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState<ProjectTemplate | null>(null);
  const [previewMilestonesState, setPreviewMilestonesState] = useState<{ id: string; label: string; completed: boolean }[]>([]);

  const handleOpenPreviewTemplate = (tpl: ProjectTemplate) => {
    setPreviewTemplate(tpl);
    if (tpl.milestones && tpl.milestones.length > 0) {
      setPreviewMilestonesState(
        tpl.milestones.map((m, idx) => ({
          id: `prev-m-${idx}-${Date.now()}`,
          label: m,
          completed: false
        }))
      );
    } else {
      setPreviewMilestonesState([]);
    }
  };

  const togglePreviewMilestone = (id: string) => {
    setPreviewMilestonesState(prev =>
      prev.map(m => m.id === id ? { ...m, completed: !m.completed } : m)
    );
  };

  const applyTemplate = (template: ProjectTemplate) => {
    setActiveBlueprint(template);
    setSelectedTemplateId(template.id);
    setEventType(template.eventType);
    
    // Ensure all deliverables exist in availableFunctions
    if (template.deliverables && template.deliverables.length > 0) {
      const newAvail = [...availableFunctions];
      template.deliverables.forEach((d) => {
        if (!newAvail.includes(d)) {
          newAvail.push(d);
        }
      });
      setAvailableFunctions(newAvail);
      setSelectedFunctions(template.deliverables);
    }

    if (template.milestones && template.milestones.length > 0) {
      setCustomMilestones(
        template.milestones.map((m, idx) => ({
          id: `milestone-${idx}-${Date.now()}`,
          label: m,
          completed: false
        }))
      );
    }

    if (template.priority) {
      setPriority(template.priority);
    }

    const pAmt = template.defaultProjectAmount !== undefined && template.defaultProjectAmount > 0 ? template.defaultProjectAmount : 0;
    if (pAmt > 0) {
      setProjectAmount(pAmt);
    }

    const ePay = template.defaultEditorPayment !== undefined && template.defaultEditorPayment > 0 ? template.defaultEditorPayment : 0;
    if (ePay > 0) {
      setEditorPayment(ePay);
    }

    if (template.defaultOtherExpenses !== undefined && template.defaultOtherExpenses > 0) {
      setOtherExpenses(template.defaultOtherExpenses);
    }

    if (template.defaultAdvancePercentage !== undefined && template.defaultAdvancePercentage > 0 && pAmt > 0) {
      setAdvancePayment(Math.round((pAmt * template.defaultAdvancePercentage) / 100));
    }

    if (template.isSplitProject) {
      setIsSplitProject(true);
      if (template.defaultFirstEditorShare) {
        setFirstEditorShare(template.defaultFirstEditorShare);
      } else if (ePay > 0) {
        setFirstEditorShare(Math.round(ePay * 0.6));
      }
      if (template.defaultSecondEditorShare) {
        setSecondEditorShare(template.defaultSecondEditorShare);
      } else if (ePay > 0) {
        setSecondEditorShare(Math.round(ePay * 0.4));
      }
      if (template.defaultSecondEditorId) {
        setSecondEditorId(template.defaultSecondEditorId);
      }
    } else {
      setIsSplitProject(false);
    }

    if (template.defaultPrimaryEditorId) {
      setAssignedEditorId(template.defaultPrimaryEditorId);
    }

    if (template.estimatedDataSize) {
      setDataSize(template.estimatedDataSize);
    }

    // Auto-calculate delivery date from shoot date if available
    if (shootDate && template.defaultTurnaroundDays) {
      const sDate = new Date(shootDate);
      sDate.setDate(sDate.getDate() + template.defaultTurnaroundDays);
      setDeliveryDate(sDate.toISOString().slice(0, 10));
    }

    if (template.notes) {
      setNotes(template.notes);
    }

    setShowTemplateLibrary(false);
    setPreviewTemplate(null);
    setToast({
      message: `✨ Applied Project Blueprint: "${template.name}" with ${template.tasks?.length || 0} auto-tasks & ${template.deliverables?.length || 0} deliverables.`,
      type: 'success'
    });
  };

  const handleSaveBlueprint = async (template: ProjectTemplate) => {
    await saveTemplateToFirestore(template);
    const updated = await getTemplatesFromFirestore();
    setTemplates(updated);
    setToast({
      message: `💾 Blueprint "${template.name}" saved to studio library.`,
      type: 'success'
    });
  };

  const handleDeleteBlueprint = async (id: string) => {
    await deleteTemplateFromFirestore(id);
    const updated = await getTemplatesFromFirestore();
    setTemplates(updated);
    if (selectedTemplateId === id) {
      setSelectedTemplateId('');
      setActiveBlueprint(null);
    }
    setToast({ message: 'Blueprint template removed from library.', type: 'success' });
  };

  const handleSaveCurrentAsTemplate = async () => {
    if (!saveTemplateName.trim()) {
      setToast({ message: 'Template Blueprint name is required.', type: 'error' });
      return;
    }

    const newTpl: ProjectTemplate = {
      id: `tpl-custom-${Date.now()}`,
      name: saveTemplateName.trim(),
      description: saveTemplateDesc.trim() || 'Custom saved studio project blueprint.',
      eventType: eventType || 'Wedding Film',
      deliverables: selectedFunctions.length > 0 ? selectedFunctions : [eventType],
      milestones: customMilestones.map(m => m.label),
      priority,
      defaultProjectAmount: projectAmount > 0 ? projectAmount : undefined,
      defaultEditorPayment: editorPayment > 0 ? editorPayment : undefined,
      defaultOtherExpenses: otherExpenses > 0 ? otherExpenses : undefined,
      defaultAdvancePercentage: projectAmount > 0 ? Math.round((advancePayment / projectAmount) * 100) : 40,
      isSplitProject,
      defaultFirstEditorShare: isSplitProject ? firstEditorShare : undefined,
      defaultSecondEditorShare: isSplitProject ? secondEditorShare : undefined,
      defaultPrimaryEditorId: assignedEditorId || undefined,
      defaultSecondEditorId: isSplitProject ? secondEditorId || undefined : undefined,
      notes: notes.trim() || undefined,
      estimatedDataSize: dataSize.trim() || undefined,
      defaultTurnaroundDays: 30,
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    await saveTemplateToFirestore(newTpl);
    const updated = await getTemplatesFromFirestore();
    setTemplates(updated);

    setShowSaveTemplateModal(false);
    setSaveTemplateName('');
    setSaveTemplateDesc('');
    setSelectedTemplateId(newTpl.id);
    setActiveBlueprint(newTpl);
    setToast({ message: `💾 Saved new Blueprint Template: "${newTpl.name}"`, type: 'success' });
  };

  // UI state
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Auto-hide toast after 6 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Dynamic schedule indicators & Quick offset helpers
  const getDaysDifference = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / MS_PER_DAY);
    return diffDays;
  };

  const getDaysToDeadline = (deadlineStr: string) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    if (isNaN(deadline.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / MS_PER_DAY);
    return diffDays;
  };

  const setDeliveryOffset = (days: number) => {
    if (shootDate) {
      const sDate = new Date(shootDate);
      if (!isNaN(sDate.getTime())) {
        sDate.setDate(sDate.getDate() + days);
        const formatted = sDate.toISOString().split('T')[0];
        setDeliveryDate(formatted);
        setValidationError('');
      }
    }
  };

  const daysDifference = getDaysDifference(shootDate, deliveryDate);
  const daysToDeadline = getDaysToDeadline(deliveryDate);

  // Set studio role restriction if applicable
  useEffect(() => {
    if (userRole === 'studio' && currentStudioId) {
      setStudioId(currentStudioId);
    } else if (studios.length > 0 && !studioId) {
      setStudioId(studios[0].id);
    }
  }, [userRole, currentStudioId, studios, studioId]);

  // Handle adding custom cinematic deliverables
  const handleAddCustomFunction = () => {
    if (customFunctionInput.trim()) {
      const formatted = customFunctionInput.trim();
      if (!availableFunctions.includes(formatted)) {
        setAvailableFunctions([...availableFunctions, formatted]);
      }
      if (!selectedFunctions.includes(formatted)) {
        setSelectedFunctions([...selectedFunctions, formatted]);
      }
      setCustomFunctionInput('');
    }
  };

  // Finance calculations
  const calculatedRemainingBalance = Math.max(0, projectAmount - advancePayment);
  const estimatedProfitMargin = projectAmount - editorPayment - otherExpenses;

  // Save implementation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!projectName.trim()) {
      const msg = 'Wedding Project Name is required.';
      console.warn(`⚠️ RegistryView validation error: ${msg}`);
      setValidationError(msg);
      setToast({ message: msg, type: 'error' });
      return;
    }
    if (!groomName.trim() || !brideName.trim()) {
      const msg = 'Both Groom & Bride names are required.';
      console.warn(`⚠️ RegistryView validation error: ${msg}`);
      setValidationError(msg);
      setToast({ message: msg, type: 'error' });
      return;
    }
    if (!shootDate || !deliveryDate) {
      const msg = 'Both Shoot Date and Delivery Deadline are required.';
      console.warn(`⚠️ RegistryView validation error: ${msg}`);
      setValidationError(msg);
      setToast({ message: msg, type: 'error' });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const selectedStudio = studios.find(s => s.id === studioId);
      const selectedEditor = editors.find(ed => ed.id === assignedEditorId);
      const selectedSecondEditor = isSplitProject ? editors.find(ed => ed.id === secondEditorId) : null;
      
      const finalCouplePhoto = couplePhoto || DEFAULT_COVERS[0].url;
      const coupleName = `${groomName.trim()} & ${brideName.trim()}`;
      const finalEventType = selectedFunctions.length > 0 ? selectedFunctions.join(', ') : eventType;

      if (editingProject && onUpdateProject) {
        await onUpdateProject(editingProject.id, {
          projectName: projectName.trim(),
          brideName: brideName.trim(),
          groomName: groomName.trim(),
          coupleName,
          clientPhone: clientPhone.trim() || undefined,
          clientEmail: clientEmail.trim() || undefined,
          venue: venue.trim() || undefined,
          paymentMode,
          paymentDueDate: paymentDueDate || undefined,
          eventType: finalEventType,
          studioId,
          studioName: selectedStudio ? selectedStudio.name : 'Direct Client',
          shootDate,
          deliveryDate,
          assignedEditorId: assignedEditorId || undefined,
          assignedEditorName: selectedEditor ? selectedEditor.name : 'Unassigned',
          isSplitProject,
          secondEditorId: isSplitProject ? (secondEditorId || undefined) : undefined,
          secondEditorName: isSplitProject ? (selectedSecondEditor ? selectedSecondEditor.name : 'Unassigned') : undefined,
          firstEditorShare: isSplitProject ? firstEditorShare : undefined,
          secondEditorShare: isSplitProject ? secondEditorShare : undefined,
          status,
          priority,
          projectAmount,
          editorPayment,
          otherExpenses,
          advancePayment,
          remainingBalance: calculatedRemainingBalance,
          couplePhoto: finalCouplePhoto,
          notes: notes.trim(),
          hardDiskName: hardDiskName.trim(),
          dataSize: dataSize.trim(),
          location: location.trim() || undefined,
          backupStatus,
          googleDriveLink: googleDriveLink.trim(),
          rawDataFolder: rawDataFolder.trim(),
          deliveryFolder: deliveryFolder.trim(),
          finalExportFolder: finalExportFolder.trim(),
          customMilestones: customMilestones
        });

        setToast({ 
          message: `✨ Project "${coupleName}" updated successfully!`, 
          type: 'success' 
        });
        setEditingProject(null);
        resetForm();
        return;
      }

      // Auto-generate unique project ID without collisions
      const autoId = generateUniqueProjectId(projects);

      await onAddProject({
        id: autoId,
        projectName: projectName.trim(),
        brideName: brideName.trim(),
        groomName: groomName.trim(),
        coupleName,
        clientPhone: clientPhone.trim() || undefined,
        clientEmail: clientEmail.trim() || undefined,
        venue: venue.trim() || undefined,
        paymentMode,
        paymentDueDate: paymentDueDate || undefined,
        eventType: finalEventType,
        studioId,
        studioName: selectedStudio ? selectedStudio.name : 'Direct Client',
        shootDate,
        deliveryDate,
        assignedEditorId: assignedEditorId || undefined,
        assignedEditorName: selectedEditor ? selectedEditor.name : 'Unassigned',
        isSplitProject,
        secondEditorId: isSplitProject ? (secondEditorId || undefined) : undefined,
        secondEditorName: isSplitProject ? (selectedSecondEditor ? selectedSecondEditor.name : 'Unassigned') : undefined,
        firstEditorShare: isSplitProject ? firstEditorShare : undefined,
        secondEditorShare: isSplitProject ? secondEditorShare : undefined,
        status,
        priority,
        projectAmount,
        editorPayment,
        otherExpenses,
        advancePayment,
        remainingBalance: calculatedRemainingBalance,
        couplePhoto: finalCouplePhoto,
        notes: notes.trim(),
        hardDiskName: hardDiskName.trim(),
        dataSize: dataSize.trim(),
        location: location.trim() || undefined,
        backupStatus,
        googleDriveLink: googleDriveLink.trim(),
        rawDataFolder: rawDataFolder.trim(),
        deliveryFolder: deliveryFolder.trim(),
        finalExportFolder: finalExportFolder.trim(),
        customMilestones: customMilestones
      });

      // Auto-instantiate standard workflow tasks from active blueprint if configured
      let createdTasksCount = 0;
      if (activeBlueprint && activeBlueprint.tasks && activeBlueprint.tasks.length > 0) {
        try {
          createdTasksCount = await createProjectTasksFromTemplate(
            autoId,
            coupleName,
            activeBlueprint,
            shootDate,
            assignedEditorId,
            secondEditorId
          );
        } catch (tErr) {
          console.warn("Could not auto-generate tasks from blueprint:", tErr);
        }
      }

      setRegistrationSuccess(autoId);
      setToast({ 
        message: `✨ Project "${coupleName}" registered!${createdTasksCount > 0 ? ` Initialized ${createdTasksCount} workflow tasks from "${activeBlueprint?.name}".` : ''}`, 
        type: 'success' 
      });
      
      // Auto scroll to top to see success
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error("❌ RegistryView: Failed to save wedding project:", err);
      const errorMsg = `Failed to save wedding project: ${err.message || err}`;
      setValidationError(errorMsg);
      setToast({
        message: errorMsg,
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingProject(null);
    setProjectName('');
    setBrideName('');
    setGroomName('');
    setClientPhone('');
    setClientEmail('');
    setVenue('');
    setMusicVibe('');
    setEventType('Wedding Film');
    setShootDate('');
    setDeliveryDate('');
    setAssignedEditorId('');
    setStatus('data_received');
    setPriority('medium');
    setCouplePhoto('');
    setNotes('');
    setProjectAmount(0);
    setEditorPayment(0);
    setOtherExpenses(0);
    setAdvancePayment(0);
    setPaymentMode('UPI');
    setPaymentDueDate('');
    setHardDiskName('');
    setDataSize('');
    setLocation('');
    setBackupStatus('pending');
    setGoogleDriveLink('');
    setRawDataFolder('');
    setDeliveryFolder('');
    setFinalExportFolder('');
    setSelectedFunctions([]);
    setRegistrationSuccess(null);
    setValidationError('');
    setIsSplitProject(false);
    setSecondEditorId('');
    setSplitPreset('50-50');
    setFirstEditorShare(0);
    setSecondEditorShare(0);
    setActiveTab('couple');
    setCustomMilestones(
      DEFAULT_MILESTONES.map((m, idx) => ({
        id: `milestone-${idx}-${Date.now()}`,
        label: m,
        completed: false
      }))
    );
    setNewMilestoneInput('');
  };

  if (registrationSuccess) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-gold-500/10 blur-[120px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel rounded-[32px] p-8 md:p-12 text-center space-y-8 border-gold-500/20 shadow-2xl relative overflow-hidden"
        >
          {/* Subtle floral/geometric background watermark */}
          <div className="absolute inset-0 opacity-[0.01] pointer-events-none select-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='40' fill='none' stroke='gold' stroke-width='0.5'/%3E%3C/svg%3E")` }} />

          <div className="w-20 h-20 bg-gold-500/10 text-gold-400 border border-gold-500/30 rounded-full flex items-center justify-center mx-auto text-3xl shadow-lg shadow-gold-500/5 gold-glow animate-pulse">
            <Check className="w-10 h-10" />
          </div>

          <div className="space-y-4">
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-gold-400 bg-gold-500/10 px-4 py-1.5 rounded-full border border-gold-500/25 uppercase inline-block">
              Royal Wedding Cataloged
            </span>
            <h2 className="text-3xl font-bold text-white tracking-tight font-display">Wedding Registered Successfully!</h2>
            <div className="inline-flex items-center space-x-2 bg-charcoal-900/80 px-4 py-1.5 rounded-xl border border-white/5">
              <span className="text-gray-500 text-xs font-mono uppercase">Project ID:</span>
              <span className="text-gold-300 font-bold font-mono tracking-wider">{registrationSuccess}</span>
            </div>
            <p className="text-gray-300 text-sm max-w-md mx-auto mt-2 leading-relaxed">
              The cinematic film parameters for <strong className="text-gold-400 font-semibold">{groomName} & {brideName}</strong> have been successfully committed to our secure cloud repository.
            </p>
          </div>

          <div className="p-6 bg-charcoal-900/60 rounded-2xl border border-white/5 max-w-md mx-auto grid grid-cols-2 gap-y-4 gap-x-6 text-left text-xs font-mono">
            <div>
              <span className="text-gray-500 block text-[9px] uppercase tracking-wider font-bold">Partner Studio</span>
              <span className="text-gray-200 font-semibold truncate block mt-1">{studios.find(s => s.id === studioId)?.name || 'Direct Client'}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[9px] uppercase tracking-wider font-bold">Lead Editor</span>
              <span className="text-gold-300 font-semibold truncate block mt-1">👤 {editors.find(e => e.id === assignedEditorId)?.name || 'Unassigned'}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[9px] uppercase tracking-wider font-bold">Shoot Date</span>
              <span className="text-gray-200 font-semibold block mt-1">📅 {shootDate}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[9px] uppercase tracking-wider font-bold">Delivery Deadline</span>
              <span className="text-red-400 font-semibold block mt-1">⏳ {deliveryDate}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 relative z-10">
            <button
              type="button"
              onClick={onRedirectToProjects}
              className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] gold-glow uppercase tracking-wider"
            >
              View in Project List
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="w-full sm:w-auto px-8 py-3.5 bg-charcoal-800/80 hover:bg-charcoal-700 border border-white/10 text-gray-200 hover:text-white font-bold text-xs rounded-xl cursor-pointer transition-all duration-200 uppercase tracking-wider"
            >
              Register Another Wedding
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[32px] p-6 md:p-10 bg-charcoal-950/80 border border-white/10 shadow-2xl space-y-10 min-h-screen text-gray-200">
      {/* Texture noise pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      
      {/* Ambient soft cinematic glowing backdrops */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gold-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-luxury-green-900/10 blur-[150px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-gold-500/5 blur-[120px] pointer-events-none" />

      {/* Elegant minimalist line watermark in gold */}
      <div className="absolute right-12 top-14 opacity-[0.03] pointer-events-none select-none hidden lg:block">
        <svg width="180" height="180" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gold-400">
          <path d="M120,40 A65,65 0 0,1 185,105" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M70,105 A65,65 0 0,1 135,40" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="78" y1="105" x2="185" y2="105" stroke="currentColor" strokeWidth="1.2" />
          <line x1="105" y1="55" x2="105" y2="105" stroke="currentColor" strokeWidth="1.2" />
          <line x1="105" y1="80" x2="135" y2="80" stroke="currentColor" strokeWidth="1.2" />
          <line x1="154" y1="105" x2="154" y2="160" stroke="currentColor" strokeWidth="1.2" />
          <line x1="135" y1="105" x2="135" y2="160" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="85" cy="125" r="4" fill="currentColor" />
          <text x="130" y="190" fill="currentColor" fontSize="10" fontFamily="sans-serif" letterSpacing="5" textAnchor="middle" fontWeight="bold">THE FRAME CUT</text>
        </svg>
      </div>

      {/* Page Header */}
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/10 pb-8">
        <div>
          <div className="flex items-center space-x-2 text-gold-400 font-mono text-xs uppercase tracking-[0.2em] font-bold mb-2">
            <Film className="w-4 h-4 text-gold-400" />
            <span>Project Intake & Onboarding</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight font-display">
            Register New Wedding Project
          </h1>
          <p className="text-sm md:text-base text-gray-400 mt-2 max-w-xl font-medium leading-relaxed">
            Record client specifications, assign video editors, set hard drive locations, custom deliverables, and project financials.
          </p>
        </div>

        <button
          type="button"
          onClick={onRedirectToProjects}
          className="flex items-center space-x-2 px-5 py-3 bg-charcoal-900/60 hover:bg-charcoal-800/80 border border-white/10 text-gray-300 hover:text-white rounded-xl text-sm transition-all cursor-pointer font-semibold shadow-md hover:shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>
      </div>

      {/* PROJECT TEMPLATE BLUEPRINTS BAR */}
      <div className="relative z-10 glass-panel p-5 rounded-2xl border border-gold-500/20 bg-gradient-to-r from-charcoal-900/90 via-charcoal-900/60 to-charcoal-950/90 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 font-bold gold-glow">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">
                  Project Templates & Blueprints
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold-500/15 text-gold-300 border border-gold-500/25">
                  {templates.length} Blueprints
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Instantiate predefined deliverables, standard task pipelines & budget split structures in 1-click.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowTemplateLibrary(true)}
              className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-charcoal-950 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-2 shadow-md gold-glow"
            >
              <Sparkles className="w-4 h-4" />
              <span>Blueprint Repository ({templates.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingTemplateForBuilder(null);
                setShowTemplateBuilder(true);
              }}
              className="px-3.5 py-2 bg-charcoal-800 hover:bg-charcoal-700 border border-gold-500/30 text-gold-300 hover:text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-md"
            >
              <Plus className="w-3.5 h-3.5 text-gold-400" />
              <span>+ New Blueprint</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSaveTemplateModal(true)}
              className="px-3.5 py-2 bg-charcoal-800/80 hover:bg-charcoal-700 border border-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-md"
            >
              <Bookmark className="w-3.5 h-3.5 text-gray-400" />
              <span>Save Form as Blueprint</span>
            </button>
          </div>
        </div>

        {/* Quick Pills Selector */}
        <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-gold-400 uppercase tracking-wider font-semibold mr-1 flex items-center space-x-1">
            <span>⚡ Quick Instantiate:</span>
          </span>
          {templates.map((tpl) => {
            const isSelected = selectedTemplateId === tpl.id;
            return (
              <div key={tpl.id} className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 border cursor-pointer ${
                    isSelected
                      ? 'bg-gold-500 text-charcoal-950 border-gold-400 shadow-md gold-glow'
                      : 'bg-charcoal-900/80 hover:bg-charcoal-800 text-gray-300 hover:text-white border-white/10'
                  }`}
                >
                  <span>{tpl.name}</span>
                  {tpl.tasks && tpl.tasks.length > 0 && (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-charcoal-950/40 text-charcoal-950 font-bold' : 'bg-charcoal-800 text-gold-400'}`}>
                      {tpl.tasks.length} tasks
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenPreviewTemplate(tpl)}
                  title={`Preview "${tpl.name}" breakdown & milestones`}
                  className="p-1.5 rounded-xl bg-charcoal-900/80 hover:bg-gold-500/20 text-gray-400 hover:text-gold-300 border border-white/10 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTIVE BLUEPRINT INDICATOR BANNER */}
      {activeBlueprint && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 p-4 md:p-5 bg-gradient-to-r from-gold-950/40 via-charcoal-900 to-charcoal-950 border border-gold-500/40 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="flex items-start space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-gold-500/20 border border-gold-500/40 text-gold-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gold-400">
                  Active Instantiated Blueprint
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold-500/20 text-gold-300 border border-gold-500/30">
                  {activeBlueprint.eventType}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                  {activeBlueprint.defaultTurnaroundDays || 30} Days Turnaround
                </span>
              </div>
              <h4 className="text-base font-bold text-white font-display">
                {activeBlueprint.name}
              </h4>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-gray-300 pt-0.5">
                <span>📋 <strong>{activeBlueprint.tasks?.length || 0}</strong> Auto-Workflow Tasks</span>
                <span>•</span>
                <span>🎬 <strong>{activeBlueprint.deliverables?.length || 0}</strong> Deliverables</span>
                <span>•</span>
                <span>💰 Budget: <strong>₹{(activeBlueprint.defaultProjectAmount || 0).toLocaleString('en-IN')}</strong></span>
                <span>•</span>
                <span>✂️ Editor Wage: <strong>₹{(activeBlueprint.defaultEditorPayment || 0).toLocaleString('en-IN')}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
            <button
              type="button"
              onClick={() => {
                setEditingTemplateForBuilder(activeBlueprint);
                setShowTemplateBuilder(true);
              }}
              className="px-3 py-1.5 bg-charcoal-800 hover:bg-charcoal-700 text-gold-300 rounded-xl text-xs font-mono font-bold border border-gold-500/30 cursor-pointer flex items-center space-x-1"
            >
              <Edit className="w-3 h-3" />
              <span>Edit Blueprint</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveBlueprint(null);
                setSelectedTemplateId('');
                setToast({ message: 'Blueprint cleared from form.', type: 'success' });
              }}
              className="px-3 py-1.5 bg-charcoal-800 hover:bg-red-500/20 text-gray-400 hover:text-red-300 rounded-xl text-xs font-mono border border-white/5 cursor-pointer flex items-center space-x-1"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Validation Banner */}
      {validationError && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center space-x-3 shadow-md"
        >
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
          <span className="font-semibold">{validationError}</span>
        </motion.div>
      )}

      {/* INTAKE ONBOARDING TAB & STEPPER SYSTEM */}
      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        
        {/* TAB SYSTEM NAVIGATION BAR */}
        <div className="glass-panel p-3 md:p-4 rounded-3xl border border-gold-500/20 shadow-2xl bg-charcoal-950/90 backdrop-blur-xl space-y-3">
          
          {/* Progress Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 pt-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-gold-400 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Intake & Onboarding Wizard</span>
              </span>
              <span className="text-gray-500 font-mono text-xs">•</span>
              <span className="text-xs font-mono text-gray-300">
                Step {['couple', 'crew', 'finance', 'deliverables', 'storage', 'preview'].indexOf(activeTab) + 1} of 6
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              {editingProject && (
                <span className="px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-mono font-bold flex items-center space-x-1">
                  <span>Editing: {editingProject.id}</span>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('preview');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className="px-3 py-1.5 bg-gold-500/15 hover:bg-gold-500/25 border border-gold-500/30 text-gold-300 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Quick Review & Register</span>
              </button>
            </div>
          </div>

          {/* Tab Selection Buttons Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
            {[
              {
                id: 'couple',
                num: '1',
                icon: '💍',
                title: 'Couple & Event',
                isComplete: !!(groomName.trim() && brideName.trim() && projectName.trim()),
                activeClass: 'bg-gradient-to-br from-rose-500/25 via-pink-950/25 to-charcoal-900 text-white border-rose-500/70 shadow-lg shadow-rose-500/15 ring-1 ring-rose-500/30',
                hoverClass: 'hover:border-rose-500/40 hover:bg-rose-500/5',
                activeText: 'text-rose-300 font-bold',
                badgeActive: 'bg-rose-500/30 text-rose-200 border border-rose-500/40',
                accentBar: 'bg-rose-500',
                subDot: 'bg-rose-400'
              },
              {
                id: 'crew',
                num: '2',
                icon: '🎬',
                title: 'Crew & Timeline',
                isComplete: !!(shootDate && deliveryDate),
                activeClass: 'bg-gradient-to-br from-sky-500/25 via-cyan-950/25 to-charcoal-900 text-white border-sky-500/70 shadow-lg shadow-sky-500/15 ring-1 ring-sky-500/30',
                hoverClass: 'hover:border-sky-500/40 hover:bg-sky-500/5',
                activeText: 'text-sky-300 font-bold',
                badgeActive: 'bg-sky-500/30 text-sky-200 border border-sky-500/40',
                accentBar: 'bg-sky-500',
                subDot: 'bg-sky-400'
              },
              {
                id: 'finance',
                num: '3',
                icon: '💰',
                title: 'Ledger & Finance',
                isComplete: projectAmount > 0,
                activeClass: 'bg-gradient-to-br from-emerald-500/25 via-teal-950/25 to-charcoal-900 text-white border-emerald-500/70 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-500/30',
                hoverClass: 'hover:border-emerald-500/40 hover:bg-emerald-500/5',
                activeText: 'text-emerald-300 font-bold',
                badgeActive: 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/40',
                accentBar: 'bg-emerald-500',
                subDot: 'bg-emerald-400'
              },
              {
                id: 'deliverables',
                num: '4',
                icon: '🎞️',
                title: 'Deliverables & Tasks',
                isComplete: selectedFunctions.length > 0,
                activeClass: 'bg-gradient-to-br from-purple-500/25 via-indigo-950/25 to-charcoal-900 text-white border-purple-500/70 shadow-lg shadow-purple-500/15 ring-1 ring-purple-500/30',
                hoverClass: 'hover:border-purple-500/40 hover:bg-purple-500/5',
                activeText: 'text-purple-300 font-bold',
                badgeActive: 'bg-purple-500/30 text-purple-200 border border-purple-500/40',
                accentBar: 'bg-purple-500',
                subDot: 'bg-purple-400'
              },
              {
                id: 'storage',
                num: '5',
                icon: '💾',
                title: 'Storage & Cloud',
                isComplete: !!(hardDiskName || googleDriveLink),
                activeClass: 'bg-gradient-to-br from-amber-500/25 via-orange-950/25 to-charcoal-900 text-white border-amber-500/70 shadow-lg shadow-amber-500/15 ring-1 ring-amber-500/30',
                hoverClass: 'hover:border-amber-500/40 hover:bg-amber-500/5',
                activeText: 'text-amber-300 font-bold',
                badgeActive: 'bg-amber-500/30 text-amber-200 border border-amber-500/40',
                accentBar: 'bg-amber-500',
                subDot: 'bg-amber-400'
              },
              {
                id: 'preview',
                num: '6',
                icon: '🎴',
                title: 'Poster & Review',
                isComplete: false,
                activeClass: 'bg-gradient-to-br from-gold-500/30 via-yellow-950/30 to-charcoal-900 text-white border-gold-500/80 shadow-lg shadow-gold-500/20 ring-1 ring-gold-500/40',
                hoverClass: 'hover:border-gold-500/40 hover:bg-gold-500/5',
                activeText: 'text-gold-300 font-bold',
                badgeActive: 'bg-gold-500/30 text-gold-200 border border-gold-500/40',
                accentBar: 'bg-gold-500',
                subDot: 'bg-gold-400'
              }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setValidationError('');
                  }}
                  className={`p-3.5 rounded-2xl text-left border transition-all relative flex flex-col justify-between cursor-pointer group select-none overflow-hidden ${
                    isActive
                      ? tab.activeClass
                      : `bg-charcoal-900/60 text-gray-400 border-white/5 ${tab.hoverClass} hover:text-gray-200`
                  }`}
                >
                  {/* Top indicator bar for active tab */}
                  {isActive && (
                    <div className={`absolute top-0 left-0 right-0 h-1 ${tab.accentBar}`} />
                  )}

                  <div className="flex items-center justify-between w-full mb-2">
                    <span className="text-lg leading-none filter drop-shadow">{tab.icon}</span>
                    {tab.isComplete ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-charcoal-950 text-[10px] font-bold flex items-center justify-center font-mono shadow">
                        ✓
                      </span>
                    ) : (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${
                        isActive ? tab.badgeActive : 'bg-charcoal-800 text-gray-500'
                      }`}>
                        #{tab.num}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 overflow-hidden w-full">
                    {isActive && <span className={`w-1.5 h-1.5 rounded-full ${tab.subDot} shrink-0 animate-pulse`} />}
                    <span className={`text-xs font-display uppercase tracking-wide truncate ${
                      isActive ? tab.activeText : 'text-gray-300 group-hover:text-white font-medium'
                    }`}>
                      {tab.title}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE TAB CONTENT PANE */}
        <div className={`glass-panel p-6 md:p-8 rounded-3xl border shadow-2xl bg-charcoal-950/80 backdrop-blur-xl transition-all duration-300 ${
          activeTab === 'couple' ? 'border-rose-500/25 shadow-rose-500/5' :
          activeTab === 'crew' ? 'border-sky-500/25 shadow-sky-500/5' :
          activeTab === 'finance' ? 'border-emerald-500/25 shadow-emerald-500/5' :
          activeTab === 'deliverables' ? 'border-purple-500/25 shadow-purple-500/5' :
          activeTab === 'storage' ? 'border-amber-500/25 shadow-amber-500/5' :
          'border-gold-500/30 shadow-gold-500/5'
        }`}>
          <AnimatePresence mode="wait">
            {activeTab === 'couple' && (
              <motion.div
                key="tab-couple"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <IntakeTabCouple
                  groomName={groomName}
                  setGroomName={setGroomName}
                  brideName={brideName}
                  setBrideName={setBrideName}
                  projectName={projectName}
                  setProjectName={setProjectName}
                  eventType={eventType}
                  setEventType={setEventType}
                  studioId={studioId}
                  setStudioId={setStudioId}
                  studios={studios}
                  userRole={userRole}
                  clientPhone={clientPhone}
                  setClientPhone={setClientPhone}
                  clientEmail={clientEmail}
                  setClientEmail={setClientEmail}
                  venue={venue}
                  setVenue={setVenue}
                  musicVibe={musicVibe}
                  setMusicVibe={setMusicVibe}
                  onClearError={() => setValidationError('')}
                />
              </motion.div>
            )}

            {activeTab === 'crew' && (
              <motion.div
                key="tab-crew"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <IntakeTabCrew
                  shootDate={shootDate}
                  setShootDate={setShootDate}
                  deliveryDate={deliveryDate}
                  setDeliveryDate={setDeliveryDate}
                  assignedEditorId={assignedEditorId}
                  setAssignedEditorId={setAssignedEditorId}
                  status={status}
                  setStatus={setStatus}
                  priority={priority}
                  setPriority={setPriority}
                  isSplitProject={isSplitProject}
                  setIsSplitProject={setIsSplitProject}
                  secondEditorId={secondEditorId}
                  setSecondEditorId={setSecondEditorId}
                  splitPreset={splitPreset}
                  setSplitPreset={setSplitPreset}
                  firstEditorShare={firstEditorShare}
                  setFirstEditorShare={setFirstEditorShare}
                  secondEditorShare={secondEditorShare}
                  setSecondEditorShare={setSecondEditorShare}
                  editorPayment={editorPayment}
                  editors={editors}
                  projects={projects}
                  userRole={userRole}
                  workflowStages={WORKFLOW_STAGES}
                  priorities={PRIORITIES}
                  onClearError={() => setValidationError('')}
                />
              </motion.div>
            )}

            {activeTab === 'finance' && (
              <motion.div
                key="tab-finance"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <IntakeTabFinance
                  projectAmount={projectAmount}
                  setProjectAmount={setProjectAmount}
                  editorPayment={editorPayment}
                  setEditorPayment={setEditorPayment}
                  otherExpenses={otherExpenses}
                  setOtherExpenses={setOtherExpenses}
                  advancePayment={advancePayment}
                  setAdvancePayment={setAdvancePayment}
                  paymentMode={paymentMode}
                  setPaymentMode={setPaymentMode}
                  paymentDueDate={paymentDueDate}
                  setPaymentDueDate={setPaymentDueDate}
                  userRole={userRole}
                  calculatedRemainingBalance={calculatedRemainingBalance}
                  estimatedProfitMargin={estimatedProfitMargin}
                />
              </motion.div>
            )}

            {activeTab === 'deliverables' && (
              <motion.div
                key="tab-deliverables"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <IntakeTabDeliverables
                  availableFunctions={availableFunctions}
                  selectedFunctions={selectedFunctions}
                  setSelectedFunctions={setSelectedFunctions}
                  customFunctionInput={customFunctionInput}
                  setCustomFunctionInput={setCustomFunctionInput}
                  handleAddCustomFunction={handleAddCustomFunction}
                  customMilestones={customMilestones}
                  setCustomMilestones={setCustomMilestones}
                  newMilestoneInput={newMilestoneInput}
                  setNewMilestoneInput={setNewMilestoneInput}
                  notes={notes}
                  setNotes={setNotes}
                  onClearError={() => setValidationError('')}
                />
              </motion.div>
            )}

            {activeTab === 'storage' && (
              <motion.div
                key="tab-storage"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <IntakeTabStorage
                  hardDiskName={hardDiskName}
                  setHardDiskName={setHardDiskName}
                  dataSize={dataSize}
                  setDataSize={setDataSize}
                  backupStatus={backupStatus}
                  setBackupStatus={setBackupStatus}
                  location={location}
                  setLocation={setLocation}
                  googleDriveLink={googleDriveLink}
                  setGoogleDriveLink={setGoogleDriveLink}
                  rawDataFolder={rawDataFolder}
                  setRawDataFolder={setRawDataFolder}
                  deliveryFolder={deliveryFolder}
                  setDeliveryFolder={setDeliveryFolder}
                  finalExportFolder={finalExportFolder}
                  setFinalExportFolder={setFinalExportFolder}
                />
              </motion.div>
            )}

            {activeTab === 'preview' && (
              <motion.div
                key="tab-preview"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <IntakeTabPreview
                  couplePhoto={couplePhoto}
                  setCouplePhoto={setCouplePhoto}
                  defaultCovers={DEFAULT_COVERS}
                  projectName={projectName}
                  groomName={groomName}
                  brideName={brideName}
                  eventType={eventType}
                  studioId={studioId}
                  studios={studios}
                  assignedEditorId={assignedEditorId}
                  editors={editors}
                  isSplitProject={isSplitProject}
                  secondEditorId={secondEditorId}
                  firstEditorShare={firstEditorShare}
                  secondEditorShare={secondEditorShare}
                  shootDate={shootDate}
                  deliveryDate={deliveryDate}
                  status={status}
                  priority={priority}
                  selectedFunctions={selectedFunctions}
                  customMilestones={customMilestones}
                  projectAmount={projectAmount}
                  editorPayment={editorPayment}
                  advancePayment={advancePayment}
                  calculatedRemainingBalance={calculatedRemainingBalance}
                  estimatedProfitMargin={estimatedProfitMargin}
                  hardDiskName={hardDiskName}
                  dataSize={dataSize}
                  location={location}
                  venue={venue}
                  clientPhone={clientPhone}
                  userRole={userRole}
                  workflowStages={WORKFLOW_STAGES}
                  compressImage={compressImage}
                  onResetForm={resetForm}
                  onOpenSaveModal={() => setShowSaveTemplateModal(true)}
                  isSubmitting={isSubmitting}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* STEPPER NAVIGATION FOOTER BAR */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 mt-8 border-t border-white/10">
            <div>
              {['couple', 'crew', 'finance', 'deliverables', 'storage', 'preview'].indexOf(activeTab) > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    const order = ['couple', 'crew', 'finance', 'deliverables', 'storage', 'preview'];
                    const idx = order.indexOf(activeTab);
                    if (idx > 0) {
                      setActiveTab(order[idx - 1] as any);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }
                  }}
                  className="px-5 py-2.5 bg-charcoal-900 hover:bg-charcoal-800 border border-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous Step</span>
                </button>
              ) : (
                <span className="text-xs text-gray-500 font-mono">Step 1 of 6</span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {activeTab !== 'preview' ? (
                <button
                  type="button"
                  onClick={() => {
                    const order = ['couple', 'crew', 'finance', 'deliverables', 'storage', 'preview'];
                    const idx = order.indexOf(activeTab);
                    if (activeTab === 'couple' && (!groomName.trim() || !brideName.trim() || !projectName.trim())) {
                      setValidationError('Please provide Groom Name, Bride Name and Project Title before proceeding.');
                      return;
                    }
                    if (activeTab === 'crew' && (!shootDate || !deliveryDate)) {
                      setValidationError('Please provide both Shoot Date and Delivery Deadline before proceeding.');
                      return;
                    }
                    setValidationError('');
                    if (idx < order.length - 1) {
                      setActiveTab(order[idx + 1] as any);
                      window.scrollTo({ top: 400, behavior: 'smooth' });
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-gold-500 to-gold-400 text-charcoal-950 font-bold text-xs rounded-xl shadow-lg gold-glow hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center space-x-2 uppercase tracking-wider font-display"
                >
                  <span>Continue to Next Step</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 bg-gradient-to-r from-gold-600 via-gold-500 to-gold-600 hover:from-gold-500 hover:to-gold-400 text-charcoal-950 font-bold text-xs md:text-sm rounded-xl shadow-xl gold-glow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center space-x-2.5 uppercase tracking-wider font-display"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-charcoal-950 border-t-transparent rounded-full animate-spin" />
                      <span>Registering Project...</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4.5 h-4.5 text-charcoal-950 fill-charcoal-950" />
                      <span>{editingProject ? 'Update Registered Project' : 'Register Wedding Project'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* RECENTLY REGISTERED PROJECTS LIST WITH EDIT & DELETE */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl border border-gold-500/15 space-y-6 shadow-xl mt-8">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg font-bold font-display text-white">Registered Wedding Projects</h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">Quickly edit or delete active registered project entries.</p>
          </div>
          <span className="text-xs font-mono font-bold bg-gold-500/15 text-gold-400 px-3 py-1 rounded-full border border-gold-500/20">
            {projects.length} Total Registered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.slice(0, 6).map((proj) => (
            <div key={proj.id} className="p-4 bg-charcoal-900/80 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3 hover:border-gold-500/30 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-gold-400 font-bold">{proj.id}</span>
                  <h4 className="text-sm font-bold text-white font-display truncate">{proj.coupleName}</h4>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{proj.eventType || 'Wedding Film'}</p>
                </div>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase bg-gold-500/10 text-gold-300 border border-gold-500/20">
                  {proj.status}
                </span>
              </div>

              <div className="text-xs font-mono text-gray-400 space-y-1 border-t border-white/5 pt-2">
                <div className="flex justify-between">
                  <span>Studio:</span>
                  <span className="text-gray-200 font-semibold">{proj.studioName || 'Direct'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery:</span>
                  <span className="text-gray-200 font-semibold">{proj.deliveryDate}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProject(proj);
                    setProjectName(proj.projectName || proj.coupleName || '');
                    setBrideName(proj.brideName || '');
                    setGroomName(proj.groomName || '');
                    setClientPhone(proj.clientPhone || '');
                    setClientEmail(proj.clientEmail || '');
                    setVenue(proj.venue || '');
                    setEventType(proj.eventType || 'Wedding Film');
                    setStudioId(proj.studioId || '');
                    setShootDate(proj.shootDate || '');
                    setDeliveryDate(proj.deliveryDate || '');
                    setAssignedEditorId(proj.assignedEditorId || '');
                    setStatus(proj.status || 'data_received');
                    setPriority(proj.priority || 'medium');
                    setCouplePhoto(proj.couplePhoto || '');
                    setNotes(proj.notes || '');
                    setProjectAmount(proj.projectAmount || 0);
                    setEditorPayment(proj.editorPayment || 0);
                    setOtherExpenses(proj.otherExpenses || 0);
                    setAdvancePayment(proj.advancePayment || 0);
                    setPaymentMode(proj.paymentMode || 'UPI');
                    setPaymentDueDate(proj.paymentDueDate || '');
                    setHardDiskName(proj.hardDiskName || '');
                    setDataSize(proj.dataSize || '');
                    setLocation(proj.location || '');
                    setBackupStatus(proj.backupStatus || 'pending');
                    setGoogleDriveLink(proj.googleDriveLink || '');
                    setRawDataFolder(proj.rawDataFolder || '');
                    setDeliveryFolder(proj.deliveryFolder || '');
                    setFinalExportFolder(proj.finalExportFolder || '');
                    setIsSplitProject(!!proj.isSplitProject);
                    setSecondEditorId(proj.secondEditorId || '');
                    setFirstEditorShare(proj.firstEditorShare || 0);
                    setSecondEditorShare(proj.secondEditorShare || 0);
                    if (proj.customMilestones && proj.customMilestones.length > 0) {
                      setCustomMilestones(proj.customMilestones);
                    }
                    setActiveTab('couple');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-charcoal-800 hover:bg-gold-500/20 text-gold-300 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setProjectToDeleteId(proj.id)}
                  className="px-3 py-1.5 rounded-lg bg-charcoal-800 hover:bg-red-500/20 text-red-400 text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DELETE PROJECT CONFIRMATION MODAL */}
      {projectToDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-charcoal-900 border border-red-500/30 rounded-3xl w-full max-w-md p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display">Delete Wedding Project</h3>
              <p className="text-xs text-gray-400 font-mono mt-1">Are you sure you want to delete this wedding project entry? All associated deliverables and timeline records will be unlinked.</p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProjectToDeleteId(null)}
                className="px-4 py-2 rounded-xl bg-charcoal-800 text-gray-300 hover:text-white text-xs font-mono font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeleteProject && projectToDeleteId) {
                    await onDeleteProject(projectToDeleteId);
                    setToast({ message: 'Project record deleted successfully.', type: 'success' });
                  }
                  setProjectToDeleteId(null);
                }}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs font-mono shadow-lg cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVE CURRENT FORM AS TEMPLATE MODAL */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-charcoal-900 border border-gold-500/30 rounded-3xl w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 font-bold gold-glow">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Save Project Blueprint</h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">Save current form structure as a reusable studio template.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="p-2 rounded-xl bg-charcoal-800 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-300 font-mono uppercase tracking-wider mb-2">
                  Blueprint Template Name <span className="text-gold-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Royal Destination Pre-Wedding Suite"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  className="w-full bg-charcoal-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold-500/50 font-mono placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 font-mono uppercase tracking-wider mb-2">
                  Blueprint Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short summary of deliverables, milestone stages or special specs..."
                  value={saveTemplateDesc}
                  onChange={(e) => setSaveTemplateDesc(e.target.value)}
                  className="w-full bg-charcoal-800 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-gold-500/50 font-mono placeholder-gray-500"
                />
              </div>

              <div className="p-4 bg-charcoal-800/80 rounded-2xl border border-white/5 space-y-2 text-xs font-mono text-gray-300">
                <span className="text-[10px] uppercase font-bold text-gold-400 tracking-wider block">
                  Captured Blueprint Parameters:
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-500">Event Type:</span> <strong className="text-white">{eventType || 'Wedding Film'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Priority:</span> <strong className="text-white uppercase">{priority}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Deliverables:</span> <strong className="text-gold-300">{selectedFunctions.length} Functions</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">Milestones:</span> <strong className="text-gold-300">{customMilestones.length} Steps</strong>
                  </div>
                  {projectAmount > 0 && (
                    <div>
                      <span className="text-gray-500">Client Amt:</span> <strong className="text-emerald-400">₹{projectAmount.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                  {editorPayment > 0 && (
                    <div>
                      <span className="text-gray-500">Editor Pay:</span> <strong className="text-emerald-400">₹{editorPayment.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setShowSaveTemplateModal(false)}
                className="px-4 py-2.5 bg-charcoal-800 text-gray-300 hover:text-white rounded-xl text-xs font-mono font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentAsTemplate}
                className="px-5 py-2.5 bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-bold rounded-xl text-xs font-mono shadow-lg gold-glow cursor-pointer flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Blueprint Template</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL BLUEPRINT REPOSITORY MODAL */}
      {showTemplateLibrary && (
        <TemplateLibraryModal
          templates={templates}
          editors={editors}
          selectedTemplateId={selectedTemplateId}
          onApplyTemplate={(tpl) => applyTemplate(tpl)}
          onEditTemplate={(tpl) => {
            setEditingTemplateForBuilder(tpl);
            setShowTemplateBuilder(true);
            setShowTemplateLibrary(false);
          }}
          onDeleteTemplate={(tplId) => handleDeleteBlueprint(tplId)}
          onCreateNewTemplate={() => {
            setEditingTemplateForBuilder(null);
            setShowTemplateBuilder(true);
            setShowTemplateLibrary(false);
          }}
          onClose={() => setShowTemplateLibrary(false)}
        />
      )}

      {/* BLUEPRINT BUILDER / EDITOR MODAL */}
      {showTemplateBuilder && (
        <TemplateBuilderModal
          initialTemplate={editingTemplateForBuilder}
          editors={editors}
          onSave={async (tpl) => {
            await handleSaveBlueprint(tpl);
            setShowTemplateBuilder(false);
            setEditingTemplateForBuilder(null);
          }}
          onClose={() => {
            setShowTemplateBuilder(false);
            setEditingTemplateForBuilder(null);
          }}
        />
      )}

      {/* INTERACTIVE TEMPLATE PREVIEW MODAL */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-charcoal-900 border border-gold-500/30 rounded-3xl w-full max-w-2xl p-6 md:p-8 space-y-6 shadow-2xl relative my-auto max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-gold-500/20 to-amber-600/20 border border-gold-500/40 flex items-center justify-center text-gold-400 font-bold gold-glow">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gold-400">
                      {previewTemplate.eventType} Blueprint Preview
                    </span>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border ${
                      previewTemplate.isDefault
                        ? 'bg-gold-500/15 text-gold-300 border-gold-500/30'
                        : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    }`}>
                      {previewTemplate.isDefault ? 'Preset Blueprint' : 'Custom Blueprint'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white font-display mt-0.5">
                    {previewTemplate.name}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-2 rounded-xl bg-charcoal-800 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description if present */}
            {previewTemplate.description && (
              <p className="text-xs text-gray-300 font-mono leading-relaxed bg-charcoal-950/60 p-3.5 rounded-2xl border border-white/5">
                {previewTemplate.description}
              </p>
            )}

            {/* Scrollable Main Content */}
            <div className="overflow-y-auto flex-1 space-y-6 pr-1">
              
              {/* SECTION 1: MILESTONES & WORKFLOW STAGES BREAKDOWN */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold uppercase text-gold-400 tracking-wider flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-gold-400" />
                    <span>Workflow Milestones ({previewMilestonesState.length})</span>
                  </h4>
                  {previewMilestonesState.length > 0 && (
                    <span className="text-[11px] font-mono text-gray-400 font-bold">
                      {previewMilestonesState.filter(m => m.completed).length} / {previewMilestonesState.length} Completed
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {previewMilestonesState.length > 0 && (
                  <div className="w-full h-1.5 bg-charcoal-950 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-gold-500 to-amber-400 transition-all duration-300"
                      style={{ 
                        width: `${Math.round((previewMilestonesState.filter(m => m.completed).length / previewMilestonesState.length) * 100)}%` 
                      }}
                    />
                  </div>
                )}

                <div className="space-y-2 p-3.5 bg-charcoal-950/80 rounded-2xl border border-white/10">
                  {previewMilestonesState.length === 0 ? (
                    <p className="text-xs text-gray-500 italic font-mono">No specific milestones defined in this template.</p>
                  ) : (
                    previewMilestonesState.map((m, idx) => (
                      <div
                        key={m.id}
                        onClick={() => togglePreviewMilestone(m.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between space-x-3 ${
                          m.completed 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                            : 'bg-charcoal-900 hover:bg-charcoal-800 border-white/5 text-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                            m.completed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-charcoal-800 text-gold-400 border border-gold-500/20'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className={`text-xs font-mono font-medium truncate ${m.completed ? 'line-through opacity-70' : ''}`}>
                            {m.label}
                          </span>
                        </div>

                        <div className="shrink-0 flex items-center text-xs font-mono font-bold">
                          {m.completed ? (
                            <span className="text-emerald-400 flex items-center space-x-1">
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="hidden sm:inline">Completed</span>
                            </span>
                          ) : (
                            <span className="text-gray-500 hover:text-gold-300 flex items-center space-x-1">
                              <Square className="w-4 h-4" />
                              <span className="hidden sm:inline">Pending</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* SECTION 2: STANDARD WORKFLOW AUTO-TASKS */}
              {previewTemplate.tasks && previewTemplate.tasks.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-mono font-bold uppercase text-gold-400 tracking-wider flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gold-400" />
                    <span>Auto-Generated Workflow Tasks ({previewTemplate.tasks.length})</span>
                  </h4>

                  <div className="space-y-2 p-3.5 bg-charcoal-950/80 rounded-2xl border border-white/10">
                    {previewTemplate.tasks.map((tsk, tIdx) => (
                      <div key={tsk.id || tIdx} className="p-3 bg-charcoal-900 rounded-xl border border-white/5 flex items-start justify-between gap-3 text-xs font-mono">
                        <div className="flex items-start space-x-3">
                          <span className="w-5 h-5 rounded bg-gold-500/20 text-gold-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                            {tIdx + 1}
                          </span>
                          <div>
                            <span className="text-white font-bold block">{tsk.title}</span>
                            {tsk.description && <p className="text-[11px] text-gray-400 mt-0.5">{tsk.description}</p>}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/20 shrink-0">
                          +{tsk.daysFromShoot ?? 5}d
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 3: DELIVERABLES PACKAGE */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-mono font-bold uppercase text-gold-400 tracking-wider flex items-center space-x-2">
                  <Film className="w-4 h-4 text-gold-400" />
                  <span>Deliverables Package ({previewTemplate.deliverables?.length || 0})</span>
                </h4>

                <div className="flex flex-wrap gap-2 p-3.5 bg-charcoal-950/80 rounded-2xl border border-white/10">
                  {(!previewTemplate.deliverables || previewTemplate.deliverables.length === 0) ? (
                    <span className="text-xs text-gray-500 italic font-mono">No specific deliverables list defined.</span>
                  ) : (
                    previewTemplate.deliverables.map((del, dIdx) => (
                      <span
                        key={dIdx}
                        className="text-xs font-mono px-3 py-1.5 rounded-xl bg-charcoal-900 border border-gold-500/20 text-gold-200 flex items-center space-x-1.5 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5 text-gold-400" />
                        <span>{del}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* SECTION 3: FINANCIAL PRESETS & PRIORITY */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3.5 bg-charcoal-950/80 rounded-2xl border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Client Budget Preset</span>
                  <strong className="text-sm text-gold-300 font-bold block">
                    {previewTemplate.defaultProjectAmount ? `₹${previewTemplate.defaultProjectAmount.toLocaleString('en-IN')}` : 'Not Specified'}
                  </strong>
                </div>

                <div className="p-3.5 bg-charcoal-950/80 rounded-2xl border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Editor Wage Preset</span>
                  <strong className="text-sm text-emerald-400 font-bold block">
                    {previewTemplate.defaultEditorPayment ? `₹${previewTemplate.defaultEditorPayment.toLocaleString('en-IN')}` : 'Not Specified'}
                  </strong>
                </div>

                <div className="p-3.5 bg-charcoal-950/80 rounded-2xl border border-white/10 space-y-1">
                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Priority Rating</span>
                  <strong className="text-sm text-amber-400 font-bold uppercase block">
                    {previewTemplate.priority || 'Medium'}
                  </strong>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-charcoal-800 hover:bg-charcoal-700 text-gray-300 hover:text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-colors"
              >
                Close Preview
              </button>

              <button
                type="button"
                onClick={() => applyTemplate(previewTemplate)}
                className="w-full sm:w-auto px-6 py-2.5 bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-bold text-xs font-mono rounded-xl shadow-lg gold-glow cursor-pointer transition-all flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Apply Blueprint to Registry Form</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl border shadow-2xl flex items-start space-x-3.5 backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-red-950/95 border-red-500/30 text-red-200'
                : 'bg-charcoal-900/95 border-emerald-500/30 text-emerald-200'
            }`}
          >
            <div className={`p-1.5 rounded-xl ${
              toast.type === 'error' ? 'bg-red-900/50 text-red-400' : 'bg-emerald-900/50 text-emerald-400 animate-pulse'
            }`}>
              {toast.type === 'error' ? (
                <AlertCircle className="w-5 h-5 shrink-0" />
              ) : (
                <Check className="w-5 h-5 shrink-0" />
              )}
            </div>
            
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-bold font-sans uppercase tracking-wider">
                {toast.type === 'error' ? 'Operation Error' : 'Success'}
              </h4>
              <p className="text-xs font-medium leading-relaxed font-mono opacity-90 break-words max-h-32 overflow-y-auto">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
