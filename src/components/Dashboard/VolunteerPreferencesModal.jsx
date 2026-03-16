import React, { useState, useMemo } from 'react';
import { Search, X, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';

// ─── Data ────────────────────────────────────────────────────────────────────

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
  { id: 'logistics_head',    name: 'Logistics Head',         emoji: '🚚', color: '#f59e0b', desc: 'Venue, transport, accommodation & on-site ops' },
  { id: 'outreach_head',     name: 'Outreach Head',          emoji: '📢', color: '#6366f1', desc: 'Marketing, social media & external communications' },
  { id: 'technical_head',    name: 'Technical Head',         emoji: '⚙️', color: '#06b6d4', desc: 'AV equipment, live streams & technical support' },
  { id: 'registration_head', name: 'Registration Head',      emoji: '📋', color: '#10b981', desc: 'Attendee registration, badges & check-ins' },
  { id: 'sponsorship_head',  name: 'Sponsorship Head',       emoji: '🤝', color: '#8b5cf6', desc: 'Identify and coordinate with conference sponsors' },
  { id: 'hospitality_head',  name: 'Hospitality Head',       emoji: '🏨', color: '#f43f5e', desc: 'Catering, guest relations & VIP arrangements' },
  { id: 'publication_head',  name: 'Publications Head',      emoji: '📝', color: '#3b82f6', desc: 'Proceedings, journals & editorial coordination' },
  { id: 'finance_head',      name: 'Finance Head',           emoji: '💰', color: '#eab308', desc: 'Budget tracking, reimbursements & expenses' },
  { id: 'program_coord',     name: 'Program Coordinator',    emoji: '🗓️', color: '#ec4899', desc: 'Schedule sessions, speakers & workshops' },
  { id: 'social_coord',      name: 'Social Media Coord.',    emoji: '📱', color: '#14b8a6', desc: 'Real-time updates on Twitter, LinkedIn & Instagram' },
  { id: 'volunteer_coord',   name: 'Volunteer Coordinator',  emoji: '👥', color: '#f97316', desc: 'Onboard, train & manage fellow volunteers' },
  { id: 'design_lead',       name: 'Design Lead',            emoji: '🎨', color: '#a855f7', desc: 'Branding, banners, posters & visual assets' },
  { id: 'web_lead',          name: 'Website Lead',           emoji: '🌐', color: '#0ea5e9', desc: 'Build & maintain the conference website & portal' },
  { id: 'security_coord',    name: 'Security Coordinator',   emoji: '🔒', color: '#64748b', desc: 'Access control & on-site safety protocols' },
];

// ─── Component ───────────────────────────────────────────────────────────────

const VolunteerPreferencesModal = ({ userId, onClose, onSaved }) => {
  const [step, setStep]                   = useState(0);
  const [selectedDomains, setSelectedDomains] = useState(new Set());
  const [selectedRoles, setSelectedRoles]     = useState(new Set());
  const [search, setSearch]               = useState('');
  const [saving, setSaving]               = useState(false);

  // Filter domains by search query
  const filteredDomains = useMemo(() => {
    if (!search) return DOMAINS;
    const q = search.toLowerCase();
    const result = {};
    Object.entries(DOMAINS).forEach(([cat, items]) => {
      const filtered = items.filter((i) => i.toLowerCase().includes(q));
      if (filtered.length) result[cat] = filtered;
    });
    return result;
  }, [search]);

  const toggleDomain = (name) => {
    setSelectedDomains((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleRole = (id) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert volunteer preferences into user profile or a dedicated table.
      // Adjust table/column names to match your schema.
      const { error } = await supabase
        .from('users')
        .update({
          volunteer_domains: [...selectedDomains],
          volunteer_roles: [...selectedRoles],
        })
        .eq('user_id', userId);

      if (error) throw error;
      onSaved?.({ domains: [...selectedDomains], roles: [...selectedRoles] });
      onClose();
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Step content ──────────────────────────────────────────────────────────

  const StepDomains = () => (
    <>
      {/* Search */}
      <div className="flex items-center gap-2.5 bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5 mb-5">
        <Search size={14} className="text-slate-600 shrink-0" />
        <input
          className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-600 w-full font-[inherit]"
          placeholder="Search domains…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400">
            <X size={13} />
          </button>
        )}
      </div>

      {/* Chips */}
      <div className="max-h-72 overflow-y-auto pr-1 space-y-5 scrollbar-thin">
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
    <div className="max-h-80 overflow-y-auto pr-1 scrollbar-thin">
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
    <div className="space-y-5">
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
        </div>
      </div>
    </div>
  );

  // ── Layout ────────────────────────────────────────────────────────────────

  const STEPS = [
    {
      label: 'Step 1 of 3',
      title: 'Conference Domains',
      sub: 'Select all the fields you\'re interested in',
      content: <StepDomains />,
      canContinue: selectedDomains.size > 0,
      count: selectedDomains.size,
      noun: 'domain',
    },
    {
      label: 'Step 2 of 3',
      title: 'Volunteer Roles',
      sub: 'Pick the roles you\'d like to take on',
      content: <StepRoles />,
      canContinue: selectedRoles.size > 0,
      count: selectedRoles.size,
      noun: 'role',
    },
    {
      label: 'Step 3 of 3',
      title: 'Review & Confirm',
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
        className="w-full max-w-2xl bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-0">
          {/* Step dots */}
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
          </div>

          <p className="text-[11px] font-bold tracking-widest uppercase text-indigo-400 mb-1">
            {current.label}
          </p>
          <h2 className="text-2xl font-bold text-white mb-1">{current.title}</h2>
          <p className="text-sm text-slate-500 mb-6">{current.sub}</p>
        </div>

        {/* Body */}
        <div className="px-8 pb-0">{current.content}</div>

        {/* Footer */}
        <div className="flex items-center justify-between px-8 py-6 mt-5 border-t border-white/6">
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
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20 text-sm font-semibold transition-all"
              >
                <ChevronLeft size={15} /> Back
              </button>
            )}
            <button
              disabled={!current.canContinue || saving}
              onClick={step < 2 ? () => setStep((s) => s + 1) : handleSave}
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
  );
};

export default VolunteerPreferencesModal;