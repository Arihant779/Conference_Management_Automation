import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart2, FileText, Users, CheckSquare, Bell, Plus, Mail, Search,
  ChevronDown, CheckCircle, MapPin, Layers, Clock, Star, MessageSquare
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import { protectedFetch, API_BASE_URL } from '../../utils/api';
import MemberNotifications from './MemberNotifications';
import Sidebar from './Organizer/components/Sidebar';
import AmbientBackground from '../Common/AmbientBackground';
import EmailComposer from './EmailComposer';

/* ── modular sub-components (Reused from Organizer) ── */
import OverviewSection from './Organizer/components/sections/OverviewSection';
import PapersSection from './Organizer/components/sections/PapersSection';
import MembersSection from './Organizer/components/sections/MembersSection';
import AttendeesSection from './Organizer/components/sections/AttendeesSection';
import TeamsSection from './Organizer/components/sections/TeamsSection';
import TasksSection from './Organizer/components/sections/TasksSection';
import NotificationsSection from './Organizer/components/sections/NotificationsSection';
import SpeakersSection from './Organizer/components/sections/SpeakersSection';
import ChatSection from './Organizer/components/sections/ChatSection';
import TeamModal from './Organizer/components/Modals/TeamModal';
import TaskModal from './Organizer/components/Modals/TaskModal';

/* ─── helpers ─────────────────────────────────────────────── */
const cls = (...c) => c.filter(Boolean).join(' ');

const ROLE_STYLE = {
  organizer: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  reviewer: 'bg-amber-500/10  text-amber-300  border-amber-500/25',
  presenter: 'bg-amber-600/15   text-amber-200   border-amber-600/30',
  member: 'bg-slate-500/10  text-slate-300  border-slate-500/25',
};

const PRIORITY_STYLE = {
  high: 'bg-red-500/10 text-red-400 border-red-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

const LoadingRows = () => (
  <div className="space-y-2">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="h-14 bg-white/5 border border-white/5 rounded-xl animate-pulse" />
    ))}
  </div>
);

