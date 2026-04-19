import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, FileText, Users, CheckSquare, Bell, Send,
  Layers, Clock, Sparkles, Star, Check, Settings2, MessageSquare, Zap
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import { protectedFetch, API_BASE_URL } from '../../utils/api';
import { mName, VOLUNTEER_ROLE_LABELS } from './Organizer/constants';

/* ── external dashboard components (unchanged) ── */
import EmailComposer from './EmailComposer';
import PaperAllocation from './PaperAllocation';
import EmailSettings from './EmailSettings';
import FeedbackManager from './FeedbackManager';
import EmailAutomationsManager from './EmailAutomationsManager';

/* ── modular sub-components ── */
import { CinematicBackground } from './Organizer/components/common/Effects';
import Sidebar from './Organizer/components/Sidebar';
import OverviewSection from './Organizer/components/sections/OverviewSection';
import PapersSection from './Organizer/components/sections/PapersSection';
import MembersSection from './Organizer/components/sections/MembersSection';
import AttendeesSection from './Organizer/components/sections/AttendeesSection';
import TeamsSection from './Organizer/components/sections/TeamsSection';
import TasksSection from './Organizer/components/sections/TasksSection';
import NotificationsSection from './Organizer/components/sections/NotificationsSection';
import SpeakersSection from './Organizer/components/sections/SpeakersSection';
import SubmissionSettingsSection from './Organizer/components/sections/SubmissionSettingsSection';
import ChatSection from './Organizer/components/sections/ChatSection';
import InvitationTrackerSection from './Organizer/components/sections/InvitationTrackerSection';

