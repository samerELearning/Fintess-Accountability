import React, { useEffect, useState } from 'react';
import useSound from 'use-sound';
import typingSound from '../assets/typewriter.mp3';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';


const getGreeting = (name) => {
  const hour = new Date().getHours();
  const baseGreeting =
    hour >= 4 && hour < 12
      ? "goodmorning"
      : hour >= 12 && hour < 17
      ? "good afternoon"
      : hour >= 17 || hour < 1
      ? "good evening"
      : "who needs sleep when you're training for greatness?";

  if (baseGreeting === "who needs sleep when you're training for greatness?") {
    return baseGreeting;
  }

  // Append the name if available, otherwise default to "soldier"
  return `${baseGreeting} ${name || "soldier"}!`;
};




  const IntroScreen = ({ onFinish }) => {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState('greeting');
  const [name, setName] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [db] = useState(getFirestore());
  const [userId, setUserId] = useState(null);
  const [showDescription, setShowDescription] = useState(false);
  const [showProceedButton, setShowProceedButton] = useState(false);
  const [nameSubmitted, setNameSubmitted] = useState(false);






  const [started, setStarted] = useState(false);
  const [, { sound }] = useSound(typingSound, { volume: 0.5 });

const runTyping = async (message, onDone) => {
  let index = 0;
  setText('');

  const typeNextChar = () => {
    const char = message[index];
    if (char !== undefined) {
      setText((prev) => prev + char);

      let delay = 80;
      if (char === '.') {
        delay = 500;
        sound?.stop(); // stop sound for full pause
      } else if (char === ',') {
        delay = 200;
        sound?.stop(); // stop sound for comma pause
      } else if (index % 2 === 0 && char !== ' ') {
        sound?.stop();
        sound?.play();
      }

      index++;
      setTimeout(typeNextChar, delay);
    } else {
      sound?.stop();
      onDone?.();
    }
  };

  typeNextChar();
};



  /*useEffect(() => {
  if (!started) return;

  const checkNameAndRun = async () => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserId(user.uid);
        const nameDoc = await getDoc(doc(db, 'user_names', user.uid));
        if (nameDoc.exists()) {
          // Name exists — skip to finish  nameDoc.exists()
          const greeting = nameDoc.exists()
            ? getGreeting(nameDoc.data().name)
            : getGreeting();

          runTyping(greeting, () => {
            if (nameDoc.exists()) {
              setTimeout(() => onFinish(), 1000);
            } else {
              setTimeout(() => {
                setPhase('askName');
                runTyping('State your name', () => {
                  setShowInput(true);
                });
              }, 1000);
            }
          });

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
}, [started, sound, onFinish, db]);*/

useEffect(() => {
  if (!started) return;

  const auth = getAuth();
  const unsubscribe = auth.onAuthStateChanged(async (user) => {
    if (user) {
      setUserId(user.uid);

      const nameDoc = await getDoc(doc(db, 'user_names', user.uid));
      if (false) {//nameDoc.exists()
        const greeting = getGreeting(nameDoc.data().name);
        runTyping(greeting, () => setTimeout(() => onFinish(), 1000));
      } else {
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
}, [started, db, onFinish]);





const handleNameSubmit = async (e) => {
  e.preventDefault();
  if (userId && name.trim()) {
    //await setDoc(doc(db, 'user_names', userId), { name: name.trim() });
    const userRef = doc(db, 'user_names', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: name.trim(),
        joinedAt: serverTimestamp(),
      });
    }

    setPhase('description');
    setShowInput(false); // hide the input
    runTyping(
      `Welcome ${name.trim()}. This is your fitness accountability dashboard. Every week, you set your goal and log your actual progress. If you fall behind, your team feels it. Stay sharp.`,
      () => {
        setShowProceedButton(true);
      }
    );
  }
};
  
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
          <form onSubmit={(e) => {
                e.preventDefault();
                if (!nameSubmitted) {
                  setNameSubmitted(true);
                  handleNameSubmit(e);
                }
              }}>
            <div className="name-form">
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="name-input"
                autoFocus
              />
              <button
                type="submit"
                className="mission-button"
                style={{ marginTop: '1rem' }}
              >
                Proceed
              </button>
            </div>
          </form>
        )}

        {phase === 'description' && showProceedButton && (
          <button
            className="mission-button"
            style={{ marginTop: '2rem' }}
            onClick={onFinish}
          >
            Proceed
          </button>
        )}
      </>
    )}
  </div>
);


};

export default IntroScreen;

