import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../Supabase/supabaseclient';
import { usePermissions } from '../hooks/usePermissions';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);           // Supabase auth user object
  const [conferences, setConferences] = useState([]); // list of conferences
  const [loading, setLoading] = useState(true);     // initial auth check in progress
  const [activeConfId, setActiveConfId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('confhub-theme') || 'dark');

  useEffect(() => {
    localStorage.setItem('confhub-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const { permissions, roles: userRoles, loading: loadingPermissions } = usePermissions(activeConfId, user?.id);

  /* ── Restore session on mount & listen to auth changes ─────────── */
  useEffect(() => {
    // 1. Check for an existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Subscribe to future auth events (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      // Auto-create a `users` row for first-time OAuth sign-ins (e.g. Google).
      // Fire-and-forget so it never blocks the auth state flow.
      if (_event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        (async () => {
          try {
            const { data: existing } = await supabase
              .from('users')
              .select('user_id')
              .eq('user_id', u.id)
              .maybeSingle();

            if (!existing) {
              const displayName =
                u.user_metadata?.full_name ||
                u.user_metadata?.name ||
                u.email?.split('@')[0] ||
                'User';
              await supabase.from('users').insert({
                user_id: u.id,
                user_name: displayName,
              });
            }
          } catch (err) {
            console.error('Auto-create user row failed:', err);
          }
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ── Load conferences for the logged-in user ────────────────────── */
  useEffect(() => {
    if (!user) {
      setConferences([]);
      return;
    }
    fetchConferences();
  }, [user]);

  const fetchConferences = async () => {
    const { data, error } = await supabase
      .from('conference')
      .select('*')
      .order('start_date', { ascending: true });

    if (!error && data) setConferences(data);
  };

  /* ── Sign out ───────────────────────────────────────────────────── */
  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setConferences([]);
    localStorage.removeItem('confmanager_view');
    localStorage.removeItem('confmanager_selected_conf_id');
    localStorage.removeItem('confmanager_initial_view');
    localStorage.removeItem('confmanager_dashboard_section');
    localStorage.removeItem('confmanager_dashboard_tab');
  };

  /* ── Add a newly created conference to local state ──────────────── */
  const addConference = (conf) => {
    setConferences((prev) => [conf, ...prev]);
  };

  return (
    <AppContext.Provider value={{
      user,
      setUser,          // used by AuthModule for immediate redirect after login/signup
      conferences,
      setConferences,
      fetchConferences,
      addConference,
      logout,
      loading,
      permissions,
      userRoles,
      setActiveConfId,
      loadingPermissions,
      theme,
      toggleTheme,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
};

export default AppContext;