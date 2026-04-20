import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useTransform, useMotionValue } from 'framer-motion';
import {
  MapPin, Calendar, Users, Mail, Phone, Globe,
  Twitter, Linkedin, Edit3, Check, X, Plus, Save, AlertCircle, Clock,
  ArrowRight, Sparkles, Zap, Target, Heart, MousePointer2, Paintbrush,
  Trash2, ExternalLink, ChevronDown, Monitor, Palette, Star
} from 'lucide-react';
import ScheduleEditor from '../ScheduleEditor';
import ConferenceRegistration from './../ConferenceRegistration';

const T = {
  primary: '#f5c518', // Amber
  secondary: '#fbbf24', // Gold
  accent: '#fcd34d', // Light Amber
  bg: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  glass: 'rgba(255, 255, 255, 0.4)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
};

/* ─────────────────────────────────────────────────────────────
   PRISM_UI_COMPONENTS
   ───────────────────────────────────────────────────────────── */

const MeshGradient = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
    <div className="absolute top-[-20%] left-[-10%] w-[80vw] h-[80vw] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(245,197,24,0.3) 0%, transparent 70%)', filter: 'blur(80px)' }}
    />
    <div className="absolute bottom-[-10%] right-[-5%] w-[70vw] h-[70vw] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.2) 0%, transparent 70%)', filter: 'blur(100px)' }}
    />
    <div className="absolute top-[20%] right-[10%] w-[50vw] h-[50vw] rounded-full"
      style={{ background: 'radial-gradient(circle, rgba(252,211,77,0.2) 0%, transparent 70%)', filter: 'blur(120px)' }}
    />
  </div>
);

