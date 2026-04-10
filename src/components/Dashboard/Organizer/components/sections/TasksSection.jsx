import React from 'react';
import { Plus, CheckSquare, CheckCircle, Layers, Users, Clock, Edit2, Trash2, Check } from 'lucide-react';
import { cls, PRIORITY_STYLE } from '../../constants';
import { Btn, Empty, LoadingRows } from '../common/Primitives';
import { AnimatedSection } from '../common/Effects';

const TasksSection = ({
  tasks, isOrganizer, myHeadedTeamIds, loadingTasks,
  setModal, setTkForm, toggleTask, openEditTask, deleteTask,
  teamName, assigneeName,
}) => (
  <AnimatedSection className="space-y-6">
    <div className="flex justify-between items-center mb-8">
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight mb-1">Tasks</h2>
        <p className="text-slate-400 font-medium tracking-wide">
          <span className="text-amber-400">{tasks.filter(t => t.status === 'done').length}</span> / {tasks.length} complete
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
          {tasks.filter(t => isOrganizer || myHeadedTeamIds.includes(t.team_id)).map((task, i) => (
            <AnimatedSection key={task.id} delay={0.05 * i} 
              className={`rounded-2xl px-6 py-4 flex items-center gap-5 transition-all group backdrop-blur-xl ${task.status === 'done' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60 shadow-md'}`}
              style={{ border: `1px solid ${task.status === 'done' ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)'}` }}>
              
              <div onClick={() => toggleTask(task)}
                className={`w-6 h-6 rounded-lg flex items-center justify-center cursor-pointer shrink-0 transition-all ${task.status === 'done' ? 'bg-amber-400 border-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'border border-slate-600 bg-white/5 text-transparent hover:border-amber-400'}`}>
                <Check size={14} className={task.status === 'done' ? 'opacity-100' : 'opacity-0 hover:opacity-50 text-amber-400'} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold tracking-wide" style={task.status === 'done' ? { textDecoration: 'line-through', color: '#64748b' } : { color: '#f8fafc' }}>{task.title}</div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {task.team_id     && <span className="text-[11px] font-semibold flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-400"><Layers size={10} />{teamName(task.team_id)}</span>}
                  {task.assignee_id && <span className="text-[11px] font-semibold flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500/80"><Users size={10} />{assigneeName(task.assignee_id)}</span>}
                  {task.due_date    && <span className="text-[11px] font-semibold flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-400"><Clock size={10} />{new Date(task.due_date).toLocaleDateString()}</span>}
                </div>
              </div>
              
              <span className={cls('text-[10px] font-black px-3 py-1.5 rounded-lg border-2 uppercase tracking-widest shadow-sm', PRIORITY_STYLE[task.priority || 'medium'])}>{task.priority || 'med'}</span>
              
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditTask(task)} className="p-2.5 rounded-xl transition-all text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => deleteTask(task.id)} className="p-2.5 rounded-xl transition-all text-slate-400 bg-white/5 hover:bg-rose-500/10 hover:text-rose-400 hover:shadow-[0_0_10px_rgba(244,63,94,0.2)]">
                  <Trash2 size={16} />
                </button>
              </div>
            </AnimatedSection>
          ))}
        </div>
      )
    }
  </AnimatedSection>
);

export default TasksSection;
