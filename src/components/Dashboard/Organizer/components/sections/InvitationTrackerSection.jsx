import React, { useState, useEffect } from 'react';
import { Send, Clock, CheckCircle2, XCircle, Mail, ExternalLink, Loader2, RefreshCcw, Search, UserPlus } from 'lucide-react';
import { Btn, Input } from '../common/Primitives';
import ManualInviteModal from '../Modals/ManualInviteModal';

const StatusBadge = ({ status, scheduledAt }) => {
  const styles = {
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    accepted: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    declined: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    scheduled: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  };

  return (
    <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider flex flex-col items-center gap-1 ${styles[status] || styles.pending}`}>
      {status}
      {status === 'scheduled' && scheduledAt && (
        <span className="text-[8px] opacity-70 lowercase font-medium">
          {new Date(scheduledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
};

const FollowUpButton = ({ inviteId, onSuccess, isDark }) => {
  const [loading, setLoading] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const handleFollowUp = async (isScheduled = false) => {
    if (isScheduled && !scheduledAt) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4000/api/speakers/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          invite_id: inviteId,
          scheduledAt: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onSuccess(data.invite);
      setShowScheduler(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-[120px]">
      <Btn 
        onClick={() => handleFollowUp(false)} 
        disabled={loading}
        variant="ghost" 
        className={`text-[9px] h-7 px-3 border border-dashed ${isDark ? 'border-white/10' : 'border-zinc-200'} hover:border-indigo-500/50 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all`}
      >
        {loading ? <Loader2 className="animate-spin" size={12} /> : 'Nudge Now'}
      </Btn>
      
      <button 
        onClick={() => setShowScheduler(!showScheduler)}
        className="text-[8px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-tighter transition-colors"
      >
        {showScheduler ? 'Cancel' : 'Schedule Nudge'}
      </button>

      {showScheduler && (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200 bg-black/20 p-2 rounded-lg border border-white/5">
          <input 
            type="datetime-local" 
            className="text-[9px] bg-slate-900 border border-white/10 rounded p-1 text-white focus:outline-none"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
          <Btn 
            onClick={() => handleFollowUp(true)}
            disabled={loading || !scheduledAt}
            className="h-6 text-[8px] bg-indigo-600 hover:bg-indigo-700 py-0"
          >
            {loading ? <Loader2 className="animate-spin" size={10} /> : 'Confirm'}
          </Btn>
        </div>
      )}
    </div>
  );
};

const BulkFollowUpAction = ({ conference, pendingCount, onComplete, isDark }) => {
  const [loading, setLoading] = useState(false);
  const [showScheduler, setShowScheduler] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const handleBulkFollowUp = async (isScheduled = false) => {
    if (isScheduled && !scheduledAt) {
      console.warn("Bulk Schedule attempted without date/time");
      return;
    }
    setLoading(true);
    const confId = conference?.conference_id || conference?.id;
    console.log(`[Bulk] Sending request for conference: ${confId}, scheduled: ${isScheduled ? scheduledAt : 'Now'}`);

    try {
      const res = await fetch('http://localhost:4000/api/speakers/bulk-follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          conference_id: confId,
          scheduledAt: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onComplete();
      setShowScheduler(false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`p-4 border-b ${isDark ? 'border-white/5 bg-indigo-500/5' : 'bg-indigo-50 border-indigo-100'} flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-indigo-500 text-black' : 'bg-indigo-600 text-white'}`}>
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
        </div>
        <div>
          <div className="text-sm font-bold text-indigo-400">{pendingCount} Speakers Pending</div>
          <div className="text-[10px] text-slate-500">Send personalized nudges to everyone together</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {showScheduler && (
            <input 
              type="datetime-local" 
              className={`text-xs p-2 rounded-xl border ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-zinc-200 text-zinc-900'} focus:outline-none`}
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          )}
          <button 
            onClick={() => setShowScheduler(!showScheduler)}
            className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest px-2"
          >
            {showScheduler ? 'Cancel' : 'Schedule Bulk Nudge'}
          </button>
        </div>

        <Btn 
          onClick={() => handleBulkFollowUp(showScheduler)} 
          disabled={loading || (showScheduler && !scheduledAt)}
          variant="primary" 
          className="bg-indigo-600 hover:bg-indigo-700 text-xs px-6 py-2.5"
        >
          {loading ? (
            <><Loader2 className="animate-spin mr-2" size={14} /> Processing...</>
          ) : (
            showScheduler ? 'Schedule All' : 'Nudge Everyone Now'
          )}
        </Btn>
      </div>
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

        {filteredInvites.some(i => i.status === 'pending') && (
          <BulkFollowUpAction 
            conference={conference}
            pendingCount={filteredInvites.filter(i => i.status === 'pending').length}
            onComplete={fetchInvites}
            isDark={isDark}
          />
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className={`border-b ${isDark ? 'border-white/5 text-slate-400' : 'border-zinc-100 text-slate-500'} text-[10px] font-bold uppercase tracking-widest`}>
                <th className="px-6 py-4">Speaker</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Follow-up</th>
                <th className="px-6 py-4">Last Contact</th>
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
                      <StatusBadge status={invite.status} scheduledAt={invite.scheduled_at} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center justify-center gap-2">
                        {invite.follow_up_count > 0 && (
                          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                            Nudge x{invite.follow_up_count}
                          </span>
                        )}
                        {invite.status === 'pending' && (
                          <FollowUpButton 
                            inviteId={invite.id} 
                            onSuccess={(updated) => {
                              setInvites(prev => prev.map(inv => inv.id === updated.id ? updated : inv));
                            }} 
                            isDark={isDark}
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(invite.last_follow_up_at || invite.sent_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs text-center">
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
