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

// ─────────────────────────────────────────────────────────────────────────────

const App = () => {
  const { user, setUser, setActiveConfId } = useApp();
  const [view, setView] = useState('dashboard');
  const [selectedConf, setSelectedConf] = useState(null);
  const [initialView, setInitialView] = useState('home');
  const [loading, setLoading] = useState(true);

  // Track previous user to detect the login transition (null → user)
  const [prevUser, setPrevUser] = useState(null);

  // ── On mount: read URL params → save pending → load conf ─────────────────
  useEffect(() => {
    const init = async () => {
      const urlConfId = getConfIdFromURL();
      const urlIntent = getIntentFromURL();
      const urlView   = getViewFromURL();

      if (urlView === 'invitation-thank-you') {
        setView('invitation-thank-you');
        setLoading(false);
        return;
      }

      if (urlConfId) {
        clearURLParams();
        savePending(urlConfId, urlIntent || 'home');
      }

      const pending = loadPending();

      if (pending?.confId) {
        const { data: confData } = await supabase
          .from('conference')
          .select('*')
          .eq('conference_id', pending.confId)
          .maybeSingle();

        if (confData) {
          setSelectedConf(confData);
          setInitialView(pending.intent || 'home');
          setView('conference');
          setActiveConfId(pending.confId);
        }
      }

      setLoading(false);
    };

    init();
  }, []);

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