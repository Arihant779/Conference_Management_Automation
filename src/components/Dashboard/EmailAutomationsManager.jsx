import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, Edit3, Trash2, Power, PowerOff, Sparkles, AlertCircle, Save, Loader2, RefreshCw, X,
  Clock, Zap, Users, CheckCircle, AtSign, Calendar
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../../utils/api';

const cls = (...classes) => classes.filter(Boolean).join(' ');

const TRIGGERS = [
  { id: 'on_registration', label: 'When someone registers', icon: Zap, variables: ['{Name}'] },
  { id: 'on_paper_assigned', label: 'When a paper is assigned', icon: Zap, variables: ['{ReviewerName}', '{PaperTitle}'] },
  { id: 'on_paper_accepted', label: 'When a paper is accepted', icon: Zap, variables: ['{AuthorName}', '{PaperTitle}'] },
  { id: 'on_paper_rejected', label: 'When a paper is rejected', icon: Zap, variables: ['{AuthorName}', '{PaperTitle}'] },
  { id: 'relative_date', label: 'Relative to conference start (Cron required)', icon: Clock, variables: ['{Name}'] },
  { id: 'custom_date', label: 'Specific Date & Time (Cron required)', icon: Calendar, variables: ['{Name}'] },
];

const TARGET_ROLES = [
  { id: 'event_subject', label: 'Event Subject (Author/Registrant/Reviewer)' },
  { id: 'all', label: 'All Members' },
  { id: 'attendee', label: 'Attendees' },
  { id: 'reviewer', label: 'Reviewers' },
];

const TONE_OPTIONS = ['Formal', 'Friendly', 'Urgent', 'Celebratory', 'Informational'];

/* ── UI HELPERS ── */
const FieldLabel = ({ label, hint, isDark }) => (
  <div className="flex items-baseline justify-between mb-1.5 px-0.5">
    <label className={cls("text-[11px] font-bold uppercase tracking-wider", isDark ? "text-slate-500" : "text-zinc-500")}>{label}</label>
    {hint && <span className={cls("text-[10px] italic", isDark ? "text-slate-600" : "text-zinc-400")}>{hint}</span>}
  </div>
);

const Input = ({ className, isDark, ...props }) => (
  <input {...props} className={cls(
    'w-full rounded-xl px-4 py-2.5 text-sm transition-all duration-200 outline-none border',
    isDark ? 'bg-white/5 border-white/8 text-white focus:border-indigo-500' : 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-amber-500',
    className
  )} />
);

