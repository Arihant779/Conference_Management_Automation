import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from 'framer-motion';
import {
  MapPin, Calendar, Users, Mail, Phone, Globe,
  Twitter, Linkedin, Edit3, Check, X, Plus, Save, AlertCircle, Clock,
  ArrowRight, Terminal, Cpu, Code2, Zap, ChevronRight, Radio, Trash2,
  Lock, ExternalLink, Hexagon, Shield, Activity, HardDrive
} from 'lucide-react';
import ScheduleEditor from '../ScheduleEditor';
import ConferenceRegistration from './../ConferenceRegistration';

const T = {
  bg: '#020408',
  surface: 'rgba(13, 17, 23, 0.7)',
  surfaceSolid: '#0d1117',
  accent: '#f5c518', // Premium Amber
  primary: '#fbbf24', // Tech Gold
  secondary: '#ff0055', // Digital Rose
  border: 'rgba(245, 197, 24, 0.2)',
  text: '#e6edf3',
  textMuted: '#7d8590',
  gold: '#ffd700',
};

/* ─────────────────────────────────────────────────────────────
   HI-TECH UI COMPONENTS
   ───────────────────────────────────────────────────────────── */

const CornerBrackets = ({ color = T.accent, size = 12 }) => (
  <>
    <div style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
    <div style={{ position: 'absolute', top: 0, right: 0, width: size, height: size, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: size, height: size, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
    <div style={{ position: 'absolute', bottom: 0, right: 0, width: size, height: size, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
  </>
);

const HUDCard = ({ children, title, className = '', style = {}, spotlight = true }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const background = useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, rgba(245, 197, 24, 0.08), transparent 80%)`;

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      className={`relative group ${className}`}
      style={{
        background: 'rgba(13, 17, 23, 0.4)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${T.border}`,
        borderRadius: '2px 16px 2px 16px',
        overflow: 'hidden',
        ...style
      }}
    >
      {spotlight && (
        <motion.div
          className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background }}
        />
      )}

      {/* HUD Decorators */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 2, background: `linear-gradient(90deg, ${T.accent}, transparent)` }} />

      <div className="relative z-10 p-6">
        {title && (
          <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
            <div className="w-1 h-3 bg-accent" style={{ backgroundColor: T.accent }} />
            <span className="text-[10px] font-black uppercase tracking-widest text-accent" style={{ color: T.accent }}>{title}</span>
          </div>
        )}
        {children}
      </div>

      <CornerBrackets color={T.accent} size={8} />
    </motion.div>
  );
};

