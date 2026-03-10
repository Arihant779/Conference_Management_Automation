import React, { useState, useEffect, useCallback } from 'react';
import {
  Send, Users, X, ChevronDown, ChevronUp,
  Sparkles, Eye, Edit3, Check, AlertCircle,
  Plus, Trash2, Mail, RefreshCw
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

/* ─── helpers ─────────────────────────────────────────────── */
const cls = (...c) => c.filter(Boolean).join(' ');

const RECIPIENT_GROUPS = [
  { key: 'all',        label: 'All Members',   color: 'text-indigo-400',  bg: 'bg-indigo-500/10  border-indigo-500/25'  },
  { key: 'organizer',  label: 'Organizers',    color: 'text-violet-400',  bg: 'bg-violet-500/10  border-violet-500/25'  },
  { key: 'reviewer',   label: 'Reviewers',     color: 'text-amber-400',   bg: 'bg-amber-500/10   border-amber-500/25'   },
  { key: 'presenter',  label: 'Presenters',    color: 'text-blue-400',    bg: 'bg-blue-500/10    border-blue-500/25'    },
  { key: 'member',     label: 'Guests',        color: 'text-slate-400',   bg: 'bg-slate-500/10   border-slate-500/25'   },
  { key: 'speaker',    label: 'Speakers',      color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
  { key: 'custom',     label: 'Custom Emails', color: 'text-pink-400',    bg: 'bg-pink-500/10    border-pink-500/25'    },
];

const TONE_OPTIONS = [
  { key: 'formal',       label: 'Formal'       },
  { key: 'friendly',     label: 'Friendly'     },
  { key: 'urgent',       label: 'Urgent'       },
  { key: 'celebratory',  label: 'Celebratory'  },
  { key: 'informational',label: 'Informational'},
];

/* ─── sub components ──────────────────────────────────────── */
const Field = ({ label, children }) => (
  <div>
    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{label}</label>
    {children}
  </div>
);

const Input = ({ className, ...props }) => (
  <input {...props} className={cls(
    'w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm',
    'focus:border-indigo-500 outline-none text-white placeholder-slate-600 transition-colors',
    className
  )} />
);

const Textarea = ({ className, ...props }) => (
  <textarea {...props} className={cls(
    'w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm',
    'focus:border-indigo-500 outline-none resize-none text-white placeholder-slate-600 transition-colors',
    className
  )} />
);

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════ */
const EmailComposer = ({ conf, senderRole = 'organizer' }) => {
  const { user } = useApp();
  const confId = conf?.conference_id ?? conf?.id;

  /* ── state ── */
  const [members, setMembers]               = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // step: 'compose' | 'preview' | 'sent'
  const [step, setStep] = useState('compose');

  // recipients
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [customEmails, setCustomEmails]     = useState('');
  const [customEmailList, setCustomEmailList] = useState([]);
  const [customInput, setCustomInput]       = useState('');

  // content
  const [subject, setSubject]     = useState('');
  const [intent, setIntent]       = useState('');
  const [tone, setTone]           = useState('formal');
  const [generatedBody, setGeneratedBody] = useState('');
  const [editedBody, setEditedBody]       = useState('');
  const [isEditing, setIsEditing]         = useState(false);

  // ui
  const [generating, setGenerating] = useState(false);
  const [sending, setSending]       = useState(false);
  const [genError, setGenError]     = useState('');
  const [sendError, setSendError]   = useState('');
  const [showRecipients, setShowRecipients] = useState(false);

  /* ── fetch members ── */
  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    const { data } = await supabase
      .from('conference_user')
      .select('id, user_id, role, email, full_name, users(user_name, user_email)')
      .eq('conference_id', confId);

    const enriched = (data || []).map(m => ({
      ...m,
      email:     m.email     || m.users?.user_email || '',
      full_name: m.full_name || m.users?.user_name  || '',
    }));
    setMembers(enriched);
    setLoadingMembers(false);
  }, [confId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  /* ── derived recipients ── */
  const resolvedRecipients = (() => {
    const emails = new Set();

    selectedGroups.forEach(group => {
      if (group === 'all') {
        members.forEach(m => m.email && emails.add(m.email));
      } else if (group === 'custom') {
        customEmailList.forEach(e => emails.add(e));
      } else {
        members
          .filter(m => m.role === group && m.email)
          .forEach(m => emails.add(m.email));
      }
    });

    return [...emails];
  })();

  /* ── toggle group ── */
  const toggleGroup = (key) => {
    setSelectedGroups(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  /* ── add custom email ── */
  const addCustomEmail = () => {
    const trimmed = customInput.trim().toLowerCase();
    if (!trimmed || customEmailList.includes(trimmed)) return;
    // basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    setCustomEmailList(prev => [...prev, trimmed]);
    setCustomInput('');
  };

  const removeCustomEmail = (email) => {
    setCustomEmailList(prev => prev.filter(e => e !== email));
  };

  /* ── generate with TinyLlama ── */
  const generateEmail = async () => {
    if (!intent.trim()) return;
    setGenerating(true);
    setGenError('');
    setGeneratedBody('');
    setEditedBody('');

    try {
      const recipientDescription = selectedGroups
        .map(g => RECIPIENT_GROUPS.find(r => r.key === g)?.label)
        .filter(Boolean)
        .join(', ') || 'conference members';

      const res = await fetch('http://localhost:4000/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent,
          tone,
          subject,
          recipientDescription,
          conferenceTitle: conf?.title || 'the conference',
          senderRole,
        }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setGeneratedBody(data.body);
      setEditedBody(data.body);
      if (!subject && data.subject) setSubject(data.subject);
      setStep('preview');
    } catch (err) {
      setGenError('Failed to generate email. Make sure your backend is running.');
    }

    setGenerating(false);
  };

  /* ── send email ── */
  const sendEmail = async () => {
    if (!resolvedRecipients.length) return;
    setSending(true);
    setSendError('');

    try {
      const res = await fetch('http://localhost:4000/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: resolvedRecipients,
          subject,
          body: isEditing ? editedBody : generatedBody,
          conferenceId: confId,
          senderRole,
        }),
      });

      if (!res.ok) throw new Error('Send failed');
      setStep('sent');
    } catch (err) {
      setSendError('Failed to send. Check your backend.');
    }

    setSending(false);
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
    setGeneratedBody('');
    setEditedBody('');
    setIsEditing(false);
    setGenError('');
    setSendError('');
  };

  const bodyToShow = isEditing ? editedBody : generatedBody;

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <div>
        <h2 className="text-2xl font-bold text-white">Email Composer</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          AI-powered email drafting for conference communications
        </p>
      </div>

      {/* ── SENT STATE ── */}
      {step === 'sent' && (
        <div className="bg-emerald-950/50 border border-emerald-500/25 rounded-2xl p-10 text-center">
          <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Email Sent!</h3>
          <p className="text-slate-400 text-sm mb-6">
            Successfully sent to {resolvedRecipients.length} recipient{resolvedRecipients.length !== 1 ? 's' : ''}.
          </p>
          <button
            onClick={reset}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors"
          >
            Compose Another
          </button>
        </div>
      )}

      {/* ── COMPOSE + PREVIEW ── */}
      {step !== 'sent' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── LEFT: Compose panel ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Step indicator */}
            <div className="flex items-center gap-3">
              {['compose', 'preview'].map((s, i) => (
                <React.Fragment key={s}>
                  <div className={cls(
                    'flex items-center gap-2 text-xs font-bold uppercase tracking-wider',
                    step === s ? 'text-white' : 'text-slate-600'
                  )}>
                    <div className={cls(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border',
                      step === s
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : step === 'preview' && s === 'compose'
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                          : 'border-white/10 text-slate-600'
                    )}>
                      {step === 'preview' && s === 'compose' ? <Check size={10} /> : i + 1}
                    </div>
                    {s === 'compose' ? 'Compose' : 'Preview & Send'}
                  </div>
                  {i === 0 && <div className="flex-1 h-px bg-white/8" />}
                </React.Fragment>
              ))}
            </div>

            {/* ── COMPOSE STEP ── */}
            {step === 'compose' && (
              <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-6 space-y-5">

                {/* Recipients */}
                <Field label="Send To">
                  <div className="flex flex-wrap gap-2">
                    {RECIPIENT_GROUPS.map(({ key, label, color, bg }) => {
                      const isSelected = selectedGroups.includes(key);
                      const count = key === 'all'
                        ? members.filter(m => m.email).length
                        : key === 'custom'
                          ? customEmailList.length
                          : members.filter(m => m.role === key && m.email).length;

                      return (
                        <button
                          key={key}
                          onClick={() => toggleGroup(key)}
                          className={cls(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                            isSelected ? bg + ' ' + color : 'border-white/8 text-slate-500 hover:border-white/20 hover:text-slate-300'
                          )}
                        >
                          {label}
                          {key !== 'custom' && count > 0 && (
                            <span className={cls(
                              'text-[9px] px-1.5 py-0.5 rounded-full font-bold',
                              isSelected ? 'bg-white/20' : 'bg-white/8'
                            )}>
                              {count}
                            </span>
                          )}
                          {isSelected && <X size={10} className="ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                {/* Custom email input */}
                {selectedGroups.includes('custom') && (
                  <Field label="Custom Email Addresses">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter email address..."
                          value={customInput}
                          onChange={e => setCustomInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && addCustomEmail()}
                        />
                        <button
                          onClick={addCustomEmail}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors shrink-0"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      {customEmailList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {customEmailList.map(email => (
                            <span
                              key={email}
                              className="flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-lg px-2.5 py-1 text-xs text-slate-300"
                            >
                              <Mail size={10} className="text-slate-500" />
                              {email}
                              <button onClick={() => removeCustomEmail(email)} className="text-slate-600 hover:text-red-400 transition-colors">
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Field>
                )}

                {/* Subject */}
                <Field label="Subject (optional — AI will suggest if empty)">
                  <Input
                    placeholder="e.g. Important Update Regarding Your Submission..."
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  />
                </Field>

                {/* Tone */}
                <Field label="Tone">
                  <div className="flex flex-wrap gap-2">
                    {TONE_OPTIONS.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setTone(key)}
                        className={cls(
                          'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                          tone === key
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'border-white/8 text-slate-500 hover:border-white/20 hover:text-white'
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>

                {/* Intent */}
                <Field label="What do you want to communicate?">
                  <Textarea
                    className="h-32"
                    placeholder={
                      `Describe what this email is about...\n\nExamples:\n• Remind reviewers their deadline is in 3 days\n• Congratulate accepted presenters\n• Inform all members about venue change`
                    }
                    value={intent}
                    onChange={e => setIntent(e.target.value)}
                  />
                </Field>

                {genError && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                    <AlertCircle size={15} />
                    {genError}
                  </div>
                )}

                <button
                  onClick={generateEmail}
                  disabled={generating || !intent.trim() || selectedGroups.length === 0}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating with AI... this may take a moment
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} /> Generate Email with AI
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ── PREVIEW STEP ── */}
            {step === 'preview' && (
              <div className="bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden">

                {/* Preview toolbar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
                  <div className="flex items-center gap-2">
                    <Eye size={15} className="text-indigo-400" />
                    <span className="text-sm font-semibold text-white">Email Preview</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setIsEditing(!isEditing); }}
                      className={cls(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                        isEditing
                          ? 'bg-amber-500/15 border-amber-500/25 text-amber-400'
                          : 'border-white/8 text-slate-500 hover:text-white hover:border-white/20'
                      )}
                    >
                      <Edit3 size={11} />
                      {isEditing ? 'Editing' : 'Edit'}
                    </button>
                    <button
                      onClick={() => { setStep('compose'); setIsEditing(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-white/8 text-slate-500 hover:text-white hover:border-white/20 transition-all"
                    >
                      <RefreshCw size={11} /> Regenerate
                    </button>
                  </div>
                </div>

                {/* Email preview body */}
                <div className="p-6 space-y-4">
                  {/* Subject */}
                  <div className="bg-white/3 rounded-xl px-4 py-3 border border-white/6">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-1">Subject</div>
                    <div className="text-sm font-semibold text-white">{subject || '(No subject)'}</div>
                  </div>

                  {/* Body */}
                  <div className="bg-white/3 rounded-xl px-4 py-4 border border-white/6 min-h-48">
                    <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-3">Body</div>
                    {isEditing ? (
                      <Textarea
                        className="h-64 bg-transparent border-none px-0 py-0 text-slate-300 leading-relaxed"
                        value={editedBody}
                        onChange={e => setEditedBody(e.target.value)}
                      />
                    ) : (
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{bodyToShow}</p>
                    )}
                  </div>
                </div>

                {/* Send bar */}
                <div className="px-6 pb-6 space-y-3">
                  {sendError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                      <AlertCircle size={15} /> {sendError}
                    </div>
                  )}
                  <button
                    onClick={sendEmail}
                    disabled={sending || resolvedRecipients.length === 0}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    {sending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        Send to {resolvedRecipients.length} Recipient{resolvedRecipients.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Recipients sidebar ── */}
          <div className="space-y-4">

            {/* Recipients summary */}
            <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-5">
              <button
                className="w-full flex items-center justify-between mb-3"
                onClick={() => setShowRecipients(!showRecipients)}
              >
                <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold">
                  Recipients
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400">
                    {resolvedRecipients.length} email{resolvedRecipients.length !== 1 ? 's' : ''}
                  </span>
                  {showRecipients ? <ChevronUp size={13} className="text-slate-600" /> : <ChevronDown size={13} className="text-slate-600" />}
                </div>
              </button>

              {resolvedRecipients.length === 0 ? (
                <p className="text-xs text-slate-600 italic">No recipients selected yet</p>
              ) : (
                <>
                  {/* Group pills */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {selectedGroups.map(g => {
                      const group = RECIPIENT_GROUPS.find(r => r.key === g);
                      return group ? (
                        <span key={g} className={cls('text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase', group.bg, group.color)}>
                          {group.label}
                        </span>
                      ) : null;
                    })}
                  </div>

                  {/* Email list */}
                  {showRecipients && (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 mt-2">
                      {resolvedRecipients.map((email, i) => {
                        const member = members.find(m => m.email === email);
                        return (
                          <div key={i} className="flex items-center gap-2 bg-white/3 rounded-lg px-2.5 py-1.5">
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
                              {(member?.full_name || email)[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              {member?.full_name && (
                                <div className="text-[11px] text-slate-300 font-medium truncate">{member.full_name}</div>
                              )}
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

            {/* Compose summary (shown in preview) */}
            {step === 'preview' && (
              <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-5 space-y-3">
                <div className="text-[11px] text-slate-600 uppercase tracking-wider font-bold">Settings</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Tone</span>
                    <span className="text-white font-semibold capitalize">{tone}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Recipients</span>
                    <span className="text-indigo-400 font-semibold">{resolvedRecipients.length}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Mode</span>
                    <span className={cls('font-semibold', isEditing ? 'text-amber-400' : 'text-emerald-400')}>
                      {isEditing ? 'Manual Edit' : 'AI Generated'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-5">
              <div className="text-[11px] text-indigo-400/70 uppercase tracking-wider font-bold mb-2">Tips</div>
              <ul className="space-y-1.5 text-xs text-slate-500 leading-relaxed">
                <li>• Select multiple recipient groups to reach different audiences</li>
                <li>• Be specific in your intent for better AI results</li>
                <li>• You can edit the generated email before sending</li>
                <li>• Custom emails let you add anyone outside the platform</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailComposer;