import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Calendar, Layout, LogOut, Plus, Search,
  MapPin, Bell, ChevronRight, ChevronLeft, Check,
  X, Sparkles, Settings,
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

// ─────────────────────────────────────────────────────────────────────────────
// Volunteer Preferences Data
// ─────────────────────────────────────────────────────────────────────────────

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
  { id: 'logistics_head',    name: 'Logistics Team',        emoji: '🚚', color: '#f59e0b', desc: 'Venue, transport, accommodation & on-site ops' },
  { id: 'outreach_head',     name: 'Outreach Team',         emoji: '📢', color: '#6366f1', desc: 'Marketing, social media & external communications' },
  { id: 'technical_head',    name: 'Technical Team',        emoji: '⚙️', color: '#06b6d4', desc: 'AV equipment, live streams & technical support' },
  { id: 'registration_head', name: 'Registration Team',     emoji: '📋', color: '#10b981', desc: 'Attendee registration, badges & check-ins' },
  { id: 'sponsorship_head',  name: 'Sponsorship Team',      emoji: '🤝', color: '#8b5cf6', desc: 'Identify and coordinate with conference sponsors' },
  { id: 'hospitality_head',  name: 'Hospitality Team',      emoji: '🏨', color: '#f43f5e', desc: 'Catering, guest relations & VIP arrangements' },
  { id: 'publication_head',  name: 'Publications Team',     emoji: '📝', color: '#3b82f6', desc: 'Proceedings, journals & editorial coordination' },
  { id: 'finance_head',      name: 'Finance Team',          emoji: '💰', color: '#eab308', desc: 'Budget tracking, reimbursements & expenses' },
  { id: 'program_coord',     name: 'Program Coordinator',   emoji: '🗓️', color: '#ec4899', desc: 'Schedule sessions, speakers & workshops' },
  { id: 'social_coord',      name: 'Social Media Coord.',   emoji: '📱', color: '#14b8a6', desc: 'Real-time updates on Twitter, LinkedIn & Instagram' },
  { id: 'volunteer_coord',   name: 'Volunteer Coordinator', emoji: '👥', color: '#f97316', desc: 'Onboard, train & manage fellow volunteers' },
  { id: 'design_lead',       name: 'Design Lead',           emoji: '🎨', color: '#a855f7', desc: 'Branding, banners, posters & visual assets' },
  { id: 'web_lead',          name: 'Website Lead',          emoji: '🌐', color: '#0ea5e9', desc: 'Build & maintain the conference website & portal' },
  { id: 'security_coord',    name: 'Security Coordinator',  emoji: '🔒', color: '#64748b', desc: 'Access control & on-site safety protocols' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Volunteer Preferences Modal
// ─────────────────────────────────────────────────────────────────────────────

const VolunteerPreferencesModal = ({ userId, onClose, onSaved }) => {
  const [step, setStep]                       = useState(0);
  const [selectedDomains, setSelectedDomains] = useState(new Set());
  const [selectedRoles, setSelectedRoles]     = useState(new Set());
  const [search, setSearch]                   = useState('');
  const [saving, setSaving]                   = useState(false);

  // Load existing prefs — use the live auth session uid so RLS is satisfied
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? userId;
      if (!uid) return;

      const { data, error } = await supabase
        .from('users')
        .select('volunteer_domains, volunteer_roles')
        .eq('user_id', uid)
        .maybeSingle();

      console.log('[VolunteerPrefs] load prefs → uid:', uid, 'data:', data, 'error:', error);
      if (data?.volunteer_domains?.length) setSelectedDomains(new Set(data.volunteer_domains));
      if (data?.volunteer_roles?.length)   setSelectedRoles(new Set(data.volunteer_roles));
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

  const toggleDomain = (name) =>
    setSelectedDomains((prev) => {
      const n = new Set(prev);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });

  const toggleRole = (id) =>
    setSelectedRoles((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');

    // 1. Get the live session token — this is what Supabase RLS checks.
    //    Using the session uid avoids any stale value from React context.
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id ?? userId;
    console.log('[VolunteerPrefs] auth uid:', uid, '| prop userId:', userId);

    if (!uid) {
      setSaveError('Not authenticated. Please sign out and sign back in.');
      setSaving(false);
      return;
    }

    // 2. Confirm the row exists and is readable under the current RLS context.
    const { data: existing, error: readErr } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle();

    console.log('[VolunteerPrefs] row check → existing:', existing, 'readErr:', readErr);

    if (readErr) {
      setSaveError('Could not read your user record: ' + readErr.message);
      setSaving(false);
      return;
    }

    if (!existing) {
      setSaveError(
        'Your user row is not visible. This is usually an RLS (Row Level Security) issue. ' +
        'In Supabase → Authentication → Policies → users table, make sure there is a SELECT ' +
        'policy that allows "auth.uid() = user_id" and an UPDATE policy with the same condition.'
      );
      setSaving(false);
      return;
    }

    // 3. Perform the update.
    const payload = {
      volunteer_domains: [...selectedDomains],
      volunteer_roles:   [...selectedRoles],
    };
    console.log('[VolunteerPrefs] updating with payload:', payload);

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('user_id', uid)
      .select('user_id, volunteer_domains, volunteer_roles');

    console.log('[VolunteerPrefs] update response → data:', data, 'error:', error);

    setSaving(false);

    if (error) {
      setSaveError(error.message || 'Update failed. Check the browser console.');
      return;
    }

    if (!data || data.length === 0) {
      setSaveError(
        'Update ran but returned no rows. Your Supabase UPDATE policy may be missing. ' +
        'Go to Supabase → Authentication → Policies → users table and add: ' +
        'UPDATE allowed where auth.uid() = user_id.'
      );
      return;
    }

    onSaved?.({ domains: [...selectedDomains], roles: [...selectedRoles] });
    onClose();
  };

  /* ── Step renderers ──────────────────────────────────────────────────── */

  const StepDomains = () => (
    <>
      <div className="flex items-center gap-2.5 bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5 mb-5">
        <Search size={14} className="text-slate-600 shrink-0" />
        <input
          autoFocus
          className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-600 w-full"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
          placeholder="Search domains…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X size={13} />
          </button>
        )}
      </div>

      <div className="max-h-72 overflow-y-auto pr-1 space-y-5 scroll-smooth">
        {Object.keys(filteredDomains).length === 0 ? (
          <p className="text-center text-slate-600 text-sm py-8">No domains match your search.</p>
        ) : (
          Object.entries(filteredDomains).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-600 mb-2.5">{cat}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleDomain(item)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 ${
                      selectedDomains.has(item)
                        ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300'
                        : 'bg-white/3 border-white/8 text-slate-500 hover:border-indigo-500/30 hover:text-indigo-400 hover:bg-indigo-500/7'
                    }`}
                  >
                    {selectedDomains.has(item) && <Check size={10} className="inline mr-1 -mt-0.5" />}
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  const StepRoles = () => (
    <div className="max-h-80 overflow-y-auto pr-1 scroll-smooth">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ROLES.map((role) => {
          const sel = selectedRoles.has(role.id);
          return (
            <button
              key={role.id}
              onClick={() => toggleRole(role.id)}
              className={`text-left p-4 rounded-xl border transition-all duration-150 ${
                sel
                  ? 'bg-indigo-500/10 border-indigo-500/45'
                  : 'bg-white/2 border-white/6 hover:bg-indigo-500/5 hover:border-indigo-500/25'
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm mb-2.5"
                style={{ background: role.color + '22', border: `1px solid ${role.color}44` }}
              >
                {role.emoji}
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-200">{role.name}</span>
                {sel && <Check size={14} className="text-indigo-400 shrink-0" />}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{role.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  const StepReview = () => (
    <div className="space-y-5 max-h-80 overflow-y-auto pr-1 scroll-smooth">
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-slate-600 mb-3">
          Selected Domains ({selectedDomains.size})
        </p>
        <div className="flex flex-wrap gap-2">
          {[...selectedDomains].map((d) => (
            <span key={d} className="px-2.5 py-1 rounded-md bg-indigo-500/12 border border-indigo-500/25 text-indigo-300 text-xs font-medium">
              {d}
            </span>
          ))}
          {selectedDomains.size === 0 && (
            <span className="text-slate-600 text-sm">None selected</span>
          )}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-slate-600 mb-3">
          Volunteer Roles ({selectedRoles.size})
        </p>
        <div className="flex flex-wrap gap-2">
          {ROLES.filter((r) => selectedRoles.has(r.id)).map((r) => (
            <span key={r.id} className="px-2.5 py-1 rounded-md bg-indigo-500/12 border border-indigo-500/25 text-indigo-300 text-xs font-medium">
              {r.emoji} {r.name}
            </span>
          ))}
          {selectedRoles.size === 0 && (
            <span className="text-slate-600 text-sm">None selected</span>
          )}
        </div>
      </div>
    </div>
  );

  const STEPS = [
    {
      label: 'Step 1 of 3', title: 'Conference Domains',
      sub: 'Select all the fields you\'re interested in volunteering for',
      content: <StepDomains />,
      canContinue: selectedDomains.size > 0,
      count: selectedDomains.size, noun: 'domain',
    },
    {
      label: 'Step 2 of 3', title: 'Volunteer Roles',
      sub: 'Pick the roles you\'d like to take on at conferences',
      content: <StepRoles />,
      canContinue: selectedRoles.size > 0,
      count: selectedRoles.size, noun: 'role',
    },
    {
      label: 'Step 3 of 3', title: 'Review & Confirm',
      sub: 'Your volunteer preferences at a glance',
      content: <StepReview />,
      canContinue: true,
    },
  ];

  const current = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-0">
          <div className="flex items-center gap-2 mb-5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === step ? 24 : 6,
                  background: i < step ? '#22c55e' : i === step ? '#6366f1' : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
            <button
              onClick={onClose}
              className="ml-auto p-1.5 text-slate-600 hover:text-slate-300 hover:bg-white/6 rounded-lg transition-all"
            >
              <X size={16} />
            </button>
          </div>

          <p className="text-[11px] font-bold tracking-widest uppercase text-indigo-400 mb-1">{current.label}</p>
          <h2 className="text-2xl font-bold text-white mb-1">{current.title}</h2>
          <p className="text-sm text-slate-500 mb-6">{current.sub}</p>
        </div>

        {/* Body */}
        <div className="px-8 pb-0">{current.content}</div>

        {/* Footer */}
        <div className="px-8 pt-4 pb-6 mt-5 border-t border-white/6 space-y-3">
          {/* Error banner — only shown when save fails */}
          {saveError && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-red-400 text-xs leading-relaxed flex-1">{saveError}</span>
              <button onClick={() => setSaveError('')} className="text-red-500/60 hover:text-red-400 shrink-0 mt-0.5">
                <X size={13} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-600">
              {current.count != null && current.count > 0 ? (
                <>
                  <span className="text-indigo-400 font-semibold">{current.count}</span>{' '}
                  {current.noun}{current.count !== 1 ? 's' : ''} selected
                </>
              ) : step < 2 ? (
                `Select at least one ${current.noun}`
              ) : null}
            </p>

            <div className="flex items-center gap-3">
              {step > 0 && (
                <button
                  onClick={() => { setStep((s) => s - 1); setSaveError(''); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20 text-sm font-semibold transition-all"
                >
                  <ChevronLeft size={15} /> Back
                </button>
              )}
              <button
                disabled={!current.canContinue || saving}
                onClick={step < 2 ? () => { setStep((s) => s + 1); setSaveError(''); } : handleSave}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  current.canContinue && !saving
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-indigo-600/25 text-indigo-300/40 cursor-not-allowed'
                }`}
              >
                {saving ? 'Saving…' : step < 2 ? 'Continue' : 'Save Preferences'}
                {!saving && <ChevronRight size={15} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Notifications Panel
// ─────────────────────────────────────────────────────────────────────────────

const NotificationsPanel = ({ onClose }) => (
  <div
    className="fixed inset-0 z-40"
    onClick={onClose}
  >
    <div
      className="absolute right-4 top-16 w-80 bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
        <span className="font-semibold text-white text-sm">Notifications</span>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
          <X size={15} />
        </button>
      </div>
      <div className="py-8 text-center">
        <Bell size={24} className="text-slate-700 mx-auto mb-3" />
        <p className="text-slate-600 text-sm">No new notifications</p>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Conference Card
// ─────────────────────────────────────────────────────────────────────────────

const roleBadgeStyle = {
  organizer: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  presenter: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  reviewer:  'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

const ConfCard = ({ conf, role, onSelectConf }) => {
  const dateLabel = conf.start_date
    ? new Date(conf.start_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : 'Date TBD';

  return (
    <div className="group relative bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-500 hover:shadow-2xl hover:shadow-black/60 flex flex-col h-full">
      {/* Banner */}
      <div className="h-48 relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700 ease-out"
          style={
            conf.banner_url
              ? { backgroundImage: `url(${conf.banner_url})` }
              : { background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' }
          }
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/20 to-transparent" />
        {role && (
          <div
            className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-widest border backdrop-blur-sm ${
              roleBadgeStyle[role] || 'bg-white/10 text-white border-white/20'
            }`}
          >
            {role}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-2 font-medium">
          <MapPin size={11} />
          <span>{conf.location ?? 'Location TBD'}</span>
        </div>
        <h3 className="font-bold text-lg text-white mb-2 leading-snug line-clamp-2">{conf.title}</h3>
        <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1 leading-relaxed">
          {conf.description ?? 'No description provided.'}
        </p>
        <div className="flex items-center gap-2 text-slate-500 text-xs mb-5">
          <Calendar size={12} className="text-slate-600" />
          {dateLabel}
        </div>
        <button
          onClick={() => onSelectConf(conf, role)}
          className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            role
              ? 'bg-white text-black hover:bg-slate-100'
              : 'bg-white/6 text-slate-300 hover:bg-white/12 border border-white/10'
          }`}
        >
          {role ? 'Open Dashboard' : 'View Conference'}
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────

const CardSkeleton = () => (
  <div className="h-80 bg-white/3 border border-white/5 rounded-2xl animate-pulse" />
);

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

const EmptyState = ({ activeTab, onCreateConf }) => (
  <div className="col-span-3 py-20 text-center">
    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/8">
      <Layout size={24} className="text-slate-600" />
    </div>
    <p className="text-slate-500 text-sm">
      {activeTab === 'my'
        ? "You haven't joined any conferences yet."
        : 'No events found matching your search.'}
    </p>
    {activeTab === 'my' && (
      <button
        onClick={onCreateConf}
        className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors"
      >
        + Create your first conference
      </button>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main UserDashboard
// ─────────────────────────────────────────────────────────────────────────────

const UserDashboard = ({ onSelectConf, onCreateConf }) => {
  const { user, conferences, logout, fetchConferences } = useApp();

  const [activeTab, setActiveTab]               = useState('my');
  const [search, setSearch]                     = useState('');
  const [roleMap, setRoleMap]                   = useState({});
  const [loadingRoles, setLoadingRoles]         = useState(true);
  const [showVolunteerModal, setShowVolunteerModal] = useState(false);
  const [showNotifications, setShowNotifications]   = useState(false);
  const [volunteerPrefs, setVolunteerPrefs]     = useState(null);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';
  const firstName = displayName.split(' ')[0];

  // ── Fetch role map ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    buildRoleMap();
  }, [user, conferences]);

  const buildRoleMap = async () => {
    setLoadingRoles(true);
    const map = {};

    const { data: memberships, error } = await supabase
      .from('conference_user')
      .select('conference_id, role')
      .eq('user_id', user.id);

    if (!error && memberships) {
      memberships.forEach(({ conference_id, role }) => {
        map[conference_id] = role;
      });
    }

    conferences.forEach((c) => {
      if (c.conference_head_id === user.id) {
        map[c.conference_id] = map[c.conference_id] ?? 'organizer';
      }
    });

    setRoleMap(map);
    setLoadingRoles(false);
  };

  // ── Fetch volunteer prefs on mount ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('volunteer_domains, volunteer_roles')
        .eq('user_id', user.id)
        .single();
      if (data) setVolunteerPrefs(data);
    })();
  }, [user]);

  // ── Derived lists ────────────────────────────────────────────────────────
  const myConfs    = conferences.filter((c) => roleMap[c.conference_id]);
  const otherConfs = conferences.filter((c) => !roleMap[c.conference_id]);

  const filterConfs = (list) =>
    list.filter(
      (c) =>
        !search ||
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.location?.toLowerCase().includes(search.toLowerCase()) ||
        c.theme?.toLowerCase().includes(search.toLowerCase()),
    );

  const visibleConfs = filterConfs(activeTab === 'my' ? myConfs : otherConfs);

  const stats = [
    { label: 'My Conferences', value: myConfs.length, color: 'text-indigo-400' },
    { label: 'As Organizer',   value: myConfs.filter((c) => roleMap[c.conference_id] === 'organizer').length, color: 'text-violet-400' },
    { label: 'As Reviewer',    value: myConfs.filter((c) => roleMap[c.conference_id] === 'reviewer').length,  color: 'text-amber-400' },
    { label: 'As Presenter',   value: myConfs.filter((c) => roleMap[c.conference_id] === 'presenter').length, color: 'text-blue-400' },
  ];

  const hasVolunteerPrefs =
    (volunteerPrefs?.volunteer_domains?.length > 0) ||
    (volunteerPrefs?.volunteer_roles?.length > 0);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#080b11] text-slate-200"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-[#080b11]/90 backdrop-blur-xl border-b border-white/6 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Layout size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">ConfHub</span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:flex items-center bg-white/5 rounded-lg px-3 py-2 gap-2 border border-white/8 text-slate-500">
              <Search size={14} />
              <input
                className="bg-transparent border-none outline-none text-sm w-44 text-white placeholder-slate-600"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                placeholder="Search events…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Volunteer preferences button */}
            <button
              onClick={() => setShowVolunteerModal(true)}
              className={`hidden md:flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all border ${
                hasVolunteerPrefs
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/15'
                  : 'bg-white/4 border-white/8 text-slate-400 hover:bg-white/8 hover:text-slate-200'
              }`}
              title="Set volunteer preferences"
            >
              <Sparkles size={13} />
              {hasVolunteerPrefs ? 'Preferences set' : 'Volunteer Preferences'}
            </button>

            {/* Notifications */}
            <button
              onClick={() => setShowNotifications((v) => !v)}
              className="relative p-2 text-slate-500 hover:text-white hover:bg-white/6 rounded-lg transition-all"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            </button>

            {/* User info */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-white/8">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {firstName[0]?.toUpperCase()}
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-semibold text-white leading-none">{firstName}</div>
                <div className="text-xs text-slate-600 mt-0.5">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                className="ml-1 p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Notifications panel ─────────────────────────────────────────── */}
      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-10">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1.5 tracking-tight">
              Welcome back, {firstName} 👋
            </h1>
            <p className="text-slate-500">Manage your conferences and submissions</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Mobile volunteer prefs */}
            <button
              onClick={() => setShowVolunteerModal(true)}
              className={`md:hidden flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                hasVolunteerPrefs
                  ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              <Sparkles size={13} />
              Preferences
            </button>

            <button
              onClick={onCreateConf}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
            >
              <Plus size={17} /> New Conference
            </button>
          </div>
        </div>

        {/* Volunteer preferences summary banner (shown when set) */}
        {hasVolunteerPrefs && (
          <div className="mt-6 bg-indigo-500/6 border border-indigo-500/20 rounded-xl px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={13} className="text-indigo-400 shrink-0" />
                <span className="text-xs font-bold tracking-widest uppercase text-indigo-400">Volunteer Preferences</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {volunteerPrefs?.volunteer_roles?.slice(0, 4).map((rId) => {
                  const r = ROLES.find((x) => x.id === rId);
                  return r ? (
                    <span key={rId} className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                      {r.emoji} {r.name}
                    </span>
                  ) : null;
                })}
                {(volunteerPrefs?.volunteer_roles?.length ?? 0) > 4 && (
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-slate-400 text-xs font-medium">
                    +{volunteerPrefs.volunteer_roles.length - 4} more
                  </span>
                )}
                {volunteerPrefs?.volunteer_domains?.slice(0, 3).map((d) => (
                  <span key={d} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-slate-400 text-xs font-medium">
                    {d}
                  </span>
                ))}
                {(volunteerPrefs?.volunteer_domains?.length ?? 0) > 3 && (
                  <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/8 text-slate-400 text-xs font-medium">
                    +{volunteerPrefs.volunteer_domains.length - 3} domains
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowVolunteerModal(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
            >
              <Settings size={12} /> Edit
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {stats.map(({ label, value, color }) => (
            <div key={label} className="bg-[#0d1117] border border-white/6 rounded-xl p-4">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs + Grid ─────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 pb-16">
        {/* Tab switcher */}
        <div className="flex gap-1 mb-8 bg-white/4 p-1 rounded-xl w-fit border border-white/6">
          {[
            { key: 'my',  label: `My Conferences (${myConfs.length})`  },
            { key: 'all', label: `Explore (${otherConfs.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === key
                  ? 'bg-white text-black shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mobile search (shows under tabs on small screens) */}
        <div className="md:hidden flex items-center bg-white/5 rounded-xl px-3 py-2.5 gap-2 border border-white/8 mb-6">
          <Search size={14} className="text-slate-600" />
          <input
            className="bg-transparent border-none outline-none text-sm flex-1 text-white placeholder-slate-600"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingRoles ? (
            [...Array(3)].map((_, i) => <CardSkeleton key={i} />)
          ) : visibleConfs.length > 0 ? (
            visibleConfs.map((c) => (
              <ConfCard
                key={c.conference_id}
                conf={c}
                role={roleMap[c.conference_id] ?? null}
                onSelectConf={onSelectConf}
              />
            ))
          ) : (
            <EmptyState activeTab={activeTab} onCreateConf={onCreateConf} />
          )}
        </div>
      </main>

      {/* ── Volunteer Preferences Modal ──────────────────────────────────── */}
      {showVolunteerModal && (
        <VolunteerPreferencesModal
          userId={user.id}
          onClose={() => setShowVolunteerModal(false)}
          onSaved={(prefs) => {
            setVolunteerPrefs({
              volunteer_domains: prefs.domains,
              volunteer_roles:   prefs.roles,
            });
          }}
        />
      )}
    </div>
  );
};

export default UserDashboard;