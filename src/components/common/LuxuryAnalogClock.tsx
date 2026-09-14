import React, { useMemo } from 'react';
import { motion } from 'motion/react';

export interface ClockAlarmMarker {
  angleDeg: number;
  isTriggered?: boolean;
  title: string;
  formattedTime?: string;
}

interface LuxuryAnalogClockProps {
  time: Date;
  size?: number; // diameter in pixels (default 84)
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
 * Luxury Horology Master Chronometer Analog Clock
 * Features a high-precision rotating circular dial face with 24k gold faceted Dauphine hands,
 * brushed obsidian sunray dial, applied indices, TrueTime status indicator,
 * and project deadline visual alarm glow effect with dial pips.
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
  onClick
}) => {
  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const dayOfMonth = time.getDate();

  // Dynamic font sizing proportional to clock diameter
  const cartierFontSize = Math.max(10, size * 0.105);
  const lowerStatusSize = Math.max(4.5, size * 0.045);
  const vphSize = Math.max(4, size * 0.038);
  const dateFontSize = Math.max(7.5, size * 0.088);

  // Precise rotational angles
  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = (hours % 12) * 30 + minutes * 0.5 + seconds * (0.5 / 60);

  // Outer bezel slow atmospheric counter-rotation for cinematic luxury depth
  const ambientRotation = useMemo(() => {
    return (hours * 3600 + minutes * 60 + seconds) / 240; // subtle slow rotation over 24hrs
  }, [hours, minutes, seconds]);

  // Generate 12 main hour batons + 60 minute ticks
  const dialIndices = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => {
      const isHour = i % 5 === 0;
      const isQuarter = i % 15 === 0;
      const angle = i * 6;
      return { index: i, isHour, isQuarter, angle };
    });
  }, []);

  return (
    <div 
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`relative rounded-full select-none shrink-0 transition-all duration-300 hover:scale-105 cursor-pointer group ${className}`}
      title={isGlowing ? `⚠️ Project Deadline Alarm Active: ${activeAlarmTitle || 'Deadline Reached'}. Click to manage alarms.` : "Master Studio Luxury Chronometer (Firestore TrueTime). Click to inspect horology & set deadline alarms."}
    >
      {/* SUBTLE HOROLOGY DEADLINE ALARM GLOW EFFECT */}
      {isGlowing && (
        <>
          {/* Multi-tier warm amber & 24k gold breathing ambient aura */}
          <motion.div
            animate={{
              opacity: [0.35, 0.85, 0.35],
              scale: [0.96, 1.06, 0.96],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -inset-3 sm:-inset-4 rounded-full bg-gradient-to-r from-amber-500/35 via-gold-400/50 to-amber-600/35 blur-xl pointer-events-none z-0"
          />
          {/* Luminous rim ring highlight */}
          <motion.div
            animate={{
              opacity: [0.5, 0.95, 0.5],
              borderColor: [
                'rgba(245, 158, 11, 0.5)',
                'rgba(253, 224, 71, 0.9)',
                'rgba(245, 158, 11, 0.5)'
              ]
            }}
            transition={{
              duration: 2.0,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute -inset-[2px] rounded-full border-2 shadow-[0_0_25px_rgba(234,179,8,0.7),inset_0_0_15px_rgba(245,158,11,0.4)] pointer-events-none z-10"
          />
        </>
      )}

      {/* OUTER 24K GOLD KNURLED BEZEL & SHADOW CASING */}
      <div className={`relative z-10 w-full h-full rounded-full transition-colors duration-500 ${
        isGlowing 
          ? 'bg-gradient-to-br from-[#f59e0b] via-[#d4af37] to-[#8c6d31] p-[3px] shadow-[0_8px_30px_rgba(245,158,11,0.5),inset_0_2px_6px_rgba(255,255,255,0.6)]' 
          : 'bg-gradient-to-br from-[#dfb76c] via-[#8c6d31] to-[#3a2c0f] p-[2.5px] shadow-[0_8px_25px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(255,255,255,0.4)]'
      }`}>
        
        {/* INNER METALLIC FLUTED STEP RING */}
        <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#1f1a14] via-[#3a3222] to-[#120f0a] p-[2px] shadow-inner">
          
          {/* DIAL BED: DEEP OBSIDIAN SUNRAY GUILOCHÉ */}
          <div className="relative w-full h-full rounded-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#1a1815_0%,#09090b_70%,#000000_100%)] shadow-[inset_0_4px_16px_rgba(0,0,0,0.9)] flex items-center justify-center">
            
            {/* SUBTLE INNER DIAL GLOW WHEN ALARM IS REACHED */}
            {isGlowing && (
              <motion.div
                animate={{ opacity: [0.18, 0.42, 0.18] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.4)_0%,rgba(217,119,6,0.15)_60%,transparent_100%)] pointer-events-none z-10"
              />
            )}

            {/* ROTATING CIRCULAR ASTRONOMICAL / CHAPTER RING */}
            <motion.div 
              style={{ rotate: ambientRotation }}
              className="absolute inset-[3px] rounded-full border border-gold-500/15 pointer-events-none opacity-40"
            />

            {/* SUBTLE RADIAL TEXTURE OVERLAY */}
            <div 
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'repeating-conic-gradient(from 0deg, rgba(212,175,55,0.15) 0deg 15deg, transparent 15deg 30deg)'
              }}
            />

            {/* 60-MINUTE CHAPTER TRACK & HOUR INDICES */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none" 
              viewBox="0 0 100 100"
            >
              {/* Dial Border Track */}
              <circle 
                cx="50" 
                cy="50" 
                r="46" 
                fill="none" 
                stroke={isGlowing ? "rgba(245, 158, 11, 0.55)" : "rgba(212, 175, 55, 0.25)"}
                strokeWidth="0.8" 
              />
              <circle 
                cx="50" 
                cy="50" 
                r="43" 
                fill="none" 
                stroke="rgba(212, 175, 55, 0.15)" 
                strokeWidth="0.5" 
                strokeDasharray="0.5, 2.5"
              />

              {/* Tick Markers */}
              {dialIndices.map(({ index, isHour, isQuarter, angle }) => {
                const rad = (angle - 90) * (Math.PI / 180);
                const rOuter = 45.5;
                const rInner = isQuarter ? 37 : isHour ? 39 : 42.5;
                const strokeWidth = isQuarter ? 1.8 : isHour ? 1.3 : 0.6;
                const strokeColor = isQuarter 
                  ? '#fcd34d' 
                  : isHour 
                  ? '#d4af37' 
                  : 'rgba(212, 175, 55, 0.45)';

                const x1 = 50 + rInner * Math.cos(rad);
                const y1 = 50 + rInner * Math.sin(rad);
                const x2 = 50 + rOuter * Math.cos(rad);
                const y2 = 50 + rOuter * Math.sin(rad);

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

              {/* PROJECT DEADLINE ALARM PIPS ON DIAL TRACK */}
              {alarmMarkers.map((marker, mIdx) => {
                const rad = (marker.angleDeg - 90) * (Math.PI / 180);
                const rMarker = 42;
                const cx = 50 + rMarker * Math.cos(rad);
                const cy = 50 + rMarker * Math.sin(rad);
                const isTriggered = marker.isTriggered;

                return (
                  <g key={`alarm-pip-${mIdx}`}>
                    {/* Pulsing halo if active */}
                    {isTriggered && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r="3.2"
                        fill="rgba(245, 158, 11, 0.4)"
                        className="animate-ping"
                      />
                    )}
                    {/* Visual Alarm Pip */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isTriggered ? "2.2" : "1.6"}
                      fill={isTriggered ? "#fbbf24" : "#f59e0b"}
                      stroke="#000"
                      strokeWidth="0.5"
                    />
                    {/* Arrow notch pointer toward dial center */}
                    <polygon
                      points={`
                        ${cx},${cy - 1.2} 
                        ${cx + 1.2 * Math.cos(rad + 1.8)},${cy + 1.2 * Math.sin(rad + 1.8)} 
                        ${cx + 1.2 * Math.cos(rad - 1.8)},${cy + 1.2 * Math.sin(rad - 1.8)}
                      `}
                      fill={isTriggered ? "#fef08a" : "#fcd34d"}
                    />
                  </g>
                );
              })}

              {/* Luminous Pip Markers at 12, 3, 6, 9 */}
              <circle cx="50" cy="8.5" r="1.2" fill={isGlowing ? "#fbbf24" : "#34d399"} className="animate-pulse" />
              <circle cx="91.5" cy="50" r="1" fill="#fcd34d" />
              <circle cx="50" cy="91.5" r="1" fill="#fcd34d" />
              <circle cx="8.5" cy="50" r="1" fill="#fcd34d" />

              {/* Applied Luxury Numerals (12, 6, 9, 3) for enhanced readability */}
              <text 
                x="50" 
                y="19" 
                textAnchor="middle" 
                dominantBaseline="central" 
                fill="#fef08a" 
                fontSize="7.5" 
                fontFamily="Georgia, serif" 
                fontWeight="bold" 
                letterSpacing="0.05em"
              >
                12
              </text>
              <text 
                x="50" 
                y="81.5" 
                textAnchor="middle" 
                dominantBaseline="central" 
                fill="#fde047" 
                fontSize="6.8" 
                fontFamily="Georgia, serif" 
                fontWeight="bold"
              >
                6
              </text>
              <text 
                x="18.5" 
                y="50.2" 
                textAnchor="middle" 
                dominantBaseline="central" 
                fill="#fde047" 
                fontSize="6.8" 
                fontFamily="Georgia, serif" 
                fontWeight="bold"
              >
                9
              </text>
              {!showDateWindow && (
                <text 
                  x="81.5" 
                  y="50.2" 
                  textAnchor="middle" 
                  dominantBaseline="central" 
                  fill="#fde047" 
                  fontSize="6.8" 
                  fontFamily="Georgia, serif" 
                  fontWeight="bold"
                >
                  3
                </text>
              )}
            </svg>

            {/* BRAND LUXURY HOROLOGY INSCRIPTION - CARTIER HALLMARK (GOLD EMBOSSED RELIEF) */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[32%] -translate-y-1/2 flex flex-col items-center pointer-events-none select-none text-center">
              <span 
                className="relative inline-block select-none tracking-[0.05em] font-serif font-bold italic"
                style={{
                  fontSize: cartierFontSize,
                  fontFamily: '"Cormorant Garamond", Georgia, "Times New Roman", serif',
                }}
              >
                {/* 3D Embossed Cast Shadow / Bevel Underlayer */}
                <span 
                  aria-hidden="true" 
                  className="absolute inset-0 select-none text-[#3d2703] pointer-events-none"
                  style={{
                    transform: 'translateY(0.9px)',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.95))',
                    opacity: 0.95,
                  }}
                >
                  Cartier
                </span>
                
                {/* Top Specular Gilt Highlight Underlayer */}
                <span 
                  aria-hidden="true" 
                  className="absolute inset-0 select-none text-[#FFF9D6] pointer-events-none"
                  style={{
                    transform: 'translateY(-0.4px)',
                    opacity: 0.7,
                  }}
                >
                  Cartier
                </span>

                {/* Foreground Embossed Gold Plate with Metallic Gradient & Subtle Drop Shadows */}
                <span 
                  className="relative z-10 block bg-gradient-to-b from-[#FFFDF0] via-[#F6D779] via-50% via-[#D6A429] to-[#8C630D] bg-clip-text text-transparent"
                  style={{
                    filter: 'drop-shadow(0 0.5px 0.5px rgba(255, 245, 190, 0.5)) drop-shadow(0 1.5px 2px rgba(0, 0, 0, 0.9))',
                  }}
                >
                  Cartier
                </span>
              </span>
            </div>

            {/* LOWER DIAL STATUS & TRUETIME HOROLOGY (CENTERED IN LOWER DIAL SECTOR) */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[67%] -translate-y-1/2 flex flex-col items-center pointer-events-none select-none text-center">
              {isGlowing ? (
                <div className="flex items-center space-x-1 px-1.5 py-0.2 rounded-full bg-amber-500/25 border border-amber-400/60 animate-pulse shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span 
                    className="tracking-[0.15em] font-mono text-amber-300 uppercase font-black"
                    style={{ fontSize: lowerStatusSize }}
                  >
                    DEADLINE
                  </span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-spin' : isSynced ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                  <span 
                    className="tracking-[0.18em] font-mono text-emerald-400 uppercase font-bold"
                    style={{ fontSize: lowerStatusSize }}
                  >
                    {isSyncing ? 'SYNC' : 'TRUE-T'}
                  </span>
                </div>
              )}
              <span 
                className="tracking-[0.15em] font-mono text-zinc-400 mt-0.5"
                style={{ fontSize: vphSize }}
              >
                {isGlowing ? 'ALARM REACHED' : '28,800 VPH'}
              </span>
            </div>

            {/* DATE APERTURE WINDOW AT 3 O'CLOCK */}
            {showDateWindow && size >= 70 && (
              <div 
                className="absolute right-[10%] top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-[3px] bg-black/95 border border-gold-500/50 shadow-[inset_0_1px_4px_rgba(0,0,0,0.9)] flex items-center justify-center pointer-events-none z-10"
                style={{ minWidth: Math.max(16, size * 0.18) }}
              >
                <span 
                  className="font-mono font-black text-amber-200 leading-none"
                  style={{ fontSize: dateFontSize }}
                >
                  {dayOfMonth}
                </span>
              </div>
            )}

            {/* ================= CLOCK HANDS LAYER ================= */}
            <div className="absolute inset-0 pointer-events-none z-20">
              
              {/* 1. HOUR HAND (Faceted 24k Gold Dauphine) */}
              <div 
                className="absolute inset-0 flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${hourDeg}deg)` }}
              >
                <div 
                  className="relative origin-bottom rounded-t-sm bg-gradient-to-r from-[#e6ca65] via-[#fff4cc] to-[#b38f2b] shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                  style={{
                    width: Math.max(2.5, size * 0.045),
                    height: size * 0.28,
                    marginBottom: size * 0.28,
                    clipPath: 'polygon(50% 0%, 100% 15%, 75% 100%, 25% 100%, 0% 15%)'
                  }}
                >
                  {/* Subtle 3D ridge line */}
                  <div className="absolute inset-y-0 left-1/2 w-[0.5px] bg-black/20" />
                </div>
              </div>

              {/* 2. MINUTE HAND (Long Slender Faceted Lance) */}
              <div 
                className="absolute inset-0 flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${minuteDeg}deg)` }}
              >
                <div 
                  className="relative origin-bottom rounded-t-sm bg-gradient-to-r from-[#fae17d] via-[#ffffff] to-[#c79a32] shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
                  style={{
                    width: Math.max(1.8, size * 0.032),
                    height: size * 0.39,
                    marginBottom: size * 0.39,
                    clipPath: 'polygon(50% 0%, 100% 12%, 70% 100%, 30% 100%, 0% 12%)'
                  }}
                >
                  <div className="absolute inset-y-0 left-1/2 w-[0.5px] bg-black/20" />
                </div>
              </div>

              {/* 3. SECOND HAND (Needle-Thin Rose Gold / Crimson Tip with Counterweight) */}
              {showSeconds && (
                <div 
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-100 ease-linear"
                  style={{ transform: `rotate(${secondDeg}deg)` }}
                >
                  <div 
                    className="relative flex flex-col items-center"
                    style={{ height: size * 0.52 }}
                  >
                    {/* Active needle with red luminous tip */}
                    <div 
                      className={`w-[1px] transition-colors ${
                        isGlowing
                          ? 'bg-gradient-to-t from-gold-300 via-amber-400 to-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                          : 'bg-gradient-to-t from-gold-300 via-rose-400 to-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                      }`}
                      style={{ height: size * 0.42 }}
                    />
                    
                    {/* Counterweight Extension below center */}
                    <div 
                      className="w-[1.2px] bg-gold-400"
                      style={{ height: size * 0.1 }}
                    >
                      {/* Counterweight circle */}
                      <div className="w-1.5 h-1.5 -ml-[2px] mt-1 rounded-full border border-gold-400 bg-black/90 shadow-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. CENTER BOSS / CANOPY JEWEL CAP */}
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Outer Brass Ring */}
                <div 
                  className="rounded-full bg-gradient-to-br from-gold-300 via-gold-500 to-amber-700 shadow-[0_1px_4px_rgba(0,0,0,0.9)] flex items-center justify-center p-[1px]"
                  style={{ width: Math.max(7, size * 0.11), height: Math.max(7, size * 0.11) }}
                >
                  {/* Inner Polished Obsidian Jewel */}
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <div className={`w-1 h-1 rounded-full ${
                      isGlowing 
                        ? 'bg-amber-300 shadow-[0_0_6px_#fbbf24] animate-ping' 
                        : 'bg-emerald-400 shadow-[0_0_4px_#34d399]'
                    }`} />
                  </div>
                </div>
              </div>

            </div>

            {/* ANTI-REFLECTIVE SAPPHIRE CRYSTAL TOP SHEEN */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12] pointer-events-none" />

          </div>
        </div>
      </div>
    </div>
  );
};

export default LuxuryAnalogClock;

