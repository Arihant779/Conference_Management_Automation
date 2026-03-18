import React, { useState, useEffect, useCallback } from 'react';
import { X, Star, ThumbsUp, ThumbsDown, BarChart2, Users } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';

/* ── Sentiment word lists ─────────────────────────────────────── */
const POSITIVE_WORDS = new Set([
  'great', 'good', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'loved', 'best',
  'awesome', 'perfect', 'outstanding', 'brilliant', 'superb', 'impressive', 'helpful',
  'happy', 'enjoy', 'enjoyed', 'clear', 'nice', 'well', 'beautiful', 'pleased', 'positive',
  'recommend', 'valuable', 'informative', 'insightful', 'inspiring', 'organized', 'smooth',
  'friendly', 'supportive', 'useful', 'efficient', 'effective', 'innovative', 'exciting',
  'remarkable', 'satisfied', 'delighted', 'fabulous', 'incredible', 'thank', 'thanks'
]);
const NEGATIVE_WORDS = new Set([
  'bad', 'poor', 'terrible', 'horrible', 'awful', 'worst', 'hate', 'boring', 'confusing',
  'unclear', 'slow', 'disappointing', 'disappointed', 'waste', 'useless', 'difficult',
  'frustrating', 'annoying', 'complicated', 'problem', 'issue', 'lacking', 'weak', 'fail',
  'failed', 'missing', 'inadequate', 'mediocre', 'unorganized', 'chaotic', 'rude',
  'unhelpful', 'unpleasant', 'negative', 'overcrowded', 'noisy', 'late', 'delayed',
  'unsatisfied', 'worse', 'unprofessional', 'disorganized', 'unfriendly'
]);

const analyzeSentiment = (text) => {
  if (!text) return 'neutral';
  const words = text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  let pos = 0, neg = 0;
  words.forEach(w => {
    if (POSITIVE_WORDS.has(w)) pos++;
    if (NEGATIVE_WORDS.has(w)) neg++;
  });
  if (pos === 0 && neg === 0) return 'neutral';
  if (pos >= neg) return 'positive';
  return 'negative';
};

/* ── Pure SVG Donut ───────────────────────────────────────────── */
const DonutChart = ({ yes, no, yesLabel = 'Yes', noLabel = 'No', yesColor = '#10b981', noColor = '#ef4444' }) => {
  const total = yes + no;
  if (total === 0) return <div className="text-xs text-slate-600 text-center py-4">No responses yet</div>;
  const yesPct = Math.round((yes / total) * 100);
  const noPct = 100 - yesPct;
  const yesAngle = (yes / total) * 360;

  // SVG arc helpers
  const r = 60, cx = 80, cy = 80;
  const toRad = d => (d - 90) * (Math.PI / 180);
  const arc = (start, end) => {
    const s = { x: cx + r * Math.cos(toRad(start)), y: cy + r * Math.sin(toRad(start)) };
    const e = { x: cx + r * Math.cos(toRad(end)), y: cy + r * Math.sin(toRad(end)) };
    const large = end - start > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
  };

  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* No slice */}
        <path d={arc(yesAngle, 360)} fill={noColor} opacity="0.8" />
        {/* Yes slice */}
        {yesAngle > 0 && <path d={arc(0, Math.min(yesAngle, 359.999))} fill={yesColor} opacity="0.9" />}
        {/* Center hole */}
        <circle cx={cx} cy={cy} r="38" fill="#0d1117" />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="18" fontWeight="bold">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600">RESPONSES</text>
      </svg>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: yesColor }} />
          <span className="text-sm text-slate-300 font-medium">{yesLabel}</span>
          <span className="text-sm font-bold text-white ml-auto">{yesPct}%</span>
          <span className="text-xs text-slate-600">({yes})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: noColor }} />
          <span className="text-sm text-slate-300 font-medium">{noLabel}</span>
          <span className="text-sm font-bold text-white ml-auto">{noPct}%</span>
          <span className="text-xs text-slate-600">({no})</span>
        </div>
      </div>
    </div>
  );
};

/* ── Horizontal Bar Chart for Ratings ─────────────────────────── */
const RatingBarChart = ({ distribution, total, average }) => {
  const maxCount = Math.max(...Object.values(distribution), 1);
  const barColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

  return (
    <div className="space-y-4">
      {/* Average display */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} size={18} className={s <= Math.round(average) ? 'text-amber-400 fill-amber-400' : 'text-slate-700'} />
          ))}
        </div>
        <span className="text-2xl font-bold text-white">{average.toFixed(1)}</span>
        <span className="text-xs text-slate-500 font-medium">avg ({total} responses)</span>
      </div>

      {/* Bars */}
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map(star => {
          const count = distribution[star] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-3">
              <div className="flex items-center gap-1 w-12 shrink-0 justify-end">
                <span className="text-xs text-slate-400 font-semibold">{star}</span>
                <Star size={11} className="text-slate-500" />
              </div>
              <div className="flex-1 h-6 bg-white/4 rounded-lg overflow-hidden relative">
                <div
                  className="h-full rounded-lg transition-all duration-700 ease-out"
                  style={{
                    width: `${Math.max(pct, pct > 0 ? 3 : 0)}%`,
                    backgroundColor: barColors[star - 1],
                    opacity: 0.85,
                  }}
                />
              </div>
              <span className="text-xs text-slate-500 font-semibold w-12 text-right">{count} ({Math.round(pct)}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Sentiment Bar ────────────────────────────────────────────── */
const SentimentBar = ({ positive, negative, neutral, total }) => {
  if (total === 0) return <div className="text-xs text-slate-600 text-center py-4">No responses yet</div>;
  const posPct = Math.round((positive / total) * 100);
  const negPct = Math.round((negative / total) * 100);
  const neuPct = 100 - posPct - negPct;

  return (
    <div className="space-y-4">
      {/* Big numbers */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-3 text-center">
          <ThumbsUp size={16} className="text-emerald-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-emerald-400">{posPct}%</div>
          <div className="text-[10px] text-emerald-400/60 uppercase font-bold">Positive</div>
        </div>
        <div className="bg-slate-500/8 border border-slate-500/15 rounded-xl p-3 text-center">
          <BarChart2 size={16} className="text-slate-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-slate-400">{neuPct}%</div>
          <div className="text-[10px] text-slate-400/60 uppercase font-bold">Neutral</div>
        </div>
        <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-3 text-center">
          <ThumbsDown size={16} className="text-red-400 mx-auto mb-1" />
          <div className="text-xl font-bold text-red-400">{negPct}%</div>
          <div className="text-[10px] text-red-400/60 uppercase font-bold">Negative</div>
        </div>
      </div>

      {/* Combined bar */}
      <div className="h-4 bg-white/4 rounded-full overflow-hidden flex">
        <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${posPct}%` }} />
        <div className="h-full bg-slate-500 transition-all duration-700" style={{ width: `${neuPct}%` }} />
        <div className="h-full bg-red-500 transition-all duration-700" style={{ width: `${negPct}%` }} />
      </div>
      <div className="text-xs text-slate-600 text-center">{total} total response{total !== 1 ? 's' : ''}</div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════════════════════════ */
const FeedbackSummary = ({ form, questions, confId, onClose }) => {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchResponses = useCallback(async () => {
    const { data } = await supabase
      .from('feedback_responses')
      .select('*')
      .eq('form_id', form.id);
    setResponses(data || []);
    setLoading(false);
  }, [form]);

  useEffect(() => { fetchResponses(); }, [fetchResponses]);

  /* ── Realtime subscription ── */
  useEffect(() => {
    const channel = supabase
      .channel(`feedback-responses-${form.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'feedback_responses',
          filter: `form_id=eq.${form.id}`,
        },
        () => {
          // re-fetch all on any change
          fetchResponses();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [form.id, fetchResponses]);

  /* ── Process data per question ── */
  const getQuestionStats = (q) => {
    const qResponses = responses.filter(r => r.question_id === q.id);
    const total = qResponses.length;

    if (q.question_type === 'yes_no') {
      const yes = qResponses.filter(r => r.answer_bool === true).length;
      const no = qResponses.filter(r => r.answer_bool === false).length;
      return { type: 'yes_no', yes, no, total };
    }

    if (q.question_type === 'rating') {
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      qResponses.forEach(r => {
        if (r.answer_rating >= 1 && r.answer_rating <= 5) {
          distribution[r.answer_rating]++;
          sum += r.answer_rating;
        }
      });
      const average = total > 0 ? sum / total : 0;
      return { type: 'rating', distribution, total, average };
    }

    if (q.question_type === 'descriptive') {
      let positive = 0, negative = 0, neutral = 0;
      qResponses.forEach(r => {
        const s = analyzeSentiment(r.answer_text);
        if (s === 'positive') positive++;
        else if (s === 'negative') negative++;
        else neutral++;
      });
      return { type: 'descriptive', positive, negative, neutral, total, texts: qResponses.map(r => r.answer_text).filter(Boolean) };
    }

    return { total: 0 };
  };

  /* ── Unique respondents ── */
  const uniqueUsers = new Set(responses.map(r => r.user_id));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-[#0d1117] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#0d1117] border-b border-white/6 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h3 className="text-lg font-bold text-white">Feedback Summary</h3>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-slate-500 flex items-center gap-1"><Users size={11} />{uniqueUsers.size} respondent{uniqueUsers.size !== 1 ? 's' : ''}</span>
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs text-slate-500">{responses.length} total answers</span>
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Live</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-all"><X size={17} /></button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-white/3 border border-white/5 rounded-xl animate-pulse" />)}
            </div>
          ) : questions.map((q, idx) => {
            const stats = getQuestionStats(q);
            return (
              <div key={q.id} className="bg-white/2 border border-white/6 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs text-slate-600 font-bold">Q{idx + 1}</span>
                  <h4 className="text-sm font-semibold text-white flex-1">{q.question_text}</h4>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stats.total} responses</span>
                </div>

                {stats.type === 'yes_no' && (
                  <DonutChart yes={stats.yes} no={stats.no} />
                )}

                {stats.type === 'rating' && (
                  <RatingBarChart distribution={stats.distribution} total={stats.total} average={stats.average} />
                )}

                {stats.type === 'descriptive' && (
                  <SentimentBar positive={stats.positive} negative={stats.negative} neutral={stats.neutral} total={stats.total} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeedbackSummary;
