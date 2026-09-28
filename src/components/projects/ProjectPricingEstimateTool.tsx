import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Coins, 
  TrendingUp, 
  History, 
  User, 
  Building2, 
  Clock, 
  Calendar, 
  Check, 
  Copy, 
  ArrowRight, 
  Sliders, 
  ShieldCheck, 
  Share2, 
  RefreshCw, 
  AlertCircle, 
  Layers, 
  Film, 
  ChevronRight,
  ExternalLink,
  Zap,
  Tag,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Studio, Editor } from '../../types';

interface HistoricalPrecedent {
  projectName: string;
  eventType: string;
  amount: number;
  relevanceReason: string;
}

interface PackageTier {
  tierName: string;
  price: number;
  editorFee: number;
  scopeSummary: string;
}

interface UpsellAddon {
  title: string;
  suggestedAddonPrice: number;
  benefit: string;
}

interface PricingEstimateResult {
  recommendedPrice: number;
  suggestedPriceMin: number;
  suggestedPriceMax: number;
  suggestedEditorFee: number;
  projectedProfit: number;
  projectedMarginPct: number;
  confidenceLevel: string;
  marketReasoning: string;
  historicalPrecedents: HistoricalPrecedent[];
  packages: PackageTier[];
  upsells: UpsellAddon[];
}

interface ProjectPricingEstimateToolProps {
  project: Project;
  allProjects?: Project[];
  studios: Studio[];
  editors: Editor[];
  onApplyPricing: (newAmount: number, newEditorPayment: number) => Promise<void>;
  onClose?: () => void;
  isInsideDrawer?: boolean;
}

const DURATION_PRESETS = [
  { id: 'teaser', label: 'Teaser / Reels Only', desc: '1 Teaser (60s) + 2 Reels', multiplier: '0.6x' },
  { id: 'highlight', label: 'Cinematic Highlight (3-5 min)', desc: 'Music-driven cinematic cut + 2 Reels', multiplier: '0.85x' },
  { id: 'signature', label: 'Signature Arc (Highlight 4-6m + Full Arc 20m)', desc: 'Standard wedding cinema package + 3 Reels', multiplier: '1.0x' },
  { id: 'documentary', label: 'Traditional Documentary (45-60 min)', desc: 'Complete multi-cam rituals + speeches + songs', multiplier: '1.25x' },
  { id: 'royal_epic', label: 'Royal Multi-Day Epic (60+ min + Teasers)', desc: 'Multi-day celebrations, 4K HDR master, 5 Reels', multiplier: '1.5x' },
];

const EDITOR_SPECIALIZATIONS = [
  { id: 'senior_colorist', label: 'Senior Colorist & Narrative Lead', tier: 'Top Tier (+18%)', note: 'Bespoke LUT, film emulation, high-stakes storytelling' },
  { id: 'cinematic_storyteller', label: 'Cinematic Storyteller & Editor', tier: 'Standard Lead (+10%)', note: 'Pacing, rhythm, speech blending and emotion' },
  { id: 'teaser_specialist', label: 'Social Reels & Fast Teaser Lead', tier: 'Specialist', note: 'Trend-aware, micro-cuts, fast beat synchronization' },
  { id: 'documentary_lead', label: 'Traditional Multi-Cam Specialist', tier: 'Traditional Lead', note: 'Multi-cam synch, long-form ceremony editing, Indian rituals' },
  { id: 'associate_editor', label: 'Associate / Junior Video Editor', tier: 'Budget Tier (-10%)', note: 'Standard rough cut and baseline assembly' },
];

