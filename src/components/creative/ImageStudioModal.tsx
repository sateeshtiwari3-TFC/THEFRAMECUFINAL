import React, { useState, useRef } from "react";
import { 
  Image as ImageIcon, 
  Wand2, 
  Upload, 
  Download, 
  Sparkles, 
  X, 
  Check, 
  RefreshCw, 
  Sliders, 
  Layers, 
  Copy,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GeneratedImageItem {
  id: string;
  url: string;
  prompt: string;
  sourceUrl?: string;
  mode: "create" | "edit";
  aspectRatio: string;
  model: string;
  timestamp: Date;
}

export const ImageStudioModal: React.FC = () => {
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [prompt, setPrompt] = useState("");
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "9:16" | "4:3" | "3:4">("1:1");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImageItem[]>([]);
  const [activeImage, setActiveImage] = useState<GeneratedImageItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const PRESETS = [
    {
      title: "Royal Palace Mandap",
      prompt: "Luxury royal Indian wedding mandap decorated with fresh red roses, marigolds, golden chandeliers, and warm twilight illumination in a palace courtyard, photorealistic 8k cinema quality."
    },
    {
      title: "Vogue Wedding Portrait",
      prompt: "High-fashion editorial wedding couple portrait, exquisite embroidered maroon velvet sherwani and golden lehenga, soft natural backlight, shallow depth of field, Vogue wedding cover aesthetic."
    },
    {
      title: "Cold Pyro Sunset Entry",
      prompt: "Cinematic night entrance of bride and groom walking down the aisle with cold fireworks pyros sparkling on both sides, joyous smiling guests clapping in golden bokeh background."
    },
    {
      title: "Lake Pichola Udaipur Silhouette",
      prompt: "Romantic sunset silhouette of newlywed couple holding hands on a heritage marble boat deck floating on Lake Pichola Udaipur with historic palace reflections."
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !sourceImage) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/gemini/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          base64ImageData: mode === "edit" ? sourceImage : undefined,
          aspectRatio
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create or edit image.");
      }

      const newItem: GeneratedImageItem = {
        id: `img-${Date.now()}`,
        url: data.imageUrl,
        prompt: prompt.trim() || (mode === "edit" ? "Image Transformation" : "Generated Visual"),
        sourceUrl: mode === "edit" ? sourceImage || undefined : undefined,
        mode,
        aspectRatio,
        model: data.model || "gemini-3.1-flash-image-preview",
        timestamp: new Date()
      };

      setImages(prev => [newItem, ...prev]);
      setActiveImage(newItem);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to generate image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-charcoal-900/90 border border-luxury-green-800/40 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-luxury-green-800/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 shadow-md">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-white tracking-wide">
              Gemini Image Creator & Visual Editor
            </h2>
            <p className="text-xs text-gray-400">
              Create and edit wedding photography and cinematic posters using <span className="text-gold-400 font-mono">gemini-3.1-flash-image-preview</span>
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-charcoal-950 border border-luxury-green-800/30 rounded-xl p-1 text-xs">
          <button
            onClick={() => setMode("create")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === "create"
                ? "bg-luxury-green-800 text-gold-300 font-semibold shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            🎨 Create from Prompt
          </button>
          <button
            onClick={() => setMode("edit")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              mode === "edit"
                ? "bg-luxury-green-800 text-gold-300 font-semibold shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            🪄 Edit Existing Image
          </button>
        </div>
      </div>

      {/* Presets */}
      {mode === "create" && (
        <div>
          <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Cinematic Style Presets:</span>
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
      )}

      {/* Main Grid: Upload & Prompt */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {mode === "edit" && (
            <div className="space-y-2">
              <label className="text-xs text-gray-300 font-medium flex items-center justify-between">
                <span>Upload Base Image to Edit</span>
                {sourceImage && (
                  <button
                    onClick={() => setSourceImage(null)}
                    className="text-[10px] text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Remove Image
                  </button>
                )}
              </label>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              {sourceImage ? (
                <div className="relative h-48 rounded-xl overflow-hidden border border-gold-500/30 group">
                  <img src={sourceImage} alt="Base for edit" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-charcoal-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-lg bg-luxury-green-800 text-xs text-white"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-40 rounded-xl border-2 border-dashed border-luxury-green-800/50 hover:border-gold-500/50 bg-charcoal-950/50 flex flex-col items-center justify-center text-gray-400 hover:text-gold-300 transition-all gap-2"
                >
                  <Upload className="w-6 h-6 text-gold-400" />
                  <span className="text-xs font-medium">Click to upload photo to transform</span>
                </button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-gray-300 font-medium">
              {mode === "edit" ? "Edit Transformation Instructions" : "Image Prompt Description"}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={
                mode === "edit"
                  ? "e.g. Add subtle warm fairy lights bokeh in the background and enhance golden jewelry highlights..."
                  : "e.g. Photorealistic Indian couple in royal wedding attire walking down palace marble hallway, warm sunlight..."
              }
              className="w-full bg-charcoal-950 border border-luxury-green-800/40 focus:border-gold-500 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 outline-none transition-all shadow-inner resize-none"
            />
          </div>
        </div>

        {/* Right Settings */}
        <div className="space-y-4 bg-charcoal-950/70 border border-luxury-green-800/30 rounded-2xl p-4">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-gold-400" />
            <span>Aspect Ratio</span>
          </h3>

          <div className="grid grid-cols-3 gap-1.5">
            {(["1:1", "16:9", "9:16", "4:3", "3:4"] as const).map(ar => (
              <button
                key={ar}
                type="button"
                onClick={() => setAspectRatio(ar)}
                className={`p-2 rounded-xl border text-xs font-medium transition-all ${
                  aspectRatio === ar
                    ? "bg-luxury-green-800 border-gold-500/50 text-gold-300 shadow-sm"
                    : "bg-charcoal-900 border-luxury-green-800/20 text-gray-400 hover:text-white"
                }`}
              >
                {ar}
              </button>
            ))}
          </div>

          <div className="text-[10px] text-gray-400 font-mono pt-2 border-t border-luxury-green-800/20">
            Model: <span className="text-gold-400">gemini-3.1-flash-image-preview</span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || (mode === "edit" && !sourceImage && !prompt.trim()) || (mode === "create" && !prompt.trim())}
            className={`w-full py-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 mt-2 ${
              !loading && ((mode === "edit" && (sourceImage || prompt.trim())) || (mode === "create" && prompt.trim()))
                ? "bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 hover:brightness-110 shadow-lg cursor-pointer"
                : "bg-charcoal-900 border border-luxury-green-800/20 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-charcoal-950" />
                <span>Generating Visual...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-charcoal-950" />
                <span>{mode === "edit" ? "Apply AI Edit" : "Generate Image"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Generated Image Result Card */}
      {activeImage && (
        <div className="p-5 rounded-2xl bg-charcoal-950 border border-gold-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-luxury-green-800/30">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{activeImage.prompt.slice(0, 48)}...</span>
              </h3>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                Aspect: {activeImage.aspectRatio} • {activeImage.model} • {new Date(activeImage.timestamp).toLocaleTimeString()}
              </p>
            </div>

            <a
              href={activeImage.url}
              download={`wedding_image_${Date.now()}.png`}
              className="px-3.5 py-1.5 rounded-lg bg-luxury-green-950 hover:bg-luxury-green-900 border border-luxury-green-800/40 text-gold-300 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Image</span>
            </a>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            {activeImage.sourceUrl && (
              <div className="space-y-1.5 text-center">
                <span className="text-[10px] text-gray-400 uppercase font-mono">Original Source</span>
                <img
                  src={activeImage.sourceUrl}
                  alt="Original"
                  className="max-h-80 rounded-xl object-contain border border-luxury-green-800/30"
                />
              </div>
            )}

            <div className="space-y-1.5 text-center">
              <span className="text-[10px] text-gold-400 uppercase font-mono font-semibold">
                {activeImage.sourceUrl ? "AI Edited Result" : "Generated Image"}
              </span>
              <img
                src={activeImage.url}
                alt="Generated result"
                className="max-h-96 rounded-xl object-contain border-2 border-gold-500/40 shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Gallery of Images */}
      {images.length > 1 && (
        <div className="space-y-2 pt-2">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Generated Studio Visuals ({images.length}):</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map(img => (
              <div
                key={img.id}
                onClick={() => setActiveImage(img)}
                className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all aspect-square ${
                  activeImage?.id === img.id
                    ? "border-gold-500 ring-2 ring-gold-500/40"
                    : "border-luxury-green-800/30 hover:border-gold-500/30"
                }`}
              >
                <img src={img.url} alt="Gallery item" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-charcoal-950/70 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-[10px] text-white">
                  <span className="truncate font-semibold">{img.prompt}</span>
                  <span className="text-gray-400 font-mono">{img.aspectRatio}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
