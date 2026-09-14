import React from 'react';
import { Calendar, User, Clock, Flame, Zap, Briefcase } from 'lucide-react';
import { Editor, Project, ProjectStatus, ProjectPriority, UserRole } from '../../types';
import EditorLoadIndicator, { calculateEditorLoad } from '../EditorLoadIndicator';
import { MS_PER_DAY } from '../../utils';

interface IntakeTabCrewProps {
  shootDate: string;
  setShootDate: (val: string) => void;
  deliveryDate: string;
  setDeliveryDate: (val: string) => void;
  assignedEditorId: string;
  setAssignedEditorId: (val: string) => void;
  status: ProjectStatus;
  setStatus: (val: ProjectStatus) => void;
  priority: ProjectPriority;
  setPriority: (val: ProjectPriority) => void;
  isSplitProject: boolean;
  setIsSplitProject: (val: boolean) => void;
  secondEditorId: string;
  setSecondEditorId: (val: string) => void;
  splitPreset: string;
  setSplitPreset: (val: string) => void;
  firstEditorShare: number;
  setFirstEditorShare: (val: number) => void;
  secondEditorShare: number;
  setSecondEditorShare: (val: number) => void;
  editorPayment: number;
  editors: Editor[];
  projects?: Project[];
  userRole: UserRole;
  workflowStages: { id: ProjectStatus; label: string; color: string; bg: string }[];
  priorities: { id: ProjectPriority; label: string; color: string; bg: string }[];
  onClearError: () => void;
}

