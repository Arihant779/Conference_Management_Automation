import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, FileText, Users, CheckSquare, Bell, Plus, X, Send,
  ChevronDown, CheckCircle, XCircle, MapPin, Edit2, Trash2,
  Search, Layers, Clock
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

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
const TEAM_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#06b6d4'];

/* ─── reusable primitives ──────────────────────────────────── */
const Modal = ({ title, onClose, children, width = 'max-w-lg' }) => (
  <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div className={cls('bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full shadow-2xl max-h-[90vh] overflow-y-auto', width)}>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-all"><X size={17}/></button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <div>
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{label}</label>
    {children}
  </div>
);
const Input = ({ className, ...props }) => (
  <input {...props} className={cls('w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none text-white placeholder-slate-600 transition-colors', className)} />
);
const Sel = ({ children, className, ...props }) => (
  <select {...props} className={cls('w-full bg-[#0d1117] border border-white/8 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none text-white transition-colors', className)}>
    {children}
  </select>
);
const Textarea = ({ className, ...props }) => (
  <textarea {...props} className={cls('w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none resize-none text-white placeholder-slate-600 transition-colors', className)} />
);

const Btn = ({ variant = 'primary', children, className, ...props }) => {
  const base = 'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed';
  const v = {
    primary:   'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'border border-white/10 text-slate-400 hover:text-white hover:bg-white/5',
    danger:    'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
  };
  return <button {...props} className={cls(base, v[variant], className)}>{children}</button>;
};

