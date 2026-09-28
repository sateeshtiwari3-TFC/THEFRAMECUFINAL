import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Coins, 
  User, 
  Calendar, 
  Film, 
  CheckCircle2, 
  ArrowRight, 
  Sliders, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  Layers, 
  Clock, 
  Check, 
  Percent, 
  HelpCircle,
  BarChart2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, Studio, Editor } from '../../types';

interface ProjectPricingEstimatorProps {
  project: Project;
  allProjects: Project[];
  studios: Studio[];
  editors: Editor[];
  onApplyPricing: (newAmount: number, newEditorPayment?: number) => Promise<void>;
}

interface EstimateResult {
  recommendedPrice: number;
  suggestedPriceMin: number;
  suggestedPriceMax: number;
  suggestedEditorFee: number;
  projectedProfit: number;
  projectedMarginPct: number;
  confidenceLevel: "High" | "Medium" | "Low";
  marketReasoning: string;
  historicalPrecedents?: Array<{
    projectName: string;
    eventType: string;
    amount: number;
    relevanceReason: string;
  }>;
  packages: Array<{
    tierName: string;
    price: number;
    editorFee: number;
    scopeSummary: string;
  }>;
  upsells?: Array<{
    title: string;
    suggestedAddonPrice: number;
    benefit: string;
  }>;
}

