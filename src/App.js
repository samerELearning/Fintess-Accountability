import React, { useState } from 'react';
import IntroScreen from './components/IntroScreen';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import CommunityPage from './components/CommunityDashboard';
import UserProfile from './components/UserProfile';


const App = () => {
  const [introComplete, setIntroComplete] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('dashboard');
  const [selectedUserId, setSelectedUserId] = useState(null);

  return (
    <div className="min-h-screen bg-black text-[#00ff00]">
      {introComplete ? (
        selectedUserId ? (
          <UserProfile userId={selectedUserId} onBack={() => setSelectedUserId(null)} />
        ) : view === 'admin' ? (
          <AdminDashboard setView={setView} setSelectedUserId={setSelectedUserId} />
        ) : view === 'community' ? (
          <CommunityPage setView={setView} setSelectedUserId={setSelectedUserId} />
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

