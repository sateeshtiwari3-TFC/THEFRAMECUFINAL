import { useState, useEffect, useCallback, useMemo } from 'react';
import { playDeadlineAlertChime } from '../utils/chimeSound';

export interface DeadlineAlarm {
  id: string;
  projectId?: string;
  projectTitle: string;
  targetTime: string; // ISO string e.g., 2026-09-10T18:00:00.000Z
  notes?: string;
  enabled: boolean;
  dismissedAt?: string | null;
  soundEnabled?: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'theframecut_deadline_visual_alarms';

export function useDeadlineAlarms(currentTime: Date) {
  // Load initial alarms from localStorage with default demo alarms if none present
  const [alarms, setAlarms] = useState<DeadlineAlarm[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load deadline alarms from storage:', e);
    }
    
    // Default initial demonstration alarms
    const in2Hours = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const in5Hours = new Date(Date.now() + 5 * 60 * 60 * 1000);

    return [
      {
        id: 'demo-alarm-1',
        projectTitle: 'Simran & Rahul — 4K Teaser Cut',
        targetTime: in2Hours.toISOString(),
        notes: 'Final director cut preview before client showcase',
        enabled: true,
        dismissedAt: null,
        soundEnabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-alarm-2',
        projectTitle: 'Pooja & Amit — Color Grading Pass',
        targetTime: in5Hours.toISOString(),
        notes: 'LUT adjustments & HDR master rendering deadline',
        enabled: true,
        dismissedAt: null,
        soundEnabled: true,
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Keep track of sound played per alarm ID so we don't repeat endlessly
  const [playedAudioIds, setPlayedAudioIds] = useState<Record<string, boolean>>({});

  // Persist to localStorage whenever alarms change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
    } catch (e) {
      console.error('Failed to persist deadline alarms:', e);
    }
  }, [alarms]);

  // Compute currently triggered alarms
  const activeTriggeredAlarms = useMemo(() => {
    const currentMs = currentTime.getTime();
    return alarms.filter((alarm) => {
      if (!alarm.enabled) return false;
      if (alarm.dismissedAt) return false;
      const targetMs = new Date(alarm.targetTime).getTime();
      // Trigger when target time is reached
      return currentMs >= targetMs;
    });
  }, [alarms, currentTime]);

  const hasActiveGlow = activeTriggeredAlarms.length > 0;

  // Trigger audio chime when a new alarm triggers (respecting soundEnabled)
  useEffect(() => {
    activeTriggeredAlarms.forEach((alarm) => {
      if (alarm.soundEnabled !== false && !playedAudioIds[alarm.id]) {
        playDeadlineAlertChime(0.25);
        setPlayedAudioIds((prev) => ({ ...prev, [alarm.id]: true }));
      }
    });
  }, [activeTriggeredAlarms, playedAudioIds]);

  // Upcoming alarms (sorted by closest targetTime)
  const upcomingAlarms = useMemo(() => {
    const currentMs = currentTime.getTime();
    return alarms
      .filter((alarm) => alarm.enabled && new Date(alarm.targetTime).getTime() > currentMs)
      .sort((a, b) => new Date(a.targetTime).getTime() - new Date(b.targetTime).getTime());
  }, [alarms, currentTime]);

  const nearestUpcomingAlarm = upcomingAlarms[0] || null;

  // Actions
  const addAlarm = useCallback((newAlarm: Omit<DeadlineAlarm, 'id' | 'createdAt'>) => {
    const id = `alarm-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const created: DeadlineAlarm = {
      ...newAlarm,
      id,
      createdAt: new Date().toISOString(),
      dismissedAt: null
    };
    setAlarms((prev) => [created, ...prev]);
    return id;
  }, []);

  const toggleAlarm = useCallback((id: string) => {
    setAlarms((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextEnabled = !a.enabled;
          return {
            ...a,
            enabled: nextEnabled,
            dismissedAt: nextEnabled ? null : a.dismissedAt // reset dismissal if re-enabling
          };
        }
        return a;
      })
    );
  }, []);

  const removeAlarm = useCallback((id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    setPlayedAudioIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const dismissAlarm = useCallback((id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, dismissedAt: new Date().toISOString() } : a))
    );
  }, []);

  const dismissAllTriggered = useCallback(() => {
    const nowIso = new Date().toISOString();
    setAlarms((prev) =>
      prev.map((a) => {
        const isTriggered =
          a.enabled &&
          !a.dismissedAt &&
          new Date(a.targetTime).getTime() <= currentTime.getTime();
        return isTriggered ? { ...a, dismissedAt: nowIso } : a;
      })
    );
  }, [currentTime]);

  const snoozeAlarm = useCallback((id: string, minutes: number = 15) => {
    const newTargetMs = currentTime.getTime() + minutes * 60 * 1000;
    setAlarms((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              targetTime: new Date(newTargetMs).toISOString(),
              dismissedAt: null
            }
          : a
      )
    );
    // Reset played audio so it can re-alert after snooze
    setPlayedAudioIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, [currentTime]);

  // Quick helper to immediately test the subtle glow effect
  const triggerTestAlarm = useCallback((title?: string, secondsOffset: number = 0) => {
    const target = new Date(currentTime.getTime() + secondsOffset * 1000);
    const testAlarm: DeadlineAlarm = {
      id: `test-alarm-${Date.now()}`,
      projectTitle: title || '⚡ Immediate Test — Client Review Render Cut',
      targetTime: target.toISOString(),
      notes: 'Testing analog clock subtle glow horology trigger',
      enabled: true,
      dismissedAt: null,
      soundEnabled: true,
      createdAt: new Date().toISOString()
    };
    setAlarms((prev) => [testAlarm, ...prev]);
    if (secondsOffset === 0) {
      playDeadlineAlertChime(0.3);
    }
  }, [currentTime]);

  return {
    alarms,
    activeTriggeredAlarms,
    hasActiveGlow,
    upcomingAlarms,
    nearestUpcomingAlarm,
    addAlarm,
    toggleAlarm,
    removeAlarm,
    dismissAlarm,
    dismissAllTriggered,
    snoozeAlarm,
    triggerTestAlarm
  };
}
