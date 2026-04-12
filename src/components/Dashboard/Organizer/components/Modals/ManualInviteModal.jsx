import React, { useState } from 'react';
import { UserPlus, Loader2, Send, X, Sparkles, Check, Globe, Mail, Clock } from 'lucide-react';
import { Field, Input, Btn } from '../common/Primitives';

const ManualInviteModal = ({ conference, onClose, onInviteSent }) => {
  const [step, setStep] = useState(1); // 1: Name, 2: Profile/Draft, 3: Sending
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [speakerData, setSpeakerData] = useState(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const handleDiscovery = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      // 1. Generate Profile
      const profileRes = await fetch('http://localhost:4000/api/speakers/generate-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const profileData = await profileRes.json();
      if (profileData.error) throw new Error(profileData.error);
      
      setSpeakerData(profileData);
      setInstitution(profileData.institution || '');
      setProfileBio(profileData.profile || '');

      // 2. Personalize Invitation (Automatic)
      const personalizeRes = await fetch('http://localhost:4000/api/speakers/personalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.name,
          institution: profileData.institution,
          profile: profileData.profile,
          conferenceTitle: conference.title
        })
      });
      const pData = await personalizeRes.json();
      if (pData.error) throw new Error(pData.error);
      
      setSubject(pData.subject);
      setBody(pData.body);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = () => {
    setSpeakerData({ name });
    setInstitution('');
    setProfileBio('');
    setSubject(`Invitation to Speak at ${conference.title}`);
    setBody(`Dear ${name},\n\nWe would be honored to have you as a speaker at ${conference.title}...`);
    setStep(2);
  };

  const handleSend = async () => {
    if (!email.trim() || !subject || !body) {
      setError('Please provide a valid email and content.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:4000/api/speakers/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conference_id: conference?.conference_id || conference?.id,
          speaker_name: name,
          speaker_email: email,
          speaker_profile: profileBio,
          subject,
          body,
          scheduledAt: isScheduling && scheduledAt ? new Date(scheduledAt).toISOString() : null
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
      <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-black">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Manual Invitation</h3>
              <p className="text-xs text-slate-400">Invite any expert by name</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {error && <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm">{error}</div>}

          {step === 1 ? (
            <div className="space-y-6 py-6 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Globe className="text-indigo-400" size={32} />
              </div>
              <div className="max-w-xs mx-auto space-y-4">
                <Field label="Who would you like to invite?">
                  <Input 
                    placeholder="Enter full name..." 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    className="text-center text-lg shadow-xl !bg-white/5"
                    autoFocus
                  />
                </Field>
                <p className="text-xs text-slate-500">
                  AI will research this person's background across the web to draft a specialized invitation.
                </p>
                
                <div className="pt-2 space-y-3">
                  <Btn 
                    onClick={handleDiscovery} 
                    disabled={loading || !name.trim()} 
                    className="w-full justify-center py-4 bg-indigo-600 hover:bg-indigo-700 font-bold"
                  >
                    {loading ? (
                      <><Loader2 className="animate-spin mr-2" size={18} /> Researching...</>
                    ) : (
                      <>Run AI Discovery <Sparkles className="ml-2" size={16} /></>
                    )}
                  </Btn>
                  
                  <button 
                    onClick={handleManualEntry}
                    disabled={loading || !name.trim()}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors py-2"
                  >
                    Or skip and type manually
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Profile Context */}
              <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                    <Sparkles size={12} /> Expert Context
                  </div>
                  <div className="text-[10px] text-slate-500">Editable</div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Primary Institution">
                    <Input 
                      value={institution} 
                      onChange={e => setInstitution(e.target.value)}
                      placeholder="e.g. Stanford University"
                      className="!bg-black/20"
                    />
                  </Field>
                  <Field label="Contact Email">
                    <Input 
                      placeholder="name@domain.edu" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="!bg-black/20"
                    />
                  </Field>
                </div>

                <Field label="Biography / Research Focus">
                  <textarea
                    className="w-full h-20 bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none"
                    value={profileBio}
                    onChange={e => setProfileBio(e.target.value)}
                    placeholder="Describe their expertise..."
                  />
                </Field>
              </div>

              {/* Email Fields */}
              <Field label="Personalized Invitation">
                <Input 
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  className="mb-3 font-semibold !bg-white/5"
                  placeholder="Subject line..."
                />
                <textarea
                  className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                />
              </Field>

              {/* Scheduling Options */}
              <div className="pt-4 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-white/[0.07] transition-colors cursor-pointer" onClick={() => setIsScheduling(!isScheduling)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isScheduling ? 'bg-indigo-500 text-black' : 'bg-white/5 text-slate-400'}`}>
                      <Clock size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Schedule Dispatch</div>
                      <div className="text-[10px] text-slate-500">Pick a specific time to send this invite</div>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition-colors relative ${isScheduling ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isScheduling ? 'right-1' : 'left-1'}`} />
                  </div>
                </div>

                {isScheduling && (
                  <div className="px-4 animate-in slide-in-from-top-2 duration-300">
                    <Field label="Dispatch Date & Time">
                      <input 
                        type="datetime-local" 
                        value={scheduledAt}
                        onChange={(e) => setScheduledAt(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-black/20 flex gap-4">
          {step === 2 && (
            <Btn onClick={() => setStep(1)} variant="ghost" className="flex-1 text-slate-400 hover:text-white justify-center">
              Back
            </Btn>
          )}
          <Btn 
            onClick={step === 1 ? handleDiscovery : handleSend} 
            disabled={loading || !name.trim() || (step === 2 && isScheduling && !scheduledAt)}
            className={`flex-[2] justify-center py-4 text-sm font-bold shadow-xl ${step === 1 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
          >
            {loading ? (
              <><Loader2 className="animate-spin mr-2" size={18} /> Working...</>
            ) : (
              step === 1 ? <>AI Discovery <Sparkles className="ml-2" size={16} /></> : (isScheduling ? <>Schedule Dispatch <Clock className="ml-2" size={16} /></> : <>Send & Track <Send className="ml-2" size={16} /></>)
            )}
          </Btn>
        </div>
      </div>
    </div>
  );
};

export default ManualInviteModal;
