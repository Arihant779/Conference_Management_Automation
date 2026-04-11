import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Send, X, ChevronDown, ChevronUp,
  Sparkles, Eye, Edit3, Check, AlertCircle,
  Plus, Mail, RefreshCw, Copy, CheckCheck,
  ArrowLeft, Loader2, Settings
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const cls = (...c) => c.filter(Boolean).join(' ');

const RECIPIENT_GROUPS = [
  { key: 'all', label: 'All Members', color: 'text-indigo-400', bg: 'bg-indigo-500/10  border-indigo-500/25' },
  { key: 'organizer', label: 'Organizers', color: 'text-violet-400', bg: 'bg-violet-500/10  border-violet-500/25' },
  { key: 'reviewer', label: 'Reviewers', color: 'text-amber-400', bg: 'bg-amber-500/10   border-amber-500/25' },
  { key: 'presenter', label: 'Presenters', color: 'text-blue-400', bg: 'bg-blue-500/10    border-blue-500/25' },
  { key: 'member', label: 'Guests', color: 'text-slate-400', bg: 'bg-slate-500/10   border-slate-500/25' },
  { key: 'custom', label: 'Custom', color: 'text-pink-400', bg: 'bg-pink-500/10    border-pink-500/25' },
];

const TONE_OPTIONS = [
  { key: 'formal', label: 'Formal' },
  { key: 'friendly', label: 'Friendly' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'celebratory', label: 'Celebratory' },
  { key: 'informational', label: 'Informational' },
];

const INTENT_TEMPLATES = [
  'Remind reviewers their deadline is in 3 days',
  'Congratulate presenters on paper acceptance',
  'Inform all members about a venue or schedule change',
  'Send registration confirmation details',
  'Announce keynote speaker lineup',
  'Request outstanding paper revisions',
];

