import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, X, Edit2, Trash2, Save, Eye, GripVertical,
  ToggleLeft, Star, AlignLeft, Send, CheckCircle
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import FeedbackSummary from './FeedbackSummary';

/* ── tiny primitives (match OrganizerDashboard style) ─────────── */
const cls = (...c) => c.filter(Boolean).join(' ');
const Btn = ({ variant = 'primary', children, className, ...props }) => {
  const base = 'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed';
  const v = {
    primary:   'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'border border-white/10 text-slate-400 hover:text-white hover:bg-white/5',
    danger:    'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
    success:   'bg-emerald-600 hover:bg-emerald-500 text-white',
  };
  return <button {...props} className={cls(base, v[variant], className)}>{children}</button>;
};

const QUESTION_TYPES = [
  { value: 'yes_no',      label: 'Yes / No',       icon: ToggleLeft, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  { value: 'rating',      label: 'Rating (★ 1-5)', icon: Star,       color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
  { value: 'descriptive', label: 'Descriptive',     icon: AlignLeft,  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
];

/* ═════════════════════════════════════════════════════════════════
   FeedbackManager — organizer view for managing feedback forms
═════════════════════════════════════════════════════════════════ */
const FeedbackManager = ({ conf }) => {
  const confId = conf.conference_id || conf.id;

  const [form, setForm]               = useState(null);      // the feedback_forms row
  const [questions, setQuestions]      = useState([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  // add-question form
  const [showAdd, setShowAdd]         = useState(false);
  const [newType, setNewType]         = useState('yes_no');
  const [newText, setNewText]         = useState('');

  // inline edit
  const [editingId, setEditingId]     = useState(null);
  const [editText, setEditText]       = useState('');
  const [editType, setEditType]       = useState('');

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

    if (fetchErr) console.error('[FeedbackManager] fetch form error:', fetchErr);
    let existing = rows && rows.length > 0 ? rows[0] : null;

    if (!existing) {
      // create one
      const { data: created, error: insertErr } = await supabase
        .from('feedback_forms')
        .insert([{ conference_id: confId }])
        .select()
        .single();
      if (insertErr) console.error('[FeedbackManager] insert form error:', insertErr);
      existing = created;
    }

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
    if (!newText.trim() || !form) {
      console.warn('[FeedbackManager] addQuestion blocked: newText=', newText, 'form=', form);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('feedback_questions').insert([{
      form_id:       form.id,
      question_text: newText.trim(),
      question_type: newType,
      sort_order:    questions.length,
    }]);
    if (error) console.error('[FeedbackManager] add question error:', error);
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

    await supabase.from('feedback_forms')
      .update({ is_published: willPublish, updated_at: new Date().toISOString() })
      .eq('id', form.id);

    // send notification when publishing
    if (willPublish) {
      await supabase.from('notifications').insert([{
        conference_id: confId,
        title:         'Feedback Form Updated',
        message:       'The feedback form has been updated. Please share your responses!',
        target_role:   null,
        created_at:    new Date().toISOString(),
      }]);
    }

    setSaving(false);
    setForm(f => ({ ...f, is_published: willPublish }));
  };

  /* ── response count ── */
  const [responseCount, setResponseCount] = useState(0);
  useEffect(() => {
    if (!form) return;
    (async () => {
      const { count } = await supabase
        .from('feedback_responses')
        .select('user_id', { count: 'exact', head: true })
        .eq('form_id', form.id);
      // count gives total rows, but we want unique users
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
        {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-white/3 border border-white/5 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  const typeInfo = (t) => QUESTION_TYPES.find(qt => qt.value === t) || QUESTION_TYPES[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Feedback</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            {questions.length} question{questions.length !== 1 ? 's' : ''}
            {form?.is_published && <span className="text-emerald-400 ml-2">· Published</span>}
            {responseCount > 0 && <span className="text-indigo-400 ml-2">· {responseCount} response{responseCount !== 1 ? 's' : ''}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={() => setShowAdd(true)}><Plus size={15}/>Add Question</Btn>
          <Btn
            variant={form?.is_published ? 'danger' : 'success'}
            onClick={togglePublish}
            disabled={saving || questions.length === 0}
          >
            <Send size={14}/>
            {form?.is_published ? 'Unpublish' : 'Save & Publish'}
          </Btn>
        </div>
      </div>

      {/* Status banner */}
      {form?.is_published && (
        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <CheckCircle size={18} className="text-emerald-400 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-emerald-300">Form is Live</div>
            <div className="text-xs text-emerald-400/60">All conference members can now see and respond to this feedback form.</div>
          </div>
        </div>
      )}

      {/* Questions list */}
      {questions.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-white/8 rounded-2xl">
          <AlignLeft size={28} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No questions yet. Add your first question to get started.</p>
          <button onClick={() => setShowAdd(true)} className="mt-3 text-indigo-400 text-sm hover:text-indigo-300 font-semibold">+ Add Question</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {questions.map((q, idx) => {
            const info = typeInfo(q.question_type);
            const Icon = info.icon;
            const isEditing = editingId === q.id;

            return (
              <div key={q.id} className="bg-[#0d1117] border border-white/6 rounded-xl px-5 py-4 hover:border-white/10 transition-all group">
                {isEditing ? (
                  /* ── EDIT MODE ── */
                  <div className="space-y-3">
                    <input
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500 placeholder-slate-600 transition-colors"
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
                            'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all',
                            editType === t.value
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'border-white/8 text-slate-500 hover:text-white hover:border-white/20'
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Btn variant="secondary" className="text-xs py-2" onClick={cancelEdit}>Cancel</Btn>
                      <Btn className="text-xs py-2" onClick={saveEdit} disabled={saving || !editText.trim()}>
                        <Save size={13}/>Save
                      </Btn>
                    </div>
                  </div>
                ) : (
                  /* ── VIEW MODE ── */
                  <div className="flex items-center gap-4">
                    <div className="text-slate-600 shrink-0 cursor-grab">
                      <GripVertical size={16} />
                    </div>
                    <span className="text-xs text-slate-600 font-bold shrink-0 w-5">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{q.question_text}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cls('text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider', info.bg, info.color)}>
                          <Icon size={10} className="inline mr-1" style={{verticalAlign: '-1px'}}/>{info.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(q)} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/8 transition-all"><Edit2 size={13}/></button>
                      <button onClick={() => deleteQuestion(q.id)} className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={13}/></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* View Summary button */}
      {questions.length > 0 && (
        <div className="pt-4 border-t border-white/6">
          <Btn
            variant="secondary"
            className="w-full py-3 justify-center"
            onClick={() => setShowSummary(true)}
          >
            <Eye size={16}/>View Summary
          </Btn>
        </div>
      )}

      {/* ── Add Question Panel ── */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Add Question</h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-all"><X size={17}/></button>
            </div>

            <div className="space-y-4">
              {/* Question type selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Question Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {QUESTION_TYPES.map(t => {
                    const TIcon = t.icon;
                    return (
                      <button
                        key={t.value}
                        onClick={() => setNewType(t.value)}
                        className={cls(
                          'p-3 rounded-xl border-2 text-center transition-all',
                          newType === t.value
                            ? 'border-indigo-500 bg-indigo-500/10'
                            : 'border-white/8 hover:border-white/20'
                        )}
                      >
                        <TIcon size={20} className={cls('mx-auto mb-1.5', newType === t.value ? 'text-indigo-400' : 'text-slate-600')} />
                        <div className={cls('text-xs font-semibold', newType === t.value ? 'text-white' : 'text-slate-500')}>{t.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question text */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Question</label>
                <input
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none text-white placeholder-slate-600 transition-colors"
                  placeholder="Enter your question..."
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addQuestion()}
                  autoFocus
                />
              </div>

              {/* Preview */}
              <div className="bg-white/3 border border-white/5 rounded-xl p-4">
                <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-2">Preview</div>
                <div className="text-sm text-white mb-2">{newText || 'Your question text...'}</div>
                {newType === 'yes_no' && (
                  <div className="flex gap-2">
                    <span className="px-4 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">Yes</span>
                    <span className="px-4 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">No</span>
                  </div>
                )}
                {newType === 'rating' && (
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => <Star key={s} size={20} className="text-amber-500/40" />)}
                  </div>
                )}
                {newType === 'descriptive' && (
                  <div className="h-12 bg-white/4 border border-white/8 rounded-lg" />
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Btn variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancel</Btn>
              <Btn className="flex-1" onClick={addQuestion} disabled={saving || !newText.trim()}>
                {saving ? 'Adding…' : 'Add Question'}
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
