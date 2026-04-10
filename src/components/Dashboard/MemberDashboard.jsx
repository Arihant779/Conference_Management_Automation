import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, FileText, Users, CheckSquare, Bell,
  ChevronDown, CheckCircle, MapPin, Layers, Clock, Star
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import MemberNotifications from './MemberNotifications';
import { CinematicBackground } from './Organizer/components/common/Effects';
import Sidebar from './Organizer/components/Sidebar';

/* ── modular sub-components (Reused from Organizer) ── */
import OverviewSection from './Organizer/components/sections/OverviewSection';
import PapersSection from './Organizer/components/sections/PapersSection';
import MembersSection from './Organizer/components/sections/MembersSection';
import AttendeesSection from './Organizer/components/sections/AttendeesSection';
import TeamsSection from './Organizer/components/sections/TeamsSection';
import TasksSection from './Organizer/components/sections/TasksSection';
import NotificationsSection from './Organizer/components/sections/NotificationsSection';
import SpeakersSection from './Organizer/components/sections/SpeakersSection';

/* ─── helpers ─────────────────────────────────────────────── */
const cls = (...c) => c.filter(Boolean).join(' ');

const ROLE_STYLE = {
  organizer: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
  reviewer:  'bg-amber-500/10  text-amber-300  border-amber-500/25',
  presenter: 'bg-blue-500/10   text-blue-300   border-blue-500/25',
  member:    'bg-slate-500/10  text-slate-300  border-slate-500/25',
};

const PRIORITY_STYLE = {
  high:   'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low:    'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const LoadingRows = () => (
  <div className="space-y-2">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-14 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
    ))}
  </div>
);

const Empty = ({ icon: Icon, msg }) => (
  <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl">
    <Icon size={28} className="text-slate-700 mx-auto mb-3" />
    <p className="text-slate-500 text-sm">{msg}</p>
  </div>
);

