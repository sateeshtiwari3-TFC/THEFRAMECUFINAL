import React, { useState } from 'react';
import {
  Bell as BellIcon,
  Clock as ClockIcon,
  Trash2 as TrashIcon,
  AlertTriangle as AlertTriangleIcon,
  CheckCircle as CheckCircleIcon,
  DollarSign as DollarSignIcon,
  AlertCircle as AlertCircleIcon,
  Zap as ZapIcon,
  Sparkles as SparklesIcon,
  Lightbulb as LightbulbIcon,
  ChevronRight as ChevronRightIcon,
  Compass as CompassIcon,
  Video as VideoIcon,
  Film as FilmIcon,
  HardDrive as HardDriveIcon,
  Receipt as ReceiptIcon,
  Calendar as CalendarIcon,
  FileText as FileTextIcon,
  Share2 as Share2Icon,
  BookOpen as BookOpenIcon,
  ChevronDown as ChevronDownIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { AppNotification, CalendarEvent } from '../types';
import BackgroundTaskRunnerWidget from './BackgroundTaskRunnerWidget';
import { getPlatformDocumentation, getSetupTips } from '../services/welcomeContent';

interface NotificationsViewProps {
  notifications: AppNotification[];
  calendarEvents?: CalendarEvent[];
  runnerIsRunning?: boolean;
  runnerLastCheckTime?: Date | null;
  runnerCheckCount?: number;
  pushPermissionState?: NotificationPermission | 'unsupported';
  onRequestPushPermission?: () => Promise<boolean>;
  onSendTestPush?: () => Promise<boolean>;
  onRunnerManualCheck?: () => Promise<void>;
  onMarkRead: (id: string) => Promise<void>;
  onClearNotification: (id: string) => Promise<void>;
  onClearAll?: () => Promise<void>;
  onClearAllNotifications?: () => Promise<void>;
  onNavigateTab?: (tab: string) => void;
}

export default function NotificationsView({ 
  notifications, 
  calendarEvents = [],
  runnerIsRunning = false,
  runnerLastCheckTime = null,
  runnerCheckCount = 0,
  pushPermissionState = 'default',
  onRequestPushPermission,
  onSendTestPush,
  onRunnerManualCheck,
  onMarkRead, 
  onClearNotification,
  onClearAll,
  onClearAllNotifications,
  onNavigateTab
}: NotificationsViewProps) {
  const handleClearAll = onClearAllNotifications || onClearAll;
  const [expandedDocs, setExpandedDocs] = useState<Record<string, boolean>>({});

  const toggleDocExpand = (id: string) => {
    setExpandedDocs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'welcome':
        return <SparklesIcon className="w-5 h-5 text-gold-400 animate-pulse" />;
      case 'delivery_tomorrow':
        return <ClockIcon className="w-5 h-5 text-yellow-400" />;
      case 'payment_pending':
        return <AlertTriangleIcon className="w-5 h-5 text-red-400" />;
      case 'project_completed':
        return <CheckCircleIcon className="w-5 h-5 text-emerald-400" />;
      case 'new_assignment':
        return <DollarSignIcon className="w-5 h-5 text-blue-400" />;
      case 'revision_request':
        return <AlertCircleIcon className="w-5 h-5 text-purple-400" />;
      default:
        return <ZapIcon className="w-5 h-5 text-luxury-green-400" />;
    }
  };

  const getLinkIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Video':
        return <VideoIcon className="w-4 h-4 text-amber-400" />;
      case 'Film':
        return <FilmIcon className="w-4 h-4 text-amber-400" />;
      case 'Sparkles':
        return <SparklesIcon className="w-4 h-4 text-gold-400" />;
      case 'HardDrive':
        return <HardDriveIcon className="w-4 h-4 text-cyan-400" />;
      case 'Receipt':
        return <ReceiptIcon className="w-4 h-4 text-emerald-400" />;
      case 'Calendar':
        return <CalendarIcon className="w-4 h-4 text-purple-400" />;
      case 'FileText':
        return <FileTextIcon className="w-4 h-4 text-gold-400" />;
      case 'Share2':
        return <Share2Icon className="w-4 h-4 text-emerald-400" />;
      default:
        return <CompassIcon className="w-4 h-4 text-amber-400" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* BACKGROUND TASK RUNNER WIDGET */}
      {onRunnerManualCheck && (
        <BackgroundTaskRunnerWidget
          calendarEvents={calendarEvents}
          notifications={notifications}
          isRunning={runnerIsRunning}
          lastCheckTime={runnerLastCheckTime}
          checkCount={runnerCheckCount}
          pushPermissionState={pushPermissionState}
          onRequestPushPermission={onRequestPushPermission}
          onSendTestPush={onSendTestPush}
          onManualCheck={onRunnerManualCheck}
        />
      )}

      {/* Header bar */}
      <div className="p-6 rounded-3xl glass-panel flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold font-display text-white">Production Notifications & Guides</h2>
            <span className="text-[10px] font-mono uppercase bg-gold-500/15 text-gold-400 px-2 py-0.5 rounded-full border border-gold-500/30">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Automatic workflow status alerts, deadlines, and new member onboarding guides.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-mono font-bold bg-gold-500/15 border border-gold-500/30 text-gold-400 px-3.5 py-1.5 rounded-full">
            {unreadCount} UNREAD ALERTS
          </span>

          {notifications.length > 0 && handleClearAll && (
            <button
              onClick={() => handleClearAll()}
              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono font-bold text-xs rounded-full cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <TrashIcon className="w-3.5 h-3.5" /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Notifications list */}
      <div className="space-y-4">
        {notifications.map((notif) => {
          const isWelcome = notif.type === 'welcome' || (notif.gettingStartedLinks && notif.gettingStartedLinks.length > 0);

          if (isWelcome) {
            const roleForContent = (notif.recipientRole === 'studio' ? 'studio' : 'editor') as 'editor' | 'studio';
            const docs = notif.documentationSections && notif.documentationSections.length > 0
              ? notif.documentationSections
              : getPlatformDocumentation(roleForContent);
            const setupTips = notif.setupTips && notif.setupTips.length > 0
              ? notif.setupTips
              : getSetupTips(roleForContent);

            return (
              <motion.div
                key={notif.id}
                layout
                className={`p-6 rounded-3xl border transition-all relative overflow-hidden ${
                  notif.read 
                    ? 'bg-charcoal-900/50 border-luxury-green-800/20' 
                    : 'bg-gradient-to-br from-luxury-green-950/40 via-charcoal-900 to-black/80 border-gold-500/30 shadow-[0_10px_30px_rgba(212,175,55,0.08)]'
                }`}
              >
                {/* Ambient gold glow highlight on top */}
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-gold-500/60 to-transparent" />

                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-3.5 bg-gradient-to-br from-gold-500/20 to-amber-500/10 rounded-2xl shrink-0 border border-gold-500/30 text-gold-400 shadow-inner">
                      <SparklesIcon className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-white text-base font-display">{notif.title}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-gold-500/20 text-gold-300 border border-gold-500/30">
                          {notif.recipientRole === 'studio' ? 'Studio Onboarding' : 'Editor Onboarding'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed pt-1">{notif.message}</p>
                      
                      <div className="flex items-center space-x-3 text-[10px] text-gray-400 font-mono pt-1">
                        <span>{notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString() : 'Just now'}</span>
                        <span>•</span>
                        <span className="text-gold-400 font-medium">Onboarding Guide</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-start">
                    {!notif.read && (
                      <button
                        onClick={() => onMarkRead(notif.id)}
                        className="p-2 text-gold-400 hover:text-gold-300 hover:bg-gold-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Mark as Read"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onClearNotification(notif.id)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete Alert"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* ESSENTIAL GETTING-STARTED QUICK ACTION LINKS */}
                {notif.gettingStartedLinks && notif.gettingStartedLinks.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-white/10">
                    <h5 className="text-[11px] font-mono text-gold-300 uppercase tracking-wider font-bold mb-3 flex items-center space-x-1.5">
                      <CompassIcon className="w-3.5 h-3.5 text-gold-400" />
                      <span>Essential Getting-Started Links (शुरुआती लिंक्स)</span>
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {notif.gettingStartedLinks.map((link, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (link.actionTab && onNavigateTab) {
                              onNavigateTab(link.actionTab);
                            } else if (link.url) {
                              window.open(link.url, '_blank');
                            }
                          }}
                          className="p-3.5 rounded-2xl bg-black/40 hover:bg-black/70 border border-white/10 hover:border-gold-500/40 text-left transition-all cursor-pointer group flex items-start justify-between"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="p-2 rounded-xl bg-charcoal-900 border border-white/10 group-hover:border-gold-500/30 shrink-0 mt-0.5">
                              {getLinkIcon(link.icon)}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-gold-300 transition-colors flex items-center space-x-1">
                                <span>{link.label}</span>
                                <ChevronRightIcon className="w-3.5 h-3.5 text-white/40 group-hover:text-gold-400 group-hover:translate-x-0.5 transition-all" />
                              </div>
                              {link.description && (
                                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                                  {link.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* PLATFORM DOCUMENTATION & TECHNICAL STANDARDS (SOPs) */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-[11px] font-mono text-gold-300 uppercase tracking-wider font-bold flex items-center space-x-1.5">
                      <BookOpenIcon className="w-3.5 h-3.5 text-gold-400" />
                      <span>Platform Documentation & Codec Standards</span>
                    </h5>
                    <span className="text-[10px] font-mono text-gray-400">Standard Operating Procedures</span>
                  </div>

                  <div className="space-y-2">
                    {docs.map((doc) => {
                      const isExpanded = !!expandedDocs[doc.id];
                      return (
                        <div 
                          key={doc.id}
                          className="rounded-2xl bg-charcoal-950/70 border border-white/10 overflow-hidden transition-colors"
                        >
                          <button
                            type="button"
                            onClick={() => toggleDocExpand(doc.id)}
                            className="w-full p-3.5 text-left flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center space-x-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
                              <span className="text-xs font-bold text-white">{doc.title}</span>
                              {doc.badge && (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-gold-500/15 text-gold-300 border border-gold-500/20">
                                  {doc.badge}
                                </span>
                              )}
                            </div>
                            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180 text-gold-400' : ''}`} />
                          </button>

                          {isExpanded && (
                            <div className="px-4 pb-4 pt-1 space-y-2 border-t border-white/5">
                              <p className="text-[11px] text-gray-400 italic">{doc.summary}</p>
                              <ul className="space-y-1.5 text-[11px] text-gray-300 pl-3 border-l-2 border-gold-500/30">
                                {doc.details.map((item, i) => (
                                  <li key={i} className="leading-relaxed">• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* STEP-BY-STEP SETUP TIPS */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <h5 className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-bold mb-3 flex items-center space-x-1.5">
                    <LightbulbIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Essential Setup Tips & Best Practices</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {setupTips.map((tip) => (
                      <div 
                        key={tip.step}
                        className="p-3 rounded-2xl bg-luxury-green-950/20 border border-luxury-green-800/20 flex items-start space-x-3 text-left"
                      >
                        <div className="w-6 h-6 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          0{tip.step}
                        </div>
                        <div className="space-y-1">
                          <strong className="text-xs text-white block">{tip.title}</strong>
                          <p className="text-[11px] text-gray-400 leading-snug">{tip.description}</p>
                          {tip.highlight && (
                            <div className="text-[10px] text-emerald-300 font-medium">
                              💡 {tip.highlight}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            );
          }

          // Standard notification card
          return (
            <motion.div
              key={notif.id}
              layout
              className={`p-5 rounded-3xl border flex items-start justify-between transition-all ${
                notif.read 
                  ? 'bg-charcoal-900/40 border-luxury-green-800/10' 
                  : 'bg-gradient-to-r from-luxury-green-950/20 to-charcoal-900 border-gold-500/20'
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-charcoal-950 rounded-2xl shrink-0 border border-luxury-green-800/10">
                  {getIcon(notif.type)}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm font-display">{notif.title}</h4>
                  <p className="text-xs text-gray-400">{notif.message}</p>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString() : 'Just now'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {!notif.read && (
                  <button
                    onClick={() => onMarkRead(notif.id)}
                    className="p-2 text-gold-400 hover:text-gold-300 hover:bg-gold-500/10 rounded-xl transition-colors cursor-pointer"
                    title="Mark as Read"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onClearNotification(notif.id)}
                  className="p-2 text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                  title="Delete Alert"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}

        {notifications.length === 0 && (
          <div className="p-12 text-center rounded-3xl border border-dashed border-white/10 glass-panel">
            <BellIcon className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
            <h3 className="text-base font-bold text-white font-display">All Caught Up</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              No new alerts right now. When projects are assigned, files are submitted, or deadlines arrive, they will appear here.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
