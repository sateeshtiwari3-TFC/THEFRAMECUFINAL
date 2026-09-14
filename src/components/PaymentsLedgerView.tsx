import React, { useState, useMemo } from 'react';
import { 
  IndianRupee, 
  Plus, 
  Download, 
  Building2, 
  Laptop, 
  Wallet,
  ShieldCheck,
  BarChart3,
  List,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PaymentHistory, Project, Studio, Editor, Expense, UserProfile } from '../types';
import ProjectProfitMarginD3Chart from './ProjectProfitMarginD3Chart';

// Modular Sub-Components
import LedgerKpiCards from './ledger/LedgerKpiCards';
import LedgerOutstandingBreakdown from './ledger/LedgerOutstandingBreakdown';
import LedgerMasterTable, { getPaymentOrProjectOverdueInfo } from './ledger/LedgerMasterTable';
import LedgerStudiosTab from './ledger/LedgerStudiosTab';
import LedgerEditorsTab from './ledger/LedgerEditorsTab';
import LedgerExpensesTab from './ledger/LedgerExpensesTab';
import LedgerAuditUtility, { AuditReportItem, AuditReport } from './ledger/LedgerAuditUtility';
import EditorLedgerView from './ledger/EditorLedgerView';

// Modals
import PaymentRecordModal from './ledger/PaymentRecordModal';
import PaymentReceiptModal from './ledger/PaymentReceiptModal';
import ExpenseRecordModal from './ledger/ExpenseRecordModal';
import DeleteConfirmationModal from './ledger/DeleteConfirmationModal';
import ClearAllPaymentsModal from './ledger/ClearAllPaymentsModal';

interface PaymentsLedgerViewProps {
  payments: PaymentHistory[];
  projects: Project[];
  studios: Studio[];
  editors: Editor[];
  expenses?: Expense[];
  userRole?: string;
  currentUser?: UserProfile | null;
  onLogPayment: (payment: Omit<PaymentHistory, 'id' | 'createdAt'>) => Promise<void>;
  onUpdatePayment: (id: string, updates: Partial<PaymentHistory>) => Promise<void>;
  onDeletePayment: (id: string) => Promise<void>;
  onClearAllPayments?: () => Promise<void>;
  onUpdateProject?: (id: string, updates: Partial<Project>) => Promise<void>;
  onAddExpense?: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateExpense?: (id: string, updates: Partial<Expense>) => Promise<void>;
  onDeleteExpense?: (id: string) => Promise<void>;
}

