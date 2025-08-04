import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  getDoc,
  getDocs,
  query,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area
} from 'recharts';
import { useSwipeable } from 'react-swipeable';



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

export const getWeekId = (date) => {
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


const Dashboard = ({ setView, setSelectedUserId }) => {

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
  const [showGoalConfirm, setShowGoalConfirm] = useState(false);
  const [selectedRange, setSelectedRange] = useState('90d');
  const [isAdmin, setIsAdmin] = useState(false);
  const [team, setTeam] = useState(null);
  const [teamStats, setTeamStats] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);




  

  useEffect(() => {
  let unsubscribe;

  const doAuthAndCheckAdmin = async () => {
    try {
      await signInAnonymously(auth);

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUserId(user.uid);
          
          const adminDocRef = doc(db, 'admins', user.uid);
          const adminDocSnap = await getDoc(adminDocRef);
          if (adminDocSnap.exists()) {
            setIsAdmin(true);
          }
        }
      });
    } catch (error) {
      console.error('Auth Error:', error);
    }
  };

  doAuthAndCheckAdmin();

  return () => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  };
}, []);

  useEffect(() => {
    if (!userId) return;

    const fetchTeam = async () => {
      try {
        const teamsSnapshot = await getDocs(collection(db, "teams"));
        const userTeam = teamsSnapshot.docs.find(doc => {
          const members = doc.data().members || [];
          return members.includes(userId);
        });

        if (userTeam) {
          setTeam({ id: userTeam.id, ...userTeam.data() });
        }
      } catch (error) {
        console.error("Error fetching team:", error);
      }
    };

    fetchTeam();
  }, [userId]);

  useEffect(() => {
  if (!team || !team.members.length) return;

  const fetchTeamStats = async () => {
    const currentWeek = getWeekId(new Date());
    const memberStats = [];

    for (const memberId of team.members) {
      const userRef = doc(db, 'user_names', memberId);
      const userSnap = await getDoc(userRef);
      const name = userSnap.exists() ? userSnap.data().name : 'Unknown';
      const isBlocked = userSnap.exists() ? userSnap.data().isBlocked : false;

      const entryRef = doc(db, `artifacts/default-fitness-app/users/${memberId}/weekly_distances`, currentWeek);
      const entrySnap = await getDoc(entryRef);
      const data = entrySnap.exists() ? entrySnap.data() : {};

      memberStats.push({
        memberId,
        name,
        isBlocked,
        goalDistance: data.goalDistance ?? null,
        actualDistance: data.actualDistance ?? null,
        goalReps: data.goalReps ?? null,
        actualReps: data.actualReps ?? null,
        weekId: currentWeek,
      });
    }

    setTeamStats(memberStats);
  };

  fetchTeamStats();
}, [team]);

  useEffect(() => {
    if (!userId) return;
    const entriesRef = collection(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances`);
    const q = query(entriesRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map((doc) => {
      const data = doc.data();
      const totalPoints = (data.actualDistance || 0) + ((data.actualReps || 0) / 20);
      return {
        id: doc.id,
        ...data,
        totalPoints,
      };
    });

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

  const getFullWeekRange = (entries) => {
  if (entries.length === 0) return [];

  const parseWeekId = (weekId) => {
    const [year, week] = weekId.split('-W').map(Number);
    return { year, week };
  };

  const toComparable = ({ year, week }) => year * 100 + week;

  const sorted = [...entries].sort((a, b) => {
    return toComparable(parseWeekId(a.weekId)) - toComparable(parseWeekId(b.weekId));
  });

  const { year: startYear, week: startWeek } = parseWeekId(sorted[0].weekId);
  const { year: endYear, week: endWeek } = parseWeekId(currentWeekId);

  const result = [];
  for (let y = startYear; y <= endYear; y++) {
    const start = y === startYear ? startWeek : 1;
    const end = y === endYear ? endWeek : 53;
    for (let w = start; w <= end; w++) {
      const weekStr = `${y}-W${w.toString().padStart(2, '0')}`;
      const found = entries.find((e) => e.weekId === weekStr);
      result.push(
        found || {
          id: weekStr,
          weekId: weekStr,
          goalDistance: null,
          actualDistance: null,
          goalReps: null,
          actualReps: null,
          missing: true, // tag it as missing
        }
      );
    }
  }

  return result;
};

  const calculateDateFromRange = (range) => {
    const now = new Date();
    const days = {
      '30d': 30,
      '90d': 90,
      '1y': 365,
      'all': 10000, // effectively all
    }[range] || 90;

    return new Date(now.setDate(now.getDate() - days));
  };

  const filteredData = weeklyEntries
  .filter(e => e.timestamp?.toDate?.() >= calculateDateFromRange(selectedRange))
  .map(e => ({ name: e.weekId, points: e.totalPoints }))
  .sort((a, b) => {
    const [ay, aw] = a.name.split('-W').map(Number);
    const [by, bw] = b.name.split('-W').map(Number);
    return ay !== by ? ay - by : aw - bw;
  });

  
  return (
    <div className="dashboard-screen">
        <div className="community-button-container">
          <button className="admin-button" onClick={() => setView('community')}>
            Community
          </button>
        </div>

      {isAdmin && (
        <div className="admin-button-container">
          <button className="admin-button" onClick={() => setView('admin')}>
            Admin Dashboard
          </button>
        </div>
      )}

      <h1 className="dashboard-title">WEEKLY FITNESS DASHBOARD</h1>
      
      <form className="dashboard-form" onSubmit={(e) => {
            e.preventDefault();
            if (!hasSubmittedGoal) {
              setShowGoalConfirm(true); // Only show confirmation popup for goal submission
            } else {
              handleSubmit(e); // Submit directly for actual inputs
            }
          }}>
        {!hasSubmittedGoal ? (
        <>
          <input
            type="number"
            placeholder="Goal Distance"
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
            placeholder="Actual Distance"
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
          {showGoalConfirm && (
          <div className="popup-overlay">
            <div className="popup-box">
              <p>
                Once submitted, you won’t be able to change your goal for the week. Are you sure you want to proceed?
              </p>
              <div className="popup-buttons">
                <button className="mission-button" onClick={() => {
                  setShowGoalConfirm(false);
                  handleSubmit(new Event('submit')); // proceed with actual submit
                }}>
                  Yes, Submit
                </button>
                <button className="mission-button" onClick={() => setShowGoalConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
 {loading ? (
  <p className="dashboard-message">Loading your data...</p>
) : !isFirstTimeUser ? (
  <>
    <h2 className="dashboard-section-title">Your Weekly History</h2>
    <div className="scroll-hidden fade-in-table" style={{ maxHeight: '300px', overflowY: 'scroll' }}>
      <div className="dashboard-table-wrapper">
        <table className="dashboard-table header">
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
              {getFullWeekRange([...weeklyEntries]).reverse().map((entry, index) => (
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
                  {entry.missing
                    ? 'MIA'
                    : entry.goalDistance != null && entry.actualDistance != null
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
    <div className="dashboard-graph-section">
      <h2 className="dashboard-section-title">Your Progress Curve</h2>
      <div className="graph-controls">
        {['30d', '90d', '1y', 'all'].map((range) => (
          <button
            key={range}
            className={`graph-button ${selectedRange === range ? 'active' : ''}`}
            onClick={() => setSelectedRange(range)}
          >
            {range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : range === '1y' ? '1 Year' : 'All Time'}
          </button>
        ))}
      </div>

      
      <div className="left-shift-chart">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={filteredData}>
            <XAxis dataKey="name" interval="preserveStartEnd" angle={-45} textAnchor="end"/>
            <YAxis
              tickFormatter={(value) => {
                if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
                if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
                return value;
              }}
              domain={[0, 'auto']}
            />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="points"
              stroke="#00FF00"
              fill="#00FF00"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  </>
) : null}

  {team && teamStats.length > 0 && (
  <>
    <h2 className="dashboard-section-title mt-10">Your Team {team?.name}</h2>

    <div className="scroll-hidden fade-in-table" style={{ maxHeight: '300px', overflowY: 'scroll' }}>
      <div className="dashboard-table-wrapper">
        <table className="dashboard-table team-table header">
          <thead>
            <tr>
              <th>Fire Body</th>
              <th>Goal (km)</th>
              <th>Actual (km)</th>
              <th>Goal Reps</th>
              <th>Actual Reps</th>
              <th>Result</th>
              <th>Status</th>
            </tr>
          </thead>
        </table>

        <div className="dashboard-table-body scroll-hidden">
          <table className="dashboard-table team-table">
            <tbody>
              {teamStats
                .filter((member) => member.memberId !== userId)
                .map((member, index) => {

                const isMIA = member.goalDistance && (member.actualDistance == null || member.actualReps == null);
                const isPending = !member.goalDistance;

                const result = !isPending && !isMIA
                  ? `${calculateResult(member.goalDistance, member.actualDistance, 'km')}, ${calculateResult(member.goalReps, member.actualReps, 'reps')}`
                  : member.weekId < getWeekId(new Date()) ? 'MIA' : 'Pending';

                return (
                  <tr
                    key={member.memberId}
                    className="fade-in-row"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    onClick={() => setSelectedUserId(member.memberId)}
                  >
                    <td>{member.name}</td>
                    <td>{member.goalDistance?.toFixed(1) ?? '-'}</td>
                    <td>{member.actualDistance?.toFixed(1) ?? '-'}</td>
                    <td>{member.goalReps ?? '-'}</td>
                    <td>{member.actualReps ?? '-'}</td>
                    <td>{result}</td>
                    <td>{member.isBlocked ? 'Blocked' : 'Active'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </>
)}


    </div>
  );
};

export default Dashboard;


