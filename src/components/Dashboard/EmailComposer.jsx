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
  { key: 'all', label: 'All Members', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/25' },
  { key: 'organizer', label: 'Organizers', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/25' },
  { key: 'reviewer', label: 'Reviewers', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/25' },
  { key: 'presenter', label: 'Presenters', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/25' },
  { key: 'member', label: 'Guests', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/25' },
  { key: 'custom', label: 'Custom', color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/25' },
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
   EMAIL COMPOSER
═══════════════════════════════════════════════════════════════════════════ */
const EmailComposer = ({ conf, senderRole = 'organizer', onOpenEmailSettings }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const confId = conf?.conference_id ?? conf?.id;

  const [senderAddress, setSenderAddress] = useState('');
  const [senderName, setSenderName] = useState('');
  const [gmailConfigured, setGmailConfigured] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [step, setStep] = useState('compose');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [customEmailList, setCustomEmailList] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [subject, setSubject] = useState('');
  const [intent, setIntent] = useState('');
  const [tone, setTone] = useState('formal');
  const [body, setBody] = useState('');
  const [bodyEditing, setBodyEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [genError, setGenError] = useState('');
  const [sendError, setSendError] = useState('');
  const [showRecipients, setShowRecipients] = useState(false);
  const [sentCount, setSentCount] = useState(0);

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

  const resolvedRecipients = (() => {
    const emails = new Set();
    selectedGroups.forEach(group => {
      if (group === 'all') members.forEach(m => m.email && emails.add(m.email));
      else if (group === 'custom') customEmailList.forEach(e => emails.add(e));
      else members.filter(m => m.role === group && m.email).forEach(m => emails.add(m.email));
    });
    return [...emails];
  })();

  const toggleGroup = key =>
    setSelectedGroups(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const addCustomEmail = () => {
    const v = customInput.trim().toLowerCase();
    if (!v || customEmailList.includes(v) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return;
    setCustomEmailList(p => [...p, v]);
    setCustomInput('');
  };

  const generateEmail = async () => {
    if (!intent.trim()) return;
    setGenerating(true);
    setGenError('');
    setBody('');
    try {
      const recipientDescription = selectedGroups
        .map(g => RECIPIENT_GROUPS.find(r => r.key === g)?.label).filter(Boolean).join(', ')
        || 'conference members';

      const res = await fetch('http://localhost:4000/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent, tone, subject, recipientDescription, conferenceTitle: conf?.title, senderRole }),
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

  const sendEmail = async () => {
    if (!resolvedRecipients.length || !body.trim()) return;
    setSending(true);
    setSendError('');
    try {
      const res = await fetch('http://localhost:4000/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: resolvedRecipients, subject, body, senderRole }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Send failed');
      }
      const result = await res.json();
      setSentCount(result.sent || resolvedRecipients.length);
      setStep('sent');
    } catch (err) {
      setSendError(err.message || 'Failed to send.');
    }
    setSending(false);
  };

  const reset = () => {
    setStep('compose');
    setSelectedGroups([]);
    setCustomEmailList([]);
    setSubject('');
    setIntent('');
    setTone('formal');
    setBody('');
    setBodyEditing(false);
    setGenError('');
    setSendError('');
    setSentCount(0);
  };

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
            <span className={cls("ml-1", isDark ? "text-slate-600" : "text-zinc-300")}>·</span>
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
            <span className={isDark ? "text-slate-500" : "text-zinc-500"}>Emails cannot be sent until configured.</span>
          </div>
          {onOpenEmailSettings && (
            <button onClick={onOpenEmailSettings} className={cls("text-xs font-bold border px-3 py-1.5 rounded-lg transition-all", isDark ? "text-amber-400 border-amber-500/30 bg-white/5" : "text-amber-600 border-amber-200 bg-white")}>
              Configure →
            </button>
          )}
        </div>
      )}

      {/* ── SENT ── */}
      {step === 'sent' && (
        <div className={cls(
          "border rounded-2xl p-12 text-center transition-all animate-in zoom-in-95 duration-500",
          isDark ? "bg-emerald-950/40 border-emerald-500/25" : "bg-white border-emerald-100 shadow-xl shadow-emerald-500/5"
        )}>
          <div className={cls("w-16 h-16 border rounded-2xl flex items-center justify-center mx-auto mb-5", isDark ? "bg-emerald-500/15 border-emerald-500/20" : "bg-emerald-50 border-emerald-100 shadow-sm")}>
            <Check size={32} className="text-emerald-500" />
          </div>
          <h3 className={cls("text-xl font-bold mb-2", isDark ? "text-white" : "text-zinc-900")}>Email Sent!</h3>
          <p className={cls("text-sm mb-1", isDark ? "text-slate-400" : "text-zinc-500")}>
            Delivered to <span className={cls("font-semibold", isDark ? "text-white" : "text-zinc-800")}>{sentCount}</span> recipient{sentCount !== 1 ? 's' : ''}
          </p>
          <button onClick={reset} className={cls("mt-8 px-7 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg active:scale-95", isDark ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-amber-500 hover:bg-amber-600 text-white")}>
            Compose Another
          </button>
        </div>
      )}

      {step !== 'sent' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {step === 'compose' && (
              <div className={cls("rounded-2xl p-6 space-y-6 border transition-all", isDark ? "bg-[#0d1117]/80 border-white/6" : "bg-white border-zinc-200 shadow-sm")}>
                <Field label="Send To" hint={loadingMembers ? 'Loading…' : `${members.length} members`} isDark={isDark}>
                  <div className="flex flex-wrap gap-2">
                    {RECIPIENT_GROUPS.map(({ key, label, color, bg }) => {
                      const isSelected = selectedGroups.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => toggleGroup(key)}
                          className={cls(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95',
                            isSelected ? cls(bg, color) : isDark ? 'border-white/8 text-slate-500' : 'border-zinc-200 text-zinc-400',
                          )}
                        >
                          {isSelected && <Check size={9} />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {selectedGroups.includes('custom') && (
                  <Field label="Custom Email Addresses" isDark={isDark}>
                    <div className="flex gap-2">
                      <Input isDark={isDark} placeholder="someone@example.com" value={customInput} onChange={e => setCustomInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomEmail()} />
                      <button onClick={addCustomEmail} className="bg-pink-600 text-white px-4 rounded-xl active:scale-95"><Plus size={14} /></button>
                    </div>
                  </Field>
                )}

                <Field label="Subject" hint="Leave blank — AI will suggest one" isDark={isDark}>
                  <Input isDark={isDark} placeholder="Enter subject…" value={subject} onChange={e => setSubject(e.target.value)} />
                </Field>

                <Field label="What do you want to communicate?" isDark={isDark}>
                  <textarea
                    className={cls(
                      "w-full rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none resize-none transition-all border h-28",
                      isDark ? "bg-white/5 border-white/8 text-white placeholder-slate-600" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400"
                    )}
                    placeholder="Describe the email purpose…"
                    value={intent}
                    onChange={e => setIntent(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {INTENT_TEMPLATES.map(t => (
                      <button key={t} onClick={() => setIntent(t)} className={cls("text-[10px] px-2.5 py-1 rounded-lg border transition-all", isDark ? "border-white/6 text-slate-600 hover:text-slate-300" : "border-zinc-100 text-zinc-400 hover:text-zinc-600 bg-zinc-50")}>
                        {t}
                      </button>
                    ))}
                  </div>
                </Field>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={generateEmail}
                    disabled={generating || !intent.trim() || resolvedRecipients.length === 0}
                    className={cls(
                      "flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-xl active:scale-95 disabled:opacity-40",
                      isDark ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20" : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                    )}
                  >
                    {generating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    {generating ? 'Drafting…' : 'Generate with AI'}
                  </button>
                </div>
              </div>
            )}

            {step === 'preview' && (
              <div className={cls("rounded-2xl p-6 space-y-6 border transition-all", isDark ? "bg-[#0d1117]/80 border-white/6" : "bg-white border-zinc-200 shadow-sm")}>
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={cls("w-10 h-10 rounded-xl flex items-center justify-center", isDark ? "bg-indigo-500/10" : "bg-indigo-50")}>
                      <ChevronUp size={20} className="text-indigo-500" />
                    </div>
                    <div>
                      <h4 className={cls("text-sm font-bold", isDark ? "text-white" : "text-zinc-900")}>Draft Review</h4>
                      <p className={cls("text-xs", isDark ? "text-slate-500" : "text-zinc-400")}>AI generated this content based on your intent</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Field label="Subject" isDark={isDark}>
                    <Input isDark={isDark} value={subject} onChange={e => setSubject(e.target.value)} />
                  </Field>
                  <EmailBodyEditor isDark={isDark} value={body} onChange={setBody} editing={bodyEditing} onToggleEdit={() => setBodyEditing(!bodyEditing)} />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button onClick={() => setStep('compose')} className={cls("text-xs font-bold transition-colors", isDark ? "text-slate-500 hover:text-slate-300" : "text-zinc-400 hover:text-zinc-600")}>← Back to intent</button>
                  <button
                    onClick={sendEmail}
                    disabled={sending || !gmailConfigured || !body.trim()}
                    className={cls(
                      "flex items-center gap-2 text-white px-8 py-3.5 rounded-xl font-bold text-sm transition-all shadow-xl active:scale-95 disabled:opacity-40",
                      isDark ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10"
                    )}
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {sending ? 'Sending…' : 'Finalize & Send'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className={cls("rounded-2xl p-6 border transition-all", isDark ? "bg-[#0d1117]/80 border-white/6" : "bg-white border-zinc-200 shadow-sm")}>
              <h4 className={cls("text-[10px] uppercase tracking-widest font-black mb-4", isDark ? "text-slate-600" : "text-zinc-400")}>Dispatch Context</h4>
              <div className="space-y-4">
                {[
                  { label: 'Recipients', val: `${resolvedRecipients.length} emails` },
                  { label: 'Tone', val: tone, cap: true },
                  { label: 'Intent', val: intent || 'None set', trunc: true },
                ].map(s => (
                  <div key={s.label}>
                    <div className={cls("text-[9px] uppercase tracking-wider mb-1", isDark ? "text-slate-700" : "text-zinc-300")}>{s.label}</div>
                    <div className={cls("text-xs font-bold", isDark ? "text-slate-300" : "text-zinc-700", s.cap && "capitalize", s.trunc && "truncate")}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={cls("rounded-2xl p-6 border transition-all", isDark ? "bg-indigo-500/5 border-indigo-500/15" : "bg-amber-50 border-amber-100")}>
              <h4 className={cls("text-[10px] uppercase tracking-widest font-black mb-3", isDark ? "text-indigo-400" : "text-amber-700")}>Pro Tips</h4>
              <ul className={cls("text-[10px] leading-relaxed space-y-2", isDark ? "text-slate-500" : "text-zinc-600")}>
                <li>• Use specific names in your intent for <b>Personalized AI</b> results.</li>
                <li>• You can always <b>edit the body</b> manually before clicking send.</li>
                <li>• Ensure your <b>Gmail settings</b> are verified to avoid bounce-backs.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailComposer;
