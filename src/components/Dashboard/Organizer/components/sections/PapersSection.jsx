import React from 'react';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { LoadingRows, Empty } from '../common/Primitives';
import { SpotlightCard, AnimatedSection } from '../common/Effects';

const PapersSection = ({
  confPapers, paperFilter, setPaperFilter,
  pendingCount, accepted, rejected,
  loadingPapers, can, updatePaperStatus,
}) => {
  const fp = confPapers.filter(p => paperFilter === 'all' || p.status === paperFilter);
  const authorName = (p) => p.users?.user_name || p.users?.user_email || p.author_id?.slice(0, 8) || 'Unknown';

  return (
    <AnimatedSection className="space-y-6">
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-1">Paper Submissions</h2>
        <p className="text-slate-400 font-medium tracking-wide">{confPapers.length} total · {pendingCount} pending review</p>
      </div>
      <div className="flex gap-2 p-1.5 rounded-xl w-fit bg-white/5 backdrop-blur-md border border-white/10 shadow-inner">
        {[['all',`All (${confPapers.length})`],['pending',`Pending (${pendingCount})`],['accepted',`Accepted (${accepted})`],['rejected',`Rejected (${rejected})`]].map(([k,l]) => (
          <button key={k} onClick={() => setPaperFilter(k)} className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={paperFilter === k 
              ? { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#000', boxShadow: '0 0 15px rgba(251,191,36,0.2)' } 
              : { color: '#94a3b8', background: 'transparent' }}
            onMouseEnter={e => { if(paperFilter !== k) e.currentTarget.style.color = '#e2e8f0'; }}
            onMouseLeave={e => { if(paperFilter !== k) e.currentTarget.style.color = '#94a3b8'; }}
          >
            {l}
          </button>
        ))}
      </div>
      {loadingPapers ? <LoadingRows /> : fp.length === 0 ? <Empty icon={FileText} msg="No papers match this filter." /> : (
        <div className="space-y-4">
          {fp.map((paper, i) => (
            <AnimatedSection key={paper.paper_id} delay={0.05 * i}>
              <SpotlightCard className="rounded-2xl" spotlightColor="rgba(251,191,36,0.05)">
                <div className="rounded-2xl p-6 transition-all bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-white/10 hover:bg-slate-900/60 shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 shadow-inner" 
                        style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.05))', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                        {paper.paper_title?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-base leading-snug mb-1 tracking-wide">{paper.paper_title || 'Untitled'}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
                          <span>By <span className="text-slate-300">{authorName(paper)}</span></span>
                          {paper.research_area && <><span className="text-slate-600">·</span><span className="px-2 py-0.5 rounded-md text-slate-300 bg-white/5 border border-white/10">{paper.research_area}</span></>}
                        </div>
                        {paper.abstract && <p className="text-sm mt-3 line-clamp-2 leading-relaxed text-slate-400">{paper.abstract}</p>}
                        {paper.paper_assignments?.length > 0 && (() => {
                          const acc = paper.paper_assignments.filter(a => a.status === 'accepted').length;
                          const rej = paper.paper_assignments.filter(a => a.status === 'rejected').length;
                          const pen = paper.paper_assignments.filter(a => a.status === 'pending').length;
                          return (
                            <div className="flex gap-3 mt-3">
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle size={12} />{acc} Accept</span>
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20"><XCircle size={12} />{rej} Reject</span>
                              {pen > 0 && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock size={12} />{pen} Pending</span>}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <span className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm"
                        style={paper.status === 'accepted'
                          ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 0 10px rgba(16,185,129,0.1)' }
                          : paper.status === 'rejected'
                          ? { background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)', boxShadow: '0 0 10px rgba(244,63,94,0.1)' }
                          : { background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)', boxShadow: '0 0 10px rgba(251,191,36,0.1)' }}>
                        {paper.status === 'accepted' || paper.status === 'rejected' ? paper.status : 'Pending'}
                      </span>
                      <div className="flex items-center gap-2 relative z-10">
                        {paper.file_url && (
                          <a href={paper.file_url} target="_blank" rel="noreferrer"
                            className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all text-amber-400 hover:bg-amber-400/10 hover:shadow-[0_0_10px_rgba(251,191,36,0.2)]"
                            onClick={e => e.stopPropagation()}>
                            View File →
                          </a>
                        )}
                        {can('manage_papers') && (paper.status === 'pending' || !paper.status) && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); updatePaperStatus(paper.paper_id, 'accepted'); }}
                              className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">
                              <CheckCircle size={14} /> Accept
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); updatePaperStatus(paper.paper_id, 'rejected'); }}
                              className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20">
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </AnimatedSection>
          ))}
        </div>
      )}
    </AnimatedSection>
  );
};

export default PapersSection;
