import React, { useState } from 'react';
import { Calendar, MapPin, FileText, Globe, ArrowRight, Upload, X, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/**
 * ConferencePage
 * Public-facing conference page for visitors (no role).
 */

const ConferencePage = ({ conf, onBack }) => {

  // SAFE DEFAULTS
  const { user, papers = [], addPaper } = useApp();

  const confId = conf.conference_id || conf.id;

  const [showSubmit, setShowSubmit] = useState(false);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperAbstract, setPaperAbstract] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // SAFE FIND
  const myPaper = user
    ? papers.find(p => p.confId === confId && p.authorId === user.id)
    : null;

  const handleSubmit = async () => {
    if (!paperTitle.trim() || !user) return;

    setSubmitting(true);

    await new Promise(r => setTimeout(r, 700));

    addPaper({
      id: Date.now(),
      confId,
      title: paperTitle,
      abstract: paperAbstract,
      authorId: user.id,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    });

    setSubmitting(false);
    setShowSubmit(false);
    setSubmitted(true);
    setPaperTitle('');
    setPaperAbstract('');
  };

  const dateLabel = conf.start_date
    ? new Date(conf.start_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    : null;

  return (
    <div className="bg-[#080b11] text-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* NAV */}


      {/* HERO */}
      <div className="relative h-64 overflow-hidden">

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={
            conf.banner_url
              ? { backgroundImage: `url(${conf.banner_url})` }
              : { background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }
          }
        />

        <div className="absolute inset-0 bg-gradient-to-t from-[#080b11] via-[#080b11]/50 to-transparent" />

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center w-full px-6">

          <div className="inline-block bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
            {conf.theme ?? 'Academic Conference'}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            {conf.title}
          </h1>

        </div>
      </div>

      {/* MAIN */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* META */}
        <div className="flex flex-wrap gap-5 text-sm">

          {dateLabel && (
            <div className="flex items-center gap-2 text-slate-400">
              <Calendar size={16} className="text-indigo-400" />
              {dateLabel}
            </div>
          )}

          {conf.location && (
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin size={16} className="text-indigo-400" />
              {conf.location}
            </div>
          )}

          {conf.website && (
            <a
              href={conf.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Globe size={16} />
              Conference Website
              <ArrowRight size={14} />
            </a>
          )}

        </div>

        {/* PAPER SUBMITTED */}
        {(myPaper || submitted) && (
          <div className="bg-emerald-950/50 border border-emerald-500/25 rounded-2xl p-5 flex items-center gap-3">

            <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
              <FileText size={18} />
            </div>

            <div>
              <div className="font-semibold text-white text-sm">Paper Submitted</div>
              <div className="text-xs text-emerald-300/70 mt-0.5 flex items-center gap-1">
                <Clock size={11} /> Under review · You'll be notified of updates
              </div>
            </div>

          </div>
        )}

        {/* DESCRIPTION */}
        {conf.description && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3">About</h2>
            <p className="text-slate-400 leading-relaxed">{conf.description}</p>
          </div>
        )}

      </div>

      {/* SUBMIT MODAL */}
      {showSubmit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">

          <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">

            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Submit Paper</h3>

              <button
                onClick={() => setShowSubmit(false)}
                className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">

              <input
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white"
                placeholder="Paper Title"
                value={paperTitle}
                onChange={(e) => setPaperTitle(e.target.value)}
              />

              <textarea
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white h-28"
                placeholder="Abstract"
                value={paperAbstract}
                onChange={(e) => setPaperAbstract(e.target.value)}
              />

            </div>

            <div className="flex gap-3 mt-6">

              <button
                onClick={() => setShowSubmit(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting || !paperTitle.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
              >
                {submitting ? 'Submitting...' : 'Submit Paper'}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ConferencePage;
