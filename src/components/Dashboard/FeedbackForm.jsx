import React, { useState, useEffect, useCallback } from 'react';
import { Star, CheckCircle, MessageSquare } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const cls = (...c) => c.filter(Boolean).join(' ');

/* ═════════════════════════════════════════════════════════════════
   FeedbackForm — respondent view for filling out feedback
═════════════════════════════════════════════════════════════════ */
const FeedbackForm = ({ conf }) => {
  const { user, theme } = useApp();
  const isDark = theme === 'dark';
  const confId = conf.conference_id || conf.id;

  const [form, setForm] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const cls = (...c) => c.filter(Boolean).join(' ');

  /* ── fetch published form ── */
  const fetchForm = useCallback(async () => {
    setLoading(true);

    const { data: f } = await supabase
      .from('feedback_forms')
      .select('*')
      .eq('conference_id', confId)
      .eq('is_published', true)
      .maybeSingle();

    if (!f) { setLoading(false); return; }
    setForm(f);

    const { data: qs } = await supabase
      .from('feedback_questions')
      .select('*')
      .eq('form_id', f.id)
      .order('sort_order', { ascending: true });
    setQuestions(qs || []);

    // check if already submitted
    if (user) {
      const { data: existing } = await supabase
        .from('feedback_responses')
        .select('id')
        .eq('form_id', f.id)
        .eq('user_id', user.id)
        .limit(1);
      if (existing && existing.length > 0) {
        setAlreadyDone(true);
      }
    }

    setLoading(false);
  }, [confId, user]);

  useEffect(() => { fetchForm(); }, [fetchForm]);

  /* ── update a single answer ── */
  const setAnswer = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    if (!form || !user) return;
    setSubmitting(true);

    const rows = questions.map(q => {
      const val = answers[q.id];
      return {
        question_id: q.id,
        form_id: form.id,
        user_id: user.id,
        answer_bool: q.question_type === 'yes_no' ? val ?? null : null,
        answer_rating: q.question_type === 'rating' ? val ?? null : null,
        answer_text: q.question_type === 'descriptive' ? val ?? null : null,
      };
    }).filter(r => r.answer_bool !== null || r.answer_rating !== null || r.answer_text !== null);

    // upsert (unique on question_id + user_id)
    const { error } = await supabase
      .from('feedback_responses')
      .upsert(rows, { onConflict: 'question_id,user_id' });

    setSubmitting(false);
    if (!error) {
      setSubmitted(true);
    } else {
      alert('Failed to submit feedback: ' + error.message);
    }
  };

  /* ── guards ── */
  if (loading) {
    return (
      <div className="space-y-3 max-w-3xl mx-auto px-6 py-8">
        {[...Array(3)].map((_, i) => <div key={i} className={cls("h-16 border rounded-xl animate-pulse", isDark ? "bg-white/3 border-white/5" : "bg-zinc-50 border-zinc-100")} />)}
      </div>
    );
  }

  if (!form || questions.length === 0) return null; // no published form

  if (submitted || alreadyDone) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className={cls("border rounded-2xl p-8 text-center transition-all", isDark ? "bg-emerald-500/8 border-emerald-500/20" : "bg-emerald-50 border-emerald-100")}>
          <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
          <h3 className={cls("text-lg font-bold mb-1", isDark ? "text-white" : "text-emerald-800")}>
            {alreadyDone && !submitted ? 'Feedback Already Submitted' : 'Thank You!'}
          </h3>
          <p className={cls("text-sm", isDark ? "text-emerald-300/70" : "text-emerald-600")}>
            {alreadyDone && !submitted
              ? 'You have already submitted your feedback for this conference.'
              : 'Your feedback has been recorded successfully.'}
          </p>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== null && answers[k] !== '').length;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={cls("w-10 h-10 border rounded-xl flex items-center justify-center transition-all", 
          isDark ? "bg-indigo-500/10 border-indigo-500/15 text-indigo-400" : "bg-indigo-50 border-indigo-100 text-indigo-600 shadow-sm")}>
          <MessageSquare size={20} />
        </div>
        <div>
          <h3 className={cls("text-lg font-bold transition-colors", isDark ? "text-white" : "text-zinc-900")}>Conference Feedback</h3>
          <p className="text-xs text-slate-500">{questions.length} question{questions.length !== 1 ? 's' : ''} · {answeredCount} answered</p>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className={cls("border rounded-xl p-5 transition-all", isDark ? "bg-[#0d1117] border-white/6 hover:border-white/10" : "bg-white border-zinc-200 shadow-sm hover:border-zinc-300")}>
            <div className="flex items-start gap-3 mb-3">
              <span className="text-xs text-slate-600 font-bold mt-0.5">{idx + 1}.</span>
              <h4 className={cls("text-sm font-medium flex-1 transition-colors", isDark ? "text-white" : "text-zinc-800")}>{q.question_text}</h4>
            </div>

            {/* Yes / No */}
            {q.question_type === 'yes_no' && (
              <div className="flex gap-2 ml-6">
                <button
                  onClick={() => setAnswer(q.id, true)}
                  className={cls(
                    'px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all',
                    answers[q.id] === true
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                      : isDark ? 'border-white/8 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/40' : 'border-zinc-200 text-zinc-400 hover:text-emerald-600 hover:border-emerald-500/30'
                  )}
                >
                  Yes
                </button>
                <button
                  onClick={() => setAnswer(q.id, false)}
                  className={cls(
                    'px-6 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all',
                    answers[q.id] === false
                      ? 'bg-red-500/15 border-red-500 text-red-400'
                      : isDark ? 'border-white/8 text-slate-500 hover:text-red-400 hover:border-red-500/40' : 'border-zinc-200 text-zinc-400 hover:text-red-600 hover:border-red-500/30'
                  )}
                >
                  No
                </button>
              </div>
            )}

            {/* Rating */}
            {q.question_type === 'rating' && (
              <div className="flex gap-1.5 ml-6">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    onClick={() => setAnswer(q.id, s)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      size={28}
                      className={cls(
                        'transition-colors',
                        (answers[q.id] || 0) >= s
                          ? 'text-amber-400 fill-amber-400'
                          : isDark ? 'text-slate-700 hover:text-amber-400/50' : 'text-zinc-200 hover:text-amber-400/40'
                      )}
                    />
                  </button>
                ))}
                {answers[q.id] && (
                  <span className="text-xs text-slate-500 self-center ml-2">{answers[q.id]} / 5</span>
                )}
              </div>
            )}

            {/* Descriptive */}
            {q.question_type === 'descriptive' && (
              <div className="ml-6">
                <textarea
                  className={cls("w-full border rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none resize-none h-24 transition-all", 
                    isDark ? "bg-white/4 border-white/8 text-white placeholder-slate-600" : "bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/5")}
                  placeholder="Write your response..."
                  value={answers[q.id] || ''}
                  onChange={e => setAnswer(q.id, e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || answeredCount === 0}
        className={cls("w-full py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold transition-all flex items-center justify-center gap-2", 
          isDark ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 active:scale-95")}
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <CheckCircle size={16} />
            Submit Feedback ({answeredCount}/{questions.length})
          </>
        )}
      </button>
    </div>
  );
};

export default FeedbackForm;
