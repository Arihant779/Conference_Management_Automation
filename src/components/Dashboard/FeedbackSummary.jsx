import React, { useState, useEffect, useCallback } from 'react';
import { X, Star, ThumbsUp, ThumbsDown, BarChart2, Users } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

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

const cls = (...c) => c.filter(Boolean).join(' ');

/* ── Pure SVG Donut ───────────────────────────────────────────── */
const DonutChart = ({ yes, no, isDark, yesLabel = 'Yes', noLabel = 'No', yesColor = '#10b981', noColor = '#ef4444' }) => {
  const total = yes + no;
  if (total === 0) return <div className={cls("text-xs text-center py-8 opacity-50 font-bold", isDark ? "text-slate-600" : "text-zinc-400")}>Waiting for incoming data...</div>;
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
    <div className="flex flex-col md:flex-row items-center gap-10">
      <div className="relative">
        <svg width="160" height="160" viewBox="0 0 160 160" className="animate-in zoom-in duration-500">
          {/* No slice */}
          <path d={arc(yesAngle, 360)} fill={noColor} opacity="0.8" />
          {/* Yes slice */}
          {yesAngle > 0 && <path d={arc(0, Math.min(yesAngle, 359.999))} fill={yesColor} opacity="1" />}
          {/* Center hole */}
          <circle cx={cx} cy={cy} r="38" fill={isDark ? "#0d1117" : "#ffffff"} className="transition-colors duration-500" />
          <text x={cx} y={cy - 2} textAnchor="middle" fill={isDark ? "white" : "#000"} fontSize="16" fontWeight="900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill={isDark ? "#64748b" : "#94a3b8"} fontSize="8" fontWeight="800" letterSpacing="0.1em">TOTAL</text>
        </svg>
      </div>
      <div className="space-y-3 w-full max-w-[200px]">
        <div className={cls("flex items-center gap-3 p-3 rounded-2xl border", isDark ? "bg-white/2 border-white/5" : "bg-zinc-50 border-zinc-100 shadow-sm")}>
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: yesColor, boxShadow: `0 0 10px ${yesColor}40` }} />
          <span className={cls("text-xs font-bold", isDark ? "text-slate-300" : "text-zinc-700")}>{yesLabel}</span>
          <span className={cls("text-xs font-black ml-auto", isDark ? "text-white" : "text-zinc-900")}>{yesPct}%</span>
        </div>
        <div className={cls("flex items-center gap-3 p-3 rounded-2xl border", isDark ? "bg-white/2 border-white/5" : "bg-zinc-50 border-zinc-100 shadow-sm")}>
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: noColor, boxShadow: `0 0 10px ${noColor}40` }} />
          <span className={cls("text-xs font-bold", isDark ? "text-slate-300" : "text-zinc-700")}>{noLabel}</span>
          <span className={cls("text-xs font-black ml-auto", isDark ? "text-white" : "text-zinc-900")}>{noPct}%</span>
        </div>
      </div>
    </div>
  );
};

/* ── Horizontal Bar Chart for Ratings ─────────────────────────── */
const RatingBarChart = ({ distribution, total, average, isDark }) => {
  const barColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

  return (
    <div className="space-y-6">
      {/* Average display */}
      <div className={cls("flex items-center gap-6 p-6 rounded-3xl border", isDark ? "bg-white/3 border-white/6" : "bg-zinc-50 border-zinc-100")}>
        <div className={cls("text-5xl font-black tabular-nums tracking-tighter", isDark ? "text-white" : "text-zinc-900")}>{average.toFixed(1)}</div>
        <div className="flex-1">
          <div className="flex gap-1 mb-1.5">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} size={20} className={cls(s <= Math.round(average) ? 'text-amber-400 fill-amber-400' : isDark ? 'text-slate-800' : 'text-zinc-200')} />
            ))}
          </div>
          <p className={cls("text-[10px] font-black uppercase tracking-widest", isDark ? "text-slate-500" : "text-zinc-400")}>Average Rating From {total} users</p>
        </div>
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {[5, 4, 3, 2, 1].map(star => {
          const count = distribution[star] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={star} className="flex items-center gap-4 group/bar">
              <div className="flex items-center gap-1.5 w-10 shrink-0 justify-end">
                <span className={cls("text-[10px] font-black tabular-nums", isDark ? "text-slate-400" : "text-zinc-800")}>{star}</span>
                <Star size={10} className={isDark ? "text-slate-700" : "text-zinc-300"} />
              </div>
              <div className={cls("flex-1 h-3 rounded-full overflow-hidden relative", isDark ? "bg-black/40" : "bg-zinc-100 shadow-inner")}>
                <div
                  className="h-full rounded-full transition-all duration-1000 delay-300 ease-out"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColors[star - 1],
                    boxShadow: `0 0 15px ${barColors[star - 1]}60`,
                  }}
                />
              </div>
              <span className={cls("text-[10px] font-bold w-16 text-right tabular-nums", isDark ? "text-slate-600" : "text-zinc-400")}>
                  {Math.round(pct)}% <span className="opacity-40 ml-1">({count})</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── Sentiment Bar ────────────────────────────────────────────── */
const SentimentBar = ({ positive, negative, neutral, total, isDark }) => {
  if (total === 0) return <div className={cls("text-xs text-center py-8 opacity-50 font-bold", isDark ? "text-slate-600" : "text-zinc-400")}>Awaiting qualitative responses...</div>;
  const posPct = Math.round((positive / total) * 100);
  const negPct = Math.round((negative / total) * 100);
  const neuPct = 100 - posPct - negPct;

  return (
    <div className="space-y-8">
      {/* Big numbers */}
      <div className="grid grid-cols-3 gap-4">
        {[
            { label: 'Positive', pct: posPct, icon: <ThumbsUp />, color: 'emerald', isDark },
            { label: 'Neutral', pct: neuPct, icon: <BarChart2 />, color: 'slate', isDark },
            { label: 'Negative', pct: negPct, icon: <ThumbsDown />, color: 'red', isDark },
        ].map(s => (
            <div key={s.label} className={cls("rounded-3xl p-5 border transition-all text-center", 
                s.isDark 
                  ? `bg-${s.color}-500/5 border-${s.color}-500/15` 
                  : `bg-${s.color}-50 border-${s.color}-100 shadow-sm`
            )}>
              <div className={cls("w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-3", 
                  s.isDark ? `bg-${s.color}-500/10 text-${s.color}-400` : `bg-white text-${s.color}-600`
              )}>
                  {React.cloneElement(s.icon, { size: 16 })}
              </div>
              <div className={cls("text-2xl font-black tabular-nums tracking-tighter", s.isDark ? `text-${s.color}-400` : `text-${s.color}-700`)}>{s.pct}%</div>
              <div className={cls("text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mt-1", s.isDark ? `text-${s.color}-400` : `text-${s.color}-700`)}>{s.label}</div>
            </div>
        ))}
      </div>

      {/* Combined bar */}
      <div className="space-y-4">
          <div className={cls("h-5 rounded-full overflow-hidden flex", isDark ? "bg-white/5" : "bg-zinc-100 shadow-inner")}>
            <div className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.4)]" style={{ width: `${posPct}%` }} />
            <div className={cls("h-full transition-all duration-1000 border-x border-white/5", isDark ? "bg-slate-700" : "bg-zinc-300")} style={{ width: `${neuPct}%` }} />
            <div className="h-full bg-red-500 transition-all duration-1000 shadow-[0_0_20px_rgba(239,68,68,0.4)]" style={{ width: `${negPct}%` }} />
          </div>
          <div className={cls("text-[10px] font-bold text-center uppercase tracking-widest", isDark ? "text-slate-600" : "text-zinc-400")}>
              Semantic analysis of {total} descriptors
          </div>
      </div>
    </div>
  );
};

