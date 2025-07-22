import React, { useState } from 'react';
import IntroScreen from './components/IntroScreen';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

const App = () => {
  const [introComplete, setIntroComplete] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [view, setView] = useState('dashboard');

  return (
    <div className="min-h-screen bg-black text-[#00ff00]">
      {introComplete ? (
        view === 'admin' ? (
          <AdminDashboard setView={setView}/>
        ) : (
          <Dashboard setView={setView} />
        )
      ) : (
        <IntroScreen onFinish={() => setIntroComplete(true)} />
      )}
    </div>
  );
};

export default App;

