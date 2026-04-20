import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Edit2, Trash2, Save, Eye, GripVertical,
  ToggleLeft, Star, AlignLeft, Send, CheckCircle
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import FeedbackSummary from './FeedbackSummary';
import { useApp } from '../../context/AppContext';

/* ── tiny primitives (match OrganizerDashboard style) ─────────── */
const cls = (...c) => c.filter(Boolean).join(' ');

const Btn = ({ variant = 'primary', children, className, isDark, ...props }) => {
  const base = 'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed';
  const v = {
    primary: isDark 
      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
      : 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20',
    secondary: isDark 
      ? 'border border-white/10 text-slate-400 hover:text-white hover:bg-white/5' 
      : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300',
    danger: isDark
      ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20'
      : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20',
  };
  return <button {...props} className={cls(base, v[variant], className)}>{children}</button>;
};

const QUESTION_TYPES = [
  { value: 'yes_no', label: 'Yes / No', icon: ToggleLeft, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { value: 'rating', label: 'Rating (★ 1-5)', icon: Star, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { value: 'descriptive', label: 'Descriptive', icon: AlignLeft, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
];

/* ═════════════════════════════════════════════════════════════════
   FeedbackManager — organizer view for managing feedback forms
═════════════════════════════════════════════════════════════════ */
const FeedbackManager = ({ conf }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const confId = conf.conference_id || conf.id;

  const [form, setForm] = useState(null);      // the feedback_forms row
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // add-question form
  const [showAdd, setShowAdd] = useState(false);
  const [newType, setNewType] = useState('yes_no');
  const [newText, setNewText] = useState('');

  // inline edit
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editType, setEditType] = useState('');

  /* ── fetch / create form ── */
  const fetchForm = useCallback(async () => {
    setLoading(true);

    // try to find existing form
    let { data: rows, error: fetchErr } = await supabase
      .from('feedback_forms')
      .select('*')
      .eq('conference_id', confId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchErr) {
      console.error('[FeedbackManager] fetch form error:', fetchErr);
      alert('Error fetching feedback form configuration: ' + fetchErr.message);
    }
    
    let existing = rows && rows.length > 0 ? rows[0] : null;

    if (!existing && confId) {
      // create one
      console.log('[FeedbackManager] No form found, creating for conference:', confId);
      const { data: created, error: insertErr } = await supabase
        .from('feedback_forms')
        .insert([{ conference_id: confId, is_published: false }])
        .select()
        .single();
      
      if (insertErr) {
        console.error('[FeedbackManager] insert form error:', insertErr);
        // Don't alert here yet, maybe we hit a race condition where it was created in another tab
        // Let's try one more quick fetch before giving up
        const { data: retryRows } = await supabase.from('feedback_forms').select('*').eq('conference_id', confId).limit(1);
        if (retryRows && retryRows.length > 0) {
           existing = retryRows[0];
        } else {
           alert('Failed to initialize feedback form. Please try refreshing the page.');
        }
      } else {
        existing = created;
      }
    }

    console.log('[FeedbackManager] Current form state:', { id: existing?.id, confId, published: existing?.is_published });
    setForm(existing);

    if (existing) {
      const { data: qs, error: qErr } = await supabase
        .from('feedback_questions')
        .select('*')
        .eq('form_id', existing.id)
        .order('sort_order', { ascending: true });
      if (qErr) console.error('[FeedbackManager] fetch questions error:', qErr);
      setQuestions(qs || []);
    }

    setLoading(false);
  }, [confId]);

  useEffect(() => { fetchForm(); }, [fetchForm]);

  /* ── add question ── */
  const addQuestion = async () => {
    if (!newText.trim()) return;
    if (!form) {
      alert('Hardware Error: Feedback form not initialized correctly. Please refresh.');
      return;
    }
    
    setSaving(true);
    const { error } = await supabase.from('feedback_questions').insert([{
      form_id: form.id,
      question_text: newText.trim(),
      question_type: newType,
      sort_order: questions.length,
    }]);
    
    if (error) {
      console.error('[FeedbackManager] add question error:', error);
      alert('Failed to save question: ' + error.message);
    }
    setSaving(false);
    if (!error) {
      setNewText('');
      setShowAdd(false);
      fetchForm();
    }
  };

  /* ── edit question ── */
  const startEdit = (q) => { setEditingId(q.id); setEditText(q.question_text); setEditType(q.question_type); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); setEditType(''); };
  const saveEdit = async () => {
    if (!editText.trim()) return;
    setSaving(true);
    await supabase.from('feedback_questions')
      .update({ question_text: editText.trim(), question_type: editType })
      .eq('id', editingId);
    setSaving(false);
    cancelEdit();
    fetchForm();
  };

  /* ── delete question ── */
  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question? All responses to it will also be deleted.')) return;
    await supabase.from('feedback_questions').delete().eq('id', id);
    fetchForm();
  };

  /* ── publish / unpublish ── */
  const togglePublish = async () => {
    if (!form) return;
    const willPublish = !form.is_published;
    setSaving(true);

    const { error } = await supabase.from('feedback_forms')
      .update({ is_published: willPublish, updated_at: new Date().toISOString() })
      .eq('id', form.id);

    if (error) {
      console.error('[FeedbackManager] Toggle publish error:', error);
      alert('Failed to update form status: ' + error.message);
      setSaving(false);
      return;
    }

    // send notification when publishing
    if (willPublish) {
      await supabase.from('notifications').insert([{
        conference_id: confId,
        title: 'Feedback Form Updated',
        message: 'The feedback form has been updated. Please share your responses!',
        target_role: null,
        created_at: new Date().toISOString(),
      }]);
    }

    setSaving(false);
    setForm(f => ({ ...f, is_published: willPublish }));
    console.log('[FeedbackManager] Successfully toggled is_published to:', willPublish);
  };

  /* ── response count ── */
  const [responseCount, setResponseCount] = useState(0);
  useEffect(() => {
    if (!form) return;
    (async () => {
      const { data } = await supabase
        .from('feedback_responses')
        .select('user_id')
        .eq('form_id', form.id);
      const unique = new Set((data || []).map(r => r.user_id));
      setResponseCount(unique.size);
    })();
  }, [form]);

  /* ── render ── */
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className={cls("h-16 rounded-xl animate-pulse border", isDark ? "bg-white/3 border-white/5" : "bg-zinc-100 border-zinc-200")} />)}
      </div>
    );
  }

  const typeInfo = (t) => QUESTION_TYPES.find(qt => qt.value === t) || QUESTION_TYPES[0];

  return (
    <div className={cls("space-y-6 animate-in fade-in duration-700", isDark ? "text-white" : "text-zinc-900")}>
      {/* Header */}
      <div className="flex justify-between items-center bg-transparent">
        <div>
          <h2 className={cls("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-zinc-900")}>Feedback Designer</h2>
          <p className={cls("text-sm mt-0.5", isDark ? "text-slate-500" : "text-zinc-500")}>
            {questions.length} question{questions.length !== 1 ? 's' : ''}
            {form?.is_published && <span className="text-emerald-500 ml-2 font-bold">· Published</span>}
            {responseCount > 0 && <span className="text-amber-500 ml-2 font-bold">· {responseCount} response{responseCount !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {form?.is_published ? (
             <div className={cls("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center gap-2", 
               isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600")}>
               <CheckCircle size={14} /> Published & Live
             </div>
          ) : (
            <>
              <Btn isDark={isDark} variant="secondary" onClick={() => setShowAdd(true)}>
                <Plus size={15} />Add Question
              </Btn>
              <Btn
                isDark={isDark}
                variant="success"
                onClick={togglePublish}
                disabled={saving || questions.length === 0}
              >
                <Send size={14} /> Activate Form
              </Btn>
            </>
          )}
        </div>
      </div>

      {/* Status banner */}
      {form?.is_published && (
        <div className={cls("rounded-[1.25rem] px-6 py-4 flex items-center gap-4 border transition-all animate-in slide-in-from-top-4", isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200 shadow-lg shadow-emerald-500/5")}>
          <div className={cls("w-10 h-10 rounded-full flex items-center justify-center shrink-0", isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-white text-emerald-600 shadow-sm")}>
             <CheckCircle size={20} />
          </div>
          <div>
            <div className={cls("text-sm font-bold", isDark ? "text-emerald-300" : "text-emerald-700")}>Feedback is Live</div>
            <div className={cls("text-xs", isDark ? "text-emerald-400/60" : "text-emerald-600")}>All conference members can now access and respond to this questionnaire.</div>
          </div>
        </div>
      )}

      {/* Questions list */}
      {questions.length === 0 ? (
        <div className={cls("py-20 text-center border-2 border-dashed rounded-[2rem] animate-in zoom-in-95", isDark ? "border-white/5 bg-white/2" : "border-zinc-200 bg-zinc-50")}>
          <AlignLeft size={48} className={cls("mx-auto mb-4 opacity-20", isDark ? "text-white" : "text-zinc-900")} />
          <p className={cls("text-sm font-medium", isDark ? "text-slate-500" : "text-zinc-500")}>Your feedback form is empty.</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 text-amber-500 text-sm hover:underline font-bold transition-all">Create your first question →</button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => {
            const info = typeInfo(q.question_type);
            const Icon = info.icon;
            const isEditing = editingId === q.id;

            return (
              <div key={q.id} className={cls(
                  "rounded-2xl px-6 py-5 border transition-all animate-in slide-in-from-bottom-2 group relative",
                  isDark ? "bg-[#0d1117] border-white/6 hover:border-amber-500/30" : "bg-white border-zinc-200 hover:border-amber-500 shadow-sm shadow-zinc-500/5"
                )}>
                {isEditing ? (
                  /* ── EDIT MODE ── */
                  <div className="space-y-4">
                    <input
                      className={cls(
                        "w-full rounded-xl px-5 py-3 text-sm outline-none transition-all font-medium border",
                        isDark ? "bg-black/40 border-white/10 text-white focus:border-amber-500 placeholder-slate-700" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-amber-500 placeholder-zinc-300"
                      )}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2 flex-wrap">
                      {QUESTION_TYPES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setEditType(t.value)}
                          className={cls(
                            'px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2',
                            editType === t.value
                              ? isDark ? 'bg-amber-600 border-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-white border-amber-500 text-amber-600 shadow-sm'
                              : isDark ? 'bg-black/20 border-white/5 text-slate-500 hover:text-slate-300' : 'bg-zinc-50 border-zinc-100 text-zinc-400 hover:bg-white'
                          )}
                        >
                          <t.icon size={12} />
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                       <Btn isDark={isDark} variant="secondary" className="text-xs py-2 px-6" onClick={cancelEdit}>Cancel</Btn>
                       <Btn isDark={isDark} className="text-xs py-2 px-6" onClick={saveEdit} disabled={saving || !editText.trim()}>
                          <Save size={13} />Save Changes
                       </Btn>
                    </div>
                  </div>
                ) : (
                  /* ── VIEW MODE ── */
                  <div className="flex items-center gap-5">
                    <div className={cls("shrink-0 cursor-grab active:cursor-grabbing transition-colors", isDark ? "text-slate-700 hover:text-slate-500" : "text-zinc-200 hover:text-zinc-400")}>
                      <GripVertical size={18} />
                    </div>
                    <div className={cls("w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0", isDark ? "bg-white/5 text-slate-500" : "bg-zinc-100 text-zinc-400")}>
                       {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cls("text-sm font-bold", isDark ? "text-white" : "text-zinc-900")}>{q.question_text}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={cls('text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest flex items-center gap-1.5', 
                          isDark ? info.bg + ' ' + info.color : 'bg-white border-zinc-100 ' + info.color.replace('text-', 'text-'))}>
                          <Icon size={10} /> {info.label}
                        </span>
                      </div>
                    </div>
                    {!form?.is_published && (
                      <div className="flex gap-1.5 transition-all">
                        <button onClick={() => startEdit(q)} className={cls("p-2 rounded-xl transition-all", isDark ? "text-slate-600 hover:text-white hover:bg-white/10" : "text-zinc-300 hover:text-zinc-900 hover:bg-zinc-50 hover:border-zinc-200")}>
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => deleteQuestion(q.id)} className={cls("p-2 rounded-xl transition-all", isDark ? "text-slate-600 hover:text-red-400 hover:bg-red-500/10" : "text-zinc-300 hover:text-red-600 hover:bg-red-50")}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Actions footer */}
      {questions.length > 0 && (
        <div className={cls("pt-6 border-t flex flex-col sm:flex-row gap-4", isDark ? "border-white/6" : "border-zinc-200")}>
          {form?.is_published ? (
            <Btn
              isDark={isDark}
              variant="secondary"
              className="w-full py-4 justify-center rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]"
              onClick={() => setShowSummary(true)}
            >
              <Eye size={16} /> View Responses & Analytics
            </Btn>
          ) : (
            <>
              <Btn
                isDark={isDark}
                variant="secondary"
                className="flex-1 py-4 justify-center rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]"
                onClick={() => setShowSummary(true)}
              >
                <Eye size={16} /> Analytics Dashboard
              </Btn>
              <Btn
                isDark={isDark}
                variant="secondary"
                className="flex-1 py-4 justify-center rounded-2xl text-[10px] font-black uppercase tracking-[0.2em]"
                onClick={() => setShowAdd(true)}
              >
                <Plus size={16} /> New Question
              </Btn>
            </>
          )}
        </div>
      )}

      {/* ── Add Question Panel (Modal) ── */}
      {showAdd && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className={cls("rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl border animate-in zoom-in-95 duration-300", isDark ? "bg-[#0d1117] border-white/10" : "bg-white border-zinc-200")}>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className={cls("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-zinc-900")}>New Insight</h3>
                <p className={cls("text-xs font-medium", isDark ? "text-slate-600" : "text-zinc-400")}>Design a target question for your audience</p>
              </div>
              <button onClick={() => setShowAdd(false)} className={cls("p-2.5 rounded-2xl transition-all", isDark ? "hover:bg-white/8 text-slate-500 hover:text-white" : "hover:bg-zinc-100 text-zinc-300 hover:text-zinc-900")}>
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8">
              {/* Question type selector */}
              <div>
                <label className={cls("text-[10px] font-black uppercase tracking-[0.2em] block mb-4", isDark ? "text-slate-600" : "text-zinc-400")}>Response Format</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {QUESTION_TYPES.map(t => {
                    const TIcon = t.icon;
                    const isSelected = newType === t.value;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setNewType(t.value)}
                        className={cls(
                          'p-5 rounded-3xl border-2 text-center transition-all group/type active:scale-95',
                          isSelected
                            ? isDark ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10' : 'border-amber-500 bg-amber-50/50 shadow-lg shadow-amber-500/5'
                            : isDark ? 'border-white/5 hover:border-white/10 bg-white/2' : 'border-zinc-100 hover:border-zinc-200 bg-zinc-50'
                        )}
                      >
                        <TIcon size={24} className={cls('mx-auto mb-3 transition-transform group-hover/type:scale-110', isSelected ? 'text-amber-500' : isDark ? 'text-slate-700' : 'text-zinc-300')} />
                        <div className={cls('text-[10px] font-black uppercase tracking-widest', isSelected ? isDark ? 'text-white' : 'text-amber-600' : isDark ? 'text-slate-600' : 'text-zinc-400')}>{t.label.split(' ')[0]}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question text */}
              <div>
                <label className={cls("text-[10px] font-black uppercase tracking-[0.2em] block mb-3", isDark ? "text-slate-600" : "text-zinc-400")}>Your Inquiry</label>
                <input
                  className={cls(
                    "w-full rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all border",
                    isDark ? "bg-black/40 border-white/8 focus:border-amber-500 text-white placeholder-slate-800" : "bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-amber-500 placeholder-zinc-300"
                  )}
                  placeholder="e.g. How would you rate the keynote presentation?"
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addQuestion()}
                  autoFocus
                />
              </div>

              {/* Preview */}
              <div className={cls("rounded-3xl p-6 border overflow-hidden relative", isDark ? "bg-white/2 border-white/5" : "bg-zinc-50/50 border-zinc-100")}>
                <div className={cls("text-[9px] font-black uppercase tracking-[0.3em] mb-4 opacity-40", isDark ? "text-white" : "text-zinc-900")}>LIVE Preview</div>
                <div className={cls("text-sm font-bold mb-4 italic", isDark ? "text-slate-400" : "text-zinc-600")}>"{newText || 'Type your question above...'}"</div>
                
                <div className="flex gap-2">
                  {newType === 'yes_no' && (
                    <>
                      <div className={cls("px-4 py-2 rounded-xl text-[10px] font-black border", isDark ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white border-emerald-200 text-emerald-600")}>YES</div>
                      <div className={cls("px-4 py-2 rounded-xl text-[10px] font-black border", isDark ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-white border-red-200 text-red-600")}>NO</div>
                    </>
                  )}
                  {newType === 'rating' && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} size={20} className={isDark ? "text-amber-500/20" : "text-amber-500/20"} />)}
                    </div>
                  )}
                  {newType === 'descriptive' && (
                    <div className={cls("h-12 w-full rounded-xl border-dashed border-2 opacity-50", isDark ? "border-white/10" : "border-zinc-200")} />
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <Btn isDark={isDark} variant="secondary" className="flex-1 py-4 rounded-2xl uppercase text-[10px] font-black tracking-widest" onClick={() => setShowAdd(false)}>Cancel</Btn>
              <Btn isDark={isDark} className="flex-1 py-4 rounded-2xl uppercase text-[10px] font-black tracking-widest shadow-xl" onClick={addQuestion} disabled={saving || !newText.trim()}>
                {saving ? 'Creating…' : 'Finalize & Add'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Summary Modal ── */}
      {showSummary && (
        <FeedbackSummary
          form={form}
          questions={questions}
          confId={confId}
          onClose={() => setShowSummary(false)}
        />
      )}
    </div>
  );
};

export default FeedbackManager;

