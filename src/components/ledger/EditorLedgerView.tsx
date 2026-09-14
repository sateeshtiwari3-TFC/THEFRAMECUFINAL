import React, { useState, useMemo } from 'react';
import { 
  Laptop, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Receipt, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  FileText, 
  TrendingUp, 
  Calendar, 
  Film, 
  CheckCheck,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  FolderKanban,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, PaymentHistory, Editor, Studio, UserProfile } from '../../types';
import EditorPdfExportModal from '../EditorPdfExportModal';

interface EditorLedgerViewProps {
  currentUser: UserProfile;
  currentEditor: Editor | null;
  projects: Project[];
  payments: PaymentHistory[];
  studios: Studio[];
  onViewReceipt: (payment: PaymentHistory) => void;
}

export default function EditorLedgerView({
  currentUser,
  currentEditor,
  projects,
  payments,
  studios,
  onViewReceipt
}: EditorLedgerViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'my_projects' | 'payout_history' | 'settlement_summary'>('my_projects');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partial' | 'settled'>('all');
  const [selectedProjectForInvoice, setSelectedProjectForInvoice] = useState<string | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Identify the target editor:
  // 1. By currentUser.editorId
  // 2. Or matching currentEditor
  // 3. Or by user email / name matching projects' assignedEditor
  const editorId = currentUser.editorId || currentEditor?.id || '';
  const editorName = currentEditor?.name || currentUser.name || 'Video Editor';
  const editorEmail = currentEditor?.email || currentUser.email || '';

  // Filter projects assigned to this specific editor (as primary or second editor)
  const myProjects = useMemo(() => {
    return projects.filter(p => {
      if (editorId && (p.assignedEditorId === editorId || p.secondEditorId === editorId)) {
        return true;
      }
      // Fallback matching by name if IDs aren't mapped
      const nameClean = editorName.toLowerCase().trim();
      if (p.assignedEditorName && p.assignedEditorName.toLowerCase().trim() === nameClean) return true;
      if (p.secondEditorName && p.secondEditorName.toLowerCase().trim() === nameClean) return true;
      return false;
    });
  }, [projects, editorId, editorName]);

  // Filter payments disbursed to this editor
  const myPayments = useMemo(() => {
    return payments.filter(p => {
      if (p.entityType !== 'editor') return false;
      if (editorId && p.entityId === editorId) return true;
      // Match by assigned project
      const matchedProj = myProjects.some(proj => proj.id === p.projectId);
      return matchedProj;
    }).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [payments, editorId, myProjects]);

  // Compute stats per project for this editor
  const projectLedgerItems = useMemo(() => {
    return myProjects.map(p => {
      // Calculate editor's agreed fee for this project
      let agreedFee = 0;
      let isSecondary = false;
      if (p.isSplitProject) {
        if (p.assignedEditorId === editorId || p.assignedEditorName?.toLowerCase() === editorName.toLowerCase()) {
          agreedFee = Number(p.firstEditorShare) || 0;
        } else {
          agreedFee = Number(p.secondEditorShare) || 0;
          isSecondary = true;
        }
      } else {
        agreedFee = Number(p.editorPayment) || 0;
      }

      // Payments specifically recorded for this project and this editor
      const projectDisbursements = myPayments.filter(pay => pay.projectId === p.id);
      const totalPaidOut = projectDisbursements.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
      const balanceDue = Math.max(0, agreedFee - totalPaidOut);
      const isSettled = agreedFee > 0 ? balanceDue <= 0 : totalPaidOut > 0;
      const isPartiallyPaid = totalPaidOut > 0 && balanceDue > 0;
      const settlementPct = agreedFee > 0 ? Math.min(100, Math.round((totalPaidOut / agreedFee) * 100)) : 100;

      // Find studio
      const studio = studios.find(s => s.id === p.studioId);

      return {
        project: p,
        studio,
        agreedFee,
        isSecondary,
        totalPaidOut,
        balanceDue,
        isSettled,
        isPartiallyPaid,
        settlementPct,
        disbursements: projectDisbursements
      };
    });
  }, [myProjects, myPayments, editorId, editorName, studios]);

  // Overall Financial KPIs for the Editor
  const metrics = useMemo(() => {
    const totalAgreedFees = projectLedgerItems.reduce((sum, item) => sum + item.agreedFee, 0);
    const totalReceived = myPayments.reduce((sum, pay) => sum + (Number(pay.amount) || 0), 0);
    const totalPendingPayout = Math.max(0, totalAgreedFees - totalReceived);
    const completedProjectsCount = projectLedgerItems.filter(item => item.project.status === 'delivered' || item.project.status === 'closed').length;
    const activeProjectsCount = projectLedgerItems.length - completedProjectsCount;
    const settledProjectsCount = projectLedgerItems.filter(item => item.isSettled && item.agreedFee > 0).length;
    const payoutRatePct = totalAgreedFees > 0 ? Math.round((totalReceived / totalAgreedFees) * 100) : 100;

    return {
      totalAgreedFees,
      totalReceived,
      totalPendingPayout,
      completedProjectsCount,
      activeProjectsCount,
      settledProjectsCount,
      payoutRatePct,
      totalProjects: projectLedgerItems.length
    };
  }, [projectLedgerItems, myPayments]);

  // Filtered project ledger items based on search and status
  const filteredProjectItems = useMemo(() => {
    return projectLedgerItems.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const couple = item.project.coupleName?.toLowerCase() || '';
        const id = item.project.id?.toLowerCase() || '';
        const studio = item.project.studioName?.toLowerCase() || '';
        const event = item.project.eventType?.toLowerCase() || '';
        if (!couple.includes(q) && !id.includes(q) && !studio.includes(q) && !event.includes(q)) {
          return false;
        }
      }

      // Status
      if (statusFilter === 'unpaid') {
        return item.totalPaidOut === 0 && item.agreedFee > 0;
      }
      if (statusFilter === 'partial') {
        return item.isPartiallyPaid;
      }
      if (statusFilter === 'settled') {
        return item.isSettled;
      }

      return true;
    });
  }, [projectLedgerItems, searchQuery, statusFilter]);

  // Filtered raw payments for "payout_history" tab
  const filteredPaymentsList = useMemo(() => {
    if (!searchQuery.trim()) return myPayments;
    const q = searchQuery.toLowerCase().trim();
    return myPayments.filter(p => 
      p.projectCoupleName?.toLowerCase().includes(q) ||
      p.paymentMethod?.toLowerCase().includes(q) ||
      p.notes?.toLowerCase().includes(q) ||
      p.amount?.toString().includes(q)
    );
  }, [myPayments, searchQuery]);

  // Export CSV of Editor Payouts
  const handleExportCSV = () => {
    if (projectLedgerItems.length === 0) return;
    const headers = ['Project ID', 'Couple Name', 'Studio', 'Event Type', 'Agreed Editor Fee', 'Total Paid (Disbursed)', 'Balance Due (Pending)', 'Status'];
    const rows = projectLedgerItems.map(item => [
      `"${item.project.id}"`,
      `"${item.project.coupleName}"`,
      `"${item.project.studioName || ''}"`,
      `"${item.project.eventType || ''}"`,
      item.agreedFee,
      item.totalPaidOut,
      item.balanceDue,
      item.isSettled ? '100% Settled' : item.isPartiallyPaid ? 'Partially Paid' : 'Unpaid'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Editor_Ledger_${editorName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInvoiceModal = (projId?: string) => {
    setSelectedProjectForInvoice(projId || null);
    setIsInvoiceModalOpen(true);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner Header tailored for Video Editors */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-charcoal-900 via-charcoal-900/95 to-blue-950/60 p-6 rounded-3xl border border-blue-500/20 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
            <Laptop className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5 flex-wrap">
              <h1 className="text-2xl font-bold font-display text-white tracking-tight">
                My Earnings & Payout Ledger
              </h1>
              <span className="text-[11px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold">
                {editorName}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Personal ledger tracking all your assigned wedding edits, agreed fees, disbursements received, and pending balances.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-charcoal-800 hover:bg-charcoal-700 text-gray-200 border border-white/10 rounded-2xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-all shadow"
            title="Download personal earnings CSV statement"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Statement</span>
          </button>

          <button
            onClick={() => handleOpenInvoiceModal()}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs rounded-2xl flex items-center space-x-2 shadow-lg cursor-pointer transition-all"
          >
            <Receipt className="w-4 h-4" />
            <span>Generate Work Invoice / Bill</span>
          </button>
        </div>
      </div>

      {/* Editor-Specific Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL AGREED FEES EARNED */}
        <div className="p-5 rounded-3xl bg-charcoal-900/90 border border-blue-500/20 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-blue-400 font-bold tracking-wider flex items-center gap-1.5">
              <Film className="w-4 h-4" /> Total Agreed Fees
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-sans text-white tracking-tight">
              ₹{metrics.totalAgreedFees.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-gray-400 mt-1 font-mono flex items-center justify-between">
              <span>{metrics.totalProjects} Assigned Project{metrics.totalProjects !== 1 ? 's' : ''}</span>
              <span className="text-blue-300 font-bold">{metrics.completedProjectsCount} Delivered</span>
            </p>
          </div>
        </div>

        {/* Card 2: TOTAL PAYOUTS RECEIVED */}
        <div className="p-5 rounded-3xl bg-charcoal-900/90 border border-emerald-500/30 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-emerald-400 font-bold tracking-wider flex items-center gap-1.5">
              <ArrowDownLeft className="w-4 h-4" /> Received in Bank / UPI
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold font-sans text-emerald-400 tracking-tight">
              ₹{metrics.totalReceived.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-gray-400 mt-1 font-mono flex items-center justify-between">
              <span>{myPayments.length} Payout Transactions</span>
              <span className="text-emerald-400 font-bold">{metrics.payoutRatePct}% Cleared</span>
            </p>
          </div>
        </div>

        {/* Card 3: PENDING BALANCE PAYABLE TO EDITOR */}
        <div className={`p-5 rounded-3xl border shadow-xl relative overflow-hidden group ${
          metrics.totalPendingPayout > 0 
            ? 'bg-gradient-to-br from-charcoal-900 via-charcoal-900 to-amber-950/40 border-amber-500/40' 
            : 'bg-charcoal-900/90 border-emerald-500/20'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-mono uppercase font-bold tracking-wider flex items-center gap-1.5 ${
              metrics.totalPendingPayout > 0 ? 'text-amber-300' : 'text-emerald-400'
            }`}>
              <Clock className="w-4 h-4" /> Balance Pending
            </span>
            <div className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold ${
              metrics.totalPendingPayout > 0 
                ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' 
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className={`text-2xl font-bold font-sans tracking-tight ${
              metrics.totalPendingPayout > 0 ? 'text-amber-300' : 'text-emerald-400'
            }`}>
              ₹{metrics.totalPendingPayout.toLocaleString('en-IN')}
            </span>
            <p className="text-[11px] text-gray-400 mt-1 font-mono">
              {metrics.totalPendingPayout > 0 
                ? 'Awaiting studio disbursement' 
                : 'All fees fully settled!'}
            </p>
          </div>
        </div>

        {/* Card 4: SETTLEMENT COMPLETION RATIO */}
        <div className="p-5 rounded-3xl bg-charcoal-900/90 border border-purple-500/20 shadow-xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-purple-400 font-bold tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Settlement Status
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-sans text-white tracking-tight">
                {metrics.settledProjectsCount} / {metrics.totalProjects}
              </span>
              <span className="text-xs font-mono font-bold text-purple-300">
                {metrics.payoutRatePct}% Settled
              </span>
            </div>
            <div className="w-full bg-charcoal-950 h-2 rounded-full overflow-hidden border border-white/10">
              <div 
                className="bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, metrics.payoutRatePct)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Editor Sub-Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-3">
        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('my_projects')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
              activeSubTab === 'my_projects'
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>My Projects & Fees ({projectLedgerItems.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('payout_history')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
              activeSubTab === 'payout_history'
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <IndianRupee className="w-4 h-4" />
            <span>Payout History Logs ({myPayments.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('settlement_summary')}
            className={`px-4 py-2 rounded-2xl font-bold text-xs transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
              activeSubTab === 'settlement_summary'
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Studio Billing & Invoices</span>
          </button>
        </div>

        {/* Quick Search & Status Filter */}
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search project or studio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-charcoal-950 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 w-48 sm:w-56"
            />
          </div>

          {activeSubTab === 'my_projects' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              aria-label="Filter projects by payment status"
              className="bg-charcoal-950 border border-white/10 text-xs text-gray-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500/50 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="unpaid">Unpaid (0 Received)</option>
              <option value="partial">Partially Paid</option>
              <option value="settled">100% Settled</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB CONTENT 1: MY PROJECTS & FEES TABLE */}
      {activeSubTab === 'my_projects' && (
        <div className="space-y-4">
          {filteredProjectItems.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredProjectItems.map((item) => {
                const isExpanded = expandedProjectId === item.project.id;
                return (
                  <motion.div
                    key={item.project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-3xl border transition-all overflow-hidden shadow-xl ${
                      item.balanceDue > 0
                        ? 'bg-charcoal-900/90 border-blue-500/20 hover:border-blue-500/40'
                        : 'bg-charcoal-900/90 border-white/10'
                    }`}
                  >
                    {/* Project Header Row */}
                    <div 
                      onClick={() => setExpandedProjectId(isExpanded ? null : item.project.id)}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none bg-gradient-to-r from-charcoal-950 via-charcoal-900 to-charcoal-950 hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center space-x-3.5">
                        <button
                          type="button"
                          className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors shrink-0"
                        >
                          <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        <div>
                          <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                            <h3 className="text-base font-bold text-white font-sans">
                              {item.project.coupleName}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 font-mono text-[10px] border border-blue-500/20 font-semibold">
                              {item.project.id}
                            </span>
                            {item.isSecondary && (
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 font-mono text-[9px] border border-purple-500/20 font-bold">
                                2nd Editor Share
                              </span>
                            )}
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              item.isSettled
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : item.isPartiallyPaid
                                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                                  : 'bg-blue-500/10 text-blue-300 border border-blue-500/30'
                            }`}>
                              {item.isSettled ? '100% Settled' : item.isPartiallyPaid ? 'Partially Paid' : 'Awaiting Payout'}
                            </span>
                          </div>

                          <p className="text-xs text-gray-400 font-mono mt-1 flex items-center gap-2 flex-wrap">
                            <span>Studio: <strong className="text-gray-300 font-normal">{item.project.studioName || 'Direct'}</strong></span>
                            <span>•</span>
                            <span>Event: {item.project.eventType}</span>
                            <span>•</span>
                            <span>Shoot: {item.project.shootDate || 'N/A'}</span>
                            <span>•</span>
                            <span>Workflow: <span className="capitalize text-gray-300">{item.project.status.replace(/_/g, ' ')}</span></span>
                          </p>
                        </div>
                      </div>

                      {/* Financial Metrics in Header */}
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="px-3.5 py-2 rounded-2xl bg-charcoal-950 border border-white/10 font-mono text-xs">
                          <span className="text-[9px] uppercase text-gray-400 block font-semibold">My Agreed Fee</span>
                          <span className="font-bold text-blue-300">₹{item.agreedFee.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 font-mono text-xs">
                          <span className="text-[9px] uppercase text-emerald-400 block font-semibold">Paid to Me</span>
                          <span className="font-bold text-emerald-400">₹{item.totalPaidOut.toLocaleString('en-IN')}</span>
                        </div>

                        <div className={`px-3.5 py-2 rounded-2xl border font-mono text-xs ${
                          item.balanceDue > 0
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        }`}>
                          <span className="text-[9px] uppercase block font-semibold opacity-80">
                            {item.balanceDue > 0 ? 'Pending Balance' : 'Settlement'}
                          </span>
                          <span className="font-bold">
                            {item.balanceDue > 0 ? `₹${item.balanceDue.toLocaleString('en-IN')} Due` : 'Fully Paid'}
                          </span>
                        </div>

                        {/* Bill / Invoice Action Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInvoiceModal(item.project.id);
                          }}
                          className="px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow"
                          title="Generate official work bill for this film"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Generate Bill</span>
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-charcoal-950 h-1.5 border-b border-white/5">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, item.settlementPct)}%` }} 
                      />
                    </div>

                    {/* Collapsible Payment Records for this project */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-5 space-y-3 bg-charcoal-950/60"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
                              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" />
                              Disbursement History ({item.disbursements.length} logged payment{item.disbursements.length !== 1 ? 's' : ''})
                            </h4>

                            {/* WhatsApp Follow-up Reminder to Studio if balance due */}
                            {item.balanceDue > 0 && (
                              <button
                                onClick={() => {
                                  const phoneClean = (item.studio?.phone || item.project.clientPhone || '').replace(/[^0-9]/g, '');
                                  const msg = `Namaste ji,\n\nGreetings from ${editorName}! 🎬\n\nRegarding the video editing work for project: *${item.project.coupleName}* (${item.project.id}):\n- Agreed Editor Fee: ₹${item.agreedFee.toLocaleString('en-IN')}\n- Received Till Date: ₹${item.totalPaidOut.toLocaleString('en-IN')}\n- Pending Balance: ₹${item.balanceDue.toLocaleString('en-IN')}\n\nKindly process the pending balance disbursement at your earliest convenience.\n\nThank you! 🙏`;
                                  const targetPhone = phoneClean ? (phoneClean.length === 10 ? '91' + phoneClean : phoneClean) : '';
                                  window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow cursor-pointer transition-all"
                                title="Send WhatsApp payment reminder to studio"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>Remind Studio via WhatsApp</span>
                              </button>
                            )}
                          </div>

                          {item.disbursements.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs text-gray-300">
                                <thead>
                                  <tr className="border-b border-white/10 text-[10px] font-mono uppercase text-gray-400">
                                    <th className="pb-2">Date</th>
                                    <th className="pb-2">Payment Method</th>
                                    <th className="pb-2">Reference / Notes</th>
                                    <th className="pb-2 text-right">Disbursed Amount</th>
                                    <th className="pb-2 text-right">Receipt</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {item.disbursements.map(pay => (
                                    <tr key={pay.id} className="hover:bg-white/[0.02]">
                                      <td className="py-2.5 font-mono text-[11px] text-gray-300">{pay.date}</td>
                                      <td className="py-2.5">
                                        <span className="px-2 py-0.5 rounded bg-charcoal-900 border border-white/10 font-mono text-[10px] text-blue-300">
                                          {pay.paymentMethod || 'UPI / Bank'}
                                        </span>
                                      </td>
                                      <td className="py-2.5 text-gray-400 italic text-[11px] max-w-xs truncate">
                                        {pay.notes || 'Studio payout installment'}
                                      </td>
                                      <td className="py-2.5 text-right font-mono font-bold text-emerald-400 text-sm">
                                        + ₹{(pay.amount || 0).toLocaleString('en-IN')}
                                      </td>
                                      <td className="py-2.5 text-right">
                                        <button
                                          onClick={() => onViewReceipt(pay)}
                                          className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-300 transition-colors cursor-pointer"
                                          title="View Payment Receipt"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl bg-charcoal-900/50 border border-dashed border-white/10 text-center text-xs text-gray-500 font-mono">
                              No payment disbursements have been logged by the studio yet for this project.
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-charcoal-900/80 rounded-3xl border border-dashed border-white/10 p-6">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto mb-4">
                <FolderKanban className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">No Project Earnings Found</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                {searchQuery
                  ? 'No project assignments match your search term. Try resetting your query.'
                  : 'You do not have any projects assigned under your profile yet.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: COMPLETE PAYOUT TRANSACTION LOGS */}
      {activeSubTab === 'payout_history' && (
        <div className="p-6 rounded-3xl bg-charcoal-900/90 border border-blue-500/20 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-emerald-400" />
                All Payout Transactions Received
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Chronological ledger of every payout installment transferred to you by The Frame Cut Studio.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-charcoal-950 border border-white/10 text-xs font-mono text-gray-300">
              Total Received: <strong className="text-emerald-400">₹{metrics.totalReceived.toLocaleString('en-IN')}</strong>
            </span>
          </div>

          {filteredPaymentsList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-mono uppercase text-gray-400 tracking-wider">
                    <th className="pb-3 pl-2">Date</th>
                    <th className="pb-3">Project / Couple</th>
                    <th className="pb-3">Payment Method</th>
                    <th className="pb-3">Reference / Notes</th>
                    <th className="pb-3 text-right">Disbursed Amount (₹)</th>
                    <th className="pb-3 text-right pr-2">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredPaymentsList.map((pay) => (
                    <tr key={pay.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pl-2 font-mono text-[11px] text-gray-300">{pay.date}</td>
                      <td className="py-3">
                        <div className="font-semibold text-white">{pay.projectCoupleName || 'Studio Project'}</div>
                        <span className="text-[10px] font-mono text-gray-500">{pay.projectId}</span>
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-charcoal-950 border border-white/10 font-mono text-[10px] text-blue-300 font-medium">
                          {pay.paymentMethod || 'UPI / Transfer'}
                        </span>
                      </td>
                      <td className="py-3 text-gray-400 italic text-[11px] max-w-xs truncate" title={pay.notes || ''}>
                        {pay.notes || '-'}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-sm text-emerald-400">
                        + ₹{(pay.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <button
                          onClick={() => onViewReceipt(pay)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-300 transition-colors cursor-pointer"
                          title="View Payment Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-charcoal-950/60 border border-dashed border-white/10 text-center text-xs text-gray-500 font-mono">
              No payout transactions recorded in your ledger yet.
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 3: SETTLEMENT SUMMARY & INVOICING CARDS */}
      {activeSubTab === 'settlement_summary' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-charcoal-900/90 border border-blue-500/20 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-400" />
                  Editor Billing & Work Invoices
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Generate professional PDF invoices and statements with bank details, itemized film projects, and agreed fees.
                </p>
              </div>

              <button
                onClick={() => handleOpenInvoiceModal()}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow cursor-pointer transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Create Master Invoice PDF</span>
              </button>
            </div>

            {/* Breakdown by Studios */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {studios.map(studio => {
                const studioProjects = projectLedgerItems.filter(item => item.project.studioId === studio.id || item.project.studioName === studio.name);
                if (studioProjects.length === 0) return null;

                const totalStudioEarned = studioProjects.reduce((sum, item) => sum + item.agreedFee, 0);
                const totalStudioPaid = studioProjects.reduce((sum, item) => sum + item.totalPaidOut, 0);
                const studioPending = Math.max(0, totalStudioEarned - totalStudioPaid);

                return (
                  <div key={studio.id} className="p-4 rounded-2xl bg-charcoal-950 border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white text-sm">{studio.name}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                        studioPending > 0 ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {studioPending > 0 ? `₹${studioPending.toLocaleString('en-IN')} Due` : 'Settled'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono p-2.5 rounded-xl bg-charcoal-900/60 border border-white/5">
                      <div>
                        <span className="text-[8px] text-gray-500 uppercase block">Films</span>
                        <span className="text-xs font-bold text-white">{studioProjects.length}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-500 uppercase block">Earned</span>
                        <span className="text-xs font-bold text-blue-300">₹{totalStudioEarned.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-500 uppercase block">Received</span>
                        <span className="text-xs font-bold text-emerald-400">₹{totalStudioPaid.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenInvoiceModal()}
                      className="w-full py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Receipt className="w-3 h-3" />
                      <span>Generate Studio Bill</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Official Work Invoice PDF Modal */}
      {isInvoiceModalOpen && currentEditor && (
        <EditorPdfExportModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedProjectForInvoice(null);
          }}
          editor={currentEditor}
          projects={myProjects}
          payments={myPayments}
          studios={studios}
          defaultTab="invoice"
          initialProjectId={selectedProjectForInvoice || undefined}
        />
      )}
    </div>
  );
}
