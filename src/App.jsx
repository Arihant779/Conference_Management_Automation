import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import AuthModule from './components/Auth/AuthModule';
import CreateConference from './components/Conference/CreateConference';
import ConferenceView from './components/Conference/ConferenceView';
import UserDashboard from './components/Dashboard/UserDashboard';
import { supabase } from './Supabase/supabaseclient';
import InvitationThankYou from './components/Public/InvitationThankYou';

// ─── URL helpers ─────────────────────────────────────────────────────────────
const getConfIdFromURL = () => new URLSearchParams(window.location.search).get('conf');
const getIntentFromURL = () => new URLSearchParams(window.location.search).get('intent');
const getViewFromURL = () => new URLSearchParams(window.location.search).get('view');

const clearURLParams = () => {
  const url = new URL(window.location.href);
  url.searchParams.delete('conf');
  url.searchParams.delete('intent');
  url.searchParams.delete('view');
  url.searchParams.delete('status');
  window.history.replaceState({}, '', url.toString());
};

// ─── sessionStorage helpers ───────────────────────────────────────────────────
const PENDING_KEY = 'confmanager_pending';
const savePending = (confId, intent) => sessionStorage.setItem(PENDING_KEY, JSON.stringify({ confId, intent }));
const loadPending = () => { try { const r = sessionStorage.getItem(PENDING_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const clearPending = () => sessionStorage.removeItem(PENDING_KEY);
const VIEW_KEY = 'confmanager_view';
const CONF_ID_KEY = 'confmanager_selected_conf_id';
const INTENT_KEY = 'confmanager_initial_view';

// ─────────────────────────────────────────────────────────────────────────────

const App = () => {
  const { user, setUser, conferences, activeConfId, setActiveConfId } = useApp();
  const [view, setView] = useState('dashboard');
  const [selectedConf, setSelectedConf] = useState(null);
  const [initialView, setInitialView] = useState('home');
  const [loading, setLoading] = useState(true);

  // Track previous user to detect the login transition (null → user)
  const [prevUser, setPrevUser] = useState(null);

  // ── On mount: read URL params → save pending → load conf ─────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const urlConfId = getConfIdFromURL();
        const urlIntent = getIntentFromURL();
        const urlView = getViewFromURL();

        if (urlView === 'invitation-thank-you') {
          setView('invitation-thank-you');
          return;
        }

        if (urlConfId) {
          clearURLParams();
          savePending(urlConfId, urlIntent || 'home');
        }

        // Parallelize localStorage reads (synchronous but grouped for logic)
        const pending = loadPending();
        const savedView = localStorage.getItem(VIEW_KEY);
        const savedConfId = localStorage.getItem(CONF_ID_KEY);
        const savedIntent = localStorage.getItem(INTENT_KEY);

        // Determine target conference if any
        const targetConfId = pending?.confId || (savedView === 'conference' ? savedConfId : null);
        const targetIntent = (pending?.confId ? pending.intent : (savedView === 'conference' ? savedIntent : 'home')) || 'home';

        if (targetConfId) {
          const { data: confData, error } = await supabase
            .from('conference')
            .select('*')
            .eq('conference_id', targetConfId)
            .maybeSingle();

          if (!error && confData) {
            setSelectedConf(confData);
            setInitialView(targetIntent);
            setView('conference');
            setActiveConfId(targetConfId);
            clearPending();
          } else {
            setView('dashboard');
          }
        } else if (savedView) {
          setView(savedView);
        }
      } catch (err) {
        console.error("Init synchronization failed:", err);
        setView('dashboard');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  // ── Perspective Persistence ────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !user) return;
    localStorage.setItem(VIEW_KEY, view);
    if (view === 'conference' && selectedConf) {
      localStorage.setItem(CONF_ID_KEY, selectedConf.conference_id ?? selectedConf.id);
      localStorage.setItem(INTENT_KEY, initialView);
    } else {
      localStorage.removeItem(CONF_ID_KEY);
      localStorage.removeItem(INTENT_KEY);
      // If we are explicitly on the dashboard or create view, clear any stale pending pointers
      if (view === 'dashboard' || view === 'create') {
        clearPending();
      }
    }
  }, [view, selectedConf, initialView, loading, user]);

  // ── After login: restore pending conf + intent ────────────────────────────
  // Key fix: we check prevUser so this only fires on the null→user transition,
  // not on every render. This means even if selectedConf is already set (from
  // the guest view), we still correctly apply the saved intent (e.g. 'submitPaper').
  useEffect(() => {
    if (loading) return;

    if (user && !prevUser) {
      // User just logged in
      setPrevUser(user);

      const pending = loadPending();
      if (!pending?.confId) return; // no pending → go to hub normally

      const restore = async () => {
        const { data: confData } = await supabase
          .from('conference')
          .select('*')
          .eq('conference_id', pending.confId)
          .maybeSingle();

        clearPending();

        if (confData) {
          setSelectedConf(confData);
          setInitialView(pending.intent || 'home'); // ← restores 'submitPaper'
          setView('conference');
          setActiveConfId(pending.confId);
        }
      };

      restore();
    }

    if (!user && prevUser) {
      // User logged out — reset so next login triggers the effect again
      setPrevUser(null);
    }
  }, [user, loading]);

  // ── Sync local selectedConf with global conferences list ──────────────
  useEffect(() => {
    if (activeConfId && conferences.length > 0) {
      const updated = conferences.find(c => (c.conference_id ?? c.id) === activeConfId);
      console.log('[App Sync] Found updated conf:', updated?.title, 'Published:', updated?.is_published);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedConf)) {
        console.log('[App Sync] Updating selectedConf state');
        setSelectedConf(updated);
      }
    }
  }, [conferences, activeConfId, selectedConf]);


  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (view === 'invitation-thank-you') {
    return <InvitationThankYou />;
  }

  // ── Guest: show public conference page without login ──────────────────────
  if (!user) {
    if (view === 'conference' && selectedConf) {
      return (
        <ConferenceView
          conf={selectedConf}
          role={null}
          initialViewMode={initialView}
          isGuest={true}
          onBack={() => {
            setView('dashboard');
            setSelectedConf(null);
            setActiveConfId(null);
            clearPending();
          }}
          onRequireAuth={(intent) => {
            // Persist { confId, intent } so it survives the login screen render
            savePending(selectedConf.conference_id ?? selectedConf.id, intent);
            setView('auth');
          }}
        />
      );
    }

    // Plain login screen (or redirected from guest action)
    return <AuthModule onSuccess={(u) => setUser(u)} />;
  }

  // ── Authenticated flows ───────────────────────────────────────────────────
  if (view === 'create') {
    return (
      <CreateConference
        onCancel={() => setView('dashboard')}
        onSuccess={() => setView('dashboard')}
      />
    );
  }

  if (view === 'conference' && selectedConf) {
    const role = selectedConf.roles ? selectedConf.roles[user.id] : null;
    return (
      <ConferenceView
        conf={selectedConf}
        role={role}
        initialViewMode={initialView}
        isGuest={false}
        onBack={() => {
          setView('dashboard');
          setSelectedConf(null);
          setInitialView('home');
          setActiveConfId(null);
          clearPending();
        }}
      />
    );
  }

  return (
    <UserDashboard
      onSelectConf={(conf) => {
        setSelectedConf(conf);
        setInitialView('home');
        setActiveConfId(conf.conference_id ?? conf.id);
        setView('conference');
      }}
      onCreateConf={() => setView('create')}
    />
  );
};

export default App;