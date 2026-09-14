import React, { useState, useEffect, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import GstInvoiceSheet from './GstInvoiceSheet';
import { numberToWordsIndian } from '../utils/numberToWords';
import { 
  captureElementToCanvas, 
  generateVectorGstInvoicePdf, 
  generateInvoicePdfFromElement,
  saveOrDownloadPdf,
  GstInvoiceData 
} from '../utils/pdfExport';
import { 
  Building2, 
  Calendar, 
  Plus, 
  Eye, 
  FileText, 
  FileCheck,
  CheckCircle2,
  Send, 
  Mail, 
  Printer, 
  Save, 
  Check, 
  QrCode, 
  Trash2, 
  Sparkles,
  IndianRupee,
  Film,
  Download,
  X,
  Loader2,
  MessageSquare,
  CreditCard,
  Wallet,
  Clock,
  AlertTriangle,
  LayoutGrid,
  List,
  Search,
  Percent,
  Sliders,
  Columns,
  Maximize2,
  MoreVertical,
  MoreHorizontal,
  Zap,
  Copy,
  ExternalLink,
  ChevronDown,
  CheckSquare,
  Square,
  MinusSquare,
  ListChecks,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  ZoomIn,
  Bookmark,
  BookmarkCheck,
  CheckCheck,
  PenTool,
  Eraser
} from 'lucide-react';
import { Studio, Project, PaymentHistory, UserProfile, StudioInvoiceCustomItem } from '../types';
import { MS_PER_DAY } from '../utils';

export interface SavedQrProfile {
  id: string;
  name: string;
  bankOrApp: string;
  upiId: string;
  accountHolder: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  imageUrl: string;
  type: 'preset' | 'custom_upload' | 'auto_generated';
  badgeColor?: string;
  isDefault?: boolean;
  notes?: string;
  addedAt?: string;
}

export const DEFAULT_SAVED_QR_PROFILES: SavedQrProfile[] = [
  {
    id: 'preset-icici',
    name: 'ICICI Bank Current A/c (Official)',
    bankOrApp: 'ICICI Bank',
    upiId: '7772999933@upi',
    accountHolder: 'SATISH TIWARI',
    bankName: 'ICICI BANK',
    accountNumber: '390701503993',
    ifscCode: 'ICIC0003907',
    imageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=' + encodeURIComponent('upi://pay?pa=7772999933@upi&pn=SATISH%20TIWARI&cu=INR'),
    type: 'preset',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    isDefault: true,
    notes: 'Primary registered studio current account'
  },
  {
    id: 'preset-phonepe',
    name: 'PhonePe Studio Standee (0% MDR)',
    bankOrApp: 'PhonePe Merchant',
    upiId: '7772999933@ybl',
    accountHolder: 'THE FRAME CUT STUDIO',
    bankName: 'YES BANK',
    accountNumber: '390701503993',
    ifscCode: 'ICIC0003907',
    imageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=' + encodeURIComponent('upi://pay?pa=7772999933@ybl&pn=THE%20FRAME%20CUT%20STUDIO&cu=INR'),
    type: 'preset',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    notes: 'Fast UPI settlement QR standee'
  },
  {
    id: 'preset-gpay',
    name: 'Google Pay for Business',
    bankOrApp: 'Google Pay',
    upiId: '7772999933@okaxis',
    accountHolder: 'THE FRAME CUT STUDIO',
    bankName: 'AXIS BANK',
    accountNumber: '390701503993',
    ifscCode: 'UTIB0000001',
    imageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=' + encodeURIComponent('upi://pay?pa=7772999933@okaxis&pn=THE%20FRAME%20CUT%20STUDIO&cu=INR'),
    type: 'preset',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    notes: 'Instant Google Pay verified merchant'
  },
  {
    id: 'preset-hdfc',
    name: 'HDFC SmartHub Vyapar QR',
    bankOrApp: 'HDFC Bank',
    upiId: '7772999933@hdfcbank',
    accountHolder: 'THE FRAME CUT',
    bankName: 'HDFC BANK',
    accountNumber: '50200088991122',
    ifscCode: 'HDFC0001234',
    imageUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=' + encodeURIComponent('upi://pay?pa=7772999933@hdfcbank&pn=THE%20FRAME%20CUT&cu=INR'),
    type: 'preset',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30',
    notes: 'HDFC SmartHub POS & Soundbox integration'
  }
];

export interface WhatsAppInvoiceTemplate {
  id: string;
  stageName: string;
  description: string;
  badge: string;
  color: string;
  templateText: string;
}

const DEFAULT_INVOICE_WA_TEMPLATES: Record<string, WhatsAppInvoiceTemplate> = {
  billing: {
    id: 'billing',
    stageName: 'Initial Tax Invoice & Billing',
    description: 'Standard format when generating a new tax invoice or project breakdown',
    badge: 'STAGE 1',
    color: 'emerald',
    templateText: `*TAX INVOICE: {INVOICE_NO}*
*Studio:* {STUDIO_NAME}
*Issued Date:* {ISSUED_DATE}
*Due Date:* {DUE_DATE}
*Status:* {STATUS}

*PROJECT & SERVICES BREAKDOWN:*
{PROJECT_LIST}

*Taxable Amount:* ₹{PROJECT_TOTAL}
{GST_BREAKDOWN}{PREVIOUS_BALANCE}{ADVANCE_ADJUST}{DISCOUNT}----------------------------
*TOTAL PAYABLE: ₹{TOTAL_PAYABLE}*
_Amount in words: {AMOUNT_IN_WORDS}_

{PDF_ATTACHMENT}*BANK DETAILS FOR PAYMENT:*
A/C Holder: {ACCOUNT_HOLDER}
Bank: {BANK_NAME}
A/C No: {ACCOUNT_NUMBER}
IFSC: {IFSC_CODE}
UPI ID: {UPI_ID}

{DRIVE_LINK}{NOTES}Thank you for choosing The Frame Cut Studio & Post-Production Suite!`
  },
  reminder: {
    id: 'reminder',
    stageName: 'Payment Reminder / Follow-up',
    description: 'Polite reminder notice for pending invoice balance',
    badge: 'STAGE 2',
    color: 'amber',
    templateText: `*PAYMENT REMINDER - INVOICE {INVOICE_NO}*

Dear {STUDIO_NAME},

This is a gentle reminder regarding the pending balance of *₹{TOTAL_PAYABLE}* for Invoice *{INVOICE_NO}* issued on {ISSUED_DATE} (Due: {DUE_DATE}).

*Payment Summary:*
• Taxable Amount: ₹{PROJECT_TOTAL}
• Balance Payable: *₹{TOTAL_PAYABLE}*
• Status: *{STATUS}*

{PDF_ATTACHMENT}*PAYMENT OPTIONS:*
• UPI ID: {UPI_ID}
• Bank: {BANK_NAME} | A/C: {ACCOUNT_NUMBER} | IFSC: {IFSC_CODE}
• Account Holder: {ACCOUNT_HOLDER}

Kindly acknowledge or clear the pending amount at your earliest convenience. Thank you!`
  },
  partial_advance: {
    id: 'partial_advance',
    stageName: 'Advance / Partial Payment Receipt',
    description: 'Acknowledgement sent when advance or partial payment is received',
    badge: 'STAGE 3',
    color: 'blue',
    templateText: `*PARTIAL PAYMENT RECEIPT - INVOICE {INVOICE_NO}*

Dear {STUDIO_NAME},

We have received partial payment/advance for Invoice *{INVOICE_NO}* (Issued: {ISSUED_DATE}, Due: {DUE_DATE}).

*Updated Ledger Summary:*
• Taxable Amount: ₹{PROJECT_TOTAL}
• Advance Received: -₹{ADVANCE_TOTAL}
• Discount: -₹{DISCOUNT}
• *REMAINING PAYABLE BALANCE: ₹{TOTAL_PAYABLE}*

{PDF_ATTACHMENT}*BANK / UPI DETAILS:*
UPI ID: {UPI_ID}
Bank: {BANK_NAME} ({ACCOUNT_NUMBER})

Thank you for your payment!`
  },
  paid_settled: {
    id: 'paid_settled',
    stageName: 'Full Settlement & File Delivery',
    description: 'Confirmation sent when full payment is received & files are delivered',
    badge: 'STAGE 4',
    color: 'purple',
    templateText: `*INVOICE SETTLED & PAID IN FULL - {INVOICE_NO}*

Dear {STUDIO_NAME},

Thank you! We have received full payment of *₹{TOTAL_PAYABLE}* for Invoice *{INVOICE_NO}* (Issued: {ISSUED_DATE}).

*Google Drive Delivery Link:*
{DRIVE_LINK}

{PDF_ATTACHMENT}It was an absolute pleasure working with you. Looking forward to our next project together!`
  }
};

const PREDEFINED_SERVICE_TEMPLATES = [
  { description: '4K Cinematic Wedding Film & Story Highlight', sacCode: '998314', unitRate: 45000, category: 'Wedding Film' },
  { description: '60-Sec Instagram Reel & Teaser (Speed Ramp + Sound Design)', sacCode: '998314', unitRate: 15000, category: 'Teaser' },
  { description: 'Full Length Traditional Wedding Video (2-3 Hours Edit)', sacCode: '998314', unitRate: 25000, category: 'Traditional' },
  { description: 'Master Color Grading Suite (DaVinci Resolve Studio 10-bit)', sacCode: '998314', unitRate: 18000, category: 'Color Suite' },
  { description: 'Pre-Wedding Shoot & Story Edit Package', sacCode: '998314', unitRate: 35000, category: 'Pre-Wedding' },
  { description: 'Drone Cinematography 4K Aerial Footage Processing', sacCode: '998314', unitRate: 12000, category: 'Drone' },
  { description: 'Luxury Wedding Photo Album & Photobook Design', sacCode: '998314', unitRate: 10000, category: 'Album' }
];

const INDIAN_STATES = [
  '22 - Chhattisgarh',
  '27 - Maharashtra',
  '07 - Delhi',
  '09 - Uttar Pradesh',
  '24 - Gujarat',
  '08 - Rajasthan',
  '19 - West Bengal',
  '33 - Tamil Nadu',
  '29 - Karnataka',
  '36 - Telangana',
  '23 - Madhya Pradesh',
  '03 - Punjab',
  '06 - Haryana',
  '10 - Bihar',
  '21 - Odisha',
  '32 - Kerala',
  '30 - Goa'
];

interface InvoiceViewProps {
  projects: Project[];
  studios: Studio[];
  payments: PaymentHistory[];
  invoices?: any[];
  currentUser?: UserProfile | null;
  onLogPayment?: (payment: Omit<PaymentHistory, 'id' | 'createdAt'>) => Promise<void>;
  onSaveInvoiceDraft?: (invoiceData: any) => Promise<void>;
  onDeleteInvoiceDraft?: (id: string) => Promise<void>;
}

export default function InvoiceView({
  projects = [],
  studios = [],
  payments = [],
  invoices = [],
  currentUser,
  onLogPayment,
  onSaveInvoiceDraft,
  onDeleteInvoiceDraft
}: InvoiceViewProps) {
  // Helper for computing dates
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getDefaultDueDateStr = (fromDateStr?: string) => {
    const base = fromDateStr ? new Date(fromDateStr) : new Date();
    if (isNaN(base.getTime())) return new Date(Date.now() + 7 * MS_PER_DAY).toISOString().split('T')[0];
    base.setDate(base.getDate() + 7);
    return base.toISOString().split('T')[0];
  };

  // Studio Selection
  const initialStudioId = useMemo(() => {
    if (currentUser?.role === 'studio' && currentUser.studioId) {
      return currentUser.studioId;
    }
    return studios[0]?.id || 'all';
  }, [currentUser, studios]);

  const [selectedStudioId, setSelectedStudioId] = useState<string>(initialStudioId);

  useEffect(() => {
    if (studios.length > 0 && (!selectedStudioId || selectedStudioId === '')) {
      setSelectedStudioId(initialStudioId || studios[0].id);
    }
  }, [studios, initialStudioId, selectedStudioId]);

  const currentStudio = useMemo(() => {
    if (selectedStudioId === 'all' || selectedStudioId === 'direct') return null;
    return studios.find(s => s.id === selectedStudioId) || studios[0] || null;
  }, [studios, selectedStudioId]);

  // Invoice Metadata
  const [invoiceNo, setInvoiceNo] = useState<string>(`AI-2026-${Date.now().toString().slice(-4)}`);
  const [issuedDate, setIssuedDate] = useState<string>(getTodayStr());
  const [dueDate, setDueDate] = useState<string>(getDefaultDueDateStr());
  const [invoiceStatus, setInvoiceStatus] = useState<'pending' | 'paid' | 'overdue' | 'cancelled'>('pending');
  const [invoiceTheme] = useState<'dark_minimal' | 'classic_light'>('dark_minimal');
  const [templateLayout, setTemplateLayout] = useState<'minimal' | 'professional'>('professional');
  const [termsBadgeText, setTermsBadgeText] = useState<string>('All deliverables released via Google Drive upon full settlement');

  // Builder View Mode (Form, Live Sheet, Split View)
  const [builderDisplayMode, setBuilderDisplayMode] = useState<'form' | 'live_sheet' | 'split'>('split');

  // Supplier Details (The Frame Cut Studio)
  const [supplierName] = useState<string>('The Frame Cut Studio & Post-Production Suite');
  const [supplierPan, setSupplierPan] = useState<string>('ABCDE1234F');
  const [supplierAddress, setSupplierAddress] = useState<string>('Shop 4, Crystal Plaza, Raipur, Chhattisgarh - 492001');
  const [supplierPhone, setSupplierPhone] = useState<string>('+91 77729 99933');
  const [supplierEmail, setSupplierEmail] = useState<string>('contact@theframecuts.com');
  const [supplierState, setSupplierState] = useState<string>('22 - Chhattisgarh');

  // Buyer / Recipient Details
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerOwnerName, setBuyerOwnerName] = useState<string>('');
  const [buyerPan, setBuyerPan] = useState<string>('');
  const [buyerAddress, setBuyerAddress] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [buyerState, setBuyerState] = useState<string>('22 - Chhattisgarh');
  const [placeOfSupply, setPlaceOfSupply] = useState<string>('22 - Chhattisgarh');
  const [reverseCharge, setReverseCharge] = useState<boolean>(false);

  // Sync buyer info when currentStudio changes
  useEffect(() => {
    if (currentStudio) {
      setBuyerName(currentStudio.name || '');
      setBuyerOwnerName(currentStudio.ownerName || '');
      setBuyerAddress(currentStudio.address || '');
      setBuyerPhone(currentStudio.phone || '');
      setBuyerEmail(currentStudio.email || '');
    } else if (selectedStudioId === 'direct') {
      setBuyerName('Direct Wedding Client');
      setBuyerOwnerName('');
      setBuyerAddress('');
      setBuyerPhone('');
      setBuyerEmail('');
    } else if (selectedStudioId === 'all') {
      setBuyerName('All Studio Partners');
    }
  }, [currentStudio, selectedStudioId]);

  // GST & Tax Configuration
  const [gstEnabled, setGstEnabled] = useState<boolean>(true);
  const [showTaxMatrix, setShowTaxMatrix] = useState<boolean>(true);
  const [gstRate, setGstRate] = useState<number>(18); // 18% Standard for Media SAC 998314
  const [gstTaxType, setGstTaxType] = useState<'intra' | 'inter'>('intra'); // intra = CGST+SGST, inter = IGST

  // Custom Line Items state
  const [customItems, setCustomItems] = useState<StudioInvoiceCustomItem[]>([]);
  const [newCustomDesc, setNewCustomDesc] = useState('');
  const [newCustomRate, setNewCustomRate] = useState<number | ''>('');
  const [newCustomQty, setNewCustomQty] = useState<number>(1);
  const [newCustomSac, setNewCustomSac] = useState('998314');

  // Filter projects for selected studio
  const studioProjects = useMemo(() => {
    if (selectedStudioId === 'all') return projects;
    if (selectedStudioId === 'direct') {
      return projects.filter(p => p.studioId === 'direct-client' || !p.studioId);
    }
    const currentName = (currentStudio?.name || '').trim().toLowerCase();
    return projects.filter(p => {
      if (p.studioId && p.studioId === selectedStudioId) return true;
      const pName = (p.studioName || '').trim().toLowerCase();
      if (currentName && pName && (pName === currentName || pName.includes(currentName) || currentName.includes(pName))) {
        return true;
      }
      return false;
    });
  }, [projects, selectedStudioId, currentStudio]);

  // Project Checkbox Selections state (projectId -> boolean)
  const [selectedProjectIds, setSelectedProjectIds] = useState<Record<string, boolean>>({});

  // Auto-select projects when studio changes
  const prevStudioIdRef = useRef<string>(selectedStudioId);
  useEffect(() => {
    if (prevStudioIdRef.current !== selectedStudioId) {
      prevStudioIdRef.current = selectedStudioId;
      const initialSelections: Record<string, boolean> = {};
      studioProjects.forEach(p => {
        initialSelections[p.id] = true;
      });
      setSelectedProjectIds(initialSelections);
    } else {
      setSelectedProjectIds(prev => {
        const updated = { ...prev };
        let changed = false;
        studioProjects.forEach(p => {
          if (updated[p.id] === undefined) {
            updated[p.id] = true;
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }
  }, [selectedStudioId, studioProjects]);

  const allProjectsSelected = useMemo(() => {
    if (studioProjects.length === 0) return false;
    return studioProjects.every(p => selectedProjectIds[p.id]);
  }, [studioProjects, selectedProjectIds]);

  const handleToggleSelectAllProjects = () => {
    const targetState = !allProjectsSelected;
    const newSel: Record<string, boolean> = {};
    studioProjects.forEach(p => {
      newSel[p.id] = targetState;
    });
    setSelectedProjectIds(newSel);
  };

  const handleToggleProject = (id: string) => {
    setSelectedProjectIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Add Custom Line Item
  const handleAddCustomItem = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCustomDesc.trim() || !newCustomRate || Number(newCustomRate) <= 0) return;

    const rateNum = Number(newCustomRate);
    const qtyNum = Number(newCustomQty) || 1;
    const newItem: StudioInvoiceCustomItem = {
      id: `custom-${Date.now()}`,
      description: newCustomDesc.trim(),
      sacCode: newCustomSac || '998314',
      unitRate: rateNum,
      quantity: qtyNum,
      amount: rateNum * qtyNum
    };

    setCustomItems(prev => [...prev, newItem]);
    setNewCustomDesc('');
    setNewCustomRate('');
    setNewCustomQty(1);
  };

  const handleRemoveCustomItem = (id: string) => {
    setCustomItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddPresetService = (preset: typeof PREDEFINED_SERVICE_TEMPLATES[0]) => {
    const newItem: StudioInvoiceCustomItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      description: preset.description,
      category: preset.category,
      sacCode: preset.sacCode,
      unitRate: preset.unitRate,
      quantity: 1,
      amount: preset.unitRate
    };
    setCustomItems(prev => [...prev, newItem]);
  };

  // Filter Advance Payments for selected studio
  const studioPayments = useMemo(() => {
    if (selectedStudioId === 'all') return payments;
    if (selectedStudioId === 'direct') {
      return payments.filter(p => p.entityType === 'studio' && (!p.entityId || p.entityId === 'direct-client'));
    }
    return payments.filter(p => 
      p.entityType === 'studio' && 
      (p.entityId === selectedStudioId || (p.projectId && studioProjects.some(sp => sp.id === p.projectId)))
    );
  }, [payments, selectedStudioId, studioProjects]);

  // Local state for advance payment items
  const [advanceList, setAdvanceList] = useState<Array<{
    id: string;
    date: string;
    paidBy: string;
    paymentMode: string;
    amount: number;
    adjusted: boolean;
    referenceNo?: string;
    notes?: string;
  }>>([]);

  useEffect(() => {
    const mapped = studioPayments.map(p => ({
      id: p.id,
      date: p.date,
      paidBy: p.receivedFrom || currentStudio?.ownerName || currentStudio?.name || 'Studio Client',
      paymentMode: p.paymentMethod || 'UPI',
      amount: p.amount || 0,
      referenceNo: p.notes?.includes('Ref') || p.notes?.includes('UTR') ? p.notes : (p.notes || 'Verified Payment'),
      notes: p.notes || '',
      adjusted: true
    }));

    setAdvanceList(mapped);
  }, [studioPayments, currentStudio]);

  const handleToggleAdvanceAdjust = (id: string) => {
    setAdvanceList(prev => prev.map(item => item.id === id ? { ...item, adjusted: !item.adjusted } : item));
  };

  const handleDeleteAdvance = (id: string) => {
    setAdvanceList(prev => prev.filter(item => item.id !== id));
  };

  // Add Advance Modal state
  const [showAddAdvanceModal, setShowAddAdvanceModal] = useState(false);
  const [newAdvPaidBy, setNewAdvPaidBy] = useState('');
  const [newAdvAmount, setNewAdvAmount] = useState<number | ''>('');
  const [newAdvMode, setNewAdvMode] = useState('UPI');
  const [newAdvDate, setNewAdvDate] = useState(getTodayStr());
  const [newAdvRef, setNewAdvRef] = useState('');
  const [newAdvNotes, setNewAdvNotes] = useState('');

  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdvAmount || Number(newAdvAmount) <= 0) return;

    const amountNum = Number(newAdvAmount);
    const newEntry = {
      id: `adv-${Date.now()}`,
      date: newAdvDate,
      paidBy: newAdvPaidBy || buyerName || currentStudio?.ownerName || currentStudio?.name || 'Studio Client',
      paymentMode: newAdvMode,
      amount: amountNum,
      referenceNo: newAdvRef || 'Direct Transfer',
      notes: newAdvNotes,
      adjusted: true
    };

    setAdvanceList(prev => [...prev, newEntry]);

    if (onLogPayment && selectedStudioId && selectedStudioId !== 'all') {
      try {
        await onLogPayment({
          entityId: selectedStudioId,
          entityType: 'studio',
          projectId: '',
          projectCoupleName: `${currentStudio?.name || 'Studio'} Advance`,
          amount: amountNum,
          date: newAdvDate,
          paymentMethod: newAdvMode,
          receivedFrom: newAdvPaidBy || buyerName || currentStudio?.ownerName || currentStudio?.name || 'Studio Client',
          notes: newAdvNotes ? `${newAdvNotes} (${newAdvRef || 'Advance'})` : (newAdvRef || 'Recorded via Invoice View Advance Payment')
        });
      } catch (err) {
        console.error("Error logging payment:", err);
      }
    }

    setNewAdvPaidBy('');
    setNewAdvAmount('');
    setNewAdvRef('');
    setNewAdvNotes('');
    setShowAddAdvanceModal(false);
    showToast(`✅ Advance payment of ₹${amountNum.toLocaleString('en-IN')} added!`);
  };

  const advanceTotal = useMemo(() => {
    return advanceList
      .filter(a => a.adjusted)
      .reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  }, [advanceList]);

  const sidebarModeBreakdown = useMemo(() => {
    const list = advanceList.filter(a => a.adjusted && a.amount > 0);
    const breakdown: Record<string, { count: number; total: number }> = {};
    list.forEach(item => {
      const mode = item.paymentMode || 'UPI';
      if (!breakdown[mode]) {
        breakdown[mode] = { count: 0, total: 0 };
      }
      breakdown[mode].count += 1;
      breakdown[mode].total += item.amount;
    });
    return breakdown;
  }, [advanceList]);

  // Adjustments & Summary Inputs
  const [previousBalance, setPreviousBalance] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);

  // Financial Calculations
  const selectedProjectsTotal = useMemo(() => {
    return studioProjects
      .filter(p => selectedProjectIds[p.id])
      .reduce((sum, p) => sum + (p.projectAmount || 0), 0);
  }, [studioProjects, selectedProjectIds]);

  const customItemsTotal = useMemo(() => {
    return customItems.reduce((sum, item) => sum + item.amount, 0);
  }, [customItems]);

  const taxableAmount = useMemo(() => {
    return selectedProjectsTotal + customItemsTotal;
  }, [selectedProjectsTotal, customItemsTotal]);

  const cgstAmount = useMemo(() => {
    if (!gstEnabled || gstTaxType !== 'intra') return 0;
    return Math.round((taxableAmount * (gstRate / 2)) / 100);
  }, [gstEnabled, gstTaxType, taxableAmount, gstRate]);

  const sgstAmount = useMemo(() => {
    if (!gstEnabled || gstTaxType !== 'intra') return 0;
    return Math.round((taxableAmount * (gstRate / 2)) / 100);
  }, [gstEnabled, gstTaxType, taxableAmount, gstRate]);

  const igstAmount = useMemo(() => {
    if (!gstEnabled || gstTaxType !== 'inter') return 0;
    return Math.round((taxableAmount * gstRate) / 100);
  }, [gstEnabled, gstTaxType, taxableAmount, gstRate]);

  const totalGstAmount = useMemo(() => {
    return cgstAmount + sgstAmount + igstAmount;
  }, [cgstAmount, sgstAmount, igstAmount]);

  const grossTotal = useMemo(() => {
    return taxableAmount + totalGstAmount;
  }, [taxableAmount, totalGstAmount]);

  const totalPayable = useMemo(() => {
    const val = grossTotal + previousBalance - advanceTotal - discount;
    return val < 0 ? 0 : val;
  }, [grossTotal, previousBalance, advanceTotal, discount]);

  const amountInWords = useMemo(() => {
    return numberToWordsIndian(totalPayable);
  }, [totalPayable]);

  // Combined Sheet Items for WYSIWYG Rendering
  const allInvoiceItems = useMemo(() => {
    const selectedProjs = studioProjects.filter(p => selectedProjectIds[p.id]);
    const list: Array<{
      id: string;
      description: string;
      subDescription?: string;
      sacCode: string;
      unitRate: number;
      quantity: number;
      amount: number;
    }> = [];

    selectedProjs.forEach(p => {
      list.push({
        id: p.id,
        description: p.coupleName || 'Wedding Film Edit',
        subDescription: p.eventType || 'Full Wedding Post-Production & Color Suite',
        sacCode: '998314',
        unitRate: p.projectAmount || 0,
        quantity: 1,
        amount: p.projectAmount || 0
      });
    });

    customItems.forEach(item => {
      list.push({
        id: item.id,
        description: item.description,
        sacCode: item.sacCode || '998314',
        unitRate: item.unitRate,
        quantity: item.quantity,
        amount: item.amount
      });
    });

    return list;
  }, [studioProjects, selectedProjectIds, customItems]);

  // Bank & Payment Details
  const [accountHolder, setAccountHolder] = useState('SATISH TIWARI');
  const [bankName, setBankName] = useState('ICICI BANK');
  const [accountNumber, setAccountNumber] = useState('390701503993');
  const [ifscCode, setIfscCode] = useState('ICIC0003907');
  const [upiId, setUpiId] = useState('7772999933@upi');
  const [driveLink, setDriveLink] = useState('');
  const [notes, setNotes] = useState('');

  // QR Code Generation, Pre-saved Library & Upload Feature State
  const [savedQrList, setSavedQrList] = useState<SavedQrProfile[]>(() => {
    try {
      const stored = localStorage.getItem('tfc_saved_qr_profiles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_SAVED_QR_PROFILES;
  });

  const [selectedQrProfileId, setSelectedQrProfileId] = useState<string>(() => {
    return localStorage.getItem('tfc_active_qr_profile_id') || 'preset-icici';
  });

  const [qrCodeMode, setQrCodeMode] = useState<'saved_preset' | 'auto_upi' | 'custom_upload'>(() => {
    const savedMode = localStorage.getItem('tfc_qr_code_mode');
    if (savedMode === 'saved_preset' || savedMode === 'auto_upi' || savedMode === 'custom_upload') {
      return savedMode;
    }
    return localStorage.getItem('tfc_invoice_custom_qr') ? 'custom_upload' : 'saved_preset';
  });

  const [customQrImage, setCustomQrImage] = useState<string>(() => {
    return localStorage.getItem('tfc_invoice_custom_qr') || '';
  });
  const [showQrOnInvoice, setShowQrOnInvoice] = useState<boolean>(true);
  const [qrAmountMode, setQrAmountMode] = useState<'balance_due' | 'custom_amount' | 'open_amount'>('balance_due');
  const [customQrAmount, setCustomQrAmount] = useState<number>(0);
  const [qrSize, setQrSize] = useState<'normal' | 'prominent'>('prominent');
  const [qrPayeeNote, setQrPayeeNote] = useState<string>('');
  const [qrCopied, setQrCopied] = useState<boolean>(false);
  const [showQrZoomModal, setShowQrZoomModal] = useState<boolean>(false);
  const [showSaveQrModal, setShowSaveQrModal] = useState<boolean>(false);
  const [newPresetName, setNewPresetName] = useState<string>('');
  const [newPresetBankOrApp, setNewPresetBankOrApp] = useState<string>('PhonePe / Merchant Standee');
  const [newPresetSyncBank, setNewPresetSyncBank] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active saved profile lookup
  const activeSavedProfile = useMemo(() => {
    return savedQrList.find(p => p.id === selectedQrProfileId) || savedQrList[0];
  }, [savedQrList, selectedQrProfileId]);

  // Handle Select of a Saved QR Profile
  const handleSelectSavedQr = (profile: SavedQrProfile) => {
    setSelectedQrProfileId(profile.id);
    setQrCodeMode('saved_preset');
    try {
      localStorage.setItem('tfc_active_qr_profile_id', profile.id);
      localStorage.setItem('tfc_qr_code_mode', 'saved_preset');
    } catch (e) {
      console.warn('LocalStorage warning', e);
    }
    // Optionally synchronize banking details if profile has them
    if (profile.upiId) setUpiId(profile.upiId);
    if (profile.accountHolder) setAccountHolder(profile.accountHolder);
    if (profile.bankName) setBankName(profile.bankName);
    if (profile.accountNumber) setAccountNumber(profile.accountNumber);
    if (profile.ifscCode) setIfscCode(profile.ifscCode);
  };

  // Handle Upload of Custom QR Image (Merchant Standee / Bank Scanner)
  const handleQrImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomQrImage(result);
        setQrCodeMode('custom_upload');
        try {
          localStorage.setItem('tfc_invoice_custom_qr', result);
          localStorage.setItem('tfc_qr_code_mode', 'custom_upload');
        } catch (err) {
          console.warn('LocalStorage quota warning for custom QR image', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearCustomQr = () => {
    setCustomQrImage('');
    setQrCodeMode('saved_preset');
    localStorage.removeItem('tfc_invoice_custom_qr');
    localStorage.setItem('tfc_qr_code_mode', 'saved_preset');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save current QR (uploaded image or dynamic configuration) to Saved Library
  const handleSaveCurrentToLibrary = () => {
    const nameToUse = newPresetName.trim() || `Studio QR ${savedQrList.length + 1}`;
    const bankToUse = newPresetBankOrApp.trim() || 'UPI Merchant';
    const newId = `qr-${Date.now()}`;
    const imgUrl = qrCodeMode === 'custom_upload' && customQrImage ? customQrImage : qrCodeUrl;
    
    const newProfile: SavedQrProfile = {
      id: newId,
      name: nameToUse,
      bankOrApp: bankToUse,
      upiId: upiId.trim() || '7772999933@upi',
      accountHolder: accountHolder.trim() || 'THE FRAME CUT STUDIO',
      bankName: bankName.trim() || 'ICICI BANK',
      accountNumber: accountNumber.trim() || '390701503993',
      ifscCode: ifscCode.trim() || 'ICIC0003907',
      imageUrl: imgUrl,
      type: qrCodeMode === 'custom_upload' ? 'custom_upload' : 'auto_generated',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      addedAt: new Date().toLocaleDateString('en-IN')
    };

    const updated = [newProfile, ...savedQrList];
    setSavedQrList(updated);
    setSelectedQrProfileId(newId);
    setQrCodeMode('saved_preset');
    try {
      localStorage.setItem('tfc_saved_qr_profiles', JSON.stringify(updated));
      localStorage.setItem('tfc_active_qr_profile_id', newId);
      localStorage.setItem('tfc_qr_code_mode', 'saved_preset');
    } catch (e) {
      console.warn('LocalStorage quota warning', e);
    }
    setShowSaveQrModal(false);
    setNewPresetName('');
  };

  const handleDeleteSavedQr = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedQrList.filter(p => p.id !== id);
    const finalFiltered = filtered.length > 0 ? filtered : DEFAULT_SAVED_QR_PROFILES;
    setSavedQrList(finalFiltered);
    try {
      localStorage.setItem('tfc_saved_qr_profiles', JSON.stringify(finalFiltered));
    } catch (err) {
      console.warn(err);
    }
    if (selectedQrProfileId === id) {
      const nextId = finalFiltered[0].id;
      setSelectedQrProfileId(nextId);
      try {
        localStorage.setItem('tfc_active_qr_profile_id', nextId);
      } catch (err) {
        console.warn(err);
      }
    }
  };

  // Download High-Res QR Code Image
  const handleDownloadQrImage = async () => {
    if (!qrCodeUrl) return;
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `TheFrameCut-Payment-QR-${invoiceNo || 'INV'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Direct fallback
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.target = '_blank';
      link.download = `TheFrameCut-Payment-QR-${invoiceNo || 'INV'}.png`;
      link.click();
    }
  };

  // UPI Link generation for quick intent test
  const generatedUpiUri = useMemo(() => {
    const cleanUpi = (qrCodeMode === 'saved_preset' && activeSavedProfile?.upiId ? activeSavedProfile.upiId : upiId).trim();
    if (!cleanUpi) return '';
    const cleanPayee = encodeURIComponent((qrCodeMode === 'saved_preset' && activeSavedProfile?.accountHolder ? activeSavedProfile.accountHolder : accountHolder).trim() || 'Studio');
    const noteText = qrPayeeNote.trim() || `Invoice-${invoiceNo}`;
    const cleanNote = encodeURIComponent(noteText);
    let amtParam = '';
    if (qrAmountMode === 'balance_due') {
      amtParam = totalPayable > 0 ? `&am=${totalPayable}` : '';
    } else if (qrAmountMode === 'custom_amount' && customQrAmount > 0) {
      amtParam = `&am=${customQrAmount}`;
    }
    return `upi://pay?pa=${cleanUpi}&pn=${cleanPayee}${amtParam}&tn=${cleanNote}&cu=INR`;
  }, [qrCodeMode, activeSavedProfile, upiId, accountHolder, qrPayeeNote, invoiceNo, qrAmountMode, totalPayable, customQrAmount]);

  // QR Code Image URL (Either uploaded base64 image, saved preset, or dynamic high-res UPI QR)
  const qrCodeUrl = useMemo(() => {
    if (!showQrOnInvoice) return '';

    if (qrCodeMode === 'custom_upload' && customQrImage) {
      return customQrImage;
    }

    if (qrCodeMode === 'saved_preset' && activeSavedProfile) {
      if (activeSavedProfile.imageUrl) {
        return activeSavedProfile.imageUrl;
      }
      if (activeSavedProfile.upiId) {
        const cleanUpi = activeSavedProfile.upiId.trim();
        const cleanPayee = encodeURIComponent(activeSavedProfile.accountHolder || accountHolder || 'The Frame Cut Studio');
        const noteText = qrPayeeNote.trim() || `Invoice-${invoiceNo}`;
        const cleanNote = encodeURIComponent(noteText);
        let amtParam = '';
        if (qrAmountMode === 'balance_due' && totalPayable > 0) {
          amtParam = `&am=${totalPayable}`;
        } else if (qrAmountMode === 'custom_amount' && customQrAmount > 0) {
          amtParam = `&am=${customQrAmount}`;
        }
        const upiUri = `upi://pay?pa=${cleanUpi}&pn=${cleanPayee}${amtParam}&tn=${cleanNote}&cu=INR`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(upiUri)}`;
      }
    }

    if (!upiId.trim()) return '';
    const cleanUpi = upiId.trim();
    const cleanPayee = encodeURIComponent(accountHolder.trim() || 'The Frame Cut Studio');
    const noteText = qrPayeeNote.trim() || `Invoice-${invoiceNo}`;
    const cleanNote = encodeURIComponent(noteText);
    let amtParam = '';
    if (qrAmountMode === 'balance_due') {
      amtParam = totalPayable > 0 ? `&am=${totalPayable}` : '';
    } else if (qrAmountMode === 'custom_amount' && customQrAmount > 0) {
      amtParam = `&am=${customQrAmount}`;
    }
    const upiUri = `upi://pay?pa=${cleanUpi}&pn=${cleanPayee}${amtParam}&tn=${cleanNote}&cu=INR`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=${encodeURIComponent(upiUri)}`;
  }, [showQrOnInvoice, qrCodeMode, customQrImage, activeSavedProfile, upiId, accountHolder, qrPayeeNote, invoiceNo, qrAmountMode, totalPayable, customQrAmount]);

  const qrCodeLabel = useMemo(() => {
    if (qrCodeMode === 'custom_upload') {
      return 'Studio Merchant QR';
    }
    if (qrCodeMode === 'saved_preset' && activeSavedProfile) {
      if (qrAmountMode === 'balance_due' && totalPayable > 0) {
        return `Pay: ₹${totalPayable.toLocaleString('en-IN')}`;
      }
      return activeSavedProfile.name.length > 26 
        ? `${activeSavedProfile.bankOrApp} QR` 
        : activeSavedProfile.name;
    }
    if (qrAmountMode === 'balance_due') {
      return totalPayable > 0 ? `Pay: ₹${totalPayable.toLocaleString('en-IN')}` : 'Scan to Settle';
    }
    if (qrAmountMode === 'custom_amount' && customQrAmount > 0) {
      return `Pay: ₹${customQrAmount.toLocaleString('en-IN')}`;
    }
    return 'Scan with Any UPI App';
  }, [qrCodeMode, activeSavedProfile, qrAmountMode, totalPayable, customQrAmount]);

  // Top Statistics
  const totalProjectsCount = studioProjects.length;
  const totalBusiness = studioProjects.reduce((sum, p) => sum + (p.projectAmount || 0), 0);
  const totalReceived = advanceList.reduce((sum, a) => sum + a.amount, 0);
  const outstanding = totalBusiness - totalReceived > 0 ? totalBusiness - totalReceived : 0;
  const lastPayment = advanceList.length > 0 ? advanceList[advanceList.length - 1].amount : 0;

  // Digital Signature State (Upload or Draw)
  const [signatureMode, setSignatureMode] = useState<'upload' | 'draw'>('draw');
  const [signatureImageUrl, setSignatureImageUrl] = useState<string>(() => {
    return localStorage.getItem('tfc_invoice_digital_signature') || '';
  });
  const [signatureSignatoryName, setSignatureSignatoryName] = useState<string>(() => {
    return localStorage.getItem('tfc_invoice_signatory_name') || 'Satish Tiwari (Founder)';
  });
  const [showSignature, setShowSignature] = useState<boolean>(true);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingSig, setIsDrawingSig] = useState<boolean>(false);
  const [hasDrawnSig, setHasDrawnSig] = useState<boolean>(false);
  const sigFileInputRef = useRef<HTMLInputElement | null>(null);

  // Digital Signature Handlers
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG with transparency recommended).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const res = event.target?.result as string;
      if (res) {
        setSignatureImageUrl(res);
        try {
          localStorage.setItem('tfc_invoice_digital_signature', res);
        } catch (err) {
          console.warn('LocalStorage quota warning for signature image', err);
        }
        showToast('Digital signature image updated!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearSignature = () => {
    setSignatureImageUrl('');
    setHasDrawnSig(false);
    localStorage.removeItem('tfc_invoice_digital_signature');
    if (sigFileInputRef.current) {
      sigFileInputRef.current.value = '';
    }
    const canvas = sigCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    showToast('Signature removed');
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawingSig(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#f59e0b'; // Amber ink
  };

  const drawSignature = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnSig(true);
  };

  const stopDrawing = () => {
    if (!isDrawingSig) return;
    setIsDrawingSig(false);
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureImageUrl(dataUrl);
    try {
      localStorage.setItem('tfc_invoice_digital_signature', dataUrl);
    } catch (err) {
      console.warn('LocalStorage quota warning for signature', err);
    }
  };

  const handleSignatoryNameChange = (val: string) => {
    setSignatureSignatoryName(val);
    try {
      localStorage.setItem('tfc_invoice_signatory_name', val);
    } catch (err) {
      console.warn(err);
    }
  };

  // History Tab Filter & Navigation State
  const [activeInvoiceTab, setActiveInvoiceTab] = useState<'builder' | 'templates' | 'history'>('builder');
  const [selectedStage, setSelectedStage] = useState<string>('billing');
  const [editingStage, setEditingStage] = useState<string>('billing');
  const [historyViewMode, setHistoryViewMode] = useState<'grid' | 'table'>('grid');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue' | 'cancelled'>('all');

  const [templates, setTemplates] = useState<Record<string, WhatsAppInvoiceTemplate>>(() => {
    try {
      const saved = localStorage.getItem('tfc_invoice_wa_templates');
      if (saved) {
        return { ...DEFAULT_INVOICE_WA_TEMPLATES, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_INVOICE_WA_TEMPLATES;
  });

  const [activeEditingText, setActiveEditingText] = useState<string>(() => {
    return templates['billing']?.templateText || DEFAULT_INVOICE_WA_TEMPLATES['billing'].templateText;
  });

  useEffect(() => {
    try {
      localStorage.setItem('tfc_invoice_wa_templates', JSON.stringify(templates));
    } catch {
      // ignore
    }
  }, [templates]);

  useEffect(() => {
    if (templates[editingStage]) {
      setActiveEditingText(templates[editingStage].templateText);
    }
  }, [editingStage, templates]);

  // Modals & Export state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeQuickMenuId, setActiveQuickMenuId] = useState<string | null>(null);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const printInvoiceRef = useRef<HTMLDivElement>(null);
  const modalPreviewCardRef = useRef<HTMLDivElement>(null);
  const liveInvoicePreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleWindowClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-quick-actions-menu="true"]') && !target.closest('[data-quick-actions-trigger="true"]')) {
        setActiveQuickMenuId(null);
      }
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // WhatsApp Message Generator with GST tags
  const getWhatsAppMessage = () => {
    const activeTemplate = templates[selectedStage] || DEFAULT_INVOICE_WA_TEMPLATES[selectedStage] || DEFAULT_INVOICE_WA_TEMPLATES['billing'];
    let text = activeTemplate.templateText;

    const projectLines = allInvoiceItems
      .map((item, idx) => `${idx + 1}. *${item.description}* (SAC ${item.sacCode}) - ₹${item.amount.toLocaleString('en-IN')}`)
      .join('\n');

    let gstText = '';
    if (gstEnabled) {
      if (gstTaxType === 'intra') {
        gstText = `*Taxable Subtotal:* ₹${taxableAmount.toLocaleString('en-IN')}\n*CGST (${gstRate/2}%):* +₹${cgstAmount.toLocaleString('en-IN')}\n*SGST (${gstRate/2}%):* +₹${sgstAmount.toLocaleString('en-IN')}\n*Total with GST:* ₹${(taxableAmount + totalGstAmount).toLocaleString('en-IN')}\n`;
      } else {
        gstText = `*Taxable Subtotal:* ₹${taxableAmount.toLocaleString('en-IN')}\n*IGST (${gstRate}%):* +₹${igstAmount.toLocaleString('en-IN')}\n*Total with GST:* ₹${(taxableAmount + totalGstAmount).toLocaleString('en-IN')}\n`;
      }
    }

    const adjustedAdvances = advanceList.filter(a => a.adjusted && a.amount > 0);
    let advanceBreakdownText = '';
    if (adjustedAdvances.length > 0) {
      advanceBreakdownText = `*ADVANCE PAYMENTS RECEIVED (₹${advanceTotal.toLocaleString('en-IN')}):*\n` +
        adjustedAdvances.map((a, i) => `  ${i + 1}. ₹${a.amount.toLocaleString('en-IN')} via *${a.paymentMode}* (Received from: _${a.paidBy}_ on ${a.date || 'Recent'}${a.referenceNo ? ' | Ref: ' + a.referenceNo : ''})`).join('\n') + '\n';
      
      const modes: Record<string, number> = {};
      adjustedAdvances.forEach(a => {
        modes[a.paymentMode] = (modes[a.paymentMode] || 0) + a.amount;
      });
      advanceBreakdownText += `*Payment Mode Breakdown:* ` + Object.entries(modes).map(([m, amt]) => `${m}: ₹${amt.toLocaleString('en-IN')}`).join(' | ') + '\n';
    }

    text = text.replace(/{INVOICE_NO}/g, invoiceNo)
      .replace(/{STUDIO_NAME}/g, buyerName || currentStudio?.name || 'Valued Client')
      .replace(/{ISSUED_DATE}/g, issuedDate)
      .replace(/{DUE_DATE}/g, dueDate || 'On Receipt')
      .replace(/{STATUS}/g, (invoiceStatus || 'PENDING').toUpperCase())
      .replace(/{PROJECT_LIST}/g, projectLines || 'Cinematic Wedding Post-Production Services')
      .replace(/{PROJECT_TOTAL}/g, taxableAmount.toLocaleString('en-IN'))
      .replace(/{GST_BREAKDOWN}/g, gstText)
      .replace(/{TOTAL_PAYABLE}/g, totalPayable.toLocaleString('en-IN'))
      .replace(/{AMOUNT_IN_WORDS}/g, amountInWords)
      .replace(/{ADVANCE_TOTAL}/g, advanceTotal.toLocaleString('en-IN'))
      .replace(/{PREVIOUS_BALANCE}/g, previousBalance > 0 ? `*Prev. Balance:* +₹${previousBalance.toLocaleString('en-IN')}\n` : '')
      .replace(/{ADVANCE_ADJUST}/g, advanceTotal > 0 ? (advanceBreakdownText || `*Advance Adjusted:* -₹${advanceTotal.toLocaleString('en-IN')}\n`) : '')
      .replace(/{DISCOUNT}/g, discount > 0 ? `*Discount:* -₹${discount.toLocaleString('en-IN')}\n` : '')
      .replace(/{ACCOUNT_HOLDER}/g, accountHolder)
      .replace(/{BANK_NAME}/g, bankName)
      .replace(/{ACCOUNT_NUMBER}/g, accountNumber)
      .replace(/{IFSC_CODE}/g, ifscCode)
      .replace(/{UPI_ID}/g, upiId)
      .replace(/{DRIVE_LINK}/g, driveLink ? `*Drive Link:* ${driveLink}\n\n` : '')
      .replace(/{NOTES}/g, notes ? `*Notes:* ${notes}\n\n` : '')
      .replace(/{PDF_ATTACHMENT}/g, '');

    return encodeURIComponent(text);
  };

  // PDF Generation Helper
  const generatePdfFile = async (): Promise<{ pdf: jsPDF; fileName: string; file: File } | null> => {
    const cleanStudioName = (buyerName || currentStudio?.name || 'Studio').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `GST_Invoice_${invoiceNo || 'INV'}_${cleanStudioName}.pdf`;

    const invoiceDataObj: GstInvoiceData = {
      invoiceNo: invoiceNo || 'INV-001',
      issuedDate: issuedDate || new Date().toISOString().split('T')[0],
      dueDate: dueDate || 'On Receipt',
      invoiceStatus,
      supplier: {
        name: supplierName,
        pan: supplierPan,
        address: supplierAddress,
        phone: supplierPhone,
        email: supplierEmail,
        state: supplierState
      },
      buyer: {
        name: buyerName || currentStudio?.name || 'Valued Studio Partner',
        ownerName: buyerOwnerName || currentStudio?.ownerName || '',
        pan: buyerPan || 'N/A',
        address: buyerAddress || currentStudio?.address || '',
        phone: buyerPhone || currentStudio?.phone || 'N/A',
        email: buyerEmail || currentStudio?.email || '',
        state: buyerState || supplierState
      },
      placeOfSupply,
      reverseCharge,
      items: allInvoiceItems,
      taxableAmount,
      gstEnabled,
      showTaxMatrix,
      gstRate,
      gstTaxType,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalGstAmount,
      grossTotal,
      previousBalance,
      advanceTotal,
      advancePayments: advanceList.filter(a => a.adjusted),
      discount,
      totalPayable,
      amountInWords,
      templateLayout,
      bankDetails: {
        accountHolder,
        bankName,
        accountNumber,
        ifscCode,
        upiId
      },
      qrCodeUrl,
      qrCodeLabel,
      signatureImageUrl,
      signatureSignatoryName,
      showSignature,
      termsBadgeText
    };

    // 1. PRIMARY ENGINE: Pixel-perfect DOM Canvas Capture of the exact GST Tax Invoice Sheet shown on screen / preview modal
    let targetElement: HTMLElement | null = null;
    if (modalPreviewCardRef.current) {
      targetElement = modalPreviewCardRef.current.querySelector<HTMLElement>('[data-invoice-sheet="true"]') || modalPreviewCardRef.current;
    }
    if (!targetElement) {
      const modalEl = document.getElementById('modal-gst-invoice-sheet');
      if (modalEl) targetElement = modalEl;
    }
    if (!targetElement && liveInvoicePreviewRef.current) {
      targetElement = liveInvoicePreviewRef.current.querySelector<HTMLElement>('[data-invoice-sheet="true"]') || liveInvoicePreviewRef.current;
    }
    if (!targetElement) {
      const liveEl = document.getElementById('live-gst-invoice-sheet');
      if (liveEl) targetElement = liveEl;
    }
    if (!targetElement && printInvoiceRef.current) {
      targetElement = printInvoiceRef.current.querySelector<HTMLElement>('[data-invoice-sheet="true"]') || printInvoiceRef.current;
    }
    if (!targetElement) {
      const printEl = document.getElementById('print-gst-invoice-sheet');
      if (printEl) targetElement = printEl;
    }
    if (!targetElement) {
      targetElement = document.querySelector<HTMLElement>('[data-invoice-sheet="true"]');
    }

    if (targetElement) {
      try {
        const bg = invoiceTheme === 'classic_light' ? '#ffffff' : '#131417';
        const result = await generateInvoicePdfFromElement(targetElement, fileName, {
          backgroundColor: bg,
          scale: 2.2
        });
        if (result && result.pdf) {
          return result;
        }
      } catch (canvasErr) {
        console.warn('DOM Canvas Export notice, falling back to Vector PDF:', canvasErr);
      }
    }

    // 2. SECONDARY FALLBACK: Vector PDF engine if DOM element capture encounters issues
    try {
      const vectorPdf = generateVectorGstInvoicePdf(invoiceDataObj);
      const pdfBlob = vectorPdf.output('blob');
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      return { pdf: vectorPdf, fileName, file };
    } catch (vectorErr) {
      console.error('Vector PDF generation error:', vectorErr);
    }

    return null;
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await generatePdfFile();
      if (!res) {
        window.print();
        showToast('🖨️ Print dialog opened!');
        return;
      }
      
      const downloadResult = saveOrDownloadPdf(res.pdf, res.fileName);
      if (downloadResult.success) {
        showToast('📄 GST Invoice PDF downloaded successfully!');
      } else {
        window.print();
        showToast('🖨️ Print dialog opened as fallback!');
      }
    } catch (err) {
      console.error('PDF Generation Error:', err);
      window.print();
      showToast('🖨️ PDF downloaded / Print dialog opened');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadSavedInvoicePdf = async (inv: any) => {
    setIsGeneratingPdf(true);
    try {
      const targetStudio = studios.find(s => s.id === inv.studioId || s.name === inv.studioName);
      const sName = inv.studioName || targetStudio?.name || 'Valued Studio Partner';
      const cleanStudioName = sName.replace(/[^a-zA-Z0-9]/g, '_');
      const invNo = inv.invoiceNo || inv.id || 'INV';
      const fileName = `GST_Invoice_${invNo}_${cleanStudioName}.pdf`;

      const taxAmount = Number(inv.projectTotal ?? inv.taxableAmount ?? 0);
      const isGst = inv.gstEnabled !== undefined ? !!inv.gstEnabled : true;
      const gRate = Number(inv.gstRate || 18);
      const gTaxType = inv.gstTaxType || 'intra';
      const gTotalGst = Number(inv.totalGstAmount ?? (isGst ? (taxAmount * gRate) / 100 : 0));
      const cGst = Number(inv.cgstAmount ?? (gTaxType === 'intra' ? gTotalGst / 2 : 0));
      const sGst = Number(inv.sgstAmount ?? (gTaxType === 'intra' ? gTotalGst / 2 : 0));
      const iGst = Number(inv.igstAmount ?? (gTaxType === 'inter' ? gTotalGst : 0));
      const advTotal = Number(inv.advanceTotal ?? 0);
      const disc = Number(inv.discount ?? 0);
      const prevBal = Number(inv.previousBalance ?? 0);
      const netPayable = Number(inv.totalPayable ?? (taxAmount + gTotalGst + prevBal - advTotal - disc));

      const items = inv.customItems && inv.customItems.length > 0 ? inv.customItems : [
        {
          id: '1',
          description: 'Cinematic Video Editing & Post-Production Services',
          sacCode: '998314',
          unitRate: taxAmount,
          quantity: 1,
          amount: taxAmount
        }
      ];

      const invoiceDataObj: GstInvoiceData = {
        invoiceNo: invNo,
        issuedDate: inv.issuedDate || inv.date || new Date().toISOString().split('T')[0],
        dueDate: inv.dueDate || 'On Receipt',
        invoiceStatus: inv.status || 'pending',
        supplier: {
          name: supplierName,
          pan: supplierPan,
          address: supplierAddress,
          phone: supplierPhone,
          email: supplierEmail,
          state: supplierState
        },
        buyer: {
          name: sName,
          ownerName: inv.buyerOwnerName || targetStudio?.ownerName || '',
          pan: inv.buyerPan || (targetStudio as any)?.pan || 'N/A',
          address: inv.buyerAddress || targetStudio?.address || '',
          phone: inv.buyerPhone || targetStudio?.phone || 'N/A',
          email: inv.buyerEmail || targetStudio?.email || '',
          state: inv.buyerState || supplierState
        },
        placeOfSupply: inv.placeOfSupply || placeOfSupply,
        reverseCharge: !!inv.reverseCharge,
        items,
        taxableAmount: taxAmount,
        gstEnabled: isGst,
        showTaxMatrix: inv.showTaxMatrix !== false,
        gstRate: gRate,
        gstTaxType: gTaxType,
        cgstAmount: cGst,
        sgstAmount: sGst,
        igstAmount: iGst,
        totalGstAmount: gTotalGst,
        grossTotal: taxAmount + gTotalGst,
        previousBalance: prevBal,
        advanceTotal: advTotal,
        advancePayments: Array.isArray(inv.advances) ? inv.advances.filter((a: any) => a.adjusted !== false) : [],
        discount: disc,
        totalPayable: netPayable,
        amountInWords: numberToWordsIndian(netPayable),
        templateLayout: inv.templateLayout || 'professional',
        bankDetails: {
          accountHolder,
          bankName,
          accountNumber,
          ifscCode,
          upiId
        },
        termsBadgeText
      };

      const pdf = generateVectorGstInvoicePdf(invoiceDataObj);
      const downloadResult = saveOrDownloadPdf(pdf, fileName);

      if (downloadResult.success) {
        showToast(`📄 Downloaded GST Invoice #${invNo} PDF!`);
      } else {
        window.print();
        showToast(`🖨️ Opened Print Dialog for Invoice #${invNo}`);
      }
    } catch (err) {
      console.error('Error downloading saved invoice PDF:', err);
      showToast('⚠️ Could not generate PDF, opening print preview');
      window.print();
    } finally {
      setIsGeneratingPdf(false);
      setActiveQuickMenuId(null);
    }
  };

  const handleBulkDownloadPdfs = async () => {
    if (selectedInvoiceIds.length === 0) return;
    setIsBulkProcessing(true);
    showToast(`⏳ Preparing ${selectedInvoiceIds.length} Invoice PDF(s)...`);

    try {
      for (const id of selectedInvoiceIds) {
        const targetInvoice = invoices.find(i => i.id === id || i.invoiceNo === id);
        if (targetInvoice) {
          await handleDownloadSavedInvoicePdf(targetInvoice);
          // Brief pause between sequential downloads to allow browser trigger
          await new Promise(res => setTimeout(res, 400));
        }
      }
      showToast(`✅ Downloaded ${selectedInvoiceIds.length} Invoice PDF(s)!`);
    } catch (err) {
      console.error('Bulk PDF download error:', err);
      showToast('⚠️ Encountered an issue downloading some PDFs');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleGenerateAndAttachPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await generatePdfFile();
      const cleanStudioName = (buyerName || currentStudio?.name || 'Studio').replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = res?.fileName || `GST_Invoice_${invoiceNo}_${cleanStudioName}.pdf`;
      const docPath = `firestore://studioInvoices/${invoiceNo}/${fileName}`;

      const payload = {
        id: invoiceNo,
        invoiceNo,
        studioId: selectedStudioId,
        studioName: buyerName || currentStudio?.name || '',
        issuedDate,
        dueDate,
        status: invoiceStatus,
        projectTotal: taxableAmount,
        advanceTotal,
        previousBalance,
        discount,
        totalPayable,
        gstEnabled,
        showTaxMatrix,
        gstRate,
        gstTaxType,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalGstAmount,
        placeOfSupply,
        reverseCharge,
        driveLink,
        notes,
        templateLayout,
        pdfDocumentPath: docPath,
        pdfFileName: fileName,
        customItems,
        updatedAt: new Date().toISOString()
      };

      if (onSaveInvoiceDraft) {
        await onSaveInvoiceDraft(payload);
      } else {
        const docRef = doc(db, 'studioInvoices', invoiceNo);
        await setDoc(docRef, payload, { merge: true });
      }

      showToast(`✅ GST Invoice attached & stored as ${fileName}!`);
    } catch (err) {
      console.error('Attach PDF error:', err);
      showToast('⚠️ Could not attach PDF document.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleWhatsAppSend = async () => {
    const encoded = getWhatsAppMessage();
    let phone = (buyerPhone || currentStudio?.phone || '').replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    }
    const link = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(link, '_blank');
    showToast('💬 Opening WhatsApp with GST invoice breakdown!');
  };

  const handleEmailSend = () => {
    const subject = `GST Invoice ${invoiceNo} - ${buyerName || currentStudio?.name || 'The Frame Cut Studio'}`;
    const body = decodeURIComponent(getWhatsAppMessage());
    const mailtoUrl = `mailto:${buyerEmail || currentStudio?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    showToast('✉️ Opening mail composer!');
  };

  const handlePrint = () => {
    window.print();
    showToast('🖨️ Print dialog opened!');
  };

  const handleSaveDraft = async () => {
    const payload = {
      id: invoiceNo,
      invoiceNo,
      studioId: selectedStudioId,
      studioName: buyerName || currentStudio?.name || '',
      issuedDate,
      dueDate,
      status: invoiceStatus,
      projectTotal: taxableAmount,
      advanceTotal,
      advances: advanceList,
      previousBalance,
      discount,
      totalPayable,
      gstEnabled,
      showTaxMatrix,
      gstRate,
      gstTaxType,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalGstAmount,
      placeOfSupply,
      reverseCharge,
      customItems,
      driveLink,
      notes,
      templateLayout,
      signatureImageUrl,
      signatureSignatoryName,
      showSignature,
      updatedAt: new Date().toISOString()
    };

    if (onSaveInvoiceDraft) {
      await onSaveInvoiceDraft(payload);
    } else {
      const docRef = doc(db, 'studioInvoices', invoiceNo);
      await setDoc(docRef, payload, { merge: true });
    }
    setSaveSuccess(true);
    showToast('💾 GST Invoice saved to Firestore database!');
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const getInvoiceEffectiveStatus = (inv: any): 'pending' | 'paid' | 'overdue' | 'cancelled' => {
    if (inv.status) return inv.status;
    const total = Number(inv.totalPayable ?? inv.totalAmount ?? 0);
    if (total === 0) return 'paid';
    const dueStr = inv.dueDate || inv.issuedDate || inv.date;
    if (dueStr) {
      const dueTime = new Date(dueStr).getTime();
      if (!isNaN(dueTime) && dueTime < Date.now()) {
        return 'overdue';
      }
    }
    return 'pending';
  };

  const handleQuickUpdateInvoiceStatus = async (invoiceId: string, newStatus: 'pending' | 'paid' | 'overdue' | 'cancelled') => {
    try {
      const targetInvoice = invoices.find(i => i.id === invoiceId || i.invoiceNo === invoiceId);
      const payload = {
        ...(targetInvoice || {}),
        id: invoiceId,
        invoiceNo: targetInvoice?.invoiceNo || invoiceId,
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      if (onSaveInvoiceDraft) {
        await onSaveInvoiceDraft(payload);
      } else {
        const docRef = doc(db, 'studioInvoices', invoiceId);
        await setDoc(docRef, { status: newStatus, updatedAt: serverTimestamp() }, { merge: true });
      }
      showToast(`Status updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      console.error('Failed to update invoice status:', err);
      showToast('⚠️ Failed to update status');
    }
  };

  const buildInvoiceWhatsAppText = (inv: any) => {
    const invNo = inv.invoiceNo || inv.id || 'N/A';
    const targetStudio = studios.find(s => s.id === inv.studioId || s.name === inv.studioName);
    const studioName = inv.studioName || targetStudio?.name || 'Valued Studio Partner';
    const issuedDisplay = inv.issuedDate || inv.date || new Date().toISOString().split('T')[0];
    const dueDisplay = inv.dueDate || 'On Receipt';
    const totalPayable = Number(inv.totalPayable ?? inv.totalAmount ?? 0);
    const taxable = Number(inv.projectTotal ?? inv.taxableAmount ?? 0);
    const gstAmount = Number(inv.totalGstAmount ?? 0);
    const status = (inv.status || 'PENDING').toUpperCase();

    const advanceTotal = Number(inv.advanceTotal ?? 0);
    const advances = Array.isArray(inv.advances) ? inv.advances.filter((a: any) => a.adjusted !== false && a.amount > 0) : [];

    let msg = `✨ *THE FRAME CUT STUDIO & POST-PRODUCTION SUITE*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📄 *FINAL TAX INVOICE & SETTLEMENT STATEMENT*\n`;
    msg += `🔢 *Invoice #:* ${invNo}\n`;
    msg += `🏢 *Client / Studio:* ${studioName}\n`;
    msg += `📅 *Issued Date:* ${issuedDisplay}\n`;
    msg += `⏰ *Due Date:* ${dueDisplay}\n`;
    msg += `📌 *Status:* ${status}\n\n`;

    if (taxable > 0) {
      msg += `💵 *Taxable Value:* ₹${taxable.toLocaleString('en-IN')}\n`;
    }
    if (gstAmount > 0) {
      msg += `📊 *GST Tax:* +₹${gstAmount.toLocaleString('en-IN')}\n`;
    }

    if (advanceTotal > 0 || advances.length > 0) {
      msg += `\n📥 *ADVANCE PAYMENTS RECEIVED (₹${advanceTotal.toLocaleString('en-IN')}):*\n`;
      if (advances.length > 0) {
        advances.forEach((adv: any, i: number) => {
          msg += `  ${i + 1}. ₹${Number(adv.amount).toLocaleString('en-IN')} via *${adv.paymentMode || 'UPI'}* (Received from: _${adv.paidBy || studioName}_ on ${adv.date || issuedDisplay}${adv.referenceNo ? ' | Ref: ' + adv.referenceNo : ''})\n`;
        });
        const modeMap: Record<string, number> = {};
        advances.forEach((a: any) => {
          const m = a.paymentMode || 'UPI';
          modeMap[m] = (modeMap[m] || 0) + Number(a.amount);
        });
        msg += `  *Mode Breakdown:* ` + Object.entries(modeMap).map(([m, amt]) => `${m}: ₹${amt.toLocaleString('en-IN')}`).join(' | ') + `\n`;
      } else {
        msg += `  • Advance Adjusted: -₹${advanceTotal.toLocaleString('en-IN')}\n`;
      }
    }

    msg += `\n💰 *FINAL BALANCE PAYABLE:* ₹${totalPayable.toLocaleString('en-IN')}\n\n`;

    msg += `🏦 *BANK TRANSFER DETAILS:*\n`;
    msg += `• *Account Name:* ${accountHolder}\n`;
    msg += `• *Bank:* ${bankName}\n`;
    msg += `• *A/C No:* ${accountNumber}\n`;
    msg += `• *IFSC Code:* ${ifscCode}\n`;
    msg += `• *UPI ID:* ${upiId}\n\n`;
    msg += `🙏 Kindly share the payment receipt once processed. Thank you for your continued partnership!`;

    return msg;
  };

  const handleResendInvoiceWhatsApp = (inv: any) => {
    const targetStudio = studios.find(s => s.id === inv.studioId || s.name === inv.studioName);
    let phone = (inv.buyerPhone || inv.phone || targetStudio?.phone || '').replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    }
    const text = buildInvoiceWhatsAppText(inv);
    const encoded = encodeURIComponent(text);
    const link = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(link, '_blank');
    setActiveQuickMenuId(null);
    showToast(`💬 Resending Invoice #${inv.invoiceNo || inv.id} via WhatsApp!`);
  };

  const handleResendInvoiceEmail = (inv: any) => {
    const targetStudio = studios.find(s => s.id === inv.studioId || s.name === inv.studioName);
    const email = inv.buyerEmail || inv.email || targetStudio?.email || '';
    const invNo = inv.invoiceNo || inv.id || '';
    const studioName = inv.studioName || targetStudio?.name || 'Valued Studio Partner';
    const subject = `Invoice ${invNo} - ${studioName} | The Frame Cut Studio`;
    const body = buildInvoiceWhatsAppText(inv);
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    setActiveQuickMenuId(null);
    showToast(`✉️ Resending Invoice #${invNo} via Email!`);
  };

  const handleCopyInvoiceSummary = async (inv: any) => {
    const text = buildInvoiceWhatsAppText(inv);
    try {
      await navigator.clipboard.writeText(text);
      setActiveQuickMenuId(null);
      showToast(`📋 Invoice #${inv.invoiceNo || inv.id} summary copied to clipboard!`);
    } catch {
      showToast('⚠️ Could not copy to clipboard');
    }
  };

  const handleMarkInvoiceAsPaid = async (inv: any) => {
    await handleQuickUpdateInvoiceStatus(inv.id, 'paid');
    setActiveQuickMenuId(null);
    showToast(`✅ Invoice #${inv.invoiceNo || inv.id} marked as Paid!`);
  };

  const handleLoadInvoiceIntoBuilder = (inv: any) => {
    if (inv.invoiceNo) setInvoiceNo(inv.invoiceNo);
    if (inv.studioId) setSelectedStudioId(inv.studioId);
    if (inv.studioName) setBuyerName(inv.studioName);
    if (inv.issuedDate || inv.date) setIssuedDate(inv.issuedDate || inv.date);
    if (inv.dueDate) setDueDate(inv.dueDate);
    if (inv.status) setInvoiceStatus(inv.status);
    if (inv.discount !== undefined) setDiscount(inv.discount);
    if (inv.previousBalance !== undefined) setPreviousBalance(inv.previousBalance);
    if (inv.customItems) setCustomItems(inv.customItems);
    if (inv.templateLayout) setTemplateLayout(inv.templateLayout);
    if (inv.driveLink) setDriveLink(inv.driveLink);
    if (inv.notes) setNotes(inv.notes);
    if (inv.advances && Array.isArray(inv.advances)) {
      setAdvanceList(inv.advances);
    }
    setActiveQuickMenuId(null);
    setActiveInvoiceTab('builder');
    showToast(`📂 Loaded Invoice #${inv.invoiceNo || inv.id} into Builder!`);
  };

  const handleDeleteInvoice = async (inv: any) => {
    if (!window.confirm(`Are you sure you want to delete Invoice #${inv.invoiceNo || inv.id}?`)) {
      return;
    }
    try {
      if (onDeleteInvoiceDraft) {
        await onDeleteInvoiceDraft(inv.id);
      } else {
        const docRef = doc(db, 'studioInvoices', inv.id);
        await deleteDoc(docRef);
      }
      setActiveQuickMenuId(null);
      setSelectedInvoiceIds(prev => prev.filter(id => id !== inv.id));
      showToast(`🗑️ Invoice #${inv.invoiceNo || inv.id} deleted`);
    } catch (err) {
      console.error('Delete invoice error:', err);
      showToast('⚠️ Failed to delete invoice');
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const effectiveStatus = getInvoiceEffectiveStatus(inv);
      if (historyStatusFilter !== 'all' && effectiveStatus !== historyStatusFilter) {
        return false;
      }
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const no = (inv.invoiceNo || inv.id || '').toLowerCase();
        const studio = (inv.studioName || '').toLowerCase();
        const notesText = (inv.notes || '').toLowerCase();
        return no.includes(q) || studio.includes(q) || notesText.includes(q);
      }
      return true;
    });
  }, [invoices, historyStatusFilter, historySearchQuery]);

  const isAllFilteredSelected = useMemo(() => {
    return filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoiceIds.includes(inv.id));
  }, [filteredInvoices, selectedInvoiceIds]);

  const isSomeFilteredSelected = useMemo(() => {
    return filteredInvoices.some(inv => selectedInvoiceIds.includes(inv.id)) && !isAllFilteredSelected;
  }, [filteredInvoices, selectedInvoiceIds, isAllFilteredSelected]);

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      setSelectedInvoiceIds(prev => prev.filter(id => !filteredInvoices.some(inv => inv.id === id)));
    } else {
      const newIds = new Set([...selectedInvoiceIds, ...filteredInvoices.map(inv => inv.id)]);
      setSelectedInvoiceIds(Array.from(newIds));
    }
  };

  const handleToggleSelectInvoice = (id: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e) e.stopPropagation();
    setSelectedInvoiceIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedInvoiceIds([]);
  };

  const handleBulkMarkAsPaid = async () => {
    if (selectedInvoiceIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      const updatePromises = selectedInvoiceIds.map(async (id) => {
        const targetInvoice = invoices.find(i => i.id === id || i.invoiceNo === id);
        const payload = {
          ...(targetInvoice || {}),
          id,
          invoiceNo: targetInvoice?.invoiceNo || id,
          status: 'paid' as const,
          updatedAt: new Date().toISOString()
        };

        if (onSaveInvoiceDraft) {
          await onSaveInvoiceDraft(payload);
        } else {
          const docRef = doc(db, 'studioInvoices', id);
          await setDoc(docRef, { status: 'paid', updatedAt: serverTimestamp() }, { merge: true });
        }
      });

      await Promise.all(updatePromises);
      showToast(`✅ Successfully marked ${selectedInvoiceIds.length} invoice(s) as Paid!`);
      setSelectedInvoiceIds([]);
    } catch (err) {
      console.error('Bulk mark as paid error:', err);
      showToast('⚠️ Failed to update some invoices');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkMarkAsPending = async () => {
    if (selectedInvoiceIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      const updatePromises = selectedInvoiceIds.map(async (id) => {
        const targetInvoice = invoices.find(i => i.id === id || i.invoiceNo === id);
        const payload = {
          ...(targetInvoice || {}),
          id,
          invoiceNo: targetInvoice?.invoiceNo || id,
          status: 'pending' as const,
          updatedAt: new Date().toISOString()
        };

        if (onSaveInvoiceDraft) {
          await onSaveInvoiceDraft(payload);
        } else {
          const docRef = doc(db, 'studioInvoices', id);
          await setDoc(docRef, { status: 'pending', updatedAt: serverTimestamp() }, { merge: true });
        }
      });

      await Promise.all(updatePromises);
      showToast(`⏳ Successfully marked ${selectedInvoiceIds.length} invoice(s) as Pending!`);
      setSelectedInvoiceIds([]);
    } catch (err) {
      console.error('Bulk mark as pending error:', err);
      showToast('⚠️ Failed to update some invoices');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoiceIds.length === 0) return;
    const count = selectedInvoiceIds.length;
    if (!window.confirm(`Are you sure you want to permanently delete ${count} selected invoice${count > 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }
    setIsBulkProcessing(true);
    try {
      for (const id of selectedInvoiceIds) {
        if (onDeleteInvoiceDraft) {
          await onDeleteInvoiceDraft(id);
        } else {
          const docRef = doc(db, 'studioInvoices', id);
          await deleteDoc(docRef);
        }
      }
      showToast(`🗑️ Successfully deleted ${count} invoice${count > 1 ? 's' : ''}!`);
      setSelectedInvoiceIds([]);
    } catch (err) {
      console.error('Bulk delete error:', err);
      showToast('⚠️ Failed to delete selected invoices');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto px-2 sm:px-4 print:p-0 print:m-0">
      
      {/* ================= TOP NAVIGATION TABS ================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-2.5 rounded-2xl print:hidden shadow-xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveInvoiceTab('builder')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeInvoiceTab === 'builder'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Invoice Builder & GST Tax Bill</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveInvoiceTab('templates')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeInvoiceTab === 'templates'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveInvoiceTab('history')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeInvoiceTab === 'history'
                ? 'bg-blue-500 text-slate-950 shadow-md shadow-blue-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Saved Invoices ({invoices.length})</span>
          </button>
        </div>

        {activeInvoiceTab === 'builder' && (
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setBuilderDisplayMode('form')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                builderDisplayMode === 'form'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Editor Form Only"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setBuilderDisplayMode('split')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                builderDisplayMode === 'split'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Side-by-Side Split View"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split View</span>
            </button>

            <button
              type="button"
              onClick={() => setBuilderDisplayMode('live_sheet')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                builderDisplayMode === 'live_sheet'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="WYSIWYG Tax Invoice Sheet"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Live Sheet</span>
            </button>
          </div>
        )}
      </div>

      {activeInvoiceTab === 'history' ? (
        /* ================= SAVED INVOICES HISTORY VIEW ================= */
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Firestore Registry
                </span>
                <span className="text-xs text-slate-400 font-medium">• {invoices.length} Registered Invoices</span>
              </div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <FileCheck className="w-6 h-6 text-blue-400" />
                GST Invoice Registry & Settlement History
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Monitor GST billings, issue dates, due dates, and settlement balances across studio partners.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setHistoryViewMode('grid')}
                  className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    historyViewMode === 'grid' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryViewMode('table')}
                  className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    historyViewMode === 'table' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setActiveInvoiceTab('builder')}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Invoice
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search invoice # or studio..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    historyStatusFilter === 'all'
                      ? 'bg-slate-100 text-slate-950'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/50'
                  }`}
                >
                  All ({invoices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    historyStatusFilter === 'pending'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800/80 text-amber-400 hover:text-amber-300 border border-amber-500/20'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  Pending ({invoices.filter(i => getInvoiceEffectiveStatus(i) === 'pending').length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter('overdue')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    historyStatusFilter === 'overdue'
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800/80 text-rose-400 hover:text-rose-300 border border-rose-500/20'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  Overdue ({invoices.filter(i => getInvoiceEffectiveStatus(i) === 'overdue').length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryStatusFilter('paid')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    historyStatusFilter === 'paid'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800/80 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Paid ({invoices.filter(i => getInvoiceEffectiveStatus(i) === 'paid').length})
                </button>
              </div>
            </div>

            {/* Quick Selection Toolbar Row */}
            {filteredInvoices.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      isAllFilteredSelected 
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                        : isSomeFilteredSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeFilteredSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500 pointer-events-none"
                    />
                    <span>
                      {isAllFilteredSelected 
                        ? `All ${filteredInvoices.length} Selected` 
                        : isSomeFilteredSelected 
                        ? `${selectedInvoiceIds.length} Selected` 
                        : `Select All (${filteredInvoices.length})`}
                    </span>
                  </button>

                  {selectedInvoiceIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-[11px] text-slate-400 hover:text-rose-400 underline transition-colors cursor-pointer px-2 py-1"
                    >
                      Deselect All
                    </button>
                  )}
                </div>

                {/* Bulk Action Controls */}
                {selectedInvoiceIds.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBulkDownloadPdfs}
                      disabled={isBulkProcessing}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                      title="Download all selected invoices as PDF files"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {selectedInvoiceIds.length} PDF{selectedInvoiceIds.length > 1 ? 's' : ''}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkMarkAsPaid}
                      disabled={isBulkProcessing}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Paid</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkMarkAsPending}
                      disabled={isBulkProcessing}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mark Pending</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={isBulkProcessing}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <span>Showing {filteredInvoices.length} {filteredInvoices.length === 1 ? 'record' : 'records'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <p>No invoices found matching your active filter criteria.</p>
            </div>
          ) : historyViewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInvoices.map((inv) => {
                const effectiveStatus = getInvoiceEffectiveStatus(inv);
                const issuedDisplay = inv.issuedDate || inv.date || 'N/A';
                const dueDisplay = inv.dueDate || 'On Receipt';
                const isMenuOpen = activeQuickMenuId === inv.id;
                const isSelected = selectedInvoiceIds.includes(inv.id);

                return (
                  <div
                    key={inv.id}
                    className={`bg-slate-950/90 rounded-2xl border p-5 flex flex-col justify-between space-y-4 shadow-lg transition-all relative ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/50 bg-amber-500/[0.04]'
                        : effectiveStatus === 'overdue'
                        ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/20 to-slate-950/90'
                        : effectiveStatus === 'paid'
                        ? 'border-emerald-500/30'
                        : 'border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {/* Checkbox Button */}
                          <div 
                            onClick={(e) => handleToggleSelectInvoice(inv.id, e)}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm' 
                                : 'bg-slate-900 border-slate-700 hover:border-amber-500/60 text-transparent'
                            }`}
                            title={isSelected ? 'Deselect invoice' : 'Select invoice'}
                          >
                            <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                          </div>

                          <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                            {inv.invoiceNo || inv.id}
                          </span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            effectiveStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                            effectiveStatus === 'overdue' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                            'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          }`}>
                            {effectiveStatus.toUpperCase()}
                          </span>
                        </div>

                        {/* Top Header Quick Action Pill */}
                        <div className="relative" data-quick-actions-menu="true">
                          <button
                            type="button"
                            data-quick-actions-trigger="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveQuickMenuId(isMenuOpen ? null : inv.id);
                            }}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 text-xs ${
                              isMenuOpen 
                                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md' 
                                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:text-white'
                            }`}
                            title="Quick Actions Menu"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[11px] font-bold hidden sm:inline">Actions</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-white tracking-tight">
                        {inv.studioName || 'Studio Invoice'}
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 font-sans">
                          <Calendar className="w-3 h-3 text-blue-400" /> Issued
                        </span>
                        <p className="font-bold text-slate-200 mt-0.5">{issuedDisplay}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 font-sans">
                          <Clock className="w-3 h-3 text-amber-400" /> Due
                        </span>
                        <p className="font-bold text-amber-300 mt-0.5">{dueDisplay}</p>
                      </div>
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/60 space-y-1 text-xs">
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Taxable Value:</span>
                        <span className="font-mono text-slate-200">₹{(inv.projectTotal || inv.taxableAmount || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold text-white pt-1 border-t border-slate-800">
                        <span>Net Payable:</span>
                        <span className="text-amber-400 font-mono text-sm">₹{(inv.totalPayable || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Quick Actions Row */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 relative">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={effectiveStatus}
                          onChange={(e) => handleQuickUpdateInvoiceStatus(inv.id, e.target.value as any)}
                          className="bg-slate-900 text-[11px] font-bold rounded-lg px-2 py-1 border border-slate-700/80 text-amber-400 outline-none cursor-pointer"
                        >
                          <option value="pending">⏳ Pending</option>
                          <option value="paid">✓ Paid</option>
                          <option value="overdue">⚠️ Overdue</option>
                          <option value="cancelled">✕ Cancelled</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* 1-Click Quick Download PDF Button */}
                        <button
                          type="button"
                          onClick={() => handleDownloadSavedInvoicePdf(inv)}
                          disabled={isGeneratingPdf}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Download GST Invoice PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>

                        {/* 1-Click Quick Mark as Paid Button */}
                        {effectiveStatus !== 'paid' ? (
                          <button
                            type="button"
                            onClick={() => handleMarkInvoiceAsPaid(inv)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            title="1-Click Mark as Paid"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark as Paid</span>
                          </button>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Paid
                          </span>
                        )}

                        {/* 1-Click Quick Resend Button */}
                        <button
                          type="button"
                          onClick={() => handleResendInvoiceWhatsApp(inv)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                          title="Resend Invoice via WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Resend</span>
                        </button>

                        {/* Quick Actions Dropdown Button */}
                        <div className="relative" data-quick-actions-menu="true">
                          <button
                            type="button"
                            data-quick-actions-trigger="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveQuickMenuId(isMenuOpen ? null : inv.id);
                            }}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isMenuOpen 
                                ? 'bg-amber-500 text-slate-950 border-amber-500' 
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/80'
                            }`}
                            title="More Quick Actions"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {/* Dropdown Popover */}
                          {isMenuOpen && (
                            <div 
                              className="absolute right-0 bottom-full mb-2 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                                <span>Quick Actions</span>
                                <span className="text-amber-400 font-mono">#{inv.invoiceNo || inv.id}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDownloadSavedInvoicePdf(inv)}
                                className="w-full px-3 py-2 text-left text-xs font-bold text-amber-400 hover:bg-amber-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <Download className="w-4 h-4 text-amber-400" />
                                <span>Download PDF Invoice</span>
                              </button>

                              {effectiveStatus !== 'paid' ? (
                                <button
                                  type="button"
                                  onClick={() => handleMarkInvoiceAsPaid(inv)}
                                  className="w-full px-3 py-2 text-left text-xs font-bold text-emerald-400 hover:bg-emerald-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  <span>Mark as Paid</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleQuickUpdateInvoiceStatus(inv.id, 'pending')}
                                  className="w-full px-3 py-2 text-left text-xs font-bold text-amber-400 hover:bg-amber-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                >
                                  <Clock className="w-4 h-4 text-amber-400" />
                                  <span>Mark as Pending</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleResendInvoiceWhatsApp(inv)}
                                className="w-full px-3 py-2 text-left text-xs font-bold text-blue-400 hover:bg-blue-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <MessageSquare className="w-4 h-4 text-blue-400" />
                                <span>Resend via WhatsApp</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleResendInvoiceEmail(inv)}
                                className="w-full px-3 py-2 text-left text-xs font-bold text-indigo-400 hover:bg-indigo-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <Mail className="w-4 h-4 text-indigo-400" />
                                <span>Resend via Email</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyInvoiceSummary(inv)}
                                className="w-full px-3 py-2 text-left text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <Copy className="w-4 h-4 text-slate-400" />
                                <span>Copy Payment Breakdown</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleLoadInvoiceIntoBuilder(inv)}
                                className="w-full px-3 py-2 text-left text-xs font-bold text-amber-300 hover:bg-amber-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <Eye className="w-4 h-4 text-amber-400" />
                                <span>Open & Edit in Builder</span>
                              </button>

                              <div className="border-t border-slate-800 my-1"></div>

                              <button
                                type="button"
                                onClick={() => handleDeleteInvoice(inv)}
                                className="w-full px-3 py-2 text-left text-xs font-bold text-rose-400 hover:bg-rose-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4 text-rose-400" />
                                <span>Delete Invoice Draft</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <div className="bg-slate-950/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="p-4 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomeFilteredSelected;
                          }}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
                          title="Select / Deselect All Visible"
                        />
                      </th>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Studio / Client</th>
                      <th className="p-4">Issued Date</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4 text-right">Taxable</th>
                      <th className="p-4 text-right">Net Payable</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredInvoices.map((inv) => {
                      const effectiveStatus = getInvoiceEffectiveStatus(inv);
                      const issuedDisplay = inv.issuedDate || inv.date || 'N/A';
                      const dueDisplay = inv.dueDate || 'On Receipt';
                      const isMenuOpen = activeQuickMenuId === inv.id;
                      const isSelected = selectedInvoiceIds.includes(inv.id);

                      return (
                        <tr 
                          key={inv.id} 
                          className={`transition-colors ${
                            isSelected 
                              ? 'bg-amber-500/10 hover:bg-amber-500/15' 
                              : 'hover:bg-slate-900/50'
                          }`}
                        >
                          <td className="p-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectInvoice(inv.id)}
                              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer accent-amber-500"
                              title={isSelected ? 'Deselect invoice' : 'Select invoice'}
                            />
                          </td>
                          <td className="p-4 font-mono font-bold text-amber-400">
                            {inv.invoiceNo || inv.id}
                          </td>
                          <td className="p-4 font-bold text-white">
                            {inv.studioName || 'Studio Invoice'}
                          </td>
                          <td className="p-4 text-slate-300 font-mono">
                            {issuedDisplay}
                          </td>
                          <td className="p-4 text-amber-300 font-mono">
                            {dueDisplay}
                          </td>
                          <td className="p-4 text-right font-mono text-slate-300">
                            ₹{(inv.projectTotal || inv.taxableAmount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-amber-400">
                            ₹{(inv.totalPayable || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              effectiveStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                              effectiveStatus === 'overdue' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                              'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            }`}>
                              {effectiveStatus.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 relative">
                              {/* 1-Click Quick Download PDF Button */}
                              <button
                                type="button"
                                onClick={() => handleDownloadSavedInvoicePdf(inv)}
                                disabled={isGeneratingPdf}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Download GST Invoice PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>

                              {effectiveStatus !== 'paid' ? (
                                <button
                                  type="button"
                                  onClick={() => handleMarkInvoiceAsPaid(inv)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-slate-950 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                  title="Mark as Paid"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Mark Paid</span>
                                </button>
                              ) : (
                                <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Paid
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleResendInvoiceWhatsApp(inv)}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/30 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                title="Resend Invoice"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Resend</span>
                              </button>

                              <div className="relative" data-quick-actions-menu="true">
                                <button
                                  type="button"
                                  data-quick-actions-trigger="true"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveQuickMenuId(isMenuOpen ? null : inv.id);
                                  }}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                    isMenuOpen 
                                      ? 'bg-amber-500 text-slate-950 border-amber-500' 
                                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                                  }`}
                                  title="Quick Actions"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>

                                {isMenuOpen && (
                                  <div 
                                    className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 text-left"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                                      <span>Quick Actions</span>
                                      <span className="text-amber-400 font-mono">#{inv.invoiceNo || inv.id}</span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleDownloadSavedInvoicePdf(inv)}
                                      className="w-full px-3 py-2 text-left text-xs font-bold text-amber-400 hover:bg-amber-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                      <Download className="w-4 h-4 text-amber-400" />
                                      <span>Download PDF Invoice</span>
                                    </button>

                                    {effectiveStatus !== 'paid' ? (
                                      <button
                                        type="button"
                                        onClick={() => handleMarkInvoiceAsPaid(inv)}
                                        className="w-full px-3 py-2 text-left text-xs font-bold text-emerald-400 hover:bg-emerald-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                      >
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span>Mark as Paid</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleQuickUpdateInvoiceStatus(inv.id, 'pending')}
                                        className="w-full px-3 py-2 text-left text-xs font-bold text-amber-400 hover:bg-amber-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                      >
                                        <Clock className="w-4 h-4 text-amber-400" />
                                        <span>Mark as Pending</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleResendInvoiceWhatsApp(inv)}
                                      className="w-full px-3 py-2 text-left text-xs font-bold text-blue-400 hover:bg-blue-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                      <MessageSquare className="w-4 h-4 text-blue-400" />
                                      <span>Resend via WhatsApp</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleResendInvoiceEmail(inv)}
                                      className="w-full px-3 py-2 text-left text-xs font-bold text-indigo-400 hover:bg-indigo-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                      <Mail className="w-4 h-4 text-indigo-400" />
                                      <span>Resend via Email</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleCopyInvoiceSummary(inv)}
                                      className="w-full px-3 py-2 text-left text-xs font-bold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                      <Copy className="w-4 h-4 text-slate-400" />
                                      <span>Copy Payment Breakdown</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleLoadInvoiceIntoBuilder(inv)}
                                      className="w-full px-3 py-2 text-left text-xs font-bold text-amber-300 hover:bg-amber-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                      <Eye className="w-4 h-4 text-amber-400" />
                                      <span>Open & Edit in Builder</span>
                                    </button>

                                    <div className="border-t border-slate-800 my-1"></div>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteInvoice(inv)}
                                      className="w-full px-3 py-2 text-left text-xs font-bold text-rose-400 hover:bg-rose-500/15 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4 text-rose-400" />
                                      <span>Delete Invoice Draft</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Floating Multi-Select Action Toolbar */}
          {selectedInvoiceIds.length > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-200">
              <div className="bg-slate-900/95 border-2 border-amber-500/60 backdrop-blur-xl rounded-2xl p-3 sm:px-5 sm:py-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
                    <CheckSquare className="w-4 h-4" />
                    <span>{selectedInvoiceIds.length} Selected</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-xs text-slate-300 hover:text-amber-400 underline hidden sm:inline cursor-pointer"
                  >
                    {isAllFilteredSelected ? 'Deselect all' : `Select all (${filteredInvoices.length})`}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBulkMarkAsPaid}
                    disabled={isBulkProcessing}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    title="Mark all selected as Paid"
                  >
                    {isBulkProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Mark as Paid</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={isBulkProcessing}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 active:scale-95 text-rose-400 hover:text-white border border-rose-500/40 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    title="Delete all selected invoices"
                  >
                    {isBulkProcessing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Delete ({selectedInvoiceIds.length})</span>
                  </button>

                  <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>

                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeInvoiceTab === 'templates' ? (
        /* ================= WHATSAPP TEMPLATES TAB ================= */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              WhatsApp Message Automation & Stage Templates
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Customize payment reminders, GST tax breakdowns, advance receipts, and final file delivery templates.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(Object.entries(templates) as [string, WhatsAppInvoiceTemplate][]).map(([stageKey, tmpl]) => (
              <button
                key={stageKey}
                onClick={() => setEditingStage(stageKey)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  editingStage === stageKey
                    ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-emerald-400 block w-fit mb-2">
                  {tmpl.badge}
                </span>
                <p className="font-bold text-sm text-white">{tmpl.stageName}</p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tmpl.description}</p>
              </button>
            ))}
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Edit Template Text for: <span className="text-emerald-400">{templates[editingStage]?.stageName}</span>
            </label>
            <textarea
              rows={12}
              value={activeEditingText}
              onChange={(e) => setActiveEditingText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs sm:text-sm font-mono text-emerald-300 outline-none focus:border-emerald-500 leading-relaxed"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setTemplates(prev => ({
                    ...prev,
                    [editingStage]: {
                      ...prev[editingStage],
                      templateText: activeEditingText
                    }
                  }));
                  showToast('✅ Saved custom WhatsApp template!');
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg cursor-pointer"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= INVOICE BUILDER (SPLIT / FORM / LIVE SHEET) ================= */
        <div className="space-y-6">
          {/* Top Bar: Studio Selector & Meta */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <Building2 className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-slate-400 font-medium">Billed To Studio:</span>
              <select
                value={selectedStudioId}
                onChange={(e) => setSelectedStudioId(e.target.value)}
                className="bg-slate-800 text-amber-400 font-bold text-sm sm:text-base border border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none cursor-pointer"
              >
                <option value="all">🌐 All Studios / Cross-Studio Projects</option>
                <option value="direct">👤 Direct Wedding Client (Custom Bill)</option>
                {studios.map((s) => {
                  const count = projects.filter(p => p.studioId === s.id).length;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} ({count} {count === 1 ? 'Project' : 'Projects'})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <div className="bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60 flex items-center gap-2">
                <span className="text-slate-400 text-xs">Invoice #:</span>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="bg-transparent font-bold text-amber-400 w-28 outline-none text-right font-mono"
                />
              </div>

              <div className="bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-slate-400 text-xs">Issued:</span>
                <input
                  type="date"
                  value={issuedDate}
                  onChange={(e) => setIssuedDate(e.target.value)}
                  className="bg-transparent font-bold text-slate-200 outline-none cursor-pointer font-mono"
                />
              </div>

              <div className="bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400 text-xs">Due:</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-transparent font-bold text-amber-300 outline-none cursor-pointer font-mono"
                />
              </div>

              <div className="bg-slate-800/80 px-3 py-2 rounded-xl border border-slate-700/60 flex items-center gap-2">
                <span className="text-slate-400 text-xs">Status:</span>
                <select
                  value={invoiceStatus}
                  onChange={(e) => setInvoiceStatus(e.target.value as any)}
                  className={`bg-slate-900 font-bold text-xs rounded-lg px-2.5 py-1 outline-none border cursor-pointer ${
                    invoiceStatus === 'paid' ? 'text-emerald-400 border-emerald-500/40' :
                    invoiceStatus === 'overdue' ? 'text-rose-400 border-rose-500/40' :
                    'text-amber-400 border-amber-500/40'
                  }`}
                >
                  <option value="pending">⏳ Pending</option>
                  <option value="paid">✓ Paid</option>
                  <option value="overdue">⚠️ Overdue</option>
                  <option value="cancelled">✕ Cancelled</option>
                </select>
              </div>

              {/* Header Quick Download / Preview / Print Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={handleGeneratePDF}
                  disabled={isGeneratingPdf}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                  title="Download Formatted PDF Invoice"
                >
                  {isGeneratingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPreviewModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                  title="Full-Screen Preview"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Preview</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
                  title="Print / Save as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-300" />
                  <span className="hidden md:inline">Print</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5 Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 print:hidden">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Items</span>
              <span className="text-2xl font-extrabold text-white mt-2">{allInvoiceItems.length}</span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Taxable Business</span>
              <span className="text-xl font-extrabold text-emerald-400 mt-2 font-mono">
                ₹{taxableAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total GST Tax</span>
              <span className="text-xl font-extrabold text-amber-400 mt-2 font-mono">
                ₹{totalGstAmount.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Advance Adjusted</span>
              <span className="text-xl font-extrabold text-blue-400 mt-2 font-mono">
                ₹{advanceTotal.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 col-span-2 sm:col-span-1 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Balance Due</span>
              <span className="text-xl font-extrabold text-amber-300 mt-2 font-mono">
                ₹{totalPayable.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Builder Layout (Split / Form / Live Sheet) */}
          <div className={builderDisplayMode === 'split' ? 'grid grid-cols-1 xl:grid-cols-12 gap-6 items-start' : 'space-y-6'}>
            
            {/* LEFT COLUMN: EDITABLE FORMS */}
            {(builderDisplayMode === 'form' || builderDisplayMode === 'split') && (
              <div className={`${builderDisplayMode === 'split' ? 'xl:col-span-6' : 'w-full'} space-y-6 print:hidden`}>
                
                {/* 0. Select Invoice Template (Minimal vs Professional) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-amber-400" />
                      <h3 className="text-base font-bold text-white tracking-wide">SELECT INVOICE TEMPLATE</h3>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Layout: {templateLayout.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setTemplateLayout('minimal')}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        templateLayout === 'minimal'
                          ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${templateLayout === 'minimal' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                        <LayoutGrid className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${templateLayout === 'minimal' ? 'text-amber-400' : 'text-white'}`}>Minimal Template</span>
                          {templateLayout === 'minimal' && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          Clean modern design with streamlined headers, compact table, and condensed payment strip.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTemplateLayout('professional')}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        templateLayout === 'professional'
                          ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${templateLayout === 'professional' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${templateLayout === 'professional' ? 'text-amber-400' : 'text-white'}`}>Professional Template</span>
                          {templateLayout === 'professional' && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          Structured executive layout with full tax matrices, QR block, and formal studio branding.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 1. GST & Tax Billing Configuration */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Percent className="w-5 h-5 text-amber-400" />
                      <h3 className="text-base font-bold text-white tracking-wide">GST BILLING & TAX SETTINGS</h3>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-bold text-amber-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={gstEnabled}
                        onChange={(e) => setGstEnabled(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 cursor-pointer"
                      />
                      Enable GST ({gstRate}%)
                    </label>
                  </div>

                  {gstEnabled && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="text-slate-400 block mb-1">GST Tax Rate</label>
                          <select
                            value={gstRate}
                            onChange={(e) => setGstRate(Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none"
                          >
                            <option value={18}>18% (Standard Media Post SAC 998314)</option>
                            <option value={12}>12% (Photography & Video Services)</option>
                            <option value={5}>5% (Print / Physical Deliverables)</option>
                            <option value={28}>28% (Luxury Cinema Package)</option>
                            <option value={0}>0% (Exempt / Non-GST)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Tax Classification</label>
                          <select
                            value={gstTaxType}
                            onChange={(e) => setGstTaxType(e.target.value as any)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none"
                          >
                            <option value="intra">Intra-State (CGST + SGST)</option>
                            <option value="inter">Inter-State (IGST)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Place of Supply</label>
                          <select
                            value={placeOfSupply}
                            onChange={(e) => setPlaceOfSupply(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium outline-none"
                          >
                            {INDIAN_STATES.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Optional GST Breakdown Matrix Option Toggle */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <label className="flex items-center gap-2.5 text-xs font-semibold text-amber-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={showTaxMatrix}
                            onChange={(e) => setShowTaxMatrix(e.target.checked)}
                            className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 cursor-pointer"
                          />
                          <span>GST Tax Breakdown Matrix (CGST + SGST Table)</span>
                        </label>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${showTaxMatrix ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                          {showTaxMatrix ? 'Option: ON (Visible)' : 'Option: OFF (Hidden)'}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Client & Recipient Profile details */}
                  <div className="pt-2 border-t border-slate-800/80 text-xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-slate-400 block mb-1">Billed To (Studio / Client Name)</label>
                        <input
                          type="text"
                          value={buyerName}
                          onChange={(e) => setBuyerName(e.target.value)}
                          placeholder="e.g. Wedding By KK"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1">Client State</label>
                        <select
                          value={buyerState}
                          onChange={(e) => setBuyerState(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium outline-none"
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Projects & Custom Line Items */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Film className="w-5 h-5 text-amber-400" />
                      <h3 className="text-base font-bold text-white tracking-wide">SERVICES & PROJECTS</h3>
                    </div>

                    {studioProjects.length > 0 && (
                      <label className="flex items-center gap-2 text-xs font-semibold text-amber-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allProjectsSelected}
                          onChange={handleToggleSelectAllProjects}
                          className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 cursor-pointer"
                        />
                        Select All
                      </label>
                    )}
                  </div>

                  {/* Empty State Banner when no linked projects exist */}
                  {studioProjects.length === 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>No database projects linked under "{buyerName || currentStudio?.name || 'this studio'}".</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        To generate an accurate invoice, click below to add standard wedding packages with 1-click, or add custom line items:
                      </p>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            handleAddPresetService(PREDEFINED_SERVICE_TEMPLATES[0]);
                            handleAddPresetService(PREDEFINED_SERVICE_TEMPLATES[1]);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>+ Add 4K Film + Reel (₹60,000)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleAddPresetService(PREDEFINED_SERVICE_TEMPLATES[2]);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-400" />
                          <span>+ Traditional Video Edit (₹25,000)</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Auto-Loaded Projects */}
                  {studioProjects.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Linked Studio Projects ({studioProjects.length}):
                      </span>
                      <div className="divide-y divide-slate-800/80 bg-slate-950/60 rounded-xl p-2 border border-slate-800">
                        {studioProjects.map((p) => {
                          const isChecked = !!selectedProjectIds[p.id];
                          return (
                            <div
                              key={p.id}
                              onClick={() => handleToggleProject(p.id)}
                              className={`p-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-800/40 rounded-lg transition-colors ${
                                isChecked ? 'bg-amber-500/5' : 'opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleProject(p.id)}
                                  className="w-4 h-4 rounded text-amber-500 bg-slate-800 border-slate-700 cursor-pointer"
                                />
                                <div>
                                  <p className="font-bold text-white truncate">{p.coupleName}</p>
                                  <p className="text-[10px] text-slate-400">{p.eventType || 'Wedding Edit'} • SAC 998314</p>
                                </div>
                              </div>
                              <span className="font-mono font-bold text-amber-400">
                                ₹{(p.projectAmount || 0).toLocaleString('en-IN')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Predefined Quick Service Add Chips */}
                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Quick Add Wedding Services:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PREDEFINED_SERVICE_TEMPLATES.map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddPresetService(tmpl)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700/60 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-amber-400" />
                          <span>{tmpl.category}</span>
                          <span className="text-[10px] text-amber-400 font-mono">₹{(tmpl.unitRate/1000)}k</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Added Line Items */}
                  {customItems.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Custom Items Added ({customItems.length}):
                      </span>
                      <div className="divide-y divide-slate-800/80 bg-slate-950/60 rounded-xl p-2 border border-slate-800">
                        {customItems.map((item) => (
                          <div key={item.id} className="p-2 flex items-center justify-between gap-2 text-xs">
                            <div>
                              <p className="font-bold text-white">{item.description}</p>
                              <p className="text-[10px] text-slate-400">SAC: {item.sacCode} • Rate: ₹{item.unitRate.toLocaleString('en-IN')} × {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-amber-400">
                                ₹{item.amount.toLocaleString('en-IN')}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomItem(item.id)}
                                className="text-slate-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Custom Item Form */}
                  <form onSubmit={handleAddCustomItem} className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Custom Service Description..."
                      value={newCustomDesc}
                      onChange={(e) => setNewCustomDesc(e.target.value)}
                      className="sm:col-span-6 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Rate ₹"
                      value={newCustomRate}
                      onChange={(e) => setNewCustomRate(Number(e.target.value) || '')}
                      className="sm:col-span-3 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-bold outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newCustomDesc || !newCustomRate}
                      className="sm:col-span-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold rounded-xl px-3 py-2 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Item
                    </button>
                  </form>
                </div>

                {/* 2. ADVANCE PAYMENTS & ADJUSTMENTS */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h3 className="text-base font-bold text-white tracking-wide">2. ADVANCE PAYMENTS & ADJUSTMENTS</h3>
                        <p className="text-[11px] text-slate-400">Kitna advance mila, kis date ko, kisne diya aur payment mode (UPI/Bank/Cash)</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddAdvanceModal(true)}
                      className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Full Entry Modal
                    </button>
                  </div>

                  {/* Inline Fast Add Advance Form */}
                  <form onSubmit={handleCreateAdvance} className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Quick Add Advance Received:
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          placeholder="Kisne Diya (Payer Name)..."
                          value={newAdvPaidBy}
                          onChange={(e) => setNewAdvPaidBy(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-emerald-500 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <select
                          value={newAdvMode}
                          onChange={(e) => setNewAdvMode(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 outline-none focus:border-emerald-500 text-xs"
                        >
                          <option value="UPI">UPI / GPay / PhonePe</option>
                          <option value="Bank Transfer">Bank Transfer (IMPS/NEFT)</option>
                          <option value="Cash">Cash</option>
                          <option value="Cheque">Cheque</option>
                          <option value="Card">Card</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <input
                          type="number"
                          placeholder="Amount ₹"
                          value={newAdvAmount}
                          onChange={(e) => setNewAdvAmount(Number(e.target.value) || '')}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold outline-none focus:border-emerald-500 text-xs"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          type="submit"
                          disabled={!newAdvAmount || Number(newAdvAmount) <= 0}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg px-2 py-1.5 flex items-center justify-center gap-1 cursor-pointer text-xs shadow-sm transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Mode Breakdown Summary Strip */}
                  {Object.keys(sidebarModeBreakdown).length > 0 && (
                    <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400 uppercase font-bold flex items-center gap-1">
                          <Wallet className="w-3 h-3 text-amber-400" /> Mode Breakdown:
                        </span>
                        <span className="text-emerald-400 font-bold">
                          Total Adjusted: ₹{advanceTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.entries(sidebarModeBreakdown) as [string, { count: number; total: number }][]).map(([mode, data]) => (
                          <div 
                            key={mode}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-900 border border-slate-700 text-slate-200"
                          >
                            <span className="text-amber-400">{mode}:</span>
                            <span className="text-emerald-300">₹{data.total.toLocaleString('en-IN')}</span>
                            <span className="text-[9px] text-slate-500 font-normal">({data.count})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {advanceList.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">No advance payments recorded for this studio. Use the quick add box above to log an advance.</p>
                  ) : (
                    <div className="divide-y divide-slate-800/80 bg-slate-950/60 rounded-xl p-2 border border-slate-800 text-xs">
                      {advanceList.map((adv) => (
                        <div key={adv.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-900/50 rounded-lg transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={adv.adjusted}
                              onChange={() => handleToggleAdvanceAdjust(adv.id)}
                              className="w-4 h-4 rounded text-emerald-500 bg-slate-800 border-slate-700 cursor-pointer"
                              title="Include/Exclude in Invoice"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-white text-xs truncate max-w-[180px]">{adv.paidBy}</p>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  {adv.paymentMode}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                                <span>{adv.date}</span>
                                {adv.referenceNo && (
                                  <span className="truncate max-w-[150px] text-slate-500">• {adv.referenceNo}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`font-mono font-bold text-xs ${adv.adjusted ? 'text-emerald-400' : 'text-slate-500 line-through'}`}>
                              -₹{adv.amount.toLocaleString('en-IN')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteAdvance(adv.id)}
                              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                              title="Remove Payment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Previous Balance & Discount Row */}
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1">Previous Balance (+ ₹)</label>
                      <input
                        type="number"
                        value={previousBalance || ''}
                        onChange={(e) => setPreviousBalance(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-bold outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Discount (- ₹)</label>
                      <input
                        type="number"
                        value={discount || ''}
                        onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-rose-400 font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Bank Remittance Details */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-400" /> BANK REMITTANCE CREDENTIALS
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">Printed on Invoice</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-slate-400 block mb-1">Account Holder Name</label>
                      <input
                        type="text"
                        value={accountHolder}
                        onChange={(e) => setAccountHolder(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-semibold outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Account Number</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">IFSC Code</label>
                      <input
                        type="text"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold outline-none focus:border-amber-400 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 4B. PROMINENT UPI & PAYMENT QR CODE GENERATOR / LIBRARY / UPLOAD */}
                <div className="bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-4 text-xs relative overflow-hidden">
                  {/* Glowing header accent */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <QrCode className="w-5 h-5 text-amber-400" /> CLIENT PAYMENT QR CODE & SCANNER STATION
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Dynamic live preview, pre-saved banking QR presets, and custom merchant standee uploader
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Prominence size toggle */}
                      <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                        <button
                          type="button"
                          onClick={() => setQrSize('normal')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all ${
                            qrSize === 'normal' 
                              ? 'bg-amber-400 text-slate-950 shadow-xs' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Standard (96px)
                        </button>
                        <button
                          type="button"
                          onClick={() => setQrSize('prominent')}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono transition-all ${
                            qrSize === 'prominent' 
                              ? 'bg-amber-400 text-slate-950 shadow-xs' 
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          ★ Prominent (128px)
                        </button>
                      </div>

                      {/* Display on Invoice Toggle */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={showQrOnInvoice}
                          onChange={(e) => setShowQrOnInvoice(e.target.checked)}
                          className="w-4 h-4 rounded text-amber-400 accent-amber-400 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-200">Show on Invoice</span>
                      </label>
                    </div>
                  </div>

                  {/* HERO DYNAMIC LIVE QR PREVIEW SECTION CARD */}
                  <div className="p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-2xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Left: QR Display with high-contrast frame */}
                      <div className="flex items-center gap-4">
                        <div 
                          onClick={() => setShowQrZoomModal(true)}
                          className="relative p-2 bg-white rounded-2xl shadow-xl border-2 border-amber-400/40 shrink-0 group cursor-pointer hover:border-amber-400 transition-all hover:scale-105"
                          title="Click to Zoom & Inspect Scan Quality"
                        >
                          <img 
                            src={qrCodeUrl || (activeSavedProfile?.imageUrl) || 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=upi://pay'} 
                            alt="Active Live QR Preview" 
                            className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-lg block"
                            style={{ imageRendering: '-webkit-optimize-contrast' }}
                            crossOrigin="anonymous"
                          />
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center text-white font-bold text-[10px] gap-1">
                            <ZoomIn className="w-4 h-4 text-amber-300" /> Zoom
                          </div>
                        </div>

                        {/* Middle: Active QR Details & Quality Badges */}
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-white text-sm truncate">
                              {qrCodeMode === 'saved_preset' 
                                ? activeSavedProfile?.name || 'Pre-Saved QR Profile'
                                : qrCodeMode === 'custom_upload'
                                ? 'Uploaded Merchant Standee QR'
                                : 'Dynamic Live Smart UPI QR'}
                            </span>
                            <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" /> 300 DPI Crisp Stamp
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px]">
                            <span>UPI: <span className="text-amber-300 font-bold">{qrCodeMode === 'saved_preset' && activeSavedProfile?.upiId ? activeSavedProfile.upiId : upiId}</span></span>
                            <span>•</span>
                            <span className="text-slate-400 truncate">{accountHolder}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                              {qrCodeLabel}
                            </span>
                            <span>• GPay, PhonePe, Paytm, BHIM, Cred</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Action Controls */}
                      <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowQrZoomModal(true)}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          <ZoomIn className="w-3.5 h-3.5 text-amber-400" /> Inspect & Zoom
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleDownloadQrImage}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                          title="Download high-resolution 320x320 PNG image"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" /> Download PNG
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (generatedUpiUri) {
                              navigator.clipboard.writeText(generatedUpiUri);
                              setQrCopied(true);
                              setTimeout(() => setQrCopied(false), 2000);
                            }
                          }}
                          className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          {qrCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {qrCopied ? 'Link Copied!' : 'Copy UPI Link'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 3-WAY MODE SELECTOR TABS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setQrCodeMode('saved_preset')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        qrCodeMode === 'saved_preset'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-extrabold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" /> 🗂️ Pre-Saved QR Library ({savedQrList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrCodeMode('auto_upi')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        qrCodeMode === 'auto_upi'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-extrabold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" /> ⚡ Dynamic Smart UPI QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrCodeMode('custom_upload')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        qrCodeMode === 'custom_upload'
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-extrabold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" /> 📸 Upload Merchant QR
                    </button>
                  </div>

                  {/* TAB 1: PRE-SAVED QR LIBRARY */}
                  {qrCodeMode === 'saved_preset' && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-xs font-medium">
                          Select a verified studio banking QR preset to apply immediately:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewPresetName(`Studio QR ${savedQrList.length + 1}`);
                            setNewPresetBankOrApp('PhonePe / Merchant Standee');
                            setShowSaveQrModal(true);
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Save Current as New Preset
                        </button>
                      </div>

                      {/* Saved QRs Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {savedQrList.map((profile) => {
                          const isSelected = selectedQrProfileId === profile.id;
                          return (
                            <div
                              key={profile.id}
                              onClick={() => handleSelectSavedQr(profile)}
                              className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-amber-500/15 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1 bg-white rounded-lg shadow-sm shrink-0 border border-slate-200">
                                  <img 
                                    src={profile.imageUrl} 
                                    alt={profile.name} 
                                    className="w-10 h-10 object-contain rounded"
                                    crossOrigin="anonymous"
                                  />
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-white text-xs truncate max-w-[150px]">
                                      {profile.name}
                                    </span>
                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${profile.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'}`}>
                                      {profile.bankOrApp}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-amber-300 font-mono truncate">
                                    {profile.upiId}
                                  </p>
                                  <p className="text-[9px] text-slate-400 truncate">
                                    {profile.accountHolder}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {isSelected ? (
                                  <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-md">
                                    Select
                                  </span>
                                )}

                                {!profile.isDefault && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteSavedQr(profile.id, e)}
                                    className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer ml-1"
                                    title="Delete this custom preset"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: AUTO DYNAMIC UPI QR CONFIG */}
                  {qrCodeMode === 'auto_upi' && (
                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 block mb-1">UPI ID (VPA)</label>
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            placeholder="e.g. 7772999933@upi or studio@okhdfcbank"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold outline-none focus:border-amber-400 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1">Invoice Reference / Note</label>
                          <input
                            type="text"
                            value={qrPayeeNote}
                            onChange={(e) => setQrPayeeNote(e.target.value)}
                            placeholder={`Invoice-${invoiceNo}`}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-amber-400 transition-colors"
                          />
                        </div>
                      </div>

                      {/* Amount Embedding Strategy */}
                      <div className="space-y-2">
                        <label className="text-slate-400 block">QR Amount Encoding:</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setQrAmountMode('balance_due')}
                            className={`p-2.5 rounded-xl border text-left flex flex-col transition-all cursor-pointer ${
                              qrAmountMode === 'balance_due'
                                ? 'bg-amber-500/15 border-amber-400 text-white shadow-xs'
                                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <span className="font-bold text-xs flex items-center justify-between">
                              <span>Exact Balance Due</span>
                              {qrAmountMode === 'balance_due' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                            </span>
                            <span className="font-mono text-amber-400 font-bold text-sm mt-1">
                              ₹{totalPayable.toLocaleString('en-IN')}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setQrAmountMode('open_amount')}
                            className={`p-2.5 rounded-xl border text-left flex flex-col transition-all cursor-pointer ${
                              qrAmountMode === 'open_amount'
                                ? 'bg-amber-500/15 border-amber-400 text-white shadow-xs'
                                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <span className="font-bold text-xs flex items-center justify-between">
                              <span>Open Amount</span>
                              {qrAmountMode === 'open_amount' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-1">
                              Client enters amount in UPI app
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setQrAmountMode('custom_amount');
                              if (customQrAmount === 0) setCustomQrAmount(totalPayable);
                            }}
                            className={`p-2.5 rounded-xl border text-left flex flex-col transition-all cursor-pointer ${
                              qrAmountMode === 'custom_amount'
                                ? 'bg-amber-500/15 border-amber-400 text-white shadow-xs'
                                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <span className="font-bold text-xs flex items-center justify-between">
                              <span>Custom Amount</span>
                              {qrAmountMode === 'custom_amount' && <Check className="w-3.5 h-3.5 text-amber-400" />}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-1">
                              Specify custom sum
                            </span>
                          </button>
                        </div>

                        {qrAmountMode === 'custom_amount' && (
                          <div className="pt-2 animate-fadeIn">
                            <label className="text-slate-400 block mb-1">Custom Amount to Embed (₹)</label>
                            <input
                              type="number"
                              value={customQrAmount || ''}
                              onChange={(e) => setCustomQrAmount(Number(e.target.value) || 0)}
                              placeholder="Enter custom amount"
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold outline-none focus:border-amber-400"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: UPLOAD CUSTOM MERCHANT QR IMAGE */}
                  {qrCodeMode === 'custom_upload' && (
                    <div className="space-y-4 pt-1">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png, image/jpeg, image/webp, image/svg+xml"
                        onChange={handleQrImageUpload}
                        className="hidden"
                        id="custom-qr-file-input"
                      />

                      {customQrImage ? (
                        /* Uploaded QR Preview & Actions */
                        <div className="p-4 bg-slate-950/90 rounded-2xl border border-emerald-500/40 space-y-3">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className="p-2 bg-white rounded-xl shadow-lg shrink-0 border border-slate-200">
                                <img 
                                  src={customQrImage} 
                                  alt="Custom Merchant QR" 
                                  className="w-20 h-20 object-contain rounded-lg"
                                />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-sm">Custom Merchant QR Loaded</span>
                                  <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> Active Standee
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400">
                                  Stamped clearly with crisp contrast on printable GST tax invoice.
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewPresetName('My Custom Studio Standee');
                                  setNewPresetBankOrApp('PhonePe / Merchant Standee');
                                  setShowSaveQrModal(true);
                                }}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer transition-colors shadow-md"
                              >
                                <BookmarkCheck className="w-3.5 h-3.5" /> Save to Library
                              </button>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
                              >
                                <RefreshCw className="w-3.5 h-3.5" /> Replace
                              </button>
                              <button
                                type="button"
                                onClick={handleClearCustomQr}
                                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-semibold cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Upload Dropzone */
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              const input = fileInputRef.current;
                              if (input) {
                                const dataTransfer = new DataTransfer();
                                dataTransfer.items.add(file);
                                input.files = dataTransfer.files;
                                handleQrImageUpload({ target: input } as any);
                              }
                            }
                          }}
                          className="border-2 border-dashed border-slate-700 hover:border-amber-400 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-950/50 hover:bg-slate-950 group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                            <Upload className="w-6 h-6 text-amber-400" />
                          </div>
                          <h4 className="text-sm font-bold text-white mb-1">
                            Click to Upload or Drag & Drop Merchant QR Code Image
                          </h4>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-2">
                            Upload your official BharatPe, PhonePe, Google Pay Business Standee or Bank UPI QR code (PNG, JPG, SVG, WebP).
                          </p>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-amber-300 text-[10px] font-mono font-bold">
                            <span>💾</span> Automatically saved for all future client invoices
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 5. Google Drive & Terms */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 text-xs">
                  <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                    DELIVERY LINK & TERMS
                  </h3>
                  <div>
                    <label className="text-slate-400 block mb-1">Google Drive Folder Link</label>
                    <input
                      type="text"
                      value={driveLink}
                      onChange={(e) => setDriveLink(e.target.value)}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-blue-400 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Terms & Conditions</label>
                    <input
                      type="text"
                      value={termsBadgeText}
                      onChange={(e) => setTermsBadgeText(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 outline-none"
                    />
                  </div>
                </div>

                {/* 6. Digital Signature & Signatory */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded bg-amber-500/20 text-amber-400">
                        <PenTool className="w-4 h-4" />
                      </span>
                      <h3 className="text-base font-bold text-white uppercase tracking-wide">
                        Authorized Digital Signature
                      </h3>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-xs select-none">
                      <input 
                        type="checkbox" 
                        checked={showSignature} 
                        onChange={(e) => setShowSignature(e.target.checked)}
                        className="rounded accent-amber-500"
                      />
                      <span>Show on Invoice</span>
                    </label>
                  </div>

                  {showSignature && (
                    <div className="space-y-3">
                      {/* Signatory Name Field */}
                      <div>
                        <label className="text-slate-400 block mb-1 font-medium">
                          Signatory Name / Designation
                        </label>
                        <input
                          type="text"
                          value={signatureSignatoryName}
                          onChange={(e) => handleSignatoryNameChange(e.target.value)}
                          placeholder="e.g. Satish Tiwari (Founder / Lead Editor)"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-medium outline-none"
                        />
                      </div>

                      {/* Mode Switcher: Draw or Upload */}
                      <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setSignatureMode('draw')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            signatureMode === 'draw'
                              ? 'bg-amber-500 text-slate-950 shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          Draw Signature
                        </button>
                        <button
                          type="button"
                          onClick={() => setSignatureMode('upload')}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            signatureMode === 'upload'
                              ? 'bg-amber-500 text-slate-950 shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload Image (PNG/JPG)
                        </button>
                      </div>

                      {/* Draw Canvas Mode */}
                      {signatureMode === 'draw' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Draw inside box using mouse, trackpad, or finger:</span>
                            <button
                              type="button"
                              onClick={handleClearSignature}
                              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Eraser className="w-3 h-3" /> Clear Canvas
                            </button>
                          </div>
                          
                          <div className="bg-slate-950 border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-2 relative transition-colors flex items-center justify-center">
                            <canvas
                              ref={sigCanvasRef}
                              width={320}
                              height={100}
                              onMouseDown={startDrawing}
                              onMouseMove={drawSignature}
                              onMouseUp={stopDrawing}
                              onMouseLeave={stopDrawing}
                              onTouchStart={startDrawing}
                              onTouchMove={drawSignature}
                              onTouchEnd={stopDrawing}
                              className="w-full max-w-[320px] h-[100px] touch-none cursor-crosshair bg-[#17181c] rounded-xl border border-slate-800"
                            />
                            {!hasDrawnSig && !signatureImageUrl && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-500 text-xs italic">
                                ✍️ Sign here with mouse / touch
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Upload Mode */}
                      {signatureMode === 'upload' && (
                        <div className="space-y-2">
                          <input
                            ref={sigFileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp"
                            onChange={handleSignatureUpload}
                            className="hidden"
                            id="sig-file-upload-input"
                          />
                          <label
                            htmlFor="sig-file-upload-input"
                            className="w-full bg-slate-950 border-2 border-dashed border-slate-700 hover:border-amber-400 hover:bg-slate-800/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center"
                          >
                            <Upload className="w-6 h-6 text-amber-400" />
                            <div>
                              <p className="text-slate-200 font-bold">Choose Signature Image</p>
                              <p className="text-[10px] text-slate-400">PNG with transparent background, JPG, or SVG</p>
                            </div>
                          </label>
                        </div>
                      )}

                      {/* Active Signature Preview & Actions */}
                      {signatureImageUrl && (
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-10 bg-[#131417] border border-slate-700 rounded-lg p-1 flex items-center justify-center overflow-hidden">
                              <img
                                src={signatureImageUrl}
                                alt="Signature Preview"
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <div>
                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Signature Ready
                              </span>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                Embedded above Authorized Signatory
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleClearSignature}
                            className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-lg border border-rose-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RIGHT COLUMN: LIVE GST TAX INVOICE SHEET */}
            {(builderDisplayMode === 'live_sheet' || builderDisplayMode === 'split') && (
              <div className={`${builderDisplayMode === 'split' ? 'xl:col-span-6 xl:sticky xl:top-4' : 'w-full max-w-3xl mx-auto'} space-y-4`}>
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Live WYSIWYG GST Tax Invoice
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Real-time synced
                  </span>
                </div>

                <div ref={liveInvoicePreviewRef} className="shadow-2xl overflow-x-auto custom-scrollbar rounded-3xl w-full">
                  <GstInvoiceSheet
                    id="live-gst-invoice-sheet"
                    invoiceNo={invoiceNo}
                    issuedDate={issuedDate}
                    dueDate={dueDate}
                    invoiceStatus={invoiceStatus}
                    supplier={{
                      name: supplierName,
                      pan: supplierPan,
                      address: supplierAddress,
                      phone: supplierPhone,
                      email: supplierEmail,
                      state: supplierState
                    }}
                    buyer={{
                      name: buyerName || currentStudio?.name || 'Valued Client',
                      ownerName: buyerOwnerName || currentStudio?.ownerName || '',
                      pan: buyerPan || '',
                      address: buyerAddress || currentStudio?.address || '',
                      phone: buyerPhone || currentStudio?.phone || '',
                      email: buyerEmail || currentStudio?.email || '',
                      state: buyerState
                    }}
                    placeOfSupply={placeOfSupply}
                    reverseCharge={reverseCharge}
                    items={allInvoiceItems}
                    taxableAmount={taxableAmount}
                    gstEnabled={gstEnabled}
                    gstRate={gstRate}
                    gstTaxType={gstTaxType}
                    cgstAmount={cgstAmount}
                    sgstAmount={sgstAmount}
                    igstAmount={igstAmount}
                    totalGstAmount={totalGstAmount}
                    grossTotal={grossTotal}
                    previousBalance={previousBalance}
                    advanceTotal={advanceTotal}
                    advancePayments={advanceList.filter(a => a.adjusted)}
                    discount={discount}
                    totalPayable={totalPayable}
                    amountInWords={amountInWords}
                    bankDetails={{
                      accountHolder,
                      bankName,
                      accountNumber,
                      ifscCode,
                      upiId
                    }}
                    qrCodeUrl={qrCodeUrl}
                    qrCodeSize={qrSize}
                    qrCodeLabel={qrCodeLabel}
                    signatureImageUrl={signatureImageUrl}
                    signatureSignatoryName={signatureSignatoryName}
                    showSignature={showSignature}
                    termsBadgeText={termsBadgeText}
                    theme={invoiceTheme}
                    templateLayout={templateLayout}
                    showWatermark={true}
                    showTaxMatrix={showTaxMatrix}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ================= ACTION BUTTONS (BOTTOM BAR) ================= */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-4 z-20 backdrop-blur-md bg-slate-900/90 print:hidden">
            <div className="flex items-center gap-2">
              {toastMessage ? (
                <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-fadeIn">
                  <Sparkles className="w-4 h-4 text-amber-400" /> {toastMessage}
                </span>
              ) : saveSuccess ? (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-fadeIn">
                  <Check className="w-4 h-4" /> GST Invoice Saved!
                </span>
              ) : (
                <span className="text-xs text-slate-400">
                  GST Bill Total: <strong className="text-amber-400 font-mono">₹{totalPayable.toLocaleString('en-IN')}</strong>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setShowPreviewModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                Preview Modal
              </button>

              <button
                onClick={handleGenerateAndAttachPDF}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                Attach in Firestore
              </button>

              <button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <FileText className="w-4 h-4 text-blue-400" />}
                Download PDF
              </button>

              <button
                onClick={handleWhatsAppSend}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <Send className="w-4 h-4" />
                WhatsApp
              </button>

              <button
                onClick={handleEmailSend}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4 text-purple-400" />
                Email
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                Print
              </button>

              <button
                onClick={handleSaveDraft}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD ADVANCE PAYMENT MODAL ================= */}
      {showAddAdvanceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Log Advance Payment</h3>
              <button
                onClick={() => setShowAddAdvanceModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdvance} className="space-y-4 text-sm">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Paid By / Received From (Payer Name)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Satish Tiwari / Studio Owner"
                  value={newAdvPaidBy}
                  onChange={(e) => setNewAdvPaidBy(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Payment Mode</label>
                  <select
                    value={newAdvMode}
                    onChange={(e) => setNewAdvMode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                  >
                    <option value="UPI">UPI (GPay / PhonePe / Paytm / QR)</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT / IMPS / RTGS)</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Credit / Debit Card">Credit / Debit Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Other Online Payment">Other Online Payment</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Amount Received (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 25000"
                    value={newAdvAmount}
                    onChange={(e) => setNewAdvAmount(Number(e.target.value) || '')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-bold outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={newAdvDate}
                    onChange={(e) => setNewAdvDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Txn Ref / UTR / Note</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI Ref 3829104829"
                    value={newAdvRef}
                    onChange={(e) => setNewAdvRef(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Payment Remarks (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Booking Advance for Wedding Shoot"
                  value={newAdvNotes}
                  onChange={(e) => setNewAdvNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-300 outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAdvanceModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-lg cursor-pointer"
                >
                  Save Advance Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= FULLSCREEN PREVIEW INVOICE MODAL ================= */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto print:p-0 print:bg-transparent print:static print:overflow-visible print:block print:max-h-none">
          <div className="bg-[#1e2024] text-white rounded-3xl w-full max-w-4xl shadow-2xl my-auto relative overflow-hidden border border-white/10 font-sans print:bg-transparent print:border-none print:shadow-none print:max-w-none print:rounded-none print:my-0">
            <div className="p-4 sm:px-6 bg-[#17181c] border-b border-white/10 flex items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">GST Tax Invoice Sheet</span>
              </div>

              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-8 max-h-[75vh] overflow-y-auto print:p-0 print:max-h-none print:overflow-visible">
              <div ref={modalPreviewCardRef} className="w-full">
                <GstInvoiceSheet
                  id="modal-gst-invoice-sheet"
                  invoiceNo={invoiceNo}
                  issuedDate={issuedDate}
                  dueDate={dueDate}
                  invoiceStatus={invoiceStatus}
                  supplier={{
                    name: supplierName,
                    pan: supplierPan,
                    address: supplierAddress,
                    phone: supplierPhone,
                    email: supplierEmail,
                    state: supplierState
                  }}
                  buyer={{
                    name: buyerName || currentStudio?.name || 'Valued Client',
                    ownerName: buyerOwnerName || currentStudio?.ownerName || '',
                    pan: buyerPan || '',
                    address: buyerAddress || currentStudio?.address || '',
                    phone: buyerPhone || currentStudio?.phone || '',
                    email: buyerEmail || currentStudio?.email || '',
                    state: buyerState
                  }}
                  placeOfSupply={placeOfSupply}
                  reverseCharge={reverseCharge}
                  items={allInvoiceItems}
                  taxableAmount={taxableAmount}
                  gstEnabled={gstEnabled}
                  gstRate={gstRate}
                  gstTaxType={gstTaxType}
                  cgstAmount={cgstAmount}
                  sgstAmount={sgstAmount}
                  igstAmount={igstAmount}
                  totalGstAmount={totalGstAmount}
                  grossTotal={grossTotal}
                  previousBalance={previousBalance}
                  advanceTotal={advanceTotal}
                  advancePayments={advanceList.filter(a => a.adjusted)}
                  discount={discount}
                  totalPayable={totalPayable}
                  amountInWords={amountInWords}
                  bankDetails={{
                    accountHolder,
                    bankName,
                    accountNumber,
                    ifscCode,
                    upiId
                  }}
                  qrCodeUrl={qrCodeUrl}
                  qrCodeSize={qrSize}
                  qrCodeLabel={qrCodeLabel}
                  signatureImageUrl={signatureImageUrl}
                  signatureSignatoryName={signatureSignatoryName}
                  showSignature={showSignature}
                  termsBadgeText={termsBadgeText}
                  theme={invoiceTheme}
                  templateLayout={templateLayout}
                  showWatermark={true}
                  showTaxMatrix={showTaxMatrix}
                />
              </div>
            </div>

            <div className="p-4 sm:px-6 bg-[#17181c] border-t border-white/10 flex flex-wrap items-center justify-end gap-3 print:hidden">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleGeneratePDF}
                disabled={isGeneratingPdf}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                Download PDF
              </button>
              <button
                onClick={handleWhatsAppSend}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Send to WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= QR CODE ZOOM & INSPECTION MODAL ================= */}
      {showQrZoomModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-scaleUp">
            {/* Header */}
            <div className="p-4 sm:px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400">
                  <QrCode className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    QR Code Scan & Print Inspector
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    High-contrast verified rendering for client scanning & print output
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowQrZoomModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-center">
              {/* Crisp QR Code Box with scan target corners */}
              <div className="relative inline-block p-4 bg-white rounded-3xl shadow-2xl border-4 border-amber-400 mx-auto">
                <img 
                  src={qrCodeUrl || (activeSavedProfile?.imageUrl) || 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=upi://pay'} 
                  alt="Full Zoom QR Code" 
                  className="w-56 h-56 sm:w-64 sm:h-64 object-contain rounded-xl block mx-auto"
                  style={{ imageRendering: '-webkit-optimize-contrast' }}
                  crossOrigin="anonymous"
                />
                <div className="mt-2 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-amber-400 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border border-slate-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> {qrCodeLabel}
                  </span>
                </div>
              </div>

              {/* Payment Details Pill Card */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-left space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 font-sans">Payee Name:</span>
                  <span className="font-bold text-white">{accountHolder}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 font-sans">UPI ID (VPA):</span>
                  <span className="font-bold text-amber-300">{qrCodeMode === 'saved_preset' && activeSavedProfile?.upiId ? activeSavedProfile.upiId : upiId}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 font-sans">Encoded Amount:</span>
                  <span className="font-bold text-emerald-400">
                    {qrAmountMode === 'balance_due' 
                      ? `₹${totalPayable.toLocaleString('en-IN')}`
                      : qrAmountMode === 'custom_amount'
                      ? `₹${customQrAmount.toLocaleString('en-IN')}`
                      : 'Open (Client Enters Amount)'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400 font-sans">Invoice Reference:</span>
                  <span className="font-bold text-slate-200">{qrPayeeNote || `Invoice #${invoiceNo}`}</span>
                </div>
              </div>

              {/* Verified Apps Strip */}
              <div className="text-[11px] text-slate-400 flex items-center justify-center gap-2 flex-wrap font-sans">
                <span className="text-emerald-400 font-semibold">✓ Compatible:</span>
                <span>Google Pay</span> •
                <span>PhonePe</span> •
                <span>Paytm</span> •
                <span>BHIM UPI</span> •
                <span>CRED</span> •
                <span>Any Banking App</span>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 sm:px-6 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDownloadQrImage}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-400" /> Download High-Res PNG
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (generatedUpiUri) {
                      navigator.clipboard.writeText(generatedUpiUri);
                      setQrCopied(true);
                      setTimeout(() => setQrCopied(false), 2000);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold cursor-pointer transition-colors"
                >
                  {qrCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {qrCopied ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrZoomModal(false)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SAVE TO QR LIBRARY MODAL ================= */}
      {showSaveQrModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-scaleUp">
            <div className="p-4 sm:px-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Save to QR Code Library</h3>
              </div>
              <button
                onClick={() => setShowSaveQrModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-400">
                Save this banking preset or custom merchant standee to reuse across all your studio invoices with one click.
              </p>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Preset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Studio ICICI Current QR or PhonePe Reception Standee"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Bank / App / Provider Tag</label>
                <select
                  value={newPresetBankOrApp}
                  onChange={(e) => setNewPresetBankOrApp(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 outline-none focus:border-amber-400"
                >
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="State Bank of India">State Bank of India (SBI)</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="PhonePe / Merchant Standee">PhonePe / Merchant Standee</option>
                  <option value="Google Pay Business">Google Pay Business</option>
                  <option value="Paytm Soundbox / Standee">Paytm Standee</option>
                  <option value="BharatPe UPI Standee">BharatPe UPI Standee</option>
                  <option value="Other Bank UPI">Other Bank UPI</option>
                </select>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                <img 
                  src={customQrImage || qrCodeUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=upi://pay'} 
                  alt="Preset Preview" 
                  className="w-12 h-12 object-contain bg-white rounded-lg p-1 border border-slate-700"
                />
                <div className="space-y-0.5 min-w-0">
                  <p className="text-white font-bold truncate">{newPresetName || 'Unnamed Preset'}</p>
                  <p className="text-amber-300 font-mono text-[10px] truncate">{upiId || 'studio@upi'}</p>
                  <p className="text-slate-400 text-[10px] truncate">{accountHolder}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveQrModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCurrentToLibrary}
                  disabled={!newPresetName.trim()}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5"
                >
                  <BookmarkCheck className="w-4 h-4" /> Save Preset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFF-SCREEN CAPTURE REF FOR PDF GENERATION (Rendered with real DOM geometry for pixel-perfect PDF export) */}
      <div 
        className="print:hidden"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: -9999,
          opacity: 0,
          pointerEvents: 'none',
          width: '850px',
          overflow: 'hidden'
        }} 
        aria-hidden="true"
      >
        <div ref={printInvoiceRef} className={`w-[850px] min-w-[850px] ${invoiceTheme === 'classic_light' ? 'bg-white' : 'bg-[#131417]'}`}>
          <GstInvoiceSheet
            id="print-gst-invoice-sheet"
            invoiceNo={invoiceNo}
            issuedDate={issuedDate}
            dueDate={dueDate}
            invoiceStatus={invoiceStatus}
            supplier={{
              name: supplierName,
              pan: supplierPan,
              address: supplierAddress,
              phone: supplierPhone,
              email: supplierEmail,
              state: supplierState
            }}
            buyer={{
              name: buyerName || currentStudio?.name || 'Valued Client',
              ownerName: buyerOwnerName || currentStudio?.ownerName || '',
              pan: buyerPan || '',
              address: buyerAddress || currentStudio?.address || '',
              phone: buyerPhone || currentStudio?.phone || '',
              email: buyerEmail || currentStudio?.email || '',
              state: buyerState
            }}
            placeOfSupply={placeOfSupply}
            reverseCharge={reverseCharge}
            items={allInvoiceItems}
            taxableAmount={taxableAmount}
            gstEnabled={gstEnabled}
            gstRate={gstRate}
            gstTaxType={gstTaxType}
            cgstAmount={cgstAmount}
            sgstAmount={sgstAmount}
            igstAmount={igstAmount}
            totalGstAmount={totalGstAmount}
            grossTotal={grossTotal}
            previousBalance={previousBalance}
            advanceTotal={advanceTotal}
            advancePayments={advanceList.filter(a => a.adjusted)}
            discount={discount}
            totalPayable={totalPayable}
            amountInWords={amountInWords}
            bankDetails={{
              accountHolder,
              bankName,
              accountNumber,
              ifscCode,
              upiId
            }}
            qrCodeUrl={qrCodeUrl}
            qrCodeSize={qrSize}
            qrCodeLabel={qrCodeLabel}
            signatureImageUrl={signatureImageUrl}
            signatureSignatoryName={signatureSignatoryName}
            showSignature={showSignature}
            termsBadgeText={termsBadgeText}
            theme={invoiceTheme}
            templateLayout={templateLayout}
            showWatermark={true}
            showTaxMatrix={showTaxMatrix}
          />
        </div>
      </div>

    </div>
  );
}
