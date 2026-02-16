import React from 'react';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ReviewerDashboard = ({ conf }) => {
  const { papers, updatePaperStatus } = useApp();
  const confPapers = papers.filter(p => p.confId === conf.id);
  
  return (
    <div className="max-w-6xl mx-auto p-12 bg-[#0f1117] min-h-full">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-bold text-white">Review Portal</h2>
          <p className="text-slate-500 mt-2">
            You have {confPapers.filter(p => p.status === 'pending').length} papers pending review.
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {confPapers.filter(p => p.status === 'pending').map(paper => (
          <div 
            key={paper.id} 
            className="bg-slate-900/50 p-8 rounded-[2rem] border border-white/5 hover:border-indigo-500/30 transition-all duration-300 group"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                Research Track
              </div>
              <button className="text-slate-500 hover:text-indigo-400 transition-colors">
                <FileText size={20}/>
              </button>
            </div>
            
            <h3 className="font-bold text-2xl text-white mb-3 leading-tight group-hover:text-indigo-200 transition-colors">
              {paper.title}
            </h3>
            <p className="text-sm text-slate-500 mb-8 font-mono">ID: #8492</p>
            
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Your Assessment
              </label>
              <textarea 
                placeholder="Enter your confidential feedback here..." 
                className="w-full bg-black/30 border border-white/5 rounded-xl p-4 text-sm h-32 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-all text-white placeholder-slate-600" 
              />
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                  onClick={() => updatePaperStatus(paper.id, 'accepted', 90)} 
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-3 rounded-xl text-sm font-bold transition-colors"
                >
                  Accept Paper
                </button>
                <button 
                  onClick={() => updatePaperStatus(paper.id, 'rejected', 40)} 
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-3 rounded-xl text-sm font-bold transition-colors"
                >
                  Reject Paper
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {confPapers.filter(p => p.status === 'pending').length === 0 && (
          <div className="col-span-full py-32 text-center border border-dashed border-white/5 rounded-[3rem] bg-white/[0.02]">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 border border-emerald-500/20">
              <CheckCircle size={48} />
            </div>
            <h3 className="text-2xl font-bold text-white">All Caught Up!</h3>
            <p className="text-slate-500 mt-2">You have no pending reviews assigned to you.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewerDashboard;
