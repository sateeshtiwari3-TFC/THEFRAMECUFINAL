import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Project, 
  Studio, 
  Editor, 
  Expense, 
  AppNotification, 
  CalendarEvent, 
  PaymentHistory, 
  RecycleBinItem,
  Revision 
} from '../types';
import { 
  Sparkles, 
  Film, 
  IndianRupee, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  Layers, 
  Calendar,
  Zap,
  Activity,
  MessageSquare,
  ShieldCheck,
  Building2,
  SlidersHorizontal
} from 'lucide-react';
import DashboardHeader from './dashboard/DashboardHeader';
import DashboardReminderAlerts from './dashboard/DashboardReminderAlerts';
import DashboardKpiGrid from './dashboard/DashboardKpiGrid';
import DashboardLiveWorkload, { DashboardProjectSort } from './dashboard/DashboardLiveWorkload';
import DashboardAlertsHub from './dashboard/DashboardAlertsHub';
import DashboardFinancialCharts from './dashboard/DashboardFinancialCharts';
import DashboardModals from './dashboard/DashboardModals';
import ProjectHealthSummaryCard from './ProjectHealthSummaryCard';
import MonthlyWhatsAppReminders from './MonthlyWhatsAppReminders';
import GanttChartTimeline from './GanttChartTimeline';
import DashboardRecycleBinWidget from './DashboardRecycleBinWidget';
import RevenueForecastWidget from './RevenueForecastWidget';
import DashboardVisualStats from './dashboard/DashboardVisualStats';
import CriticalDeadlinesWidget from './dashboard/CriticalDeadlinesWidget';
import MonthlyRevenueTrendLineChart from './dashboard/MonthlyRevenueTrendLineChart';
import ProjectFrequencyHeatmap from './dashboard/ProjectFrequencyHeatmap';

