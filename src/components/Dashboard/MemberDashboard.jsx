import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart2, FileText, Users, CheckSquare, Bell,
    ChevronDown, CheckCircle, MapPin, Layers, Clock, Star
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import MemberNotifications from './MemberNotifications';

/* ─── helpers ─────────────────────────────────────────────── */
const cls = (...c) => c.filter(Boolean).join(' ');

const ROLE_STYLE = {
    organizer: 'bg-violet-500/10 text-violet-300 border-violet-500/25',
    reviewer: 'bg-amber-500/10  text-amber-300  border-amber-500/25',
    presenter: 'bg-blue-500/10   text-blue-300   border-blue-500/25',
    member: 'bg-slate-500/10  text-slate-300  border-slate-500/25',
};

const PRIORITY_STYLE = {
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

/* ─── reusable primitives (Scoped for Member) ──────────────── */
const Field = ({ label, children }) => (
    <div>
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{label}</label>
        {children}
    </div>
);

const Empty = ({ icon: Icon, msg }) => (
    <div className="py-16 text-center border border-dashed border-white/10 rounded-2xl">
        <Icon size={28} className="text-slate-700 mx-auto mb-3" />
        <p className="text-slate-500 text-sm">{msg}</p>
    </div>
);

const LoadingRows = () => (
    <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
        ))}
    </div>
);

