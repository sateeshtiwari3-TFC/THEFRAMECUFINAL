import { useState, useEffect, useCallback } from 'react';
import { Project, Studio, Editor, Expense, CalendarEvent, Revision, PaymentHistory, UserProfile as User } from '../types';

const WEEKLY_BACKUP_KEY = 'tfc_last_weekly_backup';
const BACKUP_SNOOZE_KEY = 'tfc_weekly_backup_snoozed_until';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface UseWeeklyBackupReturn {
  isBackupDue: boolean;
  lastBackupDate: Date | null;
  showPrompt: boolean;
  setShowPrompt: (show: boolean) => void;
  downloadSuccess: boolean;
  triggerDownloadBackup: () => void;
  snoozeBackup: (days?: number) => void;
  checkBackupStatus: () => void;
}

export function useWeeklyBackup(
  projects: Project[],
  studios: Studio[],
  editors: Editor[],
  expenses: Expense[],
  calendarEvents: CalendarEvent[],
  revisions: Revision[],
  payments: PaymentHistory[],
  currentUser: User | null
): UseWeeklyBackupReturn {
  const [isBackupDue, setIsBackupDue] = useState<boolean>(false);
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Check if backup is due
  const checkBackupStatus = useCallback(() => {
    if (!currentUser) return; // Only prompt if logged in

    const lastBackupStr = localStorage.getItem(WEEKLY_BACKUP_KEY);
    const snoozedUntilStr = localStorage.getItem(BACKUP_SNOOZE_KEY);
    const now = Date.now();

    if (snoozedUntilStr) {
      const snoozedUntil = parseInt(snoozedUntilStr, 10);
      if (now < snoozedUntil) {
        setIsBackupDue(false);
        return;
      }
    }

    if (!lastBackupStr) {
      // First time or never backed up
      setLastBackupDate(null);
      setIsBackupDue(true);
      setShowPrompt(true);
    } else {
      const lastBackupMs = parseInt(lastBackupStr, 10);
      const lastDate = new Date(lastBackupMs);
      setLastBackupDate(lastDate);

      if (now - lastBackupMs >= SEVEN_DAYS_MS) {
        setIsBackupDue(true);
        setShowPrompt(true);
      } else {
        setIsBackupDue(false);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      // Delay prompt check slightly after login so it never interrupts the login transition
      const timer = setTimeout(() => {
        checkBackupStatus();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [currentUser, checkBackupStatus]);

  const triggerDownloadBackup = useCallback(() => {
    const runningProjects = projects.filter(p => p.status !== 'closed');
    const totalDueBalance = projects.reduce((sum, p) => {
      const rem = p.remainingBalance !== undefined ? p.remainingBalance : Math.max(0, (p.projectAmount || 0) - (p.advancePayment || 0));
      return sum + (Number(rem) || 0);
    }, 0);

    const backupData = {
      backupName: "Frame Cut Studio OS Weekly ERP Data Backup",
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser?.email || 'authenticated_user',
      financialSummary: {
        runningProjectsCount: runningProjects.length,
        totalProjectsCount: projects.length,
        totalDueBalance: totalDueBalance,
        totalDueBalanceFormatted: `₹${totalDueBalance.toLocaleString('en-IN')}`
      },
      recordsCount: {
        projects: projects.length,
        runningProjects: runningProjects.length,
        studios: studios.length,
        editors: editors.length,
        expenses: expenses.length,
        calendarEvents: calendarEvents.length,
        revisions: revisions.length,
        payments: payments.length
      },
      data: {
        projects,
        studios,
        editors,
        expenses,
        calendarEvents,
        revisions,
        payments
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `tfc_weekly_backup_${dateStamp}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Record timestamp
    const now = Date.now();
    localStorage.setItem(WEEKLY_BACKUP_KEY, now.toString());
    localStorage.removeItem(BACKUP_SNOOZE_KEY);
    setLastBackupDate(new Date(now));
    setIsBackupDue(false);
    setDownloadSuccess(true);

    setTimeout(() => {
      setShowPrompt(false);
      setDownloadSuccess(false);
    }, 3500);
  }, [projects, studios, editors, expenses, calendarEvents, revisions, payments, currentUser]);

  const snoozeBackup = useCallback((days = 1) => {
    const snoozeMs = Date.now() + days * 24 * 60 * 60 * 1000;
    localStorage.setItem(BACKUP_SNOOZE_KEY, snoozeMs.toString());
    setShowPrompt(false);
    setIsBackupDue(false);
  }, []);

  return {
    isBackupDue,
    lastBackupDate,
    showPrompt,
    setShowPrompt,
    downloadSuccess,
    triggerDownloadBackup,
    snoozeBackup,
    checkBackupStatus
  };
}