export default function IntakeTabCrew({
  shootDate,
  setShootDate,
  deliveryDate,
  setDeliveryDate,
  assignedEditorId,
  setAssignedEditorId,
  status,
  setStatus,
  priority,
  setPriority,
  isSplitProject,
  setIsSplitProject,
  secondEditorId,
  setSecondEditorId,
  splitPreset,
  setSplitPreset,
  firstEditorShare,
  setFirstEditorShare,
  secondEditorShare,
  setSecondEditorShare,
  editorPayment,
  editors,
  projects = [],
  userRole,
  workflowStages,
  priorities,
  onClearError
}: IntakeTabCrewProps) {

  // Quick offset helper
  const setDeliveryOffset = (days: number) => {
    if (shootDate) {
      const sDate = new Date(shootDate);
      if (!isNaN(sDate.getTime())) {
        sDate.setDate(sDate.getDate() + days);
        const formatted = sDate.toISOString().split('T')[0];
        setDeliveryDate(formatted);
        onClearError();
      }
    }
  };

  const getDaysDifference = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / MS_PER_DAY);
  };

  const getDaysToDeadline = (deadlineStr: string) => {
    if (!deadlineStr) return null;
    const deadline = new Date(deadlineStr);
    if (isNaN(deadline.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline.getTime() - today.getTime();
    return Math.ceil(diffTime / MS_PER_DAY);
  };

  const daysDifference = getDaysDifference(shootDate, deliveryDate);
  const daysToDeadline = getDaysToDeadline(deliveryDate);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 bg-gold-500/10 border border-gold-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-400 font-bold">
            🎬
          </div>
          <div>
            <h4 className="text-sm font-bold text-white font-display uppercase tracking-wider">Step 2: Schedule, Editors & Priority</h4>
            <p className="text-xs text-gray-400 font-mono">Define the production timeline, assign lead & split video editors, and set queue priority.</p>
          </div>
        </div>

        {/* Timeline Badge */}
        {shootDate && deliveryDate && (
          <div className="flex items-center space-x-2 bg-charcoal-900/90 border border-gold-500/30 rounded-xl px-3.5 py-1.5 text-xs font-mono text-gold-300 shrink-0">
            <Clock className="w-3.5 h-3.5 text-gold-400 shrink-0" />
            <span>Turnaround: <strong className="font-bold text-white">{daysDifference}d</strong></span>
            <span className="text-gold-500/30">|</span>
            <span className={daysToDeadline !== null && daysToDeadline < 0 ? "text-red-400 font-bold" : "text-emerald-400 font-bold"}>
              {daysToDeadline !== null ? (
                daysToDeadline < 0 ? `Lapsed ${Math.abs(daysToDeadline)}d` : daysToDeadline === 0 ? 'Due Today' : `${daysToDeadline}d Left`
              ) : ''}
            </span>
          </div>
        )}
      </div>

      {/* Schedule Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2 font-mono uppercase tracking-wider">
            Shoot / Ceremony Date <span className="text-gold-400">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
            <input 
              type="date" 
              value={shootDate} 
              onChange={(e) => { 
                const newShoot = e.target.value;
                setShootDate(newShoot); 
                onClearError(); 
                if (newShoot && !deliveryDate) {
                  const s = new Date(newShoot);
                  if (!isNaN(s.getTime())) {
                    s.setDate(s.getDate() + 21);
                    setDeliveryDate(s.toISOString().split('T')[0]);
                  }
                }
              }} 
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
              className="w-full bg-charcoal-900/80 border border-white/10 hover:border-gold-500/30 focus:border-gold-500/60 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:bg-charcoal-900 focus:outline-none cursor-pointer transition-colors font-mono" 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2 font-mono uppercase tracking-wider">
            Delivery Deadline <span className="text-gold-400">*</span>
          </label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
            <input 
              type="date" 
              value={deliveryDate} 
              onChange={(e) => { setDeliveryDate(e.target.value); onClearError(); }} 
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch (err) {} }}
              className="w-full bg-charcoal-900/80 border border-white/10 hover:border-gold-500/30 focus:border-gold-500/60 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:bg-charcoal-900 focus:outline-none cursor-pointer transition-colors font-mono" 
            />
          </div>

          {/* Quick Offset Helpers */}
          {shootDate && (
            <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
              <span className="text-[10px] font-mono text-gray-500 mr-1">Quick Turnaround:</span>
              {[7, 14, 21, 30, 45, 60, 90].map((days) => {
                const calculatedDate = new Date(shootDate);
                calculatedDate.setDate(calculatedDate.getDate() + days);
                if (isNaN(calculatedDate.getTime())) return null;
                const isSelected = deliveryDate === calculatedDate.toISOString().split('T')[0];
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDeliveryOffset(days)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-gold-500/20 text-gold-300 border-gold-500/50 shadow-inner"
                        : "bg-charcoal-900/60 text-gray-400 border-white/5 hover:border-white/15 hover:text-white"
                    }`}
                  >
                    +{days}d
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Editor Assignment & Workflow Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">
              Lead Cinematic Editor
            </label>
            {assignedEditorId && editors.find(ed => ed.id === assignedEditorId) && (
              <EditorLoadIndicator
                editor={editors.find(ed => ed.id === assignedEditorId)!}
                projects={projects}
                variant="pill"
              />
            )}
          </div>
          {userRole === 'studio' ? (
            <div className="w-full bg-charcoal-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-400 font-medium flex items-center justify-between">
              <span>👤 {editors.find(ed => ed.id === assignedEditorId)?.name || 'Unassigned'}</span>
              {assignedEditorId && editors.find(ed => ed.id === assignedEditorId) && (
                <EditorLoadIndicator
                  editor={editors.find(ed => ed.id === assignedEditorId)!}
                  projects={projects}
                  variant="pill"
                />
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500 pointer-events-none" />
                <select 
                  value={assignedEditorId} 
                  onChange={(e) => setAssignedEditorId(e.target.value)} 
                  className="w-full bg-charcoal-900/80 border border-white/10 hover:border-gold-500/30 focus:border-gold-500/60 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-200 focus:bg-charcoal-900 focus:outline-none cursor-pointer transition-colors font-mono"
                >
                  <option value="" className="bg-charcoal-950">Unassigned (Pool Queue)</option>
                  {editors.map(ed => {
                    const metrics = calculateEditorLoad(ed, projects);
                    const loadLabel = metrics.activeCount === 0 ? '🟢 0 Active (Available)' : metrics.activeCount <= 2 ? `🔵 ${metrics.activeCount} Active (Optimal)` : metrics.activeCount <= 4 ? `🟡 ${metrics.activeCount} Active (Heavy)` : `🔴 ${metrics.activeCount} Active (At Capacity)`;
                    return (
                      <option key={ed.id} value={ed.id} className="bg-charcoal-950">
                        👤 {ed.name} — {loadLabel}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Real-time visual workload indicator card under selection */}
              {assignedEditorId && editors.find(ed => ed.id === assignedEditorId) && (
                <div className="p-3 bg-charcoal-950/80 rounded-xl border border-white/5">
                  <EditorLoadIndicator
                    editor={editors.find(ed => ed.id === assignedEditorId)!}
                    projects={projects}
                    variant="compact"
                    showBar={true}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-2 font-mono uppercase tracking-wider">
            Initial Workflow Stage
          </label>
          {userRole === 'studio' ? (
            <div className="flex items-center space-x-2 bg-charcoal-900/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-gray-200 font-semibold capitalize">
              <span className="w-2.5 h-2.5 rounded-full bg-gold-500" />
              <span>{workflowStages.find(s => s.id === status)?.label || 'Data Received'}</span>
            </div>
          ) : (
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value as ProjectStatus)} 
              className="w-full bg-charcoal-900/80 border border-white/10 hover:border-gold-500/30 focus:border-gold-500/60 rounded-xl px-4 py-3 text-sm text-gray-200 focus:bg-charcoal-900 focus:outline-none cursor-pointer transition-colors font-mono"
            >
              {workflowStages.map(s => (
                <option key={s.id} value={s.id} className="bg-charcoal-950">
                  {s.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Split Project Editor Option */}
      {userRole !== 'studio' && (
        <div className="p-4 bg-charcoal-900/60 border border-white/10 rounded-2xl space-y-4">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <input 
              type="checkbox" 
              checked={isSplitProject}
              onChange={(e) => setIsSplitProject(e.target.checked)}
              className="w-4 h-4 rounded border-white/10 text-gold-500 bg-charcoal-900 focus:ring-0 cursor-pointer focus:border-gold-500"
            />
            <span className="text-xs md:text-sm text-gray-300 font-semibold group-hover:text-white transition-colors">
              Assign 2 Editors (Split Project Collaboration)?
            </span>
          </label>

          {isSplitProject && (
            <div className="p-4 bg-charcoal-950/80 rounded-xl border border-white/5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] text-gray-400 font-mono font-bold uppercase">Secondary Editor</label>
                    {secondEditorId && editors.find(ed => ed.id === secondEditorId) && (
                      <EditorLoadIndicator
                        editor={editors.find(ed => ed.id === secondEditorId)!}
                        projects={projects}
                        variant="pill"
                      />
                    )}
                  </div>
                  <select 
                    value={secondEditorId} 
                    onChange={(e) => setSecondEditorId(e.target.value)} 
                    className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-xs md:text-sm text-white focus:outline-none cursor-pointer font-mono"
                  >
                    <option value="" className="bg-charcoal-950">Select Second Editor...</option>
                    {editors.filter(ed => ed.id !== assignedEditorId).map(ed => {
                      const metrics = calculateEditorLoad(ed, projects);
                      const loadLabel = metrics.activeCount === 0 ? '🟢 0 Active' : metrics.activeCount <= 2 ? `🔵 ${metrics.activeCount} Active` : metrics.activeCount <= 4 ? `🟡 ${metrics.activeCount} Active` : `🔴 ${metrics.activeCount} Active`;
                      return (
                        <option key={ed.id} value={ed.id} className="bg-charcoal-950">
                          👤 {ed.name} ({loadLabel})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 font-mono font-bold uppercase mb-1">Payment Ratio</label>
                  <select 
                    value={splitPreset} 
                    onChange={(e) => setSplitPreset(e.target.value)} 
                    className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-xs md:text-sm text-white focus:outline-none cursor-pointer"
                  >
                    <option value="50-50" className="bg-charcoal-950">Equal Split (50% / 50%)</option>
                    <option value="60-40" className="bg-charcoal-950">Lead (60%) / Secondary (40%)</option>
                    <option value="70-30" className="bg-charcoal-950">Lead (70%) / Secondary (30%)</option>
                    <option value="80-20" className="bg-charcoal-950">Lead (80%) / Secondary (20%)</option>
                    <option value="custom" className="bg-charcoal-950">Custom Manual Split (₹)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-charcoal-900/60 rounded-xl border border-white/5 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-gray-400 font-semibold">
                  <span>Total Editor Budget:</span>
                  <span className="text-gold-400 font-bold">₹{editorPayment.toLocaleString('en-IN')}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5 text-gray-300">
                  <div>
                    <span className="font-semibold block text-[10px] text-gray-500 uppercase">Lead Share:</span>
                    {splitPreset === 'custom' ? (
                      <input 
                        type="number"
                        value={firstEditorShare}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setFirstEditorShare(val);
                          setSecondEditorShare(Math.max(0, editorPayment - val));
                        }}
                        className="w-full bg-charcoal-950 border border-white/10 rounded px-2 py-1 mt-1 text-xs font-bold text-white focus:outline-none focus:border-gold-500"
                      />
                    ) : (
                      <strong className="block text-white text-sm mt-0.5">₹{firstEditorShare.toLocaleString('en-IN')}</strong>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold block text-[10px] text-gray-500 uppercase">Secondary Share:</span>
                    {splitPreset === 'custom' ? (
                      <input 
                        type="number"
                        value={secondEditorShare}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setSecondEditorShare(val);
                          setFirstEditorShare(Math.max(0, editorPayment - val));
                        }}
                        className="w-full bg-charcoal-950 border border-white/10 rounded px-2 py-1 mt-1 text-xs font-bold text-white focus:outline-none focus:border-gold-500"
                      />
                    ) : (
                      <strong className="block text-white text-sm mt-0.5">₹{secondEditorShare.toLocaleString('en-IN')}</strong>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Queue Priority Assignment */}
      <div className="space-y-3 pt-2">
        <label className="block text-xs font-semibold text-gray-400 font-mono uppercase tracking-wider">
          Queue Priority Assignment
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {priorities.map((p) => {
            const isActive = priority === p.id;
            
            let priorityStyles = {
              border: "border-white/10 hover:border-white/20",
              activeBg: "bg-gray-500/15 text-white border-gray-500/50 shadow-inner",
              indicator: "bg-gray-400"
            };
            if (p.id === 'medium') {
              priorityStyles = {
                border: "border-white/10 hover:border-sky-500/20",
                activeBg: "bg-sky-500/20 text-sky-200 border-sky-500/50 shadow-inner",
                indicator: "bg-sky-400"
              };
            } else if (p.id === 'high') {
              priorityStyles = {
                border: "border-white/10 hover:border-gold-500/30",
                activeBg: "bg-gold-500/20 text-gold-300 border-gold-500/50 shadow-inner",
                indicator: "bg-gold-400"
              };
            } else if (p.id === 'urgent') {
              priorityStyles = {
                border: "border-white/10 hover:border-red-500/30",
                activeBg: "bg-red-500/20 text-red-300 border-red-500/50 shadow-inner",
                indicator: "bg-red-400 animate-pulse"
              };
            }

            const getPriorityLabel = (id: string) => {
              if (id === 'low') return 'Standard Queue';
              if (id === 'medium') return 'Regular Timeline';
              if (id === 'high') return 'Express Priority';
              return 'Top Priority (Rush)';
            };

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriority(p.id)}
                className={`p-3.5 rounded-2xl text-left transition-all border flex flex-col justify-between h-22 cursor-pointer ${
                  isActive ? priorityStyles.activeBg : `bg-charcoal-900/60 text-gray-400 ${priorityStyles.border}`
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold uppercase tracking-wider font-display">{p.label}</span>
                  <span className={`w-2.5 h-2.5 rounded-full ${isActive ? priorityStyles.indicator : 'bg-charcoal-800'}`} />
                </div>
                <span className="text-[10px] font-mono text-gray-500">
                  {getPriorityLabel(p.id)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
