import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  FolderKanban, 
  List, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Building2, 
  Laptop, 
  Calendar, 
  CheckCircle2, 
  X, 
  IndianRupee,
  Download,
  SlidersHorizontal,
  ArrowUpDown,
  AlertTriangle,
  Clock,
  MessageCircle,
  Sparkles,
  Send,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PaymentHistory, Project, Studio, Editor } from '../../types';
import { MS_PER_DAY, formatINR } from '../../utils';

interface LedgerMasterTableProps {
  payments: PaymentHistory[];
  projects: Project[];
  studios: Studio[];
  editors: Editor[];
  onOpenRecordModal: (type?: 'studio' | 'editor', defaultProjectId?: string) => void;
  onOpenEditModal: (payment: PaymentHistory) => void;
  onViewReceipt: (payment: PaymentHistory) => void;
  onDeletePayment: (id: string) => void;
  onExportCSV: () => void;
}

// Overdue resolution helper
export const getPaymentOrProjectOverdueInfo = (proj?: Project, pay?: PaymentHistory) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. If payment explicitly has a dueDate
  if (pay?.dueDate) {
    const d = new Date(pay.dueDate);
    d.setHours(0, 0, 0, 0);
    if (!isNaN(d.getTime()) && d < today) {
      const diffDays = Math.max(1, Math.floor((today.getTime() - d.getTime()) / MS_PER_DAY));
      return {
        isOverdue: true,
        daysOverdue: diffDays,
        dueDateStr: pay.dueDate,
        reason: 'Payment Due Date Elapsed'
      };
    }
  }

  // 2. If payment is explicitly marked overdue
  if (pay?.isOverdue) {
    return {
      isOverdue: true,
      daysOverdue: 1,
      dueDateStr: pay.date || 'Recent',
      reason: 'Flagged for Follow-up'
    };
  }

  // 3. If linked to a project with an unpaid remaining balance
  if (proj) {
    const storedAdv = Number(proj.advancePayment) || 0;
    const contractAmt = Number(proj.projectAmount) || 0;
    const rem = proj.remainingBalance !== undefined ? Number(proj.remainingBalance) : Math.max(0, contractAmt - storedAdv);

    if (rem > 0) {
      // 3A. Check custom paymentDueDate
      if (proj.paymentDueDate) {
        const d = new Date(proj.paymentDueDate);
        d.setHours(0, 0, 0, 0);
        if (!isNaN(d.getTime()) && d < today) {
          const diffDays = Math.max(1, Math.floor((today.getTime() - d.getTime()) / MS_PER_DAY));
          return {
            isOverdue: true,
            daysOverdue: diffDays,
            dueDateStr: proj.paymentDueDate,
            reason: `Payment Due Date (${proj.paymentDueDate}) passed`,
            remainingBalance: rem
          };
        }
      }

      // 3B. Check deliveryDate if delivery date has passed
      if (proj.deliveryDate) {
        const d = new Date(proj.deliveryDate);
        d.setHours(0, 0, 0, 0);
        if (!isNaN(d.getTime()) && d < today) {
          const diffDays = Math.max(1, Math.floor((today.getTime() - d.getTime()) / MS_PER_DAY));
          return {
            isOverdue: true,
            daysOverdue: diffDays,
            dueDateStr: proj.deliveryDate,
            reason: `Delivery date (${proj.deliveryDate}) passed with pending balance`,
            remainingBalance: rem
          };
        }
      }

      // 3C. If project status is delivered/closed but remaining balance is still pending
      if (proj.status === 'delivered' || proj.status === 'closed') {
        return {
          isOverdue: true,
          daysOverdue: 1,
          dueDateStr: proj.deliveryDate || proj.shootDate || 'Delivered',
          reason: 'Film delivered without final payment settlement',
          remainingBalance: rem
        };
      }
    }
  }

  return {
    isOverdue: false,
    daysOverdue: 0,
    dueDateStr: '',
    reason: '',
    remainingBalance: 0
  };
};

