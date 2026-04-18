import React, { useState, useEffect } from 'react';
import { Mail, Loader2, Send, X, Sparkles, AlertCircle } from 'lucide-react';
import { Field, Input, Btn } from '../common/Primitives';
import { API_BASE_URL } from '../../../../../utils/api';

const InviteSpeakerModal = ({ speaker, conference, onClose, onInviteSent }) => {
  const [loading, setLoading] = useState(false);
  const [personalizing, setPersonalizing] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const personalize = async () => {
    setPersonalizing(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/speakers/personalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: speaker.name,
          institution: speaker.organization || speaker.institution,
          profile: speaker.profile,
          conferenceTitle: conference.title
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSubject(data.subject);
      setBody(data.body);
    } catch (err) {
      setError('Failed to personalize invitation. You can still write one manually.');
      console.error(err);
    } finally {
      setPersonalizing(false);
    }
  };

  useEffect(() => {
    personalize();
  }, [speaker]);

  const handleSend = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/speakers/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conference_id: conference.id,
          speaker_name: speaker.name,
          speaker_email: speaker.email,
          speaker_profile: speaker.profile,
          subject,
          body
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onInviteSent(data.invite);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Mail className="text-black" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Invite Speaker</h3>
              <p className="text-xs text-slate-400">Personalizing invitation for {speaker.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <Field label="Subject Line">
              <Input 
                value={subject} 
                onChange={e => setSubject(e.target.value)}
                placeholder="Subject line..."
                disabled={personalizing}
              />
            </Field>

            <Field label="Invitation Body (AI Personalized)">
              <div className="relative">
                <textarea
                  className="w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-none"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  disabled={personalizing}
                />
                {personalizing && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-amber-500" size={32} />
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                      <Sparkles size={16} />
                      AI is writing your invite...
                    </div>
                  </div>
                )}
              </div>
            </Field>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
            <p className="text-[11px] leading-relaxed text-amber-200/60">
              <span className="font-bold text-amber-500">Note:</span> Magic response links (Accept/Decline) will be automatically appended to the bottom of the email to track the speaker's decision.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/20 flex gap-3">
          <Btn 
            onClick={onClose} 
            variant="ghost" 
            className="flex-1 justify-center py-3 text-slate-400 hover:text-white hover:bg-white/5"
          >
            Cancel
          </Btn>
          <Btn 
            onClick={handleSend}
            disabled={loading || personalizing || !subject || !body}
            className="flex-1 justify-center py-3 shadow-lg shadow-amber-500/10"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <Send size={18} className="mr-2" />
                Send Invitation
              </>
            )}
          </Btn>
        </div>
      </div>
    </div>
  );
};

export default InviteSpeakerModal;
