import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';

export interface ClockAlarmMarker {
  angleDeg: number;
  isTriggered?: boolean;
  title: string;
  formattedTime?: string;
}

interface LuxuryAnalogClockProps {
  time: Date;
  size?: number; // diameter in pixels (default 120)
  isSynced?: boolean;
  isSyncing?: boolean;
  showSeconds?: boolean;
  showDateWindow?: boolean;
  isGlowing?: boolean;
  activeAlarmTitle?: string;
  alarmMarkers?: ClockAlarmMarker[];
  className?: string;
  onClick?: () => void;
}

/**
 * Haute Horlogerie Master Chronometer Animated SVG Dial
 * Features:
 * - Fluid 60fps mechanical sweep second hand
 * - High-end animated SVG open-heart tourbillon escapement with oscillating balance wheel (28,800 VPH)
 * - 3D faceted gold Dauphine hands with specular light reflection
 * - Dynamic SVG seconds progress comet ring
 * - Applied Breguet / Cartier numerals and guilloché chapter track
 * - 3D knurled mechanical crown with sapphire cabochon
 */
export const LuxuryAnalogClock: React.FC<LuxuryAnalogClockProps> = ({
  time,
  size = 120,
  isSynced = true,
  isSyncing = false,
  showSeconds = true,
  showDateWindow = true,
  isGlowing = false,
  activeAlarmTitle,
  alarmMarkers = [],
  className = '',
  onClick,
}) => {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const dayOfMonth = time.getDate();

  // High-frequency 60fps mechanical sweep seconds
  const [smoothSeconds, setSmoothSeconds] = useState<number>(() => {
    return time.getSeconds() + time.getMilliseconds() / 1000;
  });

  useEffect(() => {
    let animId: number;
    const update = () => {
      const now = new Date();
      setSmoothSeconds(now.getSeconds() + now.getMilliseconds() / 1000);
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Precise rotational angles
  const secondDeg = smoothSeconds * 6;
  const minuteDeg = minutes * 6 + (smoothSeconds / 60) * 6;
  const hourDeg = (hours % 12) * 30 + (minutes / 60) * 30 + (smoothSeconds / 3600) * 30;

  // Chapter track 60-minute tick markers
  const dialIndices = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => {
      const isHour = i % 5 === 0;
      const isQuarter = i % 15 === 0;
      const angle = i * 6;
      return { index: i, isHour, isQuarter, angle };
    });
  }, []);

  // Circumference for r=91.5 is 2 * PI * 91.5 = 574.91
  const trackCircumference = 574.91;
  const strokeOffset = trackCircumference - (smoothSeconds / 60) * trackCircumference;

  // Comet head coordinate
  const cometRad = (secondDeg - 90) * (Math.PI / 180);
  const cometX = 100 + 91.5 * Math.cos(cometRad);
  const cometY = 100 + 91.5 * Math.sin(cometRad);

  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`relative rounded-full select-none shrink-0 transition-all duration-300 hover:scale-105 cursor-pointer group ${className}`}
      title={
        isGlowing
          ? `⚠️ Project Deadline Alarm Active: ${activeAlarmTitle || 'Deadline Reached'}. Click to inspect.`
          : 'Master Studio Tourbillon Chronometer. Click to inspect movement & set alarms.'
      }
    >
      {/* 1. DEADLINE ALARM AMBIENT AURA GLOW */}
      {isGlowing && (
        <>
          <motion.div
            animate={{
              opacity: [0.4, 0.9, 0.4],
              scale: [0.95, 1.07, 0.95],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -inset-3.5 rounded-full bg-gradient-to-r from-amber-500/40 via-gold-400/55 to-amber-600/40 blur-xl pointer-events-none z-0"
          />
          <motion.div
            animate={{
              opacity: [0.6, 1, 0.6],
              borderColor: [
                'rgba(245, 158, 11, 0.6)',
                'rgba(253, 224, 71, 0.95)',
                'rgba(245, 158, 11, 0.6)',
              ],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -inset-[2px] rounded-full border-2 shadow-[0_0_25px_rgba(234,179,8,0.8),inset_0_0_15px_rgba(245,158,11,0.5)] pointer-events-none z-10"
          />
        </>
      )}

      {/* 2. 3D MECHANICAL WATCH CROWN & CHRONO PUSHERS (Right Edge) */}
      <div
        className="absolute -right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 pointer-events-none z-20"
        style={{ transform: `translate(${Math.max(2, size * 0.02)}px, -50%)` }}
      >
        {/* Top Chrono Pusher (2 o'clock) */}
        <div
          className="rounded-r-sm bg-gradient-to-r from-[#dfb76c] via-[#8c6d31] to-[#3a2c0f] shadow-sm -mb-0.5 border-l border-black/50"
          style={{ width: Math.max(3, size * 0.035), height: Math.max(5, size * 0.055) }}
        />
        {/* Main Knurled Crown with Sapphire Cabochon */}
        <div
          className="rounded-r bg-gradient-to-r from-[#fef08a] via-[#b4882e] to-[#45330e] shadow-[2px_1px_4px_rgba(0,0,0,0.9)] border-l border-black/60 flex items-center justify-end pr-[1.5px]"
          style={{ width: Math.max(5, size * 0.055), height: Math.max(9, size * 0.095) }}
        >
          <div
            className="rounded-full bg-[#1e3a8a] shadow-[inset_0_0_2px_#93c5fd]"
            style={{ width: Math.max(2, size * 0.025), height: Math.max(3, size * 0.04) }}
            title="Sapphire Cabochon"
          />
        </div>
        {/* Bottom Chrono Pusher (4 o'clock) */}
        <div
          className="rounded-r-sm bg-gradient-to-r from-[#dfb76c] via-[#8c6d31] to-[#3a2c0f] shadow-sm -mt-0.5 border-l border-black/50"
          style={{ width: Math.max(3, size * 0.035), height: Math.max(5, size * 0.055) }}
        />
      </div>

      {/* 3. MULTI-LEVEL KNURLED 24K GOLD BEZEL FRAME */}
      <div
        className={`relative z-10 w-full h-full rounded-full transition-colors duration-500 ${
          isGlowing
            ? 'bg-gradient-to-br from-[#f59e0b] via-[#d4af37] to-[#8c6d31] p-[3px] shadow-[0_8px_30px_rgba(245,158,11,0.5),inset_0_2px_6px_rgba(255,255,255,0.6)]'
            : 'bg-gradient-to-br from-[#f3ce85] via-[#8c6d31] to-[#3a2c0f] p-[2.5px] shadow-[0_10px_28px_rgba(0,0,0,0.9),inset_0_2px_5px_rgba(255,255,255,0.45)]'
        }`}
      >
        {/* Fluted Titanium Step Ring */}
        <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#1b1712] via-[#352d1e] to-[#0f0d09] p-[2px] shadow-inner">
          
          {/* Obsidian Dial Container */}
          <div className="relative w-full h-full rounded-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#181512_0%,#09090b_65%,#000000_100%)] shadow-[inset_0_4px_16px_rgba(0,0,0,0.95)] flex items-center justify-center">
            
            {/* SUBTLE RADIAL GUILLOCHÉ CONIC TEXTURE */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage:
                  'repeating-conic-gradient(from 0deg, rgba(212,175,55,0.2) 0deg 15deg, transparent 15deg 30deg)',
              }}
            />

            {/* ================= VECTOR ANIMATED SVG MASTER DIAL ================= */}
            <svg
              className="w-full h-full pointer-events-none"
              viewBox="0 0 200 200"
            >
              <defs>
                {/* 24K Gold Specular Gradients for 3D Dauphine Hands */}
                <linearGradient id="dauphineGoldLeft" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="35%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#d4af37" />
                </linearGradient>
                <linearGradient id="dauphineGoldRight" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#b4882e" />
                  <stop offset="70%" stopColor="#785918" />
                  <stop offset="100%" stopColor="#3d2a07" />
                </linearGradient>

                {/* Second Hand Needle Gradient */}
                <linearGradient id="secondNeedle" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="30%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d4af37" />
                </linearGradient>

                {/* Animated Seconds Track Gradient */}
                <linearGradient id="cometTrackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(245, 158, 11, 0.1)" />
                  <stop offset="70%" stopColor="rgba(253, 224, 71, 0.5)" />
                  <stop offset="100%" stopColor="#fef08a" />
                </linearGradient>

                {/* Drop shadow for 3D metallic elements */}
                <filter id="dialShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85" />
                </filter>
                <filter id="handShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="1" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.95" />
                </filter>
                <filter id="cometGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#fbbf24" floodOpacity="1" />
                </filter>
              </defs>

              {/* 1. OUTER RAILWAY CHAPTER TRACK */}
              <circle
                cx="100"
                cy="100"
                r="92"
                fill="none"
                stroke="rgba(212, 175, 55, 0.22)"
                strokeWidth="1.2"
              />
              <circle
                cx="100"
                cy="100"
                r="86"
                fill="none"
                stroke="rgba(212, 175, 55, 0.12)"
                strokeWidth="0.8"
                strokeDasharray="1, 4"
              />

              {/* 2. DYNAMIC ANIMATED SECONDS PROGRESS COMET ARC */}
              {showSeconds && (
                <>
                  <circle
                    cx="100"
                    cy="100"
                    r="91.5"
                    fill="none"
                    stroke="url(#cometTrackGrad)"
                    strokeWidth="1.8"
                    strokeDasharray={trackCircumference}
                    strokeDashoffset={strokeOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                    opacity="0.8"
                  />
                  {/* Glowing Comet Head Bead */}
                  <circle
                    cx={cometX}
                    cy={cometY}
                    r="2.5"
                    fill="#fff"
                    filter="url(#cometGlow)"
                  />
                </>
              )}

              {/* 3. 60-MINUTE TICK MARKS */}
              {dialIndices.map(({ index, isHour, isQuarter, angle }) => {
                const rad = (angle - 90) * (Math.PI / 180);
                const rOuter = 91;
                const rInner = isQuarter ? 76 : isHour ? 80 : 86;
                const strokeWidth = isQuarter ? 2.8 : isHour ? 1.8 : 0.9;
                const strokeColor = isQuarter
                  ? '#fde047'
                  : isHour
                  ? '#d4af37'
                  : 'rgba(212, 175, 55, 0.45)';

                const x1 = 100 + rInner * Math.cos(rad);
                const y1 = 100 + rInner * Math.sin(rad);
                const x2 = 100 + rOuter * Math.cos(rad);
                const y2 = 100 + rOuter * Math.sin(rad);

                return (
                  <line
                    key={index}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* 4. DEADLINE ALARM PIPS ON TRACK */}
              {alarmMarkers.map((marker, mIdx) => {
                const rad = (marker.angleDeg - 90) * (Math.PI / 180);
                const rMarker = 84;
                const cx = 100 + rMarker * Math.cos(rad);
                const cy = 100 + rMarker * Math.sin(rad);
                const isTriggered = marker.isTriggered;

                return (
                  <g key={`alarm-pip-${mIdx}`}>
                    {isTriggered && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="6"
                        fill="rgba(245, 158, 11, 0.45)"
                        className="animate-ping"
                      />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isTriggered ? '4' : '2.8'}
                      fill={isTriggered ? '#fbbf24' : '#f59e0b'}
                      stroke="#000"
                      strokeWidth="0.8"
                    />
                    <polygon
                      points={`
                        ${cx},${cy - 2.5}
                        ${cx + 2.5 * Math.cos(rad + 1.8)},${cy + 2.5 * Math.sin(rad + 1.8)}
                        ${cx + 2.5 * Math.cos(rad - 1.8)},${cy + 2.5 * Math.sin(rad - 1.8)}
                      `}
                      fill={isTriggered ? '#fef08a' : '#fcd34d'}
                    />
                  </g>
                );
              })}

              {/* 5. APPLIED CARTIER / BREGUET LUXURY NUMERALS (XII, III, IX) */}
              <text
                x="100"
                y="38"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fef08a"
                fontSize="14"
                fontFamily="'Cormorant Garamond', Georgia, serif"
                fontWeight="bold"
                letterSpacing="0.06em"
                filter="url(#dialShadow)"
              >
                XII
              </text>
              <text
                x="37"
                y="100.5"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fde047"
                fontSize="12.5"
                fontFamily="'Cormorant Garamond', Georgia, serif"
                fontWeight="bold"
                filter="url(#dialShadow)"
              >
                IX
              </text>
              {!showDateWindow && (
                <text
                  x="163"
                  y="100.5"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fde047"
                  fontSize="12.5"
                  fontFamily="'Cormorant Garamond', Georgia, serif"
                  fontWeight="bold"
                  filter="url(#dialShadow)"
                >
                  III
                </text>
              )}

              {/* 6. BRAND HOROLOGY ENGRAVING - Cartier Hallmark */}
              <g filter="url(#dialShadow)">
                <text
                  x="100"
                  y="62"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#fef08a"
                  fontSize="13"
                  fontFamily="'Cormorant Garamond', Georgia, serif"
                  fontStyle="italic"
                  fontWeight="bold"
                  letterSpacing="0.04em"
                >
                  Cartier
                </text>
                <text
                  x="100"
                  y="73"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#94a3b8"
                  fontSize="5"
                  fontFamily="monospace"
                  letterSpacing="0.22em"
                  opacity="0.8"
                >
                  CHRONOMÈTRE
                </text>
              </g>

              {/* 7. OPEN-HEART TOURBILLON / BALANCE WHEEL ESCAPEMENT (AT 6 O'CLOCK) */}
              <g filter="url(#dialShadow)">
                {/* Aperture circular cut-out rim */}
                <circle
                  cx="100"
                  cy="142"
                  r="26"
                  fill="#060504"
                  stroke="#d4af37"
                  strokeWidth="1.6"
                />
                <circle
                  cx="100"
                  cy="142"
                  r="24"
                  fill="none"
                  stroke="#785918"
                  strokeWidth="0.7"
                  strokeDasharray="2, 3"
                />

                {/* Continuous rotating golden escape gear */}
                <g
                  style={{
                    transform: `rotate(${smoothSeconds * 72}deg)`,
                    transformOrigin: '100px 142px',
                  }}
                >
                  <circle cx="100" cy="142" r="16" fill="none" stroke="#b4882e" strokeWidth="1" />
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                    <line
                      key={deg}
                      x1={100 + 13 * Math.cos((deg * Math.PI) / 180)}
                      y1={142 + 13 * Math.sin((deg * Math.PI) / 180)}
                      x2={100 + 18 * Math.cos((deg * Math.PI) / 180)}
                      y2={142 + 18 * Math.sin((deg * Math.PI) / 180)}
                      stroke="#fcd34d"
                      strokeWidth="1.2"
                    />
                  ))}
                </g>

                {/* Oscillating mechanical balance wheel (4Hz / 28,800 VPH) */}
                <g
                  style={{
                    transform: `rotate(${Math.sin(smoothSeconds * Math.PI * 8) * 28}deg)`,
                    transformOrigin: '100px 142px',
                  }}
                >
                  <circle cx="100" cy="142" r="19" fill="none" stroke="#fde047" strokeWidth="1.4" />
                  {/* Balance screws on the rim */}
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                    <circle
                      key={deg}
                      cx={100 + 19 * Math.cos((deg * Math.PI) / 180)}
                      cy={142 + 19 * Math.sin((deg * Math.PI) / 180)}
                      r="1.2"
                      fill="#fff"
                    />
                  ))}
                  {/* Triple balance spokes */}
                  <line x1="100" y1="142" x2="100" y2="123" stroke="#d4af37" strokeWidth="1.2" />
                  <line x1="100" y1="142" x2="116.5" y2="151.5" stroke="#d4af37" strokeWidth="1.2" />
                  <line x1="100" y1="142" x2="83.5" y2="151.5" stroke="#d4af37" strokeWidth="1.2" />
                </g>

                {/* Polished Gold Balance Bridge across aperture */}
                <path
                  d="M 75 142 Q 100 137 125 142 Q 100 147 75 142 Z"
                  fill="url(#dauphineGoldLeft)"
                  stroke="#785918"
                  strokeWidth="0.6"
                />

                {/* Synthetic Ruby Jewel Bearing with White Specular Glint */}
                <circle cx="100" cy="142" r="3.6" fill="#dc2626" stroke="#fca5a5" strokeWidth="0.6" />
                <circle cx="99.2" cy="141.2" r="1" fill="#ffffff" opacity="0.95" />

                {/* Bridge screws on both sides */}
                <circle cx="78" cy="142" r="1.4" fill="#d4af37" stroke="#45330e" strokeWidth="0.4" />
                <circle cx="122" cy="142" r="1.4" fill="#d4af37" stroke="#45330e" strokeWidth="0.4" />

                {/* Tourbillon Inscription */}
                <text
                  x="100"
                  y="176"
                  textAnchor="middle"
                  fill="#d4af37"
                  fontSize="5.2"
                  fontFamily="monospace"
                  letterSpacing="0.2em"
                  fontWeight="bold"
                >
                  TOURBILLON · 28,800 VPH
                </text>
              </g>

              {/* 8. DATE WINDOW AT 3 O'CLOCK */}
              {showDateWindow && (
                <g filter="url(#dialShadow)">
                  <rect
                    x="152"
                    y="91"
                    width="26"
                    height="18"
                    rx="3"
                    fill="#050505"
                    stroke="#d4af37"
                    strokeWidth="1.2"
                  />
                  <text
                    x="165"
                    y="100.5"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#fef08a"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="900"
                  >
                    {dayOfMonth}
                  </text>
                </g>
              )}

              {/* 9. CLOCK HANDS (3D FACETED DAUPHINE IN VECTOR SVG) */}
              <g filter="url(#handShadow)">
                
                {/* 9A. HOUR HAND */}
                <g transform={`rotate(${hourDeg} 100 100)`}>
                  {/* Left Facet (Specular Highlight) */}
                  <polygon
                    points="100,100 93.5,98 96,48 100,40"
                    fill="url(#dauphineGoldLeft)"
                  />
                  {/* Right Facet (Metallic Shadow) */}
                  <polygon
                    points="100,100 106.5,98 104,48 100,40"
                    fill="url(#dauphineGoldRight)"
                  />
                  {/* Center Chamfer Ridge Line */}
                  <line x1="100" y1="100" x2="100" y2="40" stroke="#fff" strokeWidth="0.6" opacity="0.75" />
                </g>

                {/* 9B. MINUTE HAND */}
                <g transform={`rotate(${minuteDeg} 100 100)`}>
                  {/* Left Facet */}
                  <polygon
                    points="100,100 95,98 97,22 100,14"
                    fill="url(#dauphineGoldLeft)"
                  />
                  {/* Right Facet */}
                  <polygon
                    points="100,100 105,98 103,22 100,14"
                    fill="url(#dauphineGoldRight)"
                  />
                  {/* Center Ridge */}
                  <line x1="100" y1="100" x2="100" y2="14" stroke="#fff" strokeWidth="0.6" opacity="0.85" />
                </g>

                {/* 9C. SECOND HAND (FLUID CONTINUOUS 60FPS MECHANICAL SWEEP) */}
                {showSeconds && (
                  <g transform={`rotate(${secondDeg} 100 100)`}>
                    {/* Openwork Counterweight Hoop at bottom */}
                    <circle cx="100" cy="122" r="5" fill="none" stroke="#d4af37" strokeWidth="1.2" />
                    <line x1="100" y1="117" x2="100" y2="100" stroke="#d4af37" strokeWidth="1.2" />
                    {/* Slender Crimson-Tipped Needle */}
                    <line x1="100" y1="100" x2="100" y2="10" stroke="url(#secondNeedle)" strokeWidth="1.1" strokeLinecap="round" />
                    {/* Crimson Diamond Arrowhead */}
                    <polygon points="100,8 98.2,14 100,12 101.8,14" fill="#ef4444" />
                  </g>
                )}

                {/* 9D. CENTRAL PINION BOSS CAP */}
                <circle cx="100" cy="100" r="5" fill="#fef08a" stroke="#785918" strokeWidth="1" />
                <circle cx="100" cy="100" r="2" fill="#ef4444" />
              </g>

            </svg>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LuxuryAnalogClock;
