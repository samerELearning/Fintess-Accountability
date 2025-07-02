import React, { useEffect, useState } from 'react';
import useSound from 'use-sound';
import typingSound from '../assets/typewriter.mp3';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';


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
  const [phase, setPhase] = useState('greeting');
  const [name, setName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [db] = useState(getFirestore());
  const [userId, setUserId] = useState(null);

  const [started, setStarted] = useState(false);
  const [, { sound }] = useSound(typingSound, { volume: 0.5 });

  // Omly for Kareem //////////////////////////////////////////////////
const specialUserId = 'Xh1wE0w9EtQlUaUEOSEjXSNqyps1';
const [authReady, setAuthReady] = useState(false);
const [isSpecialUser, setIsSpecialUser] = useState(false);
const auth = getAuth();

useEffect(() => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    if (user) {
      setUserId(user.uid);
      setAuthReady(true);
      if (user.uid === specialUserId) {
        setIsSpecialUser(true);
      }
    }
  });
  return () => unsubscribe();
}, []);

// Only for Kareem //////////////////////////////////////////////////

  useEffect(() => {
  if (!started) return;

  const runTyping = async (message, onDone) => {
    let index = 0;
    setText('');
    const interval = setInterval(() => {
      const char = message[index];
      if (char !== undefined) {
        setText((prev) => prev + char);
        if (index % 2 === 0 && char !== ' ') {
          sound?.stop();
          sound?.play();
        }
        index++;
      } else {
        clearInterval(interval);
        sound?.stop();
        onDone?.();
      }
    }, 80);
  };

  const checkNameAndRun = async () => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserId(user.uid);
        const nameDoc = await getDoc(doc(db, 'user_names', user.uid));
        if (false) {
          // Name exists — skip to finish  nameDoc.exists()
          runTyping(getGreeting(), () => setTimeout(() => onFinish(), 1000));
        } else {
          // Name doesn't exist — ask for it
          runTyping(getGreeting(), () => {
            setTimeout(() => {
              setPhase('askName');
              runTyping('State your name', () => {
                setShowInput(true);
              });
            }, 1000);
          });
        }
      }
    });

    return () => unsubscribe();
  };

  checkNameAndRun();
}, [started, sound, onFinish, db]);


const handleNameSubmit = async (e) => {
  e.preventDefault();
  if (userId && name.trim()) {
    await setDoc(doc(db, 'user_names', userId), { name: name.trim() });
    onFinish();
  }
};
// Omly for Kareem //////////////////////////////////////////////////
if (isSpecialUser) {
  return (
    <div className="typewriter-screen">
      <video
        src="/joke.mp4"
        width="720"
        height="400"
        autoPlay
        controls
        style={{ border: '2px solid #00ff00', boxShadow: '0 0 10px #00ff00' }}
      />
    </div>
  );
}
// Only for Kareem //////////////////////////////////////////////////
  
return (
  <div className="typewriter-screen flex-col">
    {!started ? (
      <button className="mission-button" onClick={() => setStarted(true)}>
        Begin Mission
      </button>
    ) : (
      <>
        <h1>{text}<span className="cursor">█</span></h1>
        {showInput && (
          <form onSubmit={handleNameSubmit}>
            <div className="name-form">
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="name-input"
                autoFocus
              />
              <button type="submit" className="mission-button" style={{ marginTop: '1rem' }}>
                Proceed
              </button>
            </div>
          </form>
        )}
      </>
    )}
  </div>
);

};

export default IntroScreen;

