import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import {
  MapPin, Calendar, Users, Mail, Phone, Globe,
  Twitter, Linkedin, Edit3, Check, X, Plus, Trash2, Save, AlertCircle, Clock,
  ArrowRight, Sparkles, Navigation, MonitorPlay, ChevronRight, Award, Zap, Target
} from 'lucide-react';
import ScheduleEditor from '../ScheduleEditor';

/* =========================================================
   AWWWARDS-LEVEL INTERACTIVE EFFECTS
   ========================================================= */

/* --- MAGNETIC BUTTON --- */
const MagneticButton = ({ children, className = '', strength = 0.35, ...props }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { damping: 15, stiffness: 150 });
  const sy = useSpring(y, { damping: 15, stiffness: 150 });

  const handleMouse = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left - rect.width / 2) * strength);
    y.set((e.clientY - rect.top - rect.height / 2) * strength);
  };

  return (
    <motion.div ref={ref} data-magnetic onMouseMove={handleMouse} onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ x: sx, y: sy }} className={`inline-block ${className}`} {...props}>
      {children}
    </motion.div>
  );
};

/* --- SPOTLIGHT CARD (cursor-following radial light) --- */
const SpotlightCard = ({ children, className = '', spotlightColor = 'rgba(251,191,36,0.07)' }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouse = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const spotBg = useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 80%)`;

  return (
    <div className={`relative group ${className}`} onMouseMove={handleMouse}>
      <motion.div className="absolute inset-0 rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"
        style={{ background: spotBg }} />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

/* --- INFINITE MARQUEE BAND --- */
const MarqueeBand = ({ items, speed = 30 }) => {
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden py-8 -rotate-1" style={{ background: 'rgba(251,191,36,0.03)', borderTop: '1px solid rgba(251,191,36,0.08)', borderBottom: '1px solid rgba(251,191,36,0.08)' }}>
      <motion.div className="flex whitespace-nowrap gap-12"
        animate={{ x: [0, -50 * items.length + '%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}>
        {doubled.map((item, i) => (
          <span key={i} className="text-2xl md:text-4xl font-black uppercase tracking-widest flex items-center gap-8" style={{ color: 'rgba(251,191,36,0.12)' }}>
            {item} <span className="w-2 h-2 rounded-full" style={{ background: 'rgba(251,191,36,0.2)' }} />
          </span>
        ))}
      </motion.div>
    </div>
  );
};

/* --- SCROLL PROGRESS BAR --- */
const ScrollProgressBar = ({ scrollRef }) => {
  const { scrollYProgress } = useScroll({ container: scrollRef });
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  return (
    <motion.div className="fixed top-0 left-0 right-0 z-[999] h-[2px] origin-left"
      style={{ scaleX, background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24)' }} />
  );
};

/* --- REVEAL TEXT (word-by-word) --- */
const RevealText = ({ children, className = '', delay = 0 }) => {
  const words = children.split(' ');
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden">
          <motion.span className="inline-block"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: delay + i * 0.08, ease: [0.33, 1, 0.68, 1] }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
};

/* ---------------------------------------------
   PARTICLES / ANIMATED BACKGROUND
   --------------------------------------------- */
const FloatingParticles = () => null;

const CinematicBackground = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" style={{ background: '#04070D' }}>
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
    <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full opacity-[0.08]" 
      style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 70%)', filter: 'blur(100px)' }} />
    <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full opacity-[0.05]" 
      style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', filter: 'blur(120px)' }} />
  </div>
);

/* ---------------------------------------------
   ANIMATED COUNTER
   --------------------------------------------- */
const AnimatedCounter = ({ value, suffix = '', className = '' }) => {
  return <span className={className}>{value}{suffix}</span>;
};

/* ---------------------------------------------
   COUNTDOWN TIMER
   --------------------------------------------- */
const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const tick = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) return;
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return (
    <div className="flex items-center gap-3">
      {[
        { val: timeLeft.days, label: 'Days' },
        { val: timeLeft.hours, label: 'Hrs' },
        { val: timeLeft.minutes, label: 'Min' },
        { val: timeLeft.seconds, label: 'Sec' },
      ].map(({ val, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-black text-amber-400"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', backdropFilter: 'blur(10px)' }}>
            {String(val).padStart(2, '0')}
          </div>
          <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mt-1.5">{label}</span>
        </div>
      ))}
    </div>
  );
};

/* ---------------------------------------------
   3D TILT CARD
   --------------------------------------------- */
const TiltCard = ({ children, className = '', style = {} }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });

  const handleMouse = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <motion.div
      className={className} style={{ ...style, perspective: 800, rotateX, rotateY, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMouse}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
};

/* ---------------------------------------------
   ANIMATED BORDER GLOW
   --------------------------------------------- */
const GlowCard = ({ children, className = '', glowColor = 'rgba(251,191,36,0.15)' }) => (
  <div className={`relative group ${className}`}>
    <div className="absolute -inset-[1px] rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
      style={{ background: `linear-gradient(135deg, ${glowColor}, transparent 60%)` }} />
    <div className="relative rounded-[inherit] h-full"
      style={{ background: '#0B0F1A', border: '1px solid rgba(255,255,255,0.06)' }}>
      {children}
    </div>
  </div>
);

/* ---------------------------------------------
   INLINE EDITABLE FIELD
   --------------------------------------------- */
const EditableText = ({ value, onChange, multiline = false, className = '', placeholder = 'Click to edit...', isEditing }) => {
  const [local, setLocal] = useState(value ?? '');
  const ref = useRef(null);
  useEffect(() => setLocal(value ?? ''), [value]);

  if (!isEditing) return <span className={className}>{value || <span className="opacity-40 italic">{placeholder}</span>}</span>;

  const shared = {
    ref, value: local, placeholder,
    onChange: e => setLocal(e.target.value),
    onBlur: () => onChange(local),
    className: `bg-white/5 border border-amber-500/40 backdrop-blur-sm rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-amber-400/40 w-full text-white ${className}`,
  };
  return multiline ? <textarea rows={3} {...shared} /> : <input {...shared} />;
};

/* ---------------------------------------------
   SECTION WRAPPER WITH ANIMATIONS
   --------------------------------------------- */
const AnimatedSection = ({ id, label, children, isEditing, className = '' }) => (
  <section id={id} className={`scroll-mt-24 relative z-10 w-full ${className}`}>
    {isEditing && (
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-amber-500/15 border border-amber-500/25 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.15)]">
          Editing: {label}
        </span>
      </motion.div>
    )}
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  </section>
);

/* ---------------------------------------------
   SECTION HEADING
   --------------------------------------------- */
const SectionHeading = ({ badge, title, highlight, subtitle, align = 'left' }) => (
  <div className={align === 'center' ? 'text-center mb-16' : 'mb-12'}>
    {badge && (
      <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className={`inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-6 ${align === 'center' ? 'mx-auto' : ''}`}
        style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
        <Sparkles size={12} /> {badge}
      </motion.div>
    )}
    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
      {title}{' '}<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">{highlight}</span>
    </h2>
    {subtitle && <p className="text-slate-400 text-lg mt-4 max-w-2xl font-light leading-relaxed" style={align === 'center' ? { margin: '1rem auto 0' } : {}}>{subtitle}</p>}
  </div>
);

const DEFAULT_AVATAR = 'https://i.pinimg.com/736x/8b/16/7a/8b167afad976f5947fb84260a1280dd9.jpg';

const ModernTemplate = ({
  conf: initialConf,
  isOrganizer = false,
  onSave,
  canEditSchedule = false,
  currentUserId = null,
  members = [],
  onScheduleSave,
  currentUser = null,
  isGuest = false,
  onRequireAuthForRegister = null,
  autoOpenRegister = false,
  onSwitchToTab = null,
  onDelete = null,
  showReg = false,
  setShowReg = null,
}) => {
  const [conf, setConf] = useState(initialConf);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [activeNav, setActiveNav] = useState('about');
  const [scrolled, setScrolled] = useState(false);

  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current = document.getElementById('conf-scroll-area'); }, []);
  const { scrollY } = useScroll({ container: scrollRef });

  const heroY = useTransform(scrollY, [0, 1000], [0, 300]);
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0]);

  useEffect(() => { if (autoOpenRegister && !isGuest) setShowReg(true); }, [autoOpenRegister, isGuest]);

  useEffect(() => {
    const el = document.getElementById('conf-scroll-area');
    if (!el) return;
    const handleScroll = (e) => setScrolled(e.target.scrollTop > 400);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const getInitialPageData = (c) => ({
    title: c.title || 'Untitled Conference',
    tagline: c.tagline || 'Where Innovation Meets Excellence',
    banner_url: c.banner_url || '',
    contact_email: c.contact_email || 'contact@conference.org',
    contact_phone: c.contact_phone || '+1 (555) 000-0000',
    website: c.website || 'https://yourconference.org',
    twitter: c.twitter || '',
    linkedin: c.linkedin || '',
    schedule: c.schedule || [],
    speakers: c.speakers || [
      { name: 'Dr. Alex Rivera', role: 'Lead Researcher', org: 'MIT', img: 'https://i.pravatar.cc/150?img=21', bio: 'Pioneering researcher in AI ethics and policy.' },
      { name: 'Prof. Sarah Chen', role: 'Director', org: 'Stanford AI Lab', img: 'https://i.pravatar.cc/150?img=47', bio: 'Expert in machine learning and computer vision.' },
      { name: 'James Okafor', role: 'CEO', org: 'Nexus Technologies', img: 'https://i.pravatar.cc/150?img=33', bio: 'Industry leader building ethical AI systems at scale.' },
      { name: 'Dr. Priya Patel', role: 'Senior Scientist', org: 'DeepMind', img: 'https://i.pravatar.cc/150?img=41', bio: 'Specializes in reinforcement learning and robotics.' },
    ],
    sponsors: c.sponsors || [
      { name: 'NovaTech', tier: 'platinum' },
      { name: 'FutureCorp', tier: 'gold' },
      { name: 'DataStream', tier: 'gold' },
      { name: 'InnovateCo', tier: 'silver' },
      { name: 'TechBridge', tier: 'silver' },
    ],
    important_dates: c.important_dates || [
      { label: 'Abstract Submission Deadline', date: 'March 15, 2025' },
      { label: 'Notification of Acceptance', date: 'April 30, 2025' },
      { label: 'Early Bird Registration', date: 'May 15, 2025' },
      { label: 'Full Paper Submission', date: 'June 1, 2025' },
      { label: 'Conference Dates', date: `${initialConf.start_date || 'TBD'} - ${initialConf.end_date || 'TBD'}` },
    ],
    venue_name: c.venue_name || 'Grand Convention Center',
    venue_address: c.venue_address || c.location || 'City, Country',
    venue_description: c.venue_description || 'A world-class venue equipped with state-of-the-art facilities, multiple breakout rooms, and excellent transport links.',
    capacity: c.capacity || '500+',
    registration_fee_general: c.registration_fee_general || '$299',
    registration_fee_student: c.registration_fee_student || '$149',
    registration_fee_early: c.registration_fee_early || '$199',
    about_extra: c.about_extra || 'Join us for groundbreaking presentations, hands-on workshops, and unparalleled networking opportunities with leading researchers and practitioners from around the globe.',
  });

  const [pageData, setPageData] = useState(() => getInitialPageData(initialConf));

  // Sync state if initialConf changes from parent
  useEffect(() => {
    setConf(initialConf);
    setPageData(getInitialPageData(initialConf));
  }, [initialConf]);

  const handleCancel = () => {
    setPageData(getInitialPageData(initialConf));
    setConf(initialConf);
    setIsEditing(false);
    setSaveError(null);
  };

  const update = (key, value) => setPageData(p => ({ ...p, [key]: value }));
  const updateNested = (key, index, field, value) => {
    setPageData(p => {
      const arr = [...p[key]];
      arr[index] = { ...arr[index], [field]: value };
      return { ...p, [key]: arr };
    });
  };

  const navItems = [
    { id: 'about', label: 'About' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'speakers', label: 'Speakers' },
    { id: 'dates', label: 'Dates' },
    { id: 'venue', label: 'Venue' },
    { id: 'sponsors', label: 'Sponsors' },
    { id: 'contact', label: 'Contact' },
  ];

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActiveNav(id);
  };

  const handleSave = async () => {
    setSaving(true); setSaveError(null);
    try {
      if (onSave) await onSave({ ...pageData, description: conf.description });
      setSaved(true); setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { setSaveError(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleRegisterClick = () => {
    if (isGuest) { if (onRequireAuthForRegister) onRequireAuthForRegister(); }
    else setShowReg(true);
  };

  const sessionTypeStyle = {
    keynote: 'from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/25',
    panel: 'from-blue-500/20 to-blue-500/5 text-blue-300 border-blue-500/25',
    workshop: 'from-emerald-500/20 to-emerald-500/5 text-emerald-300 border-emerald-500/25',
    talk: 'from-sky-500/20 to-sky-500/5 text-sky-300 border-sky-500/25',
    break: 'from-slate-500/20 to-slate-500/5 text-slate-400 border-slate-500/25',
    social: 'from-rose-500/20 to-rose-500/5 text-rose-300 border-rose-500/25',
  };

  const displayName = conf.title ?? conf.name ?? 'Untitled Conference';
  const displayDate = conf.start_date ? `${conf.start_date}${conf.end_date ? ` - ${conf.end_date}` : ''}` : 'Date TBD';

  const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.12 } } };
  const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } };

  return (
    <div className="min-h-screen text-slate-200 relative selection:bg-amber-500/30" style={{ background: '#04070D', fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes morphBlob {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          25% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          50% { border-radius: 50% 60% 30% 60% / 30% 50% 70% 40%; }
          75% { border-radius: 60% 30% 50% 40% / 50% 70% 30% 60%; }
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <ScrollProgressBar scrollRef={scrollRef} />
      <CinematicBackground />

      {/* ── Registration Modal ── */}
      <AnimatePresence>
        {showReg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl"
              style={{ background: '#0B0F1A', border: '1px solid rgba(251,191,36,0.15)' }}>
              <button onClick={() => setShowReg(false)}
                className="absolute top-6 right-6 z-10 text-slate-400 hover:text-white transition-all hover:rotate-90 bg-white/5 hover:bg-white/10 rounded-full p-2">
                <X size={20} />
              </button>
              <ConferenceRegistration conf={conf} currentUser={currentUser} onSuccess={() => setShowReg(false)} onBack={() => setShowReg(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Organizer Edit Bar ── */}
      {isOrganizer && (
        <motion.div initial={{ y: -50 }} animate={{ y: 0 }}
          className="relative z-[100] px-6 py-3 flex flex-wrap items-center justify-between gap-4"
          style={{ background: 'rgba(11,15,26,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(251,191,36,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-md" style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <Edit3 size={16} className="text-amber-400" />
            </div>
            <span className="text-sm font-bold text-white tracking-wide">Organizer Panel</span>
          </div>
          <div className="flex items-center gap-3">
            {saveError && <span className="flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-3 py-1 rounded-full"><AlertCircle size={12} /> {saveError}</span>}
            {saved && <span className="text-xs text-emerald-400 font-medium bg-emerald-400/10 px-3 py-1 rounded-full">v Saved!</span>}
            {isEditing ? (
              <div className="flex gap-2">
                <button
                  onClick={onDelete}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 border border-red-500/20 hover:bg-red-500/10 transition-all mr-2"
                >
                  <Trash2 size={14} /> Delete Conference
                </button>
                <button onClick={handleCancel} className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white border border-white/5 hover:bg-white/5 transition-all">
                  <X size={14} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-1.5 rounded-lg text-sm font-bold text-black transition-all disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 0 20px rgba(251,191,36,0.3)' }}>
                  <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <button onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-5 py-1.5 rounded-lg text-sm font-bold text-black transition-all"
                style={{ background: '#fbbf24', boxShadow: '0 0 15px rgba(251,191,36,0.25)' }}>
                <Edit3 size={14} /> Edit Page
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* ══════════════════ HERO ══════════════════ */}
      <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
        {(pageData.banner_url || conf.banner_url) && (
          <div className="absolute inset-0 z-0 overflow-hidden">
            <motion.img
              initial={{ scale: 1.1 }} animate={{ scale: 1 }} transition={{ duration: 2, ease: 'easeOut' }}
              key={pageData.banner_url || conf.banner_url}
              src={pageData.banner_url || conf.banner_url} alt="Banner"
              className="w-full h-full object-cover opacity-[0.55] mix-blend-luminosity"
            />
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(4,7,13,0.2) 0%, #04070D 100%)' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 0%, rgba(4,7,13,0.7) 75%, #04070D 100%)' }} />
          </div>
        )}

        <motion.div style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 flex flex-col items-center justify-center text-center px-6 w-full max-w-5xl">

          <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col items-center">
            {/* Background URL Editor */}
            {isEditing && (
              <motion.div variants={fadeUp} className="mb-4 w-full max-w-lg">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500 mb-2 ml-1 text-center">Change Background Image URL</div>
                <EditableText value={pageData.banner_url} onChange={v => update('banner_url', v)} className="text-center w-full" isEditing={isEditing} placeholder="Image URL (Unsplash or direct link)…" />
              </motion.div>
            )}

            {/* Badge */}
            <motion.div variants={fadeUp}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] mb-8"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', backdropFilter: 'blur(10px)' }}>
              <Sparkles size={14} /> {conf.theme || 'International Conference'}
            </motion.div>

            {/* Title */}
            <motion.h1 variants={fadeUp}
              className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-[-0.04em] leading-[0.9] mb-8"
              style={{ color: 'transparent', backgroundClip: 'text', WebkitBackgroundClip: 'text', backgroundImage: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 40%, #94a3b8 100%)' }}>
              {isEditing ? (
                <div className="w-full max-w-4xl mx-auto">
                  <EditableText
                    value={pageData.title}
                    onChange={v => update('title', v)}
                    className="text-center w-full"
                    isEditing={isEditing}
                    placeholder="Conference Title…"
                  />
                </div>
              ) : (
                <RevealText delay={0.3}>{displayName}</RevealText>
              )}
            </motion.h1>

            {/* Tagline */}
            <motion.p variants={fadeUp} className="text-xl md:text-2xl text-slate-300/80 font-light max-w-2xl mb-10 leading-relaxed">
              {isEditing
                ? <EditableText value={pageData.tagline} onChange={v => update('tagline', v)} className="text-center w-full" isEditing={isEditing} placeholder="Conference tagline…" />
                : pageData.tagline}
            </motion.p>

            {/* Info Bar */}
            <motion.div variants={fadeUp}
              className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-300 mb-10 px-8 py-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
              <span className="flex items-center gap-2"><Calendar size={16} className="text-amber-400" />{displayDate}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
              <span className="flex items-center gap-2"><MapPin size={16} className="text-amber-400" />{conf.location || 'Location TBD'}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600 hidden sm:block" />
              <span className="flex items-center gap-2"><Users size={16} className="text-amber-400" />{pageData.capacity} Attendees</span>
            </motion.div>

            {/* Countdown */}
            {conf.start_date && (
              <motion.div variants={fadeUp} className="mb-10">
                <CountdownTimer targetDate={conf.start_date} />
              </motion.div>
            )}

            {/* CTA */}
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
              <MagneticButton strength={0.3}>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(251,191,36,0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRegisterClick}
                  className="relative group overflow-hidden px-10 py-4 rounded-full font-black tracking-wide text-black"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 0 25px rgba(251,191,36,0.25)' }}>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative flex items-center justify-center gap-2">
                    Register Now {isGuest && <span className="text-[10px] font-bold opacity-60 ml-1 uppercase">(Sign In)</span>}
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </motion.button>
              </MagneticButton>
              <MagneticButton strength={0.2}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => scrollTo('schedule')}
                  className="px-10 py-4 rounded-full font-bold text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)' }}>
                  <MonitorPlay size={18} /> View Schedule
                </motion.button>
              </MagneticButton>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div animate={{ y: [0, 12, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-[9px] uppercase font-black tracking-[0.3em] text-slate-500">Explore</span>
          <div className="w-[1px] h-16 bg-gradient-to-b from-amber-500/60 to-transparent" />
        </motion.div>
      </div>

      {/* ── STICKY NAV ── */}
      <nav className={`sticky top-0 z-[90] transition-all duration-700 ${scrolled ? 'py-4 opacity-100 translate-y-0' : 'py-6 opacity-0 -translate-y-4 pointer-events-none'}`}
        style={{
          background: scrolled ? 'rgba(4,7,13,0.92)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : '1px solid transparent'
        }}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {navItems.map(item => (
              <button key={item.id} onClick={() => scrollTo(item.id)}
                className={`px-5 py-2 text-sm font-semibold whitespace-nowrap rounded-full transition-all duration-300 ${activeNav === item.id ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
                style={activeNav === item.id ? { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' } : { border: '1px solid transparent' }}>
                {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleRegisterClick}
            className={`px-6 py-2 rounded-full text-xs font-bold text-black transition-all duration-300 ${scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 0 15px rgba(251,191,36,0.2)' }}
          >
            Register Now
          </button>
        </div>
      </nav>

      {/* ── MARQUEE BAND ── */}
      <MarqueeBand items={[displayName, conf.theme || 'Innovation', displayDate, conf.location || 'Global', 'Register Now', 'Call for Papers']} speed={40} />

      <div className="max-w-7xl mx-auto px-6 py-24 space-y-40 relative z-10">

        {/* ══════════════════ ABOUT ══════════════════ */}
        <AnimatedSection id="about" label="About" isEditing={isEditing}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
            <div className="lg:col-span-7 space-y-8">
              <SectionHeading badge="About the Event" title="Discover the" highlight="Experience" />
              <div className="space-y-6 text-slate-400 text-lg leading-relaxed font-light">
                {isEditing
                  ? <EditableText value={conf.description} onChange={v => setConf(p => ({ ...p, description: v }))} multiline className="w-full" isEditing={isEditing} placeholder="Conference description…" />
                  : <p>{conf.description}</p>}
                {isEditing
                  ? <EditableText value={pageData.about_extra} onChange={v => update('about_extra', v)} multiline className="w-full" isEditing={isEditing} placeholder="Additional details…" />
                  : <p>{pageData.about_extra}</p>}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                {[
                  { icon: Users, value: pageData.capacity, label: 'Attendees', color: '#fbbf24' },
                  { icon: Award, value: `${pageData.speakers.length}+`, label: 'Speakers', color: '#3b82f6' },
                  { icon: Zap, value: `${pageData.schedule.reduce((a, d) => a + (d.sessions?.length || 0), 0)}`, label: 'Sessions', color: '#10b981' },
                ].map(({ icon: Icon, value, label, color }) => (
                  <div key={label} className="rounded-2xl p-5 text-center" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                    <Icon size={20} className="mx-auto mb-2" style={{ color }} />
                    <div className="text-2xl font-black text-white">{value}</div>
                    <div className="text-[10px] uppercase tracking-widest font-bold mt-1" style={{ color, opacity: 0.7 }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Registration Tiers Card */}
            <div className="lg:col-span-5 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-600/10 to-blue-600/10 blur-3xl rounded-full" />
              <TiltCard className="relative">
                <GlowCard className="rounded-3xl">
                  <div className="p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.08), transparent 70%)' }} />
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Navigation size={20} className="text-amber-400" /> Registration Tiers</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'General Admission', key: 'registration_fee_general', color: '#fbbf24' },
                        { label: 'Student Rate', key: 'registration_fee_student', color: '#3b82f6' },
                        { label: 'Early Bird (Limited)', key: 'registration_fee_early', color: '#10b981' },
                      ].map(({ label, key, color }) => (
                        <motion.div whileHover={{ scale: 1.02 }} key={key}
                          className="rounded-2xl p-4 flex justify-between items-center transition-colors"
                          style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
                          <span className="text-slate-300 font-medium">{label}</span>
                          <span className="text-2xl font-black" style={{ color }}>
                            {isEditing
                              ? <EditableText value={pageData[key]} onChange={v => update(key, v)} className={`text-xl font-black w-24 bg-transparent border-b border-white/20 px-0 rounded-none`} isEditing={isEditing} />
                              : pageData[key]}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                    <button onClick={handleRegisterClick}
                      className="w-full mt-8 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 hover:gap-4 text-black"
                      style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 0 20px rgba(251,191,36,0.2)' }}>
                      {isGuest ? 'Sign In to Register' : 'Get Your Ticket'} <ArrowRight size={18} />
                    </button>
                  </div>
                </GlowCard>
              </TiltCard>
            </div>
          </div>
        </AnimatedSection>

        {/* ══════════════════ SCHEDULE ══════════════════ */}
        <AnimatedSection id="schedule" label="Schedule" isEditing={isEditing}>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <SectionHeading badge="Event Program" title="Conference" highlight="Schedule" subtitle="Curated sessions from world-class speakers and industry leaders." />
            {canEditSchedule && (
              <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowScheduleEditor(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-amber-400 transition-all shrink-0"
                style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                <Edit3 size={16} /> Manage Schedule
              </motion.button>
            )}
          </div>

          {pageData.schedule.length === 0 ? (
            <div className="py-24 text-center rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Clock size={48} className="text-slate-700 mx-auto mb-6" />
              <p className="text-slate-400 text-lg mb-4">The event schedule is being finalized.</p>
              {canEditSchedule && (
                <button onClick={() => setShowScheduleEditor(true)} className="text-amber-400 text-sm font-bold flex items-center justify-center gap-2 mx-auto px-6 py-2 rounded-full"
                  style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <Plus size={16} /> Create Schedule
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-12">
              {pageData.schedule.map((day, di) => (
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 * di }}
                  key={di} className="relative pl-0 md:pl-8 border-l-0 md:border-l border-white/10">
                  <div className="flex flex-wrap items-center gap-4 mb-8 -ml-0 md:-ml-[42px]">
                    <div className="text-sm font-black tracking-widest uppercase px-6 py-2 rounded-full text-black"
                      style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 0 15px rgba(251,191,36,0.2)' }}>{day.day}</div>
                    <span className="text-slate-400 font-medium">{day.date}</span>
                  </div>
                  <div className="space-y-4">
                    {day.sessions.map((session, si) => {
                      const isSessionHead = currentUserId && session.head_id === currentUserId;
                      const headMember = session.head_id ? members.find(m => m.user_id === session.head_id) : null;
                      return (
                        <SpotlightCard key={si} className="rounded-2xl" spotlightColor={isSessionHead ? 'rgba(251,191,36,0.1)' : 'rgba(251,191,36,0.05)'}>
                          <motion.div whileHover={{ scale: 1.01, x: 5 }}
                            className={`flex flex-col md:flex-row md:items-start gap-4 md:gap-8 rounded-2xl p-6 transition-all relative overflow-hidden group ${isSessionHead
                              ? 'ring-1 ring-amber-500/25'
                              : ''}`}
                            style={isSessionHead
                              ? { background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)' }
                              : { background: 'rgba(11,15,26,0.6)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
                            <div className="absolute top-0 left-0 w-1 h-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: 'linear-gradient(to bottom, #fbbf24, #f59e0b)' }} />
                            <div className="md:min-w-[120px] text-slate-400 text-sm font-mono md:pt-1 flex items-center gap-2">
                              <Clock size={14} className="opacity-50" /> {session.time}
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap gap-2 items-start justify-between mb-2">
                                <h4 className="font-bold text-white text-xl leading-tight group-hover:text-amber-200 transition-colors">{session.title}</h4>
                                <span className={`text-[10px] px-3 py-1 rounded-full border font-bold uppercase tracking-wider bg-gradient-to-r ${sessionTypeStyle[session.type] || sessionTypeStyle.talk}`}>
                                  {session.type}
                                </span>
                              </div>
                              {session.speaker && <p className="text-amber-400/70 font-medium text-sm mb-3">by {session.speaker}</p>}
                              {headMember && (
                                <div className="flex flex-wrap items-center gap-2 mt-4">
                                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider ${isSessionHead ? 'text-amber-300 border-amber-500/30' : 'text-slate-400 border-white/10'}`}
                                    style={isSessionHead ? { background: 'rgba(251,191,36,0.1)' } : { background: 'rgba(255,255,255,0.04)' }}>
                                    Session Head: {headMember.full_name || headMember.email}
                                  </span>
                                  {isSessionHead && <span className="text-[10px] font-bold px-3 py-1 rounded-full text-black" style={{ background: '#fbbf24' }}>This is You</span>}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        </SpotlightCard>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatedSection>

        {/* ══════════════════ SPEAKERS ══════════════════ */}
        <AnimatedSection id="speakers" label="Speakers" isEditing={isEditing}>
          <SectionHeading align="center" badge="Featured Speakers" title="Meet the" highlight="Visionaries" subtitle="Learn from the brightest minds shaping our future." />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pageData.speakers.map((sp, i) => (
              <TiltCard key={i}>
                <GlowCard className="rounded-3xl" glowColor="rgba(251,191,36,0.12)">
                  <div className="p-6 relative">
                    {isEditing && (
                      <button onClick={() => update('speakers', pageData.speakers.filter((_, idx) => idx !== i))}
                        className="absolute top-4 right-4 text-red-500 hover:text-red-400 bg-red-500/10 p-2 rounded-full z-10"><X size={14} /></button>
                    )}
                    {/* Avatar with animated ring */}
                    <div className="relative w-28 h-28 mx-auto mb-6">
                      <motion.div className="absolute inset-0 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                        style={{ background: 'conic-gradient(from 0deg, #fbbf24, transparent 30%, transparent 70%, #fbbf24)', padding: 2, borderRadius: '50%' }}>
                        <div className="w-full h-full rounded-full" style={{ background: '#0B0F1A' }} />
                      </motion.div>
                      <div className="absolute inset-[3px] rounded-full overflow-hidden relative">
                        <img 
                          src={sp.img || DEFAULT_AVATAR} 
                          alt={sp.name} 
                          className={`w-full h-full object-cover transition-all duration-500 ${!isEditing ? 'filter grayscale hover:grayscale-0' : ''}`} 
                        />
                      </div>
                    </div>

                    {isEditing && (
                      <div className="mb-6 px-3 py-4 rounded-2xl bg-[#0B0F1A] border-2 border-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                        <div className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] text-center mb-3">Update Photo URL</div>
                        <input 
                          type="text"
                          value={sp.img || ''} 
                          onChange={e => updateNested('speakers', i, 'img', e.target.value)} 
                          onBlur={handleSave}
                          className="w-full bg-white/5 text-white text-[11px] px-3 py-2 rounded-xl border border-white/10 outline-none focus:ring-2 focus:ring-amber-500/50 font-mono" 
                          placeholder="Paste image link here..." 
                        />
                        <div className="mt-2 text-[8px] text-slate-500 text-center italic">Changes save when you click "Save Changes" at the top</div>
                      </div>
                    )}
                    <div className="text-center">
                      <h4 className="font-bold text-white text-lg mb-1">
                        {isEditing ? <EditableText value={sp.name} onChange={v => updateNested('speakers', i, 'name', v)} className="font-bold text-center" isEditing={isEditing} /> : sp.name}
                      </h4>
                      <p className="text-amber-400 text-sm font-medium mb-1">
                        {isEditing ? <EditableText value={sp.role} onChange={v => updateNested('speakers', i, 'role', v)} className="text-center" isEditing={isEditing} /> : sp.role}
                      </p>
                      <p className="text-slate-500 text-xs uppercase tracking-wider mb-4">
                        {isEditing ? <EditableText value={sp.org} onChange={v => updateNested('speakers', i, 'org', v)} className="text-center" isEditing={isEditing} /> : sp.org}
                      </p>
                      <p className="text-slate-400 text-sm leading-relaxed pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        {isEditing ? <EditableText value={sp.bio} onChange={v => updateNested('speakers', i, 'bio', v)} multiline className="text-center w-full" isEditing={isEditing} /> : sp.bio}
                      </p>
                    </div>
                  </div>
                </GlowCard>
              </TiltCard>
            ))}
            {isEditing && (
              <motion.button whileHover={{ scale: 1.02 }}
                onClick={() => update('speakers', [...pageData.speakers, { name: 'New Speaker', role: 'Role', org: 'Organization', img: '', bio: 'Speaker bio goes here.' }])}
                className="border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all min-h-[300px]"
                style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#6b7280' }}>
                <div className="p-4 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}><Plus size={24} /></div>
                <span className="text-sm font-bold uppercase tracking-widest">Add Speaker</span>
              </motion.button>
            )}
          </div>
        </AnimatedSection>

        {/* ══════════════════ IMPORTANT DATES ══════════════════ */}
        <AnimatedSection id="dates" label="Important Dates" isEditing={isEditing}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionHeading badge="Key Milestones" title="Timeline &" highlight="Deadlines" subtitle="Don't miss these critical milestones leading up to the main event." />
              <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-4 before:w-[2px]" style={{ '--tw-before-bg': 'linear-gradient(to bottom, #fbbf24, transparent)' }}>
                <div className="absolute inset-y-0 left-4 w-[2px]" style={{ background: 'linear-gradient(to bottom, rgba(251,191,36,0.5), transparent)' }} />
                {pageData.important_dates.map((d, i) => (
                  <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                    key={i} className="flex items-center gap-6 relative pl-12">
                    <div className="absolute left-[11px] top-1/2 -translate-y-1/2 w-[10px] h-[10px] rounded-full shadow-[0_0_12px_rgba(251,191,36,0.6)]" style={{ background: '#fbbf24' }} />
                    <div className="flex-1 rounded-2xl px-6 py-4 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      style={{ background: 'rgba(11,15,26,0.6)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
                      <div className="flex items-center gap-3">
                        {isEditing && (
                          <button onClick={() => update('important_dates', pageData.important_dates.filter((_, idx) => idx !== i))} className="text-red-500 hover:bg-red-500/20 p-1 rounded-md transition-colors shrink-0"><X size={14} /></button>
                        )}
                        <span className="text-slate-200 font-bold">
                          {isEditing ? <EditableText value={d.label} onChange={v => updateNested('important_dates', i, 'label', v)} isEditing={isEditing} /> : d.label}
                        </span>
                      </div>
                      <span className="text-amber-400 font-mono text-sm px-3 py-1 rounded-md" style={{ background: 'rgba(251,191,36,0.08)' }}>
                        {isEditing ? <EditableText value={d.date} onChange={v => updateNested('important_dates', i, 'date', v)} isEditing={isEditing} /> : d.date}
                      </span>
                    </div>
                  </motion.div>
                ))}
                {isEditing && (
                  <button onClick={() => update('important_dates', [...pageData.important_dates, { label: 'New Deadline', date: 'Date TBD' }])}
                    className="ml-12 mt-6 w-[calc(100%-3rem)] border-2 border-dashed rounded-2xl py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#6b7280', background: 'rgba(255,255,255,0.01)' }}>
                    <Plus size={16} /> Add Milestone
                  </button>
                )}
              </div>
            </div>

            {/* Call for Papers */}
            <TiltCard>
              <div className="relative p-[1px] rounded-3xl overflow-hidden group">
                <div className="absolute inset-0 opacity-30 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #3b82f6, #10b981)' }} />
                <div className="relative rounded-3xl p-10 h-full" style={{ background: '#0B0F1A' }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <Target size={24} className="text-amber-400" />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-4">Call for Papers</h3>
                  <p className="text-slate-400 leading-relaxed mb-8">
                    We invite researchers to submit original work under the theme <strong className="text-amber-400 font-bold">"{conf.theme}"</strong>. Selected submissions will be published in our proceedings.
                  </p>
                  <div className="space-y-3 mb-10">
                    {(conf.submission_settings ? [
                      'Original unpublished research',
                      `Accepted Formats: ${conf.submission_settings.allowed_extensions.map(e => e.replace('.', '').toUpperCase()).join(', ')}`,
                      conf.submission_settings.require_indentation ? 'Strict Paragraph Indentation Required' : null,
                      conf.submission_settings.check_font_size ? `Minimum Font Size: ${conf.submission_settings.min_font_size}pt` : null,
                      `Maximum File Size: ${conf.submission_settings.max_file_size_mb}MB`
                    ].filter(Boolean) : [
                      'Original unpublished research',
                      'Full papers (8–12 pages)',
                      'Extended abstracts (2–4 pages)',
                      'Poster submissions'
                    ]).map(item => (
                      <div key={item} className="flex items-center gap-3 text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]" style={{ background: '#fbbf24' }} />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => onSwitchToTab && onSwitchToTab('submitPaper')}
                    className="w-full font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-black hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}>
                    Submit Paper Now <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </TiltCard>
          </div>
        </AnimatedSection>

        {/* ══════════════════ VENUE ══════════════════ */}
        <AnimatedSection id="venue" label="Venue" isEditing={isEditing}>
          <SectionHeading align="center" badge="Conference Venue" title="The" highlight="Location" subtitle="Experience seamless networking in our state-of-the-art facility." />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <GlowCard className="rounded-3xl h-full">
                <div className="p-8 lg:p-10 flex flex-col justify-between h-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2" style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.08), transparent 60%)' }} />
                  <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                      <MapPin size={32} className="text-amber-400" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-2 leading-tight">
                      {isEditing ? <EditableText value={pageData.venue_name} onChange={v => update('venue_name', v)} className="text-white text-3xl font-black" isEditing={isEditing} /> : pageData.venue_name}
                    </h3>
                    <p className="text-amber-400 font-medium mb-2">
                      {isEditing ? <EditableText value={pageData.venue_address} onChange={v => update('venue_address', v)} className="text-amber-400" isEditing={isEditing} /> : pageData.venue_address}
                    </p>
                    {isEditing && (
                      <div className="mb-6">
                        <EditableText value={pageData.map_url} onChange={v => update('map_url', v)} placeholder="Paste Google Maps URL here..." className="text-slate-500 text-sm" isEditing={isEditing} />
                      </div>
                    )}
                    <p className="text-slate-400 leading-relaxed mb-8">
                      {isEditing ? <EditableText value={pageData.venue_description} onChange={v => update('venue_description', v)} multiline className="w-full" isEditing={isEditing} /> : pageData.venue_description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-3xl font-black text-white mb-1">
                        {isEditing ? <EditableText value={pageData.capacity} onChange={v => update('capacity', v)} className="text-center" isEditing={isEditing} /> : pageData.capacity}
                      </div>
                      <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Capacity</div>
                    </div>
                    <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="text-3xl font-black text-white mb-1">{pageData.schedule.length}</div>
                      <div className="text-xs text-slate-500 uppercase tracking-widest font-bold">Days</div>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </div>
            <div className="lg:col-span-3 rounded-3xl overflow-hidden relative min-h-[400px] group border border-white/10 bg-slate-900 shadow-2xl">
              <iframe
                title="Google Map"
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ 
                  border: 0, 
                  filter: 'grayscale(1) invert(0.9) contrast(1.2) brightness(0.8)',
                  transition: 'filter 0.5s ease-in-out'
                }}
                src={pageData.map_url && pageData.map_url.includes('google.com/maps/embed') 
                  ? pageData.map_url 
                  : `https://maps.google.com/maps?q=${encodeURIComponent(pageData.venue_address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                allowFullScreen
                className="group-hover:filter-none transition-all duration-700"
              />
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, #0B0F1A, transparent 40%)' }} />
              <div className="absolute bottom-8 left-8">
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href={pageData.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pageData.venue_address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="backdrop-blur-md px-6 py-2.5 rounded-full text-white text-sm font-bold inline-block border shadow-2xl cursor-pointer hover:bg-amber-500 hover:text-black transition-all"
                  style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  📍 Open Full Map
                </motion.a>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* ══════════════════ SPONSORS ══════════════════ */}
        <AnimatedSection id="sponsors" label="Sponsors" isEditing={isEditing} className="text-center">
          <SectionHeading align="center" badge="Our Partners" title="Supported by" highlight="Industry Leaders" />
          <div className="space-y-16">
            {['platinum', 'gold', 'silver'].map(tier => {
              const tierSponsors = pageData.sponsors.filter(s => s.tier === tier);
              if (!tierSponsors.length && !isEditing) return null;

              const tierStyles = {
                platinum: { bg: 'linear-gradient(135deg, #e2e8f0, #94a3b8)', color: '#1e293b' },
                gold: { bg: 'linear-gradient(135deg, #fbbf24, #d97706)', color: '#451a03' },
                silver: { bg: 'linear-gradient(135deg, #94a3b8, #64748b)', color: '#f8fafc' },
              };

              return (
                <div key={tier} className="relative">
                  <div className="inline-block relative mb-8">
                    <span className="text-xs font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-xl"
                      style={{ background: tierStyles[tier].bg, color: tierStyles[tier].color }}>
                      {tier} Sponsors
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 max-w-5xl mx-auto">
                    {tierSponsors.map((sp) => {
                      const globalIndex = pageData.sponsors.indexOf(sp);
                      return (
                        <motion.div whileHover={{ scale: 1.05, y: -5 }} key={globalIndex}>
                          <GlowCard className={`rounded-2xl ${tier === 'platinum' ? 'w-64 h-32' : tier === 'gold' ? 'w-56 h-28' : 'w-48 h-24'}`}
                            glowColor={tier === 'platinum' ? 'rgba(226,232,240,0.1)' : tier === 'gold' ? 'rgba(251,191,36,0.1)' : 'rgba(148,163,184,0.1)'}>
                            <div className="w-full h-full flex items-center justify-center relative group">
                              {isEditing && (
                                <button onClick={() => update('sponsors', pageData.sponsors.filter((_, idx) => idx !== globalIndex))}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10"><X size={12} /></button>
                              )}
                              <span className={`font-black tracking-tight ${tier === 'platinum' ? 'text-3xl text-slate-200' : tier === 'gold' ? 'text-2xl text-amber-400' : 'text-xl text-slate-400'}`}>
                                {isEditing ? <EditableText value={sp.name} onChange={v => updateNested('sponsors', globalIndex, 'name', v)} className="text-center font-black w-32" isEditing={isEditing} /> : sp.name}
                              </span>
                            </div>
                          </GlowCard>
                        </motion.div>
                      );
                    })}
                    {isEditing && (
                      <button onClick={() => update('sponsors', [...pageData.sponsors, { name: 'Sponsor', tier }])}
                        className={`border-2 border-dashed rounded-2xl flex items-center justify-center transition-all ${tier === 'platinum' ? 'w-64 h-32' : tier === 'gold' ? 'w-56 h-28' : 'w-48 h-24'}`}
                        style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#6b7280' }}>
                        <Plus size={24} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </AnimatedSection>

        {/* ══════════════════ CONTACT ══════════════════ */}
        <AnimatedSection id="contact" label="Contact" isEditing={isEditing}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <SectionHeading badge="Reach Out" title="Get in" highlight="Touch" />
              <div className="space-y-5">
                {[
                  { icon: Mail, label: 'Email Address', key: 'contact_email', color: '#3b82f6' },
                  { icon: Phone, label: 'Phone Number', key: 'contact_phone', color: '#10b981' },
                  { icon: Globe, label: 'Official Website', key: 'website', color: '#8b5cf6' },
                  { icon: Twitter, label: 'Twitter / X', key: 'twitter', color: '#0ea5e9' },
                  { icon: Linkedin, label: 'LinkedIn', key: 'linkedin', color: '#2563eb' },
                ].map(({ icon: Icon, label, key, color }) => (
                  <motion.div whileHover={{ x: 8 }} key={key} className="flex items-center gap-5 group cursor-pointer">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all shrink-0"
                      style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
                      <Icon size={22} style={{ color }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">{label}</div>
                      {isEditing
                        ? <EditableText value={pageData[key]} onChange={v => update(key, v)} className="text-white text-lg font-medium" isEditing={isEditing} placeholder={`Enter ${label}…`} />
                        : <span className="text-white text-lg font-medium group-hover:text-amber-400 transition-colors">{pageData[key] || '—'}</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <TiltCard>
              <GlowCard className="rounded-3xl" glowColor="rgba(59,130,246,0.1)">
                <div className="p-10 relative">
                  <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.04), rgba(139,92,246,0.04))' }} />
                  <h3 className="text-2xl font-black text-white mb-8">Send an Inquiry</h3>
                  <form className="space-y-5 relative z-10" onSubmit={e => e.preventDefault()}>
                    <div className="grid grid-cols-2 gap-5">
                      <input className="rounded-xl px-5 py-4 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-400/30 transition-all font-medium"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} placeholder="First Name" />
                      <input className="rounded-xl px-5 py-4 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-400/30 transition-all font-medium"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} placeholder="Last Name" />
                    </div>
                    <input className="w-full rounded-xl px-5 py-4 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-400/30 transition-all font-medium"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} placeholder="Email Address" type="email" />
                    <textarea rows={4} className="w-full rounded-xl px-5 py-4 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-400/30 transition-all font-medium resize-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} placeholder="How can we help?" />
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="w-full font-black py-4 rounded-xl transition-all text-black"
                      style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 0 20px rgba(251,191,36,0.2)' }}>
                      Submit Message
                    </motion.button>
                  </form>
                </div>
              </GlowCard>
            </TiltCard>
          </div>
        </AnimatedSection>

      </div>

      {/* ── Schedule Editor Modal ── */}
      {showScheduleEditor && (
        <div className="relative z-[300]">
          <ScheduleEditor
            schedule={pageData.schedule} members={members}
            onSave={async (newSchedule) => {
              if (onScheduleSave) await onScheduleSave(newSchedule);
              setPageData(p => ({ ...p, schedule: newSchedule }));
            }}
            onClose={() => setShowScheduleEditor(false)}
          />
        </div>
      )}

      {/* ══════════════════ FOOTER ══════════════════ */}
      <footer className="relative mt-20 z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(251,191,36,0.03), transparent)' }} />
        <div className="max-w-7xl mx-auto py-16 px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <p className="text-2xl font-black text-white tracking-tight mb-2">{displayName}</p>
              <p className="text-slate-500 font-medium">{displayDate} <span className="mx-2 opacity-30">|</span> {conf.location}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm font-bold text-slate-600 uppercase tracking-widest">
              <a href="#" className="hover:text-amber-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-amber-400 transition-colors">Terms</a>
              <a href={`mailto:${pageData.contact_email}`} className="hover:text-amber-400 transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 pt-8 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} {displayName}. All rights reserved.</p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default ModernTemplate;