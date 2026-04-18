import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Clock, ChevronDown, User, AlertCircle } from 'lucide-react';

/* ─── Session type palette ─── */
const SESSION_TYPES = ['keynote', 'panel', 'workshop', 'talk', 'break', 'social'];

const typeColors = {
  keynote: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  panel: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  workshop: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  talk: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  break: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  social: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

/* ─── Reusable primitives matching the app's design ─── */
const cls = (...c) => c.filter(Boolean).join(' ');

const Input = ({ className, ...props }) => (
  <input
    {...props}
    className={cls(
      'w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm',
      'focus:border-indigo-500 outline-none text-white placeholder-slate-600 transition-colors',
      className,
    )}
  />
);

const Sel = ({ children, className, ...props }) => (
  <select
    {...props}
    className={cls(
      'bg-[#0d1117] border border-white/8 rounded-xl px-3 py-2 text-sm',
      'focus:border-indigo-500 outline-none text-white transition-colors',
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
      className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Edit Schedule</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add days, sessions, and assign session heads</p>
          </div>
          <div className="flex items-center gap-3">
            {saveError && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle size={12} /> {saveError}
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-60"
            >
              <Save size={14} /> {saving ? 'Saving…' : 'Save Schedule'}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-all"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Day Tabs ── */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-white/6 overflow-x-auto shrink-0">
          {schedule.map((day, di) => (
            <button
              key={di}
              onClick={() => setActiveDay(di)}
              className={cls(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap',
                activeDay === di
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5',
              )}
            >
              {day.day}
            </button>
          ))}
          <button
            onClick={addDay}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-indigo-400 hover:bg-indigo-500/10 transition-all"
          >
            <Plus size={13} /> Add Day
          </button>
        </div>

        {/* ── Day Content ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {schedule.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-white/8 rounded-2xl">
              <Clock size={28} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No days added yet.</p>
              <button
                onClick={addDay}
                className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 font-semibold"
              >
                + Add your first day
              </button>
            </div>
          ) : currentDay ? (
            <div className="space-y-5">
              {/* Day meta */}
              <div className="flex items-center gap-3">
                <div className="flex-1 flex gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Day Label</label>
                    <Input
                      value={currentDay.day}
                      onChange={e => updateDay(activeDay, 'day', e.target.value)}
                      className="w-32"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Date</label>
                    <Input
                      value={currentDay.date}
                      onChange={e => updateDay(activeDay, 'date', e.target.value)}
                      placeholder="e.g. March 15, 2025"
                      className="w-48"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeDay(activeDay)}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-400/70 hover:text-red-400 transition-colors mt-5"
                >
                  <Trash2 size={12} /> Remove Day
                </button>
              </div>

              {/* Sessions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sessions ({currentDay.sessions.length})</span>
                </div>

                {currentDay.sessions.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-white/8 rounded-xl">
                    <p className="text-slate-600 text-sm">No sessions yet</p>
                  </div>
                ) : (
                  currentDay.sessions.map((session, si) => (
                    <div key={si} className="bg-white/[0.02] border border-white/6 rounded-xl p-4 hover:border-white/10 transition-all group">
                      <div className="grid grid-cols-12 gap-3">
                        {/* Time & Duration */}
                        <div className="col-span-3">
                          <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Time & Duration</label>
                          <div className="flex gap-2">
                            <Input
                              value={session.time}
                              onChange={e => updateSession(activeDay, si, 'time', e.target.value)}
                              placeholder="09:00 AM"
                              className="w-2/3"
                            />
                            <div className="relative w-1/3">
                              <Input
                                type="number"
                                value={session.duration || 30}
                                onChange={e => updateSession(activeDay, si, 'duration', parseInt(e.target.value) || 0)}
                                className="pr-1"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] text-slate-500 font-bold pointer-events-none">m</span>
                            </div>
                          </div>
                          {session.time && session.duration > 0 && (
                            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-indigo-400 font-medium">
                              <span className="opacity-50">Ends:</span>
                              {getEndTime(session.time, session.duration)}
                            </div>
                          )}
                        </div>

                        {/* Title */}
                        <div className="col-span-3">
                          <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Session Title</label>
                          <Input
                            value={session.title}
                            onChange={e => updateSession(activeDay, si, 'title', e.target.value)}
                            placeholder="Session title…"
                          />
                        </div>

                        {/* Type */}
                        <div className="col-span-2">
                          <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Type</label>
                          <Sel
                            value={session.type}
                            onChange={e => updateSession(activeDay, si, 'type', e.target.value)}
                            className="w-full"
                          >
                            {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </Sel>
                        </div>

                        {/* Speaker */}
                        <div className="col-span-3">
                          <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Speaker</label>
                          <Input
                            value={session.speaker || ''}
                            onChange={e => updateSession(activeDay, si, 'speaker', e.target.value)}
                            placeholder="Speaker name…"
                          />
                        </div>

                        {/* Delete */}
                        <div className="col-span-1 flex items-end justify-center pb-1">
                          <button
                            onClick={() => removeSession(activeDay, si)}
                            className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        {/* Room */}
                        <div className="col-span-3">
                          <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Room</label>
                          <Input
                            value={session.room || ''}
                            onChange={e => updateSession(activeDay, si, 'room', e.target.value)}
                            placeholder="Room…"
                          />
                        </div>

                        {/* Session Head */}
                        <div className="col-span-5">
                          <label className="text-[9px] font-bold text-slate-600 uppercase tracking-wider block mb-1 flex items-center gap-1">
                            <User size={9} /> Session Head
                          </label>
                          <Sel
                            value={session.head_id || ''}
                            onChange={e => updateSession(activeDay, si, 'head_id', e.target.value)}
                            className="w-full"
                          >
                            <option value="">— No head assigned —</option>
                            {members.map(m => (
                              <option key={m.id} value={m.user_id}>{mName(m)} ({m.email || m.role || ''})</option>
                            ))}
                          </Sel>
                        </div>
                      </div>
                    </div>
                  ))
                )}

                <button
                  onClick={() => addSession(activeDay)}
                  className="w-full border border-dashed border-white/10 hover:border-indigo-500/40 text-slate-500 hover:text-indigo-400 rounded-xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <Plus size={14} /> Add Session
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
