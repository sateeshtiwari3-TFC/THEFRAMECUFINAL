import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Send, 
  BrainCircuit, 
  Database, 
  Bot, 
  User, 
  ChevronRight, 
  RefreshCw, 
  Info, 
  TrendingUp, 
  AlertCircle,
  Clock,
  CheckCircle,
  FileText,
  Mail,
  Workflow,
  Music,
  Share2,
  Headphones,
  Film,
  Image as ImageIcon,
  Mic,
  Disc3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Project, Studio, Editor, Expense, CalendarEvent, UserProfile } from "../types";
import { WeddingSoundtrackSuggester } from "./creative/WeddingSoundtrackSuggester";
import { ReelsCaptionGenerator } from "./creative/ReelsCaptionGenerator";
import { GeminiMultiTurnChat } from "./creative/GeminiMultiTurnChat";
import { VeoVideoStudio } from "./creative/VeoVideoStudio";
import { LyriaMusicStudio } from "./creative/LyriaMusicStudio";
import { ImageStudioModal } from "./creative/ImageStudioModal";
import { AudioTranscriberStudio } from "./creative/AudioTranscriberStudio";

export type GeminiTabMode = "chat" | "video" | "music" | "image" | "transcribe" | "soundtrack" | "captions";

interface GeminiAIViewProps {
  projects: Project[];
  studios: Studio[];
  editors: Editor[];
  expenses: Expense[];
  calendarEvents: CalendarEvent[];
  currentUser: UserProfile | null;
  initialMode?: GeminiTabMode;
  preselectedProjectId?: string;
}

interface Message {
  id: string;
  sender: "user" | "gemini";
  text: string;
  timestamp: Date;
  modelUsed?: string;
  thinkingMode?: boolean;
}

