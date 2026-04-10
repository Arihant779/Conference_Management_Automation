import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Clock, Star, ChevronDown, Eye, Send, Loader2, ExternalLink, Bell } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';
import MemberNotifications from './MemberNotifications';
import FeedbackForm from './FeedbackForm';
import { CinematicBackground } from './Organizer/components/common/Effects';
import Sidebar from './Organizer/components/Sidebar';

const ReviewerDashboard = ({ conf, onBack }) => {
  const { user } = useApp();
  const confId = conf.conference_id || conf.id;

  const [assignedPapers, setAssignedPapers] = useState([]);
  const [loadingPapers, setLoadingPapers] = useState(true);

  const pendingPapers = assignedPapers.filter(a => a.status === 'pending');
  const reviewedPapers = assignedPapers.filter(a => a.status !== 'pending');

  const [expertise, setExpertise] = useState('');
  const [localExpertise, setLocalExpertise] = useState(''); // Fix typing lag
  const [maxPapers, setMaxPapers] = useState(3);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [section, setSection] = useState('papers');

  const cls = (...c) => c.filter(Boolean).join(' ');

  const nav = [
    { id: 'papers', label: 'Review Papers', icon: FileText, badge: pendingPapers.length || null },
    { id: 'feedback', label: 'Feedback', icon: Star, badge: null },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: null },
  ];

  const fetchPrefs = React.useCallback(async () => {
    const { data } = await supabase
      .from('conference_user')
      .select('expertise, max_papers')
      .eq('conference_id', confId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      const exp = data.expertise || '';
      setExpertise(exp);
      setLocalExpertise(exp);
      setMaxPapers(data.max_papers || 3);
      if (exp) setIsEditing(false);
      else setIsEditing(true);
    } else {
      setIsEditing(true);
    }
    setLoadingPrefs(false);
  }, [confId, user.id]);

  const fetchAssignedPapers = React.useCallback(async () => {
    if (!user || !confId) return;
    setLoadingPapers(true);

    const { data, error } = await supabase
      .from('paper_assignments')
      .select(`
        id,
        reviewer_id,
        paper_id,
        status,
        score,
        feedback,
        paper:paper_id (
          paper_id,
          paper_title,
          abstract,
          file_url,
          author_id
        )
      `)
      .eq('conference_id', confId)
      .eq('reviewer_id', user.id);

    if (error) {
      console.error("Error fetching reviewer papers:", error);
    } else {
      setAssignedPapers((data || []).map(a => ({
        id: a.id,
        paperId: a.paper?.paper_id,
        title: a.paper?.paper_title,
        abstract: a.paper?.abstract,
        file_url: a.paper?.file_url,
        authorId: a.paper?.author_id,
        status: a.status,
        score: a.score,
        feedback: a.feedback
      })));
    }
    setLoadingPapers(false);
  }, [confId, user.id]);

  useEffect(() => {
    if (!user || !confId) return;
    setLoadingPrefs(true);
    fetchPrefs();
    fetchAssignedPapers();
  }, [user, confId, fetchPrefs, fetchAssignedPapers]);

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      const { error } = await supabase
        .from('conference_user')
        .upsert({
          conference_id: confId,
          user_id: user.id,
          role: 'reviewer',
          expertise: localExpertise,
          max_papers: maxPapers
        }, { onConflict: 'conference_id,user_id' });

      if (error) {
        console.error('Supabase Error saving prefs:', error);
        alert('Failed to save preferences: ' + (error.message || 'Unknown error'));
      } else {
        setExpertise(localExpertise);
        setIsEditing(false);
      }
    } catch (e) {
      console.error('Fetch Crash in savePrefs:', e);
      alert('Network failure or browser blocking the request.');
    }
    setSavingPrefs(false);
  };

  const handleReview = async (assignmentId, decision, paperId, customScore, customFeedback) => {
    setSubmitting(assignmentId);

    const { error: assignError } = await supabase
      .from('paper_assignments')
      .upsert({
        id: assignmentId,
        status: decision,
        score: customScore || 70,
        feedback: customFeedback || ''
      }, { onConflict: 'id' });

    if (assignError) {
      console.error('Error submitting review:', assignError);
      alert('Failed to submit review.');
      setSubmitting(null);
      return;
    }

    // Consensus logic
    const { data: allAssignments, error: fetchErr } = await supabase
      .from('paper_assignments')
      .select('status')
      .eq('paper_id', paperId);

    if (!fetchErr && allAssignments) {
      const total = allAssignments.length;
      const acc = allAssignments.filter(a => a.status === 'accepted').length;
      const pen = allAssignments.filter(a => a.status === 'pending').length;

      let finalStatus = 'pending';
      if (total > 0) {
        const threshold = 0.66;
        if ((acc / total) >= threshold) finalStatus = 'accepted';
        else if (((acc + pen) / total) < threshold) finalStatus = 'rejected';
        else finalStatus = 'pending';
      }

      await supabase
        .from('paper')
        .upsert({
          paper_id: paperId,
          status: finalStatus,
          conference_id: confId
        }, { onConflict: 'paper_id' });
    }

    fetchAssignedPapers();
    setExpanded(null);
    setSubmitting(null);
  };

  return (
    <div className="relative min-h-screen text-slate-200 selection:bg-amber-500/30" style={{ background: '#04070D', fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <CinematicBackground />

      <div className="w-full flex relative z-10">
        {/* ── SIDEBAR ── */}
        <Sidebar nav={nav} section={section} setSection={setSection} isOrganizer={false} roleLabel="Reviewer" />

        {/* MAIN CONTENT */}
        <main className="flex-1 p-8">

          {/* ═══ REVIEW PAPERS ═══ */}
          {section === 'papers' && (
            <div className="space-y-8">
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

              <div className="bg-[#0d1117] border border-indigo-500/20 rounded-2xl p-6 shadow-xl shadow-indigo-500/5">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={18} className="text-indigo-400 fill-indigo-400/20" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Expertise & Availability</h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1 rounded-md hover:bg-white/5 transition-all"
                    >
                      Edit Preferences
                    </button>
                  )}
                </div>

                {!isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Your Expertise</div>
                      <div className="text-sm text-slate-300 leading-relaxed italic italic">
                        "{expertise || 'Not provided'}"
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Review Capacity</div>
                      <div className="text-sm text-white font-bold flex items-center gap-2">
                        <FileText size={14} className="text-indigo-400" />
                        {maxPapers} papers maximum
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="text-xs text-slate-500 font-semibold mb-1.5 block">Reviewer Expertise Description</label>
                      <textarea
                        placeholder="Describe your areas of expertise..."
                        className="w-full bg-white border border-white/20 rounded-xl p-3.5 text-sm h-24 focus:border-indigo-500 outline-none resize-none text-black font-medium"
                        value={localExpertise}
                        onChange={e => setLocalExpertise(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between pb-2">
                      <div>
                        <label className="text-xs text-slate-500 font-semibold block">Maximum Papers</label>
                        <p className="text-[10px] text-slate-600 mt-0.5">How many papers at most?</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setMaxPapers(m => Math.max(1, m - 1))} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white">-</button>
                        <span className="text-white font-bold text-lg w-6 text-center">{maxPapers}</span>
                        <button onClick={() => setMaxPapers(m => Math.min(20, m + 1))} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white">+</button>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {expertise && (
                        <button
                          className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:text-white"
                          onClick={() => { setLocalExpertise(expertise); setIsEditing(false); }}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={savePrefs}
                        disabled={savingPrefs}
                        className="flex-[2] py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {savingPrefs ? "Saving..." : "Apply Preferences"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {loadingPapers ? (
                <div className="py-24 text-center">
                  <Loader2 className="animate-spin text-indigo-500 mx-auto mb-4" size={32} />
                  <p className="text-slate-500 text-sm">Loading your assignments...</p>
                </div>
              ) : assignedPapers.length > 0 ? (
                <div className="space-y-6">
                  {pendingPapers.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Pending Review</h3>
                      {pendingPapers.map(paper => (
                        <PaperCard
                          key={paper.id}
                          paper={paper}
                          isExpanded={expanded === paper.id}
                          onToggle={() => setExpanded(expanded === paper.id ? null : paper.id)}
                          submitting={submitting === paper.id}
                          onReview={handleReview}
                        />
                      ))}
                    </div>
                  )}

                  {reviewedPapers.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">Completed Reviews</h3>
                      {reviewedPapers.map(paper => (
                        <PaperCard
                          key={paper.id}
                          paper={paper}
                          isExpanded={expanded === paper.id}
                          onToggle={() => setExpanded(expanded === paper.id ? null : paper.id)}
                          submitting={submitting === paper.id}
                          onReview={handleReview}
                          isReviewed={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-24 text-center border-2 border-dashed border-white/6 rounded-2xl text-slate-500">
                  No papers pending review.
                </div>
              )}
            </div>
          )}

          {/* ═══ FEEDBACK ═══ */}
          {section === 'feedback' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Feedback</h2>
                <p className="text-slate-500 text-sm mt-0.5">Submit your conference feedback</p>
              </div>
              <FeedbackForm conf={conf} />
            </div>
          )}

          {/* ═══ NOTIFICATIONS ═══ */}
          {section === 'notifications' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Notifications</h2>
                <p className="text-slate-500 text-sm mt-0.5">Conference announcements</p>
              </div>
              <MemberNotifications conf={conf} />
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

/* ── COMPONENTS ─────────────────────────────────────── */

const ScoreButton = ({ score, currentScore, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(score)}
    className={`w-9 h-9 rounded-lg text-xs font-bold transition-all border ${currentScore === score
      ? 'bg-indigo-600 border-indigo-500 text-white'
      : 'border-white/8 text-black hover:border-white/20 hover:text-white bg-white/10'
      }`}
  >
    {score / 10}
  </button>
);

const PaperCard = ({ paper, isExpanded, onToggle, submitting, onReview, isReviewed = false }) => {
  const [localFeedback, setLocalFeedback] = useState(paper.feedback || '');
  const [localScore, setLocalScore] = useState(paper.score || 70);

  useEffect(() => {
    setLocalFeedback(paper.feedback || '');
    setLocalScore(paper.score || 70);
  }, [paper.feedback, paper.score]);

  return (
    <div className={`bg-[#0d1117] border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-indigo-500/40 ring-1 ring-indigo-500/20 shadow-lg shadow-indigo-500/5' : 'border-white/6 hover:border-white/10'}`}>
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${isReviewed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/15'}`}>
            {paper.title?.charAt(0)}
          </div>
          <div className="cursor-pointer" onClick={onToggle}>
            <div className={`font-semibold text-sm ${isReviewed ? 'text-slate-300' : 'text-white'}`}>{paper.title}</div>
            <div className="text-xs text-slate-500 mt-0.5">{paper.authorId ? `Author: ${paper.authorId}` : 'Anonymous'}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {paper.file_url && (
            <a href={paper.file_url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 text-xs font-bold flex items-center gap-1.5">
              <ExternalLink size={14} /> View
            </a>
          )}
          {isReviewed ? (
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-widest ${paper.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {paper.status}
              </span>
              <button
                onClick={onToggle}
                className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 px-2 py-1 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-md border border-indigo-500/10 transition-all font-bold"
              >
                {isExpanded ? 'Close' : 'Edit Review'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/15 px-2 py-1 rounded-md">Pending</span>
              <button onClick={onToggle} className="p-1.5 text-slate-500 hover:text-white transition-all">
                <ChevronDown size={18} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-white/5 p-5 space-y-5 bg-black/20">
          {paper.abstract && (
            <div className="animate-in fade-in slide-in-from-top-1">
              <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-2">Abstract</div>
              <p className="text-sm text-slate-400 leading-relaxed">{paper.abstract}</p>
            </div>
          )}
          <div className="animate-in fade-in slide-in-from-top-2">
            <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-2">Score (Current: {localScore})</div>
            <div className="flex gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
                <ScoreButton key={s} score={s * 10} currentScore={localScore} onSelect={setLocalScore} />
              ))}
            </div>
          </div>
          <div className="animate-in fade-in slide-in-from-top-3">
            <div className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mb-2">Feedback</div>
            <textarea
              placeholder="Enter your confidential feedback..."
              className="w-full bg-white border border-white/20 rounded-xl p-3.5 text-sm h-28 focus:border-indigo-500 outline-none resize-none text-black font-medium"
              value={localFeedback}
              onChange={e => setLocalFeedback(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onReview(paper.id, 'accepted', paper.paperId, localScore, localFeedback)}
              disabled={submitting}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${paper.status === 'accepted' ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'}`}
            >
              <CheckCircle size={16} /> {isReviewed && paper.status === 'accepted' ? 'Confirmed Accept' : 'Accept Paper'}
            </button>
            <button
              onClick={() => onReview(paper.id, 'rejected', paper.paperId, localScore, localFeedback)}
              disabled={submitting}
              className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${paper.status === 'rejected' ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'}`}
            >
              <XCircle size={16} /> {isReviewed && paper.status === 'rejected' ? 'Confirmed Reject' : 'Reject Paper'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewerDashboard;