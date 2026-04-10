import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, FileText, Users, CheckSquare, Bell, Send,
  Layers, Clock, Sparkles, Star, Check, MessageSquare,
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import { mName, VOLUNTEER_ROLE_LABELS } from './Organizer/constants';

/* ── external dashboard components (unchanged) ── */
import EmailComposer from './EmailComposer';
import PaperAllocation from './PaperAllocation';
import EmailSettings from './EmailSettings';
import EmailAutomationsManager from './EmailAutomationsManager';
import FeedbackManager from './FeedbackManager';

/* ── modular sub-components ── */
import Sidebar from './Organizer/components/Sidebar';
import AmbientBackground from '../Common/AmbientBackground';
import OverviewSection from './Organizer/components/sections/OverviewSection';
import PapersSection from './Organizer/components/sections/PapersSection';
import MembersSection from './Organizer/components/sections/MembersSection';
import AttendeesSection from './Organizer/components/sections/AttendeesSection';
import TeamsSection from './Organizer/components/sections/TeamsSection';
import TasksSection from './Organizer/components/sections/TasksSection';
import NotificationsSection from './Organizer/components/sections/NotificationsSection';
import SpeakersSection from './Organizer/components/sections/SpeakersSection';
import ChatSection from './Organizer/components/sections/ChatSection';

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
  const { user, permissions, userRoles, theme } = useApp();
  const isDark = theme === 'dark';
  const confId = conf.conference_id || conf.id;

  const [section, setSection]         = useState('overview');
  const [members, setMembers]         = useState([]);
  const [loadingMembers, setLM]       = useState(true);
  const [teams, setTeams]             = useState([]);
  const [loadingTeams, setLT]         = useState(true);
  const [tasks, setTasks]             = useState([]);
  const [loadingTasks, setLTasks]     = useState(true);
  const [activeChatTeamId, setActiveChatTeamId] = useState(null);

  useEffect(() => {
    if (section === 'site_preview') { onSwitchView('home'); setSection('overview'); }
  }, [section, onSwitchView, setSection]);

  const myMember        = members.find(m => m.user_id === user?.id);
  const myMemberId      = myMember?.id;
  const isGlobalHead    = conf.conference_head_id === user?.id;
  const isOrganizer     = isGlobalHead || (userRoles && userRoles.includes('organizer'));
  const myHeadedTeamIds = teams.filter(t => t.head_id === myMemberId).map(t => t.id);
  const myTeamIds       = teams.filter(t => t.head_id === myMemberId || t.memberList?.some(tm => tm.conference_user_id === myMemberId)).map(t => t.id);
  const isTeamHead      = !isOrganizer && myHeadedTeamIds.length > 0;

  const FALLBACK_PERMS = {
    organizer: ['view_dashboard','view_emails','send_emails','view_papers','manage_papers','allocate_papers','view_members','manage_members','view_teams','manage_teams','view_tasks','manage_tasks','view_notifications','send_notifications','find_speakers','view_feedback','manage_feedback','view_attendees'],
    organizer_head: ['view_dashboard','view_emails','send_emails','view_papers','manage_papers','allocate_papers','view_members','manage_members','view_teams','manage_teams','view_tasks','manage_tasks','view_notifications','send_notifications','find_speakers','view_feedback','manage_feedback','view_attendees'],
    programming_head: ['view_dashboard','view_papers','manage_papers','allocate_papers','view_members','view_notifications'],
    logistics_head: ['view_dashboard','view_teams','manage_teams','view_tasks','manage_tasks','view_notifications','view_attendees','manage_members'],
    outreach_head: ['view_dashboard','view_emails','send_emails','find_speakers','view_members','view_notifications','send_notifications'],
    feedback_head: ['view_dashboard','view_feedback','manage_feedback','view_notifications'],
    event_head: ['view_dashboard','view_teams','view_tasks','manage_tasks','view_members','view_notifications'],
    technical_head: ['view_dashboard','view_teams','view_tasks','manage_tasks','view_notifications','view_papers','manage_papers','allocate_papers'],
    registration_head: ['view_dashboard','view_members','manage_members','view_teams','view_notifications'],
    sponsorship_head: ['view_dashboard','view_emails','send_emails','view_notifications'],
    member: ['view_dashboard','view_teams','view_tasks','view_notifications'],
  };

  const getRolePermissions = (role) => {
    if (FALLBACK_PERMS[role]) return FALLBACK_PERMS[role];
    if (role.endsWith('_head') || role.endsWith('_coord') || role.endsWith('_lead')) return ['view_dashboard','view_teams','view_tasks','manage_tasks','view_notifications','view_members'];
    return [];
  };

  const effectivePermissions = Array.from(new Set([...(permissions || []), ...(userRoles ? userRoles.flatMap(getRolePermissions) : [])]));
  const can = (p) => effectivePermissions.includes(p);

  const roleLabel = isOrganizer ? 'Organizer' : ((userRoles || []).find(r => r !== 'team_head' && (r.endsWith('_head') || r.endsWith('_coord') || r.endsWith('_lead')))?.replace(/technical_head/g, 'Reviewing Team Head')?.replace(/outreach_head/g, 'Outreach Team Head')?.replace(/logistics_head/g, 'Logistics Team Head')?.replace(/event_head/g, 'Event Management Team Head')?.replace(/organizer_head/g, 'Organizing Team Head')?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || (userRoles?.includes('team_head') || isTeamHead ? 'Team Lead' : (userRoles?.includes('reviewer') ? 'Reviewer' : 'Team Member')));

  const [notifs, setNotifs]           = useState([]);
  const [modal, setModal]             = useState(null);
  const [modalData, setModalData]     = useState(null);
  const [saving, setSaving]           = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [paperFilter, setPaperFilter] = useState('all');
  const [allVolunteers, setAllVolunteers] = useState([]);
  const [selectedAttendees, setSelectedAttendees] = useState(new Set());
  const [updatingBulk, setUpdatingBulk] = useState(false);

  const [myRatings, setMyRatings]       = useState({});
  const [globalRatings, setGlobalRatings] = useState({});
  const [ratingMember, setRatingMember] = useState(null);

  const [mForm, setMForm]   = useState({ email: '', role: 'reviewer' });
  const [tmForm, setTmForm] = useState({ name: '', type: '', description: '', color: '#f5c518', head_id: '' });
  const [tkForm, setTkForm] = useState({ title: '', description: '', team_id: '', assignee_id: '', priority: 'medium', due_date: '' });
  const [nForm, setNForm]   = useState({ title: '', message: '', target_role: 'all', target_team_id: '' });

  const [spTopic, setSpTopic]     = useState('');
  const [spLimit, setSpLimit]     = useState(10);
  const [spSource, setSpSource]   = useState(5);
  const [spLoading, setSpLoading] = useState(false);
  const [spResults, setSpResults] = useState([]);
  const [spError, setSpError]     = useState('');

  const [confPapers, setConfPapers] = useState([]);
  const [loadingPapers, setLP]      = useState(true);

  const pendingCount = confPapers.filter(p => p.status === 'pending').length;
  const accepted     = confPapers.filter(p => p.status === 'accepted').length;
  const rejected     = confPapers.filter(p => p.status === 'rejected').length;

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

  const fetchAllVolunteers = useCallback(async () => {
    const { data, error } = await supabase.from('users').select('user_id, user_name, user_email, volunteer_roles, volunteer_domains');
    if (error) { console.error(error); return; }
    setAllVolunteers((data || []).filter(u => Array.isArray(u.volunteer_roles) && u.volunteer_roles.length > 0));
  }, []);

   const fetchPapers = useCallback(async () => {
    setLP(true);
    const { data, error } = await supabase.from('paper').select('paper_id,paper_title,abstract,keywords,research_area,status,file_url,author_id,users(user_name,user_email),paper_assignments(status)').eq('conference_id', confId).order('paper_id', { ascending: false });
    if (error) console.error(error);
    
    // Previously removed deduplication by title to show all actual submissions
    setConfPapers(data || []); 
    setLP(false);
    
    const syncConsensus = async () => {
      let changed = false;
      const updated = (data || []).map(p => {
        const assignments = p.paper_assignments || [];
        if (assignments.length > 0) {
          const total = assignments.length, 
                acc = assignments.filter(a => a.status === 'accepted').length, 
                pen = assignments.filter(a => a.status === 'pending').length;
          
          let consensus = 'pending';
          if (total > 0) { 
            const t = 0.66; 
            if ((acc / total) >= t) consensus = 'accepted'; 
            else if (((acc + pen) / total) < t) consensus = 'rejected'; 
          }
          
          // Re-evaluation: If status is accepted/rejected but consensus is pending (due to re-allocation), update it.
          // This allows Re-allocation to override previous manual or logic-based results.
          if (p.status !== consensus) { 
            supabase.from('paper').upsert({ paper_id: p.paper_id, status: consensus, conference_id: confId }, { onConflict: 'paper_id' }).then(); 
            changed = true; 
            return { ...p, status: consensus }; 
          }
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
    
    setConfPapers(prev => {
      const updated = prev.map(p => p.paper_id === paperId ? { ...p, status: newStatus } : p);
      
      // Execute Email Automation hook
      const targetPaper = updated.find(p => p.paper_id === paperId);
      if (targetPaper && (newStatus === 'accepted' || newStatus === 'rejected') && targetPaper.users?.user_email) {
        const triggerType = newStatus === 'accepted' ? 'on_paper_accepted' : 'on_paper_rejected';
        supabase.from('conference_automations')
          .select('*')
          .eq('conference_id', confId)
          .eq('trigger_type', triggerType)
          .eq('is_active', true)
          .then(({ data: autos }) => {
            if (autos && autos.length > 0) {
              for (const auto of autos) {
                const personalizedBody = auto.body
                  .replace(/{AuthorName}/g, targetPaper.users.user_name || 'Author')
                  .replace(/{PaperTitle}/g, targetPaper.paper_title || 'Untitled Paper');
                
                fetch('http://localhost:4000/api/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: [targetPaper.users.user_email],
                    subject: auto.subject,
                    body: personalizedBody,
                    senderRole: 'organizer',
                    conferenceId: confId
                  })
                }).catch(e => console.error(`Automation ${triggerType} failed:`, e));
              }
            }
          });
      }
      return updated;
    });
  };

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
    fetchMembers(); fetchAllVolunteers(); fetchTeams(); fetchTasks(); fetchNotifs(); fetchPapers(); fetchGlobalRatings();
  }, [fetchMembers, fetchAllVolunteers, fetchTeams, fetchTasks, fetchNotifs, fetchPapers, fetchGlobalRatings]);

  // Refresh data when section changes to ensure consistency
  useEffect(() => {
    if (section === 'papers' || section === 'allocation') fetchPapers();
    if (section === 'teams') fetchTeams();
    if (section === 'tasks') fetchTasks();
  }, [section, fetchPapers, fetchTeams, fetchTasks]);

  /* ── member CRUD ── */
  const updateRole = async (id, role) => {
    const { error } = await supabase.from('conference_user').update({ role }).eq('id', id);
    if (error) { alert(error.message); return; }
    setMembers(ms => ms.map(m => m.id === id ? { ...m, role } : m));
  };
  const removeMember = async (id) => { await supabase.from('conference_user').delete().eq('id', id); fetchMembers(); fetchTeams(); };

  const handleAddMember = async (user, role) => {
    const already = members.find(m => m.user_id === user.user_id);
    if (already) { alert('Already a member.'); return; }
    setSaving(true);
    const { error } = await supabase.from('conference_user').insert([{ conference_id: confId, user_id: user.user_id, email: user.user_email || '', full_name: user.user_name || '', role, joined_at: new Date().toISOString() }]);
    setSaving(false);
    if (error) { alert(error.message); return; }
    setModal(null); setMForm({ email: '', role: 'reviewer' }); fetchMembers(); fetchAllVolunteers();
  };

  /* ── team CRUD ── */
   const createTeam = async (initialAdds = []) => {
    if (!tmForm.name.trim()) return; setSaving(true);
    const { data: newTeam, error } = await supabase.from('conference_teams').insert([{ conference_id: confId, name: tmForm.name.trim(), description: tmForm.description.trim(), color: tmForm.color, head_id: tmForm.head_id || null, created_at: new Date().toISOString() }]).select().single();
    
    if (!error && newTeam) {
      if (tmForm.head_id && tmForm.type && tmForm.type !== 'custom') {
        await supabase.from('conference_user_roles_mapping').upsert({ conference_user_id: tmForm.head_id, role_name: tmForm.type }, { onConflict: 'conference_user_id,role_name' });
      }
      
      if (initialAdds.length > 0) {
        const toAdd = initialAdds.map(confUserId => {
          const m = members.find(mem => mem.id === confUserId);
          return { conference_id: confId, team_id: newTeam.id, user_id: m.user_id, conference_user_id: confUserId };
        });
        await supabase.from('team_members').insert(toAdd);
      }
      
      setModal(null); setTmForm({ name: '', type: '', description: '', color: '#f5c518', head_id: '' }); fetchTeams();
    } else if (error) {
      alert(error.message);
    }
    setSaving(false);
  };

  const saveTeam = async (adds = [], removes = []) => {
    if (!tmForm.name.trim()) return; setSaving(true);
    const teamId = modalData.id;
    const { error } = await supabase.from('conference_teams').update({ name: tmForm.name.trim(), description: tmForm.description.trim(), color: tmForm.color, head_id: tmForm.head_id || null }).eq('id', teamId);
    
    if (!error) {
      // Handle Role Mapping for Team Head
      if (tmForm.head_id) {
        if (tmForm.type !== tmForm.originalType && tmForm.originalType && tmForm.originalType !== 'custom') { await supabase.from('conference_user_roles_mapping').delete().eq('conference_user_id', tmForm.head_id).eq('role_name', tmForm.originalType); }
        if (tmForm.type && tmForm.type !== 'custom') { await supabase.from('conference_user_roles_mapping').upsert({ conference_user_id: tmForm.head_id, role_name: tmForm.type }, { onConflict: 'conference_user_id,role_name' }); }
      }
      
      // Handle Member Sync
      if (removes.length > 0) {
        await supabase.from('team_members').delete().eq('team_id', teamId).in('conference_user_id', removes);
      }
      if (adds.length > 0) {
        const toAdd = adds.map(confUserId => {
          const m = members.find(mem => mem.id === confUserId);
          return { conference_id: confId, team_id: teamId, user_id: m.user_id, conference_user_id: confUserId };
        });
        await supabase.from('team_members').insert(toAdd);
      }
      
      setModal(null); fetchTeams();
    } else {
      alert(error.message);
    }
    setSaving(false);
  };

  const deleteTeam = async (id) => { await supabase.from('team_members').delete().eq('team_id', id); await supabase.from('conference_teams').delete().eq('id', id); fetchTeams(); fetchTasks(); };

   const handleTeamMemberSync = async (teamId, adds, removes) => {
    setSaving(true);
    try {
      if (removes.length > 0) {
        await supabase.from('team_members').delete().eq('team_id', teamId).in('conference_user_id', removes);
      }
      if (adds.length > 0) {
        const toAdd = adds.map(confUserId => {
          const m = members.find(mem => mem.id === confUserId);
          return { conference_id: confId, team_id: teamId, user_id: m.user_id, conference_user_id: confUserId };
        });
        await supabase.from('team_members').insert(toAdd);
      }
      fetchTeams();
    } catch (err) {
      alert(`Sync error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const addToTeam = async (teamId, confUserId) => {
    const member = members.find(m => m.id === confUserId);
    if (!member) return;
    const team = teams.find(t => t.id === teamId);
    if (team?.memberList.some(tm => tm.conference_user_id === confUserId)) { alert('Already in team.'); return; }
    setSaving(true);
    const { error } = await supabase.from('team_members').insert([{ conference_id: confId, team_id: teamId, user_id: member.user_id, conference_user_id: confUserId }]);
    setSaving(false);
    if (error) alert(`Add error: ${error.message}`); else fetchTeams();
  };

  const removeFromTeam = async (teamId, confUserId) => {
    setSaving(true);
    const { error } = await supabase.from('team_members').delete().eq('team_id', teamId).eq('conference_user_id', confUserId);
    setSaving(false);
    if (error) alert(`Remove error: ${error.message}`); else fetchTeams();
  };

  const handleAddVolunteerToConference = async (v) => {
    setSaving(true);
    const { data, error } = await supabase.from('conference_user').insert([{ conference_id: confId, user_id: v.user_id, email: v.user_email || '', full_name: v.user_name || '', role: 'member', joined_at: new Date().toISOString() }]).select().single();
    setSaving(false);
    if (error) { alert(error.message); return null; }
    fetchMembers(); return data.id;
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
      const res = await fetch(`http://localhost:4000/api/speakers?topic=${encodeURIComponent(spTopic)}&limit=${spLimit}&source=${spSource}`);
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

  /* ── ui helpers ── */
  const teamName     = (id) => teams.find(t => t.id === id)?.name || '—';
  const assigneeName = (id) => { const m = members.find(m => m.id === id || m.user_id === id); return m ? mName(m) : '—'; };

  const filteredMembers = members.filter(m => m.role !== 'attendee' && (!memberSearch || mName(m).toLowerCase().includes(memberSearch.toLowerCase()) || m.email?.toLowerCase().includes(memberSearch.toLowerCase())));
  const attendees         = members.filter(m => m.role === 'attendee');
  const filteredAttendees = attendees.filter(m => !memberSearch || mName(m).toLowerCase().includes(memberSearch.toLowerCase()) || m.email?.toLowerCase().includes(memberSearch.toLowerCase()));

  const volunteerMap    = Object.fromEntries(allVolunteers.map(u => [u.user_id, { volunteer_roles: u.volunteer_roles || [], volunteer_domains: u.volunteer_domains || [] }]));
  const volunteersCount = allVolunteers.length;

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
    { id: 'overview',      label: 'Overview',        icon: BarChart2,   badge: null,                                      permission: 'view_dashboard' },
    { id: 'papers',        label: 'Papers',           icon: FileText,    badge: pendingCount || null,                      permission: 'view_papers' },
    { id: 'members',       label: 'Members',          icon: Users,       badge: null,                                      permission: 'view_members' },
    { id: 'attendees',     label: 'Attendees',        icon: Users,       badge: null,                                      permission: 'view_attendees' },
    { id: 'teams',         label: 'Teams',            icon: Layers,      badge: null,                                      permission: 'view_teams' },
    { id: 'tasks',         label: 'Tasks',            icon: CheckSquare, badge: tasks.filter(t => t.status !== 'done').length || null, permission: 'view_tasks' },
    { id: 'notifications', label: 'Notifications',    icon: Bell,        badge: null,                                      permission: 'view_notifications' },
    { id: 'emails',        label: 'Emails',           icon: Send,        badge: null,                                      permission: 'view_emails' },
    { id: 'welcome_email', label: 'Automations',      icon: Sparkles,    badge: null,                                      permission: 'view_emails' },
    { id: 'speakers',      label: 'Find Speakers',    icon: Users,       badge: null,                                      permission: 'find_speakers' },
    { id: 'allocation',    label: 'Paper Allocation', icon: FileText,    badge: null,                                      permission: 'allocate_papers' },
    { id: 'feedback',      label: 'Feedback',         icon: Star,        badge: null,                                      permission: 'view_feedback' },
    { id: 'chat',          label: 'Leader Chat',      icon: MessageSquare, badge: null },
    { id: 'site_preview',  label: 'Site Preview',     icon: Sparkles,    badge: null },
  ].filter(item => !item.permission || can(item.permission));

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className={`relative min-h-screen transition-colors duration-500 selection:bg-amber-500/30 ${isDark ? 'text-slate-200' : 'text-zinc-800'}`} style={{ fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <AmbientBackground />

      <div className="w-full flex relative z-10">

        {/* ── SIDEBAR ── */}
        <Sidebar nav={nav} section={section} setSection={setSection} isOrganizer={isOrganizer} roleLabel={roleLabel} />

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 p-8 relative min-h-screen">

          {section === 'overview' && (
            <OverviewSection
              members={members} teams={teams} tasks={tasks} confPapers={confPapers}
              pendingCount={pendingCount} accepted={accepted} rejected={rejected}
              volunteersCount={volunteersCount} volunteerMap={volunteerMap}
              isGlobalHead={isGlobalHead} can={can} setSection={setSection} setModal={setModal}
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
              teams={teams} members={members} isOrganizer={isOrganizer} myMemberId={myMemberId}
              myTeamIds={myTeamIds}
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
              spTopic={spTopic} setSpTopic={setSpTopic} spLimit={spLimit} setSpLimit={setSpLimit}
              spSource={spSource} setSpSource={setSpSource} spLoading={spLoading}
              spResults={spResults} spError={spError} findSpeakers={findSpeakers}
            />
          )}

          {section === 'chat' && (
            <ChatSection
              confId={confId} teams={teams} isOrganizer={isOrganizer} myTeamIds={myTeamIds}
              activeChatTeamId={activeChatTeamId} setActiveChatTeamId={setActiveChatTeamId}
              showLeaderHub={true}
            />
          )}

          {section === 'feedback'      && <FeedbackManager conf={conf} />}
          {section === 'emails'        && <EmailComposer conf={conf} senderRole="organizer" onOpenEmailSettings={() => setSection('emailSettings')} />}
          {section === 'emailSettings' && <EmailSettings conf={conf} />}
          {section === 'welcome_email' && <EmailAutomationsManager conf={conf} />}
          {section === 'allocation'    && <PaperAllocation conf={conf} onRefresh={fetchPapers} />}

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
          allVolunteers={allVolunteers} confId={confId} globalRatings={globalRatings}
          onClose={() => setModal(null)} onCreate={createTeam} onSave={saveTeam}
          onAddToTeam={addToTeam} onRemoveFromTeam={removeFromTeam}
          onSyncTeamMembers={handleTeamMemberSync}
          onAddVolunteer={handleAddVolunteerToConference}
        />
      )}

      {(modal === 'addTask' || modal === 'editTask') && (
        <TaskModal
          mode={modal} tkForm={tkForm} setTkForm={setTkForm}
          teams={teams} members={members} isOrganizer={isOrganizer} myMemberId={myMemberId} saving={saving}
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