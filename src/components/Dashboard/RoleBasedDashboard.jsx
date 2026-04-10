import React, { useEffect, useState } from 'react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import OrganizerDashboard from './OrganizerDashboard';
import PresenterDashboard from './PresenterDashboard';
import ReviewerDashboard from './ReviewerDashboard';
import TeamLeadDashboard from './TeamLeadDashboard';
import TeamMemberDashboard from './TeamMemberDashboard';
import ConferencePage from './ConferencePage';

const RoleBasedDashboard = ({ conf, role: propRole, onBack }) => {
  const { user } = useApp();
  const [role, setRole] = useState(null);
  const [isTeamLead, setIsTeamLead] = useState(false);
  const [isTeamMember, setIsTeamMember] = useState(false);
  const [loading, setLoading] = useState(true);

  const confId = conf?.conference_id ?? conf?.id;

  useEffect(() => {
    if (!user || !confId) return;
    verifyRole();
  }, [user, confId]);

  const verifyRole = async () => {
    setLoading(true);

    // 1. Conference head is always organizer
    if (conf?.conference_head_id === user.id) {
      setRole('organizer');
      setLoading(false);
      return;
    }

    // 2. Fetch role and team associations
    const { data: cuData, error: cuError } = await supabase
      .from('conference_user')
      .select('id, role')
      .eq('conference_id', confId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (cuError) console.error('Role lookup error:', cuError);

    if (cuData) {
      setRole(cuData.role);

      // Check if Team Lead
      const { data: teamLeadData } = await supabase
        .from('conference_teams')
        .select('id')
        .eq('conference_id', confId)
        .eq('head_id', cuData.id)
        .maybeSingle();
      
      if (teamLeadData) {
        setIsTeamLead(true);
      } else {
        // Check if Team Member
        const { data: teamMemberData } = await supabase
          .from('team_members')
          .select('id')
          .eq('conference_user_id', cuData.id)
          .maybeSingle();
        
        if (teamMemberData) {
          setIsTeamMember(true);
        }
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080b11]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Priority: Organizer > Team Lead > Team Member > Presenter/Reviewer
  if (role === 'organizer') return <OrganizerDashboard conf={conf} onBack={onBack} />;
  if (isTeamLead) return <TeamLeadDashboard conf={conf} onBack={onBack} />;
  if (isTeamMember) return <TeamMemberDashboard conf={conf} onBack={onBack} />;
  
  if (role === 'presenter') return <PresenterDashboard conf={conf} onBack={onBack} />;
  if (role === 'reviewer') return <ReviewerDashboard conf={conf} onBack={onBack} />;

  return <ConferencePage conf={conf} onBack={onBack} />;
};

export default RoleBasedDashboard;