/* â”€â”€â”€ small primitives â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const Field = ({ label, hint, children }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1.5">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      {hint && <span className="text-[10px] text-slate-600 italic">{hint}</span>}
    </div>
    {children}
  </div>
);

const Input = ({ className, ...props }) => (
  <input {...props} className={cls(
    'w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm',
    'focus:border-indigo-500 outline-none text-white placeholder-slate-600 transition-colors',
    className,
  )} />
);

/* â”€â”€â”€ auto-resizing editable body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const EmailBodyEditor = ({ value, onChange, editing, onToggleEdit }) => {
  const taRef = useRef(null);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = taRef.current.scrollHeight + 'px';
    }
  }, [editing, value]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Body</span>
        <button
          onClick={onToggleEdit}
          className={cls(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all',
            editing
              ? 'bg-amber-500/15 border-amber-500/25 text-amber-300'
              : 'border-white/10 text-slate-500 hover:text-white hover:border-white/20',
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
          className="w-full bg-black/30 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-slate-200 leading-relaxed outline-none resize-none focus:border-amber-400/50 min-h-[220px] transition-colors"
          style={{ fontFamily: 'inherit' }}
          spellCheck
          autoFocus
        />
      ) : (
        <div className="bg-white/3 border border-white/6 rounded-xl px-4 py-4 min-h-[220px] cursor-text" onClick={onToggleEdit}>
          {value
            ? <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{value}</p>
            : <p className="text-slate-600 italic text-sm">No body yet.</p>
          }
        </div>
      )}

      {editing && (
        <p className="text-[10px] text-slate-600 mt-1 text-right">
          {value.length} chars Â· {value.split('\n').length} lines â€” click outside to finish
        </p>
      )}
    </div>
  );
};

/* â•â•â•â•const EmailComposer = ({ conf, senderRole = 'organizer', onOpenEmailSettings }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const confId = conf?.conference_id ?? conf?.id;

  /* â”€â”€ conference sender info â”€â”€ */
  const [senderAddress, setSenderAddress] = useState('');
  const [senderName, setSenderName] = useState('');
  const [gmailConfigured, setGmailConfigured] = useState(false);

  /* â”€â”€ members â”€â”€ */
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  /* â”€â”€ step â”€â”€ */
  const [step, setStep] = useState('compose');

  /* â”€â”€ recipients â”€â”€ */
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [customEmailList, setCustomEmailList] = useState([]);
  const [customInput, setCustomInput] = useState('');

  /* â”€â”€ content â”€â”€ */
  const [subject, setSubject] = useState('');
  const [intent, setIntent] = useState('');
  const [tone, setTone] = useState('formal');
  const [body, setBody] = useState('');
  const [bodyEditing, setBodyEditing] = useState(false);
  const [subjectEditing, setSubjectEditing] = useState(false);

  /* â”€â”€ ui â”€â”€ */
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [genError, setGenError] = useState('');
  const [sendError, setSendError] = useState('');
  const [showRecipients, setShowRecipients] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  /* â”€â”€ load conference sender info â”€â”€ */
  const loadSenderInfo = useCallback(async () => {
    const { data } = await supabase
      .from('conference')
      .select('email_sender_address, email_sender_name, gmail_client_id, gmail_refresh_token, email_use_default')
      .eq('conference_id', confId)
      .single();

    if (data) {
      const useDefault = data.email_use_default !== false;
      if (useDefault) {
        setSenderAddress(process.env.REACT_APP_DEFAULT_SENDER_EMAIL || 'noreply@conferencehub.app');
        setSenderName(process.env.REACT_APP_DEFAULT_SENDER_NAME || 'Conference Hub');
        setGmailConfigured(true);
      } else {
        setSenderAddress(data.email_sender_address || '');
        setSenderName(data.email_sender_name || conf.title || '');
        setGmailConfigured(!!(data.email_sender_address && data.gmail_client_id && data.gmail_refresh_token));
      }
    }
  }, [confId, conf.title]);

  /* â”€â”€ fetch members â”€â”€ */
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    const { data } = await supabase
      .from('conference_user')
      .select('id, user_id, role, email, full_name, users(user_name, user_email)')
      .eq('conference_id', confId);

    setMembers((data || []).map(m => ({
      ...m,
      email: m.email || m.users?.user_email || '',
      full_name: m.full_name || m.users?.user_name || '',
    })));
    setLoadingMembers(false);
  }, [confId]);

  useEffect(() => {
    loadSenderInfo();
    fetchMembers();
  }, [loadSenderInfo, fetchMembers]);

  /* â”€â”€ derived recipients â”€â”€ */
  const resolvedRecipients = (() => {
    const emails = new Set();
    selectedGroups.forEach(group => {
      if (group === 'all') members.forEach(m => m.email && emails.add(m.email));
      else if (group === 'custom') customEmailList.forEach(e => emails.add(e));
      else members.filter(m => m.role === group && m.email).forEach(m => emails.add(m.email));
    });
    return [...emails];
  })();

  /* â”€â”€ helpers â”€â”€ */
  const toggleGroup = key =>
    setSelectedGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const addCustomEmail = () => {
    const v = customInput.trim().toLowerCase();
    if (!v || customEmailList.includes(v) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return;
    setCustomEmailList(p => [...p, v]);
    setCustomInput('');
  };

  /* â”€â”€ generate â”€â”€ */
  const generateEmail = async () => {
    if (!intent.trim()) return;
    setGenerating(true);
    setGenError('');
    setBody('');
    setBodyEditing(false);

    try {
      const recipientDescription = selectedGroups
        .map(g => RECIPIENT_GROUPS.find(r => r.key === g)?.label).filter(Boolean).join(', ')
        || 'conference members';

      const res = await fetch('http://localhost:4000/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent, tone, subject,
          recipientDescription,
          conferenceTitle: conf?.title || 'the conference',
          senderRole,
        }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setBody(data.body || '');
      if (!subject && data.subject) setSubject(data.subject);
      setStep('preview');
    } catch {
      setGenError('Failed to generate. Make sure your backend is running on port 4000.');
    }
    setGenerating(false);
  };

  /* â”€â”€ send â”€â”€ */
  const sendEmail = async () => {
    if (!resolvedRecipients.length || !body.trim()) return;
    setSending(true);
    setSendError('');

    try {
      const res = await fetch('http://localhost:4000/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // conferenceId: confId,   // backend fetches creds from DB using this
          to: resolvedRecipients,
          subject,
          body,
          senderRole,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Send failed');
      }
      const result = await res.json();
      setSentCount(result.sent || resolvedRecipients.length);
      setStep('sent');
    } catch (err) {
      setSendError(err.message || 'Failed to send. Check your backend and Gmail credentials.');
    }
    setSending(false);
  };

  /* â”€â”€ copy â”€â”€ */
  const copyBody = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* â”€â”€ reset â”€â”€ */
  const reset = () => {
    setStep('compose');
    setSelectedGroups([]);
    setCustomEmailList([]);
    setCustomInput('');
    setSubject('');
    setIntent('');
    setTone('formal');
    setBody('');
    setBodyEditing(false);
    setSubjectEditing(false);
    setGenError('');
    setSendError('');
    setSentCount(0);
  };

  /* â”€â”€ shared primitives but theme aware â”€â”€ */
  const Field = ({ label, hint, children }) => (
    <div>
      <div className="flex items-baseline justify-between mb-1.5 px-0.5">
        <label className={cls("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-slate-500" : "text-zinc-500")}>{label}</label>
        {hint && <span className={cls("text-[10px] italic", isDark ? "text-slate-600" : "text-zinc-400")}>{hint}</span>}
      </div>
      {children}
    </div>
  );

  const Input = ({ className, ...props }) => (
    <input {...props} className={cls(
      'w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-200 outline-none border',
      isDark
        ? 'bg-white/5 border-white/8 text-white placeholder-slate-600 focus:border-indigo-500 focus:bg-white/10'
        : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-amber-500 focus:bg-white',
      className,
    )} />
  );

  const EmailBodyEditor = ({ value, onChange, editing, onToggleEdit }) => {
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
            {value.length} chars Â· {value.split('\n').length} lines â€” click outside to finish
          </p>
        )}
      </div>
    );
  };

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â• RENDER â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  return (
    <div className={cls("space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700", isDark ? "text-white" : "text-zinc-900")} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className={cls("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-zinc-900")}>Email Composer</h2>
          <p className={cls("text-sm mt-0.5", isDark ? "text-slate-500" : "text-zinc-500")}>AI-drafted, fully editable conference emails</p>
        </div>
        <div className="flex items-center gap-2">
          {step !== 'compose' && (
            <button
              onClick={() => { setStep('compose'); setBodyEditing(false); }}
              className={cls(
                "flex items-center gap-1.5 text-xs font-bold border px-3 py-1.5 rounded-lg transition-all",
                isDark ? "text-slate-500 hover:text-white border-white/8 hover:border-white/20" : "text-zinc-500 hover:text-zinc-900 border-zinc-200 hover:border-zinc-300"
              )}
            >
              <ArrowLeft size={12} /> Back
            </button>
          )}
          {onOpenEmailSettings && (
            <button
              onClick={onOpenEmailSettings}
              className={cls(
                "flex items-center gap-1.5 text-xs font-bold border px-3 py-1.5 rounded-lg transition-all",
                isDark ? "text-slate-500 hover:text-white border-white/8 hover:border-white/20" : "text-zinc-500 hover:text-zinc-900 border-zinc-200 hover:border-zinc-300"
              )}
            >
              <Settings size={12} /> Email Settings
            </button>
          )}
        </div>
      </div>

      {/* Sender banner */}
      {gmailConfigured ? (
        <div className={cls(
          "flex items-center gap-3 border rounded-xl px-4 py-3 transition-colors",
          isDark ? "bg-emerald-950/30 border-emerald-500/20" : "bg-emerald-50 border-emerald-100"
        )}>
          <div className={cls("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", isDark ? "bg-emerald-500/15" : "bg-emerald-500/10")}>
            <Mail size={13} className="text-emerald-500" />
          </div>
          <div className="text-xs">
            <span className={isDark ? "text-slate-400" : "text-zinc-500"}>Sending from </span>
            <span className={cls("font-semibold", isDark ? "text-white" : "text-zinc-900")}>{senderName}</span>
            <span className={cls("ml-1", isDark ? "text-slate-600" : "text-zinc-300")}>Â·</span>
            <span className="text-emerald-500 font-mono ml-1 font-medium">{senderAddress}</span>
          </div>
        </div>
      ) : (
        <div className={cls(
          "flex items-center justify-between gap-3 border rounded-xl px-4 py-3",
          isDark ? "bg-amber-950/30 border-amber-500/20" : "bg-amber-50 border-amber-100"
        )}>
          <div className="flex items-center gap-2 text-xs">
            <AlertCircle size={13} className="text-amber-500 shrink-0" />
            <span className={cls("font-semibold", isDark ? "text-amber-300" : "text-amber-700")}>No sender Gmail configured.</span>
            <span className={isDark ? "text-slate-500" : "text-zinc-500"}>Emails cannot be sent until you set up a Gmail account.</span>
          </div>
          {onOpenEmailSettings && (
            <button
              onClick={onOpenEmailSettings}
              className={cls(
                "text-xs font-bold border px-3 py-1.5 rounded-lg transition-all whitespace-nowrap",
                isDark ? "text-amber-400 hover:text-amber-300 border-amber-500/30 hover:border-amber-500/50" : "text-amber-600 hover:text-amber-700 border-amber-200 hover:border-amber-300 bg-white"
              )}
            >
              Configure â†’
            </button>
          )}
        </div>
      )}

      {/* â”€â”€ SENT â”€â”€ */}
      {step === 'sent' && (
        <div className={cls(
          "border rounded-2xl p-12 text-center transition-all animate-in zoom-in-95 duration-500",
          isDark ? "bg-emerald-950/40 border-emerald-500/25" : "bg-white border-emerald-100 shadow-xl shadow-emerald-500/5"
        )}>
          <div className={cls("w-16 h-16 border rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform hover:scale-105 duration-300", isDark ? "bg-emerald-500/15 border-emerald-500/20" : "bg-emerald-50 border-emerald-100")}>
            <Check size={32} className="text-emerald-500" />
          </div>
          <h3 className={cls("text-xl font-bold mb-2", isDark ? "text-white" : "text-zinc-900")}>Email Sent!</h3>
          <p className={cls("text-sm mb-1", isDark ? "text-slate-400" : "text-zinc-500")}>
            Delivered to <span className={cls("font-semibold", isDark ? "text-white" : "text-zinc-800")}>{sentCount}</span> recipient{sentCount !== 1 ? 's' : ''} from
            <span className="text-emerald-500 font-mono ml-1 font-medium">{senderAddress}</span>
          </p>
          <p className={cls("text-xs mb-8", isDark ? "text-slate-600" : "text-zinc-400")}>Subject: {subject}</p>
          <button onClick={reset} className={cls("px-7 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-95", isDark ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20" : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20")}>
            Compose Another
          </button>
        </div>
      )}

      {step !== 'sent' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* â”€â”€ LEFT â”€â”€ */}
          <div className="lg:col-span-2 space-y-5">

            {/* Step indicator */}
            <div className="flex items-center gap-3">
              {[{ id: 'compose', label: 'Compose' }, { id: 'preview', label: 'Preview & Send' }].map((s, i) => (
                <React.Fragment key={s.id}>
                  <div className={cls('flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest', step === s.id ? (isDark ? 'text-white' : 'text-zinc-900') : (isDark ? 'text-slate-600' : 'text-zinc-300'))}>
                    <div className={cls(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all',
                      step === s.id
                        ? isDark ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20'
                        : step === 'preview' && s.id === 'compose'
                          ? isDark ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : isDark ? 'border-white/10 text-slate-600' : 'border-zinc-100 text-zinc-300',
                    )}>
                      {step === 'preview' && s.id === 'compose' ? <Check size={10} /> : i + 1}
                    </div>
                    {s.label}
                  </div>
                  {i === 0 && <div className={cls("flex-1 h-px", isDark ? "bg-white/8" : "bg-zinc-100")} />}
                </React.Fragment>
              ))}
            </div>

            {/* â•â• COMPOSE â•â• */}
            {step === 'compose' && (
              <div className={cls(
                "border rounded-2xl p-6 space-y-6 transition-all duration-500",
                isDark ? "bg-[#0d1117]/80 border-white/6 backdrop-blur-md" : "bg-white border-zinc-200 shadow-sm"
              )}>

                <Field label="Send To" hint={loadingMembers ? 'Loadingâ€¦' : `${members.length} members`}>
                  <div className="flex flex-wrap gap-2">
                    {RECIPIENT_GROUPS.map(({ key, label, color, bg }) => {
                      const isSelected = selectedGroups.includes(key);
                      const count = key === 'all' ? members.filter(m => m.email).length
                        : key === 'custom' ? customEmailList.length
                          : members.filter(m => m.role === key && m.email).length;
                      return (
                        <button
                          key={key}
                          onClick={() => toggleGroup(key)}
                          className={cls(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95',
                            isSelected
                              ? cls(bg, color)
                              : isDark ? 'border-white/8 text-slate-500 hover:border-white/20 hover:text-slate-300' : 'border-zinc-200 text-zinc-400 hover:border-zinc-300 hover:text-zinc-600',
                          )}
                        >
                          {isSelected && <Check size={9} />}
                          {label}
                          {key !== 'custom' && count > 0 && (
                            <span className={cls('text-[9px] px-1.5 py-0.5 rounded-full font-bold', (isSelected ? (isDark ? 'bg-white/20' : 'bg-white/40') : (isDark ? 'bg-white/8' : 'bg-zinc-100')))}>{count}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {selectedGroups.includes('custom') && (
                  <Field label="Custom Email Addresses">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          className={cls(
                            "flex-1 rounded-xl px-4 py-2.5 text-sm transition-all duration-200 outline-none border",
                            isDark
                              ? "bg-white/5 border-white/8 text-white placeholder-slate-600 focus:border-pink-500 focus:bg-white/10"
                              : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-pink-500 focus:bg-white"
                          )}
                          placeholder="someone@example.com"
                          value={customInput}
                          onChange={e => setCustomInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addCustomEmail()}
                        />
                        <button onClick={addCustomEmail} className="bg-pink-600 hover:bg-pink-500 text-white px-3 rounded-xl transition-all shadow-lg shadow-pink-500/20 active:scale-95">
                          <Plus size={14} />
                        </button>
                      </div>
                      {customEmailList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {customEmailList.map(email => (
                            <span key={email} className={cls("flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs", isDark ? "bg-white/5 border-white/8 text-slate-300" : "bg-zinc-100 border-zinc-200 text-zinc-700")}>
                              <Mail size={10} className={isDark ? "text-slate-500" : "text-zinc-400"} />
                              {email}
                              <button onClick={() => setCustomEmailList(p => p.filter(e => e !== email))} className="text-slate-500 hover:text-red-500 transition-colors"><X size={10} /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Field>
                )}

                <Field label="Subject" hint="Leave blank â€” AI will suggest one">
                  <Input
                    placeholder="e.g. Important Update Regarding Your Submissionâ€¦"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  />
                </Field>

                <Field label="Tone">
                  <div className="flex flex-wrap gap-2">
                    {TONE_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setTone(key)}
                        className={cls(
                          'px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95',
                          tone === key
                            ? isDark ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20'
                            : isDark ? 'border-white/8 text-slate-500 hover:border-white/20 hover:text-white' : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-900 bg-white',
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="What do you want to communicate?">
                  <div className="space-y-2">
                    <textarea
                      className={cls(
                        "w-full rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none resize-none transition-all duration-300 border h-28",
                        isDark ? "bg-white/5 border-white/8 text-white placeholder-slate-600" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white"
                      )}
                      placeholder={'Describe the email purposeâ€¦\n\nBe specific for better AI results.'}
                      value={intent}
                      onChange={e => setIntent(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {INTENT_TEMPLATES.map(t => (
                        <button
                          key={t}
                          onClick={() => setIntent(t)}
                          className={cls(
                            "text-[10px] px-2.5 py-1 rounded-lg border transition-all active:scale-95",
                            isDark ? "border-white/6 text-slate-600 hover:text-slate-300 hover:border-white/15 bg-white/2" : "border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 bg-zinc-50"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </Field>

                {genError && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 animate-in shake duration-500">
                    <AlertCircle size={14} /> {genError}
                  </div>
                )}

                <button
                  onClick={generateEmail}
                  disabled={generating || !intent.trim() || selectedGroups.length === 0}
                  className={cls(
                    "w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed",
                    isDark ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20" : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                  )}
                >
                  {generating
                    ? <><Loader2 size={16} className="animate-spin" /> Generating with AIâ€¦</>
                    : <><Sparkles size={16} className="fill-white" /> Generate Email with AI</>}
                </button>
              </div>
            )}

            {/* â•â• PREVIEW â•â• */}
            {step === 'preview' && (
              <div className={cls(
                "border rounded-2xl overflow-hidden transition-all duration-500 animate-in slide-in-from-right-4",
                isDark ? "bg-[#0d1117]/80 border-white/6 backdrop-blur-md" : "bg-white border-zinc-200 shadow-sm"
              )}>

                <div className={cls("flex items-center justify-between px-6 py-4 border-b", isDark ? "border-white/6 bg-white/2" : "border-zinc-100 bg-zinc-50/50")}>
                  <div className="flex items-center gap-2">
                    <Eye size={14} className={isDark ? "text-indigo-400" : "text-amber-500"} />
                    <span className={cls("text-sm font-bold tracking-tight", isDark ? "text-white" : "text-zinc-900")}>Preview & Edit</span>
                    <span className={cls("text-[10px] border px-2 py-0.5 rounded-md font-bold", isDark ? "text-slate-600 border-white/8 bg-white/3" : "text-zinc-400 border-zinc-200 bg-zinc-100")}>
                      LIVE EDITING
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={copyBody} className={cls("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95", isDark ? "border-white/8 text-slate-500 hover:text-white hover:border-white/20" : "border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 bg-white")}>
                      {copied ? <><CheckCheck size={11} className="text-emerald-500" /> Copied!</> : <><Copy size={11} /> Copy</>}
                    </button>
                    <button onClick={() => { setStep('compose'); setBodyEditing(false); }} className={cls("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all active:scale-95", isDark ? "border-white/8 text-slate-500 hover:text-white hover:border-white/20" : "border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:border-zinc-300 bg-white")}>
                      <RefreshCw size={11} /> Regenerate
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Subject */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                      <span className={cls("text-[10px] uppercase tracking-wider font-bold", isDark ? "text-slate-600" : "text-zinc-500")}>Subject</span>
                      <button
                        onClick={() => setSubjectEditing(v => !v)}
                        className={cls(
                          'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition-all',
                          subjectEditing
                            ? isDark ? 'bg-amber-500/15 border-amber-500/25 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'
                            : isDark ? 'border-white/8 text-slate-600 hover:text-white' : 'border-zinc-200 text-zinc-500 hover:text-zinc-900 bg-white',
                        )}
                      >
                        <Edit3 size={9} /> {subjectEditing ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {subjectEditing ? (
                      <input
                        autoFocus
                        className={cls(
                          "w-full rounded-xl px-4 py-2.5 text-sm font-bold outline-none border transition-all",
                          isDark ? "bg-black/30 border-amber-500/30 text-white focus:border-amber-400/50" : "bg-white border-amber-200 text-zinc-900 shadow-sm"
                        )}
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        onBlur={() => setSubjectEditing(false)}
                        onKeyDown={e => e.key === 'Enter' && setSubjectEditing(false)}
                      />
                    ) : (
                      <div
                        className={cls(
                          "rounded-xl px-4 py-2.5 text-sm font-bold border transition-all cursor-text",
                          isDark ? "bg-white/3 border-white/6 text-white hover:border-white/12" : "bg-zinc-50 border-zinc-100 text-zinc-900 hover:border-zinc-200"
                        )}
                        onClick={() => setSubjectEditing(true)}
                      >
                        {subject || <span className={cls("font-normal italic", isDark ? "text-slate-600" : "text-zinc-400")}>No subject â€” click to add</span>}
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <EmailBodyEditor
                    value={body}
                    onChange={setBody}
                    editing={bodyEditing}
                    onToggleEdit={() => setBodyEditing(v => !v)}
                  />

                  {!bodyEditing && (
                    <p className={cls("text-[10px] text-center font-medium", isDark ? "text-slate-600" : "text-zinc-400")}>
                      Click <span className="text-amber-500 font-bold">Edit</span> or the body text to modify â€” send when ready.
                    </p>
                  )}
                </div>

                {/* Send bar */}
                <div className={cls("px-6 pb-6 pt-2 border-t space-y-3", isDark ? "border-white/5" : "border-zinc-100")}>
                  {sendError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                      <AlertCircle size={14} /> {sendError}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className={cls("flex-1 rounded-xl px-4 py-2.5 border", isDark ? "bg-white/3 border-white/6" : "bg-zinc-50 border-zinc-100")}>
                      <div className={cls("text-[9px] uppercase tracking-widest font-bold mb-0.5", isDark ? "text-slate-600" : "text-zinc-400")}>Sending via</div>
                      <div className="text-xs font-semibold flex items-center justify-between">
                        {gmailConfigured
                          ? <span className="text-emerald-500 font-mono text-[11px] font-bold">{senderAddress}</span>
                          : <span className="text-amber-600 text-[11px] font-bold">âš  No sender configured</span>}
                        <span className={cls("text-[10px]", isDark ? "text-slate-500" : "text-zinc-400")}>{resolvedRecipients.length} recipient{resolvedRecipients.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <button
                      onClick={sendEmail}
                      disabled={sending || resolvedRecipients.length === 0 || !body.trim() || !gmailConfigured}
                      className={cls(
                        "flex items-center gap-2 text-white px-6 py-3.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap shadow-xl active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed",
                        isDark ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10"
                      )}
                      title={!gmailConfigured ? 'Configure a sender Gmail in Email Settings first' : ''}
                    >
                      {sending
                        ? <><Loader2 size={16} className="animate-spin" /> Sendingâ€¦</>
                        : <><Send size={16} /> Send via Gmail</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* â”€â”€ RIGHT sidebar â”€â”€ */}
          <div className="space-y-4">
            <div className={cls(
              "border rounded-2xl p-5 transition-all duration-500",
              isDark ? "bg-[#0d1117]/80 border-white/6 backdrop-blur-md" : "bg-white border-zinc-200 shadow-sm"
            )}>
              <button className="w-full flex items-center justify-between mb-3" onClick={() => setShowRecipients(v => !v)}>
                <span className={cls("text-[10px] uppercase tracking-widest font-bold", isDark ? "text-slate-600" : "text-zinc-500")}>Recipients</span>
                <div className="flex items-center gap-2">
                  <span className={cls("text-xs font-bold", isDark ? "text-indigo-400" : "text-amber-600")}>{resolvedRecipients.length} email{resolvedRecipients.length !== 1 ? 's' : ''}</span>
                  {showRecipients ? <ChevronUp size={13} className={isDark ? "text-slate-600" : "text-zinc-400"} /> : <ChevronDown size={13} className={isDark ? "text-slate-600" : "text-zinc-400"} />}
                </div>
              </button>

              {resolvedRecipients.length === 0 ? (
                <p className={cls("text-xs italic", isDark ? "text-slate-600" : "text-zinc-400")}>Select recipient groups above</p>
              ) : (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex flex-wrap gap-1 mb-4">
                    {selectedGroups.map(g => {
                      const group = RECIPIENT_GROUPS.find(r => r.key === g);
                      return group ? (
                        <span key={g} className={cls('text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase transition-colors', group.bg, group.color)}>{group.label}</span>
                      ) : null;
                    })}
                  </div>
                  {showRecipients && (
                    <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {resolvedRecipients.map((email, i) => {
                        const m = members.find(x => x.email === email);
                        return (
                          <div key={i} className={cls("flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors", isDark ? "bg-white/3 hover:bg-white/6" : "bg-zinc-50 hover:bg-zinc-100")}>
                            <div className={cls("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm", isDark ? "bg-gradient-to-br from-indigo-500 to-purple-600" : "bg-gradient-to-br from-amber-400 to-orange-500")}>
                              {(m?.full_name || email)[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              {m?.full_name && <div className={cls("text-[10px] font-bold truncate", isDark ? "text-slate-300" : "text-zinc-800")}>{m.full_name}</div>}
                              <div className={cls("text-[9px] truncate font-medium", isDark ? "text-slate-500" : "text-zinc-400")}>{email}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {step === 'preview' && (
              <div className={cls(
                "border rounded-2xl p-5 space-y-3 animate-in fade-in slide-in-from-bottom-2",
                isDark ? "bg-[#0d1117]/80 border-white/6" : "bg-white border-zinc-200 shadow-sm"
              )}>
                <div className={cls("text-[10px] uppercase tracking-widest font-bold", isDark ? "text-slate-600" : "text-zinc-500")}>Summary</div>
                {[
                  { label: 'Tone', value: tone, vc: isDark ? 'text-white' : 'text-zinc-900', isCap: true },
                  { label: 'Recipients', value: `${resolvedRecipients.length} emails`, vc: isDark ? 'text-indigo-400' : 'text-amber-600' },
                  { label: 'Body', value: bodyEditing ? 'Editingâ€¦' : 'Ready', vc: bodyEditing ? (isDark ? 'text-amber-400' : 'text-amber-600') : 'text-emerald-500' },
                  { label: 'Sender', value: senderAddress || 'Not set', vc: gmailConfigured ? 'text-emerald-500' : (isDark ? 'text-amber-400' : 'text-amber-600'), isMono: true },
                ].map(({ label, value, vc, isCap, isMono }) => (
                  <div key={label} className="flex justify-between items-center text-xs">
                    <span className={isDark ? "text-slate-500" : "text-zinc-400"}>{label}</span>
                    <span className={cls('font-bold', vc, isCap && 'capitalize', isMono && 'font-mono text-[10px]')}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className={cls(
              "rounded-2xl p-5 border transition-all duration-500",
              isDark ? "bg-indigo-500/5 border-indigo-500/15 shadow-inner" : "bg-amber-50 border-amber-100 shadow-sm"
            )}>
              <div className={cls("text-[10px] uppercase tracking-widest font-bold mb-3", isDark ? "text-indigo-400/70" : "text-amber-700/70")}>Pro Tips</div>
              <ul className={cls("space-y-3 text-[10px] leading-relaxed font-medium", isDark ? "text-slate-500" : "text-zinc-600")}>
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold">â€¢</span>
                  <span>Click <span className={isDark ? "text-amber-300" : "text-amber-600 font-bold"}>Edit</span> on subject or body to modify AI output</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold">â€¢</span>
                  <span>Emails are sent from your conference's linked Gmail</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold">â€¢</span>
                  <span>Each conference has its own sender address</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-500 font-bold">â€¢</span>
                  <span>Add custom emails to reach speakers outside the platform</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
0/70 uppercase tracking-wider font-bold mb-3">Tips</div>
              <ul className="space-y-2 text-[11px] text-slate-500 leading-relaxed">
                <li>â€¢ Click <span className="text-amber-300">Edit</span> on subject or body to modify AI output</li>
                <li>â€¢ Emails are sent from your conference's linked Gmail</li>
                <li>â€¢ Each conference has its own sender address</li>
                <li>â€¢ Add custom emails to reach speakers outside the platform</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailComposer;
