import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Shield, Users, Hash } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const ChatInterface = ({ conferenceId, teamId, chatType, title }) => {
    const { user: currentUser } = useApp();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef(null);

    // ── Fetch Messages ────────────────────────────────────────────────────────
    const fetchMessages = async () => {
        if (!conferenceId) return;
        setLoading(true);
        try {
            let query = supabase
                .from('chat_messages')
                .select('*')
                .eq('conference_id', conferenceId)
                .eq('chat_type', chatType)
                .order('created_at', { ascending: true });

            if (teamId) {
                query = query.eq('team_id', teamId);
            } else {
                query = query.is('team_id', null);
            }

            const { data, error } = await query;

            if (error) throw error;
            setMessages(data || []);
            setTimeout(scrollToBottom, 100);
        } catch (err) {
            console.error('Error fetching messages:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Real-time Subscription ───────────────────────────────────────────────
    useEffect(() => {
        if (!conferenceId) return;
        fetchMessages();

        const channel = supabase
            .channel(`chat:${conferenceId}:${chatType}${teamId ? `:${teamId}` : ''}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `conference_id=eq.${conferenceId}`,
            }, (payload) => {
                const msg = payload.new;
                const isSameType = msg.chat_type === chatType;
                const isSameTeam = teamId ? msg.team_id === teamId : msg.team_id === null;

                if (isSameType && isSameTeam) {
                    setMessages((prev) => [...prev, msg]);
                    setTimeout(scrollToBottom, 50);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conferenceId, teamId, chatType]);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // ── Send Message ─────────────────────────────────────────────────────────
    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || sending) return;
        if (!currentUser) {
            alert('You must be logged in to send messages.');
            return;
        }

        setSending(true);
        try {
            const msgData = {
                conference_id: conferenceId,
                team_id: teamId || null,
                sender_id: currentUser.id,
                message: newMessage.trim(),
                chat_type: chatType,
                sender_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0],
                sender_role: chatType === 'organizer_leader' ? 'Leader' : 'Member',
            };

            const { error } = await supabase.from('chat_messages').insert([msgData]);
            if (error) throw error;

            setNewMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message: ' + error.message);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden shadow-xl">
            {/* Header */}
            <div className="px-6 py-4 bg-white/5 border-b border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${chatType === 'team' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-violet-500/10 text-violet-400'}`}>
                        {chatType === 'team' ? <Users size={18} /> : <Shield size={18} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">{title || 'Chat'}</h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Live</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-10 opacity-50">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs text-slate-500 font-medium">Loading messages...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                        <div className="p-4 rounded-full bg-white/5 border border-white/5 mb-4 opacity-50">
                            <Hash size={32} className="text-slate-700" />
                        </div>
                        <p className="text-sm text-slate-500 font-medium">No messages yet.</p>
                    </div>
                ) : (
                    messages.map((msg, idx) => {
                        const isMe = msg.sender_id === currentUser.id;
                        const prevMsg = idx > 0 ? messages[idx - 1] : null;
                        const isConsecutive = prevMsg && prevMsg.sender_id === msg.sender_id;

                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isConsecutive ? 'mt-1' : 'mt-4'}`}
                            >
                                {!isConsecutive && (
                                    <div className={`flex items-center gap-2 mb-1.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <span className="text-[11px] font-bold text-slate-400">
                                            {isMe ? 'You' : msg.sender_name || 'User'}
                                        </span>
                                        <span className="text-[9px] text-slate-600 font-medium">
                                            {formatTime(msg.created_at)}
                                        </span>
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${isMe
                                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg'
                                            : 'bg-white/5 text-slate-200 border border-white/8 rounded-tl-none'
                                        }`}
                                >
                                    {msg.message}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={scrollRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white/4 border-t border-white/8">
                <div className="relative flex items-center gap-3">
                    <input
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 transition-all"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-lg transition-all"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatInterface;
