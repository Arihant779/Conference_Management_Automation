import React, { useState } from 'react';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { LoadingRows, Empty, Modal, Btn } from '../common/Primitives';
import { SpotlightCard, AnimatedSection } from '../common/Effects';
import { useApp } from '../../../../../context/AppContext';

const PapersSection = ({
  confPapers, paperFilter, setPaperFilter,
  pendingCount, accepted, rejected,
  loadingPapers, can, updatePaperStatus,
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const [confirmPaper, setConfirmPaper] = useState(null); // { id, status, title }

  const fp = confPapers.filter(p => paperFilter === 'all' || p.status === paperFilter);
  const authorName = (p) => p.users?.user_name || p.users?.user_email || p.author_id?.slice(0, 8) || 'Unknown';

  const cls = (...c) => c.filter(Boolean).join(' ');

  return (
    <AnimatedSection className="space-y-6">
      <div>
        <h2 className={`text-3xl font-black transition-colors duration-500 tracking-tight mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Paper Submissions</h2>
        <p className="text-slate-500 font-medium tracking-wide">{confPapers.length} total · {pendingCount} pending review</p>
      </div>
      
      <div className={`flex gap-2 p-1.5 rounded-xl w-full md:w-fit max-w-full overflow-x-auto no-scrollbar backdrop-blur-md border transition-all duration-500 ${
        isDark ? 'bg-white/5 border-white/10 shadow-inner' : 'bg-zinc-100 border-zinc-200'
      }`}>
        {[
          ['all',`All (${confPapers.length})`],
          ['pending',`Pending (${pendingCount})`],
          ['accepted',`Accepted (${accepted})`],
          ['rejected',`Rejected (${rejected})`]
        ].map(([k,l]) => (
          <button 
            key={k} 
            onClick={() => setPaperFilter(k)} 
            className={`whitespace-nowrap shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${
              paperFilter === k 
                ? 'shadow-md' 
                : isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-600 hover:text-zinc-900'
            }`}
            style={paperFilter === k 
              ? { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#000' } 
              : {}
            }
          >
            {l}
          </button>
        ))}
      </div>

      {loadingPapers ? <LoadingRows /> : fp.length === 0 ? <Empty icon={FileText} msg="No papers match this filter." /> : (
        <div className="space-y-4">
          {fp.map((paper, i) => (
            <AnimatedSection key={paper.paper_id} delay={0.05 * i}>
              <SpotlightCard className="rounded-2xl" spotlightColor={isDark ? "rgba(251,191,36,0.05)" : "rgba(251,191,36,0.1)"}>
                <div className={`rounded-2xl p-6 transition-all duration-500 backdrop-blur-xl border ${
                  isDark 
                    ? 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60 shadow-lg' 
                    : 'bg-white/80 border-zinc-200 hover:border-amber-200/50 hover:bg-white shadow-sm'
                }`}>
                  <div className="flex flex-col md:flex-row items-start justify-between gap-6 md:gap-4">
                    <div className="flex items-start gap-4 min-w-0 w-full">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 shadow-inner" 
                        style={{ 
                          background: isDark ? 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(245,158,11,0.05))' : 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', 
                          color: '#fbbf24', 
                          border: `1px solid ${isDark ? 'rgba(251,191,36,0.2)' : '#FDE68A'}` 
                        }}>
                        {paper.paper_title?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className={`font-bold text-base leading-snug mb-1 tracking-wide transition-colors duration-500 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                          {paper.paper_title || 'Untitled'}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                          <span>By <span className={isDark ? 'text-slate-300' : 'text-zinc-700'}>{authorName(paper)}</span></span>
                          {paper.research_area && (
                            <>
                              <span className="text-slate-600">·</span>
                              <span className={`px-2 py-0.5 rounded-md border transition-colors ${
                                isDark ? 'text-slate-300 bg-white/5 border-white/10' : 'text-zinc-600 bg-zinc-100 border-zinc-200'
                              }`}>
                                {paper.research_area}
                              </span>
                            </>
                          )}
                        </div>
                        {paper.abstract && (
                          <p className={`text-sm mt-3 line-clamp-2 leading-relaxed transition-colors duration-500 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {paper.abstract}
                          </p>
                        )}
                        {paper.paper_assignments?.length > 0 && (() => {
                          const acc = paper.paper_assignments.filter(a => a.status === 'accepted').length;
                          const rej = paper.paper_assignments.filter(a => a.status === 'rejected').length;
                          const pen = paper.paper_assignments.filter(a => a.status === 'pending').length;
                          return (
                            <div className="flex gap-3 mt-3">
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle size={12} />{acc} Accept</span>
                              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1.5 bg-rose-500/10 text-rose-500 border border-rose-500/20"><XCircle size={12} />{rej} Reject</span>
                              {pen > 0 && <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md flex items-center gap-1.5 bg-amber-500/10 text-amber-500 border border-amber-500/20"><Clock size={12} />{pen} Pending</span>}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto mt-2 md:mt-0 gap-3 shrink-0">
                      <span className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm"
                        style={paper.status === 'accepted'
                          ? { background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }
                          : paper.status === 'rejected'
                          ? { background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }
                          : { background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                        {paper.status === 'accepted' || paper.status === 'rejected' ? paper.status : 'Pending'}
                      </span>
                      <div className="flex items-center justify-end flex-wrap gap-2 relative z-10">
                        {paper.file_url && (
                          <a href={paper.file_url} target="_blank" rel="noreferrer"
                            className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all text-amber-500 hover:bg-amber-500/10"
                            onClick={e => e.stopPropagation()}>
                            View File →
                          </a>
                        )}
                        {can('manage_papers') && (paper.status === 'pending' || !paper.status) && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setConfirmPaper({ id: paper.paper_id, status: 'accepted', title: paper.paper_title }); }}
                              className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20">
                              <CheckCircle size={14} /> Accept
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setConfirmPaper({ id: paper.paper_id, status: 'rejected', title: paper.paper_title }); }}
                              className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95 bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20">
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
      {confirmPaper && (
        <Modal 
          title="Confirm Decision" 
          onClose={() => setConfirmPaper(null)}
          width="max-w-md"
        >
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
              <div className={`p-3 rounded-xl shrink-0 ${confirmPaper.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                {confirmPaper.status === 'accepted' ? <CheckCircle size={24} /> : <XCircle size={24} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Are you sure you want to <span className={`font-bold ${confirmPaper.status === 'accepted' ? 'text-emerald-500' : 'text-rose-500'}`}>{confirmPaper.status === 'accepted' ? 'accept' : 'reject'}</span> this paper?
                </p>
                <p className={`text-sm font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{confirmPaper.title || 'Untitled'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Btn 
                variant="secondary" 
                className="flex-1" 
                onClick={() => setConfirmPaper(null)}
              >
                Cancel
              </Btn>
              <Btn 
                variant="primary" 
                className="flex-[1.5]" 
                onClick={() => {
                  updatePaperStatus(confirmPaper.id, confirmPaper.status);
                  setConfirmPaper(null);
                }}
              >
                Confirm {confirmPaper.status === 'accepted' ? 'Accept' : 'Reject'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </AnimatedSection>
  );
};

export default PapersSection;
