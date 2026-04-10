import React, { useState } from 'react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import OrganizerDashboard from './OrganizerDashboard';
import PresenterDashboard from './PresenterDashboard';
import ReviewerDashboard from './ReviewerDashboard';
import MemberDashboard from './MemberDashboard';
import ConferencePage from './ConferencePage';

const RoleBasedDashboard = ({ conf, role: propRole, onBack, onSwitchView }) => {
  const { user, permissions, userRoles, loadingPermissions, theme } = useApp();
  const isDark = theme === 'dark';

  // Handle loading state from AppContext
  if (loadingPermissions) {
    return (
      <div className={`flex items-center justify-center min-h-screen transition-colors duration-500 ${isDark ? 'bg-[#080b11]' : 'bg-[#F8FAFC]'}`}>
        <div className={`w-8 h-8 border-2 border-t-transparent rounded-full animate-spin ${isDark ? 'border-amber-500' : 'border-amber-600'}`} />
      </div>
    );
  }

  // Management roles use the OrganizerDashboard (permissions will control tabs)
  const isManagement = userRoles.some(r => 
    r === 'organizer' || r === 'team_head' || r.endsWith('_head')
  ) || propRole === 'organizer' || propRole?.endsWith('_head');
  
  const isReviewer = userRoles.includes('reviewer') || propRole === 'reviewer';
  const isPresenter = userRoles.includes('presenter') || propRole === 'presenter';
  const isMember = userRoles.includes('member') || propRole === 'member';

  if (isManagement) return <OrganizerDashboard conf={conf} onBack={onBack} onSwitchView={onSwitchView} />;
  if (isPresenter) return <PresenterDashboard conf={conf} onBack={onBack} />;
  if (isReviewer)  return <ReviewerDashboard conf={conf} onBack={onBack} />;
  if (isMember)    return <MemberDashboard conf={conf} onBack={onBack} />;

  return <ConferencePage conf={conf} onBack={onBack} />;
};

export default RoleBasedDashboard;