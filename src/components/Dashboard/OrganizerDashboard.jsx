import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, FileText, Users, CheckSquare, Bell, Plus, X, Send,
  ChevronDown, CheckCircle, XCircle, MapPin, Edit2, Trash2,
  Search, Layers, Clock, Sparkles, Star, Check, Settings
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import EmailComposer from './EmailComposer';
import EmailSettings from './EmailSettings';

import FeedbackManager from './FeedbackManager';
/* ─── helpers ─────────────────────────────────────────────── */
const cls = (...c) => c.filter(Boolean).join(' ');

const ROLE_STYLE = {
  organizer: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
  reviewer: 'bg-amber-500/10  text-amber-300  border-amber-500/25',
  presenter: 'bg-blue-500/10   text-blue-300   border-blue-500/25',
  member: 'bg-slate-500/10  text-slate-300  border-slate-500/25',
};
const PRIORITY_STYLE = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};
const TEAM_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#06b6d4',
];

/* volunteer role id → display label (matches ROLES array from UserDashboard) */
const VOLUNTEER_ROLE_LABELS = {
  logistics_head: 'Logistics Team',
  outreach_head: 'Outreach Team',
  technical_head: 'Technical Team',
  registration_head: 'Registration Team',
  sponsorship_head: 'Sponsorship Team',
  hospitality_head: 'Hospitality Team',
  publication_head: 'Publications Team',
  finance_head: 'Finance Team',
  program_coord: 'Program Coordinator',
  social_coord: 'Social Media Coord.',
  volunteer_coord: 'Volunteer Coordinator',
  design_lead: 'Design Lead',
  web_lead: 'Website Lead',
  security_coord: 'Security Coordinator',
};

/* Ordered list of preset team types — same 14 roles volunteers pick from */
const TEAM_TYPES = Object.entries(VOLUNTEER_ROLE_LABELS).map(([id, label]) => ({ id, label }));

/* ─── reusable primitives ──────────────────────────────────────────────────── */
const Modal = ({ title, onClose, children, width = 'max-w-lg' }) => (
  <div
    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={e => e.target === e.currentTarget && onClose()}
  >
    <div className={cls('bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full shadow-2xl max-h-[90vh] overflow-y-auto', width)}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-all">
          <X size={17} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{label}</label>
    {children}
  </div>
);
const Input = ({ className, ...props }) => (
  <input
    {...props}
    className={cls(
      'w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm',
      'focus:border-indigo-500 outline-none text-white placeholder-slate-600 transition-colors',
      className,
    )}
  />
);
const Sel = ({ children, className, ...props }) => (
  <select
    {...props}
    className={cls(
      'w-full bg-[#0d1117] border border-white/8 rounded-xl px-4 py-2.5 text-sm',
      'focus:border-indigo-500 outline-none text-white transition-colors',
      className,
    )}
  >
    {children}
  </select>
);
const Textarea = ({ className, ...props }) => (
  <textarea
    {...props}
    className={cls(
      'w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm',
      'focus:border-indigo-500 outline-none resize-none text-white placeholder-slate-600 transition-colors',
      className,
    )}
  />
);
const Btn = ({ variant = 'primary', children, className, ...props }) => {
  const base = 'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed';
  const v = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'border border-white/10 text-slate-400 hover:text-white hover:bg-white/5',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
  };
  return <button {...props} className={cls(base, v[variant], className)}>{children}</button>;
};
const Empty = ({ icon: Icon, msg, action }) => (
  <div className="py-16 text-center border border-dashed border-white/8 rounded-2xl">
    <Icon size={28} className="text-slate-700 mx-auto mb-3" />
    <p className="text-slate-500 text-sm">{msg}</p>
    {action && (
      <button onClick={action.onClick} className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 font-semibold">
        {action.label}
      </button>
    )}
  </div>
);
const LoadingRows = () => (
  <div className="space-y-2">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-14 bg-white/3 border border-white/5 rounded-xl animate-pulse" />
    ))}
  </div>
);

