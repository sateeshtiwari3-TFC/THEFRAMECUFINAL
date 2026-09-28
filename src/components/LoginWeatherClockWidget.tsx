import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock,
  Radio,
  Watch,
  Compass,
  Maximize2,
  Moon, 
  Sun, 
  Droplets, 
  Wind, 
  MapPin, 
  RefreshCw, 
  ChevronDown, 
  Camera, 
  Search,
  Navigation,
  Check,
  X,
  Loader2,
  Sparkles,
  Bell,
  BellRing,
  AlertTriangle,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirestoreServerTime } from '../hooks/useFirestoreServerTime';
import LuxuryAnalogClock from './common/LuxuryAnalogClock';
import { useDeadlineAlarms } from '../hooks/useDeadlineAlarms';
import DeadlineAlarmsModal from './common/DeadlineAlarmsModal';
import { Project } from '../types';

export interface TimezoneConfig {
  code: string;
  name: string;
  timeZone: string;
  offset: string;
  flag: string;
  region: string;
}

export const SUPPORTED_TIMEZONES: TimezoneConfig[] = [
  { code: 'IST', name: 'India', timeZone: 'Asia/Kolkata', offset: 'UTC+5:30', flag: '🇮🇳', region: 'Studio HQ' },
  { code: 'GMT', name: 'London / GMT', timeZone: 'Europe/London', offset: 'UTC+0', flag: '🇬🇧', region: 'UK / Europe' },
  { code: 'EST', name: 'New York', timeZone: 'America/New_York', offset: 'UTC-5', flag: '🇺🇸', region: 'US East' },
  { code: 'PST', name: 'Los Angeles', timeZone: 'America/Los_Angeles', offset: 'UTC-8', flag: '🇺🇸', region: 'US West' },
  { code: 'DXB', name: 'Dubai', timeZone: 'Asia/Dubai', offset: 'UTC+4', flag: '🇦🇪', region: 'Middle East' },
];

interface CityPreset {
  name: string;
  lat: number;
  lon: number;
  tag: string;
}

const DEFAULT_PRESETS: CityPreset[] = [
  { name: 'Forest', lat: 32.2432, lon: 77.1892, tag: 'Misty Woodland' },
  { name: 'Udaipur', lat: 24.5854, lon: 73.7125, tag: 'Palace & Lake' },
  { name: 'New Delhi', lat: 28.6139, lon: 77.2090, tag: 'Capital Studio' },
  { name: 'Jaipur', lat: 26.9124, lon: 75.7873, tag: 'Pink City Forts' },
  { name: 'Goa', lat: 15.2993, lon: 74.1240, tag: 'Coastal Sunset' },
  { name: 'Mumbai', lat: 19.0760, lon: 72.8777, tag: 'Film City' },
  { name: 'Manali', lat: 32.2432, lon: 77.1892, tag: 'Snow Peaks' },
  { name: 'Kashmir', lat: 34.0837, lon: 74.7973, tag: 'Paradise Valley' }
];

interface WeatherData {
  tempC: number;
  humidity: number;
  windSpeedMs: number;
  conditionText: string;
  shootAdvice: string;
  isNight: boolean;
}

interface SearchResult {
  id: number;
  name: string;
  country?: string;
  admin1?: string; // state/region
  latitude: number;
  longitude: number;
}