export default function GeminiAIView({
  projects,
  studios,
  editors,
  expenses,
  calendarEvents,
  currentUser,
  initialMode = "soundtrack",
  preselectedProjectId
}: GeminiAIViewProps) {
  const [activeTab, setActiveTab] = useState<GeminiTabMode>(initialMode);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "gemini",
      text: `Hello ${currentUser?.name || "there"}! I am **Frame Cut Studio AI Intelligence**. 

I have fully synchronized with your live ERP database. Here's what we can analyze today:
* **Project Pipelines**: Completion rates, delays, and revision frequencies.
* **Studio Invoicing**: Pending payments, total revenue, and client accounts.
* **Editor Assignments**: Productivity, workload balance, and scheduling.
* **Financial Audits**: Revenue vs Expense analysis and profit margins.

Try clicking one of the live workspace suggestions below or type your custom query!`,
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [useHighThinking, setUseHighThinking] = useState<boolean>(() => {
    return localStorage.getItem("tfc_ai_quota_limited") !== "true";
  });
  const [quotaWarning, setQuotaWarning] = useState<boolean>(() => {
    return localStorage.getItem("tfc_ai_quota_limited") === "true";
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Aggregate context safely for the AI model
  const getContextPayload = () => {
    return {
      metadata: {
        currentTime: new Date().toISOString(),
        currentUser: {
          name: currentUser?.name || "Unknown",
          role: currentUser?.role || "admin",
          email: currentUser?.email || ""
        }
      },
      projectsSummary: projects.map(p => ({
        id: p.id,
        coupleName: p.coupleName,
        brideName: p.brideName,
        groomName: p.groomName,
        studioName: p.studioName,
        eventType: p.eventType,
        shootDate: p.shootDate,
        deliveryDate: p.deliveryDate,
        editorName: p.assignedEditorName || "Unassigned",
        status: p.status,
        priority: p.priority,
        projectAmount: p.projectAmount,
        editorPayment: p.editorPayment,
        advancePayment: p.advancePayment,
        remainingBalance: p.remainingBalance,
        dataSize: p.dataSize || "N/A",
        backupStatus: p.backupStatus || "pending"
      })),
      studiosSummary: studios.map(s => {
        const studioProjects = projects.filter(p => p.studioId === s.id);
        return {
          id: s.id,
          name: s.name,
          ownerName: s.ownerName,
          address: s.address,
          totalProjects: studioProjects.length,
          pendingAmount: studioProjects.reduce((sum, p) => sum + (p.remainingBalance || 0), 0)
        };
      }),
      editorsSummary: editors.map(e => {
        const activeLoad = projects.filter(p => p.assignedEditorId === e.id && p.status !== "delivered" && p.status !== "closed").length;
        return {
          id: e.id,
          name: e.name,
          rating: e.rating,
          joinedDate: e.joinedDate,
          notes: e.notes || "",
          currentLoad: activeLoad
        };
      }),
      financesSummary: {
        totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
        expenseCategories: expenses.map(e => ({ category: e.category, amount: e.amount, date: e.date }))
      },
      calendarEventsCount: calendarEvents.length
    };
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || prompt;
    if (!textToSend.trim() || loading) return;

    if (!customPrompt) setPrompt("");

    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      sender: "user",
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: textToSend,
          context: getContextPayload(),
          useHighThinking
        })
      });

      const data = await response.json();

      if (data.quotaLimited || response.status === 429) {
        localStorage.setItem("tfc_ai_quota_limited", "true");
        setQuotaWarning(true);
        setUseHighThinking(false);
      }

      if (!response.ok) {
        throw new Error(data.error || "An error occurred with Gemini processing.");
      }

      const geminiMessage: Message = {
        id: `msg-${Date.now()}-gemini`,
        sender: "gemini",
        text: data.text,
        timestamp: new Date(),
        modelUsed: data.model,
        thinkingMode: data.useHighThinking
      };

      setMessages(prev => [...prev, geminiMessage]);
    } catch (err: any) {
      console.error(err);
      const errorMessage: Message = {
        id: `msg-${Date.now()}-error`,
        sender: "gemini",
        text: `⚠️ **System Connection Alert**
        
Unable to process your request at this time. 

**Possible Resolution Steps:**
1. Check if the **GEMINI_API_KEY** is correctly set in **Settings** (or the platform Secrets panel).
2. Verify that your network connection is active.
3. If this is a self-hosted sandbox, ensure the dev server has restarted with full-stack capability.

*Error Details:* \`${err.message || "Unknown server response issue"}\``,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Safe and clean custom Markdown renderer inside React
  const renderMarkdown = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      let content = line;
      
      // Headers
      if (content.startsWith("### ")) {
        return <h4 key={idx} className="text-sm font-bold text-white mt-4 mb-2 font-display">{content.replace("### ", "")}</h4>;
      }
      if (content.startsWith("## ")) {
        return <h3 key={idx} className="text-base font-bold text-gold-400 mt-5 mb-2.5 font-display border-b border-luxury-green-800/10 pb-1">{content.replace("## ", "")}</h3>;
      }
      if (content.startsWith("* ") || content.startsWith("- ")) {
        const itemText = content.replace(/^[*+-]\s+/, "");
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-gray-300 leading-relaxed mb-1">
            {parseInlineMarkdown(itemText)}
          </li>
        );
      }

      // Check for simple table rows
      if (content.startsWith("|") && content.endsWith("|")) {
        // Skip separator row |---|---|
        if (content.includes("---")) return null;
        
        const cells = content.split("|").slice(1, -1).map(c => c.trim());
        return (
          <div key={idx} className="grid grid-cols-4 gap-2 text-[11px] py-1 px-2 border-b border-luxury-green-800/5 hover:bg-luxury-green-950/10 text-gray-300 font-mono">
            {cells.map((cell, cIdx) => (
              <span key={cIdx} className="truncate">{parseInlineMarkdown(cell)}</span>
            ))}
          </div>
        );
      }

      return (
        <p key={idx} className="text-xs text-gray-300 leading-relaxed mb-2">
          {parseInlineMarkdown(content)}
        </p>
      );
    });
  };

  const parseInlineMarkdown = (text: string) => {
    // Basic bold **text** parsing
    const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="text-gold-400 font-bold font-display">{part}</strong>;
      }
      
      // Inline code `code` parsing
      const subParts = part.split(/`([^`]+)`/g);
      return subParts.map((subPart, subIdx) => {
        if (subIdx % 2 === 1) {
          return <code key={subIdx} className="bg-charcoal-950 px-1.5 py-0.5 rounded text-[10px] font-mono text-emerald-400 border border-luxury-green-800/20">{subPart}</code>;
        }
        return subPart;
      });
    });
  };

  // ERP Quick Suggestions List
  const quickSuggestions = [
    {
      id: "perf",
      title: "Pipeline Bottle-necks",
      desc: "Analyze project delivery & editor load",
      prompt: "Analyze our active wedding projects, revision frequencies, and editor workloads. Identify bottlenecks and suggest optimizations.",
      icon: Workflow,
      color: "from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/20"
    },
    {
      id: "finance",
      title: "Cashflow & Financial Audit",
      desc: "Outstanding collections & balances",
      prompt: "Review our current project revenue and payment stats. Audit outstanding collections, studio balances, and summarize our estimated revenue vs expenses.",
      icon: TrendingUp,
      color: "from-gold-500/10 to-gold-500/5 text-gold-400 border-gold-500/20"
    },
    {
      id: "schedule",
      title: "Optimize Schedule",
      desc: "Plan upcoming project queues",
      prompt: "Evaluate our upcoming project deadlines and active video editors. Create an optimized editing queue and priority schedule for next week.",
      icon: Clock,
      color: "from-blue-500/10 to-blue-500/5 text-blue-400 border-blue-500/20"
    },
    {
      id: "draft_email",
      title: "Client Payment Follow-up",
      desc: "Polite reminder for unpaid dues",
      prompt: "Based on our outstanding project balances, write a professional, polite but firm email reminder for payment from our partner wedding studios.",
      icon: Mail,
      color: "from-purple-500/10 to-purple-500/5 text-purple-400 border-purple-500/20"
    }
  ];

  return (
    <div className="space-y-6">
      {/* AI Hub Navigation Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2 bg-charcoal-900/90 border border-luxury-green-800/25 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "chat"
                ? "bg-gradient-to-r from-gold-500 to-amber-500 text-charcoal-950 shadow-md shadow-gold-500/20"
                : "text-gray-300 hover:text-white hover:bg-luxury-green-950/50"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Gemini Chat</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === "chat" ? "bg-charcoal-950/20 text-charcoal-950 font-bold" : "bg-blue-500/10 text-blue-400"
            }`}>
              Search & Maps
            </span>
          </button>

          <button
            onClick={() => setActiveTab("video")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "video"
                ? "bg-gradient-to-r from-gold-500 to-amber-500 text-charcoal-950 shadow-md shadow-gold-500/20"
                : "text-gray-300 hover:text-white hover:bg-luxury-green-950/50"
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Veo 3 Video</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === "video" ? "bg-charcoal-950/20 text-charcoal-950 font-bold" : "bg-purple-500/10 text-purple-400"
            }`}>
              Animate Photo
            </span>
          </button>

          <button
            onClick={() => setActiveTab("music")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "music"
                ? "bg-gradient-to-r from-gold-500 to-amber-500 text-charcoal-950 shadow-md shadow-gold-500/20"
                : "text-gray-300 hover:text-white hover:bg-luxury-green-950/50"
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Lyria Music</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === "music" ? "bg-charcoal-950/20 text-charcoal-950 font-bold" : "bg-amber-500/10 text-amber-400"
            }`}>
              Clips & Pro
            </span>
          </button>

          <button
            onClick={() => setActiveTab("image")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "image"
                ? "bg-gradient-to-r from-gold-500 to-amber-500 text-charcoal-950 shadow-md shadow-gold-500/20"
                : "text-gray-300 hover:text-white hover:bg-luxury-green-950/50"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Image Studio</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === "image" ? "bg-charcoal-950/20 text-charcoal-950 font-bold" : "bg-pink-500/10 text-pink-400"
            }`}>
              Create & Edit
            </span>
          </button>

          <button
            onClick={() => setActiveTab("transcribe")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "transcribe"
                ? "bg-gradient-to-r from-gold-500 to-amber-500 text-charcoal-950 shadow-md shadow-gold-500/20"
                : "text-gray-300 hover:text-white hover:bg-luxury-green-950/50"
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Audio Transcriber</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              activeTab === "transcribe" ? "bg-charcoal-950/20 text-charcoal-950 font-bold" : "bg-emerald-500/10 text-emerald-400"
            }`}>
              Mic & File
            </span>
          </button>

          <button
            onClick={() => setActiveTab("soundtrack")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "soundtrack"
                ? "bg-gradient-to-r from-gold-500 to-amber-500 text-charcoal-950 shadow-md shadow-gold-500/20"
                : "text-gray-300 hover:text-white hover:bg-luxury-green-950/50"
            }`}
          >
            <Headphones className="w-4 h-4" />
            <span>Soundtrack Curation</span>
          </button>

          <button
            onClick={() => setActiveTab("captions")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === "captions"
                ? "bg-gradient-to-r from-gold-500 to-amber-500 text-charcoal-950 shadow-md shadow-gold-500/20"
                : "text-gray-300 hover:text-white hover:bg-luxury-green-950/50"
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Reels & Captions</span>
          </button>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1 text-[11px] font-mono text-gray-400 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Gemini & Veo 3 & Lyria</span>
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === "soundtrack" && (
        <WeddingSoundtrackSuggester 
          projects={projects} 
          preselectedProjectId={preselectedProjectId} 
        />
      )}

      {activeTab === "captions" && (
        <ReelsCaptionGenerator 
          projects={projects} 
          preselectedProjectId={preselectedProjectId} 
        />
      )}

      {activeTab === "chat" && (
        <GeminiMultiTurnChat
          projects={projects}
          studios={studios}
          editors={editors}
          userName={currentUser?.name || "Studio Admin"}
        />
      )}

      {activeTab === "video" && <VeoVideoStudio />}

      {activeTab === "music" && <LyriaMusicStudio />}

      {activeTab === "image" && <ImageStudioModal />}

      {activeTab === "transcribe" && <AudioTranscriberStudio />}

      {false && (
        <div className="space-y-6">
          {/* Cinematic Ambient Banner */}
          <div className="relative p-6 md:p-8 rounded-3xl bg-gradient-to-br from-luxury-green-950 to-charcoal-900 border border-luxury-green-800/15 overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-luxury-green-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-2 relative z-10">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-gold-500/10 border border-gold-500/20 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-gold-400 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-gold-400 uppercase tracking-widest">Enterprise AI Intelligence</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-white font-display tracking-tight">Frame Cut AI Workspace</h2>
              <p className="text-xs text-gray-400 max-w-xl leading-relaxed">
                Harness real-time studio database synchronization. Query operational workflows, run diagnostic audits, and formulate strategic actions utilizing Google Gemini model architectures.
              </p>
            </div>

            {/* Dual Mode Intelligence Switcher */}
            <div className="p-4 bg-charcoal-950/80 border border-luxury-green-800/20 rounded-2xl md:min-w-[280px] space-y-3 shrink-0 relative z-10">
              <div className="flex items-center justify-between pb-2 border-b border-luxury-green-800/10">
                <div className="flex items-center space-x-2">
                  <BrainCircuit className="w-4 h-4 text-gold-400" />
                  <span className="text-xs font-bold text-white font-display">Intelligence Level</span>
                </div>
                <span className="text-[9px] font-mono text-gray-500 bg-charcoal-900 px-1.5 py-0.5 rounded uppercase">Config</span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setUseHighThinking(true)}
                  className={`w-full p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
                    useHighThinking
                      ? "bg-gold-500/10 border-gold-500 text-gold-400"
                      : "bg-transparent border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">Deep Reasoning Mode</span>
                    <span className="text-[9px] text-gray-500 block">gemini-3.1-pro-preview • HIGH Thinking</span>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    useHighThinking ? "border-gold-500 bg-gold-500 text-charcoal-950" : "border-gray-600"
                  }`}>
                    {useHighThinking && <CheckCircle className="w-2.5 h-2.5 text-charcoal-950 stroke-[3]" />}
                  </div>
                </button>

                <button
                  onClick={() => setUseHighThinking(false)}
                  className={`w-full p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
                    !useHighThinking
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                      : "bg-transparent border-transparent text-gray-400 hover:text-gray-200"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">Standard Fast Mode</span>
                    <span className="text-[9px] text-gray-500 block">gemini-3.8-flash • Direct Output</span>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    !useHighThinking ? "border-emerald-500 bg-emerald-500 text-charcoal-950" : "border-gray-600"
                  }`}>
                    {!useHighThinking && <CheckCircle className="w-2.5 h-2.5 text-charcoal-950 stroke-[3]" />}
                  </div>
                </button>
              </div>

              {quotaWarning && (
                <div className="p-3 bg-amber-950/30 border border-amber-500/20 rounded-xl text-[10px] text-amber-400 space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>Quota Override Active</span>
                  </div>
                  <p className="leading-normal text-[9px] text-gray-400">
                    Deep reasoning models failed or exceeded current quota/rate limits on your API Key. Standard Fast Mode is active.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem("tfc_ai_quota_limited");
                      setQuotaWarning(false);
                      setUseHighThinking(true);
                    }}
                    className="text-[9px] text-amber-500 hover:text-amber-400 font-bold underline font-mono cursor-pointer block mt-1"
                  >
                    Retry Deep Reasoning Mode
                  </button>
                </div>
              )}
            </div>
          </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Chat Workspace Component - spans 8 columns */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-3xl bg-charcoal-900 border border-luxury-green-800/15 flex flex-col h-[520px] overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-charcoal-950/40 border-b border-luxury-green-800/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-luxury-green-500/10 rounded-xl text-luxury-green-400 border border-luxury-green-500/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white tracking-tight block font-display">Live Studio Assistant</span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Active Sync On-Premises</span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-gray-500 font-mono flex items-center space-x-1">
                <span>Model:</span>
                <span className="text-gold-400 font-semibold">{useHighThinking ? "gemini-3.1-pro" : "gemini-3.8-flash"}</span>
              </div>
            </div>

            {/* Messages Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex items-start space-x-2.5 max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"}`}>
                      {/* Avatar */}
                      <div className={`p-1.5 rounded-lg shrink-0 border ${
                        msg.sender === "user" 
                          ? "bg-gold-500/10 text-gold-400 border-gold-500/20" 
                          : "bg-luxury-green-500/10 text-luxury-green-400 border-luxury-green-500/20"
                      }`}>
                        {msg.sender === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                      </div>

                      {/* Content */}
                      <div className="space-y-1">
                        <div className={`p-3.5 rounded-2xl text-xs space-y-2 ${
                          msg.sender === "user"
                            ? "bg-gradient-to-br from-gold-600/15 to-gold-500/5 border border-gold-500/25 text-white rounded-tr-none"
                            : "bg-charcoal-950/60 border border-luxury-green-800/10 text-gray-300 rounded-tl-none shadow-sm"
                        }`}>
                          {msg.sender === "user" ? <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p> : renderMarkdown(msg.text)}
                        </div>

                        {/* Message Metadata */}
                        <div className={`flex items-center space-x-2 text-[8px] font-mono text-gray-500 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                          <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.sender === "gemini" && msg.modelUsed && (
                            <>
                              <span>•</span>
                              <span className="text-gray-400 font-bold uppercase">{msg.thinkingMode ? "High Thinking Enabled" : "Direct response"}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="flex items-start space-x-2.5">
                      <div className="p-1.5 bg-luxury-green-500/10 text-luxury-green-400 border border-luxury-green-500/20 rounded-lg animate-pulse shrink-0">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="p-4 rounded-2xl rounded-tl-none bg-charcoal-950/40 border border-luxury-green-800/10 flex items-center space-x-3.5 max-w-[280px]">
                        <div className="relative">
                          <div className="w-5 h-5 rounded-full border-2 border-gold-500/20 border-t-gold-400 animate-spin" />
                          <Sparkles className="w-2.5 h-2.5 text-gold-400 absolute inset-0 m-auto animate-pulse" />
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 block font-mono">
                            {useHighThinking ? "Reasoning deep models..." : "Computing analysis..."}
                          </span>
                          <span className="text-[9px] text-gray-500 italic block mt-0.5 font-sans">
                            {useHighThinking ? "Running thinking loop..." : "Streaming response..."}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-charcoal-950/50 border-t border-luxury-green-800/10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  placeholder="Ask Gemini to analyze revenue, audit editors, optimize projects..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  className="flex-1 bg-charcoal-950 border border-luxury-green-800/20 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-gold-500/40 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!prompt.trim() || loading}
                  className="p-3 bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-charcoal-950 font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Sync panel & Suggestions - spans 4 columns */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Synchronized Live Database panel */}
          <div className="p-5 rounded-3xl bg-charcoal-900 border border-luxury-green-800/15 space-y-4">
            <h3 className="text-xs font-bold font-display text-white flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white tracking-tight block">Synced Workspace Context</span>
                <p className="text-[9px] text-gray-500 font-mono">Live ERP Memory Cache</p>
              </div>
            </h3>

            <div className="space-y-2 text-[10px] font-mono text-gray-400">
              <div className="p-2 bg-charcoal-950/60 rounded-xl border border-luxury-green-800/5 flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-gray-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Projects Collection</span>
                </span>
                <span className="text-white font-bold">{projects.length} Records</span>
              </div>

              <div className="p-2 bg-charcoal-950/60 rounded-xl border border-luxury-green-800/5 flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-gray-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Wedding Studios</span>
                </span>
                <span className="text-white font-bold">{studios.length} Records</span>
              </div>

              <div className="p-2 bg-charcoal-950/60 rounded-xl border border-luxury-green-800/5 flex items-center justify-between">
                <span className="flex items-center space-x-1.5 text-gray-400">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Editors Roster</span>
                </span>
                <span className="text-white font-bold">{editors.length} Editors</span>
              </div>
            </div>

            <div className="p-3 bg-luxury-green-950/40 rounded-2xl border border-luxury-green-500/20 text-[10px] text-luxury-green-400 flex items-start space-x-2 leading-relaxed">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-luxury-green-500" />
              <span>
                <strong>Workspace Context Auto-Sync:</strong> Changes made in your ERP pipeline are updated in Gemini's contextual window on every message.
              </span>
            </div>
          </div>

          {/* Quick Pre-formatted Queries */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block ml-1">Live AI Templates</span>
            
            <div className="grid grid-cols-1 gap-2.5">
              {quickSuggestions.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSend(s.prompt)}
                    disabled={loading}
                    className="p-3 rounded-2xl bg-charcoal-900 border border-luxury-green-800/10 hover:border-gold-500/25 text-left transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer group"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-xl border bg-gradient-to-br ${s.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-white block group-hover:text-gold-400 transition-colors truncate">{s.title}</span>
                        <span className="text-[10px] text-gray-500 truncate block mt-0.5">{s.desc}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gold-400 transition-colors shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  )}
    </div>
  );
}
