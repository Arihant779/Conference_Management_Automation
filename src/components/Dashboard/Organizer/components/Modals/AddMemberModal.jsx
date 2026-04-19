import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Info, CheckCircle2, UserPlus, ArrowRight } from 'lucide-react';
import { Modal, Field, Sel, Btn } from '../common/Primitives';
import UserPickerPanel from '../Panels/UserPickerPanel';
import { useApp } from '../../../../../context/AppContext';

const AddMemberModal = ({ mForm, setMForm, members, confId, saving, onClose, onAddMembers }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const [selectedUsers, setSelectedUsers] = useState(new Map());
  const [showConfirm, setShowConfirm] = useState(false);

  const handleToggle = (user) => {
    setSelectedUsers(prev => {
      const next = new Map(prev);
      if (next.has(user.user_id)) next.delete(user.user_id);
      else next.set(user.user_id, user);
      return next;
    });
  };

  const usersArray = Array.from(selectedUsers.values());

  if (showConfirm) {
    return (
      <Modal title="Confirm Addition" onClose={() => setShowConfirm(false)} width="max-w-md">
        <div className="space-y-6">
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-amber-500 animate-pulse ${isDark ? 'bg-amber-500/20' : 'bg-amber-500/10'}`}>
              <UserPlus size={32} />
            </div>
            <div>
              <h3 className={`text-xl font-black px-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                Add {usersArray.length} {usersArray.length === 1 ? 'Member' : 'Members'}?
              </h3>
              <p className={`text-sm font-medium mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                They will be assigned the <span className="text-amber-500 font-bold uppercase">{mForm.role}</span> role.
              </p>
            </div>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {usersArray.map(u => (
              <div key={u.user_id} 
                   className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                     isDark ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200'
                   }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${
                  isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
                }`}>
                  {u.user_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                    {u.user_name || '(no name)'}
                  </div>
                  <div className={`text-[10px] truncate ${isDark ? 'text-zinc-500' : 'text-zinc-500 font-medium'}`}>
                    {u.user_email}
                  </div>
                </div>
                <CheckCircle2 size={14} className="text-amber-500 shrink-0" />
              </div>
            ))}
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider leading-relaxed">
              CONFIRMATION: These users will be granted immediate access to the conference dashboard with full {mForm.role} permissions.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" className="flex-1" onClick={() => setShowConfirm(false)}>Back</Btn>
            <Btn className="flex-1" onClick={() => onAddMembers(usersArray, mForm.role)} disabled={saving}>
              {saving ? 'Adding...' : 'Confirm & Add'}
            </Btn>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Add Members" onClose={onClose} width="max-w-lg">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <Field label="Target Role">
              <Sel value={mForm.role} onChange={e => setMForm({ ...mForm, role: e.target.value })}>
                <option value="reviewer">Reviewer</option>
                <option value="presenter">Presenter</option>
                <option value="organizer">Organizer</option>
              </Sel>
            </Field>
          </div>
          <div className="pt-5 shrink-0">
            <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 ${
              isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
            }`}>
              <Users size={14} className="text-amber-500" />
              <span className="text-xs font-black text-amber-500">{selectedUsers.size} Selected</span>
            </div>
          </div>
        </div>

        <Field label="Select Users from Database">
          <UserPickerPanel 
            confId={confId} 
            members={members} 
            onToggle={handleToggle} 
            selectedIds={new Set(selectedUsers.keys())}
          />
        </Field>

        <div className="flex gap-3 pt-4">
          <Btn variant="secondary" className="flex-1" onClick={onClose}>Cancel</Btn>
          <Btn className="flex-1" disabled={selectedUsers.size === 0} onClick={() => setShowConfirm(true)}>
            Continue to Review <ArrowRight size={14} className="ml-1" />
          </Btn>
        </div>
      </div>
    </Modal>
  );
};

export default AddMemberModal;
