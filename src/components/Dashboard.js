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

const Dashboard = () => {
  const [userId, setUserId] = useState(null);
  const [goalDistance, setGoalDistance] = useState('');
  const [actualDistance, setActualDistance] = useState('');
  const [goalReps, setGoalReps] = useState('');
  const [actualReps, setActualReps] = useState('');
  const [message, setMessage] = useState('');
  const [weeklyEntries, setWeeklyEntries] = useState([]);
 


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
    });
    return () => unsubscribe();
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const goal = parseFloat(goalDistance);
    const actual = parseFloat(actualDistance);
    const repsGoal = parseInt(goalReps);
    const repsActual = parseInt(actualReps);

    if (isNaN(goal) || isNaN(actual) || isNaN(repsGoal) || isNaN(repsActual)) return;

    const weekId = getWeekId(new Date());
    const entry = {
      weekId,
      goalDistance: goal,
      actualDistance: actual,
      goalReps: repsGoal,
      actualReps: repsActual,
      timestamp: serverTimestamp(),
    };

    await setDoc(
      doc(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances`, weekId),
      entry,
      { merge: true }
    );

    setMessage('Entry saved successfully!');
    setGoalDistance('');
    setActualDistance('');
    setGoalReps('');
    setActualReps('');
  };

  const calculateResult = useCallback((goal, actual, unit = 'km') => {
    const diff = actual - goal;
    return diff >= 0 ? `+${diff.toFixed(2)} ${unit}` : `${diff.toFixed(2)} ${unit}`;
  }, []);

  return (
    <div className="dashboard-screen">
      <h1 className="dashboard-title">WEEKLY FITNESS DASHBOARD</h1>
      
      <form className="dashboard-form" onSubmit={handleSubmit}>
        <input
          type="number"
          placeholder="Goal Distance (km)"
          value={goalDistance}
          onChange={(e) => setGoalDistance(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Actual Distance (km)"
          value={actualDistance}
          onChange={(e) => setActualDistance(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Goal Reps"
          value={goalReps}
          onChange={(e) => setGoalReps(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Actual Reps"
          value={actualReps}
          onChange={(e) => setActualReps(e.target.value)}
          required
        />

        <button type="submit" disabled={
                !goalDistance || !actualDistance || !goalReps || !actualReps}>
                SUBMIT
        </button>

      </form>
      <h2 className="dashboard-section-title">Your Weekly History</h2>
      <div className="scroll-hidden" style={{ maxHeight: '300px', overflowY: 'scroll' }}>
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
          <tbody>
            {weeklyEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.weekId}</td>
                <td>{entry.goalDistance?.toFixed(1) ?? '-'}</td>
                <td>{entry.actualDistance?.toFixed(1) ?? '-'}</td>
                <td>{entry.goalReps ?? '-'}</td>
                <td>{entry.actualReps ?? '-'}</td>
                <td>
                  {entry.goalDistance != null && entry.actualDistance != null
                    ? calculateResult(entry.goalDistance, entry.actualDistance, 'km') + '\n' +
                      calculateResult(entry.goalReps, entry.actualReps, 'reps')
                    : 'MIA'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
</div>

    </div>
  );
};

export default Dashboard;


