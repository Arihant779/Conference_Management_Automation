import React, { useState, useEffect } from 'react';
import { Users, Shield, MessageSquare, ArrowLeft, Layout, Sparkles } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import ChatInterface from '../Chat/ChatInterface';

const TeamLeadDashboard = ({ conf, onBack }) => {
  const [activeTab, setActiveTab] = useState('team'); // 'team' or 'organizer'
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const confId = conf.conference_id || conf.id;

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const currentUser = session.user;
      setUser(currentUser);

      // 1. Get conference_user id
      const { data: cuData } = await supabase
        .from('conference_user')
        .select('id')
        .eq('conference_id', confId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (cuData) {
        // 2. Find team where this user is head
        const { data: teamData } = await supabase
          .from('conference_teams')
          .select('*')
          .eq('conference_id', confId)
          .eq('head_id', cuData.id)
          .maybeSingle();

        if (teamData) {
          setTeam(teamData);
        }
      }
      setLoading(false);
    };

    init();
  }, [confId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading Team Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
           <button 
             onClick={onBack}
             className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-sm"
           >
             <ArrowLeft size={20} />
           </button>
           <div>
             <h1 className="text-3xl font-bold text-white tracking-tight">Team Leader Dashboard</h1>
             <p className="text-slate-500 text-sm mt-1">Manage your team and coordinate with organizers</p>
           </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-white/4 border border-white/8 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'team'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Users size={16} /> My Team
          </button>
          <button
            onClick={() => setActiveTab('organizer')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'organizer'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Shield size={16} /> Organizers
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chat Section */}
        <div className="lg:col-span-2 h-[650px]">
          {activeTab === 'team' ? (
            team ? (
              <ChatInterface
                conferenceId={confId}
                teamId={team.id}
                chatType="team"
                title={`${team.name} Team Chat`}
              />
            ) : (
                <div className="h-full flex flex-col items-center justify-center bg-[#0d1117] border border-dashed border-white/10 rounded-2xl p-10 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/8">
                        <Users size={32} className="text-slate-700" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No assigned team</h3>
                    <p className="text-slate-500 max-w-xs mx-auto">You are registered as a Team Lead, but you haven't been assigned to a specific team yet.</p>
                </div>
            )
          ) : (
            <ChatInterface
              conferenceId={confId}
              chatType="organizer_leader"
              title="Organizers & Leads Coordination"
            />
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles size={48} className="text-indigo-400" />
             </div>
             <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Quick Actions</h3>
             <div className="space-y-3">
                <ActionCard icon={<MessageSquare size={16}/>} title="Broadcast Update" desc="Notify all team members" color="text-blue-400" />
                <ActionCard icon={<Layout size={16}/>} title="Manage Tasks" desc="View team progress" color="text-amber-400" />
             </div>
          </div>

          {team && (
            <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 shadow-xl">
               <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Team Details</h3>
               <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Team Name</span>
                    <p className="text-white font-semibold flex items-center gap-2 mt-1">
                        <span className="w-3 h-3 rounded-full" style={{background: team.color || '#6366f1'}}></span>
                        {team.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Description</span>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{team.description || 'No description provided.'}</p>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ActionCard = ({ icon, title, desc, color }) => (
    <button className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/20 transition-all text-left group">
        <div className={`p-2.5 rounded-lg bg-black/20 ${color} group-hover:scale-110 transition-transform`}>
            {icon}
        </div>
        <div>
            <div className="text-sm font-bold text-white">{title}</div>
            <div className="text-[11px] text-slate-500">{desc}</div>
        </div>
    </button>
);

export default TeamLeadDashboard;