export default function LoginWeatherClockWidget({ 
  layout: initialLayout = 'vertical',
  projects = []
}: { 
  layout?: 'horizontal' | 'vertical' | 'compact';
  projects?: Project[];
}) {
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'vertical'>(
    initialLayout === 'vertical' ? 'vertical' : 'horizontal'
  );
  
  // Realtime Cloud Firestore TrueTime synchronized clock
  const { 
    time, 
    isSynced, 
    isSyncing, 
    offsetMs, 
    latencyMs, 
    syncNow 
  } = useFirestoreServerTime();

  // Project Deadline Alarms & Visual Analog Clock Face Glow
  const {
    alarms,
    activeTriggeredAlarms,
    hasActiveGlow,
    upcomingAlarms,
    addAlarm,
    toggleAlarm,
    removeAlarm,
    dismissAlarm,
    dismissAllTriggered,
    snoozeAlarm,
    triggerTestAlarm
  } = useDeadlineAlarms(time);

  const [showAlarmsModal, setShowAlarmsModal] = useState<boolean>(false);

  // Map active project deadline alarms to 12-hour dial positions for visual markers on LuxuryAnalogClock
  const alarmMarkers = useMemo(() => {
    return alarms
      .filter((a) => a.enabled)
      .map((alarm) => {
        const targetDate = new Date(alarm.targetTime);
        const targetHours = targetDate.getHours();
        const targetMins = targetDate.getMinutes();
        const angleDeg = (targetHours % 12) * 30 + targetMins * 0.5;
        const isTriggered = activeTriggeredAlarms.some((a) => a.id === alarm.id);
        return {
          angleDeg,
          isTriggered,
          title: alarm.projectTitle,
          formattedTime: targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      });
  }, [alarms, activeTriggeredAlarms]);

  // Alternative Clock Visual: 'analog' luxury rotating circular face vs 'digital' vs 'dual' master
  const [clockVisualMode, setClockVisualMode] = useState<'analog' | 'digital' | 'dual'>(() => {
    try {
      return (localStorage.getItem('framecut_clock_visual_mode') as 'analog' | 'digital' | 'dual') || 'dual';
    } catch {
      return 'dual';
    }
  });
  const [showHorologyModal, setShowHorologyModal] = useState<boolean>(false);

  const handleSetClockVisualMode = (mode: 'analog' | 'digital' | 'dual') => {
    setClockVisualMode(mode);
    try {
      localStorage.setItem('framecut_clock_visual_mode', mode);
    } catch (e) {
      console.error(e);
    }
  };

  // User-selectable multi-timezone configuration (IST, GMT, EST, PST, DXB)
  const [activeTimezoneCode, setActiveTimezoneCode] = useState<string>(() => {
    try {
      return localStorage.getItem('framecut_active_timezone') || 'IST';
    } catch {
      return 'IST';
    }
  });

  const activeTimezone = useMemo(() => {
    return SUPPORTED_TIMEZONES.find((tz) => tz.code === activeTimezoneCode) || SUPPORTED_TIMEZONES[0];
  }, [activeTimezoneCode]);

  const handleSelectTimezone = (code: string) => {
    setActiveTimezoneCode(code);
    try {
      localStorage.setItem('framecut_active_timezone', code);
    } catch (e) {
      console.error(e);
    }
  };

  // Convert server TrueTime to the active timezone
  const getZonedDate = (baseDate: Date, timeZone: string): Date => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
      }).formatToParts(baseDate);

      const p: Record<string, string> = {};
      for (const part of parts) {
        p[part.type] = part.value;
      }

      const year = parseInt(p.year, 10);
      const month = parseInt(p.month, 10) - 1;
      const day = parseInt(p.day, 10);
      let hour = parseInt(p.hour, 10);
      if (hour === 24) hour = 0;
      const minute = parseInt(p.minute, 10);
      const second = parseInt(p.second, 10);
      const ms = baseDate.getMilliseconds();

      return new Date(year, month, day, hour, minute, second, ms);
    } catch (err) {
      console.error('Timezone conversion error:', err);
      return baseDate;
    }
  };

  // Active time reflecting selected timezone
  const displayTime = useMemo(() => {
    return getZonedDate(time, activeTimezone.timeZone);
  }, [time, activeTimezone.timeZone]);

  // Studio HQ local reference time (IST)
  const studioIstTime = useMemo(() => {
    return getZonedDate(time, 'Asia/Kolkata');
  }, [time]);
  
  // Load saved location from localStorage or default to Forest
  const [selectedCity, setSelectedCity] = useState<CityPreset>(() => {
    try {
      const saved = localStorage.getItem('framecut_login_location');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PRESETS[0];
  });

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);

  // Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // Fetch live weather from Open-Meteo
  const fetchWeather = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather fetch failed');
      const data = await res.json();
      const current = data.current;
      const code = current.weather_code ?? 0;
      const isNight = current.is_day === 0;

      let conditionText = 'Clear Atmospheric';
      let shootAdvice = 'Optimal Natural Light for Outdoor & Drone Shoots';

      if (code === 0) {
        conditionText = isNight ? 'Clear Starlit Night' : 'Clear Sunny Sky';
        shootAdvice = '☀️ Pristine Lighting • Great for 4K High-FPS Capture';
      } else if (code >= 1 && code <= 3) {
        conditionText = 'Partly Overcast';
        shootAdvice = '🌤️ Diffused Sunlight • Soft Natural Shadows for Portraits';
      } else if (code === 45 || code === 48) {
        conditionText = 'Misty Woodland Fog';
        shootAdvice = '🌫️ Cinematic Atmosphere • Keep Lens Wipes Ready';
      } else if (code >= 51 && code <= 82) {
        conditionText = 'Rainy Conditions';
        shootAdvice = '🌧️ Rain Alert • Use Indoor Studio or Weatherized Gear';
      }

      // Convert wind speed from km/h to m/s
      const windSpeedMs = Math.round((current.wind_speed_10m / 3.6) * 10) / 10;

      setWeather({
        tempC: Math.round(current.temperature_2m),
        humidity: Math.round(current.relative_humidity_2m),
        windSpeedMs,
        conditionText,
        shootAdvice,
        isNight
      });
    } catch {
      // Fallback
      setWeather({
        tempC: 16,
        humidity: 85,
        windSpeedMs: 4,
        conditionText: 'Misty Woodland',
        shootAdvice: '🌲 Misty Ambience • Ideal for Atmospheric Cinematography',
        isNight: time.getHours() < 6 || time.getHours() >= 19
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(selectedCity.lat, selectedCity.lon);
    try {
      localStorage.setItem('framecut_login_location', JSON.stringify(selectedCity));
    } catch (e) {
      console.error(e);
    }
  }, [selectedCity]);

  // Geocoding city search handler
  const handleSearchCity = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setSearchError('');
      return;
    }

    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
        setSearchError('No matching location found');
      }
    } catch (err) {
      console.error(err);
      setSearchError('Error searching location');
    } finally {
      setSearching(false);
    }
  };

  // GPS Detect handler
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by your browser');
      return;
    }
    setGpsLoading(true);
    setSearchError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        
        // Reverse geocode to name the location
        let cityName = 'Current Location';
        try {
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${lat.toFixed(2)}`);
          cityName = 'Live GPS Location';
        } catch (e) {
          console.error(e);
        }

        const newCity: CityPreset = {
          name: cityName,
          lat,
          lon,
          tag: 'GPS Local Area'
        };
        setSelectedCity(newCity);
        setGpsLoading(false);
        setShowLocationModal(false);
      },
      (err) => {
        console.error(err);
        setGpsLoading(false);
        setSearchError('Could not detect GPS position. Please select or search city name above.');
      }
    );
  };

  const selectCityAndClose = (city: CityPreset) => {
    setSelectedCity(city);
    setShowLocationModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const formattedDate = displayTime.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long'
  });

  const formattedTime = displayTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const hoursRaw = displayTime.getHours();
  const hours12 = hoursRaw % 12 || 12;
  const hoursStr = String(hours12).padStart(2, '0');
  const minutesStr = String(displayTime.getMinutes()).padStart(2, '0');
  const secondsStr = String(displayTime.getSeconds()).padStart(2, '0');
  const ampm = hoursRaw >= 12 ? 'PM' : 'AM';

  // User-configurable analog clock size scale ('standard' | 'large' | 'giant')
  const [analogClockScale, setAnalogClockScale] = useState<'standard' | 'large' | 'giant'>(() => {
    try {
      return (localStorage.getItem('framecut_analog_clock_scale') as 'standard' | 'large' | 'giant') || 'large';
    } catch {
      return 'large';
    }
  });

  const handleSetClockScale = (scale: 'standard' | 'large' | 'giant') => {
    setAnalogClockScale(scale);
    try {
      localStorage.setItem('framecut_analog_clock_scale', scale);
    } catch (e) {
      console.error(e);
    }
  };

  // Compute responsive pixel diameter (large is 122px, giant is 144px, standard is 96px)
  const analogDialDiameter = analogClockScale === 'giant' ? 144 : analogClockScale === 'large' ? 122 : 96;

  // Cinematography Lighting & Sun Position Telemetry
  const cinemaLighting = useMemo(() => {
    const h = time.getHours();
    const m = time.getMinutes();
    const totalMin = h * 60 + m;

    if (totalMin >= 300 && totalMin < 375) {
      return {
        phase: 'Dawn / Blue Hour',
        tempK: '7500K - 9000K',
        badge: 'Moody Dawn 7500K',
        badgeColor: 'text-indigo-300 border-indigo-500/40 bg-indigo-500/15',
        advice: 'Soft blue ambient · Prime for misty landscape B-roll'
      };
    } else if (totalMin >= 375 && totalMin < 450) {
      return {
        phase: 'Morning Golden Hour',
        tempK: '3200K Soft Gilt',
        badge: 'Golden Hour 3200K',
        badgeColor: 'text-amber-300 border-amber-500/40 bg-amber-500/15',
        advice: 'Directional warm sunlight · Low flare angle · Prime couple portraits'
      };
    } else if (totalMin >= 450 && totalMin < 1020) {
      return {
        phase: 'Daylight Cinema',
        tempK: '5600K Standard',
        badge: 'Daylight 5600K',
        badgeColor: 'text-sky-300 border-sky-500/40 bg-sky-500/15',
        advice: '5600K standard light · ND Filters recommended for f/1.4 - f/2.0'
      };
    } else if (totalMin >= 1020 && totalMin < 1110) {
      return {
        phase: 'Sunset Golden Hour',
        tempK: '2800K - 3400K Warm',
        badge: 'Peak Golden Hour',
        badgeColor: 'text-gold-300 border-gold-400/50 bg-gold-500/20',
        advice: 'Warm rim-light · Optimal couple silhouettes & drone arcs'
      };
    } else if (totalMin >= 1110 && totalMin < 1170) {
      return {
        phase: 'Blue Hour Twilight',
        tempK: '8000K Cobalt',
        badge: 'Twilight 8000K',
        badgeColor: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/15',
        advice: 'Deep cobalt sky · Blend ambient daylight with fairy tungsten lights'
      };
    } else {
      return {
        phase: 'Night Wedding Cinema',
        tempK: '3200K Tungsten & RGB',
        badge: 'Night Production',
        badgeColor: 'text-purple-300 border-purple-500/40 bg-purple-500/15',
        advice: 'Low-light ceremony · Fast primes & rim lighting recommended'
      };
    }
  }, [time]);

  return (
    <div className={`w-full ${layoutMode === 'vertical' ? 'max-w-[320px] sm:max-w-[360px]' : 'max-w-3xl sm:max-w-4xl'} mx-auto select-none relative transition-all duration-300`}>
      {/* HORIZONTAL WIDE DASHBOARD STUDIO CHRONOMETER & WEATHER BAR */}
      {layoutMode === 'horizontal' ? (
        <div className="rounded-3xl bg-gradient-to-br from-charcoal-950 via-[#13110d] to-luxury-green-950/30 border border-gold-500/35 p-3.5 sm:p-4.5 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_35px_rgba(212,175,55,0.06)] relative overflow-hidden flex flex-col xl:flex-row items-center justify-between gap-4 group hover:border-gold-400/60 transition-all duration-300 w-full min-w-0">
          
          {/* 24K Gold Specular Micro-Bevel Lip */}
          <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-gold-400/60 to-transparent pointer-events-none" />
          
          {/* Corner Precision Micro-Studs */}
          <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full border border-gold-500/30 bg-charcoal-900/90 shadow-inner" />
          <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full border border-gold-500/30 bg-charcoal-900/90 shadow-inner" />
          <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full border border-gold-500/30 bg-charcoal-900/90 shadow-inner" />
          <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full border border-gold-500/30 bg-charcoal-900/90 shadow-inner" />

          {/* SECTION 1: MASTER TIMEKEEPER (ANALOG ROTATING LUXURY FACE / DIGITAL / DUAL) */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 shrink-0 min-w-0 w-full xl:w-auto justify-center sm:justify-start">
            
            {/* 1A: ANALOG DIAL (Rendered when in 'analog' or 'dual' mode) */}
            {(clockVisualMode === 'analog' || clockVisualMode === 'dual') && (
              <div className="relative shrink-0 flex items-center justify-center p-1">
                <LuxuryAnalogClock 
                  time={displayTime} 
                  size={clockVisualMode === 'dual' ? Math.min(analogDialDiameter, 110) : analogDialDiameter} 
                  isSynced={isSynced} 
                  isSyncing={isSyncing} 
                  isGlowing={hasActiveGlow}
                  activeAlarmTitle={activeTriggeredAlarms[0]?.projectTitle}
                  alarmMarkers={alarmMarkers}
                  onClick={() => setShowHorologyModal(true)} 
                />
              </div>
            )}

            {/* 1B: DIGITAL CHRONOMETER READOUT & HOROLOGY SPECS */}
            <div className="flex flex-col min-w-0 justify-center">
              
              {/* High-Contrast Crystal-Clear Digital Time Display */}
              <div className="flex items-center gap-2">
                <div className="flex items-baseline font-mono select-none">
                  {/* Hours & Minutes */}
                  <span className={`${
                    clockVisualMode === 'digital' 
                      ? 'text-3xl sm:text-4xl lg:text-5xl' 
                      : 'text-2xl sm:text-3xl lg:text-3xl'
                  } font-black tracking-tight text-white drop-shadow-[0_2px_14px_rgba(255,255,255,0.35)]`}>
                    {hoursStr}
                  </span>
                  
                  {/* Pulsing Luminous Colon */}
                  <span className={`${
                    clockVisualMode === 'digital' 
                      ? 'text-3xl sm:text-4xl lg:text-5xl' 
                      : 'text-2xl sm:text-3xl lg:text-3xl'
                  } font-black text-gold-400 mx-0.5 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]`}>
                    :
                  </span>

                  {/* Minutes */}
                  <span className={`${
                    clockVisualMode === 'digital' 
                      ? 'text-3xl sm:text-4xl lg:text-5xl' 
                      : 'text-2xl sm:text-3xl lg:text-3xl'
                  } font-black tracking-tight text-white drop-shadow-[0_2px_14px_rgba(255,255,255,0.35)]`}>
                    {minutesStr}
                  </span>

                  {/* Seconds Ticker */}
                  <span className={`${
                    clockVisualMode === 'digital' 
                      ? 'text-base sm:text-xl lg:text-2xl' 
                      : 'text-xs sm:text-sm lg:text-base'
                  } font-bold text-gold-400 ml-1 font-mono drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]`}>
                    :{secondsStr}
                  </span>

                  {/* AM / PM Gilt Chamfered Badge */}
                  <span className="ml-2 px-2 py-0.5 rounded-lg bg-gradient-to-b from-[#2e2413] via-[#1c170d] to-[#0e0c07] border border-gold-400/60 text-[10px] sm:text-xs font-mono font-black text-gold-300 shadow-sm self-center">
                    {ampm}
                  </span>
                </div>

                {/* Inspect Watchmaker Loupe Button */}
                <button
                  type="button"
                  onClick={() => setShowHorologyModal(true)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-gold-500/20 text-zinc-400 hover:text-gold-300 transition-colors border border-white/10 cursor-pointer shadow-sm shrink-0 ml-1"
                  title="Inspect Luxury Studio Chronometer Movement & Escapement"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* In Digital Mode: Animated 60-Second Linear Track */}
              {clockVisualMode === 'digital' && (
                <div className="w-full max-w-[260px] sm:max-w-[320px] h-1.5 bg-black/60 rounded-full overflow-hidden border border-gold-500/20 my-1 shadow-inner">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-amber-500 via-gold-400 to-amber-300 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                    style={{ width: `${((displayTime.getSeconds() + displayTime.getMilliseconds() / 1000) / 60) * 100}%` }}
                    transition={{ ease: "linear" }}
                  />
                </div>
              )}

              {/* Full Gregorian Date with Weekday */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 font-medium truncate mt-0.5">
                <span className="text-gold-300/90 font-bold shrink-0">
                  {displayTime.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-zinc-600 shrink-0">·</span>
                <span className="shrink-0">{formattedDate}</span>
                <span className="text-zinc-600 shrink-0">·</span>
                
                {/* Atomic Server TrueTime Sync Trigger */}
                <button
                  type="button"
                  onClick={() => syncNow()}
                  className="text-[9px] text-emerald-400/90 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                  title={`Atomic TrueTime Server Synced (Offset: ${offsetMs >= 0 ? '+' : ''}${offsetMs}ms, Ping: ${latencyMs}ms). Click to recalibrate.`}
                >
                  <Radio className={`w-2.5 h-2.5 text-emerald-400 shrink-0 ${isSyncing ? 'animate-spin' : 'animate-pulse'}`} />
                  <span className="truncate">
                    {isSyncing ? 'Calibrating...' : isSynced ? 'Atomic TrueTime' : 'Sync Clock'}
                  </span>
                </button>
              </div>

              {/* MULTI-TIMEZONE QUICK SWITCHER BAR (IST · GMT · EST · PST · DXB) */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-black/70 border border-gold-500/30 shadow-inner">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 text-zinc-400">
                    <Globe className="w-3 h-3 text-gold-400 shrink-0" />
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider hidden sm:inline">
                      Zone:
                    </span>
                  </div>
                  {SUPPORTED_TIMEZONES.map((tz) => {
                    const isActive = tz.code === activeTimezone.code;
                    return (
                      <button
                        key={tz.code}
                        type="button"
                        onClick={() => handleSelectTimezone(tz.code)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          isActive
                            ? 'bg-gradient-to-r from-gold-500/35 via-gold-400/25 to-amber-500/30 text-gold-200 border border-gold-400/60 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10 border border-transparent'
                        }`}
                        title={`${tz.name} (${tz.offset}) — ${tz.region}. Click to switch workstation clock.`}
                      >
                        <span className="text-[10px]">{tz.flag}</span>
                        <span>{tz.code}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Zone Offset / Remote Client Delta */}
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-gold-300 font-semibold shadow-sm flex items-center gap-1">
                  <span className="text-zinc-400">{activeTimezone.offset}</span>
                  <span>·</span>
                  <span>{activeTimezone.region}</span>
                  {activeTimezone.code !== 'IST' && (
                    <span className="text-amber-300/90 font-bold ml-1 hidden sm:inline">
                      (HQ: {studioIstTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })})
                    </span>
                  )}
                </span>
              </div>

              {/* Refined Segmented Dial Selector Bar */}
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                
                {/* Segmented Mode Selector: [Analog] [Digital] [Dual] */}
                <div className="inline-flex p-0.5 rounded-lg bg-black/60 border border-white/10 text-[9px] font-mono">
                  <button
                    type="button"
                    onClick={() => handleSetClockVisualMode('analog')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer font-bold ${
                      clockVisualMode === 'analog'
                        ? 'bg-gold-500/25 text-gold-300 border border-gold-400/40 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Analog
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetClockVisualMode('digital')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer font-bold ${
                      clockVisualMode === 'digital'
                        ? 'bg-gold-500/25 text-gold-300 border border-gold-400/40 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Digital
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetClockVisualMode('dual')}
                    className={`px-2 py-0.5 rounded transition-all cursor-pointer font-bold ${
                      clockVisualMode === 'dual'
                        ? 'bg-gold-500/25 text-gold-300 border border-gold-400/40 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Dual Chrono
                  </button>
                </div>

                {/* Clock Dial Size Toggle (Std / Grande / Master) */}
                <button
                  type="button"
                  onClick={() => handleSetClockScale(analogClockScale === 'standard' ? 'large' : analogClockScale === 'large' ? 'giant' : 'standard')}
                  className="px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold bg-white/5 hover:bg-gold-500/20 border border-white/10 text-zinc-300 hover:text-gold-300 flex items-center gap-1 cursor-pointer transition-all"
                  title={`Dial Scale: Standard (96px), Grande (122px), Master (144px). Currently: ${analogClockScale}.`}
                >
                  <Maximize2 className="w-2.5 h-2.5 text-gold-400" />
                  <span>{analogClockScale === 'giant' ? 'Master (144mm)' : analogClockScale === 'large' ? 'Grande (122mm)' : 'Std (96mm)'}</span>
                </button>

                {/* Deadline Visual Alarms Configuration Button */}
                <button
                  type="button"
                  onClick={() => setShowAlarmsModal(true)}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    hasActiveGlow
                      ? 'bg-amber-500/35 border border-amber-300 text-amber-200 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                      : alarms.filter((a) => a.enabled).length > 0
                      ? 'bg-gold-500/15 border border-gold-400/40 text-gold-300 hover:bg-gold-500/25'
                      : 'text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10 border border-white/10'
                  }`}
                  title="Configure visual alarms for wedding delivery deadlines"
                >
                  <BellRing className={`w-2.5 h-2.5 ${hasActiveGlow ? 'text-amber-300 animate-bounce' : 'text-gold-400'}`} />
                  <span>
                    {hasActiveGlow 
                      ? `⚠️ Alarm Glow (${activeTriggeredAlarms.length})` 
                      : `Alarms (${alarms.filter((a) => a.enabled).length})`}
                  </span>
                </button>
              </div>

              {/* Active Deadline Alarm Warning Banner */}
              {hasActiveGlow && activeTriggeredAlarms.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-xl bg-amber-500/25 border border-amber-400/60 text-[10px] font-mono text-amber-200 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                  <span className="truncate max-w-[150px] sm:max-w-[200px] font-bold">
                    ⚠️ {activeTriggeredAlarms[0]?.projectTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => dismissAlarm(activeTriggeredAlarms[0]?.id)}
                    className="ml-auto underline text-gold-300 hover:text-white shrink-0 cursor-pointer text-[9px]"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Elegant Vertical Divider */}
          <div className="hidden xl:block h-20 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent shrink-0" />

          {/* SECTION 2: CINEMATOGRAPHY LIGHTING & ATMOSPHERIC TELEMETRY */}
          <div className="flex flex-col sm:items-end gap-1.5 min-w-0 w-full xl:w-auto">
            
            {/* Top row: Shoot Location & Live Refresh */}
            <div className="flex items-center justify-between sm:justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white hover:text-gold-300 transition-colors cursor-pointer group/btn"
                title="Change cinematography base location"
              >
                <div className="w-5 h-5 rounded-md bg-gold-500/15 border border-gold-500/30 flex items-center justify-center shrink-0">
                  <MapPin className="w-3 h-3 text-gold-400 group-hover/btn:scale-110 transition-transform" />
                </div>
                <span className="truncate max-w-[140px] sm:max-w-[180px] font-display">{selectedCity.name}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
              </button>

              <div className="flex items-center gap-1">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ${cinemaLighting.badgeColor}`}>
                  {cinemaLighting.badge}
                </span>

                <button
                  type="button"
                  onClick={() => fetchWeather(selectedCity.lat, selectedCity.lon)}
                  className="p-1 rounded-md bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/10 shrink-0"
                  title="Recalibrate live cinematography telemetry"
                >
                  <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-gold-400' : ''}`} />
                </button>
              </div>
            </div>

            {/* Middle row: High-contrast telemetry metrics */}
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-charcoal-900/90 text-white border border-white/10 shadow-inner">
                {weather?.isNight ? <Moon className="w-3 h-3 text-sky-200" /> : <Sun className="w-3 h-3 text-amber-300" />}
                <span className="font-bold">{weather ? `${weather.tempC}°C` : '24°C'}</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-charcoal-900/90 text-white border border-white/10 shadow-inner">
                <Droplets className="w-3 h-3 text-sky-300" />
                <span className="font-bold">{weather ? `${weather.humidity}%` : '55%'}</span>
                <span className="text-[9px] text-zinc-400 hidden sm:inline">RH</span>
              </div>

              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-charcoal-900/90 text-white border border-white/10 shadow-inner">
                <Wind className="w-3 h-3 text-emerald-300" />
                <span className="font-bold">{weather ? `${weather.windSpeedMs}m/s` : '2.8m/s'}</span>
                <span className="text-[9px] text-emerald-400/90 font-bold hidden sm:inline">
                  {Number(weather?.windSpeedMs || 2.8) <= 5.0 ? '· Drone Safe' : '· Wind Caution'}
                </span>
              </div>
            </div>

            {/* Bottom row: Director's Lighting & Production Directive */}
            <div className="text-[10px] text-gold-300/90 font-mono truncate max-w-[280px] sm:max-w-[340px] text-left sm:text-right pt-0.5">
              🎬 {weather?.shootAdvice || cinemaLighting.advice}
            </div>
          </div>

        </div>
      ) : (
        /* VERTICAL TALL CAPSULE LAYOUT */
        <div className="rounded-[80px] sm:rounded-[100px] bg-black/35 backdrop-blur-2xl border border-white/20 p-6 pt-5 pb-8 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative overflow-hidden flex flex-col items-center text-center group hover:border-white/30 transition-all duration-500">
          
          {/* Subtle inner glass highlight */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-[100px]" />

          {/* Top Circular Aperture Portal showing either Luxury Analog Face or Background Foliage */}
          <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full border-2 border-white/30 overflow-hidden shadow-[inset_0_4px_25px_rgba(0,0,0,0.8),0_12px_30px_rgba(0,0,0,0.7)] relative my-2 flex items-center justify-center shrink-0 group-hover:border-gold-400/40 transition-all duration-500 bg-black/80">
            {clockVisualMode === 'analog' ? (
              /* LUXURY ANALOG CHRONOMETER IN APERTURE PORTAL */
              <div className="flex flex-col items-center justify-center p-2">
                <LuxuryAnalogClock 
                  time={time} 
                  size={195} 
                  isSynced={isSynced} 
                  isSyncing={isSyncing} 
                  isGlowing={hasActiveGlow}
                  activeAlarmTitle={activeTriggeredAlarms[0]?.projectTitle}
                  alarmMarkers={alarmMarkers}
                  onClick={() => setShowHorologyModal(true)} 
                />
              </div>
            ) : (
              /* DIGITAL OVERLAY ON BACKGROUND FOLIAGE */
              <>
                <img 
                  src="https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80" 
                  alt="Forest Canopy" 
                  className="w-full h-full object-cover filter contrast-125 brightness-50 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/70" />

                {/* Aperture Lens Badge & Live Time Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-2 text-center">
                  <button 
                    type="button"
                    onClick={() => syncNow()}
                    className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 hover:border-gold-400/50 text-[9px] font-mono text-emerald-300 font-semibold tracking-wider mb-1 cursor-pointer transition-all"
                    title={`Cloud Firestore TrueTime (${isSynced ? 'Synced' : 'Connecting'} • Offset: ${offsetMs >= 0 ? '+' : ''}${offsetMs}ms, Ping: ${latencyMs}ms). Click to resync.`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-spin' : isSynced ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'}`} />
                    <span>{isSyncing ? 'SYNCING...' : isSynced ? 'CLOUD TRUE-TIME' : 'LIVE CLOCK'}</span>
                  </button>

                  {/* Big, High-Contrast Digital Time */}
                  <div className="flex items-baseline justify-center space-x-0.5 font-mono text-white drop-shadow-[0_4px_16px_rgba(0,0,0,1)] my-1">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)]">
                      {hoursStr}:{minutesStr}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-gold-400 font-mono ml-0.5">
                      :{secondsStr}
                    </span>
                  </div>

                  {/* AM/PM and Weekday */}
                  <div className="flex items-center justify-center space-x-2 mt-0.5">
                    <span className="px-2 py-0.5 rounded-md bg-gold-500/25 border border-gold-400/50 text-[11px] sm:text-xs font-mono font-extrabold text-gold-300 shadow-sm">
                      {ampm}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-mono text-white/80 uppercase tracking-widest font-medium">
                      {time.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Sub-label: weather & clock face toggle */}
          <div className="mt-3 relative z-10 flex items-center space-x-2">
            <span className="text-[11px] font-light tracking-[0.25em] text-white/60 lowercase font-mono">
              weather
            </span>
            <button
              type="button"
              onClick={() => fetchWeather(selectedCity.lat, selectedCity.lon)}
              className="text-white/40 hover:text-white transition-colors cursor-pointer"
              title="Refresh weather"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-gold-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => handleSetClockVisualMode(clockVisualMode === 'analog' ? 'digital' : 'analog')}
              className="text-gold-400 hover:text-gold-200 text-[10px] font-mono cursor-pointer ml-1 px-1.5 py-0.5 rounded bg-white/5 border border-gold-500/30"
              title={`Switch to ${clockVisualMode === 'analog' ? 'Digital' : 'Analog'} mode`}
            >
              {clockVisualMode === 'analog' ? '◷ Analog' : '12:00 Dig'}
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('horizontal')}
              className="text-gold-400 hover:text-gold-200 text-[10px] font-mono cursor-pointer ml-1"
              title="Switch to wide horizontal bar"
            >
              ↔ Wide
            </button>
          </div>

          {/* Selected City Name + Change Location Trigger */}
          <div className="relative mt-1 z-20 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              className="group/btn flex items-center space-x-2 text-3xl sm:text-4xl font-light tracking-wide text-white font-sans transition-all cursor-pointer hover:text-gold-200"
              title="Click to change location"
            >
              <span className="truncate max-w-[200px]">{selectedCity.name}</span>
              <ChevronDown className="w-4 h-4 text-gold-400 group-hover/btn:text-white transition-colors shrink-0" />
            </button>

            {/* Change Location Pill Button */}
            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              className="mt-1 flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-gold-500/20 border border-white/15 text-[10px] font-mono text-gold-300 hover:text-gold-200 transition-all cursor-pointer shadow-sm"
            >
              <MapPin className="w-2.5 h-2.5 text-gold-400" />
              <span>Set Location</span>
            </button>
          </div>

          {/* Date: e.g. 30 July */}
          <p className="text-xs text-white/60 font-light mt-1.5 font-sans tracking-wide">
            {formattedDate}
          </p>

          {/* Joined Glass Pill Container (exact match to user image) */}
          <div className="flex items-center justify-center my-4 bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/20 shadow-inner space-x-1">
            {/* Left Pill: Moon / Temp */}
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 text-xs font-mono text-white border border-white/10">
              {weather?.isNight ? (
                <Moon className="w-3.5 h-3.5 text-sky-200" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span className="font-medium tracking-tight">
                {weather ? `${weather.tempC}°C` : '16°C'}
              </span>
            </div>

            {/* Right Pill: Humidity */}
            <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 text-xs font-mono text-white border border-white/10">
              <Droplets className="w-3.5 h-3.5 text-sky-300" />
              <span className="font-medium tracking-tight">
                {weather ? `${weather.humidity}%` : '85%'}
              </span>
            </div>
          </div>

          {/* Wind Speed Row (e.g., 4m/s) */}
          <div className="flex items-center justify-center space-x-2 text-xs font-mono text-white/80">
            <Wind className="w-4 h-4 text-white/60" />
            <span className="tracking-wider">{weather ? `${weather.windSpeedMs}m/s` : '4m/s'}</span>
          </div>

          {/* Production Advice Footer Note */}
          <div className="mt-5 pt-3 border-t border-white/10 text-[10px] text-white/70 font-sans max-w-[260px] leading-snug">
            <span className="text-gold-300 font-mono font-semibold block mb-0.5">
              🎬 Production Status:
            </span>
            {weather?.shootAdvice || '🌲 Misty Ambience • Ideal for Atmospheric Cinematography'}
          </div>

        </div>
      )}

      {/* FULL LOCATION SEARCH & SELECT MODAL */}
      <AnimatePresence>
        {showLocationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="w-full max-w-sm bg-charcoal-950 border border-gold-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-xl bg-gold-500/20 text-gold-400 border border-gold-500/30">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-display uppercase tracking-wider">
                      Set Shoot Location
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono">
                      Search city or select preset location
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Live Search Input Box */}
              <div className="space-y-3 mb-4">
                <label className="block text-[10px] font-mono text-gold-400 uppercase tracking-wider">
                  🔍 Search Any City / Town Worldwide
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Type city name (e.g. Delhi, London, Udaipur)..."
                    value={searchQuery}
                    onChange={(e) => handleSearchCity(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 bg-black/60 border border-luxury-green-800/40 focus:border-gold-500 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
                    autoFocus
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-3 w-4 h-4 text-gold-400 animate-spin" />
                  )}
                </div>

                {searchError && (
                  <p className="text-[10px] text-amber-400 font-mono">{searchError}</p>
                )}

                {/* Search Results Dropdown List */}
                {searchResults.length > 0 && (
                  <div className="bg-black/90 border border-gold-500/30 rounded-2xl overflow-hidden divide-y divide-white/5 max-h-48 overflow-y-auto">
                    {searchResults.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => {
                          const stateCountry = [res.admin1, res.country].filter(Boolean).join(', ');
                          selectCityAndClose({
                            name: res.name,
                            lat: res.latitude,
                            lon: res.longitude,
                            tag: stateCountry || 'Custom City'
                          });
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gold-500/20 text-xs text-white flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div>
                          <span className="font-bold text-white">{res.name}</span>
                          <span className="text-[10px] text-gray-400 block">
                            {[res.admin1, res.country].filter(Boolean).join(', ')}
                          </span>
                        </div>
                        <Check className="w-3.5 h-3.5 text-gold-400 opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* GPS Auto-detect Button */}
              <button
                type="button"
                onClick={handleDetectGPS}
                disabled={gpsLoading}
                className="w-full py-2.5 mb-4 bg-gradient-to-r from-emerald-900/60 via-emerald-800/40 to-emerald-900/60 hover:from-emerald-800 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold font-mono flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                {gpsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                ) : (
                  <Navigation className="w-4 h-4 text-emerald-400" />
                )}
                <span>{gpsLoading ? 'Acquiring GPS Signal...' : 'Use Current Live GPS Location'}</span>
              </button>

              {/* Popular Studio Shoot Presets */}
              <div>
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-2">
                  Popular Studio Shoot Destinations
                </p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {DEFAULT_PRESETS.map((preset) => {
                    const isSelected = selectedCity.name === preset.name;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => selectCityAndClose(preset)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gold-500/20 border-gold-500/60 text-gold-300 font-bold'
                            : 'bg-black/40 border-white/10 text-gray-300 hover:border-gold-500/30 hover:bg-white/5'
                        }`}
                      >
                        <span className="text-xs font-semibold truncate">{preset.name}</span>
                        <span className="text-[8px] font-mono text-gray-500 truncate">{preset.tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MASTER STUDIO CHRONOMETER & HOROLOGY MODAL ================= */}
      <AnimatePresence>
        {showHorologyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-gradient-to-b from-[#181614] to-[#0c0a09] border-2 border-gold-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative overflow-hidden"
            >
              {/* Luxury gold glow top halo */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-gold-500/20 pb-4 mb-6">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gold-500/20 border border-gold-400/40 flex items-center justify-center text-gold-300 shadow-inner">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">
                      Master Studio Chronometer
                    </h3>
                    <p className="text-[10px] sm:text-[11px] font-mono text-gold-400/80">
                      Cloud Firestore TrueTime Horology & Workstation Sync
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowHorologyModal(false)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Center Watchmaker Dial Display */}
              <div className="flex flex-col items-center justify-center py-3">
                <div className="relative p-2 rounded-full bg-black/40 border border-gold-500/20 shadow-[0_10px_30px_rgba(0,0,0,0.9)]">
                  <LuxuryAnalogClock 
                    time={displayTime} 
                    size={280} 
                    isSynced={isSynced} 
                    isSyncing={isSyncing} 
                    isGlowing={hasActiveGlow}
                    activeAlarmTitle={activeTriggeredAlarms[0]?.projectTitle}
                    alarmMarkers={alarmMarkers}
                    showDateWindow={true}
                    showSeconds={true}
                  />
                </div>

                {/* Digital Precision Readout underneath dial */}
                <div className="flex items-baseline space-x-2 mt-4 font-mono">
                  <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                    {hoursStr}:{minutesStr}
                  </span>
                  <span className="text-base sm:text-lg font-bold text-gold-400">
                    :{secondsStr}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gold-500/20 border border-gold-400/40 text-[11px] font-extrabold text-gold-300">
                    {ampm}
                  </span>
                  <span className="text-xs text-gold-300/90 font-bold ml-1">
                    ({activeTimezone.code} · {activeTimezone.offset})
                  </span>
                </div>

                <div className="text-xs font-mono text-zinc-300 mt-1">
                  {formattedDate} • {displayTime.toLocaleDateString('en-US', { weekday: 'long' })}
                </div>

                {/* Deadline Alarms Quick Access Pill inside modal */}
                <div className="mt-3 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAlarmsModal(true)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      hasActiveGlow
                        ? 'bg-amber-500/30 border-amber-300 text-amber-200 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                        : 'bg-gold-500/15 hover:bg-gold-500/25 border-gold-400/40 text-gold-300'
                    }`}
                  >
                    <BellRing className={`w-3.5 h-3.5 ${hasActiveGlow ? 'animate-bounce text-amber-300' : 'text-gold-400'}`} />
                    <span>
                      {hasActiveGlow 
                        ? `Visual Alarm Reached: ${activeTriggeredAlarms[0]?.projectTitle}` 
                        : `Manage Deadline Visual Alarms (${alarms.filter(a => a.enabled).length} Armed)`}
                    </span>
                  </button>
                  {hasActiveGlow && activeTriggeredAlarms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => dismissAlarm(activeTriggeredAlarms[0]?.id)}
                      className="px-2 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-[11px] font-mono text-zinc-200 cursor-pointer"
                    >
                      Dismiss Glow
                    </button>
                  )}
                </div>
              </div>

              {/* GLOBAL REMOTE EDITORS & CLIENT SYNC MATRIX */}
              <div className="my-4 p-3.5 rounded-2xl bg-black/60 border border-gold-500/25 shadow-inner">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-gold-300">
                    <Globe className="w-3.5 h-3.5 text-gold-400" />
                    <span>Global Remote Editors & Client Sync Radar</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Click card to calibrate dial
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {SUPPORTED_TIMEZONES.map((tz) => {
                    const zDate = getZonedDate(time, tz.timeZone);
                    const isSelected = tz.code === activeTimezone.code;
                    const hoursZ = zDate.getHours();
                    const isNight = hoursZ < 7 || hoursZ >= 20;

                    return (
                      <button
                        key={tz.code}
                        type="button"
                        onClick={() => handleSelectTimezone(tz.code)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-gold-500/20 border-gold-400/80 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                            : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base">{tz.flag}</span>
                            <span className="text-xs font-mono font-bold text-white">
                              {tz.code}
                            </span>
                            {isSelected && (
                              <span className="text-[9px] font-mono font-extrabold text-gold-400">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                            isNight ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {isNight ? '🌙 Night' : '☀️ Day'}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between mt-2 font-mono">
                          <span className="text-sm font-bold text-gold-200">
                            {zDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                          </span>
                          <span className="text-[9px] text-zinc-400">
                            {tz.offset}
                          </span>
                        </div>

                        <div className="text-[9px] text-zinc-400 font-mono mt-0.5 truncate">
                          {tz.name} · {tz.region}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Realtime Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2.5 my-5">
                <div className="p-3 rounded-2xl bg-black/50 border border-white/10">
                  <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">
                    Workstation Drift Offset
                  </div>
                  <div className="flex items-baseline space-x-1 mt-0.5">
                    <span className={`text-base font-bold font-mono ${Math.abs(offsetMs) < 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {offsetMs >= 0 ? '+' : ''}{offsetMs} ms
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">from TrueTime</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-black/50 border border-white/10">
                  <div className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">
                    Round-Trip Network Ping
                  </div>
                  <div className="flex items-baseline space-x-1 mt-0.5">
                    <span className="text-base font-bold font-mono text-sky-400">
                      {latencyMs} ms
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">latency</span>
                  </div>
                </div>
              </div>

              {/* Calibration Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => syncNow()}
                  disabled={isSyncing}
                  className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-gold-500/30 via-gold-400/20 to-amber-500/30 hover:from-gold-500/40 hover:to-amber-500/40 border border-gold-400/60 text-gold-200 text-xs font-mono font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg"
                >
                  <Radio className={`w-3.5 h-3.5 text-gold-300 ${isSyncing ? 'animate-spin' : 'animate-pulse'}`} />
                  <span>{isSyncing ? 'Calibrating...' : 'Force Atomic Sync'}</span>
                </button>

                <div className="w-full sm:w-1/2 flex items-center p-1 rounded-xl bg-black/60 border border-white/10 gap-1">
                  <button
                    type="button"
                    onClick={() => handleSetClockVisualMode('analog')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                      clockVisualMode === 'analog'
                        ? 'bg-gold-500/30 text-gold-200 border border-gold-400/40'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Compass className="w-3 h-3" />
                    <span>Analog</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetClockVisualMode('digital')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                      clockVisualMode === 'digital'
                        ? 'bg-gold-500/30 text-gold-200 border border-gold-400/40'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Digital</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetClockVisualMode('dual')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer ${
                      clockVisualMode === 'dual'
                        ? 'bg-gold-500/30 text-gold-200 border border-gold-400/40'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Watch className="w-3 h-3" />
                    <span>Dual</span>
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= PROJECT DEADLINE VISUAL ALARMS MODAL ================= */}
      <DeadlineAlarmsModal
        isOpen={showAlarmsModal}
        onClose={() => setShowAlarmsModal(false)}
        currentTime={time}
        alarms={alarms}
        activeTriggeredAlarms={activeTriggeredAlarms}
        projects={projects}
        onAddAlarm={addAlarm}
        onToggleAlarm={toggleAlarm}
        onRemoveAlarm={removeAlarm}
        onDismissAlarm={dismissAlarm}
        onDismissAllTriggered={dismissAllTriggered}
        onSnoozeAlarm={snoozeAlarm}
        onTriggerTestAlarm={triggerTestAlarm}
      />
    </div>
  );
}
