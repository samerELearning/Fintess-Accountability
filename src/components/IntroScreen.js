import React, { useEffect, useState } from 'react';
import useSound from 'use-sound';
import typingSound from '../assets/typewriter.mp3';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning, fellas.';
  if (hour < 18) return 'Good afternoon, fellas.';
  return 'Good evening, fellas.';
};

const IntroScreen = ({ onFinish }) => {
  const [text, setText] = useState('');
  const [started, setStarted] = useState(false);
  const [play] = useSound(typingSound, { volume: 0.5 });

  useEffect(() => {
    if (!started) return;

    const greetingMessage = getGreeting();
    let index = 0;

    const interval = setInterval(() => {
      const char = greetingMessage[index];
      if (char !== undefined) {
        setText((prev) => prev + char);
        play();
        index++;
      } else {
        clearInterval(interval);
        setTimeout(() => onFinish(), 1000);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [started, play, onFinish]);

  return (
    <div className="typewriter-screen flex-col">
      {!started ? (
        <button
          className="text-[#00ff00] border border-[#00ff00] px-6 py-3 font-mono text-lg hover:bg-[#00ff00] hover:text-black transition-all"
          onClick={() => setStarted(true)}
        >
          Begin Mission
        </button>
      ) : (
        <h1>{text}<span className="cursor">█</span></h1>
      )}
    </div>
  );
};

export default IntroScreen;

