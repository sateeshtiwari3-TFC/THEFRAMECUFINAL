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
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFirestoreServerTime } from '../hooks/useFirestoreServerTime';
import LuxuryAnalogClock from './common/LuxuryAnalogClock';
import { useDeadlineAlarms } from '../hooks/useDeadlineAlarms';
import DeadlineAlarmsModal from './common/DeadlineAlarmsModal';
import { Project } from '../types';

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

  // Alternative Clock Visual: 'analog' luxury rotating circular face vs 'digital'
  const [clockVisualMode, setClockVisualMode] = useState<'analog' | 'digital'>(() => {
    try {
      return (localStorage.getItem('framecut_clock_visual_mode') as 'analog' | 'digital') || 'analog';
    } catch {
      return 'analog';
    }
  });
  const [showHorologyModal, setShowHorologyModal] = useState<boolean>(false);

  const handleSetClockVisualMode = (mode: 'analog' | 'digital') => {
    setClockVisualMode(mode);
    try {
      localStorage.setItem('framecut_clock_visual_mode', mode);
    } catch (e) {
      console.error(e);
    }
  };
  
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

  const formattedDate = time.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long'
  });

  const formattedTime = time.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const hoursRaw = time.getHours();
  const hours12 = hoursRaw % 12 || 12;
  const hoursStr = String(hours12).padStart(2, '0');
  const minutesStr = String(time.getMinutes()).padStart(2, '0');
  const secondsStr = String(time.getSeconds()).padStart(2, '0');
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

  return (
    <div className={`w-full ${layoutMode === 'vertical' ? 'max-w-[320px] sm:max-w-[360px]' : 'max-w-3xl sm:max-w-4xl'} mx-auto select-none relative transition-all duration-300`}>
      {/* HORIZONTAL WIDE DASHBOARD STUDIO CHRONOMETER & WEATHER BAR */}
      {layoutMode === 'horizontal' ? (
        <div className="rounded-2xl sm:rounded-3xl bg-charcoal-900/90 backdrop-blur-2xl border border-gold-500/30 p-3 sm:p-4 shadow-[0_15px_35px_rgba(0,0,0,0.7)] relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-3.5 sm:gap-5 group hover:border-gold-400/50 transition-all duration-300 w-full min-w-0">
          {/* Subtle warm amber ambient banner highlight */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold-400/40 to-transparent pointer-events-none" />

          {/* SECTION 1: MASTER REALTIME CLOCK (ANALOG ROTATING LUXURY FACE OR DIGITAL) */}
          <div className="flex items-center space-x-3 sm:space-x-4 shrink-0 min-w-0 w-full sm:w-auto justify-center sm:justify-start">
            {clockVisualMode === 'analog' ? (
              /* LUXURY ROTATING ANALOG WATCH VISUALIZATION */
              <>
                <LuxuryAnalogClock 
                  time={time} 
                  size={analogDialDiameter} 
                  isSynced={isSynced} 
                  isSyncing={isSyncing} 
                  isGlowing={hasActiveGlow}
                  activeAlarmTitle={activeTriggeredAlarms[0]?.projectTitle}
                  alarmMarkers={alarmMarkers}
                  onClick={() => setShowHorologyModal(true)} 
                />

                <div className="flex flex-col min-w-0 justify-center">
                  {/* Digital Counterpart & Inspect Button */}
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      {hoursStr}:{minutesStr}
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-gold-400">
                      :{secondsStr}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-gold-500/20 border border-gold-400/40 text-[9px] sm:text-[10px] font-mono font-extrabold text-gold-300">
                      {ampm}
                    </span>

                    {/* Inspect Watchmaker Dial Modal Button */}
                    <button
                      type="button"
                      onClick={() => setShowHorologyModal(true)}
                      className="p-1 rounded-md bg-white/5 hover:bg-gold-500/20 text-zinc-400 hover:text-gold-300 transition-colors border border-white/10 ml-1 cursor-pointer"
                      title="Inspect Luxury Studio Chronometer in Detail"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Full Date String & Firestore Server Sync Indicator */}
                  <div className="flex items-center space-x-2 text-[10px] sm:text-[11px] font-mono text-zinc-300 font-medium truncate mt-0.5">
                    <span className="shrink-0">{formattedDate}</span>
                    <span className="text-zinc-600 shrink-0">•</span>
                    <button
                      type="button"
                      onClick={() => syncNow()}
                      className="text-[9px] text-emerald-400/90 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer transition-colors shrink-0"
                      title={`Firestore Server TrueTime Synced across studio workstations (Offset: ${offsetMs >= 0 ? '+' : ''}${offsetMs}ms, Ping: ${latencyMs}ms). Click to calibrate now.`}
                    >
                      <Radio className={`w-2.5 h-2.5 text-emerald-400 shrink-0 ${isSyncing ? 'animate-spin' : 'animate-pulse'}`} />
                      <span className="truncate">
                        {isSyncing ? 'Syncing...' : isSynced ? 'TrueTime Synced' : 'Sync Server'}
                      </span>
                    </button>
                  </div>

                  {/* Segmented Mode Switcher & Deadline Alarms Button */}
                  <div className="flex items-center space-x-1 mt-1.5 flex-wrap gap-y-1">
                    <button
                      type="button"
                      onClick={() => handleSetClockVisualMode('analog')}
                      className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-gradient-to-r from-gold-500/30 to-amber-500/20 border border-gold-400/60 text-gold-300 shadow-sm flex items-center space-x-1 cursor-pointer"
                      title="Active: Luxury Rotating Analog Dial"
                    >
                      <Compass className="w-2.5 h-2.5 text-gold-400" />
                      <span>Analog</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetClockVisualMode('digital')}
                      className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10 border border-transparent flex items-center space-x-1 transition-all cursor-pointer"
                      title="Switch to Large Digital Display"
                    >
                      <Clock className="w-2.5 h-2.5 text-zinc-400" />
                      <span>Digital</span>
                    </button>

                    {/* Clock Dial Size Toggle (Bada / Giant / Standard) */}
                    <button
                      type="button"
                      onClick={() => handleSetClockScale(analogClockScale === 'standard' ? 'large' : analogClockScale === 'large' ? 'giant' : 'standard')}
                      className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-gold-500/15 hover:bg-gold-500/25 border border-gold-400/40 text-gold-300 flex items-center space-x-1 cursor-pointer transition-all"
                      title={`Clock Size: Standard (96px), Large (122px), Giant (144px). Currently: ${analogClockScale}. Click to cycle.`}
                    >
                      <Maximize2 className="w-2.5 h-2.5 text-gold-400" />
                      <span>{analogClockScale === 'giant' ? 'Bada+' : analogClockScale === 'large' ? 'Bada' : 'Std'}</span>
                    </button>

                    {/* Deadline Visual Alarms Configuration Button */}
                    <button
                      type="button"
                      onClick={() => setShowAlarmsModal(true)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold flex items-center space-x-1 transition-all cursor-pointer ${
                        hasActiveGlow
                          ? 'bg-amber-500/35 border border-amber-300 text-amber-200 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                          : alarms.filter((a) => a.enabled).length > 0
                          ? 'bg-gold-500/15 border border-gold-400/40 text-gold-300 hover:bg-gold-500/25'
                          : 'text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                      title="Set visual alarms for project deadlines that glow on the analog clock face"
                    >
                      <BellRing className={`w-2.5 h-2.5 ${hasActiveGlow ? 'text-amber-300 animate-bounce' : 'text-gold-400'}`} />
                      <span>
                        {hasActiveGlow 
                          ? `Glow Active (${activeTriggeredAlarms.length})` 
                          : `Alarms (${alarms.filter((a) => a.enabled).length})`}
                      </span>
                    </button>
                  </div>

                  {/* Active Deadline Alarm Warning Banner with Instant Dismiss */}
                  {hasActiveGlow && activeTriggeredAlarms.length > 0 && (
                    <div className="flex items-center space-x-1.5 mt-1.5 px-2 py-0.5 rounded-lg bg-amber-500/25 border border-amber-400/60 text-[9px] font-mono text-amber-200 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                      <span className="truncate max-w-[130px] sm:max-w-[170px] font-bold">
                        ⚠️ {activeTriggeredAlarms[0]?.projectTitle}
                      </span>
                      <button
                        type="button"
                        onClick={() => dismissAlarm(activeTriggeredAlarms[0]?.id)}
                        className="ml-auto underline text-gold-300 hover:text-white shrink-0 cursor-pointer text-[8px]"
                        title="Dismiss clock face glow"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* HIGH-CONTRAST DIGITAL CLOCK VISUALIZATION */
              <>
                {/* Clock Icon Capsule */}
                <button
                  type="button"
                  onClick={() => setShowHorologyModal(true)}
                  title="Master Studio Chronometer. Click to inspect analog dial & server sync."
                  className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-gold-500/20 to-amber-500/10 border border-gold-500/30 hover:border-gold-400/60 flex flex-col items-center justify-center text-gold-400 shrink-0 shadow-inner transition-all cursor-pointer group/clockbtn"
                >
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-gold-400 group-hover/clockbtn:scale-110 transition-transform" />
                  <div className="flex items-center space-x-1 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-400 animate-spin' : isSynced ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'}`} />
                    <span className="text-[7px] sm:text-[8px] font-mono font-bold text-emerald-300">
                      {isSyncing ? 'SYNC' : isSynced ? 'TRUE-T' : 'LIVE'}
                    </span>
                  </div>
                </button>

                {/* Main Digital Time Numbers */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-baseline space-x-1">
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
                      {hoursStr}:{minutesStr}
                    </span>
                    <span className="text-sm sm:text-base font-bold font-mono text-gold-400">
                      :{secondsStr}
                    </span>
                    <span className="ml-1.5 px-2 py-0.5 rounded-md bg-gold-500/20 border border-gold-400/40 text-[10px] sm:text-xs font-mono font-extrabold text-gold-300">
                      {ampm}
                    </span>
                  </div>

                  {/* Full Date String & Firestore Server Sync Indicator */}
                  <div className="flex items-center space-x-2 text-[11px] sm:text-xs font-mono text-zinc-300 font-medium truncate mt-0.5">
                    <span className="shrink-0">{formattedDate}</span>
                    <span className="text-zinc-600 shrink-0">•</span>
                    <button
                      type="button"
                      onClick={() => syncNow()}
                      className="text-[9px] text-emerald-400/90 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer transition-colors shrink-0"
                      title={`Firestore Server TrueTime Synced across studio workstations (Offset: ${offsetMs >= 0 ? '+' : ''}${offsetMs}ms, Ping: ${latencyMs}ms). Click to calibrate now.`}
                    >
                      <Radio className={`w-2.5 h-2.5 text-emerald-400 shrink-0 ${isSyncing ? 'animate-spin' : 'animate-pulse'}`} />
                      <span className="truncate">
                        {isSyncing ? 'Syncing Server...' : isSynced ? 'Cloud Synced' : 'Sync Server'}
                      </span>
                    </button>
                  </div>

                  {/* Segmented Mode Switcher */}
                  <div className="flex items-center space-x-1 mt-1.5">
                    <button
                      type="button"
                      onClick={() => handleSetClockVisualMode('analog')}
                      className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold text-zinc-400 hover:text-zinc-200 bg-white/5 hover:bg-white/10 border border-transparent flex items-center space-x-1 transition-all cursor-pointer"
                      title="Switch to Luxury Rotating Analog Dial"
                    >
                      <Compass className="w-2.5 h-2.5 text-gold-400" />
                      <span>Analog</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetClockVisualMode('digital')}
                      className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-gradient-to-r from-gold-500/30 to-amber-500/20 border border-gold-400/60 text-gold-300 shadow-sm flex items-center space-x-1 cursor-pointer"
                      title="Active: Digital Clock"
                    >
                      <Clock className="w-2.5 h-2.5 text-gold-400" />
                      <span>Digital</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Divider on tablet/desktop */}
          <div className="hidden sm:block h-12 w-px bg-white/10 shrink-0" />

          {/* SECTION 2: STUDIO SHOOT LOCATION & WEATHER CAPSULE */}
          <div className="flex flex-col sm:items-end space-y-1.5 min-w-0 w-full sm:w-auto">
            {/* Top row: City Name & Change Button + Refresh */}
            <div className="flex items-center justify-between sm:justify-end space-x-2 w-full">
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="flex items-center space-x-1 text-xs sm:text-sm font-bold text-white hover:text-gold-300 transition-colors cursor-pointer group/btn"
                title="Change shoot location"
              >
                <MapPin className="w-3.5 h-3.5 text-gold-400 shrink-0 group-hover/btn:scale-110 transition-transform" />
                <span className="truncate max-w-[130px] sm:max-w-[170px]">{selectedCity.name}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => fetchWeather(selectedCity.lat, selectedCity.lon)}
                className="p-1 sm:p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-white/10 shrink-0"
                title="Refresh live weather"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-gold-400' : ''}`} />
              </button>
            </div>

            {/* Middle row: Weather metric pills */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-[11px] font-mono">
              <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-black/50 text-white border border-white/10 shrink-0">
                {weather?.isNight ? <Moon className="w-3 h-3 text-sky-200" /> : <Sun className="w-3 h-3 text-amber-300" />}
                <span className="font-bold">{weather ? `${weather.tempC}°C` : '24°C'}</span>
              </div>

              <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-black/50 text-white border border-white/10 shrink-0">
                <Droplets className="w-3 h-3 text-sky-300" />
                <span className="font-bold">{weather ? `${weather.humidity}%` : '65%'}</span>
              </div>

              <div className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-black/50 text-white border border-white/10 shrink-0">
                <Wind className="w-3 h-3 text-emerald-300" />
                <span className="font-bold">{weather ? `${weather.windSpeedMs}m/s` : '3m/s'}</span>
              </div>
            </div>

            {/* Bottom row: Shoot condition advice */}
            <div className="text-[10px] text-gold-300/90 font-mono truncate max-w-[240px] sm:max-w-[280px] text-left sm:text-right">
              🎬 {weather?.shootAdvice || 'Optimal Natural Light for Outdoor Shoots'}
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
                    time={time} 
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
                  <span className="text-xs text-zinc-400 ml-1">
                    ({time.toISOString().substring(11, 19)} UTC)
                  </span>
                </div>

                <div className="text-xs font-mono text-zinc-300 mt-1">
                  {formattedDate} • {time.toLocaleDateString('en-US', { weekday: 'long' })}
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

                <div className="w-full sm:w-1/2 flex items-center p-1 rounded-xl bg-black/60 border border-white/10">
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
