import React, { useState } from 'react';
import { 
  FileText, CheckCircle, XCircle, Users, Award, Settings, Plus 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const OrganizerDashboard = ({ conf }) => {
  const { papers, tasks, users, updatePaperStatus, addTask, toggleTask } = useApp();
  const [newTask, setNewTask] = useState('');
  
  const confPapers = papers.filter(p => p.confId === conf.id);
  const confTasks = tasks.filter(t => t.confId === conf.id);
  
  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask) return;
    addTask({ 
      id: Date.now(), 
      confId: conf.id, 
      title: newTask, 
      team: 'general', 
      status: 'pending', 
      assignee: 'TBD' 
    });
    setNewTask('');
  };

  const StatCard = ({ label, value, color, icon: Icon }) => (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-5 blur-2xl rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity`}></div>
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className={`p-3 rounded-xl ${color} bg-opacity-10 text-opacity-100 ring-1 ring-inset ring-white/5`}>
          <Icon size={20} className={color.replace('bg-', 'text-')} />
        </div>
      </div>
      <div className="text-3xl font-bold text-white mb-1 relative z-10">{value}</div>
      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest relative z-10">{label}</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-8 bg-[#0f1117] min-h-full">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Event Overview</h2>
          <p className="text-slate-500">Welcome back, Organizer.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 px-4 py-2 rounded-xl font-medium hover:bg-white/10 transition-colors">
            <Settings size={18} /> Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Papers" value={confPapers.length} color="bg-indigo-500" icon={FileText} />
        <StatCard 
          label="Pending Review" 
          value={confPapers.filter(p => p.status === 'pending').length} 
          color="bg-orange-500" 
          icon={CheckCircle} 
        />
        <StatCard label="Speakers" value="4" color="bg-blue-500" icon={Users} />
        <StatCard 
          label="Tasks Done" 
          value={`${confTasks.filter(t => t.status === 'done').length}/${confTasks.length}`} 
          color="bg-emerald-500" 
          icon={Award} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Paper Management */}
        <div className="lg:col-span-2 bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
            <h3 className="font-bold text-lg text-white">Recent Submissions</h3>
            <button className="text-xs text-indigo-400 font-bold uppercase tracking-wider hover:text-indigo-300">
              View All
            </button>
          </div>
          <div className="flex-1">
            {confPapers.length > 0 ? confPapers.map(paper => (
              <div 
                key={paper.id} 
                className="p-6 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/20">
                    {paper.title.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-200 group-hover:text-white transition-colors">
                      {paper.title}
                    </div>
                    <div className="text-sm text-slate-500">
                      by {users.find(u => u.id === paper.authorId)?.name || 'Unknown'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                    paper.status === 'accepted' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                      : paper.status === 'rejected' 
                      ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {paper.status}
                  </span>
                  
                  {paper.status === 'pending' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => updatePaperStatus(paper.id, 'accepted')} 
                        className="p-2 hover:bg-emerald-500/20 text-emerald-500 rounded-lg transition-colors border border-transparent hover:border-emerald-500/20"
                      >
                        <CheckCircle size={18}/>
                      </button>
                      <button 
                        onClick={() => updatePaperStatus(paper.id, 'rejected')} 
                        className="p-2 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-500/20"
                      >
                        <XCircle size={18}/>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )) : (
              <div className="p-12 text-center text-slate-600">No papers yet</div>
            )}
          </div>
        </div>

        {/* Team Task Management */}
        <div className="bg-slate-900/50 rounded-3xl border border-white/5 overflow-hidden flex flex-col h-full">
          <div className="px-6 py-6 border-b border-white/5">
            <h3 className="font-bold text-lg text-white">Team Tasks</h3>
          </div>
          <div className="p-6 flex-1 bg-black/20">
            <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
              <input 
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-white placeholder-slate-600 transition-all"
                placeholder="Add new task..."
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
              />
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-xl transition-colors"
              >
                <Plus size={20} />
              </button>
            </form>
            <div className="space-y-3">
              {confTasks.map(task => (
                <div 
                  key={task.id} 
                  className="flex items-start gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group cursor-pointer hover:bg-white/10" 
                  onClick={() => toggleTask(task.id)}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    task.status === 'done' 
                      ? 'bg-emerald-500 border-emerald-500' 
                      : 'border-slate-600 group-hover:border-indigo-500'
                  }`}>
                    {task.status === 'done' && <CheckCircle size={12} className="text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-300'
                    }`}>
                      {task.title}
                    </p>
                    <span className="text-[10px] uppercase font-bold text-slate-500 mt-1 block">
                      {task.team}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerDashboard;
