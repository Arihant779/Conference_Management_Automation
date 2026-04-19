import React, { useState, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../../../../Supabase/supabaseclient';
import { useApp } from '../../../../../context/AppContext';

const UserPickerPanel = ({ confId, members, onToggle, selectedIds = new Set() }) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';
  const [search, setSearch]   = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('users').select('user_id, user_name, user_email').order('user_name', { ascending: true });
      if (!error) setAllUsers(data || []);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const existingUserIds = new Set(members.map(m => m.user_id));
  const filtered = allUsers.filter(u => !existingUserIds.has(u.user_id)).filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.user_name?.toLowerCase().includes(q) || u.user_email?.toLowerCase().includes(q);
  });

  return (
    <div className="mt-1">
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3" 
           style={{ 
             background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
             border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' 
           }}>
        <Search size={12} className={isDark ? "text-zinc-600 shrink-0" : "text-zinc-400 shrink-0"} />
        <input className={`bg-transparent outline-none text-xs flex-1 ${isDark ? 'text-white' : 'text-zinc-900'} placeholder-zinc-500`}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="text-zinc-400 hover:text-zinc-600"><X size={11} /></button>}
      </div>
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded-xl animate-pulse" 
                 style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-6 text-center rounded-xl" 
             style={{ border: `1px dashed ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'}` }}>
          <p className={isDark ? "text-zinc-600 text-xs" : "text-zinc-500 text-xs font-medium"}>
            {search ? 'No users match your search.' : 'All registered users are already members.'}
          </p>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
          {filtered.map(u => {
            const isSelected = selectedIds.has(u.user_id);
            return (
              <div key={u.user_id} onClick={() => onToggle(u)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-300 group relative overflow-hidden"
                style={{ 
                  background: isSelected ? 'rgba(245,197,24,0.1)' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'), 
                  border: isSelected ? '1px solid rgba(245,197,24,0.3)' : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)') 
                }}
              >
                {isSelected && (
                   <motion.div layoutId={`selected-bg-${u.user_id}`} className="absolute inset-0 bg-amber-500/5 pointer-events-none" />
                )}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors" 
                   style={{ 
                     background: isSelected ? '#f5c518' : (isDark ? '#27293a' : '#f1f5f9'), 
                     color: isSelected ? '#000' : (isDark ? '#9ca3af' : '#64748b') 
                   }}>
                  {isSelected ? <Check size={14} /> : (u.user_name || u.user_email)?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 relative z-10">
                  <div className={`text-xs font-bold truncate transition-colors ${isSelected ? 'text-amber-500' : (isDark ? 'text-zinc-200' : 'text-zinc-900')}`}>
                    {u.user_name || '(no name)'}
                  </div>
                  <div className={`text-[10px] truncate ${isDark ? 'text-zinc-600' : 'text-zinc-500 font-medium'}`}>{u.user_email}</div>
                </div>
                <span className={`text-[9px] transition-colors font-black uppercase tracking-widest shrink-0 relative z-10 ${isSelected ? 'text-amber-600' : 'text-zinc-500 group-hover:text-amber-500'}`}>
                  {isSelected ? 'Selected' : '+ Select'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UserPickerPanel;
