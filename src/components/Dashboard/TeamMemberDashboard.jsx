import React, { useState, useEffect } from 'react';
import { Users, Layout, ArrowLeft, MessageSquare } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import ChatInterface from '../Chat/ChatInterface';

const TeamMemberDashboard = ({ conf, onBack }) => {
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
        // 2. Find team membership
        const { data: tmData } = await supabase
          .from('team_members')
          .select('team_id, conference_teams(*)')
          .eq('conference_user_id', cuData.id)
          .maybeSingle();

        if (tmData && tmData.conference_teams) {
          setTeam(tmData.conference_teams);
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
        <p className="text-slate-500 font-medium">Connecting to your team...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center gap-6 mb-8">
        <button 
          onClick={onBack}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Team Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Communicate with your team leader and members</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Chat - Left wide column */}
        <div className="lg:col-span-3 h-[600px]">
          {team ? (
            <ChatInterface
              conferenceId={confId}
              teamId={team.id}
              chatType="team"
              title={`${team.name} Team Communication`}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-white/3 border border-dashed border-white/10 rounded-2xl p-10 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/8">
                <Users size={32} className="text-slate-700" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Team Assignment</h3>
              <p className="text-slate-500 max-w-xs mx-auto">You haven't been assigned to a team for this conference yet. Please check back later or contact the organizers.</p>
            </div>
          )}
        </div>

        {/* Sidebar - Right narrow column */}
        <div className="space-y-6">
          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 shadow-xl">
             <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Users size={16} />
                 </div>
                 <h3 className="font-bold text-white">Your Team</h3>
             </div>
             {team ? (
                 <div className="space-y-4">
                    <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Name</span>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-2.5 h-2.5 rounded-full" style={{background: team.color || '#6366f1'}}></div>
                            <p className="text-sm text-white font-semibold">{team.name}</p>
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Role</span>
                        <p className="text-xs text-slate-400 mt-1 capitalize">{team.type || 'Volunteer Team'}</p>
                    </div>
                 </div>
             ) : (
                <p className="text-xs text-slate-600 italic">Waiting for assignment...</p>
             )}
          </div>

          <div className="bg-[#0d1117] border border-white/8 rounded-2xl p-6 shadow-xl">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Live Updates</h3>
            <div className="flex items-center gap-3 py-2 text-slate-500">
                <MessageSquare size={14} />
                <span className="text-[11px] font-medium tracking-wide">Real-time chat active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamMemberDashboard;
