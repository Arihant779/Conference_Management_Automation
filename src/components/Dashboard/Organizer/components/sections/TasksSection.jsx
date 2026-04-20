import React from 'react';
import { Plus, CheckSquare, Layers, Users, Clock, Edit2, Trash2, Check } from 'lucide-react';
import { cls, PRIORITY_STYLE } from '../../constants';
import { Btn, Empty, LoadingRows } from '../common/Primitives';
import { AnimatedSection } from '../common/Effects';
import { useApp } from '../../../../../context/AppContext';

const TasksSection = ({
  tasks, isOrganizer, myHeadedTeamIds, loadingTasks,
  setModal, setTkForm, toggleTask, openEditTask, deleteTask,
  teamName, assigneeName,
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <AnimatedSection className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h2 className={`text-3xl font-black transition-colors duration-500 tracking-tight mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>Tasks</h2>
          <p className="text-slate-500 font-medium tracking-wide">
            <span className="text-amber-500">{tasks.filter(t => t.status === 'done').length}</span> / {tasks.length} complete
          </p>
        </div>
        <Btn onClick={() => { setTkForm({ title:'',description:'',team_id:'',assignee_id:'',priority:'medium',due_date:'' }); setModal('addTask'); }}>
          <Plus size={16} />Add Task
        </Btn>
      </div>

      {loadingTasks ? <LoadingRows /> : tasks.length === 0
        ? <Empty icon={CheckSquare} msg="No tasks yet." action={{ label: '+ Add Task', onClick: () => setModal('addTask') }} />
        : (
          <div className="space-y-3">
            {tasks.filter(t => isOrganizer || myHeadedTeamIds.includes(t.team_id)).map((task, i) => {
              const isDone = task.status === 'done';
              return (
                <AnimatedSection key={task.id} delay={0.05 * i} 
                  className={`rounded-2xl px-6 py-4 flex items-center gap-5 transition-all duration-500 group backdrop-blur-xl border ${
                    isDone 
                      ? isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50/50 border-amber-200/50' 
                      : isDark ? 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60 shadow-md' : 'bg-white border-zinc-200 hover:border-amber-200/50 hover:bg-zinc-50 shadow-sm'
                  }`}>
                  
                  <div onClick={() => toggleTask(task)}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer shrink-0 transition-all duration-300 ${
                      isDone 
                        ? 'bg-amber-500 border-amber-500 text-black shadow-[0_0_10px_rgba(251,191,36,0.3)]' 
                        : isDark ? 'border border-slate-600 bg-white/5 text-transparent hover:border-amber-400' : 'border border-zinc-300 bg-zinc-50 text-transparent hover:border-amber-500'
                    }`}>
                    <Check size={14} className={isDone ? 'opacity-100' : 'opacity-0 hover:opacity-50 text-amber-500'} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={`text-base font-bold tracking-wide transition-all duration-500 ${
                      isDone 
                        ? 'line-through text-slate-400' 
                        : isDark ? 'text-white' : 'text-zinc-900'
                    }`}>{task.title}</div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {task.team_id && (
                        <span className={`text-[11px] font-semibold flex items-center gap-1.5 px-2 py-1 rounded border transition-colors ${
                          isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                        }`}>
                          <Layers size={10} />{teamName(task.team_id)}
                        </span>
                      )}
                      {task.assignee_id && (
                        <span className={`text-[11px] font-semibold flex items-center gap-1.5 px-2 py-1 rounded border transition-colors ${
                          isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-500/80' : 'bg-amber-100 border-amber-200 text-amber-700'
                        }`}>
                          <Users size={10} />{assigneeName(task.assignee_id)}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={`text-[11px] font-semibold flex items-center gap-1.5 px-2 py-1 rounded border transition-colors ${
                          isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-zinc-100 border-zinc-200 text-zinc-500'
                        }`}>
                          <Clock size={10} />{new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <span className={cls('text-[10px] font-black px-3 py-1.5 rounded-lg border-2 uppercase tracking-widest shadow-sm', PRIORITY_STYLE[task.priority || 'medium'])}>{task.priority || 'med'}</span>
                  
                  <div className={`flex gap-2 transition-opacity duration-300 ${isDark ? 'opacity-0 group-hover:opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}>
                    <button onClick={() => openEditTask(task)} className={`p-2.5 rounded-xl transition-all ${
                      isDark ? 'text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white' : 'text-slate-400 bg-zinc-100 hover:bg-zinc-200 hover:text-zinc-900'
                    }`}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className={`p-2.5 rounded-xl transition-all ${
                      isDark ? 'text-slate-400 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400' : 'text-slate-400 bg-zinc-100 hover:bg-rose-50 hover:text-rose-500'
                    }`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        )
      }
    </AnimatedSection>
  );
};

export default TasksSection;
