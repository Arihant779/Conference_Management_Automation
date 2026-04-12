import React, { useState, useEffect } from 'react';
import { Send, Clock, CheckCircle2, XCircle, Mail, ExternalLink, Loader2, RefreshCcw, Search, UserPlus } from 'lucide-react';
import { Btn, Input } from '../common/Primitives';
import ManualInviteModal from '../Modals/ManualInviteModal';

const StatusBadge = ({ status }) => {
  const styles = {
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    accepted: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    declined: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  const icons = {
    pending: <Clock size={12} />,
    accepted: <CheckCircle2 size={12} />,
    declined: <XCircle size={12} />,
  };

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${styles[status] || styles.pending}`}>
      {icons[status] || icons.pending}
      {status}
    </div>
  );
};

const InvitationTrackerSection = ({ conference, isDark }) => {
  const confId = conference?.conference_id || conference?.id;
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showManualModal, setShowManualModal] = useState(false);

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/speakers/invitations?conference_id=${confId}`);
      const data = await res.json();
      setInvites(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, [confId]);

  const filteredInvites = (Array.isArray(invites) ? invites : []).filter(i => 
    i.speaker_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.speaker_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Invitation Tracker</h2>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Monitor speaker outreach and track responses in real-time</p>
        </div>
        <div className="flex items-center gap-2">
          <Btn onClick={() => setShowManualModal(true)} variant="primary" className="text-xs bg-indigo-600 hover:bg-indigo-700">
            <UserPlus size={14} className="mr-2" />
            Manual Invite
          </Btn>
          <Btn onClick={fetchInvites} variant="ghost" className="text-xs">
            <RefreshCcw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Btn>
        </div>
      </div>

      <div className={`rounded-2xl border ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-white border-zinc-200'} shadow-sm overflow-hidden`}>
        <div className="p-4 border-b border-white/5 bg-black/5 flex items-center gap-3">
          <Search size={18} className="text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="bg-transparent border-none text-sm text-slate-200 focus:outline-none w-full"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/5 text-slate-400' : 'border-zinc-100 text-slate-500'} text-[10px] font-bold uppercase tracking-widest`}>
                <th className="px-6 py-4">Speaker</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Sent At</th>
                <th className="px-6 py-4">Response At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <Loader2 className="animate-spin text-amber-500 mx-auto" size={24} />
                    <p className="mt-2 text-xs text-slate-500 font-medium">Loading invitations...</p>
                  </td>
                </tr>
              ) : filteredInvites.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">
                    {searchTerm ? 'No invitations match your search' : 'No invitations sent yet'}
                  </td>
                </tr>
              ) : (
                filteredInvites.map((invite) => (
                  <tr key={invite.id} className={`group hover:bg-white/5 transition-colors`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs uppercase">
                          {invite.speaker_name[0]}
                        </div>
                        <div className="font-semibold text-white">{invite.speaker_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Mail size={12} className="text-slate-500" />
                          {invite.speaker_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={invite.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(invite.sent_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {invite.replied_at ? new Date(invite.replied_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/20">
          <RefreshCcw className="text-indigo-400" size={18} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-indigo-200">Real-time status tracking active</h4>
          <p className="text-xs text-indigo-200/60 leading-relaxed mt-1">
            The status is updated automatically whenever a speaker clicks the magic response link in their invitation email. You can also manually refresh the list using the button above.
          </p>
        </div>
      </div>

      {showManualModal && (
        <ManualInviteModal 
          conference={conference} 
          onClose={() => setShowManualModal(false)}
          onInviteSent={(newInvite) => {
            if (newInvite) {
              setInvites(prev => Array.isArray(prev) ? [newInvite, ...prev] : [newInvite]);
            }
          }}
        />
      )}
    </div>
  );
};

export default InvitationTrackerSection;
