import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { supabase } from '../../../../../Supabase/supabaseclient';

const UserPickerPanel = ({ confId, members, onSelect }) => {
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
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Search size={12} className="text-zinc-600 shrink-0" />
        <input className="bg-transparent outline-none text-xs text-white placeholder-zinc-600 flex-1" style={{ fontFamily: "'DM Sans', sans-serif" }}
          placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-zinc-400"><X size={11} /></button>}
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-6 text-center rounded-xl" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
          <p className="text-zinc-600 text-xs">{search ? 'No users match your search.' : 'All registered users are already members.'}</p>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
          {filtered.map(u => (
            <div key={u.user_id} onClick={() => onSelect(u)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#27293a', color: '#9ca3af' }}>
                {(u.user_name || u.user_email)?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-zinc-200 truncate">{u.user_name || '(no name)'}</div>
                <div className="text-[10px] text-zinc-600 truncate">{u.user_email}</div>
              </div>
              <span className="text-[9px] text-zinc-600 group-hover:text-yellow-400 transition-colors font-semibold shrink-0">+ Select</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserPickerPanel;