const CyberButton = ({ children, onClick, variant = 'primary', className = '' }) => {
  const color = variant === 'primary' ? T.accent : T.primary;
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative px-8 py-3 font-black uppercase tracking-widest text-[11px] group overflow-hidden ${className}`}
      style={{
        background: 'transparent',
        border: `1px solid ${color}`,
        color: color,
        borderRadius: '4px 12px 4px 12px',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
    >
      <motion.div
        className="absolute inset-0 z-0 opacity-0 group-hover:opacity-10 transition-opacity"
        style={{ background: color }}
      />
      <div className="relative z-10 flex items-center justify-center gap-3">
        {children}
      </div>

      {/* Interactive elements */}
      <div className="absolute top-0 left-0 w-2 h-[1px]" style={{ backgroundColor: color }} />
      <div className="absolute top-0 left-0 w-[1px] h-2" style={{ backgroundColor: color }} />
      <div className="absolute bottom-0 right-0 w-2 h-[1px]" style={{ backgroundColor: color }} />
      <div className="absolute bottom-0 right-0 w-[1px] h-2" style={{ backgroundColor: color }} />
    </motion.button>
  );
};

const DigitalRain = () => {
  return (
    <div className="fixed inset-0 pointer-events-none opacity-[0.05] z-0 overflow-hidden">
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(rgba(245, 197, 24, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(245, 197, 24, 0.1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        transform: 'perspective(500px) rotateX(60deg) translateY(-100px)',
        height: '200%',
      }} />
    </div>
  );
};

const GlitchText = ({ children, color = T.text, fontSize = 'inherit', className = '' }) => {
  return (
    <span className={`relative inline-block ${className}`} style={{ color, fontSize }}>
      {children}
    </span>
  );
};

const EditableField = ({ value, onChange, isEditing, multiline = false, placeholder = '...' }) => {
  const [local, setLocal] = useState(value || '');
  useEffect(() => setLocal(value || ''), [value]);

  if (!isEditing) return <span>{value || placeholder}</span>;

  const style = {
    background: 'rgba(245, 197, 24, 0.05)',
    border: `1px solid ${T.accent}40`,
    borderRadius: 4,
    padding: '4px 8px',
    color: T.text,
    width: '100%',
    fontFamily: 'inherit',
    outline: 'none',
  };

  return multiline ? (
    <textarea value={local} onChange={e => setLocal(e.target.value)} onBlur={() => onChange(local)} style={style} rows={3} />
  ) : (
    <input value={local} onChange={e => setLocal(e.target.value)} onBlur={() => onChange(local)} style={style} />
  );
};

/* ─────────────────────────────────────────────────────────────
   TECH_TEMPLATE_COMPONENT
   ───────────────────────────────────────────────────────────── */

const TechTemplate = ({
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

  useEffect(() => {
    const el = document.getElementById('scroll-area');
    if (!el) return;
    const handleScroll = (e) => setScrolled(e.target.scrollTop > 50);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const containerRef = useRef(null);
  const scrollAreaRef = useRef(null);
  useEffect(() => { scrollAreaRef.current = document.getElementById('scroll-area'); }, []);
  const { scrollY } = useScroll({ container: scrollAreaRef });
  const { scrollYProgress } = useScroll({ container: containerRef });
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  const heroY = useTransform(scrollY, [0, 1000], [0, 200]);
  const heroOpacity = useTransform(scrollY, [0, 800], [1, 0]);

  useEffect(() => { if (autoOpenRegister && !isGuest) setShowReg(true); }, [autoOpenRegister, isGuest]);

  const [pageData, setPageData] = useState({
    title: initialConf.title || 'Tech Summit 2024',
    tagline: initialConf.tagline || 'Advancing the Future of Technology',
    banner_url: initialConf.banner_url || '',
    contact_email: initialConf.contact_email || 'contact@techsummit.io',
    contact_phone: initialConf.contact_phone || '+1 (555) 123-4567',
    website: initialConf.website || 'https://techsummit.io',
    twitter: initialConf.twitter || '@tech_summit',
    linkedin: initialConf.linkedin || '',
    schedule: initialConf.schedule || [],
    speakers: initialConf.speakers || [
      { name: 'Dr. Alan Turing', role: 'Architect', org: 'Neural Systems', img: 'https://i.pravatar.cc/150?img=11', bio: 'Expert in neural architectures and system integration.' },
      { name: 'Sarah Connor', role: 'Security Lead', org: 'Cyber Defense', img: 'https://i.pravatar.cc/150?img=47', bio: 'Pioneer of advanced security protocols and infrastructure protection.' },
    ],
    sponsors: initialConf.sponsors || [
      { name: 'TechCorp', tier: 'platinum' },
      { name: 'InnoSystems', tier: 'gold' },
    ],
    important_dates: initialConf.important_dates || [
      { label: 'Summit Launch', date: initialConf.start_date || 'APR 20' },
    ],
    venue_name: initialConf.venue_name || 'Innovation Center',
    venue_address: initialConf.venue_address || initialConf.location || 'Silicon Valley, CA',
    venue_description: initialConf.venue_description || 'A state-of-the-art facility designed for high-performance collaboration and technological development.',
    capacity: initialConf.capacity || '1024 Attendees',
    map_url: initialConf.map_url || '',
    registration_fee_general: initialConf.registration_fee_general || '$499',
    registration_fee_student: initialConf.registration_fee_student || '$99',
    registration_fee_early: initialConf.registration_fee_early || '$299',
    about_extra: initialConf.about_extra || 'An immersive deep-dive into the next generation of computing and infrastructure.',
    tracks: initialConf.tracks || ['Artificial Intelligence', 'Cybersecurity', 'Cloud Systems', 'Full Stack'],
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

  const handleRegisterClick = () => {
    if (isGuest) { if (onRequireAuthForRegister) onRequireAuthForRegister(); }
    else setShowReg(true);
  };

  const displayName = conf.title ?? initialConf.title ?? 'Tech Summit';
  const displayDate = conf.start_date ? `${conf.start_date}${conf.end_date ? ` – ${conf.end_date}` : ''}` : 'Dates to be announced';

  return (
    <div className="min-h-screen text-[#e6edf3] selection:bg-[#f5c51840]"
      style={{ background: T.bg, fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden' }}>

      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700;800&family=Space+Grotesk:wght@300;400;500;700&display=swap" rel="stylesheet" />

      <DigitalRain />

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.accent}40; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: ${T.accent}; }
      `}</style>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {showReg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
            <HUDCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ border: `1px solid ${T.accent}` }}>
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-black text-accent tracking-widest uppercase">// SECURE REGISTRATION</span>
                <button onClick={() => setShowReg(false)} className="text-white/40 hover:text-white"><X size={20} /></button>
              </div>
              <ConferenceRegistration conf={conf} currentUser={currentUser} onSuccess={() => setShowReg(false)} onBack={() => setShowReg(false)} />
            </HUDCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScheduleEditor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 md:p-12">
            <HUDCard className="w-full h-full max-w-6xl" style={{ border: `1px solid ${T.primary}` }}>
              <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-black text-primary tracking-widest uppercase">// SCHEDULE EDITOR</span>
                <button onClick={() => setShowScheduleEditor(false)} className="text-white/40 hover:text-white"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ScheduleEditor initialSchedule={conf.schedule || []} conferenceId={conf.conference_id} onSave={async (s) => { await onScheduleSave(s); setShowScheduleEditor(false); }} onCancel={() => setShowScheduleEditor(false)} />
              </div>
            </HUDCard>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div className="fixed top-0 left-0 right-0 h-[1px] z-[120] origin-left" style={{ scaleX, background: T.accent }} />

      <div ref={containerRef} className="h-screen overflow-y-auto overflow-x-hidden relative" id="scroll-area">
        {/* ── ORGANIZER MODE ── */}
        {isOrganizer && (
          <div className="relative z-[110] px-6 py-3 bg-black/40 backdrop-blur-md border-b border-accent/20 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-black tracking-widest text-accent uppercase">Organizer Mode Active</span>
            </div>
            <div className="flex items-center gap-3">
              {saveError && <span className="text-[9px] text-secondary font-black tracking-widest">{saveError}</span>}
              {saved && <span className="text-[9px] text-accent font-black tracking-widest underline">Changes Saved</span>}
              {isEditing ? (
                <div className="flex gap-4">
                  <button onClick={onDelete} className="text-[9px] font-black text-secondary hover:underline cursor-pointer">Delete</button>
                  <button onClick={() => setIsEditing(false)} className="text-[9px] font-black text-white/40 hover:text-white cursor-pointer">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="text-[9px] font-black text-accent hover:underline cursor-pointer">{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="text-[9px] font-black text-accent hover:underline cursor-pointer">Edit Page</button>
              )}
            </div>
          </div>
        )}

        {/* ══════════ HERO SECTION ══════════ */}
        <section className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">

          {(pageData.banner_url || initialConf.banner_url) && (
            <div className="absolute inset-0 z-0 overflow-hidden">
              <motion.img 
                initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 2 }}
                src={pageData.banner_url || initialConf.banner_url} 
                className="w-full h-full object-cover opacity-[0.15] mix-blend-luminosity filter contrast-125" 
                alt="" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-primary/5" />
            </div>
          )}

          <motion.div 
            style={{ y: heroY, opacity: heroOpacity }}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5 }}
            className="relative z-10 w-full max-w-6xl"
          >
            <div className="text-center group">
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                {isEditing && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-10 w-full max-w-lg mx-auto">
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-accent mb-3 flex items-center gap-2">
                       <Radio size={12} className="animate-pulse" /> // CHANGE_SOURCE_NODE
                    </div>
                    <EditableField 
                      value={pageData.banner_url} 
                      onChange={v => update('banner_url', v)} 
                      isEditing={isEditing} 
                      placeholder="Root image URL (Unsplash/Direct)..."
                    />
                  </motion.div>
                )}
                <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-accent/30 rounded-full bg-accent/5 backdrop-blur-xl mb-8">
                  <Shield size={14} className="text-accent" />
                  <span className="text-[10px] font-black tracking-widest text-accent uppercase leading-none">
                    {conf.theme || 'Advancing Technology and Innovation'}
                  </span>
                </div>
              </motion.div>

              <motion.h1
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
                className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter mb-4 leading-[0.9] text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {isEditing ? (
                  <input value={pageData.title} onChange={e => update('title', e.target.value)} className="bg-transparent border-b border-accent/30 text-center outline-none w-full" />
                ) : (
                  <GlitchText className="cursor-default">{displayName.toUpperCase()}</GlitchText>
                )}
              </motion.h1>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
                <div className="flex items-center justify-center gap-4 text-xl md:text-2xl text-white/40 mb-12">
                  <span className="text-accent">&gt;</span>
                  {isEditing ? (
                    <EditableField value={pageData.tagline} onChange={v => update('tagline', v)} isEditing />
                  ) : (
                    <span className="font-light tracking-wide">{pageData.tagline}</span>
                  )}
                  <div className="w-2 h-6 bg-accent animate-pulse" />
                </div>
              </motion.div>

              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-6"
              >
                <CyberButton onClick={handleRegisterClick} variant="primary">
                  <span>Register Now</span>
                  <ArrowRight size={16} />
                </CyberButton>
                <CyberButton onClick={() => document.getElementById('about').scrollIntoView({ behavior: 'smooth' })} variant="secondary">
                  <span>View Details</span>
                </CyberButton>
              </motion.div>
            </div>
          </motion.div>

          <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ delay: 1.5, type: 'spring' }}
            className="absolute bottom-12 left-8 right-8 flex flex-wrap items-center justify-between gap-8 pt-8 border-t border-white/5"
          >
            {[
              { label: 'LOCATION', val: initialConf.venue_name || 'Innovate Hall', icon: MapPin },
              { label: 'EVENT DATES', val: displayDate, icon: Calendar },
              { label: 'CAPACITY', val: pageData.capacity, icon: Users },
            ].map(({ label, val, icon: Icon }) => (
              <div key={label} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Icon size={10} className="text-accent" />
                  <span className="text-[8px] font-black text-white/20 tracking-widest uppercase">{label}</span>
                </div>
                <span className="text-xs font-bold text-white tracking-widest uppercase">{val}</span>
              </div>
            ))}
            <div className="hidden lg:flex items-center gap-8">
              {pageData.tracks.map((t, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Hexagon size={10} className="text-primary" />
                  <span className="text-[9px] font-black text-white/60 tracking-widest uppercase">#{t.toUpperCase().replace(/\s/g, '_')}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <nav className={`sticky top-0 z-[100] transition-all duration-300 ${scrolled ? 'py-4 bg-black/80 backdrop-blur-2xl border-b border-accent/20' : 'py-6 bg-transparent border-b border-transparent'}`}>
          <div className="max-w-7xl mx-auto px-8 flex items-center justify-between">
            <div className="flex gap-12 overflow-x-auto no-scrollbar">
               {['about', 'schedule', 'speakers', 'venue', 'sponsors', 'contact'].map(id => (
                 <button key={id} onClick={() => { 
                     const el = document.getElementById(id);
                     if (el) el.scrollIntoView({ behavior: 'smooth' });
                     setActiveNav(id); 
                   }}
                   className={`text-[9px] font-black tracking-widest uppercase transition-all whitespace-nowrap px-4 py-2 rounded-full ${activeNav === id ? 'text-accent bg-accent/10 border border-accent/20' : 'text-white/30 hover:text-white border border-transparent'}`}
                 >
                   {id}
                 </button>
               ))}
            </div>
            
            <button
               onClick={() => setShowReg(true)}
               className={`px-8 py-3 bg-accent text-black text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-500 ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
            >
               Register Now
            </button>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-32 space-y-16 md:space-y-48">

          {/* ══════════ ABOUT ══════════ */}
          <section id="about" className="scroll-mt-32">
            <div className="grid lg:grid-cols-12 gap-16 items-start">
              <div className="lg:col-span-12 mb-12">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-[1px] w-12 bg-accent opacity-30" />
                  <span className="text-xs font-black tracking-widest text-accent uppercase">// About the Conference</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
                  Event <span className="text-accent">Overview.</span>
                </h2>
              </div>

              <div className="lg:col-span-8">
                <HUDCard spotlight={false} style={{ background: 'transparent', border: 'none', padding: 0 }}>
                  <div className="space-y-8 text-lg text-white/50 leading-relaxed max-w-3xl">
                    <p className="first-letter:text-5xl first-letter:text-accent first-letter:font-black first-letter:mr-3 first-letter:float-left">
                      {isEditing ? <EditableField value={conf.description} onChange={v => setConf(p => ({ ...p, description: v }))} multiline isEditing /> : conf.description}
                    </p>
                    <div className="pt-4 border-l-2 border-accent/20 pl-8 italic">
                      {isEditing ? <EditableField value={pageData.about_extra} onChange={v => update('about_extra', v)} multiline isEditing /> : pageData.about_extra}
                    </div>
                  </div>
                </HUDCard>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
                  {[
                    { val: pageData.capacity, label: 'ATTENDEES', color: T.accent },
                    { val: `${pageData.speakers.length}+`, label: 'SPEAKERS', color: T.primary },
                    { val: `${pageData.important_dates.length}`, label: 'KEY DATES', color: T.secondary },
                    { val: 'v2.0', label: 'PLATFORM VERSION', color: T.gold },
                  ].map(({ val, label, color }) => (
                    <div key={label} className="group">
                      <div className="text-3xl font-black mb-1 group-hover:scale-110 transition-transform origin-left" style={{ color }}>{val}</div>
                      <div className="text-[8px] font-black text-white/20 tracking-widest uppercase">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4">
                <HUDCard title="Registration Fees">
                  <div className="space-y-6">
                    {[
                      { label: 'STANDARD RATE', key: 'registration_fee_general', color: T.text },
                      { label: 'STUDENT RATE', key: 'registration_fee_student', color: T.primary },
                      { label: 'EARLY BIRD', key: 'registration_fee_early', color: T.accent },
                    ].map(({ label, key, color }) => (
                      <div key={key} className="flex justify-between items-end gap-4">
                        <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">{label}</span>
                        <div className="flex-1 border-b border-white/10 border-dotted mb-1.5" />
                        <span className="text-xl font-black" style={{ color }}>
                          {isEditing ? <EditableField value={pageData[key]} onChange={v => update(key, v)} isEditing /> : pageData[key]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <CyberButton onClick={handleRegisterClick} className="w-full mt-10">
                    Register Now
                  </CyberButton>
                </HUDCard>
              </div>
            </div>
          </section>

          {/* ══════════ SCHEDULE ══════════ */}
          <section id="schedule" className="scroll-mt-32">
            <div className="flex items-center justify-between mb-16">
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-[1px] w-12 bg-accent opacity-30" />
                  <span className="text-xs font-black tracking-widest text-accent uppercase">// Event Program</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
                  Conference <span className="text-accent">Schedule.</span>
                </h2>
              </div>
              {canEditSchedule && (
                <CyberButton onClick={() => setShowScheduleEditor(true)} variant="secondary" className="px-4 py-2">
                  Modify Schedule
                </CyberButton>
              )}
            </div>

            {pageData.schedule.length > 0 ? (
              <div className="grid lg:grid-cols-12 gap-12">
                <div className="lg:col-span-3 space-y-2">
                  {pageData.schedule.map((day, di) => (
                    <button key={di} onClick={() => setScheduleDay(di)}
                      className={`w-full p-6 text-left border rounded-xl transition-all ${scheduleDay === di ? 'bg-accent/10 border-accent text-accent' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                      <div className="text-[8px] font-black uppercase tracking-widest mb-1">Day 0{di + 1}</div>
                      <div className="text-lg font-black">{day.date}</div>
                    </button>
                  ))}
                </div>
                <div className="lg:col-span-9 space-y-4">
                  {pageData.schedule[scheduleDay]?.sessions.map((session, si) => (
                    <HUDCard key={si} spotlight={false} className="hover:border-accent/40 transition-all">
                      <div className="flex flex-col md:flex-row md:items-center gap-8">
                        <div className="md:w-32 flex-shrink-0">
                          <div className="text-[9px] font-black text-white/20 mb-1 uppercase tracking-widest">Start Time</div>
                          <div className="text-xl font-black text-accent">{session.time}</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-0.5 text-[8px] font-black tracking-widest border border-white/10 text-white/40 uppercase">{session.type}</span>
                            {session.speaker && <span className="text-[9px] font-black text-white/60 tracking-widest uppercase">/ Speaker: {session.speaker}</span>}
                          </div>
                          <h4 className="text-2xl font-black text-white uppercase tracking-tight">{session.title}</h4>
                        </div>
                        <CornerBrackets size={4} color="rgba(255,255,255,0.1)" />
                      </div>
                    </HUDCard>
                  ))}
                </div>
              </div>
            ) : (
              <HUDCard className="text-center py-24 border-dashed opacity-40">
                <div className="text-xs font-black tracking-widest uppercase">// Schedule updates coming soon</div>
              </HUDCard>
            )}
          </section>

          {/* ══════════ SPEAKERS ══════════ */}
          <section id="speakers" className="scroll-mt-32">
            <div className="mb-16">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-[1px] w-12 bg-accent opacity-30" />
                <span className="text-xs font-black tracking-widest text-accent uppercase">// Experts & Visionaries</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
                Distinguished <span className="text-accent">Speakers.</span>
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
               {pageData.speakers.map((sp, i) => (
                 <HUDCard key={i} className="group flex flex-col h-full">
                    {isEditing && (
                      <button onClick={() => update('speakers', pageData.speakers.filter((_, idx) => idx !== i))}
                              className="absolute top-4 right-4 z-20 text-secondary hover:underline text-[9px] font-black uppercase">Remove</button>
                    )}
                    <div className="relative mb-8 aspect-video overflow-hidden rounded-lg bg-black/40 border border-white/5">
                        {sp.img ? (
                          <img 
                            src={sp.img} 
                            alt={sp.name} 
                            className={`w-full h-full object-cover transition-all duration-700 ${!isEditing ? 'grayscale brightness-75 group-hover:grayscale-0 group-hover:scale-110' : 'opacity-40'}`} 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                             <Cpu size={48} className="text-white/5" />
                          </div>
                        )}

                        {isEditing && (
                          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-md border border-accent/30 rounded-lg">
                            <div className="w-full space-y-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Zap size={10} className="text-accent animate-pulse" />
                                <span className="text-[8px] font-black tracking-[0.3em] text-accent uppercase">Img Path Config</span>
                              </div>
                              <EditableField 
                                value={sp.img} 
                                onChange={v => updateNested('speakers', i, 'img', v)} 
                                isEditing={isEditing} 
                                placeholder="Root image link..."
                              />
                            </div>
                          </div>
                        )}
                    </div>
                    
                    <div className="flex-1 space-y-4">
                       <div>
                          <span className="text-[10px] font-black text-accent tracking-widest uppercase mb-1 block">
                            {isEditing ? <EditableField value={sp.role} onChange={v => updateNested('speakers', i, 'role', v)} isEditing /> : sp.role}
                          </span>
                          <h4 className="text-3xl font-black text-white uppercase tracking-tighter">
                            {isEditing ? <EditableField value={sp.name} onChange={v => updateNested('speakers', i, 'name', v)} isEditing /> : sp.name}
                          </h4>
                          <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1 block">
                             @ {isEditing ? <EditableField value={sp.org} onChange={v => updateNested('speakers', i, 'org', v)} isEditing /> : sp.org}
                          </span>
                       </div>
                       <p className="text-sm text-white/40 leading-relaxed font-light line-clamp-4 italic">
                          {isEditing ? <EditableField value={sp.bio} onChange={v => updateNested('speakers', i, 'bio', v)} multiline isEditing /> : `"${sp.bio}"`}
                       </p>
                    </div>
                 </HUDCard>
               ))}
               {isEditing && (
                 <button onClick={() => update('speakers', [...pageData.speakers, { name: 'New Speaker', role: 'Role', org: 'Entity', img: '', bio: 'Bio information coming soon...' }])}
                   className="h-full min-h-[400px] border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-4 text-white/20 hover:text-accent hover:border-accent/40 transition-all"
                 >
                    <Plus size={32} />
                    <span className="text-[10px] font-black tracking-widest uppercase">Add Speaker</span>
                 </button>
               )}
            </div>
          </section>

          {/* ══════════ VENUE ══════════ */}
          <section id="venue" className="scroll-mt-32">
             <HUDCard className="overflow-hidden">
                <div className="grid lg:grid-cols-2 gap-0 overflow-hidden">
                   <div className="p-12 space-y-8">
                      <div>
                         <div className="flex items-center gap-4 mb-4">
                            <div className="h-[1px] w-12 bg-accent opacity-30" />
                            <span className="text-xs font-black tracking-widest text-accent uppercase">// Venue Information</span>
                         </div>
                         <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
                             The <span className="text-accent">Location.</span>
                         </h2>
                      </div>
                      <div className="space-y-6">
                         <div>
                            <span className="text-[9px] font-black text-white/20 tracking-widest uppercase mb-1 block">Venue Name</span>
                            <h3 className="text-2xl font-black text-white">
                                {isEditing ? <EditableField value={pageData.venue_name} onChange={v => update('venue_name', v)} isEditing /> : pageData.venue_name}
                            </h3>
                         </div>
                         <div>
                            <span className="text-[9px] font-black text-white/20 tracking-widest uppercase mb-1 block">Address</span>
                            <div className="text-lg font-bold text-accent flex items-center gap-3">
                               <MapPin size={18} />
                               {isEditing ? <EditableField value={pageData.venue_address} onChange={v => update('venue_address', v)} isEditing /> : pageData.venue_address}
                            </div>
                         </div>
                         <p className="text-white/40 leading-relaxed font-light italic">
                             {isEditing ? <EditableField value={pageData.venue_description} onChange={v => update('venue_description', v)} multiline isEditing /> : pageData.venue_description}
                         </p>
                          {isEditing && (
                            <div className="space-y-2 py-4 border-t border-white/5">
                              <span className="text-[9px] font-black text-accent uppercase tracking-widest block">Custom Map Portal URL</span>
                              <EditableField 
                                value={pageData.map_url} 
                                onChange={v => update('map_url', v)} 
                                isEditing={isEditing} 
                                placeholder="Paste Google Maps iframe/link here..."
                              />
                            </div>
                          )}

                          <CyberButton 
                            variant="secondary" 
                            onClick={() => window.open(pageData.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pageData.venue_address)}`, '_blank')}
                          >
                            {pageData.map_url ? 'Initialize Navigation' : 'Open in Maps'}
                          </CyberButton>
                       </div>
                    </div>
                    <div className="bg-white/5 relative overflow-hidden min-h-[400px] border-l border-white/5">
                        {/* Real Google Map with Terminal Styling */}
                        <iframe
                          title="Tech Venue Map"
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          style={{ 
                            border: 0, 
                            filter: 'grayscale(1) invert(0.8) contrast(1.5) brightness(0.7)',
                            mixBlendMode: 'screen'
                          }}
                          src={pageData.map_url && pageData.map_url.includes('google.com/maps/embed') 
                            ? pageData.map_url 
                            : `https://maps.google.com/maps?q=${encodeURIComponent(pageData.venue_address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                          allowFullScreen
                          className="absolute inset-0"
                        />
                        <div className="absolute inset-0 bg-accent/5 pointer-events-none" />
                        <div className="absolute top-4 left-4 text-[8px] font-black text-white/20 tracking-widest uppercase z-10 bg-black/60 px-2 py-1 backdrop-blur-sm border border-white/5">Local Scan: {pageData.venue_name.toUpperCase()}</div>
                    </div>
                 </div>
             </HUDCard>
          </section>

          {/* ══════════ SPONSORS ══════════ */}
          <section id="sponsors" className="scroll-mt-32">
            <div className="mb-16">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-[1px] w-12 bg-accent opacity-30" />
                <span className="text-xs font-black tracking-widest text-accent uppercase">// Supporting Partners</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
                Official <span className="text-accent">Sponsors.</span>
              </h2>
            </div>

            <div className="space-y-12">
              {['platinum', 'gold', 'silver'].map(tier => {
                const tierSponsors = pageData.sponsors.filter(s => s.tier === tier);
                if (!tierSponsors.length && !isEditing) return null;
                return (
                  <div key={tier}>
                    <span className="text-[10px] font-black text-white/30 tracking-widest uppercase mb-6 block">{tier.toUpperCase()} PARTNERS</span>
                    <div className="flex flex-wrap gap-6">
                      {tierSponsors.map((sp, idx) => {
                        const gi = pageData.sponsors.indexOf(sp);
                        return (
                          <HUDCard key={idx} className="relative group !p-6" spotlight={false}>
                            {isEditing && (
                              <button onClick={() => update('sponsors', pageData.sponsors.filter((_, i) => i !== gi))}
                                className="absolute -top-2 -right-2 z-10 p-1 bg-secondary text-white rounded-full"><X size={8} /></button>
                            )}
                            <span className="text-xl font-black text-white group-hover:text-accent transition-colors">
                              {isEditing ? <EditableField value={sp.name} onChange={v => updateNested('sponsors', gi, 'name', v)} isEditing /> : sp.name}
                            </span>
                          </HUDCard>
                        )
                      })}
                      {isEditing && (
                        <button onClick={() => update('sponsors', [...pageData.sponsors, { name: 'New Sponsor', tier }])}
                          className="px-8 py-4 border border-dashed border-white/10 text-accent/60 text-[10px] font-bold tracking-widest hover:border-accent hover:text-accent transition-all">
                          + ADD SPONSOR
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* ══════════ CONTACT ══════════ */}
          <section id="contact" className="scroll-mt-32">
             <div className="grid lg:grid-cols-12 gap-16">
                <div className="lg:col-span-12">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="h-[1px] w-12 bg-accent opacity-30" />
                      <span className="text-xs font-black tracking-widest text-accent uppercase">// Get in Touch</span>
                   </div>
                   <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
                      Contact <span className="text-accent">Us.</span>
                   </h2>
                </div>
                
                <div className="lg:col-span-5 space-y-4">
                   {[
                     { label: 'EMAIL ADDRESS', key: 'contact_email', icon: Mail },
                     { label: 'WEBSITE', key: 'website', icon: Globe },
                     { label: 'TWITTER / X', key: 'twitter', icon: Twitter },
                     { label: 'LINKEDIN', key: 'linkedin', icon: Linkedin },
                   ].map(({ label, key, icon: Icon }) => (
                     <HUDCard key={key} className="p-4" spotlight={false}>
                        <div className="flex items-center gap-6">
                           <div className="w-12 h-12 bg-accent/10 rounded flex items-center justify-center text-accent">
                              <Icon size={20} />
                           </div>
                           <div>
                              <div className="text-[10px] font-black text-white/20 tracking-widest uppercase">{label}</div>
                              <div className="text-lg font-bold text-white truncate w-32 sm:w-48 md:w-64">
                                {isEditing ? <EditableField value={pageData[key]} onChange={v => update(key, v)} isEditing /> : pageData[key] || '---'}
                              </div>
                           </div>
                        </div>
                     </HUDCard>
                   ))}
                </div>
                <div className="lg:col-span-7">
                   <HUDCard title="Send a Message">
                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                         <div className="space-y-2">
                            <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Full Name</span>
                            <input placeholder="Enter name" className="w-full bg-white/5 border border-white/10 p-4 text-xs font-bold text-white outline-none focus:border-accent transition-all" />
                         </div>
                         <div className="space-y-2">
                           <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Email Address</span>
                           <input placeholder="Enter email" className="w-full bg-white/5 border border-white/10 p-4 text-xs font-bold text-white outline-none focus:border-accent transition-all" />
                         </div>
                      </div>
                      <div className="space-y-2 mb-8">
                         <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Message</span>
                         <textarea placeholder="Your inquiries..." rows={4} className="w-full bg-white/5 border border-white/10 p-4 text-xs font-bold text-white outline-none focus:border-accent transition-all resize-none" />
                      </div>
                      <CyberButton className="w-full">Submit Message</CyberButton>
                   </HUDCard>
                </div>
             </div>
          </section>
        </main>

        <footer className="p-24 border-t border-white/5 bg-black/40">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
            <div>
              <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">{displayName}</h2>
              <span className="text-[10px] font-black text-accent tracking-[0.4em] uppercase">// ADVANCING INNOVATION TOGETHER</span>
            </div>
            <div className="flex items-center gap-12 text-[10px] font-black text-white/20 tracking-widest uppercase">
              <span>© {new Date().getFullYear()} TECH SUMMIT</span>
              <div className="w-px h-4 bg-white/10" />
              <span>PORTAL ACTIVE</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default TechTemplate;