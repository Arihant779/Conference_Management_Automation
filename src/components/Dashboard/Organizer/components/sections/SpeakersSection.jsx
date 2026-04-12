import React, { useState } from 'react';
import { Users, Mail, Copy, Check, Loader2 } from 'lucide-react';
import { Field, Input, Sel, Btn } from '../common/Primitives';
import { useApp } from '../../../../../context/AppContext';

const SpeakersSection = ({
  spTopic, setSpTopic, spLimit, setSpLimit, spSource, setSpSource,
  spLoading, spResults, spError, findSpeakers,
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  
  const [emails, setEmails] = useState({}); // { [index]: email }
  const [emailLoading, setEmailLoading] = useState({}); // { [index]: boolean }
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Reset emails when results change
  React.useEffect(() => {
    setEmails({});
    setEmailLoading({});
  }, [spResults]);

  const fetchEmail = async (index, name, org) => {
    setEmailLoading(prev => ({ ...prev, [index]: true }));
    try {
      const baseUrl = "http://localhost:4000"; 
      const res = await fetch(`${baseUrl}/api/speakers/email?name=${encodeURIComponent(name)}&org=${encodeURIComponent(org || '')}`);
      
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      // data.email might be an object containing { name, institution, email, ... } or just a string
      const emailStr = typeof data.email === 'object' ? data.email.email : data.email;
      
      if (emailStr) {
        setEmails(prev => ({ ...prev, [index]: emailStr }));
      } else {
        setEmails(prev => ({ ...prev, [index]: 'Not found' }));
      }
    } catch (err) {
      console.error("Failed to find email:", err);
      setEmails(prev => ({ ...prev, [index]: 'Not found' }));
    } finally {
      setEmailLoading(prev => ({ ...prev, [index]: false }));
    }
  };

  const copyToClipboard = (email, index) => {
    navigator.clipboard.writeText(email);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={`text-2xl font-bold transition-colors duration-500 tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>Find Speakers</h2>
        <p className={`text-sm mt-0.5 transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Discover potential speakers for your conference using AI</p>
      </div>
      <div className={`rounded-2xl p-6 space-y-5 border transition-all duration-500 ${
        isDark ? 'bg-slate-900/50 border-white/5 shadow-none' : 'bg-white border-zinc-200 shadow-sm'
      }`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Field label="Research Topic">
              <Input placeholder="e.g. Artificial Intelligence, Quantum Computing…" value={spTopic} onChange={e => setSpTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && findSpeakers()} />
            </Field>
          </div>
          <Field label="Max Results">
            <Sel value={spLimit} onChange={e => setSpLimit(Number(e.target.value))}>
              {[5,10,15,20].map(n => <option key={n} value={n} style={{ background: isDark ? '#13151c' : '#fff', color: isDark ? '#fff' : '#000' }}>{n} speakers</option>)}
            </Sel>
          </Field>
        </div>
        <Field label="Speaker Source">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[{key:1,label:'🇮🇳 Indian'},{key:2,label:'🌐 Foreign'},{key:3,label:'💼 LinkedIn'},{key:4,label:'🎓 IIT / NIT'},{key:5,label:'⭐ All Sources'}].map(({ key, label }) => (
              <button key={key} onClick={() => setSpSource(key)}
                className={`py-2.5 px-3 rounded-xl text-[10px] font-bold transition-all duration-300 border ${
                  spSource === key
                    ? 'bg-amber-500 text-black border-amber-500 shadow-sm'
                    : isDark ? 'border-white/5 text-slate-500 bg-white/5 hover:bg-white/10' : 'border-zinc-200 text-slate-500 bg-zinc-100/50 hover:bg-zinc-200/50'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </Field>
        <Btn onClick={findSpeakers} disabled={spLoading || !spTopic.trim()} className="w-full py-3 justify-center shadow-lg active:scale-95 transition-all">
          {spLoading ? <><div className={`w-4 h-4 border-2 rounded-full animate-spin mr-2 ${isDark ? 'border-black/30 border-t-black' : 'border-black/30 border-t-black'}`} />Searching…</> : <><Users size={15} className="mr-1" />Find Speakers</>}
        </Btn>
        {spError && <div className="rounded-xl px-4 py-3 text-sm bg-rose-500/10 border border-rose-500/20 text-rose-500">{spError}</div>}
      </div>
      {spLoading && <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className={`h-32 rounded-2xl animate-pulse border ${isDark ? 'bg-white/5 border-white/5' : 'bg-zinc-100 border-zinc-200'}`} />)}</div>}
      {!spLoading && spResults.length > 0 && (
        <div className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{spResults.length} Speaker{spResults.length !== 1 ? 's' : ''} Found</div>
          {spResults.map((speaker, i) => (
            <div key={i} className={`rounded-2xl p-6 border transition-all duration-500 shadow-sm ${
              isDark ? 'bg-slate-900/50 border-white/5 hover:border-white/10' : 'bg-white border-zinc-200 hover:border-amber-200/50'
            }`}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-black font-bold text-lg shrink-0 shadow-sm" style={{ background: '#f5c518' }}>{speaker.name?.[0]?.toUpperCase()}</div>
                  <div>
                    <div className={`font-bold text-base transition-colors duration-500 ${isDark ? 'text-white' : 'text-zinc-900'}`}>{speaker.name}</div>
                    {speaker.organization && <div className="text-xs mt-0.5 text-slate-500">{speaker.organization}</div>}
                  </div>
                </div>
                {speaker.relevance_score !== undefined && (
                  <div className={`shrink-0 text-center rounded-xl px-3 py-2 border transition-all duration-500 ${
                    isDark ? 'bg-amber-500/10 border-amber-500/20 shadow-none' : 'bg-amber-50 border-amber-200 shadow-sm'
                  }`}>
                    <div className="text-lg font-bold text-amber-500">{speaker.relevance_score}</div>
                    <div className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Score</div>
                  </div>
                )}
              </div>
              {speaker.profile && <p className={`text-sm leading-relaxed mb-4 transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{speaker.profile}</p>}
              
              <div className="flex flex-wrap items-center gap-4">
                {speaker.linkedin && <a href={speaker.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-500 hover:text-amber-600 transition-colors">View LinkedIn →</a>}
                
                <div className="flex items-center gap-2">
                  {!emails[i] ? (
                    <button 
                      onClick={() => fetchEmail(i, speaker.name, speaker.organization || speaker.institution)}
                      disabled={emailLoading[i]}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                        isDark 
                          ? 'border-white/10 text-slate-300 hover:bg-white/5 disabled:opacity-50' 
                          : 'border-zinc-200 text-slate-600 hover:bg-zinc-50 disabled:opacity-50'
                      }`}
                    >
                      {emailLoading[i] ? (
                        <>
                          <Loader2 size={12} className="animate-spin text-amber-500" />
                          Finding...
                        </>
                      ) : (
                        <>
                          <Mail size={12} className="text-amber-500" />
                          Find Email
                        </>
                      )}
                    </button>
                  ) : (
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                      isDark ? 'bg-amber-500/5 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                      <Mail size={12} className="text-amber-500" />
                      {emails[i]}
                      {emails[i] !== 'Not found' && emails[i] !== 'Error' && (
                        <button 
                          onClick={() => copyToClipboard(emails[i], i)}
                          className="ml-1 p-1 hover:bg-black/5 rounded transition-all"
                        >
                          {copiedIndex === i ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="opacity-60" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SpeakersSection;
