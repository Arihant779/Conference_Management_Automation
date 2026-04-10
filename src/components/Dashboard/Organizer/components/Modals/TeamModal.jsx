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

  // All existing team member conf_user_ids (from DB)
  const existingMemberIds = useMemo(
    () => new Set((modalData?.memberList || []).map(tm => tm.conference_user_id)),
    [modalData]
  );

  // Effective team members = (existing - pendingRemoves) + pendingAdds
  const effectiveTeamMembers = useMemo(() => {
    const effective = new Set();
    existingMemberIds.forEach(id => { if (!pendingRemoves.has(id)) effective.add(id); });
    pendingAdds.forEach(id => effective.add(id));
    return effective;
  }, [existingMemberIds, pendingAdds, pendingRemoves]);

  // Build the effective memberList for VolunteerCandidatePanel filtering
  const effectiveTeamMemberList = useMemo(() => {
    const result = [];
    // Existing that aren't removed
    (modalData?.memberList || []).forEach(tm => {
      if (!pendingRemoves.has(tm.conference_user_id)) result.push(tm);
    });
    // Pending adds (synthesize minimal team member objects)
    pendingAdds.forEach(confUserId => {
      if (!existingMemberIds.has(confUserId)) {
        const m = members.find(mem => mem.id === confUserId);
        if (m) result.push({ conference_user_id: confUserId, user_id: m.user_id, id: confUserId });
      }
    });
    return result;
  }, [modalData, pendingAdds, pendingRemoves, existingMemberIds, members]);

  const hasPendingChanges = pendingAdds.size > 0 || pendingRemoves.size > 0;

  // ── Handlers ──
  const handleToggleCandidate = (confUserId) => {
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
    // 1. Save team config (name, description, head, color) AND sync members
    if (mode === 'createTeam') {
      await onCreate([...pendingAdds]); 
    } else {
      await onSave([...pendingAdds], [...pendingRemoves]);
    }

    setPendingAdds(new Set());
    setPendingRemoves(new Set());
  };

  return (
    <Modal title={mode === 'createTeam' ? 'Create Team' : 'Manage Team'} onClose={onClose} width="max-w-xl">
      <div className="space-y-6">
        {/* ── TEAM CONFIGURATION ── */}
        <div className={cls('space-y-4', !isOrganizer && 'opacity-70 pointer-events-none')}>
          <Field label="Team Type">
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                {TEAM_TYPES.map(({ id, label }) => (
                  <button key={id} type="button" onClick={() => setTmForm({ ...tmForm, type: id, name: label })}
                    className="text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2"
                    style={tmForm.type === id
                      ? { background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.35)', color: '#f5c518' }
                      : { 
                          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', 
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, 
                          color: isDark ? '#6b7280' : '#4b5563' 
                        }}>
                    {tmForm.type === id && <Check size={10} className="shrink-0" style={{ color: '#f5c518' }} />}{label}
                  </button>
                ))}
                <button type="button" onClick={() => setTmForm({ ...tmForm, type: 'custom', name: '' })}
                  className="text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 col-span-2"
                  style={tmForm.type === 'custom'
                    ? { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)'}`, color: isDark ? '#d4d4d8' : '#3f3f46' }
                    : { background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`, color: isDark ? '#6b7280' : '#4b5563' }}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {[...effectiveTeamMembers].map(confUserId => {
                const m = members.find(mem => mem.id === confUserId);
                if (!m) return null;
                const isNew = pendingAdds.has(confUserId) && !existingMemberIds.has(confUserId);
                const isMarkedForRemoval = pendingRemoves.has(confUserId);

                return (
                  <div key={m.id}
                    className={cls('flex items-center gap-3 rounded-xl p-2 group transition-all', isMarkedForRemoval && 'opacity-40')}
                    style={{
                      background: isNew ? 'rgba(16,185,129,0.08)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                      border: isNew ? '1px solid rgba(16,185,129,0.25)' : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                    }}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${isDark ? 'text-white' : 'text-zinc-700'}`}
                      style={{ background: isNew ? '#10b981' : (isDark ? '#27293a' : '#f1f5f9') }}>
                      {mName(m)[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-semibold truncate flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-zinc-800'}`}>
                        {mName(m)}
                        {isNew && (
                          <span className="text-[8px] px-1.5 py-0.5 rounded font-black uppercase"
                            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                            New
                          </span>
                        )}
                      </div>
                    </div>
                    {isOrganizer && (
                      <button
                        onClick={() => {
                          if (isNew) {
                            // Remove from pending adds
                            setPendingAdds(prev => { const next = new Set(prev); next.delete(confUserId); return next; });
                          } else {
                            handleToggleRemove(confUserId);
                          }
                        }}
                        className="p-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        style={{ color: isMarkedForRemoval ? '#f59e0b' : '#52525b' }}
                        onMouseEnter={e => {
                          if (!isMarkedForRemoval) { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = isMarkedForRemoval ? '#f59e0b' : '#52525b';
                          e.currentTarget.style.background = 'transparent';
                        }}
                        title={isNew ? 'Remove from selection' : (isMarkedForRemoval ? 'Undo removal' : 'Remove from team')}
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
              {pendingAdds.size > 0 && (
                <span className="flex items-center gap-1">
                  <UserPlus size={10} /> {pendingAdds.size} to add
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
              onAdd={(memberId) => handleToggleCandidate(memberId)}
              onAddVolunteer={onAddVolunteer}
              globalRatings={globalRatings}
              pendingAdds={pendingAdds}
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
