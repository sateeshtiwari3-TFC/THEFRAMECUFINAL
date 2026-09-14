import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  WifiOff, 
  CloudOff, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  HardDrive
} from 'lucide-react';

interface OfflineStatusBannerProps {
  isOnline: boolean;
  onCheckConnection?: () => void;
  className?: string;
}

/**
 * OfflineStatusBanner
 * Persistent UI alert banner pinned at the top of the application when isOnline is false.
 * Informs the user that offline local persistence is active and changes will automatically
 * synchronize with the cloud database once network connectivity is restored.
 */
export const OfflineStatusBanner: React.FC<OfflineStatusBannerProps> = ({
  isOnline,
  onCheckConnection,
  className = ''
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null);

  const handleManualCheck = async () => {
    setIsChecking(true);
    setLastCheckMessage(null);

    try {
      if (onCheckConnection) {
        onCheckConnection();
      }

      // Check browser status and try a quick lightweight ping
      if (!navigator.onLine) {
        setLastCheckMessage('Still offline. Waiting for network signal...');
      } else {
        const ping = await fetch('/api/health', { method: 'HEAD', cache: 'no-store' }).catch(() => null);
        if (ping && ping.ok) {
          setLastCheckMessage('Signal detected! Reconnecting...');
        } else {
          setLastCheckMessage('Network available, cloud unreachable. Safe local cache active.');
        }
      }
    } catch {
      setLastCheckMessage('No internet access detected.');
    } finally {
      setTimeout(() => {
        setIsChecking(false);
      }, 600);
      setTimeout(() => {
        setLastCheckMessage(null);
      }, 4000);
    }
  };

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          id="offline-persistent-banner"
          role="alert"
          aria-live="assertive"
          initial={{ opacity: 0, y: -40, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -40, height: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={`sticky top-0 z-[100] w-full bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-b border-amber-500/50 shadow-2xl backdrop-blur-md text-amber-100 ${className}`}
        >
          {/* Subtle glowing amber accent bar */}
          <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />

          <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
            
            {/* Left: Prominent Offline & Local Storage Notice */}
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-inner">
                <WifiOff className="w-4 h-4 text-amber-300 animate-pulse" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-bold tracking-wide text-amber-200 uppercase font-mono text-[11px] flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                    </span>
                    Offline Mode Active
                  </span>
                  <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] font-mono">
                    Local Cache Guard
                  </span>
                </div>

                <p className="text-amber-100/90 text-xs sm:text-[13px] leading-snug mt-0.5">
                  <span className="font-semibold text-white">Your changes are saved locally on this device.</span>{' '}
                  <span className="text-amber-200/80">
                    All edits, projects & payments will automatically sync to cloud Firestore once connection returns.
                  </span>
                </p>

                {lastCheckMessage && (
                  <p className="text-[11px] text-amber-300 font-mono mt-1 animate-pulse">
                    {lastCheckMessage}
                  </p>
                )}
              </div>
            </div>

            {/* Right: Storage Status & Reconnect Button */}
            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
              <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-amber-500/30 text-[11px] font-mono text-amber-200/90">
                <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>IndexedDB / LocalStorage</span>
              </div>

              <button
                type="button"
                onClick={handleManualCheck}
                disabled={isChecking}
                className="px-3 py-1.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/40 active:bg-amber-500/50 border border-amber-400/60 text-amber-100 text-xs font-medium font-mono flex items-center space-x-1.5 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50"
                title="Verify network connection"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-300 ${isChecking ? 'animate-spin' : ''}`} />
                <span>{isChecking ? 'Checking...' : 'Check Connection'}</span>
              </button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineStatusBanner;
