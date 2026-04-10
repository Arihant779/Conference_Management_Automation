import React from 'react';
import { Users } from 'lucide-react';
import { Field, Input, Sel, Btn } from '../common/Primitives';

const SpeakersSection = ({
  spTopic, setSpTopic, spLimit, setSpLimit, spSource, setSpSource,
  spLoading, spResults, spError, findSpeakers,
}) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-white tracking-tight">Find Speakers</h2>
      <p className="text-sm mt-0.5" style={{ color: '#6b7280' }}>Discover potential speakers for your conference using AI</p>
    </div>
    <div className="rounded-2xl p-6 space-y-5" style={{ background: '#16181f', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Field label="Research Topic">
            <Input placeholder="e.g. Artificial Intelligence, Quantum Computing…" value={spTopic} onChange={e => setSpTopic(e.target.value)} onKeyDown={e => e.key === 'Enter' && findSpeakers()} />
          </Field>
        </div>
        <Field label="Max Results">
          <Sel value={spLimit} onChange={e => setSpLimit(Number(e.target.value))}>
            {[5,10,15,20].map(n => <option key={n} value={n} style={{ background: '#13151c' }}>{n} speakers</option>)}
          </Sel>
        </Field>
      </div>
      <Field label="Speaker Source">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[{key:1,label:'🇮🇳 Indian'},{key:2,label:'🌐 Foreign'},{key:3,label:'💼 LinkedIn'},{key:4,label:'🎓 IIT / NIT'},{key:5,label:'⭐ All Sources'}].map(({ key, label }) => (
            <button key={key} onClick={() => setSpSource(key)}
              className="py-2.5 px-3 rounded-xl text-[10px] font-bold transition-all"
              style={spSource === key
                ? { background: '#f5c518', color: '#000', border: '1px solid #f5c518' }
                : { border: '1px solid rgba(255,255,255,0.08)', color: '#6b7280' }}>
              {label}
            </button>
          ))}
        </div>
      </Field>
      <Btn onClick={findSpeakers} disabled={spLoading || !spTopic.trim()} className="w-full py-3 justify-center">
        {spLoading ? <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,0,0,0.3)', borderTopColor: '#000' }} />Searching…</> : <><Users size={15} />Find Speakers</>}
      </Btn>
      {spError && <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{spError}</div>}
    </div>
    {spLoading && <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }} />)}</div>}
    {!spLoading && spResults.length > 0 && (
      <div className="space-y-4">
        <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6b7280' }}>{spResults.length} Speaker{spResults.length !== 1 ? 's' : ''} Found</div>
        {spResults.map((speaker, i) => (
          <div key={i} className="rounded-2xl p-6 transition-all" style={{ background: '#16181f', border: '1px solid rgba(255,255,255,0.07)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-black font-bold text-lg shrink-0" style={{ background: '#f5c518' }}>{speaker.name?.[0]?.toUpperCase()}</div>
                <div>
                  <div className="font-bold text-white text-base">{speaker.name}</div>
                  {speaker.organization && <div className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{speaker.organization}</div>}
                </div>
              </div>
              {speaker.relevance_score !== undefined && (
                <div className="shrink-0 text-center rounded-xl px-3 py-2" style={{ background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.2)' }}>
                  <div className="text-lg font-bold" style={{ color: '#f5c518' }}>{speaker.relevance_score}</div>
                  <div className="text-[9px] uppercase font-bold tracking-wider" style={{ color: '#6b7280' }}>Score</div>
                </div>
              )}
            </div>
            {speaker.profile && <p className="text-sm leading-relaxed mb-4" style={{ color: '#a1a1aa' }}>{speaker.profile}</p>}
            {speaker.linkedin && <a href={speaker.linkedin} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#f5c518' }}>View LinkedIn →</a>}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default SpeakersSection;
