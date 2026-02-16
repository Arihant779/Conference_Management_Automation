import React from 'react';
import OrganizerDashboard from './OrganizerDashboard';
import PresenterDashboard from './PresenterDashboard';
import ReviewerDashboard from './ReviewerDashboard';

const RoleBasedDashboard = ({ conf, role }) => {
  if (role === 'organizer') {
    return <OrganizerDashboard conf={conf} />;
  }

  if (role === 'presenter') {
    return <PresenterDashboard conf={conf} />;
  }

  if (role === 'reviewer') {
    return <ReviewerDashboard conf={conf} />;
  }

  return (
    <div className="p-12 text-center text-slate-500">
      Dashboard not available for this role.
    </div>
  );
};

export default RoleBasedDashboard;
