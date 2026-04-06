import React, { useEffect, useState } from 'react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import OrganizerDashboard from './OrganizerDashboard';
import PresenterDashboard from './PresenterDashboard';
import ReviewerDashboard from './ReviewerDashboard';
import MemberDashboard from './MemberDashboard';
import ConferencePage from './ConferencePage';

const RoleBasedDashboard = ({ conf, role: propRole, onBack }) => {
  const { user, permissions, userRoles, loadingPermissions } = useApp();

  const confId = conf?.conference_id ?? conf?.id;

  // Handle loading state from AppContext
  if (loadingPermissions) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080b11]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Management roles use the OrganizerDashboard (permissions will control tabs)
  const isManagement = userRoles.some(r => 
    ['organizer', 'logistics_head', 'event_head', 'programming_head', 'outreach_head', 'feedback_head'].includes(r)
  );

  if (isManagement) return <OrganizerDashboard conf={conf} onBack={onBack} />;
  if (userRoles.includes('presenter')) return <PresenterDashboard conf={conf} onBack={onBack} />;
  if (userRoles.includes('reviewer'))  return <ReviewerDashboard conf={conf} onBack={onBack} />;
  if (userRoles.includes('member'))    return <MemberDashboard conf={conf} onBack={onBack} />;

  return <ConferencePage conf={conf} onBack={onBack} />;
};

export default RoleBasedDashboard;