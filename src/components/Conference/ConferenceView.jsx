import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import ModernTemplate from './Templates/ModernTemplate';
import ClassicTemplate from './Templates/ClassicTemplate';
import RoleBasedDashboard from '../Dashboard/RoleBasedDashboard';
import PaperSubmission from './Templates/PaperSubmission';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const ConferenceView = ({ conf, role: propRole, onBack }) => {
  const { user } = useApp();
  const [viewMode, setViewMode] = useState('home');
  const [resolvedRole, setResolvedRole] = useState(propRole || null);

  const confId = conf?.conference_id ?? conf?.id;
  const displayTitle = conf.title ?? conf.name ?? 'Untitled Conference';

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

  const hasRole = !!resolvedRole;
  const isOrganizer = resolvedRole === 'organizer';

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
            ? <ClassicTemplate conf={conf} isOrganizer={isOrganizer} onSave={handleSave} />
            : <ModernTemplate conf={conf} isOrganizer={isOrganizer} onSave={handleSave} />
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