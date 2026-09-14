import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  BellRing, 
  Clock, 
  Check, 
  Trash2, 
  Plus, 
  X, 
  Volume2, 
  VolumeX, 
  Zap, 
  AlertTriangle, 
  Sparkles, 
  Calendar,
  Film,
  RotateCcw
} from 'lucide-react';
import { DeadlineAlarm } from '../../hooks/useDeadlineAlarms';
import { Project } from '../../types';

interface DeadlineAlarmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTime: Date;
  alarms: DeadlineAlarm[];
  activeTriggeredAlarms: DeadlineAlarm[];
  projects?: Project[];
  onAddAlarm: (alarm: Omit<DeadlineAlarm, 'id' | 'createdAt'>) => string;
  onToggleAlarm: (id: string) => void;
  onRemoveAlarm: (id: string) => void;
  onDismissAlarm: (id: string) => void;
  onDismissAllTriggered: () => void;
  onSnoozeAlarm: (id: string, minutes?: number) => void;
  onTriggerTestAlarm: (title?: string, secondsOffset?: number) => void;
}

export const DeadlineAlarmsModal: React.FC<DeadlineAlarmsModalProps> = ({
  isOpen,
  onClose,
  currentTime,
  alarms,
  activeTriggeredAlarms,
  projects = [],
  onAddAlarm,
  onToggleAlarm,
  onRemoveAlarm,
  onDismissAlarm,
  onDismissAllTriggered,
  onSnoozeAlarm,
  onTriggerTestAlarm
}) => {
  // Form state for creating a new deadline alarm
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  
  // Format current date + 2 hours as default target
  const defaultTargetDate = useMemo(() => {
    const d = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);
    const dateStr = d.toISOString().substring(0, 10);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return { date: dateStr, time: `${hours}:${minutes}` };
  }, [currentTime]);

  const [targetDate, setTargetDate] = useState<string>(defaultTargetDate.date);
  const [targetTime, setTargetTime] = useState<string>(defaultTargetDate.time);
  const [notes, setNotes] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(alarms.length === 0);

  // When project selection changes, pre-fill title and delivery date if available
  const handleSelectProject = (projId: string) => {
    setSelectedProjectId(projId);
    if (!projId) return;

    const proj = projects.find((p) => p.id === projId);
    if (proj) {
      const projLabel = proj.projectName || proj.coupleName || 'Wedding Film';
      setTitle(`${projLabel} — Final Delivery Cut`);
      if (proj.deliveryDate) {
        setTargetDate(proj.deliveryDate);
      }
    }
  };

  // Quick preset button handler
  const handleSetPreset = (offsetMinutes: number, labelSuffix: string) => {
    const target = new Date(currentTime.getTime() + offsetMinutes * 60 * 1000);
    const dateStr = target.toISOString().substring(0, 10);
    const hours = String(target.getHours()).padStart(2, '0');
    const minutes = String(target.getMinutes()).padStart(2, '0');
    setTargetDate(dateStr);
    setTargetTime(`${hours}:${minutes}`);
    if (!title) {
      setTitle(`Expedited Project Delivery (${labelSuffix})`);
    }
  };

  // Handle form submission
  const handleSubmitNewAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !targetDate || !targetTime) return;

    const [hours, mins] = targetTime.split(':').map(Number);
    const [y, m, d] = targetDate.split('-').map(Number);
    const targetDateTime = new Date(y, m - 1, d, hours || 0, mins || 0, 0);

    onAddAlarm({
      projectId: selectedProjectId || undefined,
      projectTitle: title.trim(),
      targetTime: targetDateTime.toISOString(),
      notes: notes.trim() || undefined,
      enabled: true,
      dismissedAt: null,
      soundEnabled
    });

    // Reset inputs
    setTitle('');
    setSelectedProjectId('');
    setNotes('');
    setShowAddForm(false);
  };

  // Helper to format remaining or overdue time
  const formatTimeDiff = (targetIso: string) => {
    const diffMs = new Date(targetIso).getTime() - currentTime.getTime();
    if (diffMs <= 0) {
      const pastMinutes = Math.floor(Math.abs(diffMs) / 60000);
      if (pastMinutes < 60) return `${pastMinutes}m ago (Active)`;
      const pastHours = Math.floor(pastMinutes / 60);
      return `${pastHours}h ${pastMinutes % 60}m ago (Active)`;
    }
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 60) return `in ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remMins = minutes % 60;
    if (hours < 24) return `in ${hours}h ${remMins}m`;
    const days = Math.floor(hours / 24);
    return `in ${days}d ${hours % 24}h`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        className="bg-gradient-to-b from-[#181614] via-[#12100e] to-[#0a0908] border-2 border-gold-500/40 rounded-3xl p-5 sm:p-7 max-w-xl w-full shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Amber gold luxury top halo */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ================= MODAL HEADER ================= */}
        <div className="flex items-center justify-between border-b border-gold-500/20 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-gold-500/10 border border-gold-400/40 flex items-center justify-center text-gold-300 shadow-inner">
              <BellRing className="w-5 h-5 text-gold-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide flex items-center space-x-2">
                <span>Project Deadline Alarms</span>
                <span className="px-2 py-0.5 rounded-full bg-gold-500/20 border border-gold-400/40 text-[9px] font-mono text-gold-300">
                  Analog Dial Glow
                </span>
              </h3>
              <p className="text-[11px] font-mono text-zinc-400">
                Trigger subtle warm luminescence across the studio chronometer face
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ================= SCROLLABLE CONTENT ================= */}
        <div className="overflow-y-auto pr-1 my-4 space-y-4 flex-1">
          
          {/* ================= ACTIVE TRIGGERED ALARMS BANNER ================= */}
          {activeTriggeredAlarms.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/25 via-gold-500/20 to-amber-600/25 border-2 border-gold-400/70 shadow-[0_0_25px_rgba(245,158,11,0.3)] relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start space-x-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/30 border border-gold-300/50 text-amber-200 shrink-0 mt-0.5 animate-bounce">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-black text-amber-300 uppercase tracking-wider">
                        Clock Face Glow Active
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-black/40 text-[9px] font-mono text-gold-300">
                        {activeTriggeredAlarms.length} Triggered
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-1">
                      {activeTriggeredAlarms[0].projectTitle}
                    </p>
                    {activeTriggeredAlarms[0].notes && (
                      <p className="text-xs text-zinc-300 mt-0.5 italic">
                        "{activeTriggeredAlarms[0].notes}"
                      </p>
                    )}
                    <p className="text-[10px] font-mono text-amber-300/90 mt-1">
                      Target reached {formatTimeDiff(activeTriggeredAlarms[0].targetTime)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onDismissAlarm(activeTriggeredAlarms[0].id)}
                    className="px-3 py-1.5 rounded-xl bg-gold-400 hover:bg-gold-300 text-charcoal-950 font-mono font-bold text-xs shadow-md transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Acknowledge Glow</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSnoozeAlarm(activeTriggeredAlarms[0].id, 15)}
                    className="px-3 py-1 rounded-xl bg-black/40 hover:bg-black/60 text-gold-300 border border-gold-400/40 text-[11px] font-mono transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Snooze (+15m)</span>
                  </button>
                </div>
              </div>

              {activeTriggeredAlarms.length > 1 && (
                <div className="mt-3 pt-2.5 border-t border-gold-500/30 flex items-center justify-between">
                  <span className="text-xs font-mono text-amber-200">
                    +{activeTriggeredAlarms.length - 1} other deadline alarms active
                  </span>
                  <button
                    type="button"
                    onClick={onDismissAllTriggered}
                    className="text-xs font-mono text-gold-300 hover:text-white underline cursor-pointer"
                  >
                    Dismiss All Glows
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ================= TEST GLOW QUICK ACTIONS ================= */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-gold-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="w-4 h-4 text-gold-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-white block">
                  Quick Horology Glow Simulation
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  Instantly preview the subtle breathing gold halo on the analog dial
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onTriggerTestAlarm('⚡ Simulated Cut: Rohini & Sameer 4K Teaser', 0)}
                className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-gold-500/20 hover:from-amber-500/30 hover:to-gold-500/30 border border-gold-400/50 text-gold-300 text-xs font-mono font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-gold-400" />
                <span>Trigger Glow Now</span>
              </button>
              <button
                type="button"
                onClick={() => onTriggerTestAlarm('⏱️ 1-Minute Countdown Test', 60)}
                className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-mono transition-all cursor-pointer"
                title="Arm alarm to trigger in exactly 60 seconds"
              >
                +60s Test
              </button>
            </div>
          </div>

          {/* ================= ADD NEW DEADLINE ALARM FORM ================= */}
          <div className="rounded-2xl bg-black/50 border border-white/10 overflow-hidden">
            <div 
              onClick={() => setShowAddForm(!showAddForm)}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-gold-500/20 border border-gold-400/30 flex items-center justify-center text-gold-300">
                  <Plus className={`w-3.5 h-3.5 transition-transform duration-200 ${showAddForm ? 'rotate-45' : ''}`} />
                </div>
                <span className="text-xs font-bold font-mono text-white">
                  {showAddForm ? 'Close New Alarm Creator' : 'Arm New Project Deadline Alarm'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-gold-400/80">
                {showAddForm ? 'Collapse' : 'Expand Form'}
              </span>
            </div>

            <AnimatePresence>
              {showAddForm && (
                <motion.form
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  onSubmit={handleSubmitNewAlarm}
                  className="p-4 pt-2 border-t border-white/10 space-y-3.5"
                >
                  {/* Select Project Dropdown if projects exist */}
                  {projects.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-300 mb-1">
                        Pick Studio Project (Auto-Fills Details)
                      </label>
                      <select
                        value={selectedProjectId}
                        onChange={(e) => handleSelectProject(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-charcoal-900 border border-white/20 text-xs text-white focus:outline-none focus:border-gold-400"
                      >
                        <option value="">-- Or enter custom project below --</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.projectName || p.coupleName} • Due: {p.deliveryDate || 'N/A'} ({p.studioName})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-300 mb-1">
                      Project / Cut Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Simran & Rahul — 4K Teaser Delivery"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-charcoal-900 border border-white/20 text-xs text-white focus:outline-none focus:border-gold-400 placeholder:text-zinc-500"
                    />
                  </div>

                  {/* Target Date & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-mono text-zinc-300 mb-1 flex items-center space-x-1">
                        <Calendar className="w-3 h-3 text-gold-400" />
                        <span>Deadline Date</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-charcoal-900 border border-white/20 text-xs text-white focus:outline-none focus:border-gold-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-zinc-300 mb-1 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-gold-400" />
                        <span>Target Time</span>
                      </label>
                      <input
                        type="time"
                        required
                        value={targetTime}
                        onChange={(e) => setTargetTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-charcoal-900 border border-white/20 text-xs text-white focus:outline-none focus:border-gold-400"
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div>
                    <span className="block text-[10px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider">
                      Quick Schedule Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSetPreset(15, '+15m Render Cut')}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-zinc-300 border border-white/10 cursor-pointer"
                      >
                        +15 Min Cut
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPreset(60, '+1h Teaser')}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-zinc-300 border border-white/10 cursor-pointer"
                      >
                        +1 Hour
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetPreset(180, '+3h Director Cut')}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-zinc-300 border border-white/10 cursor-pointer"
                      >
                        +3 Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date(currentTime);
                          today.setHours(18, 0, 0, 0);
                          setTargetDate(today.toISOString().substring(0, 10));
                          setTargetTime('18:00');
                        }}
                        className="px-2 py-1 rounded-lg bg-gold-500/15 hover:bg-gold-500/25 text-[10px] font-mono text-gold-300 border border-gold-500/30 cursor-pointer"
                      >
                        Today 6:00 PM
                      </button>
                    </div>
                  </div>

                  {/* Optional Notes */}
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-300 mb-1">
                      Notes & Deliverables (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Export 4K ProRes Master + Instagram Reels version"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-charcoal-900 border border-white/20 text-xs text-white focus:outline-none focus:border-gold-400 placeholder:text-zinc-500"
                    />
                  </div>

                  {/* Sound Toggle & Submit Button */}
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center space-x-2 text-xs font-mono text-zinc-300 cursor-pointer select-none">
                      <button
                        type="button"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          soundEnabled 
                            ? 'bg-amber-500/20 border-amber-400/50 text-amber-300' 
                            : 'bg-white/5 border-white/10 text-zinc-500'
                        }`}
                      >
                        {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                      </button>
                      <span>Play acoustic chime when reached</span>
                    </label>

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold-400 to-amber-500 hover:from-gold-300 hover:to-amber-400 text-charcoal-950 font-mono font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Arm Visual Alarm
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* ================= ARMED ALARMS LIST ================= */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-zinc-300 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-gold-400" />
                <span>Configured Project Alarms ({alarms.length})</span>
              </span>
              <span className="text-[10px] font-mono text-zinc-500">
                Saved locally & synchronized
              </span>
            </div>

            {alarms.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-black/30 border border-dashed border-white/10">
                <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-mono">
                  No deadline alarms configured.
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Click "Arm New Project Deadline Alarm" above to schedule visual triggers.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {alarms.map((alarm) => {
                  const target = new Date(alarm.targetTime);
                  const isOverdue = currentTime.getTime() >= target.getTime();
                  const isTriggered = isOverdue && alarm.enabled && !alarm.dismissedAt;

                  return (
                    <div
                      key={alarm.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        isTriggered
                          ? 'bg-amber-500/20 border-gold-400/70 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                          : alarm.enabled
                          ? 'bg-black/50 border-white/10 hover:border-gold-500/30'
                          : 'bg-black/20 border-white/5 opacity-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3 min-w-0">
                        {/* Status Beacon / Toggle Icon */}
                        <button
                          type="button"
                          onClick={() => onToggleAlarm(alarm.id)}
                          className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                            isTriggered
                              ? 'bg-amber-500/30 border border-amber-300 text-amber-200 animate-pulse'
                              : alarm.enabled
                              ? 'bg-gold-500/20 border border-gold-400/40 text-gold-300'
                              : 'bg-white/5 border border-white/10 text-zinc-500'
                          }`}
                          title={alarm.enabled ? 'Click to disable alarm' : 'Click to enable alarm'}
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>

                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-white truncate max-w-[220px] sm:max-w-[280px]">
                              {alarm.projectTitle}
                            </span>
                            {isTriggered && (
                              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-charcoal-950 text-[9px] font-mono font-black uppercase">
                                Glowing
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 text-[10px] font-mono text-zinc-400 mt-0.5">
                            <span className={isTriggered ? 'text-amber-300 font-bold' : 'text-zinc-300'}>
                              {target.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {target.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                            <span>•</span>
                            <span className={isTriggered ? 'text-amber-300 font-bold' : 'text-gold-400'}>
                              {formatTimeDiff(alarm.targetTime)}
                            </span>
                          </div>

                          {alarm.notes && (
                            <p className="text-[10px] text-zinc-400 truncate max-w-[240px] mt-0.5">
                              {alarm.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-1.5 shrink-0">
                        {isTriggered && (
                          <button
                            type="button"
                            onClick={() => onDismissAlarm(alarm.id)}
                            className="px-2 py-1 rounded-lg bg-gold-400/20 hover:bg-gold-400/40 text-gold-200 text-[10px] font-mono border border-gold-400/40 cursor-pointer"
                            title="Dismiss visual glow"
                          >
                            Dismiss
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveAlarm(alarm.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Delete alarm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* ================= MODAL FOOTER ================= */}
        <div className="border-t border-gold-500/20 pt-3 flex items-center justify-between shrink-0 text-[11px] font-mono text-zinc-400">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Master Horology Synced</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-mono text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </motion.div>
    </div>
  );
};

export default DeadlineAlarmsModal;
