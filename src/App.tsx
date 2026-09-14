import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  setDoc, 
  getDoc, 
  getDocs,
  writeBatch,
  serverTimestamp 
} from 'firebase/firestore';
import { db, seedDatabaseIfEmpty } from './firebase';
import { compressImage } from './utils';
import { syncUserToDatabase, deleteImageFromSupabase } from './services/storageService';
import { 
  Project, 
  Studio, 
  Editor, 
  Expense, 
  AppNotification, 
  CalendarEvent, 
  Revision, 
  PaymentHistory,
  UserProfile,
  UserRole,
  AuditLogType,
  AuditLogCategory,
  RecycleBinItem,
  RecycleBinItemType,
  CustomAutomationRule
} from './types';

// Parallax Design Background
import ParallaxBackground from './components/ParallaxBackground';

// Importing Views
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ProjectsView from './components/ProjectsView';
import RegistryView from './components/RegistryView';
import StudiosView from './components/StudiosView';
import EditorsView from './components/EditorsView';
import DataManagerView from './components/DataManagerView';
import ReportsView from './components/ReportsView';
import CalendarView from './components/CalendarView';
import NotificationsView from './components/NotificationsView';
import SettingsView from './components/SettingsView';
import LoginView from './components/LoginView';
import GeminiAIView from './components/GeminiAIView';
import InvoiceView from './components/InvoiceView';
import FinancialOverviewView from './components/FinancialOverviewView';
import PaymentsLedgerView from './components/PaymentsLedgerView';
import AuditLogView from './components/AuditLogView';
import RecycleBinView from './components/RecycleBinView';
import { useDeadlineRunner } from './hooks/useDeadlineRunner';
import { useWeeklyBackup } from './hooks/useWeeklyBackup';
import WeeklyBackupPromptModal from './components/WeeklyBackupPromptModal';
import TopHeaderBar from './components/TopHeaderBar';
import GlobalSearchModal from './components/GlobalSearchModal';
import QuickNotesDrawer from './components/dashboard/QuickNotesDrawer';
import AutomationHub from './components/AutomationHub';
import AuthLoadingPlaceholder from './components/AuthLoadingPlaceholder';
import OfflineStatusBanner from './components/common/OfflineStatusBanner';
import FloatingScrollToTop from './components/common/FloatingScrollToTop';
import { evaluateProjectStatusTransitions } from './services/automationEngine';
import { Zap, X } from 'lucide-react';

