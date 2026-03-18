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
  { key: 'all',       label: 'All Members', color: 'text-indigo-400',  bg: 'bg-indigo-500/10  border-indigo-500/25'  },
  { key: 'organizer', label: 'Organizers',  color: 'text-violet-400',  bg: 'bg-violet-500/10  border-violet-500/25'  },
  { key: 'reviewer',  label: 'Reviewers',   color: 'text-amber-400',   bg: 'bg-amber-500/10   border-amber-500/25'   },
  { key: 'presenter', label: 'Presenters',  color: 'text-blue-400',    bg: 'bg-blue-500/10    border-blue-500/25'    },
  { key: 'member',    label: 'Guests',      color: 'text-slate-400',   bg: 'bg-slate-500/10   border-slate-500/25'   },
  { key: 'custom',    label: 'Custom',      color: 'text-pink-400',    bg: 'bg-pink-500/10    border-pink-500/25'    },
];

const TONE_OPTIONS = [
  { key: 'formal',        label: 'Formal'        },
  { key: 'friendly',      label: 'Friendly'      },
  { key: 'urgent',        label: 'Urgent'        },
  { key: 'celebratory',   label: 'Celebratory'   },
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

/* ─── small primitives ─────────────────────────────────── */
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

/* ─── auto-resizing editable body ──────────────────────── */
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
          {value.length} chars · {value.split('\n').length} lines — click outside to finish
        </p>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const EmailComposer = ({ conf, senderRole = 'organizer', onOpenEmailSettings }) => {
  useApp();
  const confId = conf?.conference_id ?? conf?.id;

  /* ── conference sender info ── */
  const [senderAddress, setSenderAddress] = useState('');
  const [senderName, setSenderName]       = useState('');
  const [gmailConfigured, setGmailConfigured] = useState(false);

  /* ── members ── */
  const [members, setMembers]             = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  /* ── step ── */
  const [step, setStep] = useState('compose');

  /* ── recipients ── */
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [customEmailList, setCustomEmailList] = useState([]);
  const [customInput, setCustomInput]     = useState('');

  /* ── content ── */
  const [subject, setSubject]   = useState('');
  const [intent, setIntent]     = useState('');
  const [tone, setTone]         = useState('formal');
  const [body, setBody]         = useState('');
  const [bodyEditing, setBodyEditing] = useState(false);
  const [subjectEditing, setSubjectEditing] = useState(false);

  /* ── ui ── */
  const [generating, setGenerating] = useState(false);
  const [sending, setSending]       = useState(false);
  const [genError, setGenError]     = useState('');
  const [sendError, setSendError]   = useState('');
  const [showRecipients, setShowRecipients] = useState(false);
  const [copied, setCopied]         = useState(false);
  const [sentCount, setSentCount]   = useState(0);

  /* ── load conference sender info ── */
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

  /* ── fetch members ── */
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    const { data } = await supabase
      .from('conference_user')
      .select('id, user_id, role, email, full_name, users(user_name, user_email)')
      .eq('conference_id', confId);

    setMembers((data || []).map(m => ({
      ...m,
      email:     m.email     || m.users?.user_email || '',
      full_name: m.full_name || m.users?.user_name  || '',
    })));
    setLoadingMembers(false);
  }, [confId]);

  useEffect(() => {
    loadSenderInfo();
    fetchMembers();
  }, [loadSenderInfo, fetchMembers]);

  /* ── derived recipients ── */
  const resolvedRecipients = (() => {
    const emails = new Set();
    selectedGroups.forEach(group => {
      if (group === 'all')         members.forEach(m => m.email && emails.add(m.email));
      else if (group === 'custom') customEmailList.forEach(e => emails.add(e));
      else                         members.filter(m => m.role === group && m.email).forEach(m => emails.add(m.email));
    });
    return [...emails];
  })();

  /* ── helpers ── */
  const toggleGroup = key =>
    setSelectedGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const addCustomEmail = () => {
    const v = customInput.trim().toLowerCase();
    if (!v || customEmailList.includes(v) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return;
    setCustomEmailList(p => [...p, v]);
    setCustomInput('');
  };

  /* ── generate ── */
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

  /* ── send ── */
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

  /* ── copy ── */
  const copyBody = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── reset ── */
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

  /* ══════════════ RENDER ══════════════ */
  return (
    <div className="space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Email Composer</h2>
          <p className="text-slate-500 text-sm mt-0.5">AI-drafted, fully editable conference emails</p>
        </div>
        <div className="flex items-center gap-2">
          {step !== 'compose' && (
            <button
              onClick={() => { setStep('compose'); setBodyEditing(false); }}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-white border border-white/8 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
            >
              <ArrowLeft size={12} /> Back
            </button>
          )}
          {/* Link to email settings */}
          {onOpenEmailSettings && (
            <button
              onClick={onOpenEmailSettings}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-white border border-white/8 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
            >
              <Settings size={12} /> Email Settings
            </button>
          )}
        </div>
      </div>

      {/* Sender banner */}
      {gmailConfigured ? (
        <div className="flex items-center gap-3 bg-emerald-950/30 border border-emerald-500/20 rounded-xl px-4 py-3">
          <div className="w-7 h-7 bg-emerald-500/15 rounded-lg flex items-center justify-center shrink-0">
            <Mail size={13} className="text-emerald-400" />
          </div>
          <div className="text-xs">
            <span className="text-slate-400">Sending from </span>
            <span className="text-white font-semibold">{senderName}</span>
            <span className="text-slate-600 ml-1">·</span>
            <span className="text-emerald-400 font-mono ml-1">{senderAddress}</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 bg-amber-950/30 border border-amber-500/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-xs">
            <AlertCircle size={13} className="text-amber-400 shrink-0" />
            <span className="text-amber-300 font-semibold">No sender Gmail configured.</span>
            <span className="text-slate-500">Emails cannot be sent until you set up a Gmail account.</span>
          </div>
          {onOpenEmailSettings && (
            <button
              onClick={onOpenEmailSettings}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 border border-amber-500/30 hover:border-amber-500/50 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
            >
              Configure →
            </button>
          )}
        </div>
      )}

      {/* ── SENT ── */}
      {step === 'sent' && (
        <div className="bg-emerald-950/40 border border-emerald-500/25 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Check size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Email Sent!</h3>
          <p className="text-slate-400 text-sm mb-1">
            Delivered to <span className="text-white font-semibold">{sentCount}</span> recipient{sentCount !== 1 ? 's' : ''} from
            <span className="text-emerald-400 font-mono ml-1">{senderAddress}</span>
          </p>
          <p className="text-slate-600 text-xs mb-8">Subject: {subject}</p>
          <button onClick={reset} className="bg-indigo-600 hover:bg-indigo-500 text-white px-7 py-2.5 rounded-xl font-semibold text-sm transition-colors">
            Compose Another
          </button>
        </div>
      )}

      {step !== 'sent' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Step indicator */}
            <div className="flex items-center gap-3">
              {[{ id: 'compose', label: 'Compose' }, { id: 'preview', label: 'Preview & Send' }].map((s, i) => (
                <React.Fragment key={s.id}>
                  <div className={cls('flex items-center gap-2 text-xs font-bold uppercase tracking-wider', step === s.id ? 'text-white' : 'text-slate-600')}>
                    <div className={cls(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border',
                      step === s.id ? 'bg-indigo-600 border-indigo-500 text-white'
                        : step === 'preview' && s.id === 'compose' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                          : 'border-white/10 text-slate-600',
                    )}>
                      {step === 'preview' && s.id === 'compose' ? <Check size={10} /> : i + 1}
                    </div>
                    {s.label}
                  </div>
                  {i === 0 && <div className="flex-1 h-px bg-white/8" />}
                </React.Fragment>
              ))}
            </div>

            {/* ══ COMPOSE ══ */}
            {step === 'compose' && (
              <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-6 space-y-5">

                <Field label="Send To" hint={loadingMembers ? 'Loading…' : `${members.length} members`}>
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
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                            isSelected ? cls(bg, color) : 'border-white/8 text-slate-500 hover:border-white/20 hover:text-slate-300',
                          )}
                        >
                          {isSelected && <Check size={9} />}
                          {label}
                          {key !== 'custom' && count > 0 && (
                            <span className={cls('text-[9px] px-1.5 py-0.5 rounded-full font-bold', isSelected ? 'bg-white/20' : 'bg-white/8')}>{count}</span>
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
                          className="flex-1 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-pink-500 transition-colors"
                          placeholder="someone@example.com"
                          value={customInput}
                          onChange={e => setCustomInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addCustomEmail()}
                        />
                        <button onClick={addCustomEmail} className="bg-pink-600 hover:bg-pink-500 text-white px-3 rounded-xl transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                      {customEmailList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {customEmailList.map(email => (
                            <span key={email} className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1 text-xs text-slate-300">
                              <Mail size={10} className="text-slate-500" />
                              {email}
                              <button onClick={() => setCustomEmailList(p => p.filter(e => e !== email))} className="text-slate-600 hover:text-red-400 transition-colors"><X size={10} /></button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Field>
                )}

                <Field label="Subject" hint="Leave blank — AI will suggest one">
                  <Input
                    placeholder="e.g. Important Update Regarding Your Submission…"
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
                          'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                          tone === key ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/8 text-slate-500 hover:border-white/20 hover:text-white',
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
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none resize-none text-white placeholder-slate-600 transition-colors h-28"
                      placeholder={'Describe the email purpose…\n\nBe specific for better AI results.'}
                      value={intent}
                      onChange={e => setIntent(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {INTENT_TEMPLATES.map(t => (
                        <button
                          key={t}
                          onClick={() => setIntent(t)}
                          className="text-[10px] px-2.5 py-1 rounded-lg border border-white/6 text-slate-600 hover:text-slate-300 hover:border-white/15 transition-all bg-white/2"
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </Field>

                {genError && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                    <AlertCircle size={14} /> {genError}
                  </div>
                )}

                <button
                  onClick={generateEmail}
                  disabled={generating || !intent.trim() || selectedGroups.length === 0}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  {generating
                    ? <><Loader2 size={15} className="animate-spin" /> Generating with AI…</>
                    : <><Sparkles size={15} /> Generate Email with AI</>}
                </button>
              </div>
            )}

            {/* ══ PREVIEW ══ */}
            {step === 'preview' && (
              <div className="bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden">

                <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 bg-white/2">
                  <div className="flex items-center gap-2">
                    <Eye size={14} className="text-indigo-400" />
                    <span className="text-sm font-semibold text-white">Preview & Edit</span>
                    <span className="text-[10px] text-slate-600 border border-white/8 px-2 py-0.5 rounded-md bg-white/3">
                      Edits are live — no save needed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={copyBody} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-white/8 text-slate-500 hover:text-white hover:border-white/20 transition-all">
                      {copied ? <><CheckCheck size={11} className="text-emerald-400" /> Copied!</> : <><Copy size={11} /> Copy</>}
                    </button>
                    <button onClick={() => { setStep('compose'); setBodyEditing(false); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-white/8 text-slate-500 hover:text-white hover:border-white/20 transition-all">
                      <RefreshCw size={11} /> Regenerate
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Subject */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Subject</span>
                      <button
                        onClick={() => setSubjectEditing(v => !v)}
                        className={cls(
                          'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border transition-all',
                          subjectEditing ? 'bg-amber-500/15 border-amber-500/25 text-amber-400' : 'border-white/8 text-slate-600 hover:text-white',
                        )}
                      >
                        <Edit3 size={9} /> {subjectEditing ? 'Done' : 'Edit'}
                      </button>
                    </div>
                    {subjectEditing ? (
                      <input
                        autoFocus
                        className="w-full bg-black/30 border border-amber-500/30 rounded-xl px-4 py-2.5 text-sm text-white font-semibold outline-none focus:border-amber-400/50 transition-colors"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        onBlur={() => setSubjectEditing(false)}
                        onKeyDown={e => e.key === 'Enter' && setSubjectEditing(false)}
                      />
                    ) : (
                      <div
                        className="bg-white/3 border border-white/6 rounded-xl px-4 py-2.5 text-sm font-semibold text-white cursor-text hover:border-white/12 transition-colors"
                        onClick={() => setSubjectEditing(true)}
                      >
                        {subject || <span className="text-slate-600 font-normal italic">No subject — click to add</span>}
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
                    <p className="text-[11px] text-slate-600 text-center">
                      Click <span className="text-amber-400 font-semibold">Edit</span> or the body text to modify — send when ready.
                    </p>
                  )}
                </div>

                {/* Send bar */}
                <div className="px-6 pb-6 pt-2 border-t border-white/5 space-y-3">
                  {sendError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                      <AlertCircle size={14} /> {sendError}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white/3 border border-white/6 rounded-xl px-4 py-2.5">
                      <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-0.5">Sending via</div>
                      <div className="text-sm font-semibold">
                        {gmailConfigured
                          ? <span className="text-emerald-400 font-mono text-xs">{senderAddress}</span>
                          : <span className="text-amber-400 text-xs">⚠ No sender configured</span>}
                        <span className="text-slate-500 text-xs ml-2">→ {resolvedRecipients.length} recipient{resolvedRecipients.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <button
                      onClick={sendEmail}
                      disabled={sending || resolvedRecipients.length === 0 || !body.trim() || !gmailConfigured}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap"
                      title={!gmailConfigured ? 'Configure a sender Gmail in Email Settings first' : ''}
                    >
                      {sending
                        ? <><Loader2 size={15} className="animate-spin" /> Sending…</>
                        : <><Send size={15} /> Send via Gmail</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT sidebar ── */}
          <div className="space-y-4">
            <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-5">
              <button className="w-full flex items-center justify-between mb-3" onClick={() => setShowRecipients(v => !v)}>
                <span className="text-[11px] text-slate-600 uppercase tracking-wider font-bold">Recipients</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400">{resolvedRecipients.length} email{resolvedRecipients.length !== 1 ? 's' : ''}</span>
                  {showRecipients ? <ChevronUp size={13} className="text-slate-600" /> : <ChevronDown size={13} className="text-slate-600" />}
                </div>
              </button>

              {resolvedRecipients.length === 0 ? (
                <p className="text-xs text-slate-600 italic">Select recipient groups above</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {selectedGroups.map(g => {
                      const group = RECIPIENT_GROUPS.find(r => r.key === g);
                      return group ? (
                        <span key={g} className={cls('text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase', group.bg, group.color)}>{group.label}</span>
                      ) : null;
                    })}
                  </div>
                  {showRecipients && (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
                      {resolvedRecipients.map((email, i) => {
                        const m = members.find(x => x.email === email);
                        return (
                          <div key={i} className="flex items-center gap-2 bg-white/3 rounded-lg px-2.5 py-1.5">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                              {(m?.full_name || email)[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              {m?.full_name && <div className="text-[11px] text-slate-300 font-medium truncate">{m.full_name}</div>}
                              <div className="text-[10px] text-slate-500 truncate">{email}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {step === 'preview' && (
              <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-5 space-y-2.5">
                <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold mb-1">Summary</div>
                {[
                  { label: 'Tone',        value: tone,                                  cls: 'text-white capitalize' },
                  { label: 'Recipients',  value: `${resolvedRecipients.length} emails`, cls: 'text-indigo-400' },
                  { label: 'Body',        value: bodyEditing ? 'Editing…' : 'Ready',    cls: bodyEditing ? 'text-amber-400' : 'text-emerald-400' },
                  { label: 'Sender',      value: senderAddress || 'Not set',            cls: gmailConfigured ? 'text-emerald-400 font-mono text-[10px]' : 'text-amber-400' },
                ].map(({ label, value, cls: vc }) => (
                  <div key={label} className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">{label}</span>
                    <span className={cls('font-semibold', vc)}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-5">
              <div className="text-[11px] text-indigo-400/70 uppercase tracking-wider font-bold mb-3">Tips</div>
              <ul className="space-y-2 text-[11px] text-slate-500 leading-relaxed">
                <li>• Click <span className="text-amber-300">Edit</span> on subject or body to modify AI output</li>
                <li>• Emails are sent from your conference's linked Gmail</li>
                <li>• Each conference has its own sender address</li>
                <li>• Add custom emails to reach speakers outside the platform</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailComposer;