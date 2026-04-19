import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin, Calendar, Users, Mail, Phone, Globe,
  Twitter, Linkedin, Edit3, Check, X, Plus, Trash2, Save, AlertCircle, Clock,
  ArrowRight, BookOpen, Quote, Award, Map, ChevronRight, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScheduleEditor from '../ScheduleEditor';

/* ─────────────────────────────────────────────
   PALETTE & TOKENS
   ───────────────────────────────────────────── */
const C = {
  bg: '#FDFCFB',
  paper: '#FFFFFF',
  ink: '#1A1714',
  inkLight: '#4B4237',
  inkMuted: '#948B7F',
  rule: '#E2DFDA',
  accent: '#C5A059',
  accentWarm: '#894B34',
  gold: '#C5A059',
  surface: 'rgba(26, 23, 20, 0.03)',
};

/* ─────────────────────────────────────────────
   INLINE EDITABLE FIELD
   ───────────────────────────────────────────── */
const EditableField = ({ value, onChange, multiline = false, className = '', placeholder = 'Click to edit…', isEditing }) => {
  const [local, setLocal] = useState(value ?? '');
  const ref = useRef(null);
  useEffect(() => setLocal(value ?? ''), [value]);

  if (!isEditing) {
    return <span className={className}>{value || <span style={{ opacity: 0.35, fontStyle: 'italic' }}>{placeholder}</span>}</span>;
  }

  const base = {
    ref,
    value: local,
    placeholder,
    onChange: e => setLocal(e.target.value),
    onBlur: () => onChange(local),
    style: {
      background: 'rgba(139,58,26,0.07)',
      border: '1px solid rgba(139,58,26,0.4)',
      borderRadius: '4px',
      padding: '2px 6px',
      outline: 'none',
      width: '100%',
      fontFamily: 'inherit',
      fontSize: 'inherit',
      color: 'inherit',
    },
    className,
  };
  return multiline ? <textarea rows={4} {...base} /> : <input {...base} />;
};

/* ─────────────────────────────────────────────
   RULE DIVIDER
   ───────────────────────────────────────────── */
const Rule = ({ thick = false }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: thick ? 3 : 0, margin: '0 0 0 0' }}>
    <div style={{ height: thick ? 3 : 1, background: C.ink }} />
    {thick && <div style={{ height: 1, background: C.ink, marginTop: 2 }} />}
  </div>
);

/* ─────────────────────────────────────────────
   SECTION LABEL (editing indicator)
   ───────────────────────────────────────────── */
const EditBadge = ({ label }) => (
  <div style={{ marginBottom: 8 }}>
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
      color: C.accentWarm, background: 'rgba(139,58,26,0.08)',
      border: '1px solid rgba(139,58,26,0.2)', borderRadius: 20,
      padding: '2px 10px', display: 'inline-block',
    }}>
      Editing: {label}
    </span>
  </div>
);

