import React from 'react';
import { Bell, Send } from 'lucide-react';
import { Btn, Empty } from '../common/Primitives';

const NotificationsSection = ({ notifs, teamName, setModal }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Notifications</h2>
        <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>Announcements sent to members</p>
      </div>
      <Btn onClick={() => setModal('notification')}><Send size={14} />New Announcement</Btn>
    </div>
    {notifs.length === 0
      ? <Empty icon={Bell} msg="No notifications sent yet." action={{ label: '+ Send Announcement', onClick: () => setModal('notification') }} />
      : (
        <div className="space-y-3">
          {notifs.map((n, i) => (
            <div key={i} className="rounded-2xl p-5" style={{ background: '#16181f', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex justify-between items-start mb-2">
                <div className="font-semibold text-white text-sm">{n.title}</div>
                <div className="flex items-center gap-2 shrink-0">
                  {n.target_role     && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}>{n.target_role}</span>}
                  {n.target_team_id  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.15)', color: '#f5c518' }}>{teamName(n.target_team_id)}</span>}
                  <span className="text-xs" style={{ color: '#6b7280' }}>{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: '#a1a1aa' }}>{n.message}</p>
            </div>
          ))}
        </div>
      )
    }
  </div>
);

export default NotificationsSection;
