import React from 'react';
import { FileText, Calendar, CheckCircle, Award, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const PresenterDashboard = ({ conf }) => {
  const { user, papers, addPaper } = useApp();
  const confPapers = papers.filter(p => p.confId === conf.id);
  const myPaper = confPapers.find(p => p.authorId === user.id);
  
  return (
    <div className="max-w-4xl mx-auto p-12 bg-[#0f1117] min-h-full">
      <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full"></div>
        
        <div className="flex justify-between items-start mb-10 relative z-10">
          <div>
            <h2 className="text-3xl font-bold text-white">Author Dashboard</h2>
            <p className="text-slate-500 mt-2">Manage your paper submission</p>
          </div>
          <div className="bg-white/5 border border-white/10 text-indigo-300 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
            Paper ID: #8821
          </div>
        </div>

        {myPaper ? (
          <div className="space-y-8 relative z-10">
            <div className="flex items-center gap-6 bg-black/40 p-8 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 group-hover:h-full transition-all duration-300"></div>
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <FileText size={32} />
              </div>
              <div>
                <h3 className="font-bold text-xl text-white mb-1 group-hover:text-indigo-200 transition-colors">
                  {myPaper.title}
                </h3>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <Calendar size={14}/> Submitted Oct 12, 2024
                </p>
              </div>
              <div className="ml-auto">
                <span className={`px-5 py-2 rounded-full font-bold text-xs uppercase tracking-wider border ${
                  myPaper.status === 'accepted' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : myPaper.status === 'rejected' 
                    ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {myPaper.status === 'pending' ? 'Under Review' : myPaper.status}
                </span>
              </div>
            </div>
            
            {myPaper.status === 'accepted' && (
              <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-800/20 border border-emerald-500/20 p-8 rounded-3xl text-emerald-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Award size={100}/>
                </div>
                <h4 className="font-bold text-xl mb-3 flex items-center gap-3">
                  <CheckCircle size={24} className="text-emerald-400"/> Paper Accepted!
                </h4>
                <p className="text-emerald-200/80 mb-6 max-w-lg">
                  Congratulations! The committee has accepted your work for presentation.
                </p>
                <div className="bg-emerald-950/50 backdrop-blur-md p-4 rounded-xl border border-emerald-500/20 inline-block">
                  <div className="text-[10px] uppercase tracking-widest text-emerald-400/80 mb-1">
                    Session Slot
                  </div>
                  <div className="font-bold text-lg text-emerald-100">Main Hall • 2:00 PM</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 hover:bg-white/10 transition-colors">
            <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
              <Upload size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Submit your Paper</h3>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">
              Upload your PDF for peer review. Make sure to follow the formatting guidelines.
            </p>
            <button 
              onClick={() => addPaper({ 
                id: Date.now(), 
                confId: conf.id, 
                title: "New Research Paper", 
                authorId: user.id, 
                status: 'pending', 
                file: 'new.pdf' 
              })}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all"
            >
              Upload Manuscript
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresenterDashboard;
