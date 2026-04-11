import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail, Eye, EyeOff, CheckCircle, AlertCircle,
  ExternalLink, Save, Trash2, RefreshCw, Info, Lock, Sparkles
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const cls = (...c) => c.filter(Boolean).join(' ');

/* ── tiny primitives but theme aware ── */
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

/* ═══════════════════════════════════════════════════════════
   EMAIL SETTINGS
   Refactored for Midnight Amber / Daylight Amber
═══════════════════════════════════════════════════════════ */
const EmailSettings = ({ conf }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const confId = conf?.conference_id ?? conf?.id;

  // 'default' | 'custom'
  const [mode, setMode] = useState('default');

  const [creds, setCreds] = useState({
    email_sender_address: '',
    email_sender_name: '',
    gmail_client_id: '',
    gmail_client_secret: '',
    gmail_refresh_token: '',
  });

  // Platform default sender info
  const [defaultSender] = useState({
    address: process.env.REACT_APP_DEFAULT_SENDER_EMAIL || 'noreply@conferencehub.app',
    name: process.env.REACT_APP_DEFAULT_SENDER_NAME || 'Conference Hub',
  });

  const [show, setShow] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testMsg, setTestMsg] = useState('');
  const [error, setError] = useState('');

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
        email_sender_name: data.email_sender_name || '',
        gmail_client_id: data.gmail_client_id || '',
        gmail_client_secret: data.gmail_client_secret || '',
        gmail_refresh_token: data.gmail_refresh_token || '',
      });
      const useDefault = data.email_use_default !== false;
      setMode(useDefault ? 'default' : 'custom');
    }
    setLoading(false);
  }, [confId]);

  useEffect(() => { load(); }, [load]);

  const hasCustomCreds = !!(creds.email_sender_address && creds.gmail_client_id && creds.gmail_refresh_token);

  /* ── save mode switch ── */
  const switchMode = async (newMode) => {
    setMode(newMode);
    setTestResult(null);
    await supabase
      .from('conference')
      .update({ email_use_default: newMode === 'default' })
      .eq('conference_id', confId);
  };

  /* ── save custom creds ── */
  const save = async () => {
    if (!creds.email_sender_address.trim()) { setError('Sender email address is required.'); return; }
    if (!creds.gmail_client_id.trim()) { setError('Client ID is required.'); return; }
    if (!creds.gmail_refresh_token.trim()) { setError('Refresh token is required.'); return; }
    setError('');
    setSaving(true);

    const { error: err } = await supabase
      .from('conference')
      .update({
        email_sender_address: creds.email_sender_address.trim(),
        email_sender_name: creds.email_sender_name.trim() || conf.title || 'Conference',
        gmail_client_id: creds.gmail_client_id.trim(),
        gmail_client_secret: creds.gmail_client_secret.trim(),
        gmail_refresh_token: creds.gmail_refresh_token.trim(),
        email_use_default: false,
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
      {[...Array(3)].map((_, i) => <div key={i} className={cls("h-16 rounded-2xl animate-pulse", isDark ? "bg-white/3" : "bg-zinc-100")} />)}
    </div>
  );

  return (
    <div className={cls("space-y-6 animate-in fade-in duration-700", isDark ? "text-white" : "text-zinc-900")} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div>
        <h2 className={cls("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-zinc-900")}>Email Settings</h2>
        <p className={cls("text-sm mt-0.5", isDark ? "text-slate-500" : "text-zinc-500")}>
          Choose how emails are sent from <span className={cls("font-semibold", isDark ? "text-white" : "text-zinc-800")}>{conf.title}</span>
        </p>
      </div>

      {/* ── Mode picker ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Default option */}
        <button
          onClick={() => switchMode('default')}
          className={cls(
            'text-left p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group',
            mode === 'default'
              ? isDark ? 'border-indigo-500 bg-indigo-500/10' : 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-500/5'
              : isDark
                ? 'border-white/8 hover:border-white/15 bg-white/3'
                : 'border-zinc-200 hover:border-zinc-300 bg-white shadow-sm',
          )}
        >
          {mode === 'default' && (
            <div className={cls("absolute top-0 right-0 p-3", isDark ? "text-indigo-400" : "text-amber-500")}>
              <CheckCircle size={14} className="animate-in zoom-in duration-300" />
            </div>
          )}
          <div className="flex items-start justify-between mb-4">
            <div className={cls(
              'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110',
              mode === 'default'
                ? isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-amber-500/20 text-amber-600'
                : isDark ? 'bg-white/5 text-slate-500' : 'bg-zinc-100 text-zinc-400',
            )}>
              <Sparkles size={20} className={mode === 'default' ? 'animate-pulse' : ''} />
            </div>
            {mode === 'default' && (
              <span className={cls(
                "flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border transform -rotate-1 active:scale-95 transition-all",
                isDark ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-emerald-700 bg-emerald-50 border-emerald-200"
              )}>
                ACTIVE
              </span>
            )}
          </div>
          <div className={cls('font-bold text-lg mb-1.5', mode === 'default' ? (isDark ? 'text-white' : 'text-zinc-900') : (isDark ? 'text-slate-300' : 'text-zinc-700'))}>
            Platform Default
          </div>
          <div className={cls("text-xs leading-relaxed mb-4", isDark ? "text-slate-500" : "text-zinc-500")}>
            Fastest setup. Emails are delivered via our priority sender cloud. Highly reliable.
          </div>
          <div className={cls(
            "flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-colors",
            isDark ? "bg-black/30 border-white/5" : "bg-zinc-50 border-zinc-100"
          )}>
            <Mail size={12} className={isDark ? "text-slate-600" : "text-zinc-400"} />
            <span className={cls("text-[11px] font-mono", isDark ? "text-slate-400" : "text-zinc-600")}>{defaultSender.address}</span>
          </div>
        </button>

        {/* Custom option */}
        <button
          onClick={() => switchMode('custom')}
          className={cls(
            'text-left p-6 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group',
            mode === 'custom'
              ? isDark ? 'border-amber-500/60 bg-amber-500/10' : 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-500/5'
              : isDark
                ? 'border-white/8 hover:border-white/15 bg-white/3'
                : 'border-zinc-200 hover:border-zinc-300 bg-white shadow-sm',
          )}
        >
          {mode === 'custom' && (
            <div className={cls("absolute top-0 right-0 p-3", isDark ? "text-amber-400" : "text-amber-500")}>
              {hasCustomCreds ? <CheckCircle size={14} className="animate-in zoom-in duration-300" /> : <AlertCircle size={14} className="animate-pulse" />}
            </div>
          )}
          <div className="flex items-start justify-between mb-4">
            <div className={cls(
              'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110',
              mode === 'custom'
                ? isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/20 text-amber-600'
                : isDark ? 'bg-white/5 text-slate-500' : 'bg-zinc-100 text-zinc-400',
            )}>
              <Mail size={20} />
            </div>
            {mode === 'custom' && (
              <span className={cls(
                "flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border transform rotate-1 transition-all",
                hasCustomCreds
                  ? isDark ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : isDark ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-amber-700 bg-amber-50 border-amber-200"
              )}>
                {hasCustomCreds ? 'ACTIVE' : 'SETUP NEEDED'}
              </span>
            )}
          </div>
          <div className={cls('font-bold text-lg mb-1.5', mode === 'custom' ? (isDark ? 'text-white' : 'text-zinc-900') : (isDark ? 'text-slate-300' : 'text-zinc-700'))}>
            Conference Gmail
          </div>
          <div className={cls("text-xs leading-relaxed mb-4", isDark ? "text-slate-500" : "text-zinc-500")}>
            Professional touch. Use your own G-Suite or personal Gmail via OAuth2.
          </div>
          {hasCustomCreds ? (
            <div className={cls(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-colors",
              isDark ? "bg-emerald-500/5 border-emerald-500/10" : "bg-emerald-50 border-emerald-100"
            )}>
              <Mail size={12} className="text-emerald-500" />
              <span className={cls("text-[11px] font-mono font-medium", isDark ? "text-emerald-400" : "text-emerald-700")}>{creds.email_sender_address}</span>
            </div>
          ) : (
            <div className={cls(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 border transition-colors",
              isDark ? "bg-white/5 border-white/5" : "bg-zinc-50 border-zinc-100"
            )}>
              <span className={cls("text-[11px] italic", isDark ? "text-slate-600" : "text-zinc-400")}>Configuration required</span>
            </div>
          )}
        </button>
      </div>

      {/* ── Default mode — Info Panel ── */}
      {mode === 'default' && (
        <div className={cls(
          "rounded-2xl p-6 transition-all animate-in slide-in-from-top-4 border",
          isDark ? "bg-indigo-950/20 border-indigo-500/20" : "bg-indigo-50 border-indigo-100 shadow-sm shadow-indigo-500/5"
        )}>
          <div className="flex items-start gap-4">
            <div className={cls("w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg", isDark ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-white border border-emerald-200")}>
              <CheckCircle size={20} className="text-emerald-500" />
            </div>
            <div>
              <div className={cls("font-bold text-base mb-1", isDark ? "text-white" : "text-zinc-900")}>Ready to Broadcast</div>
              <div className={cls("text-sm leading-relaxed", isDark ? "text-slate-400" : "text-zinc-600")}>
                Emails will carry the sender name <span className={cls("font-bold", isDark ? "text-white" : "text-zinc-900")}>"{defaultSender.name}"</span>. 
                This helps recipients recognize the platform and ensures higher deliverability rates.
              </div>
              <div className={cls("mt-4 p-4 rounded-xl flex items-center gap-3 border", isDark ? "bg-black/30 border-white/5" : "bg-white border-indigo-100")}>
                <Info size={14} className={isDark ? "text-indigo-400" : "text-indigo-500"} />
                <span className={cls("text-xs", isDark ? "text-slate-500" : "text-zinc-500")}>Want to use {creds.email_sender_address || 'your_name@gmail.com'} instead?</span>
                <button onClick={() => switchMode('custom')} className={cls("text-xs font-bold hover:underline ml-auto", isDark ? "text-indigo-400" : "text-indigo-600")}>
                  Connect Gmail →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Custom mode — credentials form ── */}
      {mode === 'custom' && (
        <div className="space-y-6 animate-in slide-in-from-top-4">

          {/* Current custom sender status */}
          {hasCustomCreds && (
            <div className={cls(
              "rounded-2xl p-6 flex flex-col md:flex-row items-center gap-4 border transition-all",
              isDark ? "bg-emerald-950/20 border-emerald-500/20" : "bg-white border-zinc-200 shadow-sm"
            )}>
              <div className={cls("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg", isDark ? "bg-emerald-500/15" : "bg-emerald-50")}>
                <Mail size={22} className="text-emerald-500" />
              </div>
              <div className="flex-1 text-center md:text-left min-w-0">
                <div className={cls("font-bold text-base", isDark ? "text-white" : "text-zinc-900")}>{creds.email_sender_name}</div>
                <div className={cls("text-xs font-mono font-medium", isDark ? "text-emerald-400" : "text-emerald-600")}>{creds.email_sender_address}</div>
              </div>
              <div className="flex gap-3 shrink-0">
                <button
                  onClick={testConnection}
                  disabled={testing}
                  className={cls(
                    "flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border transition-all active:scale-95",
                    isDark 
                      ? "border-white/10 text-slate-400 hover:text-white hover:bg-white/5" 
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300"
                  )}
                >
                  <RefreshCw size={13} className={testing ? 'animate-spin' : ''} />
                  {testing ? 'TESTING…' : 'TEST CONNECTION'}
                </button>
                <button
                  onClick={clearCreds}
                  className={cls(
                    "flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border transition-all active:scale-95",
                    isDark
                      ? "border-red-500/20 text-red-400 hover:bg-red-500/10"
                      : "border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300"
                  )}
                >
                  <Trash2 size={13} /> REMOVE
                </button>
              </div>
            </div>
          )}

          {/* Test result */}
          {testResult && (
            <div className={cls(
              'flex items-center gap-3 rounded-2xl px-5 py-4 text-sm border font-medium transition-all animate-in zoom-in-95',
              testResult === 'ok'
                ? isDark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700',
            )}>
              {testResult === 'ok' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              {testMsg}
            </div>
          )}

          {/* How-to guide */}
          <details className={cls(
            "group border rounded-2xl overflow-hidden transition-all",
            isDark ? "bg-[#0d1117]/80 border-white/6" : "bg-white border-zinc-200"
          )}>
            <summary className={cls(
              "flex items-center justify-between px-6 py-5 cursor-pointer list-none transition-colors",
              isDark ? "hover:bg-white/2" : "hover:bg-zinc-50"
            )}>
              <div className="flex items-center gap-3">
                <div className={cls("w-8 h-8 rounded-lg flex items-center justify-center", isDark ? "bg-indigo-500/15" : "bg-indigo-50")}>
                  <Info size={16} className={isDark ? "text-indigo-400" : "text-indigo-600"} />
                </div>
                <span className={cls("font-bold tracking-tight", isDark ? "text-slate-300" : "text-zinc-800")}>OAuth2 Setup Guide</span>
              </div>
              <span className={cls("text-xs transition-transform duration-300 group-open:rotate-180", isDark ? "text-slate-600" : "text-zinc-400")}>▼</span>
            </summary>
            <div className={cls("px-6 pb-6 pt-2 border-t space-y-5", isDark ? "border-white/5" : "border-zinc-100")}>
              {[
                { step: '1', title: 'Google Cloud Project', body: 'Initialize a new project in the Google Cloud Console.', link: 'https://console.cloud.google.com', label: 'Cloud Console' },
                { step: '2', title: 'Enable Gmail API', body: 'Search for "Gmail API" and click Enable.' },
                { step: '3', title: 'Create Credentials', body: 'APIs & Services → Credentials → OAuth client ID → Desktop app.' },
                { step: '4', title: 'OAuth Playground', body: 'Use Google\'s playground to exchange codes for a Refresh Token.', link: 'https://developers.google.com/oauthplayground', label: 'OAuth Playground' },
                { step: '5', title: 'Finish Setup', body: 'Paste your ID, Secret, and Token below, save, and then test.' },
              ].map(({ step, title, body, link, label }) => (
                <div key={step} className="flex gap-4">
                  <div className={cls(
                    "w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border shadow-sm",
                    isDark ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300" : "bg-zinc-50 border-zinc-200 text-zinc-600"
                  )}>{step}</div>
                  <div>
                    <div className={cls("text-sm font-bold mb-1", isDark ? "text-slate-200" : "text-zinc-900")}>{title}</div>
                    <div className={cls("text-xs leading-relaxed", isDark ? "text-slate-500" : "text-zinc-500")}>{body}</div>
                    {link && <a href={link} target="_blank" rel="noreferrer" className={cls("inline-flex items-center gap-1 text-[11px] font-bold mt-2 transition-colors", isDark ? "text-indigo-400 hover:text-indigo-300" : "text-indigo-600 hover:text-indigo-700")}>{label} <ExternalLink size={10} /></a>}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* Credentials form */}
          <div className={cls(
            "border rounded-2xl p-7 space-y-6 transition-all",
            isDark ? "bg-[#0d1117]/80 border-white/6 shadow-2xl" : "bg-white border-zinc-200 shadow-xl shadow-zinc-500/5"
          )}>
            <div className="flex items-center gap-3 pb-2 border-b border-white/5">
              <Lock size={15} className={isDark ? "text-slate-600" : "text-zinc-400"} />
              <span className={cls("text-xs font-medium", isDark ? "text-slate-600" : "text-zinc-400")}>Your credentials are encrypted and stored securely.</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Sender Gmail Address" hint="Must match OAuth account" isDark={isDark}>
                <Input type="email" placeholder="techconf2025@gmail.com" value={creds.email_sender_address} onChange={set('email_sender_address')} isDark={isDark} />
              </Field>
              <Field label="Display Name" hint="Shown as From: {Name}" isDark={isDark}>
                <Input placeholder={conf.title || 'Conference Name'} value={creds.email_sender_name} onChange={set('email_sender_name')} isDark={isDark} />
              </Field>
            </div>

            <Field label="OAuth2 Client ID" isDark={isDark}>
              <Input placeholder="xxxxxxxxxxxx-xxxxxxxx.apps.googleusercontent.com" value={creds.gmail_client_id} onChange={set('gmail_client_id')} isDark={isDark} />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { key: 'gmail_client_secret', label: 'Client Secret', placeholder: 'GOCSPX-…' },
                { key: 'gmail_refresh_token', label: 'Refresh Token', placeholder: '1//0g…' },
              ].map(({ key, label, placeholder }) => (
                <Field key={key} label={label} isDark={isDark}>
                  <div className="relative">
                    <input
                      type={show[key] ? 'text' : 'password'}
                      placeholder={placeholder}
                      value={creds[key]}
                      onChange={set(key)}
                      className={cls(
                        "w-full rounded-xl px-4 py-2.5 pr-10 text-sm transition-all duration-200 font-mono border outline-none",
                        isDark 
                          ? "bg-white/5 border-white/8 text-white placeholder-slate-600 focus:border-indigo-500" 
                          : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-amber-500"
                      )}
                    />
                    <button type="button" onClick={() => toggleShow(key)} className={cls("absolute right-3 top-1/2 -translate-y-1/2 transition-colors", isDark ? "text-slate-600 hover:text-slate-400" : "text-zinc-400 hover:text-zinc-600")}>
                      {show[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 animate-in shake duration-500">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center gap-4 pt-4 border-t border-white/5">
              <button
                onClick={save}
                disabled={saving}
                className={cls(
                  "w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-xl active:scale-95 disabled:opacity-50",
                  isDark ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20" : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                )}
              >
                {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                {saving ? 'SAVING…' : 'SAVE CREDENTIALS'}
              </button>
              
              {saved && (
                <span className="flex items-center gap-2 text-xs font-bold text-emerald-500 animate-in fade-in slide-in-from-left-2">
                  <CheckCircle size={14} /> CONFIGURATION SAVED
                </span>
              )}

              <button
                onClick={() => switchMode('default')}
                className={cls("text-xs font-bold hover:underline transition-colors mt-2 md:mt-0 md:ml-auto", isDark ? "text-slate-500 hover:text-slate-300" : "text-zinc-400 hover:text-zinc-600")}
              >
                ← RETURN TO PLATFORM DEFAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailSettings;