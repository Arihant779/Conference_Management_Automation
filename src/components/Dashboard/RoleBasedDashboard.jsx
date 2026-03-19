import React, { useEffect, useState } from 'react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import OrganizerDashboard from './OrganizerDashboard';
import PresenterDashboard from './PresenterDashboard';
import ReviewerDashboard from './ReviewerDashboard';
import ConferencePage from './ConferencePage';

const RoleBasedDashboard = ({ conf, role: propRole, onBack }) => {
  const { user } = useApp();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true); // always load fresh from DB

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

    // 2. Always fetch fresh from DB — never trust propRole
    const { data, error } = await supabase
      .from('conference_user')
      .select('role')
      .eq('conference_id', confId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) console.error('Role lookup error:', error);

    setRole(data?.role || null);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#080b11]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (role === 'organizer') return <OrganizerDashboard conf={conf} onBack={onBack} />;
  if (role === 'presenter') return <PresenterDashboard conf={conf} onBack={onBack} />;
  if (role === 'reviewer') return <ReviewerDashboard conf={conf} onBack={onBack} />;

  return <ConferencePage conf={conf} onBack={onBack} />;
};

export default RoleBasedDashboard;