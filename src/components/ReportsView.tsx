import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Sparkles, 
  Briefcase, 
  Building2, 
  UserCheck, 
  Percent,
  TrendingDown,
  Info,
  FileDown,
  FileSpreadsheet,
  Download,
  Check,
  Clock,
  Calendar,
  Zap,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Layers,
  Award,
  Timer,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  ReferenceLine
} from 'recharts';
import { SafeChartContainer } from './common/SafeChartContainer';
import { Project, Studio, Editor, Expense } from '../types';
import { MS_PER_DAY } from '../utils';

interface ReportsViewProps {
  projects: Project[];
  studios: Studio[];
  editors: Editor[];
  expenses: Expense[];
}

export default function ReportsView({ projects, studios, editors, expenses }: ReportsViewProps) {
  
  // 1. Calculations - Top Studio
  const studioSalesMap: { [key: string]: { name: string; sales: number } } = {};
  projects.forEach(p => {
    if (!studioSalesMap[p.studioId]) {
      studioSalesMap[p.studioId] = { name: p.studioName, sales: 0 };
    }
    studioSalesMap[p.studioId].sales += p.projectAmount || 0;
  });
  const topStudioEntry = Object.values(studioSalesMap).sort((a, b) => b.sales - a.sales)[0] || { name: 'None', sales: 0 };

  // 2. Calculations - Top Editor
  const editorCompletionMap: { [key: string]: { name: string; count: number } } = {};
  projects.forEach(p => {
    if (p.assignedEditorId && (p.status === 'delivered' || p.status === 'closed')) {
      if (!editorCompletionMap[p.assignedEditorId]) {
        editorCompletionMap[p.assignedEditorId] = { name: p.assignedEditorName || 'Unknown', count: 0 };
      }
      editorCompletionMap[p.assignedEditorId].count += 1;
    }
  });
  const topEditorEntry = Object.values(editorCompletionMap).sort((a, b) => b.count - a.count)[0] || { name: 'None', count: 0 };

  // 3. Calculations - Most Profitable Project
  const projectsWithProfit = projects.map(p => {
    const expensesSum = (p.editorPayment || 0) + (p.otherExpenses || 0);
    const profit = (p.projectAmount || 0) - expensesSum;
    const margin = p.projectAmount > 0 ? (profit / p.projectAmount) * 100 : 0;
    return { ...p, profit, margin };
  }).sort((a, b) => b.profit - a.profit);
  const mostProfitableProj = projectsWithProfit[0];

  // 4. Expense allocation data
  const expenseCategoriesMap: { [key: string]: number } = {};
  expenses.forEach(e => {
    expenseCategoriesMap[e.category] = (expenseCategoriesMap[e.category] || 0) + (e.amount || 0);
  });
  // Also include project-level editor payments & other expenses
  projects.forEach(p => {
    expenseCategoriesMap['freelance_editor'] = (expenseCategoriesMap['freelance_editor'] || 0) + (p.editorPayment || 0);
    expenseCategoriesMap['other'] = (expenseCategoriesMap['other'] || 0) + (p.otherExpenses || 0);
  });

  const totalExpenseSum = Object.values(expenseCategoriesMap).reduce((a, b) => a + b, 0);
  const expenseAllocationData = Object.entries(expenseCategoriesMap).map(([key, val]) => {
    const formattedLabel = key.replace(/_/g, ' ').toUpperCase();
    const sharePct = totalExpenseSum > 0 ? ((val / totalExpenseSum) * 100).toFixed(1) : '0.0';
    return { 
      name: formattedLabel, 
      value: val,
      sharePct,
      categoryKey: key
    };
  });

  const PIE_COLORS = ['#1e5546', '#d4af37', '#EF4444', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'];

  // 5. Margin distribution analysis data
  const profitMarginTrend = projectsWithProfit.slice(0, 8).map(p => {
    const expensesSum = (p.editorPayment || 0) + (p.otherExpenses || 0);
    return {
      name: p.coupleName.length > 12 ? `${p.coupleName.substring(0, 12)}...` : p.coupleName,
      fullName: p.coupleName,
      studio: p.studioName,
      Profit: p.profit,
      Amount: p.projectAmount,
      Expenses: expensesSum,
      editorPayment: p.editorPayment || 0,
      otherExpenses: p.otherExpenses || 0,
      margin: p.margin,
      status: p.status,
      id: p.id
    };
  });

  // Quarter selector for Studio Performance (defaults to last_quarter as requested)
  type QuarterFilter = 'last_quarter' | 'current_quarter' | 'trailing_90' | 'all_time';
  const [studioQuarter, setStudioQuarter] = useState<QuarterFilter>('last_quarter');

  // Compute quarter configurations based on active FY context (FY 2026-27)
  const quarterPresets = useMemo(() => {
    const baseYear = 2026;
    
    // FY 2026-27 Definitions
    // Last Completed Fiscal Quarter: Q1 FY 2026-27 (Apr 1, 2026 – Jun 30, 2026)
    const lastQuarterStart = new Date(baseYear, 3, 1, 0, 0, 0);
    const lastQuarterEnd = new Date(baseYear, 5, 30, 23, 59, 59, 999);

    // Current Fiscal Quarter: Q2 FY 2026-27 (Jul 1, 2026 – Sep 30, 2026)
    const currentQuarterStart = new Date(baseYear, 6, 1, 0, 0, 0);
    const currentQuarterEnd = new Date(baseYear, 8, 30, 23, 59, 59, 999);

    // Trailing 90 Days rolling window from current date
    const now = new Date(baseYear, 8, 5); // Sep 5, 2026
    const trailing90Start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const trailing90End = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return {
      last_quarter: {
        id: 'last_quarter' as QuarterFilter,
        label: 'Last Quarter (Apr – Jun 2026)',
        shortLabel: 'Last Quarter (Q1)',
        periodDesc: 'Q1 FY 2026–27 (Apr 1 – Jun 30, 2026)',
        startDate: lastQuarterStart,
        endDate: lastQuarterEnd
      },
      current_quarter: {
        id: 'current_quarter' as QuarterFilter,
        label: 'Current Quarter (Jul – Sep 2026)',
        shortLabel: 'Current Qtr (Q2)',
        periodDesc: 'Q2 FY 2026–27 (Jul 1 – Sep 30, 2026)',
        startDate: currentQuarterStart,
        endDate: currentQuarterEnd
      },
      trailing_90: {
        id: 'trailing_90' as QuarterFilter,
        label: 'Trailing 90 Days',
        shortLabel: 'Trailing 90d',
        periodDesc: 'Rolling 90 Days Production Window',
        startDate: trailing90Start,
        endDate: trailing90End
      },
      all_time: {
        id: 'all_time' as QuarterFilter,
        label: 'All-Time Pipeline',
        shortLabel: 'All-Time Records',
        periodDesc: 'All Recorded Historical Contracts',
        startDate: new Date(2020, 0, 1),
        endDate: new Date(2030, 11, 31)
      }
    };
  }, []);

  // Studio Performance Analytics (Turnaround time + Total Volume of Work Processed)
  const studioPerformanceData = useMemo(() => {
    const activeRange = quarterPresets[studioQuarter];
    const { startDate, endDate } = activeRange;

    // Filter projects matching this quarter period
    const filteredProjects = projects.filter(p => {
      if (studioQuarter === 'all_time') return true;

      let inRange = false;
      if (p.shootDate) {
        const d = new Date(p.shootDate + (p.shootDate.includes('T') ? '' : 'T12:00:00'));
        if (!isNaN(d.getTime()) && d >= startDate && d <= endDate) inRange = true;
      }
      if (!inRange && p.deliveryDate) {
        const d = new Date(p.deliveryDate + (p.deliveryDate.includes('T') ? '' : 'T12:00:00'));
        if (!isNaN(d.getTime()) && d >= startDate && d <= endDate) inRange = true;
      }
      if (!inRange && p.createdAt) {
        const d = p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000) : new Date(p.createdAt);
        if (!isNaN(d.getTime()) && d >= startDate && d <= endDate) inRange = true;
      }
      return inRange;
    });

    // Helper to calculate turnaround time in days for a single project (shoot/intake to delivery)
    const getProjectTurnaround = (p: Project): number | null => {
      let start: Date | null = null;
      let end: Date | null = null;

      if (p.shootDate) {
        const s = new Date(p.shootDate + (p.shootDate.includes('T') ? '' : 'T12:00:00'));
        if (!isNaN(s.getTime())) start = s;
      } else if (p.createdAt) {
        const c = p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000) : new Date(p.createdAt);
        if (!isNaN(c.getTime())) start = c;
      }

      if (p.deliveryDate) {
        const d = new Date(p.deliveryDate + (p.deliveryDate.includes('T') ? '' : 'T12:00:00'));
        if (!isNaN(d.getTime())) end = d;
      }

      if (start && end) {
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffMs / MS_PER_DAY);
        if (diffDays > 0) return diffDays;
      }
      return null;
    };

    interface StudioPerfRecord {
      studioId: string;
      studioName: string;
      ownerName: string;
      city: string;
      phone: string;
      tier?: string;
      totalProjects: number;
      completedProjects: number;
      activeProjects: number;
      totalVolumeAmount: number;
      turnaroundDaysList: number[];
      avgTurnaroundDays: number | null;
      minTurnaroundDays: number | null;
      maxTurnaroundDays: number | null;
      projects: Project[];
    }

    const studioMap = new Map<string, StudioPerfRecord>();

    // Initialize all registered studios
    studios.forEach(s => {
      studioMap.set(s.id, {
        studioId: s.id,
        studioName: s.name || 'Unnamed Studio',
        ownerName: s.ownerName || '',
        city: s.city || s.address || '',
        phone: s.phone || '',
        tier: s.tier,
        totalProjects: 0,
        completedProjects: 0,
        activeProjects: 0,
        totalVolumeAmount: 0,
        turnaroundDaysList: [],
        avgTurnaroundDays: null,
        minTurnaroundDays: null,
        maxTurnaroundDays: null,
        projects: []
      });
    });

    // Process all quarter projects
    filteredProjects.forEach(p => {
      const sId = p.studioId || 'direct-client';
      const sName = p.studioName || 'Direct Client / Unassigned';

      if (!studioMap.has(sId)) {
        studioMap.set(sId, {
          studioId: sId,
          studioName: sName,
          ownerName: '',
          city: '',
          phone: '',
          totalProjects: 0,
          completedProjects: 0,
          activeProjects: 0,
          totalVolumeAmount: 0,
          turnaroundDaysList: [],
          avgTurnaroundDays: null,
          minTurnaroundDays: null,
          maxTurnaroundDays: null,
          projects: []
        });
      }

      const rec = studioMap.get(sId)!;
      rec.totalProjects += 1;
      rec.totalVolumeAmount += Number(p.projectAmount) || 0;
      rec.projects.push(p);

      if (['delivered', 'closed'].includes(p.status)) {
        rec.completedProjects += 1;
      } else {
        rec.activeProjects += 1;
      }

      const tDays = getProjectTurnaround(p);
      if (tDays !== null) {
        rec.turnaroundDaysList.push(tDays);
      }
    });

    // Compute averages, minimum, and maximum turnaround per studio
    const list = Array.from(studioMap.values()).map(rec => {
      const arr = rec.turnaroundDaysList;
      const avg = arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
      const min = arr.length > 0 ? Math.min(...arr) : null;
      const max = arr.length > 0 ? Math.max(...arr) : null;
      return {
        ...rec,
        avgTurnaroundDays: avg,
        minTurnaroundDays: min,
        maxTurnaroundDays: max
      };
    });

    // Sort by work volume descending
    const sorted = list.sort((a, b) => (b.totalProjects - a.totalProjects) || (b.totalVolumeAmount - a.totalVolumeAmount));

    const totalProjectsInPeriod = sorted.reduce((acc, s) => acc + s.totalProjects, 0);
    const totalVolumeAmountInPeriod = sorted.reduce((acc, s) => acc + s.totalVolumeAmount, 0);

    const allTurnaroundDays = sorted.flatMap(s => s.turnaroundDaysList);
    const fleetAvgTurnaround = allTurnaroundDays.length > 0
      ? Math.round((allTurnaroundDays.reduce((a, b) => a + b, 0) / allTurnaroundDays.length) * 10) / 10
      : null;

    const studiosWithTurnaround = sorted.filter(s => s.avgTurnaroundDays !== null && s.avgTurnaroundDays > 0);
    const fastestStudio = studiosWithTurnaround.length > 0
      ? [...studiosWithTurnaround].sort((a, b) => (a.avgTurnaroundDays || 999) - (b.avgTurnaroundDays || 999))[0]
      : null;

    const topVolumeStudio = sorted.length > 0 && (sorted[0].totalProjects > 0 || sorted[0].totalVolumeAmount > 0)
      ? sorted[0]
      : null;

    // Chart dataset: Average Turnaround Days
    const turnaroundChartData = sorted
      .filter(s => s.avgTurnaroundDays !== null || s.totalProjects > 0)
      .map(s => ({
        name: s.studioName.length > 14 ? `${s.studioName.substring(0, 14)}...` : s.studioName,
        fullName: s.studioName,
        turnaround: s.avgTurnaroundDays || 0,
        projects: s.totalProjects,
        volume: s.totalVolumeAmount
      }));

    // Chart dataset: Volume of Work Processed
    const volumeChartData = sorted
      .filter(s => s.totalProjects > 0 || s.totalVolumeAmount > 0)
      .map(s => ({
        name: s.studioName.length > 14 ? `${s.studioName.substring(0, 14)}...` : s.studioName,
        fullName: s.studioName,
        projects: s.totalProjects,
        completed: s.completedProjects,
        active: s.activeProjects,
        amount: s.totalVolumeAmount,
        amountInK: Math.round(s.totalVolumeAmount / 1000)
      }));

    return {
      studios: sorted,
      totalProjectsInPeriod,
      totalVolumeAmountInPeriod,
      fleetAvgTurnaround,
      fastestStudio,
      topVolumeStudio,
      turnaroundChartData,
      volumeChartData,
      activeRange
    };
  }, [projects, studios, studioQuarter, quarterPresets]);

  // Handler to export Studio Performance CSV
  const handleExportStudioPerformanceCSV = () => {
    try {
      const headers = [
        'Studio Partner',
        'Owner Name',
        'City / Location',
        'Phone',
        'Reporting Period',
        'Total Work Volume (Projects)',
        'Completed / Delivered Films',
        'Active In-Production',
        'Total Contract Volume (INR)',
        'Average Turnaround (Days)',
        'Fastest Turnaround (Days)',
        'Longest Turnaround (Days)',
        'Production Velocity Rating'
      ];

      const rows = studioPerformanceData.studios.map(s => {
        const rating = s.avgTurnaroundDays !== null 
          ? (s.avgTurnaroundDays <= 20 ? 'Express (<20d)' : s.avgTurnaroundDays <= 45 ? 'Standard (20-45d)' : 'Extended (>45d)')
          : (s.totalProjects > 0 ? 'In Production' : 'Idle / No Pipeline');
        return [
          `"${(s.studioName || '').replace(/"/g, '""')}"`,
          `"${(s.ownerName || '').replace(/"/g, '""')}"`,
          `"${(s.city || '').replace(/"/g, '""')}"`,
          `"${(s.phone || '').replace(/"/g, '""')}"`,
          `"${studioPerformanceData.activeRange.label}"`,
          s.totalProjects,
          s.completedProjects,
          s.activeProjects,
          s.totalVolumeAmount,
          s.avgTurnaroundDays !== null ? s.avgTurnaroundDays : 'N/A',
          s.minTurnaroundDays !== null ? s.minTurnaroundDays : 'N/A',
          s.maxTurnaroundDays !== null ? s.maxTurnaroundDays : 'N/A',
          `"${rating}"`
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Studio_Performance_Audit_${studioQuarter}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export Studio Performance CSV:', err);
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [csvExporting, setCsvExporting] = useState(false);
  const [csvExported, setCsvExported] = useState(false);

  const handleExportCSV = () => {
    setCsvExporting(true);
    try {
      // Build RFC-4180 compliant CSV with Excel UTF-8 BOM
      const headers = [
        'Project ID',
        'Wedding Campaign / Couple',
        'Allied Studio Partner',
        'Assigned Editor',
        'Shoot Date',
        'Delivery Date',
        'Status',
        'Contract Gross Amount (INR)',
        'Advance Received (INR)',
        'Pending Receivable (INR)',
        'Editor Payout (INR)',
        'Other Production Expenses (INR)',
        'Total Production Cost (INR)',
        'Net Operating Profit (INR)',
        'Profit Margin (%)'
      ];

      const rows = projectsWithProfit.map(p => {
        const expensesSum = (p.editorPayment || 0) + (p.otherExpenses || 0);
        const advance = p.advancePayment || 0;
        const pending = p.remainingBalance !== undefined ? p.remainingBalance : Math.max(0, (p.projectAmount || 0) - advance);
        return [
          `"${(p.id || '').replace(/"/g, '""')}"`,
          `"${(p.coupleName || p.projectName || '').replace(/"/g, '""')}"`,
          `"${(p.studioName || '').replace(/"/g, '""')}"`,
          `"${(p.assignedEditorName || 'Unassigned').replace(/"/g, '""')}"`,
          `"${p.shootDate || 'N/A'}"`,
          `"${p.deliveryDate || 'N/A'}"`,
          `"${(p.status || '').toUpperCase()}"`,
          p.projectAmount || 0,
          advance,
          pending,
          p.editorPayment || 0,
          p.otherExpenses || 0,
          expensesSum,
          p.profit,
          p.margin.toFixed(2)
        ];
      });

      // Aggregate Summary Totals Row
      const totalRevenue = projectsWithProfit.reduce((sum, p) => sum + (p.projectAmount || 0), 0);
      const totalAdvance = projectsWithProfit.reduce((sum, p) => sum + (p.advancePayment || 0), 0);
      const totalPending = projectsWithProfit.reduce((sum, p) => sum + (p.remainingBalance !== undefined ? p.remainingBalance : Math.max(0, (p.projectAmount || 0) - (p.advancePayment || 0))), 0);
      const totalEditor = projectsWithProfit.reduce((sum, p) => sum + (p.editorPayment || 0), 0);
      const totalOther = projectsWithProfit.reduce((sum, p) => sum + (p.otherExpenses || 0), 0);
      const totalCosts = totalEditor + totalOther;
      const totalProfit = totalRevenue - totalCosts;
      const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : '0.00';

      const totalsRow = [
        '"TOTAL / PORTFOLIO AGGREGATE"',
        `"Total Campaigns: ${projectsWithProfit.length}"`,
        '""',
        '""',
        '""',
        '""',
        '""',
        totalRevenue,
        totalAdvance,
        totalPending,
        totalEditor,
        totalOther,
        totalCosts,
        totalProfit,
        avgMargin
      ];

      const csvContent = [
        '# THE FRAME CUT STUDIO - EXECUTIVE PROFITABILITY AUDIT & TREND REPORT',
        `# Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
        `# Accounting Purpose: Profitability Trends, Production Ledger Reconciliation & Tax Audit`,
        `# Total Gross Revenue: INR ${totalRevenue} | Total Production Outflows: INR ${totalCosts} | Net Profit: INR ${totalProfit} | Portfolio Margin: ${avgMargin}%`,
        '',
        headers.join(','),
        ...rows.map(r => r.join(',')),
        '',
        totalsRow.join(',')
      ].join('\r\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Profitability_Trend_Audit_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setCsvExported(true);
      setTimeout(() => setCsvExported(false), 2500);
    } catch (err) {
      console.error('Error generating CSV:', err);
    } finally {
      setCsvExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Total financial calculations
      const totalRevenue = projects.reduce((sum, p) => sum + (p.projectAmount || 0), 0);
      const totalEditorExpenses = projects.reduce((sum, p) => sum + (p.editorPayment || 0), 0);
      const totalOtherExpenses = projects.reduce((sum, p) => sum + (p.otherExpenses || 0), 0);
      const totalLedgerExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalExpenses = totalEditorExpenses + totalOtherExpenses + totalLedgerExpenses;
      const totalProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      let currentY = 20;

      // Header Brand
      doc.setFillColor(26, 58, 42); // deep forest green
      doc.rect(0, 0, 210, 38, 'F');

      doc.setTextColor(212, 175, 55); // gold
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('THE FRAME CUT STUDIO', 15, 16);

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('STUDIO OPERATING SYSTEM • EXECUTIVE AUDIT REPORT', 15, 22);

      // Date & Metadata right-aligned
      const reportDate = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      doc.setFontSize(8);
      doc.setTextColor(200, 200, 200);
      doc.text(`Generated: ${reportDate}`, 195, 16, { align: 'right' });
      doc.text('Auditor Access: Administrator', 195, 22, { align: 'right' });
      doc.text('Database Connection: Firestore Realtime', 195, 28, { align: 'right' });

      currentY = 48;

      // SECTION 1: EXECUTIVE FINANCIAL SUMMARY
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(26, 58, 42);
      doc.text('I. EXECUTIVE FINANCIAL SUMMARY', 15, currentY);
      
      // Draw a line under heading
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.5);
      doc.line(15, currentY + 2, 195, currentY + 2);
      currentY += 8;

      // Draw 4 bento-style cards for financial metrics
      // Box 1: Gross Bookings
      doc.setFillColor(245, 247, 245);
      doc.rect(15, currentY, 85, 22, 'F');
      doc.setDrawColor(230, 235, 230);
      doc.rect(15, currentY, 85, 22, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text('GROSS BOOKINGS (REVENUE)', 19, currentY + 6);
      doc.setFontSize(14);
      doc.setTextColor(26, 58, 42);
      doc.text(`INR ${totalRevenue.toLocaleString('en-IN')}`, 19, currentY + 15);

      // Box 2: Yield Net Profit
      doc.setFillColor(245, 247, 245);
      doc.rect(110, currentY, 85, 22, 'F');
      doc.rect(110, currentY, 85, 22, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text('YIELD NET PROFIT', 114, currentY + 6);
      doc.setFontSize(14);
      doc.setTextColor(184, 149, 48); // gold
      doc.text(`INR ${totalProfit.toLocaleString('en-IN')}`, 114, currentY + 15);

      currentY += 26;

      // Box 3: Total Expenses
      doc.setFillColor(245, 247, 245);
      doc.rect(15, currentY, 85, 22, 'F');
      doc.rect(15, currentY, 85, 22, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text('TOTAL AUDITED EXPENSES', 19, currentY + 6);
      doc.setFontSize(14);
      doc.setTextColor(180, 50, 50); // Red-ish
      doc.text(`INR ${totalExpenses.toLocaleString('en-IN')}`, 19, currentY + 15);

      // Box 4: Margin %
      doc.setFillColor(245, 247, 245);
      doc.rect(110, currentY, 85, 22, 'F');
      doc.rect(110, currentY, 85, 22, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 110, 100);
      doc.text('NET OPERATING MARGIN', 114, currentY + 6);
      doc.setFontSize(14);
      doc.setTextColor(26, 58, 42);
      doc.text(`${profitMargin.toFixed(1)}%`, 114, currentY + 15);

      currentY += 34;

      // SECTION 2: ALLIANCE PERFORMANCE & OUTCOMES
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(26, 58, 42);
      doc.text('II. ALLIANCE PERFORMANCE & OUTCOMES', 15, currentY);
      
      doc.setDrawColor(212, 175, 55);
      doc.line(15, currentY + 2, 195, currentY + 2);
      currentY += 8;

      // Top Allied Studio details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(34, 34, 34);
      doc.text('TOP ALLIED STUDIO PARTNER:', 15, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(`${topStudioEntry.name} (INR ${topStudioEntry.sales.toLocaleString('en-IN')} cumulative contract value)`, 75, currentY);
      currentY += 6;

      // Top Editor
      doc.setFont('helvetica', 'bold');
      doc.text('TOP PRODUCTIVE TEAM EDITOR:', 15, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(`${topEditorEntry.name} (${topEditorEntry.count} completed wedding films delivered)`, 75, currentY);
      currentY += 6;

      // Lucrative Campaign
      doc.setFont('helvetica', 'bold');
      doc.text('MOST LUCRATIVE WEDDING:', 15, currentY);
      doc.setFont('helvetica', 'normal');
      doc.text(mostProfitableProj ? `${mostProfitableProj.coupleName} (Net Profit: INR ${mostProfitableProj.profit.toLocaleString('en-IN')}, Margin: ${mostProfitableProj.margin.toFixed(0)}%)` : 'None', 75, currentY);
      
      currentY += 14;

      // SECTION 3: OPERATING EXPENSE BREAKDOWN
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(26, 58, 42);
      doc.text('III. OPERATING EXPENSE ALLOCATION BREAKDOWN', 15, currentY);
      doc.setDrawColor(212, 175, 55);
      doc.line(15, currentY + 2, 195, currentY + 2);
      currentY += 8;

      // Table Header for Expenses
      doc.setFillColor(240, 243, 240);
      doc.rect(15, currentY, 180, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(26, 58, 42);
      doc.text('EXPENSE CATEGORY (DESCRIPTION)', 20, currentY + 4.5);
      doc.text('CUMULATIVE CHARGED AMOUNT (INR)', 190, currentY + 4.5, { align: 'right' });
      currentY += 7;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(8.5);

      expenseAllocationData.forEach((item, index) => {
        // Draw alternate rows
        if (index % 2 === 1) {
          doc.setFillColor(250, 251, 250);
          doc.rect(15, currentY, 180, 6, 'F');
        }
        doc.text(item.name, 20, currentY + 4.2);
        doc.text(`INR ${item.value.toLocaleString('en-IN')}`, 190, currentY + 4.2, { align: 'right' });
        currentY += 6;
      });

      currentY += 10;

      // SECTION 4: DETAILED CAMPAIGN AUDITS (TABLE)
      if (currentY > 180) {
        doc.addPage();
        currentY = 20;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('THE FRAME CUT STUDIO — SYSTEM REPORT (CONTINUED)', 15, 12);
        doc.setDrawColor(220, 220, 220);
        doc.line(15, 14, 195, 14);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(26, 58, 42);
      doc.text('IV. INDIVIDUAL CONTRACT MARGIN AUDIT SHEET', 15, currentY);
      doc.setDrawColor(212, 175, 55);
      doc.line(15, currentY + 2, 195, currentY + 2);
      currentY += 8;

      // Table Header for Projects Audit
      doc.setFillColor(26, 58, 42);
      doc.rect(15, currentY, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('PROJECT ID', 18, currentY + 5.5);
      doc.text('WEDDING CAMPAIGN (STUDIO)', 42, currentY + 5.5);
      doc.text('CONTRACT', 105, currentY + 5.5, { align: 'right' });
      doc.text('PAYOUTS', 135, currentY + 5.5, { align: 'right' });
      doc.text('NET PROFIT', 165, currentY + 5.5, { align: 'right' });
      doc.text('MARGIN %', 190, currentY + 5.5, { align: 'right' });
      currentY += 8;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(34, 34, 34);

      projectsWithProfit.forEach((proj, idx) => {
        // Page break logic for each row
        if (currentY > 275) {
          doc.addPage();
          currentY = 20;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text('THE FRAME CUT STUDIO — MARGIN AUDIT SHEET (CONTINUED)', 15, 12);
          doc.setDrawColor(220, 220, 220);
          doc.line(15, 14, 195, 14);
          currentY = 25;

          // Re-draw table header on new page
          doc.setFillColor(26, 58, 42);
          doc.rect(15, currentY, 180, 8, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text('PROJECT ID', 18, currentY + 5.5);
          doc.text('WEDDING CAMPAIGN (STUDIO)', 42, currentY + 5.5);
          doc.text('CONTRACT', 105, currentY + 5.5, { align: 'right' });
          doc.text('PAYOUTS', 135, currentY + 5.5, { align: 'right' });
          doc.text('NET PROFIT', 165, currentY + 5.5, { align: 'right' });
          doc.text('MARGIN %', 190, currentY + 5.5, { align: 'right' });
          currentY += 8;
        }

        // Row background
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 248);
          doc.rect(15, currentY, 180, 7.5, 'F');
        } else {
          doc.setFillColor(255, 255, 255);
          doc.rect(15, currentY, 180, 7.5, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(184, 149, 48); // Gold for ID
        doc.text(proj.id, 18, currentY + 5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(34, 34, 34);
        doc.text(proj.coupleName, 42, currentY + 3.8);
        doc.setFontSize(6.5);
        doc.setTextColor(120, 120, 120);
        doc.text(proj.studioName, 42, currentY + 6.5);

        doc.setFontSize(7.5);
        doc.setTextColor(34, 34, 34);
        doc.text(`INR ${proj.projectAmount.toLocaleString('en-IN')}`, 105, currentY + 5, { align: 'right' });
        const expensesSum = proj.editorPayment + proj.otherExpenses;
        doc.text(`INR ${expensesSum.toLocaleString('en-IN')}`, 135, currentY + 5, { align: 'right' });
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(26, 58, 42); // deep green
        doc.text(`INR ${proj.profit.toLocaleString('en-IN')}`, 165, currentY + 5, { align: 'right' });
        
        doc.setTextColor(184, 149, 48); // Gold margin
        doc.text(`${proj.margin.toFixed(1)}%`, 190, currentY + 5, { align: 'right' });

        currentY += 7.5;
      });

      // SECTION 5: STUDIO PERFORMANCE & TURNAROUND AUDIT
      if (currentY > 200) {
        doc.addPage();
        currentY = 20;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text('THE FRAME CUT STUDIO — STUDIO PERFORMANCE AUDIT', 15, 12);
        doc.setDrawColor(220, 220, 220);
        doc.line(15, 14, 195, 14);
      } else {
        currentY += 12;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(26, 58, 42);
      doc.text(`V. STUDIO PERFORMANCE & PRODUCTION VELOCITY (${studioPerformanceData.activeRange.shortLabel.toUpperCase()})`, 15, currentY);
      doc.setDrawColor(212, 175, 55);
      doc.line(15, currentY + 2, 195, currentY + 2);
      currentY += 8;

      // Studio Performance Summary Line
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(`Quarter: ${studioPerformanceData.activeRange.periodDesc}  |  Fleet Avg Turnaround: ${studioPerformanceData.fleetAvgTurnaround !== null ? `${studioPerformanceData.fleetAvgTurnaround} Days` : 'N/A'}  |  Total Work Volume: INR ${studioPerformanceData.totalVolumeAmountInPeriod.toLocaleString('en-IN')} (${studioPerformanceData.totalProjectsInPeriod} Projects)`, 15, currentY);
      currentY += 6;

      // Table Header for Studio Performance
      doc.setFillColor(26, 58, 42);
      doc.rect(15, currentY, 180, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('STUDIO PARTNER', 18, currentY + 5.5);
      doc.text('VOLUME (PRJ)', 85, currentY + 5.5, { align: 'right' });
      doc.text('CONTRACT VALUE', 125, currentY + 5.5, { align: 'right' });
      doc.text('AVG TURNAROUND', 160, currentY + 5.5, { align: 'right' });
      doc.text('VELOCITY TIER', 190, currentY + 5.5, { align: 'right' });
      currentY += 8;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(34, 34, 34);

      studioPerformanceData.studios.forEach((s, idx) => {
        if (currentY > 275) {
          doc.addPage();
          currentY = 20;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text('THE FRAME CUT STUDIO — STUDIO PERFORMANCE AUDIT (CONTINUED)', 15, 12);
          doc.setDrawColor(220, 220, 220);
          doc.line(15, 14, 195, 14);
          currentY = 25;

          // Re-draw table header on new page
          doc.setFillColor(26, 58, 42);
          doc.rect(15, currentY, 180, 8, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.text('STUDIO PARTNER', 18, currentY + 5.5);
          doc.text('VOLUME (PRJ)', 85, currentY + 5.5, { align: 'right' });
          doc.text('CONTRACT VALUE', 125, currentY + 5.5, { align: 'right' });
          doc.text('AVG TURNAROUND', 160, currentY + 5.5, { align: 'right' });
          doc.text('VELOCITY TIER', 190, currentY + 5.5, { align: 'right' });
          currentY += 8;
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 248);
          doc.rect(15, currentY, 180, 7.5, 'F');
        } else {
          doc.setFillColor(255, 255, 255);
          doc.rect(15, currentY, 180, 7.5, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(34, 34, 34);
        doc.text(s.studioName, 18, currentY + 4);
        doc.setFontSize(6.5);
        doc.setTextColor(120, 120, 120);
        doc.text(s.ownerName ? `${s.ownerName}${s.city ? ` • ${s.city}` : ''}` : (s.city || 'Partner Studio'), 18, currentY + 6.5);

        doc.setFontSize(7.5);
        doc.setTextColor(34, 34, 34);
        doc.text(`${s.totalProjects} (${s.completedProjects} done)`, 85, currentY + 5, { align: 'right' });
        doc.text(`INR ${s.totalVolumeAmount.toLocaleString('en-IN')}`, 125, currentY + 5, { align: 'right' });
        
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(184, 149, 48); // Gold
        doc.text(s.avgTurnaroundDays !== null ? `${s.avgTurnaroundDays} Days` : 'N/A', 160, currentY + 5, { align: 'right' });

        const velocityTier = s.avgTurnaroundDays !== null
          ? (s.avgTurnaroundDays <= 20 ? 'Express' : s.avgTurnaroundDays <= 45 ? 'Standard' : 'Extended')
          : (s.totalProjects > 0 ? 'In Queue' : 'Idle');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(26, 58, 42);
        doc.text(velocityTier, 190, currentY + 5, { align: 'right' });

        currentY += 7.5;
      });

      // Footer
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
      currentY += 10;
      doc.setDrawColor(220, 220, 220);
      doc.line(15, currentY, 195, currentY);
      currentY += 6;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('This is a computer-generated luxury management accounting audit sheet. Confirmed via Studio OS Secure Database.', 15, currentY);
      doc.text('THE FRAME CUT STUDIO © 2026. ALL RIGHTS RESERVED.', 195, currentY, { align: 'right' });

      // Save PDF
      doc.save(`The_Frame_Cut_Studio_Operating_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-white">System Reports & Margin Audits</h2>
          <p className="text-xs text-gray-400 mt-1">Durable financial ledgers, studio conversions, and editor volumes</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={csvExporting}
            id="export-profitability-csv-btn"
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-950/80 to-luxury-green-900/90 hover:from-emerald-900 hover:to-luxury-green-800 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 font-mono text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-black/20"
          >
            {csvExported ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">CSV DOWNLOADED</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>{csvExporting ? 'EXPORTING CSV...' : 'EXPORT TO CSV'}</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            id="download-pdf-report-btn"
            className="px-4 py-2.5 bg-gradient-to-r from-luxury-green-800 to-luxury-green-900 hover:from-luxury-green-700 hover:to-luxury-green-800 border border-gold-500/30 text-gold-400 hover:text-gold-300 font-mono text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-black/20"
          >
            <FileDown className="w-4 h-4" />
            {isGenerating ? 'GENERATING PDF...' : 'DOWNLOAD PDF REPORT'}
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Top Studio card */}
        <div className="p-6 rounded-3xl glass-panel relative overflow-hidden flex flex-col justify-between h-40">
          <div className="absolute top-0 right-0 w-24 h-24 bg-luxury-green-800/10 rounded-full blur-xl" />
          <div className="flex justify-between items-start">
            <span className="text-gray-400 text-xs font-mono uppercase">Top Allied Studio</span>
            <div className="p-2 bg-luxury-green-950 rounded-xl">
              <Building2 className="w-4 h-4 text-gold-400" />
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold text-white font-display leading-tight">{topStudioEntry.name}</h4>
            <p className="text-[10px] text-gold-400 font-mono mt-1">₹{topStudioEntry.sales.toLocaleString('en-IN')} Cumulative volume</p>
          </div>
        </div>

        {/* Top Editor card */}
        <div className="p-6 rounded-3xl glass-panel relative overflow-hidden flex flex-col justify-between h-40">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/5 rounded-full blur-xl" />
          <div className="flex justify-between items-start">
            <span className="text-gray-400 text-xs font-mono uppercase">Top Productive Editor</span>
            <div className="p-2 bg-charcoal-900 rounded-xl">
              <UserCheck className="w-4 h-4 text-gold-400" />
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold text-white font-display leading-tight">{topEditorEntry.name}</h4>
            <p className="text-[10px] text-gray-400 font-mono mt-1">{topEditorEntry.count} wedding films delivered</p>
          </div>
        </div>

        {/* Most Profitable wedding card */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-luxury-green-950/40 to-charcoal-900 border border-gold-500/30 relative overflow-hidden flex flex-col justify-between h-40 gold-glow">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gold-500/10 rounded-full blur-xl" />
          <div className="flex justify-between items-start">
            <span className="text-gold-300 text-xs font-mono uppercase">Most Lucrative Engagement</span>
            <div className="p-2 bg-gold-500/10 rounded-xl">
              <Sparkles className="w-4 h-4 text-gold-400" />
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold text-white font-display leading-tight truncate">
              {mostProfitableProj ? mostProfitableProj.coupleName : 'None'}
            </h4>
            <p className="text-[10px] text-gold-400 font-mono mt-1">
              ₹{mostProfitableProj ? mostProfitableProj.profit.toLocaleString('en-IN') : 0} Margin ({mostProfitableProj ? mostProfitableProj.margin.toFixed(0) : 0}%)
            </p>
          </div>
        </div>
      </div>

      {/* ================= 2. STUDIO PERFORMANCE SECTION ================= */}
      <section id="studio-performance-section" aria-label="Studio Performance" className="p-6 sm:p-8 rounded-3xl glass-panel relative border border-luxury-green-800/30 space-y-6 shadow-2xl">
        {/* Section Header & Period Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Quarterly Partner Velocity
              </span>
              <span className="text-xs text-gray-400 font-mono hidden sm:inline">•</span>
              <span className="text-xs text-emerald-400 font-mono hidden sm:inline">
                {studioPerformanceData.activeRange.periodDesc}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2">
              <span>Studio Performance</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
              Calculates average project turnaround time (shoot-to-delivery) and total volume of work processed per studio partner over the selected quarter.
            </p>
          </div>

          {/* Quarter Selection Buttons & CSV Export */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-1 rounded-2xl bg-charcoal-950/80 border border-white/10 flex flex-wrap gap-1">
              {(Object.keys(quarterPresets) as QuarterFilter[]).map((qKey) => {
                const preset = quarterPresets[qKey];
                const isActive = studioQuarter === qKey;
                return (
                  <button
                    key={qKey}
                    id={`quarter-btn-${qKey}`}
                    onClick={() => setStudioQuarter(qKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-gold-500 text-charcoal-950 font-bold shadow-md shadow-gold-500/20'
                        : 'text-gray-400 hover:text-white hover:bg-charcoal-800'
                    }`}
                  >
                    {isActive && <CheckCircle2 className="w-3 h-3 text-charcoal-950" />}
                    <span>{preset.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            <button
              id="export-studio-perf-csv-btn"
              onClick={handleExportStudioPerformanceCSV}
              className="px-3.5 py-1.5 rounded-xl bg-charcoal-900/90 hover:bg-charcoal-800 border border-gold-500/30 text-gold-300 hover:text-gold-200 text-xs font-mono transition-all flex items-center gap-1.5 shadow-sm"
              title="Export Studio Performance to CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-gold-400" />
              <span className="hidden sm:inline">Studio CSV</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards for Studio Performance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Average Project Turnaround */}
          <div className="p-4 sm:p-5 rounded-2xl bg-charcoal-900/60 border border-white/5 hover:border-gold-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Avg Project Turnaround</span>
              <div className="p-2 rounded-xl bg-gold-500/10 text-gold-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-display text-white">
                  {studioPerformanceData.fleetAvgTurnaround !== null ? `${studioPerformanceData.fleetAvgTurnaround}` : 'N/A'}
                </span>
                {studioPerformanceData.fleetAvgTurnaround !== null && (
                  <span className="text-xs font-mono text-gold-400 font-semibold">Days Avg</span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1 font-mono flex items-center gap-1">
                <Timer className="w-3 h-3 text-gold-400/70 shrink-0" />
                <span>Shoot to delivery elapsed time</span>
              </p>
            </div>
          </div>

          {/* Card 2: Total Volume Processed */}
          <div className="p-4 sm:p-5 rounded-2xl bg-charcoal-900/60 border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Total Volume Processed</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-display text-emerald-400 truncate">
                  ₹{studioPerformanceData.totalVolumeAmountInPeriod.toLocaleString('en-IN')}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1 font-mono flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{studioPerformanceData.totalProjectsInPeriod} total projects processed</span>
              </p>
            </div>
          </div>

          {/* Card 3: Fastest Turnaround Partner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-charcoal-900/60 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Fastest Turnaround</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold font-display text-white truncate">
                {studioPerformanceData.fastestStudio ? studioPerformanceData.fastestStudio.studioName : 'No Deliveries Yet'}
              </div>
              <p className="text-[11px] text-amber-400 mt-1 font-mono flex items-center gap-1">
                <span>
                  {studioPerformanceData.fastestStudio && studioPerformanceData.fastestStudio.avgTurnaroundDays !== null
                    ? `${studioPerformanceData.fastestStudio.avgTurnaroundDays} Days Avg delivery`
                    : 'Pending completed films'}
                </span>
              </p>
            </div>
          </div>

          {/* Card 4: Top Work Volume Partner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-charcoal-900/60 border border-white/5 hover:border-luxury-green-500/30 transition-all flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Top Volume Partner</span>
              <div className="p-2 rounded-xl bg-luxury-green-900/80 text-emerald-300">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold font-display text-white truncate">
                {studioPerformanceData.topVolumeStudio ? studioPerformanceData.topVolumeStudio.studioName : 'No Projects'}
              </div>
              <p className="text-[11px] text-emerald-400 mt-1 font-mono truncate">
                {studioPerformanceData.topVolumeStudio
                  ? `₹${studioPerformanceData.topVolumeStudio.totalVolumeAmount.toLocaleString('en-IN')} (${studioPerformanceData.topVolumeStudio.totalProjects} films)`
                  : 'Zero volume in period'}
              </p>
            </div>
          </div>
        </div>

        {/* Visual Charts: Turnaround Days vs Work Volume */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Chart 1: Average Turnaround Time by Studio */}
          <div className="p-5 rounded-2xl bg-charcoal-900/50 border border-white/5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold font-display text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gold-400" />
                  <span>Average Turnaround Time per Studio</span>
                </h4>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                  Elapsed days from shoot / intake to delivery (lower is faster)
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gold-500/10 text-gold-400 border border-gold-500/20">
                Benchmark: 30d
              </span>
            </div>

            <SafeChartContainer height={240} minHeight={200}>
              {studioPerformanceData.turnaroundChartData.length > 0 ? (
                <BarChart data={studioPerformanceData.turnaroundChartData} margin={{ top: 15, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#777" 
                    fontSize={10} 
                    fontFamily="monospace"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis 
                    stroke="#777" 
                    fontSize={10} 
                    fontFamily="monospace"
                    unit="d"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#16181b', 
                      borderColor: '#D4AF37', 
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                    formatter={(val: any) => [
                      `${val} Days (${val <= 20 ? '⚡ Express' : val <= 45 ? '⏱️ Standard' : '⏳ Extended'})`,
                      'Avg Turnaround'
                    ]}
                    labelFormatter={(label, items) => {
                      const found = items?.[0]?.payload?.fullName || label;
                      return `Studio: ${found}`;
                    }}
                  />
                  <ReferenceLine y={30} stroke="#D4AF37" strokeDasharray="4 4" label={{ value: '30d Benchmark', fill: '#D4AF37', fontSize: 9, position: 'top' }} />
                  <Bar dataKey="turnaround" radius={[6, 6, 0, 0]}>
                    {studioPerformanceData.turnaroundChartData.map((entry, idx) => (
                      <Cell 
                        key={`turnaround-cell-${idx}`} 
                        fill={entry.turnaround <= 20 ? '#10B981' : entry.turnaround <= 40 ? '#D4AF37' : '#F59E0B'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                  <Info className="w-8 h-8 mb-2 opacity-40 text-gold-400" />
                  <p className="text-xs font-mono">No turnaround data recorded in {studioPerformanceData.activeRange.shortLabel}</p>
                </div>
              )}
            </SafeChartContainer>
          </div>

          {/* Chart 2: Total Volume Processed by Studio */}
          <div className="p-5 rounded-2xl bg-charcoal-900/50 border border-white/5 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold font-display text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Total Work Volume Processed per Studio</span>
                </h4>
                <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                  Gross contract value (₹ in thousands) and projects processed
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                INR Thousands (k)
              </span>
            </div>

            <SafeChartContainer height={240} minHeight={200}>
              {studioPerformanceData.volumeChartData.length > 0 ? (
                <BarChart data={studioPerformanceData.volumeChartData} margin={{ top: 15, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#777" 
                    fontSize={10} 
                    fontFamily="monospace"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis 
                    stroke="#777" 
                    fontSize={10} 
                    fontFamily="monospace"
                    unit="k"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#16181b', 
                      borderColor: '#10B981', 
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                    formatter={(val: any, name: any, item: any) => {
                      const payload = item?.payload;
                      return [
                        `₹${(payload?.amount || 0).toLocaleString('en-IN')} (${payload?.projects || 0} films, ${payload?.completed || 0} delivered)`,
                        'Gross Contract Volume'
                      ];
                    }}
                    labelFormatter={(label, items) => {
                      const found = items?.[0]?.payload?.fullName || label;
                      return `Studio: ${found}`;
                    }}
                  />
                  <Bar dataKey="amountInK" fill="#1A3A2A" stroke="#10B981" strokeWidth={1} radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
                  <Info className="w-8 h-8 mb-2 opacity-40 text-emerald-400" />
                  <p className="text-xs font-mono">No work volume processed in {studioPerformanceData.activeRange.shortLabel}</p>
                </div>
              )}
            </SafeChartContainer>
          </div>
        </div>

        {/* Detailed Studio Performance Table */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h4 className="text-sm font-bold font-display text-white">Studio Performance Breakdown</h4>
              <p className="text-[11px] text-gray-400 font-mono">
                Comparative metrics for each registered studio partner in {studioPerformanceData.activeRange.label}
              </p>
            </div>
            <div className="text-[11px] font-mono text-gray-400">
              Showing <strong className="text-gold-400">{studioPerformanceData.studios.length}</strong> studio partners
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar border border-white/5 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-white/10 bg-charcoal-950/80 text-gray-400 font-mono uppercase text-[10px] tracking-wider">
                  <th className="p-3.5">Allied Studio Partner</th>
                  <th className="p-3.5 text-center">Work Volume Processed</th>
                  <th className="p-3.5 text-right">Contract Volume (INR)</th>
                  <th className="p-3.5 text-center">Avg Turnaround Time</th>
                  <th className="p-3.5 text-center">Turnaround Span</th>
                  <th className="p-3.5 text-right">Production Velocity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {studioPerformanceData.studios.length > 0 ? (
                  studioPerformanceData.studios.map((studio, idx) => {
                    const avg = studio.avgTurnaroundDays;
                    const isExpress = avg !== null && avg <= 20;
                    const isStandard = avg !== null && avg > 20 && avg <= 45;
                    const isExtended = avg !== null && avg > 45;

                    return (
                      <tr 
                        key={studio.studioId || `studio-row-${idx}`}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Studio Identity */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 font-bold font-display shrink-0">
                              {studio.studioName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white leading-snug flex items-center gap-1.5">
                                <span>{studio.studioName}</span>
                                {studio.tier && (
                                  <span className="px-1.5 py-0.2 rounded bg-gold-500/10 border border-gold-500/20 text-gold-300 text-[9px] font-mono">
                                    {studio.tier}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {studio.ownerName ? `${studio.ownerName}${studio.city ? ` • ${studio.city}` : ''}` : (studio.city || 'Registered Partner')}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Work Volume Processed */}
                        <td className="p-3.5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold font-mono text-white text-sm">
                              {studio.totalProjects} {studio.totalProjects === 1 ? 'Project' : 'Projects'}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">
                              {studio.completedProjects} delivered • {studio.activeProjects} active
                            </span>
                          </div>
                        </td>

                        {/* Contract Volume (INR) */}
                        <td className="p-3.5 text-right font-mono">
                          <div className="font-bold text-emerald-400 text-sm">
                            ₹{studio.totalVolumeAmount.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {studio.totalProjects > 0 
                              ? `Avg ₹${Math.round(studio.totalVolumeAmount / studio.totalProjects).toLocaleString('en-IN')}/prj`
                              : 'No contracts'
                            }
                          </div>
                        </td>

                        {/* Average Turnaround Time */}
                        <td className="p-3.5 text-center font-mono">
                          {avg !== null ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-charcoal-950 border border-white/10">
                              <Clock className={`w-3 h-3 ${isExpress ? 'text-emerald-400' : isStandard ? 'text-gold-400' : 'text-amber-400'}`} />
                              <span className="font-bold text-white">{avg} Days</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 font-mono text-xs italic">
                              {studio.totalProjects > 0 ? 'In Pipeline' : 'No Data'}
                            </span>
                          )}
                        </td>

                        {/* Turnaround Span (Min - Max) */}
                        <td className="p-3.5 text-center font-mono text-[11px] text-gray-400">
                          {studio.minTurnaroundDays !== null && studio.maxTurnaroundDays !== null ? (
                            <span>{studio.minTurnaroundDays}d – {studio.maxTurnaroundDays}d</span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>

                        {/* Production Velocity Badge */}
                        <td className="p-3.5 text-right">
                          {avg !== null ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold ${
                              isExpress
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : isStandard
                                ? 'bg-gold-500/10 text-gold-400 border border-gold-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}>
                              {isExpress && <Zap className="w-3 h-3" />}
                              {isStandard && <CheckCircle2 className="w-3 h-3" />}
                              {isExtended && <Timer className="w-3 h-3" />}
                              {isExpress ? 'Express Velocity' : isStandard ? 'Standard Lead' : 'Extended Cycle'}
                            </span>
                          ) : studio.totalProjects > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              <Activity className="w-3 h-3" />
                              Active Flow
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono bg-gray-500/10 text-gray-400 border border-gray-500/20">
                              Idle Pipeline
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 font-mono text-xs">
                      No allied studio records found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Quarter switch hint if empty in selected quarter */}
          {studioPerformanceData.totalProjectsInPeriod === 0 && (
            <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20 text-xs font-mono text-gold-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-gold-400 shrink-0" />
                <span>No project records strictly fall in {studioPerformanceData.activeRange.shortLabel}.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStudioQuarter('current_quarter')}
                  className="px-2.5 py-1 rounded bg-gold-500/20 hover:bg-gold-500/30 text-gold-200 text-[11px] font-bold transition-all"
                >
                  View Current Qtr (Q2)
                </button>
                <button
                  onClick={() => setStudioQuarter('all_time')}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-[11px] transition-all"
                >
                  View All-Time
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Interactive Charts block */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Margin Distribution chart */}
        <div className="p-6 rounded-3xl glass-panel relative">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold font-display text-white">Profit margins per campaign</h3>
              <p className="text-xs text-gray-400 mt-1">Contract gross values versus company profit cuts</p>
            </div>
            <button
              onClick={handleExportCSV}
              title="Export margin trends to CSV"
              className="px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-medium rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>
          </div>

          <SafeChartContainer height={288} minHeight={240}>
            {profitMarginTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={288} minWidth={100}>
                <LineChart data={profitMarginTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 85, 70, 0.05)" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0e131b] border border-gold-500/40 p-3.5 rounded-2xl text-xs font-mono text-gray-200 shadow-2xl space-y-2.5 min-w-[240px] backdrop-blur-xl">
                            <div className="flex items-start justify-between border-b border-white/10 pb-2 gap-2">
                              <div>
                                <span className="font-bold text-white text-xs block font-display tracking-wide">{data.fullName || data.name}</span>
                                <span className="text-[10px] text-gray-400 font-mono block">{data.studio} • {data.id}</span>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${
                                data.margin >= 50 
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                                  : data.margin >= 30 
                                  ? 'bg-gold-500/20 text-gold-300 border-gold-500/40' 
                                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              }`}>
                                {data.margin ? Number(data.margin).toFixed(1) : '0'}% Margin
                              </span>
                            </div>

                            <div className="space-y-1.5 text-[11px]">
                              <div className="flex justify-between items-center text-emerald-400">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                  <span>Contract Gross Value:</span>
                                </span>
                                <span className="font-bold">₹{Number(data.Amount || 0).toLocaleString('en-IN')}</span>
                              </div>

                              <div className="flex justify-between items-center text-rose-400">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                                  <span>Production Costs:</span>
                                </span>
                                <span className="font-bold">₹{Number(data.Expenses || 0).toLocaleString('en-IN')}</span>
                              </div>

                              {data.editorPayment > 0 && (
                                <div className="flex justify-between items-center text-gray-400 pl-3.5 text-[10px]">
                                  <span>↳ Editor Payout:</span>
                                  <span>₹{Number(data.editorPayment).toLocaleString('en-IN')}</span>
                                </div>
                              )}

                              {data.otherExpenses > 0 && (
                                <div className="flex justify-between items-center text-gray-400 pl-3.5 text-[10px]">
                                  <span>↳ Other Expenses:</span>
                                  <span>₹{Number(data.otherExpenses).toLocaleString('en-IN')}</span>
                                </div>
                              )}

                              <div className="border-t border-white/10 pt-2 flex justify-between items-center text-gold-300 font-bold">
                                <span className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-gold-400" />
                                  <span>Net Operating Profit:</span>
                                </span>
                                <span className="text-xs">₹{Number(data.Profit || 0).toLocaleString('en-IN')}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="Amount" stroke="#1e5546" strokeWidth={3} activeDot={{ r: 8 }} name="Contract value" />
                  <Line type="monotone" dataKey="Profit" stroke="#d4af37" strokeWidth={3} name="Operating Profit" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 font-mono text-xs">No project margin history log.</div>
            )}
          </SafeChartContainer>
        </div>

        {/* Expense categories allocation pie chart */}
        <div className="p-6 rounded-3xl glass-panel relative">
          <div>
            <h3 className="text-lg font-bold font-display text-white">Operating expense allocations</h3>
            <p className="text-xs text-gray-400 mb-6">Category shares including freelance payouts & offices</p>
          </div>

          <div className="h-72 flex flex-col md:flex-row items-center justify-between">
            <SafeChartContainer height={288} minHeight={240} className="w-full md:w-1/2">
              {expenseAllocationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={288} minWidth={100}>
                  <PieChart>
                    <Pie
                      data={expenseAllocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expenseAllocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#0e131b] border border-gold-500/40 p-3.5 rounded-2xl text-xs font-mono text-gray-200 shadow-2xl space-y-2 min-w-[210px] backdrop-blur-xl">
                              <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                                <span className="font-bold text-white text-xs">{data.name}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-gold-300 font-bold">
                                  {data.sharePct}% share
                                </span>
                              </div>

                              <div className="space-y-1.5 text-[11px]">
                                <div className="flex justify-between items-center text-gray-300">
                                  <span>Allocated Expense:</span>
                                  <span className="font-bold text-emerald-400 text-xs">
                                    ₹{Number(data.value || 0).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-gray-400 text-[10px] pt-1 border-t border-white/5">
                                  <span>Total Outflow Pool:</span>
                                  <span className="text-gray-200 font-mono">₹{totalExpenseSum.toLocaleString('en-IN')}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 font-mono text-xs">No recorded expense ledger.</div>
              )}
            </SafeChartContainer>

            <div className="w-full md:w-1/2 space-y-2 mt-4 md:mt-0 font-mono text-[11px] text-gray-400 max-h-[220px] overflow-y-auto">
              {expenseAllocationData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center pr-4">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                    <span className="truncate max-w-[120px]">{item.name}</span>
                  </div>
                  <span className="text-gray-200 font-bold">₹{item.value.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed campaign audits list */}
      <div className="p-6 rounded-3xl glass-panel">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold font-display text-white">Engagement Margin Audit Sheet</h3>
            <p className="text-xs text-gray-400 mt-1">Individual contract accounting audits for tax seasons</p>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={csvExporting}
            className="px-3 py-1.5 bg-luxury-green-950/70 hover:bg-luxury-green-900 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 font-mono text-xs font-semibold rounded-xl flex items-center gap-2 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXPORT AUDIT CSV</span>
          </button>
        </div>

        <div className="rounded-2xl border border-luxury-green-800/10 overflow-hidden bg-charcoal-950/20 text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-charcoal-900 text-gray-400 font-mono text-[10px] uppercase border-b border-luxury-green-800/20">
                  <th className="p-4">Project ID</th>
                  <th className="p-4">Wedding Campaign</th>
                  <th className="p-4">Contract Price</th>
                  <th className="p-4">Assigned Payouts</th>
                  <th className="p-4">Net Season Profits</th>
                  <th className="p-4 pr-6 text-right">Net Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-luxury-green-800/10 font-sans text-gray-300">
                {projectsWithProfit.map((proj) => {
                  const expensesSum = proj.editorPayment + proj.otherExpenses;
                  return (
                    <tr key={proj.id} className="hover:bg-luxury-green-950/10">
                      <td className="p-4 font-mono text-gold-500 text-xs">{proj.id}</td>
                      <td className="p-4">
                        <span className="font-bold text-gray-200 block">{proj.coupleName}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{proj.studioName}</span>
                      </td>
                      <td className="p-4 font-mono">₹{proj.projectAmount.toLocaleString('en-IN')}</td>
                      <td className="p-4 font-mono text-red-400">₹{expensesSum.toLocaleString('en-IN')}</td>
                      <td className="p-4 font-mono text-emerald-400 font-bold">₹{proj.profit.toLocaleString('en-IN')}</td>
                      <td className="p-4 pr-6 text-right font-mono font-bold text-gold-400">{proj.margin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
