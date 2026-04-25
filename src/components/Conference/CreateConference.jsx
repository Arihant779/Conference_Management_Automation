import React, { useState } from 'react';
import { Sparkles, ArrowRight, CheckCircle, Clock, MapPin, AlignLeft, Calendar, Terminal, Briefcase, Palette, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const CreateConference = ({ onCancel, onSuccess }) => {
  const { user, fetchConferences, theme } = useApp();
  const isDark = theme === 'dark';
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoveredTemplate, setHoveredTemplate] = useState(null);

  const templateData = {
    modern: {
      title: "Vanguard",
      tag: "Best for Modern Tech Events",
      desc: "Clean, minimalist aesthetic with fluid motion and high-end typography.",
      features: ["Glassmorphism", "Soft Gradients", "Adaptive Layout"],
      accent: "from-amber-400 to-amber-600"
    },
    classic: {
      title: "Nexus",
      tag: "Best for Academic & Research",
      desc: "A timeless, reliable structure that prioritizes content and readability.",
      features: ["Print-Focus", "Elegant Serif", "Structured Sched."],
      accent: "from-slate-400 to-slate-200"
    },
    tech: {
      title: "Terminal",
      tag: "Best for Hackathons & IT",
      desc: "Ultra-dark HUD style with terminal vibes and aggressive neon accents.",
      features: ["Cyber Gradient", "Animated Grid", "Code Aesthetics"],
      accent: "from-[#00ff88] to-emerald-600"
    },
    business: {
      title: "Elite",
      tag: "Best for Corporate Summits",
      desc: "Premium, formal design with deep navy tones and structured sections.",
      features: ["Navy Professional", "Card Accents", "Formal Type"],
      accent: "from-slate-800 to-slate-900"
    },
    creative: {
      title: "Prism",
      tag: "Best for Arts & Festivals",
      desc: "Vibrant, fluid layouts with animated aurora backgrounds and bold colors.",
      features: ["Aurora FX", "Mesh Gradients", "Fluid Shapes"],
      accent: "from-[#8b5cf6] via-[#ec4899] to-[#06b6d4]"
    }
  };

  const [data, setData] = useState({
    title: '',
    theme: '',
    location: '',
    start_date: '',
    end_date: '',
    description: '',
    template: 'modern',
    banner_url: '',
    is_published: true, // Default to publish now
  });

  const update = (field) => (e) => setData((prev) => ({ ...prev, [field]: e.target.value }));
  const togglePublish = (val) => setData((prev) => ({ ...prev, is_published: val }));

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Date Validation
    if (data.start_date < today) {
      setError('Start date cannot be in the past.');
      setLoading(false);
      return;
    }

    if (data.end_date && data.end_date < data.start_date) {
      setError('End date must be on or after the start date.');
      setLoading(false);
      return;
    }

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('conference')
        .insert({
          title: data.title,
          theme: data.theme,
          description: data.description,
          location: data.location,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          template: data.template,
          banner_url: data.banner_url || null,
          conference_head_id: user?.id ?? null,
          is_published: data.is_published,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { error: roleError } = await supabase.rpc('add_conference_organizer', {
        p_conference_id: inserted.conference_id,
      });
      if (roleError) throw roleError;

      await fetchConferences();
      onSuccess(inserted);
    } catch (err) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = data.title && data.theme && data.start_date && data.location && (data.start_date >= today);

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 md:p-8 transition-colors duration-500 ${isDark ? 'bg-[#04070D] text-white' : 'bg-[#F8FAFC] text-slate-800'}`} 
         style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      
      {/* Background elements */}
      <div className={`fixed inset-0 pointer-events-none opacity-20 transition-opacity duration-500`}
        style={{ backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] mix-blend-overlay"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`max-w-6xl w-full border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10 min-h-[700px] transition-all duration-500 ${
          isDark ? 'bg-[#080B12] border-white/5 shadow-black/40' : 'bg-white border-zinc-200 shadow-zinc-200/50'
        }`}
      >
        {/* Mobile Close Button */}
        <button 
          type="button"
          onClick={onCancel}
          className={`absolute top-6 right-6 z-50 md:hidden w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-md border transition-all ${
            isDark ? 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10' : 'bg-zinc-100 border-zinc-200 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200'
          }`}
        >
          <X size={18} />
        </button>
        
        {/* Sidebar */}
        <div className={`w-full md:w-[35%] p-8 md:p-12 border-r flex flex-col relative overflow-hidden transition-all duration-500 ${
          isDark ? 'bg-black/20 border-white/5' : 'bg-zinc-50 border-zinc-100'
        }`}>
          {/* Accent Line */}
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-amber-700" />
          
          <div className="mb-auto relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 flex items-center justify-center rounded-xl">
                <Sparkles className="text-amber-500 w-6 h-6" />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase">Studio</span>
            </div>

            <h2 className={`text-4xl font-black mb-4 tracking-tighter uppercase leading-none transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              Create Event
            </h2>
            <p className={`font-medium text-sm leading-relaxed mb-12 transition-colors ${isDark ? 'text-white/40' : 'text-zinc-500'}`}>
              Design a world-class experience for your attendees in just a few steps.
            </p>

            <div className="space-y-8">
              {[
                { num: 1, label: 'Basic Details', sub: 'Name, date, and theme' },
                { num: 2, label: 'Look & Feel', sub: 'Branding and cover' },
              ].map(({ num, label, sub }, i) => (
                <div key={num} className="flex items-start gap-4 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-500 border
                      ${step >= num 
                        ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' 
                        : (isDark ? 'bg-white/5 text-white/20 border-white/5' : 'bg-zinc-100 text-zinc-300 border-zinc-200')
                      }`}>
                      {num}
                    </div>
                    {i === 0 && (
                      <div className={`w-px h-12 mt-2 transition-colors duration-500 ${step > 1 ? 'bg-amber-500/50' : (isDark ? 'bg-white/5' : 'bg-zinc-200')}`} />
                    )}
                  </div>
                  <div className="pt-1">
                    <span className={`block font-black uppercase tracking-widest text-xs transition-colors duration-500 ${step >= num ? (isDark ? 'text-white' : 'text-zinc-900') : (isDark ? 'text-white/20' : 'text-zinc-300')}`}>
                      {label}
                    </span>
                    <span className={`text-[10px] font-medium uppercase tracking-wider transition-colors duration-500 ${step >= num ? (isDark ? 'text-white/40' : 'text-zinc-500') : (isDark ? 'text-white/10' : 'text-zinc-300')}`}>
                      {sub}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button 
            type="button"
            onClick={onCancel} 
            className={`hidden md:flex text-[10px] font-black uppercase tracking-[0.2em] transition-all items-center gap-3 mt-12 group relative z-10 ${
              isDark ? 'text-white/30 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
              isDark ? 'border-white/5 group-hover:border-white/20' : 'border-zinc-200 group-hover:border-zinc-300'
            }`}>
              <ArrowRight className="rotate-180 w-4 h-4" />
            </div>
            Cancel & Exit
          </button>
        </div>

        {/* Form Area */}
        <div className={`flex-1 p-8 md:p-12 lg:p-16 flex flex-col transition-colors duration-500 ${
          isDark ? 'bg-[#080B12]/40' : 'bg-zinc-50/50'
        }`}>
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col max-w-2xl">
            
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8 flex-1"
                >
                  <div className="space-y-1">
                    <h3 className={`text-2xl font-black uppercase tracking-tighter leading-none transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                      Conference Essentials
                    </h3>
                    <p className={`text-xs font-semibold uppercase tracking-widest transition-colors ${isDark ? 'text-white/30' : 'text-zinc-400'}`}>
                      Set the foundation for your event
                    </p>
                  </div>

                  <div className="space-y-6">
                    <Field label="Conference Name" required isDark={isDark}>
                      <Input 
                        required 
                        isDark={isDark}
                        value={data.title} 
                        onChange={update('title')} 
                        placeholder="e.g. Future Tech Summit 2025" 
                        icon={<Sparkles size={16} />}
                      />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field label="Topic / Theme" required isDark={isDark}>
                        <Input 
                          required 
                          isDark={isDark}
                          value={data.theme} 
                          onChange={update('theme')} 
                          placeholder="e.g. AI Ethics" 
                          icon={<AlignLeft size={16} />}
                        />
                      </Field>
                      <Field label="Start Date" required isDark={isDark}>
                        <Input 
                          required 
                          isDark={isDark}
                          type="date" 
                          value={data.start_date} 
                          onChange={update('start_date')} 
                          min={today} 
                          className={isDark ? "[color-scheme:dark]" : "[color-scheme:light]"}
                          icon={<Calendar size={16} />}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field label="End Date (optional)" isDark={isDark}>
                        <Input 
                          isDark={isDark}
                          type="date" 
                          value={data.end_date} 
                          onChange={update('end_date')} 
                          min={data.start_date || today} 
                          className={isDark ? "[color-scheme:dark]" : "[color-scheme:light]"}
                          icon={<Clock size={16} />}
                        />
                      </Field>
                      <Field label="Location" required isDark={isDark}>
                        <Input 
                          required 
                          isDark={isDark}
                          value={data.location} 
                          onChange={update('location')} 
                          placeholder="City, Country or Online" 
                          icon={<MapPin size={16} />}
                        />
                      </Field>
                    </div>

                    <Field label="Description" isDark={isDark}>
                      <textarea
                        className={`w-full px-5 py-4 border rounded-2xl transition-all outline-none font-bold shadow-inner h-32 resize-none ${
                          isDark 
                            ? 'bg-white/[0.04] border-white/5 focus:border-amber-500/50 focus:bg-white/[0.06] text-white placeholder:text-white/5' 
                            : 'bg-zinc-100/50 border-zinc-200 focus:border-amber-500/50 focus:bg-white text-zinc-900 placeholder:text-zinc-300'
                        }`}
                        value={data.description}
                        onChange={update('description')}
                        placeholder="What is this event about?"
                      />
                    </Field>
                  </div>

                  {error && (
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/5 p-3 rounded-lg border border-red-500/10">
                      {error}
                    </p>
                  )}

                  <div className="pt-8 flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={!canProceed}
                      className="bg-amber-500 text-black font-black px-10 py-4 rounded-xl uppercase tracking-[0.2em] text-sm hover:bg-amber-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all flex items-center gap-3 shadow-2xl shadow-amber-500/10"
                    >
                      Next Step <ArrowRight size={18} />
                    </motion.button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8 flex-1 flex flex-col"
                >
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">
                      Visual Identity
                    </h3>
                    <p className="text-white/30 text-xs font-semibold uppercase tracking-widest">
                      Customize how your event looks
                    </p>
                  </div>

                  <div className="space-y-8">
                    <Field label="Banner Image URL" isDark={isDark}>
                      <Input 
                        isDark={isDark}
                        value={data.banner_url} 
                        onChange={update('banner_url')} 
                        placeholder="https://..." 
                        icon={<Sparkles size={16} />}
                      />
                    </Field>

                    <div className="space-y-4">
                      <label className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 transition-colors ${isDark ? 'text-white/30' : 'text-zinc-400'}`}>
                        Select Template
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
                        {/* Preview Overlay */}
                        <AnimatePresence>
                          {hoveredTemplate && (
                            <motion.div
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute -top-48 left-0 right-0 z-50 pointer-events-none md:block hidden"
                            >
                              <div className={`mx-auto max-w-sm border rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-3xl transition-all duration-500 ${
                                isDark ? 'bg-[#0a0f1a] border-white/10' : 'bg-white border-zinc-200'
                              }`}>
                                <div className={`h-1.5 w-12 rounded-full bg-gradient-to-r ${templateData[hoveredTemplate].accent} mb-4`} />
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                                    {templateData[hoveredTemplate].title} Template
                                  </span>
                                  <span className={`text-[8px] font-bold uppercase transition-colors ${isDark ? 'text-white/30' : 'text-zinc-400'}`}>Preview</span>
                                </div>
                                <h4 className={`text-lg font-black mb-2 leading-tight uppercase tabular-nums tracking-tighter transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                  {templateData[hoveredTemplate].tag}
                                </h4>
                                <p className={`text-[10px] leading-relaxed mb-4 font-medium italic transition-colors ${isDark ? 'text-white/50' : 'text-zinc-500'}`}>
                                  "{templateData[hoveredTemplate].desc}"
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {templateData[hoveredTemplate].features.map(f => (
                                    <span key={f} className={`text-[7px] font-black uppercase border px-2 py-1 rounded-md transition-colors ${
                                      isDark ? 'border-white/5 bg-white/5 text-white/40' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                                    }`}>
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {['modern', 'classic', 'tech', 'business', 'creative'].map((t) => (
                          <motion.div
                            key={t}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onMouseEnter={() => setHoveredTemplate(t)}
                            onMouseLeave={() => setHoveredTemplate(null)}
                            onClick={() => setData((prev) => ({ ...prev, template: t }))}
                            className={`cursor-pointer group flex flex-col p-4 border rounded-2xl transition-all duration-300 relative
                              ${data.template === t 
                                ? 'bg-amber-500/10 border-amber-500/50' 
                                : (isDark ? 'bg-white/[0.04] border-white/5 hover:border-white/10 hover:bg-white/[0.06]' : 'bg-zinc-100/50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100')
                              }`}
                          >
                            <div className={`h-24 rounded-xl mb-4 transition-all duration-500 flex items-center justify-center
                              ${t === 'modern' ? 'bg-gradient-to-br from-amber-500 to-amber-700' 
                                : t === 'classic' ? 'bg-[#e2e2e2]' 
                                : t === 'tech' ? 'bg-[#080c10] border border-[#00ff8840]'
                                : t === 'business' ? 'bg-[#01050e] border border-white/10'
                                : t === 'creative' ? 'bg-gradient-to-tr from-[#8b5cf6] via-[#ec4899] to-[#06b6d4] opacity-80'
                                : 'bg-black/40 border border-white/5'
                            }`} >
                              {t === 'tech' && <Terminal size={24} className="text-[#00ff88]" />}
                              {t === 'business' && <Briefcase size={24} className="text-white" />}
                              {t === 'creative' && <Palette size={24} className="text-white" />}
                            </div>
                            <span className={`font-black uppercase tracking-widest text-[9px] ${data.template === t ? 'text-amber-500' : (isDark ? 'text-white/40 group-hover:text-white/60' : 'text-zinc-500 group-hover:text-zinc-900')}`}>
                              {t}
                            </span>
                            <div className={`absolute top-2 right-2 w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300
                              ${data.template === t ? 'border-amber-500 bg-amber-500' : 'border-white/10'}`}>
                              {data.template === t && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 transition-colors ${isDark ? 'text-white/30' : 'text-zinc-400'}`}>
                        Publish Visibility
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {[
                          { val: true, label: 'Publish Now', sub: 'Visible in Explore immediately' },
                          { val: false, label: 'Publish Later', sub: 'Hidden until you manually publish' }
                        ].map(({ val, label, sub }) => (
                          <motion.div
                            key={val.toString()}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => togglePublish(val)}
                            className={`cursor-pointer group flex flex-col p-5 border rounded-2xl transition-all duration-300 relative
                              ${data.is_published === val 
                                ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.05)]' 
                                : (isDark ? 'bg-white/[0.04] border-white/5 hover:border-white/10 hover:bg-white/[0.06]' : 'bg-zinc-100/50 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-100')
                              }`}
                          >
                            <div className="flex items-center gap-3 mb-1">
                              <span className={`font-black uppercase tracking-widest text-xs ${data.is_published === val ? 'text-amber-500' : (isDark ? 'text-white/60 group-hover:text-white' : 'text-zinc-500 group-hover:text-zinc-900')}`}>
                                {label}
                              </span>
                              {data.is_published === val && <CheckCircle size={14} className="text-amber-500" />}
                            </div>
                            <span className={`text-[10px] font-medium uppercase tracking-wider ${data.is_published === val ? (isDark ? 'text-white/40' : 'text-zinc-500') : (isDark ? 'text-white/10' : 'text-zinc-300')}`}>
                              {sub}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/5 p-3 rounded-lg border border-red-500/10 mt-6">
                      {error}
                    </p>
                  )}

                  <div className="mt-auto pt-12 flex items-center justify-between">
                    <button 
                      type="button" 
                      onClick={() => setStep(1)} 
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hover:text-white transition-all px-4"
                    >
                      Back
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={loading}
                      className="bg-amber-500 text-black font-black px-12 py-4 rounded-xl uppercase tracking-[0.2em] text-sm hover:bg-amber-400 disabled:opacity-20 disabled:cursor-not-allowed shadow-2xl shadow-amber-500/20 transition-all flex items-center gap-3"
                    >
                      <CheckCircle size={18} />
                      {loading ? 'Launching…' : 'Launch Event'}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const Field = ({ label, children, required = false, isDark = true }) => (
  <div className="space-y-2 group">
    <label className={`text-[10px] font-black uppercase tracking-[0.2em] ml-2 group-focus-within:text-amber-500/50 transition-colors ${
      isDark ? 'text-white/30' : 'text-zinc-400'
    }`}>
      {label} {required && <span className="text-amber-500 ml-1">*</span>}
    </label>
    {children}
  </div>
);

const Input = ({ className = '', icon, isDark = true, ...props }) => (
  <div className="relative group/input">
    {icon && (
      <div className={`absolute left-5 top-1/2 -translate-y-1/2 group-focus-within/input:text-amber-500/50 transition-colors ${
        isDark ? 'text-white/20' : 'text-zinc-300'
      }`}>
        {icon}
      </div>
    )}
    <input
      className={`w-full ${icon ? 'pl-12 pr-5' : 'px-5'} py-4 border rounded-2xl group-focus-within/input:border-amber-500/50 transition-all outline-none font-bold shadow-inner ${
        isDark 
          ? 'bg-white/[0.04] border-white/5 group-focus-within/input:bg-white/[0.06] text-white placeholder:text-white/5' 
          : 'bg-zinc-100/50 border-zinc-200 group-focus-within/input:bg-white text-zinc-900 placeholder:text-zinc-300'
      } ${className}`}
      {...props}
    />
  </div>
);

export default CreateConference;