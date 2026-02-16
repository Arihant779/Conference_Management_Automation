import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import AuthModule from './components/Auth/AuthModule';
import CreateConference from './components/Conference/CreateConference';
import ConferenceView from './components/Conference/ConferenceView';
import UserDashboard from './components/Dashboard/UserDashboard';

const App = () => {
  const { user } = useApp();
  const [view, setView] = useState('dashboard');
  const [selectedConf, setSelectedConf] = useState(null);

  if (!user) {
    return <AuthModule />;
  }

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
        onBack={() => setView('dashboard')} 
      />
    );
  }

  return (
    <UserDashboard 
      onSelectConf={(conf) => { 
        setSelectedConf(conf); 
        setView('conference'); 
      }} 
      onCreateConf={() => setView('create')} 
    />
  );
};

export default App;
