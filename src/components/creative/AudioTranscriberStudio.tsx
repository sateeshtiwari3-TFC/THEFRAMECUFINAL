import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, 
  Square, 
  Upload, 
  FileText, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Volume2, 
  Clock, 
  AlertCircle,
  FileAudio,
  Trash2,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TranscriptionItem {
  id: string;
  title: string;
  text: string;
  sourceType: "microphone" | "file";
  audioUrl?: string;
  timestamp: Date;
  wordCount: number;
}

export const AudioTranscriberStudio: React.FC = () => {
  const [activeMode, setActiveMode] = useState<"microphone" | "file">("microphone");
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [transcriptions, setTranscriptions] = useState<TranscriptionItem[]>([]);
  const [activeTranscription, setActiveTranscription] = useState<TranscriptionItem | null>(null);
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setFileName(`Mic_Recording_${new Date().toISOString().split("T")[0]}.webm`);
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Could not access microphone. Please check browser microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setAudioBlob(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob || loading) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        const res = await fetch("/api/gemini/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: audioBlob.type || "audio/webm",
            prompt: "Please transcribe this wedding recording accurately. Identify speakers (Bride, Groom, Priest, Family Member, or Editor), timestamps, and emotional nuances where applicable."
          })
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to transcribe audio.");
        }

        const transcriptionText = data.transcription || "No speech detected.";
        const wordCount = transcriptionText.trim().split(/\s+/).length;

        const item: TranscriptionItem = {
          id: `trans-${Date.now()}`,
          title: fileName || "Voice Recording",
          text: transcriptionText,
          sourceType: activeMode,
          audioUrl: audioUrl || undefined,
          timestamp: new Date(),
          wordCount
        };

        setTranscriptions(prev => [item, ...prev]);
        setActiveTranscription(item);
        setLoading(false);
      };
      reader.readAsDataURL(audioBlob);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to transcribe audio.");
      setLoading(false);
    }
  };

  const copyTranscription = () => {
    if (activeTranscription) {
      navigator.clipboard.writeText(activeTranscription.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadTextFile = () => {
    if (!activeTranscription) return;
    const blob = new Blob([activeTranscription.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTranscription.title.replace(/[^a-zA-Z0-9]/g, "_")}_transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatSeconds = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="bg-charcoal-900/90 border border-luxury-green-800/40 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-luxury-green-800/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 shadow-md">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-serif font-bold text-white tracking-wide">
              Speech-to-Text Audio Transcriber
            </h2>
            <p className="text-xs text-gray-400">
              Live microphone capture & wedding vows/speeches transcription with <span className="text-gold-400 font-mono">gemini-3.5-transcribe</span>
            </p>
          </div>
        </div>

        {/* Source Mode Tabs */}
        <div className="flex bg-charcoal-950 border border-luxury-green-800/30 rounded-xl p-1 text-xs">
          <button
            onClick={() => setActiveMode("microphone")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeMode === "microphone"
                ? "bg-luxury-green-800 text-gold-300 font-semibold shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            🎙️ Live Microphone
          </button>
          <button
            onClick={() => setActiveMode("file")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeMode === "file"
                ? "bg-luxury-green-800 text-gold-300 font-semibold shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            📁 Upload Audio File
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {activeMode === "microphone" ? (
          <div className="p-6 rounded-2xl bg-charcoal-950/70 border border-luxury-green-800/30 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping"></div>
              )}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-105 ${
                  isRecording
                    ? "bg-rose-600 text-white border-2 border-rose-400 animate-pulse"
                    : "bg-luxury-green-800 hover:bg-luxury-green-700 text-gold-300 border-2 border-gold-500/40"
                }`}
              >
                {isRecording ? <Square className="w-8 h-8 fill-white" /> : <Mic className="w-8 h-8" />}
              </button>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">
                {isRecording ? "Listening to Audio..." : audioBlob ? "Recording Completed" : "Click to Start Recording"}
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1">
                {isRecording ? `Recording Time: ${formatSeconds(recordSeconds)}` : "Record wedding vows, ceremony mantras, or voice instructions"}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-charcoal-950/70 border-2 border-dashed border-luxury-green-800/40 hover:border-gold-500/40 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              className="hidden"
            />
            <FileAudio className="w-10 h-10 text-gold-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                {fileName ? fileName : "Upload Audio File"}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Supports MP3, WAV, WEBM, M4A, OGG</p>
            </div>
          </div>
        )}

        {/* Audio Preview & Action */}
        <div className="p-6 rounded-2xl bg-charcoal-950/70 border border-luxury-green-800/30 space-y-4">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
            Audio Status & Action
          </h4>

          {audioUrl ? (
            <div className="space-y-3">
              <audio src={audioUrl} controls className="w-full h-10 accent-gold-500" />
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                <span>File: {fileName || "Recording.webm"}</span>
                <span className="text-gold-400 font-semibold">Ready to Transcribe</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-charcoal-900/50 border border-luxury-green-800/20 text-center text-xs text-gray-500">
              No audio recorded or uploaded yet. Start by speaking into the mic or choosing a file.
            </div>
          )}

          <button
            onClick={handleTranscribe}
            disabled={!audioBlob || loading}
            className={`w-full py-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 ${
              audioBlob && !loading
                ? "bg-gradient-to-r from-gold-600 to-gold-500 text-charcoal-950 hover:brightness-110 shadow-lg cursor-pointer"
                : "bg-charcoal-900 border border-luxury-green-800/20 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-charcoal-950" />
                <span>Transcribing with gemini-3.5-transcribe...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-charcoal-950" />
                <span>Transcribe Speech to Text</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Transcription Results Card */}
      {activeTranscription && (
        <div className="p-5 rounded-2xl bg-charcoal-950 border border-gold-500/30 shadow-2xl space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-luxury-green-800/30">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-gold-400" />
                <span>{activeTranscription.title}</span>
              </h3>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                Model: gemini-3.5-transcribe • {activeTranscription.wordCount} words • {new Date(activeTranscription.timestamp).toLocaleTimeString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={copyTranscription}
                className="px-3 py-1.5 rounded-lg bg-luxury-green-950 hover:bg-luxury-green-900 border border-luxury-green-800/40 text-gold-300 text-xs flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              <button
                onClick={downloadTextFile}
                className="px-3 py-1.5 rounded-lg bg-luxury-green-950 hover:bg-luxury-green-900 border border-luxury-green-800/40 text-gold-300 text-xs flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-charcoal-900/80 border border-luxury-green-800/20 text-xs text-gray-200 leading-relaxed whitespace-pre-wrap font-sans max-h-96 overflow-y-auto custom-scrollbar">
            {activeTranscription.text}
          </div>
        </div>
      )}

      {/* History */}
      {transcriptions.length > 1 && (
        <div className="space-y-2 pt-2">
          <span className="text-[10px] text-gray-400 uppercase font-mono">Recent Transcriptions ({transcriptions.length}):</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {transcriptions.map(t => (
              <div
                key={t.id}
                onClick={() => setActiveTranscription(t)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  activeTranscription?.id === t.id
                    ? "bg-luxury-green-950/70 border-gold-500/40 text-gold-300"
                    : "bg-charcoal-950/60 border-luxury-green-800/20 text-gray-300 hover:bg-charcoal-950"
                }`}
              >
                <div className="truncate">
                  <div className="text-xs font-semibold truncate">{t.title}</div>
                  <div className="text-[10px] text-gray-400 font-mono">{t.wordCount} words</div>
                </div>
                <span className="text-[10px] text-gold-400 font-mono shrink-0">
                  {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
