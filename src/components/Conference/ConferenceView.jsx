import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Share2, Check, LogIn } from 'lucide-react';
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

/* ─── Build the shareable public URL for a conference ─── */
const buildShareURL = (confId) => {
  const url = new URL(window.location.href);
  url.search = '';           // wipe existing params
  url.searchParams.set('conf', confId);
  return url.toString();
};

const ConferenceView = ({
  conf,
  role: propRole,
  onBack,
  // New props for public/guest access
  isGuest = false,
  initialViewMode = 'home',
  onRequireAuth = null,       // (intent: string) => void  — called when guest needs auth
  onPendingConsumed = null,   // () => void — called once we've used the pending state
}) => {
  const { user } = useApp();
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [resolvedRole, setResolvedRole] = useState(propRole || null);
  const [members, setMembers] = useState([]);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [teamLeaderPosition, setTeamLeaderPosition] = useState('');
  const [liveSchedule, setLiveSchedule] = useState(conf?.schedule || []);

  // Share button state
  const [copied, setCopied] = useState(false);

  const confId = conf?.conference_id ?? conf?.id;
  const displayTitle = conf.title ?? conf.name ?? 'Untitled Conference';

  // Notify parent that the pending intent has been consumed (so it can clearPending)
  useEffect(() => {
    if (onPendingConsumed) onPendingConsumed();
  }, []);

  /* ── Resolve role (skip if guest) ── */
  useEffect(() => {
    if (!user || !confId || isGuest) return;

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
  }, [user, confId, isGuest]);

  /* ── Fetch members ── */
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
    if (!user || !confId || isGuest) return;

    const { data: cuData } = await supabase
      .from('conference_user')
      .select('id')
      .eq('conference_id', confId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!cuData) return;

    const { data: teamData } = await supabase
      .from('conference_teams')
      .select('id, name')
      .eq('conference_id', confId)
      .eq('head_id', cuData.id);

    if (teamData && teamData.length > 0) {
      setIsTeamLeader(true);
      setTeamLeaderPosition(`${teamData[0].name} Lead`);
    }
  }, [user, confId, isGuest]);

  useEffect(() => {
    fetchMembers();
    checkTeamLeader();
  }, [fetchMembers, checkTeamLeader]);

  const hasRole = !!resolvedRole;
  const isOrganizer = resolvedRole === 'organizer';
  const canEditSchedule = isOrganizer || isTeamLeader;

  const editorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown';
  const editorPosition = isOrganizer
    ? 'Organizer'
    : isTeamLeader
      ? teamLeaderPosition
      : (ROLE_LABELS[resolvedRole] || resolvedRole || 'Member');

  /* ── Share button handler ── */
  const handleShare = async () => {
    const url = buildShareURL(confId);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  /* ── Tab click: gate "Submit Paper" for guests ── */
  const handleTabClick = (mode) => {
    if (mode === 'submitPaper' && isGuest) {
      // Guest wants to submit — require auth, pass intent
      if (onRequireAuth) onRequireAuth('submitPaper');
      return;
    }
    if (mode === 'dashboard' && isGuest) {
      if (onRequireAuth) onRequireAuth('dashboard');
      return;
    }
    setViewMode(mode);
  };

  // Save handler for page editing
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

  const handleScheduleSave = async (newSchedule) => {
    const { error } = await supabase
      .from('conference')
      .update({ schedule: newSchedule })
      .eq('conference_id', confId);

    if (error) throw new Error(error.message);

    setLiveSchedule(newSchedule);

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
          {/* Back button: hide for guests (they came from outside, not the hub) */}
          {!isGuest && (
            <>
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
            </>
          )}
          <span className="font-bold text-white truncate max-w-xs tracking-wide">
            {displayTitle}
          </span>

          {/* Share button — visible to organizers and team members */}
          {!isGuest && (
            <button
              onClick={handleShare}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                copied
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
              }`}
              title="Copy shareable link"
            >
              {copied ? <Check size={12} /> : <Share2 size={12} />}
              {copied ? 'Link copied!' : 'Share'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Guest login nudge */}
          {isGuest && (
            <button
              onClick={() => onRequireAuth && onRequireAuth('home')}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all"
            >
              <LogIn size={13} />
              Sign in
            </button>
          )}

          <div className="flex bg-black/40 p-1.5 rounded-full border border-white/5">
            <NavTab
              active={viewMode === 'home'}
              onClick={() => handleTabClick('home')}
              activeClass="bg-white text-black shadow-lg"
            >
              Site Preview
            </NavTab>

            {/* Dashboard tab: only for authenticated members */}
            {hasRole && !isGuest && (
              <NavTab
                active={viewMode === 'dashboard'}
                onClick={() => handleTabClick('dashboard')}
                activeClass="bg-indigo-600 text-white shadow-lg shadow-indigo-500/40"
              >
                Dashboard
              </NavTab>
            )}

            {/* Submit Paper: show for everyone, gate guests at click-time */}
            <NavTab
              active={viewMode === 'submitPaper'}
              onClick={() => handleTabClick('submitPaper')}
              activeClass="bg-green-600 text-white shadow-lg shadow-green-500/40"
            >
              Submit Paper
              {isGuest && (
                <span className="ml-1.5 text-[9px] opacity-60 font-normal normal-case tracking-normal">
                  (login)
                </span>
              )}
            </NavTab>
          </div>
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
          // PaperSubmission only rendered when authenticated (guests are redirected before reaching here)
          <PaperSubmission conf={conf} />
        )}
      </div>
    </div>
  );
};

const NavTab = ({ active, onClick, activeClass, children }) => (
  <button
    onClick={onClick}
    className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
      active ? activeClass : 'text-slate-500 hover:text-slate-300'
    }`}
  >
    {children}
  </button>
);

export default ConferenceView;