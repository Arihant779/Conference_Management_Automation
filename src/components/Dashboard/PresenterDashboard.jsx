import React, { useState } from 'react';
import { FileText, Calendar, CheckCircle, Award, Upload, Clock, ChevronRight, AlertCircle, X, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import FeedbackForm from './FeedbackForm';

const PresenterDashboard = ({ conf, onBack }) => {
  const { user, papers, addPaper } = useApp();
  const confId = conf.conference_id || conf.id;
  const confPapers = papers.filter(p => p.confId === confId);
  const myPaper = confPapers.find(p => p.authorId === user?.id);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperAbstract, setPaperAbstract] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!paperTitle.trim()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    addPaper({
      id: Date.now(),
      confId,
      title: paperTitle,
      abstract: paperAbstract,
      authorId: user?.id,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    });
    setShowUploadModal(false);
    setPaperTitle('');
    setPaperAbstract('');
    setSubmitting(false);
  };

  const statusConfig = {
    pending: { label: 'Under Review', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-500' },
    accepted: { label: 'Accepted', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-500' },
    rejected: { label: 'Not Accepted', color: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-500' },
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#080b11]/90 backdrop-blur-xl border-b border-white/6 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-slate-500 hover:text-white text-xs font-semibold transition-colors">
              ← Back
            </button>
            <div className="h-4 w-px bg-white/10" />
            <span className="text-sm font-semibold text-white">{conf.title}</span>
          </div>
          <span className="text-xs font-bold text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-md uppercase tracking-wider">
            Presenter
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-8 space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Author Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">Submit and track your paper submission</p>
        </div>

        {/* Conference info strip */}
        <div className="bg-[#0d1117] border border-white/6 rounded-xl p-4 flex items-center gap-6 flex-wrap">
          <div>
            <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-0.5">Conference</div>
            <div className="text-sm font-semibold text-white">{conf.title}</div>
          </div>
          {conf.start_date && (
            <div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-0.5">Date</div>
              <div className="text-sm text-slate-300 flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-600" />
                {new Date(conf.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
          )}
          {conf.location && (
            <div>
              <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-0.5">Location</div>
              <div className="text-sm text-slate-300">{conf.location}</div>
            </div>
          )}
        </div>

        {/* Submission area */}
        {myPaper ? (
          <div className="space-y-6">
            {/* Paper card */}
            <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/15 rounded-xl flex items-center justify-center text-indigo-400">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg leading-tight">{myPaper.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock size={11} />
                      {myPaper.submittedAt
                        ? `Submitted ${new Date(myPaper.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                        : 'Submitted'}
                    </p>
                  </div>
                </div>
                {(() => {
                  const cfg = statusConfig[myPaper.status] || statusConfig.pending;
                  return (
                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border ${cfg.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  );
                })()}
              </div>
              {myPaper.abstract && (
                <p className="text-sm text-slate-400 leading-relaxed border-t border-white/5 pt-4">
                  {myPaper.abstract}
                </p>
              )}
            </div>

            {/* Status detail cards */}
            {myPaper.status === 'accepted' && (
              <div className="bg-[#0a1a12] border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute right-6 top-6 opacity-8">
                  <Award size={80} className="text-emerald-400" />
                </div>
                <div className="flex items-center gap-3 mb-3 relative z-10">
                  <CheckCircle size={22} className="text-emerald-400" />
                  <h4 className="font-bold text-lg text-white">Congratulations! Paper Accepted</h4>
                </div>
                <p className="text-sm text-emerald-200/70 mb-5 max-w-lg relative z-10">
                  Your work has been selected for presentation at the conference. Please prepare your materials.
                </p>
                <div className="bg-emerald-950/50 border border-emerald-500/15 p-3.5 rounded-xl inline-block relative z-10">
                  <div className="text-[10px] text-emerald-500/70 uppercase tracking-widest mb-1 font-bold">Assigned Session</div>
                  <div className="font-bold text-emerald-200 text-sm">Main Hall · 2:00 PM</div>
                </div>
              </div>
            )}

            {myPaper.status === 'rejected' && (
              <div className="bg-[#1a0a0a] border border-red-500/20 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-bold text-white mb-1">Submission Not Accepted</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Your paper was not selected for this conference. Please check reviewer feedback if available, and consider resubmitting for future events.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {myPaper.status === 'pending' && (
              <div className="bg-[#0d1117] border border-amber-500/15 rounded-2xl p-5 flex items-start gap-3">
                <Clock size={18} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-white text-sm mb-0.5">Under Peer Review</h4>
                  <p className="text-sm text-slate-500">Your paper is currently being reviewed. You'll be notified when a decision has been made.</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => setShowUploadModal(true)}
            className="border-2 border-dashed border-white/8 rounded-2xl p-16 text-center cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/3 transition-all group"
          >
            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-400 group-hover:scale-105 transition-transform">
              <Upload size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Submit Your Paper</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">
              Upload your research for peer review. Ensure you follow the conference formatting guidelines.
            </p>
            <span className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 transition-colors">
              <Plus size={16} /> Submit Paper
            </span>
          </div>
        )}

        {/* Feedback */}
        <div className="border-t border-white/5 pt-8">
          <FeedbackForm conf={conf} />
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Submit Paper</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Paper Title *</label>
                <input
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 outline-none text-white placeholder-slate-600 transition-colors"
                  placeholder="Enter your paper title..."
                  value={paperTitle}
                  onChange={e => setPaperTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">Abstract</label>
                <textarea
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none resize-none h-32 text-white placeholder-slate-600 transition-colors"
                  placeholder="Brief summary of your paper..."
                  value={paperAbstract}
                  onChange={e => setPaperAbstract(e.target.value)}
                />
              </div>
              <div className="border border-dashed border-white/10 rounded-xl p-4 text-center">
                <Upload size={20} className="text-slate-600 mx-auto mb-1.5" />
                <p className="text-xs text-slate-600">PDF upload coming soon</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowUploadModal(false)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm font-semibold hover:text-white transition-all">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !paperTitle.trim()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold transition-all"
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

export default PresenterDashboard;