import React from 'react';
import { Plus, Edit2, Trash2, Layers, MessageSquare } from 'lucide-react';
import { mName } from '../../constants';
import { Btn, Empty, LoadingRows } from '../common/Primitives';
import { SpotlightCard, AnimatedSection } from '../common/Effects';
import { useApp } from '../../../../../context/AppContext';

const TeamsSection = ({
  teams, members, isOrganizer, myMemberId, myTeamIds = [], loadingTeams,
  setModal, setTmForm, openEditTeam, deleteTeam, setSection, can,
  setActiveChatTeamId,
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <AnimatedSection className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className={`text-3xl font-black transition-colors duration-500 tracking-tight mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Teams</h2>
          <p className="text-slate-500 font-medium tracking-wide">{teams.filter(t => isOrganizer || myTeamIds.includes(t.id)).length} active teams</p>
        </div>
        {isOrganizer && (
          <Btn onClick={() => { setTmForm({ name:'',type:'',originalType:'',description:'',color:'#fbbf24',head_id:'' }); setModal('createTeam'); }}>
            <Plus size={16} />Create Team
          </Btn>
        )}
      </div>

      {loadingTeams ? <LoadingRows /> : teams.length === 0
        ? <Empty icon={Layers} msg="No teams yet." action={{ label: isOrganizer ? '+ Create Team' : null, onClick: () => setModal('createTeam') }} />
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.filter(t => isOrganizer || myTeamIds.includes(t.id)).map((team, i) => {
              const teamMembers = team.memberList
                .filter(tm => tm.status === 'accepted')
                .map(tm => members.find(m => m.id === tm.conference_user_id || m.user_id === tm.user_id))
                .filter(Boolean);
              const head = team.head_id ? members.find(m => m.user_id === team.head_id) : null;
              return (
                <AnimatedSection key={team.id} delay={0.05 * i} className="h-full">
                  <SpotlightCard className="h-full rounded-2xl" spotlightColor={isDark ? "rgba(251,191,36,0.05)" : "rgba(251,191,36,0.1)"}>
                    <div className={`rounded-2xl p-6 flex flex-col h-full border backdrop-blur-xl transition-all duration-500 shadow-lg ${
                      isDark ? 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60' : 'bg-white border-zinc-200 hover:border-amber-200/50 hover:bg-zinc-50'
                    }`}>
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-4 h-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: team.color, boxShadow: `0 0 15px ${team.color}66` }} />
                        <h3 className={`text-lg font-black flex-1 truncate tracking-wide transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>{team.name}</h3>
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEditTeam(team)} className={`p-2.5 rounded-xl transition-all ${
                            isDark ? 'text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white' : 'text-slate-400 bg-zinc-100 hover:bg-zinc-200 hover:text-zinc-900'
                          }`}>
                            <Edit2 size={16} />
                          </button>
                          {isOrganizer && (
                            <button onClick={() => { if (window.confirm(`Delete team "${team.name}"?`)) deleteTeam(team.id); }}
                              className={`p-2.5 rounded-xl transition-all ${
                                isDark ? 'text-slate-400 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400' : 'text-slate-400 bg-zinc-100 hover:bg-rose-50 hover:text-rose-500'
                              }`}>
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      {team.description && <p className={`text-sm mb-6 line-clamp-2 leading-relaxed transition-colors ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{team.description}</p>}
                      <div className="flex-1 space-y-5">
                        {head && (
                          <div className={`rounded-xl px-4 py-3 border shadow-inner transition-all duration-500 ${
                            isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'
                          }`}>
                            <div className={`text-[10px] uppercase font-black tracking-widest mb-2 transition-colors ${isDark ? 'text-amber-500/70' : 'text-amber-600'}`}>Team Lead</div>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-black bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]">{mName(head)[0]?.toUpperCase()}</div>
                              <span className={`text-sm font-bold truncate transition-colors ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>{mName(head)}</span>
                            </div>
                          </div>
                        )}
                        <div>
                          <div className="text-[10px] uppercase font-black tracking-widest mb-3 text-slate-500">Members ({teamMembers.length})</div>
                          <div className="flex flex-wrap gap-2">
                            {teamMembers.slice(0, 5).map(m => (
                              <div key={m.id} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 shadow-sm ${
                                isDark ? 'bg-white/5 border-white/10 text-slate-300' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                              }`} title={mName(m)}>
                                {mName(m)[0]?.toUpperCase()}
                              </div>
                            ))}
                            {teamMembers.length > 5 && (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${
                                isDark ? 'bg-white/5 border-white/10 text-slate-500' : 'bg-zinc-100 border-zinc-200 text-zinc-400'
                              }`}>
                                +{teamMembers.length - 5}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`mt-8 pt-5 flex gap-3 border-t transition-colors ${isDark ? 'border-white/5' : 'border-zinc-200'}`}>
                        <Btn variant="ghost" className={`text-xs font-bold flex-1 py-2.5 h-auto tracking-wide transition-all ${
                          isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                        }`} onClick={() => openEditTeam(team)}>Manage</Btn>
                        <Btn variant="ghost" className={`text-xs font-bold flex-1 py-2.5 h-auto tracking-wide transition-all ${
                          isDark ? 'bg-white/5 hover:bg-white/10 hover:text-amber-400' : 'bg-zinc-100 hover:bg-amber-50 hover:text-amber-600 text-zinc-700'
                        }`} onClick={() => { setSection('chat'); setActiveChatTeamId(team.id); }}>
                          <MessageSquare size={12} className="mr-1" />Chat
                        </Btn>
                      </div>
                    </div>
                  </SpotlightCard>
                </AnimatedSection>
              );
            })}
          </div>
        )
      }
    </AnimatedSection>
  );
};

export default TeamsSection;
