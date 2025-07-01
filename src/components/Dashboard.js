import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, onSnapshot, serverTimestamp } from 'firebase/firestore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAP2uPwMnQ-21qISA4GUT_JTGCA6Nw86Qc",
  authDomain: "fitnessaccountability-caa33.firebaseapp.com",
  projectId: "fitnessaccountability-caa33",
  storageBucket: "fitnessaccountability-caa33.firebasestorage.app",
  messagingSenderId: "222742620710",
  appId: "1:222742620710:web:384e3e5e0480ba37a614e7",
  measurementId: "G-YFGSVSMHWM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

const getWeekId = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return d.getFullYear() + '-W' + String(1 + Math.ceil(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)).padStart(2, '0');
};

const Dashboard = () => {
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [appId, setAppId] = useState('');

  const [goalDistance, setGoalDistance] = useState('');
  const [actualDistance, setActualDistance] = useState('');
  const [message, setMessage] = useState('');
  const [currentUserWeeklyEntries, setCurrentUserWeeklyEntries] = useState([]);
  const [allUsersWeeklyEntries, setAllUsersWeeklyEntries] = useState([]);

  useEffect(() => {
    try {
      const currentAppId = 'default-fitness-app';
      setAppId(currentAppId);

      const signIn = async () => {
        try {
          await signInAnonymously(auth);


        } catch (error) {
          setMessage(`Authentication failed: ${error.message}`);
        }
      };

      signIn();

      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          setUserId(user.uid);
          setIsAuthReady(true);
        } else {
          setUserId(null);
          setIsAuthReady(true);
        }
      });

      return () => unsubscribeAuth();
    } catch (error) {
      setMessage(`Firebase initialization error: ${error.message}`);
    }
  }, []);

  useEffect(() => {
    if (!db || !userId || !isAuthReady || !appId) return;
    const userEntriesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/weekly_distances`);
    const q = query(userEntriesCollectionRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCurrentUserWeeklyEntries(entries.sort((a, b) => a.weekId.localeCompare(b.weekId)));
    }, (error) => {
      setMessage(`Error loading your data: ${error.message}`);
    });
    return () => unsubscribe();
  }, [db, userId, isAuthReady, appId]);

  useEffect(() => {
    if (!db || !isAuthReady || !appId || !auth || !auth.currentUser) return;
    const allEntriesCollectionRef = collection(db, `artifacts/${appId}/public/data/all_weekly_entries`);
    const q = query(allEntriesCollectionRef);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsersWeeklyEntries(entries);
    }, (error) => {
      setMessage(`Error loading global data: ${error.message}`);
    });
    return () => unsubscribe();
  }, [db, isAuthReady, appId, auth]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!db || !userId || !isAuthReady) {
      setMessage('System not ready. Please wait for authentication.');
      return;
    }

    const goal = parseFloat(goalDistance);
    const actual = parseFloat(actualDistance);

    if (isNaN(goal) || isNaN(actual) || goal < 0 || actual < 0) {
      setMessage('Please enter valid positive numbers for distances.');
      return;
    }

    const currentWeekId = getWeekId(new Date());
    const entryData = {
      weekId: currentWeekId,
      goalDistance: goal,
      actualDistance: actual,
      timestamp: serverTimestamp(),
    };

    try {
      const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/weekly_distances`, currentWeekId);
      await setDoc(userDocRef, entryData, { merge: true });
      const publicDocRef = doc(db, `artifacts/${appId}/public/data/all_weekly_entries`, `${userId}_${currentWeekId}`);
      await setDoc(publicDocRef, { ...entryData, userId: userId }, { merge: true });
      setMessage('Weekly distance saved successfully!');
      setGoalDistance('');
      setActualDistance('');
    } catch (error) {
      setMessage(`Failed to save data: ${error.message}`);
    }
  };

  const calculateWeeklyResult = useCallback((goal, actual) => {
    const result = actual - goal;
    return result > 0 ? `+${result.toFixed(2)} km surplus` : `${result.toFixed(2)} km deficit`;
  }, []);

  const individualChartData = currentUserWeeklyEntries.map(entry => ({
    week: entry.weekId,
    goal: entry.goalDistance,
    actual: entry.actualDistance,
  }));

  const globalChartData = Object.values(
    allUsersWeeklyEntries.reduce((acc, entry) => {
      if (!acc[entry.weekId]) {
        acc[entry.weekId] = { week: entry.weekId, goal: 0, actual: 0 };
      }
      acc[entry.weekId].goal += entry.goalDistance || 0;
      acc[entry.weekId].actual += entry.actualDistance || 0;
      return acc;
    }, {})
  ).sort((a, b) => a.week.localeCompare(b.week));

  const { globalTotalGoal, globalTotalActual, globalSurplusDeficit } = React.useMemo(() => {
    const totalGoal = allUsersWeeklyEntries.reduce((sum, entry) => sum + (entry.goalDistance || 0), 0);
    const totalActual = allUsersWeeklyEntries.reduce((sum, entry) => sum + (entry.actualDistance || 0), 0);
    const surplusDeficit = totalActual - totalGoal;
    return { globalTotalGoal: totalGoal, globalTotalActual: totalActual, globalSurplusDeficit: surplusDeficit };
  }, [allUsersWeeklyEntries]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black border border-[#00ff00] p-2 text-sm rounded-md shadow-lg">
          <p className="font-bold text-[#00ff00]">{`Week: ${label}`}</p>
          {payload.map((p, index) => (
            <p key={index} style={{ color: p.color }}>
              {`${p.name}: ${p.value.toFixed(1)} km`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="text-[#00ff00] font-mono px-4 sm:px-8 py-6">
      <h2 className="text-3xl font-bold mb-6 text-center">Fitness Command Center</h2>
      {message && <div className="mb-4 border border-[#00ff00] p-2 rounded-md text-center">{message}</div>}

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="goalDistance" className="block mb-1">Weekly Goal (km)</label>
            <input type="number" id="goalDistance" value={goalDistance} onChange={(e) => setGoalDistance(e.target.value)}
              className="w-full p-2 bg-black border border-[#00ff00] rounded text-[#00ff00]" required min="0" step="0.1" />
          </div>
          <div>
            <label htmlFor="actualDistance" className="block mb-1">Actual Distance (km)</label>
            <input type="number" id="actualDistance" value={actualDistance} onChange={(e) => setActualDistance(e.target.value)}
              className="w-full p-2 bg-black border border-[#00ff00] rounded text-[#00ff00]" required min="0" step="0.1" />
          </div>
        </div>
        <button type="submit"
          className="mt-4 w-full py-2 bg-black border-2 border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00] hover:text-black font-bold rounded">
          Save Weekly Data
        </button>
      </form>

      <h3 className="text-xl font-semibold mb-2">Your Weekly History</h3>
      {currentUserWeeklyEntries.length === 0 ? (
        <p className="opacity-70">No entries yet.</p>
      ) : (
        <table className="w-full mb-6 text-sm">
          <thead>
            <tr className="border-b border-[#00ff00]">
              <th className="py-1 px-2 text-left">Week</th>
              <th className="py-1 px-2 text-left">Goal</th>
              <th className="py-1 px-2 text-left">Actual</th>
              <th className="py-1 px-2 text-left">Result</th>
            </tr>
          </thead>
          <tbody>
            {currentUserWeeklyEntries.map((entry) => (
              <tr key={entry.id} className="border-b border-[#00ff00] border-opacity-30">
                <td className="py-1 px-2">{entry.weekId}</td>
                <td className="py-1 px-2">{entry.goalDistance.toFixed(1)}</td>
                <td className="py-1 px-2">{entry.actualDistance.toFixed(1)}</td>
                <td className="py-1 px-2">{calculateWeeklyResult(entry.goalDistance, entry.actualDistance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 className="text-xl font-semibold mb-2">Your Weekly Progress</h3>
      <div className="h-64 mb-8 border border-[#00ff00] p-2 rounded">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={individualChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#004400" />
            <XAxis dataKey="week" stroke="#00ff00" tick={{ fill: '#00ff00', fontSize: 10 }} />
            <YAxis stroke="#00ff00" tick={{ fill: '#00ff00', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#00ff00', fontSize: '12px' }} />
            <Line type="monotone" dataKey="goal" stroke="#00ff00" activeDot={{ r: 6 }} name="Goal (km)" />
            <Line type="monotone" dataKey="actual" stroke="#00cc00" activeDot={{ r: 6 }} name="Actual (km)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <h3 className="text-xl font-semibold mb-2">Global Community Stats</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mb-6">
        <div className="border border-[#00ff00] p-4 rounded">
          <p className="font-semibold">Total Goal (km)</p>
          <p className="text-2xl font-bold">{globalTotalGoal.toFixed(1)}</p>
        </div>
        <div className="border border-[#00ff00] p-4 rounded">
          <p className="font-semibold">Total Actual (km)</p>
          <p className="text-2xl font-bold">{globalTotalActual.toFixed(1)}</p>
        </div>
        <div className="border border-[#00ff00] p-4 rounded">
          <p className="font-semibold">Global Result</p>
          <p className="text-2xl font-bold">
            {globalSurplusDeficit > 0 ? `+${globalSurplusDeficit.toFixed(1)}` : globalSurplusDeficit.toFixed(1)} km
          </p>
        </div>
      </div>

      <h3 className="text-xl font-semibold mb-2">Global Weekly Progress</h3>
      <div className="h-64 border border-[#00ff00] p-2 rounded">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={globalChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#004400" />
            <XAxis dataKey="week" stroke="#00ff00" tick={{ fill: '#00ff00', fontSize: 10 }} />
            <YAxis stroke="#00ff00" tick={{ fill: '#00ff00', fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#00ff00', fontSize: '12px' }} />
            <Line type="monotone" dataKey="goal" stroke="#00ff00" activeDot={{ r: 6 }} name="Global Goal (km)" />
            <Line type="monotone" dataKey="actual" stroke="#00cc00" activeDot={{ r: 6 }} name="Global Actual (km)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;

