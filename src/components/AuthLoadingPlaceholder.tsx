import React from 'react';
import { motion } from 'motion/react';
import { Lock, Sparkles } from 'lucide-react';
import Logo from './Logo';

interface AuthLoadingPlaceholderProps {
  message?: string;
  theme?: string;
}

export default function AuthLoadingPlaceholder({
  message = 'Verifying security credentials & studio session...'
}: AuthLoadingPlaceholderProps) {
  return (
    <div 
      id="auth-loading-placeholder"
      data-testid="auth-loading-placeholder"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-8 sm:p-12 overflow-hidden select-none bg-black text-white"
    >
      {/* Background Ambient Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.07)_0%,transparent_65%)] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 pointer-events-none" />

      {/* Top Security Status Pill */}
      <div className="w-full max-w-md flex items-center justify-between pt-2 relative z-10 text-gold-400/80 font-mono text-[10px] uppercase tracking-[0.3em]">
        <div className="flex items-center space-x-2 bg-black/60 px-3.5 py-1.5 rounded-full border border-gold-500/30 backdrop-blur-md shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-ping" />
          <span>THE FRAME CUT OS</span>
        </div>
        <div className="flex items-center space-x-1.5 text-gold-300/90 bg-black/50 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          <Lock className="w-3 h-3 text-gold-400" />
          <span>SECURITY NODE</span>
        </div>
      </div>

      {/* Center Cinematic Loading Emblem & Branding */}
      <div className="flex flex-col items-center justify-center text-center my-auto relative z-10 space-y-6">
        {/* Glow halo behind emblem */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gold-500/20 blur-3xl scale-150 animate-pulse" />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative p-7 sm:p-9 rounded-full bg-gradient-to-b from-black/80 to-black/95 border border-gold-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.95)] backdrop-blur-xl"
          >
            <Logo size={90} variant="gold" />
          </motion.div>
        </div>

        {/* Brand Titles */}
        <div className="space-y-2.5">
          <h1 className="text-2xl sm:text-4xl font-black font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-gold-300 to-amber-500 tracking-[0.25em] uppercase drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
            THE FRAME CUT
          </h1>
          <div className="flex items-center justify-center space-x-3 text-gold-400/90">
            <div className="h-[1px] w-10 bg-gradient-to-r from-transparent to-gold-500/60" />
            <p className="text-[11px] sm:text-xs font-mono tracking-[0.35em] uppercase font-semibold">
              LUXURY WEDDING FILM OS
            </p>
            <div className="h-[1px] w-10 bg-gradient-to-l from-transparent to-gold-500/60" />
          </div>
        </div>

        {/* Shimmering Progress Bar */}
        <div className="w-64 sm:w-80 space-y-3 pt-2">
          <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden relative shadow-inner">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              className="h-full w-1/2 bg-gradient-to-r from-transparent via-gold-400 to-transparent rounded-full shadow-[0_0_12px_rgba(212,175,55,0.8)]"
            />
          </div>
          <div className="flex items-center justify-center space-x-2 text-[10px] font-mono text-gray-400 tracking-wider">
            <Sparkles className="w-3 h-3 text-gold-400 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-gray-300 font-light">{message}</span>
          </div>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div className="relative z-10 pb-4 text-center">
        <p className="text-[9px] font-mono text-gray-500 tracking-[0.2em] uppercase">
          Studio ERP v2.4 • Production Suite Node
        </p>
      </div>
    </div>
  );
}