const RatingBadge = ({ avg, count, size = 10 }) => {
    if (!avg) return (
        <span className="text-[9px] text-slate-700 italic">No ratings</span>
    );
    return (
        <span className="flex items-center gap-1">
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

    const [section, setSection] = useState('overview');
    const [members, setMembers] = useState([]);
    const [loadingMembers, setLM] = useState(true);
    const [teams, setTeams] = useState([]);
    const [loadingTeams, setLT] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [loadingTasks, setLTasks] = useState(true);
    const [expandedTeam, setExpandedTeam] = useState(null);
    const [globalRatings, setGlobalRatings] = useState({});

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
            email: m.email || m.users?.user_email || '',
            full_name: m.full_name || m.users?.user_name || '',
        }));
        setMembers(enriched);
        setLM(false);
        return enriched;
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
        const { data, error } = await supabase
            .from('member_ratings')
            .select('rated_user_id, rating');

        if (error) { console.error('fetchGlobalRatings error:', error); return; }

        const agg = {};
        (data || []).forEach(r => {
            if (!agg[r.rated_user_id]) agg[r.rated_user_id] = { sum: 0, count: 0 };
            agg[r.rated_user_id].sum += r.rating;
            agg[r.rated_user_id].count += 1;
        });

        const result = {};
        Object.entries(agg).forEach(([uid, { sum, count }]) => {
            result[uid] = { avg: sum / count, count };
        });
        setGlobalRatings(result);
    }, []);

    useEffect(() => {
        fetchMembers();
        fetchTeams();
        fetchTasks();
        fetchGlobalRatings();
    }, [fetchMembers, fetchTeams, fetchTasks, fetchGlobalRatings]);

    /* ── task Actions ────────────────────────────────────────── */
    const toggleTask = async (task) => {
        const s = task.status === 'done' ? 'pending' : 'done';
        const { error } = await supabase.from('conference_tasks').update({ status: s }).eq('id', task.id);
        if (error) {
            console.error('Error toggling task:', error);
            return;
        }
        setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: s } : t));
    };

    /* ── ui helpers ──────────────────────────────────────────── */
    const mName = (m) => m?.full_name || m?.email || m?.user_id?.substring(0, 8) || '?';
    const teamName = (id) => teams.find(t => t.id === id)?.name || '—';
    const assigneeName = (id) => { const m = members.find(m => m.id === id || m.user_id === id); return m ? mName(m) : '—'; };

    const myTeams = teams.filter(t => t.memberList.some(tm => tm.user_id === user.id));
    const myTasks = tasks.filter(t => t.assignee_id === user.id || myTeams.some(mt => mt.id === t.team_id));

    const nav = [
        { id: 'overview', label: 'Overview', icon: BarChart2, badge: null },
        { id: 'teams', label: 'My Teams', icon: Layers, badge: myTeams.length || null },
        { id: 'tasks', label: 'My Tasks', icon: CheckSquare, badge: myTasks.filter(t => t.status !== 'done').length || null },
        { id: 'notifications', label: 'Notifications', icon: Bell, badge: null },
    ];

    return (
        <div className="bg-[#080b11] text-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

            <div className="max-w-[1400px] mx-auto flex">
                {/* SIDEBAR */}
                <aside className="w-52 shrink-0 sticky top-4 border-r border-white/10 py-5 px-2.5 flex flex-col gap-0.5 overflow-y-auto" style={{ height: 'calc(100vh - 120px)' }}>
                    <div className="px-3 mb-6">

                        <div className="font-bold text-white text-sm truncate">{conf.title}</div>
                        <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Member Dashboard</div>
                    </div>

                    {nav.map(({ id, label, icon: Icon, badge }) => (
                        <button
                            key={id}
                            onClick={() => setSection(id)}
                            className={cls(
                                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all',
                                section === id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5',
                            )}
                        >
                            <Icon size={15} className={section === id ? 'text-indigo-400' : ''} />
                            <span className="flex-1">{label}</span>
                            {badge ? <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded-full font-bold">{badge}</span> : null}
                        </button>
                    ))}
                </aside>

                {/* MAIN CONTENT */}
                <main className="flex-1 p-8">

                    {/* ═══ OVERVIEW ═══ */}
                    {section === 'overview' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
                                <p className="text-slate-500 text-sm mt-0.5">Welcome back! Here's what's happening in your teams.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-xl p-5 border border-white/10 bg-indigo-500/10">
                                    <div className="text-3xl font-bold mb-1 text-indigo-400">{myTeams.length}</div>
                                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">My Teams</div>
                                </div>
                                <div className="rounded-xl p-5 border border-white/10 bg-amber-500/10">
                                    <div className="text-3xl font-bold mb-1 text-amber-400">{myTasks.filter(t => t.status !== 'done').length}</div>
                                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Pending Tasks</div>
                                </div>
                                <div className="rounded-xl p-5 border border-white/10 bg-emerald-500/10">
                                    <div className="text-3xl font-bold mb-1 text-emerald-400">
                                        {myTasks.length > 0 ? Math.round((myTasks.filter(t => t.status === 'done').length / myTasks.length) * 100) : 0}%
                                    </div>
                                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Completion Rate</div>
                                </div>
                            </div>

                            <div className="bg-[#0d1117] border border-white/10 rounded-xl p-5">
                                <div className="flex justify-between mb-4">
                                    <span className="text-sm font-semibold text-slate-300">Latest Tasks</span>
                                    <button onClick={() => setSection('tasks')} className="text-xs text-indigo-400 hover:text-indigo-300">View all →</button>
                                </div>
                                {myTasks.length === 0 ? (
                                    <p className="text-xs text-slate-600 italic">No tasks assigned to you or your teams yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {myTasks.slice(0, 3).map(task => (
                                            <div key={task.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                                                <div onClick={() => toggleTask(task)} className={cls('w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors', task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-indigo-400')}>
                                                    {task.status === 'done' && <CheckCircle size={9} className="text-white" />}
                                                </div>
                                                <span className={cls('text-xs flex-1', task.status === 'done' ? 'line-through text-slate-600' : 'text-slate-300')}>{task.title}</span>
                                                <span className={cls('text-[9px] font-bold px-1.5 py-0.5 rounded border', PRIORITY_STYLE[task.priority || 'medium'])}>{task.priority}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ TEAMS ═══ */}
                    {section === 'teams' && (
                        <div className="space-y-6">
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
                                        const teamTasks = tasks.filter(t => t.team_id === team.id);

                                        return (
                                            <div key={team.id} className="bg-[#0d1117] border border-white/10 rounded-xl overflow-hidden">
                                                <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => setExpandedTeam(isOpen ? null : team.id)}>
                                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-white text-sm">{team.name}</div>
                                                        {team.description && <div className="text-xs text-slate-500 mt-0.5">{team.description}</div>}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {team.head_id && members.find(m => m.id === team.head_id) && (
                                                            <span className="text-xs text-indigo-400/70 font-medium">Head: {mName(members.find(m => m.id === team.head_id))}</span>
                                                        )}
                                                        <span className="text-xs text-slate-500 font-semibold">{team.memberList.length} members</span>
                                                    </div>
                                                    <ChevronDown size={15} className={cls('text-slate-600 transition-transform', isOpen && 'rotate-180')} />
                                                </div>

                                                {isOpen && (
                                                    <div className="border-t border-white/5 px-5 py-5 space-y-6 bg-black/20">
                                                        <div>
                                                            <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold mb-2">Team Members</div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {teamMembers.map(m => (
                                                                    <div key={m.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
                                                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">{mName(m)[0]?.toUpperCase()}</div>
                                                                        <span className="text-xs text-slate-300 font-medium">{mName(m)}</span>
                                                                        <span className={cls('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase', ROLE_STYLE[m.role] || ROLE_STYLE.member)}>{m.role}</span>
                                                                        {globalRatings[m.user_id] && <RatingBadge avg={globalRatings[m.user_id].avg} count={globalRatings[m.user_id].count} size={9} />}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold mb-2">Team Tasks ({teamTasks.length})</div>
                                                            {teamTasks.length === 0
                                                                ? <p className="text-xs text-slate-600 italic">No tasks for this team</p>
                                                                : teamTasks.map(task => (
                                                                    <div key={task.id} className="flex items-center gap-2.5 py-2 border-t border-white/5 first:border-t-0">
                                                                        <div onClick={() => toggleTask(task)} className={cls('w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors', task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-indigo-400')}>
                                                                            {task.status === 'done' && <CheckCircle size={9} className="text-white" />}
                                                                        </div>
                                                                        <span className={cls('text-xs flex-1', task.status === 'done' ? 'line-through text-slate-600' : 'text-slate-300')}>{task.title}</span>
                                                                        <span className={cls('text-[9px] font-bold px-1.5 py-0.5 rounded border', PRIORITY_STYLE[task.priority || 'medium'])}>{task.priority}</span>
                                                                    </div>
                                                                ))
                                                            }
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ TASKS ═══ */}
                    {section === 'tasks' && (
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-bold text-white">My Tasks</h2>
                                <p className="text-slate-500 text-sm mt-0.5">Tasks assigned to you or your teams</p>
                            </div>

                            {loadingTasks ? <LoadingRows /> : myTasks.length === 0 ? (
                                <Empty icon={CheckSquare} msg="No tasks yet." />
                            ) : (
                                <div className="space-y-2">
                                    {myTasks.map(task => (
                                        <div key={task.id} className="bg-[#0d1117] border border-white/10 rounded-xl px-5 py-3.5 flex items-center gap-4 hover:border-white/20 transition-all group">
                                            <div onClick={() => toggleTask(task)} className={cls('w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors', task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600 hover:border-indigo-400')}>
                                                {task.status === 'done' && <CheckCircle size={11} className="text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={cls('text-sm font-medium', task.status === 'done' ? 'line-through text-slate-600' : 'text-slate-200')}>{task.title}</div>
                                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                    {task.team_id && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Layers size={9} />{teamName(task.team_id)}</span>}
                                                    {task.assignee_id && <span className="text-[10px] text-indigo-400 flex items-center gap-1"><Users size={9} />Assigned to me</span>}
                                                    {task.due_date && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Clock size={9} />{new Date(task.due_date).toLocaleDateString()}</span>}
                                                </div>
                                            </div>
                                            <span className={cls('text-[10px] font-bold px-2 py-0.5 rounded border uppercase', PRIORITY_STYLE[task.priority || 'medium'])}>{task.priority || 'med'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ═══ NOTIFICATIONS ═══ */}
                    {section === 'notifications' && (
                        <MemberNotifications conf={conf} />
                    )}

                </main>
            </div>
        </div>
    );
};

export default MemberDashboard;