// Helper to convert any Firebase/JS timestamp or date safely to milliseconds
const getTimestampMs = (val: any): number => {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1000000;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'string' || typeof val === 'number') {
    const parsed = new Date(val).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

export default function App() {
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    try {
      const raw = sessionStorage.getItem('tfc_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.role === 'editor' || parsed.role === 'studio')) {
          return 'projects';
        }
      }
    } catch {}
    return 'dashboard';
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [subActionTrigger, setSubActionTrigger] = useState<string>('');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [geminiInitialMode, setGeminiInitialMode] = useState<"chat" | "soundtrack" | "captions">("soundtrack");
  const [geminiPreselectedProjectId, setGeminiPreselectedProjectId] = useState<string>("");

  const lastCheckedSignatureRef = React.useRef<string>('');

  // Initial Authentication & Session Verification Lifecycle
  // Prevents the dashboard or subviews from momentarily flashing before session check or login redirect logic executes
  useEffect(() => {
    let isMounted = true;

    // Purge any stale localStorage credentials so session state is strictly validated
    try {
      localStorage.removeItem('tfc_session');
      localStorage.removeItem('tfc_user');
    } catch {
      // ignore
    }

    const verifySession = async () => {
      try {
        let savedSessionRaw: string | null = null;
        try {
          savedSessionRaw = sessionStorage.getItem('tfc_session');
        } catch (storageErr) {
          console.warn("Session storage access restricted:", storageErr);
        }

        if (savedSessionRaw) {
          const sessionData = JSON.parse(savedSessionRaw);
          if (sessionData && sessionData.uid && sessionData.email && sessionData.role) {
            const userProfile: UserProfile = {
              uid: sessionData.uid,
              email: sessionData.email,
              name: sessionData.name || (sessionData.email.includes('vansh') ? 'Vansh Tiwari' : sessionData.email.includes('kk') ? 'Wedding By KK' : 'Satish Tiwari'),
              photoURL: sessionData.photoURL || undefined,
              role: sessionData.role,
              studioId: sessionData.studioId,
              editorId: sessionData.editorId,
              createdAt: new Date(sessionData.createdAt || Date.now())
            };

            if (isMounted) {
              const targetTab = (sessionData.role === 'editor' || sessionData.role === 'studio') ? 'projects' : 'dashboard';
              setActiveTab(targetTab);
              setCurrentUser(userProfile);
            }
          } else {
            if (isMounted) {
              setCurrentUser(null);
            }
          }
        } else {
          // No authenticated session found - redirect directly to login portal
          if (isMounted) {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error("Session verification error:", err);
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          // Micro-delay ensures smooth optical fade and prevents any sub-frame render jitter
          setTimeout(() => {
            if (isMounted) setIsAuthInitializing(false);
          }, 120);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Global Keyboard shortcut listener for Omni-Search (Cmd+K / Ctrl+K / "/")
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
        return;
      }
      
      // "/" key when not focused on any text input/textarea/editable field
      if (
        e.key === '/' && 
        document.activeElement?.tagName !== 'INPUT' && 
        document.activeElement?.tagName !== 'TEXTAREA' &&
        !(document.activeElement as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Color Palette/Theme preference with local storage persistence
  const [theme, setTheme] = useState<'luxury-green' | 'midnight-gold' | 'royal-sapphire'>(() => {
    const saved = localStorage.getItem('tfc_theme');
    if (saved === 'midnight-gold' || saved === 'royal-sapphire') return saved;
    return 'luxury-green';
  });

  useEffect(() => {
    localStorage.setItem('tfc_theme', theme);
    document.body.classList.add('theme-transition');
    document.body.setAttribute('data-theme', theme);

    const timer = setTimeout(() => {
      document.body.classList.remove('theme-transition');
    }, 1000);

    return () => clearTimeout(timer);
  }, [theme]);

  // Firestore Collections States
  const [projects, setProjects] = useState<Project[]>([]);
  const [studios, setStudios] = useState<Studio[]>([]);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [payments, setPayments] = useState<PaymentHistory[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [recycleBinItems, setRecycleBinItems] = useState<RecycleBinItem[]>([]);
  const [automationRules, setAutomationRules] = useState<CustomAutomationRule[]>([]);

  // Initialize Background Deadline Task Runner Service
  const {
    isRunning: runnerIsRunning,
    lastCheckTime: runnerLastCheckTime,
    checkCount: runnerCheckCount,
    recentToastMessage: runnerToastMessage,
    pushPermissionState,
    requestPushPermission,
    sendTestPush,
    dismissToast: dismissRunnerToast,
    triggerManualCheck: handleRunnerManualCheck
  } = useDeadlineRunner(calendarEvents, notifications, projects);

  // Initialize Weekly Backup Service
  const {
    isBackupDue: isWeeklyBackupDue,
    lastBackupDate: lastWeeklyBackupDate,
    showPrompt: showWeeklyBackupPrompt,
    setShowPrompt: setShowWeeklyBackupPrompt,
    downloadSuccess: weeklyBackupDownloadSuccess,
    triggerDownloadBackup: handleTriggerWeeklyBackup,
    snoozeBackup: handleSnoozeWeeklyBackup
  } = useWeeklyBackup(
    projects,
    studios,
    editors,
    expenses,
    calendarEvents,
    revisions,
    payments,
    currentUser
  );

  // 1. Online / Offline network detection listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Seeding database if empty on start
  useEffect(() => {
    const runSeed = async () => {
      await seedDatabaseIfEmpty();
    };
    runSeed();
  }, []);

  // 3. Real-time Firestore Subscriptions
  useEffect(() => {
    let unsubProjects = () => {};
    let unsubStudios = () => {};
    let unsubEditors = () => {};
    let unsubExpenses = () => {};
    let unsubNotifs = () => {};
    let unsubCalendar = () => {};
    let unsubRevs = () => {};
    let unsubPayments = () => {};
    let unsubInvoices = () => {};
    let unsubRecycleBin = () => {};
    let unsubAutomationRules = () => {};

    try {
      // Projects Sync
      unsubProjects = onSnapshot(
        collection(db, 'projects'),
        (snap) => {
          const list: Project[] = [];
          snap.forEach(docSnap => {
            const data = docSnap.data() as any;
            const projectItem: Project = {
              projectName: data.projectName || (data.brideName && data.groomName ? `${data.brideName} & ${data.groomName} Wedding` : 'Wedding Project'),
              coupleName: data.coupleName || (data.groomName || data.brideName ? `${data.groomName || ''} & ${data.brideName || ''}`.trim() : 'Wedding Couple'),
              brideName: data.brideName || '',
              groomName: data.groomName || '',
              couplePhoto: data.couplePhoto || '',
              studioId: data.studioId || 'direct-client',
              studioName: data.studioName || 'Direct Client',
              eventType: data.eventType || 'Wedding Film',
              shootDate: data.shootDate || '',
              deliveryDate: data.deliveryDate || '',
              assignedEditorId: data.assignedEditorId || '',
              assignedEditorName: data.assignedEditorName || 'Unassigned',
              isSplitProject: !!data.isSplitProject,
              secondEditorId: data.secondEditorId || '',
              secondEditorName: data.secondEditorName || '',
              firstEditorShare: Number(data.firstEditorShare) || 0,
              secondEditorShare: Number(data.secondEditorShare) || 0,
              status: data.status || 'data_received',
              priority: data.priority || 'medium',
              projectAmount: Number(data.projectAmount) || 0,
              editorPayment: Number(data.editorPayment) || 0,
              otherExpenses: Number(data.otherExpenses) || 0,
              advancePayment: Number(data.advancePayment) || 0,
              remainingBalance: data.remainingBalance !== undefined ? Number(data.remainingBalance) : Math.max(0, (Number(data.projectAmount) || 0) - (Number(data.advancePayment) || 0)),
              notes: data.notes || '',
              hardDiskName: data.hardDiskName || '',
              dataSize: data.dataSize || '',
              backupStatus: data.backupStatus || 'pending',
              googleDriveLink: data.googleDriveLink || '',
              rawDataFolder: data.rawDataFolder || '',
              deliveryFolder: data.deliveryFolder || '',
              finalExportFolder: data.finalExportFolder || '',
              createdAt: data.createdAt || new Date(),
              updatedAt: data.updatedAt || new Date(),
              ...data,
              id: docSnap.id
            };
            list.push(projectItem);
          });
          // Sort newest created first
          setProjects(list.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)));
        },
        (error) => {
          console.error("[Firestore Sync Error] Error syncing projects collection:", error);
        }
      );

      // Studios Sync
      unsubStudios = onSnapshot(
        collection(db, 'studios'),
        (snap) => {
          const list: Studio[] = [];
          snap.forEach(docSnap => {
            const data = docSnap.data() as any;
            list.push({ ...data, id: docSnap.id });
          });
          setStudios(list);
        },
        (error) => {
          console.error("Error syncing studios from Firestore:", error);
        }
      );

      // Editors Sync
      unsubEditors = onSnapshot(
        collection(db, 'editors'),
        (snap) => {
          const list: Editor[] = [];
          snap.forEach(docSnap => {
            list.push({ ...docSnap.data() as any, id: docSnap.id });
          });
          setEditors(list);
        },
        (error) => {
          console.error("Error syncing editors from Firestore:", error);
        }
      );

      // Expenses Sync
      unsubExpenses = onSnapshot(
        collection(db, 'expenses'),
        (snap) => {
          const list: Expense[] = [];
          snap.forEach(docSnap => {
            list.push({ ...docSnap.data() as any, id: docSnap.id });
          });
          setExpenses(list.sort((a, b) => {
            const timeA = a.date ? new Date(a.date).getTime() : 0;
            const timeB = b.date ? new Date(b.date).getTime() : 0;
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
          }));
        },
        (error) => {
          console.error("Error syncing expenses from Firestore:", error);
        }
      );

      // Notifications Sync
      unsubNotifs = onSnapshot(
        collection(db, 'notifications'),
        (snap) => {
          const list: AppNotification[] = [];
          snap.forEach(docSnap => {
            list.push({ ...docSnap.data() as any, id: docSnap.id });
          });
          setNotifications(list.sort((a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt)));
        },
        (error) => {
          console.error("Error syncing notifications from Firestore:", error);
        }
      );

      // Calendar Sync
      unsubCalendar = onSnapshot(
        collection(db, 'calendar'),
        (snap) => {
          const list: CalendarEvent[] = [];
          snap.forEach(docSnap => {
            list.push({ ...docSnap.data() as any, id: docSnap.id });
          });
          setCalendarEvents(list);
        },
        (error) => {
          console.error("Error syncing calendar events from Firestore:", error);
        }
      );

      // Revisions Sync
      unsubRevs = onSnapshot(
        collection(db, 'revisionHistory'),
        (snap) => {
          const list: Revision[] = [];
          snap.forEach(docSnap => {
            list.push({ ...docSnap.data() as any, id: docSnap.id });
          });
          setRevisions(list.sort((a, b) => {
            const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.date ? new Date(a.date).getTime() : 0));
            const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.date ? new Date(b.date).getTime() : 0));
            if (timeB !== timeA) return timeB - timeA;
            return (b.revisionNumber || 0) - (a.revisionNumber || 0);
          }));
        },
        (error) => {
          console.error("Error syncing revision history from Firestore:", error);
        }
      );

      // Payments Sync
      unsubPayments = onSnapshot(
        collection(db, 'editorPayments'),
        (snap) => {
          const list: PaymentHistory[] = [];
          snap.forEach(docSnap => {
            const data = docSnap.data() as any;
            list.push({ ...data, id: docSnap.id });
          });
          setPayments(list.sort((a, b) => {
            const timeA = a.date ? new Date(a.date).getTime() : 0;
            const timeB = b.date ? new Date(b.date).getTime() : 0;
            return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
          }));
        },
        (error) => {
          console.error("Error syncing payments from Firestore:", error);
        }
      );

      // Invoices Sync
      unsubInvoices = onSnapshot(
        collection(db, 'studioInvoices'),
        (snap) => {
          const list: any[] = [];
          snap.forEach(docSnap => {
            list.push({ ...docSnap.data(), id: docSnap.id });
          });
          setInvoices(list);
        },
        (error) => {
          console.error("Error syncing invoices from Firestore:", error);
        }
      );

      // Recycle Bin Sync
      unsubRecycleBin = onSnapshot(
        collection(db, 'recycle_bin'),
        (snap) => {
          const list: RecycleBinItem[] = [];
          snap.forEach(docSnap => {
            list.push({ ...docSnap.data() as any, id: docSnap.id });
          });
          setRecycleBinItems(list.sort((a, b) => getTimestampMs(b.deletedAt) - getTimestampMs(a.deletedAt)));
        },
        (error) => {
          console.error("Error syncing recycle bin from Firestore:", error);
        }
      );
      // Automation Rules Sync
      unsubAutomationRules = onSnapshot(
        collection(db, 'automation_rules'),
        (snap) => {
          const list: CustomAutomationRule[] = [];
          snap.forEach(docSnap => {
            list.push({ ...docSnap.data() as any, id: docSnap.id });
          });
          setAutomationRules(list);
        },
        (error) => {
          console.error("Error syncing automation rules from Firestore:", error);
        }
      );
    } catch (e) {
      console.error("Critical error setting up real-time subscriptions:", e);
    }

    return () => {
      unsubProjects();
      unsubStudios();
      unsubEditors();
      unsubExpenses();
      unsubNotifs();
      unsubCalendar();
      unsubRevs();
      unsubPayments();
      unsubInvoices();
      unsubRecycleBin();
      unsubAutomationRules();
    };
  }, []);

  // Helper to recursively remove undefined properties from objects to prevent Firestore setDoc/updateDoc failures.
  const cleanUndefined = (obj: any): any => {
    if (obj === undefined || obj === null) return null;
    if (Array.isArray(obj)) {
      return obj.map(cleanUndefined);
    }
    if (typeof obj === 'object') {
      const constructorName = obj.constructor?.name;
      if (constructorName && constructorName !== 'Object' && constructorName !== 'Array') {
        return obj;
      }
      const clean: any = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val !== undefined) {
          clean[key] = cleanUndefined(val);
        }
      }
      return clean;
    }
    return obj;
  };

  // --- CRUD Database Operations ---

  // Projects CRUD with Automatic Audit Trail Logging to Firestore 'revisionHistory'
  const handleAddProject = async (project: Omit<Project, 'createdAt' | 'updatedAt'>) => {
    const docRef = doc(db, 'projects', project.id);
    const cleanedProject = cleanUndefined(project);
    await setDoc(docRef, {
      ...cleanedProject,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Record Project Creation Audit Log
    try {
      const auditId = `audit-${Date.now()}-created`;
      const auditRef = doc(db, 'revisionHistory', auditId);
      await setDoc(auditRef, {
        id: auditId,
        projectId: project.id,
        projectCoupleName: project.coupleName || project.projectName || 'New Project',
        studioName: project.studioName || 'Partner Studio',
        type: 'creation',
        category: 'general',
        notes: `New project registered: ${project.coupleName} (${project.eventType || 'Wedding'}) for ${project.studioName} with contract value ₹${Number(project.projectAmount || 0).toLocaleString('en-IN')}.`,
        status: 'logged',
        performedBy: currentUser?.name || 'Administrator',
        performedByRole: currentUser?.role || 'admin',
        performedByEmail: currentUser?.email || '',
        date: new Date().toISOString().slice(0, 10),
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Failed to log project creation audit entry:", err);
    }

    // Mirror to Cloud SQL Relational Database
    try {
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedProject)
      }).catch(e => console.warn('SQL project sync note:', e));
    } catch (sqlErr) {
      console.warn("Could not sync project to SQL database:", sqlErr);
    }
  };

  const handleUpdateProject = async (id: string, updates: Partial<Project>) => {
    const existingProj = projects.find(p => p.id === id);
    const docRef = doc(db, 'projects', id);
    
    // Check dynamic automation rules (e.g. move to 'review' when folder path added)
    let effectiveUpdates = { ...updates };
    if (existingProj) {
      const autoTransition = evaluateProjectStatusTransitions(existingProj, updates, automationRules.length > 0 ? automationRules : undefined);
      if (autoTransition.targetStatus && !updates.status) {
        effectiveUpdates.status = autoTransition.targetStatus;
        // Also add an automated in-app notification if configured
        if (autoTransition.triggeredRule?.autoNotify) {
          const dedupeId = `auto-trans-${id}-${Date.now()}`;
          setDoc(doc(db, 'notifications', dedupeId), {
            id: dedupeId,
            title: `⚡ Automation: ${existingProj.coupleName || existingProj.projectName}`,
            message: `Project status automatically moved to "${autoTransition.targetStatus.replace(/_/g, ' ').toUpperCase()}" because: ${autoTransition.reason || autoTransition.triggeredRule.name}`,
            type: 'status_update',
            projectId: id,
            isAutomated: true,
            read: false,
            createdAt: serverTimestamp()
          }).catch(e => console.warn('Could not save auto-transition notification:', e));
        }
      }
    }

    const cleanedUpdates = cleanUndefined(effectiveUpdates);
    await setDoc(docRef, {
      ...cleanedUpdates,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Mirror updates to Cloud SQL Relational Database
    try {
      const mergedProject = { ...(existingProj || {}), ...cleanedUpdates, id };
      fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanUndefined(mergedProject))
      }).catch(e => console.warn('SQL update project note:', e));
    } catch (sqlErr) {
      console.warn("Could not sync project update to SQL database:", sqlErr);
    }

    // Automatic Audit Trail Logging to Firestore 'revisionHistory'
    if (existingProj) {
      const actorName = currentUser?.name || 'Administrator';
      const actorRole = currentUser?.role || 'admin';
      const actorEmail = currentUser?.email || '';
      const coupleName = existingProj.coupleName || existingProj.projectName || 'Project';
      const studioName = existingProj.studioName || 'Studio Client';
      const todayStr = new Date().toISOString().slice(0, 10);

      const logAudit = async (
        type: AuditLogType,
        category: AuditLogCategory,
        fieldChanged: string,
        previousValue: any,
        newValue: any,
        notes: string
      ) => {
        try {
          const auditId = `audit-${Date.now()}-${fieldChanged.toLowerCase()}`;
          const auditRef = doc(db, 'revisionHistory', auditId);
          await setDoc(auditRef, {
            id: auditId,
            projectId: id,
            projectCoupleName: coupleName,
            studioName,
            type,
            category,
            changedField: fieldChanged,
            previousValue,
            newValue,
            notes,
            status: 'logged',
            performedBy: actorName,
            performedByRole: actorRole,
            performedByEmail: actorEmail,
            date: todayStr,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          console.error(`Failed to record audit log for ${fieldChanged}:`, err);
        }
      };

      // 1. Status Transition
      if (updates.status !== undefined && updates.status !== existingProj.status) {
        const oldFmt = existingProj.status.replace(/_/g, ' ');
        const newFmt = updates.status.replace(/_/g, ' ');
        await logAudit(
          'status_change',
          'status',
          'status',
          existingProj.status,
          updates.status,
          `Project workflow status advanced from "${oldFmt}" to "${newFmt}".`
        );
      }

      // 2. Contract Amount Change
      if (updates.projectAmount !== undefined && Number(updates.projectAmount) !== Number(existingProj.projectAmount)) {
        await logAudit(
          'amount_change',
          'financial',
          'projectAmount',
          Number(existingProj.projectAmount || 0),
          Number(updates.projectAmount),
          `Total Contract Amount updated from ₹${Number(existingProj.projectAmount || 0).toLocaleString('en-IN')} to ₹${Number(updates.projectAmount).toLocaleString('en-IN')}.`
        );
      }

      // 3. Advance Payment Change
      if (updates.advancePayment !== undefined && Number(updates.advancePayment) !== Number(existingProj.advancePayment)) {
        await logAudit(
          'amount_change',
          'financial',
          'advancePayment',
          Number(existingProj.advancePayment || 0),
          Number(updates.advancePayment),
          `Advance Payment updated from ₹${Number(existingProj.advancePayment || 0).toLocaleString('en-IN')} to ₹${Number(updates.advancePayment).toLocaleString('en-IN')}.`
        );
      }

      // 4. Remaining Balance Change
      if (updates.remainingBalance !== undefined && Number(updates.remainingBalance) !== Number(existingProj.remainingBalance)) {
        await logAudit(
          'amount_change',
          'financial',
          'remainingBalance',
          Number(existingProj.remainingBalance || 0),
          Number(updates.remainingBalance),
          `Outstanding remaining balance recalculated from ₹${Number(existingProj.remainingBalance || 0).toLocaleString('en-IN')} to ₹${Number(updates.remainingBalance).toLocaleString('en-IN')}.`
        );
      }

      // 5. Editor Payment Change
      if (updates.editorPayment !== undefined && Number(updates.editorPayment) !== Number(existingProj.editorPayment)) {
        await logAudit(
          'amount_change',
          'financial',
          'editorPayment',
          Number(existingProj.editorPayment || 0),
          Number(updates.editorPayment),
          `Editor wage payout compensation adjusted from ₹${Number(existingProj.editorPayment || 0).toLocaleString('en-IN')} to ₹${Number(updates.editorPayment).toLocaleString('en-IN')}.`
        );
      }

      // 6. Other Expenses Change
      if (updates.otherExpenses !== undefined && Number(updates.otherExpenses) !== Number(existingProj.otherExpenses)) {
        await logAudit(
          'amount_change',
          'financial',
          'otherExpenses',
          Number(existingProj.otherExpenses || 0),
          Number(updates.otherExpenses),
          `Project expense allocation adjusted from ₹${Number(existingProj.otherExpenses || 0).toLocaleString('en-IN')} to ₹${Number(updates.otherExpenses).toLocaleString('en-IN')}.`
        );
      }

      // 7. Lead Editor Assignment Change
      if (
        (updates.assignedEditorName !== undefined && updates.assignedEditorName !== existingProj.assignedEditorName) ||
        (updates.assignedEditorId !== undefined && updates.assignedEditorId !== existingProj.assignedEditorId)
      ) {
        const oldEditor = existingProj.assignedEditorName || 'Unassigned';
        const newEditor = updates.assignedEditorName || 'Unassigned';
        await logAudit(
          'assignment_change',
          'assignment',
          'assignedEditor',
          oldEditor,
          newEditor,
          `Lead Video Editor reassigned from "${oldEditor}" to "${newEditor}".`
        );
      }

      // 8. Secondary Editor Assignment Change
      if (
        (updates.secondEditorName !== undefined && updates.secondEditorName !== existingProj.secondEditorName) ||
        (updates.isSplitProject !== undefined && updates.isSplitProject !== existingProj.isSplitProject)
      ) {
        const oldSec = existingProj.secondEditorName || 'None';
        const newSec = updates.secondEditorName || (updates.isSplitProject ? 'Assigned' : 'None');
        await logAudit(
          'assignment_change',
          'assignment',
          'secondEditor',
          oldSec,
          newSec,
          `Secondary/Split Video Editor allocation updated to "${newSec}".`
        );
      }

      // 9. Priority Change
      if (updates.priority !== undefined && updates.priority !== existingProj.priority) {
        await logAudit(
          'general',
          'status',
          'priority',
          existingProj.priority,
          updates.priority,
          `Project priority changed from ${existingProj.priority.toUpperCase()} to ${updates.priority.toUpperCase()}.`
        );
      }

      // 10. Delivery Deadline Change
      if (updates.deliveryDate !== undefined && updates.deliveryDate !== existingProj.deliveryDate) {
        await logAudit(
          'general',
          'delivery',
          'deliveryDate',
          existingProj.deliveryDate,
          updates.deliveryDate,
          `Delivery deadline rescheduled from ${existingProj.deliveryDate} to ${updates.deliveryDate}.`
        );
      }

      // 11. Storage / Backup Status Change
      if (updates.backupStatus !== undefined && updates.backupStatus !== existingProj.backupStatus) {
        await logAudit(
          'general',
          'data_manager',
          'backupStatus',
          existingProj.backupStatus || 'pending',
          updates.backupStatus,
          `Physical hard disk backup status marked as ${updates.backupStatus === 'backed_up' ? 'Verified Backed Up' : 'Pending Backup'}.`
        );
      }
    }
  };

  // Recycle Bin Helper for Safe Deletion Protection
  const moveToRecycleBin = async (
    itemType: RecycleBinItemType,
    originalId: string,
    itemTitle: string,
    itemSubtitle: string,
    targetCollection: string,
    data: any
  ) => {
    try {
      const binId = `bin-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const binRef = doc(db, 'recycle_bin', binId);
      const binItem: RecycleBinItem = {
        id: binId,
        originalId,
        itemType,
        itemTitle: itemTitle || 'Untitled Item',
        itemSubtitle: itemSubtitle || '',
        data: cleanUndefined(data),
        targetCollection,
        deletedAt: serverTimestamp(),
        deletedBy: currentUser?.name || currentUser?.email || 'Admin User',
        deletedByRole: currentUser?.role || 'admin',
        deletedByEmail: currentUser?.email || ''
      };
      await setDoc(binRef, binItem);
    } catch (err) {
      console.error('Failed to move item to recycle bin:', err);
    }
  };

  const handleDeleteProject = async (id: string) => {
    const proj = projects.find(p => p.id === id);
    if (proj) {
      await moveToRecycleBin(
        'project',
        id,
        proj.projectName || proj.coupleName || 'Wedding Project',
        `${proj.studioName || 'Studio'} • ₹${proj.projectAmount?.toLocaleString('en-IN') || 0} • Status: ${proj.status}`,
        'projects',
        proj
      );
    }
    const docRef = doc(db, 'projects', id);
    await deleteDoc(docRef);

    // Also mirror delete in SQL
    try {
      fetch(`/api/projects/${id}`, { method: 'DELETE' }).catch(e => console.warn('SQL delete project note:', e));
    } catch (sqlErr) {
      console.warn("Could not delete project from SQL database:", sqlErr);
    }
  };

  // Revisions Logging
  const handleAddRevision = async (revision: Omit<Revision, 'id' | 'createdAt'>) => {
    const nextId = `rev-${Date.now()}`;
    const docRef = doc(db, 'revisionHistory', nextId);
    await setDoc(docRef, {
      ...cleanUndefined(revision),
      id: nextId,
      createdAt: serverTimestamp()
    });
  };

  const handleResolveRevision = async (revId: string) => {
    const docRef = doc(db, 'revisionHistory', revId);
    await setDoc(docRef, { status: 'resolved' }, { merge: true });
  };

  const handleDeleteRevision = async (revId: string) => {
    const rev = revisions.find(r => r.id === revId);
    if (rev) {
      await moveToRecycleBin(
        'revision',
        revId,
        `Revision #${rev.revisionNumber} (${rev.projectName || 'Project'})`,
        rev.notes || rev.feedback || 'Revision notes',
        'revisionHistory',
        rev
      );
    }
    const docRef = doc(db, 'revisionHistory', revId);
    await deleteDoc(docRef);
  };

  // Studios CRUD
  const handleAddStudio = async (studio: Omit<Studio, 'createdAt'>) => {
    let sanitizedStudio = { ...studio };
    if (sanitizedStudio.logoUrl && sanitizedStudio.logoUrl.startsWith('data:image/')) {
      sanitizedStudio.logoUrl = await compressImage(sanitizedStudio.logoUrl, 400, 400, 0.7);
    }
    const docRef = doc(db, 'studios', studio.id);
    await setDoc(docRef, {
      ...cleanUndefined(sanitizedStudio),
      createdAt: serverTimestamp()
    });
  };

  const handleUpdateStudio = async (id: string, updates: Partial<Studio>) => {
    let sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.logoUrl && sanitizedUpdates.logoUrl.startsWith('data:image/')) {
      sanitizedUpdates.logoUrl = await compressImage(sanitizedUpdates.logoUrl, 400, 400, 0.7);
    }
    const docRef = doc(db, 'studios', id);
    await setDoc(docRef, cleanUndefined(sanitizedUpdates), { merge: true });
  };

  const handleDeleteStudio = async (id: string) => {
    const std = studios.find(s => s.id === id);
    if (std) {
      await moveToRecycleBin(
        'studio',
        id,
        std.name || 'Studio Client',
        `${std.city || 'City'} • ${std.phone || std.email || 'Contact'}`,
        'studios',
        std
      );
    }
    const docRef = doc(db, 'studios', id);
    await deleteDoc(docRef);
  };

  // Editors CRUD
  const handleAddEditor = async (editor: Omit<Editor, 'id'>) => {
    let sanitizedEditor = { ...editor };
    if (sanitizedEditor.photo && sanitizedEditor.photo.startsWith('data:image/')) {
      sanitizedEditor.photo = await compressImage(sanitizedEditor.photo, 800, 1000, 0.82);
    }
    const generatedId = `editor-${editor.name.toLowerCase().replace(/\s+/g, '-')}`;
    const docRef = doc(db, 'editors', generatedId);
    await setDoc(docRef, {
      ...cleanUndefined(sanitizedEditor),
      id: generatedId,
      createdAt: serverTimestamp()
    });
  };

  const handleUpdateEditor = async (id: string, updates: Partial<Editor>) => {
    let sanitizedUpdates = { ...updates };
    if (sanitizedUpdates.photo && sanitizedUpdates.photo.startsWith('data:image/')) {
      sanitizedUpdates.photo = await compressImage(sanitizedUpdates.photo, 800, 1000, 0.82);
    }
    const docRef = doc(db, 'editors', id);
    await setDoc(docRef, cleanUndefined(sanitizedUpdates), { merge: true });
  };

  const handleDeleteEditor = async (id: string) => {
    const ed = editors.find(e => e.id === id);
    if (ed) {
      await moveToRecycleBin(
        'editor',
        id,
        ed.name || 'Video Editor',
        `${ed.specialization || 'Editor'} • ${ed.phone || ed.email || ''}`,
        'editors',
        ed
      );
    }
    const docRef = doc(db, 'editors', id);
    await deleteDoc(docRef);
  };

  // Expense Logger
  const handleAddExpense = async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const generatedId = `exp-${Date.now()}`;
    const docRef = doc(db, 'expenses', generatedId);
    await setDoc(docRef, {
      ...cleanUndefined(expense),
      id: generatedId,
      createdAt: serverTimestamp()
    });
  };

  const handleUpdateExpense = async (id: string, updates: Partial<Expense>) => {
    const docRef = doc(db, 'expenses', id);
    await setDoc(docRef, cleanUndefined(updates), { merge: true });
  };

  const handleDeleteExpense = async (id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (exp) {
      await moveToRecycleBin(
        'expense',
        id,
        exp.title || 'Studio Expense',
        `₹${exp.amount?.toLocaleString('en-IN') || 0} • ${exp.category || 'General'} • ${exp.date || ''}`,
        'expenses',
        exp
      );
    }
    const docRef = doc(db, 'expenses', id);
    await deleteDoc(docRef);
  };

  // Settle Editor Payment ledger
  const handleLogPayment = async (pay: Omit<PaymentHistory, 'id' | 'createdAt'>) => {
    try {
      console.log("handleLogPayment initiating with payload:", pay);
      const generatedId = `pay-${Date.now()}`;
      const docRef = doc(db, 'editorPayments', generatedId);
      await setDoc(docRef, {
        ...cleanUndefined(pay),
        id: generatedId,
        createdAt: serverTimestamp()
      });
      console.log("handleLogPayment completed successfully. ID:", generatedId);
    } catch (error: any) {
      console.error("Error writing payment document to Firestore:", error);
      alert("Failed to record payment: " + (error?.message || String(error)));
      throw error;
    }
  };

  const handleUpdatePayment = async (id: string, updates: Partial<PaymentHistory>) => {
    try {
      console.log("handleUpdatePayment initiating for ID:", id, updates);
      const docRef = doc(db, 'editorPayments', id);
      await setDoc(docRef, cleanUndefined(updates), { merge: true });
      console.log("handleUpdatePayment completed successfully for ID:", id);
    } catch (error: any) {
      console.error("Error updating payment in Firestore:", error);
      alert("Failed to update payment record: " + (error?.message || String(error)));
      throw error;
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      console.log("handleDeletePayment initiating for ID:", id);
      const pay = payments.find(p => p.id === id);
      if (pay) {
        await moveToRecycleBin(
          'payment',
          id,
          `${pay.type === 'studio_receipt' ? 'Studio Payment Received' : 'Editor Payout'} - ₹${pay.amount?.toLocaleString('en-IN') || 0}`,
          `${pay.entityName || ''} • ${pay.paymentMode || ''} • ${pay.date || ''}`,
          'editorPayments',
          pay
        );
      }
      const docRef = doc(db, 'editorPayments', id);
      await deleteDoc(docRef);
      console.log("handleDeletePayment completed successfully for ID:", id);
    } catch (error) {
      console.error("Error deleting payment document:", error);
      alert("Failed to delete transaction: " + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  };

  const handleClearAllPayments = async () => {
    try {
      console.log("[Payment Cleanup] Clearing all payments from Firestore collection 'editorPayments'...");
      const snap = await getDocs(collection(db, 'editorPayments'));
      const batch = writeBatch(db);
      snap.forEach(d => {
        batch.delete(d.ref);
      });
      await batch.commit();
      console.log(`Successfully purged ${snap.size} payment records from Firestore.`);
    } catch (error) {
      console.error("Error clearing payments database:", error);
      alert("Failed to clear payments: " + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  };

  // Notification managers
  const handleMarkRead = async (id: string) => {
    const docRef = doc(db, 'notifications', id);
    await updateDoc(docRef, { read: true });
  };

  const handleClearNotification = async (id: string) => {
    const docRef = doc(db, 'notifications', id);
    await deleteDoc(docRef);
  };

  const handleClearAllNotifications = async () => {
    notifications.forEach(async (n) => {
      await deleteDoc(doc(db, 'notifications', n.id));
    });
  };

  // Invoice Draft Save & Delete
  const handleSaveInvoiceDraft = async (invoiceData: any) => {
    const docId = invoiceData.invoiceNo || invoiceData.id || `AI-2026-${Date.now().toString().slice(-4)}`;
    const docRef = doc(db, 'studioInvoices', docId);
    await setDoc(docRef, {
      ...cleanUndefined(invoiceData),
      id: docId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  };

  const handleDeleteInvoiceDraft = async (id: string) => {
    const inv = invoices.find(i => i.id === id || i.invoiceNo === id);
    if (inv) {
      await moveToRecycleBin(
        'invoice',
        id,
        `GST Invoice ${inv.invoiceNo || id}`,
        `${inv.studioName || ''} • ₹${inv.totalAmount?.toLocaleString('en-IN') || 0}`,
        'studioInvoices',
        inv
      );
    }
    const docRef = doc(db, 'studioInvoices', id);
    await deleteDoc(docRef);
  };

  // Calendar Events CRUD
  const handleAddCalendarEvent = async (evt: Omit<CalendarEvent, 'id'>) => {
    const generatedId = `evt-${Date.now()}`;
    const docRef = doc(db, 'calendar', generatedId);
    await setDoc(docRef, {
      ...cleanUndefined(evt),
      id: generatedId,
      createdAt: serverTimestamp()
    });
  };

  const handleUpdateCalendarEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    const docRef = doc(db, 'calendar', id);
    await updateDoc(docRef, cleanUndefined(updates));
  };

  const handleDeleteCalendarEvent = async (id: string) => {
    const evt = calendarEvents.find(c => c.id === id);
    if (evt) {
      await moveToRecycleBin(
        'calendar_event',
        id,
        evt.title || 'Calendar Event',
        `${evt.start || ''} • ${evt.type || 'Event'}`,
        'calendar',
        evt
      );
    }
    const docRef = doc(db, 'calendar', id);
    await deleteDoc(docRef);
  };

  // Recycle Bin Safety Net Operations (Restore & Purge)
  const handleRestoreRecycleBinItem = async (item: RecycleBinItem) => {
    try {
      const targetDocRef = doc(db, item.targetCollection, item.originalId);
      await setDoc(targetDocRef, {
        ...cleanUndefined(item.data),
        id: item.originalId,
        restoredAt: serverTimestamp()
      }, { merge: true });

      const binDocRef = doc(db, 'recycle_bin', item.id);
      await deleteDoc(binDocRef);

      try {
        const auditId = `audit-${Date.now()}-restore`;
        const auditRef = doc(db, 'revisionHistory', auditId);
        await setDoc(auditRef, {
          id: auditId,
          projectId: item.originalId,
          projectCoupleName: item.itemTitle,
          studioName: item.targetCollection,
          type: 'general',
          category: 'assignment',
          changedField: 'recycle_bin_restore',
          previousValue: 'recycle_bin',
          newValue: item.targetCollection,
          notes: `Restored "${item.itemTitle}" (${item.itemType}) back to active ${item.targetCollection} database.`,
          status: 'logged',
          performedBy: currentUser?.name || 'Administrator',
          performedByRole: currentUser?.role || 'admin',
          performedByEmail: currentUser?.email || '',
          date: new Date().toISOString().slice(0, 10),
          createdAt: serverTimestamp()
        });
      } catch (logErr) {
        console.error("Failed to log restore audit:", logErr);
      }
    } catch (error) {
      console.error('Failed to restore item from recycle bin:', error);
      alert('Failed to restore item: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  };

  const handlePermanentDeleteRecycleBinItem = async (itemId: string) => {
    try {
      const item = recycleBinItems.find(i => i.id === itemId);
      
      // Clean up Supabase storage image to avoid storage bloat when permanently deleting projects
      if (item && item.itemType === 'project' && item.data) {
        const projectData = item.data as Project;
        if (projectData.couplePhoto) {
          deleteImageFromSupabase(projectData.couplePhoto).catch(e => 
            console.warn('Storage cleanup notice on permanent delete:', e)
          );
        }
      }

      const binDocRef = doc(db, 'recycle_bin', itemId);
      await deleteDoc(binDocRef);
    } catch (error) {
      console.error('Failed to permanently delete item:', error);
      alert('Failed to delete item: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  };

  const handleEmptyRecycleBin = async () => {
    try {
      // Clean up storage for all deleted projects in recycle bin
      for (const item of recycleBinItems) {
        if (item.itemType === 'project' && item.data) {
          const projectData = item.data as Project;
          if (projectData.couplePhoto) {
            deleteImageFromSupabase(projectData.couplePhoto).catch(e => 
              console.warn('Storage cleanup notice on empty recycle bin:', e)
            );
          }
        }
      }

      const snap = await getDocs(collection(db, 'recycle_bin'));
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } catch (error) {
      console.error('Failed to empty recycle bin:', error);
      alert('Failed to empty recycle bin: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  };

  const handleRestoreAllRecycleBinItems = async () => {
    try {
      for (const item of recycleBinItems) {
        await handleRestoreRecycleBinItem(item);
      }
    } catch (error) {
      console.error('Failed to restore all items:', error);
      alert('Failed to restore some items: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  };

  // Clear / Reset Entire database
  const handleResetDatabase = async () => {
    // Clear all existing manually (seedDatabaseIfEmpty automatically bypasses if studios present, so we clean)
    projects.forEach(p => deleteDoc(doc(db, 'projects', p.id)));
    studios.forEach(s => deleteDoc(doc(db, 'studios', s.id)));
    editors.forEach(ed => deleteDoc(doc(db, 'editors', ed.id)));
    expenses.forEach(e => deleteDoc(doc(db, 'expenses', e.id)));
    notifications.forEach(n => deleteDoc(doc(db, 'notifications', n.id)));
    calendarEvents.forEach(c => deleteDoc(doc(db, 'calendar', c.id)));
    revisions.forEach(r => deleteDoc(doc(db, 'revisionHistory', r.id)));
    payments.forEach(p => deleteDoc(doc(db, 'editorPayments', p.id)));

    // Seeder will re-fire
    setTimeout(() => {
      seedDatabaseIfEmpty();
    }, 1000);
  };

  // Helper for deterministic user ID
  const getUserUid = (email: string, role: string) => {
    const cleanEmail = email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    if (cleanEmail.includes('satish') || cleanEmail.includes('sateesh')) return 'admin-satish';
    if (cleanEmail.includes('vansh')) return 'editor-vansh-auth';
    if (cleanEmail.includes('weddingbykk') || cleanEmail.includes('kk')) return 'studio-kk-auth';
    return `${role}-${cleanEmail}`;
  };

  // --- Login handler ---
  const handleLogin = async (email: string, role: UserRole, id?: string) => {
    const userUid = getUserUid(email, role);
    const cleanEmail = email.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');

    let defaultName = 'Satish Tiwari';
    if (email === 'vansh@framecut.com' || email === 'vansh2000') {
      defaultName = 'Vansh Tiwari';
    } else if (email === 'kk@weddingbykk.com') {
      defaultName = 'Wedding By KK';
    } else {
      defaultName = email.split('@')[0];
    }

    let loadedPhotoURL: string | undefined = undefined;
    let loadedName: string = defaultName;
    let loadedEditorId: string | undefined = role === 'editor' ? id : undefined;
    let loadedStudioId: string | undefined = role === 'studio' ? id : undefined;

    // 1. First check localStorage for cached profile
    try {
      const cached = localStorage.getItem(`tfc_user_profile_${userUid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.photoURL) loadedPhotoURL = parsed.photoURL;
        if (parsed.name) loadedName = parsed.name;
        if (parsed.editorId && !loadedEditorId) loadedEditorId = parsed.editorId;
        if (parsed.studioId && !loadedStudioId) loadedStudioId = parsed.studioId;
      }
    } catch (e) {
      console.error("Error reading cached profile from localStorage:", e);
    }

    // 2. Try fetching from Firestore doc `users/{userUid}`
    try {
      const userDocRef = doc(db, 'users', userUid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (data.photoURL) loadedPhotoURL = data.photoURL;
        if (data.name) loadedName = data.name;
        if (data.editorId && !loadedEditorId) loadedEditorId = data.editorId;
        if (data.studioId && !loadedStudioId) loadedStudioId = data.studioId;
      } else {
        // Initialize doc in Firestore
        await setDoc(userDocRef, {
          uid: userUid,
          email,
          name: loadedName,
          role,
          editorId: loadedEditorId || null,
          studioId: loadedStudioId || null,
          photoURL: loadedPhotoURL || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch (e) {
      console.error("Error fetching or initializing user document from Firestore:", e);
    }

    // 3. If editorId or studioId is still not found, try matching with existing editors/studios
    if (role === 'editor' && !loadedEditorId) {
      const matchedEditor = editors.find(e => 
        e.email?.toLowerCase() === email.toLowerCase() || 
        e.id.toLowerCase().includes(cleanEmail) ||
        (e.name && loadedName && e.name.toLowerCase() === loadedName.toLowerCase())
      );
      if (matchedEditor) {
        loadedEditorId = matchedEditor.id;
        if (!loadedName || loadedName === email.split('@')[0]) loadedName = matchedEditor.name;
      }
    }

    if (role === 'studio' && !loadedStudioId) {
      const matchedStudio = studios.find(s => 
        s.email?.toLowerCase() === email.toLowerCase() || 
        s.id.toLowerCase().includes(cleanEmail) ||
        (s.name && loadedName && s.name.toLowerCase() === loadedName.toLowerCase())
      );
      if (matchedStudio) {
        loadedStudioId = matchedStudio.id;
        if (!loadedName || loadedName === email.split('@')[0]) loadedName = matchedStudio.name;
      }
    }

    // Also sync to Cloud SQL relational database
    try {
      syncUserToDatabase({
        uid: userUid,
        email,
        name: loadedName,
        role,
        photoUrl: loadedPhotoURL,
      });
    } catch (sqlErr) {
      console.warn("Could not sync user to relational database:", sqlErr);
    }

    const profile: UserProfile = {
      uid: userUid,
      email,
      name: loadedName,
      photoURL: loadedPhotoURL,
      role,
      studioId: role === 'studio' ? loadedStudioId : undefined,
      editorId: role === 'editor' ? loadedEditorId : undefined,
      createdAt: new Date()
    };

    // User session persistence in sessionStorage
    try {
      const sessionData = {
        uid: userUid,
        email,
        name: loadedName,
        photoURL: loadedPhotoURL,
        role,
        studioId: role === 'studio' ? loadedStudioId : undefined,
        editorId: role === 'editor' ? loadedEditorId : undefined,
        createdAt: new Date().toISOString()
      };
      sessionStorage.setItem('tfc_session', JSON.stringify(sessionData));
      localStorage.removeItem('tfc_session');
      localStorage.removeItem('tfc_user');
    } catch {
      // ignore
    }

    // Direct role-specific target tab FIRST before setting currentUser
    // This strictly prevents any sub-frame flash of the admin dashboard when an editor or studio logs in
    const targetTab = (role === 'editor' || role === 'studio') ? 'projects' : 'dashboard';
    setActiveTab(targetTab);
    setCurrentUser(profile);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
    try {
      sessionStorage.removeItem('tfc_session');
      localStorage.removeItem('tfc_session');
      localStorage.removeItem('tfc_user');
    } catch {
      // ignore
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;

    let finalPhotoURL = updates.photoURL !== undefined ? updates.photoURL : currentUser.photoURL;
    if (finalPhotoURL && finalPhotoURL.startsWith('data:image/')) {
      finalPhotoURL = await compressImage(finalPhotoURL, 300, 300, 0.7);
    }

    const updatedProfile: UserProfile = {
      ...currentUser,
      ...updates,
      photoURL: finalPhotoURL
    };

    // Update active user state and cached session
    setCurrentUser(updatedProfile);
    try {
      const sessionData = {
        uid: updatedProfile.uid,
        email: updatedProfile.email,
        name: updatedProfile.name,
        photoURL: updatedProfile.photoURL,
        role: updatedProfile.role,
        studioId: updatedProfile.studioId,
        editorId: updatedProfile.editorId,
        createdAt: updatedProfile.createdAt
      };
      sessionStorage.setItem('tfc_session', JSON.stringify(sessionData));
      localStorage.setItem('tfc_session', JSON.stringify(sessionData));
    } catch {
      // ignore
    }

    try {
      // Sync update to firestore users collection
      const docRef = doc(db, 'users', currentUser.uid);
      await setDoc(docRef, {
        name: updatedProfile.name,
        photoURL: updatedProfile.photoURL || null,
        email: updatedProfile.email,
        role: updatedProfile.role,
        uid: updatedProfile.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // If user is an editor, sync photoURL to editor card in editors collection
      if (currentUser.editorId && finalPhotoURL) {
        const editorRef = doc(db, 'editors', currentUser.editorId);
        await updateDoc(editorRef, {
          photo: finalPhotoURL,
          name: updatedProfile.name
        });
      }

      // If user is a studio, sync photoURL to studio logoUrl in studios collection
      if (currentUser.studioId && finalPhotoURL) {
        const studioRef = doc(db, 'studios', currentUser.studioId);
        await updateDoc(studioRef, {
          logoUrl: finalPhotoURL,
          ownerName: updatedProfile.name
        });
      }

      // Sync updated user to Cloud SQL
      syncUserToDatabase({
        uid: currentUser.uid,
        email: updatedProfile.email,
        name: updatedProfile.name,
        role: updatedProfile.role,
        photoUrl: finalPhotoURL,
      });
    } catch (e) {
      console.error("Error updating user profile in Firestore:", e);
    }
  };

  const handleQuickAction = (tab: string, subAction?: string) => {
    if (tab === 'projects' && subAction === 'add_project') {
      setActiveTab('registry');
      return;
    }
    if (tab === 'gemini') {
      if (subAction === 'soundtrack' || subAction === 'captions' || subAction === 'chat') {
        setGeminiInitialMode(subAction);
      }
    }
    setActiveTab(tab);
    if (subAction) {
      setSubActionTrigger(subAction);
      setTimeout(() => setSubActionTrigger(''), 500); // clear
    }
  };

  const handleOpenGeminiCreativeTool = (mode: "chat" | "soundtrack" | "captions", projectId?: string) => {
    setGeminiInitialMode(mode);
    if (projectId) {
      setGeminiPreselectedProjectId(projectId);
    }
    setActiveTab('gemini');
  };

  // Global Search Navigation Handlers
  const handleSearchNavigateToProject = (project: Project) => {
    setIsGlobalSearchOpen(false);
    setActiveTab('projects');
    setSubActionTrigger(`open_project:${project.id}`);
    setTimeout(() => setSubActionTrigger(''), 600);
  };

  const handleSearchNavigateToStudio = (_studio: Studio) => {
    setIsGlobalSearchOpen(false);
    setActiveTab('studios');
  };

  const handleSearchNavigateToEditor = (_editor: Editor) => {
    setIsGlobalSearchOpen(false);
    setActiveTab('editors');
  };

  const handleSearchNavigateToTab = (tabId: string, subAction?: string) => {
    setIsGlobalSearchOpen(false);
    handleQuickAction(tabId, subAction);
  };

  // Filter project arrays based on roles
  const getRoleFilteredProjects = () => {
    if (currentUser?.role === 'editor' && currentUser.editorId) {
      // Editors only see assigned weddings
      return projects.filter(p => p.assignedEditorId === currentUser.editorId);
    }
    if (currentUser?.role === 'studio' && currentUser.studioId) {
      // Studios only see their weddings
      return projects.filter(p => p.studioId === currentUser.studioId);
    }
    return projects;
  };

  const roleFilteredProjects = getRoleFilteredProjects();

  const getRoleFilteredNotifications = () => {
    if (currentUser?.role === 'studio' && currentUser.studioId) {
      return notifications.filter(n => {
        if (n.studioId) return n.studioId === currentUser.studioId;
        if (n.recipientId) return n.recipientId === currentUser.studioId || n.recipientId === currentUser.email;
        if (n.recipientRole === 'studio' || n.recipientRole === 'all') return true;
        if (n.projectId) {
          const proj = projects.find(p => p.id === n.projectId);
          return proj?.studioId === currentUser.studioId;
        }
        return false;
      });
    }
    if (currentUser?.role === 'editor' && currentUser.editorId) {
      return notifications.filter(n => {
        if (n.editorId) return n.editorId === currentUser.editorId;
        if (n.recipientId) return n.recipientId === currentUser.editorId || n.recipientId === currentUser.email;
        if (n.recipientRole === 'editor' || n.recipientRole === 'all') return true;
        if (n.projectId) {
          const proj = projects.find(p => p.id === n.projectId);
          return proj?.assignedEditorId === currentUser.editorId || proj?.secondEditorId === currentUser.editorId;
        }
        if (n.studioId && !n.editorId) return false;
        return true;
      });
    }
    return notifications;
  };

  const roleFilteredNotifications = getRoleFilteredNotifications();

  // Render correct tab view panel
  const renderView = () => {
    // 1. Unauthenticated safeguard
    if (!currentUser) {
      return null;
    }

    // 2. Strict Role-based access control safeguard:
    // Non-admin roles (Editor & Studio) are strictly prohibited from viewing the admin dashboard.
    // If activeTab is 'dashboard', immediately fallback to ProjectsView to guarantee zero dashboard leakage or flashing.
    if (currentUser.role === 'editor' || currentUser.role === 'studio') {
      if (activeTab === 'dashboard') {
        return (
          <ProjectsView
            projects={roleFilteredProjects}
            studios={studios}
            editors={editors}
            revisions={revisions}
            payments={payments}
            calendarEvents={calendarEvents}
            userRole={currentUser.role}
            currentStudioId={currentUser.studioId}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onAddRevision={handleAddRevision}
            onResolveRevision={handleResolveRevision}
            onDeleteRevision={handleDeleteRevision}
            onRedirectToRegistry={() => setActiveTab('registry')}
            initialTriggerAction={subActionTrigger}
            onOpenCreativeTool={handleOpenGeminiCreativeTool}
          />
        );
      }
    }

    switch (activeTab) {
      case 'projects':
        return (
          <ProjectsView
            projects={roleFilteredProjects}
            studios={studios}
            editors={editors}
            revisions={revisions}
            payments={payments}
            calendarEvents={calendarEvents}
            userRole={currentUser?.role || 'admin'}
            currentStudioId={currentUser?.studioId}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onAddRevision={handleAddRevision}
            onResolveRevision={handleResolveRevision}
            onDeleteRevision={handleDeleteRevision}
            onRedirectToRegistry={() => setActiveTab('registry')}
            initialTriggerAction={subActionTrigger}
            onOpenCreativeTool={handleOpenGeminiCreativeTool}
          />
        );
      case 'registry':
        return (
          <RegistryView
            studios={studios}
            editors={editors}
            projects={roleFilteredProjects}
            userRole={currentUser?.role || 'admin'}
            currentStudioId={currentUser?.studioId}
            onAddProject={handleAddProject}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onRedirectToProjects={() => setActiveTab('projects')}
          />
        );
      case 'studios':
        return (
          <StudiosView
            studios={studios}
            projects={projects}
            payments={payments}
            userRole={currentUser?.role || 'admin'}
            onAddStudio={handleAddStudio}
            onUpdateStudio={handleUpdateStudio}
            onDeleteStudio={handleDeleteStudio}
            onLogPayment={handleLogPayment}
          />
        );
      case 'editors':
        return (
          <EditorsView
            editors={editors}
            projects={projects}
            payments={payments}
            studios={studios}
            userRole={currentUser?.role || 'admin'}
            currentEditorId={currentUser?.editorId}
            currentUserEmail={currentUser?.email}
            onAddEditor={handleAddEditor}
            onUpdateEditor={handleUpdateEditor}
            onDeleteEditor={handleDeleteEditor}
            onLogPayment={handleLogPayment}
            onDeletePayment={handleDeletePayment}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
          />
        );
      case 'gemini':
        return (
          <GeminiAIView
            projects={roleFilteredProjects}
            studios={studios}
            editors={editors}
            expenses={expenses}
            calendarEvents={calendarEvents}
            currentUser={currentUser}
            initialMode={geminiInitialMode}
            preselectedProjectId={geminiPreselectedProjectId}
          />
        );
      case 'dashboard':
        if (currentUser.role !== 'admin') {
          return (
            <ProjectsView
              projects={roleFilteredProjects}
              studios={studios}
              editors={editors}
              revisions={revisions}
              payments={payments}
              calendarEvents={calendarEvents}
              userRole={currentUser.role}
              currentStudioId={currentUser.studioId}
              onAddProject={handleAddProject}
              onUpdateProject={handleUpdateProject}
              onDeleteProject={handleDeleteProject}
              onAddRevision={handleAddRevision}
              onResolveRevision={handleResolveRevision}
              onDeleteRevision={handleDeleteRevision}
              onRedirectToRegistry={() => setActiveTab('registry')}
              initialTriggerAction={subActionTrigger}
              onOpenCreativeTool={handleOpenGeminiCreativeTool}
            />
          );
        }
        return (
          <DashboardView
            projects={projects}
            studios={studios}
            editors={editors}
            expenses={expenses}
            notifications={roleFilteredNotifications}
            calendarEvents={calendarEvents}
            onQuickAction={handleQuickAction}
            isOnline={isOnline}
            payments={payments}
            invoices={invoices}
            onLogPayment={handleLogPayment}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onDeletePayment={handleDeletePayment}
            onUpdatePayment={handleUpdatePayment}
            onNavigateTab={(tab) => setActiveTab(tab)}
            recycleBinItems={recycleBinItems}
            onRestoreRecycleBinItem={handleRestoreRecycleBinItem}
            isWeeklyBackupDue={isWeeklyBackupDue}
            lastWeeklyBackupDate={lastWeeklyBackupDate}
            onTriggerWeeklyBackup={handleTriggerWeeklyBackup}
            onSnoozeWeeklyBackup={handleSnoozeWeeklyBackup}
            revisions={revisions}
            onUpdateCalendarEvent={handleUpdateCalendarEvent}
          />
        );
      case 'payments':
      case 'finance':
      case 'financial_overview':
        return (
          <PaymentsLedgerView
            payments={payments}
            projects={projects}
            studios={studios}
            editors={editors}
            expenses={expenses}
            userRole={currentUser?.role || 'admin'}
            onLogPayment={handleLogPayment}
            onUpdatePayment={handleUpdatePayment}
            onDeletePayment={handleDeletePayment}
            onClearAllPayments={handleClearAllPayments}
            onUpdateProject={handleUpdateProject}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        );
      case 'invoice':
        return (
          <InvoiceView
            projects={projects}
            studios={studios}
            payments={payments}
            invoices={invoices}
            currentUser={currentUser}
            onLogPayment={handleLogPayment}
            onSaveInvoiceDraft={handleSaveInvoiceDraft}
            onDeleteInvoiceDraft={handleDeleteInvoiceDraft}
          />
        );
      case 'datamanager':
        return (
          <DataManagerView
            projects={roleFilteredProjects}
            allProjects={projects}
            studios={studios}
            editors={editors}
            expenses={expenses}
            payments={payments}
            onUpdateProject={handleUpdateProject}
            onDeleteProject={handleDeleteProject}
            onTriggerWeeklyBackup={handleTriggerWeeklyBackup}
            lastWeeklyBackupDate={lastWeeklyBackupDate}
            isWeeklyBackupDue={isWeeklyBackupDue}
            userRole={currentUser?.role}
          />
        );

      case 'reports':
        return (
          <ReportsView
            projects={projects}
            studios={studios}
            editors={editors}
            expenses={expenses}
          />
        );
      case 'audit':
      case 'auditlog':
      case 'revisionHistory':
        return (
          <AuditLogView
            revisions={revisions}
            projects={projects}
            studios={studios}
            editors={editors}
            currentUser={currentUser}
            onAddRevision={handleAddRevision}
            onResolveRevision={handleResolveRevision}
            onDeleteRevision={handleDeleteRevision}
            onUpdateProject={handleUpdateProject}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            projects={roleFilteredProjects}
            studios={studios}
            events={calendarEvents}
            onAddEvent={handleAddCalendarEvent}
            onUpdateEvent={handleUpdateCalendarEvent}
            onDeleteEvent={handleDeleteCalendarEvent}
          />
        );
      case 'notifications':
        return (
          <NotificationsView
            notifications={roleFilteredNotifications}
            calendarEvents={calendarEvents}
            runnerIsRunning={runnerIsRunning}
            runnerLastCheckTime={runnerLastCheckTime}
            runnerCheckCount={runnerCheckCount}
            pushPermissionState={pushPermissionState}
            onRequestPushPermission={requestPushPermission}
            onSendTestPush={sendTestPush}
            onRunnerManualCheck={handleRunnerManualCheck}
            onMarkRead={handleMarkRead}
            onClearNotification={handleClearNotification}
            onClearAllNotifications={handleClearAllNotifications}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        );
      case 'automation':
        return (
          <AutomationHub
            projects={projects}
            invoices={invoices}
            studios={studios}
            editors={editors}
            notifications={notifications}
            onUpdateProject={handleUpdateProject}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        );
      case 'settings':
        return (
          <SettingsView
            onResetDatabase={handleResetDatabase}
            isOnline={isOnline}
            currentUser={currentUser}
            onUpdateProfile={handleUpdateProfile}
            theme={theme}
            onThemeChange={setTheme}
            projects={projects}
            studios={studios}
            editors={editors}
            expenses={expenses}
            calendarEvents={calendarEvents}
            revisions={revisions}
            payments={payments}
            onUpdateProject={handleUpdateProject}
            isWeeklyBackupDue={isWeeklyBackupDue}
            lastWeeklyBackupDate={lastWeeklyBackupDate}
            onTriggerWeeklyBackup={handleTriggerWeeklyBackup}
          />
        );
      case 'recyclebin':
      case 'trash':
      case 'recycle_bin':
        return (
          <RecycleBinView
            recycleBinItems={recycleBinItems}
            onRestoreItem={handleRestoreRecycleBinItem}
            onPermanentDeleteItem={handlePermanentDeleteRecycleBinItem}
            onEmptyRecycleBin={handleEmptyRecycleBin}
            onRestoreAllItems={handleRestoreAllRecycleBinItems}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        );
      default:
        return <div>View not found</div>;
    }
  };

  // 1. Initial Authentication & Session Verification Lifecycle Placeholder
  // Strictly prevents the dashboard or subviews from momentarily flashing before session check or login redirect logic executes
  if (isAuthInitializing) {
    return <AuthLoadingPlaceholder theme={theme} />;
  }

  // 2. If not logged in, render cinematic brand portal with persistent offline alert if disconnected
  if (!currentUser) {
    return (
      <div className="flex flex-col min-h-screen bg-charcoal-950 text-gray-200 relative">
        <OfflineStatusBanner 
          isOnline={isOnline} 
          onCheckConnection={() => setIsOnline(navigator.onLine)} 
        />
        <LoginView onLogin={handleLogin} studios={studios} editors={editors} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-charcoal-950 text-gray-200 relative overflow-x-hidden">
      {/* Persistent Top Network & Local Sync Alert Banner */}
      <OfflineStatusBanner 
        isOnline={isOnline} 
        onCheckConnection={() => setIsOnline(navigator.onLine)} 
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex flex-col md:flex-row flex-1 relative overflow-x-hidden"
      >
        {/* Multi-layered Parallax Ambient Background Canvas - Only active on desktop */}
        <div className="hidden md:block">
          <ParallaxBackground />
        </div>
        
        {/* Floating sidebar menu */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          recycleBinCount={recycleBinItems.length}
        />

        {/* Sidebar layout spacer to reserve space on desktop and prevent reflows on hover */}
        <div className="hidden md:block w-24 shrink-0 mr-4" />

        {/* Main View Container with Parallax Perspective */}
        <main id="main-content-flow" className="flex-1 min-w-0 p-4 md:p-8 md:pl-6 overflow-x-hidden min-h-screen relative z-10">
          <div className="max-w-7xl mx-auto pb-28 md:pb-16 w-full min-w-0">
            {/* Top Persistent Header Toolbar */}
            <TopHeaderBar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              currentUser={currentUser}
              theme={theme}
              onThemeChange={setTheme}
              unreadNotificationCount={roleFilteredNotifications.filter(n => !n.read).length}
              recycleBinCount={recycleBinItems.length}
              onOpenSearch={() => setIsGlobalSearchOpen(true)}
              isOnline={isOnline}
            />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Quick Notes & Scratchpad (Top Floating across OS) */}
      {currentUser && (
        <QuickNotesDrawer
          projects={projects}
          onNavigateTab={(tab) => setActiveTab(tab)}
          onOpenCalendarReminder={(_title, _projId) => {
            setActiveTab('calendar');
          }}
        />
      )}

      {/* Real-time Global Omni-Search Modal (Cmd+K / Ctrl+K) */}
      <AnimatePresence>
        {isGlobalSearchOpen && (
          <GlobalSearchModal
            isOpen={isGlobalSearchOpen}
            onClose={() => setIsGlobalSearchOpen(false)}
            projects={roleFilteredProjects}
            studios={studios}
            editors={editors}
            currentUser={currentUser}
            onNavigateToTab={handleSearchNavigateToTab}
            onNavigateToProject={handleSearchNavigateToProject}
            onNavigateToStudio={handleSearchNavigateToStudio}
            onNavigateToEditor={handleSearchNavigateToEditor}
          />
        )}
      </AnimatePresence>

      {/* Weekly Data Protection Backup Prompt Modal */}
      <WeeklyBackupPromptModal
        isOpen={showWeeklyBackupPrompt && !!currentUser}
        onClose={() => setShowWeeklyBackupPrompt(false)}
        onDownload={handleTriggerWeeklyBackup}
        onSnooze={handleSnoozeWeeklyBackup}
        lastBackupDate={lastWeeklyBackupDate}
        downloadSuccess={weeklyBackupDownloadSuccess}
        totalRecords={{
          projects: projects.length,
          runningProjects: projects.filter(p => p.status !== 'closed').length,
          totalDueBalance: projects.reduce((sum, p) => {
            const rem = p.remainingBalance !== undefined ? p.remainingBalance : Math.max(0, (p.projectAmount || 0) - (p.advancePayment || 0));
            return sum + (Number(rem) || 0);
          }, 0),
          studios: studios.length,
          editors: editors.length,
          expenses: expenses.length,
          payments: payments.length
        }}
      />

      {/* Floating Automated Background Runner Toast Notification */}
      <AnimatePresence>
        {runnerToastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-charcoal-900/95 border border-gold-500/50 text-white shadow-2xl backdrop-blur-md flex items-start justify-between space-x-3 gold-glow"
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-gold-500/20 text-gold-400 shrink-0 mt-0.5">
                <Zap className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono">
                <div className="font-bold text-gold-400 uppercase tracking-wide">Automated Deadline Runner</div>
                <div className="text-gray-200 mt-1 leading-relaxed">{runnerToastMessage}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissRunnerToast}
              className="p-1 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating 1-tap Scroll-to-Top Button for Mobile & Desktop */}
      <FloatingScrollToTop />
      </motion.div>
    </div>
  );
}
