import React from 'react';
import { Users, Plus, X, Check } from 'lucide-react';
import { cls, mName, TEAM_TYPES, TEAM_COLORS } from '../../constants';
import { Modal, Field, Input, Sel, Btn } from '../common/Primitives';
import VolunteerCandidatePanel from '../Panels/VolunteerCandidatePanel';

const TeamModal = ({
  mode, modalData, tmForm, setTmForm,
  isOrganizer, saving, members, allVolunteers, confId, globalRatings,
  onClose, onCreate, onSave, onAddToTeam, onRemoveFromTeam, onAddVolunteer,
}) => (
  <Modal title={mode === 'createTeam' ? 'Create Team' : 'Manage Team'} onClose={onClose} width="max-w-xl">
    <div className="space-y-6">
      <div className={cls('space-y-4', !isOrganizer && 'opacity-70 pointer-events-none')}>
        <Field label="Team Type">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
              {TEAM_TYPES.map(({ id, label }) => (
                <button key={id} type="button" onClick={() => setTmForm({ ...tmForm, type: id, name: label })}
                  className="text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2"
                  style={tmForm.type === id
                    ? { background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.35)', color: '#f5c518' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }}>
                  {tmForm.type === id && <Check size={10} className="shrink-0" style={{ color: '#f5c518' }} />}{label}
                </button>
              ))}
              <button type="button" onClick={() => setTmForm({ ...tmForm, type: 'custom', name: '' })}
                className="text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 col-span-2"
                style={tmForm.type === 'custom'
                  ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#d4d4d8' }
                  : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }}>
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
              {members.map(m => <option key={m.id} value={m.id} style={{ background: '#13151c' }}>{mName(m)} ({m.role})</option>)}
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

      <div className="pt-5 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: '#f5c518' }} />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">Member Management</h4>
          </div>
          {mode === 'editTeam' && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: '#6b7280', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {modalData.memberList?.length || 0} Members
            </span>
          )}
        </div>

        {mode === 'editTeam' && modalData.memberList?.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
            {(modalData.memberList || []).map(tm => {
              const m = members.find(mem => mem.id === tm.conference_user_id);
              if (!m) return null;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-xl p-2 group"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: '#27293a' }}>
                    {mName(m)[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-white truncate">{mName(m)}</div>
                  </div>
                  {isOrganizer && (
                    <button onClick={() => onRemoveFromTeam(modalData.id, m.id)}
                      className="p-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all" style={{ color: '#52525b' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#52525b'; e.currentTarget.style.background = 'transparent'; }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="rounded-2xl p-4" style={{ background: 'rgba(245,197,24,0.04)', border: '1px solid rgba(245,197,24,0.1)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Plus size={14} style={{ color: '#f5c518' }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#f5c518', opacity: 0.8 }}>Add New Members</span>
          </div>
          <VolunteerCandidatePanel
            allVolunteers={allVolunteers} members={members} teamMembers={modalData?.memberList || []}
            teamTypeId={tmForm.type !== 'custom' ? tmForm.type : null}
            confId={confId}
            onAdd={(memberId) => onAddToTeam(mode === 'editTeam' ? modalData.id : null, memberId)}
            onAddVolunteer={onAddVolunteer}
            globalRatings={globalRatings}
          />
        </div>
      </div>
    </div>

    <div className="flex gap-3 mt-8">
      <Btn variant="secondary" className="flex-1" onClick={onClose}>Close</Btn>
      {isOrganizer && (
        <Btn className="flex-1" onClick={mode === 'createTeam' ? onCreate : onSave} disabled={saving || !tmForm.name.trim()}>
          {saving ? 'Saving…' : mode === 'createTeam' ? 'Create Team' : 'Save Changes'}
        </Btn>
      )}
    </div>
  </Modal>
);

export default TeamModal;
