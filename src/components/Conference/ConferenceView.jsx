<<<<<<< Updated upstream
import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
=======
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Share2, Check, LogIn, Star } from 'lucide-react';
>>>>>>> Stashed changes
import ModernTemplate from './Templates/ModernTemplate';
import ClassicTemplate from './Templates/ClassicTemplate';
import RoleBasedDashboard from '../Dashboard/RoleBasedDashboard';
import PaperSubmission from './Templates/PaperSubmission';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

<<<<<<< Updated upstream
const ConferenceView = ({ conf, role: propRole, onBack }) => {
=======
const ROLE_LABELS = {
  organizer: 'Organizer',
  logistics_head: 'Logistics Team Lead',
  outreach_head: 'Outreach Team Lead',
  technical_head: 'Reviewing Team Head',
  registration_head: 'Registration Team Head',
  sponsorship_head: 'Sponsorship Team Head',
  hospitality_head: 'Hospitality Team Lead',
  publication_head: 'Publications Team Lead',
  finance_head: 'Finance Team Lead',
  program_coord: 'Program Coordinator',
  social_coord: 'Social Media Coordinator',
  volunteer_coord: 'Volunteer Coordinator',
  design_lead: 'Design Lead',
  web_lead: 'Website Lead',
  security_coord: 'Security Coordinator',
  member: 'Team Member',
  reviewer: 'Reviewer',
  presenter: 'Presenter',
};

const buildShareURL = (confId) => {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('conf', confId);
  return url.toString();
};

// Intents that are NOT tab names — they trigger side-effects on the home view
const MODAL_INTENTS = ['register'];

// Map an initialViewMode to the correct tab name
const resolveTabFromIntent = (intent) => {
  if (MODAL_INTENTS.includes(intent)) return 'home';
  return intent || 'home';
};

const ConferenceView = ({
  conf,
  role: propRole,
  onBack,
  isGuest = false,
  initialViewMode = 'home',
  onRequireAuth = null,
  onPendingConsumed = null,
}) => {
>>>>>>> Stashed changes
  const { user } = useApp();
  const [viewMode, setViewMode] = useState('home');
  const [resolvedRole, setResolvedRole] = useState(propRole || null);

  const confId = conf?.conference_id ?? conf?.id;
  const displayTitle = conf.title ?? conf.name ?? 'Untitled Conference';

  useEffect(() => {
<<<<<<< Updated upstream
    if (!user || !confId) return;

    if (conf?.conference_head_id === user.id) {
      setResolvedRole('organizer');
      return;
    }
=======
    if (onPendingConsumed) onPendingConsumed();
  }, [onPendingConsumed]);
>>>>>>> Stashed changes

    supabase
      .from('conference_user')
      .select('role')
      .eq('conference_id', confId)
      .eq('user_id', user.id)
      .maybeSingle()
<<<<<<< Updated upstream
      .then(({ data }) => {
        setResolvedRole(data?.role || null);
      });
  }, [user, confId]);

  const hasRole = !!resolvedRole;
  const isOrganizer = resolvedRole === 'organizer';
=======
      .then(({ data }) => setResolvedRole(data?.role || null));
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

  /* ── Check team leader ── */
  const checkTeamLeader = useCallback(async () => {
    if (!user || !confId || isGuest) return;
    const { data: cuData } = await supabase
      .from('conference_user').select('id')
      .eq('conference_id', confId).eq('user_id', user.id).maybeSingle();
    if (!cuData) return;
    const { data: teamData } = await supabase
      .from('conference_teams').select('id, name')
      .eq('conference_id', confId).eq('head_id', cuData.id);
    if (teamData?.length > 0) {
      setIsTeamLeader(true);
      setTeamLeaderPosition(teamData[0].name.includes('Head') ? teamData[0].name : `${teamData[0].name} Lead`);
    }
  }, [user, confId, isGuest]);

  useEffect(() => { fetchMembers(); checkTeamLeader(); }, [fetchMembers, checkTeamLeader]);

  const hasRole = !!resolvedRole;
  const isOrganizer = resolvedRole === 'organizer';
  const canEditSchedule = isOrganizer || isTeamLeader;

  const editorName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Unknown';
  const editorPosition = isOrganizer ? 'Organizer'
    : isTeamLeader ? teamLeaderPosition
      : (ROLE_LABELS[resolvedRole] || resolvedRole || 'Member');

  const handleShare = async () => {
    const url = buildShareURL(confId);
    try { await navigator.clipboard.writeText(url); } catch {
      const el = document.createElement('textarea');
      el.value = url; document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTabClick = (mode) => {
    if (isGuest && (mode === 'submitPaper' || mode === 'dashboard')) {
      if (onRequireAuth) onRequireAuth(mode);
      return;
    }
    setViewMode(mode);
  };

  const handleRequireAuthForRegister = () => {
    if (onRequireAuth) onRequireAuth('register');
  };
>>>>>>> Stashed changes

  // Save handler lives here — keeps templates free of direct Supabase imports
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
        schedule: pageData.schedule,
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

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#0f1117] text-slate-200">
      <nav className="bg-[#0f1117]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
<<<<<<< Updated upstream
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
=======
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
          <div className="flex items-center gap-3">
            <span className="font-bold text-white truncate max-w-xs tracking-wide">{displayTitle}</span>
            {(isOrganizer || isTeamLeader) && (
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${isOrganizer ? 'text-violet-300 bg-violet-500/10 border-violet-500/20' : 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20'
                }`}>
                <Star size={11} className="fill-current" />
                {editorPosition}
              </div>
            )}
          </div>

          {!isGuest && (
            <button
              onClick={handleShare}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${copied
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
            >
              {copied ? <Check size={12} /> : <Share2 size={12} />}
              {copied ? 'Link copied!' : 'Share'}
            </button>
          )}
>>>>>>> Stashed changes
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
            ? <ClassicTemplate conf={conf} isOrganizer={isOrganizer} onSave={handleSave} />
            : <ModernTemplate conf={conf} isOrganizer={isOrganizer} onSave={handleSave} />
        ) : viewMode === 'dashboard' ? (
<<<<<<< Updated upstream
          <RoleBasedDashboard conf={conf} role={resolvedRole} onBack={onBack} />
        ) : (
=======
          <RoleBasedDashboard conf={conf} role={resolvedRole} onBack={onBack} onSwitchView={handleTabClick} />
        ) : viewMode === 'submitPaper' ? (
>>>>>>> Stashed changes
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