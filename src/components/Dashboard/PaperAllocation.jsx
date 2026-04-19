import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Plus, X, Play, Download, AlertTriangle,
  FileText, Users, Trash2, Loader2, CheckCircle,
  Cpu, Scale, TrendingUp, RefreshCw, Zap, Save
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { API_BASE_URL, AI_ENGINE_URL } from '../../utils/api';
import { useApp } from '../../context/AppContext';

/* ─── helpers ─────────────────────────────────────────────── */
const cls = (...c) => c.filter(Boolean).join(' ');

const Btn = ({ variant = 'primary', children, className, isDark, ...props }) => {
  const base = 'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed';
  const v = {
    primary: isDark
      ? 'bg-gradient-to-br from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20'
      : 'bg-gradient-to-br from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-600/20',
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

const ALLOCATION_API = `${AI_ENGINE_URL}/api/allocate-papers`;

/* ═════════════════════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════════════════════ */
const PaperAllocation = ({ conf, onRefresh }) => {
  const { theme, user } = useApp();
  const isDark = theme === 'dark';
  const confId = conf?.conference_id ?? conf?.id;

  /* ── state ── */
  const [papers, setPapers] = useState([]);          // { file: File, name: string }
  const [reviewers, setReviewers] = useState([]);     // { name, expertise }
  const [reviewersPerPaper, setReviewersPerPaper] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('setup'); // setup | results
  const [loadingReviewers, setLoadingReviewers] = useState(false);
  const [dbReviewers, setDbReviewers] = useState([]); // Raw data from DB
  const [dbPapers, setDbPapers] = useState([]);       // Raw papers from DB
  const [confirmed, setConfirmed] = useState(false);
  const [showDbSelector, setShowDbSelector] = useState(false);
  const [showPaperDbSelector, setShowPaperDbSelector] = useState(false);
  const fileInputRef = useRef(null);

  /* ── fetch data from conference ── */
  useEffect(() => {
    if (!confId) return;
    setLoadingReviewers(true);

    // Fetch Reviewers
    supabase
      .from('conference_user')
      .select('id, user_id, role, email, full_name, expertise, max_papers, users(user_name, user_email)')
      .eq('conference_id', confId)
      .eq('role', 'reviewer')
      .then(({ data }) => {
        setDbReviewers(data.map(m => {
          const rawName = m.full_name || m.users?.user_name;
          const resolvedEmail = m.email || m.users?.user_email;
          return {
            id: m.id,
            userId: m.user_id,
            email: resolvedEmail || '',
            name: rawName || resolvedEmail || (m.user_id ? m.user_id.substring(0, 8) : 'Reviewer'),
            expertise: m.expertise || '',
            capacity: m.max_papers || 3,
          };
        }));
      });


    supabase
      .from('paper')
      .select('paper_id, paper_title, abstract, file_url, keywords, research_area')
      .eq('conference_id', confId)
      .then(({ data }) => {
        if (data?.length) {
          setDbPapers(data.map(p => ({
            id: p.paper_id,
            name: p.paper_title || 'Untitled Paper',
            abstract: p.abstract || '',
            file_url: p.file_url,
          })));
        }
        setLoadingReviewers(false);
      });

    // 3. Fetch Existing Assignments
    supabase
      .from('paper_assignments')
      .select('id, reviewer_id, paper_id, status, similarity, paper:paper_id(paper_title), reviewer:reviewer_id(user_name)')
      .eq('conference_id', confId)
      .then(({ data, error }) => {
        if (error) {
          console.error("Error fetching assignments:", error);
          return;
        }

        if (data && data.length > 0) {
          const mapped = {
            status: 'optimal',
            assignments: data.map(a => {
              const rEmail = a.reviewer?.email || a.reviewer?.user_email;
              const rName = a.reviewer?.full_name || a.reviewer?.user_name || rEmail || (a.reviewer_id ? a.reviewer_id.substring(0, 8) : 'Reviewer');
              return {
                paper_id: a.paper_id,
                paper_name: a.paper?.paper_title || 'Untitled',
                reviewer_id: a.reviewer_id,
                reviewer_name: rName,
                similarity_score: a.similarity || 0,
                dbId: a.id
              };
            }),
            isFromDb: true
          };

          const sims = data.map(a => a.similarity || 0);
          mapped.summary = {
            total_assignments: data.length,
            avg_similarity: sims.length ? (sims.reduce((a, b) => a + b, 0) / sims.length).toFixed(4) : 0,
            min_similarity: sims.length ? Math.min(...sims).toFixed(4) : 0,
            max_similarity: sims.length ? Math.max(...sims).toFixed(4) : 0
          };

          setResult(mapped);
          setConfirmed(true);
          setActiveTab('results');
        }
      });
  }, [confId]);

  const toggleDbReviewer = (r) => {
    const exists = reviewers.find(x => x.dbId === r.id);
    if (exists) {
      setReviewers(prev => prev.filter(x => x.dbId !== r.id));
    } else {
      setReviewers(prev => [...prev, { ...r, dbId: r.id }]);
    }
  };

  const toggleDbPaper = (p) => {
    const exists = papers.find(x => x.dbId === p.id);
    if (exists) {
      setPapers(prev => prev.filter(x => x.dbId !== p.id));
    } else {
      setPapers(prev => [...prev, { dbId: p.id, name: p.name, file_url: p.file_url }]);
    }
  };

  const addFiles = (fileList) => {
    const pdfs = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    setPapers(prev => [...prev, ...pdfs.map(f => ({ file: f, name: f.name }))]);
  };

  const removeFile = (idx) => setPapers(p => p.filter((_, i) => i !== idx));
  const updateReviewer = (idx, field, val) =>
    setReviewers(r => r.map((rv, i) => i === idx ? { ...rv, [field]: val } : rv));
  const removeReviewer = (idx) => setReviewers(r => r.filter((_, i) => i !== idx));

  const apiRunAllocation = async () => {
    if (papers.length === 0) { setError('Upload at least one paper PDF.'); return; }
    const validReviewers = reviewers.filter(r => r.expertise.trim());
    if (validReviewers.length < reviewersPerPaper) {
      setError(`Need at least ${reviewersPerPaper} reviewers with expertise descriptions.`); return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const validReviewers = reviewers.filter(r => r.expertise.trim());
      const capacities = validReviewers.map(r => parseInt(r.capacity) || 3);
      const fd = new FormData();

      for (const p of papers) {
        if (p.file) {
          fd.append('papers[]', p.file);
        } else if (p.file_url) {
          try {
            const response = await fetch(p.file_url);
            const blob = await response.blob();
            const file = new File([blob], p.name || 'paper.pdf', { type: 'application/pdf' });
            fd.append('papers[]', file);
          } catch (fetchErr) {
            throw new Error(`Could not download paper: ${p.name}.`);
          }
        }
      }

      fd.append('reviewers', JSON.stringify(validReviewers));
      fd.append('reviewers_per_paper', reviewersPerPaper);
      fd.append('capacities', JSON.stringify(capacities));

      const res = await fetch(ALLOCATION_API, { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server returned ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
      setActiveTab('results');
    } catch (err) {
      setError(err.message || 'Failed to connect to AI Engine. Make sure the backend is running on port 5000.');
    }
    setLoading(false);
  };

  const exportCSV = () => {
    if (!result?.assignments) return;
    const header = 'Paper_ID,Paper_Name,Reviewer_ID,Reviewer_Name,Similarity_Score\n';
    const rows = result.assignments.map(a =>
      `${a.paper_id},"${a.paper_name}",${a.reviewer_id},"${a.reviewer_name}",${a.similarity_score}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'paper_reviewer_assignments.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const confirmAssignments = async () => {
    if (!result?.assignments || !confId) return;
    setLoading(true);
    setError('');

    try {
      const validReviewers = reviewers.filter(r => r.expertise.trim());
      const updatedPapers = [...papers];

      const manualPapersIndices = papers
        .map((p, idx) => ({ ...p, idx }))
        .filter(p => !p.dbId);

      if (manualPapersIndices.length > 0) {
        for (const mp of manualPapersIndices) {
          if (!mp.file) continue;
          const fileName = `${mp.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase()}`;
          const filePath = `${confId}/${fileName}`;
          const { error: storageError } = await supabase.storage.from('papers').upload(filePath, mp.file, { upsert: true });
          if (storageError) throw new Error(`Storage error for ${mp.name}: ${storageError.message}`);
          const { data: { publicUrl } } = supabase.storage.from('papers').getPublicUrl(filePath);

          const { data: newPaperData, error: paperDbError } = await supabase
            .from('paper')
            .insert([{ conference_id: confId, paper_title: mp.name, abstract: 'Auto-extracted abstract', file_url: publicUrl, author_id: user?.id, status: 'pending' }])
            .select().single();

          if (paperDbError) throw new Error(`Database error for ${mp.name}: ${paperDbError.message}`);
          updatedPapers[mp.idx] = { ...updatedPapers[mp.idx], dbId: newPaperData.paper_id, file_url: publicUrl };
        }
        setPapers(updatedPapers);
      }

      const toInsert = result.assignments
        .filter(a => updatedPapers[a.paper_id]?.dbId && validReviewers[a.reviewer_id]?.userId)
        .map(a => ({
          paper_id: updatedPapers[a.paper_id].dbId,
          reviewer_id: validReviewers[a.reviewer_id].userId,
          conference_id: confId,
          similarity: a.similarity_score,
          status: 'pending'
        }));

      if (toInsert.length === 0) throw new Error('No valid records found to save.');

      await supabase.from('paper_assignments').delete().eq('conference_id', confId);
      const { error: insError } = await supabase.from('paper_assignments').insert(toInsert);
      if (insError) throw insError;

      // Reset paper status to 'pending' for all involved papers to allow consensus re-run
      const uniquePaperIds = [...new Set(toInsert.map(a => a.paper_id))];
      for (const pId of uniquePaperIds) {
        await supabase
          .from('paper')
          .upsert({ paper_id: pId, status: 'pending', conference_id: confId }, { onConflict: 'paper_id' });
      }

      setConfirmed(true);
      if (onRefresh) onRefresh(); // Trigger refresh in parent
      alert(`Success: ${toInsert.length} assignments saved!`);

      /* ── Execute Email Automations (on_paper_assigned) ── */
      try {
        const { data: autos } = await supabase
          .from('conference_automations')
          .select('*')
          .eq('conference_id', confId)
          .eq('trigger_type', 'on_paper_assigned')
          .eq('is_active', true);

        if (autos && autos.length > 0) {
          for (const auto of autos) {
            for (const item of toInsert) {
              // Find paper name and reviewer details
              const pData = updatedPapers.find(p => p.dbId === item.paper_id);
              const rData = validReviewers.find(r => r.userId === item.reviewer_id);

              if (rData && rData.email) {
                const personalizedBody = auto.body
                  .replace(/{ReviewerName}/g, rData.name)
                  .replace(/{PaperTitle}/g, pData?.name || 'Untitled Paper');

                await fetch(`${API_BASE_URL}/api/send-email`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    to: [rData.email.trim().toLowerCase()],
                    subject: auto.subject,
                    body: personalizedBody,
                    senderRole: 'organizer',
                    conferenceId: confId
                  })
                }).catch(e => console.error('on_paper_assigned email failed:', e));
              }
            }
          }
        }
      } catch (errAuto) {
        console.error('Failed to run on_paper_assigned automations:', errAuto);
      }

    } catch (err) {
      setError(`Critical Error: ${err.message}`);
    }
    setLoading(false);
  };

  const clearAssignments = async () => {
    if (!window.confirm("Danger: Clear all existing assignments and re-start setup?")) return;
    setLoading(true);
    try {
      await supabase.from('paper_assignments').delete().eq('conference_id', confId);
      setResult(null);
      setConfirmed(false);
      setActiveTab('setup');
    } catch (err) {
      setError(`Failed to clear: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className={cls("space-y-6 animate-in fade-in duration-700", isDark ? "text-white" : "text-zinc-900")} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div>
        <h2 className={cls("text-2xl font-bold tracking-tight", isDark ? "text-white" : "text-zinc-900")}>Paper Allocation</h2>
        <p className={cls("text-sm mt-0.5", isDark ? "text-slate-500" : "text-zinc-500")}>
          AI-powered semantic matching with Conflict of Interest (COI) detection.
        </p>
      </div>

      {/* Tabs */}
      <div className={cls("flex gap-1 p-1 rounded-xl w-fit border", isDark ? "bg-white/5 border-white/6" : "bg-zinc-100 border-zinc-200 shadow-inner")}>
        {[
          ['setup', 'Configuration', <Cpu size={14} />],
          ['results', 'Assignments', <CheckCircle size={14} />]
        ].map(([k, l, icon]) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            disabled={k === 'results' && !result && !confirmed}
            className={cls(
              'px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2',
              activeTab === k
                ? isDark ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20' : 'bg-white text-amber-600 shadow-sm'
                : isDark ? 'text-slate-500 hover:text-slate-200' : 'text-zinc-500 hover:text-zinc-800',
              k === 'results' && !result && !confirmed && 'opacity-30 cursor-not-allowed'
            )}
          >
            {icon}{l}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className={cls("rounded-2xl p-4 flex items-start gap-3 animate-in shake duration-500 border", isDark ? "bg-red-500/10 border-red-500/20" : "bg-red-50 border-red-200")}>
          <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className={cls("text-sm font-bold", isDark ? "text-red-400" : "text-red-700")}>Allocation Error</div>
            <p className={cls("text-xs leading-relaxed", isDark ? "text-red-300/80" : "text-red-600")}>{error}</p>
          </div>
          <button onClick={() => setError('')} className={cls("transition-colors", isDark ? "text-red-400/60 hover:text-red-300" : "text-red-400 hover:text-red-600")}><X size={14} /></button>
        </div>
      )}

      {/* ═══ SETUP TAB ═══ */}
      {activeTab === 'setup' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">

          {/* Papers Card */}
          <div className={cls("rounded-[2rem] p-8 border", isDark ? "bg-[#0d1117] border-white/6" : "bg-white border-zinc-200 shadow-xl shadow-zinc-500/5")}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cls("w-10 h-10 rounded-xl flex items-center justify-center", isDark ? "bg-amber-500/15" : "bg-amber-50")}>
                  <FileText size={20} className="text-amber-500" />
                </div>
                <div>
                  <h3 className={cls("text-lg font-bold truncate", isDark ? "text-white" : "text-zinc-900")}>Submission Repository</h3>
                  <span className={cls("text-xs font-medium uppercase tracking-widest", isDark ? "text-slate-600" : "text-zinc-400")}>{papers.length} Papers selected</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Btn isDark={isDark} variant="secondary" className="text-[10px] uppercase py-2" onClick={() => setShowPaperDbSelector(!showPaperDbSelector)}>
                  {showPaperDbSelector ? 'Close repository' : 'Browse database'}
                </Btn>
                <Btn isDark={isDark} variant="secondary" className="text-[10px] uppercase py-2 font-bold" onClick={() => fileInputRef.current?.click()}>
                  + Upload PDF
                </Btn>
              </div>
            </div>

            <input ref={fileInputRef} type="file" accept=".pdf" multiple className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />

            {showPaperDbSelector && (
              <div className={cls("mb-6 border rounded-2xl p-4 animate-in slide-in-from-top-4", isDark ? "bg-amber-500/5 border-amber-500/10" : "bg-zinc-50 border-zinc-100")}>
                <div className={cls("text-[10px] font-bold uppercase tracking-[0.2em] mb-4", isDark ? "text-amber-400" : "text-amber-600")}>CONF. DATABASE PAPERS</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {dbPapers.length === 0 ? (
                    <div className="col-span-full py-8 text-center text-xs italic text-slate-500">Empty repository for this conference.</div>
                  ) : (
                    dbPapers.map(p => {
                      const isSelected = papers.some(x => x.dbId === p.id);
                      return (
                        <div key={p.id} onClick={() => toggleDbPaper(p)} className={cls(
                          "group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-95",
                          isSelected
                            ? isDark ? "bg-amber-600/20 border-amber-500/50 text-amber-100 shadow-lg" : "bg-white border-amber-500 text-amber-700 shadow-md"
                            : isDark ? "bg-white/3 border-white/6 text-slate-400 hover:bg-white/5" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                        )}>
                          <div className={cls(
                            "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                            isSelected ? "bg-amber-500 border-amber-500" : isDark ? "bg-black/20 border-white/10" : "bg-zinc-100 border-zinc-200"
                          )}> {isSelected && <CheckCircle size={10} className="text-white" />} </div>
                          <span className="text-xs font-bold truncate flex-1">{p.name}</span>
                          <span className={cls("text-[9px] font-black uppercase px-2 py-0.5 rounded", isDark ? "bg-black/30 text-slate-600" : "bg-zinc-50 text-zinc-400")}>ID-{p.id.slice(0, 4)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className={cls(
              "border-2 border-dashed rounded-[2rem] p-10 text-center transition-all hover:border-amber-500/40 group relative overflow-hidden",
              isDark ? "bg-white/2 border-white/8 hover:bg-white/3" : "bg-zinc-50 border-zinc-200 hover:bg-white"
            )} onClick={() => fileInputRef.current?.click()}>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Upload size={32} className={cls("mx-auto mb-4 transition-transform group-hover:-translate-y-1", isDark ? "text-slate-600" : "text-zinc-300")} />
              <p className={cls("text-sm font-bold", isDark ? "text-slate-400" : "text-zinc-600")}>Drag & drop PDFs or <span className="text-amber-500 hover:underline">browse files</span></p>
              <p className={cls("text-[11px] mt-2 italic", isDark ? "text-slate-700" : "text-zinc-400")}>Multi-select supported for batch processing</p>

              {papers.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-2 justify-center max-h-[200px] overflow-y-auto">
                  {papers.map((p, i) => (
                    <div key={i} className={cls("group/item flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold animate-in zoom-in-95", isDark ? "bg-black/40 border-white/10 text-slate-300" : "bg-white border-zinc-200 text-zinc-700 shadow-sm")}>
                      <FileText size={10} className="text-amber-400" />
                      <span className="max-w-[120px] truncate">{p.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="hover:text-red-500 transition-colors"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reviewers Card */}
          <div className={cls("rounded-[2rem] p-8 border", isDark ? "bg-[#0d1117] border-white/6" : "bg-white border-zinc-200 shadow-xl shadow-zinc-500/5")}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={cls("w-10 h-10 rounded-xl flex items-center justify-center", isDark ? "bg-amber-500/15" : "bg-amber-50")}>
                  <Users size={20} className="text-amber-500" />
                </div>
                <div>
                  <h3 className={cls("text-lg font-bold truncate", isDark ? "text-white" : "text-zinc-900")}>Committee Reviewers</h3>
                  <span className={cls("text-xs font-medium uppercase tracking-widest", isDark ? "text-slate-600" : "text-zinc-400")}>{reviewers.length} active matching targets</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Btn isDark={isDark} variant="secondary" className="text-[10px] uppercase py-2" onClick={() => setShowDbSelector(!showDbSelector)}>
                  {showDbSelector ? 'Hide committee' : 'Import committee'}
                </Btn>
              </div>
            </div>

            {showDbSelector && (
              <div className={cls("mb-8 border rounded-2xl p-6 animate-in slide-in-from-top-4", isDark ? "bg-amber-500/5 border-amber-500/10" : "bg-zinc-50 border-zinc-100")}>
                <div className={cls("text-[10px] font-bold uppercase tracking-[0.2em] mb-4 flex justify-between", isDark ? "text-amber-400" : "text-amber-600")}>
                  AVAILABLE MEMBERS
                  {loadingReviewers && <Loader2 size={12} className="animate-spin" />}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {dbReviewers.map(r => {
                    const isSelected = reviewers.some(x => x.dbId === r.id);
                    return (
                      <div key={r.id} onClick={() => toggleDbReviewer(r)} className={cls(
                        "group flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all active:scale-95",
                        isSelected
                          ? isDark ? "bg-amber-600/20 border-amber-500/50 text-amber-100 shadow-lg" : "bg-white border-amber-500 text-amber-700 shadow-md"
                          : isDark ? "bg-white/3 border-white/6 text-slate-400 hover:bg-white/5" : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300"
                      )}>
                        <div className={cls("w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] uppercase", isDark ? "bg-black/30" : "bg-zinc-100 text-zinc-900")}>{r.name?.[0]}</div>
                        <span className="text-xs font-bold truncate flex-1">{r.name}</span>
                        <CheckCircle size={14} className={cls("transition-opacity", isSelected ? "opacity-100 text-amber-500" : "opacity-0")} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {reviewers.length === 0 ? (
              <div className={cls("py-12 flex flex-col items-center border-2 border-dashed rounded-[2rem]", isDark ? "border-white/5 bg-white/2" : "border-zinc-100 bg-zinc-50/50")}>
                <Users size={32} className={isDark ? "text-slate-700" : "text-zinc-300"} />
                <p className={cls("text-sm mt-4 italic", isDark ? "text-slate-600" : "text-zinc-400")}>Assign at least {reviewersPerPaper} reviewers to begin</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviewers.map((r, i) => (
                  <div key={i} className={cls("relative p-6 rounded-3xl border transition-all animate-in zoom-in-95 group/rev", isDark ? "bg-white/3 border-white/6 hover:bg-white/5" : "bg-zinc-50 border-zinc-200 hover:bg-white shadow-sm")}>
                    <button onClick={() => removeReviewer(i)} className={cls("absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover/rev:opacity-100 transition-all", isDark ? "hover:bg-red-500/10 text-slate-600 hover:text-red-400" : "hover:bg-red-50 text-zinc-300 hover:text-red-500")}>
                      <X size={14} />
                    </button>
                    <div className="flex items-center gap-4 mb-5">
                      <div className={cls("w-10 h-10 rounded-2xl flex items-center justify-center font-bold uppercase transition-transform group-hover/rev:scale-110", isDark ? "bg-amber-500/20 text-amber-500" : "bg-white text-amber-600 shadow-sm")}>
                        {r.name?.[0] || (i + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          className={cls("w-full bg-transparent border-b outline-none font-bold text-sm transition-all pb-1", isDark ? "border-white/10 focus:border-amber-500 text-white placeholder-slate-700" : "border-zinc-200 focus:border-amber-500 text-zinc-900 placeholder-zinc-300")}
                          placeholder="Member name"
                          value={r.name}
                          onChange={e => updateReviewer(i, 'name', e.target.value)}
                        />
                      </div>
                      <div className={cls("flex items-center gap-2 px-3 py-1.5 rounded-xl border shrink-0", isDark ? "bg-black/30 border-white/5" : "bg-white border-zinc-100")}>
                        <span className={cls("text-[9px] font-black uppercase text-slate-500", isDark ? "text-slate-500" : "text-zinc-400")}>CAPACITY:</span>
                        <input type="number" min="1" max="50" className={cls("w-8 bg-transparent text-xs font-black text-center outline-none", isDark ? "text-amber-400" : "text-amber-600")} value={r.capacity || 3} onChange={e => updateReviewer(i, 'capacity', e.target.value)} />
                      </div>
                    </div>
                    <textarea
                      className={cls("w-full rounded-2xl p-4 text-xs resize-none outline-none transition-all h-[80px] border", isDark ? "bg-black/20 border-white/5 focus:border-amber-500 text-slate-300 placeholder-slate-700" : "bg-white border-zinc-100 focus:border-amber-500 text-zinc-600 placeholder-zinc-300 shadow-inner")}
                      placeholder="Paste or type expertise tags (AI, ML, Crypto...)"
                      value={r.expertise}
                      onChange={e => updateReviewer(i, 'expertise', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Intensity & Run */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className={cls("flex-1 rounded-[2rem] p-8 border flex items-center justify-between", isDark ? "bg-[#0d1117] border-white/6" : "bg-white border-zinc-200 shadow-lg")}>
              <div className="flex items-center gap-4">
                <div className={cls("w-12 h-12 rounded-2xl flex items-center justify-center", isDark ? "bg-amber-500/10" : "bg-amber-50")}>
                  <Scale size={24} className="text-amber-500" />
                </div>
                <div>
                  <div className={cls("text-sm font-black uppercase tracking-widest", isDark ? "text-white" : "text-zinc-900")}>Review Intensity</div>
                  <div className={cls("text-xs", isDark ? "text-slate-500" : "text-zinc-400")}>Target blind assignments per paper</div>
                </div>
              </div>
              <div className={cls("flex items-center gap-4 p-2 rounded-2xl border", isDark ? "bg-black/20 border-white/5" : "bg-zinc-100 border-zinc-200")}>
                <button onClick={() => setReviewersPerPaper(p => Math.max(1, p - 1))} className={cls("w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all active:scale-90", isDark ? "bg-white/5 text-slate-400 hover:text-white" : "bg-white text-zinc-400 hover:text-zinc-900")}>-</button>
                <span className={cls("text-xl font-black w-8 text-center tabular-nums", isDark ? "text-white" : "text-zinc-900")}>{reviewersPerPaper}</span>
                <button onClick={() => setReviewersPerPaper(p => Math.min(10, p + 1))} className={cls("w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all active:scale-90", isDark ? "bg-white/5 text-slate-400 hover:text-white" : "bg-white text-zinc-400 hover:text-zinc-900")}>+</button>
              </div>
            </div>

            <Btn onClick={apiRunAllocation} disabled={loading} isDark={isDark} className="h-auto md:w-[350px] py-8 rounded-[2rem] text-lg font-black tracking-tight bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-transform" variant="primary">
              {loading ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw size={24} className="animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-[0.3em]">Processing Matrix</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-3">
                    <Play size={20} fill="currentColor" />
                    <span>START AI ALLOCATION</span>
                  </div>
                  <span className={cls("text-[10px] font-medium tracking-wide normal-case", isDark ? "text-amber-200/60" : "text-amber-200")}>Semantic engine will match {papers.length} papers</span>
                </div>
              )}
            </Btn>
          </div>
        </div>
      )}

      {/* ═══ RESULTS TAB ═══ */}
      {activeTab === 'results' && result && (
        <div className="space-y-6 animate-in zoom-in-95 duration-700">

          {/* Status banner */}
          <div className={cls(
            "rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-6 border transition-all",
            confirmed
              ? isDark ? "bg-emerald-950/20 border-emerald-500/20" : "bg-emerald-50 border-emerald-200"
              : isDark ? "bg-amber-950/20 border-amber-500/20" : "bg-amber-50 border-amber-200 shadow-xl shadow-amber-500/10"
          )}>
            <div className={cls("w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 shadow-2xl animate-pulse", confirmed ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400")}>
              {confirmed ? <CheckCircle size={32} /> : <Zap size={32} />}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className={cls("text-2xl font-black tracking-tight", isDark ? "text-white" : "text-zinc-900")}>
                {confirmed ? 'Allocation Finalized' : 'Optimal Solution Generated'}
              </h3>
              <p className={cls("text-sm mt-1", isDark ? "text-slate-500" : "text-zinc-500")}>
                Efficiency: <span className={cls("font-bold px-2 py-0.5 rounded-lg ml-1", isDark ? "bg-black/30 text-emerald-400" : "bg-white text-emerald-600 shadow-sm")}>{result.summary?.avg_similarity} Affinity Score</span>
              </p>
            </div>
            <div className="flex gap-3">
              <Btn isDark={isDark} variant="secondary" onClick={exportCSV} className="rounded-2xl px-6 py-4">
                <Download size={16} /> EXPORT CSV
              </Btn>
              {!confirmed ? (
                <Btn isDark={isDark} variant="success" onClick={confirmAssignments} disabled={loading} className="rounded-2xl px-6 py-4">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  COMMIT TO DB
                </Btn>
              ) : (
                <Btn isDark={isDark} variant="danger" onClick={clearAssignments} disabled={loading} className="rounded-2xl px-6 py-4">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  CLEAR ALL data
                </Btn>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'MatcheS', value: result.summary.total_assignments, icon: <Users size={16} />, color: isDark ? 'text-amber-400' : 'text-amber-600' },
              { label: 'Avg Affinity', value: result.summary.avg_similarity, icon: <TrendingUp size={16} />, color: isDark ? 'text-emerald-400' : 'text-emerald-700' },
              { label: 'Precision', value: result.summary.min_similarity, icon: <Scale size={16} />, color: isDark ? 'text-amber-400' : 'text-amber-500' },
              { label: 'Peak Match', value: result.summary.max_similarity, icon: <Zap size={16} />, color: isDark ? 'text-blue-400' : 'text-blue-600' },
            ].map((s, i) => (
              <div key={i} className={cls("p-6 rounded-3xl border transition-all", isDark ? "bg-[#0d1117] border-white/6 hover:bg-white/3" : "bg-white border-zinc-200 shadow-sm")}>
                <div className={cls("w-9 h-9 rounded-xl flex items-center justify-center mb-4", isDark ? "bg-white/5" : "bg-zinc-50")}> {s.icon} </div>
                <div className={cls("text-2xl font-black tabular-nums", isDark ? "text-white" : "text-zinc-900")}>{s.value}</div>
                <div className={cls("text-[10px] font-black uppercase tracking-[0.2em]", isDark ? "text-slate-600" : "text-zinc-400")}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Assignment List */}
          <div className={cls("rounded-[2rem] border overflow-hidden transition-all", isDark ? "bg-[#0d1117] border-white/6" : "bg-white border-zinc-200 shadow-2xl shadow-zinc-500/5")}>
            <div className={cls("px-8 py-6 border-b flex items-center justify-between", isDark ? "border-white/5 bg-white/2" : "border-zinc-100 bg-zinc-50")}>
              <h3 className={cls("text-sm font-black uppercase tracking-[0.2em]", isDark ? "text-slate-400" : "text-zinc-500")}>DETAILED MAPPING</h3>
              <span className={cls("text-[10px] font-bold px-3 py-1 rounded-full", isDark ? "bg-black/40 text-slate-600" : "bg-white text-zinc-400 border border-zinc-100")}>{result.assignments.length} ROWs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className={cls("border-b", isDark ? "border-white/5 text-slate-600" : "border-zinc-100 text-zinc-400")}>
                    <th className="px-8 py-4 text-left font-black uppercase tracking-widest text-[10px]">Title/Sub-id</th>
                    <th className="px-8 py-4 text-left font-black uppercase tracking-widest text-[10px]">Reviewer Assignee</th>
                    <th className="px-8 py-4 text-right font-black uppercase tracking-widest text-[10px]">Semantic Affinity</th>
                  </tr>
                </thead>
                <tbody className={cls("divide-y", isDark ? "divide-white/5" : "divide-zinc-100")}>
                  {result.assignments.map((a, i) => (
                    <tr key={i} className={cls("transition-colors group", isDark ? "hover:bg-white/2" : "hover:bg-zinc-50")}>
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cls("w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border", isDark ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-amber-50 border-amber-100 text-amber-600")}>
                            {i + 1}
                          </div>
                          <span className={cls("font-bold truncate max-w-[280px]", isDark ? "text-slate-300" : "text-zinc-900")}>{a.paper_name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 font-bold">
                        <div className="flex items-center gap-2">
                          <div className={cls("w-6 h-6 rounded-lg flex items-center justify-center font-black text-[9px] uppercase", isDark ? "bg-amber-500/20 text-amber-500" : "bg-amber-100 text-amber-700")}>
                            {a.reviewer_name?.[0]}
                          </div>
                          <span className={isDark ? "text-slate-400" : "text-zinc-600"}>{a.reviewer_name}</span>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className={cls(
                          "inline-block w-[60px] text-center font-black tabular-nums py-1 rounded-lg border text-[10px]",
                          a.similarity_score >= 0.5 ? (isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-100') :
                            a.similarity_score >= 0.3 ? (isDark ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-100') :
                              (isDark ? 'bg-slate-500/20 text-slate-400 border-white/5' : 'bg-zinc-50 text-zinc-400 border-zinc-100')
                        )}>
                          {(a.similarity_score * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Matrix Heatmap */}
          {result.similarity_matrix && (
            <div className={cls("rounded-[2rem] p-8 border", isDark ? "bg-[#0d1117] border-white/6" : "bg-white border-zinc-200 shadow-xl shadow-zinc-500/5")}>
              <h3 className={cls("text-sm font-black uppercase tracking-[0.2em] mb-8", isDark ? "text-slate-400" : "text-zinc-500")}>SIMILARITY MATRIX</h3>
              <div className="overflow-x-auto pb-4 custom-scrollbar">
                <table className="mx-auto border-separate border-spacing-2">
                  <thead>
                    <tr>
                      <th className="p-1" />
                      {(result.reviewer_names || []).map((name, r) => (
                        <th key={r} className={cls("p-1 text-[10px] font-black uppercase tracking-widest max-w-[60px] truncate", isDark ? "text-slate-600" : "text-zinc-300")} title={name}>
                          R-{r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.similarity_matrix.map((row, p) => (
                      <tr key={p}>
                        <td className={cls("p-1 text-[10px] font-black uppercase tracking-widest pr-4 whitespace-nowrap", isDark ? "text-slate-600" : "text-zinc-300")} title={result.paper_names?.[p]}>
                          P-{p}
                        </td>
                        {row.map((val, r) => {
                          const isAssigned = result.assignments?.some(a => a.paper_id === p && a.reviewer_id === r);
                          const intensity = Math.round(val * 100);
                          const hue = val >= 0.5 ? 142 : val >= 0.3 ? 38 : 220;
                          return (
                            <td key={r} className="p-0.5 text-center">
                              <div
                                className={cls(
                                  'w-12 h-10 rounded-xl flex items-center justify-center text-[10px] font-black transition-all hover:scale-110 cursor-help',
                                  isAssigned && (isDark ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-[#0d1117]' : 'ring-4 ring-amber-500/20 border-2 border-amber-500 shadow-lg')
                                )}
                                title={`P${p} × R${r}: ${(val * 100).toFixed(1)}% match`}
                                style={{
                                  backgroundColor: isDark
                                    ? `hsla(${hue}, 70%, ${15 + intensity * 0.4}%, ${0.2 + val * 0.8})`
                                    : `hsla(${hue}, 80%, ${92 - intensity * 0.15}%, 0.9)`,
                                  color: isDark
                                    ? val > 0.4 ? '#fff' : 'rgb(148 163 184)'
                                    : val > 0.4 ? `hsla(${hue}, 80%, 30%, 1)` : '#94a3b8',
                                }}
                              >
                                {(val).toFixed(2)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={cls("flex flex-wrap items-center justify-center gap-6 mt-8 text-[11px] font-bold", isDark ? "text-slate-600" : "text-zinc-400")}>
                <span className="flex items-center gap-2"> <span className="w-3 h-3 rounded bg-emerald-500 shadow-lg shadow-emerald-500/20" /> EXPERT (&gt;0.5) </span>
                <span className="flex items-center gap-2"> <span className="w-3 h-3 rounded bg-amber-500 shadow-lg shadow-amber-500/20" /> QUALIFIED (0.3–0.5) </span>
                <span className="flex items-center gap-2"> <span className="w-3 h-3 rounded bg-slate-500" /> OUTSIDE SCOPE </span>
                <span className={cls("flex items-center gap-2 px-3 py-1 rounded-lg border", isDark ? "border-amber-500 text-amber-400 bg-amber-500/10" : "border-amber-600 text-amber-600 bg-amber-50")}> <CheckCircle size={12} /> ASSIGNED ROW </span>
              </div>
            </div>
          )}

          {/* Workload Progress */}
          {result.reviewer_workload && (
            <div className={cls("rounded-[2rem] p-8 border", isDark ? "bg-[#0d1117] border-white/6" : "bg-white border-zinc-200 shadow-lg shadow-zinc-500/5")}>
              <h3 className={cls("text-sm font-black uppercase tracking-[0.3em] mb-8", isDark ? "text-slate-400" : "text-zinc-500")}>EQUILIBRIUM MONITOR</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {result.reviewer_workload.map((rw, i) => (
                  <div key={i} className="flex items-center gap-4 group/work">
                    <div className={cls("w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black uppercase transition-all group-hover/work:scale-110", isDark ? "bg-amber-500/20 text-amber-500" : "bg-amber-50 text-amber-600 border border-amber-100")}>
                      {rw.reviewer_name?.[0] || 'R'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className={cls("text-xs font-bold truncate", isDark ? "text-slate-300" : "text-zinc-900")}>{rw.reviewer_name}</span>
                        <span className={cls("text-[10px] font-bold tabular-nums", isDark ? "text-slate-500" : "text-zinc-400")}>
                          {rw.assigned}/{rw.capacity} <span className="font-normal opacity-50 ml-1">Papers</span>
                        </span>
                      </div>
                      <div className={cls("h-2 rounded-full overflow-hidden", isDark ? "bg-black/30" : "bg-zinc-100 shadow-inner")}>
                        <div
                          className={cls(
                            'h-full rounded-full transition-all duration-1000 delay-500',
                            rw.utilisation_pct >= 90 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                              rw.utilisation_pct >= 60 ? 'bg-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' :
                                'bg-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                          )}
                          style={{ width: `${Math.min(rw.utilisation_pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back to setup */}
          <Btn variant="secondary" onClick={() => setActiveTab('setup')} className="w-full">
            ← Back to Setup
          </Btn>
        </div>
      )}
    </div>
  );
};

export default PaperAllocation;