/* ═════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════════════════════════ */
const FeedbackSummary = ({ form, questions, confId, onClose }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback_responses', filter: `form_id=eq.${form.id}` }, () => {
        fetchResponses();
      })
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

  const uniqueUsers = new Set(responses.map(r => r.user_id));

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); border-radius: 10px; }
      `}</style>
      <div className={cls("rounded-[2.5rem] w-full max-w-4xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300", isDark ? "bg-[#0d1117] border-white/10" : "bg-white border-zinc-200")}>
        
        {/* Header */}
        <div className={cls("px-10 py-8 border-b flex justify-between items-center shrink-0", isDark ? "border-white/6 bg-white/2" : "border-zinc-100 bg-zinc-50/50")}>
          <div>
            <h3 className={cls("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-zinc-900")}>Experience Analytics</h3>
            <div className="flex items-center gap-4 mt-1.5">
              <span className={cls("text-xs font-bold flex items-center gap-1.5", isDark ? "text-slate-500" : "text-zinc-400")}><Users size={14} />{uniqueUsers.size} Respondents</span>
              <span className={cls("text-xs font-bold flex items-center gap-1.5", isDark ? "text-slate-500" : "text-zinc-400")}><Star size={14} />{responses.length} Active Answers</span>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                 <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                 </span>
                 <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Live Updates</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className={cls("p-3 rounded-2xl transition-all", isDark ? "hover:bg-white/8 text-slate-500 hover:text-white" : "hover:bg-zinc-100 text-zinc-300 hover:text-zinc-900")}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => <div key={i} className={cls("h-64 rounded-3xl animate-pulse border", isDark ? "bg-white/2 border-white/5" : "bg-zinc-50 border-zinc-100")} />)}
            </div>
          ) : questions.length === 0 ? (
              <div className="py-20 text-center">
                  <BarChart2 size={48} className={cls("mx-auto mb-4 opacity-10", isDark ? "text-white" : "text-zinc-900")} />
                  <p className={cls("text-sm font-bold", isDark ? "text-slate-600" : "text-zinc-400")}>Awaiting first form responses...</p>
              </div>
          ) : questions.map((q, idx) => {
            const stats = getQuestionStats(q);
            return (
              <div key={q.id} className={cls("rounded-[2rem] border p-8 space-y-8 animate-in slide-in-from-bottom-4 duration-500", isDark ? "bg-white/2 border-white/6" : "bg-white border-zinc-100 shadow-xl shadow-zinc-500/5")}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cls("w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shrink-0", isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-50 text-amber-600")}>
                       Q{idx + 1}
                    </div>
                    <h4 className={cls("text-lg font-bold tracking-tight", isDark ? "text-white" : "text-zinc-900")}>{q.question_text}</h4>
                  </div>
                  <div className={cls("px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest w-fit", isDark ? "bg-black/30 border-white/5 text-slate-500" : "bg-zinc-50 border-zinc-100 text-zinc-400")}>
                      {stats.total} SUBMISSIONS
                  </div>
                </div>

                <div className="animate-in fade-in slide-in-from-left-4 duration-1000 delay-300">
                    {stats.type === 'yes_no' && (
                    <DonutChart yes={stats.yes} no={stats.no} isDark={isDark} />
                    )}

                    {stats.type === 'rating' && (
                    <RatingBarChart distribution={stats.distribution} total={stats.total} average={stats.average} isDark={isDark} />
                    )}

                    {stats.type === 'descriptive' && (
                    <SentimentBar positive={stats.positive} negative={stats.negative} neutral={stats.neutral} total={stats.total} isDark={isDark} />
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeedbackSummary;
