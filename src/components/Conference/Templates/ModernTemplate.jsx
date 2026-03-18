import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Calendar, Users, Mail, Phone, Globe,
  Twitter, Linkedin, Edit3, Check, X, Plus, Trash2, Save, AlertCircle
} from 'lucide-react';

/* ─────────────────────────────────────────────
   INLINE EDITABLE FIELD
   ───────────────────────────────────────────── */
const EditableText = ({ value, onChange, multiline = false, className = '', placeholder = 'Click to edit…', isEditing }) => {
  const [local, setLocal] = useState(value ?? '');
  const ref = useRef(null);
  useEffect(() => setLocal(value ?? ''), [value]);

  if (!isEditing) return <span className={className}>{value || <span className="opacity-40 italic">{placeholder}</span>}</span>;

  const shared = {
    ref,
    value: local,
    placeholder,
    onChange: e => setLocal(e.target.value),
    onBlur: () => onChange(local),
    className: `bg-white/10 border border-indigo-400/60 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-400 w-full ${className}`,
  };
  return multiline ? <textarea rows={3} {...shared} /> : <input {...shared} />;
};

/* ─────────────────────────────────────────────
   SECTION WRAPPER
   ───────────────────────────────────────────── */
const Section = ({ id, label, children, isEditing }) => (
  <section id={id} className="scroll-mt-24">
    {isEditing && (
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
          Editing: {label}
        </span>
      </div>
    )}
    {children}
  </section>
);

/* ─────────────────────────────────────────────
   MAIN TEMPLATE
   Props:
     conf        – conference object from DB
     isOrganizer – boolean, shows edit bar when true
     onSave      – async fn(pageData) → called when organizer saves
   ───────────────────────────────────────────── */