const RatingBadge = ({ avg, count, size = 10 }) => {
  if (!avg) return <span className="text-[9px] text-slate-700 italic px-2">No ratings</span>;
  return (
    <span className="flex items-center gap-1.5 px-2">
      <Star size={size} className="text-amber-400 fill-amber-400 shrink-0" />
      <span className="text-[10px] font-bold text-amber-300">{avg.toFixed(1)}</span>
      <span className="text-[9px] text-slate-600">({count})</span>
    </span>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN MEMBER DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
const MemberDashboard = ({ conf, onBack }) => {
  const { user } = useApp();
  const confId = conf.conference_id || conf.id;

  const [section, setSection]         = useState('overview');
  const [members, setMembers]         = useState([]);
  const [loadingMembers, setLM]       = useState(true);
  const [teams, setTeams]             = useState([]);
  const [loadingTeams, setLT]         = useState(true);
  const [tasks, setTasks]             = useState([]);
  const [loadingTasks, setLTasks]     = useState(true);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [globalRatings, setGlobalRatings] = useState({});

  const [confPapers, setConfPapers]   = useState([]);
  const [loadingPapers, setLP]       = useState(false);

  /* ── fetch ─────────────────────────────────────────────── */
  const fetchMembers = useCallback(async () => {
    setLM(true);
    const { data, error } = await supabase
      .from('conference_user')
      .select('id, user_id, role, email, full_name, joined_at, users(user_name, user_email)')
      .eq('conference_id', confId)
      .order('joined_at', { ascending: false });

    if (error) console.error('fetchMembers error:', error);
    const enriched = (data || []).map(m => ({
      ...m,
      email:     m.email     || m.users?.user_email || '',
      full_name: m.full_name || m.users?.user_name  || '',
    }));
    setMembers(enriched);
    setLM(false);
  }, [confId]);

  const fetchTeams = useCallback(async () => {
    setLT(true);
    const { data: td } = await supabase.from('conference_teams').select('*').eq('conference_id', confId).order('created_at', { ascending: true });
    if (td) {
      const { data: tmData } = await supabase.from('team_members').select('team_id,user_id,conference_user_id').in('team_id', td.map(t => t.id));
      const map = {};
      (tmData || []).forEach(tm => { (map[tm.team_id] = map[tm.team_id] || []).push(tm); });
      setTeams(td.map(t => ({ ...t, memberList: map[t.id] || [] })));
    } else setTeams([]);
    setLT(false);
  }, [confId]);

  const fetchTasks = useCallback(async () => {
    setLTasks(true);
    const { data } = await supabase.from('conference_tasks').select('*').eq('conference_id', confId).order('created_at', { ascending: false });
    setTasks(data || []);
    setLTasks(false);
  }, [confId]);

  const fetchGlobalRatings = useCallback(async () => {
    const { data, error } = await supabase.from('member_ratings').select('rated_user_id, rating');
    if (error) return;
    const agg = {};
    (data || []).forEach(r => {
      if (!agg[r.rated_user_id]) agg[r.rated_user_id] = { sum: 0, count: 0 };
      agg[r.rated_user_id].sum   += r.rating;
      agg[r.rated_user_id].count += 1;
    });
    const result = {};
    Object.entries(agg).forEach(([uid, { sum, count }]) => {
      result[uid] = { avg: sum / count, count };
    });
    setGlobalRatings(result);
  }, []);

  const fetchPapers = useCallback(async () => {
    setLP(true);
    const { data } = await supabase.from('paper').select('*, users(user_name,user_email), paper_assignments(status)').eq('conference_id', confId).order('paper_id', { ascending: false });
    setConfPapers(data || []);
    setLP(false);
  }, [confId]);

  useEffect(() => {
    fetchMembers();
    fetchTeams();
    fetchTasks();
    fetchGlobalRatings();
    fetchPapers();
  }, [fetchMembers, fetchTeams, fetchTasks, fetchGlobalRatings, fetchPapers]);

  /* ── permissions & logic ── */
  const myMember = members.find(m => m.user_id === user?.id);
  const myMemberId = myMember?.id;
  
  const myTeams = teams.filter(t => t.memberList.some(m => m.conference_user_id === myMemberId || m.user_id === user?.id));
  const myTeamNames = myTeams.map(t => t.name.toLowerCase());

  const can = (feature) => {
    if (feature === 'view_papers') return myTeamNames.some(n => n.includes('reviewing') || n.includes('technical') || n.includes('program'));
    if (feature === 'view_attendees') return myTeamNames.some(n => n.includes('logistics') || n.includes('registration') || n.includes('hospitality'));
    if (feature === 'view_speakers') return myTeamNames.some(n => n.includes('outreach') || n.includes('sponsorship'));
    return false;
  };

  const nav = [
    { id: 'overview',  label: 'Overview',   icon: BarChart2 },
    { id: 'my_teams',  label: 'My Teams',   icon: Users },
    { id: 'my_tasks',  label: 'My Tasks',   icon: CheckSquare },
    ...(can('view_papers') ? [{ id: 'papers', label: 'Papers', icon: FileText }] : []),
    ...(can('view_attendees') ? [{ id: 'attendees', label: 'Attendees', icon: MapPin }] : []),
    ...(can('view_speakers') ? [{ id: 'speakers', label: 'Speakers', icon: Users }] : []),
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const mName        = (m) => m?.full_name || m?.email || m?.user_id?.substring(0, 8) || '?';
  const teamName     = (id) => teams.find(t => t.id === id)?.name || '—';
  
  const toggleTask = async (task) => {
    const s = task.status === 'done' ? 'pending' : 'done';
    const { error } = await supabase.from('conference_tasks').update({ status: s }).eq('id', task.id);
    if (!error) setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: s } : t));
  };

  const myTasks = tasks.filter(t => t.assignee_id === myMemberId || myTeams.some(mt => mt.id === t.team_id));

  const renderContent = () => {
    if (section === 'overview') {
      return (
        <OverviewSection
          members={members} teams={teams} tasks={tasks} confPapers={confPapers}
          pendingCount={confPapers.filter(p => p.status === 'pending').length}
          accepted={confPapers.filter(p => p.status === 'accepted').length}
          rejected={confPapers.filter(p => p.status === 'rejected').length}
          isOrganizer={false}
        />
      );
    }
    if (section === 'papers') return <PapersSection confId={confId} confPapers={confPapers} loading={loadingPapers} isOrganizer={false} />;
    if (section === 'attendees') return <AttendeesSection confId={confId} members={members} loading={loadingMembers} isOrganizer={false} />;
    if (section === 'speakers') return <SpeakersSection confId={confId} isOrganizer={false} />;
    if (section === 'notifications') return <MemberNotifications conf={conf} />;

    if (section === 'my_teams') {
      return (
        <div className="space-y-8 animate-in slide-in-from-bottom-8">
          <div>
            <h2 className="text-2xl font-bold text-white">My Teams</h2>
            <p className="text-slate-500 text-sm mt-0.5">Teams you are collaborating in</p>
          </div>
          {loadingTeams ? <LoadingRows /> : myTeams.length === 0 ? (
            <Empty icon={Layers} msg="You are not part of any teams yet." />
          ) : (
            <div className="space-y-3">
              {myTeams.map(team => {
                const isOpen = expandedTeam === team.id;
                const teamMembers = team.memberList.map(tm => members.find(m => m.id === tm.conference_user_id || m.user_id === tm.user_id)).filter(Boolean);
                const teamTasks   = tasks.filter(t => t.team_id === team.id);

                return (
                  <div key={team.id} className="bg-[#0d1117]/60 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setExpandedTeam(isOpen ? null : team.id)}>
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">{team.name}</div>
                        {team.description && <div className="text-xs text-slate-500 mt-0.5">{team.description}</div>}
                      </div>
                      <ChevronDown size={15} className={cls('text-slate-600 transition-transform', isOpen && 'rotate-180')} />
                    </div>

                    {isOpen && (
                      <div className="border-t border-white/5 px-5 py-5 space-y-6 bg-black/20">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Team Members</p>
                          <div className="flex flex-wrap gap-2">
                            {teamMembers.map(m => (
                              <div key={m.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 hover:border-amber-500/30 transition-all">
                                <span className="text-xs text-slate-300 font-medium">{mName(m)}</span>
                                <span className={cls('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase', ROLE_STYLE[m.role] || ROLE_STYLE.member)}>{m.role}</span>
                                {globalRatings[m.user_id] && <RatingBadge avg={globalRatings[m.user_id].avg} count={globalRatings[m.user_id].count} size={9} />}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-3">Team Tasks ({teamTasks.length})</p>
                          {teamTasks.length === 0 ? <p className="text-xs text-slate-600 italic">No tasks assigned.</p> : (
                            <div className="space-y-2">
                              {teamTasks.map(t => (
                                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                                   <div onClick={() => toggleTask(t)} className={cls('w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all', t.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700 hover:border-amber-500')}>
                                      {t.status === 'done' && <CheckCircle size={10} className="text-white" />}
                                   </div>
                                   <span className={cls('text-xs flex-1', t.status === 'done' ? 'text-slate-600 line-through' : 'text-slate-300')}>{t.title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (section === 'my_tasks') {
      return (
        <div className="space-y-6 animate-in slide-in-from-bottom-8">
          <div>
            <h2 className="text-2xl font-bold text-white">My Tasks</h2>
            <p className="text-slate-500 text-sm mt-0.5">Tasks assigned to you across all teams</p>
          </div>
          {loadingTasks ? <LoadingRows /> : myTasks.length === 0 ? <Empty icon={CheckSquare} msg="All caught up!" /> : (
            <div className="space-y-3">
              {myTasks.map(task => (
                <div key={task.id} className="bg-[#0d1117]/60 backdrop-blur-md border border-white/10 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-amber-500/30 transition-all group">
                  <div onClick={() => toggleTask(task)} className={cls('w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all', task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700 hover:border-amber-500')}>
                    {task.status === 'done' && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cls('text-sm font-bold', task.status === 'done' ? 'line-through text-slate-600' : 'text-slate-100 group-hover:text-amber-400 transition-colors')}>{task.title}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {task.team_id && <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold uppercase tracking-wider"><Layers size={10} />{teamName(task.team_id)}</span>}
                      {task.due_date && <span className="text-[10px] text-slate-500 flex items-center gap-1 font-bold uppercase tracking-wider"><Clock size={10} />{new Date(task.due_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <span className={cls('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border', PRIORITY_STYLE[task.priority || 'medium'])}>{task.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className="relative min-h-screen text-slate-200 selection:bg-amber-500/30 overflow-hidden" style={{ background: '#04070D', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <CinematicBackground />

      <div className="w-full h-screen flex relative z-10 overflow-hidden">
        <Sidebar nav={nav} section={section} setSection={setSection} isOrganizer={false} onBack={onBack} />

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="pb-20"
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MemberDashboard;
