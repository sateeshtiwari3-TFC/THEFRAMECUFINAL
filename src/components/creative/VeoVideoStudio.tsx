import React, { useState, useRef, useEffect } from "react";
import { 
  Film, 
  Video, 
  Upload, 
  Play, 
  Sparkles, 
  Download, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Sliders, 
  Layers
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GeneratedVideo {
  id: string;
  title: string;
  prompt: string;
  videoUrl: string;
  aspectRatio: "16:9" | "9:16";
  resolution: string;
  sourceImage?: string;
  timestamp: Date;
}

export const VeoVideoStudio: React.FC = () => {
  const [mode, setMode] = useState<"animate_image" | "text_to_video">("animate_image");
  const [prompt, setPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [resolution, setResolution] = useState<"720p" | "1080p">("720p");

  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState("Initializing Veo 3 engine...");
  const [pollOperationName, setPollOperationName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [activeVideo, setActiveVideo] = useState<GeneratedVideo | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const VIDEO_PRESETS = [
    {
      title: "Golden Hour Petal Shower",
      prompt: "Cinematic slow motion shot of a newly married Indian couple walking under a shower of marigold and rose petals during golden hour with warm anamorphic lens flare."
    },
    {
      title: "Royal Palace Courtyard Drone",
      prompt: "Majestic high-altitude drone orbit revealing a heritage Rajasthani palace courtyard lit with thousands of traditional diyas and chandeliers at twilight."
    },
    {
      title: "Sparkler Tunnel Night Send-Off",
      prompt: "Joyful wedding send-off where the bride and groom run through an arch of glowing handheld sparklers with soft bokeh and celebratory laughter."
    },
    {
      title: "Slow-Motion Sacred Vows",
      prompt: "Intimate close-up emotional video of bride and groom exchanging smiles near the sacred wedding fire, soft warm glow illuminating their eyes."
    }
  ];

  const LOADING_MESSAGES = [
    "Initializing Veo 3 neural diffusion engine...",
    "Computing temporal consistency and motion vectors...",
    "Rendering cinematic 24fps video frames...",
    "Applying high-definition color grading...",
    "Finalizing MP4 media stream..."
  ];

  useEffect(() => {
    let msgIdx = 0;
    let interval: any = null;
    if (loading) {
      interval = setInterval(() => {
        msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
        setLoadingPhase(LOADING_MESSAGES[msgIdx]);
      }, 7000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loading]);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartGeneration = async () => {
    if (mode === "animate_image" && !uploadedImage) {
      setErrorMessage("Please upload an image to animate.");
      return;
    }
    if (mode === "text_to_video" && !prompt.trim()) {
      setErrorMessage("Please enter a video prompt description.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setLoadingPhase("Submitting video generation to Veo 3...");

    try {
      const res = await fetch("/api/gemini/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim() || undefined,
          imageBase64: uploadedImage || undefined,
          aspectRatio,
          resolution
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate video generation.");
      }

      const operationName = data.operationName;
      setPollOperationName(operationName);

      // Start polling status
      pollVideoStatus(operationName);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to start Veo video generation.");
      setLoading(false);
    }
  };

  const pollVideoStatus = (operationName: string) => {
    let pollCount = 0;
    const maxPolls = 60; // 5 minutes max

    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      pollCount++;
      try {
        const res = await fetch("/api/gemini/video/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName })
        });

        const statusData = await res.json();

        if (statusData.error) {
          clearInterval(pollIntervalRef.current!);
          setLoading(false);
          setErrorMessage(`Video generation error: ${statusData.error.message || JSON.stringify(statusData.error)}`);
          return;
        }

        if (statusData.done) {
          clearInterval(pollIntervalRef.current!);
          setLoadingPhase("Downloading finalized video from server...");
          await downloadGeneratedVideo(operationName);
        } else if (pollCount >= maxPolls) {
          clearInterval(pollIntervalRef.current!);
          setLoading(false);
          setErrorMessage("Video generation timed out. Please try again.");
        }
      } catch (err: any) {
        console.error("Polling error:", err);
      }
    }, 5000);
  };

  const downloadGeneratedVideo = async (operationName: string) => {
    try {
      const res = await fetch("/api/gemini/video/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationName })
      });

      if (!res.ok) {
        throw new Error("Failed to download generated video stream.");
      }

      const blob = await res.blob();
      const videoUrl = URL.createObjectURL(blob);

      const newVideo: GeneratedVideo = {
        id: `veo-${Date.now()}`,
        title: prompt ? prompt.slice(0, 36) + "..." : "Animated Wedding Visual",
        prompt: prompt || "Animated photograph with Veo 3",
        videoUrl,
        aspectRatio,
        resolution,
        sourceImage: uploadedImage || undefined,
        timestamp: new Date()
      };

      setVideos(prev => [newVideo, ...prev]);
      setActiveVideo(newVideo);
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to download generated video.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-charcoal-900/90 border border-luxury-green-800/40 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-luxury-green-800/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 shadow-md">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-white tracking-wide">
              Veo 3 Cinema Video Studio
            </h2>
            <p className="text-xs text-gray-400">
              Generate & animate photorealistic wedding video clips using <span className="text-gold-400 font-mono">veo-3.1-fast-generate-preview</span>
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-charcoal-950 border border-luxury-green-800/30 rounded-xl p-1 text-xs">
          <button
            onClick={() => setMode("animate_image")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === "animate_image"
                ? "bg-luxury-green-800 text-gold-300 font-semibold shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            📸 Animate Photo into Video
          </button>
          <button
            onClick={() => setMode("text_to_video")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === "text_to_video"
                ? "bg-luxury-green-800 text-gold-300 font-semibold shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            ✨ Text to Video
          </button>
        </div>
      </div>

      {/* Preset Prompts */}
      <div>
        <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Cinematic Wedding Shot Presets:</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-2">
          {VIDEO_PRESETS.map((p, idx) => (
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

      {/* Controls & Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Image Upload (if Animate Image) or Prompt Description */}
        <div className="lg:col-span-2 space-y-4">
          {mode === "animate_image" && (
            <div className="space-y-2">
              <label className="text-xs text-gray-300 font-medium flex items-center justify-between">
                <span>Upload Wedding Photo to Animate</span>
                {uploadedImage && (
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="text-[10px] text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove Photo
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

              {uploadedImage ? (
                <div className="relative h-56 rounded-2xl overflow-hidden border border-gold-500/30 group">
                  <img src={uploadedImage} alt="Uploaded for animation" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-charcoal-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-lg bg-luxury-green-800 hover:bg-luxury-green-700 text-xs text-white"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-44 rounded-2xl border-2 border-dashed border-luxury-green-800/50 hover:border-gold-500/50 bg-charcoal-950/50 flex flex-col items-center justify-center text-gray-400 hover:text-gold-300 transition-all gap-2"
                >
                  <Upload className="w-6 h-6 text-gold-400" />
                  <span className="text-xs font-medium">Click to upload wedding portrait or ceremony photo</span>
                  <span className="text-[10px] text-gray-500">JPG, PNG, WEBP up to 10MB</span>
                </button>
              )}
            </div>
          )}

          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-xs text-gray-300 font-medium">
              {mode === "animate_image" ? "Animation Motion Directions (Optional)" : "Video Scene Description"}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={
                mode === "animate_image"
                  ? "e.g. Gentle wind blowing the veil, couple turns head slowly with smiling eyes, golden confetti floating by..."
                  : "e.g. Cinematic slow motion shot of couple walking into palace courtyard, 24fps, golden hour sunlight..."
              }
              className="w-full bg-charcoal-950 border border-luxury-green-800/40 focus:border-gold-500 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 outline-none transition-all shadow-inner resize-none"
            />
          </div>
        </div>

        {/* Right Column: Settings (Aspect Ratio & Resolution) */}
        <div className="space-y-4 bg-charcoal-950/70 border border-luxury-green-800/30 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-gold-400" />
            <span>Output Specifications</span>
          </h3>

          {/* Aspect Ratio Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-gray-400">Aspect Ratio</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio("16:9")}
                className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                  aspectRatio === "16:9"
                    ? "bg-luxury-green-800 border-gold-500/50 text-gold-300 shadow-sm"
                    : "bg-charcoal-900 border-luxury-green-800/20 text-gray-400 hover:text-white"
                }`}
              >
                <span className="font-bold">16:9</span>
                <span className="text-[9px] text-gray-400">Cinematic Film</span>
              </button>

              <button
                type="button"
                onClick={() => setAspectRatio("9:16")}
                className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                  aspectRatio === "9:16"
                    ? "bg-luxury-green-800 border-gold-500/50 text-gold-300 shadow-sm"
                    : "bg-charcoal-900 border-luxury-green-800/20 text-gray-400 hover:text-white"
                }`}
              >
                <span className="font-bold">9:16</span>
                <span className="text-[9px] text-gray-400">Reels / Shorts</span>
              </button>
            </div>
          </div>

          {/* Resolution Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-gray-400">Resolution</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setResolution("720p")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  resolution === "720p"
                    ? "bg-luxury-green-800 border-gold-500/50 text-gold-300"
                    : "bg-charcoal-900 border-luxury-green-800/20 text-gray-400 hover:text-white"
                }`}
              >
                720p (Faster)
              </button>
              <button
                type="button"
                onClick={() => setResolution("1080p")}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  resolution === "1080p"
                    ? "bg-luxury-green-800 border-gold-500/50 text-gold-300"
                    : "bg-charcoal-900 border-luxury-green-800/20 text-gray-400 hover:text-white"
                }`}
              >
                1080p Full HD
              </button>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-gray-400 space-y-1 font-mono border-t border-luxury-green-800/20">
            <div>Model: <span className="text-gold-400">veo-3.1-fast-generate-preview</span></div>
            <div>FPS: <span className="text-gray-300">24fps Cinematic</span></div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleStartGeneration}
            disabled={loading || (mode === "animate_image" && !uploadedImage) || (mode === "text_to_video" && !prompt.trim())}
            className={`w-full py-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 mt-2 ${
              !loading && ((mode === "animate_image" && uploadedImage) || (mode === "text_to_video" && prompt.trim()))
                ? "bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 hover:brightness-110 shadow-lg cursor-pointer"
                : "bg-charcoal-900 border border-luxury-green-800/20 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-charcoal-950" />
                <span>Processing Veo 3 Video...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-charcoal-950" />
                <span>{mode === "animate_image" ? "Animate Image with Veo" : "Generate Veo Video"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress & Error States */}
      {loading && (
        <div className="p-4 rounded-xl bg-luxury-green-950/60 border border-gold-500/40 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-gold-400 animate-spin shrink-0" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-gold-300">{loadingPhase}</h4>
            <p className="text-[10px] text-gray-400">Video generation typically takes 1 to 2 minutes. Please keep this tab open.</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Active Video Player */}
      {activeVideo && (
        <div className="p-5 rounded-2xl bg-charcoal-950 border border-gold-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{activeVideo.title}</span>
              </h3>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                Aspect: {activeVideo.aspectRatio} • {activeVideo.resolution} • veo-3.1-fast-generate-preview
              </p>
            </div>

            <a
              href={activeVideo.videoUrl}
              download={`${activeVideo.title.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`}
              className="px-3 py-1.5 rounded-lg bg-luxury-green-950 hover:bg-luxury-green-900 border border-luxury-green-800/40 text-gold-300 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download MP4</span>
            </a>
          </div>

          <div className={`mx-auto rounded-xl overflow-hidden bg-black border border-luxury-green-800/30 ${
            activeVideo.aspectRatio === "9:16" ? "max-w-xs" : "w-full max-w-2xl"
          }`}>
            <video
              src={activeVideo.videoUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full h-auto"
            />
          </div>
        </div>
      )}

      {/* Video Gallery History */}
      {videos.length > 1 && (
        <div className="space-y-2 pt-2">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Rendered Studio Videos ({videos.length}):</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {videos.map(v => (
              <div
                key={v.id}
                onClick={() => setActiveVideo(v)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  activeVideo?.id === v.id
                    ? "bg-luxury-green-950/70 border-gold-500/40 text-gold-300"
                    : "bg-charcoal-950/60 border-luxury-green-800/20 text-gray-300 hover:bg-charcoal-950"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Film className="w-3.5 h-3.5 text-gold-400 shrink-0" />
                  <span className="text-xs font-semibold truncate">{v.title}</span>
                </div>
                <div className="text-[10px] text-gray-400 font-mono flex items-center justify-between">
                  <span>{v.aspectRatio}</span>
                  <span>{v.resolution}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
