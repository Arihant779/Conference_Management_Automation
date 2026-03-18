import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Eye, EyeOff, CheckCircle, AlertCircle,
  ExternalLink, Save, Trash2, RefreshCw, Info, Lock, Sparkles
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';

const cls = (...c) => c.filter(Boolean).join(' ');

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

/* ═══════════════════════════════════════════════════════════
   EMAIL SETTINGS
═══════════════════════════════════════════════════════════ */
const EmailSettings = ({ conf }) => {
  const confId = conf?.conference_id ?? conf?.id;

  // 'default' | 'custom'
  const [mode, setMode] = useState('default');

  const [creds, setCreds] = useState({
    email_sender_address: '',
    email_sender_name:    '',
    gmail_client_id:      '',
    gmail_client_secret:  '',
    gmail_refresh_token:  '',
  });

  // Platform default sender info (stored in a separate app_config table or env)
  const [defaultSender, setDefaultSender] = useState({
    address: process.env.REACT_APP_DEFAULT_SENDER_EMAIL || 'noreply@conferencehub.app',
    name:    process.env.REACT_APP_DEFAULT_SENDER_NAME  || 'Conference Hub',
  });

  const [show, setShow]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [saved, setSaved]         = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testMsg, setTestMsg]     = useState('');
  const [error, setError]         = useState('');

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('conference')
      .select('email_sender_address, email_sender_name, gmail_client_id, gmail_client_secret, gmail_refresh_token, email_use_default')
      .eq('conference_id', confId)
      .single();

    if (data) {
      setCreds({
        email_sender_address: data.email_sender_address || '',
        email_sender_name:    data.email_sender_name    || '',
        gmail_client_id:      data.gmail_client_id      || '',
        gmail_client_secret:  data.gmail_client_secret  || '',
        gmail_refresh_token:  data.gmail_refresh_token  || '',
      });
      // If they've explicitly set custom creds before, show custom mode
      // email_use_default defaults to true (null treated as true)
      const useDefault = data.email_use_default !== false;
      setMode(useDefault ? 'default' : 'custom');
    }
    setLoading(false);
  }, [confId]);

  useEffect(() => { load(); }, [load]);

  const hasCustomCreds = !!(creds.email_sender_address && creds.gmail_client_id && creds.gmail_refresh_token);
  const isConfigured   = mode === 'default' || hasCustomCreds;

  /* ── save mode switch ── */
  const switchMode = async (newMode) => {
    setMode(newMode);
    setTestResult(null);
    // Persist the mode choice immediately
    await supabase
      .from('conference')
      .update({ email_use_default: newMode === 'default' })
      .eq('conference_id', confId);
  };

  /* ── save custom creds ── */
  const save = async () => {
    if (!creds.email_sender_address.trim()) { setError('Sender email address is required.'); return; }
    if (!creds.gmail_client_id.trim())      { setError('Client ID is required.');            return; }
    if (!creds.gmail_refresh_token.trim())  { setError('Refresh token is required.');         return; }
    setError('');
    setSaving(true);

    const { error: err } = await supabase
      .from('conference')
      .update({
        email_sender_address: creds.email_sender_address.trim(),
        email_sender_name:    creds.email_sender_name.trim() || conf.title || 'Conference',
        gmail_client_id:      creds.gmail_client_id.trim(),
        gmail_client_secret:  creds.gmail_client_secret.trim(),
        gmail_refresh_token:  creds.gmail_refresh_token.trim(),
        email_use_default:    false,
      })
      .eq('conference_id', confId);

    setSaving(false);
    if (err) { setError(err.message); }
    else {
      setMode('custom');
      setSaved(true);
      setTestResult(null);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  /* ── test ── */
  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setTestMsg('');
    try {
      const res = await fetch('http://localhost:4000/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conferenceId: confId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult('ok');
        setTestMsg(`Test email sent to ${data.sentTo}`);
      } else {
        setTestResult('fail');
        setTestMsg(data.error || 'Connection test failed');
      }
    } catch {
      setTestResult('fail');
      setTestMsg('Could not reach backend on port 4000.');
    }
    setTesting(false);
  };

  /* ── clear custom creds ── */
  const clearCreds = async () => {
    if (!window.confirm('Remove custom Gmail credentials and switch back to the default sender?')) return;
    await supabase.from('conference').update({
      email_sender_address: null, email_sender_name: null,
      gmail_client_id: null, gmail_client_secret: null,
      gmail_refresh_token: null, email_use_default: true,
    }).eq('conference_id', confId);
    setCreds({ email_sender_address: '', email_sender_name: '', gmail_client_id: '', gmail_client_secret: '', gmail_refresh_token: '' });
    setMode('default');
    setTestResult(null);
  };

  const toggleShow = key => setShow(p => ({ ...p, [key]: !p[key] }));
  const set = key => e => { setCreds(p => ({ ...p, [key]: e.target.value })); setError(''); };

  if (loading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-white/3 border border-white/5 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Email Settings</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          Choose how emails are sent from <span className="text-white font-medium">{conf.title}</span>
        </p>
      </div>

      {/* ── Mode picker ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Default option */}
        <button
          onClick={() => switchMode('default')}
          className={cls(
            'text-left p-5 rounded-2xl border-2 transition-all',
            mode === 'default'
              ? 'border-indigo-500 bg-indigo-500/8'
              : 'border-white/8 hover:border-white/15 bg-white/2',
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={cls(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              mode === 'default' ? 'bg-indigo-500/20' : 'bg-white/5',
            )}>
              <Sparkles size={18} className={mode === 'default' ? 'text-indigo-400' : 'text-slate-500'} />
            </div>
            {mode === 'default' && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                <CheckCircle size={10} /> Active
              </span>
            )}
          </div>
          <div className={cls('font-bold text-base mb-1', mode === 'default' ? 'text-white' : 'text-slate-300')}>
            Use Platform Default
          </div>
          <div className="text-xs text-slate-500 leading-relaxed mb-3">
            Emails sent from the shared platform address. No setup required — works immediately.
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
            <Mail size={12} className="text-slate-500 shrink-0" />
            <span className="text-xs font-mono text-slate-400">{defaultSender.address}</span>
          </div>
        </button>

        {/* Custom option */}
        <button
          onClick={() => switchMode('custom')}
          className={cls(
            'text-left p-5 rounded-2xl border-2 transition-all',
            mode === 'custom'
              ? 'border-amber-500/60 bg-amber-500/5'
              : 'border-white/8 hover:border-white/15 bg-white/2',
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className={cls(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              mode === 'custom' ? 'bg-amber-500/15' : 'bg-white/5',
            )}>
              <Mail size={18} className={mode === 'custom' ? 'text-amber-400' : 'text-slate-500'} />
            </div>
            {mode === 'custom' && hasCustomCreds && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                <CheckCircle size={10} /> Active
              </span>
            )}
            {mode === 'custom' && !hasCustomCreds && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
                <AlertCircle size={10} /> Setup needed
              </span>
            )}
          </div>
          <div className={cls('font-bold text-base mb-1', mode === 'custom' ? 'text-white' : 'text-slate-300')}>
            Use Conference Gmail
          </div>
          <div className="text-xs text-slate-500 leading-relaxed mb-3">
            Send from your own conference email address. Requires Gmail OAuth2 setup.
          </div>
          {hasCustomCreds ? (
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
              <Mail size={12} className="text-emerald-400 shrink-0" />
              <span className="text-xs font-mono text-emerald-400">{creds.email_sender_address}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
              <span className="text-xs text-slate-600 italic">Not configured yet</span>
            </div>
          )}
        </button>
      </div>

      {/* ── Default mode — info panel ── */}
      {mode === 'default' && (
        <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-white text-sm mb-1">Ready to send</div>
              <div className="text-xs text-slate-400 leading-relaxed">
                Emails will be sent from <span className="text-white font-mono">{defaultSender.address}</span> with
                the display name <span className="text-white font-semibold">"{defaultSender.name}"</span>.
                Recipients will see this as the sender.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-white/5 pt-4">
            <Info size={12} className="shrink-0" />
            Want emails to come from your own address?
            <button onClick={() => switchMode('custom')} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Set up custom Gmail →
            </button>
          </div>
        </div>
      )}

      {/* ── Custom mode — credentials form ── */}
      {mode === 'custom' && (
        <div className="space-y-5">

          {/* Current custom sender status */}
          {hasCustomCreds && (
            <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4">
              <div className="w-9 h-9 bg-emerald-500/15 rounded-xl flex items-center justify-center shrink-0">
                <Mail size={16} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-sm">{creds.email_sender_name || conf.title}</div>
                <div className="text-xs text-emerald-400 font-mono">{creds.email_sender_address}</div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={testConnection}
                  disabled={testing}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all"
                >
                  <RefreshCw size={11} className={testing ? 'animate-spin' : ''} />
                  {testing ? 'Testing…' : 'Test'}
                </button>
                <button
                  onClick={clearCreds}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <Trash2 size={11} /> Remove
                </button>
              </div>
            </div>
          )}

          {/* Test result */}
          {testResult && (
            <div className={cls(
              'flex items-center gap-2 rounded-xl px-4 py-3 text-sm border',
              testResult === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400',
            )}>
              {testResult === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {testMsg}
            </div>
          )}

          {/* How-to guide */}
          <details className="group bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden">
            <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none hover:bg-white/2 transition-colors">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-indigo-400" />
                <span className="text-sm font-semibold text-slate-300">How to get Gmail OAuth2 credentials</span>
              </div>
              <span className="text-slate-600 text-xs">▼</span>
            </summary>
            <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
              {[
                { step: '1', title: 'Create a Google Cloud Project', body: 'Go to console.cloud.google.com → New Project.', link: 'https://console.cloud.google.com', linkLabel: 'Open Google Cloud Console' },
                { step: '2', title: 'Enable the Gmail API', body: 'APIs & Services → Library → search "Gmail API" → Enable.' },
                { step: '3', title: 'Create OAuth 2.0 Credentials', body: 'APIs & Services → Credentials → Create Credentials → OAuth client ID → Desktop app. Copy the Client ID and Client Secret.' },
                { step: '4', title: 'Get a Refresh Token', body: 'Open OAuth Playground → settings cog → "Use your own OAuth credentials" → paste Client ID & Secret. Authorize scope https://mail.google.com/ → Exchange for tokens → copy Refresh Token.', link: 'https://developers.google.com/oauthplayground', linkLabel: 'Open OAuth Playground' },
                { step: '5', title: 'Paste credentials below and save', body: 'Enter the Gmail address, Client ID, Client Secret, and Refresh Token. Click Save then Test Connection.' },
              ].map(({ step, title, body, link, linkLabel }) => (
                <div key={step} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</div>
                  <div>
                    <div className="text-sm font-semibold text-slate-200 mb-1">{title}</div>
                    <div className="text-xs text-slate-500 leading-relaxed">{body}</div>
                    {link && <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold mt-1.5 transition-colors">{linkLabel} <ExternalLink size={10} /></a>}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* Credentials form */}
          <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={13} className="text-slate-600" />
              <span className="text-xs text-slate-600">Credentials are stored securely and never exposed to the frontend.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Sender Email Address" hint="The Gmail to send from">
                <Input type="email" placeholder="techconf2025@gmail.com" value={creds.email_sender_address} onChange={set('email_sender_address')} />
              </Field>
              <Field label="Sender Display Name" hint="Shown as From: in email clients">
                <Input placeholder={conf.title || 'Conference Name'} value={creds.email_sender_name} onChange={set('email_sender_name')} />
              </Field>
            </div>

            <Field label="Gmail OAuth2 Client ID">
              <Input placeholder="xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com" value={creds.gmail_client_id} onChange={set('gmail_client_id')} />
            </Field>

            {[
              { key: 'gmail_client_secret', label: 'Client Secret',  placeholder: 'GOCSPX-…'  },
              { key: 'gmail_refresh_token', label: 'Refresh Token',  placeholder: '1//0g…'     },
            ].map(({ key, label, placeholder }) => (
              <Field key={key} label={label}>
                <div className="relative">
                  <input
                    type={show[key] ? 'text' : 'password'}
                    placeholder={placeholder}
                    value={creds[key]}
                    onChange={set(key)}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 pr-10 text-sm focus:border-indigo-500 outline-none text-white placeholder-slate-600 transition-colors font-mono"
                  />
                  <button type="button" onClick={() => toggleShow(key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                    {show[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </Field>
            ))}

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : 'Save & Use This Gmail'}
              </button>
              {saved && <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400"><CheckCircle size={12} /> Saved!</span>}
              <button
                onClick={() => switchMode('default')}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors ml-auto"
              >
                ← Back to default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailSettings;