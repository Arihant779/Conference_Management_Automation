import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import ModernTemplate from './Templates/ModernTemplate';
import ClassicTemplate from './Templates/ClassicTemplate';
import RoleBasedDashboard from '../Dashboard/RoleBasedDashboard';
import PaperSubmission from './Templates/PaperSubmission';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

/* ─── Role labels for notification messages ─── */
const ROLE_LABELS = {
  organizer: 'Organizer',
  logistics_head: 'Logistics Team Lead',
  outreach_head: 'Outreach Team Lead',
  technical_head: 'Technical Team Lead',
  registration_head: 'Registration Team Lead',
  sponsorship_head: 'Sponsorship Team Lead',
  hospitality_head: 'Hospitality Team Lead',
  publication_head: 'Publications Team Lead',
  finance_head: 'Finance Team Lead',
  program_coord: 'Program Coordinator',
  social_coord: 'Social Media Coordinator',
  volunteer_coord: 'Volunteer Coordinator',
  design_lead: 'Design Lead',
  web_lead: 'Website Lead',
  security_coord: 'Security Coordinator',
  member: 'Member',
  reviewer: 'Reviewer',
  presenter: 'Presenter',
};

const ConferenceView = ({ conf, role: propRole, onBack }) => {
  const { user } = useApp();
  const [viewMode, setViewMode] = useState('home');
  const [resolvedRole, setResolvedRole] = useState(propRole || null);
  const [members, setMembers] = useState([]);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [teamLeaderPosition, setTeamLeaderPosition] = useState('');
  const [liveSchedule, setLiveSchedule] = useState(conf?.schedule || []);

  const confId = conf?.conference_id ?? conf?.id;
  const displayTitle = conf.title ?? conf.name ?? 'Untitled Conference';

  /* ── Resolve role ── */
  useEffect(() => {
    if (!user || !confId) return;

    if (conf?.conference_head_id === user.id) {
      setResolvedRole('organizer');
      return;
    }

    supabase
      .from('conference_user')
      .select('role')
      .eq('conference_id', confId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setResolvedRole(data?.role || null);
      });
  }, [user, confId]);

  /* ── Fetch members (for session head dropdown) ── */
  const fetchMembers = useCallback(async () => {
    if (!confId) return;
    const { data } = await supabase
      .from('conference_user')
      .select('id, user_id, role, email, full_name, users(user_name, user_email)')
      .eq('conference_id', confId);

    const enriched = (data || []).map(m => ({
      ...m,
      email: m.email || m.users?.user_email || '',
      full_name: m.full_name || m.users?.user_name || '',
    }));
    setMembers(enriched);
  }, [confId]);

  /* ── Check if user is a team leader ── */
  const checkTeamLeader = useCallback(async () => {
    if (!user || !confId) return;

    // Find the user's conference_user id
    const { data: cuData } = await supabase
      .from('conference_user')
      .select('id')
      .eq('conference_id', confId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!cuData) return;

    // Check if they are head of any team
    const { data: teamData } = await supabase
      .from('conference_teams')
      .select('id, name')
      .eq('conference_id', confId)
      .eq('head_id', cuData.id);

    if (teamData && teamData.length > 0) {
      setIsTeamLeader(true);
      setTeamLeaderPosition(`${teamData[0].name} Lead`);
    }
  }, [user, confId]);

  useEffect(() => {
    fetchMembers();
    checkTeamLeader();
  }, [fetchMembers, checkTeamLeader]);

  const hasRole = !!resolvedRole;
  const isOrganizer = resolvedRole === 'organizer';
  const canEditSchedule = isOrganizer || isTeamLeader;

  /* ── Get editor's display name and position ── */
  const editorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown';
  const editorPosition = isOrganizer
    ? 'Organizer'
    : isTeamLeader
      ? teamLeaderPosition
      : (ROLE_LABELS[resolvedRole] || resolvedRole || 'Member');

  // Save handler for page editing (everything except schedule)
  const handleSave = async (pageData) => {
    const { error } = await supabase
      .from('conference')
      .update({
        tagline: pageData.tagline,
        description: pageData.description,
        contact_email: pageData.contact_email,
        contact_phone: pageData.contact_phone,
        website: pageData.website,
        twitter: pageData.twitter,
        linkedin: pageData.linkedin,
        speakers: pageData.speakers,
        sponsors: pageData.sponsors,
        important_dates: pageData.important_dates,
        venue_name: pageData.venue_name,
        venue_address: pageData.venue_address,
        venue_description: pageData.venue_description,
        capacity: pageData.capacity,
        registration_fee_general: pageData.registration_fee_general,
        registration_fee_student: pageData.registration_fee_student,
        registration_fee_early: pageData.registration_fee_early,
        about_extra: pageData.about_extra,
      })
      .eq('conference_id', confId);

    if (error) throw new Error(error.message);
  };

  /* ── Schedule-specific save handler with notification ── */
  const handleScheduleSave = async (newSchedule) => {
    const { error } = await supabase
      .from('conference')
      .update({ schedule: newSchedule })
      .eq('conference_id', confId);

    if (error) throw new Error(error.message);

    // Update local state so the template re-renders
    setLiveSchedule(newSchedule);

    // Send notification to all members and organizers
    await supabase.from('notifications').insert([{
      conference_id: confId,
      title: 'Schedule Updated',
      message: `Schedule is updated by ${editorPosition} - ${editorName}`,
      target_role: null,
      created_at: new Date().toISOString(),
    }]);
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#0f1117] text-slate-200">
      <nav className="bg-[#0f1117]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="group flex items-center gap-3 text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 border border-white/5">
              <ArrowRight className="rotate-180" size={14} />
            </div>
            Back to Hub
          </button>
          <div className="h-6 w-px bg-white/10" />
          <span className="font-bold text-white truncate max-w-xs tracking-wide">
            {displayTitle}
          </span>
        </div>

        <div className="flex bg-black/40 p-1.5 rounded-full border border-white/5">
          <NavTab
            active={viewMode === 'home'}
            onClick={() => setViewMode('home')}
            activeClass="bg-white text-black shadow-lg"
          >
            Site Preview
          </NavTab>

          {hasRole && (
            <NavTab
              active={viewMode === 'dashboard'}
              onClick={() => setViewMode('dashboard')}
              activeClass="bg-indigo-600 text-white shadow-lg shadow-indigo-500/40"
            >
              Dashboard
            </NavTab>
          )}

          <NavTab
            active={viewMode === 'submitPaper'}
            onClick={() => setViewMode('submitPaper')}
            activeClass="bg-green-600 text-white shadow-lg shadow-green-500/40"
          >
            Submit Paper
          </NavTab>
        </div>
      </nav>

      <div className="flex-1 bg-black overflow-y-auto relative">
        {viewMode === 'home' ? (
          conf.template === 'classic'
            ? <ClassicTemplate
              conf={{ ...conf, schedule: liveSchedule }}
              isOrganizer={isOrganizer}
              onSave={handleSave}
              canEditSchedule={canEditSchedule}
              currentUserId={user?.id}
              members={members}
              onScheduleSave={handleScheduleSave}
            />
            : <ModernTemplate
              conf={{ ...conf, schedule: liveSchedule }}
              isOrganizer={isOrganizer}
              onSave={handleSave}
              canEditSchedule={canEditSchedule}
              currentUserId={user?.id}
              members={members}
              onScheduleSave={handleScheduleSave}
            />
        ) : viewMode === 'dashboard' ? (
          <RoleBasedDashboard conf={conf} role={resolvedRole} onBack={onBack} />
        ) : (
          <PaperSubmission conf={conf} />
        )}
      </div>
    </div>
  );
};

const NavTab = ({ active, onClick, activeClass, children }) => (
  <button
    onClick={onClick}
    className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${active ? activeClass : 'text-slate-500 hover:text-slate-300'
      }`}
  >
    {children}
  </button>
);

export default ConferenceView;