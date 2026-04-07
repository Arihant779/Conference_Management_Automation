import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, FileText, Users, CheckSquare, Square, Bell, Plus, X, Send,
  CheckCircle, XCircle, MapPin, Edit2, Trash2, ArrowRight,
  Search, Layers, Clock, Sparkles, Star, Check
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import EmailComposer from './EmailComposer';
import PaperAllocation from './PaperAllocation';
import EmailSettings from './EmailSettings';
import FeedbackManager from './FeedbackManager';

/* ─── helpers ─────────────────────────────────────────────── */
const cls = (...c) => c.filter(Boolean).join(' ');

const ROLE_STYLE = {
  organizer: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
  reviewer:  'bg-amber-500/10  text-amber-300  border-amber-500/25',
  presenter: 'bg-blue-500/10   text-blue-300   border-blue-500/25',
  member:    'bg-slate-500/10  text-slate-300  border-slate-500/25',
};
const PRIORITY_STYLE = {
  high:   'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low:    'bg-slate-500/10 text-slate-400 border-slate-500/20',
};
const TEAM_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f59e0b',
  '#10b981','#3b82f6','#ef4444','#06b6d4',
];
const VOLUNTEER_ROLE_LABELS = {
  logistics_head:    'Logistics Team',
  outreach_head:     'Outreach Team Head',
  organizer_head:    'Organizing Team Head',
  technical_head:    'Reviewing Team Head',
  program_coord:     'Event Management Team',
  social_coord:      'Social Media Coord.',
  volunteer_coord:   'Volunteer Coordinator',
  design_lead:       'Design Lead',
  web_lead:          'Website Lead',
  security_coord:    'Security Coordinator',
  registration_head: 'Registration Team',
  sponsorship_head:  'Sponsorship Team',
  hospitality_head:  'Hospitality Team',
  publication_head:  'Publications Team',
  finance_head:      'Finance Team',
};
const TEAM_TYPES = Object.entries(VOLUNTEER_ROLE_LABELS).map(([id, label]) => ({ id, label }));

/* ══════════════════════════════════════════════════════════
   STAR RATING COMPONENT
   - interactive: lets user pick 1–5
   - readonly: just displays a filled/half/empty star row
══════════════════════════════════════════════════════════ */
const StarRating = ({ value = 0, onChange, readonly = false, size = 14, className = '' }) => {
  const [hovered, setHovered] = useState(0);
  const display = readonly ? value : (hovered || value);

  return (
    <div className={cls('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(i)}
          onMouseEnter={() => !readonly && setHovered(i)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={cls(
            'transition-all',
            !readonly && 'cursor-pointer hover:scale-110',
            readonly && 'cursor-default',
          )}
          style={{ lineHeight: 1 }}
        >
          <Star
            size={size}
            className={cls(
              'transition-colors',
              i <= display
                ? 'text-amber-400 fill-amber-400'
                : 'text-slate-700',
              !readonly && i <= (hovered || 0) && 'text-amber-300 fill-amber-300',
            )}
          />
        </button>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   RATING BADGE  — compact inline display (avg + count)
══════════════════════════════════════════════════════════ */
const RatingBadge = ({ avg, count, size = 10 }) => {
  if (!avg) return (
    <span className="text-[9px] text-slate-700 italic">No ratings</span>
  );
  return (
    <span className="flex items-center gap-1">
      <Star size={size} className="text-amber-400 fill-amber-400 shrink-0" />
      <span className="text-[10px] font-bold text-amber-300">{avg.toFixed(1)}</span>
      <span className="text-[9px] text-slate-600">({count})</span>
    </span>
  );
};

/* ─── reusable primitives ──────────────────────────────────────────────────── */
const Modal = ({ title, onClose, children, width = 'max-w-lg' }) => (
  <div
    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={e => e.target === e.currentTarget && onClose()}
  >
    <div className={cls('bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full shadow-2xl max-h-[90vh] overflow-y-auto', width)}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-all">
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
      'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm',
      'focus:border-indigo-500 outline-none text-white placeholder-slate-600 transition-colors',
      className,
    )}
  />
);
const Sel = ({ children, className, ...props }) => (
  <select
    {...props}
    className={cls(
      'w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-2.5 text-sm',
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
      'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm',
      'focus:border-indigo-500 outline-none resize-none text-white placeholder-slate-600 transition-colors',
      className,
    )}
  />
);
const Btn = ({ variant = 'primary', children, className, ...props }) => {
  const base = 'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed';
  const v = {
    primary:   'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'border border-white/10 text-slate-400 hover:text-white hover:bg-white/5',
    danger:    'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
  };
  return <button {...props} className={cls(base, v[variant], className)}>{children}</button>;
};
const Empty = ({ icon: Icon, msg, action }) => (
  <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl">
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
      <div key={i} className="h-14 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
    ))}
  </div>
);

