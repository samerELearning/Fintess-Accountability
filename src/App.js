import React, { useState } from 'react';
import IntroScreen from './components/IntroScreen';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import CommunityPage from './components/CommunityDashboard';
import UserProfile from './components/UserProfile';
import TeamProfile from './components/TeamProfile';


const App = () => {
  const [introComplete, setIntroComplete] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('dashboard');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);


  return (
    <div className="min-h-screen bg-black text-[#00ff00]">
      {introComplete ? (
        selectedUserId ? (
          <UserProfile userId={selectedUserId} onBack={() => setSelectedUserId(null)} />
        ) : selectedTeamId ? (
          <TeamProfile teamId={selectedTeamId} onBack={() => setSelectedTeamId(null)} setSelectedUserId={setSelectedUserId} />
        ) : view === 'admin' ? (
          <AdminDashboard setView={setView} setSelectedUserId={setSelectedUserId} setSelectedTeamId={setSelectedTeamId} />
        ) : view === 'community' ? (
          <CommunityPage setView={setView} setSelectedUserId={setSelectedUserId} setSelectedTeamId={setSelectedTeamId} />
        ) : (
          <Dashboard setView={setView} setSelectedUserId={setSelectedUserId} />
        )
      ) : (
        <IntroScreen onFinish={() => setIntroComplete(true)} />
      )}


    </div>
  );
};

export default App;