/* ── EDITOR ── */
const EmailBodyEditor = ({ value, onChange, isDark }) => {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      className={cls(
        "w-full rounded-xl px-4 py-3 text-sm leading-relaxed outline-none resize-none min-h-[220px] transition-all duration-300 border",
        isDark ? "bg-black/30 border-amber-500/30 text-slate-200 focus:border-amber-400/50" : "bg-white border-amber-200 text-zinc-800 focus:border-amber-500"
      )}
      placeholder="Type your email body here. Use curly braces for variables like {Name} or {PaperTitle}."
      spellCheck
    />
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   EMAIL AUTOMATIONS MANAGER
═══════════════════════════════════════════════════════════════════════════ */
const EmailAutomationsManager = ({ conf }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const confId = conf?.conference_id || conf?.id;

  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeAuto, setActiveAuto] = useState(null); // active automation being edited

  // Form State
  const [form, setForm] = useState({
    title: '',
    trigger_type: 'on_registration',
    target_role: 'event_subject',
    subject: '',
    body: '',
    trigger_metadata: {},
    is_active: true
  });

  // AI Gen State
  const [intent, setIntent] = useState('');
  const [tone, setTone] = useState('Friendly');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const fetchAutomations = useCallback(async () => {
    if (!confId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('conference_automations')
      .select('*')
      .eq('conference_id', confId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAutomations(data);
    }
    setLoading(false);
  }, [confId]);

  useEffect(() => { fetchAutomations(); }, [fetchAutomations]);

  if (!confId) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-50">
        <Loader2 className="animate-spin mb-4" />
        <p className="text-sm font-medium">Resolving conference context...</p>
      </div>
    );
  }

  const openNew = () => {
    setForm({
      title: 'New Automation',
      trigger_type: 'on_registration',
      target_role: 'event_subject',
      subject: '',
      body: '',
      trigger_metadata: {},
      is_active: true
    });
    setIntent('');
    setActiveAuto(null);
    setWizardOpen(true);
  };

  const openEdit = (auto) => {
    setForm({ ...auto });
    setIntent('');
    setActiveAuto(auto);
    setWizardOpen(true);
  };

  const toggleActive = async (id, currentStatus) => {
    await supabase.from('conference_automations').update({ is_active: !currentStatus }).eq('id', id);
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
  };

  const deleteAuto = async (id) => {
    if(!window.confirm("Delete this automation rule?")) return;
    await supabase.from('conference_automations').delete().eq('id', id);
    setAutomations(prev => prev.filter(a => a.id !== id));
  };

  const saveAutomation = async () => {
    setSaving(true);
    const payload = {
      conference_id: confId,
      title: form.title || 'Untitled Automation',
      trigger_type: form.trigger_type,
      target_role: form.target_role,
      subject: form.subject,
      body: form.body,
      is_active: form.is_active,
      trigger_metadata: form.trigger_metadata
    };

    let saveErr = null;
    if (activeAuto?.id) {
      const { error } = await supabase.from('conference_automations').update(payload).eq('id', activeAuto.id);
      saveErr = error;
    } else {
      const { error } = await supabase.from('conference_automations').insert([payload]);
      saveErr = error;
    }
    
    setSaving(false);
    if (saveErr) {
      console.error(saveErr);
      if (saveErr.code === '42P01') {
         alert("Database Table Missing: Please run the CREATE TABLE conference_automations command in your Supabase SQL Editor!");
      } else {
         alert(`Failed to save automation: ${saveErr.message}`);
      }
      return;
    }

    setWizardOpen(false);
    fetchAutomations();
  };

  const generateEmail = async () => {
    if (!intent.trim()) return;
    setGenerating(true); setGenError('');
    
    const triggerDef = TRIGGERS.find(t => t.id === form.trigger_type);
    const context = `(This is an automated email triggered by: ${triggerDef?.label}. The target audience is: ${form.target_role}. Please use curly braces for these variables exactly as written if applicable: ${triggerDef?.variables?.join(', ')})`;

    try {
      const res = await fetch(`${API_BASE_URL}/api/generate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          intent: intent + " " + context, 
          tone, 
          subject: form.subject, 
          recipientDescription: form.target_role, 
          conferenceTitle: conf?.title, 
          senderRole: "organizer" 
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setForm(p => ({ ...p, body: data.body || p.body, subject: (!p.subject && data.subject) ? data.subject : p.subject }));
    } catch {
      setGenError('Failed to generate. Make sure your local backend is running.');
    }
    setGenerating(false);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-zinc-500" /></div>;

  return (
    <div className={cls("space-y-6 relative", isDark ? "text-slate-200" : "text-zinc-800")} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── List View Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Email Automations</h2>
          <p className={cls("text-sm mt-0.5", isDark ? "text-slate-400" : "text-zinc-500")}>
            Manage triggers and scheduled emails for your conference workflow.
          </p>
        </div>
        {!wizardOpen && (
          <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
            <Plus size={16} /> New Automation
          </button>
        )}
      </div>

      {/* ── Automations List ── */}
      {!wizardOpen && (
        <div className="grid gap-4 mt-6">
          {automations.length === 0 ? (
            <div className={cls("p-10 rounded-2xl border border-dashed text-center", isDark ? "border-white/10" : "border-zinc-200")}>
              <Sparkles size={32} className={cls("mx-auto mb-3", isDark ? "text-slate-600" : "text-zinc-300")} />
              <div className="text-sm font-semibold">No Automations Found</div>
              <div className={cls("text-xs mt-1", isDark ? "text-slate-500" : "text-zinc-500")}>Create your first rule to automate routine emails.</div>
            </div>
          ) : (
            automations.map(auto => {
              const Icon = TRIGGERS.find(t => t.id === auto.trigger_type)?.icon || Zap;
              const triggerName = TRIGGERS.find(t => t.id === auto.trigger_type)?.label || auto.trigger_type;
              return (
                <div key={auto.id} className={cls(
                  "p-5 rounded-2xl border transition-all flex items-center justify-between",
                  isDark ? "bg-[#0d1117] border-white/5 hover:border-white/15" : "bg-white border-zinc-200 hover:border-zinc-300"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cls(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      auto.is_active ? (isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-600") : (isDark ? "bg-white/5 text-slate-500" : "bg-zinc-100 text-zinc-400")
                    )}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{auto.title}</span>
                        {!auto.is_active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">PAUSED</span>}
                      </div>
                      <div className={cls("text-xs mt-1 flex items-center gap-1.5", isDark ? "text-slate-400" : "text-zinc-500")}>
                        <Zap size={10} className="text-amber-500" /> {triggerName} 
                        <span className="opacity-50">·</span> <Users size={10} /> {TARGET_ROLES.find(r => r.id === auto.target_role)?.label || auto.target_role}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(auto.id, auto.is_active)} className={cls("p-2 rounded-lg transition-all", auto.is_active ? "text-zinc-400 hover:text-red-500" : "text-zinc-400 hover:text-emerald-500")}>
                      {auto.is_active ? <PowerOff size={16} /> : <Power size={16} />}
                    </button>
                    <button onClick={() => openEdit(auto)} className="p-2 rounded-lg text-zinc-400 hover:text-indigo-400 transition-all"><Edit3 size={16} /></button>
                    <button onClick={() => deleteAuto(auto.id)} className="p-2 rounded-lg text-zinc-400 hover:text-red-400 transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Wizard Form ── */}
      <AnimatePresence>
        {wizardOpen && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={cls("p-6 md:p-8 rounded-3xl border shadow-xl relative", isDark ? "bg-[#0B0F1A] border-white/10" : "bg-white border-zinc-200")}>
            <button onClick={() => setWizardOpen(false)} className={cls("absolute top-6 right-6 p-2 rounded-full", isDark ? "hover:bg-white/10" : "hover:bg-zinc-100")}><X size={18} /></button>
            <h3 className="text-xl font-bold mb-6">{activeAuto ? 'Edit Automation' : 'New Automation'}</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Setup Column */}
              <div className="space-y-5">
                <div>
                  <FieldLabel label="Automation Name" isDark={isDark} />
                  <Input isDark={isDark} value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. 1-Week Reviewer Reminder" />
                </div>
                
                <div>
                  <FieldLabel label="When should this send?" isDark={isDark} />
                  <div className="grid gap-2">
                    {TRIGGERS.map(t => {
                      const sel = form.trigger_type === t.id;
                      return (
                        <div key={t.id} onClick={() => setForm({...form, trigger_type: t.id})} className={cls("flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all", sel ? (isDark ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-indigo-500 bg-indigo-50 text-indigo-700") : (isDark ? "border-white/5 hover:border-white/15" : "border-zinc-200 hover:border-zinc-300"))}>
                          <t.icon size={16} className={sel ? "text-indigo-500" : "text-zinc-400"} />
                          <span className="text-sm font-semibold">{t.label}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <FieldLabel label="Target Audience" isDark={isDark} />
                  <select value={form.target_role} onChange={e => setForm({...form, target_role: e.target.value})} className={cls("w-full rounded-xl px-4 py-3 text-sm border outline-none appearance-none", isDark ? "bg-[#0d1117] border-white/10" : "bg-zinc-50 border-zinc-200")}>
                    {TARGET_ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>

                <div className={cls("p-4 rounded-xl border flex gap-3 text-sm", isDark ? "bg-indigo-500/5 border-indigo-500/20 text-indigo-200" : "bg-indigo-50 border-indigo-100 text-indigo-700")}>
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <strong>Available Variables: </strong>
                    <span className="font-mono">
                      {TRIGGERS.find(t => t.id === form.trigger_type)?.variables.join(', ') || 'None'}
                    </span>
                    <br/><span className="text-xs opacity-70 mt-1 block">Variables are injected securely when the event occurs.</span>
                  </div>
                </div>
              </div>

              {/* Template & AI Column */}
              <div className="space-y-5">
                
                {/* AI Generator Box */}
                <div className={cls("p-5 rounded-2xl border", isDark ? "bg-white/5 border-white/5" : "bg-zinc-50 border-zinc-200")}>
                  <FieldLabel label="Generate with AI" hint="Optional" isDark={isDark} />
                  <textarea
                    value={intent} onChange={e => setIntent(e.target.value)}
                    className={cls("w-full rounded-xl p-3 text-sm h-20 resize-none outline-none border", isDark ? "bg-black/30 border-white/10" : "bg-white border-zinc-200")}
                    placeholder="Describe what to say..."
                  />
                  <div className="flex flex-wrap gap-2 mt-3 mb-4">
                    {TONE_OPTIONS.map(t => (
                      <button key={t} onClick={() => setTone(t)} className={cls("text-[10px] px-2 py-1 rounded-lg border font-bold", tone === t ? (isDark ? "bg-white/20 text-white" : "bg-zinc-800 text-white") : "opacity-50 hover:opacity-100")}>{t}</button>
                    ))}
                  </div>
                  <button onClick={generateEmail} disabled={generating || !intent.trim()} className={cls("w-full py-2.5 rounded-xl font-bold flex justify-center items-center gap-2 text-xs", isDark ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-indigo-500 text-white hover:bg-indigo-600")}>
                    {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate Content
                  </button>
                  {genError && <div className="text-red-400 text-xs mt-2 text-center">{genError}</div>}
                </div>

                <div>
                  <FieldLabel label="Subject" isDark={isDark} />
                  <Input isDark={isDark} value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Email Subject..." />
                </div>

                <div>
                  <FieldLabel label="Email Body" isDark={isDark} />
                  <EmailBodyEditor isDark={isDark} value={form.body} onChange={v => setForm({...form, body: v})} />
                </div>
              </div>

            </div>

            <div className="mt-8 pt-6 border-t flex justify-end gap-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
              <button disabled={saving} onClick={saveAutomation} className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Rule
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmailAutomationsManager;
