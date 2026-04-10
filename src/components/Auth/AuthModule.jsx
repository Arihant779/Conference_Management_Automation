import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

/* ── Isometric Graphic Component ── */
const IsometricGraphic = () => {
  const blocks = [
    { text: 'CON', x: -40, y: -100 },
    { text: 'FER', x: 20, y: 0 },
    { text: 'ENCE', x: -20, y: 100 },
  ];

  return (
    <div className="relative w-full h-full flex items-center justify-center p-12 overflow-hidden select-none">
      {/* Dynamic Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.03] rotate-12 scale-150" style={{ backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
      
      <div className="relative transform rotate-[-10deg] skew-x-[10deg] scale-100 md:scale-110 lg:scale-125">
        {blocks.map((block, bi) => (
          <motion.div 
            key={bi} 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: bi * 0.1, duration: 1 }}
            className="relative"
            style={{ transform: `translate(${block.x}px, ${block.y}px)` }}
          >
            <div className="flex">
              {block.text.split('').map((letter, li) => (
                <div key={li} className="relative inline-block mx-0.5">
                  {/* Depth Layers (Amber/Orange gradient) */}
                  {[...Array(10)].map((_, depth) => (
                    <span 
                      key={depth}
                      className="absolute left-0 top-0 font-black text-7xl md:text-8xl lg:text-9xl leading-tight"
                      style={{ 
                        color: depth === 9 ? '#fbbf24' : depth > 5 ? '#b45309' : '#78350f',
                        zIndex: 20 - depth,
                        transform: `translate(${depth * 1.5}px, ${depth * 1.5}px)`,
                        textShadow: depth === 9 ? '0 0 20px rgba(251,191,36,0.2)' : 'none'
                      }}
                    >
                      {letter}
                    </span>
                  ))}
                  {/* Invisible spacer */}
                  <span className="font-black text-7xl md:text-8xl lg:text-9xl leading-tight opacity-0 select-none">
                    {letter}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Decorative elements */}
        <div className="absolute -top-10 -right-20 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-20 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

const AuthModule = ({ onSuccess }) => {
  const { setUser } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuthSuccess = (user) => {
    setUser(user);
    if (onSuccess) onSuccess(user);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });
        if (err) throw err;
        handleAuthSuccess(data.user);
      } else {
        if (!formData.name || !formData.email || !formData.password) throw new Error("All fields are required");
        const { data, error: err } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        });
        if (err) throw err;
        await supabase.from("users").insert({ user_id: data.user.id, user_name: formData.name });
        handleAuthSuccess(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      <div className="w-full md:w-[45%] lg:w-[35%] h-full flex flex-col p-8 md:p-12 lg:p-16 border-r border-white/5 relative z-20 bg-[#080B12]">
        
        <div className="mb-auto">
          <div className="flex items-center gap-2 mb-10">
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
          >
            <h1 className="text-4xl lg:text-5xl font-black text-white mb-2 tracking-tighter uppercase leading-none">
              {isLogin ? 'Sign In' : 'Create'}
            </h1>
            <p className="text-white/40 font-medium text-sm mb-8">
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

              {error && <p className="text-xs font-bold text-red-500 uppercase tracking-widest">{error}</p>}

              <div className="pt-2 space-y-4">
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-amber-500 text-black font-black py-4 uppercase tracking-[0.2em] text-sm hover:bg-amber-400 transition-all flex items-center justify-center gap-3 group rounded-xl shadow-2xl shadow-amber-500/20"
                  disabled={loading}
                >
                  {loading ? 'Please wait...' : isLogin ? 'Login' : 'Signup'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </motion.button>

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
              </div>
            </form>
          </motion.div>
        </div>

        <div className="mt-12 flex items-center justify-between">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors flex items-center gap-2"
          >
            {isLogin ? 'Create account' : 'Already have an account?'}
            {isLogin ? <ArrowRight size={12} /> : <ArrowLeft size={12} />}
          </button>
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
           <IsometricGraphic />
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