const ModernTemplate = ({ conf: initialConf, isOrganizer = false, onSave }) => {
  const [conf, setConf] = useState(initialConf);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [activeNav, setActiveNav] = useState('about');

  const [pageData, setPageData] = useState({
    tagline: initialConf.tagline || 'Shaping the Future Together',
    contact_email: initialConf.contact_email || 'contact@conference.org',
    contact_phone: initialConf.contact_phone || '+1 (555) 000-0000',
    website: initialConf.website || 'https://yourconference.org',
    twitter: initialConf.twitter || '',
    linkedin: initialConf.linkedin || '',
    schedule: initialConf.schedule || [
      {
        day: 'Day 1', date: initialConf.start_date || 'TBD', sessions: [
          { time: '08:00 AM', title: 'Registration & Welcome Coffee', type: 'break', speaker: '' },
          { time: '09:00 AM', title: 'Opening Keynote', type: 'keynote', speaker: 'TBD' },
          { time: '11:00 AM', title: 'Panel Discussion', type: 'panel', speaker: 'TBD' },
          { time: '01:00 PM', title: 'Lunch Break', type: 'break', speaker: '' },
          { time: '02:30 PM', title: 'Workshop Sessions', type: 'workshop', speaker: 'Multiple Tracks' },
          { time: '05:00 PM', title: 'Networking Reception', type: 'social', speaker: '' },
        ],
      },
      {
        day: 'Day 2', date: initialConf.end_date || '', sessions: [
          { time: '09:00 AM', title: 'Morning Keynote', type: 'keynote', speaker: 'TBD' },
          { time: '11:00 AM', title: 'Research Presentations', type: 'talk', speaker: 'Multiple Speakers' },
          { time: '01:00 PM', title: 'Lunch Break', type: 'break', speaker: '' },
          { time: '03:00 PM', title: 'Closing Panel & Awards', type: 'panel', speaker: 'TBD' },
          { time: '05:00 PM', title: 'Farewell Dinner', type: 'social', speaker: '' },
        ],
      },
    ],
    speakers: initialConf.speakers || [
      { name: 'Dr. Alex Rivera', role: 'Lead Researcher', org: 'MIT', img: 'https://i.pravatar.cc/150?img=21', bio: 'Pioneering researcher in AI ethics and policy.' },
      { name: 'Prof. Sarah Chen', role: 'Director', org: 'Stanford AI Lab', img: 'https://i.pravatar.cc/150?img=47', bio: 'Expert in machine learning and computer vision.' },
      { name: 'James Okafor', role: 'CEO', org: 'Nexus Technologies', img: 'https://i.pravatar.cc/150?img=33', bio: 'Industry leader building ethical AI systems at scale.' },
      { name: 'Dr. Priya Patel', role: 'Senior Scientist', org: 'DeepMind', img: 'https://i.pravatar.cc/150?img=41', bio: 'Specializes in reinforcement learning and robotics.' },
    ],
    sponsors: initialConf.sponsors || [
      { name: 'NovaTech', tier: 'platinum' },
      { name: 'FutureCorp', tier: 'gold' },
      { name: 'DataStream', tier: 'gold' },
      { name: 'InnovateCo', tier: 'silver' },
      { name: 'TechBridge', tier: 'silver' },
    ],
    important_dates: initialConf.important_dates || [
      { label: 'Abstract Submission Deadline', date: 'March 15, 2025' },
      { label: 'Notification of Acceptance', date: 'April 30, 2025' },
      { label: 'Early Bird Registration', date: 'May 15, 2025' },
      { label: 'Full Paper Submission', date: 'June 1, 2025' },
      { label: 'Conference Dates', date: `${initialConf.start_date || 'TBD'} – ${initialConf.end_date || 'TBD'}` },
    ],
    venue_name: initialConf.venue_name || 'Grand Convention Center',
    venue_address: initialConf.venue_address || initialConf.location || 'City, Country',
    venue_description: initialConf.venue_description || 'A world-class venue equipped with state-of-the-art facilities, multiple breakout rooms, and excellent transport links.',
    capacity: initialConf.capacity || '500+',
    registration_fee_general: initialConf.registration_fee_general || '$299',
    registration_fee_student: initialConf.registration_fee_student || '$149',
    registration_fee_early: initialConf.registration_fee_early || '$199',
    about_extra: initialConf.about_extra || 'Join us for groundbreaking presentations, hands-on workshops, and unparalleled networking opportunities with leading researchers and practitioners from around the globe.',
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
    { id: 'schedule', label: 'Schedule' },
    { id: 'speakers', label: 'Speakers' },
    { id: 'dates', label: 'Important Dates' },
    { id: 'venue', label: 'Venue' },
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

  const sessionTypeStyle = {
    keynote: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    panel: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    workshop: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    talk: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    break: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    social: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };

  const displayName = conf.title ?? conf.name ?? 'Untitled Conference';
  const displayDate = conf.start_date
    ? `${conf.start_date}${conf.end_date ? ` – ${conf.end_date}` : ''}`
    : 'Date TBD';

  return (
    <div className="bg-[#020617] min-h-screen text-slate-200 font-sans">

      {/* ── Organizer Edit Bar ── */}
      {isOrganizer && (
        <div className="sticky top-0 z-[100] bg-indigo-950/95 backdrop-blur-xl border-b border-indigo-500/30 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit3 size={16} className="text-indigo-400" />
            <span className="text-sm font-bold text-white">Organizer Edit Mode</span>
            {!isEditing && <span className="text-xs text-slate-400">— Click "Edit Page" to modify content</span>}
          </div>
          <div className="flex items-center gap-3">
            {saveError && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle size={12} /> {saveError}
              </span>
            )}
            {saved && <span className="text-xs text-emerald-400 font-medium">✓ Saved!</span>}
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-white/10 hover:border-white/20 transition-all"
                >
                  <X size={14} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-60"
                >
                  <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold bg-white text-slate-900 hover:bg-slate-100 transition-all"
              >
                <Edit3 size={14} /> Edit Page
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <div
        className="relative h-[600px] w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${conf.banner_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600'})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/50 via-slate-900/70 to-[#020617]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <span className="bg-white/10 border border-white/20 text-indigo-200 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md mb-6">
            {conf.theme || 'Conference Theme'}
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none text-white mb-4 drop-shadow-2xl">
            {displayName}
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-xl mb-2">
            {isEditing
              ? <EditableText value={pageData.tagline} onChange={v => update('tagline', v)} className="text-xl text-center text-slate-300" isEditing={isEditing} placeholder="Conference tagline…" />
              : pageData.tagline}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-sm text-slate-400">
            <span className="flex items-center gap-2"><Calendar size={14} />{displayDate}</span>
            <span className="flex items-center gap-2"><MapPin size={14} />{conf.location || 'Location TBD'}</span>
            <span className="flex items-center gap-2"><Users size={14} />{pageData.capacity} Attendees</span>
          </div>
          <div className="flex gap-4 mt-8">
            <button className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/30">
              Register Now
            </button>
            <button onClick={() => scrollTo('schedule')} className="bg-white/10 border border-white/20 text-white px-8 py-3 rounded-full font-bold hover:bg-white/20 transition-all backdrop-blur-sm">
              View Schedule
            </button>
          </div>
        </div>
      </div>

      {/* ── STICKY NAV ── */}
      <nav className="sticky top-0 z-40 bg-[#020617]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex items-center gap-1 overflow-x-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className={`px-5 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all ${
                activeNav === item.id
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-20 space-y-28">

        {/* ── ABOUT ── */}
        <Section id="about" label="About" isEditing={isEditing}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
            <div className="lg:col-span-3 space-y-6">
              <h2 className="text-4xl font-black text-white">About the <span className="text-indigo-400">Conference</span></h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                {isEditing
                  ? <EditableText value={conf.description} onChange={v => setConf(p => ({ ...p, description: v }))} multiline className="text-slate-400 w-full" isEditing={isEditing} placeholder="Conference description…" />
                  : conf.description}
              </p>
              <p className="text-slate-400 text-lg leading-relaxed">
                {isEditing
                  ? <EditableText value={pageData.about_extra} onChange={v => update('about_extra', v)} multiline className="text-slate-400 w-full" isEditing={isEditing} placeholder="Additional details…" />
                  : pageData.about_extra}
              </p>
            </div>
            <div className="lg:col-span-2 space-y-5">
              {[
                { label: 'General Admission', key: 'registration_fee_general', accent: 'text-indigo-400' },
                { label: 'Student Rate', key: 'registration_fee_student', accent: 'text-purple-400' },
                { label: 'Early Bird (Limited)', key: 'registration_fee_early', accent: 'text-emerald-400' },
              ].map(({ label, key, accent }) => (
                <div key={key} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex justify-between items-center">
                  <span className="text-slate-400 text-sm">{label}</span>
                  <span className={`text-2xl font-black ${accent}`}>
                    {isEditing
                      ? <EditableText value={pageData[key]} onChange={v => update(key, v)} className={`text-xl font-black ${accent} w-24`} isEditing={isEditing} />
                      : pageData[key]}
                  </span>
                </div>
              ))}
              <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20">
                Register Now →
              </button>
            </div>
          </div>
        </Section>

        {/* ── SCHEDULE ── */}
        <Section id="schedule" label="Schedule" isEditing={isEditing}>
          <h2 className="text-4xl font-black text-white mb-12">Program <span className="text-indigo-400">Schedule</span></h2>
          <div className="space-y-10">
            {pageData.schedule.map((day, di) => (
              <div key={di}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-full">
                    {isEditing
                      ? <EditableText value={day.day} onChange={v => updateNested('schedule', di, 'day', v)} className="text-white bg-transparent w-16" isEditing={isEditing} />
                      : day.day}
                  </div>
                  <span className="text-slate-500 text-sm">
                    {isEditing
                      ? <EditableText value={day.date} onChange={v => updateNested('schedule', di, 'date', v)} className="text-slate-400 w-32" isEditing={isEditing} placeholder="Date…" />
                      : day.date}
                  </span>
                  {isEditing && (
                    <button
                      onClick={() => update('schedule', pageData.schedule.filter((_, idx) => idx !== di))}
                      className="ml-auto text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-1 text-xs"
                    >
                      <Trash2 size={12} /> Remove Day
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {day.sessions.map((session, si) => (
                    <div key={si} className="flex items-start gap-5 bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
                      <div className="min-w-[90px] text-slate-500 text-sm font-mono pt-0.5">
                        {isEditing
                          ? <EditableText
                              value={session.time}
                              onChange={v => update('schedule', pageData.schedule.map((d, dIdx) => dIdx !== di ? d : {
                                ...d, sessions: d.sessions.map((ss, sIdx) => sIdx !== si ? ss : { ...ss, time: v })
                              }))}
                              className="text-slate-400 w-24 text-xs"
                              isEditing={isEditing}
                            />
                          : session.time}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-base">
                          {isEditing
                            ? <EditableText
                                value={session.title}
                                onChange={v => update('schedule', pageData.schedule.map((d, dIdx) => dIdx !== di ? d : {
                                  ...d, sessions: d.sessions.map((ss, sIdx) => sIdx !== si ? ss : { ...ss, title: v })
                                }))}
                                className="text-white font-bold w-full"
                                isEditing={isEditing}
                              />
                            : session.title}
                        </h4>
                        {(session.speaker || isEditing) && (
                          <p className="text-slate-500 text-sm mt-1">
                            {isEditing
                              ? <EditableText
                                  value={session.speaker}
                                  onChange={v => update('schedule', pageData.schedule.map((d, dIdx) => dIdx !== di ? d : {
                                    ...d, sessions: d.sessions.map((ss, sIdx) => sIdx !== si ? ss : { ...ss, speaker: v })
                                  }))}
                                  className="text-slate-400 text-sm"
                                  isEditing={isEditing}
                                  placeholder="Speaker name…"
                                />
                              : session.speaker}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing && (
                          <select
                            value={session.type}
                            onChange={e => update('schedule', pageData.schedule.map((d, dIdx) => dIdx !== di ? d : {
                              ...d, sessions: d.sessions.map((ss, sIdx) => sIdx !== si ? ss : { ...ss, type: e.target.value })
                            }))}
                            className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 border border-white/10 outline-none"
                          >
                            {Object.keys(sessionTypeStyle).map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        )}
                        <span className={`text-xs px-3 py-1 rounded-full border font-medium capitalize ${sessionTypeStyle[session.type] || sessionTypeStyle.talk}`}>
                          {session.type}
                        </span>
                        {isEditing && (
                          <button
                            onClick={() => update('schedule', pageData.schedule.map((d, dIdx) => dIdx !== di ? d : {
                              ...d, sessions: d.sessions.filter((_, sIdx) => sIdx !== si)
                            }))}
                            className="text-red-400/50 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {isEditing && (
                    <button
                      onClick={() => update('schedule', pageData.schedule.map((d, dIdx) => dIdx !== di ? d : {
                        ...d, sessions: [...d.sessions, { time: '12:00 PM', title: 'New Session', type: 'talk', speaker: '' }]
                      }))}
                      className="w-full border border-dashed border-white/10 hover:border-indigo-500/40 text-slate-500 hover:text-indigo-400 rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                    >
                      <Plus size={14} /> Add Session
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isEditing && (
              <button
                onClick={() => update('schedule', [...pageData.schedule, { day: `Day ${pageData.schedule.length + 1}`, date: '', sessions: [] }])}
                className="border border-dashed border-indigo-500/30 hover:border-indigo-500/60 text-indigo-400/60 hover:text-indigo-400 rounded-2xl py-4 w-full text-sm font-medium flex items-center justify-center gap-2 transition-all"
              >
                <Plus size={14} /> Add Day
              </button>
            )}
          </div>
        </Section>

        {/* ── SPEAKERS ── */}
        <Section id="speakers" label="Speakers" isEditing={isEditing}>
          <h2 className="text-4xl font-black text-white mb-12">Featured <span className="text-indigo-400">Speakers</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {pageData.speakers.map((sp, i) => (
              <div key={i} className="group bg-white/[0.03] border border-white/5 rounded-3xl p-6 hover:border-indigo-500/30 hover:bg-white/[0.06] transition-all relative">
                {isEditing && (
                  <button
                    onClick={() => update('speakers', pageData.speakers.filter((_, idx) => idx !== i))}
                    className="absolute top-4 right-4 text-red-400/50 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
                <div className="w-20 h-20 rounded-2xl overflow-hidden mb-4 bg-slate-800">
                  {!isEditing && sp.img && (
                    <img src={sp.img} alt={sp.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                  )}
                  {isEditing && (
                    <div className="w-full h-full flex items-center justify-center p-1">
                      <EditableText value={sp.img} onChange={v => updateNested('speakers', i, 'img', v)} className="text-[8px] text-slate-400 break-all" isEditing={isEditing} placeholder="Image URL" />
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-white text-lg leading-tight">
                  {isEditing
                    ? <EditableText value={sp.name} onChange={v => updateNested('speakers', i, 'name', v)} className="text-white font-bold" isEditing={isEditing} />
                    : sp.name}
                </h4>
                <p className="text-indigo-400 text-sm font-medium mt-1">
                  {isEditing
                    ? <EditableText value={sp.role} onChange={v => updateNested('speakers', i, 'role', v)} className="text-indigo-400 text-sm" isEditing={isEditing} />
                    : sp.role}
                </p>
                <p className="text-slate-500 text-sm">
                  {isEditing
                    ? <EditableText value={sp.org} onChange={v => updateNested('speakers', i, 'org', v)} className="text-slate-500 text-sm" isEditing={isEditing} />
                    : sp.org}
                </p>
                <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                  {isEditing
                    ? <EditableText value={sp.bio} onChange={v => updateNested('speakers', i, 'bio', v)} multiline className="text-slate-400 text-xs w-full" isEditing={isEditing} />
                    : sp.bio}
                </p>
              </div>
            ))}
            {isEditing && (
              <button
                onClick={() => update('speakers', [...pageData.speakers, {
                  name: 'New Speaker', role: 'Role', org: 'Organization',
                  img: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 70)}`,
                  bio: 'Speaker bio goes here.'
                }])}
                className="border-2 border-dashed border-white/10 hover:border-indigo-500/40 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-indigo-400 transition-all min-h-[200px]"
              >
                <Plus size={24} />
                <span className="text-sm font-medium">Add Speaker</span>
              </button>
            )}
          </div>
        </Section>

        {/* ── IMPORTANT DATES ── */}
        <Section id="dates" label="Important Dates" isEditing={isEditing}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-4xl font-black text-white mb-12">Important <span className="text-indigo-400">Dates</span></h2>
              <div className="space-y-4">
                {pageData.important_dates.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3 flex-1">
                      {isEditing && (
                        <button
                          onClick={() => update('important_dates', pageData.important_dates.filter((_, idx) => idx !== i))}
                          className="text-red-400/50 hover:text-red-400 transition-colors shrink-0"
                        >
                          <X size={12} />
                        </button>
                      )}
                      <span className="text-slate-300 text-sm font-medium">
                        {isEditing
                          ? <EditableText value={d.label} onChange={v => updateNested('important_dates', i, 'label', v)} className="text-slate-300 text-sm" isEditing={isEditing} />
                          : d.label}
                      </span>
                    </div>
                    <span className="text-indigo-400 font-bold text-sm whitespace-nowrap">
                      {isEditing
                        ? <EditableText value={d.date} onChange={v => updateNested('important_dates', i, 'date', v)} className="text-indigo-400 text-sm text-right w-32" isEditing={isEditing} />
                        : d.date}
                    </span>
                  </div>
                ))}
                {isEditing && (
                  <button
                    onClick={() => update('important_dates', [...pageData.important_dates, { label: 'New Deadline', date: 'Date TBD' }])}
                    className="w-full border border-dashed border-white/10 hover:border-indigo-500/40 text-slate-500 hover:text-indigo-400 rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus size={14} /> Add Date
                  </button>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900/60 border border-indigo-500/20 rounded-3xl p-8">
              <h3 className="text-2xl font-bold text-white mb-4">Call for Papers</h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                We invite researchers to submit original work on <strong className="text-white">{conf.theme}</strong>. Accepted papers will be published in conference proceedings.
              </p>
              <ul className="space-y-2 mb-8">
                {['Original unpublished research', 'Full papers (8–12 pages)', 'Extended abstracts (2–4 pages)', 'Poster submissions welcome'].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-400">
                    <Check size={14} className="text-indigo-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all">
                Submit Your Paper
              </button>
            </div>
          </div>
        </Section>

        {/* ── VENUE ── */}
        <Section id="venue" label="Venue" isEditing={isEditing}>
          <h2 className="text-4xl font-black text-white mb-12"><span className="text-indigo-400">Venue</span> & Location</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {isEditing
                    ? <EditableText value={pageData.venue_name} onChange={v => update('venue_name', v)} className="text-white text-2xl font-bold" isEditing={isEditing} />
                    : pageData.venue_name}
                </h3>
                <p className="text-slate-500 flex items-center gap-2 mt-2 text-sm">
                  <MapPin size={14} />
                  {isEditing
                    ? <EditableText value={pageData.venue_address} onChange={v => update('venue_address', v)} className="text-slate-400 text-sm" isEditing={isEditing} />
                    : pageData.venue_address}
                </p>
              </div>
              <p className="text-slate-400 leading-relaxed">
                {isEditing
                  ? <EditableText value={pageData.venue_description} onChange={v => update('venue_description', v)} multiline className="text-slate-400 w-full" isEditing={isEditing} />
                  : pageData.venue_description}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-white">
                    {isEditing
                      ? <EditableText value={pageData.capacity} onChange={v => update('capacity', v)} className="text-white text-2xl font-black text-center" isEditing={isEditing} />
                      : pageData.capacity}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Capacity</div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-black text-white">{pageData.schedule.length}</div>
                  <div className="text-xs text-slate-500 mt-1">Days</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-3xl overflow-hidden border border-white/5 min-h-[300px] flex flex-col items-center justify-center gap-3">
              <MapPin size={48} className="opacity-20" />
              <p className="text-slate-500 text-sm">{pageData.venue_name}</p>
              <p className="text-slate-600 text-xs">{pageData.venue_address}</p>
            </div>
          </div>
        </Section>

        {/* ── SPONSORS ── */}
        <Section id="sponsors" label="Sponsors" isEditing={isEditing}>
          <h2 className="text-4xl font-black text-white mb-12">Our <span className="text-indigo-400">Sponsors</span></h2>
          {['platinum', 'gold', 'silver'].map(tier => {
            const tierSponsors = pageData.sponsors.filter(s => s.tier === tier);
            if (!tierSponsors.length && !isEditing) return null;
            return (
              <div key={tier} className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <span className={`text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border ${
                    tier === 'platinum' ? 'bg-slate-300/10 text-slate-300 border-slate-300/20'
                      : tier === 'gold' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                  }`}>{tier}</span>
                </div>
                <div className={`grid gap-4 ${
                  tier === 'platinum' ? 'grid-cols-1 sm:grid-cols-2'
                    : tier === 'gold' ? 'grid-cols-2 sm:grid-cols-3'
                      : 'grid-cols-3 sm:grid-cols-5'
                }`}>
                  {tierSponsors.map((sp) => {
                    const globalIndex = pageData.sponsors.indexOf(sp);
                    return (
                      <div key={globalIndex} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 flex items-center justify-center hover:border-white/10 transition-all relative group">
                        {isEditing && (
                          <button
                            onClick={() => update('sponsors', pageData.sponsors.filter((_, idx) => idx !== globalIndex))}
                            className="absolute top-2 right-2 text-red-400/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X size={12} />
                          </button>
                        )}
                        <span className={`font-black text-lg ${
                          tier === 'platinum' ? 'text-slate-200' : tier === 'gold' ? 'text-amber-300' : 'text-slate-400'
                        }`}>
                          {isEditing
                            ? <EditableText value={sp.name} onChange={v => updateNested('sponsors', globalIndex, 'name', v)} className="text-center font-black w-24" isEditing={isEditing} />
                            : sp.name}
                        </span>
                      </div>
                    );
                  })}
                  {isEditing && (
                    <button
                      onClick={() => update('sponsors', [...pageData.sponsors, { name: 'Sponsor', tier }])}
                      className="border border-dashed border-white/10 hover:border-indigo-500/40 rounded-2xl p-6 flex items-center justify-center text-slate-600 hover:text-indigo-400 transition-all"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </Section>

        {/* ── CONTACT ── */}
        <Section id="contact" label="Contact" isEditing={isEditing}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-4xl font-black text-white mb-8">Get in <span className="text-indigo-400">Touch</span></h2>
              <div className="space-y-5">
                {[
                  { icon: Mail, label: 'Email', key: 'contact_email' },
                  { icon: Phone, label: 'Phone', key: 'contact_phone' },
                  { icon: Globe, label: 'Website', key: 'website' },
                  { icon: Twitter, label: 'Twitter', key: 'twitter' },
                  { icon: Linkedin, label: 'LinkedIn', key: 'linkedin' },
                ].map(({ icon: Icon, label, key }) => (
                  <div key={key} className="flex items-center gap-4 text-slate-400 group">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/10 transition-all shrink-0">
                      <Icon size={16} className="group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{label}</div>
                      {isEditing
                        ? <EditableText value={pageData[key]} onChange={v => update(key, v)} className="text-slate-300 text-sm" isEditing={isEditing} placeholder={`Enter ${label}…`} />
                        : <span className="text-slate-300 text-sm truncate block">{pageData[key] || '—'}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900/60 border border-indigo-500/20 rounded-3xl p-8">
              <h3 className="text-xl font-bold text-white mb-6">Send a Message</h3>
              <div className="space-y-4">
                <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors text-sm" placeholder="Your name" />
                <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors text-sm" placeholder="Your email" />
                <textarea rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500 transition-colors text-sm resize-none" placeholder="Your message…" />
                <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all">
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </Section>

      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 mt-20 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <p className="font-bold text-white">{displayName}</p>
            <p className="text-slate-500 text-sm">{displayDate} · {conf.location}</p>
          </div>
          <div className="flex gap-6 text-slate-600 text-xs">
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Terms of Use</a>
            <a href={`mailto:${pageData.contact_email}`} className="hover:text-slate-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ModernTemplate;