const PrismCard = ({ children, className = '', style = {}, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 30 }}
    whileInView={{ opacity: 1, scale: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    className={`relative rounded-[2.5rem] bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_32px_64px_-16px_rgba(31,38,135,0.07)] ${className}`}
    style={style}
  >
    {children}
  </motion.div>
);

const PrismButton = ({ children, onClick, variant = 'primary', className = '' }) => {
  const isPrimary = variant === 'primary';
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative px-8 py-4 rounded-2xl font-bold tracking-tight transition-all flex items-center justify-center gap-3 group overflow-hidden ${className}`}
      style={{
        background: isPrimary ? `linear-gradient(135deg, ${T.primary}, ${T.secondary})` : 'rgba(255, 255, 255, 0.8)',
        color: isPrimary ? '#ffffff' : T.text,
        border: isPrimary ? 'none' : '1px solid rgba(255, 255, 255, 0.5)',
        boxShadow: isPrimary ? '0 20px 40px -10px rgba(245, 197, 24, 0.3)' : '0 10px 20px -5px rgba(0,0,0,0.05)',
      }}
    >
      <div className="relative z-10 flex items-center gap-2">
        {children}
      </div>
      {isPrimary && (
        <motion.div
          className="absolute inset-0 z-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      )}
    </motion.button>
  );
};

const EditableField = ({ value, onChange, isEditing, multiline = false, placeholder = '...' }) => {
  const [local, setLocal] = useState(value || '');
  useEffect(() => setLocal(value || ''), [value]);
  if (!isEditing) return <span>{value || placeholder}</span>;
  const style = {
    background: 'rgba(255, 255, 255, 0.6)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: 16,
    padding: '12px 16px',
    color: T.text,
    width: '100%',
    fontFamily: 'inherit',
    outline: 'none',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
  };
  return multiline ? (
    <textarea value={local} onChange={e => setLocal(e.target.value)} onBlur={() => onChange(local)} style={style} rows={3} />
  ) : (
    <input value={local} onChange={e => setLocal(e.target.value)} onBlur={() => onChange(local)} style={style} />
  );
};

/* ─────────────────────────────────────────────────────────────
   PRISM_TEMPLATE
   ───────────────────────────────────────────────────────────── */

const CreativeTemplate = ({
  conf: initialConf,
  isOrganizer = false,
  onSave,
  canEditSchedule = false,
  currentUser = null,
  onScheduleSave,
  onSwitchToTab = null,
  onDelete = null,
  isGuest = false,
  onRequireAuthForRegister = null,
  autoOpenRegister = false,
}) => {
  const [conf, setConf] = useState(initialConf);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [activeNav, setActiveNav] = useState('about');
  const [scheduleDay, setScheduleDay] = useState(0);
  const [showReg, setShowReg] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const containerRef = useRef(null);
  const scrollAreaRef = useRef(null);
  useEffect(() => { scrollAreaRef.current = document.getElementById('scroll-area'); }, []);
  const { scrollY } = useScroll({ container: scrollAreaRef });
  const { scrollYProgress } = useScroll({ container: containerRef });
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  const heroY = useTransform(scrollY, [0, 1000], [0, 200]);
  const heroOpacity = useTransform(scrollY, [0, 800], [1, 0]);

  useEffect(() => {
    const el = document.getElementById('scroll-area');
    if (!el) return;
    const handleScroll = () => setScrolled(el.scrollTop > 50);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { if (autoOpenRegister && !isGuest) setShowReg(true); }, [autoOpenRegister, isGuest]);

  const [pageData, setPageData] = useState({
    title: initialConf.title || 'THE CREATIVE SPECTRUM',
    tagline: initialConf.tagline || 'Defining the Intersection of Art, Tech & Innovation',
    banner_url: initialConf.banner_url || '',
    contact_email: initialConf.contact_email || 'hello@prism-events.com',
    contact_phone: initialConf.contact_phone || '+1 (888) PRISM-01',
    website: initialConf.website || 'https://prism-summit.io',
    twitter: initialConf.twitter || '@prism_summit',
    linkedin: initialConf.linkedin || '',
    schedule: initialConf.schedule || [],
    speakers: initialConf.speakers || [
      { name: 'Aria Prism', role: 'Chief Creative', org: 'Lumina Studio', img: 'https://i.pravatar.cc/150?img=32', bio: 'Pioneering new forms of digital expression through mesh-based neural art.' },
      { name: 'Xavier Flow', role: 'Experience Lead', org: 'Fluidity Inc', img: 'https://i.pravatar.cc/150?img=12', bio: 'Redefining user interactions in the metaverse and beyond.' },
    ],
    sponsors: initialConf.sponsors || [
      { name: 'Adobe', tier: 'platinum' },
      { name: 'Figma', tier: 'gold' },
    ],
    important_dates: initialConf.important_dates || [
      { label: 'Festival Launch', date: initialConf.start_date || 'TBD' },
    ],
    venue_name: initialConf.venue_name || 'The Prism Pavilion',
    venue_address: initialConf.venue_address || initialConf.location || 'Creativity Hub, LA',
    venue_description: initialConf.venue_description || 'A multi-sensory environment designed to spark imagination and fluid collaboration.',
    capacity: initialConf.capacity || '1000 Creators',
    map_url: initialConf.map_url || '',
    registration_fee_general: initialConf.registration_fee_general || '$299',
    registration_fee_student: initialConf.registration_fee_student || '$99',
    registration_fee_early: initialConf.registration_fee_early || '$199',
    about_extra: initialConf.about_extra || 'Join us for an immersive experience that blurs the lines between reality and imagination.',
    vibes: initialConf.vibes || ['Digital Art', 'UX Design', 'Generative Media', 'Visual Logic'],
  });

  const update = (k, v) => setPageData(p => ({ ...p, [k]: v }));
  const updateNested = (key, index, field, value) => {
    setPageData(p => {
      const arr = [...p[key]];
      arr[index] = { ...arr[index], [field]: value };
      return { ...p, [key]: arr };
    });
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      if (onSave) await onSave({ ...pageData, description: conf.description });
      setSaved(true); setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setSaveError(e.message || 'Error occurred'); }
    finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen text-[#0f172a] selection:bg-p-primary/20 overflow-x-hidden relative"
      style={{ background: '#fdfcfd', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── HIGH-END AMBIENT EFFECTS ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Aurora */}
        <div className="absolute -top-[20%] -left-[10%] w-[80vw] h-[80vw] rounded-full opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #f5c518 0%, #fbbf24 50%, transparent 70%)', filter: 'blur(100px)' }}
        />
        <div className="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #fcd34d 0%, #f5c518 50%, transparent 70%)', filter: 'blur(120px)' }}
        />
        {/* Subtle Mesh Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <MeshGradient />

      {/* ── MODALS ── */}
      <AnimatePresence>
        {showReg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-2xl bg-white/40">
            <PrismCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto !bg-white/90 shadow-2xl">
              <div className="p-8 border-b border-black/5 flex justify-between items-center">
                <h2 className="text-2xl font-extrabold tracking-tight">JOIN THE SPECTRUM</h2>
                <button onClick={() => setShowReg(false)} className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center transition-all"><X size={24} /></button>
              </div>
              <div className="p-8">
                <ConferenceRegistration conf={conf} currentUser={currentUser} onSuccess={() => setShowReg(false)} onBack={() => setShowReg(false)} />
              </div>
            </PrismCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScheduleEditor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-white/95 flex items-center justify-center p-4 md:p-12">
            <PrismCard className="w-full h-full max-w-7xl overflow-hidden flex flex-col border border-black/5">
              <div className="p-8 border-b border-black/5 flex justify-between items-center">
                <span className="text-sm font-bold uppercase tracking-widest text-p-primary">Schedule Architect</span>
                <button onClick={() => setShowScheduleEditor(false)} className="hover:rotate-90 transition-transform"><X size={32} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <ScheduleEditor initialSchedule={conf.schedule || []} conferenceId={conf.conference_id} onSave={async (s) => { await onScheduleSave(s); setShowScheduleEditor(false); }} onCancel={() => setShowScheduleEditor(false)} />
              </div>
            </PrismCard>
          </motion.div>
        )}
      </AnimatePresence>

      <div ref={containerRef} className="h-screen overflow-y-auto relative no-scrollbar" id="scroll-area">

        {/* ── ORGANIZER CONTROLS ── */}
        {isOrganizer && (
          <div className="sticky top-0 z-[150] w-full px-8 py-3 bg-white/60 backdrop-blur-md border-b border-black/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-p-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Prism: Core Control</span>
            </div>
            <div className="flex items-center gap-6">
              {saved && <span className="text-[10px] text-emerald-600 font-bold uppercase">Saved</span>}
              {isEditing ? (
                <div className="flex gap-6">
                  <button onClick={onDelete} className="text-[10px] text-rose-500 font-bold uppercase hover:underline">Delete</button>
                  <button onClick={() => setIsEditing(false)} className="text-[10px] text-slate-400 font-bold uppercase">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="text-[10px] text-p-primary font-bold uppercase hover:underline">{saving ? 'Syncing...' : 'Sync Changes'}</button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="text-[10px] text-p-primary font-bold uppercase hover:underline">Edit Mode</button>
              )}
            </div>
          </div>
        )}

        {/* ══════════ HERO SECTION ══════════ */}
        <section className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
           
           {/* Banner Image with Overlays */}
           {(pageData.banner_url || conf.banner_url) && (
              <div className="absolute inset-0 z-0 overflow-hidden">
                <motion.img 
                  initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 2 }}
                  src={pageData.banner_url || conf.banner_url} 
                  className="w-full h-full object-cover opacity-[0.45] mix-blend-luminosity" 
                  alt="" 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#fdfcfd]/10 via-transparent to-[#fdfcfd]" />
                <div className="absolute inset-0 bg-gradient-to-tr from-p-primary/10 via-transparent to-p-secondary/10" />
              </div>
           )}

           <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 flex flex-col items-center w-full">
           {/* Floating Geometric Elements */}
           <motion.div 
              animate={{ y: [0, -30, 0], rotate: [0, 45, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[15%] left-[10%] w-48 h-48 bg-gradient-to-br from-p-primary/5 to-p-accent/10 blur-3xl rounded-full"
            />
            <motion.div
              animate={{ y: [0, 40, 0], rotate: [0, -30, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              className="absolute bottom-[25%] right-[15%] w-64 h-64 bg-gradient-to-tr from-p-secondary/5 to-p-primary/10 blur-3xl rounded-full"
            />

            <div className="absolute top-[10%] left-[8%] w-32 h-32 text-p-primary/10 animate-bounce transition-all"><Sparkles size={120} /></div>
            <div className="absolute bottom-[20%] right-[12%] w-24 h-24 text-p-secondary/10 animate-spin transition-all" style={{ animationDuration: '10s' }}><Target size={90} /></div>

           <motion.div 
             initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }}
             className="relative z-10 text-center max-w-5xl"
           >
                {isEditing && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-12 w-full max-w-2xl mx-auto p-8 rounded-[2.5rem] bg-white/40 backdrop-blur-3xl border border-white/50 shadow-xl">
                    <div className="text-[12px] font-black uppercase tracking-[0.4em] text-p-primary mb-4">Background Identity Surface</div>
                    <EditableField 
                      value={pageData.banner_url} 
                      onChange={v => update('banner_url', v)} 
                      isEditing={isEditing} 
                      placeholder="Enter banner image URL (e.g. from Unsplash)..."
                    />
                  </motion.div>
                )}

                <motion.div 
                 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                 className="inline-flex items-center gap-4 px-10 py-4 rounded-full bg-white/40 border border-white focus-within:border-p-primary/50 backdrop-blur-3xl mb-16 shadow-[0_20px_50px_-20px_rgba(139,92,246,0.3)] group transition-all"
               >
                  <div className="w-8 h-8 rounded-full bg-p-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Sparkles size={16} className="text-p-primary" />
                  </div>
                  <span className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-600">
                     {conf.theme || 'The Annual Festival of Digital Imagination'}
                  </span>
               </motion.div>

              <h1 className="text-8xl md:text-[11rem] font-[950] tracking-tighter leading-[0.95] py-4 mb-12 text-transparent bg-clip-text bg-gradient-to-br from-p-accent via-p-primary to-p-secondary filter drop-shadow-[0_15px_30px_rgba(139,92,246,0.15)]">
                {isEditing ? (
                  <input value={pageData.title} onChange={e => update('title', e.target.value)} className="bg-transparent border-b-4 border-p-primary/20 text-center outline-none w-full" />
                ) : (pageData.title || 'PRISM')}
              </h1>

              <div className="text-xl md:text-4xl text-slate-500 font-bold tracking-tight mb-20 flex flex-wrap justify-center gap-2 max-w-4xl opacity-80 leading-snug">
                {isEditing ? (
                  <EditableField value={pageData.tagline} onChange={v => update('tagline', v)} isEditing />
                ) : pageData.tagline}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                 <PrismButton onClick={() => setShowReg(true)} className="w-full sm:min-w-[220px]">
                    Join the Spectrum <ArrowRight size={20} />
                 </PrismButton>
                 <PrismButton onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })} variant="secondary" className="w-full sm:min-w-[220px]">
                    Experience <MousePointer2 size={18} />
                 </PrismButton>
              </div>
            </motion.div>

            <div className="absolute bottom-16 left-0 right-0 px-12">
              <div className="flex flex-wrap items-center justify-between gap-12 border-t border-black/5 pt-12">
                {[
                  { l: 'DATE', v: pageData.important_dates[0].date, i: Calendar },
                  { l: 'SPACE', v: pageData.venue_name, i: MapPin },
                  { l: 'ATTENDEES', v: pageData.capacity, i: Users },
                ].map(({ l, v, i: Icon }) => (
                  <div key={l} className="flex items-center gap-6">
                    <div className="text-p-primary/40"><Icon size={24} /></div>
                    <div>
                      <div className="text-[9px] font-extrabold text-slate-300 tracking-[0.2em]">{l}</div>
                      <div className="text-sm font-bold text-slate-600 uppercase tracking-widest">{v}</div>
                    </div>
                  </div>
                ))}
                <div className="hidden lg:flex items-center gap-3">
                  {pageData.vibes.map((v, i) => (
                    <span key={i} className="px-4 py-1.5 rounded-full bg-black/5 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">#{v}</span>
                  ))}
                </div>
              </div>
           </div>
         </motion.div>
        </section>

        <nav className={`sticky top-0 z-[100] transition-all duration-500 ${scrolled ? 'py-4 bg-white/70 backdrop-blur-3xl border-b border-black/5' : 'py-10 bg-transparent border-transparent'}`}>
           <div className="max-w-7xl mx-auto px-10 flex items-center justify-between">
              <div className="flex gap-12 overflow-x-auto no-scrollbar">
                {['about', 'sessions', 'creators', 'location', 'partners'].map(id => (
                  <button key={id} onClick={() => { 
                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                      setActiveNav(id);
                    }}
                    className={`text-[10px] font-black uppercase tracking-[0.25em] transition-all relative ${activeNav === id ? 'text-p-primary' : 'text-slate-300 hover:text-slate-900'}`}
                  >
                    {id}
                    {activeNav === id && (
                      <motion.div layoutId="prism-dot" className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-p-primary" />
                    )}
                  </button>
                ))}
              </div>
              
              <PrismButton
                onClick={() => setShowReg(true)}
                className={`!py-2 !px-6 !text-[10px] transition-all duration-500 ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
              >
                Join the Spectrum
              </PrismButton>
           </div>
        </nav>

        <main className="max-w-7xl mx-auto px-6 md:px-10 py-20 md:py-48 space-y-24 md:space-y-64">

          {/* ══════════ ABOUT ══════════ */}
          <section id="about" className="scroll-mt-48">
             <div className="grid lg:grid-cols-2 gap-32 items-start">
                <div className="space-y-16">
                   <div className="space-y-6">
                      <span className="text-[11px] font-black text-p-secondary tracking-[0.3em] uppercase block">// THE GENESIS</span>
                      <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900">BRINGING<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-p-primary to-p-accent">COLOR</span> TO LOGIC.</h2>
                   </div>
                   <div className="text-2xl text-slate-500 font-light leading-relaxed space-y-12">
                      <p className="first-letter:text-8xl first-letter:font-black first-letter:text-p-primary first-letter:mr-6 first-letter:float-left">
                        {isEditing ? <EditableField value={conf.description} onChange={v => setConf(p => ({ ...p, description: v }))} multiline isEditing /> : conf.description}
                      </p>
                      <div className="p-1? rounded-[3rem] bg-gradient-to-br from-p-primary/5 to-p-secondary/5 p-12 border border-white/50 relative overflow-hidden group">
                         <div className="absolute -top-12 -right-12 w-32 h-32 bg-p-primary/10 blur-[50px] rounded-full group-hover:scale-150 transition-transform" />
                         <p className="relative z-10 text-slate-600 font-medium tracking-tight">
                            {isEditing ? <EditableField value={pageData.about_extra} onChange={v => update('about_extra', v)} multiline isEditing /> : pageData.about_extra}
                         </p>
                      </div>
                   </div>
                </div>

              <div className="relative">
                <div className="absolute -inset-10 bg-gradient-to-tr from-p-accent/20 via-p-primary/20 to-p-secondary/20 blur-[100px] opacity-30 rounded-full" />
                <PrismCard className="p-12 space-y-12">
                  <div className="flex items-center gap-4 border-b border-black/5 pb-8">
                    <div className="w-12 h-12 rounded-2xl bg-p-primary flex items-center justify-center text-white"><Zap size={24} /></div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pricing Model</span>
                      <h4 className="text-xl font-extrabold uppercase tracking-tight">Access Passes</h4>
                    </div>
                  </div>
                  <div className="space-y-8">
                    {[
                      { l: 'PRE-LAUNCH PASS', k: 'registration_fee_early', c: 'text-p-accent' },
                      { l: 'CREATOR PASS', k: 'registration_fee_general', c: 'text-p-primary' },
                      { l: 'STUDENT TIER', k: 'registration_fee_student', c: 'text-p-secondary' },
                    ].map(({ l, k, c }) => (
                      <div key={k} className="flex justify-between items-center group cursor-pointer">
                        <span className="text-[11px] font-black text-slate-300 tracking-widest uppercase group-hover:text-slate-900 transition-colors">{l}</span>
                        <div className="h-[1px] flex-1 mx-4 bg-black/[0.03] group-hover:bg-p-primary/20 transition-all" />
                        <span className={`text-4xl font-black ${c} group-hover:scale-110 transition-transform`}>
                          {isEditing ? <EditableField value={pageData[k]} onChange={v => update(k, v)} isEditing /> : pageData[k]}
                        </span>
                      </div>
                    ))}
                    <PrismButton onClick={() => setShowReg(true)} className="w-full !rounded-[2rem] mt-4">Secure Access</PrismButton>
                  </div>
                </PrismCard>
              </div>
            </div>
          </section>

          {/* ══════════ SESSIONS ══════════ */}
          <section id="sessions" className="scroll-mt-48">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-24">
              <div className="space-y-6">
                <span className="text-[11px] font-black text-p-accent tracking-[0.3em] uppercase block">// THE TIMELINE</span>
                <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 uppercase">Interactive<br /><span className="italic font-light">Odyssey.</span></h2>
              </div>
              {canEditSchedule && (
                <PrismButton onClick={() => setShowScheduleEditor(true)} variant="secondary" className="!px-10">Architect Schedule</PrismButton>
              )}
            </div>

            {pageData.schedule.length > 0 ? (
              <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-3 flex lg:flex-col gap-3 overflow-x-auto no-scrollbar">
                  {pageData.schedule.map((day, di) => (
                    <button key={di} onClick={() => setScheduleDay(di)}
                      className={`p-8 text-left rounded-3xl transition-all border ${scheduleDay === di ? 'bg-p-primary/5 border-p-primary shadow-[0_10px_30px_rgba(139,92,246,0.1)]' : 'bg-white/40 border-white/50 hover:bg-white/80'}`}
                    >
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Stage 0{di + 1}</div>
                      <div className="text-xl font-extrabold text-slate-900">{day.date}</div>
                    </button>
                  ))}
                </div>
                <div className="lg:col-span-9 space-y-6">
                  {pageData.schedule[scheduleDay]?.sessions.map((s, si) => (
                    <motion.div key={si} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: si * 0.1 }}
                      className="p-10 rounded-[2.5rem] bg-white/40 border border-white/50 backdrop-blur-xl group hover:bg-white transition-all shadow-sm hover:shadow-xl"
                    >
                      <div className="flex flex-col md:flex-row gap-12 items-start md:items-center">
                        <div className="flex-shrink-0">
                          <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Timestamp</div>
                          <div className="text-3xl font-black text-p-primary">{s.time}</div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-4">
                            <span className="px-3 py-1 bg-p-primary/10 text-[9px] font-black text-p-primary rounded-full uppercase tracking-widest">{s.type}</span>
                            {s.speaker && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">// Host: {s.speaker}</span>}
                          </div>
                          <h4 className="text-3xl font-[800] text-slate-900 group-hover:text-p-primary transition-colors leading-tight">{s.title}</h4>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <PrismCard className="py-32 flex flex-col items-center gap-6 border-dashed border-2">
                <Monitor size={48} className="text-slate-200" />
                <span className="text-sm font-bold text-slate-300 uppercase tracking-widest">Programming in progress</span>
              </PrismCard>
            )}
          </section>

          {/* ══════════ CREATORS ══════════ */}
          <section id="creators" className="scroll-mt-48">
            <div className="mb-24 space-y-6">
              <span className="text-[11px] font-black text-p-primary tracking-[0.3em] uppercase block">// THE VISIONARIES</span>
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 uppercase">PRISM<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-p-accent via-p-primary to-p-secondary">CREATORS.</span></h2>
            </div>

             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
                {pageData.speakers.map((sp, i) => (
                  <PrismCard key={i} className="group overflow-hidden !rounded-[3rem]">
                     {isEditing && (
                        <button onClick={() => update('speakers', pageData.speakers.filter((_, idx) => idx !== i))}
                                className="absolute top-6 right-6 z-20 w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xl hover:scale-110 transition-all"><Trash2 size={20} /></button>
                     )}
                     <div className="relative aspect-video overflow-hidden">
                        {sp.img && !isEditing ? (
                          <img src={sp.img} className="w-full h-full object-cover scale-110 group-hover:scale-100 group-hover:rotate-1 transition-all duration-1000" alt="" />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-200">
                             {isEditing && sp.img ? (
                               <img src={sp.img} className="w-full h-full object-cover opacity-30" alt="" />
                             ) : (
                               <Users size={64} />
                             )}
                          </div>
                        )}
                         <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
                         {isEditing && (
                           <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-white/20 backdrop-blur-sm">
                             <div className="w-full space-y-2">
                               <div className="text-[9px] font-black p-primary uppercase tracking-widest text-center">Photo URL</div>
                               <EditableField 
                                 value={sp.img} 
                                 onChange={v => updateNested('speakers', i, 'img', v)} 
                                 isEditing={isEditing} 
                                 placeholder="Paste image link..."
                               />
                             </div>
                           </div>
                         )}
                      </div>
                     <div className="p-10 space-y-6">
                        <div>
                           <span className="text-[10px] font-extrabold text-p-primary uppercase tracking-[0.2em] mb-2 block">
                              {isEditing ? <EditableField value={sp.role} onChange={v => updateNested('speakers', i, 'role', v)} isEditing /> : sp.role}
                           </span>
                           <h4 className="text-4xl font-black tracking-tighter text-slate-900">
                             {isEditing ? <EditableField value={sp.name} onChange={v => updateNested('speakers', i, 'name', v)} isEditing /> : sp.name}
                           </h4>
                           <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-1 block">
                              {isEditing ? <EditableField value={sp.org} onChange={v => updateNested('speakers', i, 'org', v)} isEditing /> : `@${sp.org}`}
                           </span>
                        </div>
                        <p className="text-base text-slate-500 font-light italic leading-relaxed line-clamp-4">
                           {isEditing ? <EditableField value={sp.bio} onChange={v => updateNested('speakers', i, 'bio', v)} multiline isEditing /> : `"${sp.bio}"`}
                        </p>
                     </div>
                  </PrismCard>
                ))}
                {isEditing && (
                  <button onClick={() => update('speakers', [...pageData.speakers, { name: 'New Creator', role: 'Artist', org: 'Studio', img: '', bio: 'Defining the edges...' }])}
                    className="aspect-square rounded-[3rem] border-4 border-dashed border-p-primary/10 flex flex-col items-center justify-center gap-6 group hover:border-p-primary/40 hover:bg-p-primary/5 transition-all"
                  >
                     <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Plus size={36} className="text-p-primary" />
                     </div>
                     <span className="text-[11px] font-black uppercase tracking-[0.2em] text-p-primary">Introduce Creator</span>
                  </button>
                )}
             </div>
          </section>

          {/* ══════════ LOCATION ══════════ */}
          <section id="location" className="scroll-mt-48">
             <div className="grid lg:grid-cols-2 gap-12 lg:gap-32 items-center">
                <div className="space-y-16">
                   <div className="space-y-6">
                      <span className="text-[11px] font-black text-accent tracking-[0.3em] uppercase block">// PHYSICAL SPACE</span>
                      <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 uppercase">THE<br/><span className="text-accent">HUB.</span></h2>
                   </div>
                   <div className="space-y-12">
                      <div className="group">
                         <span className="text-[10px] font-extrabold text-slate-300 tracking-widest uppercase mb-2 block">Conference Venue</span>
                         <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter group-hover:text-accent transition-colors">
                            {isEditing ? <EditableField value={pageData.venue_name} onChange={v => update('venue_name', v)} isEditing /> : pageData.venue_name}
                         </h3>
                      </div>
                      <div className="group">
                         <span className="text-[10px] font-extrabold text-slate-300 tracking-widest uppercase mb-2 block">Address</span>
                         <span className="text-2xl font-bold text-slate-500 uppercase tracking-widest">
                            {isEditing ? <EditableField value={pageData.venue_address} onChange={v => update('venue_address', v)} isEditing /> : pageData.venue_address}
                         </span>
                      </div>
                      <p className="text-xl text-slate-400 font-light leading-relaxed italic">
                         {isEditing ? <EditableField value={pageData.venue_description} onChange={v => update('venue_description', v)} multiline isEditing /> : pageData.venue_description}
                      </p>
                      
                      {isEditing && (
                        <div className="space-y-2 py-4 border-t border-p-primary/10">
                          <span className="text-[10px] font-extrabold text-p-primary uppercase tracking-[0.2em] block">Custom Map URL (Optional)</span>
                          <EditableField 
                            value={pageData.map_url} 
                            onChange={v => update('map_url', v)} 
                            isEditing={isEditing} 
                            placeholder="Paste Google Maps link here..."
                          />
                        </div>
                      )}

                      <PrismButton 
                        variant="secondary" 
                        onClick={() => window.open(pageData.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pageData.venue_address)}`, '_blank')} 
                        className="!rounded-full !px-8"
                      >
                        {pageData.map_url ? 'Navigate to Portal' : 'Get Coordinates'}
                      </PrismButton>
                   </div>
                </div>
                 <div className="relative">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
                      className="absolute -inset-16 border-2 border-accent/10 border-dashed rounded-full" />
                    <PrismCard className="aspect-square p-2 overflow-hidden !rounded-full shadow-2xl relative">
                       {/* Real Google Map with Circular Mask */}
                       <div className="absolute inset-0 z-0 overflow-hidden rounded-full">
                          <iframe
                            title="Prism Location"
                            width="100%"
                            height="100%"
                            frameBorder="0"
                            style={{ 
                              border: 0, 
                              filter: 'hue-rotate(240deg) grayscale(0.2) contrast(1.1) brightness(0.9)',
                            }}
                            src={pageData.map_url && pageData.map_url.includes('google.com/maps/embed') 
                              ? pageData.map_url 
                              : `https://maps.google.com/maps?q=${encodeURIComponent(pageData.venue_address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                            allowFullScreen
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-p-primary/20 to-transparent pointer-events-none" />
                       </div>

                       <div className="w-full h-full rounded-full bg-slate-900/10 flex flex-col items-center justify-center p-12 text-center relative overflow-hidden group pointer-events-none hover:bg-transparent transition-all">
                          <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-40 group-hover:opacity-0 transition-opacity" />
                          {!isEditing && <MapPin size={80} className="text-accent mb-8 animate-pulse drop-shadow-[0_0_15px_rgba(139,92,246,0.5)]" />}
                       </div>
                    </PrismCard>
                 </div>
             </div>
          </section>

          {/* ══════════ PARTNERS ══════════ */}
          <section id="partners" className="scroll-mt-48">
            <div className="mb-24 space-y-6">
              <span className="text-[11px] font-black text-secondary tracking-[0.3em] uppercase block">// THE ECOSYSTEM</span>
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 uppercase">CREATIVE<br /><span className="text-secondary italic">SUPPORT.</span></h2>
            </div>

            <div className="space-y-32">
              {['platinum', 'gold', 'silver'].map(tier => {
                const tierSponsors = pageData.sponsors.filter(s => s.tier === tier);
                if (!tierSponsors.length && !isEditing) return null;
                return (
                  <div key={tier} className="space-y-16">
                    <span className="text-[10px] font-black text-slate-300 tracking-[0.4em] uppercase border-b-2 border-secondary/20 pb-4 block">{tier} LEVEL PARTNERS</span>
                    <div className="flex flex-wrap gap-12">
                      {tierSponsors.map((sp, idx) => {
                        const gi = pageData.sponsors.indexOf(sp);
                        return (
                          <PrismCard key={idx} className="!rounded-3xl p-10 group hover:scale-110 transition-transform">
                            {isEditing && (
                              <button onClick={() => update('sponsors', pageData.sponsors.filter((_, i) => i !== gi))}
                                className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xl hover:scale-125 transition-all"><X size={16} /></button>
                            )}
                            <span className="text-2xl font-black text-slate-900 uppercase tracking-tighter group-hover:text-primary transition-colors">
                              {isEditing ? <EditableField value={sp.name} onChange={v => updateNested('sponsors', gi, 'name', v)} isEditing /> : sp.name}
                            </span>
                          </PrismCard>
                        )
                      })}
                      {isEditing && (
                        <button onClick={() => update('sponsors', [...pageData.sponsors, { name: 'New Partner', tier }])}
                          className="px-12 py-10 border-4 border-dashed border-black/5 rounded-3xl text-slate-300 text-[10px] font-black uppercase tracking-widest hover:text-primary hover:border-primary/20 transition-all">
                          + ADD PARTNER
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

        </main>

        <footer className="p-32 border-t border-black/5 bg-white/40 backdrop-blur-md">
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-24 text-center md:text-left">
              <div>
                 <h2 className="text-6xl font-black tracking-tighter text-slate-900 uppercase mb-4">{pageData.title}</h2>
                 <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    {['Twitter', 'Instagram', 'Discord', 'LinkedIn'].map(s => (
                       <span key={s} className="text-[10px] font-black text-slate-300 hover:text-primary cursor-pointer uppercase tracking-widest">{s}</span>
                    ))}
                 </div>
              </div>
              <div className="flex items-center gap-16">
                 <div className="text-right hidden md:block">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">Developed By</span>
                    <span className="text-sm font-extrabold uppercase tracking-[0.2em] text-primary">Prism_Studio_v5</span>
                 </div>
                 <div className="w-px h-24 bg-black/5" />
                 <span className="text-[12px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">© {new Date().getFullYear()} THE SPECTRUM</span>
              </div>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default CreativeTemplate;