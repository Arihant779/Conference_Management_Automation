import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const MemberNotifications = ({ conf }) => {
  const { user, theme } = useApp();
  const isDark = theme === 'dark';
  const confId = conf?.conference_id ?? conf?.id;
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  const cls = (...c) => c.filter(Boolean).join(' ');

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
          <div key={i} className={cls("h-20 border rounded-xl animate-pulse", isDark ? "bg-white/3 border-white/5" : "bg-zinc-50 border-zinc-100")} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <Bell size={18} className="text-amber-400" />
        <h3 className={cls("text-lg font-bold transition-colors", isDark ? "text-white" : "text-zinc-900")}>Announcements</h3>
        {userRole && (
          <span className={cls("text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ml-auto", isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-amber-50 text-amber-600 border-amber-100")}>
            Showing for: {userRole}
          </span>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className={cls("py-20 text-center border border-dashed rounded-2xl", isDark ? "border-white/8" : "border-zinc-200")}>
          <BellOff size={28} className={cls("mx-auto mb-3", isDark ? "text-slate-700" : "text-zinc-300")} />
          <p className="text-slate-500 text-sm">No announcements yet.</p>
        </div>
      ) : (
        notifs.map(n => (
          <div key={n.id} className={cls("border rounded-xl p-5 transition-all", isDark ? "bg-[#0d1117] border-white/6 hover:border-white/10" : "bg-white border-zinc-200 shadow-sm hover:border-zinc-300")}>
            <div className="flex justify-between items-start mb-2 gap-3">
              <div className={cls("font-semibold text-sm transition-colors", isDark ? "text-white" : "text-zinc-900")}>{n.title}</div>
              <div className="flex items-center gap-2 shrink-0">
                {n.target_role && (
                  <span className={cls("text-[10px] px-2 py-0.5 rounded-md border uppercase font-bold", isDark ? "text-slate-500 bg-white/5 border-white/8" : "text-zinc-500 bg-zinc-50 border-zinc-200")}>
                    {n.target_role}
                  </span>
                )}
                <span className={cls("text-xs", isDark ? "text-slate-600" : "text-zinc-400")}>
                  {new Date(n.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </span>
              </div>
            </div>
            <p className={cls("text-sm leading-relaxed", isDark ? "text-slate-400" : "text-zinc-600")}>{n.message}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default MemberNotifications;