import React, { useState, useEffect } from 'react';
import { Users, Calendar, Layout, LogOut, Plus, Search, MapPin, Bell, ChevronRight } from 'lucide-react';
import { supabase } from '../../Supabase/supabaseclient';
import { useApp } from '../../context/AppContext';

const UserDashboard = ({ onSelectConf, onCreateConf }) => {
  const { user, conferences, logout, fetchConferences } = useApp();
  const [activeTab, setActiveTab] = useState('my');
  const [search, setSearch] = useState('');
  const [roleMap, setRoleMap] = useState({});
  const [loadingRoles, setLoadingRoles] = useState(true);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'User';
  const firstName = displayName.split(' ')[0];

  useEffect(() => {
    if (!user) return;
    buildRoleMap();
  }, [user, conferences]);

  const buildRoleMap = async () => {
    setLoadingRoles(true);
    const map = {};

    const { data: memberships, error: rolesError } = await supabase
      .from('conference_user')
      .select('conference_id, role')
      .eq('user_id', user.id);

    if (!rolesError && memberships) {
      memberships.forEach(({ conference_id, role }) => {
        map[conference_id] = role;
      });
    }

    conferences.forEach((c) => {
      if (c.conference_head_id === user.id) {
        map[c.conference_id] = map[c.conference_id] ?? 'organizer';
      }
    });

    setRoleMap(map);
    setLoadingRoles(false);
  };

  const myConfs    = conferences.filter((c) => roleMap[c.conference_id]);
  const otherConfs = conferences.filter((c) => !roleMap[c.conference_id]);

  const filterConfs = (list) =>
    list.filter(
      (c) =>
        !search ||
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.location?.toLowerCase().includes(search.toLowerCase()) ||
        c.theme?.toLowerCase().includes(search.toLowerCase())
    );

  const visibleConfs = filterConfs(activeTab === 'my' ? myConfs : otherConfs);

  const roleColors = {
    organizer: 'from-violet-500 to-purple-600',
    presenter: 'from-blue-500 to-cyan-600',
    reviewer:  'from-amber-500 to-orange-600',
  };

  const roleBadgeStyle = {
    organizer: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    presenter: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    reviewer:  'bg-amber-500/15 text-amber-300 border-amber-500/30',
  };

  const ConfCard = ({ conf }) => {
    const role = roleMap[conf.conference_id] ?? null;
    const dateLabel = conf.start_date
      ? new Date(conf.start_date).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric',
        })
      : 'Date TBD';

    return (
      <div className="group relative bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-500 hover:shadow-2xl hover:shadow-black/60 flex flex-col h-full">
        {/* Banner */}
        <div className="h-48 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center group-hover:scale-110 transition-transform duration-700 ease-out"
            style={conf.banner_url
              ? { backgroundImage: `url(${conf.banner_url})` }
              : { background: `linear-gradient(135deg, #0f0c29, #302b63, #24243e)` }
            }
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-[#0d1117]/20 to-transparent" />
          {role && (
            <div className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-widest border backdrop-blur-sm ${roleBadgeStyle[role] || 'bg-white/10 text-white border-white/20'}`}>
              {role}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-2 font-medium">
            <MapPin size={11} />
            <span>{conf.location ?? 'Location TBD'}</span>
          </div>
          <h3 className="font-bold text-lg text-white mb-2 leading-snug line-clamp-2">
            {conf.title}
          </h3>
          <p className="text-slate-500 text-sm line-clamp-2 mb-4 flex-1 leading-relaxed">
            {conf.description ?? 'No description provided.'}
          </p>
          <div className="flex items-center gap-2 text-slate-500 text-xs mb-5">
            <Calendar size={12} className="text-slate-600" />
            {dateLabel}
          </div>

          <button
            onClick={() => onSelectConf(conf, role)}
            className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
              role
                ? 'bg-white text-black hover:bg-slate-100'
                : 'bg-white/6 text-slate-300 hover:bg-white/12 border border-white/10'
            }`}
          >
            {role ? 'Open Dashboard' : 'View Conference'}
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    );
  };

  const EmptyState = () => (
    <div className="col-span-3 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/8">
        <Layout size={24} className="text-slate-600" />
      </div>
      <p className="text-slate-500 text-sm">
        {activeTab === 'my'
          ? "You haven't joined any conferences yet."
          : 'No events found matching your search.'}
      </p>
      {activeTab === 'my' && (
        <button
          onClick={onCreateConf}
          className="mt-4 text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors"
        >
          + Create your first conference
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-200" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-[#080b11]/90 backdrop-blur-xl border-b border-white/6 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Layout size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">ConfHub</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-white/5 rounded-lg px-3 py-2 gap-2 border border-white/8 text-slate-500">
              <Search size={14} />
              <input
                className="bg-transparent border-none outline-none text-sm w-44 text-white placeholder-slate-600"
                placeholder="Search events..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button className="relative p-2 text-slate-500 hover:text-white hover:bg-white/6 rounded-lg transition-all">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            </button>

            <div className="flex items-center gap-2.5 pl-3 border-l border-white/8">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {firstName[0]?.toUpperCase()}
              </div>
              <div className="hidden md:block">
                <div className="text-sm font-semibold text-white leading-none">{firstName}</div>
                <div className="text-xs text-slate-600 mt-0.5">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                className="ml-1 p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-10">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white mb-1.5 tracking-tight">
              Welcome back, {firstName} 👋
            </h1>
            <p className="text-slate-500">Manage your conferences and submissions</p>
          </div>
          <button
            onClick={onCreateConf}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
          >
            <Plus size={17} /> New Conference
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { label: 'My Conferences', value: myConfs.length, color: 'text-indigo-400' },
            { label: 'As Organizer',   value: myConfs.filter(c => roleMap[c.conference_id] === 'organizer').length, color: 'text-violet-400' },
            { label: 'As Reviewer',    value: myConfs.filter(c => roleMap[c.conference_id] === 'reviewer').length,  color: 'text-amber-400' },
            { label: 'As Presenter',   value: myConfs.filter(c => roleMap[c.conference_id] === 'presenter').length, color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#0d1117] border border-white/6 rounded-xl p-4">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-slate-500 mt-0.5 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs + Grid */}
      <main className="max-w-7xl mx-auto px-6 pb-16">
        <div className="flex gap-1 mb-8 bg-white/4 p-1 rounded-xl w-fit border border-white/6">
          {[
            { key: 'my',  label: `My Conferences (${myConfs.length})`  },
            { key: 'all', label: `Explore (${otherConfs.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === key
                  ? 'bg-white text-black shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingRoles
            ? [...Array(3)].map((_, i) => (
                <div key={i} className="h-80 bg-white/3 border border-white/5 rounded-2xl animate-pulse" />
              ))
            : visibleConfs.length > 0
              ? visibleConfs.map((c) => <ConfCard key={c.conference_id} conf={c} />)
              : <EmptyState />
          }
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;