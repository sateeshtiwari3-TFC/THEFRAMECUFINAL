import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Search, 
  MapPin, 
  Mic, 
  MicOff, 
  Square, 
  Trash2, 
  ExternalLink, 
  Cpu, 
  ShieldCheck, 
  Check, 
  Copy, 
  Info,
  Compass,
  Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Project, Studio, Editor } from "../../types";

interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
  model?: string;
  groundingChunks?: any[];
}

interface GeminiMultiTurnChatProps {
  projects: Project[];
  studios: Studio[];
  editors: Editor[];
  userName?: string;
}

const SYSTEM_ROLES = [
  {
    id: "director",
    name: "Wedding Production Director",
    instruction: "You are the Executive Production Director at 'The Frame Cut Studio', a luxury wedding cinematography studio. You provide strategic, visionary, and decisive leadership on wedding film direction, editing pipelines, studio operations, and team coordination. Answer in an elegant, professional, and practical manner with bullet points and clear takeaways.",
  },
  {
    id: "post_supervisor",
    name: "Cinema Post-Production Supervisor",
    instruction: "You are the Senior Post-Production Supervisor at 'The Frame Cut Studio'. You excel at NLE workflows (Premiere Pro, DaVinci Resolve), color science, audio mixing, pacing, beat-matching, proxy workflows, backup storage, and quality control. Provide technical, actionable, and editing-specific advice.",
  },
  {
    id: "concierge",
    name: "Client Wedding Concierge",
    instruction: "You are the Client Experience Concierge for 'The Frame Cut Studio'. You draft warm, courteous, reassuring, and premium communications for couples, bride/groom families, and partner studio owners. Keep messages empathetic, polished, and celebratory.",
  },
  {
    id: "financial",
    name: "Studio Financial & Pricing Advisor",
    instruction: "You are the Chief Financial Analyst for 'The Frame Cut Studio'. You calculate project profitability, editing margins, vendor costs, outstanding receivables, milestone payments, and pricing packages in Indian Rupees (₹). Provide structured tables and risk ratings.",
  },
];

