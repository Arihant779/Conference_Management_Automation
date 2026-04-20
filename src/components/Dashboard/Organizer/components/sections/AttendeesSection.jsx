import React, { useState } from 'react';
import {
  Users, Search, X, FileText, CheckSquare, Square,
  CheckCircle, XCircle, Clock, Check, Trash2,
} from 'lucide-react';
import { mName } from '../../constants';
import { Empty, LoadingRows, Modal, Btn } from '../common/Primitives';
import { SpotlightCard, AnimatedSection } from '../common/Effects';
import { motion } from 'framer-motion';
import { useApp } from '../../../../../context/AppContext';

const AttendeesSection = ({
  attendees, filteredAttendees, memberSearch, setMemberSearch,
  selectedAttendees, setSelectedAttendees, updatingBulk,
  handleBulkRoomUpdate, handleSingleRoomUpdate,
  roleLabel, isOrganizer, loadingMembers,
  setModal, setModalData, confId,
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const [confirmAcc, setConfirmAcc] = useState(null);

  return (
    <AnimatedSection className="space-y-6 pb-20">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className={`text-3xl font-black transition-colors duration-500 tracking-tight mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Attendees</h2>
          <p className="text-slate-500 font-medium tracking-wide">{attendees.length} registered attendee{attendees.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {(roleLabel.includes('Logistics') || isOrganizer) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Total Registered', value: attendees.length, accent: '#fbbf24', dimBgDark: 'rgba(251,191,36,0.05)', dimBorderDark: 'rgba(251,191,36,0.15)', dimBgLight: 'rgba(251,191,36,0.08)', dimBorderLight: 'rgba(251,191,36,0.2)' },
            { label: 'Room Assigned', value: attendees.filter(a => a.room_assigned).length, accent: '#10b981', dimBgDark: 'rgba(16,185,129,0.05)', dimBorderDark: 'rgba(16,185,129,0.15)', dimBgLight: 'rgba(16,185,129,0.08)', dimBorderLight: 'rgba(16,185,129,0.2)' },
            { label: 'Pending Allotment', value: attendees.filter(a => !a.room_assigned).length, accent: '#f97316', dimBgDark: 'rgba(249,115,22,0.05)', dimBorderDark: 'rgba(249,115,22,0.15)', dimBgLight: 'rgba(249,115,22,0.08)', dimBorderLight: 'rgba(249,115,22,0.2)' },
          ].map(({ label, value, accent, dimBgDark, dimBorderDark, dimBgLight, dimBorderLight }, i) => (
            <AnimatedSection key={label} delay={0.1 * i} className="h-full">
              <SpotlightCard className="h-full rounded-2xl" spotlightColor={`${accent}1A`}>
                <div className={`rounded-2xl p-6 h-full flex flex-col justify-between border backdrop-blur-xl transition-all duration-500 ${
                  isDark ? 'bg-slate-900/40 border-white/5 hover:bg-slate-900/60' : 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-sm'
                }`} style={{ border: `1px solid ${isDark ? dimBorderDark : dimBorderLight}` }}>
                  <div className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: accent, opacity: 0.8 }}>{label}</div>
                  <div className="text-4xl font-black transition-colors duration-500" style={{ color: accent, textShadow: isDark ? `0 0 20px ${accent}40` : 'none' }}>{value}</div>
                </div>
              </SpotlightCard>
            </AnimatedSection>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 backdrop-blur-md border transition-all duration-500 max-w-md w-full focus-within:border-amber-400/50 focus-within:shadow-[0_0_15px_rgba(251,191,36,0.15)] ${
          isDark ? 'bg-white/5 border-white/10 shadow-inner' : 'bg-zinc-100 border-zinc-200'
        }`}>
          <Search size={16} className="text-slate-400 shrink-0" />
          <input className={`bg-transparent outline-none text-sm font-semibold flex-1 transition-colors duration-500 ${isDark ? 'text-white' : 'text-zinc-900'}`} style={{ fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}
            placeholder="Search by name or email…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
          {memberSearch && <button onClick={() => setMemberSearch('')} className="text-slate-500 hover:text-amber-500 transition-colors"><X size={14} /></button>}
        </div>
          <div className="flex items-center justify-end w-full sm:w-auto gap-4 flex-wrap">
          <button disabled={filteredAttendees.length === 0}
            onClick={() => { if (selectedAttendees.size === filteredAttendees.length && filteredAttendees.length > 0) setSelectedAttendees(new Set()); else setSelectedAttendees(new Set(filteredAttendees.map(a => a.id))); }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 border ${
              isDark ? 'border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white' : 'border-zinc-200 text-slate-600 bg-zinc-100/50 hover:bg-zinc-200 hover:text-zinc-900'
            }`}>
            {selectedAttendees.size === filteredAttendees.length && filteredAttendees.length > 0 ? <CheckSquare size={16} className="text-amber-500" /> : <Square size={16} />}
            <span>{selectedAttendees.size === filteredAttendees.length && filteredAttendees.length > 0 ? 'Deselect All' : 'Select All'}</span>
          </button>
          
          {(roleLabel.includes('Logistics') || isOrganizer) && selectedAttendees.size > 0 && (
            <>
              <button disabled={updatingBulk} onClick={() => setConfirmAcc({ id: 'bulk', status: true, action: 'accept', name: `${selectedAttendees.size} selected attendee${selectedAttendees.size > 1 ? 's' : ''}` })}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20">
                <CheckCircle size={16} /> <span>Accept</span>
              </button>
              <button disabled={updatingBulk} onClick={() => setConfirmAcc({ id: 'bulk', status: false, action: 'reject', name: `${selectedAttendees.size} selected attendee${selectedAttendees.size > 1 ? 's' : ''}` })}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 border bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/20">
                <XCircle size={16} /> <span>Reject</span>
              </button>
            </>
          )}

          {attendees.length > 0 && (
            <button onClick={() => {
              const headers = ['Name','Email','Joined','Accommodation Required','Room Assigned','Room Number'];
              const rows = attendees.map(a => [mName(a), a.email || '', a.joined_at ? new Date(a.joined_at).toLocaleDateString() : '', a.accommodation_required ? 'Yes' : 'No', a.room_assigned ? 'Yes' : 'No', a.room_number || '']);
              const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a'); link.href = url; link.download = `attendees-${confId}.csv`; link.click(); URL.revokeObjectURL(url);
            }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-300 border ${
              isDark ? 'border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white' : 'border-zinc-200 text-slate-600 bg-zinc-100/50 hover:bg-zinc-200 hover:text-zinc-900'
            }`}>
              <FileText size={16} /> <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {loadingMembers ? <LoadingRows /> : filteredAttendees.length === 0 ? (
        <Empty icon={Users} msg={attendees.length === 0 ? 'No attendees have registered yet.' : 'No attendees match your search.'} />
      ) : (
        <div className="space-y-3">
          {filteredAttendees.map((a, i) => (
            <AnimatedSection key={a.id} delay={0.05 * i}
              onClick={() => { const next = new Set(selectedAttendees); if (next.has(a.id)) next.delete(a.id); else next.add(a.id); setSelectedAttendees(next); }}
              className={`group rounded-2xl px-4 md:px-6 py-4 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-5 transition-all duration-500 cursor-pointer backdrop-blur-xl border ${
                selectedAttendees.has(a.id) 
                  ? 'shadow-[0_0_20px_rgba(251,191,36,0.15)] bg-amber-500/10 border-amber-400/50' 
                  : isDark ? 'shadow-md bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60' : 'bg-white/80 border-zinc-200 hover:border-amber-200/50 hover:bg-white shadow-sm'
              }`}>
              
              <div className="flex items-center gap-4 w-full md:w-auto min-w-0">
                <div onClick={(e) => { e.stopPropagation(); const next = new Set(selectedAttendees); if (next.has(a.id)) next.delete(a.id); else next.add(a.id); setSelectedAttendees(next); }} 
                  className={`w-6 h-6 shrink-0 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  selectedAttendees.has(a.id) 
                    ? 'bg-amber-400 border-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.5)]' 
                    : isDark ? 'border border-slate-600 bg-white/5 text-transparent group-hover:border-slate-400' : 'border border-zinc-300 bg-zinc-50 text-transparent group-hover:border-zinc-500'
                }`}>
                  <Check size={14} className={selectedAttendees.has(a.id) ? 'opacity-100' : 'opacity-0'} />
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center text-base md:text-lg font-black shrink-0 shadow-inner" style={{ background: isDark ? 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.05))' : 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', color: '#fbbf24', border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A'}` }}>
                  {mName(a)[0]?.toUpperCase()}
                </div>
                <div className="md:hidden flex-1 min-w-0 pr-2">
                  <div className={`text-sm font-bold truncate tracking-wide transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>{mName(a)}</div>
                  <div className="text-[11px] font-semibold text-slate-500 truncate">{a.email}</div>
                </div>
              </div>

              <div className="hidden md:block flex-1 min-w-0">
                <div className={`text-base font-bold truncate tracking-wide transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>{mName(a)}</div>
                <div className="text-xs font-semibold text-slate-500 truncate">{a.email}</div>
              </div>

              <div className="flex flex-row flex-wrap items-center justify-between w-full md:w-auto gap-3 shrink-0 pl-14 md:pl-0 mt-3 md:mt-0 pt-3 md:pt-0 border-t border-black/5 dark:border-white/5 md:border-transparent" onClick={e => e.stopPropagation()}>
                <span className="px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-sm w-auto text-center"
                  style={a.room_assigned
                    ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
                    : { background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                  {a.room_assigned ? 'Acc. Confirmed' : 'Acc. Pending'}
                </span>

                <div className="flex items-center justify-end flex-auto md:flex-initial flex-wrap gap-2">
                  {isOrganizer && (
                    <button onClick={(e) => { e.stopPropagation(); setModalData(a); setModal('confirmDelete'); }}
                      className={`p-2 rounded-xl transition-all duration-300 md:opacity-0 md:group-hover:opacity-100 ${
                        isDark ? 'text-slate-400 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400' : 'text-slate-400 bg-zinc-100 hover:bg-rose-50 hover:text-rose-500'
                      }`}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      )}

      {confirmAcc && (
        <Modal title="Confirm Action" onClose={() => setConfirmAcc(null)} width="max-w-md">
          <div className="space-y-6">
            <div className={`flex items-start gap-4 p-4 rounded-2xl border ${confirmAcc.action === 'accept' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
              <div className={`p-3 rounded-xl shrink-0 ${confirmAcc.action === 'accept' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {confirmAcc.action === 'accept' ? <CheckCircle size={24} /> : <XCircle size={24} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Are you sure you want to <span className={`font-bold ${confirmAcc.action === 'accept' ? 'text-emerald-500' : 'text-rose-500'}`}>{confirmAcc.action}</span> accommodation for this attendee?
                </p>
                <p className={`text-sm font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{confirmAcc.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Btn variant="secondary" className="flex-1" onClick={() => setConfirmAcc(null)}>Cancel</Btn>
              <Btn variant="primary" className="flex-[1.5]" onClick={() => { 
                if (confirmAcc.id === 'bulk') {
                  handleBulkRoomUpdate(confirmAcc.status);
                } else {
                  handleSingleRoomUpdate(confirmAcc.id, confirmAcc.status); 
                }
                setConfirmAcc(null); 
              }}>
                Confirm {confirmAcc.action.charAt(0).toUpperCase() + confirmAcc.action.slice(1)}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

    </AnimatedSection>
  );
};

export default AttendeesSection;
