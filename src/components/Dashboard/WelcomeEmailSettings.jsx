import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Sparkles, Save, Edit3, Loader2, CheckCircle, ChevronUp, RefreshCw, Zap, BellRing 
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const cls = (...c) => c.filter(Boolean).join(' ');

const TONE_OPTIONS = [
  { key: 'formal', label: 'Formal' },
  { key: 'friendly', label: 'Friendly' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'celebratory', label: 'Celebratory' },
  { key: 'informational', label: 'Informational' },
];

/* ─── small primitives (theme aware) ─────────────────────── */
const Field = ({ label, hint, children, isDark }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1.5 px-0.5">
      <label className={cls("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-slate-500" : "text-zinc-500")}>{label}</label>
      {hint && <span className={cls("text-[10px] italic", isDark ? "text-slate-600" : "text-zinc-400")}>{hint}</span>}
    </div>
    {children}
  </div>
);

const Input = ({ className, isDark, ...props }) => (
  <input {...props} className={cls(
    'w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-200 outline-none border',
    isDark
      ? 'bg-white/5 border-white/8 text-white placeholder-slate-600 focus:border-indigo-500 focus:bg-white/10'
      : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:bg-white',
    className,
  )} />
);

const EmailBodyEditor = ({ value, onChange, editing, onToggleEdit, isDark }) => {
  const taRef = useRef(null);
  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = taRef.current.scrollHeight + 'px';
    }
  }, [editing, value]);

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <span className={cls("text-[10px] uppercase tracking-wider font-bold", isDark ? "text-slate-600" : "text-zinc-500")}>Body</span>
        <button
          onClick={onToggleEdit}
          className={cls(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
            editing
              ? isDark ? 'bg-amber-500/15 border-amber-500/25 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-600'
              : isDark ? 'border-white/10 text-slate-500 hover:text-white hover:border-white/20' : 'border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300',
          )}
        >
          <Edit3 size={10} />
          {editing ? 'Editing' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <textarea
          ref={taRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cls(
            "w-full rounded-xl px-4 py-3 text-sm leading-relaxed outline-none resize-none min-h-[220px] transition-all duration-300 border",
            isDark
              ? "bg-black/30 border-amber-500/30 text-slate-200 focus:border-amber-400/50"
              : "bg-white border-amber-200 text-zinc-800 shadow-sm focus:border-amber-500"
          )}
          style={{ fontFamily: 'inherit' }}
          spellCheck autoFocus
        />
      ) : (
        <div
          className={cls(
            "rounded-xl px-4 py-4 min-h-[220px] cursor-text border transition-all duration-300",
            isDark ? "bg-white/3 border-white/6 hover:bg-white/5" : "bg-zinc-50 border-zinc-100 hover:bg-white hover:border-zinc-200"
          )}
          onClick={onToggleEdit}
        >
          {value
            ? <p className={cls("text-sm leading-relaxed whitespace-pre-wrap", isDark ? "text-slate-300" : "text-zinc-700")}>{value}</p>
            : <p className={cls("italic text-sm", isDark ? "text-slate-600" : "text-zinc-400")}>No body yet.</p>
          }
        </div>
      )}

      {editing && (
        <p className={cls("text-[10px] mt-1 text-right", isDark ? "text-slate-600" : "text-zinc-400")}>
          {value.length} chars · {value.split('\n').length} lines — click outside to finish
        </p>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   WELCOME EMAIL SETTINGS
═══════════════════════════════════════════════════════════════════════════ */
const WelcomeEmailSettings = ({ conf }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const confId = conf?.conference_id ?? conf?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  
  const [subject, setSubject] = useState('Welcome to the Conference!');
  const [body, setBody] = useState('');
  const [bodyEditing, setBodyEditing] = useState(false);
  
  const [intent, setIntent] = useState('');
  const [tone, setTone] = useState('friendly');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  
  const [savedSuccess, setSavedSuccess] = useState(false);

  /* ── Load Settings ── */
  const loadSettings = useCallback(async () => {
    setLoading(true);
    // Ignore errors here if the columns don't exist yet, just fall back
    const { data } = await supabase
      .from('conference')
      .select('welcome_email_enabled, welcome_email_subject, welcome_email_body')
      .eq('conference_id', confId)
      .single();

    if (data) {
      setEnabled(data.welcome_email_enabled || false);
      if (data.welcome_email_subject) setSubject(data.welcome_email_subject);
      if (data.welcome_email_body) setBody(data.welcome_email_body);
    }
    setLoading(false);
  }, [confId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /* ── Generate via AI ── */
  const generateEmail = async () => {
    if (!intent.trim()) return;
    setGenerating(true);
    setGenError('');
    setBody('');
    try {
      const res = await fetch('http://localhost:4000/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          intent: intent + " (This is an automated welcome email sent immediately after a user registers for the conference)", 
          tone, 
          subject, 
          recipientDescription: "newly registered conference attendee", 
          conferenceTitle: conf?.title, 
          senderRole: "organizer" 
        }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setBody(data.body || '');
      if (!subject && data.subject) setSubject(data.subject);
    } catch {
      setGenError('Failed to generate. Make sure your backend is running on port 4000.');
    }
    setGenerating(false);
  };

  /* ── Save Settings ── */
  const saveSettings = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from('conference')
      .update({
        welcome_email_enabled: enabled,
        welcome_email_subject: subject,
        welcome_email_body: body,
      })
      .eq('conference_id', confId);

    setSaving(false);
    if (!error) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } else {
      console.error(error);
      alert('Failed to save settings. Please make sure the columns have been added to the database.');
    }
  };

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <Loader2 className="animate-spin text-zinc-500" />
    </div>
  );

  return (
    <div className={cls("space-y-6 animate-in fade-in duration-700", isDark ? "text-white" : "text-zinc-900")} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div>
        <h2 className={cls("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-zinc-900")}>Welcome Email Settings</h2>
        <p className={cls("text-sm mt-0.5", isDark ? "text-slate-500" : "text-zinc-500")}>
          Automate a welcome email dispatched to attendees the moment they register for {conf?.title}.
        </p>
      </div>

      {/* ── Toggle Activation ── */}
      <div 
        onClick={() => setEnabled(!enabled)}
        className={cls(
          "flex items-center gap-4 p-5 md:p-6 rounded-2xl border-2 transition-all cursor-pointer group select-none shadow-sm",
          enabled
            ? isDark ? 'border-amber-500/60 bg-amber-500/10' : 'border-amber-500 bg-amber-50 shadow-amber-500/10'
            : isDark ? 'border-white/8 hover:border-white/15 bg-[#0d1117]' : 'border-zinc-200 hover:border-zinc-300 bg-white'
        )}
      >
        <div className={cls(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110",
          enabled ? "bg-amber-500 text-white" : isDark ? "bg-white/5 text-slate-500" : "bg-zinc-100 text-zinc-400"
        )}>
          {enabled ? <BellRing size={20} className="animate-in zoom-in duration-300" /> : <Zap size={20} />}
        </div>
        
        <div className="flex-1">
          <div className={cls("font-bold text-lg leading-tight", enabled ? "text-amber-600 dark:text-amber-400" : isDark ? "text-white" : "text-zinc-800")}>
            Automated Welcome Messages Are {enabled ? 'Active' : 'Disabled'}
          </div>
          <div className={cls("text-sm mt-1", isDark ? "text-slate-500" : "text-zinc-500")}>
            {enabled ? 'New registrants will instantly receive the email customized below.' : 'No automated email will be sent upon registration.'}
          </div>
        </div>

        <div className={cls(
          "w-14 h-8 rounded-full relative transition-colors duration-300 shrink-0",
          enabled ? "bg-amber-500" : isDark ? "bg-white/10" : "bg-zinc-200"
        )}>
          <div className={cls(
            "absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300",
            enabled ? "left-[30px]" : "left-1"
          )} />
        </div>
      </div>

      {/* ── Customization Form ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Left Side: Groq Generator */}
        <div className={cls("rounded-2xl p-6 border space-y-6 transition-all", isDark ? "bg-[#0d1117]/80 border-white/6" : "bg-white border-zinc-200")}>
           <div className={cls("flex items-center gap-3 border-b pb-4", isDark ? "border-white/5" : "border-zinc-100")}>
             <div className={cls("w-8 h-8 flex items-center justify-center rounded-lg", isDark ? "bg-indigo-500/10" : "bg-indigo-50")}>
               <Sparkles size={16} className={isDark ? "text-indigo-400" : "text-indigo-600"} />
             </div>
             <div>
               <h3 className={cls("font-bold text-sm", isDark ? "text-white" : "text-zinc-800")}>Generate with AI</h3>
               <p className={cls("text-xs", isDark ? "text-slate-500" : "text-zinc-500")}>Draft your welcome message easily.</p>
             </div>
           </div>

           <Field label="What should it say?" isDark={isDark}>
            <textarea
              className={cls(
                "w-full rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none resize-none transition-all border h-24 mb-3",
                isDark ? "bg-white/5 border-white/8 text-white placeholder-slate-600" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400"
              )}
              placeholder="E.g., Thank them for joining and remind them to book a hotel early..."
              value={intent}
              onChange={e => setIntent(e.target.value)}
            />
          </Field>

          <Field label="Select Tone" isDark={isDark}>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map(({ key, label }) => {
                const isSelected = tone === key;
                return (
                  <button
                    key={key} type="button" onClick={() => setTone(key)}
                    className={cls(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95',
                      isSelected ? (isDark ? "bg-indigo-500/10 border-indigo-500/25 text-indigo-400" : "bg-indigo-50 border-indigo-200 text-indigo-600") : (isDark ? 'border-white/8 text-slate-500 hover:text-white' : 'border-zinc-200 text-zinc-400 hover:text-zinc-700'),
                    )}
                  >
                    {isSelected && <CheckCircle size={9} />}
                    {label}
                  </button>
                );
              })}
            </div>
          </Field>

          {genError && <div className="text-red-400 text-xs">{genError}</div>}

          <button
            onClick={generateEmail}
            disabled={generating || !intent.trim()}
            className={cls(
              "w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-xl active:scale-95 disabled:opacity-40",
              isDark ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20" : "bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/10"
            )}
          >
            {generating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {generating ? 'Drafting…' : 'Generate'}
          </button>
        </div>

        {/* Right Side: The Email Preview/Editor */}
        <div className={cls("rounded-2xl p-6 border space-y-6 transition-all shadow-md", isDark ? "bg-[#0d1117]/80 border-white/6" : "bg-white border-zinc-200")}>
           <div className={cls("flex items-center justify-between border-b pb-4", isDark ? "border-white/5" : "border-zinc-100")}>
             <div className="flex items-center gap-3">
               <div className={cls("w-8 h-8 flex items-center justify-center rounded-lg", isDark ? "bg-amber-500/10" : "bg-amber-50")}>
                 <Edit3 size={16} className={isDark ? "text-amber-400" : "text-amber-600"} />
               </div>
               <div>
                 <h3 className={cls("font-bold text-sm", isDark ? "text-white" : "text-zinc-800")}>Email Editor</h3>
                 <p className={cls("text-xs", isDark ? "text-slate-500" : "text-zinc-500")}>What registrants will see</p>
               </div>
             </div>
           </div>

           <Field label="Subject" isDark={isDark}>
            <Input isDark={isDark} value={subject} onChange={e => setSubject(e.target.value)} />
          </Field>

          <EmailBodyEditor value={body} onChange={setBody} editing={bodyEditing} onToggleEdit={() => setBodyEditing(!bodyEditing)} isDark={isDark} />
        </div>

      </div>

      {/* ── Footer Actions ── */}
      <div className="flex justify-end pt-4">
        <div className="flex items-center gap-4">
          {savedSuccess && (
            <span className="flex items-center gap-2 text-xs font-bold text-emerald-500 animate-in fade-in slide-in-from-right-4">
              <CheckCircle size={14} /> CHANGES SAVED
            </span>
          )}
          <button
            onClick={saveSettings}
            disabled={saving}
            className={cls(
              "flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-xl active:scale-95 disabled:opacity-50",
              isDark ? "bg-amber-500 hover:bg-amber-400 text-zinc-900 shadow-amber-500/20" : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
            )}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving…' : 'Save Automation Config'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeEmailSettings;