export const ProjectPricingEstimator: React.FC<ProjectPricingEstimatorProps> = ({
  project,
  allProjects,
  studios,
  editors,
  onApplyPricing
}) => {
  const [durationScale, setDurationScale] = useState<"standard" | "extended" | "multi_day">("standard");
  const [editorExperienceTier, setEditorExperienceTier] = useState<"standard" | "senior" | "master">("senior");
  const [includeDroneColorGrade, setIncludeDroneColorGrade] = useState(false);
  const [includeSameDayEdit, setIncludeSameDayEdit] = useState(false);

  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedSuccessfully, setAppliedSuccessfully] = useState(false);

  const assignedEditor = editors.find(e => e.id === project.assignedEditorId || e.name === project.assignedEditorName);
  const studio = studios.find(s => s.id === project.studioId || s.name === project.studioName);

  // Compute matching historical precedents from studio's local database
  const similarHistoricalProjects = React.useMemo(() => {
    return allProjects.filter(p => {
      if (p.id === project.id) return false;
      const sameType = p.eventType && project.eventType && p.eventType.toLowerCase().includes(project.eventType.toLowerCase().slice(0, 4));
      const sameEditor = p.assignedEditorId === project.assignedEditorId || p.assignedEditorName === project.assignedEditorName;
      const hasAmount = Number(p.projectAmount) > 0;
      return hasAmount && (sameType || sameEditor);
    });
  }, [allProjects, project]);

  const historicalAveragePrice = React.useMemo(() => {
    if (similarHistoricalProjects.length === 0) return 0;
    const total = similarHistoricalProjects.reduce((sum, p) => sum + (Number(p.projectAmount) || 0), 0);
    return Math.round(total / similarHistoricalProjects.length);
  }, [similarHistoricalProjects]);

  const handleRunEstimation = async () => {
    setLoading(true);
    setError(null);
    setAppliedSuccessfully(false);

    try {
      const historicalSubset = similarHistoricalProjects.map(p => ({
        projectName: p.coupleName || p.clientName || 'Wedding Project',
        eventType: p.eventType || 'Wedding Film',
        projectAmount: Number(p.projectAmount) || 0,
        editorPayment: Number(p.editorPayment) || 0,
        status: p.status,
        deliverables: p.deliverables || p.dataSize || 'Full Cinema Cut',
        editorName: p.assignedEditorName || 'Lead Editor'
      }));

      const res = await fetch("/api/gemini/estimate-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetProject: {
            id: project.id,
            coupleName: project.coupleName,
            eventType: project.eventType,
            deliverables: project.deliverables,
            dataSize: project.dataSize,
            projectAmount: project.projectAmount,
            editorPayment: project.editorPayment,
            assignedEditorName: project.assignedEditorName,
            studioName: project.studioName
          },
          historicalProjects: historicalSubset,
          editorInfo: assignedEditor ? {
            name: assignedEditor.name,
            rating: assignedEditor.rating,
            notes: assignedEditor.notes
          } : undefined,
          studioInfo: studio ? {
            name: studio.name,
            tier: studio.tier
          } : undefined,
          adjustments: {
            durationScale,
            editorExperienceTier,
            includeDroneColorGrade,
            includeSameDayEdit
          }
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate pricing estimate.");
      }

      setEstimate(data.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to compute price estimate.");
    } finally {
      setLoading(false);
    }
  };

  // Run on mount once
  useEffect(() => {
    handleRunEstimation();
  }, [project.id]);

  const handleApply = async (price: number, editorFee?: number) => {
    try {
      await onApplyPricing(price, editorFee);
      setAppliedSuccessfully(true);
      setTimeout(() => setAppliedSuccessfully(false), 3000);
    } catch (err) {
      console.error("Failed to apply pricing:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-luxury-green-950 via-charcoal-950 to-charcoal-900 border border-gold-500/25 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-[10px] font-mono text-gold-400 font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-gold-400" />
              <span>Gemini AI Pricing Intelligence</span>
            </div>
            <h3 className="text-base font-bold text-white font-display">
              Historical Project Price Estimator
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xl">
              Analyzes historical studio projects with matching event types (<span className="text-gold-300 font-medium">{project.eventType || "Wedding Film"}</span>), footage duration, and editor specialization (<span className="text-emerald-300 font-medium">{assignedEditor?.name || project.assignedEditorName || "Lead Editor"}</span>).
            </p>
          </div>

          <button
            onClick={handleRunEstimation}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-charcoal-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Re-Evaluating..." : "Recalculate Estimate"}</span>
          </button>
        </div>

        {/* Historical Data Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-luxury-green-800/20">
          <div className="p-2.5 rounded-xl bg-charcoal-900/60 border border-luxury-green-800/20">
            <span className="text-[10px] text-gray-400 font-mono block">Matching Precedents</span>
            <span className="text-xs font-bold text-white font-mono mt-0.5 block">
              {similarHistoricalProjects.length} Projects Analyzed
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-charcoal-900/60 border border-luxury-green-800/20">
            <span className="text-[10px] text-gray-400 font-mono block">Historical Avg Price</span>
            <span className="text-xs font-bold text-gold-400 font-mono mt-0.5 block">
              {historicalAveragePrice > 0 ? `₹${historicalAveragePrice.toLocaleString('en-IN')}` : 'Dataset building'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-charcoal-900/60 border border-luxury-green-800/20">
            <span className="text-[10px] text-gray-400 font-mono block">Assigned Editor Skill</span>
            <span className="text-xs font-bold text-emerald-400 font-mono mt-0.5 block truncate">
              {assignedEditor?.rating ? `★ ${assignedEditor.rating} Specialist` : 'Senior Editor'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-charcoal-900/60 border border-luxury-green-800/20">
            <span className="text-[10px] text-gray-400 font-mono block">Current Contract Price</span>
            <span className="text-xs font-bold text-white font-mono mt-0.5 block">
              ₹{(Number(project.projectAmount) || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Scope & Duration Adjustments */}
      <div className="p-4 rounded-2xl bg-charcoal-950 border border-luxury-green-800/30 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-luxury-green-800/20">
          <span className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-gold-400" />
            <span>Scope & Turnaround Modifiers</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">Fine-tune historical weighting</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Duration Scale */}
          <div className="space-y-1">
            <label className="text-[11px] text-gray-400 font-mono">Event Duration Scope</label>
            <select
              value={durationScale}
              onChange={(e) => setDurationScale(e.target.value as any)}
              className="w-full bg-charcoal-900 border border-luxury-green-800/40 rounded-xl px-3 py-2 text-xs text-white focus:border-gold-500 outline-none"
            >
              <option value="standard">1-Day Event (Standard 4-6 min)</option>
              <option value="extended">2-Day Event (Teaser + Highlight)</option>
              <option value="multi_day">3+ Day Grand Royal Wedding (Full Scope)</option>
            </select>
          </div>

          {/* Editor Skill Tier */}
          <div className="space-y-1">
            <label className="text-[11px] text-gray-400 font-mono">Editor Compensation Tier</label>
            <select
              value={editorExperienceTier}
              onChange={(e) => setEditorExperienceTier(e.target.value as any)}
              className="w-full bg-charcoal-900 border border-luxury-green-800/40 rounded-xl px-3 py-2 text-xs text-white focus:border-gold-500 outline-none"
            >
              <option value="standard">Standard Editor (Standard Rate)</option>
              <option value="senior">Senior Storyteller (High Polish)</option>
              <option value="master">Master Cine Colorist & Director Cut</option>
            </select>
          </div>

          {/* Drone Grading Addon Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-charcoal-900/60 border border-luxury-green-800/20">
            <div>
              <span className="text-xs font-semibold text-white block">Drone 4K Color Grade</span>
              <span className="text-[10px] text-gray-400 block">+ Log conversion</span>
            </div>
            <input
              type="checkbox"
              checked={includeDroneColorGrade}
              onChange={(e) => setIncludeDroneColorGrade(e.target.checked)}
              className="accent-gold-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>

          {/* Same-Day Edit Reel Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-charcoal-900/60 border border-luxury-green-800/20">
            <div>
              <span className="text-xs font-semibold text-white block">Same-Day Edit Reel</span>
              <span className="text-[10px] text-gray-400 block">Rush 24h turnaround</span>
            </div>
            <input
              type="checkbox"
              checked={includeSameDayEdit}
              onChange={(e) => setIncludeSameDayEdit(e.target.checked)}
              className="accent-gold-500 w-4 h-4 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Applied Success Notification */}
      {appliedSuccessfully && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2 font-mono"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Recommended pricing successfully applied to project contract!</span>
        </motion.div>
      )}

      {/* Main Estimation Results Display */}
      {estimate && (
        <div className="space-y-6">
          {/* Main Top Price Recommendation Card */}
          <div className="p-6 rounded-2xl bg-charcoal-950 border border-gold-500/40 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              {/* Left: Recommended Price Highlight */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                    Optimal Recommended Client Price
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    estimate.confidenceLevel === "High"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}>
                    {estimate.confidenceLevel} Confidence
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 via-amber-300 to-gold-500 font-mono">
                    ₹{estimate.recommendedPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    (Range: ₹{estimate.suggestedPriceMin.toLocaleString('en-IN')} – ₹{estimate.suggestedPriceMax.toLocaleString('en-IN')})
                  </span>
                </div>

                <p className="text-xs text-gray-300 max-w-xl leading-relaxed mt-1">
                  {estimate.marketReasoning}
                </p>
              </div>

              {/* Right: Profit Margin & Apply Button */}
              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 shrink-0">
                <div className="flex items-center gap-4 text-xs font-mono bg-charcoal-900/80 p-3 rounded-xl border border-luxury-green-800/30">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Editor Fee</span>
                    <span className="text-white font-bold">₹{estimate.suggestedEditorFee.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-l border-white/10 pl-3">
                    <span className="text-[10px] text-gray-400 block">Est. Net Profit</span>
                    <span className="text-emerald-400 font-bold">₹{estimate.projectedProfit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-l border-white/10 pl-3">
                    <span className="text-[10px] text-gray-400 block">Gross Margin</span>
                    <span className="text-gold-400 font-bold">{estimate.projectedMarginPct}%</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApply(estimate.recommendedPrice, estimate.suggestedEditorFee)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 shadow-lg cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Apply ₹{estimate.recommendedPrice.toLocaleString('en-IN')} to Contract</span>
                </button>
              </div>

            </div>
          </div>

          {/* Package Tiers (Essential vs Standard vs Luxury) */}
          <div className="space-y-3">
            <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">
              Suggested Tiered Packages Based on Historical Quotations:
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {estimate.packages.map((pkg, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    idx === 1
                      ? "bg-luxury-green-950/40 border-gold-500/50 shadow-lg relative"
                      : "bg-charcoal-950/70 border-luxury-green-800/30"
                  }`}
                >
                  {idx === 1 && (
                    <div className="absolute top-2.5 right-3 px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 border border-gold-500/30 text-[9px] font-mono font-bold uppercase">
                      Recommended
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      {pkg.tierName}
                    </h4>
                    <div className="text-xl font-extrabold text-gold-400 font-mono">
                      ₹{pkg.price.toLocaleString('en-IN')}
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {pkg.scopeSummary}
                    </p>
                    <div className="text-[10px] text-gray-500 font-mono pt-1">
                      Editor Payout: ₹{pkg.editorFee.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApply(pkg.price, pkg.editorFee)}
                    className="mt-4 w-full py-2 rounded-xl bg-charcoal-900 hover:bg-gold-500 hover:text-charcoal-950 text-gray-200 border border-luxury-green-800/40 hover:border-gold-500 text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Select Tier</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Historical Precedents Used */}
          {estimate.historicalPrecedents && estimate.historicalPrecedents.length > 0 && (
            <div className="p-4 rounded-2xl bg-charcoal-950 border border-luxury-green-800/30 space-y-3">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-gold-400" />
                <span>Historical Studio Precedents Grounding This Estimate:</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {estimate.historicalPrecedents.map((prec, i) => (
                  <div key={i} className="p-3 rounded-xl bg-charcoal-900/70 border border-luxury-green-800/20 text-xs space-y-1">
                    <div className="flex items-center justify-between text-white font-semibold">
                      <span className="truncate">{prec.projectName}</span>
                      <span className="text-gold-400 font-mono shrink-0 ml-2">₹{prec.amount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono">{prec.eventType}</div>
                    <p className="text-[10px] text-gray-400 leading-normal">{prec.relevanceReason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High-Margin Upsells */}
          {estimate.upsells && estimate.upsells.length > 0 && (
            <div className="p-4 rounded-2xl bg-charcoal-950 border border-luxury-green-800/30 space-y-3">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">
                High-Margin Client Upsell Opportunities:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {estimate.upsells.map((up, i) => (
                  <div key={i} className="p-3 rounded-xl bg-charcoal-900/50 border border-luxury-green-800/20 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate">{up.title}</span>
                      <span className="text-emerald-400 font-mono font-bold shrink-0 ml-2">+₹{up.suggestedAddonPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-normal">{up.benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