export const ProjectPricingEstimateTool: React.FC<ProjectPricingEstimateToolProps> = ({
  project,
  allProjects = [],
  studios,
  editors,
  onApplyPricing,
  onClose,
  isInsideDrawer = true
}) => {
  // Configurable parameters
  const [eventType, setEventType] = useState<string>(project.eventType || 'Wedding');
  const [durationTier, setDurationTier] = useState<string>('Signature Arc (Highlight 4-6m + Full Arc 20m)');
  const [selectedEditorId, setSelectedEditorId] = useState<string>(project.assignedEditorId || '');
  const [editorSpecialization, setEditorSpecialization] = useState<string>('Senior Colorist & Narrative Lead');
  const [turnaround, setTurnaround] = useState<string>('standard');
  const [footageComplexity, setFootageComplexity] = useState<string>('standard_1080p');

  // Estimation state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [estimateResult, setEstimateResult] = useState<PricingEstimateResult | null>(null);
  const [appliedTierName, setAppliedTierName] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dataSourceBadge, setDataSourceBadge] = useState<'gemini' | 'statistical_regression' | null>(null);

  // Sync editor specialization when editor selection changes
  useEffect(() => {
    if (selectedEditorId) {
      const ed = editors.find(e => e.id === selectedEditorId);
      if (ed) {
        if (ed.specialties && ed.specialties.length > 0) {
          setEditorSpecialization(ed.specialties[0] + ' (' + (ed.notes || 'Senior Editor') + ')');
        } else if (ed.notes) {
          setEditorSpecialization(ed.notes);
        }
      }
    }
  }, [selectedEditorId, editors]);

  // Historical projects matching analysis
  const historicalAnalysis = useMemo(() => {
    const validProjects = allProjects.filter(p => p.id !== project.id && Number(p.projectAmount) > 0);
    const targetType = eventType.toLowerCase();

    const matchingType = validProjects.filter(p => {
      const pEvent = (p.eventType || '').toLowerCase();
      return pEvent.includes(targetType) || targetType.includes(pEvent);
    });

    const dataset = matchingType.length >= 2 ? matchingType : validProjects;
    const count = dataset.length;

    if (count === 0) {
      return {
        count: 0,
        avgAmount: Number(project.projectAmount) || 45000,
        avgEditorFee: Number(project.editorPayment) || 12000,
        avgMargin: 70,
        precedents: []
      };
    }

    const totalAmount = dataset.reduce((sum, p) => sum + Number(p.projectAmount || 0), 0);
    const totalEditorFee = dataset.reduce((sum, p) => sum + Number(p.editorPayment || 0), 0);
    const avgAmount = Math.round(totalAmount / count);
    const avgEditorFee = Math.round(totalEditorFee / count);
    const avgMargin = avgAmount > 0 ? Math.round(((avgAmount - avgEditorFee) / avgAmount) * 100) : 70;

    return {
      count,
      avgAmount,
      avgEditorFee,
      avgMargin,
      precedents: dataset.slice(0, 4)
    };
  }, [allProjects, project.id, project.projectAmount, project.editorPayment, eventType]);

  // Request Gemini estimation from backend
  const handleGenerateEstimate = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setAppliedTierName(null);

    const assignedEditor = editors.find(e => e.id === selectedEditorId || e.name === project.assignedEditorName);
    const assignedStudio = studios.find(s => s.id === project.studioId || s.name === project.studioName);

    try {
      const response = await fetch('/api/gemini/estimate-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetProject: {
            id: project.id,
            coupleName: project.coupleName,
            projectName: project.projectName,
            eventType,
            deliverables: durationTier,
            assignedEditorName: assignedEditor?.name || project.assignedEditorName || 'Lead Editor',
            studioName: assignedStudio?.name || project.studioName || 'Partner Studio',
            projectAmount: project.projectAmount || 0,
            editorPayment: project.editorPayment || 0,
            dataSize: project.dataSize
          },
          historicalProjects: allProjects
            .filter(p => p.id !== project.id && Number(p.projectAmount) > 0)
            .map(p => ({
              id: p.id,
              coupleName: p.coupleName,
              projectName: p.projectName,
              eventType: p.eventType,
              projectAmount: Number(p.projectAmount),
              editorPayment: Number(p.editorPayment),
              status: p.status,
              deliverables: p.dataSize || p.selectedFunctions?.join(', ') || 'Standard Video'
            })),
          editorInfo: assignedEditor ? {
            id: assignedEditor.id,
            name: assignedEditor.name,
            rating: assignedEditor.rating,
            specialties: assignedEditor.specialties,
            notes: assignedEditor.notes,
            experienceYears: assignedEditor.experienceYears,
            specialization: editorSpecialization
          } : {
            name: project.assignedEditorName || 'Lead Editor',
            specialization: editorSpecialization
          },
          studioInfo: assignedStudio ? {
            id: assignedStudio.id,
            name: assignedStudio.name,
            tier: assignedStudio.tier
          } : null,
          adjustments: {
            turnaround,
            durationTier,
            editorSpecialization,
            footageComplexity
          }
        })
      });

      const json = await response.json();
      if (!response.ok && !json.data) {
        throw new Error(json.error || 'Failed to generate estimate.');
      }

      if (json.data) {
        setEstimateResult(json.data);
        setDataSourceBadge(json.source === 'statistical_regression' ? 'statistical_regression' : 'gemini');
      } else {
        throw new Error('No data received from pricing estimation.');
      }
    } catch (err: any) {
      console.error('Pricing estimation error:', err);
      setErrorMessage(err.message || 'Error communicating with pricing engine. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Run initial estimate on mount if not already populated
  useEffect(() => {
    if (!estimateResult && !isLoading) {
      handleGenerateEstimate();
    }
  }, []);

  // Handle applying pricing to current project
  const handleApplyPricing = async (price: number, editorFee: number, tierLabel?: string) => {
    setIsApplying(true);
    try {
      await onApplyPricing(price, editorFee);
      setAppliedTierName(tierLabel || 'Recommended Price');
      setTimeout(() => {
        setAppliedTierName(null);
      }, 3500);
    } catch (err) {
      console.error('Failed to apply pricing:', err);
    } finally {
      setIsApplying(false);
    }
  };

  // Copy structured proposal to clipboard
  const handleCopyProposal = () => {
    if (!estimateResult) return;
    const couple = project.coupleName || project.projectName || 'Valued Couple';
    const text = `*The Frame Cut Studio | Wedding Cinema Proposal*
--------------------------------------------------
*Client / Project:* ${couple}
*Event Type:* ${eventType}
*Scope / Duration:* ${durationTier}
*Turnaround:* ${turnaround === 'express' ? 'Express 48-72h Rush' : turnaround === 'priority' ? 'Priority (7-10 Days)' : 'Standard (14-21 Days)'}

*Recommended Investment:* ₹${estimateResult.recommendedPrice.toLocaleString('en-IN')}
*Investment Range:* ₹${estimateResult.suggestedPriceMin.toLocaleString('en-IN')} - ₹${estimateResult.suggestedPriceMax.toLocaleString('en-IN')}

*Available Packages:*
${estimateResult.packages.map(p => `• *${p.tierName}*: ₹${p.price.toLocaleString('en-IN')} — ${p.scopeSummary}`).join('\n')}

*Add-On Enhancements:*
${estimateResult.upsells.map(u => `• ${u.title}: +₹${u.suggestedAddonPrice.toLocaleString('en-IN')} (${u.benefit})`).join('\n')}

*Quality Guarantee:* Frame Cut Studio 4K Cinema Pipeline | Dedicated Lead Colorist | Master Sound Engineering.`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    if (!estimateResult) return;
    const couple = project.coupleName || project.projectName || 'Valued Couple';
    const text = encodeURIComponent(`*The Frame Cut Studio | Wedding Cinema Quotation*
Dear *${couple}*,

We have calibrated an optimal post-production package for your *${eventType}*:
• *Scope:* ${durationTier}
• *Recommended Package:* ₹${estimateResult.recommendedPrice.toLocaleString('en-IN')}
• *Suggested Range:* ₹${estimateResult.suggestedPriceMin.toLocaleString('en-IN')} - ₹${estimateResult.suggestedPriceMax.toLocaleString('en-IN')}

*Package Tiers:*
${estimateResult.packages.map(p => `• ${p.tierName}: ₹${p.price.toLocaleString('en-IN')}`).join('\n')}

Looking forward to crafting your timeless wedding memories!
_The Frame Cut Studio_`);

    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-luxury-green-950/60 border border-gold-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-mono uppercase bg-gold-500/20 text-gold-300 border border-gold-500/40 font-bold inline-flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-gold-400 animate-pulse" />
                <span>Gemini AI Commercial Pricing Engine</span>
              </span>
              {dataSourceBadge && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border ${
                  dataSourceBadge === 'gemini' 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}>
                  {dataSourceBadge === 'gemini' ? 'Gemini 3.8 Intelligence' : 'Statistical Regression Engine'}
                </span>
              )}
            </div>
            <h3 className="text-lg sm:text-xl font-bold font-display text-white">
              Data-Driven Project Pricing & Profitability Estimate
            </h3>
            <p className="text-xs text-gray-300 mt-1 max-w-xl font-sans">
              Grounds client rates and editor compensation in historical precedent projects with matching event types, deliverables duration, and editor specialization.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGenerateEstimate}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-charcoal-950 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-gold-500/20 cursor-pointer disabled:opacity-60 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Calibrating...' : 'Re-calculate AI Estimate'}</span>
          </button>
        </div>

        {/* Historical Database Footprint Bar */}
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-charcoal-900/80 rounded-xl border border-white/5">
            <span className="text-[10px] font-mono text-gray-400 uppercase block">Historical Precedents</span>
            <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-gold-400" />
              <span>{historicalAnalysis.count} Projects Matched</span>
            </div>
          </div>

          <div className="p-3 bg-charcoal-900/80 rounded-xl border border-white/5">
            <span className="text-[10px] font-mono text-gray-400 uppercase block">Historical Avg Rate</span>
            <div className="text-sm font-bold text-gold-400 mt-0.5">
              ₹{historicalAnalysis.avgAmount.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-3 bg-charcoal-900/80 rounded-xl border border-white/5">
            <span className="text-[10px] font-mono text-gray-400 uppercase block">Historical Avg Editor Fee</span>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              ₹{historicalAnalysis.avgEditorFee.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="p-3 bg-charcoal-900/80 rounded-xl border border-white/5">
            <span className="text-[10px] font-mono text-gray-400 uppercase block">Studio Benchmark Margin</span>
            <div className="text-sm font-bold text-cyan-400 mt-0.5">
              {historicalAnalysis.avgMargin}% Profit
            </div>
          </div>
        </div>
      </div>

      {/* Scope Calibration Form */}
      <div className="p-5 rounded-3xl bg-charcoal-950 border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-gold-400" />
            <span>Calibrate Scope & Pricing Parameters</span>
          </h4>
          <span className="text-[11px] font-mono text-gray-500">Live variables update estimate</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. Event Type */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-gray-400 uppercase block">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/50 cursor-pointer"
            >
              <option value="Wedding">Traditional Wedding Ceremony</option>
              <option value="Pre-Wedding">Pre-Wedding Cinema Shoot</option>
              <option value="Engagement">Engagement & Ring Ceremony</option>
              <option value="Sangeet & Reception">Sangeet, Cocktail & Reception</option>
              <option value="Destination Wedding">Destination 3-Day Luxury Wedding</option>
              <option value="Haldi & Mehendi">Haldi & Mehendi Festivities</option>
              <option value="Teaser Only">Cinematic Teaser & Social Pack</option>
            </select>
          </div>

          {/* 2. Deliverables & Duration */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-gray-400 uppercase block">Deliverables & Duration Scope</label>
            <select
              value={durationTier}
              onChange={(e) => setDurationTier(e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/50 cursor-pointer"
            >
              {DURATION_PRESETS.map(p => (
                <option key={p.id} value={p.label}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Assigned Editor */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-gray-400 uppercase block">Assigned Editor</label>
            <select
              value={selectedEditorId}
              onChange={(e) => setSelectedEditorId(e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/50 cursor-pointer"
            >
              <option value="">Default Studio Lead</option>
              {editors.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} (★ {e.rating || 5.0})
                </option>
              ))}
            </select>
          </div>

          {/* 4. Editor Specialization */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-gray-400 uppercase block">Editor Specialization & Skill Tier</label>
            <select
              value={editorSpecialization}
              onChange={(e) => setEditorSpecialization(e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/50 cursor-pointer"
            >
              {EDITOR_SPECIALIZATIONS.map(spec => (
                <option key={spec.id} value={spec.label}>
                  {spec.label} — {spec.tier}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Production Turnaround */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-gray-400 uppercase block">Delivery Turnaround</label>
            <select
              value={turnaround}
              onChange={(e) => setTurnaround(e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/50 cursor-pointer"
            >
              <option value="standard">Standard Turnaround (14-21 Days)</option>
              <option value="priority">Priority Delivery (7-10 Days, +12%)</option>
              <option value="express">Express Rush (48-72 Hours, +25%)</option>
            </select>
          </div>

          {/* 6. Footage Complexity */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-gray-400 uppercase block">Footage & Camera Complexity</label>
            <select
              value={footageComplexity}
              onChange={(e) => setFootageComplexity(e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/50 cursor-pointer"
            >
              <option value="standard_1080p">Standard HD / 1-2 Cameras (100-300 GB)</option>
              <option value="heavy_4k">Heavy 4K Multi-Cam / 3-4 Cameras (400-800 GB)</option>
              <option value="ultra_raw">Cinema RAW / Sony S-Log3 / Arri / Drone (1 TB+)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Estimation Notice</p>
            <p className="text-[11px] text-rose-300/80 mt-0.5">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={handleGenerateEstimate}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="p-8 rounded-3xl bg-charcoal-950 border border-gold-500/20 flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full border-4 border-gold-500/20 border-t-gold-500 animate-spin" />
            <Sparkles className="w-6 h-6 text-gold-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-bold font-display text-white">Analyzing Studio Historical Records...</p>
            <p className="text-xs text-gray-400 font-mono">
              Synthesizing event scope, duration, editor skill level, and historical market margins.
            </p>
          </div>
        </div>
      )}

      {/* Estimation Results Card */}
      {!isLoading && estimateResult && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Main Pricing Recommendation Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-charcoal-950 to-charcoal-900 border-2 border-gold-500/40 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              
              {/* Left Column: Recommended Price */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
                    Recommended Client Price
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    estimateResult.confidenceLevel === 'High' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}>
                    {estimateResult.confidenceLevel} Confidence
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-5xl font-extrabold font-display text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-400 to-amber-200">
                    ₹{estimateResult.recommendedPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-mono text-gray-400">INR</span>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                  <span>Suggested Range:</span>
                  <span className="text-gray-200 font-bold">
                    ₹{estimateResult.suggestedPriceMin.toLocaleString('en-IN')} — ₹{estimateResult.suggestedPriceMax.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Delta comparison with current project amount */}
                {project.projectAmount > 0 && (
                  <div className="pt-1 text-[11px] font-mono flex items-center gap-1.5">
                    <span className="text-gray-400">Current Set Price: ₹{Number(project.projectAmount).toLocaleString('en-IN')}</span>
                    <span className="text-gray-500">|</span>
                    {estimateResult.recommendedPrice > project.projectAmount ? (
                      <span className="text-emerald-400 font-bold">
                        +₹{(estimateResult.recommendedPrice - project.projectAmount).toLocaleString('en-IN')} under-quoted upside
                      </span>
                    ) : estimateResult.recommendedPrice < project.projectAmount ? (
                      <span className="text-amber-400 font-bold">
                        Current contract is +₹{(project.projectAmount - estimateResult.recommendedPrice).toLocaleString('en-IN')} above baseline
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold">Matches current contract</span>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Breakdown & Quick Apply */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
                <div className="grid grid-cols-2 gap-3 text-center sm:w-80">
                  <div className="p-3 bg-charcoal-900/90 rounded-2xl border border-white/10">
                    <span className="text-[10px] font-mono text-gray-400 uppercase block">Suggested Editor Fee</span>
                    <div className="text-base font-bold text-gold-400 mt-1">
                      ₹{estimateResult.suggestedEditorFee.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[9px] font-mono text-gray-500">
                      {Math.round((estimateResult.suggestedEditorFee / estimateResult.recommendedPrice) * 100)}% of revenue
                    </span>
                  </div>

                  <div className="p-3 bg-charcoal-900/90 rounded-2xl border border-white/10">
                    <span className="text-[10px] font-mono text-gray-400 uppercase block">Projected Studio Net</span>
                    <div className="text-base font-bold text-emerald-400 mt-1">
                      ₹{estimateResult.projectedProfit.toLocaleString('en-IN')}
                    </div>
                    <span className="text-[9px] font-mono text-emerald-400/80 font-bold">
                      {estimateResult.projectedMarginPct}% Gross Margin
                    </span>
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={() => handleApplyPricing(estimateResult.recommendedPrice, estimateResult.suggestedEditorFee, 'Recommended Price')}
                  disabled={isApplying}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-charcoal-950 text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/20 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4 text-charcoal-950" />
                  <span>
                    {appliedTierName === 'Recommended Price'
                      ? '✓ Price Applied to Project!'
                      : `Apply Recommended Price (₹${estimateResult.recommendedPrice.toLocaleString('en-IN')})`}
                  </span>
                </button>
              </div>

            </div>

            {/* AI Analytical Reasoning */}
            <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
              <span className="text-[10px] font-mono uppercase text-gold-400 font-bold tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-gold-400" />
                <span>Executive Market Reasoning</span>
              </span>
              <p className="text-xs text-gray-200 leading-relaxed font-sans bg-charcoal-900/60 p-3.5 rounded-2xl border border-white/5">
                {estimateResult.marketReasoning}
              </p>
            </div>

          </div>

          {/* Historical Precedents Benchmarking */}
          {estimateResult.historicalPrecedents && estimateResult.historicalPrecedents.length > 0 && (
            <div className="p-5 rounded-3xl bg-charcoal-950 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-gold-400" />
                  <span>Historical Precedent Benchmarks (Studio Grounding)</span>
                </h4>
                <span className="text-[11px] font-mono text-gray-500">
                  {estimateResult.historicalPrecedents.length} projects analyzed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {estimateResult.historicalPrecedents.map((precedent, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-charcoal-900/80 border border-white/5 hover:border-gold-500/30 transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono uppercase text-gold-400 block truncate">
                          {precedent.eventType}
                        </span>
                        <p className="text-xs font-bold text-white truncate">{precedent.projectName}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                        ₹{precedent.amount.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 font-sans line-clamp-2">
                      {precedent.relevanceReason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3 Structured Package Tiers */}
          {estimateResult.packages && estimateResult.packages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-gold-400" />
                  <span>Structured Commercial Package Tiers</span>
                </h4>
                <span className="text-[11px] font-mono text-gray-500">Click to apply tier to project</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {estimateResult.packages.map((pkg, idx) => {
                  const isRecommended = pkg.tierName.toLowerCase().includes('recommended') || idx === 1;
                  const isApplied = appliedTierName === pkg.tierName;

                  return (
                    <div
                      key={idx}
                      className={`p-5 rounded-3xl border transition-all flex flex-col justify-between space-y-4 relative ${
                        isRecommended
                          ? 'bg-gradient-to-b from-charcoal-950 via-charcoal-900 to-luxury-green-950/40 border-gold-500/50 shadow-xl'
                          : 'bg-charcoal-950 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {isRecommended && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gold-500 text-charcoal-950 text-[10px] font-mono font-extrabold uppercase shadow-md">
                          Most Balanced Margin
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-bold font-display text-white">{pkg.tierName}</h5>
                          <span className="text-[10px] font-mono text-gray-400 uppercase">Tier 0{idx + 1}</span>
                        </div>

                        <div className="text-2xl font-extrabold font-mono text-gold-400">
                          ₹{pkg.price.toLocaleString('en-IN')}
                        </div>

                        <div className="p-2.5 rounded-xl bg-charcoal-900/80 border border-white/5 space-y-1 text-[11px] font-mono">
                          <div className="flex justify-between text-gray-400">
                            <span>Editor Compensation:</span>
                            <span className="text-white font-bold">₹{pkg.editorFee.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between text-gray-400">
                            <span>Studio Net Profit:</span>
                            <span className="text-emerald-400 font-bold">
                              ₹{(pkg.price - pkg.editorFee).toLocaleString('en-IN')} ({Math.round(((pkg.price - pkg.editorFee) / pkg.price) * 100)}%)
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-300 font-sans pt-1">
                          {pkg.scopeSummary}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleApplyPricing(pkg.price, pkg.editorFee, pkg.tierName)}
                        disabled={isApplying}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isApplied
                            ? 'bg-emerald-500 text-charcoal-950'
                            : isRecommended
                            ? 'bg-gold-500 hover:bg-gold-400 text-charcoal-950 shadow-md'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Applied!</span>
                          </>
                        ) : (
                          <>
                            <span>Select & Apply Tier</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* High-Margin Upsell Add-ons */}
          {estimateResult.upsells && estimateResult.upsells.length > 0 && (
            <div className="p-5 rounded-3xl bg-charcoal-950 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase text-gray-400 tracking-wider flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>High-Margin Upsell Opportunities</span>
                </h4>
                <span className="text-[11px] font-mono text-gray-500">Boost contract value</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {estimateResult.upsells.map((upsell, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-charcoal-900/60 border border-white/5 space-y-1.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate">{upsell.title}</span>
                        <span className="text-xs font-mono font-bold text-gold-400 shrink-0">
                          +₹{upsell.suggestedAddonPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 font-sans mt-1">
                        {upsell.benefit}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newPrice = Number(project.projectAmount || estimateResult.recommendedPrice) + upsell.suggestedAddonPrice;
                        handleApplyPricing(newPrice, Number(project.editorPayment || estimateResult.suggestedEditorFee), `Added ${upsell.title}`);
                      }}
                      className="mt-2 w-full py-1.5 px-2 rounded-lg bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 border border-gold-500/30 text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <Tag className="w-3 h-3" />
                      <span>Add to Project (+₹{upsell.suggestedAddonPrice.toLocaleString('en-IN')})</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Toolbar */}
          <div className="p-4 rounded-2xl bg-charcoal-950 border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyProposal}
                className="px-3.5 py-2 rounded-xl bg-charcoal-900 hover:bg-charcoal-800 text-gray-200 border border-white/10 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                <span>{copySuccess ? 'Copied Proposal!' : 'Copy Proposal Text'}</span>
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share via WhatsApp</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-gray-500">
              Calibrated by The Frame Cut Studio AI ERP Pipeline
            </div>
          </div>

        </motion.div>
      )}

    </div>
  );
};