const Empty = ({ icon: Icon, msg, isDark }) => (
  <div className={`py-16 text-center border border-dashed rounded-2xl ${isDark ? 'border-white/10' : 'border-zinc-300'}`}>
    <Icon size={28} className={`${isDark ? 'text-slate-700' : 'text-zinc-300'} mx-auto mb-3`} />
    <p className={`${isDark ? 'text-slate-500' : 'text-zinc-500'} text-sm`}>{msg}</p>
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
  const { user, theme, userRoles = [], permissions = [] } = useApp();
  const isDark = theme === 'dark';
  const confId = conf.conference_id || conf.id;

  const [section, setSection] = useState('overview');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLM] = useState(false);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLT] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLTk] = useState(false);
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLA] = useState(false);

  const [spTopic, setSpTopic] = useState('');
  const [spLimit, setSpLimit] = useState(10);
  const [spSource, setSpSource] = useState(5);
  const [spLoading, setSpLoading] = useState(false);
  const [spResults, setSpResults] = useState([]);
  const [spError, setSpError] = useState('');

  const [expandedTeam, setExpandedTeam] = useState(null);
  const [globalRatings, setGlobalRatings] = useState({});
  const [myRatings, setMyRatings] = useState({});
  const [activeChatTeamId, setActiveChatTeamId] = useState(null);

  const findSpeakers = async () => {
    if (!spTopic.trim()) return;
    setSpLoading(true); setSpError(''); setSpResults([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/speakers/search?topic=${encodeURIComponent(spTopic)}&limit=${spLimit}&source=${spSource}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setSpResults(data.speakers || []);
    } catch { setSpError('Failed to search for speakers.'); }
    setSpLoading(false);
  };

  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [tmForm, setTmForm] = useState({ name: '', type: '', description: '', color: '#f5c518', head_id: '' });
  const [tkForm, setTkForm] = useState({ title: '', description: '', team_id: '', assignee_id: '', priority: 'medium', due_date: '' });
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  const [confPapers, setConfPapers] = useState([]);
  const [loadingPapers, setLP] = useState(false);
  const [paperFilter, setPaperFilter] = useState('all');

  /* ── fetch ─────────────────────────────────────────────── */
  const fetchAllUsers = useCallback(async () => {
    const { data } = await supabase.from('users').select('user_id, user_name, user_email, volunteer_roles, volunteer_domains');
    setAllUsers(data || []);
  }, []);

  const fetchAttendees = useCallback(async () => {
    setLA(true);
    const { data } = await supabase.from('conference_user').select('*').eq('conference_id', confId).eq('role', 'attendee');
    setAttendees(data || []);
    setLA(false);
  }, [confId]);

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
  }, [confId]);

  const fetchTeams = useCallback(async () => {
    setLT(true);
    const { data: td } = await supabase.from('conference_teams').select('*').eq('conference_id', confId).order('created_at', { ascending: true });
    if (td) {
      const { data: tmData } = await supabase.from('team_members').select('id,team_id,user_id,conference_user_id,status').in('team_id', td.map(t => t.id));
      const map = {};
      (tmData || []).forEach(tm => { (map[tm.team_id] = map[tm.team_id] || []).push(tm); });
      setTeams(td.map(t => ({ ...t, memberList: map[t.id] || [] })));
    } else setTeams([]);
    setLT(false);
  }, [confId]);

  const fetchTasks = useCallback(async () => {
    setLTk(true);
    const { data } = await supabase.from('conference_tasks').select('*').eq('conference_id', confId).order('created_at', { ascending: false });
    setTasks(data || []);
    setLTk(false);
  }, [confId]);

  const fetchGlobalRatings = useCallback(async () => {
    const { data, error } = await supabase.from('member_ratings').select('rated_user_id, rating');
    if (!error && data) {
      const agg = {};
      data.forEach(r => {
        if (!agg[r.rated_user_id]) agg[r.rated_user_id] = { sum: 0, count: 0 };
        agg[r.rated_user_id].sum += r.rating;
        agg[r.rated_user_id].count += 1;
      });
      const result = {};
      Object.entries(agg).forEach(([uid, { sum, count }]) => {
        result[uid] = { avg: sum / count, count };
      });
      setGlobalRatings(result);
    }

    const { data: myData, error: myError } = await supabase.from('member_ratings').select('*').eq('rater_user_id', user?.id);
    if (!myError && myData) {
      const map = {};
      myData.forEach(r => { map[r.rated_user_id] = r; });
      setMyRatings(map);
    }
  }, [user?.id]);

  const fetchPapers = useCallback(async () => {
    setLP(true);
    const { data } = await supabase.from('paper').select('*, users(user_name,user_email), paper_assignments(status)').eq('conference_id', confId).order('paper_id', { ascending: false });
    setConfPapers(data || []);
    setLP(false);
  }, [confId]);

  const updatePaperStatus = async (paperId, newStatus) => {
    setSaving(true);
    const { error } = await supabase.from('paper').upsert({ paper_id: paperId, status: newStatus, conference_id: confId }, { onConflict: 'paper_id' });
    setSaving(false);
    if (error) { alert(`Failed to update status: ${error.message}`); return; }
    setConfPapers(prev => prev.map(p => p.paper_id === paperId ? { ...p, status: newStatus } : p));
  };

  /* ── permissions & logic ── */
  const myMember = members.find(m => m.user_id === user?.id);
  const myMemberId = myMember?.id;

  const myHeadedTeamIds = teams.filter(t => t.head_id === user?.id).map(t => t.id);
  const isTeamHead = myHeadedTeamIds.length > 0;

  const myTeams = teams.filter(t => t.memberList.some(m => (m.conference_user_id === myMemberId || m.user_id === user?.id) && m.status === 'accepted'));
  const pendingTeams = teams.filter(t => t.memberList.some(m => (m.conference_user_id === myMemberId || m.user_id === user?.id) && m.status === 'pending'));
  const myTeamIds = myTeams.map(t => t.id);
  const myTeamNames = myTeams.map(t => t.name.toLowerCase());

  const can = (feature) => {
    // 1. Explicit Role Check
    if (userRoles.includes('organizer')) return true;

    // 2. Head Specific Permissions
    if (feature === 'manage_tasks') return isTeamHead || userRoles.some(r => r.endsWith('_head'));
    if (feature === 'manage_teams') return isTeamHead || userRoles.some(r => r.includes('logistics') || r.includes('registration') || r.includes('organizer'));
    if (feature === 'manage_members') return userRoles.some(r => r.includes('logistics') || r.includes('registration') || r.includes('organizer'));

    // 3. Functional Team Access
    const hasLogistics = userRoles.some(r => r.includes('logistics') || r.includes('registration')) || myTeamNames.some(n => n.includes('logistics') || n.includes('registration') || n.includes('hospitality'));
    const hasOutreach = userRoles.some(r => r.includes('outreach') || r.includes('sponsorship')) || myTeamNames.some(n => n.includes('outreach') || n.includes('sponsorship'));
    const hasProgram = userRoles.some(r => r.includes('programming') || r.includes('technical') || r.includes('program')) || myTeamNames.some(n => n.includes('reviewing') || n.includes('technical') || n.includes('program'));

    if (feature === 'view_papers') return hasProgram;
    if (feature === 'manage_papers') return hasProgram && (isTeamHead || userRoles.some(r => r.endsWith('_head')));
    if (feature === 'view_attendees') return hasLogistics;
    if (feature === 'view_members') return hasLogistics;
    if (feature === 'view_emails') return hasOutreach;
    if (feature === 'send_emails') return hasOutreach;
    if (feature === 'find_speakers') return hasOutreach;

    return permissions.includes(feature);
  };

  const nav = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'my_teams', label: 'My Teams', icon: Users, badge: pendingTeams.length || null },
    { id: 'my_tasks', label: 'My Tasks', icon: CheckSquare },
    ...(can('view_papers') ? [{ id: 'papers', label: 'Papers', icon: FileText }] : []),
    ...(can('view_attendees') ? [{ id: 'attendees', label: 'Attendees', icon: CheckCircle }] : []),
    ...(can('view_members') ? [{ id: 'members', label: 'Members', icon: Users }] : []),
    ...(can('view_emails') ? [{ id: 'emails', label: 'Emails', icon: Mail }] : []),
    ...(can('find_speakers') ? [{ id: 'speakers', label: 'Speakers', icon: Search }] : []),
    { id: 'chat', label: 'Team Chat', icon: MessageSquare },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  useEffect(() => {
    fetchMembers();
    fetchTeams();
    fetchTasks();
    fetchGlobalRatings();
    fetchPapers();
    fetchAllUsers();
    if (can('view_attendees')) fetchAttendees();
  }, [fetchMembers, fetchTeams, fetchTasks, fetchGlobalRatings, fetchPapers, fetchAllUsers, fetchAttendees, userRoles]);

  /* ── Management Actions (Ported for Team Heads) ── */
  const openEditTeam = (team) => {
    setTmForm({ name: team.name, type: team.type || '', description: team.description || '', color: team.color || '#f5c518', head_id: team.head_id || '' });
    setModalData(team);
    setModal('editTeam');
  };

  const saveTeam = async () => {
    setSaving(true);
    const { error } = await protectedFetch(`${API_BASE_URL}/api/teams/${modalData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tmForm)
    }).then(res => res.json());
    setSaving(false);
    if (!error) { setModal(null); fetchTeams(); } else alert(error.message);
  };

  const addToTeam = async (userIds) => {
    const list = Array.isArray(userIds) ? userIds : [userIds];
    await protectedFetch(`${API_BASE_URL}/api/teams/${modalData.id}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conference_id: confId, adds: list })
    });
    fetchTeams();
  };

  const removeFromTeam = async (userId) => {
    await protectedFetch(`${API_BASE_URL}/api/teams/${modalData.id}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conference_id: confId, removes: [userId] })
    });
    fetchTeams();
  };

  const createTask = async () => {
    if (!tkForm.title.trim()) return; setSaving(true);
    const { error } = await supabase.from('conference_tasks').insert([{ conference_id: confId, title: tkForm.title.trim(), description: tkForm.description || null, team_id: tkForm.team_id || null, assignee_id: tkForm.assignee_id || null, priority: tkForm.priority, due_date: tkForm.due_date || null, status: 'pending', created_at: new Date().toISOString() }]);
    setSaving(false);
    if (!error) { setModal(null); setTkForm({ title: '', description: '', team_id: '', assignee_id: '', priority: 'medium', due_date: '' }); fetchTasks(); } else alert(error.message);
  };

  const saveTask = async () => {
    if (!tkForm.title.trim()) return; setSaving(true);
    await supabase.from('conference_tasks').update({ title: tkForm.title.trim(), description: tkForm.description || null, team_id: tkForm.team_id || null, assignee_id: tkForm.assignee_id || null, priority: tkForm.priority, due_date: tkForm.due_date || null }).eq('id', modalData.id);
    setSaving(false); setModal(null); fetchTasks();
  };

  const handleAddVolunteerToConference = async (v) => {
    setSaving(true);
    const { data: existing } = await supabase.from('conference_user').select('id, role').eq('conference_id', confId).eq('user_id', v.user_id).maybeSingle();
    if (existing) {
      if (existing.role !== 'member' && existing.role !== 'organizer' && existing.role !== 'reviewer') {
        await supabase.from('conference_user').update({ role: 'invited' }).eq('id', existing.id);
      }
      setSaving(false);
      return existing.id;
    }
    const { data, error } = await supabase.from('conference_user').insert([{ conference_id: confId, user_id: v.user_id, email: v.user_email || '', full_name: v.user_name || '', role: 'invited', joined_at: new Date().toISOString() }]).select().single();
    setSaving(false);
    if (error) { alert(error.message); return null; }
    fetchMembers();
    return data.id;
  };

  const mName = (m) => m?.full_name || m?.email || m?.user_id?.substring(0, 8) || '?';
  const teamName = (id) => teams.find(t => t.id === id)?.name || '—';

  const toggleTask = async (task) => {
    const s = task.status === 'done' ? 'pending' : 'done';
    const { error } = await supabase.from('conference_tasks').update({ status: s }).eq('id', task.id);
    if (!error) setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: s } : t));
  };

  const [memberSearch, setMemberSearch] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState(new Set());
  const [updatingBulk, setUpdatingBulk] = useState(false);

  const handleBulkRoomUpdate = async (assign) => {
    if (!selectedAttendees.size) return;
    setUpdatingBulk(true);
    const ids = [...selectedAttendees];
    const { error } = await supabase.from('conference_user').update({ room_assigned: assign }).in('id', ids);
    if (!error) {
      setAttendees(prev => prev.map(a => ids.includes(a.id) ? { ...a, room_assigned: assign } : a));
      setSelectedAttendees(new Set());
    }
    setUpdatingBulk(false);
  };

  const handleSingleRoomUpdate = async (id, assign) => {
    const { error } = await supabase.from('conference_user').update({ room_assigned: assign }).eq('id', id);
    if (!error) setAttendees(prev => prev.map(a => a.id === id ? { ...a, room_assigned: assign } : a));
  };

  const handleInviteResponse = async (teamId, status) => {
    try {
      const res = await protectedFetch(`${API_BASE_URL}/api/teams/invite/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, user_id: user.id, status })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchTeams();
    } catch (err) {
      alert(`Response error: ${err.message}`);
    }
  };

  const filteredAttendees = attendees.filter(a =>
    mName(a).toLowerCase().includes(memberSearch.toLowerCase()) ||
    (a.email || '').toLowerCase().includes(memberSearch.toLowerCase())
  );

  const roleLabel = userRoles.find(r => r.includes('_head')) || 'Team Member';

  const myTasks = tasks.filter(t => t.assignee_id === myMemberId || myTeams.some(mt => mt.id === t.team_id));


  const [mSearch, setMSearch] = useState('');
  const setRatingMember = (member) => {
    setModal('rating');
    setModalData(member);
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => mName(m).toLowerCase().includes(mSearch.toLowerCase()) || (m.email || '').toLowerCase().includes(mSearch.toLowerCase()));
  }, [members, mSearch]);

  const renderContent = () => {
    if (section === 'overview') {
      return (
        <OverviewSection
          members={members}
          teams={myTeams}
          tasks={tasks.filter(t => myTeamIds.includes(t.team_id) || t.assignee_id === myMemberId)}
          confPapers={can('view_papers') ? confPapers : []}
          pendingCount={can('view_papers') ? confPapers.filter(p => p.status === 'pending').length : 0}
          accepted={can('view_papers') ? confPapers.filter(p => p.status === 'accepted').length : 0}
          rejected={can('view_papers') ? confPapers.filter(p => p.status === 'rejected').length : 0}
          volunteersCount={0} volunteerMap={{}}
          isGlobalHead={false}
          can={can}
          setSection={setSection}
          pendingTeams={pendingTeams}
          onInviteResponse={handleInviteResponse}
        />
      );
    }
    if (section === 'papers') {
      const pendingCount = confPapers.filter(p => p.status === 'pending').length;
      const accepted = confPapers.filter(p => p.status === 'accepted').length;
      const rejected = confPapers.filter(p => p.status === 'rejected').length;

      return (
        <PapersSection
          confPapers={confPapers}
          paperFilter={paperFilter}
          setPaperFilter={setPaperFilter}
          pendingCount={pendingCount}
          accepted={accepted}
          rejected={rejected}
          loadingPapers={loadingPapers}
          can={can}
          updatePaperStatus={updatePaperStatus}
          isOrganizer={false}
        />
      );
    }
    if (section === 'attendees') return (
      <AttendeesSection
        confId={confId}
        attendees={attendees}
        filteredAttendees={filteredAttendees}
        memberSearch={memberSearch}
        setMemberSearch={setMemberSearch}
        selectedAttendees={selectedAttendees}
        setSelectedAttendees={setSelectedAttendees}
        updatingBulk={updatingBulk}
        handleBulkRoomUpdate={handleBulkRoomUpdate}
        handleSingleRoomUpdate={handleSingleRoomUpdate}
        roleLabel={roleLabel}
        loadingMembers={loadingAttendees}
        isOrganizer={false}
        setModal={setModal}
        setModalData={setModalData}
      />
    );
    if (section === 'speakers') return (
      <SpeakersSection
        spTopic={spTopic} setSpTopic={setSpTopic}
        spLimit={spLimit} setSpLimit={setSpLimit}
        spSource={spSource} setSpSource={setSpSource}
        spLoading={spLoading} spResults={spResults}
        spError={spError} findSpeakers={findSpeakers}
      />
    );
    if (section === 'emails') return <EmailComposer conf={conf} isOrganizer={false} onOpenEmailSettings={null} />;
    if (section === 'members') return (
      <MembersSection
        filteredMembers={members.filter(m => mName(m).toLowerCase().includes(mSearch.toLowerCase()) || (m.email || '').toLowerCase().includes(mSearch.toLowerCase()))}
        memberSearch={mSearch}
        setMemberSearch={setMSearch}
        members={members}
        volunteersCount={0}
        volunteerMap={{}}
        isOrganizer={false}
        can={can}
        loadingMembers={loadingMembers}
        setModal={setModal}
        setModalData={setModalData}
        setRatingMember={setRatingMember}
        myRatings={myRatings || {}}
        globalRatings={globalRatings || {}}
        updateRole={() => { }} // Members can't update roles
      />
    );
    if (section === 'notifications') return <MemberNotifications conf={conf} />;
    if (section === 'chat') {
      return (
        <ChatSection
          confId={confId}
          teams={teams}
          isOrganizer={false}
          myTeamIds={myTeamIds}
          activeChatTeamId={activeChatTeamId}
          setActiveChatTeamId={setActiveChatTeamId}
          showLeaderHub={false}
        />
      );
    }

    if (section === 'my_teams') {
      return (
        <div className="space-y-8 animate-in slide-in-from-bottom-8">
          <div>
            <h2 className={`text-2xl font-bold transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>My Teams</h2>
            <p className="text-slate-500 text-sm mt-0.5">Teams you are collaborating in</p>
          </div>

          {loadingTeams ? <LoadingRows /> : myTeams.length === 0 ? (
            <Empty icon={Layers} msg="You are not part of any teams yet." isDark={isDark} />
          ) : (
            <div className="space-y-3">
              {myTeams.map(team => {
                const isOpen = expandedTeam === team.id;
                const teamMembers = team.memberList.map(tm => members.find(m => m.id === tm.conference_user_id || m.user_id === tm.user_id)).filter(Boolean);
                const teamTasks = tasks.filter(t => t.team_id === team.id);

                return (
                  <div key={team.id} className={`backdrop-blur-md border transition-all duration-300 rounded-xl overflow-hidden ${isDark ? 'bg-[#0d1117]/60 border-white/10' : 'bg-white border-zinc-200 shadow-sm'
                    }`}>
                    <div className={`flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-50'
                      }`} onClick={() => setExpandedTeam(isOpen ? null : team.id)}>
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: team.color }} />
                      <div className="flex-1">
                        <div className={`font-semibold text-sm transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>{team.name}</div>
                        {team.description && <div className="text-xs text-slate-500 mt-0.5">{team.description}</div>}
                      </div>
                      <div className="flex items-center gap-3">
                        {team.head_id === user?.id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditTeam(team); }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${isDark ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20' : 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100'
                              }`}
                          >
                            Manage
                          </button>
                        )}
                        <ChevronDown size={15} className={cls('text-slate-600 transition-transform', isOpen && 'rotate-180')} />
                      </div>
                    </div>

                    {isOpen && (
                      <div className={`border-t px-5 py-5 space-y-6 ${isDark ? 'border-white/5 bg-black/20' : 'border-zinc-100 bg-zinc-50/50'}`}>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-slate-600' : 'text-zinc-400'}`}>Team Members</p>
                          <div className="flex flex-wrap gap-2">
                            {teamMembers.map(m => (
                              <div key={m.id} className={`flex items-center gap-2 border rounded-lg px-2.5 py-1.5 transition-all ${isDark ? 'bg-white/5 border-white/10 hover:border-amber-500/30' : 'bg-white border-zinc-200 hover:border-amber-500/30'}`}>
                                <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-zinc-700'}`}>{mName(m)}</span>
                                <span className={cls('text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase', ROLE_STYLE[m.role] || ROLE_STYLE.member)}>{m.role}</span>
                                {globalRatings[m.user_id] && <RatingBadge avg={globalRatings[m.user_id].avg} count={globalRatings[m.user_id].count} size={9} />}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-widest mb-3 ${isDark ? 'text-slate-600' : 'text-zinc-400'}`}>Team Tasks ({teamTasks.length})</p>
                          {teamTasks.length === 0 ? <p className="text-xs text-slate-600 italic">No tasks assigned.</p> : (
                            <div className="space-y-2">
                              {teamTasks.map(t => (
                                <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isDark ? 'bg-white/[0.02] border-white/5' : 'bg-zinc-50 border-zinc-100'
                                  }`}>
                                  <div onClick={() => toggleTask(t)} className={cls('w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all', t.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700 hover:border-amber-500')}>
                                    {t.status === 'done' && <CheckCircle size={10} className="text-white" />}
                                  </div>
                                  <span className={cls('text-xs flex-1', t.status === 'done' ? 'text-slate-600 line-through' : (isDark ? 'text-slate-300' : 'text-zinc-800'))}>{t.title}</span>
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
          <div className="flex justify-between items-end">
            <div>
              <h2 className={`text-2xl font-bold transition-colors ${isDark ? 'text-white' : 'text-zinc-900'}`}>My Tasks</h2>
              <p className="text-slate-500 text-sm mt-0.5">Tasks assigned to you across all teams</p>
            </div>
            {isTeamHead && (
              <button
                onClick={() => { setTkForm({ title: '', description: '', team_id: myHeadedTeamIds[0] || '', assignee_id: '', priority: 'medium', due_date: '' }); setModal('addTask'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg ${isDark ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                  }`}
              >
                <Plus size={14} /> Add Task
              </button>
            )}
          </div>
          {loadingTasks ? <LoadingRows /> : myTasks.length === 0 ? <Empty icon={CheckSquare} msg="All caught up!" isDark={isDark} /> : (
            <div className="space-y-3">
              {myTasks.map(task => (
                <div key={task.id} className={`backdrop-blur-md border rounded-xl px-5 py-4 flex items-center gap-4 transition-all group ${isDark ? 'bg-[#0d1117]/60 border-white/10 hover:border-amber-500/30' : 'bg-white border-zinc-200 hover:border-amber-500/30 shadow-sm'
                  }`}>
                  <div onClick={() => toggleTask(task)} className={cls('w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all', task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-700 hover:border-amber-500')}>
                    {task.status === 'done' && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cls('text-sm font-bold transition-colors', task.status === 'done' ? 'line-through text-slate-600' : (isDark ? 'text-slate-100 group-hover:text-amber-400' : 'text-zinc-800 group-hover:text-amber-600'))}>{task.title}</div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {task.team_id && <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-bold uppercase tracking-wider"><Layers size={10} />{teamName(task.team_id)}</span>}
                      {task.due_date && <span className="text-[10px] text-zinc-500 flex items-center gap-1 font-bold uppercase tracking-wider"><Clock size={10} />{new Date(task.due_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <span className={cls('text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border transition-colors', PRIORITY_STYLE[task.priority || 'medium'])}>{task.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
  };

  return (
    <div className={`relative min-h-screen transition-colors duration-500 selection:bg-amber-500/30 overflow-hidden ${isDark ? 'text-slate-200' : 'text-zinc-800'}`} style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
      <AmbientBackground />

      <div className="w-full h-screen flex relative z-10 overflow-hidden">
        <Sidebar nav={nav} section={section} setSection={setSection} isOrganizer={false} roleLabel={myMember?.role || 'Member'} onBack={onBack} />

        <main className={cls('flex-1 p-8 custom-scrollbar flex flex-col', section === 'chat' ? 'overflow-hidden' : 'overflow-y-auto')}>
          <div className={cls('flex-1 min-h-0 flex flex-col w-full', section !== 'chat' ? 'max-w-6xl mx-auto' : '')}>

            {/* ── TOP LEVEL INVITATIONS ── */}
            {pendingTeams.length > 0 && (
              <div className={`mb-10 p-6 rounded-[2.5rem] border animate-in slide-in-from-top-4 duration-700 bg-amber-500/5 border-amber-500/10 shadow-[0_0_40px_rgba(245,158,11,0.03)]`}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/20 shadow-inner">
                    <label className="text-2xl">⚡</label>
                  </div>
                  <div>
                    <h3 className={`text-xl font-black tracking-tight text-amber-500`}>Collaboration Pending</h3>
                    <p className="text-xs font-bold text-amber-500/60 uppercase tracking-widest leading-none mt-1">Accept invitations to access team resources</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {pendingTeams.map(team => (
                    <div key={team.id} className={`flex items-center justify-between p-6 rounded-[1.5rem] border transition-all ${isDark ? 'bg-black/40 border-white/5 hover:border-white/10' : 'bg-white border-amber-100 shadow-sm'}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: team.color || '#f59e0b' }} />
                        <div>
                          <div className={`font-black text-lg ${isDark ? 'text-white' : 'text-zinc-900'}`}>{team.name}</div>
                          <div className="text-[10px] text-amber-500 uppercase font-bold tracking-widest mt-0.5">Invite Received</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleInviteResponse(team.id, 'accepted')} className="px-8 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-black uppercase rounded-2xl transition-all shadow-lg shadow-amber-500/25 active:scale-95">Accept</button>
                        <button onClick={() => handleInviteResponse(team.id, 'rejected')} className={`px-6 py-2.5 text-[11px] font-black uppercase rounded-2xl border transition-all ${isDark ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/5' : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50'} active:scale-95`}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={cls('flex-1 min-h-0 flex flex-col', section !== 'chat' && 'pb-20')}>
              {renderContent()}
            </div>
          </div>
        </main>
      </div>

      {/* ══════════════════════════ MODALS ══════════════════════════ */}

      {(modal === 'editTeam') && (
        <TeamModal
          mode={modal} modalData={modalData} tmForm={tmForm} setTmForm={setTmForm}
          isOrganizer={false} saving={saving} members={members}
          allUsers={allUsers} confId={confId} globalRatings={globalRatings}
          onClose={() => setModal(null)} onSave={saveTeam}
          onAddToTeam={addToTeam} onRemoveFromTeam={removeFromTeam}
          onAddVolunteer={handleAddVolunteerToConference}
        />
      )}

      {(modal === 'addTask' || modal === 'editTask') && (
        <TaskModal
          mode={modal} tkForm={tkForm} setTkForm={setTkForm}
          teams={teams.filter(t => myHeadedTeamIds.includes(t.id))} // Only show teams they lead
          members={members} isOrganizer={false} userId={user.id} saving={saving}
          onClose={() => setModal(null)} onCreate={createTask} onSave={saveTask}
        />
      )}
    </div>
  );
};

export default MemberDashboard;
