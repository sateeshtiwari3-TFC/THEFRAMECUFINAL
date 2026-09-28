import React, { useState, useRef } from "react";
import { 
  Music, 
  Play, 
  Pause, 
  Download, 
  Sparkles, 
  Volume2, 
  Upload, 
  X, 
  Clock, 
  Check, 
  Disc3, 
  Radio, 
  Waves
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GeneratedTrack {
  id: string;
  title: string;
  prompt: string;
  model: string;
  audioUrl: string;
  lyrics?: string;
  timestamp: Date;
  durationLabel: string;
}

export const LyriaMusicStudio: React.FC = () => {
  const [model, setModel] = useState<"lyria-3-clip-preview" | "lyria-3-pro-preview">("lyria-3-clip-preview");
  const [prompt, setPrompt] = useState("");
  const [imageInspiration, setImageInspiration] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio player state
  const [tracks, setTracks] = useState<GeneratedTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<GeneratedTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const PRESETS = [
    {
      title: "Royal Rajasthani Pheras",
      prompt: "Majestic Shehnai, sitar melodies, and acoustic tabla rhythm with a regal, sacred temple ambiance (BPM 82)."
    },
    {
      title: "Emotional Bridal Entry",
      prompt: "Gentle acoustic strings, emotional piano chords, and soft Sufi vocal chants for a slow-motion bridal entry (BPM 76)."
    },
    {
      title: "High-Energy Sangeet Drop",
      prompt: "Explosive modern Punjabi dhol beats, contemporary EDM bassline, and euphoric celebration synths (BPM 128)."
    },
    {
      title: "Cinematic Romantic Teaser",
      prompt: "Atmospheric acoustic guitar, sweeping orchestral violin crescendos, and romantic cinematic trailer percussion (BPM 92)."
    }
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageInspiration(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateMusic = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/gemini/music/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          imageBase64: imageInspiration || undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate track from Lyria.");
      }

      if (!data.audioBase64) {
        throw new Error("No audio stream received from Lyria.");
      }

      // Convert base64 audio to Blob URL
      const byteCharacters = atob(data.audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: data.mimeType || "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const newTrack: GeneratedTrack = {
        id: `track-${Date.now()}`,
        title: prompt.slice(0, 38) + (prompt.length > 38 ? "..." : ""),
        prompt: prompt.trim(),
        model: data.model || model,
        audioUrl,
        lyrics: data.lyrics,
        timestamp: new Date(),
        durationLabel: model === "lyria-3-clip-preview" ? "Clip (30s)" : "Full Track"
      };

      setTracks(prev => [newTrack, ...prev]);
      setActiveTrack(newTrack);
      setIsPlaying(true);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to create music track.");
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !activeTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="bg-charcoal-900/90 border border-luxury-green-800/40 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
      {/* Audio Element Hidden */}
      {activeTrack && (
        <audio
          ref={audioRef}
          src={activeTrack.audioUrl}
          autoPlay
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-luxury-green-800/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 shadow-md">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-white tracking-wide">
              Lyria AI Music Composer
            </h2>
            <p className="text-xs text-gray-400">
              Generate bespoke wedding soundtracks and cinematic scores using Lyria 3
            </p>
          </div>
        </div>

        {/* Model Switcher */}
        <div className="flex bg-charcoal-950 border border-luxury-green-800/30 rounded-xl p-1 text-xs">
          <button
            onClick={() => setModel("lyria-3-clip-preview")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              model === "lyria-3-clip-preview"
                ? "bg-luxury-green-800 text-gold-300 font-semibold shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            lyria-3-clip-preview (30s)
          </button>
          <button
            onClick={() => setModel("lyria-3-pro-preview")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              model === "lyria-3-pro-preview"
                ? "bg-luxury-green-800 text-gold-300 font-semibold shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            lyria-3-pro-preview (Full Track)
          </button>
        </div>
      </div>

      {/* Presets */}
      <div>
        <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Cinematic Wedding Presets:</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-2">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(p.prompt)}
              className="text-left p-3 rounded-xl bg-charcoal-950/70 hover:bg-luxury-green-950 border border-luxury-green-800/20 hover:border-gold-500/40 transition-all group"
            >
              <div className="flex items-center justify-between text-xs font-semibold text-gray-200 group-hover:text-gold-300 mb-1">
                <span>{p.title}</span>
                <Sparkles className="w-3 h-3 text-gold-400 opacity-60 group-hover:opacity-100" />
              </div>
              <p className="text-[10px] text-gray-400 line-clamp-2">{p.prompt}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Composition Prompt & Optional Image Inspiration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <label className="text-xs text-gray-300 font-medium">Musical Style & Instrument Description</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="e.g. Royal Shehnai and acoustic indie ballad fusion for grand bridal varmala entry, 90 BPM with sweeping strings and emotional drop..."
            className="w-full bg-charcoal-950 border border-luxury-green-800/40 focus:border-gold-500 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 outline-none transition-all shadow-inner resize-none"
          />
        </div>

        {/* Visual Inspiration Upload */}
        <div className="space-y-2">
          <label className="text-xs text-gray-300 font-medium flex items-center justify-between">
            <span>Visual Inspiration (Optional)</span>
            {imageInspiration && (
              <button
                onClick={() => setImageInspiration(null)}
                className="text-[10px] text-rose-400 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Remove
              </button>
            )}
          </label>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {imageInspiration ? (
            <div className="relative h-28 rounded-xl overflow-hidden border border-gold-500/30 group">
              <img src={imageInspiration} alt="Inspiration" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-charcoal-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1 rounded-lg bg-luxury-green-800 text-xs text-white"
                >
                  Change Image
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-28 rounded-xl border border-dashed border-luxury-green-800/50 hover:border-gold-500/50 bg-charcoal-950/50 flex flex-col items-center justify-center text-gray-400 hover:text-gold-300 transition-all gap-1.5"
            >
              <Upload className="w-5 h-5 text-gold-400" />
              <span className="text-[11px]">Upload wedding photo for vibe sync</span>
            </button>
          )}
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-[11px] text-gray-400 font-mono">
          Powered by: <span className="text-gold-400 font-semibold">{model}</span>
        </div>

        <button
          onClick={handleGenerateMusic}
          disabled={!prompt.trim() || loading}
          className={`px-6 py-2.5 rounded-xl font-medium text-xs transition-all flex items-center gap-2 ${
            prompt.trim() && !loading
              ? "bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 hover:brightness-110 shadow-lg cursor-pointer font-semibold"
              : "bg-charcoal-950 border border-luxury-green-800/30 text-gray-500 cursor-not-allowed"
          }`}
        >
          {loading ? (
            <>
              <Disc3 className="w-4 h-4 animate-spin text-charcoal-950" />
              <span>Generating Audio Stream...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-charcoal-950" />
              <span>Generate Music</span>
            </>
          )}
        </button>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Active Audio Player */}
      {activeTrack && (
        <div className="p-4 rounded-xl bg-charcoal-950 border border-gold-500/30 shadow-xl space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-gold-500 hover:bg-gold-400 text-charcoal-950 flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-charcoal-950" /> : <Play className="w-5 h-5 fill-charcoal-950 ml-0.5" />}
              </button>
              <div>
                <h4 className="text-xs font-bold text-white">{activeTrack.title}</h4>
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                  <span className="text-gold-400 font-semibold">{activeTrack.model}</span>
                  <span>•</span>
                  <span>{activeTrack.durationLabel}</span>
                </div>
              </div>
            </div>

            <a
              href={activeTrack.audioUrl}
              download={`${activeTrack.title.replace(/[^a-zA-Z0-9]/g, "_")}.wav`}
              className="p-2 rounded-lg bg-luxury-green-950 hover:bg-luxury-green-900 border border-luxury-green-800/40 text-gold-300 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download WAV</span>
            </a>
          </div>

          {/* Scrubber */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-400 font-mono w-8">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 30}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-gold-500 h-1.5 bg-luxury-green-950 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] text-gray-400 font-mono w-8">{formatTime(duration)}</span>
          </div>

          {activeTrack.lyrics && (
            <div className="p-2.5 rounded-lg bg-charcoal-900/60 border border-luxury-green-800/20 text-[11px] text-gray-300">
              <span className="text-[10px] text-gold-400 font-mono uppercase block mb-1">Generated Cue Notes / Lyrics:</span>
              <p className="italic">{activeTrack.lyrics}</p>
            </div>
          )}
        </div>
      )}

      {/* Generated Tracks List */}
      {tracks.length > 1 && (
        <div className="space-y-2 pt-2">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Recent Generated Tracks ({tracks.length}):</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tracks.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setActiveTrack(t);
                  setIsPlaying(true);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                  activeTrack?.id === t.id
                    ? "bg-luxury-green-950/70 border-gold-500/40 text-gold-300"
                    : "bg-charcoal-950/60 border-luxury-green-800/20 text-gray-300 hover:bg-charcoal-950"
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Waves className="w-4 h-4 text-gold-400 shrink-0" />
                  <span className="text-xs truncate">{t.title}</span>
                </div>
                <span className="text-[10px] font-mono text-gray-400 shrink-0">{t.durationLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
