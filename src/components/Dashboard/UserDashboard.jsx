import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import {
  Users, Calendar, Layout, LogOut, Plus, Search,
  MapPin, Bell, ChevronRight, ChevronLeft, Check,
  X, Sparkles, Settings, User, Mail, Shield,
  Award, FileText, Lock, Eye, EyeOff, Compass,
  Zap, TrendingUp, Star, Globe, Sun, Moon
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import AmbientBackground from '../Common/AmbientBackground';
import GlowCard from '../Common/GlowCard';
import MagneticButton from '../Common/MagneticButton';
import ThemeToggle from '../Common/ThemeToggle';

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM — Premium Ambient Background
// ═══════════════════════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════════════════════
// DATA — Volunteer Preferences
// ═══════════════════════════════════════════════════════════════════════════════

const DOMAINS = {
  'Computer Science & AI': [
    'Artificial Intelligence', 'Machine Learning', 'Deep Learning',
    'Computer Vision', 'Natural Language Processing', 'Reinforcement Learning',
    'Generative AI & LLMs', 'Robotics & Automation', 'Data Science & Analytics',
    'Big Data & Cloud Computing', 'Cybersecurity & Privacy', 'Blockchain & Web3',
    'Human-Computer Interaction', 'Augmented & Virtual Reality', 'Quantum Computing',
    'Edge Computing & IoT', 'Software Engineering', 'Database Systems',
    'Computer Networks', 'Distributed Systems',
  ],
  'Physical Sciences': [
    'Quantum Mechanics & Quantum Physics', 'Astrophysics & Cosmology',
    'Particle Physics & High Energy Physics', 'Condensed Matter Physics',
    'Optics & Photonics', 'Nuclear Physics', 'Thermodynamics',
    'Nanotechnology', 'Materials Science', 'Fluid Dynamics',
    'Acoustics', 'Plasma Physics',
  ],
  'Life Sciences & Medicine': [
    'Bioinformatics & Computational Biology', 'Genomics & Proteomics',
    'Neuroscience', 'Biotechnology', 'Medical Imaging',
    'Drug Discovery & Pharmacology', 'Climate & Environmental Science',
    'Ecology & Biodiversity', 'Agricultural Science',
    'Public Health & Epidemiology', 'Biomedical Engineering',
  ],
  'Engineering & Applied Sciences': [
    'Electrical Engineering', 'Mechanical Engineering', 'Civil & Structural Engineering',
    'Aerospace Engineering', 'Chemical Engineering', 'Energy Systems & Sustainability',
    'Renewable Energy', 'Autonomous Vehicles', 'Advanced Manufacturing',
  ],
  'Social Sciences & Humanities': [
    'Economics & Finance', 'Education Technology', 'Cognitive Science',
    'Philosophy & Ethics of AI', 'Policy & Governance', 'Digital Humanities',
    'Communication & Journalism', 'Psychology', 'Sociology',
  ],
};

const ROLES = [
  { id: 'logistics_head', name: 'Logistics Team', emoji: '🚚', color: '#f59e0b', desc: 'Venue, transport, accommodation & on-site ops' },
  { id: 'outreach_head', name: 'Outreach Team', emoji: '📢', color: '#6366f1', desc: 'Marketing, social media & external communications' },
  { id: 'technical_head', name: 'Technical Team', emoji: '⚙️', color: '#06b6d4', desc: 'AV equipment, live streams & technical support' },
  { id: 'registration_head', name: 'Registration Team', emoji: '📋', color: '#10b981', desc: 'Attendee registration, badges & check-ins' },
  { id: 'sponsorship_head', name: 'Sponsorship Team', emoji: '🤝', color: '#8b5cf6', desc: 'Identify and coordinate with conference sponsors' },
  { id: 'hospitality_head', name: 'Hospitality Team', emoji: '🏨', color: '#f43f5e', desc: 'Catering, guest relations & VIP arrangements' },
  { id: 'publication_head', name: 'Publications Team', emoji: '📝', color: '#3b82f6', desc: 'Proceedings, journals & editorial coordination' },
  { id: 'finance_head', name: 'Finance Team', emoji: '💰', color: '#eab308', desc: 'Budget tracking, reimbursements & expenses' },
  { id: 'program_coord', name: 'Program Coordinator', emoji: '🗓️', color: '#ec4899', desc: 'Schedule sessions, speakers & workshops' },
  { id: 'social_coord', name: 'Social Media Coord.', emoji: '📱', color: '#14b8a6', desc: 'Real-time updates on Twitter, LinkedIn & Instagram' },
  { id: 'volunteer_coord', name: 'Volunteer Coordinator', emoji: '👥', color: '#f97316', desc: 'Onboard, train & manage fellow volunteers' },
  { id: 'design_lead', name: 'Design Lead', emoji: '🎨', color: '#a855f7', desc: 'Branding, banners, posters & visual assets' },
  { id: 'web_lead', name: 'Website Lead', emoji: '🌐', color: '#0ea5e9', desc: 'Build & maintain the conference website & portal' },
  { id: 'security_coord', name: 'Security Coordinator', emoji: '🔒', color: '#64748b', desc: 'Access control & on-site safety protocols' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VOLUNTEER PREFERENCES MODAL
// ═══════════════════════════════════════════════════════════════════════════════

const VolunteerPreferencesModal = ({ userId, onClose, onSaved, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [step, setStep] = useState(0);
  const [selectedDomains, setSelectedDomains] = useState(new Set());
  const [selectedRoles, setSelectedRoles] = useState(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? userId;
      if (!uid) return;
      const { data, error } = await supabase.from('users').select('volunteer_domains, volunteer_roles').eq('user_id', uid).maybeSingle();
      if (data?.volunteer_domains?.length) setSelectedDomains(new Set(data.volunteer_domains));
      if (data?.volunteer_roles?.length) setSelectedRoles(new Set(data.volunteer_roles));
    })();
  }, [userId]);

  const filteredDomains = useMemo(() => {
    if (!search) return DOMAINS;
    const q = search.toLowerCase();
    const res = {};
    Object.entries(DOMAINS).forEach(([cat, items]) => {
      const f = items.filter((i) => i.toLowerCase().includes(q));
      if (f.length) res[cat] = f;
    });
    return res;
  }, [search]);

  const toggleDomain = (name) => setSelectedDomains((prev) => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  const toggleRole = (id) => setSelectedRoles((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? userId;
    if (!uid) { setSaveError('Not authenticated.'); setSaving(false); return; }
    const { data: existing, error: readErr } = await supabase.from('users').select('user_id').eq('user_id', uid).maybeSingle();
    if (readErr) { setSaveError('Could not read your user record: ' + readErr.message); setSaving(false); return; }
    if (!existing) { setSaveError('Your user row is not visible. Check RLS policies.'); setSaving(false); return; }
    const payload = { volunteer_domains: [...selectedDomains], volunteer_roles: [...selectedRoles] };
    const { data, error } = await supabase.from('users').update(payload).eq('user_id', uid).select('user_id, volunteer_domains, volunteer_roles');
    setSaving(false);
    if (error) { setSaveError(error.message || 'Update failed.'); return; }
    if (!data || data.length === 0) { setSaveError('Update ran but returned no rows. Check UPDATE policy.'); return; }
    onSaved?.({ domains: [...selectedDomains], roles: [...selectedRoles] });
    onClose();
  };

  const StepDomains = () => (
    <>
      <div className={`flex items-center gap-2.5 border rounded-xl px-3.5 py-2.5 mb-5 transition-all duration-300 ${isDark ? 'bg-white/[0.04] border-white/[0.06] focus-within:border-white/[0.15]' : 'bg-zinc-900/[0.03] border-zinc-900/[0.08] focus-within:border-amber-500/50 shadow-sm'}`}>
        <Search size={14} className="text-zinc-500 shrink-0" />
        <input autoFocus className={`bg-transparent border-none outline-none text-sm w-full transition-colors ${isDark ? 'text-white placeholder-zinc-600' : 'text-zinc-900 placeholder-zinc-400'}`} placeholder="Search domains…" value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-zinc-400 transition-colors"><X size={13} /></button>}
      </div>
      <div className="max-h-72 overflow-y-auto pr-1 space-y-5 scroll-smooth custom-scrollbar">
        {Object.keys(filteredDomains).length === 0 ? (
          <p className="text-center text-zinc-600 text-sm py-8">No domains match your search.</p>
        ) : (
          Object.entries(filteredDomains).map(([cat, items]) => (
            <div key={cat}>
              <p className={`text-[10px] font-semibold tracking-widest uppercase mb-2.5 transition-colors ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{cat}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => {
                  const sel = selectedDomains.has(item);
                  return (
                    <button key={item} onClick={() => toggleDomain(item)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 ${sel
                        ? (isDark ? 'bg-white text-zinc-900 border-white shadow-sm' : 'bg-zinc-900 text-white border-zinc-900 shadow-sm')
                        : (isDark ? 'bg-white/[0.03] border-white/[0.06] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200 hover:bg-white/[0.06]' : 'bg-zinc-900/[0.02] border-zinc-900/[0.06] text-zinc-500 hover:border-zinc-900/[0.12] hover:text-zinc-900 hover:bg-zinc-900/[0.04]')
                      }`}>
                      {sel && <Check size={10} className="inline mr-1 -mt-0.5" />}{item}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const StepRoles = () => (
    <div className="max-h-80 overflow-y-auto pr-1 scroll-smooth custom-scrollbar">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ROLES.map((role) => {
          const sel = selectedRoles.has(role.id);
          return (
            <button key={role.id} onClick={() => toggleRole(role.id)}
              className={`text-left p-4 rounded-xl border transition-all duration-300 ${sel
                ? (isDark ? 'bg-white/[0.08] border-white/[0.15]' : 'bg-amber-500/[0.08] border-amber-500/30 shadow-sm')
                : (isDark ? 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.12]' : 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100/80 hover:border-zinc-200 shadow-sm shadow-black/[0.02]')
              }`}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm mb-2.5"
                style={{ background: role.color + (isDark ? '18' : '12'), border: `1px solid ${role.color}${isDark ? '30' : '20'}` }}>{role.emoji}</div>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold transition-colors ${isDark ? 'text-slate-200' : 'text-zinc-800'}`}>{role.name}</span>
                {sel && <Check size={14} className="text-amber-500 shrink-0" />}
              </div>
              <p className={`text-[11px] leading-relaxed transition-colors ${isDark ? 'text-slate-500' : 'text-zinc-500'}`}>{role.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const StepReview = () => (
    <div className="space-y-5 max-h-80 overflow-y-auto pr-1 scroll-smooth custom-scrollbar">
      <div>
        <p className={`text-[10px] font-semibold tracking-widest uppercase mb-3 transition-colors ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Selected Domains ({selectedDomains.size})</p>
        <div className="flex flex-wrap gap-2">
          {[...selectedDomains].map((d) => (
            <span key={d} className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${isDark ? 'bg-white/[0.08] border-white/[0.1] text-zinc-200' : 'bg-zinc-900/[0.04] border-zinc-900/[0.08] text-zinc-700'}`}>{d}</span>
          ))}
          {selectedDomains.size === 0 && <span className="text-zinc-600 text-sm italic">None selected</span>}
        </div>
      </div>
      <div>
        <p className={`text-[10px] font-semibold tracking-widest uppercase mb-3 transition-colors ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Volunteer Roles ({selectedRoles.size})</p>
        <div className="flex flex-wrap gap-2">
          {ROLES.filter((r) => selectedRoles.has(r.id)).map((r) => (
            <span key={r.id} className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${isDark ? 'bg-white/[0.08] border-white/[0.1] text-zinc-200' : 'bg-zinc-900/[0.04] border-zinc-900/[0.08] text-zinc-700'}`}>{r.emoji} {r.name}</span>
          ))}
          {selectedRoles.size === 0 && <span className="text-zinc-600 text-sm italic">None selected</span>}
        </div>
      </div>
    </div>
  );

  const STEPS = [
    { label: 'Step 1 of 3', title: 'Conference Domains', sub: "Select all the fields you're interested in volunteering for", content: <StepDomains />, canContinue: selectedDomains.size > 0, count: selectedDomains.size, noun: 'domain' },
    { label: 'Step 2 of 3', title: 'Volunteer Roles', sub: "Pick the roles you'd like to take on at conferences", content: <StepRoles />, canContinue: selectedRoles.size > 0, count: selectedRoles.size, noun: 'role' },
    { label: 'Step 3 of 3', title: 'Review & Confirm', sub: 'Your volunteer preferences at a glance', content: <StepReview />, canContinue: true },
  ];

  const current = STEPS[step];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 350 }}
        className={`w-full max-w-2xl backdrop-blur-2xl border rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ${isDark ? 'bg-[#111113]/95 border-white/[0.06] shadow-black/60' : 'bg-white border-zinc-900/[0.08] shadow-zinc-900/10'}`}>
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-center gap-2 mb-5">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i <= step ? (isDark ? 'bg-white' : 'bg-zinc-900') : (isDark ? 'bg-white/[0.08]' : 'bg-zinc-100')}`} style={{ width: i === step ? 28 : 6 }} />
            ))}
            <button onClick={onClose} className="ml-auto p-1.5 text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.05] rounded-lg transition-all"><X size={16} /></button>
          </div>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-zinc-500 mb-1">{current.label}</p>
          <h2 className={`text-2xl font-bold mb-1 transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>{current.title}</h2>
          <p className="text-sm text-zinc-500 mb-6">{current.sub}</p>
        </div>
        <div className="px-8 pb-0">{current.content}</div>
        <div className={`px-8 pt-4 pb-6 mt-5 border-t space-y-3 transition-colors ${isDark ? 'border-white/[0.05]' : 'border-zinc-900/[0.05]'}`}>
          {saveError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-red-400 text-xs leading-relaxed flex-1">{saveError}</span>
              <button onClick={() => setSaveError('')} className="text-red-500/60 hover:text-red-400 shrink-0 mt-0.5"><X size={13} /></button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              {current.count != null && current.count > 0 ? (<><span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{current.count}</span> {current.noun}{current.count !== 1 ? 's' : ''} selected</>) : step < 2 ? `Select at least one ${current.noun}` : null}
            </p>
            <div className="flex items-center gap-3">
              {step > 0 && (
                <button onClick={() => { setStep((s) => s - 1); setSaveError(''); }} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${isDark ? 'border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.15]' : 'border-zinc-900/[0.08] text-zinc-500 hover:text-zinc-900 hover:border-zinc-900/[0.15]'}`}>
                  <ChevronLeft size={15} /> Back
                </button>
              )}
              <button disabled={!current.canContinue || saving} onClick={step < 2 ? () => { setStep((s) => s + 1); setSaveError(''); } : handleSave}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${current.canContinue && !saving
                  ? (isDark ? 'bg-white hover:bg-zinc-100 text-zinc-900 shadow-sm active:scale-95' : 'bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm active:scale-95')
                  : 'bg-zinc-900/[0.05] text-zinc-600 cursor-not-allowed'
                }`}>
                {saving ? 'Saving…' : step < 2 ? 'Continue' : 'Save Preferences'}
                {!saving && <ChevronRight size={15} />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS PANEL
// ═══════════════════════════════════════════════════════════════════════════════

const NotificationsPanel = ({ onClose, theme = 'dark', notifs = [], conferences = [] }) => {
  const isDark = theme === 'dark';
  
  const timeAgo = (dateStr) => {
    const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={`absolute right-6 top-16 w-80 max-h-[480px] backdrop-blur-2xl border rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isDark ? 'bg-[#141416]/95 border-white/[0.06] shadow-black/60' : 'bg-white border-zinc-900/[0.08] shadow-zinc-900/10'}`}
        onClick={(e) => e.stopPropagation()}>
        
        <div className={`px-5 py-4 border-b flex items-center justify-between transition-colors duration-300 ${isDark ? 'border-white/[0.05]' : 'border-zinc-900/[0.05]'}`}>
          <div className="flex items-center gap-2">
            <span className={`font-semibold text-sm transition-colors duration-300 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Notifications</span>
            {notifs.length > 0 && <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold">{notifs.length}</span>}
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 hover:bg-white/5 rounded-lg"><X size={15} /></button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {notifs.length === 0 ? (
            <div className="py-16 text-center">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors duration-300 ${isDark ? 'bg-zinc-800/50' : 'bg-zinc-100'}`}>
                <Bell size={20} className="text-zinc-500" />
              </div>
              <p className="text-zinc-500 text-sm font-medium tracking-tight">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {notifs.map((n, idx) => {
                const conf = conferences.find(c => c.conference_id === n.conference_id);
                return (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={n.id} 
                    className={`p-4 transition-all duration-200 cursor-default ${isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-zinc-900/[0.02]'}`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-amber-500/80' : 'text-amber-600'}`}>
                        {conf?.title || 'Announcement'}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-medium">{timeAgo(n.created_at)}</span>
                    </div>
                    <div className={`text-[13px] font-semibold mb-1 transition-colors duration-300 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{n.title}</div>
                    <p className="text-[12px] text-zinc-500 leading-relaxed line-clamp-2">{n.message}</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
        
        {notifs.length > 0 && (
          <div className={`p-3 text-center border-t transition-colors duration-300 ${isDark ? 'border-white/[0.05]' : 'border-zinc-900/[0.05] bg-zinc-50'}`}>
            <button className="text-[11px] font-semibold text-zinc-500 hover:text-amber-500 transition-colors">Clear all notifications</button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PASSWORD UPDATE SECTION
// ═══════════════════════════════════════════════════════════════════════════════

const PasswordUpdateSection = ({ user, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const [step, setStep] = useState('initial');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const isOAuth = user?.app_metadata?.provider && user.app_metadata.provider !== 'email';
  const providerName = user?.app_metadata?.provider ? user.app_metadata.provider.charAt(0).toUpperCase() + user.app_metadata.provider.slice(1) : 'Social Provider';

  const reset = () => { setStep('initial'); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setMessage({ text: '', type: '' }); };

  const handleVerify = async (e) => {
    e.preventDefault(); setLoading(true); setMessage({ text: '', type: '' });
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
    setLoading(false);
    if (error) { setMessage({ text: 'Current password is incorrect.', type: 'error' }); } else { setStep('update'); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { setMessage({ text: 'Passwords do not match.', type: 'error' }); return; }
    if (newPassword.length < 6) { setMessage({ text: 'Password must be at least 6 characters.', type: 'error' }); return; }
    setLoading(true); setMessage({ text: '', type: '' });
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) { setMessage({ text: error.message, type: 'error' }); } else { setMessage({ text: 'Password updated successfully!', type: 'success' }); setTimeout(() => reset(), 2000); }
  };

  const inputClass = `w-full border rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition-all duration-300 ${
    isDark 
      ? 'bg-zinc-900/80 border-white/[0.08] text-white focus:border-white/[0.2] placeholder-zinc-600' 
      : 'bg-zinc-50 border-zinc-900/[0.08] text-zinc-900 focus:border-amber-500 placeholder-zinc-400'
  }`;

  return (
    <div className={`backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300 ${isDark ? 'bg-[#141416]/60 border-white/[0.05]' : 'bg-white border-zinc-900/[0.08] shadow-sm'}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}><Lock size={15} className="text-zinc-400" /></div>
          <h3 className={`text-base font-semibold transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Security</h3>
        </div>
        {step !== 'initial' && <button onClick={reset} className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>}
      </div>
      {isOAuth ? (
        <div className={`border rounded-xl p-4 transition-colors duration-300 ${isDark ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50 border-blue-100'}`}>
          <p className={`text-sm leading-relaxed transition-colors duration-300 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>Your account is managed via <span className={`font-semibold transition-colors ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>{providerName}</span>. Password updates are handled through your {providerName} account settings.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {step === 'initial' && (
            <button onClick={() => setStep('verify')} className={`w-full flex items-center justify-center gap-2 py-3 border rounded-xl text-sm font-semibold transition-all ${isDark ? 'bg-white/[0.04] hover:bg-white/[0.07] border-white/[0.06] text-zinc-200' : 'bg-zinc-900/[0.03] hover:bg-zinc-900/[0.06] border-zinc-900/[0.08] text-zinc-700'}`}>
              <Lock size={14} className="text-zinc-400" /> Change Password
            </button>
          )}
          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-xs text-zinc-500 mb-2">Please enter your current password to continue.</p>
              <div>
                <label className={`text-[10px] font-semibold tracking-widest uppercase block mb-2 transition-colors ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Current Password</label>
                <div className="relative">
                  <input autoFocus type={showPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" className={inputClass} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {message.text && <p className="text-xs font-semibold text-red-400">{message.text}</p>}
              <button type="submit" disabled={loading || !currentPassword} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${isDark ? 'bg-white hover:bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}>
                {loading ? 'Verifying...' : 'Next Step'}
              </button>
            </form>
          )}
          {step === 'update' && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <p className="text-xs text-zinc-500 mb-2">Verification successful. Set your new password.</p>
              <div>
                <label className={`text-[10px] font-semibold tracking-widest uppercase block mb-2 transition-colors ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>New Password</label>
                <div className="relative">
                  <input autoFocus type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className={inputClass} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className={`text-[10px] font-semibold tracking-widest uppercase block mb-2 transition-colors ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Confirm New Password</label>
                <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={inputClass} required />
              </div>
              {message.text && <p className={`text-xs font-semibold ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{message.text}</p>}
              <button type="submit" disabled={loading || !newPassword || !confirmPassword} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${isDark ? 'bg-white hover:bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}>
                {loading ? 'Updating...' : 'Confirm Update'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE VIEW
// ═══════════════════════════════════════════════════════════════════════════════

const ProfileView = ({ user, volunteerPrefs, ROLES, onEditVolunteer, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const avatarLetter = displayName[0]?.toUpperCase();

  const cardClass = `backdrop-blur-xl border rounded-2xl transition-all duration-300 ${isDark ? 'bg-[#141416]/60 border-white/[0.05]' : 'bg-white border-zinc-900/[0.08] shadow-sm'}`;
  const labelClass = `text-[10px] font-semibold tracking-widest uppercase transition-colors duration-300 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Profile Header */}
      <div className={`relative border rounded-2xl overflow-hidden p-8 transition-all duration-300 ${isDark ? 'bg-[#141416]/60 border-white/[0.05]' : 'bg-white border-zinc-900/[0.08] shadow-sm'}`}>
        <div className={`absolute top-0 left-0 w-full h-32 transition-colors duration-300 ${isDark ? 'bg-gradient-to-r from-zinc-800/50 via-zinc-700/30 to-zinc-800/50' : 'bg-gradient-to-r from-amber-50 to-amber-100/50'}`} />
        <div className="relative flex flex-col md:flex-row items-center md:items-end gap-6">
          <div className={`w-28 h-28 rounded-2xl flex items-center justify-center text-4xl font-bold shadow-2xl border-4 transition-all duration-300 ${isDark ? 'bg-zinc-700 text-white border-[#09090b]' : 'bg-zinc-100 text-zinc-900 border-white'}`}>
            {avatarLetter}
          </div>
          <div className="flex-1 text-center md:text-left mb-2">
            <h2 className={`text-3xl font-bold mb-1.5 transition-colors duration-300 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{displayName}</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-zinc-400 text-sm">
              <div className="flex items-center gap-1.5"><Mail size={14} className="text-zinc-400" />{user?.email}</div>
              <div className="flex items-center gap-1.5"><Shield size={14} className="text-emerald-400" />Verified Account</div>
            </div>
          </div>
          <button onClick={onEditVolunteer} className={`px-5 py-2.5 border rounded-xl text-sm font-semibold transition-all mb-2 ${isDark ? 'bg-white/[0.05] hover:bg-white/[0.08] border-white/[0.08] text-zinc-200' : 'bg-zinc-900/[0.04] hover:bg-zinc-900/[0.08] border-zinc-900/[0.08] text-zinc-700'}`}>Edit Profile</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className={cardClass + " p-6"}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}><Sparkles size={15} className="text-zinc-400" /></div>
                <h3 className={`text-base font-semibold transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Volunteer Roles & Domains</h3>
              </div>
              <button onClick={onEditVolunteer} className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors">Update</button>
            </div>
            <div className="space-y-6">
              <div>
                <p className={labelClass + " mb-3"}>Preferred Roles</p>
                <div className="flex flex-wrap gap-2">
                  {volunteerPrefs?.volunteer_roles?.map((rId) => { 
                    const r = ROLES.find((x) => x.id === rId); 
                    return r ? (
                      <span key={rId} className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isDark ? 'bg-white/[0.06] border-white/[0.08] text-zinc-300' : 'bg-zinc-900/[0.04] border-zinc-900/[0.06] text-zinc-600'}`}>
                        {r.emoji} {r.name}
                      </span>
                    ) : null; 
                  })}
                  {(!volunteerPrefs?.volunteer_roles || volunteerPrefs.volunteer_roles.length === 0) && <p className="text-zinc-400 text-sm italic">No roles selected yet</p>}
                </div>
              </div>
              <div>
                <p className={labelClass + " mb-3"}>Interest Domains</p>
                <div className="flex flex-wrap gap-2">
                  {volunteerPrefs?.volunteer_domains?.map((domain) => (
                    <span key={domain} className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-zinc-300' : 'bg-zinc-900/[0.03] border-zinc-900/[0.05] text-zinc-600'}`}>
                      {domain}
                    </span>
                  ))}
                  {(!volunteerPrefs?.volunteer_domains || volunteerPrefs.volunteer_domains.length === 0) && <p className="text-zinc-400 text-sm italic">No domains selected yet</p>}
                </div>
              </div>
            </div>
          </div>
          <div className={cardClass + " p-6"}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}><FileText size={15} className="text-zinc-400" /></div>
              <h3 className={`text-base font-semibold transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Professional Bio</h3>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">No bio provided yet. Add a short description of your research interests and professional background.</p>
          </div>
        </div>
        <div className="space-y-6">
          <PasswordUpdateSection user={user} theme={theme} />
          <div className={cardClass + " p-6"}>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center"><Award size={15} className="text-amber-400" /></div>
              <h3 className={`text-base font-semibold transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Achievements</h3>
            </div>
            <div className="space-y-3">
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${isDark ? 'bg-white/[0.03] border-white/[0.04]' : 'bg-zinc-50 border-zinc-100'}`}>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400"><Award size={16} /></div>
                <div><p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Early Bird</p><p className="text-[10px] text-zinc-500">Joined the platform in 2026</p></div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all opacity-40 ${isDark ? 'bg-white/[0.03] border-white/[0.04]' : 'bg-zinc-50 border-zinc-100'}`}>
                <div className="w-9 h-9 rounded-lg bg-zinc-200 flex items-center justify-center text-zinc-400"><Users size={16} /></div>
                <div><p className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>Frequent Attendee</p><p className="text-[10px] text-zinc-500">Join 5 conferences</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONFERENCE CARD — Premium Glassmorphic Design
// ═══════════════════════════════════════════════════════════════════════════════

const getRoleBadgeStyle = (role, isDark) => {
  const styles = {
    organizer: { 
      bg: isDark ? 'bg-amber-500/15' : 'bg-amber-100', 
      text: isDark ? 'text-amber-300' : 'text-amber-700', 
      border: isDark ? 'border-amber-500/25' : 'border-amber-200', 
      glow: isDark ? 'shadow-amber-500/5' : 'shadow-none' 
    },
    presenter: { 
      bg: isDark ? 'bg-emerald-500/15' : 'bg-emerald-100', 
      text: isDark ? 'text-emerald-300' : 'text-emerald-700', 
      border: isDark ? 'border-emerald-500/25' : 'border-emerald-200', 
      glow: isDark ? 'shadow-emerald-500/5' : 'shadow-none' 
    },
    reviewer: { 
      bg: isDark ? 'bg-slate-400/15' : 'bg-slate-100', 
      text: isDark ? 'text-slate-300' : 'text-slate-600', 
      border: isDark ? 'border-slate-400/25' : 'border-slate-200', 
      glow: isDark ? 'shadow-slate-400/5' : 'shadow-none' 
    },
    member: { 
      bg: isDark ? 'bg-blue-500/15' : 'bg-blue-100', 
      text: isDark ? 'text-blue-300' : 'text-blue-700', 
      border: isDark ? 'border-blue-500/25' : 'border-blue-200', 
      glow: isDark ? 'shadow-blue-500/5' : 'shadow-none' 
    },
  };
  return styles[role] || styles.member;
};

const ConfCard = ({ conf, role, hasPendingInvite, onSelectConf, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const dateLabel = conf.start_date
    ? new Date(conf.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Date TBD';

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  const ref = useRef(null);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - left) / width);
    mouseY.set((e.clientY - top) / height);
  };

  const rotateX = useSpring(useTransform(mouseY, [0, 1], [4, -4]), { stiffness: 300, damping: 25 });
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-4, 4]), { stiffness: 300, damping: 25 });

  const glowBg = useMotionTemplate`
    radial-gradient(500px circle at ${useTransform(mouseX, v => v * 100)}% ${useTransform(mouseY, v => v * 100)}%, ${isDark ? 'rgba(148,163,184,0.06)' : 'rgba(251,191,36,0.12)'}, transparent 60%)
  `;

  const badgeStyle = getRoleBadgeStyle(role, isDark);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mouseX.set(0.5); mouseY.set(0.5); }}
      style={{ rotateX, rotateY, transformPerspective: 1200, transformStyle: 'preserve-3d' }}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="group relative flex flex-col h-full"
    >
      {/* Border glow layer */}
      <motion.div
        className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"
        style={{ background: glowBg }}
      />

      {/* Main card body */}
      <div className={`relative backdrop-blur-xl border rounded-2xl overflow-hidden flex flex-col h-full z-10 transition-all duration-500 ${
        isDark 
          ? 'bg-[#141416]/80 border-white/[0.06] group-hover:border-white/[0.12]' 
          : 'bg-white border-zinc-900/[0.08] group-hover:border-zinc-900/[0.15] shadow-sm group-hover:shadow-md'
      }`}>
        {/* Banner */}
        <div className="h-44 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-110"
            style={
              conf.banner_url
                ? { backgroundImage: `url(${conf.banner_url})` }
                : { background: isDark ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' }
            }
          />
          {/* Gradient overlay for readability */}
          <div className={`absolute inset-0 bg-gradient-to-t via-transparent to-transparent ${isDark ? 'from-[#141416] via-[#141416]/30' : 'from-white via-white/20'}`} />
          {/* Subtle tint on hover */}
          <div className={`absolute inset-0 transition-colors duration-500 ${isDark ? 'bg-amber-600/0 group-hover:bg-amber-600/[0.05]' : 'bg-amber-600/0 group-hover:bg-amber-600/[0.02]'}`} />

          {role && (
            <div className={`absolute top-4 right-4 text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest border backdrop-blur-xl shadow-lg transition-all duration-300 ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} ${badgeStyle.glow}`}>
              {role === 'member' ? 'Team Member' : role}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col">
          {/* Metadata row */}
          <div className="flex items-center gap-4 mb-3">
            <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors duration-300 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <MapPin size={11} className={isDark ? 'text-zinc-400' : 'text-zinc-300'} />
              <span>{conf.location ?? 'Location TBD'}</span>
            </div>
            <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors duration-300 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <Calendar size={11} className={isDark ? 'text-zinc-400' : 'text-zinc-300'} />
              <span>{dateLabel}</span>
            </div>
          </div>

          {/* Title */}
          <h3 className={`font-bold text-xl mb-2 leading-snug tracking-tight line-clamp-2 transition-colors duration-300 ${isDark ? 'text-white' : 'text-zinc-900 group-hover:text-amber-600'}`}>
            {conf.title}
          </h3>

          {/* Description */}
          <p className={`text-sm line-clamp-2 mb-6 flex-1 leading-relaxed transition-colors duration-300 ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
            {conf.description ?? 'No description provided.'}
          </p>

          {/* CTA Button */}
          <MagneticButton
            onClick={() => !hasPendingInvite && onSelectConf(conf, role)}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${hasPendingInvite
              ? (isDark ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30 cursor-not-allowed' : 'bg-amber-500/10 text-amber-600 border border-amber-500/20 cursor-not-allowed')
              : role
                ? (isDark ? 'bg-white text-zinc-900 hover:bg-zinc-100 shadow-sm' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm shadow-amber-500/20 active:scale-95')
                : (isDark ? 'bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] hover:text-white' : 'bg-zinc-900/[0.04] text-zinc-600 hover:bg-zinc-900/[0.06] border border-zinc-900/[0.08] hover:border-zinc-900/[0.12] hover:text-amber-600')
            }`}
          >
            {hasPendingInvite ? 'Response Required' : role ? 'Open Dashboard' : 'View Conference'}
            {!hasPendingInvite && <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />}
          </MagneticButton>
        </div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON & EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════════

const CardSkeleton = ({ theme = 'dark' }) => {
  const isDark = theme === 'dark';
  return (
    <div className={`border rounded-2xl overflow-hidden animate-pulse transition-colors duration-300 ${isDark ? 'bg-[#141416]/60 border-white/[0.04]' : 'bg-zinc-100 border-zinc-200 shadow-sm'}`}>
      <div className={`h-44 transition-colors ${isDark ? 'bg-zinc-800/30' : 'bg-zinc-200'}`} />
      <div className="p-6 space-y-3">
        <div className={`h-3 rounded-full w-2/3 transition-colors ${isDark ? 'bg-zinc-800/40' : 'bg-zinc-200'}`} />
        <div className={`h-5 rounded-full w-full transition-colors ${isDark ? 'bg-zinc-800/40' : 'bg-zinc-200'}`} />
        <div className={`h-3 rounded-full w-4/5 transition-colors ${isDark ? 'bg-zinc-800/40' : 'bg-zinc-200'}`} />
        <div className={`h-10 rounded-xl w-full mt-4 transition-colors ${isDark ? 'bg-zinc-800/30' : 'bg-zinc-200'}`} />
      </div>
    </div>
  );
};

const EmptyState = ({ activeTab, onCreateConf, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  return (
    <div className="col-span-full py-24 text-center">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 border transition-all duration-300 ${isDark ? 'bg-zinc-800/40 border-white/[0.05]' : 'bg-zinc-100 border-zinc-200 shadow-sm'}`}>
        <Layout size={28} className="text-zinc-600" />
      </div>
      <p className={`text-base font-medium mb-2 transition-colors ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
        {activeTab === 'my' ? "You haven't joined any conferences yet" : 'No events found matching your search'}
      </p>
      <p className="text-zinc-500 text-sm mb-6">{activeTab === 'my' ? 'Create your first one or explore existing events.' : 'Try adjusting your search terms.'}</p>
      {activeTab === 'my' && (
        <button onClick={onCreateConf} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${isDark ? 'bg-white hover:bg-zinc-100 text-zinc-900' : 'bg-zinc-900 hover:bg-zinc-800 text-white'}`}>
          <Plus size={16} /> Create Conference
        </button>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STAT CARD — Animated + Rich
// ═══════════════════════════════════════════════════════════════════════════════

const StatCard = ({ icon: Icon, label, value, color, delay = 0, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay }}
    >
      <GlowCard
        theme={theme}
        glowColor={color.replace('1)', '0.12)')}
        className={`backdrop-blur-xl border rounded-2xl p-5 transition-all duration-300 cursor-default ${
          isDark 
            ? 'bg-[#141416]/60 border-white/[0.05] hover:border-white/[0.1]' 
            : 'bg-white border-zinc-900/[0.05] hover:border-zinc-900/[0.1] shadow-sm'
        }`}
      >
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <motion.div
              className="text-3xl font-bold tracking-tight mb-1"
              style={{ color: isDark ? color.replace('0.12)', '1)') : color.replace('1)', '0.8)') }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: delay + 0.2 }}
            >
              {value}
            </motion.div>
            <div className={`text-[11px] font-medium tracking-wide transition-colors duration-300 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{label}</div>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300" 
            style={{ backgroundColor: color.replace('1)', isDark ? '0.1)' : '0.08)') }}>
            <Icon size={16} style={{ color: color.replace('0.12)', isDark ? '0.7)' : '0.9)') }} />
          </div>
        </div>
      </GlowCard>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

const UserDashboard = ({ onSelectConf, onCreateConf }) => {
  const { user, conferences, logout, fetchConferences, theme, toggleTheme } = useApp();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState('my');
  const [currentSection, setCurrentSection] = useState('conferences');
  const [search, setSearch] = useState('');
  const [roleMap, setRoleMap] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [volunteerPrefs, setVolunteerPrefs] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLI] = useState(true);
  const [lastReadAt, setLastReadAt] = useState(() => localStorage.getItem('conf_manager_notif_last_read') || new Date(0).toISOString());

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const firstName = displayName.split(' ')[0];

  // ── Fetch role map ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    buildRoleMap();
  }, [user, conferences]);

  const buildRoleMap = async () => {
    setLoadingRoles(true);
    const map = {};
    
    // 1. Get all basic conference memberships
    const { data: memberships, error } = await supabase.from('conference_user').select('id, conference_id, role').eq('user_id', user.id);
    
    // 2. Get all functional team memberships (to verify 'member' status)
    const { data: teamMemberships } = await supabase.from('team_members').select('conference_id, status').eq('user_id', user.id);
    const acceptedConfIds = new Set((teamMemberships || []).filter(tm => tm.status === 'accepted').map(tm => tm.conference_id));

    if (!error && memberships) {
      memberships.forEach(({ conference_id, role }) => { 
        // Only grant 'member' role if they actually have an accepted team invitation
        if (role === 'member') {
          if (acceptedConfIds.has(conference_id)) map[conference_id] = role;
        } else {
          map[conference_id] = role; 
        }
      });
      
      const cuIds = memberships.map(m => m.id);
      if (cuIds.length > 0) {
        // 3. Check if user is a Team Head (Directly accepted)
        const { data: headTeams } = await supabase.from('conference_teams').select('conference_id, name').in('head_id', cuIds);
        if (headTeams) { headTeams.forEach(team => { map[team.conference_id] = team.name; }); }
      }
    }
    
    // 4. Check if user is the Global Organizer
    conferences.forEach((c) => { if (c.conference_head_id === user.id) { map[c.conference_id] = 'Organizer'; } });
    
    setRoleMap(map);
    setLoadingRoles(false);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from('users').select('volunteer_domains, volunteer_roles').eq('user_id', user.id).single();
      if (data) setVolunteerPrefs(data);
    })();
    fetchGlobalInvites();
  }, [user]);

  const fetchGlobalInvites = async () => {
    if (!user) return;
    setLI(true);
    const { data, error } = await supabase.from('team_members').select('*, conference_teams(name, color), conference(title)').eq('user_id', user.id).eq('status', 'pending');
    if (!error) setInvites(data || []);
    setLI(false);
  };

  const handleInviteAction = async (inviteId, action) => {
    const invite = invites.find(i => i.id === inviteId);
    if (!invite) return;

    if (action === 'accept') {
      await supabase.from('team_members').update({ status: 'accepted' }).eq('id', inviteId);
    } else {
      await supabase.from('team_members').delete().eq('id', inviteId);
      
      // Cleanup conference_user if they have no other roles in this conference
      const confId = invite.conference_id;
      const { data: otherTeams } = await supabase.from('team_members').select('id').eq('user_id', user.id).eq('conference_id', confId).limit(1);
      
      if (!otherTeams || otherTeams.length === 0) {
        // No other teams, check if their conference_user role is just 'member'
        const { data: confUser } = await supabase.from('conference_user').select('id, role').eq('user_id', user.id).eq('conference_id', confId).maybeSingle();
        if (confUser && confUser.role === 'member') {
          await supabase.from('conference_user').delete().eq('id', confUser.id);
        }
      }
    }

    // Send notification to organizer
    const userName = user.user_metadata?.full_name || user.email;
    const teamName = invite.conference_teams?.name || 'a team';
    await supabase.from('notifications').insert([{
      conference_id: invite.conference_id,
      title: `Team Invite ${action === 'accept' ? 'Accepted' : 'Declined'}`,
      message: `${userName} has ${action === 'accept' ? 'accepted' : 'declined'} the invitation to join the ${teamName}.`,
      target_role: 'organizer',
      created_at: new Date().toISOString()
    }]);

    fetchGlobalInvites();
    buildRoleMap();
  };

  useEffect(() => {
    if (!user || loadingRoles) return;
    const confIds = Object.keys(roleMap);
    if (confIds.length === 0) { setNotifs([]); return; }

    const fetchGlobalNotifs = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .in('conference_id', confIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        // Simple client-side filter for targeted notifications
        const filtered = data.filter(n => {
          if (!n.target_role) return true;
          const myRole = roleMap[n.conference_id];
          return n.target_role === myRole;
        });
        setNotifs(filtered);
      }
    };
    fetchGlobalNotifs();
  }, [user, roleMap, loadingRoles]);

  const unreadCount = notifs.filter(n => new Date(n.created_at) > new Date(lastReadAt)).length;

  // ── Derived ─────────────────────────────────────────────────────────
  const myConfs = conferences.filter((c) => roleMap[c.conference_id]);
  const otherConfs = conferences.filter((c) => !roleMap[c.conference_id]);

  const filterConfs = (list) => list.filter((c) => !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.location?.toLowerCase().includes(search.toLowerCase()) || c.theme?.toLowerCase().includes(search.toLowerCase()));
  const visibleConfs = filterConfs(activeTab === 'my' ? myConfs : otherConfs);

  const statItems = [
    { icon: Layout, label: 'My Conferences', value: myConfs.length, color: 'rgba(251,191,36,1)' },
    { icon: Star, label: 'Organizer', value: myConfs.filter((c) => roleMap[c.conference_id] === 'organizer').length, color: 'rgba(245,158,11,1)' },
    { icon: TrendingUp, label: 'Reviewer', value: myConfs.filter((c) => roleMap[c.conference_id] === 'reviewer').length, color: 'rgba(148,163,184,1)' },
    { icon: Users, label: 'Team Member', value: myConfs.filter((c) => roleMap[c.conference_id] === 'member').length, color: 'rgba(148,163,184,1)' },
  ];

  const hasVolunteerPrefs = (volunteerPrefs?.volunteer_domains?.length > 0) || (volunteerPrefs?.volunteer_roles?.length > 0);

  // ── Scroll ──────────────────────────────────────────────────────────
  const { scrollY } = useScroll();
  const navBg = useTransform(scrollY, [0, 60], [
    isDark ? 'rgba(9,9,11,0)' : 'rgba(248,250,252,0)',
    isDark ? 'rgba(9,9,11,0.8)' : 'rgba(248,250,252,0.9)'
  ]);
  const navBorderColor = useTransform(scrollY, [0, 60], [
    isDark ? 'rgba(255,255,255,0)' : 'rgba(15,23,42,0)',
    isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.12)'
  ]);
  const navBlur = useTransform(scrollY, [0, 60], ['blur(0px)', 'blur(20px)']);

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.15 } } };
  const itemVariants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen transition-colors duration-700 ${isDark ? 'bg-[#04070D] text-slate-100' : 'bg-[#F8FAFC] text-slate-800'} relative selection:bg-amber-500/20 overflow-x-hidden`} style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
      <AmbientBackground theme={theme} />

      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ═══ NAVBAR ═══ */}
      <motion.nav
        style={{ backgroundColor: navBg, borderBottomColor: navBorderColor, backdropFilter: navBlur, WebkitBackdropFilter: navBlur }}
        className={`sticky top-0 z-40 px-6 py-3 border-b transition-colors duration-500 ${isDark ? 'border-white/[0.04]' : 'border-zinc-900/[0.08]'}`}
      >
        <div className="max-w-[90rem] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-colors duration-200 ${isDark ? 'bg-white' : 'bg-zinc-900'}`}>
              <Layout size={17} className={isDark ? 'text-zinc-900' : 'text-white'} />
            </div>
            <span className={`font-bold text-lg tracking-tight transition-colors duration-200 ${isDark ? 'text-white' : 'text-zinc-900'}`}>ConfHub</span>
          </div>

          {/* Center nav items */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { key: 'conferences', label: 'Dashboard', icon: Layout },
              { key: 'profile', label: 'Profile', icon: User },
            ].map(({ key, label, icon: NavIcon }) => (
              <button
                key={key}
                onClick={() => setCurrentSection(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${currentSection === key
                  ? (isDark ? 'text-white bg-white/[0.06]' : 'text-zinc-900 bg-zinc-900/[0.04]')
                  : (isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-900/[0.02]')
                }`}
              >
                <NavIcon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <motion.div
              animate={{ width: searchFocused ? 280 : 200 }}
              className={`hidden md:flex items-center rounded-xl px-3.5 py-2 gap-2 border transition-all duration-300 ${isDark 
                ? 'bg-white/[0.04] border-white/[0.06] focus-within:border-white/[0.15]' 
                : 'bg-zinc-900/[0.03] border-zinc-900/[0.08] focus-within:border-zinc-900/[0.15]'}`}
            >
              <Search size={14} className="text-zinc-500 shrink-0" />
              <input
                className={`bg-transparent border-none outline-none text-sm w-full transition-colors duration-300 ${isDark ? 'text-white placeholder-zinc-600' : 'text-zinc-900 placeholder-zinc-400'}`}
                placeholder="Search events…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {search && <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-zinc-400 transition-colors"><X size={13} /></button>}
            </motion.div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <button 
              onClick={() => {
                setShowNotifications((v) => !v);
                if (!showNotifications) {
                  const now = new Date().toISOString();
                  setLastReadAt(now);
                  localStorage.setItem('conf_manager_notif_last_read', now);
                }
              }} 
              className={`relative p-2.5 rounded-xl transition-all duration-300 ${isDark 
                ? 'text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10' 
                : 'text-zinc-400 hover:text-amber-600 hover:bg-amber-600/10'}`}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className={`absolute top-2 right-2 w-1.5 h-1.5 bg-amber-400 rounded-full ring-2 ${isDark ? 'ring-[#09090b]' : 'ring-white'}`} />
              )}
            </button>

            {/* Divider */}
            <div className={`w-px h-6 mx-1 transition-colors duration-700 ${isDark ? 'bg-white/[0.06]' : 'bg-zinc-900/[0.08]'}`} />

            {/* User */}
            <button
              onClick={() => setCurrentSection('profile')}
              className={`flex items-center gap-2.5 p-1.5 rounded-xl transition-all duration-300 ${
                currentSection === 'profile' 
                  ? (isDark ? 'bg-amber-500/10 ring-1 ring-amber-500/20' : 'bg-amber-600/10 ring-1 ring-amber-600/20') 
                  : (isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-zinc-900/[0.03]')
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm transition-colors duration-200 ${isDark ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900'}`}>
                {firstName[0]?.toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <div className={`text-sm font-semibold leading-none transition-all duration-300 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{firstName}</div>
                <div className="text-[11px] text-zinc-600 mt-0.5">Dashboard</div>
              </div>
            </button>

            <button onClick={logout} className="p-2 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-white/[0.04]" title="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ═══ NOTIFICATIONS ═══ */}
      <AnimatePresence>{showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} theme={theme} notifs={notifs} conferences={conferences} />}</AnimatePresence>

      {/* ═══ MAIN CONTENT ═══ */}
      {currentSection === 'conferences' ? (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 relative z-10">

          {/* ── HERO SECTION ── */}
          <motion.div variants={itemVariants} className="mb-10">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <motion.p
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-sm text-zinc-500 font-medium mb-2 tracking-wide"
                >
                  Welcome back
                </motion.p>
                <h1 className={`text-4xl lg:text-5xl font-bold tracking-tight mb-3 leading-[1.1] transition-colors duration-300 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {firstName}'s Dashboard
                </h1>
                <p className="text-zinc-500 text-base max-w-lg">
                  Manage your events, track submissions, and discover new conferences.
                </p>
              </div>
              <MagneticButton
                onClick={onCreateConf}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 text-black rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:scale-105 transition-all"
              >
                <Plus size={18} />
                Create Conference
              </MagneticButton>
            </div>
          </motion.div>

          {/* ── STATS ROW ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {statItems.map((s, i) => (
              <StatCard key={s.label} {...s} delay={i * 0.08} theme={theme} />
            ))}
          </div>

          {/* ── MAIN AREA: Sidebar + Grid ── */}
          <div className="flex flex-col lg:flex-row gap-8">

            {/* LEFT SIDEBAR */}
            <motion.div variants={itemVariants} className="w-full lg:w-[300px] xl:w-[320px] shrink-0 space-y-5">

              {/* Volunteer Preferences */}
              <GlowCard 
                theme={theme}
                className={`backdrop-blur-xl border rounded-2xl p-5 transition-all duration-300 ${isDark ? 'bg-[#141416]/60 border-white/[0.05] hover:border-white/[0.08]' : 'bg-white border-zinc-900/[0.08] hover:border-zinc-900/[0.12] shadow-sm'}`}
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                        <Sparkles size={14} className="text-zinc-400" />
                      </div>
                      <h3 className={`text-sm font-semibold transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Volunteer Prefs</h3>
                    </div>
                    <button onClick={() => setShowVolunteerModal(true)} className={`transition-colors p-1.5 rounded-lg ${isDark ? 'text-zinc-600 hover:text-white hover:bg-white/[0.05]' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-900/[0.04]'}`}>
                      <Settings size={14} />
                    </button>
                  </div>
                  {hasVolunteerPrefs ? (
                    <div className="space-y-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {volunteerPrefs?.volunteer_roles?.slice(0, 3).map((rId) => {
                          const r = ROLES.find((x) => x.id === rId);
                          return r ? (
                            <span key={rId} className={`px-2 py-0.5 rounded-md border text-[10px] font-medium transition-all ${isDark ? 'bg-white/[0.06] border-white/[0.08] text-zinc-300' : 'bg-zinc-900/[0.04] border-zinc-900/[0.06] text-zinc-600'}`}>
                              {r.emoji} {r.name}
                            </span>
                          ) : null;
                        })}
                        {(volunteerPrefs?.volunteer_roles?.length ?? 0) > 3 && <span className="px-2 py-0.5 text-[10px] text-zinc-500 bg-white/[0.04] rounded-md">+{volunteerPrefs.volunteer_roles.length - 3}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {volunteerPrefs?.volunteer_domains?.slice(0, 2).map((d) => (
                          <span key={d} className={`px-2 py-0.5 rounded-md border text-[10px] font-medium transition-all ${isDark ? 'bg-white/[0.04] border-white/[0.06] text-zinc-500' : 'bg-zinc-900/[0.03] border-zinc-900/[0.05] text-zinc-400'}`}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-zinc-500 mb-3 leading-relaxed">Set your preferences to get matched with relevant roles.</p>
                      <button onClick={() => setShowVolunteerModal(true)} className={`text-xs font-semibold transition-colors ${isDark ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'}`}>Set up preferences →</button>
                    </div>
                  )}
                </div>
              </GlowCard>

              {/* Team Invitations */}
              <AnimatePresence>
                {invites.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <GlowCard 
                      theme={theme}
                      glowColor="rgba(251,191,36,0.3)"
                      className={`backdrop-blur-xl border rounded-2xl p-5 transition-all duration-300 ${isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-500/30'}`}
                    >
                      <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-4">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/20`}>
                            <Bell size={14} className="text-amber-500" />
                          </div>
                          <h3 className={`text-sm font-bold transition-colors ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>Team Invitations</h3>
                        </div>
                        <div className="space-y-4">
                          {invites.map(invite => (
                            <div key={invite.id} className={`p-3 rounded-xl border transition-all ${isDark ? 'bg-black/20 border-white/5' : 'bg-white border-amber-500/20 shadow-sm'}`}>
                              <div className="mb-2">
                                <p className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{invite.conference?.title}</p>
                                <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{invite.conference_teams?.name}</p>
                              </div>
                              <div className="flex gap-1.5">
                                <button onClick={() => handleInviteAction(invite.id, 'accept')} className="flex-1 py-1.5 bg-amber-500 text-black text-[10px] font-black rounded-lg hover:bg-amber-400 transition-all">ACCEPT</button>
                                <button onClick={() => handleInviteAction(invite.id, 'reject')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border ${isDark ? 'border-white/10 text-zinc-400 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}>DECLINE</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </GlowCard>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick actions */}
              {/* Quick actions */}
              <GlowCard 
                theme={theme}
                className={`backdrop-blur-xl border rounded-2xl p-5 transition-all duration-300 ${isDark ? 'bg-[#141416]/60 border-white/[0.05] hover:border-white/[0.08]' : 'bg-white border-zinc-900/[0.08] hover:border-zinc-900/[0.12] shadow-sm'}`}
              >
                <div className="relative z-10">
                  <h3 className={`text-sm font-semibold mb-4 transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Quick Actions</h3>
                  <div className="space-y-2">
                    <button onClick={onCreateConf} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${isDark ? 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08]' : 'bg-zinc-900/[0.02] border-zinc-900/[0.04] hover:bg-zinc-900/[0.05] hover:border-zinc-900/[0.08]'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isDark ? 'bg-zinc-800 group-hover:bg-zinc-700' : 'bg-zinc-100 group-hover:bg-zinc-200'}`}>
                        <Plus size={16} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className={`text-sm font-medium transition-colors ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>New Conference</p>
                        <p className="text-[11px] text-zinc-600">Create and organize</p>
                      </div>
                    </button>
                    <button onClick={() => setActiveTab('all')} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${isDark ? 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08]' : 'bg-zinc-900/[0.02] border-zinc-900/[0.04] hover:bg-zinc-900/[0.05] hover:border-zinc-900/[0.08]'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isDark ? 'bg-zinc-800 group-hover:bg-zinc-700' : 'bg-zinc-100 group-hover:bg-zinc-200'}`}>
                        <Compass size={16} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className={`text-sm font-medium transition-colors ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>Explore Events</p>
                        <p className="text-[11px] text-zinc-600">Discover conferences</p>
                      </div>
                    </button>
                    <button onClick={() => setShowVolunteerModal(true)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${isDark ? 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08]' : 'bg-zinc-900/[0.02] border-zinc-900/[0.04] hover:bg-zinc-900/[0.05] hover:border-zinc-900/[0.08]'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isDark ? 'bg-zinc-800 group-hover:bg-zinc-700' : 'bg-zinc-100 group-hover:bg-zinc-200'}`}>
                        <Zap size={16} className="text-zinc-400" />
                      </div>
                      <div>
                        <p className={`text-sm font-medium transition-colors ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>Volunteer</p>
                        <p className="text-[11px] text-zinc-600">Set preferences</p>
                      </div>
                    </button>
                  </div>
                </div>
              </GlowCard>
            </motion.div>

            {/* RIGHT MAIN HUB */}
            <div className="flex-1 min-w-0 space-y-6">

              {/* Tab Bar */}
              <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className={`relative flex p-1 backdrop-blur-xl rounded-xl border transition-all duration-300 ${isDark ? 'bg-[#141416]/60 border-white/[0.05]' : 'bg-white border-zinc-900/[0.08] shadow-sm'}`}>
                  {[
                    { key: 'my', label: `My Conferences`, count: myConfs.length },
                    { key: 'all', label: `Explore`, count: otherConfs.length },
                  ].map(({ key, label, count }) => (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`relative px-5 py-2 rounded-lg text-sm font-medium transition-all z-10 ${activeTab === key 
                        ? (isDark ? 'text-white' : 'text-zinc-900') 
                        : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600')}`}
                    >
                      {activeTab === key && (
                        <motion.div layoutId="activeTab" className={`absolute inset-0 rounded-lg -z-10 ${isDark ? 'bg-white/[0.08]' : 'bg-zinc-900/[0.04]'}`} transition={{ type: "spring", stiffness: 500, damping: 35 }} />
                      )}
                      {label}
                      <span className={`ml-2 text-xs transition-colors duration-300 ${activeTab === key ? (isDark ? 'text-zinc-300' : 'text-zinc-500') : (isDark ? 'text-zinc-600' : 'text-zinc-400')}`}>{count}</span>
                    </button>
                  ))}
                </div>

                {/* Mobile search */}
                <div className={`md:hidden flex items-center rounded-xl px-3.5 py-2 gap-2 border transition-all duration-300 ${isDark ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-zinc-900/[0.03] border-zinc-900/[0.08]'}`}>
                  <Search size={14} className="text-zinc-500" />
                  <input className={`bg-transparent border-none outline-none text-sm w-full transition-colors duration-300 ${isDark ? 'text-white placeholder-zinc-600' : 'text-zinc-900 placeholder-zinc-400'}`} placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </motion.div>

              {/* Conference Grid */}
              <motion.div variants={itemVariants} layout className="grid grid-cols-1 xl:grid-cols-2 gap-5 pb-20">
                <AnimatePresence mode="popLayout">
                  {loadingRoles ? (
                    [...Array(4)].map((_, i) => (
                      <motion.div key={`skel-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <CardSkeleton theme={theme} />
                      </motion.div>
                    ))
                  ) : visibleConfs.length > 0 ? (
                    visibleConfs.map((c, i) => (
                      <motion.div
                        key={c.conference_id}
                        layout
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
                        transition={{ type: "spring", stiffness: 300, damping: 25, delay: i * 0.05 }}
                      >
                        <ConfCard 
                          conf={c} 
                          role={roleMap[c.conference_id] ?? null} 
                          hasPendingInvite={invites.some(inv => inv.conference_id === c.conference_id)}
                          onSelectConf={onSelectConf} 
                          theme={theme} 
                        />
                      </motion.div>
                    ))
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="col-span-full">
                      <EmptyState activeTab={activeTab} onCreateConf={onCreateConf} theme={theme} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: 50, filter: 'blur(10px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="max-w-7xl mx-auto px-6 pt-12 pb-16 relative z-10"
        >
          <div className="flex items-center gap-3 mb-8">
            <button onClick={() => setCurrentSection('conferences')} className={`p-2 rounded-xl transition-all ${isDark ? 'text-zinc-500 hover:text-white hover:bg-white/[0.05]' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-900/[0.04]'}`}>
              <ChevronLeft size={20} />
            </button>
            <h1 className={`text-3xl font-bold tracking-tight transition-colors duration-300 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Your Profile</h1>
          </div>
          <ProfileView user={user} volunteerPrefs={volunteerPrefs} ROLES={ROLES} onEditVolunteer={() => setShowVolunteerModal(true)} theme={theme} />
        </motion.div>
      )}

      {/* ═══ VOLUNTEER MODAL ═══ */}
      <AnimatePresence>
        {showVolunteerModal && (
          <VolunteerPreferencesModal
            userId={user.id}
            onClose={() => setShowVolunteerModal(false)}
            onSaved={(prefs) => { setVolunteerPrefs({ volunteer_domains: prefs.domains, volunteer_roles: prefs.roles }); }}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserDashboard;