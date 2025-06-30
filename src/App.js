import React, { useState } from 'react';
import IntroScreen from './components/IntroScreen';
import Dashboard from './components/Dashboard';

const App = () => {
  const [introComplete, setIntroComplete] = useState(false);

  return (
    <div className="min-h-screen bg-black text-[#00ff00]">
      {introComplete ? (
        <Dashboard />
      ) : (
        <IntroScreen onFinish={() => setIntroComplete(true)} />
      )}
    </div>
  );
};

export default App;