const Empty = ({ icon: Icon, msg, action }) => (
  <div className="py-16 text-center border border-dashed border-white/8 rounded-2xl">
    <Icon size={28} className="text-slate-700 mx-auto mb-3" />
    <p className="text-slate-500 text-sm">{msg}</p>
    {action && <button onClick={action.onClick} className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 font-semibold">{action.label}</button>}
  </div>
);
const LoadingRows = () => (
  <div className="space-y-2">{[...Array(4)].map((_,i) => <div key={i} className="h-14 bg-white/3 border border-white/5 rounded-xl animate-pulse" />)}</div>
);

/* ═══════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════ */
const OrganizerDashboard = ({ conf, onBack }) => {
  const { papers, updatePaperStatus } = useApp();
  const confId = conf.conference_id || conf.id;

  const [section, setSection]           = useState('overview');
  const [members, setMembers]           = useState([]);
  const [loadingMembers, setLM]         = useState(true);
  const [teams, setTeams]               = useState([]);
  const [loadingTeams, setLT]           = useState(true);
  const [tasks, setTasks]               = useState([]);
  const [loadingTasks, setLTasks]       = useState(true);
  const [notifs, setNotifs]             = useState([]);
  const [modal, setModal]               = useState(null);
  const [modalData, setModalData]       = useState(null);
  const [saving, setSaving]             = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [paperFilter, setPaperFilter]   = useState('all');

  /* forms */
  const [mForm, setMForm]   = useState({ email:'', role:'reviewer' });
  const [tmForm, setTmForm] = useState({ name:'', description:'', color:'#6366f1' });
  const [tkForm, setTkForm] = useState({ title:'', description:'', team_id:'', assignee_id:'', priority:'medium', due_date:'' });
  const [nForm, setNForm]   = useState({ title:'', message:'', target_role:'all', target_team_id:'' });

  /* derived */
  /* derived */

const confPapers = (papers || []).filter(p => p.confId === confId);
const pendingCount = confPapers.filter(p => p.status === 'pending').length;
const accepted = confPapers.filter(p => p.status === 'accepted').length;
const rejected = confPapers.filter(p => p.status === 'rejected').length;

  /* ── fetch ── */
  const fetchMembers = useCallback(async () => {
    setLM(true);
    const { data } = await supabase.from('conference_user')
      .select('id, user_id, role, email, full_name, created_at')
      .eq('conference_id', confId).order('created_at', { ascending: false });
    setMembers(data || []);
    setLM(false);
  }, [confId]);

  const fetchTeams = useCallback(async () => {
    setLT(true);
    const { data: td } = await supabase.from('conference_teams')
      .select('*').eq('conference_id', confId).order('created_at', { ascending: true });
    if (td) {
      const { data: tmData } = await supabase.from('team_members')
        .select('team_id, user_id, conference_user_id')
        .in('team_id', td.map(t => t.id));
      const map = {};
      (tmData || []).forEach(tm => { (map[tm.team_id] = map[tm.team_id] || []).push(tm); });
      setTeams(td.map(t => ({ ...t, memberList: map[t.id] || [] })));
    } else setTeams([]);
    setLT(false);
  }, [confId]);

  const fetchTasks = useCallback(async () => {
    setLTasks(true);
    const { data } = await supabase.from('conference_tasks')
      .select('*').eq('conference_id', confId).order('created_at', { ascending: false });
    setTasks(data || []);
    setLTasks(false);
  }, [confId]);

  const fetchNotifs = useCallback(async () => {
    const { data } = await supabase.from('notifications')
      .select('*').eq('conference_id', confId).order('created_at', { ascending: false }).limit(20);
    setNotifs(data || []);
  }, [confId]);

  useEffect(() => { fetchMembers(); fetchTeams(); fetchTasks(); fetchNotifs(); }, [fetchMembers, fetchTeams, fetchTasks, fetchNotifs]);

  /* ── member CRUD ── */
  const addMember = async () => {
    if (!mForm.email.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('conference_user').insert([{ conference_id: confId, email: mForm.email.trim().toLowerCase(), role: mForm.role, created_at: new Date().toISOString() }]);
    setSaving(false);
    if (!error) { setModal(null); setMForm({ email:'', role:'reviewer' }); fetchMembers(); }
    else alert(error.message);
  };
  const updateRole = async (id, role) => {
    await supabase.from('conference_user').update({ role }).eq('id', id);
    setMembers(ms => ms.map(m => m.id === id ? { ...m, role } : m));
  };
  const removeMember = async (id) => {
    await supabase.from('conference_user').delete().eq('id', id);
    fetchMembers(); fetchTeams();
  };

  /* ── team CRUD ── */
  const createTeam = async () => {
    if (!tmForm.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('conference_teams').insert([{ conference_id: confId, name: tmForm.name.trim(), description: tmForm.description.trim(), color: tmForm.color, created_at: new Date().toISOString() }]);
    setSaving(false);
    if (!error) { setModal(null); setTmForm({ name:'', description:'', color:'#6366f1' }); fetchTeams(); }
    else alert(error.message);
  };
  const saveTeam = async () => {
    if (!tmForm.name.trim()) return;
    setSaving(true);
    await supabase.from('conference_teams').update({ name: tmForm.name.trim(), description: tmForm.description.trim(), color: tmForm.color }).eq('id', modalData.id);
    setSaving(false); setModal(null); fetchTeams();
  };
  const deleteTeam = async (id) => {
    await supabase.from('team_members').delete().eq('team_id', id);
    await supabase.from('conference_teams').delete().eq('id', id);
    fetchTeams(); fetchTasks();
  };
  const addToTeam = async (teamId, confUserId) => {
    const m = members.find(m => m.id === confUserId);
    if (!m) return;
    await supabase.from('team_members').insert([{ team_id: teamId, conference_id: confId, conference_user_id: confUserId, user_id: m.user_id }]);
    fetchTeams();
  };
  const removeFromTeam = async (teamId, confUserId) => {
    await supabase.from('team_members').delete().eq('team_id', teamId).eq('conference_user_id', confUserId);
    fetchTeams();
  };

  /* ── task CRUD ── */
  const createTask = async () => {
    if (!tkForm.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('conference_tasks').insert([{ conference_id: confId, title: tkForm.title.trim(), description: tkForm.description || null, team_id: tkForm.team_id || null, assignee_id: tkForm.assignee_id || null, priority: tkForm.priority, due_date: tkForm.due_date || null, status: 'pending', created_at: new Date().toISOString() }]);
    setSaving(false);
    if (!error) { setModal(null); setTkForm({ title:'', description:'', team_id:'', assignee_id:'', priority:'medium', due_date:'' }); fetchTasks(); }
    else alert(error.message);
  };
  const saveTask = async () => {
    if (!tkForm.title.trim()) return;
    setSaving(true);
    await supabase.from('conference_tasks').update({ title: tkForm.title.trim(), description: tkForm.description || null, team_id: tkForm.team_id || null, assignee_id: tkForm.assignee_id || null, priority: tkForm.priority, due_date: tkForm.due_date || null }).eq('id', modalData.id);
    setSaving(false); setModal(null); fetchTasks();
  };
  const toggleTask = async (task) => {
    const s = task.status === 'done' ? 'pending' : 'done';
    await supabase.from('conference_tasks').update({ status: s }).eq('id', task.id);
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: s } : t));
  };
  const deleteTask = async (id) => {
    await supabase.from('conference_tasks').delete().eq('id', id);
    setTasks(ts => ts.filter(t => t.id !== id));
  };

  /* ── notif ── */
  const sendNotif = async () => {
    if (!nForm.title.trim() || !nForm.message.trim()) return;
    setSaving(true);
    const payload = { conference_id: confId, title: nForm.title.trim(), message: nForm.message.trim(), target_role: nForm.target_role === 'all' ? null : nForm.target_role, target_team_id: nForm.target_team_id || null, created_at: new Date().toISOString() };
    const { error } = await supabase.from('notifications').insert([payload]);
    setSaving(false);
    if (!error) { setNotifs(p => [{ ...payload, id: Date.now() }, ...p]); setModal(null); setNForm({ title:'', message:'', target_role:'all', target_team_id:'' }); }
  };

  /* ── ui helpers ── */
  const mName = (m) => m?.full_name || m?.email || m?.user_id?.substring(0,8) || '?';
  const teamName = (id) => teams.find(t => t.id === id)?.name || '—';
  const assigneeName = (id) => { const m = members.find(m => m.id === id || m.user_id === id); return m ? mName(m) : '—'; };
  const filteredMembers = members.filter(m => !memberSearch || mName(m).toLowerCase().includes(memberSearch.toLowerCase()) || m.email?.toLowerCase().includes(memberSearch.toLowerCase()));
  const filteredPapers  = confPapers.filter(p => paperFilter === 'all' || p.status === paperFilter);

  const openEditTeam = (t) => { setModalData(t); setTmForm({ name: t.name, description: t.description || '', color: t.color || '#6366f1' }); setModal('editTeam'); };
  const openEditTask = (t) => { setModalData(t); setTkForm({ title: t.title, description: t.description || '', team_id: t.team_id || '', assignee_id: t.assignee_id || '', priority: t.priority || 'medium', due_date: t.due_date || '' }); setModal('editTask'); };

  const nav = [
    { id:'overview',      label:'Overview',      icon:BarChart2,   badge: null },
    { id:'papers',        label:'Papers',         icon:FileText,    badge: pendingCount || null },
    { id:'members',       label:'Members',        icon:Users,       badge: null },
    { id:'teams',         label:'Teams',          icon:Layers,      badge: null },
    { id:'tasks',         label:'Tasks',          icon:CheckSquare, badge: tasks.filter(t=>t.status!=='done').length || null },
    { id:'notifications', label:'Notifications',  icon:Bell,        badge: null },
  ];

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#080b11] text-slate-200" style={{ fontFamily:"'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#080b11]/95 backdrop-blur-xl border-b border-white/6 px-6 py-3">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-slate-500 hover:text-white text-xs font-semibold px-2 py-1.5 hover:bg-white/5 rounded-lg transition-all">← Back</button>
            <div className="h-4 w-px bg-white/10"/>
            <div>
              <div className="font-bold text-white text-sm">{conf.title}</div>
              <div className="text-xs text-slate-600 flex items-center gap-1"><MapPin size={10}/>{conf.location ?? 'Location TBD'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">Organizer</span>
            <Btn className="text-xs py-2 px-3" onClick={() => setModal('notification')}><Bell size={13}/>Announce</Btn>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto flex">
        {/* SIDEBAR */}
        <aside className="w-52 shrink-0 sticky top-[53px] h-[calc(100vh-53px)] border-r border-white/6 py-5 px-2.5 flex flex-col gap-0.5">
          {nav.map(({ id, label, icon:Icon, badge }) => (
            <button key={id} onClick={() => setSection(id)}
              className={cls('flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium w-full text-left transition-all',
                section === id ? 'bg-white/8 text-white' : 'text-slate-500 hover:text-slate-200 hover:bg-white/4')}>
              <Icon size={15} className={section === id ? 'text-indigo-400' : ''}/>
              <span className="flex-1">{label}</span>
              {badge ? <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-bold">{badge}</span> : null}
            </button>
          ))}
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8 min-h-screen">

          {/* ═══ OVERVIEW ═══ */}
          {section === 'overview' && (
            <div className="space-y-6">
              <div><h2 className="text-2xl font-bold text-white">Event Overview</h2><p className="text-slate-500 text-sm mt-0.5">Real-time conference metrics</p></div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:'Members',    value:members.length,                          color:'text-indigo-400', bg:'bg-indigo-500/8' },
                  { label:'Teams',      value:teams.length,                            color:'text-purple-400', bg:'bg-purple-500/8' },
                  { label:'Papers',     value:confPapers.length,                       color:'text-blue-400',   bg:'bg-blue-500/8'   },
                  { label:'Open Tasks', value:tasks.filter(t=>t.status!=='done').length, color:'text-amber-400', bg:'bg-amber-500/8' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={cls('rounded-xl p-5 border border-white/6', bg)}>
                    <div className={cls('text-3xl font-bold mb-1', color)}>{value}</div>
                    <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>

              {confPapers.length > 0 && (
                <div className="bg-[#0d1117] border border-white/6 rounded-xl p-5">
                  <div className="flex justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-300">Paper Review Progress</span>
                    <button onClick={()=>setSection('papers')} className="text-xs text-indigo-400 hover:text-indigo-300">View all →</button>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{width:`${(accepted/confPapers.length)*100}%`}}/>
                    <div className="bg-red-500 h-full"     style={{width:`${(rejected/confPapers.length)*100}%`}}/>
                    <div className="bg-amber-500 h-full"   style={{width:`${(pendingCount/confPapers.length)*100}%`}}/>
                  </div>
                  <div className="flex gap-5 mt-3 text-xs text-slate-500">
                    {[['bg-emerald-500','Accepted',accepted],['bg-red-500','Rejected',rejected],['bg-amber-500','Pending',pendingCount]].map(([c,l,v])=>(
                      <span key={l} className="flex items-center gap-1.5"><span className={cls('w-2 h-2 rounded-full inline-block',c)}/>{l} {v}</span>
                    ))}
                  </div>
                </div>
              )}

              {teams.length > 0 && (
                <div className="bg-[#0d1117] border border-white/6 rounded-xl p-5">
                  <div className="flex justify-between mb-4"><span className="text-sm font-semibold text-slate-300">Teams</span><button onClick={()=>setSection('teams')} className="text-xs text-indigo-400 hover:text-indigo-300">Manage →</button></div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {teams.slice(0,6).map(t=>(
                      <div key={t.id} className="flex items-center gap-2.5 bg-white/3 rounded-lg p-2.5 border border-white/5">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor:t.color}}/>
                        <span className="text-xs font-semibold text-slate-300 truncate flex-1">{t.name}</span>
                        <span className="text-[10px] text-slate-600">{t.memberList?.length||0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-[#0d1117] border border-white/6 rounded-xl p-5">
                <div className="flex justify-between mb-3"><span className="text-sm font-semibold text-slate-300">Task Completion</span><button onClick={()=>setSection('tasks')} className="text-xs text-indigo-400 hover:text-indigo-300">Manage →</button></div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{width: tasks.length > 0 ? `${(tasks.filter(t=>t.status==='done').length/tasks.length)*100}%` : '0%'}}/>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold shrink-0">{tasks.filter(t=>t.status==='done').length}/{tasks.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PAPERS ═══ */}
          {section === 'papers' && (
            <div className="space-y-6">
              <div><h2 className="text-2xl font-bold text-white">Paper Submissions</h2><p className="text-slate-500 text-sm mt-0.5">{confPapers.length} total · {pendingCount} pending</p></div>
              <div className="flex gap-1 bg-white/4 p-1 rounded-xl w-fit border border-white/6">
                {[['all',`All (${confPapers.length})`],['pending',`Pending (${pendingCount})`],['accepted',`Accepted (${accepted})`],['rejected',`Rejected (${rejected})`]].map(([k,l])=>(
                  <button key={k} onClick={()=>setPaperFilter(k)} className={cls('px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all', paperFilter===k ? 'bg-white text-black' : 'text-slate-500 hover:text-slate-200')}>{l}</button>
                ))}
              </div>
              <div className="space-y-2.5">
                {filteredPapers.length === 0
                  ? <Empty icon={FileText} msg="No papers match this filter."/>
                  : filteredPapers.map(paper => (
                    <div key={paper.id} className="bg-[#0d1117] border border-white/6 rounded-xl p-5 flex items-center justify-between gap-4 hover:border-white/10 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 font-bold text-sm flex items-center justify-center shrink-0">{paper.title?.charAt(0)}</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-white text-sm truncate">{paper.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{paper.authorId || 'Unknown'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cls('px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border',
                          paper.status==='accepted'?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':paper.status==='rejected'?'bg-red-500/10 text-red-400 border-red-500/20':'bg-amber-500/10 text-amber-400 border-amber-500/20')}>
                          {paper.status==='pending'?'Under Review':paper.status}
                        </span>
                        {paper.status==='pending' && (
                          <div className="flex gap-1">
                            <button onClick={()=>updatePaperStatus(paper.id,'accepted')} className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-emerald-500 transition-colors"><CheckCircle size={16}/></button>
                            <button onClick={()=>updatePaperStatus(paper.id,'rejected')} className="p-1.5 rounded-lg hover:bg-red-500/15 text-red-500 transition-colors"><XCircle size={16}/></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* ═══ MEMBERS ═══ */}
          {section === 'members' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div><h2 className="text-2xl font-bold text-white">Members</h2><p className="text-slate-500 text-sm mt-0.5">{members.length} registered</p></div>
                <Btn onClick={()=>setModal('addMember')}><Plus size={15}/>Add Member</Btn>
              </div>
              <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5">
                <Search size={14} className="text-slate-500 shrink-0"/>
                <input className="bg-transparent outline-none text-sm text-white placeholder-slate-600 flex-1" placeholder="Search by name or email…" value={memberSearch} onChange={e=>setMemberSearch(e.target.value)}/>
              </div>
              {loadingMembers ? <LoadingRows/> : filteredMembers.length === 0
                ? <Empty icon={Users} msg="No members found." action={{label:'+ Add Member', onClick:()=>setModal('addMember')}}/>
                : (
                  <div className="space-y-2">
                    {filteredMembers.map(m => (
                      <div key={m.id} className="bg-[#0d1117] border border-white/6 rounded-xl px-5 py-3.5 flex items-center gap-4 hover:border-white/10 transition-all">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">{mName(m)[0]?.toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{mName(m)}</div>
                          <div className="text-xs text-slate-500 truncate">{m.email || m.user_id}</div>
                        </div>
                        <select value={m.role} onChange={e=>updateRole(m.id,e.target.value)}
                          className={cls('text-xs font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider bg-transparent cursor-pointer outline-none',ROLE_STYLE[m.role]||ROLE_STYLE.member)}>
                          {['organizer','reviewer','presenter','member'].map(r=><option key={r} value={r} className="bg-[#0d1117] text-white normal-case">{r}</option>)}
                        </select>
                        <button onClick={()=>{setModalData(m);setModal('confirmDelete');}} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={15}/></button>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* ═══ TEAMS ═══ */}
          {section === 'teams' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div><h2 className="text-2xl font-bold text-white">Teams</h2><p className="text-slate-500 text-sm mt-0.5">{teams.length} teams</p></div>
                <Btn onClick={()=>{setTmForm({name:'',description:'',color:'#6366f1'});setModal('createTeam');}}><Plus size={15}/>Create Team</Btn>
              </div>
              {loadingTeams ? <LoadingRows/> : teams.length === 0
                ? <Empty icon={Layers} msg="No teams yet." action={{label:'+ Create Team',onClick:()=>setModal('createTeam')}}/>
                : (
                  <div className="space-y-3">
                    {teams.map(team => {
                      const isOpen = expandedTeam === team.id;
                      const teamMembers = team.memberList.map(tm => members.find(m => m.id === tm.conference_user_id || m.user_id === tm.user_id)).filter(Boolean);
                      const nonMembers  = members.filter(m => !team.memberList.some(tm => tm.conference_user_id === m.id));
                      const teamTasks   = tasks.filter(t => t.team_id === team.id);

                      return (
                        <div key={team.id} className="bg-[#0d1117] border border-white/6 rounded-xl overflow-hidden">
                          {/* header row */}
                          <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-white/2 transition-colors" onClick={()=>setExpandedTeam(isOpen?null:team.id)}>
                            <div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor:team.color}}/>
                            <div className="flex-1">
                              <div className="font-semibold text-white text-sm">{team.name}</div>
                              {team.description && <div className="text-xs text-slate-500 mt-0.5">{team.description}</div>}
                            </div>
                            <span className="text-xs text-slate-500 font-semibold">{team.memberList.length} member{team.memberList.length!==1?'s':''}</span>
                            <button onClick={e=>{e.stopPropagation();openEditTeam(team);}} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/8 transition-all"><Edit2 size={13}/></button>
                            <button onClick={e=>{e.stopPropagation();if(window.confirm(`Delete team "${team.name}"?`))deleteTeam(team.id);}} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13}/></button>
                            <ChevronDown size={15} className={cls('text-slate-600 transition-transform',isOpen&&'rotate-180')}/>
                          </div>

                          {/* expanded body */}
                          {isOpen && (
                            <div className="border-t border-white/5 px-5 py-5 space-y-5 bg-black/20">

                              {/* current members */}
                              <div>
                                <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold mb-2">Members ({teamMembers.length})</div>
                                {teamMembers.length === 0
                                  ? <p className="text-xs text-slate-600 italic">No members yet</p>
                                  : (
                                    <div className="flex flex-wrap gap-2">
                                      {teamMembers.map(m => (
                                        <div key={m.id} className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1.5">
                                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">{mName(m)[0]?.toUpperCase()}</div>
                                          <span className="text-xs text-slate-300 font-medium">{mName(m)}</span>
                                          <span className={cls('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase',ROLE_STYLE[m.role]||ROLE_STYLE.member)}>{m.role}</span>
                                          <button onClick={()=>removeFromTeam(team.id,m.id)} className="text-slate-600 hover:text-red-400 transition-colors"><X size={12}/></button>
                                        </div>
                                      ))}
                                    </div>
                                  )
                                }
                              </div>

                              {/* add member */}
                              {nonMembers.length > 0 && (
                                <div>
                                  <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold mb-2">Add Member to Team</div>
                                  <div className="flex gap-2">
                                    <select id={`add-${team.id}`} className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-indigo-500 transition-colors">
                                      <option value="">— select member —</option>
                                      {nonMembers.map(m=><option key={m.id} value={m.id} className="bg-[#0d1117]">{mName(m)} ({m.role})</option>)}
                                    </select>
                                    <button onClick={()=>{const sel=document.getElementById(`add-${team.id}`);if(sel?.value)addToTeam(team.id,sel.value);}} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-colors">Add</button>
                                  </div>
                                </div>
                              )}

                              {/* team tasks */}
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold">Tasks ({teamTasks.length})</div>
                                  <button onClick={()=>{setTkForm({title:'',description:'',team_id:team.id,assignee_id:'',priority:'medium',due_date:''});setModal('addTask');}} className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold">+ Add Task</button>
                                </div>
                                {teamTasks.length === 0
                                  ? <p className="text-xs text-slate-600 italic">No tasks for this team</p>
                                  : teamTasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-2.5 py-2 border-t border-white/4 first:border-t-0">
                                      <div onClick={()=>toggleTask(task)} className={cls('w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors',task.status==='done'?'bg-emerald-500 border-emerald-500':'border-slate-600 hover:border-indigo-400')}>
                                        {task.status==='done'&&<CheckCircle size={9} className="text-white"/>}
                                      </div>
                                      <span className={cls('text-xs flex-1',task.status==='done'?'line-through text-slate-600':'text-slate-300')}>{task.title}</span>
                                      <span className={cls('text-[9px] font-bold px-1.5 py-0.5 rounded border',PRIORITY_STYLE[task.priority||'medium'])}>{task.priority}</span>
                                      {task.assignee_id && <span className="text-[10px] text-slate-600">{assigneeName(task.assignee_id)}</span>}
                                      <button onClick={()=>openEditTask(task)} className="text-slate-600 hover:text-white transition-colors"><Edit2 size={12}/></button>
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
                )
              }
            </div>
          )}

          {/* ═══ TASKS ═══ */}
          {section === 'tasks' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div><h2 className="text-2xl font-bold text-white">Tasks</h2><p className="text-slate-500 text-sm mt-0.5">{tasks.filter(t=>t.status==='done').length}/{tasks.length} complete</p></div>
                <Btn onClick={()=>{setTkForm({title:'',description:'',team_id:'',assignee_id:'',priority:'medium',due_date:''});setModal('addTask');}}><Plus size={15}/>Add Task</Btn>
              </div>
              {loadingTasks ? <LoadingRows/> : tasks.length === 0
                ? <Empty icon={CheckSquare} msg="No tasks yet." action={{label:'+ Add Task',onClick:()=>setModal('addTask')}}/>
                : (
                  <div className="space-y-2">
                    {tasks.map(task => (
                      <div key={task.id} className="bg-[#0d1117] border border-white/6 rounded-xl px-5 py-3.5 flex items-center gap-4 hover:border-white/10 transition-all group">
                        <div onClick={()=>toggleTask(task)} className={cls('w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors',task.status==='done'?'bg-emerald-500 border-emerald-500':'border-slate-600 hover:border-indigo-400')}>
                          {task.status==='done'&&<CheckCircle size={11} className="text-white"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cls('text-sm font-medium',task.status==='done'?'line-through text-slate-600':'text-slate-200')}>{task.title}</div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {task.team_id && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Layers size={9}/>{teamName(task.team_id)}</span>}
                            {task.assignee_id && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Users size={9}/>{assigneeName(task.assignee_id)}</span>}
                            {task.due_date && <span className="text-[10px] text-slate-600 flex items-center gap-1"><Clock size={9}/>{new Date(task.due_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <span className={cls('text-[10px] font-bold px-2 py-0.5 rounded border uppercase',PRIORITY_STYLE[task.priority||'medium'])}>{task.priority||'med'}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={()=>openEditTask(task)} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/8 transition-all"><Edit2 size={13}/></button>
                          <button onClick={()=>deleteTask(task.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}

          {/* ═══ NOTIFICATIONS ═══ */}
          {section === 'notifications' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div><h2 className="text-2xl font-bold text-white">Notifications</h2><p className="text-slate-500 text-sm mt-0.5">Announcements sent to members</p></div>
                <Btn onClick={()=>setModal('notification')}><Send size={14}/>New Announcement</Btn>
              </div>
              {notifs.length === 0
                ? <Empty icon={Bell} msg="No notifications sent yet." action={{label:'+ Send Announcement',onClick:()=>setModal('notification')}}/>
                : (
                  <div className="space-y-3">
                    {notifs.map((n,i)=>(
                      <div key={i} className="bg-[#0d1117] border border-white/6 rounded-xl p-5">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-white text-sm">{n.title}</div>
                          <div className="flex items-center gap-2 shrink-0">
                            {n.target_role&&<span className="text-[10px] text-slate-500 bg-white/5 border border-white/8 px-2 py-0.5 rounded-md uppercase font-bold">{n.target_role}</span>}
                            {n.target_team_id&&<span className="text-[10px] text-indigo-400 bg-indigo-500/8 border border-indigo-500/15 px-2 py-0.5 rounded-md font-bold">{teamName(n.target_team_id)}</span>}
                            <span className="text-xs text-slate-600">{new Date(n.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
          )}
        </main>
      </div>

      {/* ══════════════════════ MODALS ══════════════════════ */}

      {modal === 'addMember' && (
        <Modal title="Add Member" onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <Field label="Email Address"><Input type="email" placeholder="member@example.com" value={mForm.email} onChange={e=>setMForm({...mForm,email:e.target.value})}/></Field>
            <Field label="Role">
              <Sel value={mForm.role} onChange={e=>setMForm({...mForm,role:e.target.value})}>
                <option value="reviewer">Reviewer</option><option value="presenter">Presenter</option><option value="organizer">Organizer</option><option value="member">Member</option>
              </Sel>
            </Field>
          </div>
          <div className="flex gap-3 mt-6">
            <Btn variant="secondary" className="flex-1" onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={addMember} disabled={saving||!mForm.email.trim()}>{saving?'Adding…':'Add Member'}</Btn>
          </div>
        </Modal>
      )}

      {modal === 'confirmDelete' && modalData && (
        <Modal title="Remove Member" onClose={()=>setModal(null)} width="max-w-sm">
          <p className="text-slate-400 text-sm mb-6">Remove <span className="text-white font-semibold">{mName(modalData)}</span> from this conference?</p>
          <div className="flex gap-3">
            <Btn variant="secondary" className="flex-1" onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn variant="danger" className="flex-1" onClick={()=>{removeMember(modalData.id);setModal(null);}}>Remove</Btn>
          </div>
        </Modal>
      )}

      {(modal === 'createTeam' || modal === 'editTeam') && (
        <Modal title={modal==='createTeam'?'Create Team':'Edit Team'} onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <Field label="Team Name"><Input placeholder="e.g. Review Committee" value={tmForm.name} onChange={e=>setTmForm({...tmForm,name:e.target.value})}/></Field>
            <Field label="Description (optional)"><Input placeholder="What does this team do?" value={tmForm.description} onChange={e=>setTmForm({...tmForm,description:e.target.value})}/></Field>
            <Field label="Team Color">
              <div className="flex gap-2 flex-wrap">
                {TEAM_COLORS.map(c=>(
                  <button key={c} onClick={()=>setTmForm({...tmForm,color:c})} className={cls('w-8 h-8 rounded-lg transition-all border-2',tmForm.color===c?'border-white scale-110':'border-transparent hover:scale-105')} style={{backgroundColor:c}}/>
                ))}
              </div>
            </Field>
          </div>
          <div className="flex gap-3 mt-6">
            <Btn variant="secondary" className="flex-1" onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={modal==='createTeam'?createTeam:saveTeam} disabled={saving||!tmForm.name.trim()}>{saving?'Saving…':modal==='createTeam'?'Create Team':'Save Changes'}</Btn>
          </div>
        </Modal>
      )}

      {(modal === 'addTask' || modal === 'editTask') && (
        <Modal title={modal==='addTask'?'Add Task':'Edit Task'} onClose={()=>setModal(null)} width="max-w-xl">
          <div className="space-y-4">
            <Field label="Task Title"><Input placeholder="Describe the task…" value={tkForm.title} onChange={e=>setTkForm({...tkForm,title:e.target.value})}/></Field>
            <Field label="Description (optional)"><Textarea className="h-20" placeholder="Additional details…" value={tkForm.description} onChange={e=>setTkForm({...tkForm,description:e.target.value})}/></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Assign to Team">
                <Sel value={tkForm.team_id} onChange={e=>setTkForm({...tkForm,team_id:e.target.value})}>
                  <option value="">No team</option>
                  {teams.map(t=><option key={t.id} value={t.id} className="bg-[#0d1117]">{t.name}</option>)}
                </Sel>
              </Field>
              <Field label="Assignee">
                <Sel value={tkForm.assignee_id} onChange={e=>setTkForm({...tkForm,assignee_id:e.target.value})}>
                  <option value="">Unassigned</option>
                  {members.map(m=><option key={m.id} value={m.id} className="bg-[#0d1117]">{mName(m)}</option>)}
                </Sel>
              </Field>
              <Field label="Priority">
                <Sel value={tkForm.priority} onChange={e=>setTkForm({...tkForm,priority:e.target.value})}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </Sel>
              </Field>
              <Field label="Due Date"><Input type="date" value={tkForm.due_date} onChange={e=>setTkForm({...tkForm,due_date:e.target.value})}/></Field>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <Btn variant="secondary" className="flex-1" onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={modal==='addTask'?createTask:saveTask} disabled={saving||!tkForm.title.trim()}>{saving?'Saving…':modal==='addTask'?'Add Task':'Save Changes'}</Btn>
          </div>
        </Modal>
      )}

      {modal === 'notification' && (
        <Modal title="Send Announcement" onClose={()=>setModal(null)}>
          <div className="space-y-4">
            <Field label="Title"><Input placeholder="Announcement headline…" value={nForm.title} onChange={e=>setNForm({...nForm,title:e.target.value})}/></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Target Role">
                <Sel value={nForm.target_role} onChange={e=>setNForm({...nForm,target_role:e.target.value})}>
                  <option value="all">All Members</option><option value="presenter">Presenters</option><option value="reviewer">Reviewers</option><option value="organizer">Organizers</option>
                </Sel>
              </Field>
              <Field label="Target Team">
                <Sel value={nForm.target_team_id} onChange={e=>setNForm({...nForm,target_team_id:e.target.value})}>
                  <option value="">All Teams</option>
                  {teams.map(t=><option key={t.id} value={t.id} className="bg-[#0d1117]">{t.name}</option>)}
                </Sel>
              </Field>
            </div>
            <Field label="Message"><Textarea className="h-28" placeholder="Write your announcement…" value={nForm.message} onChange={e=>setNForm({...nForm,message:e.target.value})}/></Field>
          </div>
          <div className="flex gap-3 mt-6">
            <Btn variant="secondary" className="flex-1" onClick={()=>setModal(null)}>Cancel</Btn>
            <Btn className="flex-1" onClick={sendNotif} disabled={saving||!nForm.title.trim()||!nForm.message.trim()}><Send size={14}/>{saving?'Sending…':'Send'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OrganizerDashboard;