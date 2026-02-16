import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../Supabase/supabaseclient';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [conferences, setConferences] = useState([]);
  const [papers, setPapers] = useState([]);
  const [tasks, setTasks] = useState([]);

  // 🔥 Auto-login if session exists
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
      }
    };
    getUser();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const createConference = (data) => {
    const newConf = {
      ...data,
      id: `c${Date.now()}`,
      organizerId: user.id,
      roles: { [user.id]: 'organizer' }
    };
    setConferences([...conferences, newConf]);
  };

  const addPaper = (paper) => setPapers([...papers, paper]);

  const updatePaperStatus = (id, status, score) => {
    setPapers(papers.map(p =>
      p.id === id ? { ...p, status, reviewScore: score } : p
    ));
  };

  const addTask = (task) => setTasks([...tasks, task]);

  const toggleTask = (id) => {
    setTasks(tasks.map(t =>
      t.id === id ? { ...t, status: t.status === 'done' ? 'pending' : 'done' } : t
    ));
  };

  const value = {
    user,
    setUser,   // 🔥 IMPORTANT
    conferences,
    papers,
    tasks,
    logout,
    createConference,
    addPaper,
    updatePaperStatus,
    addTask,
    toggleTask
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