/* ─── VolunteerCandidatePanel ──────────────────────────────────────────────
   Volunteers tab  → all users in the platform who picked this team type,
                     regardless of whether they're conference members yet.
   All Members tab → conference members not yet in this team.
   Clicking a volunteer who isn't a member yet adds them to the conference
   first (as 'member' role), then to the team.
────────────────────────────────────────────────────────────────────────── */
const VolunteerCandidatePanel = ({
  allVolunteers,  // [{ user_id, user_name, user_email, volunteer_roles, volunteer_domains }] — all platform users with prefs
  members,        // conference_user rows (enriched) — for "All Members" tab
  teamMembers,    // already-in-team conference_user rows
  teamTypeId,     // volunteer role id e.g. 'logistics_team', or null for custom teams
  confId,         // needed to add non-members to the conference first
  onAdd,          // (confUserId) => void  — called after ensuring membership
  onAddVolunteer, // (userId) => Promise<confUserId>  — adds to conference, returns new confUserId
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('volunteers'); // 'volunteers' | 'all'
  const [adding, setAdding] = useState(null); // user_id currently being added

  console.log('[VolunteerCandidatePanel] allVolunteers:', allVolunteers?.length,
    '| teamTypeId:', teamTypeId, '| members:', members?.length);

  // Set of user_ids already in the team (via their conference_user id)
  const alreadyInTeamUserIds = new Set(teamMembers.map(m => m.user_id));
  // Set of conference_user ids already in the team
  const alreadyInTeam = new Set(teamMembers.map(m => m.id));
  // Set of user_ids who are already conference members
  const memberUserIds = new Set(members.map(m => m.user_id));

  const mName = (m) =>
    m?.full_name || m?.user_name || m?.email || m?.user_email || m?.user_id?.slice(0, 8) || '?';
  const mEmail = (m) => m?.email || m?.user_email || '';

  // The single relevant role label (for badge display)
  const relevantRoleLabel = teamTypeId ? VOLUNTEER_ROLE_LABELS[teamTypeId] : null;

  /* Volunteers tab: platform users who picked this team type and aren't in team yet */
  const matchedVolunteers = (allVolunteers || [])
    .filter(u => !alreadyInTeamUserIds.has(u.user_id))
    .filter(u => {
      if (!teamTypeId) return u.volunteer_roles?.length > 0;
      return u.volunteer_roles?.includes(teamTypeId);
    })
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return mName(u).toLowerCase().includes(q) || mEmail(u).toLowerCase().includes(q);
    });

  /* All Members tab: conference members not yet in the team */
  const nonTeamMembers = members
    .filter(m => !alreadyInTeam.has(m.id))
    .filter(m => {
      if (!search) return true;
      const q = search.toLowerCase();
      return mName(m).toLowerCase().includes(q) || mEmail(m).toLowerCase().includes(q);
    });

  const candidates = filterMode === 'volunteers' ? matchedVolunteers : nonTeamMembers;
  const volunteerCount = (allVolunteers || [])
    .filter(u => !alreadyInTeamUserIds.has(u.user_id))
    .filter(u => !teamTypeId ? u.volunteer_roles?.length > 0 : u.volunteer_roles?.includes(teamTypeId))
    .length;

  const handleAdd = async (candidate) => {
    if (adding) return;
    setAdding(candidate.user_id);
    try {
      if (filterMode === 'volunteers' && !memberUserIds.has(candidate.user_id)) {
        // Not a conference member yet — add to conference first, then team
        const confUserId = await onAddVolunteer(candidate);
        if (confUserId) onAdd(confUserId);
      } else if (filterMode === 'all') {
        // Already a member, candidate.id is the conference_user id
        onAdd(candidate.id);
      } else {
        // Volunteer who's already a conference member — find their conf user id
        const confMember = members.find(m => m.user_id === candidate.user_id);
        if (confMember) onAdd(confMember.id);
      }
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="mt-1">
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1 bg-white/4 p-1 rounded-lg border border-white/6 text-xs">
          <button
            onClick={() => setFilterMode('volunteers')}
            className={cls(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              filterMode === 'volunteers' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300',
            )}
          >
            <Sparkles size={11} />
            All Volunteers
            {volunteerCount > 0 && (
              <span className={cls(
                'text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                filterMode === 'volunteers' ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-300',
              )}>
                {volunteerCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={cls(
              'px-3 py-1.5 rounded-md font-semibold transition-all',
              filterMode === 'all' ? 'bg-white text-black' : 'text-slate-500 hover:text-slate-300',
            )}
          >
            Conf. Members
          </button>
        </div>
        {filterMode === 'volunteers' && (
          <span className="text-[10px] text-slate-600 italic">
            Includes users not yet in this conference
          </span>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-3 py-2 mb-3">
        <Search size={12} className="text-slate-600 shrink-0" />
        <input
          className="bg-transparent outline-none text-xs text-white placeholder-slate-600 flex-1"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400 transition-colors">
            <X size={11} />
          </button>
        )}
      </div>

      {/* List */}
      {candidates.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-white/8 rounded-xl">
          <p className="text-slate-600 text-xs">
            {filterMode === 'volunteers'
              ? 'No one on the platform has volunteered for this team type yet.'
              : 'No conference members available to add.'}
          </p>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
          {candidates.map(c => {
            const isVolTab = filterMode === 'volunteers';
            const isAlreadyMember = memberUserIds.has(c.user_id ?? c.user_id);
            const domains = (c.volunteer_domains || []).slice(0, 2);
            const isAdding = adding === (c.user_id);
            const key = c.user_id || c.id;

            return (
              <div
                key={key}
                onClick={() => !isAdding && handleAdd(c)}
                className={cls(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all group',
                  isAdding ? 'opacity-50 cursor-wait' : 'cursor-pointer',
                  isVolTab
                    ? 'bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10 hover:border-indigo-500/35'
                    : 'bg-white/2 border-white/6 hover:bg-white/4 hover:border-white/12',
                )}
              >
                {/* Avatar */}
                <div className={cls(
                  'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0',
                  isVolTab ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-slate-600 to-slate-700',
                )}>
                  {mName(c)[0]?.toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-slate-200 truncate">{mName(c)}</span>
                    {isVolTab && <Star size={9} className="text-indigo-400 shrink-0 fill-indigo-400" />}
                    {isVolTab && !isAlreadyMember && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">
                        Not a member
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-600 truncate">{mEmail(c)}</div>
                  {/* Preference tags */}
                  {(relevantRoleLabel || domains.length > 0) && isVolTab && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {relevantRoleLabel && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 uppercase tracking-wide">
                          {relevantRoleLabel}
                        </span>
                      )}
                      {domains.map(d => (
                        <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-slate-500">
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {!isVolTab && (
                    <span className={cls('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase', ROLE_STYLE[c.role] || ROLE_STYLE.member)}>
                      {c.role}
                    </span>
                  )}
                  <span className="text-[9px] text-slate-600 group-hover:text-indigo-400 transition-colors font-semibold">
                    {isAdding ? '…' : isVolTab && !isAlreadyMember ? '+ Invite & Add' : '+ Add'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN ORGANIZER DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
const OrganizerDashboard = ({ conf, onBack }) => {
  useApp(); // context kept for potential future use
  const confId = conf.conference_id || conf.id;

  const [section, setSection] = useState('overview');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLM] = useState(true);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLT] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLTasks] = useState(true);
  const [notifs, setNotifs] = useState([]);
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [paperFilter, setPaperFilter] = useState('all');

  /* All platform users who have set volunteer preferences */
  const [allVolunteers, setAllVolunteers] = useState([]);

  /* forms */
  const [mForm, setMForm] = useState({ email: '', role: 'reviewer' });
  // type: volunteer role id | 'custom'
  const [tmForm, setTmForm] = useState({ name: '', type: '', description: '', color: '#6366f1', head_id: '' });
  const [tkForm, setTkForm] = useState({ title: '', description: '', team_id: '', assignee_id: '', priority: 'medium', due_date: '' });
  const [nForm, setNForm] = useState({ title: '', message: '', target_role: 'all', target_team_id: '' });

  /* speakers */
  const [spTopic, setSpTopic] = useState('');
  const [spLimit, setSpLimit] = useState(10);
  const [spSource, setSpSource] = useState(5);
  const [spLoading, setSpLoading] = useState(false);
  const [spResults, setSpResults] = useState([]);
  const [spError, setSpError] = useState('');

  /* ── local papers state (fetched directly — not from AppContext) ── */
  const [confPapers, setConfPapers] = useState([]);
  const [loadingPapers, setLP] = useState(true);

  const pendingCount = confPapers.filter(p => p.status === 'pending').length;
  const accepted = confPapers.filter(p => p.status === 'accepted').length;
  const rejected = confPapers.filter(p => p.status === 'rejected').length;

  /* ── fetch ──────────────────────────────────────────────────────────── */
  const fetchMembers = useCallback(async () => {
    setLM(true);
    const { data, error } = await supabase
      .from('conference_user')
      .select(`id, user_id, role, email, full_name, joined_at, users(user_name, user_email)`)
      .eq('conference_id', confId)
      .order('joined_at', { ascending: false });

    if (error) console.error('fetchMembers error:', error);

    const enriched = (data || []).map(m => ({
      ...m,
      email: m.email || m.users?.user_email || '',
      full_name: m.full_name || m.users?.user_name || '',
    }));
    setMembers(enriched);
    setLM(false);
    return enriched;
  }, [confId]);

  /* Fetch ALL platform users who have at least one volunteer role set */
  const fetchAllVolunteers = useCallback(async () => {
    // Fetch every user — filter client-side.
    // Server-side array filtering on text[] is unreliable across Supabase versions.
    const { data, error } = await supabase
      .from('users')
      .select('user_id, user_name, user_email, volunteer_roles, volunteer_domains');

    console.log('[fetchAllVolunteers] raw data:', data, 'error:', error);

    if (error) { console.error('fetchAllVolunteers error:', error); return; }

    // Keep only users who have at least one volunteer role saved
    const withPrefs = (data || []).filter(
      u => Array.isArray(u.volunteer_roles) && u.volunteer_roles.length > 0
    );
    console.log('[fetchAllVolunteers] users with prefs:', withPrefs.length, withPrefs);
    setAllVolunteers(withPrefs);
  }, []);

  const fetchPapers = useCallback(async () => {
    setLP(true);
    const { data, error } = await supabase
      .from('paper')
      .select(`
        paper_id,
        paper_title,
        abstract,
        keywords,
        research_area,
        status,
        file_url,
        author_id,
        users ( user_name, user_email )
      `)
      .eq('conference_id', confId)
      .order('paper_id', { ascending: false });

    if (error) console.error('fetchPapers error:', error);
    setConfPapers(data || []);
    setLP(false);
  }, [confId]);

  const updatePaperStatus = async (paperId, newStatus) => {
    const { error } = await supabase
      .from('paper')
      .update({ status: newStatus })
      .eq('paper_id', paperId);
    if (error) { console.error('updatePaperStatus error:', error); return; }
    setConfPapers(prev =>
      prev.map(p => p.paper_id === paperId ? { ...p, status: newStatus } : p)
    );
  };

  const fetchTeams = useCallback(async () => {
    setLT(true);
    const { data: td } = await supabase
      .from('conference_teams')
      .select('*')
      .eq('conference_id', confId)
      .order('created_at', { ascending: true });

    if (td) {
      const { data: tmData } = await supabase
        .from('team_members')
        .select('team_id, user_id, conference_user_id')
        .in('team_id', td.map(t => t.id));

      const map = {};
      (tmData || []).forEach(tm => { (map[tm.team_id] = map[tm.team_id] || []).push(tm); });
      setTeams(td.map(t => ({ ...t, memberList: map[t.id] || [] })));
    } else {
      setTeams([]);
    }
    setLT(false);
  }, [confId]);

  const fetchTasks = useCallback(async () => {
    setLTasks(true);
    const { data } = await supabase
      .from('conference_tasks')
      .select('*')
      .eq('conference_id', confId)
      .order('created_at', { ascending: false });
    setTasks(data || []);
    setLTasks(false);
  }, [confId]);

  const fetchNotifs = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('conference_id', confId)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifs(data || []);
  }, [confId]);

  useEffect(() => {
    fetchMembers();
    fetchAllVolunteers();
    fetchTeams();
    fetchTasks();
    fetchNotifs();
    fetchPapers();
  }, [fetchMembers, fetchAllVolunteers, fetchTeams, fetchTasks, fetchNotifs, fetchPapers]);

  /* ── member CRUD ─────────────────────────────────────────────────────── */
  const addMember = async () => {
    if (!mForm.email.trim()) return;
    setSaving(true);

    const { data: foundUser, error: userError } = await supabase
      .from('users')
      .select('user_id, user_name, user_email')
      .eq('user_email', mForm.email.trim().toLowerCase())
      .maybeSingle();

    if (userError || !foundUser) {
      alert('No account found with that email. The person must sign up first.');
      setSaving(false);
      return;
    }

    const { data: existing } = await supabase
      .from('conference_user')
      .select('id')
      .eq('conference_id', confId)
      .eq('user_id', foundUser.user_id)
      .maybeSingle();

    if (existing) {
      alert('This person is already a member of this conference.');
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('conference_user')
      .insert([{
        conference_id: confId,
        user_id: foundUser.user_id,
        email: foundUser.user_email,
        full_name: foundUser.user_name,
        role: mForm.role,
        joined_at: new Date().toISOString(),
      }]);

    setSaving(false);
    if (insertError) {
      alert(insertError.message);
    } else {
      setModal(null);
      setMForm({ email: '', role: 'reviewer' });
      fetchMembers();
      fetchAllVolunteers();
    }
  };

  const updateRole = async (id, role) => {
    const { error } = await supabase.from('conference_user').update({ role }).eq('id', id);
    if (error) { alert(error.message); return; }
    setMembers(ms => ms.map(m => m.id === id ? { ...m, role } : m));
  };

  const removeMember = async (id) => {
    await supabase.from('conference_user').delete().eq('id', id);
    fetchMembers();
    fetchTeams();
  };

  /* ── team CRUD ───────────────────────────────────────────────────────── */
  const createTeam = async () => {
    if (!tmForm.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('conference_teams').insert([{
      conference_id: confId,
      name: tmForm.name.trim(),
      description: tmForm.description.trim(),
      color: tmForm.color,
      head_id: tmForm.head_id || null,
      created_at: new Date().toISOString(),
    }]);
    setSaving(false);
    if (!error) {
      setModal(null);
      setTmForm({ name: '', type: '', description: '', color: '#6366f1', head_id: '' });
      fetchTeams();
    } else alert(error.message);
  };

  const saveTeam = async () => {
    if (!tmForm.name.trim()) return;
    setSaving(true);
    await supabase.from('conference_teams').update({
      name: tmForm.name.trim(),
      description: tmForm.description.trim(),
      color: tmForm.color,
      head_id: tmForm.head_id || null,
    }).eq('id', modalData.id);
    setSaving(false);
    setModal(null);
    fetchTeams();
  };

  const deleteTeam = async (id) => {
    await supabase.from('team_members').delete().eq('team_id', id);
    await supabase.from('conference_teams').delete().eq('id', id);
    fetchTeams();
    fetchTasks();
  };

  /* Add a volunteer (platform user not yet in conference) to the conference,
     then return their new conference_user id so they can be added to the team */
  const addVolunteerToConference = async (volunteer) => {
    // Check they aren't already a member (race condition guard)
    const { data: existing } = await supabase
      .from('conference_user')
      .select('id')
      .eq('conference_id', confId)
      .eq('user_id', volunteer.user_id)
      .maybeSingle();
    if (existing) { await fetchMembers(); return existing.id; }

    const { data, error } = await supabase
      .from('conference_user')
      .insert([{
        conference_id: confId,
        user_id: volunteer.user_id,
        email: volunteer.user_email || '',
        full_name: volunteer.user_name || '',
        role: 'member',
        joined_at: new Date().toISOString(),
      }])
      .select('id')
      .single();

    if (error) { console.error('addVolunteerToConference error:', error); return null; }
    await fetchMembers(); // refresh members list
    return data.id;
  };

  const addToTeam = async (teamId, confUserId) => {
    const m = members.find(m => m.id === confUserId);
    if (!m) return;
    await supabase.from('team_members').insert([{
      team_id: teamId,
      conference_id: confId,
      conference_user_id: confUserId,
      user_id: m.user_id,
    }]);
    fetchTeams();
  };

  const removeFromTeam = async (teamId, confUserId) => {
    await supabase.from('team_members').delete().eq('team_id', teamId).eq('conference_user_id', confUserId);
    fetchTeams();
  };

  /* ── task CRUD ───────────────────────────────────────────────────────── */
  const createTask = async () => {
    if (!tkForm.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('conference_tasks').insert([{
      conference_id: confId,
      title: tkForm.title.trim(),
      description: tkForm.description || null,
      team_id: tkForm.team_id || null,
      assignee_id: tkForm.assignee_id || null,
      priority: tkForm.priority,
      due_date: tkForm.due_date || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    }]);
    setSaving(false);
    if (!error) {
      setModal(null);
      setTkForm({ title: '', description: '', team_id: '', assignee_id: '', priority: 'medium', due_date: '' });
      fetchTasks();
    } else alert(error.message);
  };

  const saveTask = async () => {
    if (!tkForm.title.trim()) return;
    setSaving(true);
    await supabase.from('conference_tasks').update({
      title: tkForm.title.trim(),
      description: tkForm.description || null,
      team_id: tkForm.team_id || null,
      assignee_id: tkForm.assignee_id || null,
      priority: tkForm.priority,
      due_date: tkForm.due_date || null,
    }).eq('id', modalData.id);
    setSaving(false);
    setModal(null);
    fetchTasks();
  };

  const toggleTask = async (task) => {
    const s = task.status === 'done' ? 'pending' : 'done';
    await supabase.from('conference_tasks').update({ status: s }).eq('id', task.id);
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: s } : t));
  };

  const deleteTask = async (id) => {
    await supabase.from('conference_tasks').delete().eq('id', id);
    setTasks(ts => ts.filter(t => t.id !== id));
  };

  /* ── notif ───────────────────────────────────────────────────────────── */
  const sendNotif = async () => {
    if (!nForm.title.trim() || !nForm.message.trim()) return;
    setSaving(true);
    const payload = {
      conference_id: confId,
      title: nForm.title.trim(),
      message: nForm.message.trim(),
      target_role: nForm.target_role === 'all' ? null : nForm.target_role,
      target_team_id: nForm.target_team_id || null,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('notifications').insert([payload]);
    setSaving(false);
    if (!error) {
      setNotifs(p => [{ ...payload, id: Date.now() }, ...p]);
      setModal(null);
      setNForm({ title: '', message: '', target_role: 'all', target_team_id: '' });
    }
  };

  /* ── speakers ────────────────────────────────────────────────────────── */
  const findSpeakers = async () => {
    if (!spTopic.trim()) return;
    setSpLoading(true);
    setSpError('');
    setSpResults([]);
    try {
      const res = await fetch(
        `http://localhost:4000/api/speakers?topic=${encodeURIComponent(spTopic)}&limit=${spLimit}&source=${spSource}`
      );
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      setSpResults(data);
    } catch {
      setSpError('Failed to fetch speakers. Make sure your backend is running.');
    }
    setSpLoading(false);
  };

  /* ── ui helpers ──────────────────────────────────────────────────────── */
  const mName = (m) => m?.full_name || m?.email || m?.user_id?.substring(0, 8) || '?';
  const teamName = (id) => teams.find(t => t.id === id)?.name || '—';
  const assigneeName = (id) => {
    const m = members.find(m => m.id === id || m.user_id === id);
    return m ? mName(m) : '—';
  };
  const filteredMembers = members.filter(m =>
    !memberSearch ||
    mName(m).toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(memberSearch.toLowerCase())
  );
  const filteredPapers = confPapers.filter(p => paperFilter === 'all' || p.status === paperFilter);

  const openEditTeam = (t) => {
    setModalData(t);
    const matchedType = Object.entries(VOLUNTEER_ROLE_LABELS).find(([, label]) => label === t.name)?.[0] || 'custom';
    setTmForm({ name: t.name, type: matchedType, description: t.description || '', color: t.color || '#6366f1', head_id: t.head_id || '' });
    setModal('editTeam');
  };
  const openEditTask = (t) => {
    setModalData(t);
    setTkForm({
      title: t.title,
      description: t.description || '',
      team_id: t.team_id || '',
      assignee_id: t.assignee_id || '',
      priority: t.priority || 'medium',
      due_date: t.due_date || '',
    });
    setModal('editTask');
  };

  /* Count how many conference members have volunteer prefs set */
  // Build a quick lookup from allVolunteers for use in members list badges
  const volunteerMap = Object.fromEntries(
    allVolunteers.map(u => [u.user_id, { volunteer_roles: u.volunteer_roles || [], volunteer_domains: u.volunteer_domains || [] }])
  );
  const volunteersCount = allVolunteers.length;


  const nav = [
    { id: 'overview', label: 'Overview', icon: BarChart2, badge: null },
    { id: 'papers', label: 'Papers', icon: FileText, badge: pendingCount || null },
    { id: 'members', label: 'Members', icon: Users, badge: null },
    { id: 'teams', label: 'Teams', icon: Layers, badge: null },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: tasks.filter(t => t.status !== 'done').length || null },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: null },
    { id: 'emails', label: 'Emails', icon: Send, badge: null },
    { id: 'feedback', label: 'Feedback', icon: Star, badge: null },
    { id: 'speakers', label: 'Find Speakers', icon: Users, badge: null },
  ];

  /* ══════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#080b11] text-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#080b11]/95 backdrop-blur-xl border-b border-white/6 px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-slate-500 hover:text-white text-xs font-semibold px-2 py-1.5 hover:bg-white/5 rounded-lg transition-all">← Back</button>
            <div className="h-4 w-px bg-white/10" />
            <div>
              <div className="font-bold text-white text-sm">{conf.title}</div>
              <div className="text-xs text-slate-600 flex items-center gap-1"><MapPin size={10} />{conf.location ?? 'Location TBD'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Volunteer count badge */}
            {volunteersCount > 0 && (
              <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md">
                <Sparkles size={11} />
                {volunteersCount} volunteer{volunteersCount !== 1 ? 's' : ''}
              </div>
            )}
            <span className="text-xs font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">Organizer</span>
            <Btn className="text-xs py-2 px-3" onClick={() => setModal('notification')}><Bell size={13} />Announce</Btn>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto flex">
        {/* SIDEBAR */}
        <aside className="w-52 shrink-0 sticky top-[53px] h-[calc(100vh-53px)] border-r border-white/6 py-5 px-2.5 flex flex-col gap-0.5">
          {nav.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cls(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all',
                section === id ? 'bg-white/8 text-white' : 'text-slate-500 hover:text-slate-200 hover:bg-white/4',
              )}
            >
              <Icon size={15} className={section === id ? 'text-indigo-400' : ''} />
              <span className="flex-1">{label}</span>
              {badge ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold">{badge}</span>
              ) : null}
            </button>
          ))}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8 min-h-screen">

          {/* ═══ OVERVIEW ═══ */}
          {section === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Event Overview</h2>
                <p className="text-slate-500 text-sm mt-0.5">Real-time conference metrics</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Members', value: members.length, color: 'text-indigo-400', bg: 'bg-indigo-500/8' },
                  { label: 'Teams', value: teams.length, color: 'text-purple-400', bg: 'bg-purple-500/8' },
                  { label: 'Papers', value: confPapers.length, color: 'text-blue-400', bg: 'bg-blue-500/8' },
                  { label: 'Open Tasks', value: tasks.filter(t => t.status !== 'done').length, color: 'text-amber-400', bg: 'bg-amber-500/8' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={cls('rounded-xl p-5 border border-white/6', bg)}>
                    <div className={cls('text-3xl font-bold mb-1', color)}>{value}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>

              {/* Volunteer summary card */}
              {volunteersCount > 0 && (
                <div className="bg-[#0d1117] border border-indigo-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-indigo-400" />
                    <span className="text-sm font-semibold text-slate-300">Volunteer Preferences</span>
                    <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold ml-auto">
                      {volunteersCount} platform volunteers
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Show which roles are represented */}
                    {Object.entries(VOLUNTEER_ROLE_LABELS).filter(([id]) =>
                      Object.values(volunteerMap).some(p => p.volunteer_roles?.includes(id))
                    ).map(([id, label]) => (
                      <span key={id} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-indigo-500/8 border border-indigo-500/15 text-indigo-300">
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-3">
                    These roles are covered by your volunteers. When building teams, volunteers are automatically highlighted.
                  </p>
                </div>
              )}

              {confPapers.length > 0 && (
                <div className="bg-[#0d1117] border border-white/6 rounded-xl p-5">
                  <div className="flex justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-300">Paper Review Progress</span>
                    <button onClick={() => setSection('papers')} className="text-xs text-indigo-400 hover:text-indigo-300">View all →</button>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${(accepted / confPapers.length) * 100}%` }} />
                    <div className="bg-red-500 h-full" style={{ width: `${(rejected / confPapers.length) * 100}%` }} />
                    <div className="bg-amber-500 h-full" style={{ width: `${(pendingCount / confPapers.length) * 100}%` }} />
                  </div>
                  <div className="flex gap-5 mt-3 text-xs text-slate-500">
                    {[['bg-emerald-500', 'Accepted', accepted], ['bg-red-500', 'Rejected', rejected], ['bg-amber-500', 'Pending', pendingCount]].map(([c, l, v]) => (
                      <span key={l} className="flex items-center gap-1.5">
                        <span className={cls('w-2 h-2 rounded-full inline-block', c)} />{l} {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {teams.length > 0 && (
                <div className="bg-[#0d1117] border border-white/6 rounded-xl p-5">
                  <div className="flex justify-between mb-4">
                    <span className="text-sm font-semibold text-slate-300">Teams</span>
                    <button onClick={() => setSection('teams')} className="text-xs text-indigo-400 hover:text-indigo-300">Manage →</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {teams.slice(0, 6).map(t => (
                      <div key={t.id} className="flex items-center gap-2.5 bg-white/3 rounded-lg p-2.5 border border-white/5">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="text-xs font-semibold text-slate-300 truncate flex-1">{t.name}</span>
                        <span className="text-[10px] text-slate-600">{t.memberList?.length || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#0d1117] border border-white/6 rounded-xl p-5">
                <div className="flex justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-300">Task Completion</span>
                  <button onClick={() => setSection('tasks')} className="text-xs text-indigo-400 hover:text-indigo-300">Manage →</button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: tasks.length > 0 ? `${(tasks.filter(t => t.status === 'done').length / tasks.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold shrink-0">
                    {tasks.filter(t => t.status === 'done').length}/{tasks.length}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PAPERS ═══ */}
          {section === 'papers' && (() => {
            const filteredPapers = confPapers.filter(
              p => paperFilter === 'all' || p.status === paperFilter
            );
            const authorName = (p) =>
              p.users?.user_name || p.users?.user_email || p.author_id?.slice(0, 8) || 'Unknown';

            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Paper Submissions</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{confPapers.length} total · {pendingCount} pending review</p>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1 bg-white/4 p-1 rounded-xl w-fit border border-white/6">
                  {[
                    ['all', `All (${confPapers.length})`],
                    ['pending', `Pending (${pendingCount})`],
                    ['accepted', `Accepted (${accepted})`],
                    ['rejected', `Rejected (${rejected})`],
                  ].map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setPaperFilter(k)}
                      className={cls('px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                        paperFilter === k ? 'bg-white text-black' : 'text-slate-500 hover:text-slate-200')}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                {/* List */}
                {loadingPapers ? (
                  <LoadingRows />
                ) : filteredPapers.length === 0 ? (
                  <Empty icon={FileText} msg="No papers match this filter." />
                ) : (
                  <div className="space-y-3">
                    {filteredPapers.map(paper => (
                      <div
                        key={paper.paper_id}
                        className="bg-[#0d1117] border border-white/6 rounded-xl p-5 hover:border-white/10 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left — title + meta */}
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                              {paper.paper_title?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white text-sm leading-snug mb-1">
                                {paper.paper_title || 'Untitled'}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <span>By {authorName(paper)}</span>
                                {paper.research_area && (
                                  <>
                                    <span className="text-slate-700">·</span>
                                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-slate-400">
                                      {paper.research_area}
                                    </span>
                                  </>
                                )}
                                {paper.keywords && (
                                  <>
                                    <span className="text-slate-700">·</span>
                                    <span className="truncate max-w-xs text-slate-600">{paper.keywords}</span>
                                  </>
                                )}
                              </div>
                              {paper.abstract && (
                                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                                  {paper.abstract}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right — status + actions */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className={cls(
                              'px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border',
                              paper.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                paper.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                  'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            )}>
                              {paper.status === 'pending' ? 'Under Review' : paper.status}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {paper.file_url && (
                                <a
                                  href={paper.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-all"
                                >
                                  View File →
                                </a>
                              )}
                              {paper.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => updatePaperStatus(paper.paper_id, 'accepted')}
                                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all"
                                  >
                                    <CheckCircle size={12} /> Accept
                                  </button>
                                  <button
                                    onClick={() => updatePaperStatus(paper.paper_id, 'rejected')}
                                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all"
                                  >
                                    <XCircle size={12} /> Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ═══ MEMBERS ═══ */}
          {section === 'members' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Members</h2>
                  <p className="text-slate-500 text-sm mt-0.5">
                    {members.length} registered
                    {volunteersCount > 0 && (
                      <span className="ml-2 text-indigo-400 font-semibold">· {volunteersCount} with volunteer preferences</span>
                    )}
                  </p>
                </div>
                <Btn onClick={() => setModal('addMember')}><Plus size={15} />Add Member</Btn>
              </div>
              <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5">
                <Search size={14} className="text-slate-500 shrink-0" />
                <input
                  className="bg-transparent outline-none text-sm text-white placeholder-slate-600 flex-1"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                  placeholder="Search by name or email…"
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                />
              </div>
              {loadingMembers ? <LoadingRows /> : filteredMembers.length === 0
                ? <Empty icon={Users} msg="No members found." action={{ label: '+ Add Member', onClick: () => setModal('addMember') }} />
                : (
                  <div className="space-y-2">
                    {filteredMembers.map(m => {
                      const prefs = volunteerMap[m.user_id];
                      const hasVol = prefs?.volunteer_roles?.length > 0;
                      return (
                        <div key={m.id} className="bg-[#0d1117] border border-white/6 rounded-xl px-5 py-3.5 flex items-center gap-4 hover:border-white/10 transition-all">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {mName(m)[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-white truncate">{mName(m)}</span>
                              {hasVol && <Star size={10} className="text-indigo-400 fill-indigo-400 shrink-0" title="Has volunteer preferences" />}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{m.email || m.user_id}</div>
                            {/* Show volunteer roles inline */}
                            {hasVol && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {prefs.volunteer_roles.slice(0, 3).map(r => (
                                  <span key={r} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase tracking-wide">
                                    {VOLUNTEER_ROLE_LABELS[r] || r}
                                  </span>
                                ))}
                                {prefs.volunteer_roles.length > 3 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/8 text-slate-500">
                                    +{prefs.volunteer_roles.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <select
                            value={m.role}
                            onChange={e => updateRole(m.id, e.target.value)}
                            className={cls('text-xs font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider bg-transparent cursor-pointer outline-none', ROLE_STYLE[m.role] || ROLE_STYLE.member)}
                          >
                            {['organizer', 'reviewer', 'presenter', 'member'].map(r => (
                              <option key={r} value={r} className="bg-[#0d1117] text-white normal-case">{r}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => { setModalData(m); setModal('confirmDelete'); }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* ═══ TEAMS ═══ */}
          {section === 'teams' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Teams</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{teams.length} teams</p>
                </div>

                <Btn onClick={() => { setTmForm({ name: '', type: '', description: '', color: '#6366f1', head_id: '' }); setModal('createTeam'); }}>
                  <Plus size={15} />Create Team
                </Btn>
              </div>
              {loadingTeams ? <LoadingRows /> : teams.length === 0
                ? <Empty icon={Layers} msg="No teams yet." action={{ label: '+ Create Team', onClick: () => setModal('createTeam') }} />
                : (
                  <div className="space-y-3">
                    {teams.map(team => {
                      const isOpen = expandedTeam === team.id;
                      const teamMembers = team.memberList
                        .map(tm => members.find(m => m.id === tm.conference_user_id || m.user_id === tm.user_id))
                        .filter(Boolean);
                      const nonMembers = members.filter(m => !team.memberList.some(tm => tm.conference_user_id === m.id));
                      const teamTasks = tasks.filter(t => t.team_id === team.id);

                      return (
                        <div key={team.id} className="bg-[#0d1117] border border-white/6 rounded-xl overflow-hidden">
                          {/* header row */}
                          <div
                            className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-white/2 transition-colors"
                            onClick={() => setExpandedTeam(isOpen ? null : team.id)}
                          >
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                            <div className="flex-1">
                              <div className="font-semibold text-white text-sm">{team.name}</div>
                              {team.description && <div className="text-xs text-slate-500 mt-0.5">{team.description}</div>}
                            </div>
                            <div className="flex items-center gap-3">
                              {team.head_id && members.find(m => m.id === team.head_id) && (
                                <span className="text-xs text-indigo-400/70 font-medium">
                                  Head: {mName(members.find(m => m.id === team.head_id))}
                                </span>
                              )}
                              <span className="text-xs text-slate-500 font-semibold">
                                {team.memberList.length} member{team.memberList.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <button onClick={e => { e.stopPropagation(); openEditTeam(team); }} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/8 transition-all"><Edit2 size={13} /></button>
                            <button onClick={e => { e.stopPropagation(); if (window.confirm(`Delete team "${team.name}"?`)) deleteTeam(team.id); }} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                            <ChevronDown size={15} className={cls('text-slate-600 transition-transform', isOpen && 'rotate-180')} />
                          </div>

                          {/* expanded body */}
                          {isOpen && (
                            <div className="border-t border-white/5 px-5 py-5 space-y-6 bg-black/20">
                              {/* current members */}
                              <div>
                                <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold mb-2">Members ({teamMembers.length})</div>
                                {(() => {
                                  const head = team.head_id ? members.find(m => m.id === team.head_id) : null;
                                  return head ? (
                                    <div className="flex items-center gap-2 mb-3 bg-indigo-500/8 border border-indigo-500/15 rounded-lg px-3 py-2 w-fit">
                                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                                        {mName(head)[0]?.toUpperCase()}
                                      </div>
                                      <span className="text-xs text-indigo-300 font-semibold">{mName(head)}</span>
                                      <span className="text-[9px] text-indigo-400/60 uppercase tracking-wider font-bold">Head</span>
                                    </div>
                                  ) : null;
                                })()}
                                {teamMembers.length === 0
                                  ? <p className="text-xs text-slate-600 italic">No members yet</p>
                                  : (
                                    <div className="flex flex-wrap gap-2">
                                      {teamMembers.map(m => (
                                        <div key={m.id} className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5">
                                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                                            {mName(m)[0]?.toUpperCase()}
                                          </div>
                                          <span className="text-xs text-slate-300 font-medium">{mName(m)}</span>
                                          <span className={cls('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase', ROLE_STYLE[m.role] || ROLE_STYLE.member)}>{m.role}</span>
                                          <button onClick={() => removeFromTeam(team.id, m.id)} className="text-slate-600 hover:text-red-400 transition-colors"><X size={12} /></button>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                }
                              </div>

                              {/* ── Volunteer Candidate Panel ── */}
                              {nonMembers.length > 0 && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold">Add Member to Team</div>
                                    {volunteersCount > 0 && (
                                      <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-400/70 bg-indigo-500/8 border border-indigo-500/15 px-1.5 py-0.5 rounded">
                                        <Sparkles size={8} />
                                        Volunteer-aware
                                      </div>
                                    )}
                                  </div>
                                  <VolunteerCandidatePanel
                                    allVolunteers={allVolunteers}
                                    members={members}
                                    teamMembers={teamMembers}
                                    teamTypeId={
                                      Object.entries(VOLUNTEER_ROLE_LABELS).find(([, label]) => label === team.name)?.[0] ?? null
                                    }
                                    confId={confId}
                                    onAdd={(confUserId) => addToTeam(team.id, confUserId)}
                                    onAddVolunteer={addVolunteerToConference}
                                  />
                                </div>
                              )}

                              {/* team tasks */}
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold">Tasks ({teamTasks.length})</div>
                                  <button
                                    onClick={() => { setTkForm({ title: '', description: '', team_id: team.id, assignee_id: '', priority: 'medium', due_date: '' }); setModal('addTask'); }}
                                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                                  >
                                    + Add Task
                                  </button>
                                </div>
                                {teamTasks.length === 0
                                  ? <p className="text-xs text-slate-600 italic">No tasks for this team</p>
                                  : teamTasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-2.5 py-2 border-t border-white/4 first:border-t-0">
                                      <div
                                        onClick={() => toggleTask(task)}
                                        className={cls('w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors', task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-indigo-400')}
                                      >
                                        {task.status === 'done' && <CheckCircle size={9} className="text-white" />}
                                      </div>
                                      <span className={cls('text-xs flex-1', task.status === 'done' ? 'line-through text-slate-600' : 'text-slate-300')}>{task.title}</span>
                                      <span className={cls('text-[9px] font-bold px-1.5 py-0.5 rounded border', PRIORITY_STYLE[task.priority || 'medium'])}>{task.priority}</span>
                                      {task.assignee_id && <span className="text-[10px] text-slate-600">{assigneeName(task.assignee_id)}</span>}
                                      <button onClick={() => openEditTask(task)} className="text-slate-600 hover:text-white transition-colors"><Edit2 size={12} /></button>
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* ═══ TASKS ═══ */}
          {section === 'tasks' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Tasks</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{tasks.filter(t => t.status === 'done').length}/{tasks.length} complete</p>
                </div>
                <Btn onClick={() => { setTkForm({ title: '', description: '', team_id: '', assignee_id: '', priority: 'medium', due_date: '' }); setModal('addTask'); }}>
                  <Plus size={15} />Add Task
                </Btn>
              </div>
              {loadingTasks ? <LoadingRows /> : tasks.length === 0
                ? <Empty icon={CheckSquare} msg="No tasks yet." action={{ label: '+ Add Task', onClick: () => setModal('addTask') }} />
                : (
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div key={task.id} className="bg-[#0d1117] border border-white/6 rounded-xl px-5 py-3.5 flex items-center gap-4 hover:border-white/10 transition-all group">
                        <div
                          onClick={() => toggleTask(task)}
                          className={cls('w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors', task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-indigo-400')}
                        >
                          {task.status === 'done' && <CheckCircle size={11} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cls('text-sm font-medium', task.status === 'done' ? 'line-through text-slate-600' : 'text-slate-200')}>{task.title}</div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {task.team_id && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Layers size={9} />{teamName(task.team_id)}</span>}
                            {task.assignee_id && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Users size={9} />{assigneeName(task.assignee_id)}</span>}
                            {task.due_date && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Clock size={9} />{new Date(task.due_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <span className={cls('text-[10px] font-bold px-2 py-0.5 rounded border uppercase', PRIORITY_STYLE[task.priority || 'medium'])}>{task.priority || 'med'}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditTask(task)} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/8 transition-all"><Edit2 size={13} /></button>
                          <button onClick={() => deleteTask(task.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* ═══ NOTIFICATIONS ═══ */}
          {section === 'notifications' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Notifications</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Announcements sent to members</p>
                </div>
                <Btn onClick={() => setModal('notification')}><Send size={14} />New Announcement</Btn>
              </div>
              {notifs.length === 0
                ? <Empty icon={Bell} msg="No notifications sent yet." action={{ label: '+ Send Announcement', onClick: () => setModal('notification') }} />
                : (
                  <div className="space-y-3">
                    {notifs.map((n, i) => (
                      <div key={i} className="bg-[#0d1117] border border-white/6 rounded-xl p-5">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-white text-sm">{n.title}</div>
                          <div className="flex items-center gap-2 shrink-0">
                            {n.target_role && <span className="text-[10px] text-slate-500 bg-white/5 border border-white/8 px-2 py-0.5 rounded-md uppercase font-bold">{n.target_role}</span>}
                            {n.target_team_id && <span className="text-[10px] text-indigo-400 bg-indigo-500/8 border border-indigo-500/15 px-2 py-0.5 rounded-md font-bold">{teamName(n.target_team_id)}</span>}
                            <span className="text-xs text-slate-600">{new Date(n.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}



          {section === 'feedback' && <FeedbackManager conf={conf} />}

          {section === 'emails' && (
            <EmailComposer
              conf={conf}
              senderRole="organizer"
              onOpenEmailSettings={() => setSection('emailSettings')}
            />
          )}
          {section === 'emailSettings' && (
            <EmailSettings conf={conf} />
          )}

          {/* ═══ SPEAKERS ═══ */}
          {section === 'speakers' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Find Speakers</h2>
                <p className="text-slate-500 text-sm mt-0.5">Discover potential speakers for your conference using AI</p>
              </div>
              <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Field label="Research Topic">
                      <Input
                        placeholder="e.g. Artificial Intelligence, Quantum Computing…"
                        value={spTopic}
                        onChange={e => setSpTopic(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && findSpeakers()}
                      />
                    </Field>
                  </div>
                  <Field label="Max Results">
                    <Sel value={spLimit} onChange={e => setSpLimit(Number(e.target.value))}>
                      {[5, 10, 15, 20].map(n => <option key={n} value={n} className="bg-[#0d1117]">{n} speakers</option>)}
                    </Sel>
                  </Field>
                </div>
                <Field label="Speaker Source">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {[
                      { key: 1, label: '🇮🇳 Indian' },
                      { key: 2, label: '🌍 Foreign' },
                      { key: 3, label: '💼 LinkedIn' },
                      { key: 4, label: '🎓 IIT / NIT' },
                      { key: 5, label: '⭐ All Sources' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setSpSource(key)}
                        className={cls('py-2.5 px-3 rounded-xl text-xs font-bold border transition-all',
                          spSource === key ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/8 text-slate-500 hover:text-white hover:border-white/20')}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Btn onClick={findSpeakers} disabled={spLoading || !spTopic.trim()} className="w-full py-3 justify-center">
                  {spLoading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Searching… this may take a moment</>
                    : <><Users size={15} />Find Speakers</>
                  }
                </Btn>
                {spError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{spError}</div>
                )}
              </div>
              {spLoading && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white/3 border border-white/5 rounded-2xl animate-pulse" />)}
                </div>
              )}
              {!spLoading && spResults.length > 0 && (
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    {spResults.length} Speaker{spResults.length !== 1 ? 's' : ''} Found
                  </div>
                  {spResults.map((speaker, i) => (
                    <div key={i} className="bg-[#0d1117] border border-white/6 rounded-2xl p-6 hover:border-white/12 transition-all">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                            {speaker.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white text-base">{speaker.name}</div>
                            {speaker.organization && <div className="text-xs text-slate-500 mt-0.5">{speaker.organization}</div>}
                          </div>
                        </div>
                        {speaker.relevance_score !== undefined && (
                          <div className="shrink-0 text-center bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-2">
                            <div className="text-lg font-bold text-indigo-400">{speaker.relevance_score}</div>
                            <div className="text-[9px] text-slate-600 uppercase font-bold tracking-wider">Score</div>
                          </div>
                        )}
                      </div>
                      {speaker.profile && <p className="text-sm text-slate-400 leading-relaxed mb-4">{speaker.profile}</p>}
                      {speaker.linkedin && (
                        <a href={speaker.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                          View LinkedIn →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!spLoading && spResults.length === 0 && spTopic && !spError && (
                <div className="py-16 text-center border border-dashed border-white/8 rounded-2xl">
                  <Users size={28} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No speakers found. Try a different topic.</p>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ══════════════════════════ MODALS ══════════════════════════ */}

      {modal === 'addMember' && (
        <Modal title="Add Member" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Email Address"><Input type="email" placeholder="member@example.com" value={mForm.email} onChange={e => setMForm({ ...mForm, email: e.target.value })} /></Field>
            <Field label="Role">
              <Sel value={mForm.role} onChange={e => setMForm({ ...mForm, role: e.target.value })}>
                <option value="reviewer">Reviewer</option>
                <option value="presenter">Presenter</option>
                <option value="organizer">Organizer</option>
                <option value="member">Member</option>
              </Sel>
            </Field>
          </div>
          <div className="flex gap-3 mt-6">
            <Btn variant="secondary" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={addMember} disabled={saving || !mForm.email.trim()}>{saving ? 'Adding…' : 'Add Member'}</Btn>
          </div>
        </Modal>
      )}

      {modal === 'confirmDelete' && modalData && (
        <Modal title="Remove Member" onClose={() => setModal(null)} width="max-w-sm">
          <p className="text-slate-400 text-sm mb-6">
            Remove <span className="text-white font-semibold">{mName(modalData)}</span> from this conference?
          </p>
          <div className="flex gap-3">
            <Btn variant="secondary" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="danger" className="flex-1" onClick={() => { removeMember(modalData.id); setModal(null); }}>Remove</Btn>
          </div>
        </Modal>
      )}

      {(modal === 'createTeam' || modal === 'editTeam') && (
        <Modal title={modal === 'createTeam' ? 'Create Team' : 'Edit Team'} onClose={() => setModal(null)} width="max-w-xl">
          <div className="space-y-4">
            {/* ── Team Type picker ── */}
            <Field label="Team Type">
              <div className="space-y-2">
                {/* Preset role chips */}
                <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                  {TEAM_TYPES.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTmForm({ ...tmForm, type: id, name: label })}
                      className={cls(
                        'text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-2',
                        tmForm.type === id
                          ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300'
                          : 'bg-white/3 border-white/8 text-slate-500 hover:border-indigo-500/30 hover:text-slate-200',
                      )}
                    >
                      {tmForm.type === id && <Check size={10} className="shrink-0 text-indigo-400" />}
                      {label}
                    </button>
                  ))}
                  {/* Custom option */}
                  <button
                    type="button"
                    onClick={() => setTmForm({ ...tmForm, type: 'custom', name: '' })}
                    className={cls(
                      'text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 col-span-2',
                      tmForm.type === 'custom'
                        ? 'bg-slate-500/15 border-slate-400/40 text-slate-300'
                        : 'bg-white/3 border-white/8 text-slate-500 hover:border-white/20 hover:text-slate-200',
                    )}
                  >
                    {tmForm.type === 'custom' && <Check size={10} className="shrink-0" />}
                    ✏️ Custom name…
                  </button>
                </div>
                {/* Free-text input shown only when "Custom" is selected */}
                {tmForm.type === 'custom' && (
                  <Input
                    autoFocus
                    placeholder="Enter a custom team name…"
                    value={tmForm.name}
                    onChange={e => setTmForm({ ...tmForm, name: e.target.value })}
                  />
                )}
              </div>
            </Field>
            <Field label="Description (optional)">
              <Input placeholder="What does this team do?" value={tmForm.description} onChange={e => setTmForm({ ...tmForm, description: e.target.value })} />
            </Field>
            <Field label="Team Head (optional)">
              <Sel value={tmForm.head_id} onChange={e => setTmForm({ ...tmForm, head_id: e.target.value })}>
                <option value="">— No team head —</option>
                {members.map(m => (
                  <option key={m.id} value={m.id} className="bg-[#0d1117]">{mName(m)} ({m.role})</option>
                ))}
              </Sel>
            </Field>
            <Field label="Team Color">
              <div className="flex gap-2 flex-wrap">
                {TEAM_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setTmForm({ ...tmForm, color: c })}
                    className={cls('w-8 h-8 rounded-lg transition-all border-2', tmForm.color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105')}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>

            {/* ── Volunteer candidates preview inside modal ── */}
            {(tmForm.type && tmForm.type !== 'custom' || (tmForm.type === 'custom' && tmForm.name.trim().length >= 3)) && (
              <div className="border-t border-white/6 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={13} className="text-indigo-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suggested Volunteers</span>
                  <span className="text-[10px] text-slate-600">based on team name</span>
                </div>
                <VolunteerCandidatePanel
                  allVolunteers={allVolunteers}
                  members={members}
                  teamMembers={[]}
                  teamTypeId={tmForm.type !== 'custom' ? tmForm.type : null}
                  confId={confId}
                  onAdd={() => { }}
                  onAddVolunteer={() => Promise.resolve(null)}
                />
                <p className="text-[10px] text-slate-600 mt-2">
                  You can add members after the team is created.
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6">
            <Btn variant="secondary" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={modal === 'createTeam' ? createTeam : saveTeam} disabled={saving || !tmForm.name.trim()}>
              {saving ? 'Saving…' : modal === 'createTeam' ? 'Create Team' : 'Save Changes'}
            </Btn>
          </div>
        </Modal>
      )}

      {(modal === 'addTask' || modal === 'editTask') && (
        <Modal title={modal === 'addTask' ? 'Add Task' : 'Edit Task'} onClose={() => setModal(null)} width="max-w-xl">
          <div className="space-y-4">
            <Field label="Task Title"><Input placeholder="Describe the task…" value={tkForm.title} onChange={e => setTkForm({ ...tkForm, title: e.target.value })} /></Field>
            <Field label="Description (optional)"><Textarea className="h-20" placeholder="Additional details…" value={tkForm.description} onChange={e => setTkForm({ ...tkForm, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Assign to Team">
                <Sel value={tkForm.team_id} onChange={e => setTkForm({ ...tkForm, team_id: e.target.value })}>
                  <option value="">No team</option>
                  {teams.map(t => <option key={t.id} value={t.id} className="bg-[#0d1117]">{t.name}</option>)}
                </Sel>
              </Field>
              <Field label="Assignee">
                <Sel value={tkForm.assignee_id} onChange={e => setTkForm({ ...tkForm, assignee_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id} className="bg-[#0d1117]">{mName(m)}</option>)}
                </Sel>
              </Field>
              <Field label="Priority">
                <Sel value={tkForm.priority} onChange={e => setTkForm({ ...tkForm, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Sel>
              </Field>
              <Field label="Due Date"><Input type="date" value={tkForm.due_date} onChange={e => setTkForm({ ...tkForm, due_date: e.target.value })} /></Field>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Btn variant="secondary" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={modal === 'addTask' ? createTask : saveTask} disabled={saving || !tkForm.title.trim()}>
              {saving ? 'Saving…' : modal === 'addTask' ? 'Add Task' : 'Save Changes'}
            </Btn>
          </div>
        </Modal>
      )}

      {modal === 'notification' && (
        <Modal title="Send Announcement" onClose={() => setModal(null)}>
          <div className="space-y-4">
            <Field label="Title"><Input placeholder="Announcement headline…" value={nForm.title} onChange={e => setNForm({ ...nForm, title: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Target Role">
                <Sel value={nForm.target_role} onChange={e => setNForm({ ...nForm, target_role: e.target.value })}>
                  <option value="all">All Members</option>
                  <option value="presenter">Presenters</option>
                  <option value="reviewer">Reviewers</option>
                  <option value="organizer">Organizers</option>
                </Sel>
              </Field>
              <Field label="Target Team">
                <Sel value={nForm.target_team_id} onChange={e => setNForm({ ...nForm, target_team_id: e.target.value })}>
                  <option value="">All Teams</option>
                  {teams.map(t => <option key={t.id} value={t.id} className="bg-[#0d1117]">{t.name}</option>)}
                </Sel>
              </Field>
            </div>
            <Field label="Message"><Textarea className="h-28" placeholder="Write your announcement…" value={nForm.message} onChange={e => setNForm({ ...nForm, message: e.target.value })} /></Field>
          </div>
          <div className="flex gap-3 mt-6">
            <Btn variant="secondary" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={sendNotif} disabled={saving || !nForm.title.trim() || !nForm.message.trim()}>
              <Send size={14} />{saving ? 'Sending…' : 'Send'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OrganizerDashboard;