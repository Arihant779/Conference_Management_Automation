import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRight, Share2, Check, LogIn, Star } from 'lucide-react';
import ModernTemplate from './Templates/ModernTemplate';
import ClassicTemplate from './Templates/ClassicTemplate';
import RoleBasedDashboard from '../Dashboard/RoleBasedDashboard';
import PaperSubmission from './Templates/PaperSubmission';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

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
  const { user } = useApp();

  // 'register' is not a tab — resolve it to 'home' so we never fall into the
  // PaperSubmission branch by accident
  const [viewMode, setViewMode] = useState(resolveTabFromIntent(initialViewMode));

  // True only when the user just came back from login specifically to register
  const autoOpenRegister = initialViewMode === 'register' && !isGuest;

  const [resolvedRole, setResolvedRole] = useState(propRole || null);
  const [members, setMembers] = useState([]);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [teamLeaderPosition, setTeamLeaderPosition] = useState('');
  const [liveSchedule, setLiveSchedule] = useState(conf?.schedule || []);
  const [copied, setCopied] = useState(false);

  const confId = conf?.conference_id ?? conf?.id;
  const displayTitle = conf.title ?? conf.name ?? 'Untitled Conference';

  useEffect(() => {
    if (onPendingConsumed) onPendingConsumed();
  }, [onPendingConsumed]);

  /* ── Resolve role ── */
  useEffect(() => {
    if (!user || !confId || isGuest) return;
    if (conf?.conference_head_id === user.id) { setResolvedRole('organizer'); return; }
    supabase
      .from('conference_user')
      .select('role')
      .eq('conference_id', confId)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const role = data?.role || null;
        setResolvedRole(role);
        // If the user is specifically 'invited', take them straight to the dashboard 
        // to see the invitation banner, instead of showing the site preview first.
        if (role === 'invited' && viewMode === 'home') {
          setViewMode('dashboard');
        }
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

  const handleSave = async (pageData) => {
    const { error } = await supabase.from('conference').update({
      tagline: pageData.tagline, description: pageData.description,
      contact_email: pageData.contact_email, contact_phone: pageData.contact_phone,
      website: pageData.website, twitter: pageData.twitter, linkedin: pageData.linkedin,
      speakers: pageData.speakers, sponsors: pageData.sponsors,
      important_dates: pageData.important_dates, venue_name: pageData.venue_name,
      venue_address: pageData.venue_address, venue_description: pageData.venue_description,
      capacity: pageData.capacity, registration_fee_general: pageData.registration_fee_general,
      registration_fee_student: pageData.registration_fee_student,
      registration_fee_early: pageData.registration_fee_early, about_extra: pageData.about_extra,
      map_url: pageData.map_url, banner_url: pageData.banner_url,
    }).eq('conference_id', confId);
    if (error) throw new Error(error.message);
  };

  const handleScheduleSave = async (newSchedule) => {
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
    try {
      const response = await fetch(`${backendUrl}/api/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conference_id: confId,
          schedule: newSchedule,
          editor_name: editorName,
          editor_position: editorPosition,
          notify: true
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        if (result.details) {
          throw new Error(`${result.error}: ${result.details.join(' ')}`);
        }
        throw new Error(result.error || 'Failed to save schedule');
      }

      setLiveSchedule(newSchedule);
    } catch (err) {
      console.error("Schedule save error:", err);
      throw err;
    }
  };

  const templateProps = {
    conf: { ...conf, schedule: liveSchedule },
    isOrganizer,
    onSave: handleSave,
    canEditSchedule,
    currentUserId: user?.id,
    currentUser: user,
    members,
    onScheduleSave: handleScheduleSave,
    isGuest,
    onRequireAuthForRegister: handleRequireAuthForRegister,
    autoOpenRegister,
    onSwitchToTab: handleTabClick,
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-sans bg-[#0f1117] text-slate-200">
      <nav className="bg-[#0f1117] border-b border-white/5 px-6 py-4 flex justify-between items-center z-50 shrink-0">
        <div className="flex items-center gap-6">
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
        </div>

        <div className="flex items-center gap-3">
          {isGuest && (
            <button
              onClick={() => onRequireAuth && onRequireAuth('home')}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all"
            >
              <LogIn size={13} /> Sign in
            </button>
          )}

          <div className="flex bg-black/40 p-1.5 rounded-full border border-white/5">
            <NavTab active={viewMode === 'home'} onClick={() => handleTabClick('home')} activeClass="bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900 shadow-lg shadow-amber-500/10">
              Site Preview
            </NavTab>
            {hasRole && !isGuest && (
              <NavTab active={viewMode === 'dashboard'} onClick={() => handleTabClick('dashboard')} activeClass="bg-gradient-to-br from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/30">
                Dashboard
              </NavTab>
            )}
            <NavTab active={viewMode === 'submitPaper'} onClick={() => handleTabClick('submitPaper')} activeClass="bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/40">
              Submit Paper{isGuest && <span className="ml-1.5 text-[9px] opacity-60 font-normal normal-case tracking-normal">(login)</span>}
            </NavTab>
          </div>
        </div>
      </nav>
      <div className="flex-1 bg-black overflow-y-auto relative no-scrollbar" id="conf-scroll-area">
        {viewMode === 'home' ? (
          conf.template === 'classic'
            ? <ClassicTemplate {...templateProps} />
            : <ModernTemplate {...templateProps} />
        ) : viewMode === 'dashboard' ? (
          <RoleBasedDashboard conf={conf} role={resolvedRole} onBack={onBack} onSwitchView={handleTabClick} />
        ) : viewMode === 'submitPaper' ? (
          <PaperSubmission conf={conf} />
        ) : null}
      </div>
    </div>
  );
};

const NavTab = ({ active, onClick, activeClass, children }) => (
  <button
    onClick={onClick}
    className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${active ? activeClass : 'text-slate-500 hover:text-slate-300'}`}
  >
    {children}
  </button>
);

export default ConferenceView;