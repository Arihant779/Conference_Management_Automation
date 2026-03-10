import React, { useState } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Star, ChevronDown, Eye, Send } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ReviewerDashboard = ({ conf, onBack }) => {
  const { papers = [], updatePaperStatus } = useApp();
  const confId = conf.conference_id || conf.id;
  const confPapers = papers.filter(p => p.confId === confId);
  const pendingPapers  = confPapers.filter(p => p.status === 'pending');
  const reviewedPapers = confPapers.filter(p => p.status !== 'pending');

  const [feedback, setFeedback] = useState({});
  const [scores, setScores] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [submitting, setSubmitting] = useState(null);

  const handleReview = async (paperId, decision) => {
    setSubmitting(paperId);
    await new Promise(r => setTimeout(r, 500));
    updatePaperStatus(paperId, decision, scores[paperId] || 70);
    setSubmitting(null);
  };

  const ScoreButton = ({ paperId, score }) => (
    <button
      onClick={() => setScores(s => ({ ...s, [paperId]: score }))}
      className={`w-9 h-9 rounded-lg text-xs font-bold transition-all border ${
        scores[paperId] === score
          ? 'bg-indigo-600 border-indigo-500 text-white'
          : 'border-white/8 text-slate-500 hover:border-white/20 hover:text-white'
      }`}
    >
      {score}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#080b11]/90 backdrop-blur-xl border-b border-white/6 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-slate-500 hover:text-white text-xs font-semibold transition-colors">← Back</button>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-sm font-semibold text-white">{conf.title}</span>
          </div>
          <span className="text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
            Reviewer
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Review Portal</h2>
            <p className="text-slate-500 text-sm mt-1">
              {pendingPapers.length > 0
                ? `${pendingPapers.length} paper${pendingPapers.length !== 1 ? 's' : ''} awaiting your review`
                : 'All reviews complete'}
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-[#0d1117] border border-white/6 rounded-xl px-4 py-2 text-center">
              <div className="text-xl font-bold text-amber-400">{pendingPapers.length}</div>
              <div className="text-[10px] text-slate-600 uppercase font-bold">Pending</div>
            </div>
            <div className="bg-[#0d1117] border border-white/6 rounded-xl px-4 py-2 text-center">
              <div className="text-xl font-bold text-emerald-400">{reviewedPapers.length}</div>
              <div className="text-[10px] text-slate-600 uppercase font-bold">Reviewed</div>
            </div>
          </div>
        </div>

        {/* Pending papers */}
        {pendingPapers.length > 0 ? (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Pending Review</h3>
            {pendingPapers.map(paper => (
              <div key={paper.id} className="bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden hover:border-white/10 transition-all">
                {/* Paper header */}
                <div
                  className="p-5 flex items-center justify-between cursor-pointer"
                  onClick={() => setExpanded(expanded === paper.id ? null : paper.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-500/10 border border-indigo-500/15 rounded-xl flex items-center justify-center text-indigo-400 text-sm font-bold">
                      {paper.title?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{paper.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {paper.authorId ? `Author: ${paper.authorId}` : 'Anonymous Submission'}
                        {paper.submittedAt && ` · ${new Date(paper.submittedAt).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/15 px-2 py-1 rounded-md">Pending</span>
                    <ChevronDown size={16} className={`text-slate-500 transition-transform ${expanded === paper.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded review form */}
                {expanded === paper.id && (
                  <div className="border-t border-white/5 p-5 space-y-5 bg-black/20">
                    {paper.abstract && (
                      <div>
                        <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-2">Abstract</div>
                        <p className="text-sm text-slate-400 leading-relaxed">{paper.abstract}</p>
                      </div>
                    )}

                    {/* Score */}
                    <div>
                      <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-2">Score (1–10)</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {[1,2,3,4,5,6,7,8,9,10].map(s => (
                          <ScoreButton key={s} paperId={paper.id} score={s * 10} />
                        ))}
                      </div>
                    </div>

                    {/* Feedback */}
                    <div>
                      <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-2">Confidential Feedback</div>
                      <textarea
                        placeholder="Enter your review comments, suggestions, and reasoning..."
                        className="w-full bg-white/4 border border-white/8 rounded-xl p-3.5 text-sm h-28 focus:border-indigo-500 outline-none resize-none text-white placeholder-slate-600 transition-colors"
                        value={feedback[paper.id] || ''}
                        onChange={e => setFeedback(f => ({ ...f, [paper.id]: e.target.value }))}
                      />
                    </div>

                    {/* Decision buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReview(paper.id, 'accepted')}
                        disabled={submitting === paper.id}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <CheckCircle size={16} /> Accept Paper
                      </button>
                      <button
                        onClick={() => handleReview(paper.id, 'rejected')}
                        disabled={submitting === paper.id}
                        className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <XCircle size={16} /> Reject Paper
                      </button>
                    </div>
                    {submitting === paper.id && (
                      <div className="text-center text-xs text-slate-500">Submitting review...</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center border-2 border-dashed border-white/6 rounded-2xl">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <CheckCircle size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-1.5">All Caught Up!</h3>
            <p className="text-slate-500 text-sm">No papers pending review. Check back later.</p>
          </div>
        )}

        {/* Reviewed papers */}
        {reviewedPapers.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">Previously Reviewed</h3>
            {reviewedPapers.map(paper => (
              <div key={paper.id} className="bg-[#0d1117]/50 border border-white/4 rounded-xl px-5 py-3.5 flex items-center justify-between opacity-70">
                <span className="text-sm text-slate-400 font-medium">{paper.title}</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${
                  paper.status === 'accepted'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {paper.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewerDashboard;