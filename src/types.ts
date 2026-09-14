export type UserRole = 'admin' | 'editor' | 'studio';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  studioId?: string; // If role is 'studio'
  editorId?: string; // If role is 'editor'
  photoURL?: string;
  createdAt: any;
}

export interface Studio {
  id: string; // Document ID
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city?: string;
  state?: string;
  gstNumber?: string;
  notes?: string;
  logoUrl?: string;
  upiId?: string;
  paymentLink?: string;
  tier?: 'standard' | 'premium' | 'elite';
  instagram?: string;
  website?: string;
  createdAt: any;
}

export type ProjectStatus = 'data_received' | 'assigned' | 'editing' | 'review' | 'revision' | 'rendering' | 'delivered' | 'closed';

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Project {
  id: string; // e.g. "PRJ-2026-001" or doc id
  projectName?: string;
  coupleName: string;
  brideName: string;
  groomName: string;
  clientPhone?: string;
  clientEmail?: string;
  venue?: string;
  couplePhoto?: string;
  studioId: string;
  studioName: string;
  eventType: string; // Wedding, Pre-Wedding, Engagement, etc.
  shootDate: string; // YYYY-MM-DD
  deliveryDate: string; // YYYY-MM-DD
  assignedEditorId?: string;
  assignedEditorName?: string;
  isSplitProject?: boolean;
  secondEditorId?: string;
  secondEditorName?: string;
  firstEditorShare?: number;
  secondEditorShare?: number;
  status: ProjectStatus;
  priority: ProjectPriority;
  tags?: string[]; // Color-coded labels/tags e.g. ['Urgent', 'Revision', 'Awaiting Data']
  projectAmount: number;
  editorPayment: number;
  otherExpenses: number;
  advancePayment: number;
  paymentMode?: string;
  remainingBalance: number;
  paymentDueDate?: string; // YYYY-MM-DD custom payment due date
  paymentReminderNotes?: string; // Custom reminder note
  notes?: string;
  createdAt: any;
  updatedAt: any;
  
  // Data manager fields
  hardDiskName?: string;
  hardDriveNumber?: string;
  backupDriveNumber?: string;
  cloudDriveLink?: string;
  selectedFunctions?: string[];
  rawFootageSizeGB?: number;
  finalExportSizeGB?: number;
  dataSize?: string; // e.g., "1.2 TB"
  backupStatus?: 'pending' | 'backed_up';
  googleDriveLink?: string;
  deliveryFolder?: string;
  rawDataFolder?: string;
  finalExportFolder?: string;
  location?: string; // Physical or cloud storage location of hard disk or data
  customMilestones?: {
    id: string;
    label: string;
    completed: boolean;
    completedAt?: string;
  }[];

  // SAP QM Quality Management fields
  qcStatus?: 'pending' | 'in_progress' | 'passed' | 'revision_needed';
  qcCheckedAt?: string;
  qcCheckedBy?: string;
  qcScore?: number;
  qcTotal?: number;
  qcNotes?: string;
  qcItems?: QcCheckItem[];

  // Supabase Reference Photos
  referencePhotos?: ProjectReferencePhoto[];
}

export interface ProjectReferencePhoto {
  id: string;
  url: string;
  name?: string;
  caption?: string;
  uploadedAt: string;
  storagePath?: string;
  storageProvider?: 'supabase' | 'local' | 'data';
  sizeBytes?: number;
  width?: number;
  height?: number;
}

export interface QcCheckItem {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  category: 'metadata' | 'audio' | 'color' | 'editorial' | 'export';
}

export interface Task {
  id: string;
  projectId: string;
  projectCoupleName: string;
  title: string;
  description?: string;
  assignedTo: string; // editor user id
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: any;
}

export type AuditLogCategory = 'status' | 'financial' | 'assignment' | 'revision' | 'delivery' | 'data_manager' | 'general';
export type AuditLogType = 'status_change' | 'amount_change' | 'assignment_change' | 'revision' | 'milestone' | 'creation' | 'deletion' | 'general';

