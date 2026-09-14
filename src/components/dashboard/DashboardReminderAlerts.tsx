import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  AlertTriangle, 
  IndianRupee, 
  Film, 
  CheckCircle2, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight,
  ExternalLink,
  Clock,
  Sparkles
} from 'lucide-react';
import { CalendarEvent, Project } from '../../types';
import { formatINR } from '../../utils';

interface DashboardReminderAlertsProps {
  calendarEvents: CalendarEvent[];
  projects?: Project[];
  onNavigateTab?: (tab: string, subAction?: string) => void;
  onUpdateCalendarEvent?: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  onOpenPaymentModal?: () => void;
}

export default function DashboardReminderAlerts({
  calendarEvents = [],
  projects = [],
  onNavigateTab,
  onUpdateCalendarEvent,
  onOpenPaymentModal,
}: DashboardReminderAlertsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Filter active (uncompleted) reminders created in Calendar
  const activeReminders = React.useMemo(() => {
    return calendarEvents.filter(evt => {
      // Must not be completed
      if (evt.completed) return false;

      // Match reminder flags or types or title indicators
      const isExplicitReminder = evt.isReminder === true;
      const isReminderType = evt.type === 'reminder' || evt.type === 'payment_reminder' || evt.type === 'project_reminder';
      const isReminderTitle = (evt.title || '').toLowerCase().includes('remind') || 
                              (evt.title || '').toLowerCase().includes('payment due') ||
                              (evt.title || '').toLowerCase().includes('due:');

      return isExplicitReminder || isReminderType || isReminderTitle;
    }).sort((a, b) => {
      // Sort by date (nearest first)
      const dateA = a.start ? new Date(a.start).getTime() : 0;
      const dateB = b.start ? new Date(b.start).getTime() : 0;
      return dateA - dateB;
    });
  }, [calendarEvents]);

  if (activeReminders.length === 0) {
    return null;
  }

  // Ensure current index is within bounds
  const safeIndex = currentIndex >= activeReminders.length ? 0 : currentIndex;
  const currentReminder = activeReminders[safeIndex];

  // Resolve reminder category
  const isPayment = currentReminder.reminderCategory === 'payment' || 
                    currentReminder.type === 'payment_reminder' || 
                    (currentReminder.amount && currentReminder.amount > 0) ||
                    (currentReminder.title || '').toLowerCase().includes('payment') ||
                    (currentReminder.title || '').toLowerCase().includes('₹') ||
                    (currentReminder.title || '').toLowerCase().includes('balance');

  // Compute days difference for urgency
  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = currentReminder.start === todayStr;
  const isPast = currentReminder.start < todayStr;

  const handleMarkComplete = async (reminder: CalendarEvent) => {
    if (!onUpdateCalendarEvent) return;
    try {
      setCompletingId(reminder.id);
      await onUpdateCalendarEvent(reminder.id, {
        completed: true,
        completedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error marking reminder complete:", err);
    } finally {
      setCompletingId(null);
    }
  };

  const nextReminder = () => {
    setCurrentIndex((prev) => (prev + 1) % activeReminders.length);
  };

  const prevReminder = () => {
    setCurrentIndex((prev) => (prev - 1 + activeReminders.length) % activeReminders.length);
  };

  return (
    <div className="relative z-20 w-full mb-4 sm:mb-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-rose-500/80 bg-gradient-to-r from-rose-950/90 via-[#18080c]/95 to-[#0e0406]/95 p-4 sm:p-5 shadow-[0_0_30px_rgba(244,63,94,0.35)] backdrop-blur-2xl"
      >
        {/* Pulsing red background glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-rose-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left: Blinking Beacon & Reminder Content */}
          <div className="flex items-start sm:items-center space-x-3.5 min-w-0 flex-1">
            
            {/* Blinking Red Beacon (Requested: "red color se blink hota hua") */}
            <div className="relative shrink-0 flex items-center justify-center w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.5)]">
              {/* Ping wave */}
              <span className="absolute w-4 h-4 rounded-full bg-rose-500 animate-ping opacity-75" />
              {/* Inner glowing pulsing beacon */}
              <span className="relative w-3 h-3 rounded-full bg-rose-500 ring-4 ring-rose-500/40 animate-pulse shadow-[0_0_10px_#f43f5e]" />
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              {/* Badge strip */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/30 text-rose-200 border border-rose-500/60 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                  🚨 Active Calendar Reminder
                </span>

                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                  isPayment ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40' : 'bg-sky-500/20 text-sky-200 border border-sky-500/40'
                }`}>
                  {isPayment ? <IndianRupee className="w-3 h-3 text-amber-400" /> : <Film className="w-3 h-3 text-sky-400" />}
                  {isPayment ? 'Payment Alert' : 'Project Deadline Alert'}
                </span>

                {isPast ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white uppercase tracking-wider shadow-sm animate-pulse">
                    Overdue ({currentReminder.start})
                  </span>
                ) : isToday ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-black uppercase tracking-wider">
                    Due Today
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" /> Due: {currentReminder.start}
                  </span>
                )}

                {activeReminders.length > 1 && (
                  <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 bg-black/40 rounded-full border border-white/10">
                    {safeIndex + 1} of {activeReminders.length}
                  </span>
                )}
              </div>

              {/* Main Reminder Title & Subtitle */}
              <div className="flex items-baseline gap-2 flex-wrap">
                <h4 className="text-base sm:text-lg font-bold text-white tracking-tight break-words">
                  {currentReminder.title}
                </h4>

                {currentReminder.amount && currentReminder.amount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-gold-500/20 border border-gold-500/40 text-gold-300 font-mono font-bold text-xs sm:text-sm">
                    {formatINR(currentReminder.amount)}
                  </span>
                )}
              </div>

              {/* Reminder Details & Notes */}
              {(currentReminder.notes || currentReminder.coupleName || currentReminder.studioName) && (
                <p className="text-xs text-zinc-300 font-sans line-clamp-2">
                  {currentReminder.coupleName && <span className="font-semibold text-white mr-1.5">{currentReminder.coupleName} •</span>}
                  {currentReminder.studioName && <span className="text-gold-300 mr-1.5">{currentReminder.studioName} •</span>}
                  {currentReminder.notes}
                </p>
              )}
            </div>
          </div>

          {/* Right: Interactive Action Buttons */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-rose-500/20">
            
            {/* Previous / Next buttons if multiple reminders */}
            {activeReminders.length > 1 && (
              <div className="flex items-center space-x-1 mr-1">
                <button
                  onClick={prevReminder}
                  className="p-1.5 rounded-xl bg-black/40 hover:bg-rose-500/20 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  title="Previous Reminder"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextReminder}
                  className="p-1.5 rounded-xl bg-black/40 hover:bg-rose-500/20 text-zinc-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  title="Next Reminder"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quick Payment Button if it is a payment reminder */}
            {isPayment && onOpenPaymentModal && (
              <button
                onClick={onOpenPaymentModal}
                className="px-3 py-2 rounded-xl bg-gold-500/20 hover:bg-gold-500/30 text-gold-200 border border-gold-500/50 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102"
              >
                <IndianRupee className="w-3.5 h-3.5 text-gold-400" />
                <span>Record</span>
              </button>
            )}

            {/* View in Calendar Button */}
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('calendar')}
                className="px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white border border-white/[0.12] text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Calendar</span>
              </button>
            )}

            {/* Mark as Done Button */}
            <button
              onClick={() => handleMarkComplete(currentReminder)}
              disabled={completingId === currentReminder.id}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-charcoal-950 font-bold text-xs font-mono shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-102 disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{completingId === currentReminder.id ? 'Marking...' : 'Mark Done'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
