import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const MemberNotifications = ({ conf }) => {
  const { user } = useApp();
  const confId = conf?.conference_id ?? conf?.id;
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);

    // 1. Get user's role in this conference
    const { data: membership } = await supabase
      .from('conference_user')
      .select('role')
      .eq('conference_id', confId)
      .eq('user_id', user.id)
      .maybeSingle();

    const role = membership?.role || null;
    setUserRole(role);

    // 2. Fetch notifications targeted at everyone, or this specific role
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('conference_id', confId)
      .or(`target_role.is.null,target_role.eq.${role}`)
      .order('created_at', { ascending: false });

    if (error) console.error('Notifications error:', error);
    setNotifs(data || []);
    setLoading(false);
  }, [confId, user]);

  useEffect(() => {
    if (user && confId) fetchNotifs();
  }, [user, confId, fetchNotifs]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-white/3 border border-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Bell size={18} className="text-indigo-400" />
        <h3 className="text-lg font-bold text-white">Announcements</h3>
        {userRole && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border-indigo-500/20 ml-auto">
            Showing for: {userRole}
          </span>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-white/8 rounded-2xl">
          <BellOff size={28} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No announcements yet.</p>
        </div>
      ) : (
        notifs.map(n => (
          <div key={n.id} className="bg-[#0d1117] border border-white/6 rounded-xl p-5 hover:border-white/10 transition-all">
            <div className="flex justify-between items-start mb-2 gap-3">
              <div className="font-semibold text-white text-sm">{n.title}</div>
              <div className="flex items-center gap-2 shrink-0">
                {n.target_role && (
                  <span className="text-[10px] text-slate-500 bg-white/5 border border-white/8 px-2 py-0.5 rounded-md uppercase font-bold">
                    {n.target_role}
                  </span>
                )}
                <span className="text-xs text-slate-600">
                  {new Date(n.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{n.message}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default MemberNotifications;