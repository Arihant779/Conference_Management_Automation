import React from 'react';
import { Bell, Send } from 'lucide-react';
import { Btn, Empty } from '../common/Primitives';
import { useApp } from '../../../../../context/AppContext';

const NotificationsSection = ({ notifs, teamName, setModal }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className={`text-2xl font-bold transition-colors duration-500 tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Notifications</h2>
          <p className={`text-sm mt-0.5 transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Announcements sent to members</p>
        </div>
        <Btn onClick={() => setModal('notification')}><Send size={14} />New Announcement</Btn>
      </div>
      {notifs.length === 0
        ? <Empty icon={Bell} msg="No notifications sent yet." action={{ label: '+ Send Announcement', onClick: () => setModal('notification') }} />
        : (
          <div className="space-y-3">
            {notifs.map((n, i) => (
              <div key={i} className={`rounded-2xl p-5 border transition-all duration-500 shadow-sm ${
                isDark ? 'bg-slate-900/50 border-white/5 shadow-none' : 'bg-white border-zinc-200'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <div className={`font-semibold text-sm transition-colors duration-500 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{n.title}</div>
                  <div className="flex items-center gap-2 shrink-0">
                    {n.target_role && (
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border transition-colors duration-500 ${
                        isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                      }`}>
                        {n.target_role}
                      </span>
                    )}
                    {n.target_team_id && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500">
                        {teamName(n.target_team_id)}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <p className={`text-sm leading-relaxed transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{n.message}</p>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
};

export default NotificationsSection;
