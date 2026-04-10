import React from 'react';
import { Users, Plus, Search, Star, Trash2 } from 'lucide-react';
import { cls, mName, VOLUNTEER_ROLE_LABELS, ROLE_STYLE } from '../../constants';
import { Btn, Empty, LoadingRows } from '../common/Primitives';
import { StarRating, RatingBadge } from '../common/StarRating';
import { AnimatedSection } from '../common/Effects';

const MembersSection = ({
  filteredMembers, memberSearch, setMemberSearch,
  members, volunteersCount, volunteerMap,
  isOrganizer, can, loadingMembers,
  setModal, setModalData, setRatingMember,
  myRatings, globalRatings, updateRole,
}) => (
  <AnimatedSection className="space-y-6">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-1">Members</h2>
        <p className="text-slate-400 font-medium tracking-wide">
          {members.length} registered
          {volunteersCount > 0 && <span className="ml-2 font-black text-amber-400">· {volunteersCount} with volunteer preferences</span>}
        </p>
      </div>
      {can('manage_members') && <Btn onClick={() => setModal('addMember')}><Plus size={16} />Add Member</Btn>}
    </div>

    <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-white/5 backdrop-blur-md border border-white/10 shadow-inner max-w-md focus-within:border-amber-400/50 focus-within:shadow-[0_0_15px_rgba(251,191,36,0.15)] transition-all">
      <Search size={16} className="text-slate-400 shrink-0" />
      <input className="bg-transparent outline-none text-sm font-semibold text-white placeholder-slate-500 flex-1" style={{ fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}
        placeholder="Search by name or email…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
    </div>

    {loadingMembers ? <LoadingRows /> : filteredMembers.length === 0
      ? <Empty icon={Users} msg="No members found." action={{ label: '+ Add Member', onClick: () => setModal('addMember') }} />
      : (
        <div className="space-y-3">
          {filteredMembers.map((m, i) => {
            const prefs    = volunteerMap[m.user_id];
            const hasVol   = prefs?.volunteer_roles?.length > 0;
            const myRating = myRatings[m.user_id];
            const gRating  = globalRatings[m.user_id];
            return (
              <AnimatedSection key={m.id} delay={0.05 * i} 
                className="rounded-2xl px-6 py-4 flex items-center gap-5 transition-all group bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-white/10 hover:bg-slate-900/60 shadow-md">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-amber-500 text-lg font-black shrink-0 shadow-inner" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.05))', border: '1px solid rgba(251,191,36,0.2)' }}>
                  {mName(m)[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-base font-bold text-white truncate tracking-wide">{mName(m)}</span>
                    {hasVol && <span className="bg-amber-400/20 text-amber-400 p-1 rounded-full"><Star size={10} className="fill-amber-400" title="Has volunteer preferences" /></span>}
                  </div>
                  {isOrganizer && <div className="text-xs font-semibold text-slate-500 truncate">{m.email || m.user_id}</div>}
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest font-black text-slate-500">My rating:</span>
                      <StarRating value={myRating?.rating || 0} readonly size={10} />
                      {!myRating && <span className="text-[10px] uppercase font-bold text-slate-600">Unrated</span>}
                    </div>
                    {gRating && (
                      <>
                        <span className="text-slate-600 font-bold">·</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-widest font-black text-slate-500">Global:</span>
                          <RatingBadge avg={gRating.avg} count={gRating.count} size={9} />
                        </div>
                      </>
                    )}
                  </div>
                  {hasVol && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {prefs.volunteer_roles.slice(0, 3).map(r => (
                        <span key={r} className="text-[10px] font-black px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 uppercase tracking-widest">
                          {VOLUNTEER_ROLE_LABELS[r] || r}
                        </span>
                      ))}
                      {prefs.volunteer_roles.length > 3 && (
                        <span className="text-[10px] font-black px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-400 uppercase">
                          +{prefs.volunteer_roles.length - 3} More
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <button onClick={() => setRatingMember(m)} title={myRating ? `Your rating: ${myRating.rating}/5 — click to update` : 'Rate this member'}
                    className="p-2.5 rounded-xl transition-all flex items-center gap-1.5 font-bold"
                    style={myRating ? { color: '#fbbf24', background: 'rgba(251,191,36,0.1)' } : { color: '#94a3b8', background: 'rgba(255,255,255,0.05)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#fbbf24'; e.currentTarget.style.background = 'rgba(251,191,36,0.15)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(251,191,36,0.2)'; }}
                    onMouseLeave={e => { if (!myRating) { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.boxShadow = 'none'; } else { e.currentTarget.style.color = '#fbbf24'; e.currentTarget.style.background = 'rgba(251,191,36,0.1)'; e.currentTarget.style.boxShadow = 'none'; } }}>
                    <Star size={16} className={myRating ? 'fill-amber-400' : ''} />
                    {myRating && <span className="text-xs">{myRating.rating}</span>}
                  </button>
                  {isOrganizer ? (
                    <>
                      <select value={m.role} onChange={e => updateRole(m.id, e.target.value)}
                        className={cls('text-xs font-black px-3 py-2 rounded-lg border-2 uppercase tracking-widest bg-slate-900 cursor-pointer outline-none transition-all hover:bg-slate-800', ROLE_STYLE[m.role] || ROLE_STYLE.member)}>
                        {['organizer','reviewer','presenter','member'].map(r => (
                          <option key={r} value={r} style={{ background: '#0B0F1A', color: '#fff' }} className="normal-case">{r === 'member' ? 'Team Member' : r}</option>
                        ))}
                      </select>
                      <button onClick={() => { setModalData(m); setModal('confirmDelete'); }}
                        className="p-2.5 rounded-xl transition-all text-slate-400 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 hover:shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <div className={cls('text-[10px] font-black px-3 py-1.5 rounded-lg border-2 uppercase tracking-widest', ROLE_STYLE[m.role] || ROLE_STYLE.member)}>
                      {m.role === 'member' ? 'Team Member' : m.role}
                    </div>
                  )}
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      )
    }
  </AnimatedSection>
);

export default MembersSection;
