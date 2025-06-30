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
    const greetingMessage = getGreeting();
    if (!greetingMessage) return;

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
    }, [play, onFinish]);



  return (
  <div className="typewriter-screen">
    <h1>{text}<span className="cursor">█</span></h1>


  </div>
);

};

export default IntroScreen;