import RateMemberModal from './Organizer/components/Modals/RateMemberModal';
import AddMemberModal from './Organizer/components/Modals/AddMemberModal';
import ConfirmDeleteModal from './Organizer/components/Modals/ConfirmDeleteModal';
import TeamModal from './Organizer/components/Modals/TeamModal';
import TaskModal from './Organizer/components/Modals/TaskModal';
import NotificationModal from './Organizer/components/Modals/NotificationModal';
import DeleteConferenceModal from './Organizer/components/Modals/DeleteConferenceModal';

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN ORGANIZER DASHBOARD — State Orchestrator
═══════════════════════════════════════════════════════════════════════════ */
const OrganizerDashboard = ({ conf, onBack, onSwitchView }) => {
  const { user, permissions, userRoles, fetchConferences, theme } = useApp();
  const isDark = theme === 'dark';
  const confId = conf.conference_id || conf.id;

  const [section, setSection] = useState('overview');
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLM] = useState(true);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLT] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLTasks] = useState(true);

  useEffect(() => {
    if (section === 'site_preview') { onSwitchView('home'); setSection('overview'); }
  }, [section, onSwitchView, setSection]);

  const myMember = members.find(m => m.user_id === user.id);
  const myMemberId = myMember?.id;
  const isGlobalHead = conf.conference_head_id === user.id;
  const isOrganizer = isGlobalHead || (userRoles && userRoles.includes('organizer'));
  const myHeadedTeamIds = teams.filter(t => t.head_id === user.id).map(t => t.id);

  const pendingTeams = teams.filter(t => t.memberList?.some(m => (m.user_id === user?.id || (myMemberId && m.conference_user_id === myMemberId)) && m.status === 'pending'));
  const isTeamHead = !isOrganizer && myHeadedTeamIds.length > 0;
  const myTeamIds = teams.filter(t => t.memberList?.some(m => m.user_id === user.id)).map(t => t.id);

  const FALLBACK_PERMS = {
    organizer: ['view_dashboard', 'view_emails', 'send_emails', 'manage_emails', 'view_papers', 'manage_papers', 'allocate_papers', 'view_members', 'manage_members', 'view_teams', 'manage_teams', 'view_tasks', 'manage_tasks', 'view_notifications', 'send_notifications', 'find_speakers', 'view_feedback', 'manage_feedback', 'view_attendees'],
    organizer_head: ['view_dashboard', 'view_emails', 'send_emails', 'manage_emails', 'view_papers', 'manage_papers', 'allocate_papers', 'view_members', 'manage_members', 'view_teams', 'manage_teams', 'view_tasks', 'manage_tasks', 'view_notifications', 'send_notifications', 'find_speakers', 'view_feedback', 'manage_feedback', 'view_attendees'],
    programming_head: ['view_dashboard', 'view_papers', 'manage_papers', 'allocate_papers', 'view_members', 'view_notifications'],
    logistics_head: ['view_dashboard', 'view_teams', 'manage_teams', 'view_tasks', 'manage_tasks', 'view_notifications', 'view_attendees', 'manage_members'],
    outreach_head: ['view_dashboard', 'view_emails', 'send_emails', 'find_speakers', 'view_members', 'view_notifications', 'send_notifications'],
    feedback_head: ['view_dashboard', 'view_feedback', 'manage_feedback', 'view_notifications'],
    event_head: ['view_dashboard', 'view_teams', 'view_tasks', 'manage_tasks', 'view_members', 'view_notifications'],
    technical_head: ['view_dashboard', 'view_teams', 'view_tasks', 'manage_tasks', 'view_notifications', 'view_papers', 'manage_papers', 'allocate_papers'],
    registration_head: ['view_dashboard', 'view_members', 'manage_members', 'view_teams', 'view_notifications'],
    sponsorship_head: ['view_dashboard', 'view_emails', 'send_emails', 'view_notifications'],
    member: ['view_dashboard', 'view_teams', 'view_tasks', 'view_notifications'],
  };

  const getRolePermissions = (role) => {
    if (FALLBACK_PERMS[role]) return FALLBACK_PERMS[role];
    if (role.endsWith('_head') || role.endsWith('_coord') || role.endsWith('_lead')) return ['view_dashboard', 'view_teams', 'view_tasks', 'manage_tasks', 'view_notifications', 'view_members'];
    return [];
  };

  const effectivePermissions = Array.from(new Set([...(permissions || []), ...(userRoles ? userRoles.flatMap(getRolePermissions) : [])]));
  const can = (p) => effectivePermissions.includes(p);

  const roleLabel = isOrganizer ? 'Organizer' : ((userRoles || []).find(r => r !== 'team_head' && (r.endsWith('_head') || r.endsWith('_coord') || r.endsWith('_lead')))?.replace(/technical_head/g, 'Reviewing Team')?.replace(/outreach_head/g, 'Outreach Team')?.replace(/logistics_head/g, 'Logistics Team')?.replace(/event_head/g, 'Event Management Team')?.replace(/organizer_head/g, 'Organizing Team')?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || (userRoles?.includes('team_head') || isTeamHead ? 'Team Lead' : (userRoles?.includes('reviewer') ? 'Reviewer' : 'Team Member')));

  const [notifs, setNotifs] = useState([]);
  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [localPublished, setLocalPublished] = useState(conf.is_published);

  // Sync local state if prop changes from outside
  useEffect(() => {
    setLocalPublished(conf.is_published);
  }, [conf.is_published]);

  const [memberSearch, setMemberSearch] = useState('');
  const [paperFilter, setPaperFilter] = useState('all');
  const [allUsers, setAllUsers] = useState([]);
  const [selectedAttendees, setSelectedAttendees] = useState(new Set());
  const [updatingBulk, setUpdatingBulk] = useState(false);

  const [myRatings, setMyRatings] = useState({});
  const [globalRatings, setGlobalRatings] = useState({});
  const [ratingMember, setRatingMember] = useState(null);

  const [mForm, setMForm] = useState({ email: '', role: 'reviewer' });
  const [tmForm, setTmForm] = useState({ name: '', type: '', description: '', color: '#f5c518', head_id: '' });
  const [tkForm, setTkForm] = useState({ title: '', description: '', team_id: '', assignee_id: '', priority: 'medium', due_date: '' });
  const [nForm, setNForm] = useState({ title: '', message: '', target_role: 'all', target_team_id: '' });

  const [spTopic, setSpTopic] = useState('');
  const [spLimit, setSpLimit] = useState(10);
  const [spSource, setSpSource] = useState(5);
  const [spLoading, setSpLoading] = useState(false);
  const [spResults, setSpResults] = useState([]);
  const [spError, setSpError] = useState('');
  const [activeChatTeamId, setActiveChatTeamId] = useState(null);

  const [confPapers, setConfPapers] = useState([]);
  const [loadingPapers, setLP] = useState(true);

  const pendingCount = confPapers.filter(p => p.status === 'pending').length;
  const accepted = confPapers.filter(p => p.status === 'accepted').length;
  const rejected = confPapers.filter(p => p.status === 'rejected').length;

  const [organizerUserId, setOrganizerUserId] = useState(null);

  /* ── fetch ── */
  const fetchMembers = useCallback(async () => {
    setLM(true);
    const { data, error } = await supabase.from('conference_user').select('id, user_id, role, email, full_name, joined_at, accommodation_required, accommodation_notes, users(user_name, user_email)').eq('conference_id', confId).order('joined_at', { ascending: false });
    if (error) console.error('fetchMembers error:', error);
    const enriched = (data || []).map(m => ({ ...m, email: m.email || m.users?.user_email || '', full_name: m.full_name || m.users?.user_name || '' }));
    setMembers(enriched); setLM(false); return enriched;
  }, [confId]);

  const handleBulkRoomUpdate = async (assign) => {
    if (selectedAttendees.size === 0) return;
    setUpdatingBulk(true);
    console.warn('Bulk room update skipped: columns missing from schema');
    setUpdatingBulk(false);
  };

  const handleSingleRoomUpdate = async (id, assign, roomNum = null) => {
    console.warn('Room update skipped: columns missing from schema');
  };

  const fetchAllUsers = useCallback(async () => {
    const { data, error } = await supabase.from('users').select('user_id, user_name, user_email, volunteer_roles, volunteer_domains');
    if (error) { console.error(error); return; }
    setAllUsers(data || []);
  }, []);

  const fetchPapers = useCallback(async () => {
    setLP(true);
    const { data, error } = await supabase.from('paper').select('paper_id,paper_title,abstract,keywords,research_area,status,file_url,author_id,users(user_name,user_email),paper_assignments(status)').eq('conference_id', confId).order('paper_id', { ascending: false });
    if (error) console.error(error);
    const paperMap = {};
    (data || []).forEach(p => { const title = p.paper_title || 'Untitled'; const hasAssign = p.paper_assignments?.length > 0; if (!paperMap[title] || (hasAssign && !paperMap[title].paper_assignments?.length)) paperMap[title] = p; });
    const deduped = Object.values(paperMap);
    setConfPapers(deduped); setLP(false);
    const syncConsensus = async () => {
      let changed = false;
      const updated = deduped.map(p => {
        if (p.paper_assignments?.length > 0 && p.status === 'pending') {
          const total = p.paper_assignments.length, acc = p.paper_assignments.filter(a => a.status === 'accepted').length, pen = p.paper_assignments.filter(a => a.status === 'pending').length;
          let consensus = 'pending';
          if (total > 0) { const t = 0.66; if ((acc / total) >= t) consensus = 'accepted'; else if (((acc + pen) / total) < t) consensus = 'rejected'; }
          if (p.status !== consensus) { supabase.from('paper').upsert({ paper_id: p.paper_id, status: consensus, conference_id: confId }, { onConflict: 'paper_id' }).then(); changed = true; return { ...p, status: consensus }; }
        }
        return p;
      });
      if (changed) setConfPapers(updated);
    };
    syncConsensus();
  }, [confId]);

  const updatePaperStatus = async (paperId, newStatus) => {
    setSaving(true);
    const { error } = await supabase.from('paper').upsert({ paper_id: paperId, status: newStatus, conference_id: confId }, { onConflict: 'paper_id' });
    setSaving(false);
    if (error) { alert(`Failed to update status: ${error.message}`); return; }
    setConfPapers(prev => prev.map(p => p.paper_id === paperId ? { ...p, status: newStatus } : p));
  };

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
    setLTasks(true);
    const { data } = await supabase.from('conference_tasks').select('*').eq('conference_id', confId).order('created_at', { ascending: false });
    setTasks(data || []); setLTasks(false);
  }, [confId]);

  const fetchNotifs = useCallback(async () => {
    const { data } = await supabase.from('notifications').select('*').eq('conference_id', confId).order('created_at', { ascending: false }).limit(20);
    setNotifs(data || []);
  }, [confId]);

  const fetchMyRatings = useCallback(async (orgUserId) => {
    if (!orgUserId) return;
    const { data, error } = await supabase.from('member_ratings').select('id, rated_user_id, rating, comment').eq('conference_id', confId).eq('rater_user_id', orgUserId);
    if (error) return;
    const map = {};
    (data || []).forEach(r => { map[r.rated_user_id] = r; });
    setMyRatings(map);
  }, [confId]);

  const fetchGlobalRatings = useCallback(async () => {
    const { data, error } = await supabase.from('member_ratings').select('rated_user_id, rating');
    if (error) return;
    const agg = {};
    (data || []).forEach(r => { if (!agg[r.rated_user_id]) agg[r.rated_user_id] = { sum: 0, count: 0 }; agg[r.rated_user_id].sum += r.rating; agg[r.rated_user_id].count += 1; });
    const result = {};
    Object.entries(agg).forEach(([uid, { sum, count }]) => { result[uid] = { avg: sum / count, count }; });
    setGlobalRatings(result);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { const uid = data?.user?.id; if (uid) { setOrganizerUserId(uid); fetchMyRatings(uid); } });
  }, [fetchMyRatings]);

  useEffect(() => {
    fetchMembers(); fetchAllUsers(); fetchTeams(); fetchTasks(); fetchNotifs(); fetchPapers(); fetchGlobalRatings();
  }, [fetchMembers, fetchAllUsers, fetchTeams, fetchTasks, fetchNotifs, fetchPapers, fetchGlobalRatings]);

  /* ── member CRUD ── */
  const updateRole = async (id, role) => {
    const { error } = await supabase.from('conference_user').update({ role }).eq('id', id);
    if (error) { alert(error.message); return; }
    setMembers(ms => ms.map(m => m.id === id ? { ...m, role } : m));
  };
  const removeMember = async (id) => {
    // 1. Get the user_id for this conference_user before we delete it (needed for paper assignments)
    const member = members.find(m => m.id === id);
    if (!member) return;

    try {
      setSaving(true);

      // 2. Remove from team memberships
      await supabase.from('team_members').delete().eq('conference_user_id', id);

      // 3. Unassign from tasks (don't delete the task, just remove the assignee)
      await supabase.from('conference_tasks').update({ assignee_id: null }).eq('assignee_id', id);

      // 4. Remove paper assignments if they were a reviewer
      if (member.user_id) {
        await supabase.from('paper_assignments').delete().eq('conference_id', confId).eq('reviewer_id', member.user_id);
      }

      // 5. Finally, remove from the conference member list
      const { error } = await supabase.from('conference_user').delete().eq('id', id);

      if (error) {
        alert('Failed to remove member: ' + error.message);
      } else {
        // Refresh local state
        fetchMembers();
        fetchTeams();
        if (section === 'tasks') fetchTasks();
        if (section === 'papers') fetchPapers();
      }
    } catch (err) {
      console.error('Member removal error:', err);
    } finally {
      setSaving(false);
    }
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
      fetchMembers();
    } catch (err) {
      alert(`Response error: ${err.message}`);
    }
  };

  const handleAddMember = async (user, role) => {
    const already = members.find(m => m.user_id === user.user_id);
    if (already) { alert('Already a member.'); return; }
    setSaving(true);
    const { error } = await supabase.from('conference_user').insert([{ conference_id: confId, user_id: user.user_id, email: user.user_email || '', full_name: user.user_name || '', role, joined_at: new Date().toISOString() }]);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setModal(null); setMForm({ email: '', role: 'reviewer' }); fetchMembers(); fetchAllUsers();
  };

  /* ── team CRUD ── */
  const createTeam = async (finalAdds = [], _, explicitHeadId = null) => {
    if (!tmForm.name.trim()) return; setSaving(true);
    const headId = explicitHeadId || tmForm.head_id;

    const membersToInvite = finalAdds; // Now receiving user_ids directly

    try {
      const res = await protectedFetch(`${API_BASE_URL}/api/teams/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conference_id: confId,
          name: tmForm.name.trim(),
          description: tmForm.description.trim(),
          color: tmForm.color,
          head_id: headId || null,
          members: membersToInvite,
          type: tmForm.type
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setModal(null); setTmForm({ name: '', type: '', description: '', color: '#f5c518', head_id: '' });
      fetchTeams();
    } catch (err) {
      alert(`Create error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const saveTeam = async (finalAdds = [], pendingRemoves = [], _, explicitHeadId = null) => {
    if (!tmForm.name.trim()) return; setSaving(true);
    const headId = explicitHeadId || tmForm.head_id;

    try {
      // 1. Update Meta
      const metaRes = await protectedFetch(`${API_BASE_URL}/api/teams/${modalData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tmForm.name.trim(),
          description: tmForm.description.trim(),
          color: tmForm.color,
          head_id: headId || null
        })
      });
      const metaResJson = await metaRes.json();
      if (metaResJson.error) throw new Error(metaResJson.error);

      // 2. Sync Members
      const adds = finalAdds; // Now receiving user_ids directly
      const removes = pendingRemoves; // Now receiving user_ids directly

      if (adds.length > 0 || removes.length > 0) {
        const syncRes = await protectedFetch(`${API_BASE_URL}/api/teams/${modalData.id}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conference_id: confId, adds, removes })
        });
        const syncData = await syncRes.json();
        if (syncData.error) throw new Error(syncData.error);
      }

      setModal(null); fetchTeams();
    } catch (err) {
      alert(`Save error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteTeam = async (id) => {
    try {
      const res = await protectedFetch(`${API_BASE_URL}/api/teams/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchTeams(); fetchTasks();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const addToTeam = async (teamId, confUserId) => {
    const member = members.find(m => m.id === confUserId);
    if (!member) return;
    const team = teams.find(t => t.id === teamId);
    if (team?.memberList.some(tm => tm.conference_user_id === confUserId)) { alert('Already in team.'); return; }
    setSaving(true);
    try {
      const res = await protectedFetch(`${API_BASE_URL}/api/teams/${teamId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conference_id: confId, adds: [member.user_id], removes: [] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchTeams();
    } catch (err) {
      alert(`Add to team error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const removeFromTeam = async (teamId, confUserId) => {
    const member = members.find(m => m.id === confUserId);
    if (!member) return;
    setSaving(true);
    try {
      const res = await protectedFetch(`${API_BASE_URL}/api/teams/${teamId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conference_id: confId, adds: [], removes: [member.user_id] })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      fetchTeams();
    } catch (err) {
      alert(`Remove from team error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddVolunteerToConference = async (v) => {
    setSaving(true);

    // Check if this user is already in the conference (e.g. from a previous half-completed invite)
    const { data: existing } = await supabase
      .from('conference_user')
      .select('id, role')
      .eq('conference_id', confId)
      .eq('user_id', v.user_id)
      .maybeSingle();

    if (existing) {
      // Ensure at least 'invited' role so they can see the conference card
      if (existing.role !== 'member' && existing.role !== 'organizer' && existing.role !== 'reviewer') {
        await supabase.from('conference_user').update({ role: 'invited' }).eq('id', existing.id);
      }
      setSaving(false);
      return existing.id;
    }

    // Brand-new user → insert with 'invited' role
    const { data, error } = await supabase.from('conference_user').insert([{
      conference_id: confId,
      user_id: v.user_id,
      email: v.user_email || '',
      full_name: v.user_name || '',
      role: 'invited',
      joined_at: new Date().toISOString()
    }]).select().single();

    setSaving(false);
    if (error) { alert(error.message); return null; }
    fetchMembers();
    return data.id;
  };

  /* ── task CRUD ── */
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

  const toggleTask = async (task) => {
    const s = task.status === 'done' ? 'pending' : 'done';
    await supabase.from('conference_tasks').update({ status: s }).eq('id', task.id);
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: s } : t));
  };

  const deleteTask = async (id) => { await supabase.from('conference_tasks').delete().eq('id', id); setTasks(ts => ts.filter(t => t.id !== id)); };

  /* ── notif ── */
  const sendNotif = async () => {
    if (!nForm.title.trim() || !nForm.message.trim()) return; setSaving(true);
    const payload = { conference_id: confId, title: nForm.title.trim(), message: nForm.message.trim(), target_role: nForm.target_role === 'all' ? null : nForm.target_role, target_team_id: nForm.target_team_id || null, created_at: new Date().toISOString() };
    const { error } = await supabase.from('notifications').insert([payload]);
    setSaving(false);
    if (!error) { setNotifs(p => [{ ...payload, id: Date.now() }, ...p]); setModal(null); setNForm({ title: '', message: '', target_role: 'all', target_team_id: '' }); }
  };

  /* ── speakers ── */
  const findSpeakers = async () => {
    if (!spTopic.trim()) return; setSpLoading(true); setSpError(''); setSpResults([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/speakers?topic=${encodeURIComponent(spTopic)}&limit=${spLimit}&source=${spSource}`);
      if (!res.ok) throw new Error('Server error');
      setSpResults(await res.json());
    } catch { setSpError('Failed to fetch speakers. Make sure your backend is running.'); }
    setSpLoading(false);
  };

  /* ── delete conference ── */
  const handleDeleteConference = async () => {
    setSaving(true);
    await supabase.from('notifications').delete().eq('conference_id', confId);
    await supabase.from('conference_tasks').delete().eq('conference_id', confId);
    await supabase.from('team_members').delete().eq('conference_id', confId);
    await supabase.from('conference_teams').delete().eq('conference_id', confId);
    await supabase.from('paper_assignments').delete().eq('conference_id', confId);
    await supabase.from('paper_review').delete().in('paper_id', (await supabase.from('paper').select('paper_id').eq('conference_id', confId)).data?.map(p => p.paper_id) || []);
    await supabase.from('assignment').delete().eq('conference_id', confId);
    await supabase.from('paper').delete().eq('conference_id', confId);
    await supabase.from('conference_user').delete().eq('conference_id', confId);
    await supabase.from('feedback_questions').delete().in('form_id', (await supabase.from('feedback_forms').select('id').eq('conference_id', confId)).data?.map(f => f.id) || []);
    await supabase.from('feedback_forms').delete().eq('conference_id', confId);
    await supabase.from('conference').delete().eq('conference_id', confId);
    setSaving(false);
    onBack();
  };

  const handlePublish = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('conference')
      .update({ is_published: true })
      .eq('conference_id', confId);

    if (error) {
      console.error('[handlePublish] Error:', error);
      alert(`Publishing failed: ${error.message}`);
    } else {
      console.log('[handlePublish] Success! Setting localPublished to true');
      setLocalPublished(true);
      await fetchConferences(); // Refresh app state
    }
    setSaving(false);
  };

  /* ── ui helpers ── */
  const teamName = (id) => teams.find(t => t.id === id)?.name || '—';
  const assigneeName = (id) => { const m = members.find(m => m.id === id || m.user_id === id); return m ? mName(m) : '—'; };

  const filteredMembers = members.filter(m => m.role !== 'attendee' && (!memberSearch || mName(m).toLowerCase().includes(memberSearch.toLowerCase()) || m.email?.toLowerCase().includes(memberSearch.toLowerCase())));
  const attendees = members.filter(m => m.role === 'attendee');
  const filteredAttendees = attendees.filter(m => !memberSearch || mName(m).toLowerCase().includes(memberSearch.toLowerCase()) || m.email?.toLowerCase().includes(memberSearch.toLowerCase()));

  const volunteerMap = Object.fromEntries(allUsers.map(u => [u.user_id, { volunteer_roles: u.volunteer_roles || [], volunteer_domains: u.volunteer_domains || [] }]));
  const volunteersCount = allUsers.length;

  const openEditTeam = (t) => {
    setModalData(t);
    const matchedType = Object.entries(VOLUNTEER_ROLE_LABELS).find(([, label]) => label === t.name)?.[0] || 'custom';
    setTmForm({ name: t.name, type: matchedType, originalType: matchedType, description: t.description || '', color: t.color || '#f5c518', head_id: t.head_id || '' });
    setModal('editTeam');
  };
  const openEditTask = (t) => {
    setModalData(t);
    setTkForm({ title: t.title, description: t.description || '', team_id: t.team_id || '', assignee_id: t.assignee_id || '', priority: t.priority || 'medium', due_date: t.due_date || '' });
    setModal('editTask');
  };

  const nav = [
    { id: 'overview', label: 'Overview', icon: BarChart2, badge: null, permission: 'view_dashboard' },
    { id: 'papers', label: 'Papers', icon: FileText, badge: pendingCount || null, permission: 'view_papers' },
    { id: 'members', label: 'Members', icon: Users, badge: null, permission: 'view_members' },
    { id: 'attendees', label: 'Attendees', icon: Users, badge: null, permission: 'view_attendees' },
    { id: 'teams', label: 'Teams', icon: Layers, badge: pendingTeams.length || null, permission: 'view_teams' },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, badge: tasks.filter(t => t.status !== 'done').length || null, permission: 'view_tasks' },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: null, permission: 'view_notifications' },
    { id: 'emails', label: 'Emails', icon: Send, badge: null, permission: 'view_emails' },
    { id: 'email_automations', label: 'Email Automations', icon: Zap, badge: null, permission: 'manage_emails' },
    { id: 'speakers', label: 'Find Speakers', icon: Users, badge: null, permission: 'find_speakers' },
    { id: 'invitations', label: 'Invitation Tracker', icon: Clock, badge: null, permission: 'find_speakers' },
    { id: 'chat', label: 'Team Chat', icon: MessageSquare, badge: null, permission: 'view_teams' },
    { id: 'allocation', label: 'Paper Allocation', icon: FileText, badge: null, permission: 'allocate_papers' },
    { id: 'submission_rules', label: 'Submission Rules', icon: Settings2, badge: null, permission: 'manage_papers' },
    { id: 'feedback', label: 'Feedback', icon: Star, badge: null, permission: 'view_feedback' },
    { id: 'site_preview', label: 'Site Preview', icon: Sparkles, badge: null },
  ].filter(item => !item.permission || can(item.permission));

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="relative min-h-screen text-slate-200 selection:bg-amber-500/30" style={{ background: '#04070D', fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <CinematicBackground />

      <div className="w-full h-screen overflow-hidden flex relative z-10">

        {/* ── SIDEBAR ── */}
        <Sidebar nav={nav} section={section} setSection={setSection} isOrganizer={isOrganizer} roleLabel={roleLabel} />

        {/* ── MAIN CONTENT ── */}
        <main className={`flex-1 p-8 relative custom-scrollbar flex flex-col ${section === 'chat' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <div className={`flex-1 min-h-0 flex flex-col w-full ${section !== 'chat' ? 'max-w-[1400px] mx-auto' : ''}`}>

            {/* ── PUBLISH STATUS BANNER ── */}
            {console.log('[Banner Render] isGlobalHead:', isGlobalHead, 'localPublished:', localPublished, 'conf.is_published:', conf.is_published)}
            {isGlobalHead && !localPublished && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-10 p-8 rounded-[3rem] border bg-amber-500/5 border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.05)]`}
              >
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <Zap size={28} className="text-black" />
                    </div>
                    <div>
                      <h2 className={`text-2xl font-black tracking-tight mb-1 text-white`}>Conference is Hidden</h2>
                      <p className={`text-sm font-medium text-zinc-400`}>Your event is currently in draft mode. Only users with direct links can view it.</p>
                    </div>
                  </div>
                  <button
                    onClick={handlePublish}
                    disabled={saving}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase rounded-xl transition-all shadow-lg shadow-amber-500/25 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Publishing...' : 'Publish Now'}
                  </button>
                </div>
              </motion.div>
            )}

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
            {section === 'overview' && (
              <OverviewSection
                members={members} teams={teams} tasks={tasks} confPapers={confPapers}
                pendingCount={pendingCount} accepted={accepted} rejected={rejected}
                volunteersCount={volunteersCount} volunteerMap={volunteerMap}
                isGlobalHead={isGlobalHead} can={can} setSection={setSection} setModal={setModal}
                pendingTeams={teams.filter(t => t.memberList?.some(m => (m.user_id === user?.id || (myMemberId && m.conference_user_id === myMemberId)) && m.status === 'pending'))}
                onInviteResponse={handleInviteResponse}
              />
            )}

            {section === 'papers' && (
              <PapersSection
                confPapers={confPapers} paperFilter={paperFilter} setPaperFilter={setPaperFilter}
                pendingCount={pendingCount} accepted={accepted} rejected={rejected}
                loadingPapers={loadingPapers} can={can} updatePaperStatus={updatePaperStatus}
              />
            )}

            {section === 'members' && (
              <MembersSection
                filteredMembers={filteredMembers} memberSearch={memberSearch} setMemberSearch={setMemberSearch}
                members={members} volunteersCount={volunteersCount} volunteerMap={volunteerMap}
                isOrganizer={isOrganizer} can={can} loadingMembers={loadingMembers}
                setModal={setModal} setModalData={setModalData} setRatingMember={setRatingMember}
                myRatings={myRatings} globalRatings={globalRatings} updateRole={updateRole}
              />
            )}

            {section === 'attendees' && (
              <AttendeesSection
                attendees={attendees} filteredAttendees={filteredAttendees}
                memberSearch={memberSearch} setMemberSearch={setMemberSearch}
                selectedAttendees={selectedAttendees} setSelectedAttendees={setSelectedAttendees}
                updatingBulk={updatingBulk}
                handleBulkRoomUpdate={handleBulkRoomUpdate} handleSingleRoomUpdate={handleSingleRoomUpdate}
                roleLabel={roleLabel} isOrganizer={isOrganizer} loadingMembers={loadingMembers}
                setModal={setModal} setModalData={setModalData} confId={confId}
              />
            )}

            {section === 'teams' && (
              <TeamsSection
                teams={teams} members={members} isOrganizer={isOrganizer} myMemberId={myMemberId} myTeamIds={myTeamIds}
                loadingTeams={loadingTeams} setModal={setModal} setTmForm={setTmForm}
                openEditTeam={openEditTeam} deleteTeam={deleteTeam} setSection={setSection} can={can}
                setActiveChatTeamId={setActiveChatTeamId}
              />
            )}

            {section === 'tasks' && (
              <TasksSection
                tasks={tasks} isOrganizer={isOrganizer} myHeadedTeamIds={myHeadedTeamIds}
                loadingTasks={loadingTasks} setModal={setModal} setTkForm={setTkForm}
                toggleTask={toggleTask} openEditTask={openEditTask} deleteTask={deleteTask}
                teamName={teamName} assigneeName={assigneeName}
              />
            )}

            {section === 'notifications' && (
              <NotificationsSection notifs={notifs} teamName={teamName} setModal={setModal} />
            )}

            {section === 'speakers' && (
              <SpeakersSection
                conf={conf}
                spTopic={spTopic} setSpTopic={setSpTopic} spLimit={spLimit} setSpLimit={setSpLimit}
                spSource={spSource} setSpSource={setSpSource} spLoading={spLoading}
                spResults={spResults} spError={spError} findSpeakers={findSpeakers}
              />
            )}

            {section === 'invitations' && (
              <InvitationTrackerSection conference={conf} isDark={isDark} />
            )}

            {section === 'feedback' && <FeedbackManager conf={conf} />}
            {section === 'emails' && <EmailComposer conf={conf} senderRole="organizer" onOpenEmailSettings={() => setSection('emailSettings')} />}
            {section === 'email_automations' && <EmailAutomationsManager conf={conf} />}
            {section === 'emailSettings' && <EmailSettings conf={conf} />}
            {section === 'allocation' && <PaperAllocation conf={conf} />}
            {section === 'submission_rules' && <SubmissionSettingsSection conf={conf} />}

            {section === 'chat' && (
              <ChatSection
                confId={confId} teams={teams} isOrganizer={isOrganizer} myTeamIds={myTeamIds}
                activeChatTeamId={activeChatTeamId} setActiveChatTeamId={setActiveChatTeamId}
              />
            )}
          </div>
        </main>
      </div>

      {/* ══════════════════════════ MODALS ══════════════════════════ */}

      {modal === 'addMember' && (
        <AddMemberModal
          mForm={mForm} setMForm={setMForm} members={members} confId={confId} saving={saving}
          onClose={() => setModal(null)} onAddMember={handleAddMember}
        />
      )}

      {modal === 'confirmDelete' && modalData && (
        <ConfirmDeleteModal
          member={modalData}
          onClose={() => setModal(null)}
          onConfirm={removeMember}
        />
      )}

      {(modal === 'createTeam' || modal === 'editTeam') && (
        <TeamModal
          mode={modal} modalData={modalData} tmForm={tmForm} setTmForm={setTmForm}
          isOrganizer={isOrganizer} saving={saving} members={members}
          allUsers={allUsers} confId={confId} globalRatings={globalRatings}
          onClose={() => setModal(null)} onCreate={createTeam} onSave={saveTeam}
          onAddToTeam={addToTeam} onRemoveFromTeam={removeFromTeam}
          onAddVolunteer={handleAddVolunteerToConference}
        />
      )}

      {(modal === 'addTask' || modal === 'editTask') && (
        <TaskModal
          mode={modal} tkForm={tkForm} setTkForm={setTkForm}
          teams={teams} members={members} isOrganizer={isOrganizer} userId={user.id} saving={saving}
          onClose={() => setModal(null)} onCreate={createTask} onSave={saveTask}
        />
      )}

      {modal === 'notification' && (
        <NotificationModal
          nForm={nForm} setNForm={setNForm} teams={teams} saving={saving}
          onClose={() => setModal(null)} onSend={sendNotif}
        />
      )}

      {ratingMember && (
        <RateMemberModal
          member={ratingMember} confId={confId} organizerId={organizerUserId}
          existingRating={myRatings[ratingMember.user_id]}
          onSave={() => { setRatingMember(null); fetchMyRatings(organizerUserId); fetchGlobalRatings(); }}
          onClose={() => setRatingMember(null)}
        />
      )}

      {modal === 'deleteConference' && (
        <DeleteConferenceModal
          conf={conf} saving={saving}
          onClose={() => setModal(null)} onDelete={handleDeleteConference}
        />
      )}
    </div>
  );
};

export default OrganizerDashboard;