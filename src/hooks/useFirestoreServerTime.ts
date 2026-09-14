import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { 
  doc, 
  setDoc, 
  getDocFromServer, 
  serverTimestamp 
} from 'firebase/firestore';

export interface FirestoreTimeSyncState {
  time: Date;
  isSynced: boolean;
  isSyncing: boolean;
  offsetMs: number;
  latencyMs: number;
  lastSyncedAt: Date | null;
  error: string | null;
  syncNow: () => Promise<void>;
}

const STORAGE_KEY = 'framecut_firestore_server_time_offset';

/**
 * Hook that synchronizes the clock with Cloud Firestore TrueTime server time.
 * Employs NTP round-trip latency calibration to ensure all studio workstations
 * display the exact same synchronized master studio time regardless of local PC clock skews.
 */
export function useFirestoreServerTime(): FirestoreTimeSyncState {
  // Initialize offset from previous session cache if available to prevent initial jump
  const [offsetMs, setOffsetMs] = useState<number>(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = Number(cached);
        if (!isNaN(parsed)) return parsed;
      }
    } catch {
      // Ignore sessionStorage errors
    }
    return 0;
  });

  const [time, setTime] = useState<Date>(() => new Date(Date.now() + offsetMs));
  const [isSynced, setIsSynced] = useState<boolean>(() => {
    try {
      return Boolean(sessionStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep reference to latest offsetMs for 1-second interval ticking
  const offsetRef = useRef<number>(offsetMs);
  offsetRef.current = offsetMs;

  const isSyncingRef = useRef<boolean>(false);

  // Core synchronization logic using Firestore TrueTime serverTimestamp()
  const syncWithServer = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);
    setError(null);

    const t0 = Date.now();

    try {
      const syncDocRef = doc(db, 'system_sync', 'studio_master_clock');
      
      // 1. Write serverTimestamp to Cloud Firestore
      await setDoc(syncDocRef, {
        ping: serverTimestamp(),
        clientReqTime: t0,
        workstation: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 50) : 'workstation',
        lastUpdatedIso: new Date().toISOString()
      }, { merge: true });

      // 2. Fetch directly from server (bypassing local offline cache to guarantee server-evaluated timestamp)
      const snap = await getDocFromServer(syncDocRef);
      const t1 = Date.now();
      const roundTripLatency = Math.max(0, t1 - t0);

      const serverPing = snap.data()?.ping;
      let serverMillis: number | null = null;

      if (serverPing && typeof serverPing.toMillis === 'function') {
        serverMillis = serverPing.toMillis();
      } else if (serverPing && typeof serverPing.toDate === 'function') {
        serverMillis = serverPing.toDate().getTime();
      }

      if (serverMillis !== null) {
        // NTP formula: estimated server time at packet arrival (t1) is serverMillis + (latency / 2)
        const estimatedServerTimeAtT1 = serverMillis + Math.round(roundTripLatency / 2);
        const calibratedOffset = estimatedServerTimeAtT1 - t1;

        offsetRef.current = calibratedOffset;
        setOffsetMs(calibratedOffset);
        setLatencyMs(roundTripLatency);
        setIsSynced(true);
        setLastSyncedAt(new Date());

        // Update clock immediately
        setTime(new Date(Date.now() + calibratedOffset));

        try {
          sessionStorage.setItem(STORAGE_KEY, String(calibratedOffset));
        } catch {
          // Ignore storage quota
        }
      } else {
        throw new Error('Server timestamp not received from Firestore');
      }
    } catch (err: any) {
      console.warn('Firestore server time sync attempt failed, using local/cached time:', err);
      setError(err?.message || 'Sync failed');
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, []);

  // 1. High-frequency 1-second clock tick using synchronized server offset
  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date(Date.now() + offsetRef.current));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 2. Initial synchronization and recurring periodic calibration (every 90 seconds)
  useEffect(() => {
    syncWithServer();

    const syncInterval = setInterval(() => {
      syncWithServer();
    }, 90000);

    // Re-sync on window focus or visibility change (e.g., workstation waking up from lock)
    const handleFocus = () => {
      syncWithServer();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncWithServer();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncWithServer]);

  return {
    time,
    isSynced,
    isSyncing,
    offsetMs,
    latencyMs,
    lastSyncedAt,
    error,
    syncNow: syncWithServer
  };
}
