import React, { useState, useMemo } from 'react';
import { Users, Plus, X, Check, UserMinus, UserPlus } from 'lucide-react';
import { cls, mName, TEAM_TYPES, TEAM_COLORS } from '../../constants';
import { Modal, Field, Input, Sel, Btn } from '../common/Primitives';
import VolunteerCandidatePanel from '../Panels/VolunteerCandidatePanel';
import { useApp } from '../../../../../context/AppContext';

const TeamModal = ({
  mode, modalData, tmForm, setTmForm,
  isOrganizer, saving, members, allVolunteers, confId, globalRatings,
  onClose, onCreate, onSave, onAddToTeam, onRemoveFromTeam, onAddVolunteer,
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  // ── Pending changes: staged locally, committed on Save ──
  const [pendingAdds, setPendingAdds]       = useState(new Set());   // conf_user_ids to add
  const [pendingRemoves, setPendingRemoves] = useState(new Set());   // conf_user_ids to remove
  const [pendingInvites, setPendingInvites] = useState(new Map());   // user_id -> volunteer object (not yet in conference)

  // All existing team member conf_user_ids (from DB)
  const existingMemberIds = useMemo(
    () => new Set((modalData?.memberList || []).map(tm => tm.conference_user_id)),
    [modalData]
  );

  // Effective team members = (existing - pendingRemoves) + pendingAdds + pendingInvites
  const effectiveTeamMembers = useMemo(() => {
    const effective = new Set();
    existingMemberIds.forEach(id => { if (!pendingRemoves.has(id)) effective.add(id); });
    pendingAdds.forEach(id => effective.add(id));
    // For pendingInvites, we store user_id as a marker in this set
    pendingInvites.forEach((_, userId) => effective.add(`invite:${userId}`));
    return effective;
  }, [existingMemberIds, pendingAdds, pendingRemoves, pendingInvites]);

  // Build the effective memberList for VolunteerCandidatePanel filtering
  const effectiveTeamMemberList = useMemo(() => {
    const result = [];
    // Existing that aren't removed
    (modalData?.memberList || []).forEach(tm => {
      if (!pendingRemoves.has(tm.conference_user_id)) result.push(tm);
    });
    // Pending adds (existing conference members)
    pendingAdds.forEach(confUserId => {
      if (!existingMemberIds.has(confUserId)) {
        const m = members.find(mem => mem.id === confUserId);
        if (m) result.push({ conference_user_id: confUserId, user_id: m.user_id, id: confUserId });
      }
    });
    // Pending invites (new volunteers)
    pendingInvites.forEach((v, userId) => {
      result.push({ user_id: userId, conference_user_id: `invite:${userId}`, is_new_invite: true, ...v });
    });
    return result;
  }, [modalData, pendingAdds, pendingRemoves, existingMemberIds, members, pendingInvites]);

  const hasPendingChanges = pendingAdds.size > 0 || pendingRemoves.size > 0 || pendingInvites.size > 0;

  // ── Handlers ──
  const handleToggleCandidate = (candidateOrId) => {
    if (typeof candidateOrId === 'object') {
      // Toggle a volunteer who is NOT yet a conference member
      const userId = candidateOrId.user_id;
      setPendingInvites(prev => {
        const next = new Map(prev);
        if (next.has(userId)) next.delete(userId);
        else next.set(userId, candidateOrId);
        return next;
      });
      return;
    }

    const confUserId = candidateOrId;
    setPendingAdds(prev => {
      const next = new Set(prev);
      if (next.has(confUserId)) {
        next.delete(confUserId); // deselect
      } else {
        next.add(confUserId);    // select
      }
      return next;
    });
    // If this was staged for removal, un-remove it
    setPendingRemoves(prev => {
      const next = new Set(prev);
      next.delete(confUserId);
      return next;
    });
  };

  const handleToggleRemove = (confUserId) => {
    setPendingRemoves(prev => {
      const next = new Set(prev);
      if (next.has(confUserId)) {
        next.delete(confUserId); // undo remove
      } else {
        next.add(confUserId);    // stage for removal
      }
      return next;
    });
  };

  const handleSaveAll = async () => {
    const inviteList = Array.from(pendingInvites.values());
    // 1. Save team config (name, description, head, color) AND sync members
    if (mode === 'createTeam') {
      await onCreate([...pendingAdds], inviteList); 
    } else {
      await onSave([...pendingAdds], [...pendingRemoves], inviteList);
    }

    setPendingAdds(new Set());
    setPendingRemoves(new Set());
    setPendingInvites(new Map());
  };

  return (
    <Modal title={mode === 'createTeam' ? 'Create Team' : 'Manage Team'} onClose={onClose} width="max-w-xl">
      <div className="space-y-6">
        {/* ── TEAM CONFIGURATION ── */}
        <div className={cls('space-y-4', !isOrganizer && 'opacity-70 pointer-events-none')}>
          <Field label="Team Type or Department">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                {TEAM_TYPES.map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => setTmForm({ ...tmForm, type: id, name: label })}
                    className="text-left px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2.5"
                    style={tmForm.type === id
                      ? { background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.35)', color: '#f5c518' }
                      : { 
                          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, 
                          color: isDark ? '#52525b' : '#71717a' 
                        }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tmForm.type === id ? '#f5c518' : 'transparent', border: tmForm.type === id ? 'none' : `1px solid ${isDark ? '#3f3f46' : '#d4d4d8'}` }} />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
                <button type="button" onClick={() => setTmForm({ ...tmForm, type: 'custom', name: '' })}
                  className="text-left px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-2.5 col-span-2"
                  style={tmForm.type === 'custom'
                    ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)'}`, color: isDark ? '#d4d4d8' : '#3f3f46' }
                    : { background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, color: isDark ? '#52525b' : '#71717a' }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tmForm.type === 'custom' ? (isDark ? '#fff' : '#000') : 'transparent', border: tmForm.type === 'custom' ? 'none' : `1px solid ${isDark ? '#3f3f46' : '#d4d4d8'}` }} />
                  ✏️ Custom name…
                </button>
              </div>
              {tmForm.type === 'custom' && <Input autoFocus placeholder="Enter team name (e.g. 'Coffee & Catering'…)" value={tmForm.name} onChange={e => setTmForm({ ...tmForm, name: e.target.value })} />}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Description (optional)">
              <Input placeholder="What does this team do?" value={tmForm.description} onChange={e => setTmForm({ ...tmForm, description: e.target.value })} />
            </Field>
            <Field label="Team Head (optional)">
              <Sel value={tmForm.head_id} onChange={e => setTmForm({ ...tmForm, head_id: e.target.value })}>
                <option value="">— No team head —</option>
                {members.map(m => <option key={m.id} value={m.id} className={isDark ? "bg-[#13151c] text-white" : "bg-white text-zinc-900"}>{mName(m)} ({m.role})</option>)}
              </Sel>
            </Field>
          </div>
          <Field label="Team Color">
            <div className="flex gap-2 flex-wrap">
              {TEAM_COLORS.map(c => (
                <button key={c} onClick={() => setTmForm({ ...tmForm, color: c })}
                  className="w-8 h-8 rounded-lg transition-all"
                  style={{ backgroundColor: c, border: tmForm.color === c ? '2px solid #fff' : '2px solid transparent', transform: tmForm.color === c ? 'scale(1.1)' : 'scale(1)' }} />
              ))}
            </div>
          </Field>
        </div>

        {/* ── MEMBER MANAGEMENT ── */}
          <div className="pt-5 space-y-4" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}` }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} style={{ color: '#f5c518' }} />
              <h4 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-zinc-800'}`}>Member Management</h4>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: isDark ? '#6b7280' : '#4b5563', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}` }}>
              {effectiveTeamMembers.size} Members
            </span>
          </div>

          {/* Current + Pending members display */}
          {effectiveTeamMembers.size > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
               {[...effectiveTeamMembers].map(idOrToken => {
                 let confUserId = idOrToken;
                 let m = members.find(mem => mem.id === confUserId);
                 let isNewInvite = false;

                 if (typeof idOrToken === 'string' && idOrToken.startsWith('invite:')) {
                   const userId = idOrToken.split(':')[1];
                   const v = pendingInvites.get(userId);
                   if (!v) return null;
                   m = { ...v, id: userId, full_name: v.user_name || v.full_name };
                   isNewInvite = true;
                 }

                 if (!m) return null;
                 const isNew = isNewInvite || (pendingAdds.has(confUserId) && !existingMemberIds.has(confUserId));
                 const isMarkedForRemoval = pendingRemoves.has(confUserId);
                 const tmStatus = modalData?.memberList?.find(tm => tm.conference_user_id === confUserId)?.status;
                 const isPending = isNewInvite || m.status === 'pending' || tmStatus === 'pending';

                 return (
                   <div key={idOrToken}
                     className={cls('flex items-center gap-3 rounded-xl p-2 group transition-all', (isMarkedForRemoval || (isPending && !isNewInvite)) && 'opacity-70')}
                     style={{
                       background: isNew ? 'rgba(16,185,129,0.08)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                       border: isNew ? '1px solid rgba(16,185,129,0.25)' : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                     }}>
                     <div className={`w-7 h-7 rounded-sm flex items-center justify-center text-[10px] font-bold ${isDark ? 'text-white' : 'text-zinc-700'}`}
                       style={{ background: isNew ? '#10b981' : (isDark ? '#27293a' : '#f1f5f9') }}>
                       {mName(m)[0]?.toUpperCase()}
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className={`text-[11px] font-semibold truncate flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-zinc-800'}`}>
                         <span className="truncate">{mName(m)}</span>
                         {isNewInvite ? (
                           <span className="text-[7px] px-1 py-0.5 rounded font-black uppercase shrink-0"
                             style={{ background: 'rgba(245,197,24,0.15)', color: '#f5c518', border: '1px solid rgba(245,197,24,0.3)' }}>
                             New
                           </span>
                         ) : isNew && (
                           <span className="text-[7px] px-1 py-0.5 rounded font-black uppercase shrink-0"
                             style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                             Adding
                           </span>
                         )}
                         {isPending && !isNew && (
                           <span className="text-[7px] px-1 py-0.5 rounded font-black uppercase shrink-0"
                             style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                             Invited
                           </span>
                         )}
                       </div>
                     </div>
                     {isOrganizer && (
                       <button
                         onClick={() => {
                           if (typeof idOrToken === 'string' && idOrToken.startsWith('invite:')) {
                             const userId = idOrToken.split(':')[1];
                             setPendingInvites(prev => { const next = new Map(prev); next.delete(userId); return next; });
                           } else if (pendingAdds.has(confUserId)) {
                             setPendingAdds(prev => { const next = new Set(prev); next.delete(confUserId); return next; });
                           } else {
                             handleToggleRemove(confUserId);
                           }
                         }}
                         className="p-1 px-2 rounded-lg transition-all"
                         style={{ color: isMarkedForRemoval ? '#f59e0b' : (isDark ? '#52525b' : '#a1a1aa') }}
                       >
                         {isMarkedForRemoval ? <UserPlus size={12} /> : <X size={12} />}
                       </button>
                     )}
                   </div>
                 );
               })}
            </div>
          )}

          {/* Pending changes summary */}
           {hasPendingChanges && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[10px] font-bold"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
              <span>⚡ Unsaved changes:</span>
              {(pendingAdds.size > 0 || pendingInvites.size > 0) && (
                <span className="flex items-center gap-1">
                  <UserPlus size={10} /> {pendingAdds.size + pendingInvites.size} to add
                </span>
              )}
              {pendingRemoves.size > 0 && (
                <span className="flex items-center gap-1">
                  <UserMinus size={10} /> {pendingRemoves.size} to remove
                </span>
              )}
            </div>
          )}

          {/* Add New Members panel */}
          <div className="rounded-2xl p-4" style={{ background: isDark ? 'rgba(245,197,24,0.04)' : 'rgba(245,197,24,0.02)', border: `1px solid ${isDark ? 'rgba(245,197,24,0.1)' : 'rgba(245,197,24,0.15)'}` }}>
            <div className="flex items-center gap-2 mb-3">
              <Plus size={14} style={{ color: '#f5c518' }} />
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#f5c518', opacity: 0.8 }}>Add New Members</span>
            </div>
             <VolunteerCandidatePanel
              allVolunteers={allVolunteers} members={members} teamMembers={effectiveTeamMemberList}
              teamTypeId={tmForm.type !== 'custom' ? tmForm.type : null}
              confId={confId}
              onAdd={(memberIdOrCandidate) => handleToggleCandidate(memberIdOrCandidate)}
              onAddVolunteer={onAddVolunteer}
              globalRatings={globalRatings}
              pendingAdds={pendingAdds}
              pendingInvites={pendingInvites}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <Btn variant="secondary" className="flex-1" onClick={onClose}>Close</Btn>
        {isOrganizer && (
          <Btn className="flex-1" onClick={handleSaveAll} disabled={saving || !tmForm.name.trim()}>
            {saving ? 'Saving…' : mode === 'createTeam' ? 'Create Team' : 'Save Changes'}
            {hasPendingChanges && !saving && (
              <span className="ml-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </Btn>
        )}
      </div>
    </Modal>
  );
};

export default TeamModal;