interface DashboardViewProps {
  projects: Project[];
  studios: Studio[];
  editors: Editor[];
  expenses: Expense[];
  notifications: AppNotification[];
  calendarEvents: CalendarEvent[];
  onQuickAction: (tab: string, subAction?: string) => void;
  isOnline: boolean;
  payments: PaymentHistory[];
  invoices?: any[];
  onLogPayment: (pay: Omit<PaymentHistory, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
  onDeletePayment?: (id: string) => Promise<void>;
  onUpdatePayment?: (id: string, updates: Partial<PaymentHistory>) => Promise<void>;
  onNavigateTab?: (tab: string, subAction?: string) => void;
  recycleBinItems?: RecycleBinItem[];
  onRestoreRecycleBinItem?: (item: RecycleBinItem) => Promise<void>;
  isWeeklyBackupDue?: boolean;
  lastWeeklyBackupDate?: Date | null;
  onTriggerWeeklyBackup?: () => void;
  onSnoozeWeeklyBackup?: (days?: number) => void;
  revisions?: Revision[] | any[];
  onUpdateCalendarEvent?: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
}

export default function DashboardView({
  projects = [],
  studios = [],
  editors = [],
  expenses = [],
  notifications = [],
  calendarEvents = [],
  onQuickAction,
  isOnline,
  payments = [],
  invoices = [],
  onLogPayment,
  onUpdateProject,
  onNavigateTab,
  recycleBinItems = [],
  onRestoreRecycleBinItem,
  isWeeklyBackupDue = false,
  lastWeeklyBackupDate = null,
  onTriggerWeeklyBackup,
  onSnoozeWeeklyBackup,
  revisions = [],
  onUpdateCalendarEvent
}: DashboardViewProps) {
  // Perspective Lens Mode (Desktop)
  const [perspectiveMode, setPerspectiveMode] = useState<'mission_control' | 'edit_suite' | 'financials' | 'priority_radar' | 'forecast'>('mission_control');

  // Track viewport width to avoid mounting heavy desktop Recharts/Gantt components on phone browsers
  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mobile Dashboard Tab State (Mobile dedicated sub-views to eliminate excessive scrolling)
  const [mobileTab, setMobileTab] = useState<'overview' | 'radar' | 'workload' | 'cashflow' | 'forecast'>('overview');

  // Sync perspective selection across mobile and desktop
  const handlePerspectiveOrMobileChange = (mode: 'mission_control' | 'edit_suite' | 'financials' | 'priority_radar' | 'forecast') => {
    setPerspectiveMode(mode);
    if (mode === 'priority_radar') {
      setMobileTab('radar');
    } else if (mode === 'financials') {
      setMobileTab('cashflow');
    } else if (mode === 'edit_suite') {
      setMobileTab('workload');
    } else if (mode === 'forecast') {
      setMobileTab('forecast');
    } else {
      setMobileTab('overview');
    }
  };

  // Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'studio' | 'editor'>('studio');
  const [selectedStudioIdToPay, setSelectedStudioIdToPay] = useState('');
  const [selectedEditorIdToPay, setSelectedEditorIdToPay] = useState('');
  const [selectedProjectIdToPay, setSelectedProjectIdToPay] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('UPI / GPay / PhonePe');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Inspector modal state
  const [selectedInspectItem, setSelectedInspectItem] = useState<{ type: 'project' | 'studio' | 'editor'; data: any } | null>(null);

  // Production management workflow sorting state
  const [projectSortOption, setProjectSortOption] = useState<DashboardProjectSort>('deadline');

  // 1. Dynamic Calculations: Projects & Pipeline
  const totalProjectsCount = projects.length;
  const activeProjects = useMemo(() => projects.filter(p => p.status !== 'closed' && p.status !== 'delivered'), [projects]);
  const activeProjectsCount = activeProjects.length;
  const pendingProjectsCount = useMemo(() => projects.filter(p => ['data_received', 'assigned', 'editing', 'revision'].includes(p.status)).length, [projects]);
  const completedProjectsCount = useMemo(() => projects.filter(p => p.status === 'delivered' || p.status === 'closed').length, [projects]);

  // 2. KPI: Projects This Month
  const projectsThisMonth = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return projects.filter(p => {
      const dates = [p.shootDate, p.deliveryDate, p.createdAt];
      return dates.some(d => {
        if (!d) return false;
        const dateObj = typeof d === 'object' && 'toDate' in d ? (d as any).toDate() : new Date(d as string);
        return !isNaN(dateObj.getTime()) && dateObj.getFullYear() === currentYear && dateObj.getMonth() === currentMonth;
      });
    });
  }, [projects]);

  const totalProjectsThisMonthCount = projectsThisMonth.length;
  const completedThisMonthCount = projectsThisMonth.filter(p => p.status === 'delivered' || p.status === 'closed').length;
  const activeThisMonthCount = totalProjectsThisMonthCount - completedThisMonthCount;

  // 3. KPI: Outstanding Balance Total
  const totalOutstandingBalance = useMemo(() => {
    return projects.reduce((sum, p) => {
      const pPayments = payments.filter(pay => pay.projectId === p.id && pay.entityType === 'studio');
      const loggedSum = pPayments.reduce((s, pay) => s + (Number(pay.amount) || 0), 0);
      const effectiveReceived = pPayments.length > 0 ? loggedSum : (Number(p.advancePayment) || 0);
      const rem = Math.max(0, (Number(p.projectAmount) || 0) - effectiveReceived);
      return sum + rem;
    }, 0);
  }, [projects, payments]);

  const projectsWithOutstandingBalanceCount = useMemo(() => {
    return projects.filter(p => {
      const pPayments = payments.filter(pay => pay.projectId === p.id && pay.entityType === 'studio');
      const loggedSum = pPayments.reduce((s, pay) => s + (Number(pay.amount) || 0), 0);
      const effectiveReceived = pPayments.length > 0 ? loggedSum : (Number(p.advancePayment) || 0);
      return ((Number(p.projectAmount) || 0) - effectiveReceived) > 0;
    }).length;
  }, [projects, payments]);

  // 4. KPI: Urgent Revision Pending Count
  const urgentRevisionPendingCount = useMemo(() => {
    const urgentProjectsInRevision = projects.filter(p => 
      p.status === 'revision' && (p.priority === 'urgent' || p.priority === 'high' || p.tags?.some(t => t.toLowerCase().includes('urgent')))
    ).length;

    const pendingUrgentTickets = revisions.filter(r => 
      (r.status === 'pending' || r.status === 'logged') && 
      (r.notes?.toLowerCase().includes('urgent') || r.priority === 'urgent')
    ).length;

    const totalRevisionStatusProjects = projects.filter(p => p.status === 'revision').length;

    return Math.max(urgentProjectsInRevision, pendingUrgentTickets) || totalRevisionStatusProjects;
  }, [projects, revisions]);

  const allRevisionsPendingCount = useMemo(() => {
    return projects.filter(p => p.status === 'revision').length;
  }, [projects]);

  // 5. Finance Calculations
  const totalRevenue = useMemo(() => projects.reduce((sum, p) => sum + (Number(p.projectAmount) || 0), 0), [projects]);
  const editorPaymentsTotal = useMemo(() => projects.reduce((sum, p) => sum + (Number(p.editorPayment) || 0), 0), [projects]);
  const projectExpensesTotal = useMemo(() => projects.reduce((sum, p) => sum + (Number(p.otherExpenses) || 0), 0), [projects]);
  const manualExpensesTotal = useMemo(() => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [expenses]);
  const totalExpenses = editorPaymentsTotal + projectExpensesTotal + manualExpensesTotal;
  const totalProfit = totalRevenue - totalExpenses;

  // 6. Network counts
  const activeStudiosCount = studios.length;
  const activeEditorsCount = editors.length;

  // 7. Unpaid Editors List
  const unpaidEditorsList = useMemo(() => {
    const list: any[] = [];
    projects.forEach(p => {
      if (p.assignedEditorId) {
        const budget = p.isSplitProject ? (Number(p.firstEditorShare) || 0) : (Number(p.editorPayment) || 0);
        const paid = payments
          .filter(pay => pay.projectId === p.id && pay.entityId === p.assignedEditorId && pay.entityType === 'editor')
          .reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
        const pending = budget - paid;
        if (pending > 0) {
          list.push({
            editorId: p.assignedEditorId,
            editorName: p.assignedEditorName || 'Unassigned',
            projectId: p.id,
            coupleName: p.coupleName || 'Wedding Film',
            budget,
            paid,
            pending,
            roleType: p.isSplitProject ? 'Lead Share' : 'Lead Editor'
          });
        }
      }
    });
    return list;
  }, [projects, payments]);

  // 8. Consolidated Studio Payment Reminders
  const studioPaymentRemindersList = useMemo(() => {
    const studioMap = new Map<string, any>();

    projects.forEach(p => {
      const pPayments = payments.filter(pay => pay.projectId === p.id && pay.entityType === 'studio');
      const loggedSum = pPayments.reduce((s, pay) => s + (Number(pay.amount) || 0), 0);
      const effectiveReceived = pPayments.length > 0 ? loggedSum : (Number(p.advancePayment) || 0);
      const remBal = Math.max(0, (Number(p.projectAmount) || 0) - effectiveReceived);

      if (remBal <= 0) return;

      const studioObj = studios.find(s => s.id === p.studioId);
      const sKey = p.studioId || p.studioName || 'direct';
      const sName = p.studioName || studioObj?.name || 'Direct Studio Client';

      if (!studioMap.has(sKey)) {
        studioMap.set(sKey, {
          id: `studio-${sKey}`,
          studioId: p.studioId || '',
          studioName: sName,
          phone: studioObj?.phone || '',
          amount: 0,
          projectsCount: 0,
          label: ''
        });
      }

      const entry = studioMap.get(sKey)!;
      entry.amount += remBal;
      entry.projectsCount += 1;
      entry.label = `${entry.projectsCount} Pending Film${entry.projectsCount > 1 ? 's' : ''}`;
    });

    return Array.from(studioMap.values()).sort((a, b) => b.amount - a.amount);
  }, [projects, payments, studios]);

  // 9. Project Delivery Deadlines
  const projectRemindersList = useMemo(() => {
    return projects
      .filter(p => p.status !== 'closed' && p.status !== 'delivered')
      .map(p => {
        const daysLeft = p.deliveryDate 
          ? Math.ceil((new Date(p.deliveryDate).getTime() - Date.now()) / (1000 * 3600 * 24))
          : 999;
        return {
          id: p.id,
          coupleName: p.coupleName,
          studioName: p.studioName,
          daysLeft,
          status: p.status,
          editorName: p.assignedEditorName || 'Unassigned',
          project: p
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [projects]);

  const overdueDeadlinesCount = useMemo(() => {
    return projectRemindersList.filter(p => p.daysLeft < 0).length;
  }, [projectRemindersList]);

  const criticalDeadlinesCount = useMemo(() => {
    return projectRemindersList.filter(p => p.daysLeft >= 0 && p.daysLeft <= 2).length;
  }, [projectRemindersList]);

  const nearestDeadlineItem = useMemo(() => {
    const list = projectRemindersList.filter(p => p.daysLeft !== 999);
    return list.length > 0 ? { coupleName: list[0].coupleName, daysLeft: list[0].daysLeft } : null;
  }, [projectRemindersList]);

  const pendingStudiosWithBalanceCount = studioPaymentRemindersList.length;
  const unpaidEditorsCount = unpaidEditorsList.length;

  // 10. Financial Charts & Trends Data
  const profitabilityTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const list = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = targetDate.getMonth();
      const yr = targetDate.getFullYear();
      const monthLabel = months[mIdx];
      const prefix = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;

      const monthProjects = projects.filter(p => {
        const d1 = p.shootDate;
        const d2 = p.deliveryDate;
        return (d1 && d1.startsWith(prefix)) || (d2 && d2.startsWith(prefix));
      });

      const projectedContracts = monthProjects.reduce((sum, p) => sum + (Number(p.projectAmount) || 0), 0);
      const editorPayouts = monthProjects.reduce((sum, p) => sum + (Number(p.editorPayment) || 0), 0);
      const actualExpenses = expenses
        .filter(e => e.date && e.date.startsWith(prefix))
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const totalOutflow = editorPayouts + actualExpenses;
      const netProfit = projectedContracts - totalOutflow;
      const profitMargin = projectedContracts > 0 ? Math.round((netProfit / projectedContracts) * 100) : 0;

      list.push({
        name: monthLabel,
        'Projected Contracts': Math.round(projectedContracts),
        'Editor Payouts': Math.round(editorPayouts),
        'Actual Expenses': Math.round(actualExpenses),
        'Total Outflow': Math.round(totalOutflow),
        'Net Profit': Math.round(netProfit),
        'Profit Margin (%)': profitMargin,
      });
    }
    return list;
  }, [projects, expenses]);

  const revenueVsExpensesData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const list = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = targetDate.getMonth();
      const yr = targetDate.getFullYear();
      const monthLabel = months[mIdx];
      const prefix = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;

      const studioReceipts = payments
        .filter(p => p.entityType === 'studio' && p.date && p.date.startsWith(prefix))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const editorPayouts = payments
        .filter(p => p.entityType === 'editor' && p.date && p.date.startsWith(prefix))
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const generalExpenses = expenses
        .filter(e => e.date && e.date.startsWith(prefix))
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      const totalExpensesForMonth = editorPayouts + generalExpenses;

      list.push({
        name: monthLabel,
        'Revenue (Receipts)': Math.round(studioReceipts),
        'Expenses': Math.round(totalExpensesForMonth),
        'Net Profit': Math.round(studioReceipts - totalExpensesForMonth),
      });
    }
    return list;
  }, [payments, expenses]);

  const sparklineData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const list = [];

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = targetDate.getMonth();
      const yr = targetDate.getFullYear();
      const monthLabel = months[mIdx];
      const prefix = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;

      const completedCount = projects.filter(p => {
        const isCompleted = p.status === 'delivered' || p.status === 'closed';
        const d = p.deliveryDate || p.shootDate;
        return isCompleted && d && d.startsWith(prefix);
      }).length;

      const totalCount = projects.filter(p => {
        const d = p.shootDate || p.deliveryDate;
        return d && d.startsWith(prefix);
      }).length;

      list.push({
        month: monthLabel,
        completed: completedCount,
        total: totalCount,
      });
    }
    return list;
  }, [projects]);

  const profitabilitySummary = useMemo(() => {
    const totalProjected = profitabilityTrendData.reduce((sum, d) => sum + (d['Projected Contracts'] || 0), 0);
    const totalEditorPayouts = profitabilityTrendData.reduce((sum, d) => sum + (d['Editor Payouts'] || 0), 0);
    const totalActualExpenses = profitabilityTrendData.reduce((sum, d) => sum + (d['Actual Expenses'] || 0), 0);
    const totalOutflow = totalEditorPayouts + totalActualExpenses;
    const totalNetProfit = totalProjected - totalOutflow;
    const overallMargin = totalProjected > 0 ? ((totalNetProfit / totalProjected) * 100).toFixed(1) : '0';

    return {
      totalProjected,
      totalEditorPayouts,
      totalActualExpenses,
      totalOutflow,
      totalNetProfit,
      overallMargin,
    };
  }, [profitabilityTrendData]);

  const studioPerformanceData = useMemo(() => {
    return studios.map(studio => {
      const sProjs = projects.filter(p => p.studioId === studio.id);
      const amount = sProjs.reduce((sum, p) => sum + (Number(p.projectAmount) || 0), 0);
      const paidAmount = sProjs.reduce((sum, p) => sum + (Number(p.advancePayment) || 0), 0);
      const pendingAmount = Math.max(0, amount - paidAmount);
      return {
        fullName: studio.name,
        name: studio.name.length > 12 ? `${studio.name.substring(0, 12)}...` : studio.name,
        Revenue: amount,
        PaidRevenue: paidAmount,
        PendingRevenue: pendingAmount,
        Projects: sProjs.length,
      };
    }).sort((a, b) => b.Revenue - a.Revenue).slice(0, 5);
  }, [studios, projects]);

  const editorPerformanceData = useMemo(() => {
    return editors.map(editor => {
      const eProjs = projects.filter(p => p.assignedEditorId === editor.id || (p.isSplitProject && p.secondEditorId === editor.id));
      const completed = eProjs.filter(p => p.status === 'delivered' || p.status === 'closed').length;
      return {
        fullName: editor.name,
        name: editor.name,
        Assigned: eProjs.length,
        Completed: completed,
        active: Math.max(0, eProjs.length - completed),
        specialty: (editor as any).specialty || 'Cinematic Film'
      };
    });
  }, [editors, projects]);

  // Payment Submission Handler
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || paymentAmount <= 0) {
      setPaymentError('Please specify a valid payment amount.');
      return;
    }

    setIsSubmittingPayment(true);
    setPaymentError('');
    setPaymentSuccess('');

    try {
      if (paymentType === 'studio') {
        const studio = studios.find(s => s.id === selectedStudioIdToPay);
        const paymentData = {
          entityId: selectedStudioIdToPay,
          entityType: 'studio' as const,
          projectId: selectedProjectIdToPay || 'general_ledger',
          projectCoupleName: 'Studio Advance / Settlement',
          amount: paymentAmount,
          date: paymentDate,
          paymentMethod,
          notes: paymentNotes || `Payment received from studio partner ${studio?.name || ''}`
        };
        await onLogPayment(paymentData);
        setPaymentSuccess(`Successfully recorded payment receipt of ₹${paymentAmount.toLocaleString('en-IN')}!`);
      } else {
        const editor = editors.find(e => e.id === selectedEditorIdToPay);
        const paymentData = {
          entityId: selectedEditorIdToPay,
          entityType: 'editor' as const,
          projectId: selectedProjectIdToPay || 'general_ledger',
          projectCoupleName: 'Editor Wage Payout',
          amount: paymentAmount,
          date: paymentDate,
          paymentMethod,
          notes: paymentNotes || `Disbursed wage to editor ${editor?.name || ''}`
        };
        await onLogPayment(paymentData);
        setPaymentSuccess(`Successfully recorded wage payout of ₹${paymentAmount.toLocaleString('en-IN')} to ${editor?.name || ''}!`);
      }

      setPaymentAmount(0);
      setPaymentNotes('');
      setTimeout(() => {
        setIsPaymentModalOpen(false);
        setPaymentSuccess('');
      }, 1500);
    } catch (err: any) {
      console.error('Error logging payment:', err);
      setPaymentError(err.message || 'Failed to save transaction.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const openPaymentModal = (type: 'studio' | 'editor', entityId?: string, projectId?: string, amount?: number) => {
    setPaymentType(type);
    if (type === 'studio' && entityId) setSelectedStudioIdToPay(entityId);
    if (type === 'editor' && entityId) setSelectedEditorIdToPay(entityId);
    if (projectId) setSelectedProjectIdToPay(projectId);
    if (amount) setPaymentAmount(amount);
    setIsPaymentModalOpen(true);
  };

  // Reusable Perspective Lens Switcher for Desktop Top and Bottom viewing convenience
  const renderPerspectiveSwitcher = (location: 'top' | 'bottom') => {
    const handleSwitch = (mode: 'mission_control' | 'edit_suite' | 'financials' | 'priority_radar' | 'forecast') => {
      handlePerspectiveOrMobileChange(mode);
      if (location === 'bottom') {
        const el = document.getElementById('perspective-views-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };

    return (
      <div 
        className={`flex items-center gap-2.5 overflow-x-auto custom-scrollbar ${
          location === 'top' 
            ? 'border-b border-white/[0.08] pb-4' 
            : 'border-t border-white/[0.08] pt-6 mt-12 mb-4 justify-center bg-black/40 p-3 rounded-3xl backdrop-blur-md border border-white/[0.08]'
        }`}
      >
        {/* Mission Control (All-in-One) */}
        <button
          onClick={() => handleSwitch('mission_control')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border ${
            perspectiveMode === 'mission_control'
              ? 'bg-gradient-to-r from-gold-500/20 via-gold-500/10 to-transparent border-gold-500/60 text-gold-200 shadow-xl shadow-gold-500/10 ring-1 ring-gold-500/30'
              : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.07] hover:border-white/[0.16]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-gold-400" />
          <span>Mission Control (All)</span>
        </button>

        {/* Active Edit Suite */}
        <button
          onClick={() => handleSwitch('edit_suite')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border ${
            perspectiveMode === 'edit_suite'
              ? 'bg-gradient-to-r from-gold-500/20 via-gold-500/10 to-transparent border-gold-500/60 text-gold-200 shadow-xl shadow-gold-500/10 ring-1 ring-gold-500/30'
              : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.07] hover:border-white/[0.16]'
          }`}
        >
          <Film className="w-4 h-4 text-emerald-400" />
          <span>Edit Suite & Pipeline</span>
          <span className="px-2 py-0.5 rounded-full bg-black/50 text-[10px] text-emerald-300 font-bold border border-emerald-500/30">
            {activeProjectsCount}
          </span>
        </button>

        {/* Financials & Dues Engine */}
        <button
          onClick={() => handleSwitch('financials')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border ${
            perspectiveMode === 'financials'
              ? 'bg-gradient-to-r from-gold-500/20 via-gold-500/10 to-transparent border-gold-500/60 text-gold-200 shadow-xl shadow-gold-500/10 ring-1 ring-gold-500/30'
              : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.07] hover:border-white/[0.16]'
          }`}
        >
          <IndianRupee className="w-4 h-4 text-gold-400" />
          <span>Cashflow & Receivables</span>
          {totalOutstandingBalance > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-[10px] text-amber-200 font-bold border border-amber-500/40">
              ₹{(totalOutstandingBalance / 1000).toFixed(0)}k Due
            </span>
          )}
        </button>

        {/* Priority & Delivery Radar */}
        <button
          onClick={() => handleSwitch('priority_radar')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border ${
            perspectiveMode === 'priority_radar'
              ? 'bg-gradient-to-r from-gold-500/20 via-gold-500/10 to-transparent border-gold-500/60 text-gold-200 shadow-xl shadow-gold-500/10 ring-1 ring-gold-500/30'
              : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.07] hover:border-white/[0.16]'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>Deadlines & Urgent Radar</span>
          {urgentRevisionPendingCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          )}
        </button>

        {/* Revenue Forecast */}
        <button
          onClick={() => handleSwitch('forecast')}
          className={`flex items-center space-x-2 px-5 py-3 rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border ${
            perspectiveMode === 'forecast'
              ? 'bg-gradient-to-r from-gold-500/20 via-gold-500/10 to-transparent border-gold-500/60 text-gold-200 shadow-xl shadow-gold-500/10 ring-1 ring-gold-500/30'
              : 'bg-white/[0.03] border-white/[0.08] text-zinc-300 hover:text-white hover:bg-white/[0.07] hover:border-white/[0.16]'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-sky-400" />
          <span>Revenue Forecast</span>
        </button>
      </div>
    );
  };

  // Dedicated Mobile Segmented Tab Bar
  const renderMobileTabBar = () => {
    const mobileTabs = [
      {
        id: 'overview' as const,
        label: 'Overview',
        subLabel: 'KPIs',
        icon: Activity,
        badge: null,
      },
      {
        id: 'radar' as const,
        label: 'Radar',
        subLabel: 'Deadlines',
        icon: AlertTriangle,
        badge: overdueDeadlinesCount > 0 
          ? `${overdueDeadlinesCount}` 
          : criticalDeadlinesCount > 0 
          ? `${criticalDeadlinesCount}` 
          : null,
        badgeColor: overdueDeadlinesCount > 0 
          ? 'bg-rose-500 text-white animate-pulse' 
          : 'bg-amber-500/30 text-amber-200 border border-amber-500/40',
      },
      {
        id: 'workload' as const,
        label: 'Workload',
        subLabel: 'Pipeline',
        icon: Film,
        badge: activeProjectsCount > 0 ? `${activeProjectsCount}` : null,
        badgeColor: 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40',
      },
      {
        id: 'cashflow' as const,
        label: 'Cashflow',
        subLabel: 'Dues',
        icon: IndianRupee,
        badge: totalOutstandingBalance > 0 ? `₹${(totalOutstandingBalance / 1000).toFixed(0)}k` : null,
        badgeColor: 'bg-gold-500/25 text-gold-300 border border-gold-500/40',
      },
      {
        id: 'forecast' as const,
        label: 'Forecast',
        subLabel: 'Trends',
        icon: TrendingUp,
        badge: null,
      },
    ];

    return (
      <div id="mobile-dashboard-tabbar" className="md:hidden sticky top-0 z-30 -mx-4 px-4 py-2.5 bg-charcoal-950/95 backdrop-blur-2xl border-b border-white/[0.08] shadow-xl">
        <div className="grid grid-cols-5 gap-1.5 p-1 bg-black/50 border border-white/[0.08] rounded-2xl">
          {mobileTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = mobileTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`dash-tab-btn-${tab.id}`}
                onClick={() => {
                  setMobileTab(tab.id);
                  const el = document.getElementById('mobile-dashboard-tabbar');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center relative cursor-pointer active:scale-95 transition-all duration-200 touch-manipulation ${
                  isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobileDashboardActiveTabPill"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="absolute inset-0 bg-gradient-to-b from-gold-500/25 to-gold-500/10 border border-gold-500/60 rounded-xl shadow-md shadow-gold-500/10"
                  />
                )}
                <div className="relative z-10 flex items-center justify-center space-x-1">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gold-300 scale-110' : 'text-zinc-400'}`} />
                  {tab.badge && (
                    <span className={`px-1 py-0.2 rounded-full text-[9px] font-mono font-bold leading-none ${tab.badgeColor}`}>
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className={`relative z-10 text-[10px] font-sans font-bold tracking-tight mt-1 whitespace-nowrap ${
                  isActive ? 'text-gold-300' : 'text-zinc-400'
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-16">
      
      {/* ================= 1. ULTRA-LUXURY EXECUTIVE OS HEADER ================= */}
      <DashboardHeader
        isOnline={isOnline}
        projects={projects}
        onOpenPaymentModal={() => openPaymentModal('studio')}
        onQuickAction={onQuickAction}
        onTriggerBackup={onTriggerWeeklyBackup || (() => {})}
        isBackupRecommended={isWeeklyBackupDue}
        activeProjectsCount={activeProjectsCount}
        urgentRevisionsCount={urgentRevisionPendingCount}
        totalOutstandingBalance={totalOutstandingBalance}
        criticalDeadlinesCount={criticalDeadlinesCount}
        overdueDeadlinesCount={overdueDeadlinesCount}
        nearestDeadlineItem={nearestDeadlineItem}
        pendingStudiosWithBalanceCount={pendingStudiosWithBalanceCount}
        unpaidEditorsCount={unpaidEditorsCount}
        onSelectPerspective={handlePerspectiveOrMobileChange}
      />

      {/* ================= RED BLINKING CALENDAR REMINDERS ALERT BANNER ================= */}
      <DashboardReminderAlerts
        calendarEvents={calendarEvents}
        projects={projects}
        onNavigateTab={onNavigateTab}
        onUpdateCalendarEvent={onUpdateCalendarEvent}
        onOpenPaymentModal={() => openPaymentModal('studio')}
      />

      {/* ================= MOBILE VIEW: DEDICATED TABBED INTERFACE (ONLY MOUNTED ON PHONES) ================= */}
      {isMobileScreen && (
        <>
          {renderMobileTabBar()}

          <div className="md:hidden">
            <AnimatePresence mode="wait">
              {/* MOBILE TAB 1: OVERVIEW */}
              {mobileTab === 'overview' && (
                <motion.div
                  key="mobile-overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <DashboardKpiGrid
                    totalProjectsCount={totalProjectsCount}
                    completedProjectsCount={completedProjectsCount}
                    pendingProjectsCount={pendingProjectsCount}
                    totalProjectsThisMonthCount={totalProjectsThisMonthCount}
                    completedThisMonthCount={completedThisMonthCount}
                    activeThisMonthCount={activeThisMonthCount}
                    activeProjectsCount={activeProjectsCount}
                    totalRevenue={totalRevenue}
                    totalOutstandingBalance={totalOutstandingBalance}
                    projectsWithOutstandingBalanceCount={projectsWithOutstandingBalanceCount}
                    urgentRevisionPendingCount={urgentRevisionPendingCount}
                    allRevisionsPendingCount={allRevisionsPendingCount}
                    totalExpenses={totalExpenses}
                    manualExpensesTotal={manualExpensesTotal}
                    totalProfit={totalProfit}
                    activeStudiosCount={activeStudiosCount}
                    activeEditorsCount={activeEditorsCount}
                    onNavigateTab={onNavigateTab}
                  />

                  <ProjectHealthSummaryCard
                    projects={projects}
                    studios={studios}
                    editors={editors}
                    payments={payments}
                    onOpenPaymentModal={openPaymentModal}
                    onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
                    onQuickAction={onQuickAction}
                  />

                  <MonthlyRevenueTrendLineChart
                    editorPayments={payments}
                    studioInvoices={invoices}
                    onNavigateTab={onNavigateTab}
                  />

                  <ProjectFrequencyHeatmap
                    projects={projects}
                    studios={studios}
                    editors={editors}
                    onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
                    onNavigateTab={onNavigateTab}
                  />
                </motion.div>
              )}

              {/* MOBILE TAB 2: RADAR (DEADLINES & URGENT) */}
              {mobileTab === 'radar' && (
                <motion.div
                  key="mobile-radar"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <CriticalDeadlinesWidget
                    projects={projects}
                    editors={editors}
                    studios={studios}
                    onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
                    onUpdateProject={onUpdateProject}
                    onNavigateTab={onNavigateTab}
                  />

                  <DashboardAlertsHub
                    projects={projects}
                    studios={studios}
                    editors={editors}
                    filteredStudioPaymentReminders={studioPaymentRemindersList}
                    filteredPaymentReminders={studioPaymentRemindersList}
                    filteredProjectReminders={projectRemindersList}
                    unpaidEditorsList={unpaidEditorsList}
                    onOpenPaymentModal={openPaymentModal}
                    onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
                    onNavigateTab={onNavigateTab}
                    onTriggerWeeklyBackup={onTriggerWeeklyBackup}
                    isWeeklyBackupDue={isWeeklyBackupDue}
                  />
                </motion.div>
              )}

              {/* MOBILE TAB 3: WORKLOAD (LIVE PIPELINE) */}
              {mobileTab === 'workload' && (
                <motion.div
                  key="mobile-workload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <DashboardLiveWorkload
                    projects={projects}
                    editors={editors}
                    onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
                    onQuickAction={onQuickAction}
                    sortBy={projectSortOption}
                    onSortChange={setProjectSortOption}
                  />

                  <ProjectFrequencyHeatmap
                    projects={projects}
                    studios={studios}
                    editors={editors}
                    onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
                    onNavigateTab={onNavigateTab}
                  />

                  <DashboardVisualStats
                    projects={projects}
                    onNavigateTab={onNavigateTab}
                  />
                </motion.div>
              )}

              {/* MOBILE TAB 4: CASHFLOW (DUES & WHATSAPP) */}
              {mobileTab === 'cashflow' && (
                <motion.div
                  key="mobile-cashflow"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <DashboardFinancialCharts
                    profitabilityTrendData={profitabilityTrendData}
                    revenueVsExpensesData={revenueVsExpensesData}
                    sparklineData={sparklineData}
                    studioPerformanceData={studioPerformanceData}
                    editorPerformanceData={editorPerformanceData}
                    profitabilitySummary={profitabilitySummary}
                    onNavigateTab={onNavigateTab}
                  />

                  <div id="whatsapp-reminders-section">
                    <MonthlyWhatsAppReminders
                      projects={projects}
                      studios={studios}
                      editors={editors}
                      payments={payments}
                    />
                  </div>
                </motion.div>
              )}

              {/* MOBILE TAB 5: FORECAST & ANALYTICS */}
              {mobileTab === 'forecast' && (
                <motion.div
                  key="mobile-forecast"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <RevenueForecastWidget
                    projects={projects}
                    studios={studios}
                    editors={editors}
                  />

                  <GanttChartTimeline
                    projects={projects}
                    onSelectProject={(projectId) => {
                      const p = projects.find(proj => proj.id === projectId);
                      if (p) setSelectedInspectItem({ type: 'project', data: p });
                    }}
                    onUpdateProject={onUpdateProject}
                  />

                  <DashboardRecycleBinWidget
                    recycleBinItems={recycleBinItems}
                    onRestoreItem={onRestoreRecycleBinItem || (async () => {})}
                    onNavigateTab={onNavigateTab || (() => {})}
                    isOrganic={true}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* ================= DESKTOP VIEW: FULL EXPANDABLE SUITE (ONLY MOUNTED ON DESKTOP) ================= */}
      {!isMobileScreen && (
        <div className="hidden md:block space-y-8">
        {/* ================= 2. MASTER BENTO KPI GRID (TOP OVERVIEW) ================= */}
        <DashboardKpiGrid
          totalProjectsCount={totalProjectsCount}
          completedProjectsCount={completedProjectsCount}
          pendingProjectsCount={pendingProjectsCount}
          totalProjectsThisMonthCount={totalProjectsThisMonthCount}
          completedThisMonthCount={completedThisMonthCount}
          activeThisMonthCount={activeThisMonthCount}
          activeProjectsCount={activeProjectsCount}
          totalRevenue={totalRevenue}
          totalOutstandingBalance={totalOutstandingBalance}
          projectsWithOutstandingBalanceCount={projectsWithOutstandingBalanceCount}
          urgentRevisionPendingCount={urgentRevisionPendingCount}
          allRevisionsPendingCount={allRevisionsPendingCount}
          totalExpenses={totalExpenses}
          manualExpensesTotal={manualExpensesTotal}
          totalProfit={totalProfit}
          activeStudiosCount={activeStudiosCount}
          activeEditorsCount={activeEditorsCount}
          onNavigateTab={onNavigateTab}
        />

        {/* ================= 3. STUDIO PERSPECTIVE LENS SWITCHER (DIRECTLY ATTACHED TO PANELS) ================= */}
        <div id="perspective-views-section" className="sticky top-0 z-20 bg-charcoal-950/90 backdrop-blur-xl py-3 -my-2 rounded-2xl">
          {renderPerspectiveSwitcher('top')}
        </div>

        {/* ================= 4. PERSPECTIVE VIEW PANELS ================= */}

        {/* --- LENS 1: MISSION CONTROL (ALL-IN-ONE) --- */}
        {perspectiveMode === 'mission_control' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* AI Intelligence Health Summary Card */}
            <ProjectHealthSummaryCard
              projects={projects}
              studios={studios}
              editors={editors}
              payments={payments}
              onOpenPaymentModal={openPaymentModal}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onQuickAction={onQuickAction}
            />

            {/* Monthly Revenue & Payout Trends Line Chart (Editor Payments vs Studio Invoices) */}
            <MonthlyRevenueTrendLineChart
              editorPayments={payments}
              studioInvoices={invoices}
              onNavigateTab={onNavigateTab}
            />

            {/* Critical 48-Hour Deadlines Radar */}
            <CriticalDeadlinesWidget
              projects={projects}
              editors={editors}
              studios={studios}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onUpdateProject={onUpdateProject}
              onNavigateTab={onNavigateTab}
            />

            {/* Project Frequency & Production Load Heatmap */}
            <ProjectFrequencyHeatmap
              projects={projects}
              studios={studios}
              editors={editors}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onNavigateTab={onNavigateTab}
            />

            {/* Active Editing Pipeline */}
            <DashboardLiveWorkload
              projects={projects}
              editors={editors}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onQuickAction={onQuickAction}
              sortBy={projectSortOption}
              onSortChange={setProjectSortOption}
            />

            {/* Accounts & Production Action Hub */}
            <DashboardAlertsHub
              projects={projects}
              studios={studios}
              editors={editors}
              filteredStudioPaymentReminders={studioPaymentRemindersList}
              filteredPaymentReminders={studioPaymentRemindersList}
              filteredProjectReminders={projectRemindersList}
              unpaidEditorsList={unpaidEditorsList}
              onOpenPaymentModal={openPaymentModal}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onNavigateTab={onNavigateTab}
              onTriggerWeeklyBackup={onTriggerWeeklyBackup}
              isWeeklyBackupDue={isWeeklyBackupDue}
            />

            {/* Visual Intelligence: Monthly Revenue Projections & Status Distribution Charts */}
            <DashboardVisualStats
              projects={projects}
              onNavigateTab={onNavigateTab}
            />

            {/* Dynamic 3-Way Financial & Productivity Charts */}
            <DashboardFinancialCharts
              profitabilityTrendData={profitabilityTrendData}
              revenueVsExpensesData={revenueVsExpensesData}
              sparklineData={sparklineData}
              studioPerformanceData={studioPerformanceData}
              editorPerformanceData={editorPerformanceData}
              profitabilitySummary={profitabilitySummary}
              onNavigateTab={onNavigateTab}
            />

            {/* 5th of Month WhatsApp Engine */}
            <div id="whatsapp-reminders-section">
              <MonthlyWhatsAppReminders
                projects={projects}
                studios={studios}
                editors={editors}
                payments={payments}
              />
            </div>

            {/* Recycle Bin Safety Net */}
            <DashboardRecycleBinWidget
              recycleBinItems={recycleBinItems}
              onRestoreItem={onRestoreRecycleBinItem || (async () => {})}
              onNavigateTab={onNavigateTab || (() => {})}
              isOrganic={true}
            />
          </div>
        )}

        {/* --- LENS 2: EDIT SUITE & PIPELINE --- */}
        {perspectiveMode === 'edit_suite' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Critical 48-Hour Deadlines Radar */}
            <CriticalDeadlinesWidget
              projects={projects}
              editors={editors}
              studios={studios}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onUpdateProject={onUpdateProject}
              onNavigateTab={onNavigateTab}
            />

            {/* Project Frequency & Production Load Heatmap */}
            <ProjectFrequencyHeatmap
              projects={projects}
              studios={studios}
              editors={editors}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onNavigateTab={onNavigateTab}
            />

            <DashboardLiveWorkload
              projects={projects}
              editors={editors}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onQuickAction={onQuickAction}
              sortBy={projectSortOption}
              onSortChange={setProjectSortOption}
            />

            <DashboardVisualStats
              projects={projects}
              onNavigateTab={onNavigateTab}
            />

            <GanttChartTimeline
              projects={projects}
              onSelectProject={(projectId) => {
                const p = projects.find(proj => proj.id === projectId);
                if (p) setSelectedInspectItem({ type: 'project', data: p });
              }}
              onUpdateProject={onUpdateProject}
            />
          </div>
        )}

        {/* --- LENS 3: FINANCIALS & RECEIVABLES --- */}
        {perspectiveMode === 'financials' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Monthly Revenue & Payout Trends Line Chart */}
            <MonthlyRevenueTrendLineChart
              editorPayments={payments}
              studioInvoices={invoices}
              onNavigateTab={onNavigateTab}
            />

            <DashboardVisualStats
              projects={projects}
              onNavigateTab={onNavigateTab}
            />

            <DashboardFinancialCharts
              profitabilityTrendData={profitabilityTrendData}
              revenueVsExpensesData={revenueVsExpensesData}
              sparklineData={sparklineData}
              studioPerformanceData={studioPerformanceData}
              editorPerformanceData={editorPerformanceData}
              profitabilitySummary={profitabilitySummary}
              onNavigateTab={onNavigateTab}
            />

            <DashboardAlertsHub
              projects={projects}
              studios={studios}
              editors={editors}
              filteredStudioPaymentReminders={studioPaymentRemindersList}
              filteredPaymentReminders={studioPaymentRemindersList}
              filteredProjectReminders={projectRemindersList}
              unpaidEditorsList={unpaidEditorsList}
              onOpenPaymentModal={openPaymentModal}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onNavigateTab={onNavigateTab}
              onTriggerWeeklyBackup={onTriggerWeeklyBackup}
              isWeeklyBackupDue={isWeeklyBackupDue}
            />

            <div id="whatsapp-reminders-section">
              <MonthlyWhatsAppReminders
                projects={projects}
                studios={studios}
                editors={editors}
                payments={payments}
              />
            </div>
          </div>
        )}

        {/* --- LENS 4: DEADLINES & URGENT RADAR --- */}
        {perspectiveMode === 'priority_radar' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Critical 48-Hour Deadlines Radar */}
            <CriticalDeadlinesWidget
              projects={projects}
              editors={editors}
              studios={studios}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onUpdateProject={onUpdateProject}
              onNavigateTab={onNavigateTab}
            />

            {/* Project Frequency & Production Load Heatmap */}
            <ProjectFrequencyHeatmap
              projects={projects}
              studios={studios}
              editors={editors}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onNavigateTab={onNavigateTab}
            />

            <ProjectHealthSummaryCard
              projects={projects}
              studios={studios}
              editors={editors}
              payments={payments}
              onOpenPaymentModal={openPaymentModal}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onQuickAction={onQuickAction}
            />

            <DashboardAlertsHub
              projects={projects}
              studios={studios}
              editors={editors}
              filteredStudioPaymentReminders={studioPaymentRemindersList}
              filteredPaymentReminders={studioPaymentRemindersList}
              filteredProjectReminders={projectRemindersList}
              unpaidEditorsList={unpaidEditorsList}
              onOpenPaymentModal={openPaymentModal}
              onInspectProject={(project) => setSelectedInspectItem({ type: 'project', data: project })}
              onNavigateTab={onNavigateTab}
              onTriggerWeeklyBackup={onTriggerWeeklyBackup}
              isWeeklyBackupDue={isWeeklyBackupDue}
            />

            <GanttChartTimeline
              projects={projects}
              onSelectProject={(projectId) => {
                const p = projects.find(proj => proj.id === projectId);
                if (p) setSelectedInspectItem({ type: 'project', data: p });
              }}
              onUpdateProject={onUpdateProject}
            />
          </div>
        )}

        {/* --- LENS 5: REVENUE FORECAST --- */}
        {perspectiveMode === 'forecast' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Monthly Revenue & Payout Trends Line Chart */}
            <MonthlyRevenueTrendLineChart
              editorPayments={payments}
              studioInvoices={invoices}
              onNavigateTab={onNavigateTab}
            />

            <RevenueForecastWidget
              projects={projects}
              studios={studios}
              editors={editors}
            />
          </div>
        )}

        {/* ================= STUDIO PERSPECTIVE LENS SWITCHER (BOTTOM) ================= */}
        {renderPerspectiveSwitcher('bottom')}
      </div>
      )}

      {/* ================= TRANSACTION & INSPECTION MODALS ================= */}
      <DashboardModals
        isPaymentModalOpen={isPaymentModalOpen}
        onClosePaymentModal={() => setIsPaymentModalOpen(false)}
        paymentType={paymentType}
        setPaymentType={setPaymentType}
        selectedStudioIdToPay={selectedStudioIdToPay}
        setSelectedStudioIdToPay={setSelectedStudioIdToPay}
        selectedEditorIdToPay={selectedEditorIdToPay}
        setSelectedEditorIdToPay={setSelectedEditorIdToPay}
        selectedProjectIdToPay={selectedProjectIdToPay}
        setSelectedProjectIdToPay={setSelectedProjectIdToPay}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentDate={paymentDate}
        setPaymentDate={setPaymentDate}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentNotes={paymentNotes}
        setPaymentNotes={setPaymentNotes}
        isSubmittingPayment={isSubmittingPayment}
        paymentSuccess={paymentSuccess}
        paymentError={paymentError}
        onSubmitPayment={handleSubmitPayment}
        studios={studios}
        editors={editors}
        projects={projects}
        payments={payments}
        selectedInspectItem={selectedInspectItem}
        onCloseInspectModal={() => setSelectedInspectItem(null)}
        onNavigateTab={onNavigateTab}
      />

    </div>
  );
}