const sessionTypeStyle = {
  keynote: { bg: '#1a1410', color: '#fdfaf4' },
  panel: { bg: '#4a3f35', color: '#fdfaf4' },
  workshop: { bg: '#8b3a1a', color: '#fdfaf4' },
  talk: { bg: '#b8922a', color: '#fdfaf4' },
  break: { bg: '#d8cfc0', color: '#1a1410' },
  social: { bg: '#3a5a3a', color: '#fdfaf4' },
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */
const DEFAULT_AVATAR = 'https://i.pinimg.com/736x/8b/16/7a/8b167afad976f5947fb84260a1280dd9.jpg';

const ClassicTemplate = ({
  conf: initialConf,
  isOrganizer = false,
  onSave,
  canEditSchedule = false,
  currentUserId = null,
  members = [],
  onScheduleSave,
  onDelete,
  isGuest = false,
  onRequireAuthForRegister = null,
  showReg = false,
  setShowReg = null,
}) => {
  const [conf, setConf] = useState(initialConf);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [activeNav, setActiveNav] = useState('about');
  const [scheduleTab, setScheduleTab] = useState(0);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);

  const getInitialPageData = (c) => ({
    title: c.title || 'Untitled Conference',
    tagline: c.tagline || 'Advancing Knowledge, Forging Connections',
    banner_url: c.banner_url || '',
    contact_email: c.contact_email || 'contact@conference.org',
    contact_phone: c.contact_phone || '+1 (555) 000-0000',
    website: c.website || 'https://yourconference.org',
    twitter: c.twitter || '',
    linkedin: c.linkedin || '',
    schedule: c.schedule || [],
    speakers: c.speakers || [
      { name: 'Prof. Eleanor Hartley', role: 'Keynote Speaker', org: 'University of Oxford', img: 'https://i.pravatar.cc/150?img=47', bio: 'Distinguished scholar whose work bridges computational theory and humanistic inquiry.' },
      { name: 'Dr. Marcus Chen', role: 'Invited Lecturer', org: 'Harvard University', img: 'https://i.pravatar.cc/150?img=68', bio: 'Award-winning researcher with over 200 published works in leading journals.' },
      { name: 'Prof. Amara Osei', role: 'Panel Moderator', org: 'ETH Zürich', img: 'https://i.pravatar.cc/150?img=41', bio: 'Pioneer in interdisciplinary methodology and cross-cultural academic collaboration.' },
      { name: 'Dr. Isabelle Moreau', role: 'Workshop Lead', org: 'Sciences Po Paris', img: 'https://i.pravatar.cc/150?img=44', bio: 'Specialist in policy analysis and evidence-based decision making frameworks.' },
    ],
    sponsors: c.sponsors || [
      { name: 'Royal Academy of Sciences', tier: 'platinum' },
      { name: 'National Research Foundation', tier: 'gold' },
      { name: 'Meridian Trust', tier: 'gold' },
      { name: 'University Press', tier: 'silver' },
      { name: 'Scholar Fund', tier: 'silver' },
    ],
    important_dates: c.important_dates || [
      { label: 'Abstract Submission Opens', date: 'January 10, 2025' },
      { label: 'Abstract Submission Deadline', date: 'March 15, 2025' },
      { label: 'Notification of Acceptance', date: 'April 30, 2025' },
      { label: 'Early Bird Registration Closes', date: 'May 15, 2025' },
      { label: 'Full Paper Submission', date: 'June 1, 2025' },
      { label: 'Conference Dates', date: `${c.start_date || 'TBD'} – ${c.end_date || 'TBD'}` },
    ],
    venue_name: c.venue_name || 'Grand Academic Hall',
    venue_address: c.venue_address || c.location || 'City, Country',
    venue_description: c.venue_description || 'A storied venue of intellectual heritage, hosting generations of scholarly exchange. Equipped with a grand lecture theatre, seminar rooms, and distinguished dining facilities.',
    capacity: c.capacity || '400+',
    registration_fee_general: c.registration_fee_general || '$350',
    registration_fee_student: c.registration_fee_student || '$150',
    registration_fee_early: c.registration_fee_early || '$250',
    about_extra: c.about_extra || 'Scholars, researchers, and practitioners from across the globe convene to present original research, debate emerging paradigms, and forge collaborations that shape the trajectory of the field.',
    organizing_committee: c.organizing_committee || [
      { name: 'Prof. William Sterling', role: 'General Chair' },
      { name: 'Dr. Nadia Karim', role: 'Programme Chair' },
      { name: 'Prof. James Okafor', role: 'Organizing Chair' },
      { name: 'Dr. Yuki Tanaka', role: 'Publications Chair' },
    ],
    template_metadata: initialConf.template_metadata || {
      headings: {
        about_head: "ABOUT THE CONFERENCE",
        about_title: "Conference Overview",
        schedule_head: "EVENT PROGRAM",
        schedule_title: "Conference Programme",
        speakers_head: "EXPERT PANEL",
        speakers_title: "Distinguished Speakers",
        dates_head: "IMPORTANT TIMELINE",
        dates_title: "Key Dates",
        venue_head: "LOCATION HUB",
        venue_title: "Venue Information",
        sponsors_head: "NETWORKING PARTNERS",
        sponsors_title: "Official Sponsors",
        contact_head: "SUPPORT HUB",
        contact_title: "Get In Touch"
      }
    }
  });

  const updateHeading = (key, val) => {
    setPageData(p => ({
      ...p,
      template_metadata: {
        ...p.template_metadata,
        headings: {
          ...p.template_metadata.headings,
          [key]: val
        }
      }
    }));
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
    { id: 'schedule', label: 'Programme' },
    { id: 'speakers', label: 'Speakers' },
    { id: 'dates', label: 'Key Dates' },
    { id: 'venue', label: 'Venue' },
    { id: 'committee', label: 'Committee' },
    { id: 'sponsors', label: 'Sponsors' },
    { id: 'contact', label: 'Contact' },
  ];

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActiveNav(id);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      if (onSave) await onSave({ ...pageData, description: conf.description });
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const displayName = conf.title ?? conf.name ?? 'Untitled Conference';
  const displayDate = conf.start_date
    ? `${conf.start_date}${conf.end_date ? ` – ${conf.end_date}` : ''}`
    : 'Date TBD';

  const s = { fontFamily: "'Georgia', 'Times New Roman', serif" };
  const sansS = { fontFamily: "'Helvetica Neue', Arial, sans-serif" };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.ink, transition: 'all 0.5s ease' }}>
      
      {/* ── STYLE INJECTION ── */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes subtlePan {
          from { transform: scale(1.05) translate(0, 0); }
          to { transform: scale(1.1) translate(-1%, -1%); }
        }
        .herald-serif { font-family: 'Playfair Display', serif; }
        .herald-sans { font-family: 'Plus Jakarta Sans', sans-serif; }
        .drop-cap::first-letter {
          font-family: 'Playfair Display', serif;
          float: left;
          font-size: 7rem;
          line-height: 0.7;
          margin-top: 10px;
          margin-right: 15px;
          font-weight: 900;
          color: ${C.accent};
        }
      `}</style>

      {/* ── Organizer Edit Bar ── */}
      {isOrganizer && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: C.ink, borderBottom: `2px solid ${C.accentWarm}`,
          padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Edit3 size={14} color={C.accentWarm} />
            <span style={{ color: '#fdfaf4', fontWeight: 700, fontSize: 13, ...sansS }}>Organizer Edit Mode</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {saveError && (
              <span style={{ color: '#f87171', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, ...sansS }}>
                <AlertCircle size={12} /> {saveError}
              </span>
            )}
            {saved && <span style={{ color: '#6ee7b7', fontSize: 12, fontWeight: 600, ...sansS }}>✓ Saved!</span>}
            {isEditing ? (
              <>
                <button
                  onClick={onDelete}
                  style={{
                    background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444',
                    padding: '6px 14px', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', ...sansS,
                    display: 'flex', alignItems: 'center', gap: 6, marginRight: 8
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)'}
                >
                  <Trash2 size={12} /> Delete Conference
                </button>
                <button onClick={handleCancel} style={{
                  background: 'transparent', border: '1px solid #4a3f35', color: '#8c7e72',
                  padding: '6px 14px', borderRadius: 4, fontSize: 12, cursor: 'pointer', ...sansS,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <X size={12} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} style={{
                  background: C.accentWarm, border: 'none', color: '#fdfaf4',
                  padding: '6px 16px', borderRadius: 4, fontSize: 12, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, ...sansS,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Save size={12} /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} style={{
                background: C.accentWarm, border: 'none', color: '#fdfaf4',
                padding: '6px 16px', borderRadius: 4, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', ...sansS, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <Edit3 size={12} /> Edit Page
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── HERALD MASTHEAD ── */}
      <header style={{ background: C.bg, overflow: 'hidden' }}>
        {/* Top Rule / Issue Bar */}
        <div style={{ borderTop: `8px solid ${C.ink}`, borderBottom: `1px solid ${C.rule}`, background: C.paper }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <BookOpen size={14} color={C.accent} />
              <span className="herald-sans" style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.25em', textTransform: 'uppercase', color: C.ink }}>
                {conf.theme || 'ESTABLISHED RESEARCH'}
              </span>
            </div>
            <div className="herald-sans" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: C.inkMuted }}>
              VOL. {new Date().getFullYear()} &nbsp;·&nbsp; {displayDate} &nbsp;·&nbsp; {conf.location || 'GLOBAL REACH'}
            </div>
          </div>
        </div>

        {/* Hero Canvas */}
        <div style={{ position: 'relative', height: '75vh', minHeight: 650, background: C.ink, overflow: 'hidden' }}>
          {/* Animated Background Image */}
          <div style={{ 
            position: 'absolute', inset: 0, 
            animation: 'subtlePan 40s infinite linear alternate',
            transformOrigin: 'center center'
          }}>
            <img
              src={pageData.banner_url || conf.banner_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1600'}
              alt="Herald Canvas"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45, filter: 'sepia(20%) contrast(1.1) brightness(0.8)' }}
            />
          </div>
          
          <div style={{ 
            position: 'absolute', inset: 0, 
            background: 'linear-gradient(to right, rgba(26,23,20,0.9) 0%, rgba(26,23,20,0.4) 60%, transparent 100%)' 
          }} />

          {/* Hero Content Grid */}
          <div style={{ 
            height: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 40px', 
            position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', alignItems: 'center' 
          }}>
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1.2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 25 }}>
                <div style={{ height: 1, width: 40, background: C.accent }} />
                <span className="herald-sans" style={{ color: C.accent, fontSize: 13, fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase' }}>
                  Distinguished Gathering
                </span>
              </div>
              
              <h1 className="herald-serif" style={{ 
                fontSize: 'clamp(3rem, 8vw, 6rem)', fontWeight: 400, color: '#FFFFFF', 
                lineHeight: 0.95, margin: '0 0 30px', letterSpacing: '-0.03em' 
              }}>
                {isEditing ? (
                  <EditableField value={pageData.title} onChange={v => update('title', v)} isEditing={isEditing} />
                ) : displayName}
              </h1>

              <div style={{ maxWidth: 650, borderLeft: `4px solid ${C.accent}`, paddingLeft: 30, marginBottom: 45 }}>
                <p className="herald-serif" style={{ fontSize: '1.6rem', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', lineHeight: 1.4 }}>
                  {isEditing ? (
                    <EditableField value={pageData.tagline} onChange={v => update('tagline', v)} isEditing={isEditing} />
                  ) : pageData.tagline}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 20 }}>
                <button className="herald-sans" style={{ 
                  background: C.accent, color: C.ink, border: 'none', padding: '16px 36px', 
                  fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', 
                  cursor: 'pointer', transition: 'all 0.3s', boxShadow: `0 10px 30px -10px ${C.accent}40`
                }}>
                  Secure Admission
                </button>
                <button 
                  onClick={() => scrollTo('schedule')}
                  className="herald-sans" style={{ 
                    background: 'transparent', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)', 
                    padding: '16px 36px', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', 
                    letterSpacing: '0.2em', cursor: 'pointer', transition: 'all 0.3s'
                  }}
                >
                  View Index
                </button>
              </div>
            </motion.div>

            {/* Sidebar Editorial Detail */}
            <motion.div 
               initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.5, delay: 0.5 }}
               style={{ justifySelf: 'end', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 40 }}
            >
               {[
                 { label: 'CALENDAR', value: displayDate, icon: Calendar },
                 { label: 'PRECINCT', value: conf.location || 'Virtual Venue', icon: MapPin },
                 { label: 'DELEGATION', value: pageData.capacity, icon: Users }
               ].map(stat => (
                 <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.accent, marginBottom: 8 }}>
                     <span className="herald-sans" style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.3em' }}>{stat.label}</span>
                     <stat.icon size={12} />
                   </div>
                   <div className="herald-serif" style={{ fontSize: '1.4rem', color: '#FFFFFF', fontWeight: 300 }}>{stat.value}</div>
                 </div>
               ))}
               
               {isEditing && (
                 <div style={{ 
                   marginTop: 20, padding: '15px', background: 'rgba(255,255,255,0.05)', 
                   border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, textAlign: 'left' 
                 }}>
                   <span className="herald-sans" style={{ fontSize: 9, color: C.accent, fontWeight: 900, display: 'block', marginBottom: 5 }}>BANNER REWRITE URL</span>
                   <EditableField value={pageData.banner_url} onChange={v => update('banner_url', v)} isEditing={isEditing} className="text-[10px] text-white" />
                 </div>
               )}
            </motion.div>
          </div>
        </div>
      </header>

        {/* ── HERALD SECTION NAV ── */}
        <nav style={{
          position: 'sticky', top: isOrganizer ? 45 : 0, zIndex: 40,
          background: C.paper, borderBottom: `1px solid ${C.rule}`,
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', display: 'flex', overflowX: 'auto', gap: 0 }}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="herald-sans"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: '16px 24px', fontSize: 11, fontWeight: 800, letterSpacing: '0.15em',
                  textTransform: 'uppercase', whiteSpace: 'nowrap',
                  color: activeNav === item.id ? C.accent : C.inkMuted,
                  borderBottom: activeNav === item.id ? `3px solid ${C.accent}` : '3px solid transparent',
                  transition: 'all 0.3s',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ── HERALD CONTENT ── */}
        <main style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 40px' }}>

          {/* ── ABOUT ── */}
          <section id="about" style={{ scrollMarginTop: 140, marginBottom: 120 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 380px', gap: 100 }}>
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                  <BookOpen size={20} color={C.accent} />
                  <span className="herald-sans" style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.3em', color: C.accent, textTransform: 'uppercase' }}>
                    {pageData.template_metadata.headings.about_head}
                  </span>
                </div>
                
                <h2 className="herald-serif" style={{ fontSize: '3.5rem', fontWeight: 400, margin: '0 0 40px', lineHeight: 1.1, color: C.ink }}>
                  {isEditing ? <EditableField value={pageData.template_metadata.headings.about_title} onChange={v => updateHeading('about_title', v)} isEditing={isEditing} /> : pageData.template_metadata.headings.about_title}
                </h2>

                <div className="herald-serif drop-cap" style={{ fontSize: '1.25rem', lineHeight: 1.8, color: C.inkLight, textAlign: 'justify' }}>
                  {isEditing ? (
                    <EditableField value={conf.description} onChange={v => setConf(p => ({ ...p, description: v }))} multiline isEditing={isEditing} />
                  ) : (
                    <p>{conf.description}</p>
                  )}
                  <div style={{ height: 40 }} />
                  <p className="herald-sans" style={{ fontSize: '1rem', fontWeight: 400, color: C.inkMuted, fontStyle: 'italic', borderLeft: `2px solid ${C.rule}`, paddingLeft: 30 }}>
                    {isEditing ? <EditableField value={pageData.about_extra} onChange={v => update('about_extra', v)} multiline isEditing={isEditing} /> : pageData.about_extra}
                  </p>
                </div>
              </motion.div>

              {/* Sidebar: Access & Fees */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                style={{ background: C.paper, border: `1px solid ${C.rule}`, padding: '40px', alignSelf: 'start', position: 'sticky', top: 180 }}
              >
                <div style={{ textAlign: 'center', marginBottom: 30 }}>
                  <Award size={32} color={C.accent} style={{ marginBottom: 15 }} />
                  <h3 className="herald-sans" style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.ink }}>
                    Admission Tiers
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 40 }}>
                   {[
                     { label: 'Standard Delegation', key: 'registration_fee_general' },
                     { label: 'Early Enrollment', key: 'registration_fee_early' },
                     { label: 'Scholar / Apprentice', key: 'registration_fee_student' },
                   ].map(fee => (
                     <div key={fee.key} style={{ borderBottom: `1px solid ${C.rule}`, paddingBottom: 15 }}>
                       <div className="herald-sans" style={{ fontSize: 10, fontWeight: 700, color: C.inkMuted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>{fee.label}</div>
                       <div className="herald-serif" style={{ fontSize: '1.8rem', fontWeight: 400, color: C.ink }}>
                         {isEditing ? <EditableField value={pageData[fee.key]} onChange={v => update(fee.key, v)} isEditing={isEditing} /> : pageData[fee.key]}
                       </div>
                     </div>
                   ))}
                </div>

                <button className="herald-sans" style={{ 
                  width: '100%', background: C.ink, color: C.bg, border: 'none', padding: '18px', 
                  fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.25em', 
                  cursor: 'pointer', transition: 'all 0.3s' 
                }}>
                  Request Invitation
                </button>
                <p className="herald-sans" style={{ fontSize: 9, color: C.inkMuted, textAlign: 'center', marginTop: 15, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  * Final review by organizing committee
                </p>
              </motion.div>
            </div>
          </section>

          {/* ── PROGRAMME / SCHEDULE ── */}
          <section id="schedule" style={{ scrollMarginTop: 140, marginBottom: 120 }}>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: 60, borderBottom: `1px solid ${C.rule}`, paddingBottom: 30 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Clock size={18} color={C.accent} />
                    <span className="herald-sans" style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.3em', color: C.accent, textTransform: 'uppercase' }}>
                      {pageData.template_metadata.headings.schedule_head}
                    </span>
                  </div>
                  <h2 className="herald-serif" style={{ fontSize: '3rem', fontWeight: 400, margin: 0, lineHeight: 1.1, color: C.ink }}>
                    {isEditing ? <EditableField value={pageData.template_metadata.headings.schedule_title} onChange={v => updateHeading('schedule_title', v)} isEditing={isEditing} /> : pageData.template_metadata.headings.schedule_title}
                  </h2>
                </div>
                
                {canEditSchedule && (
                  <button onClick={() => setShowScheduleEditor(true)} className="herald-sans" style={{ 
                    background: 'transparent', border: `1px solid ${C.accent}`, color: C.accent, 
                    padding: '12px 24px', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', 
                    letterSpacing: '0.15em', cursor: 'pointer'
                  }}>
                    Configure Programme
                  </button>
                )}
              </div>

              {pageData.schedule.length === 0 ? (
                <div style={{ padding: '80px 0', textAlign: 'center', border: `1px dashed ${C.rule}`, background: C.paper }}>
                  <BookOpen size={40} color={C.rule} style={{ margin: '0 auto 20px', display: 'block' }} />
                  <p className="herald-serif" style={{ color: C.inkMuted, fontSize: '1.2rem', fontStyle: 'italic' }}>Pending Publication of Schedule</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 250px', gap: 60 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
                    {/* Day Selector */}
                    <div style={{ display: 'flex', gap: 40, borderBottom: `1px solid ${C.rule}`, marginBottom: 20 }}>
                      {pageData.schedule.map((day, di) => (
                        <button
                          key={di}
                          onClick={() => setScheduleTab(di)}
                          className="herald-sans"
                          style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            padding: '15px 0', fontSize: 11, fontWeight: 800, letterSpacing: '0.15em',
                            textTransform: 'uppercase', color: scheduleTab === di ? C.ink : C.inkMuted,
                            borderBottom: scheduleTab === di ? `3px solid ${C.accent}` : '3px solid transparent',
                            transition: 'all 0.3s',
                          }}
                        >
                          {day.day}
                          <span className="herald-serif" style={{ display: 'block', fontSize: 10, fontWeight: 400, color: C.inkMuted, marginTop: 4, textTransform: 'none', letterSpacing: '0' }}>
                            {day.date}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Timeline View */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {pageData.schedule[scheduleTab]?.sessions.map((session, si) => {
                        const isMain = session.type === 'keynote' || session.type === 'panel';
                        return (
                          <motion.div 
                            key={si}
                            initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: si * 0.05 }}
                            style={{ 
                              display: 'grid', gridTemplateColumns: '120px 1fr', gap: 40, 
                              padding: '35px 0', borderBottom: `1px solid ${C.rule}` 
                            }}
                          >
                            <div className="herald-sans" style={{ fontSize: 13, fontWeight: 900, color: C.accent, tabularNums: true }}>
                              {session.time}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 30 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                  <span className="herald-sans" style={{ 
                                    fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em',
                                    padding: '4px 8px', background: C.ink, color: C.bg
                                  }}>
                                    {session.type}
                                  </span>
                                  {session.room && (
                                    <span className="herald-sans" style={{ fontSize: 8, fontWeight: 700, color: C.inkMuted, textTransform: 'uppercase' }}>
                                      HALL: {session.room}
                                    </span>
                                  )}
                                </div>
                                <h4 className="herald-serif" style={{ fontSize: isMain ? '1.8rem' : '1.4rem', fontWeight: 400, color: C.ink, margin: '0 0 10px', lineHeight: 1.2 }}>
                                  {session.title}
                                </h4>
                                <div className="herald-serif" style={{ fontSize: '1.1rem', color: C.inkLight, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Users size={14} color={C.accent} />
                                  {session.speaker}
                                </div>
                              </div>
                              <div style={{ alignSelf: 'start', opacity: 0.05 }}>
                                <Quote size={60} />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sidebar Metadata */}
                  <div style={{ paddingTop: 80 }}>
                    <div style={{ background: C.surface, padding: '30px', border: `1px solid ${C.rule}`, borderRadius: 2 }}>
                       <Award size={20} color={C.accent} style={{ marginBottom: 15 }} />
                       <h5 className="herald-sans" style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.1em', color: C.ink, textTransform: 'uppercase', marginBottom: 15 }}>Programme Note</h5>
                       <p className="herald-serif" style={{ fontSize: 13, color: C.inkLight, lineHeight: 1.6, fontStyle: 'italic' }}>
                         "The committee reserves the right to modify the sequence of ceremonies to ensure maximum intellectual rigour."
                       </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </section>

          {/* ── SPEAKERS ── */}
          <section id="speakers" style={{ scrollMarginTop: 140, marginBottom: 120 }}>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                <Users size={20} color={C.accent} />
                <span className="herald-sans" style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.3em', color: C.accent, textTransform: 'uppercase' }}>
                  {pageData.template_metadata.headings.speakers_head}
                </span>
              </div>
              
              <h2 className="herald-serif" style={{ fontSize: '3.5rem', fontWeight: 400, margin: '0 0 60px', lineHeight: 1.1, color: C.ink }}>
                {isEditing ? <EditableField value={pageData.template_metadata.headings.speakers_title} onChange={v => updateHeading('speakers_title', v)} isEditing={isEditing} /> : pageData.template_metadata.headings.speakers_title}
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 60 }}>
                {pageData.speakers.map((sp, i) => (
                  <motion.div 
                    key={i} 
                    initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    style={{ position: 'relative' }}
                  >
                    <div style={{ 
                      position: 'relative', height: 400, marginBottom: 25, 
                      border: `1px solid ${C.rule}`, padding: '10px', background: C.paper,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.05)'
                    }}>
                      <img 
                        src={sp.img || DEFAULT_AVATAR} 
                        alt={sp.name} 
                        style={{ 
                          width: '100%', height: '100%', objectFit: 'cover', 
                          filter: 'sepia(30%) contrast(1.05) brightness(0.95)' 
                        }} 
                      />
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <h4 className="herald-serif" style={{ fontSize: '1.6rem', fontWeight: 400, color: C.ink, margin: '0 0 5px' }}>
                        {isEditing ? <EditableField value={sp.name} onChange={v => updateNested('speakers', i, 'name', v)} isEditing={isEditing} /> : sp.name}
                      </h4>
                      <p className="herald-sans" style={{ fontSize: 10, fontWeight: 900, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 5 }}>
                        {isEditing ? <EditableField value={sp.role} onChange={v => updateNested('speakers', i, 'role', v)} isEditing={isEditing} /> : sp.role}
                      </p>
                      <p className="herald-sans" style={{ fontSize: 11, fontWeight: 700, color: C.inkMuted, textTransform: 'uppercase', marginBottom: 15 }}>
                        {isEditing ? <EditableField value={sp.org} onChange={v => updateNested('speakers', i, 'org', v)} isEditing={isEditing} /> : sp.org}
                      </p>
                      <div className="herald-serif" style={{ fontSize: '1rem', lineHeight: 1.6, color: C.inkLight, fontStyle: 'italic', maxWidth: 240, margin: '0 auto' }}>
                        {isEditing ? <EditableField value={sp.bio} onChange={v => updateNested('speakers', i, 'bio', v)} multiline isEditing={isEditing} /> : sp.bio}
                      </div>
                    </div>

                    {isEditing && (
                      <button
                        onClick={() => update('speakers', pageData.speakers.filter((_, idx) => idx !== i))}
                        style={{ position: 'absolute', top: 0, right: 0, background: C.accent, border: 'none', cursor: 'pointer', color: C.bg, padding: 8 }}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </motion.div>
                ))}
                
                {isEditing && (
                  <button
                    onClick={() => update('speakers', [...pageData.speakers, { name: 'New Fellow', role: 'Scholar', org: 'Academy', img: '', bio: 'Academic contribution summary...' }])}
                    className="herald-sans"
                    style={{
                      height: 400, border: `2px dashed ${C.rule}`, background: 'transparent',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      gap: 15, color: C.accent, cursor: 'pointer', fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em'
                    }}
                  >
                    <Plus size={32} />
                    Enroll Participant
                  </button>
                )}
              </div>
            </motion.div>
          </section>

          {/* ── KEY DATES ── */}
          <section id="dates" style={{ scrollMarginTop: 140, marginBottom: 120 }}>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 450px', gap: 100 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                    <Calendar size={20} color={C.accent} />
                    <span className="herald-sans" style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.3em', color: C.accent, textTransform: 'uppercase' }}>
                      {pageData.template_metadata.headings.dates_head}
                    </span>
                  </div>
                  <h2 className="herald-serif" style={{ fontSize: '3rem', fontWeight: 400, margin: '0 0 40px', lineHeight: 1.1, color: C.ink }}>
                    {isEditing ? <EditableField value={pageData.template_metadata.headings.dates_title} onChange={v => updateHeading('dates_title', v)} isEditing={isEditing} /> : pageData.template_metadata.headings.dates_title}
                  </h2>
                  <div style={{ borderTop: `1px solid ${C.rule}` }}>
                    {pageData.important_dates.map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '25px 0', borderBottom: `1px solid ${C.rule}` }}>
                        <span className="herald-serif" style={{ fontSize: '1.2rem', color: C.ink }}>{isEditing ? <EditableField value={d.label} onChange={v => updateNested('important_dates', i, 'label', v)} isEditing={isEditing} /> : d.label}</span>
                        <span className="herald-sans" style={{ fontSize: 12, fontWeight: 900, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                          {isEditing ? <EditableField value={d.date} onChange={v => updateNested('important_dates', i, 'date', v)} isEditing={isEditing} /> : d.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: C.paper, padding: '50px', border: `1px solid ${C.rule}` }}>
                  <Award size={32} color={C.accent} style={{ marginBottom: 20 }} />
                  <h3 className="herald-sans" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: C.ink, marginBottom: 20 }}>Call for Original Research</h3>
                  <p className="herald-serif" style={{ fontSize: '1.1rem', lineHeight: 1.7, color: C.inkLight, marginBottom: 30 }}>
                    We welcome contributions of unparalleled rigour. All submissions undergo a thorough blind peer-review by the high council of scholars.
                  </p>
                  <button className="herald-sans" style={{ width: '100%', background: C.accent, color: C.ink, border: 'none', padding: '16px', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', cursor: 'pointer' }}>
                    Submit Abstract
                  </button>
                </div>
              </div>
            </motion.div>
          </section>

          {/* ── VENUE ── */}
          <section id="venue" style={{ scrollMarginTop: 140, marginBottom: 120 }}>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
                <MapPin size={20} color={C.accent} />
                <span className="herald-sans" style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.3em', color: C.accent, textTransform: 'uppercase' }}>
                  {pageData.template_metadata.headings.venue_head}
                </span>
              </div>
              <h2 className="herald-serif" style={{ fontSize: '3rem', fontWeight: 400, margin: '0 0 60px', lineHeight: 1.1, color: C.ink }}>
                {isEditing ? <EditableField value={pageData.template_metadata.headings.venue_title} onChange={v => updateHeading('venue_title', v)} isEditing={isEditing} /> : pageData.template_metadata.headings.venue_title}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 60, alignItems: 'center' }}>
                <div style={{ padding: '40px', border: `1px solid ${C.rule}`, background: C.paper }}>
                  <h4 className="herald-serif" style={{ fontSize: '1.8rem', color: C.ink, marginBottom: 15 }}>
                    {isEditing ? <EditableField value={pageData.venue_name} onChange={v => update('venue_name', v)} isEditing={isEditing} /> : pageData.venue_name}
                  </h4>
                  <p className="herald-sans" style={{ fontSize: 11, color: C.accent, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 25 }}>
                    {isEditing ? <EditableField value={pageData.venue_address} onChange={v => update('venue_address', v)} isEditing={isEditing} /> : pageData.venue_address}
                  </p>
                  <p className="herald-serif" style={{ fontSize: '1.1rem', color: C.inkLight, lineHeight: 1.7, fontStyle: 'italic' }}>
                    {isEditing ? <EditableField value={pageData.venue_description} onChange={v => update('venue_description', v)} multiline isEditing={isEditing} /> : pageData.venue_description}
                  </p>
                </div>
                <div style={{ height: 450, background: C.rule, overflow: 'hidden', border: `1px solid ${C.rule}`, padding: 10 }}>
                   <div style={{ width: '100%', height: '100%', background: `url(https://images.unsplash.com/photo-1541339907198-e08756ebafe3?w=800) center/cover`, filter: 'sepia(40%) brightness(0.9) contrast(1.1)' }} />
                </div>
              </div>
            </motion.div>
          </section>

          {/* ── COMMITTEE ── */}
          <section id="committee" style={{ scrollMarginTop: 140, marginBottom: 120 }}>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <div style={{ textAlign: 'center', marginBottom: 60 }}>
                <h3 className="herald-sans" style={{ fontSize: 12, fontWeight: 900, letterSpacing: '0.4em', textTransform: 'uppercase', color: C.accent, marginBottom: 15 }}>Organizing Committee</h3>
                <div style={{ height: 2, width: 60, background: C.accent, margin: '0 auto' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 40 }}>
                {pageData.organizing_committee.map((m, i) => (
                  <div key={i} style={{ padding: '25px', textAlign: 'center', border: `1px solid ${C.rule}`, background: C.paper }}>
                    <div className="herald-serif" style={{ fontSize: '1.3rem', color: C.ink, marginBottom: 5 }}>
                      {isEditing ? <EditableField value={m.name} onChange={v => updateNested('organizing_committee', i, 'name', v)} isEditing={isEditing} /> : m.name}
                    </div>
                    <div className="herald-sans" style={{ fontSize: 9, fontWeight: 900, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                      {isEditing ? <EditableField value={m.role} onChange={v => updateNested('organizing_committee', i, 'role', v)} isEditing={isEditing} /> : m.role}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* ── SPONSORS ── */}
          <section id="sponsors" style={{ scrollMarginTop: 140, marginBottom: 120, textAlign: 'center' }}>
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
               <h2 className="herald-serif" style={{ fontSize: '2.5rem', fontWeight: 400, color: C.ink, marginBottom: 50 }}>Distinguished Patrons</h2>
               <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 60 }}>
                  {pageData.sponsors.map((s, i) => (
                    <div key={i} style={{ opacity: 0.6, filter: 'grayscale(1)' }}>
                      <div className="herald-sans" style={{ fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em' }}>{s.name}</div>
                      <div style={{ height: 1.5, width: 20, background: C.accent, margin: '8px auto' }} />
                      <div className="herald-sans" style={{ fontSize: 9, fontWeight: 700, color: C.accent }}>{s.tier.toUpperCase()}</div>
                    </div>
                  ))}
               </div>
            </motion.div>
          </section>

          {/* ── SUPPORT / CONTACT ── */}
          <section id="contact" style={{ scrollMarginTop: 140, borderTop: `4px solid ${C.ink}`, paddingTop: 80 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 60 }}>
              <div>
                <h4 className="herald-sans" style={{ fontSize: 10, fontWeight: 900, color: C.ink, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 25 }}>Communication</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: C.inkLight }}><Mail size={14} color={C.accent} /> {pageData.contact_email}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: C.inkLight }}><Phone size={14} color={C.accent} /> {pageData.contact_phone}</div>
                </div>
              </div>
              <div>
                <h4 className="herald-sans" style={{ fontSize: 10, fontWeight: 900, color: C.ink, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 25 }}>Registry</h4>
                <p className="herald-serif" style={{ fontSize: 14, color: C.inkMuted, lineHeight: 1.6, fontStyle: 'italic' }}>
                  All inquiries regarding visas, accommodations, and formal invitations should be directed to the registry.
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                 <div className="herald-serif" style={{ fontSize: '2rem', color: C.ink, marginBottom: 10 }}>The Herald</div>
                 <p className="herald-sans" style={{ fontSize: 9, fontWeight: 800, color: C.accent, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Academic Excellence &middot; Vol. {new Date().getFullYear()}</p>
              </div>
            </div>
          </section>
        </main>

        <footer style={{ background: C.ink, padding: '40px 0', borderTop: `1px solid ${C.rule}` }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="herald-sans" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.1em' }}>
              &copy; {new Date().getFullYear()} ACADEMIC ASSEMBLY REGISTRY. ALL RIGHTS RESERVED.
            </span>
            <div style={{ display: 'flex', gap: 25 }}>
              {[Twitter, Linkedin, Globe].map((Icon, idx) => <Icon key={idx} size={16} color="rgba(255,255,255,0.4)" style={{ cursor: 'pointer' }} />)}
            </div>
          </div>
        </footer>

        {/* Schedule Editor Modal */}
        <AnimatePresence>
          {showScheduleEditor && (
            <ScheduleEditor
              conferenceId={conf.conference_id}
              initialSchedule={pageData.schedule}
              members={members}
              onSave={(newSchedule) => {
                update('schedule', newSchedule);
                setShowScheduleEditor(false);
                if (onScheduleSave) onScheduleSave(newSchedule);
              }}
              onCancel={() => setShowScheduleEditor(false)}
            />
          )}
        </AnimatePresence>
    </div>
  );
};

export default ClassicTemplate;







