export default function PaymentsLedgerView({
  payments = [],
  projects = [],
  studios = [],
  editors = [],
  expenses = [],
  userRole = 'admin',
  currentUser = null,
  onLogPayment,
  onUpdatePayment,
  onDeletePayment,
  onClearAllPayments,
  onUpdateProject,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense
}: PaymentsLedgerViewProps) {
  // Main Navigation Sub-Tab State
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'studios' | 'editors' | 'analytics' | 'expenses' | 'audit'>('ledger');

  // Modal Visibility States
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentHistory | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<PaymentHistory | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Form Initial Pre-fill State
  const [recordModalType, setRecordModalType] = useState<'studio' | 'editor'>('studio');
  const [recordModalProjectId, setRecordModalProjectId] = useState<string>('');
  const [recordModalStudioId, setRecordModalStudioId] = useState<string>('');
  const [recordModalEditorId, setRecordModalEditorId] = useState<string>('');

  // Audit State
  const [isReconciling, setIsReconciling] = useState(false);
  const [auditToast, setAuditToast] = useState('');
  const [auditError, setAuditError] = useState('');

  // Open modal handlers
  const handleOpenRecordModal = (
    type: 'studio' | 'editor' = 'studio', 
    defaultProjectId?: string, 
    defaultStudioId?: string, 
    defaultEditorId?: string
  ) => {
    setEditingPayment(null);
    setRecordModalType(type);
    setRecordModalProjectId(defaultProjectId || '');
    setRecordModalStudioId(defaultStudioId || '');
    setRecordModalEditorId(defaultEditorId || '');
    setIsRecordModalOpen(true);
  };

  const handleOpenEditModal = (pay: PaymentHistory) => {
    setEditingPayment(pay);
    setIsRecordModalOpen(true);
  };

  // Financial Metrics
  const metrics = useMemo(() => {
    let totalReceived = 0;
    let totalPaidOut = 0;

    payments.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (p.entityType === 'studio') {
        totalReceived += amt;
      } else {
        totalPaidOut += amt;
      }
    });

    // Add manual office expenses to total paid out
    expenses.forEach(e => {
      totalPaidOut += Number(e.amount) || 0;
    });

    const netBalance = totalReceived - totalPaidOut;

    // Gross Portfolio Contract Value
    const totalProjectContractValue = projects.reduce((sum, p) => sum + (Number(p.projectAmount) || 0), 0);

    // Total Remaining Balance Outstanding across all projects
    const totalOutstandingBalance = projects.reduce((sum, p) => {
      const pPayments = payments.filter(pay => pay.projectId === p.id && pay.entityType === 'studio');
      const loggedReceived = pPayments.reduce((s, pay) => s + (Number(pay.amount) || 0), 0);
      const totalReceivedVal = pPayments.length > 0 ? loggedReceived : (Number(p.advancePayment) || 0);
      const rem = Math.max(0, (Number(p.projectAmount) || 0) - totalReceivedVal);
      return sum + rem;
    }, 0);

    // Total Editor Fees Allocated across all projects
    const totalEditorFeesAllocated = projects.reduce((sum, p) => {
      if (p.isSplitProject) {
        return sum + (Number(p.firstEditorShare) || 0) + (Number(p.secondEditorShare) || 0);
      }
      return sum + (Number(p.editorPayment) || 0);
    }, 0);

    // Total Editor Payouts Made via Payments Ledger
    const totalEditorPayouts = payments
      .filter(p => p.entityType === 'editor')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const pendingEditorPayoutBalance = Math.max(0, totalEditorFeesAllocated - totalEditorPayouts);

    const collectedPct = totalProjectContractValue > 0 
      ? Math.round((totalReceived / totalProjectContractValue) * 100) 
      : 0;

    // Overdue accounts calculation
    let overdueCount = 0;
    let totalOverdueAmount = 0;
    projects.forEach(p => {
      const pPayments = payments.filter(pay => pay.projectId === p.id && pay.entityType === 'studio');
      const loggedReceived = pPayments.reduce((s, pay) => s + (Number(pay.amount) || 0), 0);
      const totalReceivedVal = pPayments.length > 0 ? loggedReceived : (Number(p.advancePayment) || 0);
      const rem = Math.max(0, (Number(p.projectAmount) || 0) - totalReceivedVal);
      if (rem > 0) {
        const overdueInfo = getPaymentOrProjectOverdueInfo(p);
        if (overdueInfo.isOverdue) {
          overdueCount++;
          totalOverdueAmount += rem;
        }
      }
    });

    return {
      totalReceived,
      totalPaidOut,
      netBalance,
      totalProjectContractValue,
      totalOutstandingBalance,
      totalEditorFeesAllocated,
      pendingEditorPayoutBalance,
      collectedPct,
      count: payments.length,
      overdueCount,
      totalOverdueAmount
    };
  }, [payments, expenses, projects]);

  // Automated Audit Report Engine
  const auditReport: AuditReport = useMemo(() => {
    let discrepancyCount = 0;
    let totalDiscrepancyAmount = 0;

    const auditedProjects: AuditReportItem[] = projects.map(proj => {
      const projPayments = payments.filter(
        p => p.projectId === proj.id && p.entityType === 'studio'
      );
      const totalLoggedPayments = projPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const contractAmount = Number(proj.projectAmount) || 0;
      const storedAdvance = Number(proj.advancePayment) || 0;
      const storedRemaining = proj.remainingBalance !== undefined 
        ? Number(proj.remainingBalance) 
        : Math.max(0, contractAmount - storedAdvance);

      const expectedAdvance = projPayments.length > 0 ? totalLoggedPayments : storedAdvance;
      const expectedRemaining = Math.max(0, contractAmount - expectedAdvance);

      const issues: string[] = [];

      // Issue A: Advance Mismatch
      if (projPayments.length > 0 && storedAdvance !== totalLoggedPayments) {
        issues.push(`Advance Mismatch: Stored advance (₹${storedAdvance.toLocaleString('en-IN')}) != Ledger logged payments (₹${totalLoggedPayments.toLocaleString('en-IN')})`);
      }

      // Issue B: Stale / Mismatched Remaining Balance
      if (storedRemaining !== expectedRemaining) {
        issues.push(`Remaining Balance Out of Sync: Stored remaining balance (₹${storedRemaining.toLocaleString('en-IN')}) != Expected calculated balance (₹${expectedRemaining.toLocaleString('en-IN')})`);
      }

      // Issue C: Missing Payment History Logs
      if (storedAdvance > 0 && projPayments.length === 0) {
        issues.push(`Unlogged Advance: Project records ₹${storedAdvance.toLocaleString('en-IN')} advance, but 0 transaction entries exist in Payment History ledger.`);
      }

      // Issue D: Overpayment
      if (totalLoggedPayments > contractAmount && contractAmount > 0) {
        issues.push(`Overpayment Warning: Total logged receipts (₹${totalLoggedPayments.toLocaleString('en-IN')}) exceed agreed contract amount (₹${contractAmount.toLocaleString('en-IN')}).`);
      }

      const hasDiscrepancy = issues.length > 0;
      if (hasDiscrepancy) {
        discrepancyCount++;
        totalDiscrepancyAmount += Math.abs(storedRemaining - expectedRemaining) + Math.abs(storedAdvance - expectedAdvance);
      }

      return {
        project: proj,
        contractAmount,
        storedAdvance,
        storedRemaining,
        totalLoggedPayments,
        expectedAdvance,
        expectedRemaining,
        paymentLogsCount: projPayments.length,
        hasDiscrepancy,
        issues
      };
    });

    return {
      auditedProjects,
      discrepancyCount,
      totalDiscrepancyAmount,
      totalProjectsCount: projects.length,
      cleanProjectsCount: projects.length - discrepancyCount
    };
  }, [projects, payments]);

  // Reconciliation Handlers
  const handleReconcileProject = async (auditItem: AuditReportItem) => {
    setIsReconciling(true);
    setAuditError('');
    try {
      const { project, totalLoggedPayments, storedAdvance, contractAmount, paymentLogsCount } = auditItem;

      let targetAdvance = totalLoggedPayments;

      // If no payment logs exist but storedAdvance > 0, create a backfilled payment history transaction
      if (paymentLogsCount === 0 && storedAdvance > 0) {
        await onLogPayment({
          entityId: project.studioId || '',
          entityType: 'studio',
          projectId: project.id,
          projectCoupleName: project.coupleName,
          amount: storedAdvance,
          date: project.shootDate || new Date().toISOString().split('T')[0],
          paymentMethod: 'Auto-Reconciled / Initial Advance',
          notes: 'Auto-backfilled during Audit Reconciliation',
          receivedFrom: project.studioName || 'Studio Partner'
        });
        targetAdvance = storedAdvance;
      }

      const targetRemaining = Math.max(0, contractAmount - targetAdvance);

      if (onUpdateProject) {
        await onUpdateProject(project.id, {
          advancePayment: targetAdvance,
          remainingBalance: targetRemaining
        });
      }

      setAuditToast(`Successfully reconciled "${project.coupleName}"! Advance set to ₹${targetAdvance.toLocaleString('en-IN')}, Remaining set to ₹${targetRemaining.toLocaleString('en-IN')}.`);
      setTimeout(() => setAuditToast(''), 4000);
    } catch (err: any) {
      console.error("Reconciliation error:", err);
      setAuditError("Failed to reconcile project: " + (err?.message || "Unknown error"));
    } finally {
      setIsReconciling(false);
    }
  };

  const handleReconcileAll = async () => {
    const discrepancies = auditReport.auditedProjects.filter(item => item.hasDiscrepancy);
    if (discrepancies.length === 0) return;

    setIsReconciling(true);
    setAuditError('');

    try {
      let count = 0;
      for (const item of discrepancies) {
        await handleReconcileProject(item);
        count++;
      }
      setAuditToast(`Batch Reconciliation Complete! ${count} project(s) updated and fully synchronized.`);
      setTimeout(() => setAuditToast(''), 5000);
    } catch (err: any) {
      console.error("Batch reconciliation error:", err);
      setAuditError("Batch reconciliation encountered an issue: " + (err?.message || ""));
    } finally {
      setIsReconciling(false);
    }
  };

  // Delete Handlers
  const handleDeletePaymentConfirm = async () => {
    if (!deletingPaymentId) return;
    try {
      const targetPay = payments.find(p => p.id === deletingPaymentId);
      await onDeletePayment(deletingPaymentId);

      if (targetPay && targetPay.projectId && targetPay.projectId !== 'general_ledger' && targetPay.entityType === 'studio' && onUpdateProject) {
        const remainingPayments = payments.filter(p => p.id !== deletingPaymentId && p.projectId === targetPay.projectId && p.entityType === 'studio');
        const proj = projects.find(p => p.id === targetPay.projectId);
        if (proj) {
          const newAdvance = remainingPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          const newRemaining = Math.max(0, (proj.projectAmount || 0) - newAdvance);
          await onUpdateProject(proj.id, {
            advancePayment: newAdvance,
            remainingBalance: newRemaining
          });
        }
      }
      setDeletingPaymentId(null);
    } catch (err: any) {
      alert('Failed to delete payment: ' + (err?.message || String(err)));
    }
  };

  const handleDeleteExpenseConfirm = async () => {
    if (!deletingExpenseId || !onDeleteExpense) return;
    try {
      await onDeleteExpense(deletingExpenseId);
      setDeletingExpenseId(null);
    } catch (err: any) {
      alert('Failed to delete expense: ' + (err?.message || String(err)));
    }
  };

  const handleClearAllPaymentsConfirm = async () => {
    if (!onClearAllPayments) return;
    setIsClearingAll(true);
    try {
      await onClearAllPayments();
      setShowClearAllModal(false);
    } catch (err: any) {
      alert('Failed to clear payments: ' + (err?.message || String(err)));
    } finally {
      setIsClearingAll(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Type', 'Entity Name', 'Project', 'Amount (INR)', 'Date', 'Payment Method', 'Payer/Ref', 'Notes'];
    const rows = payments.map(p => {
      const isReceived = p.entityType === 'studio';
      const entity = isReceived 
        ? (studios.find(s => s.id === p.entityId)?.name || 'Studio Partner')
        : (editors.find(e => e.id === p.entityId)?.name || 'Video Editor');

      return [
        p.id,
        isReceived ? 'Received (Studio)' : 'Paid Out (Editor)',
        `"${entity}"`,
        `"${p.projectCoupleName || 'Wedding Film'}"`,
        p.amount,
        p.date,
        p.paymentMethod || 'UPI',
        `"${p.receivedFrom || '-'}"`,
        `"${(p.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `framecut_payment_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If logged in as an EDITOR, render the specialized, redesigned Editor Ledger View
  if (userRole === 'editor') {
    const matchedEditor: Editor | null = editors.find(e => 
      (currentUser?.editorId && e.id === currentUser.editorId) ||
      (currentUser?.email && e.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.name && e.name?.toLowerCase() === currentUser.name.toLowerCase())
    ) || (currentUser?.editorId ? {
      id: currentUser.editorId,
      name: currentUser.name || 'Editor',
      email: currentUser.email || '',
      phone: '',
      joinedDate: new Date().toISOString().slice(0, 10),
      rating: 5.0,
      specialties: ['Cinematic Wedding Highlights']
    } : null);

    const safeCurrentUser: UserProfile = currentUser || {
      uid: matchedEditor?.id || 'editor-current',
      name: matchedEditor?.name || 'Video Editor',
      email: matchedEditor?.email || '',
      role: 'editor',
      editorId: matchedEditor?.id || 'editor-current',
      createdAt: new Date().toISOString()
    };

    return (
      <div className="space-y-6">
        <EditorLedgerView
          currentUser={safeCurrentUser}
          currentEditor={matchedEditor}
          projects={projects}
          payments={payments}
          studios={studios}
          onViewReceipt={(p) => setViewingReceipt(p)}
        />

        {/* View Receipt Modal for Editor */}
        <PaymentReceiptModal
          receipt={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
          projects={projects}
          studios={studios}
          editors={editors}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-charcoal-900 via-charcoal-900/90 to-luxury-green-950 p-6 rounded-3xl border border-luxury-green-800/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-600/10 border border-gold-500/30 flex items-center justify-center text-gold-400 shadow-inner">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2">
                Payment History & Ledger System
                <span className="text-[10px] font-mono bg-gold-500/10 text-gold-400 border border-gold-500/20 px-2 py-0.5 rounded-full font-normal">
                  Live Firestore Sync
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Complete record of all incoming studio collections, advance receipts, and editor payout disbursements.
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-charcoal-800 hover:bg-charcoal-700 text-gray-200 border border-white/10 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all shadow"
            title="Download CSV report of payment transactions"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          {onClearAllPayments && payments.length > 0 && userRole === 'admin' && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all"
              title="Clear all transactions (Admin only)"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Clear History</span>
            </button>
          )}

          <button
            onClick={() => handleOpenRecordModal('studio')}
            className="px-5 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-charcoal-950 font-bold text-xs rounded-2xl flex items-center space-x-2 shadow-lg cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 text-charcoal-950" />
            <span>+ Record New Payment</span>
          </button>
        </div>
      </div>

      {/* Interactive KPI Summary Cards */}
      <LedgerKpiCards metrics={metrics} />

      {/* Uncollected Balance Breakdown Widget (Collapsible) */}
      <LedgerOutstandingBreakdown 
        projects={projects}
        studios={studios}
        payments={payments}
        totalOutstandingBalance={metrics.totalOutstandingBalance}
      />

      {/* Sub-Tabs Navigation Bar */}
      <div className="flex items-center space-x-2 border-b border-white/10 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeSubTab === 'ledger'
              ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <List className="w-4 h-4" />
          <span>Transactions Ledger ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('studios')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeSubTab === 'studios'
              ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Studio Partner Dues ({studios.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('editors')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeSubTab === 'editors'
              ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>Editor Payouts ({editors.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeSubTab === 'analytics'
              ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Profit & Margin Analytics</span>
        </button>

        <button
          onClick={() => setActiveSubTab('expenses')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeSubTab === 'expenses'
              ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Operating Expenses ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer shrink-0 relative ${
            activeSubTab === 'audit'
              ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 shadow-md'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Audit & Reconciliation</span>
          {auditReport.discrepancyCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* SUB-TAB CONTENTS (Cleanly switchable, zero duplicate master tables below other tabs!) */}
      <div>
        {activeSubTab === 'ledger' && (
          <LedgerMasterTable
            payments={payments}
            projects={projects}
            studios={studios}
            editors={editors}
            onOpenRecordModal={handleOpenRecordModal}
            onOpenEditModal={handleOpenEditModal}
            onViewReceipt={(p) => setViewingReceipt(p)}
            onDeletePayment={(id) => setDeletingPaymentId(id)}
            onExportCSV={handleExportCSV}
          />
        )}

        {activeSubTab === 'studios' && (
          <LedgerStudiosTab
            studios={studios}
            projects={projects}
            payments={payments}
            onOpenRecordModal={handleOpenRecordModal}
          />
        )}

        {activeSubTab === 'editors' && (
          <LedgerEditorsTab
            editors={editors}
            projects={projects}
            payments={payments}
            onOpenRecordModal={handleOpenRecordModal}
          />
        )}

        {activeSubTab === 'analytics' && (
          <div className="space-y-6">
            <ProjectProfitMarginD3Chart projects={projects} expenses={expenses} />
          </div>
        )}

        {activeSubTab === 'expenses' && (
          <LedgerExpensesTab
            expenses={expenses}
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
            onDeleteExpense={(id) => setDeletingExpenseId(id)}
          />
        )}

        {activeSubTab === 'audit' && (
          <LedgerAuditUtility
            auditReport={auditReport}
            isReconciling={isReconciling}
            auditToast={auditToast}
            auditError={auditError}
            onReconcileProject={handleReconcileProject}
            onReconcileAll={handleReconcileAll}
          />
        )}
      </div>

      {/* MODALS */}
      {/* 1. Record & Edit Payment Modal */}
      <PaymentRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setEditingPayment(null);
        }}
        editingPayment={editingPayment}
        initialType={recordModalType}
        initialProjectId={recordModalProjectId}
        initialStudioId={recordModalStudioId}
        initialEditorId={recordModalEditorId}
        studios={studios}
        editors={editors}
        projects={projects}
        payments={payments}
        onLogPayment={onLogPayment}
        onUpdatePayment={onUpdatePayment}
        onUpdateProject={onUpdateProject}
      />

      {/* 2. Official Payment Receipt Voucher Modal */}
      <PaymentReceiptModal
        receipt={viewingReceipt}
        onClose={() => setViewingReceipt(null)}
        studios={studios}
        editors={editors}
        projects={projects}
      />

      {/* 3. Log Studio Expense Modal (Fixed and fully working!) */}
      <ExpenseRecordModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onAddExpense={onAddExpense}
        expenses={expenses}
      />

      {/* 4. Delete Payment Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deletingPaymentId)}
        onClose={() => setDeletingPaymentId(null)}
        onConfirm={handleDeletePaymentConfirm}
        title="Delete Payment Transaction"
        description="Are you sure you want to remove this payment entry from the ledger? If linked to a project, the stored project advance will be automatically updated."
      />

      {/* 5. Delete Expense Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={Boolean(deletingExpenseId)}
        onClose={() => setDeletingExpenseId(null)}
        onConfirm={handleDeleteExpenseConfirm}
        title="Delete Expense Record"
        description="Are you sure you want to permanently delete this operating expense entry from your accounts?"
      />

      {/* 6. Clear All History Confirmation Modal */}
      <ClearAllPaymentsModal
        isOpen={showClearAllModal}
        onClose={() => setShowClearAllModal(false)}
        onConfirm={handleClearAllPaymentsConfirm}
        isClearing={isClearingAll}
        paymentsCount={payments.length}
      />
    </div>
  );
}
