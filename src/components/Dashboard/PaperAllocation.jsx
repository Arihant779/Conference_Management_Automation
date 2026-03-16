import React, { useState, useRef, useEffect } from 'react';
import {
  Upload, Plus, X, Play, Download, AlertTriangle,
  FileText, Users, Trash2, ChevronDown, Loader2, CheckCircle
} from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

/* ─── helpers ─────────────────────────────────────────────── */
const cls = (...c) => c.filter(Boolean).join(' ');

const Btn = ({ variant = 'primary', children, className, ...props }) => {
  const base = 'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 justify-center disabled:opacity-40 disabled:cursor-not-allowed';
  const v = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    secondary: 'border border-white/10 text-slate-400 hover:text-white hover:bg-white/5',
    danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  };
  return <button {...props} className={cls(base, v[variant], className)}>{children}</button>;
};

const ALLOCATION_API = 'http://localhost:5000/api/allocate-papers';

/* ═════════════════════════════════════════════════════════════
   MAIN COMPONENT
═════════════════════════════════════════════════════════════ */
const PaperAllocation = ({ conf }) => {
  const { user } = useApp();
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
  const fileInputRef = useRef(null);

  /* ── prefill reviewers from conference members ── */
  useEffect(() => {
    if (!confId) return;
    setLoadingReviewers(true);
    supabase
      .from('conference_user')
      .select('id, user_id, role, email, full_name, users(user_name, user_email)')
      .eq('conference_id', confId)
      .eq('role', 'reviewer')
      .then(({ data }) => {
        if (data?.length) {
          setReviewers(data.map(m => ({
            name: m.full_name || m.users?.user_name || m.email || 'Reviewer',
            expertise: '',
            capacity: 3,
          })));
        }
        setLoadingReviewers(false);
      });
  }, [confId]);

  /* ── handlers ── */
  const addFiles = (fileList) => {
    const pdfs = Array.from(fileList).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    setPapers(prev => [...prev, ...pdfs.map(f => ({ file: f, name: f.name }))]);
  };

  const removeFile = (idx) => setPapers(p => p.filter((_, i) => i !== idx));

  const addReviewer = () => setReviewers(r => [...r, { name: '', expertise: '', capacity: 3 }]);
  const updateReviewer = (idx, field, val) =>
    setReviewers(r => r.map((rv, i) => i === idx ? { ...rv, [field]: val } : rv));
  const removeReviewer = (idx) => setReviewers(r => r.filter((_, i) => i !== idx));

  const runAllocation = async () => {
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
      papers.forEach(p => fd.append('papers[]', p.file));
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
      setError(err.message || 'Failed to connect to Paper Allocation API. Make sure the Python backend is running.');
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

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Paper Allocation</h2>
        <p className="text-slate-500 text-sm mt-0.5">
          AI-powered optimal reviewer assignment using semantic similarity
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/4 p-1 rounded-xl w-fit border border-white/6">
        {[['setup', 'Setup'], ['results', 'Results']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setActiveTab(k)}
            disabled={k === 'results' && !result}
            className={cls(
              'px-4 py-1.5 rounded-lg text-xs font-semibold transition-all',
              activeTab === k ? 'bg-white text-black' : 'text-slate-500 hover:text-slate-200',
              k === 'results' && !result && 'opacity-30 cursor-not-allowed'
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-red-400">Error</div>
            <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError('')} className="ml-auto text-red-400/60 hover:text-red-300"><X size={14} /></button>
        </div>
      )}

      {/* ═══ SETUP TAB ═══ */}
      {activeTab === 'setup' && (
        <div className="space-y-6">

          {/* Upload Papers */}
          <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Paper PDFs</h3>
                <span className="text-xs text-slate-600">({papers.length} uploaded)</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                className="hidden"
                onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
              />
              <Btn variant="secondary" className="text-xs py-2" onClick={() => fileInputRef.current?.click()}>
                <Plus size={13} />Browse PDFs
              </Btn>
            </div>

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-white/8 rounded-xl p-8 text-center hover:border-indigo-500/30 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-indigo-500/50', 'bg-indigo-500/5'); }}
              onDragLeave={e => { e.currentTarget.classList.remove('border-indigo-500/50', 'bg-indigo-500/5'); }}
              onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-indigo-500/50', 'bg-indigo-500/5'); addFiles(e.dataTransfer.files); }}
            >
              <Upload size={28} className="text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Drop PDF files here or <span className="text-indigo-400 font-semibold">click to browse</span></p>
              <p className="text-xs text-slate-700 mt-1">Accepts .pdf files only</p>
            </div>

            {/* File list */}
            {papers.length > 0 && (
              <div className="mt-4 space-y-1.5">
                {papers.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/3 rounded-lg px-3 py-2 border border-white/5">
                    <FileText size={14} className="text-indigo-400 shrink-0" />
                    <span className="text-xs text-slate-300 truncate flex-1">{p.name}</span>
                    <span className="text-[10px] text-slate-600">{(p.file.size / 1024).toFixed(0)} KB</span>
                    <button onClick={() => removeFile(i)} className="text-slate-600 hover:text-red-400 transition-colors"><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reviewers */}
          <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white">Reviewers</h3>
                <span className="text-xs text-slate-600">({reviewers.length} added)</span>
              </div>
              <Btn variant="secondary" className="text-xs py-2" onClick={addReviewer}>
                <Plus size={13} />Add Reviewer
              </Btn>
            </div>

            {loadingReviewers ? (
              <div className="flex items-center gap-2 py-4 justify-center text-slate-500 text-sm">
                <Loader2 size={14} className="animate-spin" />Loading conference reviewers…
              </div>
            ) : reviewers.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/8 rounded-xl">
                <Users size={24} className="text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No reviewers added yet</p>
                <button onClick={addReviewer} className="mt-2 text-indigo-400 text-sm hover:text-indigo-300 font-semibold">+ Add Reviewer</button>
              </div>
            ) : (
              <div className="space-y-3">
                {reviewers.map((r, i) => (
                  <div key={i} className="bg-white/3 border border-white/6 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {r.name?.[0]?.toUpperCase() || (i + 1)}
                      </div>
                      <input
                        className="flex-1 bg-transparent border-b border-white/10 focus:border-indigo-500 outline-none text-sm text-white placeholder-slate-600 pb-0.5 transition-colors"
                        placeholder={`Reviewer ${i + 1} name`}
                        value={r.name}
                        onChange={e => updateReviewer(i, 'name', e.target.value)}
                      />
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-2 py-0.5" title="Maximum papers they can review">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Max Papers:</span>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          className="w-10 bg-transparent text-sm text-white font-bold outline-none text-center"
                          value={r.capacity || 3}
                          onChange={e => updateReviewer(i, 'capacity', e.target.value)}
                        />
                      </div>
                      <button onClick={() => removeReviewer(i)} className="p-1 text-slate-600 hover:text-red-400 transition-colors ml-1"><Trash2 size={13} /></button>
                    </div>
                    <textarea
                      className="w-full bg-white/4 border border-white/6 rounded-lg px-3 py-2 text-xs text-black placeholder-slate-600 outline-none focus:border-indigo-500 resize-none transition-colors"
                      placeholder="Expertise description (e.g., Expert in machine learning, deep learning, and NLP...)"
                      rows={2}
                      value={r.expertise}
                      onChange={e => updateReviewer(i, 'expertise', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-4">Settings</h3>
            <div className="flex items-center gap-4">
              <label className="text-xs text-slate-400 font-semibold">Reviewers per paper</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setReviewersPerPaper(p => Math.max(1, p - 1))}
                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all text-sm font-bold"
                >−</button>
                <span className="text-white font-bold text-lg w-6 text-center">{reviewersPerPaper}</span>
                <button
                  onClick={() => setReviewersPerPaper(p => Math.min(10, p + 1))}
                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all text-sm font-bold"
                >+</button>
              </div>
            </div>
          </div>

          {/* Run Button */}
          <Btn
            onClick={runAllocation}
            disabled={loading}
            className="w-full py-3.5 text-base"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" />Running Allocation…</>
            ) : (
              <><Play size={18} />Run Paper Allocation</>
            )}
          </Btn>

          {loading && (
            <div className="bg-indigo-500/8 border border-indigo-500/15 rounded-xl p-4 text-center">
              <p className="text-xs text-indigo-300/80">
                Extracting text from PDFs → generating embeddings → computing similarity → solving optimization…
              </p>
              <p className="text-[10px] text-indigo-400/50 mt-1">This may take 30-60 seconds on first run (model download)</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ RESULTS TAB ═══ */}
      {activeTab === 'results' && result && (
        <div className="space-y-6">

          {/* Status banner */}
          {result.status === 'optimal' ? (
            <div className="bg-emerald-500/8 border border-emerald-500/15 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-400 shrink-0" />
              <div>
                <span className="text-sm font-bold text-emerald-300">Optimal Solution Found</span>
                <p className="text-xs text-emerald-300/60 mt-0.5">
                  {result.summary?.total_assignments} assignments · Average similarity: {result.summary?.avg_similarity}
                </p>
              </div>
              <Btn variant="secondary" className="ml-auto text-xs py-1.5" onClick={exportCSV}>
                <Download size={13} />Export CSV
              </Btn>
            </div>
          ) : (
            <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-400 shrink-0" />
              <div>
                <span className="text-sm font-bold text-red-300">Allocation Failed: {result.status}</span>
                <p className="text-xs text-red-300/60 mt-0.5">{result.message}</p>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {result.summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'Total Assignments', value: result.summary.total_assignments, color: 'text-indigo-400', bg: 'bg-indigo-500/8' },
                { label: 'Avg Similarity', value: result.summary.avg_similarity, color: 'text-emerald-400', bg: 'bg-emerald-500/8' },
                { label: 'Min Similarity', value: result.summary.min_similarity, color: 'text-amber-400', bg: 'bg-amber-500/8' },
                { label: 'Max Similarity', value: result.summary.max_similarity, color: 'text-blue-400', bg: 'bg-blue-500/8' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={cls('rounded-xl p-4 border border-white/6', bg)}>
                  <div className={cls('text-2xl font-bold mb-0.5', color)}>{value}</div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Assignment Table */}
          {result.assignments && (
            <div className="bg-[#0d1117] border border-white/6 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/6">
                <h3 className="text-sm font-bold text-white">Assignments</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/6">
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paper</th>
                      <th className="px-5 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reviewer</th>
                      <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Similarity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.assignments.map((a, i) => (
                      <tr key={i} className="border-b border-white/4 hover:bg-white/2 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/15 text-indigo-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                              P{a.paper_id}
                            </div>
                            <span className="text-slate-300 truncate max-w-[200px]">{a.paper_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                              {a.reviewer_name?.[0]?.toUpperCase() || 'R'}
                            </div>
                            <span className="text-slate-300">{a.reviewer_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={cls(
                            'px-2 py-0.5 rounded-md text-[11px] font-bold border',
                            a.similarity_score >= 0.5 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                              a.similarity_score >= 0.3 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          )}>
                            {a.similarity_score.toFixed(4)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Similarity Heatmap */}
          {result.similarity_matrix && (
            <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4">Similarity Heatmap</h3>
              <div className="overflow-x-auto">
                <table className="mx-auto">
                  <thead>
                    <tr>
                      <th className="p-1" />
                      {(result.reviewer_names || []).map((name, r) => (
                        <th key={r} className="p-1 text-[10px] text-slate-500 font-semibold max-w-[60px] truncate" title={name}>
                          R{r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.similarity_matrix.map((row, p) => (
                      <tr key={p}>
                        <td className="p-1 text-[10px] text-slate-500 font-semibold pr-2 whitespace-nowrap" title={result.paper_names?.[p]}>
                          P{p}
                        </td>
                        {row.map((val, r) => {
                          const isAssigned = result.assignments?.some(a => a.paper_id === p && a.reviewer_id === r);
                          const intensity = Math.round(val * 100);
                          const hue = val >= 0.5 ? 142 : val >= 0.3 ? 38 : 220;
                          return (
                            <td
                              key={r}
                              className={cls(
                                'p-0.5 text-center',
                              )}
                              title={`P${p} × R${r}: ${val.toFixed(4)}`}
                            >
                              <div
                                className={cls(
                                  'w-12 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all',
                                  isAssigned && 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-[#0d1117]'
                                )}
                                style={{
                                  backgroundColor: `hsla(${hue}, 70%, ${20 + intensity * 0.35}%, ${0.3 + val * 0.7})`,
                                  color: val > 0.4 ? '#fff' : 'rgb(148 163 184)',
                                }}
                              >
                                {val.toFixed(2)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 text-[10px] text-slate-600">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-500/40 inline-block" /> High (&gt;0.5)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-500/40 inline-block" /> Medium (0.3–0.5)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-slate-500/40 inline-block" /> Low (&lt;0.3)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded ring-2 ring-indigo-400 inline-block" /> Assigned
                </span>
              </div>
            </div>
          )}

          {/* Reviewer Workload */}
          {result.reviewer_workload && (
            <div className="bg-[#0d1117] border border-white/6 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-4">Reviewer Workload</h3>
              <div className="space-y-3">
                {result.reviewer_workload.map((rw, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {rw.reviewer_name?.[0]?.toUpperCase() || 'R'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-300 font-medium truncate">{rw.reviewer_name}</span>
                        <span className="text-[10px] text-slate-500 font-semibold shrink-0 ml-2">
                          {rw.assigned}/{rw.capacity} papers ({rw.utilisation_pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={cls(
                            'h-full rounded-full transition-all',
                            rw.utilisation_pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'
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