export interface Revision {
  id: string;
  projectId: string;
  revisionNumber?: number;
  notes: string;
  date: string;
  status: 'pending' | 'resolved' | 'logged';
  createdAt: any;
  // Audit trail extensions
  type?: AuditLogType;
  category?: AuditLogCategory;
  projectCoupleName?: string;
  studioName?: string;
  changedField?: string;
  previousValue?: any;
  newValue?: any;
  performedBy?: string;
  performedByRole?: string;
  performedByEmail?: string;
  formattedDiff?: string;
  isSystemGenerated?: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  category: 'hard_disk' | 'internet' | 'office_rent' | 'electricity' | 'travel' | 'freelance_editor' | 'other' | string;
  date: string;
  description: string;
  projectId?: string; // Optional links to projects
  paymentMethod?: string;
  createdAt: any;
}

export interface PaymentHistory {
  id: string;
  entityId: string; // Editor ID or Studio ID
  entityType: 'editor' | 'studio';
  projectId: string;
  projectCoupleName: string;
  amount: number;
  date: string;
  dueDate?: string; // Optional payment due date / deadline
  isOverdue?: boolean; // Optional manual overdue flag
  paymentMethod: string; // Cash, Bank Transfer, GPay, etc.
  notes?: string;
  receivedFrom?: string; // Person who initiated or made the payment
  createdAt: any;
}

export interface EditorShowcaseShot {
  id: string;
  url: string;
  title: string;
  coupleName?: string;
  category?: 'Cinematic Teaser' | 'Full Film' | 'Traditional Cut' | 'Drone & Pre-Wedding' | 'Color Grading' | string;
}

export interface Editor {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  rating: number; // e.g. 4.8
  joinedDate: string;
  notes?: string;
  bio?: string;
  specialties?: string[];
  experienceYears?: number;
  showcaseShots?: EditorShowcaseShot[];
}

export interface GettingStartedLink {
  label: string;
  actionTab?: string;
  url?: string;
  description?: string;
  icon?: string;
}

export interface PlatformDocSection {
  id: string;
  title: string;
  category: 'workflow' | 'specifications' | 'guidelines' | 'faq';
  summary: string;
  details: string[];
  badge?: string;
}

export interface SetupTipItem {
  step: number;
  title: string;
  description: string;
  highlight?: string;
  completed?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'delivery_tomorrow' | 'payment_pending' | 'project_completed' | 'new_assignment' | 'revision_request' | 'welcome' | string;
  projectId?: string;
  studioId?: string;
  editorId?: string;
  recipientId?: string;
  recipientRole?: 'admin' | 'editor' | 'studio' | 'all';
  gettingStartedLinks?: GettingStartedLink[];
  documentationSections?: PlatformDocSection[];
  tips?: string[];
  setupTips?: SetupTipItem[];
  calendarEventId?: string;
  isAutomated?: boolean;
  read: boolean;
  createdAt: any;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // date YYYY-MM-DD
  type: 'delivery' | 'shoot' | 'edit' | 'meeting' | 'revision' | 'reminder' | 'payment_reminder' | 'project_reminder' | string;
  projectId?: string;
  coupleName?: string;
  color: string;
  isReminder?: boolean;
  reminderCategory?: 'payment' | 'project' | 'general';
  amount?: number;
  studioName?: string;
  notes?: string;
  completed?: boolean;
  completedAt?: any;
  priority?: 'normal' | 'urgent';
  createdAt?: any;
}

export interface ProjectTemplateTask {
  id: string;
  title: string;
  description?: string;
  daysFromShoot?: number; // e.g. +3 days
  assignedRole?: 'primary_editor' | 'second_editor' | 'lead' | 'unassigned';
  defaultAssignedEditorId?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description?: string;
  eventType: string;
  deliverables: string[];
  milestones: string[];
  tasks?: ProjectTemplateTask[];
  priority: ProjectPriority;
  defaultProjectAmount?: number;
  defaultEditorPayment?: number;
  defaultOtherExpenses?: number;
  defaultAdvancePercentage?: number; // e.g., 30 for 30%
  isSplitProject?: boolean;
  defaultFirstEditorShare?: number;
  defaultSecondEditorShare?: number;
  defaultPrimaryEditorId?: string;
  defaultPrimaryEditorName?: string;
  defaultSecondEditorId?: string;
  defaultSecondEditorName?: string;
  defaultTurnaroundDays?: number; // Days from shoot to delivery
  estimatedDataSize?: string; // e.g., "1.5 TB"
  notes?: string;
  isDefault?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface StudioInvoiceProjectItem {
  projectId: string;
  coupleName: string;
  projectType: string;
  amount: number;
  status: string;
  invoiceStatus: string;
  selected: boolean;
}

export interface StudioAdvancePaymentItem {
  id: string;
  date: string;
  paidBy: string;
  paymentMode: string;
  amount: number;
  adjusted: boolean;
  referenceNo?: string;
  notes?: string;
}

export interface StudioInvoiceCustomItem {
  id: string;
  description: string;
  category?: string;
  sacCode: string;
  unitRate: number;
  quantity: number;
  amount: number;
}

export interface StudioInvoice {
  id: string; // e.g. "AI-2026-0015"
  invoiceNo?: string;
  studioId: string;
  studioName: string;
  date?: string; // legacy / display alias
  issuedDate: string; // Issue date of the invoice (e.g. '2026-08-20')
  dueDate: string; // Due date for payment (e.g. '2026-08-27')
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'; // Current financial & settlement status
  projects: StudioInvoiceProjectItem[];
  advances: StudioAdvancePaymentItem[];
  customItems?: StudioInvoiceCustomItem[];
  projectTotal: number;
  advanceTotal: number;
  previousBalance: number;
  discount: number;
  totalPayable: number;
  gstEnabled?: boolean;
  showTaxMatrix?: boolean;
  gstRate?: number;
  gstTaxType?: 'intra' | 'inter';
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalGstAmount?: number;
  placeOfSupply?: string;
  reverseCharge?: boolean;
  paymentStatus?: 'Full Payment' | 'Partial Payment' | 'Unpaid';
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  driveLink?: string;
  notes?: string;
  pdfDocumentPath?: string;
  pdfFileName?: string;
  pdfDataUrl?: string;
  templateLayout?: 'minimal' | 'professional';
  signatureImageUrl?: string;
  signatureSignatoryName?: string;
  showSignature?: boolean;
  selectedProjectsCount?: number;
  createdAt?: any;
  updatedAt?: any;
}

export type RecycleBinItemType = 
  | 'project' 
  | 'studio' 
  | 'editor' 
  | 'expense' 
  | 'payment' 
  | 'calendar_event' 
  | 'revision' 
  | 'invoice';

export interface RecycleBinItem {
  id: string;
  originalId: string;
  itemType: RecycleBinItemType;
  itemTitle: string;
  itemSubtitle?: string;
  data: any;
  targetCollection: string;
  deletedAt: any;
  deletedBy?: string;
  deletedByRole?: string;
  deletedByEmail?: string;
}

export interface SoundtrackRecommendation {
  segment: string;
  songTitle: string;
  artist: string;
  genre: string;
  tempoBpm: string;
  mood: string;
  whyItFits: string;
  editingTip: string;
  searchQuery: string;
}

export interface WeddingSoundtrackResult {
  weddingThemeVibe: string;
  colorPaletteSuggestion?: string;
  soundtracks: SoundtrackRecommendation[];
  mixingTips: string[];
}

export interface WeddingCaptionResult {
  instagramReels: {
    hookLine: string;
    caption: string;
    hashtags: string[];
    callToAction: string;
  }[];
  youtube: {
    titleOptions: string[];
    description: string;
    chapterTemplate: string;
    tags: string[];
  };
  whatsappStatusBlurb: string;
  storyPostText: string;
}

export interface QuickNote {
  id: string;
  content: string;
  projectId?: string;
  projectName?: string;
  tag?: 'general' | 'client' | 'editing' | 'audio' | 'gear' | 'urgent';
  isPinned?: boolean;
  isCompleted?: boolean;
  createdAt: any;
  updatedAt?: any;
}

export interface CustomAutomationRule {
  id: string;
  name: string;
  description: string;
  triggerEvent: 
    | 'folder_path_added'           // e.g., deliveryFolder, rawDataFolder, finalExportFolder, or cloudDriveLink added
    | 'all_footage_received'        // hardDiskName or rawFootageSizeGB added
    | 'advance_payment_cleared'     // advancePayment >= projectAmount or advancePayment > 0
    | 'editor_assigned';            // assignedEditorId assigned
  folderField?: 'deliveryFolder' | 'finalExportFolder' | 'rawDataFolder' | 'googleDriveLink' | 'cloudDriveLink' | 'any_delivery_path';
  keywordTrigger?: string;         // Keyword e.g. "Review", "Ready_For_Review", "Final", "Export" in file path
  pathMatchPattern?: string;       // Optional pattern e.g. "Ready_For_Review", "Review", "Deliverables", or any non-empty path
  targetStatus: ProjectStatus;     // Target status e.g. 'review' ('ready_for_review'), 'editing', 'delivered', etc.
  enabled: boolean;
  autoNotify: boolean;             // Dispatches in-app notification when triggered
  createdAt?: any;
  updatedAt?: any;
}

export interface AutomationSettings {
  autoOverdueFlagging: boolean;
  autoTurnaroundDays: number;
  autoDeliveryDateCalc: boolean;
  autoArchiveDeliveredDays: number;
  autoArchiveDeliveredEnabled: boolean;
  autoBalanceStatusCalc: boolean;
  autoPostShootPaymentTrigger: boolean;
  autoInvoiceNumberPrefix: string;
  autoInvoiceNumberEnabled: boolean;
  autoWhatsAppRemindersEnabled: boolean;
  autoEditorDeadlineHours: number;
  autoBackupWeeklyPrompt: boolean;
  lastBackupDate?: string;
  lastAutomationRun?: string;
  rulesRunCount?: number;
  // Dynamic status transition rules
  customStatusRules?: CustomAutomationRule[];
}

export interface AutomationExecutionReport {
  timestamp: string;
  checkedProjectsCount: number;
  overdueProjectsCount: number;
  overdueInvoicesCount: number;
  postShootRemindersCount: number;
  autoArchivedProjectsCount: number;
  balancesAuditedCount: number;
  notificationsGenerated: number;
  details: string[];
}

export interface AIProjectBriefResult {
  projectTitle: string;
  coupleNarrative: string;
  deliverablesChecklist: {
    name: string;
    targetDuration: string;
    recommendedEditorRole: string;
    keyHighlights: string[];
  }[];
  shootingSequence: {
    event: string;
    shotRequirements: string;
    musicVibe: string;
  }[];
  audioDirection: {
    recommendedBpm: string;
    genre: string;
    moodGuidelines: string;
  };
  editingTurnaroundMilestones: {
    stage: string;
    targetDaysFromShoot: number;
    description: string;
  }[];
  storageEstimateTb: string;
}

export interface AICostProfitResult {
  projectAmount: number;
  estimatedCosts: {
    category: string;
    estimatedAmount: number;
    notes: string;
  }[];
  totalEstimatedCost: number;
  netProfit: number;
  profitMarginPercentage: number;
  riskRating: 'Low' | 'Moderate' | 'High';
  riskFactors: string[];
  costOptimizationTips: string[];
  suggestedSellingPrice: number;
}

