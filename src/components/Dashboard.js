import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyAP2uPwMnQ-21qISA4GUT_JTGCA6Nw86Qc',
  authDomain: 'fitnessaccountability-caa33.firebaseapp.com',
  projectId: 'fitnessaccountability-caa33',
  storageBucket: 'fitnessaccountability-caa33.appspot.com',
  messagingSenderId: '222742620710',
  appId: '1:222742620710:web:384e3e5e0480ba37a614e7',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const getWeekId = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    d.getFullYear() +
    '-W' +
    String(
      1 +
        Math.ceil(
          ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
        )
    ).padStart(2, '0')
  );
};

const getCurrentWeekId = () => getWeekId(new Date());


const Dashboard = () => {
  const [userId, setUserId] = useState(null);
  const [goalDistance, setGoalDistance] = useState('');
  const [actualDistance, setActualDistance] = useState('');
  const [goalReps, setGoalReps] = useState('');
  const [actualReps, setActualReps] = useState('');
  const [message, setMessage] = useState('');
  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFirstTimeUser = weeklyEntries.length === 0;
  const currentWeekId = getCurrentWeekId();
  const [hasSubmittedGoal, setHasSubmittedGoal] = useState(false);

  

  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
      console.error('Auth Error:', error);
    });
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    const entriesRef = collection(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances`);
    const q = query(entriesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setWeeklyEntries(entries);
      setLoading(false); // Set loading to false once data is fetched

      const currentWeekEntry = entries.find(entry => entry.weekId === currentWeekId);
      setHasSubmittedGoal(!!currentWeekEntry?.goalDistance);
    });

    return () => unsubscribe();
  }, [userId]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    const weekId = getWeekId(new Date());

    if (!hasSubmittedGoal) {
      const goal = parseFloat(goalDistance);
      const repsGoal = parseInt(goalReps);
      if (isNaN(goal) || isNaN(repsGoal)) return;

      await setDoc(
        doc(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances`, weekId),
        {
          weekId,
          goalDistance: goal,
          goalReps: repsGoal,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      const actual = parseFloat(actualDistance);
      const repsActual = parseInt(actualReps);
      if (isNaN(actual) || isNaN(repsActual)) return;

      await setDoc(
        doc(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances`, weekId),
        {
          actualDistance: actual,
          actualReps: repsActual,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );
    }

    // Reset
    setGoalDistance('');
    setGoalReps('');
    setActualDistance('');
    setActualReps('');
    setMessage('Entry saved successfully!');
  };


  const calculateResult = useCallback((goal, actual, unit = 'km') => {
    const diff = actual - goal;
    return diff >= 0 ? `+${diff.toFixed(2)} ${unit}` : `${diff.toFixed(2)} ${unit}`;
  }, []);

  return (
    <div className="dashboard-screen">
      <h1 className="dashboard-title">WEEKLY FITNESS DASHBOARD</h1>
      
      <form className="dashboard-form" onSubmit={handleSubmit}>
        {!hasSubmittedGoal ? (
        <>
          <input
            type="number"
            placeholder="Goal Distance (km)"
            value={goalDistance}
            onChange={(e) => setGoalDistance(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Goal Reps"
            value={goalReps}
            onChange={(e) => setGoalReps(e.target.value)}
            required
          />
        </>
      ) : (
        <>
          <input
            type="number"
            placeholder="Actual Distance (km)"
            value={actualDistance}
            onChange={(e) => setActualDistance(e.target.value)}
            required
          />
          <input
            type="number"
            placeholder="Actual Reps"
            value={actualReps}
            onChange={(e) => setActualReps(e.target.value)}
            required
          />
        </>
      )}

        <button
          type="submit"
          disabled={
            (!hasSubmittedGoal && (!goalDistance || !goalReps)) ||
            (hasSubmittedGoal && (!actualDistance || !actualReps))
          }
        >
          SUBMIT
        </button>

      </form>

 {loading ? (
  <p className="dashboard-message">Loading your data...</p>
) : !isFirstTimeUser ? (
  <>
    <h2 className="dashboard-section-title">Your Weekly History</h2>
    <div className="scroll-hidden fade-in-table" style={{ maxHeight: '300px', overflowY: 'scroll' }}>
      <div className="dashboard-table-wrapper">
  <table className="dashboard-table">
    <thead>
      <tr>
        <th>Week</th>
        <th>Goal (km)</th>
        <th>Actual (km)</th>
        <th>Goal Reps</th>
        <th>Actual Reps</th>
        <th>Result</th>
      </tr>
    </thead>
  </table>

  <div className="dashboard-table-body scroll-hidden">
    <table className="dashboard-table">
      <tbody>
        {[...weeklyEntries].reverse().map((entry, index) => (
          <tr
            key={entry.id}
            className="fade-in-row"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <td>{entry.weekId}</td>
            <td>{entry.goalDistance?.toFixed(1) ?? '-'}</td>
            <td>{entry.actualDistance?.toFixed(1) ?? '-'}</td>
            <td>{entry.goalReps ?? '-'}</td>
            <td>{entry.actualReps ?? '-'}</td>
            <td>
              {entry.goalDistance != null && entry.actualDistance != null
              ? `${calculateResult(entry.goalDistance, entry.actualDistance, 'km')}\n${calculateResult(entry.goalReps, entry.actualReps, 'reps')}`
              : entry.weekId < currentWeekId
                ? 'MIA'
                : 'Pending'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

    </div>
  </>
) : null}


    </div>
  );
};

export default Dashboard;


