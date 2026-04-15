import React, { useState } from 'react';
import { Search, X, Sparkles, Star, Check } from 'lucide-react';
import { cls, VOLUNTEER_ROLE_LABELS, ROLE_STYLE } from '../../constants';
import { RatingBadge } from '../common/StarRating';
import { useApp } from '../../../../../context/AppContext';

/* ══════════════════════════════════════════════════════════
   VOLUNTEER CANDIDATE PANEL
   - Supports selection toggle (pendingAdds) instead of immediate add
══════════════════════════════════════════════════════════ */
const VolunteerCandidatePanel = ({
  allVolunteers, members, teamMembers, teamTypeId,
  confId, onAdd, onAddVolunteer, globalRatings,
  pendingAdds,  // Set<conf_user_id> — items staged for addition
  pendingInvites, // Map<user_id, object> — volunteers staged for addition to conference
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('volunteers');
  const [adding, setAdding] = useState(null);

  const alreadyInTeamUserIds = new Set(teamMembers.map(m => m.user_id));
  const alreadyInTeam = new Set(teamMembers.map(m => m.id || m.conference_user_id));
  const memberUserIds = new Set(members.map(m => m.user_id));

  const mName = (m) => m?.full_name || m?.user_name || m?.email || m?.user_email || m?.user_id?.slice(0, 8) || '?';
  const mEmail = (m) => m?.email || m?.user_email || '';
  const relevantRoleLabel = teamTypeId ? VOLUNTEER_ROLE_LABELS[teamTypeId] : null;

  // Users in this conference with a role other than 'member' should not appear as candidates
  const nonMemberUserIds = new Set(members.filter(m => m.role !== 'member').map(m => m.user_id));

  const matchedVolunteers = (allVolunteers || [])
    .filter(u => !alreadyInTeamUserIds.has(u.user_id))
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return mName(u).toLowerCase().includes(q) || mEmail(u).toLowerCase().includes(q);
    })
    .sort((a, b) => {
      // Prioritize those matching the team type
      const aMatch = teamTypeId && a.volunteer_roles?.includes(teamTypeId);
      const bMatch = teamTypeId && b.volunteer_roles?.includes(teamTypeId);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });

  const nonTeamMembers = members
    .filter(m => !alreadyInTeam.has(m.id))
    .filter(m => {
      if (!search) return true;
      const q = search.toLowerCase();
      return mName(m).toLowerCase().includes(q) || mEmail(m).toLowerCase().includes(q);
    });

  const candidates = filterMode === 'volunteers' ? matchedVolunteers : nonTeamMembers;
  const volunteerCount = matchedVolunteers.length;

  const handleAdd = async (candidate) => {
    if (adding) return;
    setAdding(candidate.user_id);
    try {
      if (filterMode === 'volunteers' && !memberUserIds.has(candidate.user_id)) {
        // Volunteer not yet a conference member — stage for invitation instead of immediate add
        onAdd(candidate);
      } else if (filterMode === 'all') {
        onAdd(candidate.id);
      } else {
        const confMember = members.find(m => m.user_id === candidate.user_id);
        if (confMember) onAdd(confMember.id);
      }
    } finally { setAdding(null); }
  };

  // Check if a candidate is currently selected (in pendingAdds or pendingInvites)
  const isSelected = (c) => {
    if (filterMode === 'all') return pendingAdds?.has(c.id);
    const confMember = members.find(m => m.user_id === c.user_id);
    if (confMember && pendingAdds?.has(confMember.id)) return true;
    if (pendingInvites?.has(c.user_id)) return true;
    return false;
  };

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
          <button onClick={() => setFilterMode('volunteers')} className={cls('px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5')}
            style={filterMode === 'volunteers' ? { background: '#f5c518', color: '#000' } : { color: isDark ? '#6b7280' : '#4b5563' }}>
            <Sparkles size={11} />All Volunteers
            {volunteerCount > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={filterMode === 'volunteers' ? { background: 'rgba(0,0,0,0.2)' } : { background: 'rgba(245,197,24,0.15)', color: '#f5c518' }}>{volunteerCount}</span>}
          </button>
          <button onClick={() => setFilterMode('all')} className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
            style={filterMode === 'all' ? { background: isDark ? '#fff' : '#000', color: isDark ? '#000' : '#fff' } : { color: isDark ? '#6b7280' : '#4b5563' }}>
            Conf. Members
          </button>
        </div>
        {filterMode === 'volunteers' && <span className="text-[10px] text-zinc-600 italic">Includes users not yet in this conference</span>}
      </div>

      <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
        <Search size={12} className="text-zinc-600 shrink-0" />
        <input className={`bg-transparent outline-none text-xs placeholder-zinc-600 flex-1 ${isDark ? 'text-white' : 'text-zinc-900'}`} style={{ fontFamily: "'DM Sans', sans-serif" }}
          placeholder="Search name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-zinc-400"><X size={11} /></button>}
      </div>

      {candidates.length === 0 ? (
        <div className="py-6 text-center rounded-xl" style={{ border: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}` }}>
          <p className="text-zinc-600 text-xs">{filterMode === 'volunteers' ? 'No one on the platform has volunteered for this team type yet.' : 'No conference members available to add.'}</p>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
          {candidates.map(c => {
            const isVolTab = filterMode === 'volunteers';
            const isAlreadyMember = memberUserIds.has(c.user_id);
            const domains = (c.volunteer_domains || []).slice(0, 2);
            const isAdding = adding === c.user_id;
            const key = c.user_id || c.id;
            const ratingInfo = globalRatings?.[c.user_id];
            const selected = isSelected(c);

            return (
              <div key={key} onClick={() => !isAdding && handleAdd(c)}
                className={cls('flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group', isAdding ? 'opacity-50 cursor-wait' : 'cursor-pointer')}
                style={selected
                  ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)' }
                  : isVolTab
                    ? { background: 'rgba(245,197,24,0.05)', border: '1px solid rgba(245,197,24,0.15)' }
                    : { background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }
                }>
                {/* Selection indicator */}
                <div className={cls('w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0')}
                  style={selected
                    ? { background: '#10b981', borderColor: '#10b981' }
                    : { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
                  }>
                  {selected && <Check size={11} className="text-white" />}
                </div>

                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={isVolTab ? { background: '#f5c518', color: '#000' } : { background: isDark ? '#27293a' : '#f1f5f9', color: isDark ? '#9ca3af' : '#6b7280' }}>
                  {mName(c)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs font-semibold truncate ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{mName(c)}</span>
                    {isVolTab && <Star size={9} className="shrink-0" style={{ color: '#f5c518', fill: '#f5c518' }} />}
                    {isVolTab && !isAlreadyMember && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)', color: '#f5c518' }}>Not a member</span>}
                  </div>
                  <div className={`text-[10px] truncate ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>{mEmail(c)}</div>
                  <div className="mt-0.5"><RatingBadge avg={ratingInfo?.avg} count={ratingInfo?.count} size={9} /></div>
                  {(relevantRoleLabel || domains.length > 0) && isVolTab && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {relevantRoleLabel && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide" style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.2)', color: '#f5c518' }}>{relevantRoleLabel}</span>}
                      {domains.map(d => <span key={d} className={`text-[9px] px-1.5 py-0.5 rounded ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}` }}>{d}</span>)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {!isVolTab && <span className={cls('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase', ROLE_STYLE[c.role] || ROLE_STYLE.member)}>{c.role}</span>}
                  <span className={cls('text-[9px] font-semibold transition-colors',
                    selected ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-yellow-400'
                  )}>
                    {isAdding ? '…' : selected ? '✓ Selected' : (isVolTab && !isAlreadyMember ? '+ Invite & Add' : '+ Select')}
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

export default VolunteerCandidatePanel;
