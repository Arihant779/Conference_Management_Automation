import React, { useState, useEffect, useCallback } from 'react';
import { Star, CheckCircle, MessageSquare } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const cls = (...c) => c.filter(Boolean).join(' ');

/* ═════════════════════════════════════════════════════════════════
   FeedbackForm — respondent view for filling out feedback
═════════════════════════════════════════════════════════════════ */
const FeedbackForm = ({ conf }) => {
  const { user } = useApp();
  const confId = conf.conference_id || conf.id;

  const [form, setForm]             = useState(null);
  const [questions, setQuestions]   = useState([]);
  const [answers, setAnswers]       = useState({});
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

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
        question_id:   q.id,
        form_id:       form.id,
        user_id:       user.id,
        answer_bool:   q.question_type === 'yes_no'      ? val ?? null     : null,
        answer_rating: q.question_type === 'rating'      ? val ?? null     : null,
        answer_text:   q.question_type === 'descriptive' ? val ?? null     : null,
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
        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-white/3 border border-white/5 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!form || questions.length === 0) return null; // no published form

  if (submitted || alreadyDone) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-2xl p-8 text-center">
          <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">
            {alreadyDone && !submitted ? 'Feedback Already Submitted' : 'Thank You!'}
          </h3>
          <p className="text-sm text-emerald-300/70">
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
        <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/15 rounded-xl flex items-center justify-center text-indigo-400">
          <MessageSquare size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Conference Feedback</h3>
          <p className="text-xs text-slate-500">{questions.length} question{questions.length !== 1 ? 's' : ''} · {answeredCount} answered</p>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-[#0d1117] border border-white/6 rounded-xl p-5 hover:border-white/10 transition-all">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-xs text-slate-600 font-bold mt-0.5">{idx + 1}.</span>
              <h4 className="text-sm font-medium text-white flex-1">{q.question_text}</h4>
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
                      : 'border-white/8 text-slate-500 hover:text-emerald-400 hover:border-emerald-500/40'
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
                      : 'border-white/8 text-slate-500 hover:text-red-400 hover:border-red-500/40'
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
                          : 'text-slate-700 hover:text-amber-400/50'
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
                  className="w-full bg-white/4 border border-white/8 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none resize-none h-24 text-white placeholder-slate-600 transition-colors"
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
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
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