export const GeminiMultiTurnChat: React.FC<GeminiMultiTurnChatProps> = ({
  projects,
  studios,
  editors,
  userName = "Studio Admin"
}) => {
  const [selectedRole, setSelectedRole] = useState(SYSTEM_ROLES[0].id);
  const [customSystemInstruction, setCustomSystemInstruction] = useState("");
  const [selectedModel, setSelectedModel] = useState<"gemini-3.5-flash" | "gemini-3.1-pro-preview" | "gemini-3.1-flash-lite">("gemini-3.5-flash");
  const [enableSearch, setEnableSearch] = useState(false);
  const [enableMaps, setEnableMaps] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Audio recording state for mic input
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "initial-welcome",
      role: "model",
      text: `Hello **${userName}**! Welcome to the Frame Cut Studio Gemini Multi-Turn Chat.
      
I am connected to your live studio project pipelines (${projects.length} projects, ${studios.length} studios, ${editors.length} editors). 

You can:
* Select a specialized **AI Persona Role** (Production Director, Post Supervisor, Concierge, Financial Advisor).
* Switch between **gemini-3.5-flash** (balanced), **gemini-3.1-pro-preview** (deep reasoning), and **gemini-3.1-flash-lite** (ultra fast).
* Toggle **Google Search Grounding** or **Google Maps Grounding** for live real-world information.
* Click the **Microphone** to speak your prompt using **gemini-3.5-transcribe**!`,
      timestamp: new Date(),
      model: "gemini-3.5-flash"
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Request browser location if Maps is toggled
  useEffect(() => {
    if (enableMaps && !userLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        (err) => {
          console.warn("Geolocation permission error or unavailable:", err.message);
        }
      );
    }
  }, [enableMaps, userLocation]);

  const getActiveSystemInstruction = () => {
    if (customSystemInstruction.trim()) return customSystemInstruction;
    const roleObj = SYSTEM_ROLES.find(r => r.id === selectedRole);
    return roleObj ? roleObj.instruction : SYSTEM_ROLES[0].instruction;
  };

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || inputPrompt).trim();
    if (!promptText || loading) return;

    if (!textToSend) setInputPrompt("");

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      text: promptText,
      timestamp: new Date()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setLoading(true);

    try {
      // Determine model: if Search or Maps is active, use gemini-3.5-flash as mandated
      const activeModel = (enableSearch || enableMaps) ? "gemini-3.5-flash" : selectedModel;

      const payloadMessages = newHistory.map(m => ({
        role: m.role,
        text: m.text
      }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          systemInstruction: getActiveSystemInstruction(),
          model: activeModel,
          enableSearch,
          enableMaps,
          location: userLocation
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to receive response from Gemini Chat.");
      }

      const modelMsg: ChatMessage = {
        id: `mod-${Date.now()}`,
        role: "model",
        text: data.text,
        timestamp: new Date(),
        model: data.model || activeModel,
        groundingChunks: data.groundingChunks
      };

      setMessages(prev => [...prev, modelMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "model",
        text: `⚠️ **Unable to complete chat request**\n\n*Error details:* ${err.message || "Network or API service exception."}\n\nPlease check your GEMINI_API_KEY in Settings or try switching to another model.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Audio recording handlers for voice transcription
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(t => t.stop());
        await transcribeRecordedAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(sec => sec + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Mic access error:", err);
      alert("Microphone access could not be granted. Please check browser microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const transcribeRecordedAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const res = await fetch("/api/gemini/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: "audio/webm",
            prompt: "Transcribe this studio director or editor query cleanly for input into Gemini."
          })
        });

        const data = await res.json();
        if (data.transcription) {
          setInputPrompt(prev => (prev ? `${prev} ${data.transcription}` : data.transcription));
        } else {
          alert("Could not detect clear speech in the recording.");
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error("Transcription failed:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[750px] bg-charcoal-900/90 border border-luxury-green-800/40 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
      {/* Top Configuration Bar */}
      <div className="p-4 bg-charcoal-950/80 border-b border-luxury-green-800/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white tracking-wide uppercase font-mono">Gemini Studio Chat</h3>
            <p className="text-[10px] text-gray-400">Multi-turn intelligence with live studio context</p>
          </div>
        </div>

        {/* Model Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Model:</span>
          <div className="flex bg-charcoal-900 border border-luxury-green-800/30 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => {
                setSelectedModel("gemini-3.5-flash");
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                selectedModel === "gemini-3.5-flash"
                  ? "bg-luxury-green-800 text-gold-300 font-semibold shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              title="gemini-3.5-flash: Balanced speed, reasoning and search/maps grounding"
            >
              gemini-3.5-flash
            </button>
            <button
              onClick={() => {
                setSelectedModel("gemini-3.1-pro-preview");
                setEnableSearch(false);
                setEnableMaps(false);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                selectedModel === "gemini-3.1-pro-preview"
                  ? "bg-luxury-green-800 text-gold-300 font-semibold shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              title="gemini-3.1-pro-preview: Advanced reasoning and complex analysis"
            >
              gemini-3.1-pro
            </button>
            <button
              onClick={() => {
                setSelectedModel("gemini-3.1-flash-lite");
                setEnableSearch(false);
                setEnableMaps(false);
              }}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                selectedModel === "gemini-3.1-flash-lite"
                  ? "bg-luxury-green-800 text-gold-300 font-semibold shadow-sm"
                  : "text-gray-400 hover:text-gray-200"
              }`}
              title="gemini-3.1-flash-lite: Ultra-fast low latency"
            >
              flash-lite
            </button>
          </div>
        </div>

        {/* Grounding Controls */}
        <div className="flex items-center gap-2">
          {/* Google Search Grounding */}
          <button
            onClick={() => {
              const next = !enableSearch;
              setEnableSearch(next);
              if (next) {
                setEnableMaps(false);
                setSelectedModel("gemini-3.5-flash");
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              enableSearch
                ? "bg-blue-950/60 border-blue-500/60 text-blue-300 shadow-sm"
                : "bg-charcoal-900 border-luxury-green-800/30 text-gray-400 hover:text-gray-200"
            }`}
            title="Google Search Grounding (gemini-3.5-flash)"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span>Search</span>
            {enableSearch && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>}
          </button>

          {/* Google Maps Grounding */}
          <button
            onClick={() => {
              const next = !enableMaps;
              setEnableMaps(next);
              if (next) {
                setEnableSearch(false);
                setSelectedModel("gemini-3.5-flash");
              }
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              enableMaps
                ? "bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-sm"
                : "bg-charcoal-900 border-luxury-green-800/30 text-gray-400 hover:text-gray-200"
            }`}
            title="Google Maps Grounding (gemini-3.5-flash)"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Maps</span>
            {enableMaps && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
          </button>

          {/* Clear conversation */}
          <button
            onClick={() => {
              if (confirm("Clear conversation history?")) {
                setMessages([
                  {
                    id: `new-${Date.now()}`,
                    role: "model",
                    text: `Conversation restarted. How can I assist you with your wedding films today?`,
                    timestamp: new Date()
                  }
                ]);
              }
            }}
            className="p-1.5 rounded-lg bg-charcoal-900 hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 border border-luxury-green-800/20 transition-all"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Role Selection Strip */}
      <div className="px-4 py-2 bg-charcoal-950/50 border-b border-luxury-green-800/20 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[10px] text-gray-400 uppercase font-mono whitespace-nowrap">Persona Role:</span>
          {SYSTEM_ROLES.map(role => (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 text-[11px] ${
                selectedRole === role.id
                  ? "bg-gold-500/20 text-gold-300 border border-gold-500/40 font-medium"
                  : "text-gray-400 hover:text-gray-200 bg-charcoal-900 border border-transparent"
              }`}
            >
              <span>{role.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "model" && (
              <div className="w-8 h-8 rounded-full bg-luxury-green-900 border border-gold-500/30 flex items-center justify-center text-gold-400 shrink-0 mt-1 shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-lg ${
                m.role === "user"
                  ? "bg-gradient-to-r from-luxury-green-800 to-luxury-green-900 text-white rounded-tr-none border border-luxury-green-600/30"
                  : "bg-charcoal-950/90 text-gray-200 rounded-tl-none border border-luxury-green-800/40"
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between gap-3 mb-2 border-b border-white/5 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold">
                    {m.role === "user" ? userName : "Gemini Intelligence"}
                  </span>
                  {m.model && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-luxury-green-950 text-gold-400 border border-gold-500/20 font-mono">
                      {m.model}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-400 font-mono">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button
                    onClick={() => copyMessage(m.id, m.text)}
                    className="text-gray-400 hover:text-white transition-colors"
                    title="Copy message"
                  >
                    {copiedId === m.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Message Content */}
              <div className="text-xs leading-relaxed whitespace-pre-wrap font-sans">
                {m.text}
              </div>

              {/* Grounding Source Citations (Web & Maps) */}
              {m.groundingChunks && m.groundingChunks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-luxury-green-800/30">
                  <div className="flex items-center gap-1.5 text-[10px] text-gold-400 font-mono uppercase tracking-wider mb-2">
                    <Compass className="w-3 h-3" />
                    <span>Grounded Knowledge Sources ({m.groundingChunks.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.groundingChunks.map((chunk, idx) => {
                      if (chunk.web) {
                        return (
                          <a
                            key={idx}
                            href={chunk.web.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 text-[11px] text-blue-300 transition-colors"
                          >
                            <Search className="w-3 h-3 text-blue-400" />
                            <span className="max-w-[200px] truncate">{chunk.web.title || chunk.web.uri}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        );
                      }
                      if (chunk.maps) {
                        return (
                          <a
                            key={idx}
                            href={chunk.maps.uri || `https://maps.google.com/?q=${encodeURIComponent(chunk.maps.title || "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 text-[11px] text-emerald-300 transition-colors"
                          >
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span className="max-w-[200px] truncate">{chunk.maps.title || "Google Maps Location"}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}
            </div>

            {m.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-luxury-green-800 border border-gold-500/30 flex items-center justify-center text-white shrink-0 mt-1 shadow-md">
                <User className="w-4 h-4" />
              </div>
            )}
          </motion.div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-full bg-luxury-green-900 border border-gold-500/30 flex items-center justify-center text-gold-400 animate-spin">
              <Cpu className="w-4 h-4" />
            </div>
            <div className="bg-charcoal-950/80 border border-luxury-green-800/40 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gold-400 animate-ping"></span>
              <span className="text-xs text-gray-300 font-mono">
                {enableSearch ? "Querying Google Search..." : enableMaps ? "Analyzing Google Maps data..." : "Gemini is reasoning..."}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Inquiries */}
      <div className="px-4 py-2 bg-charcoal-950/40 border-t border-luxury-green-800/20 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] text-gray-400 uppercase font-mono whitespace-nowrap">Suggested:</span>
        <button
          onClick={() => handleSendMessage("Analyze our current project completion backlog and upcoming urgent delivery deadlines.")}
          className="px-2.5 py-1 rounded bg-charcoal-900 hover:bg-luxury-green-950 text-gray-300 hover:text-gold-300 border border-luxury-green-800/30 text-[11px] whitespace-nowrap transition-colors"
        >
          🚨 Urgent Delivery Deadlines
        </button>
        <button
          onClick={() => handleSendMessage("Which partner studios have outstanding receivables above ₹20,000?")}
          className="px-2.5 py-1 rounded bg-charcoal-900 hover:bg-luxury-green-950 text-gray-300 hover:text-gold-300 border border-luxury-green-800/30 text-[11px] whitespace-nowrap transition-colors"
        >
          💰 Pending Studio Receivables
        </button>
        <button
          onClick={() => handleSendMessage("Suggest an optimal 3-stage editing workflow and editor re-allocation to boost turnaround by 25%.")}
          className="px-2.5 py-1 rounded bg-charcoal-900 hover:bg-luxury-green-950 text-gray-300 hover:text-gold-300 border border-luxury-green-800/30 text-[11px] whitespace-nowrap transition-colors"
        >
          ⚡ Workflow Turnaround Optimization
        </button>
      </div>

      {/* Prompt Input Form with Voice Mic & Grounding Indicators */}
      <div className="p-4 bg-charcoal-950 border-t border-luxury-green-800/40">
        <div className="relative flex items-center gap-2">
          {/* Voice Input Mic Button */}
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isTranscribing}
            className={`p-3 rounded-xl border transition-all flex items-center justify-center shrink-0 ${
              isRecording
                ? "bg-rose-600 border-rose-400 text-white animate-pulse"
                : isTranscribing
                ? "bg-amber-950 border-amber-500 text-amber-300 animate-spin"
                : "bg-charcoal-900 border-luxury-green-800/40 text-gray-300 hover:text-gold-300 hover:border-gold-500/40"
            }`}
            title={isRecording ? `Stop recording (${recordingSeconds}s)` : "Speak your prompt (gemini-3.5-transcribe)"}
          >
            {isRecording ? <Square className="w-4 h-4 fill-white" /> : <Mic className="w-4 h-4" />}
          </button>

          {isRecording && (
            <div className="absolute left-14 top-[-28px] bg-rose-950 border border-rose-500 text-rose-200 text-[10px] px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              Recording: {recordingSeconds}s — Click again to transcribe
            </div>
          )}

          {isTranscribing && (
            <div className="absolute left-14 top-[-28px] bg-amber-950 border border-amber-500 text-amber-200 text-[10px] px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1.5">
              Transcribing with gemini-3.5-transcribe...
            </div>
          )}

          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              enableSearch
                ? "Ask anything with live Google Search grounding..."
                : enableMaps
                ? "Search wedding venues, places or geographic logistics..."
                : "Ask Gemini about wedding projects, finances, editing workflows..."
            }
            className="flex-1 bg-charcoal-900 border border-luxury-green-800/40 focus:border-gold-500 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 outline-none transition-all shadow-inner"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || loading}
            className={`p-3 rounded-xl border font-medium text-xs transition-all flex items-center justify-center shrink-0 ${
              inputPrompt.trim() && !loading
                ? "bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 border-gold-400 hover:brightness-110 shadow-lg cursor-pointer"
                : "bg-charcoal-900 border-luxury-green-800/20 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
