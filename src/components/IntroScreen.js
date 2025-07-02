import React, { useEffect, useState } from 'react';
import useSound from 'use-sound';
import typingSound from '../assets/typewriter.mp3';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 12) {
    return "goodmorning soldier!";
  } else if (hour >= 12 && hour < 17) {
    return "good afternoon soldier!";
  } else if (hour >= 17 || hour < 1) {
    return "good evening soldier!";
  } else if (hour >= 1 && hour < 4) {
    return "who needs sleep when you're training for greatness?";
  }
};


const IntroScreen = ({ onFinish }) => {
  const [text, setText] = useState('');
  const [started, setStarted] = useState(false);
  const [, { sound }] = useSound(typingSound, { volume: 0.5 });


  useEffect(() => {
    if (!started) return;

    const greetingMessage = getGreeting();
    let index = 0;

    const interval = setInterval(() => {
        const char = greetingMessage[index];
        if (char !== undefined) {
            setText((prev) => prev + char);

        if (index % 2 === 0 && char !== ' ') {
            sound?.stop();
            sound?.play();
        }
        index++;
        } else {
        clearInterval(interval);
        sound?.stop(); // Stop lingering sound
        setTimeout(() => onFinish(), 1000);
        }
    }, 80);

    return () => {
        clearInterval(interval);
        sound?.stop();
    };
}, [started, sound, onFinish]);



  return (
    <div className="typewriter-screen flex-col">
      {!started ? (
        <button
          className="mission-button"
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

