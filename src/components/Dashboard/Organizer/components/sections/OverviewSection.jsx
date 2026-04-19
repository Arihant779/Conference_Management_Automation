import React from 'react';
import { Trash2, Sparkles } from 'lucide-react';
import { VOLUNTEER_ROLE_LABELS } from '../../constants';
import { Btn } from '../common/Primitives';
import { SpotlightCard, AnimatedSection } from '../common/Effects';
import { useApp } from '../../../../../context/AppContext';

const OverviewSection = ({
  members, teams, tasks, confPapers,
  pendingCount, accepted, rejected,
  volunteersCount, volunteerMap,
  isGlobalHead, can, setSection, setModal,
  pendingTeams, onInviteResponse,
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <AnimatedSection className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className={`text-3xl font-black transition-colors duration-500 tracking-tight mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Event Overview</h2>
          <p className="text-slate-500 font-medium tracking-wide">Real-time conference metrics</p>
        </div>
        {isGlobalHead && (
          <Btn variant="danger" onClick={() => setModal?.('deleteConference')}>
            <Trash2 size={16} /> Delete Conference
          </Btn>
        )}
      </div>

      {/* ── TEAM INVITATIONS ── */}
      {pendingTeams?.length > 0 && (
          <div className={`p-6 rounded-[2rem] border animate-in slide-in-from-top-4 duration-500 ${isDark ? 'bg-amber-500/5 border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)]' : 'bg-amber-50/50 border-amber-200'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/20">
               <label className="text-xl">✉️</label>
            </div>
            <div>
              <h3 className={`text-lg font-black tracking-tight ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>Team Invitations</h3>
              <p className="text-xs font-bold text-amber-500/60 uppercase tracking-widest">You have been invited to collaborate</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingTeams.map(team => (
              <div key={team.id} className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${isDark ? 'bg-black/40 border-white/5 hover:border-white/10' : 'bg-white border-amber-100 shadow-sm'}`}>
                <div>
                  <div className={`font-black text-base ${isDark ? 'text-white' : 'text-zinc-900'}`}>{team.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Pending Response</div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => onInviteResponse(team.id, 'accepted')} className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase rounded-xl transition-all shadow-lg shadow-amber-500/20">Accept</button>
                  <button onClick={() => onInviteResponse(team.id, 'rejected')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${isDark ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Members',    value: members.filter(m => m.role !== 'attendee').length, accent: '#fbbf24', dimBgDark: 'rgba(251,191,36,0.05)', dimBorderDark: 'rgba(251,191,36,0.15)', dimBgLight: 'rgba(251,191,36,0.1)', dimBorderLight: 'rgba(251,191,36,0.4)' },
          { label: 'Attendees',  value: members.filter(m => m.role === 'attendee').length,  accent: '#10b981', dimBgDark: 'rgba(16,185,129,0.05)', dimBorderDark: 'rgba(16,185,129,0.15)', dimBgLight: 'rgba(16,185,129,0.1)', dimBorderLight: 'rgba(16,185,129,0.4)' },
          { label: 'Teams',      value: teams.length,                                        accent: '#8b5cf6', dimBgDark: 'rgba(139,92,246,0.05)', dimBorderDark: 'rgba(139,92,246,0.15)', dimBgLight: 'rgba(139,92,246,0.1)', dimBorderLight: 'rgba(139,92,246,0.4)' },
          { label: 'Papers',     value: confPapers.length,                                   accent: '#3b82f6', dimBgDark: 'rgba(59,130,246,0.05)', dimBorderDark: 'rgba(59,130,246,0.15)', dimBgLight: 'rgba(59,130,246,0.1)', dimBorderLight: 'rgba(59,130,246,0.4)' },
          { label: 'Open Tasks', value: tasks.filter(t => t.status !== 'done').length,       accent: '#f97316', dimBgDark: 'rgba(249,115,22,0.05)',  dimBorderDark: 'rgba(249,115,22,0.15)', dimBgLight: 'rgba(249,115,22,0.1)', dimBorderLight: 'rgba(249,115,22,0.4)' },
        ].map(({ label, value, accent, dimBgDark, dimBorderDark, dimBgLight, dimBorderLight }, i) => (
          <AnimatedSection key={label} delay={0.1 * i} className="h-full">
            <SpotlightCard className="h-full rounded-2xl" spotlightColor={`${accent}1A`}>
              <div className={`rounded-2xl p-6 flex flex-col justify-between h-full border backdrop-blur-xl transition-all duration-500 ${
                isDark ? 'bg-slate-900/40 border-white/5 hover:bg-slate-900/60' : 'bg-white border-zinc-300 hover:bg-zinc-50 shadow-md shadow-zinc-200/50'
              }`} style={{ border: `1px solid ${isDark ? dimBorderDark : dimBorderLight}` }}>
                <div className="text-4xl font-black mb-2" style={{ color: accent, textShadow: isDark ? `0 0 20px ${accent}40` : 'none' }}>{value}</div>
                <div className="text-[11px] font-black uppercase tracking-widest" style={{ color: accent, opacity: 0.8 }}>{label}</div>
              </div>
            </SpotlightCard>
          </AnimatedSection>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {volunteersCount > 0 && (
          <SpotlightCard className="rounded-2xl">
            <div className={`rounded-2xl p-6 h-full border backdrop-blur-xl transition-all duration-500 ${
              isDark ? 'border-amber-500/10 bg-slate-900/50 hover:bg-slate-900/70' : 'border-amber-300 bg-amber-50 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <span className={`text-sm font-bold tracking-wide transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Volunteer Preferences</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-amber-500 bg-amber-500/10 border border-amber-500/20 shadow-sm">
                  {volunteersCount} pending
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(VOLUNTEER_ROLE_LABELS).filter(([id]) => Object.values(volunteerMap).some(p => p.volunteer_roles?.includes(id))).map(([id, label]) => (
                  <span key={id} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                    isDark ? 'text-amber-300 bg-amber-500/10 border-amber-500/15' : 'text-amber-700 bg-amber-100 border-amber-200'
                  }`}>{label}</span>
                ))}
              </div>
            </div>
          </SpotlightCard>
        )}

        {confPapers.length > 0 && (
          <SpotlightCard className="rounded-2xl">
            <div className={`rounded-2xl p-6 h-full border backdrop-blur-xl transition-all duration-500 ${
              isDark ? 'border-white/5 bg-slate-900/50 hover:bg-slate-900/70' : 'border-zinc-300 bg-white hover:bg-zinc-50 shadow-md shadow-zinc-200/50'
            }`}>
              <div className="flex justify-between items-center mb-5">
                <span className={`text-sm font-bold tracking-wide transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Paper Review</span>
                <button onClick={() => setSection?.('papers')} className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">View all →</button>
              </div>
              <div className={`h-3 rounded-full overflow-hidden flex shadow-inner transition-colors ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`}>
                <div className="h-full bg-emerald-500 shadow-sm" style={{ width: `${(accepted / confPapers.length) * 100}%` }} />
                <div className="h-full bg-rose-500 shadow-sm" style={{ width: `${(rejected / confPapers.length) * 100}%` }} />
                <div className="h-full bg-amber-400 shadow-sm" style={{ width: `${(pendingCount / confPapers.length) * 100}%` }} />
              </div>
              <div className={`flex gap-6 mt-4 text-xs font-bold transition-colors ${isDark ? 'text-slate-400' : 'text-zinc-600'}`}>
                {[['#10b981','Accepted',accepted],['#f43f5e','Rejected',rejected],['#fbbf24','Pending',pendingCount]].map(([c,l,v]) => (
                  <span key={l} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block shadow-sm" style={{ background: c }} />
                    {l} <span className={`ml-0.5 transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>{v}</span>
                  </span>
                ))}
              </div>
            </div>
          </SpotlightCard>
        )}

        {teams.length > 0 && (
          <SpotlightCard className="rounded-2xl">
            <div className={`rounded-2xl p-6 h-full border backdrop-blur-xl transition-all duration-500 ${
              isDark ? 'border-white/5 bg-slate-900/50 hover:bg-slate-900/70' : 'border-zinc-300 bg-white hover:bg-zinc-50 shadow-md shadow-zinc-200/50'
            }`}>
              <div className="flex justify-between items-center mb-5">
                <span className={`text-sm font-bold tracking-wide transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Active Teams</span>
                {can?.('manage_teams') && <button onClick={() => setSection?.('teams')} className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">Manage →</button>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {teams.slice(0, 6).map(t => (
                  <div key={t.id} className={`flex items-center gap-3 rounded-xl p-3 border transition-all duration-300 cursor-default ${
                    isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-zinc-300 hover:bg-zinc-50 shadow-sm'
                  }`}>
                    <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: t.color }} />
                    <span className={`text-xs font-bold truncate flex-1 transition-colors ${isDark ? 'text-slate-200' : 'text-zinc-900'}`}>{t.name}</span>
                    <span className={`text-[10px] font-black transition-colors ${isDark ? 'text-slate-500' : 'text-zinc-600'}`}>{t.memberList?.length || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </SpotlightCard>
        )}

        <SpotlightCard className="rounded-2xl">
          <div className={`rounded-2xl p-6 h-full border backdrop-blur-xl transition-all duration-500 ${
            isDark ? 'border-white/5 bg-slate-900/50 hover:bg-slate-900/70' : 'border-zinc-300 bg-white shadow-md shadow-zinc-200/50'
          }`}>
            <div className="flex justify-between items-center mb-5">
              <span className={`text-sm font-bold tracking-wide transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>Task Completion</span>
              {can?.('manage_tasks') && <button onClick={() => setSection?.('tasks')} className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors">Manage →</button>}
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex-1 h-3 rounded-full overflow-hidden shadow-inner transition-colors ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`}>
                <div className="h-full rounded-full transition-all bg-amber-400 shadow-sm" 
                  style={{ width: tasks.length > 0 ? `${(tasks.filter(t => t.status === 'done').length / tasks.length) * 100}%` : '0%' }} />
              </div>
              <span className={`text-xs font-black tracking-wider transition-colors ${isDark ? 'text-slate-400' : 'text-zinc-500'}`}>
                <span className={isDark ? 'text-white' : 'text-zinc-900'}>{tasks.filter(t => t.status === 'done').length}</span> / {tasks.length}
              </span>
            </div>
          </div>
        </SpotlightCard>
      </div>
    </AnimatedSection>
  );
};

export default OverviewSection;
