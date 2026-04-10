import React from 'react';
import {
  Users, Search, X, FileText, CheckSquare, Square,
  CheckCircle, XCircle, Clock, Check, Trash2,
} from 'lucide-react';
import { mName } from '../../constants';
import { Empty, LoadingRows } from '../common/Primitives';
import { SpotlightCard, AnimatedSection } from '../common/Effects';
import { motion } from 'framer-motion';

const AttendeesSection = ({
  attendees, filteredAttendees, memberSearch, setMemberSearch,
  selectedAttendees, setSelectedAttendees, updatingBulk,
  handleBulkRoomUpdate, handleSingleRoomUpdate,
  roleLabel, isOrganizer, loadingMembers,
  setModal, setModalData, confId,
}) => (
  <AnimatedSection className="space-y-6 pb-20">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-1">Attendees</h2>
        <p className="text-slate-400 font-medium tracking-wide">{attendees.length} registered attendee{attendees.length !== 1 ? 's' : ''}</p>
      </div>
    </div>

    {(roleLabel.includes('Logistics') || isOrganizer) && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Registered', value: attendees.length, accent: '#fbbf24', bg: 'rgba(251,191,36,0.05)', border: 'rgba(251,191,36,0.15)' },
          { label: 'Room Assigned', value: attendees.filter(a => a.room_assigned).length, accent: '#10b981', bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.15)' },
          { label: 'Pending Allotment', value: attendees.filter(a => !a.room_assigned).length, accent: '#f97316', bg: 'rgba(249,115,22,0.05)', border: 'rgba(249,115,22,0.15)' },
        ].map(({ label, value, accent, bg, border }, i) => (
          <AnimatedSection key={label} delay={0.1 * i} className="h-full">
            <SpotlightCard className="h-full rounded-2xl" spotlightColor={`${accent}1A`}>
              <div className="rounded-2xl p-6 h-full flex flex-col justify-between border border-white/5 bg-slate-900/40 backdrop-blur-xl hover:bg-slate-900/60 transition-all" style={{ border: `1px solid ${border}` }}>
                <div className="text-[11px] font-black uppercase tracking-widest mb-1" style={{ color: accent, opacity: 0.8 }}>{label}</div>
                <div className="text-4xl font-black" style={{ color: accent, textShadow: `0 0 20px ${accent}40` }}>{value}</div>
              </div>
            </SpotlightCard>
          </AnimatedSection>
        ))}
      </div>
    )}

    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-white/5 backdrop-blur-md border border-white/10 shadow-inner max-w-md w-full focus-within:border-amber-400/50 focus-within:shadow-[0_0_15px_rgba(251,191,36,0.15)] transition-all">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input className="bg-transparent outline-none text-sm font-semibold text-white placeholder-slate-500 flex-1" style={{ fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}
          placeholder="Search by name or email…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
        {memberSearch && <button onClick={() => setMemberSearch('')} className="text-slate-500 hover:text-white transition-colors"><X size={14} /></button>}
      </div>
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <button disabled={filteredAttendees.length === 0}
          onClick={() => { if (selectedAttendees.size === filteredAttendees.length && filteredAttendees.length > 0) setSelectedAttendees(new Set()); else setSelectedAttendees(new Set(filteredAttendees.map(a => a.id))); }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all whitespace-nowrap disabled:opacity-50 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white">
          {selectedAttendees.size === filteredAttendees.length && filteredAttendees.length > 0 ? <CheckSquare size={16} className="text-amber-400" /> : <Square size={16} />}
          {selectedAttendees.size === filteredAttendees.length && filteredAttendees.length > 0 ? 'Deselect All' : 'Select All'}
        </button>
        {attendees.length > 0 && (
          <button onClick={() => {
            const headers = ['Name','Email','Joined','Accommodation Required','Room Assigned','Room Number'];
            const rows = attendees.map(a => [mName(a), a.email || '', a.joined_at ? new Date(a.joined_at).toLocaleDateString() : '', a.accommodation_required ? 'Yes' : 'No', a.room_assigned ? 'Yes' : 'No', a.room_number || '']);
            const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a'); link.href = url; link.download = `attendees-${confId}.csv`; link.click(); URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 hover:text-white">
            <FileText size={16} /> Export
          </button>
        )}
      </div>
    </div>

    {/* Bulk Action Bar */}
    {selectedAttendees.size > 0 && (
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-6 z-[100]"
        style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', border: '1px solid rgba(251,191,36,0.4)', boxShadow: '0 20px 60px rgba(251,191,36,0.4)' }}>
        <div className="flex items-center gap-3 border-r border-black/20 pr-6">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black bg-black/20 text-black">{selectedAttendees.size}</div>
          <span className="text-xs font-black uppercase tracking-widest text-black/80">Selected</span>
        </div>
        <div className="flex items-center gap-3">
          <button disabled={updatingBulk} onClick={() => handleBulkRoomUpdate(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-black/10 text-black hover:bg-black/20">
            <CheckCircle size={16} /> Mark Assigned
          </button>
          <button disabled={updatingBulk} onClick={() => handleBulkRoomUpdate(false)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all bg-black/10 text-black hover:bg-black/20">
            <XCircle size={16} /> Mark Unassigned
          </button>
        </div>
        <button onClick={() => setSelectedAttendees(new Set())} className="text-black/50 hover:text-black transition-colors"><X size={20} /></button>
      </motion.div>
    )}

    {loadingMembers ? <LoadingRows /> : filteredAttendees.length === 0 ? (
      <Empty icon={Users} msg={attendees.length === 0 ? 'No attendees have registered yet.' : 'No attendees match your search.'} />
    ) : (
      <div className="space-y-3">
        {filteredAttendees.map((a, i) => (
          <AnimatedSection key={a.id} delay={0.05 * i}
            onClick={() => { const next = new Set(selectedAttendees); if (next.has(a.id)) next.delete(a.id); else next.add(a.id); setSelectedAttendees(next); }}
            className={`group rounded-2xl px-6 py-4 flex items-center gap-5 transition-all cursor-pointer backdrop-blur-xl ${selectedAttendees.has(a.id) ? 'shadow-[0_0_20px_rgba(251,191,36,0.15)] bg-amber-500/10 border-amber-400/30' : 'shadow-md bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60'}`}
            style={{ border: `1px solid ${selectedAttendees.has(a.id) ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${selectedAttendees.has(a.id) ? 'bg-amber-400 border-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'border border-slate-600 bg-white/5 text-transparent group-hover:border-slate-400'}`}>
              <Check size={14} />
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 shadow-inner" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.05))', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
              {mName(a)[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-white truncate tracking-wide">{mName(a)}</div>
              <div className="text-xs font-semibold text-slate-500 truncate">{a.email}</div>
            </div>
            <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
              {(roleLabel.includes('Logistics') || isOrganizer) ? (
                <button onClick={() => handleSingleRoomUpdate(a.id, !a.room_assigned)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all"
                  style={a.room_assigned
                    ? { background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.1)' }
                    : { background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', boxShadow: '0 0 10px rgba(251,191,36,0.1)' }}>
                  {a.room_assigned ? <CheckCircle size={12} /> : <Clock size={12} />}
                  {a.room_assigned ? 'Room Assigned' : 'Awaiting Room'}
                </button>
              ) : (
                a.room_assigned && (
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981' }}>
                    <CheckCircle size={12} /> Room Assigned
                  </div>
                )
              )}
              {isOrganizer && (
                <button onClick={() => { setModalData(a); setModal('confirmDelete'); }}
                  className="p-2.5 rounded-xl transition-all text-slate-400 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 hover:shadow-[0_0_10px_rgba(244,63,94,0.2)] opacity-0 group-hover:opacity-100">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </AnimatedSection>
        ))}
      </div>
    )}
  </AnimatedSection>
);

export default AttendeesSection;
