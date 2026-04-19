import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin, Calendar, Users, Mail, Phone, Globe,
  Twitter, Linkedin, Edit3, Check, X, Plus, Trash2, Save, AlertCircle, Clock
} from 'lucide-react';
import ScheduleEditor from '../ScheduleEditor';

/* ─────────────────────────────────────────────
   PALETTE & TOKENS
   ───────────────────────────────────────────── */
const C = {
  bg: '#fdfaf4',
  paper: '#fdfbf7',
  ink: '#1a1410',
  inkLight: '#4a3f35',
  inkMuted: '#8c7e72',
  rule: '#d8cfc0',
  accent: '#1a1410',
  accentWarm: '#8b3a1a',
  gold: '#b8922a',
};

/* ─────────────────────────────────────────────
   INLINE EDITABLE FIELD
   ───────────────────────────────────────────── */
const EditableText = ({ value, onChange, multiline = false, className = '', placeholder = 'Click to edit…', isEditing }) => {
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

const ClassicTemplate = ({ conf: initialConf, isOrganizer = false, onSave, canEditSchedule = false, currentUserId = null, members = [], onScheduleSave, onDelete }) => {
  const [conf, setConf] = useState(initialConf);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [activeNav, setActiveNav] = useState('about');
  const [scheduleTab, setScheduleTab] = useState(0);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);

  const [pageData, setPageData] = useState({
    title: initialConf.title || 'Untitled Conference',
    tagline: initialConf.tagline || 'Advancing Knowledge, Forging Connections',
    banner_url: initialConf.banner_url || '',
    contact_email: initialConf.contact_email || 'contact@conference.org',
    contact_phone: initialConf.contact_phone || '+1 (555) 000-0000',
    website: initialConf.website || 'https://yourconference.org',
    twitter: initialConf.twitter || '',
    linkedin: initialConf.linkedin || '',
    schedule: initialConf.schedule || [],
    speakers: initialConf.speakers || [
      { name: 'Prof. Eleanor Hartley', role: 'Keynote Speaker', org: 'University of Oxford', img: 'https://i.pravatar.cc/150?img=47', bio: 'Distinguished scholar whose work bridges computational theory and humanistic inquiry.' },
      { name: 'Dr. Marcus Chen', role: 'Invited Lecturer', org: 'Harvard University', img: 'https://i.pravatar.cc/150?img=68', bio: 'Award-winning researcher with over 200 published works in leading journals.' },
      { name: 'Prof. Amara Osei', role: 'Panel Moderator', org: 'ETH Zürich', img: 'https://i.pravatar.cc/150?img=41', bio: 'Pioneer in interdisciplinary methodology and cross-cultural academic collaboration.' },
      { name: 'Dr. Isabelle Moreau', role: 'Workshop Lead', org: 'Sciences Po Paris', img: 'https://i.pravatar.cc/150?img=44', bio: 'Specialist in policy analysis and evidence-based decision making frameworks.' },
    ],
    sponsors: initialConf.sponsors || [
      { name: 'Royal Academy of Sciences', tier: 'platinum' },
      { name: 'National Research Foundation', tier: 'gold' },
      { name: 'Meridian Trust', tier: 'gold' },
      { name: 'University Press', tier: 'silver' },
      { name: 'Scholar Fund', tier: 'silver' },
    ],
    important_dates: initialConf.important_dates || [
      { label: 'Abstract Submission Opens', date: 'January 10, 2025' },
      { label: 'Abstract Submission Deadline', date: 'March 15, 2025' },
      { label: 'Notification of Acceptance', date: 'April 30, 2025' },
      { label: 'Early Bird Registration Closes', date: 'May 15, 2025' },
      { label: 'Full Paper Submission', date: 'June 1, 2025' },
      { label: 'Conference Dates', date: `${initialConf.start_date || 'TBD'} – ${initialConf.end_date || 'TBD'}` },
    ],
    venue_name: initialConf.venue_name || 'Grand Academic Hall',
    venue_address: initialConf.venue_address || initialConf.location || 'City, Country',
    venue_description: initialConf.venue_description || 'A storied venue of intellectual heritage, hosting generations of scholarly exchange. Equipped with a grand lecture theatre, seminar rooms, and distinguished dining facilities.',
    capacity: initialConf.capacity || '400+',
    registration_fee_general: initialConf.registration_fee_general || '$350',
    registration_fee_student: initialConf.registration_fee_student || '$150',
    registration_fee_early: initialConf.registration_fee_early || '$250',
    about_extra: initialConf.about_extra || 'Scholars, researchers, and practitioners from across the globe convene to present original research, debate emerging paradigms, and forge collaborations that shape the trajectory of the field.',
    organizing_committee: initialConf.organizing_committee || [
      { name: 'Prof. William Sterling', role: 'General Chair' },
      { name: 'Dr. Nadia Karim', role: 'Programme Chair' },
      { name: 'Prof. James Okafor', role: 'Organizing Chair' },
      { name: 'Dr. Yuki Tanaka', role: 'Publications Chair' },
    ],
  });

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
    <div style={{ background: C.bg, minHeight: '100vh', color: C.ink, ...s }}>

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
                <button onClick={() => setIsEditing(false)} style={{
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

      {/* ── MASTHEAD ── */}
      <header style={{ background: C.paper, padding: '0 0 0 0' }}>
        {/* Top rule + date bar */}
        <div style={{ borderTop: `4px solid ${C.ink}`, borderBottom: `1px solid ${C.rule}` }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '8px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: C.inkMuted, ...sansS }}>
              {conf.theme || 'Academic Conference'}
            </span>
            <span style={{ fontSize: 11, letterSpacing: '0.1em', color: C.inkMuted, ...sansS }}>
              {displayDate} &nbsp;·&nbsp; {conf.location || 'Location TBD'}
            </span>
          </div>
        </div>

        {/* Hero banner */}
        <div style={{ position: 'relative', height: 480, overflow: 'hidden' }}>
          <img
            src={pageData.banner_url || conf.banner_url || 'https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=1600'}
            alt="Conference Banner"
            style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(60%) contrast(1.1)', display: 'block' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(26,20,16,0.2) 0%, rgba(26,20,16,0.75) 100%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px',
          }}>
            <h1 style={{
              fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 400, color: '#fdfaf4',
              letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 16px',
              textShadow: '0 2px 20px rgba(0,0,0,0.5)', ...s,
            }}>
              {isEditing
                ? <div style={{ minWidth: '300px' }}><EditableText value={pageData.title} onChange={v => update('title', v)} className="" isEditing={isEditing} placeholder="Conference Title…" /></div>
                : displayName}
            </h1>

            {isEditing && (
              <div style={{ marginBottom: 20, width: '100%', maxWidth: 400 }}>
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.gold, marginBottom: 4, ...sansS }}>Change Header Image URL</div>
                <EditableText value={pageData.banner_url} onChange={v => update('banner_url', v)} className="" isEditing={isEditing} placeholder="Image URL…" />
              </div>
            )}

            <div style={{ width: 60, height: 2, background: C.gold, margin: '0 auto 16px' }} />
            <p style={{ fontSize: '1.15rem', color: 'rgba(253,250,244,0.85)', maxWidth: 600, margin: '0 0 28px', fontStyle: 'italic', lineHeight: 1.5 }}>
              {isEditing
                ? <EditableText value={pageData.tagline} onChange={v => update('tagline', v)} className="" isEditing={isEditing} placeholder="Conference tagline…" />
                : pageData.tagline}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button style={{
                background: '#fdfaf4', color: C.ink, border: 'none',
                padding: '12px 28px', fontSize: 13, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', ...sansS,
              }}>
                Register Now
              </button>
              <button onClick={() => scrollTo('schedule')} style={{
                background: 'transparent', color: '#fdfaf4',
                border: '1px solid rgba(253,250,244,0.5)',
                padding: '12px 28px', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', ...sansS,
              }}>
                View Programme
              </button>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ borderTop: `1px solid ${C.rule}`, borderBottom: `3px double ${C.ink}`, background: C.paper }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '14px 32px', display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { icon: Calendar, label: 'Date', value: displayDate },
              { icon: MapPin, label: 'Location', value: conf.location || 'TBD' },
              { icon: Users, label: 'Capacity', value: pageData.capacity },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon size={16} color={C.inkMuted} />
                <div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkMuted, ...sansS }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, ...sansS }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── SECTION NAV ── */}
      <nav style={{
        position: 'sticky', top: isOrganizer ? 45 : 0, zIndex: 40,
        background: C.ink, borderBottom: `2px solid ${C.ink}`,
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 32px', display: 'flex', overflowX: 'auto', gap: 0 }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '14px 20px', fontSize: 12, letterSpacing: '0.12em',
                textTransform: 'uppercase', whiteSpace: 'nowrap', ...sansS,
                color: activeNav === item.id ? C.gold : 'rgba(253,250,244,0.65)',
                borderBottom: activeNav === item.id ? `2px solid ${C.gold}` : '2px solid transparent',
                transition: 'all 0.2s',
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '60px 32px' }}>

        {/* ── ABOUT ── */}
        <section id="about" style={{ scrollMarginTop: 120, marginBottom: 72 }}>
          {isEditing && <EditBadge label="About" />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 64, alignItems: 'start' }}>
            <div>
              <Rule thick />
              <h2 style={{ fontSize: '2rem', fontWeight: 400, margin: '16px 0 24px', letterSpacing: '-0.01em' }}>
                About the Conference
              </h2>
              <p style={{ fontSize: '1.1rem', lineHeight: 1.85, color: C.inkLight, marginBottom: 20 }}>
                {isEditing
                  ? <EditableText value={conf.description} onChange={v => setConf(p => ({ ...p, description: v }))} multiline className="" isEditing={isEditing} placeholder="Conference description…" />
                  : conf.description}
              </p>
              <p style={{ fontSize: '1.05rem', lineHeight: 1.85, color: C.inkLight }}>
                {isEditing
                  ? <EditableText value={pageData.about_extra} onChange={v => update('about_extra', v)} multiline className="" isEditing={isEditing} placeholder="Additional details…" />
                  : pageData.about_extra}
              </p>
            </div>

            {/* Sidebar registration card */}
            <div>
              <Rule thick />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '16px 0 20px', textTransform: 'uppercase', letterSpacing: '0.08em', ...sansS }}>
                Registration Fees
              </h3>
              <div style={{ borderTop: `1px solid ${C.rule}` }}>
                {[
                  { label: 'General Registration', key: 'registration_fee_general' },
                  { label: 'Early Bird (until deadline)', key: 'registration_fee_early' },
                  { label: 'Student / Postdoc', key: 'registration_fee_student' },
                ].map(({ label, key }) => (
                  <div key={key} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 0', borderBottom: `1px solid ${C.rule}`,
                  }}>
                    <span style={{ fontSize: 14, color: C.inkLight, ...sansS }}>{label}</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: C.ink }}>
                      {isEditing
                        ? <EditableText value={pageData[key]} onChange={v => update(key, v)} className="" isEditing={isEditing} />
                        : pageData[key]}
                    </span>
                  </div>
                ))}
              </div>
              <button style={{
                width: '100%', marginTop: 20, background: C.ink, color: C.bg,
                border: 'none', padding: '14px', fontSize: 13, fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', ...sansS,
              }}>
                Register Now
              </button>
            </div>
          </div>
        </section>

        {/* ── PROGRAMME / SCHEDULE ── */}
        <section id="schedule" style={{ scrollMarginTop: 120, marginBottom: 72 }}>
          {isEditing && <EditBadge label="Programme" />}
          <Rule thick />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 32px' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 400, letterSpacing: '-0.01em', margin: 0 }}>
              Conference Programme
            </h2>
            {canEditSchedule && (
              <button
                onClick={() => setShowScheduleEditor(true)}
                style={{
                  background: C.accentWarm, border: 'none', color: '#fdfaf4',
                  padding: '8px 18px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', ...sansS, display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Edit3 size={12} /> Edit Schedule
              </button>
            )}
          </div>

          {pageData.schedule.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', border: `1px dashed ${C.rule}`, borderRadius: 4 }}>
              <Clock size={28} color={C.inkMuted} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
              <p style={{ color: C.inkMuted, fontSize: 14, ...sansS }}>No schedule has been created yet.</p>
              {canEditSchedule && (
                <button
                  onClick={() => setShowScheduleEditor(true)}
                  style={{ marginTop: 12, background: 'transparent', border: 'none', color: C.accentWarm, fontSize: 13, cursor: 'pointer', fontWeight: 600, ...sansS }}
                >
                  + Create Schedule
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Day tabs */}
              <div style={{ display: 'flex', gap: 0, borderBottom: `2px solid ${C.ink}`, marginBottom: 32 }}>
                {pageData.schedule.map((day, di) => (
                  <button
                    key={di}
                    onClick={() => setScheduleTab(di)}
                    style={{
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      padding: '10px 24px', fontSize: 13, fontWeight: 700, ...sansS,
                      color: scheduleTab === di ? C.ink : C.inkMuted,
                      borderBottom: scheduleTab === di ? `3px solid ${C.ink}` : '3px solid transparent',
                      marginBottom: -2, transition: 'all 0.15s',
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                    }}
                  >
                    {day.day}
                    <span style={{ display: 'block', fontSize: 10, fontWeight: 400, color: C.inkMuted, marginTop: 2 }}>
                      {day.date}
                    </span>
                  </button>
                ))}
              </div>

              {/* Sessions table */}
              {pageData.schedule[scheduleTab] && (
                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.rule}` }}>
                        {['Time', 'Session', 'Speaker / Notes', 'Room', 'Type', 'Head'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.inkMuted, fontWeight: 700, ...sansS }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageData.schedule[scheduleTab].sessions.map((session, si) => {
                        const typeStyle = sessionTypeStyle[session.type] || sessionTypeStyle.talk;
                        const isSessionHead = currentUserId && session.head_id === currentUserId;
                        const headMember = session.head_id ? members.find(m => m.user_id === session.head_id) : null;
                        return (
                          <tr key={si} style={{
                            borderBottom: `1px solid ${C.rule}`,
                            background: isSessionHead ? 'rgba(139,58,26,0.08)' : (si % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.02)'),
                            borderLeft: isSessionHead ? `3px solid ${C.accentWarm}` : '3px solid transparent',
                          }}>
                            <td style={{ padding: '14px 12px', fontSize: 13, fontFamily: 'monospace', color: C.inkLight, whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                              {session.time}
                            </td>
                            <td style={{ padding: '14px 12px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 600, fontSize: 15, color: C.ink, marginBottom: 2 }}>
                                {session.title}
                              </div>
                            </td>
                            <td style={{ padding: '14px 12px', fontSize: 13, color: C.inkMuted, verticalAlign: 'top' }}>
                              {session.speaker}
                            </td>
                            <td style={{ padding: '14px 12px', fontSize: 12, color: C.inkMuted, verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              {session.room || '—'}
                            </td>
                            <td style={{ padding: '14px 12px', verticalAlign: 'top' }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
                                padding: '3px 8px', ...sansS,
                                background: typeStyle.bg, color: typeStyle.color,
                              }}>
                                {session.type}
                              </span>
                            </td>
                            <td style={{ padding: '14px 12px', fontSize: 12, color: C.inkMuted, verticalAlign: 'top' }}>
                              {headMember ? (
                                <span style={{
                                  fontSize: 11, fontWeight: isSessionHead ? 700 : 400,
                                  color: isSessionHead ? C.accentWarm : C.inkMuted,
                                  ...sansS,
                                }}>
                                  {headMember.full_name || headMember.email}
                                  {isSessionHead && ' (You)'}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

        {/* ── SPEAKERS ── */}
        <section id="speakers" style={{ scrollMarginTop: 120, marginBottom: 72 }}>
          {isEditing && <EditBadge label="Speakers" />}
          <Rule thick />
          <h2 style={{ fontSize: '2rem', fontWeight: 400, margin: '16px 0 32px', letterSpacing: '-0.01em' }}>
            Distinguished Speakers
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 32 }}>
            {pageData.speakers.map((sp, i) => (
              <div key={i} style={{ position: 'relative', borderTop: `3px solid ${C.ink}`, paddingTop: 20 }}>
                {isEditing && (
                  <button
                    onClick={() => update('speakers', pageData.speakers.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 8, right: 0, background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                  >
                    <X size={14} />
                  </button>
                )}
                <div style={{ width: 80, height: 80, marginBottom: 14, overflow: 'hidden', background: C.rule, position: 'relative' }}>
                  <img 
                    src={sp.img || DEFAULT_AVATAR} 
                    alt={sp.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isEditing ? 'none' : 'grayscale(80%)' }} 
                  />
                </div>

                {isEditing && (
                  <div style={{ 
                    marginBottom: 16, padding: '8px 12px', borderRadius: 4, 
                    background: 'rgba(0,0,0,0.03)', border: `1px solid ${C.rule}`,
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: C.accentWarm, marginBottom: 4, ...sansS }}>Photo URL</div>
                    <EditableText 
                      value={sp.img || ''} 
                      onChange={v => updateNested('speakers', i, 'img', v)} 
                      className="text-[10px]" 
                      isEditing={isEditing} 
                      placeholder="Paste link..." 
                    />
                  </div>
                )}
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 4px', color: C.ink }}>
                  {isEditing
                    ? <EditableText value={sp.name} onChange={v => updateNested('speakers', i, 'name', v)} className="" isEditing={isEditing} />
                    : sp.name}
                </h4>
                <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.accentWarm, margin: '0 0 2px', ...sansS }}>
                  {isEditing
                    ? <EditableText value={sp.role} onChange={v => updateNested('speakers', i, 'role', v)} className="" isEditing={isEditing} />
                    : sp.role}
                </p>
                <p style={{ fontSize: 12, color: C.inkMuted, margin: '0 0 10px', ...sansS }}>
                  {isEditing
                    ? <EditableText value={sp.org} onChange={v => updateNested('speakers', i, 'org', v)} className="" isEditing={isEditing} />
                    : sp.org}
                </p>
                <p style={{ fontSize: 13, lineHeight: 1.7, color: C.inkLight, fontStyle: 'italic' }}>
                  {isEditing
                    ? <EditableText value={sp.bio} onChange={v => updateNested('speakers', i, 'bio', v)} multiline className="" isEditing={isEditing} />
                    : sp.bio}
                </p>
              </div>
            ))}
            {isEditing && (
              <div
                onClick={() => update('speakers', [...pageData.speakers, {
                  name: 'New Speaker', role: 'Role', org: 'Institution',
                  img: '',
                  bio: 'Speaker biography goes here.',
                }])}
                style={{
                  borderTop: `3px dashed ${C.rule}`, paddingTop: 20, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: 180, color: C.accentWarm, gap: 8,
                }}
              >
                <Plus size={24} />
                <span style={{ fontSize: 13, ...sansS }}>Add Speaker</span>
              </div>
            )}
          </div>
        </section>

        {/* ── KEY DATES ── */}
        <section id="dates" style={{ scrollMarginTop: 120, marginBottom: 72 }}>
          {isEditing && <EditBadge label="Key Dates" />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 64, alignItems: 'start' }}>
            <div>
              <Rule thick />
              <h2 style={{ fontSize: '2rem', fontWeight: 400, margin: '16px 0 28px', letterSpacing: '-0.01em' }}>
                Key Dates & Deadlines
              </h2>
              <div>
                {pageData.important_dates.map((d, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 0', borderBottom: `1px solid ${C.rule}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      {isEditing && (
                        <button
                          onClick={() => update('important_dates', pageData.important_dates.filter((_, idx) => idx !== i))}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                        >
                          <X size={12} />
                        </button>
                      )}
                      <span style={{ fontSize: 15, color: C.inkLight }}>
                        {isEditing
                          ? <EditableText value={d.label} onChange={v => updateNested('important_dates', i, 'label', v)} className="" isEditing={isEditing} />
                          : d.label}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.accentWarm, whiteSpace: 'nowrap', marginLeft: 16 }}>
                      {isEditing
                        ? <EditableText value={d.date} onChange={v => updateNested('important_dates', i, 'date', v)} className="" isEditing={isEditing} />
                        : d.date}
                    </span>
                  </div>
                ))}
                {isEditing && (
                  <button
                    onClick={() => update('important_dates', [...pageData.important_dates, { label: 'New Deadline', date: 'Date TBD' }])}
                    style={{
                      width: '100%', border: `1px dashed ${C.rule}`, background: 'transparent',
                      padding: '12px', fontSize: 12, color: C.accentWarm, cursor: 'pointer', ...sansS,
                      marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Plus size={12} /> Add Date
                  </button>
                )}
              </div>
            </div>

            {/* Call for papers */}
            <div>
              <Rule thick />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '16px 0 16px', textTransform: 'uppercase', letterSpacing: '0.08em', ...sansS }}>
                Call for Papers
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.8, color: C.inkLight, marginBottom: 16 }}>
                We invite original contributions on topics related to <em>{conf.theme}</em>. Accepted papers will be published in the conference proceedings with an ISSN.
              </p>
              <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 16, marginBottom: 20 }}>
                {['Original unpublished research', 'Full papers: 8–12 pages (IEEE format)', 'Extended abstracts: 2–4 pages', 'Poster submissions welcome', 'Blind peer review process'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                    <Check size={14} color={C.accentWarm} style={{ marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: C.inkLight, ...sansS }}>{item}</span>
                  </div>
                ))}
              </div>
              <button style={{
                width: '100%', background: C.accentWarm, color: '#fdfaf4', border: 'none',
                padding: '13px', fontSize: 13, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', cursor: 'pointer', ...sansS,
              }}>
                Submit Paper
              </button>
            </div>
          </div>
        </section>

        {/* ── VENUE ── */}
        <section id="venue" style={{ scrollMarginTop: 120, marginBottom: 72 }}>
          {isEditing && <EditBadge label="Venue" />}
          <Rule thick />
          <h2 style={{ fontSize: '2rem', fontWeight: 400, margin: '16px 0 32px', letterSpacing: '-0.01em' }}>
            Venue & Location
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48 }}>
            <div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 400, marginBottom: 6 }}>
                {isEditing
                  ? <EditableText value={pageData.venue_name} onChange={v => update('venue_name', v)} className="" isEditing={isEditing} />
                  : pageData.venue_name}
              </h3>
              <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.inkMuted, marginBottom: 20, ...sansS }}>
                <MapPin size={13} />
                {isEditing
                  ? <EditableText value={pageData.venue_address} onChange={v => update('venue_address', v)} className="" isEditing={isEditing} />
                  : pageData.venue_address}
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.85, color: C.inkLight, fontStyle: 'italic', marginBottom: 24 }}>
                {isEditing
                  ? <EditableText value={pageData.venue_description} onChange={v => update('venue_description', v)} multiline className="" isEditing={isEditing} />
                  : pageData.venue_description}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Capacity', value: pageData.capacity },
                  { label: 'Conference Days', value: `${pageData.schedule.length} Days` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ borderTop: `2px solid ${C.ink}`, paddingTop: 12 }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 400, color: C.ink }}>{value}</div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.inkMuted, ...sansS }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: C.rule, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260, gap: 12 }}>
              <MapPin size={40} color={C.inkMuted} style={{ opacity: 0.4 }} />
              <p style={{ fontSize: 13, color: C.inkMuted, ...sansS }}>{pageData.venue_name}</p>
              <p style={{ fontSize: 11, color: C.inkMuted, ...sansS, opacity: 0.7 }}>{pageData.venue_address}</p>
            </div>
          </div>
        </section>

        {/* ── ORGANIZING COMMITTEE ── */}
        <section id="committee" style={{ scrollMarginTop: 120, marginBottom: 72 }}>
          {isEditing && <EditBadge label="Committee" />}
          <Rule thick />
          <h2 style={{ fontSize: '2rem', fontWeight: 400, margin: '16px 0 28px', letterSpacing: '-0.01em' }}>
            Organizing Committee
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 0 }}>
            {pageData.organizing_committee.map((member, i) => (
              <div key={i} style={{
                padding: '20px 24px', borderRight: `1px solid ${C.rule}`,
                borderBottom: `1px solid ${C.rule}`, position: 'relative',
              }}>
                {isEditing && (
                  <button
                    onClick={() => update('organizing_committee', pageData.organizing_committee.filter((_, idx) => idx !== i))}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                  >
                    <X size={12} />
                  </button>
                )}
                <div style={{ width: 32, height: 2, background: C.accentWarm, marginBottom: 12 }} />
                <h4 style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 4 }}>
                  {isEditing
                    ? <EditableText value={member.name} onChange={v => updateNested('organizing_committee', i, 'name', v)} className="" isEditing={isEditing} />
                    : member.name}
                </h4>
                <p style={{ fontSize: 12, color: C.accentWarm, textTransform: 'uppercase', letterSpacing: '0.08em', ...sansS }}>
                  {isEditing
                    ? <EditableText value={member.role} onChange={v => updateNested('organizing_committee', i, 'role', v)} className="" isEditing={isEditing} />
                    : member.role}
                </p>
              </div>
            ))}
            {isEditing && (
              <div
                onClick={() => update('organizing_committee', [...pageData.organizing_committee, { name: 'New Member', role: 'Role' }])}
                style={{
                  padding: '20px 24px', border: `1px dashed ${C.rule}`, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  minHeight: 100, color: C.accentWarm, gap: 6,
                }}
              >
                <Plus size={18} />
                <span style={{ fontSize: 12, ...sansS }}>Add Member</span>
              </div>
            )}
          </div>
        </section>

        {/* ── SPONSORS ── */}
        <section id="sponsors" style={{ scrollMarginTop: 120, marginBottom: 72 }}>
          {isEditing && <EditBadge label="Sponsors" />}
          <Rule thick />
          <h2 style={{ fontSize: '2rem', fontWeight: 400, margin: '16px 0 32px', letterSpacing: '-0.01em' }}>
            Sponsors & Partners
          </h2>
          {['platinum', 'gold', 'silver'].map(tier => {
            const tierSponsors = pageData.sponsors.filter(s => s.tier === tier);
            if (!tierSponsors.length && !isEditing) return null;
            const tierLabel = { platinum: 'Platinum Sponsors', gold: 'Gold Sponsors', silver: 'Silver Sponsors' };
            return (
              <div key={tier} style={{ marginBottom: 36 }}>
                <h3 style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: C.inkMuted, marginBottom: 16, ...sansS }}>
                  {tierLabel[tier]}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {tierSponsors.map((sp) => {
                    const globalIndex = pageData.sponsors.indexOf(sp);
                    return (
                      <div key={globalIndex} style={{
                        border: `1px solid ${C.rule}`, padding: tier === 'platinum' ? '20px 36px' : tier === 'gold' ? '14px 28px' : '10px 20px',
                        position: 'relative', display: 'flex', alignItems: 'center',
                      }}>
                        {isEditing && (
                          <button
                            onClick={() => update('sponsors', pageData.sponsors.filter((_, idx) => idx !== globalIndex))}
                            style={{ position: 'absolute', top: 4, right: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                          >
                            <X size={10} />
                          </button>
                        )}
                        <span style={{
                          fontWeight: 700, ...sansS,
                          fontSize: tier === 'platinum' ? 18 : tier === 'gold' ? 15 : 13,
                          color: tier === 'platinum' ? C.ink : tier === 'gold' ? C.gold : C.inkMuted,
                        }}>
                          {isEditing
                            ? <EditableText value={sp.name} onChange={v => updateNested('sponsors', globalIndex, 'name', v)} className="" isEditing={isEditing} />
                            : sp.name}
                        </span>
                      </div>
                    );
                  })}
                  {isEditing && (
                    <button
                      onClick={() => update('sponsors', [...pageData.sponsors, { name: 'Sponsor Name', tier }])}
                      style={{
                        border: `1px dashed ${C.rule}`, background: 'transparent',
                        padding: tier === 'platinum' ? '20px 36px' : '14px 28px',
                        cursor: 'pointer', color: C.accentWarm, display: 'flex', alignItems: 'center', gap: 6, ...sansS, fontSize: 12,
                      }}
                    >
                      <Plus size={12} /> Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        {/* ── CONTACT ── */}
        <section id="contact" style={{ scrollMarginTop: 120, marginBottom: 72 }}>
          {isEditing && <EditBadge label="Contact" />}
          <Rule thick />
          <h2 style={{ fontSize: '2rem', fontWeight: 400, margin: '16px 0 32px', letterSpacing: '-0.01em' }}>
            Contact & Enquiries
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64 }}>
            <div>
              <div style={{ borderTop: `1px solid ${C.rule}` }}>
                {[
                  { icon: Mail, label: 'General Enquiries', key: 'contact_email' },
                  { icon: Phone, label: 'Telephone', key: 'contact_phone' },
                  { icon: Globe, label: 'Website', key: 'website' },
                  { icon: Twitter, label: 'Twitter / X', key: 'twitter' },
                  { icon: Linkedin, label: 'LinkedIn', key: 'linkedin' },
                ].map(({ icon: Icon, label, key }) => (
                  <div key={key} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '18px 0', borderBottom: `1px solid ${C.rule}` }}>
                    <Icon size={16} color={C.inkMuted} style={{ marginTop: 3, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.inkMuted, marginBottom: 4, ...sansS }}>{label}</div>
                      {isEditing
                        ? <EditableText value={pageData[key]} onChange={v => update(key, v)} className="" isEditing={isEditing} placeholder={`Enter ${label}…`} />
                        : <span style={{ fontSize: 14, color: C.inkLight }}>{pageData[key] || '—'}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.08em', ...sansS }}>
                Send an Enquiry
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Full Name', 'Email Address', 'Institution / Organisation'].map(ph => (
                  <input key={ph} placeholder={ph} style={{
                    width: '100%', border: `1px solid ${C.rule}`, background: C.paper,
                    padding: '12px 14px', fontSize: 13, color: C.ink, outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }} />
                ))}
                <textarea rows={5} placeholder="Your message…" style={{
                  width: '100%', border: `1px solid ${C.rule}`, background: C.paper,
                  padding: '12px 14px', fontSize: 13, color: C.ink, outline: 'none',
                  resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
                }} />
                <button style={{
                  background: C.ink, color: C.bg, border: 'none',
                  padding: '14px', fontSize: 13, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', ...sansS,
                }}>
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Schedule Editor Modal ── */}
      {showScheduleEditor && (
        <ScheduleEditor
          schedule={pageData.schedule}
          members={members}
          onSave={async (newSchedule) => {
            if (onScheduleSave) await onScheduleSave(newSchedule);
            setPageData(p => ({ ...p, schedule: newSchedule }));
          }}
          onClose={() => setShowScheduleEditor(false)}
        />
      )}

      {/* ── FOOTER ── */}
      <footer style={{ background: C.ink, color: 'rgba(253,250,244,0.6)', padding: '40px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ color: C.bg, fontWeight: 400, fontSize: '1.1rem', marginBottom: 6, ...s }}>{displayName}</div>
            <div style={{ fontSize: 12, ...sansS }}>{displayDate} · {conf.location}</div>
          </div>
          <div style={{ display: 'flex', gap: 28, fontSize: 12, ...sansS }}>
            {['Privacy Policy', 'Terms of Use', 'Accessibility'].map(link => (
              <a key={link} href="#" style={{ color: 'rgba(253,250,244,0.5)', textDecoration: 'none' }}>{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ClassicTemplate;







































