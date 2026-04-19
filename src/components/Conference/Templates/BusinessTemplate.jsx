import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import {
  MapPin, Calendar, Users, Mail, Phone, Globe,
  Twitter, Linkedin, Edit3, Check, X, Plus, Save, AlertCircle, Clock,
  ArrowRight, Trash2, TrendingUp, BarChart2, Briefcase, Globe2, Star, Shield, Award, ChevronRight, ExternalLink, Zap
} from 'lucide-react';
import ScheduleEditor from '../ScheduleEditor';
import ConferenceRegistration from './../ConferenceRegistration';

const T = {
  navy: '#01050e', // Oxford Midnight
  surface: '#08101f', // Deep Slate Surface
  glass: 'rgba(8, 16, 31, 0.7)',
  white: '#f8fafc', // Platinum
  slate: '#94a3b8', // Silver Slate
  accent: '#3b82f6', // Royal Executive Blue
  platinum: '#f8fafc',
  border: 'rgba(248, 250, 252, 0.1)',
};

/* ─────────────────────────────────────────────────────────────
   ELITE_UI_SYSTEM (PLATINUM EDITION)
   ───────────────────────────────────────────────────────────── */

const EliteCard = ({ children, title, subtitle, className = '', style = {}, gradient = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className={`relative group rounded-3xl overflow-hidden border border-white/10 ${className}`}
    style={{ background: T.surface, ...style }}
  >
    {gradient && (
       <div className="absolute inset-0 bg-gradient-to-br from-e-platinum/5 via-transparent to-transparent opacity-30" />
    )}
    <div className="relative z-10 p-8">
       {title && (
         <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-8 h-[1px] bg-e-accent" />
               <span className="text-[10px] font-black   text-e-accent uppercase tracking-widest">{title}</span>
            </div>
            {subtitle && <h3 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{subtitle}</h3>}
         </div>
       )}
       {children}
    </div>
    <CornerBrackets size={30} opacity={0.2} color={T.slate} />
  </motion.div>
);

const EliteButton = ({ children, onClick, variant = 'primary', className = '' }) => {
  const isPrimary = variant === 'primary';
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-10 py-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-500 rounded-full flex items-center justify-center gap-4 ${className}`}
      style={{
        background: isPrimary ? T.white : 'transparent',
        color: isPrimary ? T.navy : T.white,
        border: isPrimary ? 'none' : `1px solid ${T.white}30`,
        boxShadow: isPrimary ? '0 15px 30px rgba(248, 250, 252, 0.1)' : 'none'
      }}
    >
      {children}
    </motion.button>
  );
};

const EditableField = ({ value, onChange, isEditing, multiline = false, placeholder = '...' }) => {
  const [local, setLocal] = useState(value || '');
  useEffect(() => setLocal(value || ''), [value]);
  if (!isEditing) return <span>{value || placeholder}</span>;
  const style = {
    background: 'rgba(248, 250, 252, 0.03)',
    border: `1px solid ${T.slate}40`,
    borderRadius: 12,
    padding: '12px 16px',
    color: T.white,
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
   BUSINESS_TEMPLATE (PLATINUM_OXFORD)
   ───────────────────────────────────────────────────────────── */

const BusinessTemplate = ({
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
  const { scrollYProgress } = useScroll({ container: containerRef });
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });

  useEffect(() => {
    const el = document.getElementById('scroll-area');
    if (!el) return;
    const handleScroll = (e) => setScrolled(e.target.scrollTop > 50);
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { if (autoOpenRegister && !isGuest) setShowReg(true); }, [autoOpenRegister, isGuest]);

  const [pageData, setPageData] = useState({
    title: initialConf.title || 'EXECUTIVE BUSINESS SUMMIT',
    tagline: initialConf.tagline || 'Strategic Excellence in a Globalized Economy',
    banner_url: initialConf.banner_url || '',
    contact_email: initialConf.contact_email || 'summit@executive-forum.com',
    contact_phone: initialConf.contact_phone || '+1 (212) 555-0100',
    website: initialConf.website || 'https://executive-forum.com',
    twitter: initialConf.twitter || '@exec_summit',
    linkedin: initialConf.linkedin || '',
    schedule: initialConf.schedule || [],
    speakers: initialConf.speakers || [
      { name: 'Dr. Michael Chen', role: 'Executive Speaker', org: 'Global Strategies', img: 'https://i.pravatar.cc/150?img=68', bio: 'Expert in corporate optimization and international market frameworks.' },
      { name: 'Sarah Jenkins', role: 'Operations Lead', org: 'Innovation Corp', img: 'https://i.pravatar.cc/150?img=44', bio: 'Pioneered the integration of emerging technologies in resource management.' },
    ],
    sponsors: initialConf.sponsors || [
      { name: 'Primary Partner', tier: 'platinum' },
      { name: 'Lead Sponsor', tier: 'gold' },
    ],
    important_dates: initialConf.important_dates || [
      { label: 'Conference Opening', date: initialConf.start_date || 'APR 20' },
    ],
    venue_name: initialConf.venue_name || 'The Grand Hall',
    venue_address: initialConf.venue_address || initialConf.location || 'Financial District, NY',
    venue_description: initialConf.venue_description || 'A flagship destination for high-level discussion and premium networking.',
    capacity: initialConf.capacity || '500 Attendees',
    registration_fee_general: initialConf.registration_fee_general || '$2,500',
    registration_fee_student: initialConf.registration_fee_student || '$800',
    registration_fee_early: initialConf.registration_fee_early || '$1,800',
    about_extra: initialConf.about_extra || 'This conference brings together industry leaders and policymakers for strategic high-level dialogue.',
    themes: initialConf.themes || ['Capital Markets', 'Strategic Growth', 'Emerging Tech', 'Leadership'],
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

  const displayName = pageData.title.toUpperCase();
  const displayDate = conf.start_date ? `${conf.start_date}${conf.end_date ? ` – ${conf.end_date}` : ''}` : 'DATE NOT ANNOUNCED';

  return (
    <div className="min-h-screen text-[#f8fafc] selection:bg-e-accent/20" 
         style={{ background: T.navy, fontFamily: "'Outfit', sans-serif" }}>
      
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
      
      {/* ── MODALS ── */}
      <AnimatePresence>
        {showReg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-3xl bg-black/80">
            <EliteCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto !p-0 shadow-3xl" style={{ background: '#08101f' }}>
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div>
                   <span className="text-[10px] font-black text-e-accent tracking-widest uppercase mb-1 block">Registration</span>
                   <h2 className="text-xl font-black uppercase">Delegate Registration</h2>
                </div>
                <button onClick={() => setShowReg(false)} className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:bg-white text-white hover:text-black transition-all"><X size={20} /></button>
              </div>
              <div className="p-10">
                <ConferenceRegistration conf={conf} currentUser={currentUser} onSuccess={() => setShowReg(false)} onBack={() => setShowReg(false)} />
              </div>
            </EliteCard>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScheduleEditor && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4">
            <div className="w-full h-full max-w-7xl bg-e-surface rounded-[2rem] overflow-hidden flex flex-col border border-white/10" style={{ background: T.surface }}>
              <div className="p-8 border-b border-white/5 flex justify-between items-center">
                 <span className="text-[10px] font-black text-e-accent tracking-widest uppercase">Schedule Editor</span>
                 <button onClick={() => setShowScheduleEditor(false)} className="hover:rotate-90 transition-transform duration-500"><X size={32} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <ScheduleEditor initialSchedule={conf.schedule || []} conferenceId={conf.conference_id} onSave={async (s) => { await onScheduleSave(s); setShowScheduleEditor(false); }} onCancel={() => setShowScheduleEditor(false)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SCROLL PROGRESS ── */}
      <motion.div className="fixed top-0 left-0 right-0 h-[2px] z-[120] origin-left bg-e-accent shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ scaleX }} />

      <div ref={containerRef} className="h-screen overflow-y-auto overflow-x-hidden relative no-scrollbar" id="scroll-area">
        
        {/* ── ORGANIZER HUD ── */}
        {isOrganizer && (
          <div className="relative z-[110] px-10 py-3 flex items-center justify-between border-b border-white/10" style={{ background: T.surface }}>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-e-accent animate-pulse" />
              <span className="text-[10px] font-black tracking-widest text-white/60 uppercase">Organizer Mode Active</span>
            </div>
            <div className="flex items-center gap-8">
              {saveError && <span className="text-[9px] text-rose-400 font-black uppercase tracking-widest">{saveError}</span>}
              {saved && <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest">Changes Saved</span>}
              {isEditing ? (
                <div className="flex gap-6">
                  <button onClick={onDelete} className="text-[9px] font-black text-rose-500 hover:underline uppercase">Delete</button>
                  <button onClick={() => setIsEditing(false)} className="text-[9px] font-black text-white/40 hover:text-white uppercase">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="text-[9px] font-black text-e-accent hover:underline uppercase">{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              ) : (
                <button onClick={() => setIsEditing(true)} className="text-[9px] font-black text-e-accent hover:underline uppercase">Edit Page</button>
              )}
            </div>
          </div>
        )}

        {/* ══════════ HERO SECTION ══════════ */}
        <header className="min-h-screen flex flex-col justify-center relative overflow-hidden px-10 py-20 pb-0">
          <div className="absolute inset-0 z-0 overflow-hidden">
             {pageData.banner_url && <img src={pageData.banner_url} className="w-full h-full object-cover opacity-10 filter grayscale brightness-[0.4]" alt="" />}
             <div className="absolute inset-0 bg-gradient-to-tr from-e-navy via-e-navy/95 to-transparent" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] bg-e-accent/5 blur-[150px] rounded-full pointer-events-none" />
             <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-white/5 blur-[120px] rounded-full pointer-events-none" />
          </div>
          
          <div className="max-w-7xl mx-auto w-full relative z-10 grid lg:grid-cols-12 gap-24 items-center">
            <div className="lg:col-span-8">
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.2, ease: "easeOut" }}>
                <div className="flex items-center gap-4 mb-10 overflow-hidden">
                   <div className="h-[1px] w-12 bg-e-accent" />
                   <span className="text-[11px] font-black tracking-widest text-e-accent uppercase border-r border-white/10 pr-6">
                     EXECUTIVE BUSINESS SUMMIT // {new Date().getFullYear()}
                   </span>
                   <Shield size={14} className="text-e-accent/60" />
                </div>
                
                <h1 className="text-7xl md:text-9xl font-black text-white leading-[0.8] tracking-tighter mb-10">
                   {isEditing ? (
                     <input value={pageData.title} onChange={e => update('title', e.target.value)} className="bg-transparent border-b-2 border-e-accent/20 outline-none w-full" />
                   ) : displayName}
                </h1>

                <p className="text-2xl md:text-3xl text-e-slate font-light tracking-tight mb-16 max-w-2xl leading-snug">
                   {isEditing ? (
                     <EditableField value={pageData.tagline} onChange={v => update('tagline', v)} isEditing />
                   ) : pageData.tagline}
                </p>

                <div className="flex flex-wrap gap-6 items-center">
                   <EliteButton onClick={handleRegisterClick} variant="primary">
                      <span>Register Now</span>
                      <ArrowRight size={16} />
                   </EliteButton>
                   <EliteButton onClick={() => {
                     const el = document.getElementById('about');
                     if (el) el.scrollIntoView({ behavior: 'smooth' });
                   }} variant="secondary">
                      <span>View Details</span>
                   </EliteButton>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-4 self-stretch flex flex-col justify-center">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
                 className="p-12 border border-white/10 bg-white/[0.03] backdrop-blur-3xl space-y-10 rounded-[2.5rem] shadow-3xl"
               >
                  {[
                    { label: 'Event Dates', val: displayDate, icon: Calendar },
                    { label: 'Venue Location', val: pageData.venue_name, icon: MapPin },
                    { label: 'Total Capacity', val: pageData.capacity, icon: Users },
                  ].map(({ label, val, icon: Icon }) => (
                    <div key={label} className="group cursor-default">
                       <div className="flex items-center gap-3 mb-2">
                          <Icon size={14} className="text-e-accent" />
                          <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">{label}</span>
                       </div>
                       <span className="text-xl font-bold text-white tracking-wide group-hover:text-e-accent transition-colors block">{val}</span>
                    </div>
                  ))}
                  
                  <div className="pt-6 border-t border-white/5 flex flex-wrap gap-2">
                     {pageData.themes.map((t, idx) => (
                       <span key={idx} className="text-[9px] font-black text-white/40 border border-white/10 px-3 py-1 uppercase tracking-widest hover:border-e-accent hover:text-e-accent transition-all">{t}</span>
                     ))}
                  </div>
               </motion.div>
            </div>
          </div>
        </header>

        {/* ── STICKY NAV ── */}
        <nav className={`sticky top-0 z-[100] transition-all duration-700 border-b ${scrolled ? 'py-4 bg-e-navy/95 backdrop-blur-2xl border-white/10 shadow-2xl shadow-black/60' : 'py-8 bg-transparent border-transparent'}`}
             style={scrolled ? {} : { background: 'linear-gradient(to bottom, rgba(1,5,14,1), transparent)' }}>
           <div className="max-w-7xl mx-auto px-10 flex items-center justify-between">
              <div className="flex items-center gap-14 overflow-x-auto no-scrollbar">
                {['about', 'schedule', 'speakers', 'dates', 'venue', 'sponsors', 'contact'].map(id => (
                  <button 
                    key={id} 
                    onClick={() => { 
                      const el = document.getElementById(id);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                      setActiveNav(id); 
                    }}
                    className={`text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap relative ${activeNav === id ? 'text-white' : 'text-white/30 hover:text-e-accent'}`}
                  >
                    {id}
                    {activeNav === id && <motion.div layoutId="navline" className="absolute -bottom-2 left-0 right-0 h-0.5 bg-e-accent shadow-[0_0_12px_rgba(59,130,246,0.6)]" />}
                  </button>
                ))}
              </div>
              <EliteButton onClick={handleRegisterClick} className="hidden md:block !py-2.5 !px-8 !text-[10px]">Register Now</EliteButton>
           </div>
        </nav>

        <main className="max-w-7xl mx-auto px-10 py-48 space-y-64">

          {/* ══════════ ABOUT ══════════ */}
          <section id="about" className="scroll-mt-48">
            <div className="grid lg:grid-cols-12 gap-24 items-start">
               <div className="lg:col-span-8 space-y-12">
                  <div className="space-y-4">
                     <span className="text-[11px] font-black text-e-accent tracking-widest uppercase block">Conference Overview</span>
                     <h2 className="text-7xl font-black text-white uppercase tracking-tighter">Strategic<br/><span className="text-e-accent italic">Horizon.</span></h2>
                  </div>
                  <div className="text-2xl text-e-slate leading-relaxed font-light space-y-12">
                     <p className="first-letter:text-9xl first-letter:font-black first-letter:text-white first-letter:mr-8 first-letter:float-left first-letter:mt-4">
                        {isEditing ? <EditableField value={conf.description} onChange={v => setConf(p => ({ ...p, description: v }))} multiline isEditing /> : conf.description}
                     </p>
                     <p className="p-12 border border-white/10 bg-white/[0.02] border-l-[12px] border-l-e-accent text-white text-2xl font-medium tracking-tight leading-snug">
                        {isEditing ? <EditableField value={pageData.about_extra} onChange={v => update('about_extra', v)} multiline isEditing /> : pageData.about_extra}
                     </p>
                  </div>
               </div>

               <div className="lg:col-span-4">
                  <EliteCard title="Registration Fees" gradient className="!p-10 shadow-e-accent/5 shadow-2xl">
                     <div className="space-y-10">
                        {[
                          { l: 'General Admission', key: 'registration_fee_general', c: T.white },
                          { l: 'Early Registration', key: 'registration_fee_early', c: T.white },
                          { l: 'Student Rate', key: 'registration_fee_student', c: T.slate },
                        ].map(({ l, key, c }) => (
                          <div key={key} className="flex justify-between items-end border-b border-white/5 pb-4">
                             <span className="text-[10px] font-black text-white/20 tracking-widest uppercase">{l}</span>
                             <span className="text-3xl font-black" style={{ color: c }}>
                                {isEditing ? <EditableField value={pageData[key]} onChange={v => update(key, v)} isEditing /> : pageData[key]}
                             </span>
                          </div>
                        ))}
                        <div className="pt-6">
                           <EliteButton onClick={handleRegisterClick} className="w-full">Register Now</EliteButton>
                           <p className="text-[9px] text-center mt-6 text-white/10 uppercase tracking-widest leading-loose">Official corporate registration portal is active</p>
                        </div>
                     </div>
                  </EliteCard>
               </div>
            </div>
          </section>

          {/* ══════════ AGENDA ══════════ */}
          <section id="schedule" className="scroll-mt-48">
             <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-12">
                <div className="space-y-4">
                   <span className="text-[11px] font-black text-e-accent tracking-widest uppercase block">Event Itinerary</span>
                   <h2 className="text-7xl font-black text-white uppercase tracking-tighter">Executive <span className="text-e-accent italic">Program.</span></h2>
                </div>
                {canEditSchedule && (
                  <EliteButton onClick={() => setShowScheduleEditor(true)} variant="secondary" className="!px-12 !py-2">Modify Schedule</EliteButton>
                )}
             </div>

             {pageData.schedule.length > 0 ? (
               <div className="space-y-20">
                  <div className="flex gap-4 justify-center md:justify-start overflow-x-auto no-scrollbar pb-4">
                     {pageData.schedule.map((day, di) => (
                       <button key={di} onClick={() => setScheduleDay(di)}
                               className={`px-14 py-5 text-[11px] font-black tracking-widest uppercase transition-all border-b-2 whitespace-nowrap ${scheduleDay === di ? 'text-white border-e-accent bg-e-accent/5' : 'text-white/20 border-white/5 hover:text-white'}`}>
                          Day_0{di+1}
                       </button>
                     ))}
                  </div>
                  <div className="grid gap-4">
                     {pageData.schedule[scheduleDay]?.sessions.map((s, si) => (
                       <motion.div 
                          key={si} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: si * 0.1 }}
                          className="group grid md:grid-cols-12 items-center p-10 bg-white/[0.01] border border-white/5 rounded-[2rem] hover:bg-white/[0.04] hover:border-e-accent/40 transition-all cursor-default"
                       >
                          <div className="md:col-span-2 space-y-1 mb-6 md:mb-0">
                             <div className="text-[9px] font-black text-e-accent tracking-widest uppercase">Start Time</div>
                             <div className="text-3xl font-black text-white group-hover:text-e-accent transition-colors">{s.time}</div>
                          </div>
                          <div className="md:col-span-8 space-y-3">
                             <div className="flex items-center gap-4">
                                <span className="px-3 py-0.5 bg-white/5 border border-white/10 rounded-full text-[9px] font-black text-white/40 tracking-widest uppercase">{s.type}</span>
                                {s.speaker && <span className="text-[10px] font-black text-e-accent tracking-widest uppercase">// Speaker: {s.speaker}</span>}
                             </div>
                             <h4 className="text-3xl font-bold text-white group-hover:translate-x-2 transition-transform duration-500">{s.title}</h4>
                          </div>
                          <div className="md:col-span-2 flex justify-end">
                             <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center group-hover:bg-e-accent transition-all">
                                <ChevronRight size={24} className="group-hover:text-e-navy text-white/20 transition-all" />
                             </div>
                          </div>
                       </motion.div>
                     ))}
                  </div>
               </div>
             ) : (
               <div className="py-48 border border-white/5 rounded-[4rem] flex flex-col items-center gap-8 bg-white/[0.01]">
                  <Clock size={64} className="text-white/5" />
                  <span className="text-[11px] font-black text-white/20 tracking-widest uppercase">Schedule Finalization in Progress</span>
               </div>
             )}
          </section>

          {/* ══════════ SPEAKERS ══════════ */}
          <section id="speakers" className="scroll-mt-48">
             <div className="flex flex-col md:flex-row md:items-end justify-between mb-32 gap-12">
                <div className="space-y-4">
                   <span className="text-[11px] font-black text-e-accent tracking-widest uppercase block">Elite Network</span>
                   <h2 className="text-7xl font-black text-white uppercase tracking-tighter">Distinguished <span className="text-e-accent italic">Speakers.</span></h2>
                </div>
                <div className="h-px flex-1 bg-white/10 hidden lg:block" />
             </div>
             
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
                {pageData.speakers.map((sp, i) => (
                  <motion.div key={i} whileHover={{ y: -15 }} className="group relative">
                     <div className="relative aspect-[3/4] rounded-[2.5rem] overflow-hidden bg-e-surface mb-8 border border-white/5 shadow-2xl">
                        {isEditing && (
                          <button onClick={() => update('speakers', pageData.speakers.filter((_, idx) => idx !== i))}
                                  className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center hover:scale-110 shadow-xl transition-all"><Trash2 size={16} /></button>
                        )}
                        {sp.img && !isEditing ? (
                          <img src={sp.img} className="w-full h-full object-cover grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-1000" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Users size={64} className="text-white/5" /></div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-8 pt-20 bg-gradient-to-t from-e-navy to-transparent">
                           <span className="text-[10px] font-black text-e-accent tracking-widest uppercase mb-1 block">
                             {isEditing ? <EditableField value={sp.role} onChange={v => updateNested('speakers', i, 'role', v)} isEditing /> : sp.role}
                           </span>
                           <h4 className="text-3xl font-black text-white uppercase leading-none">
                             {isEditing ? <EditableField value={sp.name} onChange={v => updateNested('speakers', i, 'name', v)} isEditing /> : sp.name}
                           </h4>
                        </div>
                     </div>
                     <div className="space-y-4 px-2">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                           @ {isEditing ? <EditableField value={sp.org} onChange={v => updateNested('speakers', i, 'org', v)} isEditing /> : sp.org}
                        </span>
                        <p className="text-base text-e-slate font-light leading-relaxed italic opacity-70 line-clamp-3">
                           {isEditing ? <EditableField value={sp.bio} onChange={v => updateNested('speakers', i, 'bio', v)} multiline isEditing /> : `"${sp.bio}"`}
                        </p>
                     </div>
                  </motion.div>
                ))}
                {isEditing && (
                   <button onClick={() => update('speakers', [...pageData.speakers, { name: 'New Speaker', role: 'Role', org: 'Entity', img: '', bio: 'Initializing...' }])}
                           className="aspect-[3/4] border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 text-white/10 hover:text-e-accent hover:border-e-accent/40 transition-all group">
                      <div className="w-20 h-20 rounded-full border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                         <Plus size={36} />
                      </div>
                      <span className="text-[12px] font-black tracking-widest uppercase">Add Delegate</span>
                   </button>
                )}
             </div>
          </section>

          {/* ══════════ DATES ══════════ */}
          <section id="dates" className="scroll-mt-48 text-center lg:text-left">
             <div className="grid lg:grid-cols-2 gap-32 items-center">
                <div className="space-y-20">
                   <div className="space-y-4">
                      <span className="text-[11px] font-black text-e-accent tracking-widest uppercase block">Critical Roadmap</span>
                      <h2 className="text-7xl font-black text-white uppercase tracking-tighter">Key <span className="text-e-accent italic">Deadlines.</span></h2>
                   </div>
                   <div className="space-y-6">
                      {pageData.important_dates.map((d, i) => (
                        <div key={i} className="flex justify-between items-center p-10 bg-white/[0.01] border border-white/5 rounded-[2rem] hover:bg-e-accent/5 hover:border-e-accent/30 transition-all group">
                           <div className="flex items-center gap-8">
                              <Star size={20} className="text-e-accent opacity-20 group-hover:opacity-100 transition-opacity" />
                              <span className="text-xl font-black text-white/60 tracking-widest uppercase">
                                 {isEditing ? <EditableField value={d.label} onChange={v => updateNested('important_dates', i, 'label', v)} isEditing /> : d.label}
                              </span>
                           </div>
                           <div className="flex items-center gap-8">
                              <span className="text-2xl font-black text-white">
                                 {isEditing ? <EditableField value={d.date} onChange={v => updateNested('important_dates', i, 'date', v)} isEditing /> : d.date}
                              </span>
                              {isEditing && (
                                <button onClick={() => update('important_dates', pageData.important_dates.filter((_, idx) => idx !== i))} className="text-rose-500 hover:scale-125 transition-transform"><Trash2 size={20} /></button>
                              )}
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <EliteCard title="CALL FOR PAPERS" className="!p-16 border-none shadow-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #08101f 0%, #01050e 100%)' }}>
                   <div className="relative z-10 space-y-12">
                      <div className="space-y-4">
                         <h3 className="text-5xl font-black text-white uppercase tracking-tight">Executive <span className="text-e-accent italic">Submissions.</span></h3>
                         <p className="text-e-slate text-xl font-light italic leading-relaxed">
                            Contribute original insights for the main plenary sessions and technical research tracks.
                         </p>
                      </div>
                      <div className="grid gap-4 max-w-sm">
                         {['Original Industry Analysis', 'Policy Frameworks'].map(ch => (
                           <div key={ch} className="flex items-center gap-4 py-4 px-8 bg-white/5 border border-white/5 rounded-2xl">
                              <Check size={20} className="text-e-accent" />
                              <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">{ch}</span>
                           </div>
                         ))}
                      </div>
                      <EliteButton onClick={() => onSwitchToTab?.('submitPaper')} className="w-full !rounded-2xl !bg-white !text-e-navy !font-black !scale-105">Submit Paper Now</EliteButton>
                   </div>
                   <div className="absolute -top-10 -right-10 w-64 h-64 bg-e-accent/5 blur-[80px] rounded-full" />
                </EliteCard>
             </div>
          </section>

          {/* ══════════ VENUE ══════════ */}
          <section id="venue" className="scroll-mt-48">
             <div className="grid lg:grid-cols-2 gap-32 items-center">
                <div className="space-y-16">
                   <div className="space-y-4">
                      <span className="text-[11px] font-black text-e-accent tracking-widest uppercase block">Venue Information</span>
                      <h2 className="text-7xl font-black text-white uppercase tracking-tighter">The <span className="italic">Location.</span></h2>
                   </div>
                   <div className="space-y-12">
                      <div className="flex items-center gap-10 group">
                         <div className="w-24 h-24 rounded-3xl bg-e-surface border border-white/10 flex items-center justify-center shadow-3xl group-hover:scale-110 group-hover:border-e-accent transition-all duration-700">
                            <MapPin size={40} className="text-e-accent" />
                         </div>
                         <div>
                            <h3 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">
                               {isEditing ? <EditableField value={pageData.venue_name} onChange={v => update('venue_name', v)} isEditing /> : pageData.venue_name}
                            </h3>
                            <span className="text-xl font-bold text-e-slate block tracking-widest uppercase">{pageData.venue_address}</span>
                         </div>
                      </div>
                      <p className="text-2xl text-e-slate font-light italic leading-relaxed opacity-80">
                         {isEditing ? <EditableField value={pageData.venue_description} onChange={v => update('venue_description', v)} multiline isEditing /> : pageData.venue_description}
                      </p>
                      <EliteButton variant="secondary" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pageData.venue_address)}`, '_blank')} className="!px-12 !rounded-2xl !text-[10px]">Open in Maps</EliteButton>
                   </div>
                </div>
                <div className="relative aspect-square bg-e-surface rounded-[3rem] overflow-hidden p-8 shadow-3xl border border-white/10">
                   <div className="h-full w-full border border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center gap-12 relative z-10 group bg-e-navy/40">
                      <div className="relative">
                         <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 20, ease: 'linear' }} className="absolute -inset-10 border border-e-accent/10 rounded-full border-dashed" />
                         <MapPin size={100} className="text-e-accent opacity-20 group-hover:opacity-100 transition-all duration-1000 group-hover:scale-110" />
                      </div>
                      <div className="text-center space-y-6">
                         <span className="text-[10px] font-black text-white/20 tracking-widest uppercase block animate-pulse">Location Confirmed</span>
                         <code className="text-white/40 text-[11px] font-mono leading-relaxed block bg-black/40 p-10 border border-white/5 rounded-3xl shadow-inner uppercase">
                            VENUE: {pageData.venue_name.toUpperCase()}<br/>
                            CITY: {pageData.venue_address.toUpperCase()}<br/>
                            STATUS: ACTIVE_NODE
                         </code>
                      </div>
                   </div>
                   <CornerBrackets color={T.slate} size={60} opacity={0.3} />
                </div>
             </div>
          </section>

          {/* ══════════ SPONSORS ══════════ */}
          <section id="sponsors" className="scroll-mt-48">
             <div className="flex flex-col md:flex-row md:items-end justify-between mb-32 gap-12">
                <div className="space-y-4">
                   <span className="text-[11px] font-black text-e-accent tracking-widest uppercase block">Corporate Partners</span>
                   <h2 className="text-7xl font-black text-white uppercase tracking-tighter">Official <span className="text-e-accent italic">Sponsors.</span></h2>
                </div>
                <div className="h-px flex-1 bg-white/10 hidden lg:block" />
             </div>

             <div className="space-y-32">
                {['platinum', 'gold', 'silver'].map(tier => {
                   const tierSponsors = pageData.sponsors.filter(s => s.tier === tier);
                   if (!tierSponsors.length && !isEditing) return null;
                   return (
                     <div key={tier} className="space-y-16">
                       <span className="text-[12px] font-black text-white/30 tracking-widest uppercase border-l-4 border-e-accent pl-8 block">{tier.toUpperCase()} LEVEL PARTNERS</span>
                       <div className="flex flex-wrap gap-12">
                          {tierSponsors.map((sp, idx) => {
                             const gi = pageData.sponsors.indexOf(sp);
                             return (
                               <motion.div 
                                 key={idx} whileHover={{ y: -10, scale: 1.05 }}
                                 className="bg-white/[0.01] border border-white/5 p-16 hover:bg-white/[0.04] hover:border-e-accent/30 transition-all relative rounded-[2rem] flex items-center justify-center min-w-[320px] shadow-2xl"
                               >
                                  {isEditing && (
                                    <button onClick={() => update('sponsors', pageData.sponsors.filter((_, i) => i !== gi))} className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"><X size={18} /></button>
                                  )}
                                  <span className="text-4xl font-black text-white uppercase tracking-tighter group-hover:text-e-accent transition-colors">
                                     {isEditing ? <EditableField value={sp.name} onChange={v => updateNested('sponsors', gi, 'name', v)} isEditing /> : sp.name}
                                  </span>
                               </motion.div>
                             )
                          })}
                          {isEditing && (
                             <button onClick={() => update('sponsors', [...pageData.sponsors, { name: 'New Sponsor', tier }])}
                                     className="px-20 py-12 border-2 border-dashed border-white/5 rounded-[2rem] text-white/10 text-[12px] font-black uppercase tracking-widest hover:text-e-accent hover:border-e-accent/30 transition-all">
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
          <section id="contact" className="scroll-mt-48">
             <EliteCard className="!p-0 overflow-hidden border-none shadow-3xl !rounded-[3rem]">
                <div className="grid lg:grid-cols-2">
                   <div className="p-24 space-y-24 bg-e-surface">
                      <div className="space-y-4">
                         <span className="text-[11px] font-black text-e-accent tracking-widest uppercase block">Support Hub</span>
                         <h2 className="text-7xl font-black text-white uppercase tracking-tighter">Contact <span className="italic">Us.</span></h2>
                      </div>
                      <div className="space-y-16">
                         {[
                           { key: 'contact_email', label: 'OFFICIAL EMAIL', icon: Mail },
                           { key: 'contact_phone', label: 'DIRECT LINE', icon: Phone },
                           { key: 'linkedin', label: 'PROFESSIONAL NETWORK', icon: Linkedin },
                         ].map(({ key, label, icon: Icon }) => (
                           <div key={key} className="group cursor-default">
                              <div className="flex items-center gap-4 mb-4">
                                 <Icon size={16} className="text-e-accent" />
                                 <span className="text-[10px] font-black text-white/20 tracking-widest uppercase">{label}</span>
                              </div>
                              <span className="text-3xl font-black text-white group-hover:text-e-accent transition-colors truncate block">
                                 {isEditing ? <EditableField value={pageData[key]} onChange={v => update(key, v)} isEditing /> : pageData[key] || '---'}
                              </span>
                           </div>
                         ))}
                      </div>
                   </div>
                   <div className="p-24 space-y-16 relative" style={{ background: T.navy }}>
                      <div className="absolute inset-0 bg-e-accent/5 pointer-events-none" />
                      <div className="relative z-10 space-y-4">
                         <span className="text-[11px] font-black text-e-accent tracking-widest uppercase block">Send a Message</span>
                         <h4 className="text-4xl font-black text-white uppercase tracking-tight">Inquire.</h4>
                      </div>
                      <div className="relative z-10 space-y-6">
                         {['Full Name', 'Email Address', 'Subject'].map(ph => (
                            <input key={ph} placeholder={ph} className="w-full bg-white/[0.02] border border-white/5 p-8 text-[11px] font-black uppercase text-white tracking-widest outline-none focus:border-e-accent transition-all rounded-2xl" />
                         ))}
                         <textarea placeholder="Message content..." rows={4} className="w-full bg-white/[0.02] border border-white/5 p-8 text-[11px] font-black uppercase text-white tracking-widest outline-none focus:border-e-accent transition-all rounded-2xl resize-none" />
                         <EliteButton className="w-full !rounded-2xl !bg-white !text-e-navy !font-black">Submit Message</EliteButton>
                      </div>
                      <div className="text-[10px] font-black text-white/10 uppercase tracking-widest text-center pt-8">Professional Inquiry Portal</div>
                   </div>
                </div>
             </EliteCard>
          </section>
        </main>

        {/* ── FOOTER ── */}
        <footer className="p-32 border-t border-white/5" style={{ background: T.surface }}>
           <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-24 relative z-10">
              <div className="text-center md:text-left">
                 <h2 className="text-6xl font-black text-white uppercase tracking-tighter mb-6">{displayName}</h2>
                 <span className="text-[11px] font-black text-e-accent tracking-widest uppercase border-l-4 border-e-accent pl-10">// CONFERENCE ID: {conf.conference_id?.substring(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-24">
                 <div className="text-right hidden md:block">
                    <span className="text-[10px] font-black text-white/20 tracking-widest uppercase block mb-1">Status</span>
                    <span className="text-[12px] font-black text-e-accent tracking-widest uppercase">Portal Active</span>
                 </div>
                 <div className="w-px h-24 bg-white/10" />
                 <span className="text-[12px] font-black text-white/10 tracking-widest uppercase whitespace-nowrap">© {new Date().getFullYear()} EXECUTIVE SUMMIT</span>
              </div>
           </div>
        </footer>
      </div>
    </div>
  );
};

const CornerBrackets = ({ color = '#cbd5e1', size = 40, opacity = 0.4 }) => (
  <>
    <div style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}`, opacity, borderRadius: '1.5rem 0 0 0' }} />
    <div style={{ position: 'absolute', top: 0, right: 0, width: size, height: size, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}`, opacity, borderRadius: '0 1.5rem 0 0' }} />
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: size, height: size, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}`, opacity, borderRadius: '0 0 0 1.5rem' }} />
    <div style={{ position: 'absolute', bottom: 0, right: 0, width: size, height: size, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}`, opacity, borderRadius: '0 0 1.5rem 0' }} />
  </>
);

export default BusinessTemplate;
