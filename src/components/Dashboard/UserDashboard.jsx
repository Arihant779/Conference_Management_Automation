import React, { useState } from 'react';
import { 
  Users, Calendar, Layout, LogOut, Plus, Search
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const UserDashboard = ({ onSelectConf, onCreateConf }) => {
  const { user, conferences, logout } = useApp();
  const [activeTab, setActiveTab] = useState('my');

  // 🔥 SAFE NAME (works for Supabase + old system)
  const displayName =
    user?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';

  const firstName = displayName.split(' ')[0];

  const myConfs = conferences.filter(c => c.roles && c.roles[user?.id]);
  const otherConfs = conferences.filter(c => !c.roles || !c.roles[user?.id]);

  const ConfCard = ({ conf, myRole }) => (
    <div className="group relative bg-slate-900 border border-white/5 rounded-[2rem] overflow-hidden hover:border-indigo-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-900/20 h-full flex flex-col">
      <div 
        className="h-56 bg-slate-800 bg-cover bg-center relative group-hover:scale-105 transition-transform duration-700" 
        style={{ backgroundImage: `url(${conf.banner})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        {myRole && (
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
            {myRole}
          </div>
        )}
        <div className="absolute bottom-4 left-6 right-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          <span className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mb-2 block">
            {conf.location}
          </span>
          <h3 className="font-bold text-2xl text-white truncate leading-tight mb-1">
            {conf.name}
          </h3>
        </div>
      </div>
      
      <div className="p-8 flex-1 flex flex-col bg-slate-900 relative z-10">
        <div className="flex items-center gap-2 text-slate-400 text-sm mb-5 font-medium">
          <Calendar size={14} className="text-indigo-500"/> {conf.date}
        </div>
        <p className="text-slate-400 text-sm line-clamp-2 mb-8 flex-1 leading-relaxed">
          {conf.description}
        </p>
        <button 
          onClick={() => onSelectConf(conf)}
          className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
            myRole 
              ? 'bg-white text-black hover:bg-slate-200' 
              : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'
          }`}
        >
          {myRole ? 'Enter Dashboard' : 'View Homepage'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] font-sans text-slate-200 selection:bg-indigo-500/30">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Layout size={20} />
            </div>
            <span className="font-bold text-xl text-white tracking-tight">ConfManager</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center bg-white/5 rounded-full px-4 py-2 gap-3 text-slate-400 border border-white/5">
              <Search size={16} />
              <input 
                className="bg-transparent border-none outline-none text-sm w-48 text-white placeholder-slate-500" 
                placeholder="Find an event..." 
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <div className="text-sm font-bold text-white">{displayName}</div>
                <div className="text-xs text-slate-500 font-medium">Verified User</div>
              </div>

              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full border-2 border-slate-900 shadow-sm ring-2 ring-white/10"></div>

              <button 
                onClick={logout} 
                className="text-slate-400 hover:text-red-400 transition-colors p-2 hover:bg-white/5 rounded-full"
              >
                <LogOut size={20}/>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative border-b border-white/5 py-16 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight">
              Welcome back, {firstName} 👋
            </h1>
            <p className="text-slate-400 text-lg">Manage your academic events and submissions.</p>
          </div>
          <button 
            onClick={onCreateConf}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg flex items-center gap-3"
          >
            <Plus size={20} /> New Conference
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-16 px-6">
        <div className="flex gap-10 mb-10 border-b border-white/5">
          <button 
            onClick={() => setActiveTab('my')}
            className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest ${
              activeTab === 'my' ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            My Conferences
          </button>
          <button 
            onClick={() => setActiveTab('all')}
            className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest ${
              activeTab === 'all' ? 'text-indigo-400' : 'text-slate-500'
            }`}
          >
            Explore Events
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeTab === 'my'
            ? myConfs.map(c => <ConfCard key={c.id} conf={c} myRole={c.roles[user?.id]} />)
            : otherConfs.map(c => <ConfCard key={c.id} conf={c} />)
          }
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;
