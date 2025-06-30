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
  const [play] = useSound(typingSound, { volume: 0.5 });

  useEffect(() => {
    const greeting = getGreeting();
    let index = 0;
    const interval = setInterval(() => {
      setText((prev) => prev + greeting[index]);
      play();
      index++;
      if (index >= greeting.length) {
        clearInterval(interval);
        setTimeout(() => onFinish(), 1000); // Optional pause after typing
      }
    }, 100);
    return () => clearInterval(interval);
  }, [play, onFinish]);

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <h1 className="text-2xl sm:text-4xl font-mono tracking-wide animate-pulse">
        {text}
      </h1>
    </div>
  );
};

export default IntroScreen;
