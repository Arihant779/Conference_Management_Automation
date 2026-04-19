import React from 'react';
import { cls } from '../../constants';
import { AnimatedSection } from '../common/Effects';
import { useApp } from '../../../../../context/AppContext';
import ChatInterface from '../../../../Chat/ChatInterface';

const ChatSection = ({
  confId, teams, isOrganizer, myTeamIds = [],
  activeChatTeamId, setActiveChatTeamId,
  showLeaderHub = true,
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const visibleTeams = teams.filter(t => isOrganizer || myTeamIds.includes(t.id));

  React.useEffect(() => {
    if (!showLeaderHub && !activeChatTeamId && visibleTeams.length > 0) {
      setActiveChatTeamId(visibleTeams[0].id);
    }
  }, [showLeaderHub, activeChatTeamId, visibleTeams, setActiveChatTeamId]);

  return (
    <AnimatedSection className="flex flex-col flex-1 min-h-0 gap-4 overflow-hidden">
      {/* Chat Type Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 shrink-0 custom-scrollbar whitespace-nowrap">
        <div
          className="flex items-center gap-1 p-1 rounded-xl border transition-colors duration-300"
          style={{
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.04)',
            borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.1)',
          }}
        >
          {showLeaderHub && (
            <button
              onClick={() => setActiveChatTeamId(null)}
              className={cls(
                'px-4 py-2 rounded-lg text-xs font-bold transition-all',
                !activeChatTeamId
                  ? (isDark ? 'text-black' : 'text-black')
                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-zinc-500 hover:text-zinc-900'),
              )}
              style={
                !activeChatTeamId
                  ? { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 0 12px rgba(251,191,36,0.3)' }
                  : {}
              }
            >
              Leader Hub
            </button>
          )}
          {visibleTeams.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveChatTeamId(t.id)}
              className={cls(
                'px-4 py-2 rounded-lg text-xs font-bold transition-all',
                activeChatTeamId === t.id
                  ? (isDark ? 'text-black' : 'text-black')
                  : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-zinc-500 hover:text-zinc-900'),
              )}
              style={
                activeChatTeamId === t.id
                  ? { background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 0 12px rgba(251,191,36,0.3)' }
                  : {}
              }
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 min-h-0">
        <ChatInterface
          conferenceId={confId}
          teamId={activeChatTeamId}
          chatType={activeChatTeamId ? 'team' : 'organizer_leader'}
          title={activeChatTeamId ? teams.find(t => t.id === activeChatTeamId)?.name : 'Leader Chat'}
        />
      </div>
    </AnimatedSection>
  );
};

export default ChatSection;