/* ══════════════════════════════════════════════════════════
   RATE MEMBER MODAL
   Shown when organizer clicks the star icon on a member row.
══════════════════════════════════════════════════════════ */
const RateMemberModal = ({ member, confId, organizerId, existingRating, onSave, onClose }) => {
  const [rating, setRating]     = useState(existingRating?.rating || 0);
  const [comment, setComment]   = useState(existingRating?.comment || '');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  const mName = (m) => m?.full_name || m?.email || m?.user_id?.slice(0, 8) || '?';

  const handleSave = async () => {
    if (!rating) { setError('Please select a star rating.'); return; }
    setSaving(true);
    setError('');

    const payload = {
      conference_id: confId,
      rated_user_id: member.user_id,
      rater_user_id: organizerId,
      rating,
      comment: comment.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let err;
    if (existingRating?.id) {
      ({ error: err } = await supabase
        .from('member_ratings')
        .update({ rating, comment: comment.trim() || null, updated_at: payload.updated_at })
        .eq('id', existingRating.id));
    } else {
      ({ error: err } = await supabase
        .from('member_ratings')
        .insert([{ ...payload, created_at: new Date().toISOString() }]));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  };

  return (
    <Modal title="Rate Member" onClose={onClose} width="max-w-md">
      {/* Member info */}
      <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
          {mName(member)[0]?.toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-semibold text-white">{mName(member)}</div>
          <div className="text-xs text-slate-500">{member.email}</div>
        </div>
        <div className="ml-auto text-xs text-slate-500 capitalize bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">
          {member.role}
        </div>
      </div>

      {/* Star picker */}
      <div className="mb-6">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-3">
          Your Rating
        </label>
        <div className="flex flex-col items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-5">
          <StarRating value={rating} onChange={setRating} size={28} />
          <div className="text-xs text-slate-500 h-4">
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </div>
        </div>
      </div>

      {/* Comment */}
      <Field label="Comment (optional)">
        <Textarea
          rows={3}
          placeholder="Share feedback about this member's contribution…"
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
      </Field>

      {error && (
        <p className="text-xs text-red-400 mt-3 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3 mt-6">
        <Btn variant="secondary" className="flex-1" onClick={onClose}>Cancel</Btn>
        <Btn className="flex-1" onClick={handleSave} disabled={saving || !rating}>
          {saving ? 'Saving…' : existingRating ? 'Update Rating' : 'Submit Rating'}
        </Btn>
      </div>
    </Modal>
  );
};

/* ══════════════════════════════════════════════════════════
   VOLUNTEER CANDIDATE PANEL  (now shows global avg rating)
══════════════════════════════════════════════════════════ */
const VolunteerCandidatePanel = ({
  allVolunteers, members, teamMembers, teamTypeId,
  confId, onAdd, onAddVolunteer,
  globalRatings,   // Map<user_id, { avg, count }>
}) => {
  const [search, setSearch]       = useState('');
  const [filterMode, setFilterMode] = useState('volunteers');
  const [adding, setAdding]       = useState(null);

  const alreadyInTeamUserIds = new Set(teamMembers.map(m => m.user_id));
  const alreadyInTeam        = new Set(teamMembers.map(m => m.id));
  const memberUserIds        = new Set(members.map(m => m.user_id));

  const mName  = (m) => m?.full_name || m?.user_name || m?.email || m?.user_email || m?.user_id?.slice(0, 8) || '?';
  const mEmail = (m) => m?.email || m?.user_email || '';
  const relevantRoleLabel = teamTypeId ? VOLUNTEER_ROLE_LABELS[teamTypeId] : null;

  const matchedVolunteers = (allVolunteers || [])
    .filter(u => !alreadyInTeamUserIds.has(u.user_id))
    .filter(u => !teamTypeId ? u.volunteer_roles?.length > 0 : u.volunteer_roles?.includes(teamTypeId))
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return mName(u).toLowerCase().includes(q) || mEmail(u).toLowerCase().includes(q);
    });

  const nonTeamMembers = members
    .filter(m => !alreadyInTeam.has(m.id))
    .filter(m => {
      if (!search) return true;
      const q = search.toLowerCase();
      return mName(m).toLowerCase().includes(q) || mEmail(m).toLowerCase().includes(q);
    });

  const candidates     = filterMode === 'volunteers' ? matchedVolunteers : nonTeamMembers;
  const volunteerCount = (allVolunteers || [])
    .filter(u => !alreadyInTeamUserIds.has(u.user_id))
    .filter(u => !teamTypeId ? u.volunteer_roles?.length > 0 : u.volunteer_roles?.includes(teamTypeId))
    .length;

  const handleAdd = async (candidate) => {
    if (adding) return;
    setAdding(candidate.user_id);
    try {
      if (filterMode === 'volunteers' && !memberUserIds.has(candidate.user_id)) {
        const confUserId = await onAddVolunteer(candidate);
        if (confUserId) onAdd(confUserId);
      } else if (filterMode === 'all') {
        onAdd(candidate.id);
      } else {
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
        <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10 text-xs">
          <button
            onClick={() => setFilterMode('volunteers')}
            className={cls(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5',
              filterMode === 'volunteers' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300',
            )}
          >
            <Sparkles size={11} />All Volunteers
            {volunteerCount > 0 && (
              <span className={cls('text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                filterMode === 'volunteers' ? 'bg-white/20 text-white' : 'bg-indigo-500/20 text-indigo-300')}>
                {volunteerCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={cls('px-3 py-1.5 rounded-md font-semibold transition-all',
              filterMode === 'all' ? 'bg-white text-black' : 'text-slate-500 hover:text-slate-300')}
          >
            Conf. Members
          </button>
        </div>
        {filterMode === 'volunteers' && (
          <span className="text-[10px] text-slate-600 italic">Includes users not yet in this conference</span>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 mb-3">
        <Search size={12} className="text-slate-600 shrink-0" />
        <input
          className="bg-transparent outline-none text-xs text-white placeholder-slate-600 flex-1"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
          placeholder="Search name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400"><X size={11} /></button>}
      </div>

      {/* List */}
      {candidates.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-white/10 rounded-xl">
          <p className="text-slate-600 text-xs">
            {filterMode === 'volunteers'
              ? 'No one on the platform has volunteered for this team type yet.'
              : 'No conference members available to add.'}
          </p>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
          {candidates.map(c => {
            const isVolTab         = filterMode === 'volunteers';
            const isAlreadyMember  = memberUserIds.has(c.user_id);
            const domains          = (c.volunteer_domains || []).slice(0, 2);
            const isAdding         = adding === c.user_id;
            const key              = c.user_id || c.id;
            const ratingInfo       = globalRatings?.[c.user_id];

            return (
              <div
                key={key}
                onClick={() => !isAdding && handleAdd(c)}
                className={cls(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all group',
                  isAdding ? 'opacity-50 cursor-wait' : 'cursor-pointer',
                  isVolTab
                    ? 'bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10 hover:border-indigo-500/35'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20',
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
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold">Not a member</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-600 truncate">{mEmail(c)}</div>

                  {/* Global avg rating */}
                  <div className="mt-0.5">
                    <RatingBadge avg={ratingInfo?.avg} count={ratingInfo?.count} size={9} />
                  </div>

                  {/* Preference tags */}
                  {(relevantRoleLabel || domains.length > 0) && isVolTab && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {relevantRoleLabel && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 uppercase tracking-wide">
                          {relevantRoleLabel}
                        </span>
                      )}
                      {domains.map(d => (
                        <span key={d} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500">{d}</span>
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


const UserPickerPanel = ({ confId, members, onSelect }) => {
  const [search, setSearch]       = useState('');
  const [allUsers, setAllUsers]   = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('user_id, user_name, user_email')
        .order('user_name', { ascending: true });
      if (!error) setAllUsers(data || []);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const existingUserIds = new Set(members.map(m => m.user_id));

  const filtered = allUsers
    .filter(u => !existingUserIds.has(u.user_id))
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.user_name?.toLowerCase().includes(q) ||
        u.user_email?.toLowerCase().includes(q)
      );
    });

  return (
    <div className="mt-1">
      {/* Search */}
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 mb-3">
        <Search size={12} className="text-slate-600 shrink-0" />
        <input
          className="bg-transparent outline-none text-xs text-white placeholder-slate-600 flex-1"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
          placeholder="Search by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400">
            <X size={11} />
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-white/10 rounded-xl">
          <p className="text-slate-600 text-xs">
            {search ? 'No users match your search.' : 'All registered users are already members.'}
          </p>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
          {filtered.map(u => (
            <div
              key={u.user_id}
              onClick={() => onSelect(u)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 cursor-pointer transition-all group"
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {(u.user_name || u.user_email)?.[0]?.toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 truncate">
                  {u.user_name || '(no name)'}
                </div>
                <div className="text-[10px] text-slate-600 truncate">{u.user_email}</div>
              </div>

              <span className="text-[9px] text-slate-600 group-hover:text-indigo-400 transition-colors font-semibold shrink-0">
                + Select
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN ORGANIZER DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
const OrganizerDashboard = ({ conf, onBack, onSwitchView }) => {
  const { user, permissions, userRoles } = useApp();
  const confId = conf.conference_id || conf.id;

  const [section, setSection]         = useState('overview');
  const [members, setMembers]         = useState([]);
  const [loadingMembers, setLM]       = useState(true);
  const [teams, setTeams]             = useState([]);
  const [loadingTeams, setLT]         = useState(true);
  const [tasks, setTasks]             = useState([]);
  const [loadingTasks, setLTasks]     = useState(true);

  /* ── navigation logic ────────────────────────────────── */
  useEffect(() => {
    if (section === 'site_preview') {
      onSwitchView('home');
      setSection('overview');
    }
  }, [section, onSwitchView, setSection]);

  /* ── identity ────────────────────────────────────────── */
  const myMember = members.find(m => m.user_id === user.id);
  const myMemberId = myMember?.id;
  const isGlobalHead = conf.conference_head_id === user.id;
  const isOrganizer = isGlobalHead || (userRoles && userRoles.includes('organizer'));
  const myHeadedTeamIds = teams.filter(t => t.head_id === myMemberId).map(t => t.id);
  const isTeamHead = !isOrganizer && myHeadedTeamIds.length > 0;

  /* ── permissions fallback ───────────────────────────── */
  const FALLBACK_PERMS = {
    organizer: ['view_dashboard','view_emails','send_emails','view_papers','manage_papers','allocate_papers','view_members','manage_members','view_teams','manage_teams','view_tasks','manage_tasks','view_notifications','send_notifications','find_speakers','view_feedback','manage_feedback', 'view_attendees'],
    organizer_head: ['view_dashboard','view_emails','send_emails','view_papers','manage_papers','allocate_papers','view_members','manage_members','view_teams','manage_teams','view_tasks','manage_tasks','view_notifications','send_notifications','find_speakers','view_feedback','manage_feedback', 'view_attendees'],
    programming_head: ['view_dashboard','view_papers','manage_papers','allocate_papers','view_members','view_notifications'],
    logistics_head: ['view_dashboard','view_teams','manage_teams','view_tasks','manage_tasks','view_notifications','view_attendees','manage_members'],
    outreach_head: ['view_dashboard','view_emails','send_emails', 'find_speakers','view_members','view_notifications','send_notifications'],
    feedback_head: ['view_dashboard','view_feedback','manage_feedback','view_notifications'],
    event_head: ['view_dashboard','view_teams','view_tasks', 'manage_tasks', 'view_members', 'view_notifications'],
    technical_head: ['view_dashboard','view_teams','view_tasks', 'manage_tasks', 'view_notifications', 'view_papers', 'manage_papers', 'allocate_papers'],
    registration_head: ['view_dashboard','view_members','manage_members','view_teams','view_notifications'],
    sponsorship_head: ['view_dashboard','view_emails','send_emails','view_notifications'],
    member: ['view_dashboard','view_teams','view_tasks','view_notifications']
  };

  // Generic fallback for any role ending in _head or _coord
  const getRolePermissions = (role) => {
    if (FALLBACK_PERMS[role]) return FALLBACK_PERMS[role];
    if (role.endsWith('_head') || role.endsWith('_coord') || role.endsWith('_lead')) {
      return ['view_dashboard', 'view_teams', 'view_tasks', 'manage_tasks', 'view_notifications', 'view_members'];
    }
    return [];
  };

  const effectivePermissions = Array.from(new Set([
    ...(permissions || []),
    ...(userRoles ? userRoles.flatMap(getRolePermissions) : [])
  ]));

  const can = (p) => effectivePermissions.includes(p);
  const roleLabel = isOrganizer ? 'Organizer' : ((userRoles || []).find(r => r !== 'team_head' && (r.endsWith('_head') || r.endsWith('_coord') || r.endsWith('_lead')))?.replace(/technical_head/g, 'Reviewing Team Head')?.replace(/outreach_head/g, 'Outreach Team Head')?.replace(/logistics_head/g, 'Logistics Team Head')?.replace(/event_head/g, 'Event Management Team Head')?.replace(/organizer_head/g, 'Organizing Team Head')?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || (userRoles?.includes('team_head') || isTeamHead ? 'Team Lead' : (userRoles?.includes('reviewer') ? 'Reviewer' : 'Team Member')));
  const dashboardTitle = isOrganizer ? 'Organizer Dashboard' : (roleLabel.includes('Head') || roleLabel.includes('Lead') || roleLabel.includes('Coord') ? `${roleLabel === 'Team Lead' ? 'Team' : roleLabel} Dashboard` : (isTeamHead || userRoles?.includes('team_head') ? 'Team Management' : 'Conference Dashboard'));
  const [notifs, setNotifs]           = useState([]);
  const [modal, setModal]             = useState(null);
  const [modalData, setModalData]     = useState(null);
  const [saving, setSaving]           = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [paperFilter, setPaperFilter] = useState('all');
  const [allVolunteers, setAllVolunteers] = useState([]);
  const [selectedAttendees, setSelectedAttendees] = useState(new Set());
  const [updatingBulk, setUpdatingBulk] = useState(false);

  /* ── rating state ─────────────────────────────────────── */
  // My ratings for this conference: Map<rated_user_id, { id, rating, comment }>
  const [myRatings, setMyRatings]     = useState({});
  // Global avg ratings across all conferences: Map<user_id, { avg, count }>
  const [globalRatings, setGlobalRatings] = useState({});
  // Which member is being rated right now
  const [ratingMember, setRatingMember] = useState(null);

  /* forms */
  const [mForm, setMForm]   = useState({ email: '', role: 'reviewer' });
  const [tmForm, setTmForm] = useState({ name: '', type: '', description: '', color: '#6366f1', head_id: '' });
  const [tkForm, setTkForm] = useState({ title: '', description: '', team_id: '', assignee_id: '', priority: 'medium', due_date: '' });
  const [nForm, setNForm]   = useState({ title: '', message: '', target_role: 'all', target_team_id: '' });

  /* speakers */
  const [spTopic, setSpTopic]     = useState('');
  const [spLimit, setSpLimit]     = useState(10);
  const [spSource, setSpSource]   = useState(5);
  const [spLoading, setSpLoading] = useState(false);
  const [spResults, setSpResults] = useState([]);
  const [spError, setSpError]     = useState('');

  /* papers */
  const [confPapers, setConfPapers] = useState([]);
  const [loadingPapers, setLP]      = useState(true);

  const pendingCount = confPapers.filter(p => p.status === 'pending').length;
  const accepted     = confPapers.filter(p => p.status === 'accepted').length;
  const rejected     = confPapers.filter(p => p.status === 'rejected').length;

  /* Current organizer's user_id — we store it after fetching the conf membership */
  const [organizerUserId, setOrganizerUserId] = useState(null);

  /* ── fetch ─────────────────────────────────────────────── */
  const fetchMembers = useCallback(async () => {
    setLM(true);
    const { data, error } = await supabase
      .from('conference_user')
      .select('id, user_id, role, email, full_name, joined_at, accommodation_required, accommodation_notes, users(user_name, user_email)')
      .eq('conference_id', confId)
      .order('joined_at', { ascending: false });

    if (error) console.error('fetchMembers error:', error);
    const enriched = (data || []).map(m => ({
      ...m,
      email:     m.email     || m.users?.user_email || '',
      full_name: m.full_name || m.users?.user_name  || '',
    }));
    setMembers(enriched);
    setLM(false);
    return enriched;
  }, [confId]);

  const handleBulkRoomUpdate = async (assign) => {
    if (selectedAttendees.size === 0) return;
    setUpdatingBulk(true);
    // Columns missing from schema.
    console.warn('Bulk room update skipped: columns missing from schema');
    setUpdatingBulk(false);
  };

  const handleSingleRoomUpdate = async (id, assign, roomNum = null) => {
    // room_assigned and room_number appear to be missing from the schema.
    // Disabling for now to prevent 400 errors.
    console.warn('Room update skipped: columns missing from schema');
  };

  const fetchAllVolunteers = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, user_name, user_email, volunteer_roles, volunteer_domains');
    if (error) { console.error('fetchAllVolunteers error:', error); return; }
    setAllVolunteers((data || []).filter(u => Array.isArray(u.volunteer_roles) && u.volunteer_roles.length > 0));
  }, []);

  const fetchPapers = useCallback(async () => {
    setLP(true);
    const { data, error } = await supabase
      .from('paper')
      .select('paper_id,paper_title,abstract,keywords,research_area,status,file_url,author_id,users(user_name,user_email),paper_assignments(status)')
      .eq('conference_id', confId)
      .order('paper_id', { ascending: false });

    if (error) console.error('fetchPapers error:', error);
    const paperMap = {};
    (data || []).forEach(p => {
      const title    = p.paper_title || 'Untitled';
      const hasAssign = p.paper_assignments?.length > 0;
      if (!paperMap[title] || (hasAssign && !paperMap[title].paper_assignments?.length)) paperMap[title] = p;
    });
    const deduped = Object.values(paperMap);
    setConfPapers(deduped);
    setLP(false);

    // Auto-sync consensus status to DB and local state
    const syncConsensus = async () => {
      let stateChanged = false;
      const updatedList = deduped.map(p => {
        if (p.paper_assignments?.length > 0 && p.status === 'pending') {
          const total = p.paper_assignments.length;
          const acc = p.paper_assignments.filter(a => a.status === 'accepted').length;
          const pen = p.paper_assignments.filter(a => a.status === 'pending').length;

          let consensus = 'pending';
          if (total > 0) {
            const threshold = 0.66;
            if ((acc / total) >= threshold) {
              consensus = 'accepted';
            } else if (((acc + pen) / total) < threshold) {
              consensus = 'rejected';
            } else {
              consensus = 'pending';
            }
          }

          if (p.status !== consensus) {
            console.log(`Syncing consensus for "${p.paper_title}": ${p.status} -> ${consensus}`);
            supabase.from('paper').upsert({
              paper_id: p.paper_id,
              status: consensus,
              conference_id: confId
            }, { onConflict: 'paper_id' }).then();
            stateChanged = true;
            return { ...p, status: consensus };
          }
        }
        return p;
      });

      if (stateChanged) setConfPapers(updatedList);
    };

    syncConsensus();
  }, [confId]);

  const updatePaperStatus = async (paperId, newStatus) => {
    console.log(`[Organizer] Updating paper ${paperId} to ${newStatus}`);
    setSaving(true);
    const { error } = await supabase
      .from('paper')
      .upsert({
        paper_id: paperId,
        status: newStatus,
        conference_id: confId
        // Note: we rely on paper_id to trigger an update; paper_title is omitted intentionally
      }, { onConflict: 'paper_id' });

    setSaving(false);
    if (error) {
      console.error('updatePaperStatus error:', error);
      alert(`Failed to update status: ${error.message}`);
      return;
    }

    setConfPapers(prev =>
      prev.map(p => p.paper_id === paperId ? { ...p, status: newStatus } : p)
    );
  };

  const fetchTeams = useCallback(async () => {
    setLT(true);
    const { data: td } = await supabase.from('conference_teams').select('*').eq('conference_id', confId).order('created_at', { ascending: true });
    if (td) {
      const { data: tmData } = await supabase.from('team_members').select('team_id,user_id,conference_user_id').in('team_id', td.map(t => t.id));
      const map = {};
      (tmData || []).forEach(tm => { (map[tm.team_id] = map[tm.team_id] || []).push(tm); });
      setTeams(td.map(t => ({ ...t, memberList: map[t.id] || [] })));
    } else setTeams([]);
    setLT(false);
  }, [confId]);

  const fetchTasks = useCallback(async () => {
    setLTasks(true);
    const { data } = await supabase.from('conference_tasks').select('*').eq('conference_id', confId).order('created_at', { ascending: false });
    setTasks(data || []);
    setLTasks(false);
  }, [confId]);

  const fetchNotifs = useCallback(async () => {
    const { data } = await supabase.from('notifications').select('*').eq('conference_id', confId).order('created_at', { ascending: false }).limit(20);
    setNotifs(data || []);
  }, [confId]);

  /* ── Ratings fetch ─────────────────────────────────────── */

  /* My ratings for THIS conference (so organizer can see/edit their own ratings) */
  const fetchMyRatings = useCallback(async (orgUserId) => {
    if (!orgUserId) return;
    const { data, error } = await supabase
      .from('member_ratings')
      .select('id, rated_user_id, rating, comment')
      .eq('conference_id', confId)
      .eq('rater_user_id', orgUserId);

    if (error) { console.error('fetchMyRatings error:', error); return; }
    const map = {};
    (data || []).forEach(r => { map[r.rated_user_id] = r; });
    setMyRatings(map);
  }, [confId]);

  /* Global average ratings across ALL conferences for ALL users */
  const fetchGlobalRatings = useCallback(async () => {
    const { data, error } = await supabase
      .from('member_ratings')
      .select('rated_user_id, rating');

    if (error) { console.error('fetchGlobalRatings error:', error); return; }

    // Aggregate client-side: { user_id => { sum, count } }
    const agg = {};
    (data || []).forEach(r => {
      if (!agg[r.rated_user_id]) agg[r.rated_user_id] = { sum: 0, count: 0 };
      agg[r.rated_user_id].sum   += r.rating;
      agg[r.rated_user_id].count += 1;
    });

    const result = {};
    Object.entries(agg).forEach(([uid, { sum, count }]) => {
      result[uid] = { avg: sum / count, count };
    });
    setGlobalRatings(result);
  }, []);

  /* Resolve current organizer's user_id from Supabase auth */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id;
      if (uid) {
        setOrganizerUserId(uid);
        fetchMyRatings(uid);
      }
    });
  }, [fetchMyRatings]);

  useEffect(() => {
    fetchMembers();
    fetchAllVolunteers();
    fetchTeams();
    fetchTasks();
    fetchNotifs();
    fetchPapers();
    fetchGlobalRatings();
  }, [fetchMembers, fetchAllVolunteers, fetchTeams, fetchTasks, fetchNotifs, fetchPapers, fetchGlobalRatings]);

  /* ── member CRUD ─────────────────────────────────────────── */

  const updateRole = async (id, role) => {
    const { error } = await supabase.from('conference_user').update({ role }).eq('id', id);
    if (error) { alert(error.message); return; }
    setMembers(ms => ms.map(m => m.id === id ? { ...m, role } : m));
  };

  const removeMember = async (id) => {
    await supabase.from('conference_user').delete().eq('id', id);
    fetchMembers(); fetchTeams();
  };

  /* ── team CRUD ───────────────────────────────────────────── */
  const createTeam = async () => {
    if (!tmForm.name.trim()) return;
    setSaving(true);
    const { data: newTeam, error } = await supabase.from('conference_teams').insert([{ conference_id: confId, name: tmForm.name.trim(), description: tmForm.description.trim(), color: tmForm.color, head_id: tmForm.head_id || null, created_at: new Date().toISOString() }]).select().single();
    
    // RBAC: If a head is assigned and the type is a known role, map it
    if (!error && newTeam && tmForm.head_id && tmForm.type && tmForm.type !== 'custom') {
      await supabase.from('conference_user_roles_mapping').upsert({
        conference_user_id: tmForm.head_id,
        role_name: tmForm.type
      }, { onConflict: 'conference_user_id,role_name' });
    }

    setSaving(false);
    if (!error) { setModal(null); setTmForm({ name: '', type: '', description: '', color: '#6366f1', head_id: '' }); fetchTeams(); } else alert(error.message);
  };

  const saveTeam = async () => {
    if (!tmForm.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('conference_teams').update({ name: tmForm.name.trim(), description: tmForm.description.trim(), color: tmForm.color, head_id: tmForm.head_id || null }).eq('id', modalData.id);
    
    // RBAC: Sync roles if team type or head changed
    if (!error && tmForm.head_id) {
      // 1. If type changed, remove the OLD role first
      if (tmForm.type !== tmForm.originalType && tmForm.originalType && tmForm.originalType !== 'custom') {
        await supabase.from('conference_user_roles_mapping')
          .delete()
          .eq('conference_user_id', tmForm.head_id)
          .eq('role_name', tmForm.originalType);
      }
      // 2. Add/Update the NEW role
      if (tmForm.type && tmForm.type !== 'custom') {
        await supabase.from('conference_user_roles_mapping').upsert({
          conference_user_id: tmForm.head_id,
          role_name: tmForm.type
        }, { onConflict: 'conference_user_id,role_name' });
      }
    }

    setSaving(false); setModal(null); fetchTeams();
  };

  const deleteTeam = async (id) => {
    await supabase.from('team_members').delete().eq('team_id', id);
    await supabase.from('conference_teams').delete().eq('id', id);
    fetchTeams(); fetchTasks();
  };


  const addToTeam = async (teamId, confUserId) => {
    const member = members.find(m => m.id === confUserId);
    if (!member) return;
    
    // Check if already in team
    const team = teams.find(t => t.id === teamId);
    if (team?.memberList.some(tm => tm.conference_user_id === confUserId)) {
      alert('Already in team.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('team_members').insert([{
      conference_id: confId,
      team_id: teamId,
      user_id: member.user_id,
      conference_user_id: confUserId
    }]);
    setSaving(false);

    if (error) {
      alert(`Add error: ${error.message}`);
    } else {
      fetchTeams();
    }
  };

  const removeFromTeam = async (teamId, confUserId) => {
    setSaving(true);
    const { error } = await supabase.from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('conference_user_id', confUserId);
    setSaving(false);
    
    if (error) {
      alert(`Remove error: ${error.message}`);
    } else {
      fetchTeams();
    }
  };

  /* ── task CRUD ───────────────────────────────────────────── */
  const createTask = async () => {
    if (!tkForm.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('conference_tasks').insert([{ conference_id: confId, title: tkForm.title.trim(), description: tkForm.description || null, team_id: tkForm.team_id || null, assignee_id: tkForm.assignee_id || null, priority: tkForm.priority, due_date: tkForm.due_date || null, status: 'pending', created_at: new Date().toISOString() }]);
    setSaving(false);
    if (!error) { setModal(null); setTkForm({ title: '', description: '', team_id: '', assignee_id: '', priority: 'medium', due_date: '' }); fetchTasks(); } else alert(error.message);
  };

  const saveTask = async () => {
    if (!tkForm.title.trim()) return;
    setSaving(true);
    await supabase.from('conference_tasks').update({ title: tkForm.title.trim(), description: tkForm.description || null, team_id: tkForm.team_id || null, assignee_id: tkForm.assignee_id || null, priority: tkForm.priority, due_date: tkForm.due_date || null }).eq('id', modalData.id);
    setSaving(false); setModal(null); fetchTasks();
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

  /* ── notif ───────────────────────────────────────────────── */
  const sendNotif = async () => {
    if (!nForm.title.trim() || !nForm.message.trim()) return;
    setSaving(true);
    const payload = { conference_id: confId, title: nForm.title.trim(), message: nForm.message.trim(), target_role: nForm.target_role === 'all' ? null : nForm.target_role, target_team_id: nForm.target_team_id || null, created_at: new Date().toISOString() };
    const { error } = await supabase.from('notifications').insert([payload]);
    setSaving(false);
    if (!error) { setNotifs(p => [{ ...payload, id: Date.now() }, ...p]); setModal(null); setNForm({ title: '', message: '', target_role: 'all', target_team_id: '' }); }
  };

  /* ── speakers ────────────────────────────────────────────── */
  const findSpeakers = async () => {
    if (!spTopic.trim()) return;
    setSpLoading(true); setSpError(''); setSpResults([]);
    try {
      const res = await fetch(`http://localhost:4000/api/speakers?topic=${encodeURIComponent(spTopic)}&limit=${spLimit}&source=${spSource}`);
      if (!res.ok) throw new Error('Server error');
      setSpResults(await res.json());
    } catch { setSpError('Failed to fetch speakers. Make sure your backend is running.'); }
    setSpLoading(false);
  };

  /* ── ui helpers ──────────────────────────────────────────── */
  const mName        = (m) => m?.full_name || m?.email || m?.user_id?.substring(0, 8) || '?';
  const teamName     = (id) => teams.find(t => t.id === id)?.name || '—';
  const assigneeName = (id) => { const m = members.find(m => m.id === id || m.user_id === id); return m ? mName(m) : '—'; };

  const filteredMembers = members.filter(m =>
  m.role !== 'attendee' && (
    !memberSearch ||
    mName(m).toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email?.toLowerCase().includes(memberSearch.toLowerCase())
  )
);

// Add this right below:
const attendees = members.filter(m => m.role === 'attendee');
const filteredAttendees = attendees.filter(m =>
  !memberSearch ||
  mName(m).toLowerCase().includes(memberSearch.toLowerCase()) ||
  m.email?.toLowerCase().includes(memberSearch.toLowerCase())
);

  const volunteerMap   = Object.fromEntries(allVolunteers.map(u => [u.user_id, { volunteer_roles: u.volunteer_roles || [], volunteer_domains: u.volunteer_domains || [] }]));
  const volunteersCount = allVolunteers.length;

  const openEditTeam = (t) => {
    setModalData(t);
    const matchedType = Object.entries(VOLUNTEER_ROLE_LABELS).find(([, label]) => label === t.name)?.[0] || 'custom';
    setTmForm({ name: t.name, type: matchedType, originalType: matchedType, description: t.description || '', color: t.color || '#6366f1', head_id: t.head_id || '' });
    setModal('editTeam');
  };
  const openEditTask = (t) => {
    setModalData(t);
    setTkForm({ title: t.title, description: t.description || '', team_id: t.team_id || '', assignee_id: t.assignee_id || '', priority: t.priority || 'medium', due_date: t.due_date || '' });
    setModal('editTask');
  };

  const nav = [
    { id: 'overview',      label: 'Overview',        icon: BarChart2,   badge: null, permission: 'view_dashboard' },
    { id: 'papers',        label: 'Papers',           icon: FileText,    badge: pendingCount || null, permission: 'view_papers' },
    { id: 'members',       label: 'Members',          icon: Users,       badge: null, permission: 'view_members' },
    { id: 'attendees',     label: 'Attendees',        icon: Users,       badge: null, permission: 'view_attendees' },
    { id: 'teams',         label: 'Teams',            icon: Layers,      badge: null, permission: 'view_teams' },
    { id: 'tasks',         label: 'Tasks',            icon: CheckSquare, badge: tasks.filter(t => t.status !== 'done').length || null, permission: 'view_tasks' },
    { id: 'notifications', label: 'Notifications',    icon: Bell,        badge: null, permission: 'view_notifications' },
    { id: 'emails',        label: 'Emails',           icon: Send,        badge: null, permission: 'view_emails' },
    { id: 'speakers',      label: 'Find Speakers',    icon: Users,       badge: null, permission: 'find_speakers' },
    { id: 'allocation',    label: 'Paper Allocation', icon: FileText,    badge: null, permission: 'allocate_papers' },
    { id: 'feedback',      label: 'Feedback',         icon: Star,        badge: null, permission: 'view_feedback' },
    { id: 'site_preview',  label: 'Site Preview',     icon: Sparkles,    badge: null },
  ].filter(item => !item.permission || can(item.permission));

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#080b11] text-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />



      <div className="max-w-[1400px] mx-auto flex">
        {/* SIDEBAR */}
        <aside className="w-52 shrink-0 sticky top-0 h-screen border-r border-white/10 py-5 px-2.5 flex flex-col gap-0.5 overflow-y-auto">
          <div className="px-3 mb-6">
            <div className="text-[11px] text-indigo-400 font-bold uppercase tracking-widest flex items-center gap-2">
              {(isOrganizer || isTeamHead || userRoles?.includes('team_head')) && <Star size={12} className="fill-current" />}
              {dashboardTitle}
            </div>
          </div>
          {nav.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={cls(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all',
                section === id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5',
              )}
            >
              <Icon size={15} className={section === id ? 'text-indigo-400' : ''} />
              <span className="flex-1">{label}</span>
              {badge ? <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold">{badge}</span> : null}
            </button>
          ))}
          <div className="mt-auto px-2 pb-2">
            <button onClick={onBack} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-slate-500 hover:text-white hover:bg-white/5 transition-all">
              <ArrowRight className="rotate-180" size={15} />
              Back to Hub
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8 min-h-screen">

          {/* ═══ OVERVIEW ═══ */}
          {section === 'overview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Event Overview</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Real-time conference metrics</p>
                </div>
                {isGlobalHead && (
                  <Btn variant="danger" onClick={() => setModal('deleteConference')}>
                    <Trash2 size={14} /> Delete Conference
                  </Btn>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Members',   value: members.filter(m => m.role !== 'attendee').length, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                  { label: 'Attendees', value: members.filter(m => m.role === 'attendee').length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Teams',      value: teams.length,                                 color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  { label: 'Papers',     value: confPapers.length,                            color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
                  { label: 'Open Tasks', value: tasks.filter(t => t.status !== 'done').length, color: 'text-amber-400', bg: 'bg-amber-500/10'  },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={cls('rounded-xl p-5 border border-white/10', bg)}>
                    <div className={cls('text-3xl font-bold mb-1', color)}>{value}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>

              {volunteersCount > 0 && (
                <div className="bg-[#0d1117] border border-indigo-500/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={14} className="text-indigo-400" />
                    <span className="text-sm font-semibold text-slate-300">Volunteer Preferences</span>
                    <span className="text-xs text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md font-bold ml-auto">{volunteersCount} platform volunteers</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(VOLUNTEER_ROLE_LABELS).filter(([id]) =>
                      Object.values(volunteerMap).some(p => p.volunteer_roles?.includes(id))
                    ).map(([id, label]) => (
                      <span key={id} className="text-[10px] font-semibold px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/15 text-indigo-300">{label}</span>
                    ))}
                  </div>
                </div>
              )}

              {confPapers.length > 0 && (
                <div className="bg-[#0d1117] border border-white/10 rounded-xl p-5">
                  <div className="flex justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-300">Paper Review Progress</span>
                    <button onClick={() => setSection('papers')} className="text-xs text-indigo-400 hover:text-indigo-300">View all →</button>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${(accepted / confPapers.length) * 100}%` }} />
                    <div className="bg-red-500 h-full"     style={{ width: `${(rejected / confPapers.length) * 100}%` }} />
                    <div className="bg-amber-500 h-full"   style={{ width: `${(pendingCount / confPapers.length) * 100}%` }} />
                  </div>
                  <div className="flex gap-5 mt-3 text-xs text-slate-500">
                    {[['bg-emerald-500','Accepted',accepted],['bg-red-500','Rejected',rejected],['bg-amber-500','Pending',pendingCount]].map(([c,l,v]) => (
                      <span key={l} className="flex items-center gap-1.5"><span className={cls('w-2 h-2 rounded-full inline-block', c)} />{l} {v}</span>
                    ))}
                  </div>
                </div>
              )}

              {teams.length > 0 && (
                <div className="bg-[#0d1117] border border-white/10 rounded-xl p-5">
                  <div className="flex justify-between mb-4">
                    <span className="text-sm font-semibold text-slate-300">Teams</span>
                    {can('manage_teams') && <button onClick={() => setSection('teams')} className="text-xs text-indigo-400 hover:text-indigo-300">Manage →</button>}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {teams.slice(0, 6).map(t => (
                      <div key={t.id} className="flex items-center gap-2.5 bg-white/5 rounded-lg p-2.5 border border-white/5">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                        <span className="text-xs font-semibold text-slate-300 truncate flex-1">{t.name}</span>
                        <span className="text-[10px] text-slate-600">{t.memberList?.length || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#0d1117] border border-white/10 rounded-xl p-5">
                <div className="flex justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-300">Task Completion</span>
                  {can('manage_tasks') && <button onClick={() => setSection('tasks')} className="text-xs text-indigo-400 hover:text-indigo-300">Manage →</button>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: tasks.length > 0 ? `${(tasks.filter(t => t.status === 'done').length / tasks.length) * 100}%` : '0%' }} />
                  </div>
                  <span className="text-xs text-slate-500 font-semibold shrink-0">{tasks.filter(t => t.status === 'done').length}/{tasks.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PAPERS ═══ */}
          {section === 'papers' && (() => {
            const fp = confPapers.filter(p => paperFilter === 'all' || p.status === paperFilter);
            const authorName = (p) => p.users?.user_name || p.users?.user_email || p.author_id?.slice(0, 8) || 'Unknown';
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Paper Submissions</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{confPapers.length} total · {pendingCount} pending review</p>
                </div>
                <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit border border-white/10">
                  {[['all',`All (${confPapers.length})`],['pending',`Pending (${pendingCount})`],['accepted',`Accepted (${accepted})`],['rejected',`Rejected (${rejected})`]].map(([k,l]) => (
                    <button key={k} onClick={() => setPaperFilter(k)} className={cls('px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all', paperFilter === k ? 'bg-white text-black' : 'text-slate-500 hover:text-slate-200')}>{l}</button>
                  ))}
                </div>
                {loadingPapers ? <LoadingRows /> : fp.length === 0 ? <Empty icon={FileText} msg="No papers match this filter." /> : (
                  <div className="space-y-3">
                    {fp.map(paper => (
                      <div key={paper.paper_id} className="bg-[#0d1117] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                              {paper.paper_title?.charAt(0)?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white text-sm leading-snug mb-1">{paper.paper_title || 'Untitled'}</div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <span>By {authorName(paper)}</span>
                                {paper.research_area && <><span className="text-slate-700">·</span><span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">{paper.research_area}</span></>}
                              </div>
                              {paper.abstract && <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">{paper.abstract}</p>}
                              {paper.paper_assignments?.length > 0 && (() => {
                                const acc = paper.paper_assignments.filter(a => a.status === 'accepted').length;
                                const rej = paper.paper_assignments.filter(a => a.status === 'rejected').length;
                                const pen = paper.paper_assignments.filter(a => a.status === 'pending').length;
                                return (
                                  <div className="flex gap-2 mt-2">
                                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><CheckCircle size={10} />{acc} Accept</span>
                                    <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><XCircle size={10} />{rej} Reject</span>
                                    {pen > 0 && <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1"><Clock size={10} />{pen} Pending</span>}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className={cls('px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border',
                              paper.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              paper.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                              {paper.status === 'accepted' || paper.status === 'rejected' ? paper.status : 'Pending'}
                            </span>

                            <div className="flex items-center gap-1.5 relative z-10">
                              {paper.file_url && (
                                <a
                                  href={paper.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-all"
                                  onClick={e => e.stopPropagation()}
                                >
                                  View File →
                                </a>
                              )}
                              {(can('manage_papers') && (paper.status === 'pending' || !paper.status)) && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); updatePaperStatus(paper.paper_id, 'accepted'); }}
                                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer active:scale-95"
                                  >
                                    <CheckCircle size={12} /> Accept
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); updatePaperStatus(paper.paper_id, 'rejected'); }}
                                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer active:scale-95"
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
                    {volunteersCount > 0 && <span className="ml-2 text-indigo-400 font-semibold">· {volunteersCount} with volunteer preferences</span>}
                  </p>
                </div>
                {can('manage_members') && <Btn onClick={() => setModal('addMember')}><Plus size={15} />Add Member</Btn>}
              </div>

              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5">
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
                      const prefs    = volunteerMap[m.user_id];
                      const hasVol   = prefs?.volunteer_roles?.length > 0;
                      const myRating = myRatings[m.user_id];
                      const gRating  = globalRatings[m.user_id];

                      return (
                        <div key={m.id} className="bg-[#0d1117] border border-white/10 rounded-xl px-5 py-3.5 flex items-center gap-4 hover:border-white/20 transition-all group">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {mName(m)[0]?.toUpperCase()}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold text-white truncate">{mName(m)}</span>
                              {hasVol && <Star size={10} className="text-indigo-400 fill-indigo-400 shrink-0" title="Has volunteer preferences" />}
                            </div>
                            {isOrganizer && <div className="text-xs text-slate-500 truncate">{m.email || m.user_id}</div>}

                            {/* Rating row */}
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              {/* My rating for this conf */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-slate-600 uppercase tracking-wider font-bold">My rating:</span>
                                <StarRating
                                  value={myRating?.rating || 0}
                                  readonly
                                  size={10}
                                />
                                {!myRating && <span className="text-[9px] text-slate-700 italic">not rated</span>}
                              </div>
                              {/* Global avg */}
                              {gRating && (
                                <>
                                  <span className="text-slate-700 text-[9px]">·</span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] text-slate-600 uppercase tracking-wider font-bold">Global avg:</span>
                                    <RatingBadge avg={gRating.avg} count={gRating.count} size={9} />
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Volunteer roles */}
                            {hasVol && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {prefs.volunteer_roles.slice(0, 3).map(r => (
                                  <span key={r} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase tracking-wide">
                                    {VOLUNTEER_ROLE_LABELS[r] || r}
                                  </span>
                                ))}
                                {prefs.volunteer_roles.length > 3 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-500">+{prefs.volunteer_roles.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Rate button — amber star with tooltip */}
                            <button
                              onClick={() => setRatingMember(m)}
                              title={myRating ? `Your rating: ${myRating.rating}/5 — click to update` : 'Rate this member'}
                              className={cls(
                                'p-1.5 rounded-lg transition-all flex items-center gap-1',
                                myRating
                                  ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
                                  : 'text-slate-600 hover:text-amber-400 hover:bg-amber-500/10',
                              )}
                            >
                              <Star size={15} className={myRating ? 'fill-amber-400' : ''} />
                              {myRating && <span className="text-[10px] font-bold">{myRating.rating}</span>}
                            </button>

                            {isOrganizer ? (
                              <>
                                <select
                                  value={m.role}
                                  onChange={e => updateRole(m.id, e.target.value)}
                                  className={cls('text-xs font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider bg-transparent cursor-pointer outline-none', ROLE_STYLE[m.role] || ROLE_STYLE.member)}
                                >
                                  {['organizer','reviewer','presenter','member'].map(r => (
                                    <option key={r} value={r} className="bg-[#0d1117] text-white normal-case">{r === 'member' ? 'Team Member' : r}</option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => { setModalData(m); setModal('confirmDelete'); }}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            ) : (
                              <div className={cls('text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-widest', ROLE_STYLE[m.role] || ROLE_STYLE.member)}>
                                {m.role === 'member' ? 'Team Member' : m.role}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {/* ═══ ATTENDEES ═══ */}
{section === 'attendees' && (
  <div className="space-y-6 pb-20">
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold text-white">Attendees</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          {attendees.length} registered attendee{attendees.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>

    {/* Logistics Stats */}
    {roleLabel.includes('Logistics') || isOrganizer ? (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Registered</div>
          <div className="text-2xl font-bold text-white">{attendees.length}</div>
        </div>
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4">
          <div className="text-[10px] text-emerald-500/70 uppercase tracking-widest font-bold mb-1">Room Assigned</div>
          <div className="text-2xl font-bold text-emerald-400">{attendees.filter(a => a.room_assigned).length}</div>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4">
          <div className="text-[10px] text-amber-500/70 uppercase tracking-widest font-bold mb-1">Pending Allotment</div>
          <div className="text-2xl font-bold text-amber-400">{attendees.filter(a => !a.room_assigned).length}</div>
        </div>
      </div>
    ) : null}

    {/* Search & Select All */}
    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 flex-1 w-full">
        <Search size={14} className="text-slate-500 shrink-0" />
        <input
          className="bg-transparent outline-none text-sm text-white placeholder-slate-600 flex-1"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
          placeholder="Search by name or email…"
          value={memberSearch}
          onChange={e => setMemberSearch(e.target.value)}
        />
        {memberSearch && <button onClick={() => setMemberSearch('')} className="text-slate-600 hover:text-slate-400"><X size={13} /></button>}
      </div>

      <div className="flex items-center gap-4 w-full sm:w-auto">
        <button
          disabled={filteredAttendees.length === 0}
          onClick={() => {
            if (selectedAttendees.size === filteredAttendees.length && filteredAttendees.length > 0) setSelectedAttendees(new Set());
            else setSelectedAttendees(new Set(filteredAttendees.map(a => a.id)));
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {selectedAttendees.size === filteredAttendees.length && filteredAttendees.length > 0 ? <CheckSquare size={14} className="text-indigo-400" /> : <Square size={14} />}
          {selectedAttendees.size === filteredAttendees.length && filteredAttendees.length > 0 ? 'Deselect All' : 'Select All'}
        </button>

        {attendees.length > 0 && (
          <button
            onClick={() => {
              const headers = ['Name', 'Email', 'Joined', 'Accommodation Required', 'Room Assigned', 'Room Number'];
              const rows = attendees.map(a => [
                mName(a),
                a.email || '',
                a.joined_at ? new Date(a.joined_at).toLocaleDateString() : '',
                a.accommodation_required ? 'Yes' : 'No',
                a.room_assigned ? 'Yes' : 'No',
                a.room_number || ''
              ]);
              const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a'); link.href = url; link.download = `attendees-${confId}.csv`; link.click(); URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <FileText size={14} /> Export
          </button>
        )}
      </div>
    </div>

    {/* Bulk Action Bar */}
    {selectedAttendees.size > 0 && (
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-500/40 border border-indigo-400/30 px-6 py-4 flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-2 border-r border-indigo-400/30 pr-6">
          <div className="w-6 h-6 rounded-full bg-white text-indigo-600 flex items-center justify-center text-xs font-black">{selectedAttendees.size}</div>
          <span className="text-xs font-bold uppercase tracking-widest">Selected</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={updatingBulk}
            onClick={() => handleBulkRoomUpdate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all disabled:opacity-50"
          >
            <CheckCircle size={14} /> Mark Assigned
          </button>
          <button
            disabled={updatingBulk}
            onClick={() => handleBulkRoomUpdate(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all disabled:opacity-50"
          >
            <XCircle size={14} /> Mark Unassigned
          </button>
        </div>
        <button onClick={() => setSelectedAttendees(new Set())} className="text-indigo-200 hover:text-white transition-colors"><X size={16} /></button>
      </div>
    )}

    {loadingMembers ? (
      <LoadingRows />
    ) : filteredAttendees.length === 0 ? (
      <Empty icon={Users} msg={attendees.length === 0 ? 'No attendees have registered yet.' : 'No attendees match your search.'} />
    ) : (
      <div className="space-y-2">
        {filteredAttendees.map((a) => (
          <div
            key={a.id}
            onClick={() => {
              const next = new Set(selectedAttendees);
              if (next.has(a.id)) next.delete(a.id); else next.add(a.id);
              setSelectedAttendees(next);
            }}
            className={cls(
              'group bg-[#0d1117] border rounded-xl px-5 py-4 flex items-center gap-4 transition-all cursor-pointer',
              selectedAttendees.has(a.id) ? 'border-indigo-500 bg-indigo-500/5 shadow-lg shadow-indigo-500/5' : 'border-white/10 hover:border-white/20'
            )}
          >
            {/* Checkbox */}
            <div className={cls('w-5 h-5 rounded-md border flex items-center justify-center transition-all', selectedAttendees.has(a.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-700 bg-white/5')}>
              {selectedAttendees.has(a.id) && <Check size={12} className="text-white" />}
            </div>

            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {mName(a)[0]?.toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">{mName(a)}</div>
              <div className="text-xs text-slate-500 truncate">{a.email}</div>
            </div>

            {/* Logistics Controls */}
            <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
              {(roleLabel.includes('Logistics') || isOrganizer) ? (
                <button
                  onClick={() => handleSingleRoomUpdate(a.id, !a.room_assigned)}
                  className={cls(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all',
                    a.room_assigned 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  )}
                >
                  {a.room_assigned ? <CheckCircle size={10} /> : <Clock size={10} />}
                  {a.room_assigned ? 'Room Assigned' : 'Awaiting Room'}
                </button>
              ) : (
                a.room_assigned && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                    <CheckCircle size={10} /> Room Assigned
                  </div>
                )
              )}
              
              {isOrganizer && (
                <button
                  onClick={() => { setModalData(a); setModal('confirmDelete'); }}
                  className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

          {/* ═══ TEAMS ═══ */}
          {section === 'teams' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-white">Teams</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{teams.filter(t => isOrganizer || t.head_id === myMemberId).length} teams</p>
                </div>
                {isOrganizer && (
                  <Btn onClick={() => { setTmForm({ name:'',type:'',originalType:'',description:'',color:'#6366f1',head_id:'' }); setModal('createTeam'); }}>
                    <Plus size={15} />Create Team
                  </Btn>
                )}
              </div>
              
              {loadingTeams ? <LoadingRows /> : teams.length === 0
                ? <Empty icon={Layers} msg="No teams yet." action={{ label: isOrganizer ? '+ Create Team' : null, onClick: () => setModal('createTeam') }} />
                : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teams.filter(t => isOrganizer || t.head_id === myMemberId).map(team => {
                      const teamMembers = team.memberList.map(tm => members.find(m => m.id === tm.conference_user_id || m.user_id === tm.user_id)).filter(Boolean);
                      const head = team.head_id ? members.find(m => m.id === team.head_id) : null;

                      return (
                        <div key={team.id} className="bg-[#0d1117] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all flex flex-col h-full">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: team.color }} />
                            <h3 className="font-bold text-white flex-1 truncate">{team.name}</h3>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditTeam(team)} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/5 transition-all"><Edit2 size={13} /></button>
                              {isOrganizer && (
                                <button onClick={() => { if (window.confirm(`Delete team "${team.name}"?`)) deleteTeam(team.id); }} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13} /></button>
                              )}
                            </div>
                          </div>

                          {team.description && <p className="text-xs text-slate-500 mb-4 line-clamp-2">{team.description}</p>}

                          <div className="flex-1 space-y-4">
                             {/* Team Head */}
                             {head && (
                               <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-2">
                                  <div className="text-[9px] text-indigo-400 uppercase font-bold tracking-wider mb-1">Team Head</div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">{mName(head)[0]?.toUpperCase()}</div>
                                    <span className="text-xs text-indigo-300 font-semibold truncate">{mName(head)}</span>
                                  </div>
                               </div>
                             )}

                             {/* Member summary */}
                             <div>
                               <div className="text-[9px] text-slate-600 uppercase font-bold tracking-wider mb-2">Members ({teamMembers.length})</div>
                               <div className="flex flex-wrap gap-1.5">
                                 {teamMembers.slice(0, 5).map(m => (
                                   <div key={m.id} className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold text-slate-400" title={mName(m)}>
                                      {mName(m)[0]?.toUpperCase()}
                                   </div>
                                 ))}
                                 {teamMembers.length > 5 && (
                                   <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-bold text-slate-600">
                                      +{teamMembers.length - 5}
                                   </div>
                                 )}
                               </div>
                             </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-white/5 flex gap-2">
                            <Btn variant="ghost" className="text-[10px] flex-1 py-2" onClick={() => openEditTeam(team)}>Manage Members</Btn>
                            <Btn variant="ghost" className="text-[10px] flex-1 py-2" onClick={() => setSection('tasks')}>View Tasks</Btn>
                          </div>
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
                <Btn onClick={() => { setTkForm({ title:'',description:'',team_id:'',assignee_id:'',priority:'medium',due_date:'' }); setModal('addTask'); }}>
                  <Plus size={15} />Add Task
                </Btn>
              </div>
              {loadingTasks ? <LoadingRows /> : tasks.length === 0
                ? <Empty icon={CheckSquare} msg="No tasks yet." action={{ label: '+ Add Task', onClick: () => setModal('addTask') }} />
                : (
                  <div className="space-y-2">
                    {tasks.filter(t => isOrganizer || myHeadedTeamIds.includes(t.team_id)).map(task => (
                      <div key={task.id} className="bg-[#0d1117] border border-white/10 rounded-xl px-5 py-3.5 flex items-center gap-4 hover:border-white/20 transition-all group">
                        <div onClick={() => toggleTask(task)} className={cls('w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors', task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-indigo-400')}>
                          {task.status === 'done' && <CheckCircle size={11} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cls('text-sm font-medium', task.status === 'done' ? 'line-through text-slate-600' : 'text-slate-200')}>{task.title}</div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {task.team_id     && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Layers size={9} />{teamName(task.team_id)}</span>}
                            {task.assignee_id && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Users size={9} />{assigneeName(task.assignee_id)}</span>}
                            {task.due_date    && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Clock size={9} />{new Date(task.due_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <span className={cls('text-[10px] font-bold px-2 py-0.5 rounded border uppercase', PRIORITY_STYLE[task.priority || 'medium'])}>{task.priority || 'med'}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditTask(task)} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/10 transition-all"><Edit2 size={13} /></button>
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
                      <div key={i} className="bg-[#0d1117] border border-white/10 rounded-xl p-5">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-white text-sm">{n.title}</div>
                          <div className="flex items-center gap-2 shrink-0">
                            {n.target_role     && <span className="text-[10px] text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md uppercase font-bold">{n.target_role}</span>}
                            {n.target_team_id  && <span className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded-md font-bold">{teamName(n.target_team_id)}</span>}
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

          {section === 'feedback'      && <FeedbackManager conf={conf} />}
          {section === 'emails'        && <EmailComposer conf={conf} senderRole="organizer" onOpenEmailSettings={() => setSection('emailSettings')} />}
          {section === 'emailSettings' && <EmailSettings conf={conf} />}
          {section === 'allocation'    && <PaperAllocation conf={conf} />}

          {/* ═══ SPEAKERS ═══ */}
          {section === 'speakers' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Find Speakers</h2>
                <p className="text-slate-500 text-sm mt-0.5">Discover potential speakers for your conference using AI</p>
              </div>
              <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Field label="Research Topic">
                      <Input placeholder="e.g. Artificial Intelligence, Quantum Computing…" value={spTopic} onChange={e => setSpTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && findSpeakers()} />
                    </Field>
                  </div>
                  <Field label="Max Results">
                    <Sel value={spLimit} onChange={e => setSpLimit(Number(e.target.value))}>
                      {[5,10,15,20].map(n => <option key={n} value={n} className="bg-[#0d1117]">{n} speakers</option>)}
                    </Sel>
                  </Field>
                </div>
                <Field label="Speaker Source">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {[
                      { key: 1, label: 'IN Indian' },
                      { key: 2, label: '🌐 Foreign' },
                      { key: 3, label: '💼 LinkedIn' },
                      { key: 4, label: '🎓 IIT / NIT' },
                      { key: 5, label: '⭐ All Sources' }
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setSpSource(key)}
                        className={cls(
                          'py-2.5 px-3 rounded-xl text-[10px] font-bold border transition-all',
                          spSource === key ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'border-white/10 text-slate-500 hover:text-white hover:border-white/5'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Btn onClick={findSpeakers} disabled={spLoading || !spTopic.trim()} className="w-full py-3 justify-center">
                  {spLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Searching…</> : <><Users size={15} />Find Speakers</>}
                </Btn>
                {spError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">{spError}</div>}
              </div>
              {spLoading && <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />)}</div>}
              {!spLoading && spResults.length > 0 && (
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{spResults.length} Speaker{spResults.length !== 1 ? 's' : ''} Found</div>
                  {spResults.map((speaker, i) => (
                    <div key={i} className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">{speaker.name?.[0]?.toUpperCase()}</div>
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
                      {speaker.linkedin && <a href={speaker.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold">View LinkedIn →</a>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ══════════════════════════ MODALS ══════════════════════════ */}

      {modal === 'addMember' && (
  <Modal title="Add Member" onClose={() => setModal(null)} width="max-w-lg">
    <div className="space-y-4">
      <Field label="Role for New Member">
        <Sel value={mForm.role} onChange={e => setMForm({ ...mForm, role: e.target.value })}>
          <option value="reviewer">Reviewer</option>
          <option value="presenter">Presenter</option>
          <option value="organizer">Organizer</option>
          <option value="member">Member</option>
        </Sel>
      </Field>

      <Field label="Select User">
        <UserPickerPanel
          confId={confId}
          members={members}
          onSelect={async (user) => {
            // Check not already a member
            const already = members.find(m => m.user_id === user.user_id);
            if (already) { alert('Already a member.'); return; }

            setSaving(true);
            const { error } = await supabase.from('conference_user').insert([{
              conference_id: confId,
              user_id:       user.user_id,
              email:         user.user_email || '',
              full_name:     user.user_name  || '',
              role:          mForm.role,
              joined_at:     new Date().toISOString(),
            }]);
            setSaving(false);

            if (error) { alert(error.message); return; }
            setModal(null);
            setMForm({ email: '', role: 'reviewer' });
            fetchMembers();
            fetchAllVolunteers();
          }}
        />
      </Field>
    </div>

    <div className="flex gap-3 mt-6">
      <Btn variant="secondary" className="flex-1" onClick={() => setModal(null)}>
        Cancel
      </Btn>
    </div>
  </Modal>
)}

      {modal === 'confirmDelete' && modalData && (
        <Modal title="Remove Member" onClose={() => setModal(null)} width="max-w-sm">
          <p className="text-slate-400 text-sm mb-6">Remove <span className="text-white font-semibold">{mName(modalData)}</span> from this conference?</p>
          <div className="flex gap-3">
            <Btn variant="secondary" className="flex-1" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="danger" className="flex-1" onClick={() => { removeMember(modalData.id); setModal(null); }}>Remove</Btn>
          </div>
        </Modal>
      )}

      {(modal === 'createTeam' || modal === 'editTeam') && (
        <Modal title={modal === 'createTeam' ? 'Create Team' : 'Manage Team'} onClose={() => setModal(null)} width="max-w-xl">
          <div className="space-y-6">
            {/* 1. TEAM CONFIGURATION (Restored) */}
            <div className={cls('space-y-4', !isOrganizer && 'opacity-70 pointer-events-none')}>
              <Field label="Team Type">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                    {TEAM_TYPES.map(({ id, label }) => (
                      <button key={id} type="button" onClick={() => setTmForm({ ...tmForm, type: id, name: label })} className={cls('text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-2', tmForm.type === id ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-slate-500 hover:border-indigo-500/30 hover:text-slate-200')}>
                        {tmForm.type === id && <Check size={10} className="shrink-0 text-indigo-400" />}{label}
                      </button>
                    ))}
                    <button type="button" onClick={() => setTmForm({ ...tmForm, type: 'custom', name: '' })} className={cls('text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-2 col-span-2', tmForm.type === 'custom' ? 'bg-slate-500/15 border-slate-400/40 text-slate-300' : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20 hover:text-slate-200')}>
                      {tmForm.type === 'custom' && <Check size={10} className="shrink-0" />}✏️ Custom name…
                    </button>
                  </div>
                  {tmForm.type === 'custom' && <Input autoFocus placeholder="Enter a custom team name…" value={tmForm.name} onChange={e => setTmForm({ ...tmForm, name: e.target.value })} />}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Description (optional)">
                  <Input placeholder="What does this team do?" value={tmForm.description} onChange={e => setTmForm({ ...tmForm, description: e.target.value })} />
                </Field>
                <Field label="Team Head (optional)">
                  <Sel value={tmForm.head_id} onChange={e => setTmForm({ ...tmForm, head_id: e.target.value })}>
                    <option value="">— No team head —</option>
                    {members.map(m => <option key={m.id} value={m.id} className="bg-[#0d1117]">{mName(m)} ({m.role})</option>)}
                  </Sel>
                </Field>
              </div>

              <Field label="Team Color">
                <div className="flex gap-2 flex-wrap">
                  {TEAM_COLORS.map(c => (
                    <button key={c} onClick={() => setTmForm({ ...tmForm, color: c })} className={cls('w-8 h-8 rounded-lg transition-all border-2', tmForm.color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105')} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </Field>
            </div>

            {/* 2. MEMBER MANAGEMENT (Preserved) */}
            <div className="border-t border-white/10 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-indigo-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Member Management</h4>
                </div>
                {modal === 'editTeam' && (
                  <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {modalData.memberList?.length || 0} Members
                  </span>
                )}
              </div>

              {modal === 'editTeam' && modalData.memberList?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {(modalData.memberList || []).map(tm => {
                    const m = members.find(mem => mem.id === tm.conference_user_id);
                    if (!m) return null;
                    return (
                      <div key={m.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-2 group">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {mName(m)[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold text-white truncate">{mName(m)}</div>
                        </div>
                        {isOrganizer && (
                          <button onClick={() => removeFromTeam(modalData.id, m.id)} className="p-1 px-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"><X size={12} /></button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="bg-indigo-500/5 rounded-2xl p-4 border border-indigo-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <Plus size={14} className="text-indigo-400" />
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Add New Members</span>
                </div>
                <VolunteerCandidatePanel
                  allVolunteers={allVolunteers} members={members} teamMembers={modalData?.memberList || []}
                  teamTypeId={tmForm.type !== 'custom' ? tmForm.type : null}
                  confId={confId} 
                  onAdd={(memberId) => addToTeam(modal === 'editTeam' ? modalData.id : null, memberId)}
                  onAddVolunteer={async (v) => {
                    setSaving(true);
                    const { data, error } = await supabase.from('conference_user').insert([{
                      conference_id: confId, user_id: v.user_id, email: v.user_email || '', full_name: v.user_name || '', role: 'member', joined_at: new Date().toISOString()
                    }]).select().single();
                    setSaving(false);
                    if (error) { alert(error.message); return null; }
                    fetchMembers();
                    return data.id;
                  }}
                  globalRatings={globalRatings}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <Btn variant="secondary" className="flex-1" onClick={() => setModal(null)}>Close</Btn>
            {isOrganizer && (
              <Btn className="flex-1" onClick={modal === 'createTeam' ? createTeam : saveTeam} disabled={saving || !tmForm.name.trim()}>
                {saving ? 'Saving…' : modal === 'createTeam' ? 'Create Team' : 'Save Changes'}
              </Btn>
            )}
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
                  <option value="">{isOrganizer ? 'No team' : 'Select your team'}</option>
                  {teams.filter(t => isOrganizer || t.head_id === myMemberId).map(t => <option key={t.id} value={t.id} className="bg-[#0d1117]">{t.name}</option>)}
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
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
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
                  <option value="all">All Members</option><option value="presenter">Presenters</option><option value="reviewer">Reviewers</option><option value="organizer">Organizers</option>
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

      {/* ── Rate Member Modal ── */}
      {ratingMember && (
        <RateMemberModal
          member={ratingMember}
          confId={confId}
          organizerId={organizerUserId}
          existingRating={myRatings[ratingMember.user_id]}
          onSave={() => {
            setRatingMember(null);
            fetchMyRatings(organizerUserId);
            fetchGlobalRatings();
          }}
          onClose={() => setRatingMember(null)}
        />
      )}

      {modal === 'deleteConference' && (
  <Modal title="Delete Conference" onClose={() => setModal(null)} width="max-w-sm">
    <div className="mb-6 space-y-3">
      <p className="text-slate-400 text-sm">
        Are you sure you want to delete{' '}
        <span className="text-white font-semibold">"{conf.title}"</span>?
      </p>
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
        <p className="text-red-400 text-xs leading-relaxed">
          This will permanently delete the conference and all associated data —
          members, teams, tasks, papers, and notifications. This cannot be undone.
        </p>
      </div>
    </div>
    <div className="flex gap-3">
      <Btn variant="secondary" className="flex-1" onClick={() => setModal(null)}>
        Cancel
      </Btn>
      <Btn
        variant="danger"
        className="flex-1"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          // Delete in dependency order
          await supabase.from('notifications').delete().eq('conference_id', confId);
          await supabase.from('conference_tasks').delete().eq('conference_id', confId);
          await supabase.from('team_members').delete().eq('conference_id', confId);
          await supabase.from('conference_teams').delete().eq('conference_id', confId);
          await supabase.from('paper_assignments').delete().eq('conference_id', confId);
          await supabase.from('paper_review').delete().in(
            'paper_id',
            (await supabase.from('paper').select('paper_id').eq('conference_id', confId)).data?.map(p => p.paper_id) || []
          );
          await supabase.from('assignment').delete().eq('conference_id', confId);
          await supabase.from('paper').delete().eq('conference_id', confId);
          await supabase.from('conference_user').delete().eq('conference_id', confId);
          await supabase.from('feedback_questions').delete().in(
            'form_id',
            (await supabase.from('feedback_forms').select('id').eq('conference_id', confId)).data?.map(f => f.id) || []
          );
          await supabase.from('feedback_forms').delete().eq('conference_id', confId);
          await supabase.from('conference').delete().eq('conference_id', confId);
          setSaving(false);
          onBack(); // go back to hub
        }}
      >
        {saving ? 'Deleting…' : 'Delete Permanently'}
      </Btn>
    </div>
  </Modal>
)}
    </div>
  );
};

export default OrganizerDashboard;