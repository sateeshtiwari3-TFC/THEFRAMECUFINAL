import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Info,
  User,
  Building2,
  Scissors,
  Phone,
  MapPin,
  CheckCircle2,
  UserPlus,
  LogIn,
  Video,
  Camera,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Studio, Editor } from '../types';
import Logo from './Logo';
import LoginWeatherClockWidget from './LoginWeatherClockWidget';
import FullScreenSplashView from './FullScreenSplashView';
import { getLoginScreenConfig, resolveBackgroundUrl, LoginScreenConfig } from '../utils/loginScreenConfig';
import { triggerWelcomeNotification } from '../services/notificationService';

interface LoginViewProps {
  onLogin: (email: string, role: 'admin' | 'editor' | 'studio', id?: string) => Promise<void>;
  studios?: Studio[];
  editors?: Editor[];
}

export default function LoginView({ onLogin, studios = [], editors = [] }: LoginViewProps) {
  const [config, setConfig] = useState<LoginScreenConfig>(getLoginScreenConfig);
  const [showSplash, setShowSplash] = useState<boolean>(() => config.showSplashOnStart);
  
  // Auth Mode: 'signin' or 'signup'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign-In State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Sign-Up State
  const [signUpRole, setSignUpRole] = useState<'editor' | 'studio'>('editor');
  
  // Editor Sign-Up Fields
  const [editorFullName, setEditorFullName] = useState('');
  const [editorSpecialty, setEditorSpecialty] = useState('Cinematic Wedding Teaser & Highlights');
  const [editorBio, setEditorBio] = useState('');

  // Studio Sign-Up Fields
  const [studioName, setStudioName] = useState('');
  const [studioOwnerName, setStudioOwnerName] = useState('');
  const [studioCity, setStudioCity] = useState('');
  const [studioAddress, setStudioAddress] = useState('');

  // Shared Sign-Up Fields
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Feedback State
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleConfigChange = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
      }
    };
    window.addEventListener('tfc_login_config_updated', handleConfigChange);
    return () => window.removeEventListener('tfc_login_config_updated', handleConfigChange);
  }, []);

  // Load passwords from localStorage with fallback defaults
  const getPasswords = (): Record<string, string> => {
    try {
      const saved = localStorage.getItem('tfc_passwords');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      'satish@framecut.com': 'satish123',
      'sateeshtiwari3@gmail.com': 'satish123',
      'sateesh2000': 'Sateesh@504054',
      'vansh@framecut.com': 'vansh123',
      'vansh2000': '8889995988',
      'kk@weddingbykk.com': 'kk123'
    };
  };

  const getUserUid = (emailStr: string, roleStr: string) => {
    const clean = emailStr.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    if (clean.includes('satish') || clean.includes('sateesh')) return 'admin-satish';
    if (clean.includes('vansh')) return 'editor-vansh-auth';
    if (clean.includes('weddingbykk') || clean.includes('kk')) return 'studio-kk-auth';
    return `${roleStr}-${clean}`;
  };

  // --- Sign In Handler ---
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const inputEmail = email.trim();
    const cleanEmail = inputEmail.toLowerCase().replace(/[^a-z0-9]/g, '_');

    try {
      const passwordsMap = getPasswords();
      const expectedPassword = passwordsMap[inputEmail] || passwordsMap[inputEmail.toLowerCase()];

      // 1. Check if stored in local passwords map
      if (expectedPassword && password === expectedPassword) {
        // Find role based on credentials email
        if (inputEmail === 'satish@framecut.com' || inputEmail === 'sateesh2000' || inputEmail === 'sateeshtiwari3@gmail.com') {
          await onLogin(inputEmail, 'admin');
          return;
        } else if (inputEmail === 'vansh@framecut.com' || inputEmail === 'vansh2000') {
          await onLogin(inputEmail, 'editor', 'editor-vansh');
          return;
        } else if (inputEmail === 'kk@weddingbykk.com') {
          await onLogin(inputEmail, 'studio', 'studio-kk');
          return;
        } else {
          // Check if matches known editor
          const matchedEditor = editors.find(ed => ed.email?.toLowerCase() === inputEmail.toLowerCase() || ed.id.includes(cleanEmail));
          if (matchedEditor) {
            await onLogin(inputEmail, 'editor', matchedEditor.id);
            return;
          }
          // Check if matches known studio
          const matchedStudio = studios.find(st => st.email?.toLowerCase() === inputEmail.toLowerCase() || st.id.includes(cleanEmail));
          if (matchedStudio) {
            await onLogin(inputEmail, 'studio', matchedStudio.id);
            return;
          }
          // Fallback to role from Firestore user doc
          try {
            const userSnap = await getDoc(doc(db, 'users', `editor-${cleanEmail}`));
            if (userSnap.exists()) {
              const uData = userSnap.data();
              await onLogin(inputEmail, 'editor', uData.editorId);
              return;
            }
            const studioSnap = await getDoc(doc(db, 'users', `studio-${cleanEmail}`));
            if (studioSnap.exists()) {
              const uData = studioSnap.data();
              await onLogin(inputEmail, 'studio', uData.studioId);
              return;
            }
          } catch (fireErr) {
            console.warn("Firestore lookup in login fallback:", fireErr);
          }
          await onLogin(inputEmail, 'editor');
          return;
        }
      }

      // 2. If not matched in local map or password didn't match, check Firestore directly
      try {
        // Query users collection for this email or username
        const usersRef = collection(db, 'users');
        const qEmail = query(usersRef, where('email', '==', inputEmail.toLowerCase()));
        const snap = await getDocs(qEmail);

        if (!snap.empty) {
          const userDoc = snap.docs[0].data();
          // Check saved password in doc or fallback
          if (userDoc.password && userDoc.password !== password) {
            throw new Error("Access Denied. Incorrect password. Please check your credentials and try again.");
          }
          // Update local passwords cache for faster next login
          passwordsMap[inputEmail] = password;
          passwordsMap[inputEmail.toLowerCase()] = password;
          localStorage.setItem('tfc_passwords', JSON.stringify(passwordsMap));

          const userRole = userDoc.role || 'editor';
          const entityId = userDoc.editorId || userDoc.studioId;
          await onLogin(inputEmail, userRole, entityId);
          return;
        }
      } catch (err: any) {
        if (err.message && err.message.includes("Access Denied")) {
          throw err;
        }
        console.warn("Could not query users collection:", err);
      }

      // 3. Fallback default check
      if (expectedPassword && password !== expectedPassword) {
        throw new Error("Access Denied. Incorrect password. Please verify your security password and try again.");
      }

      if (!expectedPassword) {
        throw new Error("Account not found. If you are a new editor or studio, click 'Sign Up' above to register your account.");
      }

      await onLogin(inputEmail, 'editor');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
      setLoading(false);
    }
  };

  // --- Sign Up Handler ---
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const cleanEmail = signUpEmail.trim().toLowerCase();
    const cleanEmailKey = cleanEmail.replace(/[^a-z0-9]/g, '_');

    try {
      // 1. Basic Validations
      if (!cleanEmail) {
        throw new Error("Please provide a valid email address or username.");
      }
      if (signUpPassword.length < 6) {
        throw new Error("Security password must be at least 6 characters long.");
      }
      if (signUpPassword !== signUpConfirmPassword) {
        throw new Error("Passwords do not match. Please re-confirm your password.");
      }
      if (!signUpPhone.trim()) {
        throw new Error("Mobile / WhatsApp number is required for production alerts.");
      }

      // 2. Check if already exists in passwords or Firestore
      const passwordsMap = getPasswords();
      if (passwordsMap[cleanEmail] || passwordsMap[signUpEmail.trim()]) {
        throw new Error("This email or username is already registered. Please click 'Sign In' to log in.");
      }

      const existingEditor = editors.find(ed => ed.email?.toLowerCase() === cleanEmail);
      const existingStudio = studios.find(st => st.email?.toLowerCase() === cleanEmail);
      if (existingEditor || existingStudio) {
        throw new Error("An account with this email address already exists. Please sign in instead.");
      }

      const userUid = getUserUid(cleanEmail, signUpRole);

      // 3. Create Role-Specific Document in Firestore
      if (signUpRole === 'editor') {
        if (!editorFullName.trim()) {
          throw new Error("Please enter your full name.");
        }

        const safeSlug = editorFullName.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').slice(0, 20);
        const newEditorId = `editor-${safeSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newEditorDoc: Partial<Editor> & { createdAt: any } = {
          id: newEditorId,
          name: editorFullName.trim(),
          email: cleanEmail,
          phone: signUpPhone.trim(),
          rating: 5.0,
          joinedDate: new Date().toISOString().split('T')[0],
          specialties: [editorSpecialty],
          bio: editorBio.trim() || `Professional wedding video editor specializing in ${editorSpecialty}.`,
          createdAt: serverTimestamp()
        };

        await setDoc(doc(db, 'editors', newEditorId), newEditorDoc);

        // Create User Account Document
        await setDoc(doc(db, 'users', userUid), {
          uid: userUid,
          email: cleanEmail,
          name: editorFullName.trim(),
          role: 'editor',
          editorId: newEditorId,
          phone: signUpPhone.trim(),
          password: signUpPassword,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Save Credentials to localStorage passwords map
        passwordsMap[cleanEmail] = signUpPassword;
        passwordsMap[signUpEmail.trim()] = signUpPassword;
        localStorage.setItem('tfc_passwords', JSON.stringify(passwordsMap));

        // Create System Alert Notification for Admin
        try {
          await addDoc(collection(db, 'notifications'), {
            title: '🎬 New Video Editor Registered',
            message: `${editorFullName.trim()} has registered as an editor (${editorSpecialty}). Ready for project assignments.`,
            type: 'new_assignment',
            isAutomated: true,
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (nErr) {
          console.warn("Could not create signup notification:", nErr);
        }

        // Trigger rich 'Welcome' notification in the database with getting-started links, docs, and tips
        try {
          await triggerWelcomeNotification({
            role: 'editor',
            name: editorFullName.trim(),
            entityId: newEditorId,
            email: cleanEmail,
            phone: signUpPhone.trim(),
            specialty: editorSpecialty
          });
        } catch (wErr) {
          console.warn("Could not create welcome notification for editor:", wErr);
        }

        setSuccessMsg(`Welcome aboard, ${editorFullName.trim()}! Your editor account has been created.`);
        
        // Auto-login after brief confirmation
        setTimeout(async () => {
          await onLogin(cleanEmail, 'editor', newEditorId);
        }, 600);

      } else {
        // Studio Registration
        if (!studioName.trim()) {
          throw new Error("Please enter your wedding studio / brand name.");
        }
        if (!studioCity.trim()) {
          throw new Error("Please enter your studio city/location.");
        }

        const safeSlug = studioName.toLowerCase().trim().replace(/[^a-z0-9]/g, '-').slice(0, 20);
        const newStudioId = `studio-${safeSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

        const newStudioDoc: Partial<Studio> & { createdAt: any } = {
          id: newStudioId,
          name: studioName.trim(),
          ownerName: studioOwnerName.trim() || studioName.trim(),
          phone: signUpPhone.trim(),
          email: cleanEmail,
          city: studioCity.trim(),
          address: studioAddress.trim() || studioCity.trim(),
          tier: 'standard',
          createdAt: serverTimestamp()
        };

        await setDoc(doc(db, 'studios', newStudioId), newStudioDoc);

        // Create User Account Document
        await setDoc(doc(db, 'users', userUid), {
          uid: userUid,
          email: cleanEmail,
          name: studioName.trim(),
          role: 'studio',
          studioId: newStudioId,
          phone: signUpPhone.trim(),
          password: signUpPassword,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Save Credentials to localStorage passwords map
        passwordsMap[cleanEmail] = signUpPassword;
        passwordsMap[signUpEmail.trim()] = signUpPassword;
        localStorage.setItem('tfc_passwords', JSON.stringify(passwordsMap));

        // Create System Alert Notification for Admin
        try {
          await addDoc(collection(db, 'notifications'), {
            title: '🎉 New Wedding Studio Partner Registered',
            message: `${studioName.trim()} (${studioCity.trim()}) has joined as a studio client. Ready to submit projects.`,
            type: 'new_assignment',
            isAutomated: true,
            read: false,
            createdAt: serverTimestamp()
          });
        } catch (nErr) {
          console.warn("Could not create signup notification:", nErr);
        }

        // Trigger rich 'Welcome' notification in the database with getting-started links, docs, and tips
        try {
          await triggerWelcomeNotification({
            role: 'studio',
            name: studioName.trim(),
            entityId: newStudioId,
            email: cleanEmail,
            phone: signUpPhone.trim(),
            city: studioCity.trim()
          });
        } catch (wErr) {
          console.warn("Could not create welcome notification for studio:", wErr);
        }

        setSuccessMsg(`Welcome, ${studioName.trim()}! Your Studio partner account has been created.`);

        // Auto-login after brief confirmation
        setTimeout(async () => {
          await onLogin(cleanEmail, 'studio', newStudioId);
        }, 600);
      }

    } catch (err: any) {
      setError(err.message || 'Registration failed. Please verify the information and try again.');
      setLoading(false);
    }
  };

  const loginBgUrl = resolveBackgroundUrl(config.loginBackgroundPreset, config.loginCustomBgUrl);

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 overflow-x-hidden select-none bg-black">
      {/* Full Screen Logo Splash View overlay on app boot */}
      <AnimatePresence>
        {showSplash && (
          <FullScreenSplashView onSlideComplete={() => setShowSplash(false)} />
        )}
      </AnimatePresence>

      {/* Full-screen dynamic Wallpaper */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat filter brightness-90 contrast-110 transform scale-105 transition-all duration-1000 pointer-events-none"
        style={{
          backgroundImage: `url('${loginBgUrl}')`
        }}
      />
      {/* Dark Vignetting and Ambient Lighting Overlays */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/35 to-black/80 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl relative z-10 space-y-6 my-auto">
        
        {/* Top Header Branding */}
        <div className="text-center space-y-2 relative">
          <button
            type="button"
            onClick={() => setShowSplash(true)}
            className="inline-block p-3.5 rounded-full bg-black/50 hover:bg-black/80 hover:scale-105 backdrop-blur-xl border border-white/15 hover:border-gold-500/50 shadow-2xl transition-all cursor-pointer group"
            title="Click to view full-screen welcome splash"
          >
            <Logo size={60} variant="gold" />
          </button>
          <div>
            <div className="flex items-center justify-center space-x-2">
              <h1 className="text-2xl sm:text-3xl font-black font-display text-white tracking-[0.25em] drop-shadow-md uppercase">
                {config.loginPortalTitle || 'THE FRAME CUT'}
              </h1>
              <button
                type="button"
                onClick={() => setShowSplash(true)}
                className="px-2 py-0.5 rounded-full bg-gold-500/10 hover:bg-gold-500/20 text-gold-300 border border-gold-500/30 text-[9px] font-mono uppercase tracking-wider transition-all cursor-pointer hidden sm:inline-block"
              >
                Welcome Cover
              </button>
            </div>
            <p className="text-[10px] text-gold-300 font-mono uppercase tracking-[0.3em] leading-none mt-1.5 font-medium drop-shadow">
              {config.loginPortalSubtitle || 'Studio OS ERP • Live Production Portal'}
            </p>
          </div>
        </div>

        {/* Grid Split Layout: Weather Clock Widget + Credentials Form */}
        <div className={`grid grid-cols-1 ${config.showWeatherClockWidget && authMode === 'signin' ? 'lg:grid-cols-12' : 'max-w-xl mx-auto'} gap-6 lg:gap-10 items-center`}>
          
          {/* Left Panel: Shoot Weather & Live Clock Capsule Widget (Visible in Sign In Mode) */}
          {config.showWeatherClockWidget && authMode === 'signin' && (
            <div className="lg:col-span-5 order-2 lg:order-1 flex justify-center">
              <LoginWeatherClockWidget layout="vertical" />
            </div>
          )}

          {/* Right Panel: Account Authentication Stadium Glass Card */}
          <div className={`${config.showWeatherClockWidget && authMode === 'signin' ? 'lg:col-span-7' : 'w-full'} order-1 lg:order-2`}>
            <div className="p-6 sm:p-10 rounded-[36px] sm:rounded-[48px] bg-black/55 backdrop-blur-2xl border border-white/20 shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative overflow-hidden group hover:border-white/30 transition-all duration-500">
              
              {/* Top ambient highlight */}
              <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
              
              {/* Mode Switcher Tabs: Sign In vs Sign Up */}
              <div className="flex items-center justify-between p-1 bg-black/60 backdrop-blur-md rounded-2xl border border-white/15 mb-6 relative z-10">
                <button
                  type="button"
                  id="tab-signin-btn"
                  onClick={() => {
                    setAuthMode('signin');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    authMode === 'signin'
                      ? 'bg-gradient-to-r from-gold-500/90 to-amber-500/90 text-black shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In (प्रवेश)</span>
                </button>
                <button
                  type="button"
                  id="tab-signup-btn"
                  onClick={() => {
                    setAuthMode('signup');
                    setError('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                    authMode === 'signup'
                      ? 'bg-gradient-to-r from-gold-500/90 to-amber-500/90 text-black shadow-md'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Sign Up (नया खाता)</span>
                </button>
              </div>

              {/* Status Header */}
              <div className="flex items-center justify-between mb-5 relative z-10">
                <div>
                  <h2 className="text-sm font-semibold text-white font-display uppercase tracking-wider drop-shadow-sm">
                    {authMode === 'signin' ? 'Account Authentication' : 'Create New Studio OS Profile'}
                  </h2>
                  <p className="text-[10px] text-white/70 font-mono mt-0.5">
                    {authMode === 'signin' 
                      ? 'Enter security credentials to access Studio OS' 
                      : 'Register as an authorized Video Editor or Wedding Studio Partner'}
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-mono text-emerald-300 uppercase tracking-widest font-semibold">
                    {authMode === 'signin' ? 'SECURE NODE' : 'REGISTRATION'}
                  </span>
                </div>
              </div>

              {/* Custom Welcome Note Banner */}
              {config.loginCustomWelcomeNote && authMode === 'signin' && (
                <div className="mb-5 p-3 rounded-2xl bg-gold-500/10 border border-gold-500/25 flex items-start space-x-2.5">
                  <Info className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gold-200/90 leading-relaxed font-sans font-light">
                    {config.loginCustomWelcomeNote}
                  </p>
                </div>
              )}
              
              {/* Error Banner */}
              {error && (
                <div className="mb-5 p-3.5 rounded-2xl bg-red-500/20 backdrop-blur-md border border-red-500/40 text-xs text-red-200 leading-relaxed font-sans shadow-inner flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success Banner */}
              {successMsg && (
                <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/20 backdrop-blur-md border border-emerald-500/40 text-xs text-emerald-200 leading-relaxed font-sans shadow-inner flex items-start space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 1. SIGN IN FORM */}
              {/* ========================================================================= */}
              {authMode === 'signin' && (
                <form onSubmit={handleCredentialsSubmit} className="space-y-5 relative z-10">
                  <div>
                    <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider mb-1.5 font-medium">
                      Username or Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 w-4 h-4 text-white/50" />
                      <input
                        type="text"
                        required
                        autoComplete="username"
                        placeholder="sateesh2000, vansh2000 or your registered email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-black/35 backdrop-blur-md border border-white/20 rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-400/80 focus:ring-2 focus:ring-gold-400/20 transition-all duration-300 shadow-inner"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider font-medium">
                        Security password
                      </label>
                      {email && !password && (
                        <span className="text-[9px] font-mono text-gold-300 animate-pulse bg-gold-500/20 px-2 py-0.5 rounded-full border border-gold-500/30 uppercase">
                          Password required
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 w-4 h-4 text-white/50" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        placeholder={email ? "Enter password" : "••••••••"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`w-full pl-12 pr-12 py-3 bg-black/35 backdrop-blur-md border rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-400/80 focus:ring-2 focus:ring-gold-400/20 transition-all duration-300 shadow-inner ${
                          email && !password ? 'border-gold-400/60 shadow-[0_0_15px_rgba(212,175,55,0.2)]' : 'border-white/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3.5 text-white/50 hover:text-white transition-colors cursor-pointer"
                        title={showPassword ? "Hide Password" : "Show Password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    id="signin-submit-btn"
                    className="w-full py-3.5 bg-gradient-to-r from-gold-500/90 via-amber-500/90 to-gold-600/90 hover:from-gold-400 hover:to-amber-500 border border-white/30 rounded-full text-black font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-[0_10px_30px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_40px_rgba(212,175,55,0.5)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-55"
                  >
                    <span className="tracking-wider uppercase">{loading ? 'Authenticating...' : 'Sign In To OS'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Switch to Sign Up link */}
                  <div className="text-center pt-2">
                    <p className="text-xs text-white/60">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setError('');
                          setSuccessMsg('');
                        }}
                        className="text-gold-300 hover:text-gold-200 underline font-semibold cursor-pointer ml-1"
                      >
                        Sign Up as Editor or Studio
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* ========================================================================= */}
              {/* 2. SIGN UP FORM (Editor vs Studio) */}
              {/* ========================================================================= */}
              {authMode === 'signup' && (
                <form onSubmit={handleSignUpSubmit} className="space-y-4 relative z-10">
                  
                  {/* Role Selector: Video Editor vs Wedding Studio */}
                  <div>
                    <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider mb-2 font-medium">
                      Select Account Type (खाते का प्रकार चुनें)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        id="signup-role-editor-btn"
                        onClick={() => setSignUpRole('editor')}
                        className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          signUpRole === 'editor'
                            ? 'bg-gold-500/20 border-gold-400/80 shadow-[0_0_20px_rgba(212,175,55,0.25)] ring-1 ring-gold-400/50'
                            : 'bg-black/30 border-white/10 hover:border-white/20 text-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <div className={`p-2 rounded-xl ${signUpRole === 'editor' ? 'bg-gold-500 text-black' : 'bg-white/10 text-white'}`}>
                            <Scissors className="w-4 h-4" />
                          </div>
                          {signUpRole === 'editor' && (
                            <CheckCircle2 className="w-4 h-4 text-gold-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Video Editor
                          </h4>
                          <p className="text-[10px] text-white/60 leading-tight mt-0.5 font-sans">
                            वीडियो एडिटर • Wedding Cuts & Teasers
                          </p>
                        </div>
                      </button>

                      <button
                        type="button"
                        id="signup-role-studio-btn"
                        onClick={() => setSignUpRole('studio')}
                        className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          signUpRole === 'studio'
                            ? 'bg-gold-500/20 border-gold-400/80 shadow-[0_0_20px_rgba(212,175,55,0.25)] ring-1 ring-gold-400/50'
                            : 'bg-black/30 border-white/10 hover:border-white/20 text-white/70'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <div className={`p-2 rounded-xl ${signUpRole === 'studio' ? 'bg-gold-500 text-black' : 'bg-white/10 text-white'}`}>
                            <Building2 className="w-4 h-4" />
                          </div>
                          {signUpRole === 'studio' && (
                            <CheckCircle2 className="w-4 h-4 text-gold-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Wedding Studio
                          </h4>
                          <p className="text-[10px] text-white/60 leading-tight mt-0.5 font-sans">
                            स्टूडियो पार्टनर • Production & Delivery
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Role Specific Fields */}
                  {signUpRole === 'editor' ? (
                    /* Editor Specific Inputs */
                    <div className="space-y-3.5">
                      <div>
                        <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider mb-1 font-medium">
                          Editor Full Name (पूरा नाम) *
                        </label>
                        <div className="relative">
                          <User className="absolute left-4 top-3 w-4 h-4 text-white/50" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Rahul Sharma"
                            value={editorFullName}
                            onChange={(e) => setEditorFullName(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-black/35 backdrop-blur-md border border-white/20 rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-400/80 focus:ring-2 focus:ring-gold-400/20 transition-all shadow-inner"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider mb-1 font-medium">
                          Primary Editing Specialty (विशेषज्ञता)
                        </label>
                        <select
                          value={editorSpecialty}
                          onChange={(e) => setEditorSpecialty(e.target.value)}
                          className="w-full px-4 py-2.5 bg-charcoal-900 border border-white/20 rounded-full text-xs text-white focus:outline-none focus:border-gold-400/80 focus:ring-2 focus:ring-gold-400/20 transition-all shadow-inner"
                        >
                          <option value="Cinematic Wedding Teaser & Highlights" className="bg-charcoal-950 text-white">Cinematic Wedding Teaser & Highlights</option>
                          <option value="Traditional & Full-Length Wedding Video" className="bg-charcoal-950 text-white">Traditional & Full-Length Wedding Video</option>
                          <option value="Color Grading & DaVinci Lumetri" className="bg-charcoal-950 text-white">Color Grading (DaVinci / Lumetri)</option>
                          <option value="Wedding Reels & Viral Shorts" className="bg-charcoal-950 text-white">Wedding Reels & Viral Shorts</option>
                          <option value="Drone & Pre-Wedding Cuts" className="bg-charcoal-950 text-white">Drone & Pre-Wedding Cuts</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    /* Studio Specific Inputs */
                    <div className="space-y-3.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider mb-1 font-medium">
                            Studio / Brand Name (स्टूडियो नाम) *
                          </label>
                          <div className="relative">
                            <Building2 className="absolute left-4 top-3 w-4 h-4 text-white/50" />
                            <input
                              type="text"
                              required
                              placeholder="e.g. Royal Wedding Films"
                              value={studioName}
                              onChange={(e) => setStudioName(e.target.value)}
                              className="w-full pl-11 pr-4 py-2.5 bg-black/35 backdrop-blur-md border border-white/20 rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-400/80 focus:ring-2 focus:ring-gold-400/20 transition-all shadow-inner"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider mb-1 font-medium">
                            Owner / Contact Person (मालिक का नाम)
                          </label>
                          <div className="relative">
                            <User className="absolute left-4 top-3 w-4 h-4 text-white/50" />
                            <input
                              type="text"
                              placeholder="e.g. Vikram Rathore"
                              value={studioOwnerName}
                              onChange={(e) => setStudioOwnerName(e.target.value)}
                              className="w-full pl-11 pr-4 py-2.5 bg-black/35 backdrop-blur-md border border-white/20 rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-400/80 focus:ring-2 focus:ring-gold-400/20 transition-all shadow-inner"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider mb-1 font-medium">
                            City / Location (शहर) *
                          </label>
                          <div className="relative">
                            <MapPin className="absolute left-4 top-3 w-4 h-4 text-white/50" />
                            <input
                              type="text"
                              required
                              placeholder="e.g. Raipur / Mumbai / Delhi"
                              value={studioCity}
                              onChange={(e) => setStudioCity(e.target.value)}
                              className="w-full pl-11 pr-4 py-2.5 bg-black/35 backdrop-blur-md border border-white/20 rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-400/80 focus:ring-2 focus:ring-gold-400/20 transition-all shadow-inner"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider mb-1 font-medium">
                            Office Address (वैकल्पिक पता)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Main Road, Civil Lines"
                            value={studioAddress}
                            onChange={(e) => setStudioAddress(e.target.value)}
                            className="w-full px-4 py-2.5 bg-black/35 backdrop-blur-md border border-white/20 rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-400/80 focus:ring-2 focus:ring-gold-400/20 transition-all shadow-inner"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shared Contact & Login Credentials */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider mb-1 font-medium">
                        Login Email or Username *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3 w-4 h-4 text-white/50" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. rahul@framecut.com"
                          value={signUpEmail}
                          onChange={(e) => setSignUpEmail(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 bg-black/35 backdrop-blur-md border border-white/20 rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-400/80 focus:ring-2 focus:ring-gold-400/20 transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider mb-1 font-medium">
                        Mobile / WhatsApp Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3 w-4 h-4 text-white/50" />
                        <input
                          type="tel"
                          required
                          placeholder="+91 98765 43210"
                          value={signUpPhone}
                          onChange={(e) => setSignUpPhone(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 bg-black/35 backdrop-blur-md border border-white/20 rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-400/80 focus:ring-2 focus:ring-gold-400/20 transition-all shadow-inner"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Passwords */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider mb-1 font-medium">
                        Choose Password (पासवर्ड) *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3 w-4 h-4 text-white/50" />
                        <input
                          type={showSignUpPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          placeholder="Min 6 characters"
                          value={signUpPassword}
                          onChange={(e) => setSignUpPassword(e.target.value)}
                          className="w-full pl-11 pr-10 py-2.5 bg-black/35 backdrop-blur-md border border-white/20 rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-400/80 focus:ring-2 focus:ring-gold-400/20 transition-all shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                          className="absolute right-3.5 top-3 text-white/50 hover:text-white transition-colors cursor-pointer"
                        >
                          {showSignUpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-white/70 uppercase tracking-wider mb-1 font-medium">
                        Confirm Password (दोबारा डालें) *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3 w-4 h-4 text-white/50" />
                        <input
                          type={showSignUpPassword ? "text" : "password"}
                          required
                          autoComplete="new-password"
                          placeholder="Confirm password"
                          value={signUpConfirmPassword}
                          onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                          className={`w-full pl-11 pr-4 py-2.5 bg-black/35 backdrop-blur-md border rounded-full text-xs text-white placeholder-white/30 focus:outline-none focus:border-gold-400/80 focus:ring-2 focus:ring-gold-400/20 transition-all shadow-inner ${
                            signUpConfirmPassword && signUpPassword !== signUpConfirmPassword
                              ? 'border-red-500/80 text-red-200'
                              : 'border-white/20'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    id="signup-submit-btn"
                    className="w-full py-3.5 mt-2 bg-gradient-to-r from-gold-500/90 via-amber-500/90 to-gold-600/90 hover:from-gold-400 hover:to-amber-500 border border-white/30 rounded-full text-black font-extrabold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-[0_10px_30px_rgba(212,175,55,0.3)] hover:shadow-[0_15px_40px_rgba(212,175,55,0.5)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-55"
                  >
                    <span className="tracking-wider uppercase">
                      {loading ? 'Creating Account...' : (signUpRole === 'editor' ? 'Register As Video Editor' : 'Register As Wedding Studio')}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Switch to Sign In link */}
                  <div className="text-center pt-2">
                    <p className="text-xs text-white/60">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signin');
                          setError('');
                          setSuccessMsg('');
                        }}
                        className="text-gold-300 hover:text-gold-200 underline font-semibold cursor-pointer ml-1"
                      >
                        Sign In here
                      </button>
                    </p>
                  </div>
                </form>
              )}

              {/* Authorized Username Profiles (Visible in Sign In mode) */}
              {config.showDemoLoginButtons && authMode === 'signin' && (
                <div className="mt-8 pt-5 border-t border-white/10 text-center relative z-10">
                  <p className="text-[10px] font-mono text-white/60 uppercase tracking-widest mb-2.5 font-medium">
                    Authorized Quick Profiles
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] bg-black/40 backdrop-blur-md p-3 rounded-full border border-white/10">
                    <button
                      type="button"
                      onClick={() => { setEmail('sateesh2000'); setPassword(''); }}
                      className="text-white/80 hover:text-gold-300 cursor-pointer font-sans transition-colors"
                    >
                      Admin: <strong className="text-gold-300 font-mono">sateesh2000</strong>
                    </button>
                    <span className="text-white/30 font-mono">•</span>
                    <button
                      type="button"
                      onClick={() => { setEmail('vansh2000'); setPassword(''); }}
                      className="text-white/80 hover:text-gold-300 cursor-pointer font-sans transition-colors"
                    >
                      Editor: <strong className="text-gold-300 font-mono">vansh2000</strong>
                    </button>
                    <span className="text-white/30 font-mono">•</span>
                    <button
                      type="button"
                      onClick={() => { setEmail('kk@weddingbykk.com'); setPassword(''); }}
                      className="text-white/80 hover:text-gold-300 cursor-pointer font-sans transition-colors"
                    >
                      Studio: <strong className="text-gold-300 font-mono">kk@weddingbykk.com</strong>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
