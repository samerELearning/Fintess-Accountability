import React, { useState, useEffect } from 'react';
import IntroScreen from './components/IntroScreen';
import Dashboard from './components/Dashboard';

const App = () => {
  const [introComplete, setIntroComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIntroComplete(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-[#00ff00]">
      {introComplete ? <Dashboard /> : <IntroScreen />}
    </div>
  );
};

export default App;