export default function LedgerMasterTable({
  payments,
  projects,
  studios,
  editors,
  onOpenRecordModal,
  onOpenEditModal,
  onViewReceipt,
  onDeletePayment,
  onExportCSV
}: LedgerMasterTableProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'received' | 'paid' | 'overdue'>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [selectedStudioFilter, setSelectedStudioFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'this_month' | 'last_month' | 'this_year'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');
  const [ledgerViewMode, setLedgerViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const toggleProjectExpand = (key: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key]
    }));
  };

  const handleExpandAll = (keys: string[]) => {
    const nextState: Record<string, boolean> = {};
    keys.forEach(k => {
      nextState[k] = true;
    });
    setExpandedProjects(nextState);
  };

  const handleCollapseAll = (keys: string[]) => {
    const nextState: Record<string, boolean> = {};
    keys.forEach(k => {
      nextState[k] = false;
    });
    setExpandedProjects(nextState);
  };

  // Date filtering helper
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Helper map for fast project lookup
  const projectMap = useMemo(() => {
    const m = new Map<string, Project>();
    projects.forEach(p => m.set(p.id, p));
    return m;
  }, [projects]);

  // Overall overdue count for tab pill
  const totalOverduePaymentsCount = useMemo(() => {
    return payments.filter(pay => {
      const proj = projectMap.get(pay.projectId);
      return getPaymentOrProjectOverdueInfo(proj, pay).isOverdue;
    }).length;
  }, [payments, projectMap]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter(pay => {
      const proj = projectMap.get(pay.projectId);
      const overdueInfo = getPaymentOrProjectOverdueInfo(proj, pay);

      // 1. Type filter
      if (filterType === 'received' && pay.entityType !== 'studio') return false;
      if (filterType === 'paid' && pay.entityType !== 'editor') return false;
      if (filterType === 'overdue' && !overdueInfo.isOverdue) return false;

      // 2. Method filter
      if (filterMethod !== 'all' && pay.paymentMethod !== filterMethod) return false;

      // 3. Studio filter
      if (selectedStudioFilter !== 'all' && pay.entityId !== selectedStudioFilter) return false;

      // 4. Date filter
      if (dateFilter !== 'all' && pay.date) {
        const payDate = new Date(pay.date);
        if (!isNaN(payDate.getTime())) {
          if (dateFilter === 'this_month') {
            if (payDate.getFullYear() !== currentYear || payDate.getMonth() !== currentMonth) return false;
          } else if (dateFilter === 'last_month') {
            const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            if (payDate.getFullYear() !== prevYear || payDate.getMonth() !== prevMonth) return false;
          } else if (dateFilter === 'this_year') {
            if (payDate.getFullYear() !== currentYear) return false;
          }
        }
      }

      // 5. Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const studioObj = studios.find(s => s.id === pay.entityId);
        const editorObj = editors.find(e => e.id === pay.entityId);

        const matchCouple = pay.projectCoupleName?.toLowerCase().includes(q);
        const matchNotes = pay.notes?.toLowerCase().includes(q);
        const matchPayer = pay.receivedFrom?.toLowerCase().includes(q);
        const matchStudio = studioObj?.name.toLowerCase().includes(q);
        const matchEditor = editorObj?.name.toLowerCase().includes(q);
        const matchMethod = pay.paymentMethod?.toLowerCase().includes(q);
        const matchAmount = pay.amount?.toString().includes(q);

        if (!matchCouple && !matchNotes && !matchPayer && !matchStudio && !matchEditor && !matchMethod && !matchAmount) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return (b.date || '').localeCompare(a.date || '');
      if (sortBy === 'date_asc') return (a.date || '').localeCompare(b.date || '');
      if (sortBy === 'amount_desc') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
      if (sortBy === 'amount_asc') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
      return 0;
    });
  }, [payments, filterType, filterMethod, selectedStudioFilter, dateFilter, searchQuery, studios, editors, sortBy, currentYear, currentMonth, projectMap]);

  // Group payments by Project automatically
  const groupedProjects = useMemo(() => {
    const map = new Map<string, {
      key: string;
      projectId?: string;
      coupleName: string;
      studioName: string;
      studioPhone?: string;
      eventType: string;
      projectObj?: Project;
      contractAmount: number;
      totalReceived: number;
      totalPaidOut: number;
      remainingBalance: number;
      isOverdue: boolean;
      daysOverdue: number;
      dueDateStr: string;
      overdueReason: string;
      paymentsList: PaymentHistory[];
    }>();

    // 1. Initialize map with projects matching selected studio / search filter
    projects.forEach(p => {
      if (selectedStudioFilter !== 'all' && p.studioId !== selectedStudioFilter && p.studioName?.toLowerCase() !== selectedStudioFilter.toLowerCase()) {
        return;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.coupleName?.toLowerCase().includes(q) || p.projectName?.toLowerCase().includes(q);
        const matchStudio = p.studioName?.toLowerCase().includes(q);
        const matchType = p.eventType?.toLowerCase().includes(q);
        const matchPay = payments.some(pay => pay.projectId === p.id && (pay.notes?.toLowerCase().includes(q) || pay.paymentMethod?.toLowerCase().includes(q) || pay.receivedFrom?.toLowerCase().includes(q)));
        if (!matchName && !matchStudio && !matchType && !matchPay) return;
      }

      const studioObj = studios.find(s => s.id === p.studioId || s.name.toLowerCase() === p.studioName?.toLowerCase());
      const contractAmount = Number(p.projectAmount) || 0;

      map.set(p.id, {
        key: p.id,
        projectId: p.id,
        coupleName: p.coupleName || p.projectName || 'Wedding Film',
        studioName: p.studioName || 'Direct Studio',
        studioPhone: studioObj?.phone || p.clientPhone,
        eventType: p.eventType || 'Wedding',
        projectObj: p,
        contractAmount,
        totalReceived: 0,
        totalPaidOut: 0,
        remainingBalance: 0,
        isOverdue: false,
        daysOverdue: 0,
        dueDateStr: '',
        overdueReason: '',
        paymentsList: []
      });
    });

    // 2. Map filtered payments into groups
    filteredPayments.forEach(pay => {
      const pKey = pay.projectId;
      if (pKey && map.has(pKey)) {
        const group = map.get(pKey)!;
        group.paymentsList.push(pay);
        if (pay.entityType === 'studio') {
          group.totalReceived += Number(pay.amount) || 0;
        } else {
          group.totalPaidOut += Number(pay.amount) || 0;
        }
      } else {
        const fallbackKey = pay.projectId || pay.projectCoupleName || 'unassigned_ledger';
        if (!map.has(fallbackKey)) {
          const projObj = projects.find(p => p.id === pay.projectId);
          const studioObj = studios.find(s => s.id === projObj?.studioId || s.name.toLowerCase() === projObj?.studioName?.toLowerCase());
          const contractAmount = Number(projObj?.projectAmount) || 0;

          map.set(fallbackKey, {
            key: fallbackKey,
            projectId: pay.projectId,
            coupleName: pay.projectCoupleName || projObj?.coupleName || 'General Studio Ledger',
            studioName: projObj?.studioName || pay.receivedFrom || 'Partner Studio',
            studioPhone: studioObj?.phone || projObj?.clientPhone,
            eventType: projObj?.eventType || 'General',
            projectObj: projObj,
            contractAmount,
            totalReceived: 0,
            totalPaidOut: 0,
            remainingBalance: 0,
            isOverdue: false,
            daysOverdue: 0,
            dueDateStr: '',
            overdueReason: '',
            paymentsList: []
          });
        }
        const group = map.get(fallbackKey)!;
        group.paymentsList.push(pay);
        if (pay.entityType === 'studio') {
          group.totalReceived += Number(pay.amount) || 0;
        } else {
          group.totalPaidOut += Number(pay.amount) || 0;
        }
      }
    });

    // 3. Finalize remaining balances, overdue detection & effective received totals
    const result = Array.from(map.values());
    result.forEach(group => {
      if (group.projectObj) {
        const studioLogged = group.paymentsList.filter(p => p.entityType === 'studio');
        if (studioLogged.length === 0) {
          group.totalReceived = Number(group.projectObj.advancePayment) || 0;
        }
        const effectiveRem = Math.max(0, group.contractAmount - group.totalReceived);
        group.remainingBalance = effectiveRem;

        // Compute Overdue Status
        const overdueInfo = getPaymentOrProjectOverdueInfo(group.projectObj);
        if (overdueInfo.isOverdue && effectiveRem > 0) {
          group.isOverdue = true;
          group.daysOverdue = overdueInfo.daysOverdue;
          group.dueDateStr = overdueInfo.dueDateStr;
          group.overdueReason = overdueInfo.reason;
        }
      } else {
        group.remainingBalance = 0;
      }
    });

    // Filter out groups when filtering by specific criteria
    const filteredResult = result.filter(g => {
      if (filterType === 'overdue') {
        return g.isOverdue && g.remainingBalance > 0;
      }
      if (filterType !== 'all' || filterMethod !== 'all' || dateFilter !== 'all') {
        return g.paymentsList.length > 0;
      }
      return true;
    });

    // Sort by Overdue first, then remaining balance desc or transactions count desc
    return filteredResult.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) {
        return a.isOverdue ? -1 : 1;
      }
      if (b.remainingBalance !== a.remainingBalance) {
        return b.remainingBalance - a.remainingBalance;
      }
      return b.paymentsList.length - a.paymentsList.length;
    });
  }, [projects, filteredPayments, payments, searchQuery, selectedStudioFilter, filterType, filterMethod, dateFilter, studios]);

  const totalOverdueProjectsCount = useMemo(() => {
    return projects.filter(p => {
      const pPayments = payments.filter(pay => pay.projectId === p.id && pay.entityType === 'studio');
      const logged = pPayments.reduce((s, pay) => s + (Number(pay.amount) || 0), 0);
      const adv = pPayments.length > 0 ? logged : (Number(p.advancePayment) || 0);
      const rem = Math.max(0, (Number(p.projectAmount) || 0) - adv);
      return rem > 0 && getPaymentOrProjectOverdueInfo(p).isOverdue;
    }).length;
  }, [projects, payments]);

  const hasActiveFilters = searchQuery !== '' || filterType !== 'all' || filterMethod !== 'all' || selectedStudioFilter !== 'all' || dateFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterType('all');
    setFilterMethod('all');
    setSelectedStudioFilter('all');
    setDateFilter('all');
    setSortBy('date_desc');
  };

  // WhatsApp Follow-up trigger
  const handleTriggerFollowUpWhatsApp = (coupleName: string, studioName: string, phone: string | undefined, remainingDue: number, daysOverdue: number, dueDateStr?: string) => {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const formattedPhone = cleanPhone ? (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone) : '';
    
    const msg = `*URGENT: PAYMENT FOLLOW-UP NOTICE* 🎬\n` +
      `*The Frame Cut Studio - Accounts Ledger*\n\n` +
      `Namaste *${studioName}*,\n\n` +
      `This is a priority payment reminder regarding wedding project: *${coupleName}*.\n\n` +
      `• *Outstanding Balance Due:* ₹${remainingDue.toLocaleString('en-IN')}\n` +
      (dueDateStr ? `• *Agreed Due Date:* ${dueDateStr}\n` : '') +
      `• *Status:* ⚠️ *OVERDUE BY ${daysOverdue} DAY(S)*\n\n` +
      `Kindly process the pending balance at your earliest convenience or share the transaction reference if already initiated.\n\n` +
      `Thank you for your prompt cooperation! ✨`;

    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Search and Control Bar */}
      <div className="p-5 rounded-3xl bg-charcoal-900/90 border border-luxury-green-800/20 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search couple name, studio, editor, notes, ref ID, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-charcoal-950/80 border border-white/10 rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs cursor-pointer p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Switcher: Grouped by Project vs Flat List */}
            <div className="flex items-center p-1 bg-charcoal-950 rounded-2xl border border-white/10">
              <button
                onClick={() => setLedgerViewMode('grouped')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  ledgerViewMode === 'grouped'
                    ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Group payments automatically by Project"
              >
                <FolderKanban className="w-3.5 h-3.5" />
                <span>By Project ({groupedProjects.length})</span>
              </button>
              <button
                onClick={() => setLedgerViewMode('flat')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  ledgerViewMode === 'flat'
                    ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="View all transactions as a flat chronological list"
              >
                <List className="w-3.5 h-3.5" />
                <span>Flat List ({filteredPayments.length})</span>
              </button>
            </div>

            {/* Type & Overdue Filter Pills */}
            <div className="flex items-center p-1 bg-charcoal-950 rounded-2xl border border-white/10 gap-0.5">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  filterType === 'all'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All ({payments.length})
              </button>
              <button
                onClick={() => setFilterType('received')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                  filterType === 'received'
                    ? 'bg-emerald-500 text-charcoal-950 shadow'
                    : 'text-gray-400 hover:text-emerald-400'
                }`}
              >
                <ArrowDownLeft className="w-3.5 h-3.5" />
                <span>Received</span>
              </button>
              <button
                onClick={() => setFilterType('paid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                  filterType === 'paid'
                    ? 'bg-amber-500 text-charcoal-950 shadow'
                    : 'text-gray-400 hover:text-amber-400'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Paid Out</span>
              </button>
              {/* OVERDUE FILTER PILL WITH SUBTLE AMBER COLOR & PULSE INDICATOR */}
              <button
                onClick={() => setFilterType('overdue')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  filterType === 'overdue'
                    ? 'bg-amber-500 text-charcoal-950 shadow-md ring-1 ring-amber-400'
                    : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
                title="Filter records that have overdue balances requiring immediate follow-up"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${filterType === 'overdue' ? 'text-charcoal-950' : 'text-amber-400 animate-pulse'}`} />
                <span>Overdue ({totalOverdueProjectsCount || totalOverduePaymentsCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter & Sort Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs text-gray-400">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[10px] uppercase text-gold-400/80 flex items-center gap-1 font-semibold">
              <SlidersHorizontal className="w-3 h-3" /> Filters:
            </span>

            {/* Payment Method Select */}
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="bg-charcoal-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500/40"
            >
              <option value="all">All Modes</option>
              <option value="UPI">UPI / GPay / PhonePe</option>
              <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
              <option value="Cash">Cash Handover</option>
              <option value="Cheque">Cheque</option>
            </select>

            {/* Studio Filter Select */}
            <select
              value={selectedStudioFilter}
              onChange={(e) => setSelectedStudioFilter(e.target.value)}
              className="bg-charcoal-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500/40 max-w-[150px] truncate"
            >
              <option value="all">All Studios</option>
              {studios.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Date Range Quick Filter */}
            <select
              value={dateFilter}
              onChange={(e: any) => setDateFilter(e.target.value)}
              className="bg-charcoal-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500/40"
            >
              <option value="all">All Dates</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_year">This Year</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-charcoal-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-gold-500/40"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Amount (High to Low)</option>
              <option value="amount_asc">Amount (Low to High)</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-charcoal-900 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/30 text-xs font-mono transition-all cursor-pointer shadow-sm shrink-0"
                title="Reset all ledger search and filter controls"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Right side: Expand/Collapse or CSV Export */}
          <div className="flex items-center space-x-2">
            {ledgerViewMode === 'grouped' && (
              <>
                <button
                  onClick={() => handleExpandAll(groupedProjects.map(g => g.key))}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-[11px] transition-all cursor-pointer flex items-center space-x-1 border border-white/5"
                >
                  <ChevronDown className="w-3 h-3 text-gold-400" />
                  <span>Expand All</span>
                </button>
                <button
                  onClick={() => handleCollapseAll(groupedProjects.map(g => g.key))}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-[11px] transition-all cursor-pointer flex items-center space-x-1 border border-white/5"
                >
                  <ChevronUp className="w-3 h-3 text-gold-400" />
                  <span>Collapse</span>
                </button>
              </>
            )}

            <button
              onClick={onExportCSV}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-mono text-[11px] transition-all cursor-pointer flex items-center space-x-1 border border-white/5"
              title="Download CSV report of current filtered transactions"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Payment History Display (Grouped by Project OR Flat List) */}
      <div className="space-y-4">
        {ledgerViewMode === 'grouped' ? (
          /* VIEW MODE A: GROUPED BY PROJECT */
          groupedProjects.length > 0 ? (
            <div className="space-y-4">
              {groupedProjects.map((group) => {
                const isExpanded = expandedProjects[group.key] !== false; // Default expanded
                const collectionPct = group.contractAmount > 0 
                  ? Math.min(100, Math.round((group.totalReceived / group.contractAmount) * 100)) 
                  : 100;

                return (
                  <motion.div 
                    key={group.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-3xl overflow-hidden shadow-xl transition-all ${
                      group.isOverdue
                        ? 'bg-gradient-to-r from-charcoal-950 via-amber-950/20 to-charcoal-950 border border-amber-500/40 hover:border-amber-400/60 shadow-amber-950/20'
                        : 'bg-charcoal-900/90 border border-white/10'
                    }`}
                  >
                    {/* Expandable Project Header Card */}
                    <div
                      onClick={() => toggleProjectExpand(group.key)}
                      className={`p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none border-b ${
                        group.isOverdue 
                          ? 'bg-amber-950/20 hover:bg-amber-950/30 border-amber-500/20' 
                          : 'bg-gradient-to-r from-charcoal-950 via-charcoal-900 to-charcoal-950 hover:bg-white/[0.02] border-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5">
                        <button
                          type="button"
                          className="p-2 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-colors shrink-0"
                        >
                          <ChevronDown className={`w-4 h-4 text-gold-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>

                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <h3 className="text-base font-bold text-white font-sans flex items-center gap-2">
                              {group.coupleName}
                            </h3>

                            {/* SUBTLE AMBER OVERDUE VISUAL INDICATOR BADGE */}
                            {group.isOverdue && (
                              <span 
                                className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/40 font-bold flex items-center gap-1.5 shadow-sm"
                                title={group.overdueReason}
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse" />
                                <span>Overdue ({group.daysOverdue}d)</span>
                              </span>
                            )}

                            <span className="px-2.5 py-0.5 rounded-full bg-gold-500/10 text-gold-300 font-mono text-[10px] border border-gold-500/20 font-bold">
                              {group.paymentsList.length} Payment{group.paymentsList.length !== 1 ? 's' : ''} Logged
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 font-mono mt-0.5 flex items-center gap-2">
                            <span>{group.studioName}</span>
                            <span>•</span>
                            <span>{group.eventType}</span>
                            {group.isOverdue && group.dueDateStr && (
                              <>
                                <span>•</span>
                                <span className="text-amber-400/90 font-semibold">Due Date: {group.dueDateStr}</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Project Metrics Summary Badges & Actions */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        {group.contractAmount > 0 && (
                          <div className="px-3 py-1.5 rounded-2xl bg-charcoal-950 border border-white/10 font-mono text-xs">
                            <span className="text-[9px] uppercase text-gray-500 block font-semibold">Contract Total</span>
                            <span className="font-bold text-gray-200">₹{group.contractAmount.toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        <div className="px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 font-mono text-xs">
                          <span className="text-[9px] uppercase text-emerald-400 block font-semibold">Received</span>
                          <span className="font-bold text-emerald-300">₹{group.totalReceived.toLocaleString('en-IN')}</span>
                        </div>

                        {group.totalPaidOut > 0 && (
                          <div className="px-3 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 font-mono text-xs">
                            <span className="text-[9px] uppercase text-amber-400 block font-semibold">Paid Out</span>
                            <span className="font-bold text-amber-300">₹{group.totalPaidOut.toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        {group.projectObj && (
                          <div className={`px-3 py-1.5 rounded-2xl border font-mono text-xs ${
                            group.isOverdue
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : group.remainingBalance > 0 
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' 
                                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          }`}>
                            <span className="text-[9px] uppercase block font-semibold opacity-90 flex items-center gap-1">
                              {group.isOverdue && <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />}
                              {group.remainingBalance > 0 ? (group.isOverdue ? 'Overdue Balance' : 'Remaining Balance') : 'Payment Status'}
                            </span>
                            <span className="font-bold flex items-center gap-1">
                              {group.remainingBalance > 0 ? (
                                `₹${group.remainingBalance.toLocaleString('en-IN')} Due`
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>100% Settled</span>
                                </>
                              )}
                            </span>
                          </div>
                        )}

                        {/* IMMEDIATE FOLLOW-UP ACTION BUTTON FOR OVERDUE TRANSACTIONS */}
                        {group.isOverdue && group.remainingBalance > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTriggerFollowUpWhatsApp(
                                group.coupleName,
                                group.studioName,
                                group.studioPhone,
                                group.remainingBalance,
                                group.daysOverdue,
                                group.dueDateStr
                              );
                            }}
                            className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-charcoal-950 font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                            title="Send immediate WhatsApp payment follow-up notice"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Follow Up Now</span>
                          </button>
                        )}

                        {/* Direct "+ Record Payment" Button */}
                        {group.projectId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRecordModal('studio', group.projectId);
                            }}
                            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-charcoal-950 font-bold text-xs rounded-xl flex items-center space-x-1 shadow cursor-pointer transition-all ml-1"
                            title="Log new payment receipt for this project"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Record Payment</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar under header */}
                    {group.contractAmount > 0 && (
                      <div className="w-full bg-charcoal-950 h-1.5 border-b border-white/5">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            group.isOverdue 
                              ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500' 
                              : 'bg-gradient-to-r from-emerald-500 to-amber-400'
                          }`}
                          style={{ width: `${collectionPct}%` }}
                        />
                      </div>
                    )}

                    {/* Collapsible Transactions History Table */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 space-y-3"
                        >
                          {/* OVERDUE NOTICE CALLOUT BANNER TO PROMPT IMMEDIATE FOLLOW-UP */}
                          {group.isOverdue && group.remainingBalance > 0 && (
                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300 font-mono">
                              <div className="flex items-center space-x-2.5">
                                <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                                  <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div>
                                  <strong className="text-white block font-sans">Payment Follow-up Required</strong>
                                  <span className="text-[11px] text-amber-300/90">
                                    ₹{group.remainingBalance.toLocaleString('en-IN')} outstanding balance is {group.daysOverdue} day(s) overdue. {group.overdueReason}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => handleTriggerFollowUpWhatsApp(
                                  group.coupleName,
                                  group.studioName,
                                  group.studioPhone,
                                  group.remainingBalance,
                                  group.daysOverdue,
                                  group.dueDateStr
                                )}
                                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-charcoal-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer transition-all"
                              >
                                <Send className="w-3 h-3" />
                                <span>Send WhatsApp Notice</span>
                              </button>
                            </div>
                          )}

                          {group.paymentsList.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs text-gray-300">
                                <thead>
                                  <tr className="border-b border-white/10 text-[10px] font-mono uppercase text-gray-400 tracking-wider">
                                    <th className="pb-2.5 pl-2">Type & Date</th>
                                    <th className="pb-2.5">Party (Studio / Editor)</th>
                                    <th className="pb-2.5">Method</th>
                                    <th className="pb-2.5">Payer / Reference Notes</th>
                                    <th className="pb-2.5 text-right">Amount (₹)</th>
                                    <th className="pb-2.5 text-right pr-2">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                  {group.paymentsList.map((pay) => {
                                    const isReceived = pay.entityType === 'studio';
                                    const studioObj = studios.find(s => s.id === pay.entityId);
                                    const editorObj = editors.find(e => e.id === pay.entityId);
                                    const partyName = isReceived ? (studioObj?.name || 'Studio Partner') : (editorObj?.name || 'Video Editor');

                                    return (
                                      <tr key={pay.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="py-3 pl-2">
                                          <div className="flex items-center space-x-2">
                                            <span className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold ${
                                              isReceived 
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                            }`}>
                                              {isReceived ? '← Received' : '→ Paid Out'}
                                            </span>
                                            <span className="text-[10px] text-gray-400 font-mono">{pay.date}</span>
                                          </div>
                                        </td>
                                        <td className="py-3">
                                          <div className="font-semibold text-white">{partyName}</div>
                                          {isReceived && pay.receivedFrom && (
                                            <div className="text-[10px] text-gray-400">Payer: <strong className="text-gray-300 font-normal">{pay.receivedFrom}</strong></div>
                                          )}
                                        </td>
                                        <td className="py-3">
                                          <span className="px-2 py-0.5 rounded bg-charcoal-950 border border-white/10 font-mono text-[10px] text-gold-300">
                                            {pay.paymentMethod || 'UPI'}
                                          </span>
                                        </td>
                                        <td className="py-3 max-w-xs text-gray-400 italic truncate" title={pay.notes || ''}>
                                          {pay.notes || '-'}
                                        </td>
                                        <td className="py-3 text-right font-mono font-bold text-sm">
                                          <span className={isReceived ? 'text-emerald-400' : 'text-amber-400'}>
                                            {isReceived ? '+' : '-'} ₹{(pay.amount || 0).toLocaleString('en-IN')}
                                          </span>
                                        </td>
                                        <td className="py-3 text-right pr-2">
                                          <div className="flex items-center justify-end space-x-1">
                                            <button
                                              onClick={() => onViewReceipt(pay)}
                                              title="View Official Payment Receipt"
                                              className="p-1.5 rounded-lg bg-white/5 hover:bg-gold-500/20 text-gray-400 hover:text-gold-300 transition-colors cursor-pointer"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => onOpenEditModal(pay)}
                                              title="Edit Record"
                                              className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-300 transition-colors cursor-pointer"
                                            >
                                              <Edit className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => onDeletePayment(pay.id)}
                                              title="Delete Record"
                                              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-4 text-center text-xs text-gray-500 font-mono bg-black/20 rounded-2xl border border-dashed border-white/5 flex flex-col items-center justify-center space-y-2">
                              <span>No payment transaction logs recorded for this project yet.</span>
                              {group.projectId && (
                                <button
                                  onClick={() => onOpenRecordModal('studio', group.projectId)}
                                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Record Initial Payment</span>
                                </button>
                              )}
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
            /* Empty State for Grouped View */
            <div className="text-center py-16 bg-charcoal-900/80 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center p-6">
              <div className="w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 mb-4">
                <FolderKanban className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">No Project Payment Records Found</h3>
              <p className="text-xs text-gray-400 mt-1 max-w-md">
                {hasActiveFilters
                  ? 'No projects matched your search filters. Try resetting filters.'
                  : 'Your project payment ledger is empty. Click "+ Record New Payment" below to log your first transaction.'}
              </p>
              <div className="mt-6 flex gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-charcoal-800 text-gray-300 text-xs rounded-xl font-medium border border-white/10 hover:bg-charcoal-700 cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={() => onOpenRecordModal('studio')}
                  className="px-5 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-charcoal-950 font-bold text-xs rounded-xl flex items-center space-x-2 shadow-lg cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-charcoal-950" />
                  <span>+ Record New Payment</span>
                </button>
              </div>
            </div>
          )
        ) : (
          /* VIEW MODE B: FLAT TRANSACTION LIST TABLE */
          <div className="p-6 rounded-3xl bg-charcoal-900/90 border border-luxury-green-800/20 shadow-2xl">
            {filteredPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] font-mono uppercase text-gray-400 tracking-wider">
                      <th className="pb-3 pl-2">Type & Date</th>
                      <th className="pb-3">Project / Couple Name</th>
                      <th className="pb-3">Party (Studio / Editor)</th>
                      <th className="pb-3">Payment Method</th>
                      <th className="pb-3">Payer / Reference Notes</th>
                      <th className="pb-3 text-right">Amount (₹)</th>
                      <th className="pb-3 text-right pr-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredPayments.map((pay) => {
                      const isReceived = pay.entityType === 'studio';
                      const proj = projectMap.get(pay.projectId);
                      const overdueInfo = getPaymentOrProjectOverdueInfo(proj, pay);
                      const studioObj = studios.find(s => s.id === pay.entityId || s.id === proj?.studioId);
                      const editorObj = editors.find(e => e.id === pay.entityId);
                      const partyName = isReceived ? (studioObj?.name || 'Studio Partner') : (editorObj?.name || 'Video Editor');
                      const studioPhone = studioObj?.phone || proj?.clientPhone;

                      return (
                        <tr 
                          key={pay.id} 
                          className={`transition-colors group ${
                            overdueInfo.isOverdue 
                              ? 'bg-amber-950/20 hover:bg-amber-950/35 border-l-2 border-l-amber-400' 
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          {/* Type & Date */}
                          <td className="py-4 pl-2">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-md font-mono text-[9px] uppercase tracking-wider font-bold ${
                                  isReceived 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                }`}>
                                  {isReceived ? '← Received' : '→ Paid Out'}
                                </span>

                                {/* SUBTLE AMBER OVERDUE PILL IN FLAT LIST ROW */}
                                {overdueInfo.isOverdue && (
                                  <span 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold"
                                    title={overdueInfo.reason}
                                  >
                                    <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                    <span>Overdue ({overdueInfo.daysOverdue}d)</span>
                                  </span>
                                )}
                              </div>

                              <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-500" />
                                {pay.date || 'Recent'}
                              </span>
                            </div>
                          </td>

                          {/* Project / Couple */}
                          <td className="py-4 font-bold text-white max-w-xs">
                            <div className="text-sm font-semibold flex items-center gap-1.5">
                              <span>{pay.projectCoupleName || 'Wedding Film'}</span>
                            </div>
                            <span className="text-[9px] text-gray-500 font-mono block mt-0.5">ID: {pay.id}</span>
                          </td>

                          {/* Party */}
                          <td className="py-4">
                            <div className="flex items-center space-x-2">
                              <div className={`w-7 h-7 rounded-lg border flex items-center justify-center text-xs ${
                                isReceived ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              }`}>
                                {isReceived ? <Building2 className="w-3.5 h-3.5" /> : <Laptop className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <div className="font-medium text-gray-200">{partyName}</div>
                                {isReceived && pay.receivedFrom && (
                                  <div className="text-[10px] text-gray-400">Payer: <strong className="text-gray-300 font-normal">{pay.receivedFrom}</strong></div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Method */}
                          <td className="py-4">
                            <span className="px-2.5 py-1 rounded-lg bg-charcoal-950 border border-white/10 font-mono text-[11px] text-gold-300/90 font-medium">
                              {pay.paymentMethod || 'UPI'}
                            </span>
                          </td>

                          {/* Notes */}
                          <td className="py-4 max-w-xs">
                            <p className="text-gray-400 text-xs italic truncate" title={pay.notes || 'No notes'}>
                              {pay.notes || '-'}
                            </p>
                          </td>

                          {/* Amount */}
                          <td className="py-4 text-right">
                            <span className={`text-base font-bold font-sans tracking-tight ${
                              isReceived ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {isReceived ? '+' : '-'} ₹{(pay.amount || 0).toLocaleString('en-IN')}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 text-right pr-2">
                            <div className="flex items-center justify-end space-x-1">
                              {/* Quick WhatsApp follow-up if overdue */}
                              {overdueInfo.isOverdue && isReceived && (
                                <button
                                  onClick={() => handleTriggerFollowUpWhatsApp(
                                    pay.projectCoupleName || 'Wedding Film',
                                    partyName,
                                    studioPhone,
                                    overdueInfo.remainingBalance || pay.amount,
                                    overdueInfo.daysOverdue,
                                    overdueInfo.dueDateStr
                                  )}
                                  title="Send instant WhatsApp payment follow-up"
                                  className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors cursor-pointer border border-amber-500/30"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => onViewReceipt(pay)}
                                title="View Official Payment Receipt"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-gold-500/20 text-gray-400 hover:text-gold-300 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onOpenEditModal(pay)}
                                title="Edit Record"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-300 transition-colors cursor-pointer"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => onDeletePayment(pay.id)}
                                title="Delete Record"
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* Empty State */
              <div className="text-center py-16 bg-charcoal-950/40 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 mb-4">
                  <IndianRupee className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white font-display">No Payment Records Found</h3>
                <p className="text-xs text-gray-400 mt-1 max-w-md">
                  {hasActiveFilters
                    ? 'No transactions matched your search filters. Try clearing search or resetting filters.'
                    : 'Your payment ledger is empty. Click "+ Record New Payment" to log your first transaction.'}
                </p>
                <div className="mt-6 flex gap-3">
                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 bg-charcoal-800 text-gray-300 text-xs rounded-xl font-medium border border-white/10 hover:bg-charcoal-700 cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button
                    onClick={() => onOpenRecordModal('studio')}
                    className="px-5 py-2.5 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-charcoal-950 font-bold text-xs rounded-xl flex items-center space-x-2 shadow-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-charcoal-950" />
                    <span>+ Record New Payment</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
