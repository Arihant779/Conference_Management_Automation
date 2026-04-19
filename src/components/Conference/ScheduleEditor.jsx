import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Clock, ChevronDown, User, AlertCircle } from 'lucide-react';

/* ─── Session type palette ─── */
const SESSION_TYPES = ['keynote', 'panel', 'workshop', 'talk', 'break', 'social'];

const typeColors = {
  keynote: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  panel: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  workshop: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  talk: 'bg-amber-400/20 text-amber-200 border-amber-400/30',
  break: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  social: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

/* ─── Reusable primitives matching the app's design ─── */
const cls = (...c) => c.filter(Boolean).join(' ');

const Input = ({ className, ...props }) => (
  <input
    {...props}
    className={cls(
      'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm',
      'focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 outline-none text-white placeholder-slate-600 transition-all',
      className,
    )}
  />
);

const Sel = ({ children, className, ...props }) => (
  <select
    {...props}
    className={cls(
      'bg-[#080B12] border border-white/10 rounded-xl px-3 py-2 text-sm',
      'focus:border-amber-500/50 outline-none text-white transition-all cursor-pointer',
      className,
    )}
  >
    {children}
  </select>
);

/* ═════════════════════════════════════════════════════════════════════════════
   SCHEDULE EDITOR  — modal component
   Props:
     schedule       – current schedule array (days → sessions)
     members        – conference members [{ id, user_id, full_name, email }]
     confId         – conference id
     editorName     – name of the person editing
     editorPosition – their position/role label
     onSave         – async (newSchedule) => void
     onClose        – () => void
   ═════════════════════════════════════════════════════════════════════════════ */
const ScheduleEditor = ({ schedule: initialSchedule, members = [], onSave, onClose }) => {
  const [schedule, setSchedule] = useState(initialSchedule || []);
  const [activeDay, setActiveDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    setSchedule(initialSchedule || []);
    setActiveDay(0);
  }, [initialSchedule]);

  /* ── helpers ── */
  const mName = (m) => m?.full_name || m?.email || m?.user_id?.substring(0, 8) || '?';

  const updateDay = (di, field, value) => {
    setSchedule(s => s.map((d, i) => i !== di ? d : { ...d, [field]: value }));
  };

  const updateSession = (di, si, field, value) => {
    setSchedule(s => s.map((d, dIdx) => dIdx !== di ? d : {
      ...d,
      sessions: d.sessions.map((ss, sIdx) => sIdx !== si ? ss : { ...ss, [field]: value }),
    }));
  };

  const addDay = () => {
    const newDay = { day: `Day ${schedule.length + 1}`, date: '', sessions: [] };
    setSchedule(s => [...s, newDay]);
    setActiveDay(schedule.length);
  };

  const removeDay = (di) => {
    setSchedule(s => s.filter((_, i) => i !== di));
    setActiveDay(a => Math.max(0, a >= di ? a - 1 : a));
  };

  const addSession = (di) => {
    setSchedule(s => s.map((d, i) => i !== di ? d : {
      ...d,
      sessions: [...d.sessions, {
        time: '09:00 AM',
        duration: 30,
        title: 'New Session',
        type: 'talk',
        speaker: '',
        room: '',
        head_id: ''
      }],
    }));
  };

  const removeSession = (di, si) => {
    setSchedule(s => s.map((d, i) => i !== di ? d : {
      ...d,
      sessions: d.sessions.filter((_, idx) => idx !== si),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(schedule);
      onClose();
    } catch (e) {
      setSaveError(e.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const getEndTime = (startTime, durationRaw) => {
    const duration = parseInt(durationRaw) || 0;
    if (!startTime || !duration) return '';
    try {
      const [time, period] = startTime.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      const totalMinutes = hours * 60 + minutes + duration;
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMins = totalMinutes % 60;
      const endPeriod = endHours >= 12 ? 'PM' : 'AM';
      const displayHours = ((endHours + 11) % 12 + 1);

      return `${displayHours}:${String(endMins).padStart(2, '0')} ${endPeriod}`;
    } catch (e) {
      return '';
    }
  };

  const currentDay = schedule[activeDay] || null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 font-sans"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#04070D] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px] pointer-events-none" />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 shrink-0 relative z-10">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Edit Schedule</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">Add days, sessions, and assign session heads</p>
          </div>
          <div className="flex items-center gap-4">
            {saveError && (
              <span className="flex items-center gap-1.5 text-xs text-red-400 font-medium bg-red-400/10 px-3 py-1.5 rounded-full border border-red-400/20">
                <AlertCircle size={13} /> {saveError}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="group relative flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-black bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition-all disabled:opacity-60 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <Save size={16} className="relative z-10" />
              <span className="relative z-10">{saving ? 'Saving…' : 'Save Schedule'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full hover:bg-white/5 text-slate-500 hover:text-white transition-all border border-transparent hover:border-white/10"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── Day Tabs ── */}
        <div className="flex items-center gap-2 px-8 py-4 border-b border-white/5 overflow-x-auto shrink-0 bg-black/20">
          {schedule.map((day, di) => (
            <button
              key={di}
              onClick={() => setActiveDay(di)}
              className={cls(
                'px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border',
                activeDay === di
                  ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/10'
                  : 'text-slate-500 border-white/5 hover:text-slate-300 hover:bg-white/5',
              )}
            >
              {day.day}
            </button>
          ))}
          <button
            onClick={addDay}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-400 border border-amber-500/20 hover:bg-amber-500/10 transition-all ml-2"
          >
            <Plus size={14} /> Add Day
          </button>
        </div>

        {/* ── Day Content ── */}
        <div className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar bg-[#04070D]">
          {schedule.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-white/5 rounded-[32px] bg-white/[0.01]">
              <Clock size={40} className="text-slate-800 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400 text-sm font-medium">No days added yet.</p>
              <button
                onClick={addDay}
                className="mt-4 text-amber-400 text-sm hover:text-amber-300 font-black uppercase tracking-widest flex items-center gap-2 mx-auto px-6 py-2 rounded-full border border-amber-500/10 hover:bg-amber-500/5 transition-all"
              >
                <Plus size={14} /> Add your first day
              </button>
            </div>
          ) : currentDay ? (
            <div className="space-y-8">
              {/* Day meta */}
              <div className="flex items-center gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
                <div className="flex-1 flex gap-6">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.2em] block mb-2 underline decoration-amber-500/20 underline-offset-4">Day Label</label>
                    <Input
                      value={currentDay.day}
                      onChange={e => updateDay(activeDay, 'day', e.target.value)}
                      className="bg-black/40 border-white/5 focus:border-amber-500/50"
                    />
                  </div>
                  <div className="flex-[2]">
                    <label className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.2em] block mb-2 underline decoration-amber-500/20 underline-offset-4">Event Date</label>
                    <Input
                      value={currentDay.date}
                      onChange={e => updateDay(activeDay, 'date', e.target.value)}
                      placeholder="e.g. March 15, 2025"
                      className="bg-black/40 border-white/5 focus:border-amber-500/50"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeDay(activeDay)}
                  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400/50 hover:text-red-400 transition-all p-3 rounded-xl hover:bg-red-400/5 border border-transparent hover:border-red-400/10"
                >
                  <Trash2 size={14} /> Remove Day
                </button>
              </div>

              {/* Sessions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Program Sessions ({currentDay.sessions.length})</span>
                </div>

                {currentDay.sessions.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                    <p className="text-slate-600 text-sm font-medium">Start building your program by adding a session below</p>
                  </div>
                ) : (
                  currentDay.sessions.map((session, si) => (
                    <div key={si} className="bg-[#080B12] border border-white/5 rounded-2xl p-6 hover:border-amber-500/20 transition-all group relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-amber-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="grid grid-cols-12 gap-6">
                        {/* Time & Duration */}
                        <div className="col-span-3">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 opacity-60">Timing</label>
                          <div className="flex gap-2">
                            <Input
                              value={session.time}
                              onChange={e => updateSession(activeDay, si, 'time', e.target.value)}
                              placeholder="09:00 AM"
                              className="text-xs font-mono"
                            />
                            <div className="relative">
                              <Input
                                type="number"
                                value={session.duration || 30}
                                onChange={e => updateSession(activeDay, si, 'duration', parseInt(e.target.value) || 0)}
                                className="w-20 pr-6 text-xs"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-500 font-bold pointer-events-none uppercase">min</span>
                            </div>
                          </div>
                          {session.time && (
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-wider bg-amber-400/5 w-fit px-2 py-0.5 rounded-md border border-amber-400/10">
                              Ends {getEndTime(session.time, session.duration)}
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <div className="col-span-5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 opacity-60">Session Title</label>
                          <Input
                            value={session.title}
                            onChange={e => updateSession(activeDay, si, 'title', e.target.value)}
                            placeholder="e.g. Keynote Address"
                            className="font-bold text-white tracking-wide"
                          />
                        </div>

                        {/* Type */}
                        <div className="col-span-3">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 opacity-60">Category</label>
                          <Sel
                            value={session.type}
                            onChange={e => updateSession(activeDay, si, 'type', e.target.value)}
                            className={cls("w-full transition-all", typeColors[session.type] || '')}
                          >
                            {SESSION_TYPES.map(t => <option key={t} value={t} className="bg-[#0b0f1a]">{t.toUpperCase()}</option>)}
                          </Sel>
                        </div>

                        {/* Delete */}
                        <div className="col-span-1 flex items-start justify-end pt-5">
                          <button
                            onClick={() => removeSession(activeDay, si)}
                            className="p-2 rounded-xl text-red-400/50 hover:text-red-400 hover:bg-red-400/5 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-400/10"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Speaker & Room */}
                        <div className="col-span-4">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 opacity-60">Speaker / Presenter</label>
                          <Input
                            value={session.speaker || ''}
                            onChange={e => updateSession(activeDay, si, 'speaker', e.target.value)}
                            placeholder="Full name…"
                            className="text-white/80"
                          />
                        </div>

                        <div className="col-span-3">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 opacity-60">Location / Room</label>
                          <Input
                            value={session.room || ''}
                            onChange={e => updateSession(activeDay, si, 'room', e.target.value)}
                            placeholder="Room or link…"
                            className="text-white/80"
                          />
                        </div>

                        {/* Session Head */}
                        <div className="col-span-5">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1.5 opacity-60 flex items-center gap-1.5">
                            <User size={10} className="text-amber-500" /> Administrative Head
                          </label>
                          <Sel
                            value={session.head_id || ''}
                            onChange={e => updateSession(activeDay, si, 'head_id', e.target.value)}
                            className="w-full text-white/90"
                          >
                            <option value="" className="bg-[#0b0f1a]">— No head assigned —</option>
                            {members.map(m => (
                              <option key={m.id} value={m.user_id} className="bg-[#0b0f1a]">{mName(m)} ({m.role || 'Member'})</option>
                            ))}
                          </Sel>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <button
                  onClick={() => addSession(activeDay)}
                  className="w-full border-2 border-dashed border-white/5 hover:border-amber-500/30 bg-white/[0.01] hover:bg-amber-500/5 text-slate-500 hover:text-amber-400 rounded-[20px] py-6 text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-black transition-all">
                    <Plus size={16} />
                  </div>
                  Add Session to {currentDay.day}
                </button>
              </div>
            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
};

export default ScheduleEditor;
