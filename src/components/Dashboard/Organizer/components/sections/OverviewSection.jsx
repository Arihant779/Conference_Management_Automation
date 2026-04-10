import React from 'react';
import { Trash2, Sparkles } from 'lucide-react';
import { VOLUNTEER_ROLE_LABELS } from '../../constants';
import { Btn } from '../common/Primitives';
import { SpotlightCard, AnimatedSection } from '../common/Effects';

const OverviewSection = ({
  members, teams, tasks, confPapers,
  pendingCount, accepted, rejected,
  volunteersCount, volunteerMap,
  isGlobalHead, can, setSection, setModal,
}) => (
  <AnimatedSection className="space-y-6">
    <div className="flex items-center justify-between mb-8">
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-1">Event Overview</h2>
        <p className="text-slate-400 font-medium tracking-wide">Real-time conference metrics</p>
      </div>
      {isGlobalHead && (
        <Btn variant="danger" onClick={() => setModal('deleteConference')}>
          <Trash2 size={16} /> Delete Conference
        </Btn>
      )}
    </div>

    {/* Stat cards */}
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {[
        { label: 'Members',    value: members.filter(m => m.role !== 'attendee').length, accent: '#fbbf24', dimBg: 'rgba(251,191,36,0.05)', dimBorder: 'rgba(251,191,36,0.15)' },
        { label: 'Attendees',  value: members.filter(m => m.role === 'attendee').length,  accent: '#10b981', dimBg: 'rgba(16,185,129,0.05)', dimBorder: 'rgba(16,185,129,0.15)' },
        { label: 'Teams',      value: teams.length,                                        accent: '#8b5cf6', dimBg: 'rgba(139,92,246,0.05)', dimBorder: 'rgba(139,92,246,0.15)' },
        { label: 'Papers',     value: confPapers.length,                                   accent: '#3b82f6', dimBg: 'rgba(59,130,246,0.05)', dimBorder: 'rgba(59,130,246,0.15)' },
        { label: 'Open Tasks', value: tasks.filter(t => t.status !== 'done').length,       accent: '#f97316', dimBg: 'rgba(249,115,22,0.05)',  dimBorder: 'rgba(249,115,22,0.15)' },
      ].map(({ label, value, accent, dimBg, dimBorder }, i) => (
        <AnimatedSection key={label} delay={0.1 * i} className="h-full">
          <SpotlightCard className="h-full rounded-2xl" spotlightColor={`${accent}1A`}>
            <div className="rounded-2xl p-6 flex flex-col justify-between h-full border border-white/5 bg-slate-900/40 backdrop-blur-xl transition-all hover:bg-slate-900/60" style={{ border: `1px solid ${dimBorder}` }}>
              <div className="text-4xl font-black mb-2" style={{ color: accent, textShadow: `0 0 20px ${accent}40` }}>{value}</div>
              <div className="text-[11px] font-black uppercase tracking-widest" style={{ color: accent, opacity: 0.8 }}>{label}</div>
            </div>
          </SpotlightCard>
        </AnimatedSection>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      {volunteersCount > 0 && (
        <SpotlightCard className="rounded-2xl">
          <div className="rounded-2xl p-6 h-full border border-amber-500/10 bg-slate-900/50 backdrop-blur-xl hover:bg-slate-900/70 transition-all">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span className="text-sm font-bold text-white tracking-wide">Volunteer Preferences</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-amber-400 bg-amber-500/10 border border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]">
                {volunteersCount} pending
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(VOLUNTEER_ROLE_LABELS).filter(([id]) => Object.values(volunteerMap).some(p => p.volunteer_roles?.includes(id))).map(([id, label]) => (
                <span key={id} className="text-xs font-bold px-3 py-1.5 rounded-lg text-amber-300 bg-amber-500/10 border border-amber-500/15">{label}</span>
              ))}
            </div>
          </div>
        </SpotlightCard>
      )}

      {confPapers.length > 0 && (
        <SpotlightCard className="rounded-2xl">
          <div className="rounded-2xl p-6 h-full border border-white/5 bg-slate-900/50 backdrop-blur-xl hover:bg-slate-900/70 transition-all">
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm font-bold text-white tracking-wide">Paper Review</span>
              <button onClick={() => setSection('papers')} className="text-xs font-bold text-amber-400 hover:text-amber-300">View all →</button>
            </div>
            <div className="h-3 rounded-full overflow-hidden flex bg-white/5 shadow-inner">
              <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${(accepted / confPapers.length) * 100}%` }} />
              <div className="h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" style={{ width: `${(rejected / confPapers.length) * 100}%` }} />
              <div className="h-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" style={{ width: `${(pendingCount / confPapers.length) * 100}%` }} />
            </div>
            <div className="flex gap-6 mt-4 text-xs font-semibold text-slate-400">
              {[['#10b981','Accepted',accepted],['#f43f5e','Rejected',rejected],['#fbbf24','Pending',pendingCount]].map(([c,l,v]) => (
                <span key={l} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block shadow-sm" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />
                  {l} <span className="text-white ml-0.5">{v}</span>
                </span>
              ))}
            </div>
          </div>
        </SpotlightCard>
      )}

      {teams.length > 0 && (
        <SpotlightCard className="rounded-2xl">
          <div className="rounded-2xl p-6 h-full border border-white/5 bg-slate-900/50 backdrop-blur-xl hover:bg-slate-900/70 transition-all">
            <div className="flex justify-between items-center mb-5">
              <span className="text-sm font-bold text-white tracking-wide">Active Teams</span>
              {can('manage_teams') && <button onClick={() => setSection('teams')} className="text-xs font-bold text-amber-400 hover:text-amber-300">Manage →</button>}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {teams.slice(0, 6).map(t => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl p-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-default">
                  <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: t.color, boxShadow: `0 0 8px ${t.color}` }} />
                  <span className="text-xs font-bold text-slate-200 truncate flex-1">{t.name}</span>
                  <span className="text-[10px] font-black text-slate-500">{t.memberList?.length || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </SpotlightCard>
      )}

      <SpotlightCard className="rounded-2xl">
        <div className="rounded-2xl p-6 h-full border border-white/5 bg-slate-900/50 backdrop-blur-xl hover:bg-slate-900/70 transition-all">
          <div className="flex justify-between items-center mb-5">
            <span className="text-sm font-bold text-white tracking-wide">Task Completion</span>
            {can('manage_tasks') && <button onClick={() => setSection('tasks')} className="text-xs font-bold text-amber-400 hover:text-amber-300">Manage →</button>}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 rounded-full overflow-hidden bg-white/5 shadow-inner">
              <div className="h-full rounded-full transition-all bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                style={{ width: tasks.length > 0 ? `${(tasks.filter(t => t.status === 'done').length / tasks.length) * 100}%` : '0%' }} />
            </div>
            <span className="text-xs font-black text-slate-400 tracking-wider">
              <span className="text-white">{tasks.filter(t => t.status === 'done').length}</span> / {tasks.length}
            </span>
          </div>
        </div>
      </SpotlightCard>
    </div>
  </AnimatedSection>
);

export default OverviewSection;
