import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Mail, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../utils/api';
import ConferenceHero from './ConferenceHero';


const AuthModule = ({ onSuccess }) => {
  const { setUser } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  const scrollContainerRef = useRef(null);

  // Reset scroll position when toggling views
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [isLogin]);

  const handleAuthSuccess = (user) => {
    setUser(user);
    if (onSuccess) onSuccess(user);
  };

  const handleSendOtp = async () => {
    // 1. Pre-fetch Validation: Check email format (Stricter regex for TLD length)
    const emailRegex = /^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+\.[a-zA-z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address (e.g. name@company.com)");
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Backend server error: Received non-JSON response. Please check if the backend is running at " + API_BASE_URL);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send verification code');
      
      setShowOtp(true);
      setVerificationPending(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Verify OTP with backend
      const verifyRes = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp })
      });
      
      const verifyContentType = verifyRes.headers.get("content-type");
      if (!verifyContentType || !verifyContentType.includes("application/json")) {
        throw new Error("Verification failed: Unexpected server response.");
      }

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Invalid verification code');

      // 2. Proceed with Backend Registration (which handles auth + profile)
      const regRes = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email, 
          password: formData.password, 
          name: formData.name 
        })
      });
      
      const regContentType = regRes.headers.get("content-type");
      if (!regContentType || !regContentType.includes("application/json")) {
        throw new Error("Registration failed: Unexpected server response.");
      }

      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || 'Signup failed');

      // Success! Auto-login or notify success
      // Since supabase.auth.signUp wasn't called on frontend, session isn't automatic.
      // We should probably tell them to log in, OR perform a login now.
      
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (loginErr) throw loginErr;
      handleAuthSuccess(loginData.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      setLoading(true);
      try {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (err) throw err;
        handleAuthSuccess(data.user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      // Signup Flow
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        setError("All fields are required");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      // First time clicking signup -> Send OTP
      if (!showOtp) {
        await handleSendOtp();
      } else {
        // Already showing OTP -> Verify and finish
        await handleVerifyAndSignup(e);
      }
    }
  };

  const handleGoogleLogin = async () => {
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (err) setError(err.message);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#04070D] text-white" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>

      {/* LEFT: FORM PANEL */}
      <div 
        ref={scrollContainerRef}
        className={`w-full md:w-[45%] lg:w-[35%] h-full flex flex-col p-6 pb-6 md:p-12 md:pb-12 lg:p-16 lg:pb-16 border-r border-white/5 relative z-20 bg-[#080B12] overflow-y-auto no-scrollbar`}
      >

        {/* Textures */}
        <div className="fixed inset-0 pointer-events-none opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
          style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />

        <div className="relative z-10 mb-auto flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 mb-10 w-full">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center rounded-xl">
              <Sparkles className="text-amber-500 w-6 h-6" />
            </div>
            <span className="text-xl font-black text-white tracking-tighter">CONF MANAGER</span>
          </div>

          <motion.div
            key={isLogin ? 'login' : 'register'}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center w-full"
          >
            <h1 className="text-4xl lg:text-5xl font-black text-white mb-2 tracking-tighter uppercase leading-none text-center">
              {isLogin ? 'Sign In' : 'Create'}
            </h1>
            <p className="text-white/40 font-medium text-sm mb-12 text-center">
              {isLogin ? 'Access your dashboard' : 'Join the conference managers portal'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5 text-left">
              <AnimatePresence mode="popLayout">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-2 group"
                  >
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Full Name</label>
                    <input
                      type="text"
                      placeholder="Mike Maloney"
                      className="w-full px-5 py-4 bg-white/[0.04] border border-white/5 rounded-2xl group-focus-within:border-amber-500/50 group-focus-within:bg-white/[0.06] transition-all outline-none text-white font-bold placeholder:text-white/5 shadow-inner"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Email Address</label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full px-5 py-4 bg-white/[0.04] border border-white/5 rounded-2xl group-focus-within:border-amber-500/50 group-focus-within:bg-white/[0.06] transition-all outline-none text-white font-bold placeholder:text-white/5 shadow-inner"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-white/[0.04] border border-white/5 rounded-2xl group-focus-within:border-amber-500/50 group-focus-within:bg-white/[0.06] transition-all outline-none text-white font-bold placeholder:text-white/5 shadow-inner"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <AnimatePresence mode="popLayout">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-2 group"
                  >
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Confirm Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-5 py-4 bg-white/[0.04] border border-white/5 rounded-2xl group-focus-within:border-amber-500/50 group-focus-within:bg-white/[0.06] transition-all outline-none text-white font-bold placeholder:text-white/5 shadow-inner"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="popLayout">
                {showOtp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 group"
                  >
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 ml-2">Verification Code</label>
                    <input
                      type="text"
                      placeholder="Enter 6-digit code"
                      className="w-full px-5 py-4 bg-amber-500/[0.05] border border-amber-500/20 rounded-2xl focus:border-amber-500 transition-all outline-none text-white font-bold placeholder:text-white/10 shadow-inner"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                    />
                    <p className="text-[9px] text-white/40 ml-2">We've sent a code to your email.</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>}

              <div className="pt-2 space-y-4">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-amber-500 text-black font-black py-4 uppercase tracking-[0.2em] text-sm hover:bg-amber-400 transition-all flex items-center justify-center gap-3 group rounded-xl shadow-2xl shadow-amber-500/20"
                  disabled={loading}
                >
                  {loading ? 'Please wait...' : isLogin ? 'Login' : showOtp ? 'Verify & Signup' : 'Get Verification Code'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>

                {isLogin && (
                  <>
                    <div className="text-center py-2">
                      <span className="text-[10px] font-black text-white/5 uppercase tracking-[0.3em]">OR</span>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.03)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleGoogleLogin}
                      type="button"
                      className="w-full py-4 border border-white/10 text-white font-bold uppercase tracking-[0.1em] text-[10px] flex items-center justify-center gap-3 hover:border-white/20 transition-all rounded-xl"
                    >
                      <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-4 h-4" />
                      Continue with Google
                    </motion.button>
                  </>
                )}
              </div>
            </form>
          </motion.div>
        </div>

        <div className="mt-auto pt-10 mb-4 flex items-center justify-between">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-[12px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors flex items-center gap-2"
          >
            {isLogin ? 'Create account' : 'Already have an account?'}
            {isLogin ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
          </button>
          {!isLogin && showOtp && (
            <button
              onClick={() => {
                setShowOtp(false);
                setOtp('');
              }}
              className="text-[10px] font-bold uppercase tracking-widest text-amber-500/50 hover:text-amber-500 transition-colors"
            >
              Change Email
            </button>
          )}
        </div>
      </div>

      {/* RIGHT: GRAPHIC PANEL */}
      <div className="hidden md:block flex-1 bg-[#020408] h-full overflow-hidden relative">
        {/* Cinematic Lighting */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-[60vw] h-[60vw] bg-amber-500/[0.08] blur-[150px] rounded-full" />
          <div className="absolute bottom-1/4 right-0 w-[40vw] h-[40vw] bg-blue-500/[0.05] blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 h-full w-full">
          <ConferenceHero />
        </div>

        {/* Floating Accents */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [Math.random() * 20, Math.random() * -20],
              opacity: [0.1, 0.2, 0.1]
            }}
            transition={{ duration: 5 + i * 2, repeat: Infinity, repeatType: 'reverse' }}
            className="absolute pointer-events-none"
            style={{
              left: `${10 + Math.random() * 80}%`,
              top: `${10 + Math.random() * 80}%`
            }}
          >
            <div className={`rounded-full border border-white/5 ${i % 2 === 0 ? 'w-24 h-24' : 'w-48 h-1 bg-gradient-to-r from-amber-500/20 to-transparent'}`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AuthModule;