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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
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
  const [currentSlide, setCurrentSlide] = useState(0);
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => setCurrentSlide((prev) => Math.min(prev + 1, 2)),
    onSwipedRight: () => setCurrentSlide((prev) => Math.max(prev - 1, 0)),
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [userId, setUserId] = useState(null);
  const [goalDistance, setGoalDistance] = useState('');
  const [actualDistance, setActualDistance] = useState('');
  const [goalReps, setGoalReps] = useState('');
  const [actualReps, setActualReps] = useState('');
  const [message, setMessage] = useState('');
  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasSubmittedGoal, setHasSubmittedGoal] = useState(false);
  const [showGoalConfirm, setShowGoalConfirm] = useState(false);
  const [selectedRange, setSelectedRange] = useState('90d');
  const [isAdmin, setIsAdmin] = useState(false);
  const [team, setTeam] = useState(null);
  const [teamStats, setTeamStats] = useState([]);

  const currentWeekId = getCurrentWeekId();
  const isFirstTimeUser = weeklyEntries.length === 0;

  useEffect(() => {
    const doAuth = async () => {
      await signInAnonymously(auth);
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUserId(user.uid);
          const adminDoc = await getDoc(doc(db, 'admins', user.uid));
          if (adminDoc.exists()) setIsAdmin(true);
        }
      });
    };
    doAuth();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances`));
    const unsub = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map((doc) => {
        const data = doc.data();
        const totalPoints = (data.actualDistance || 0) + (data.actualReps || 0) / 20;
        return { id: doc.id, ...data, totalPoints };
      });
      setWeeklyEntries(entries);
      setLoading(false);
      setHasSubmittedGoal(entries.some(e => e.weekId === currentWeekId && e.goalDistance));
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    const fetchTeam = async () => {
      const snapshot = await getDocs(collection(db, 'teams'));
      const found = snapshot.docs.find(doc => (doc.data().members || []).includes(userId));
      if (found) setTeam({ id: found.id, ...found.data() });
    };
    if (userId) fetchTeam();
  }, [userId]);

  useEffect(() => {
    const fetchStats = async () => {
      const currentWeek = getWeekId(new Date());
      const stats = [];
      for (const memberId of team?.members || []) {
        const userSnap = await getDoc(doc(db, 'user_names', memberId));
        const name = userSnap.exists() ? userSnap.data().name : 'Unknown';
        const isBlocked = userSnap.data()?.isBlocked;
        const entrySnap = await getDoc(doc(db, `artifacts/default-fitness-app/users/${memberId}/weekly_distances/${currentWeek}`));
        const entry = entrySnap.data() || {};
        stats.push({ memberId, name, isBlocked, weekId: currentWeek, ...entry });
      }
      setTeamStats(stats);
    };
    if (team) fetchStats();
  }, [team]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const weekId = getWeekId(new Date());
    const ref = doc(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances/${weekId}`);
    const data = hasSubmittedGoal
      ? { actualDistance: +actualDistance, actualReps: +actualReps, timestamp: serverTimestamp() }
      : { goalDistance: +goalDistance, goalReps: +goalReps, timestamp: serverTimestamp(), weekId };
    await setDoc(ref, data, { merge: true });
    setGoalDistance(''); setGoalReps(''); setActualDistance(''); setActualReps('');
  };

  const calculateResult = useCallback((goal, actual, unit) => {
    const diff = actual - goal;
    return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} ${unit}`;
  }, []);

  const getFullWeekRange = (entries) => {
    if (!entries.length) return [];
    const parse = id => { const [y, w] = id.split('-W'); return { y: +y, w: +w }; };
    const all = [...entries].sort((a,b) => a.weekId.localeCompare(b.weekId));
    const start = parse(all[0].weekId), end = parse(all[all.length - 1].weekId);
    const list = [];
    for (let y = start.y; y <= end.y; y++) {
      const ws = y === start.y ? start.w : 1, we = y === end.y ? end.w : 53;
      for (let w = ws; w <= we; w++) {
        const id = `${y}-W${String(w).padStart(2, '0')}`;
        const found = entries.find(e => e.weekId === id);
        list.push(found || { id, weekId: id, missing: true });
      }
    }
    return list;
  };

  const calculateDateFromRange = (range) => {
    const now = new Date();
    now.setDate(now.getDate() - ({ '30d': 30, '90d': 90, '1y': 365, all: 10000 }[range] || 90));
    return now;
  };

  const filteredData = weeklyEntries.filter(e => e.timestamp?.toDate?.() >= calculateDateFromRange(selectedRange))
    .map(e => ({ name: e.weekId, points: e.totalPoints }));

  const renderFormAndHistory = () => (
    <>
      <h1 className="dashboard-title">WEEKLY FITNESS DASHBOARD</h1>
      <form className="dashboard-form" onSubmit={(e) => {
        e.preventDefault();
        if (!hasSubmittedGoal) setShowGoalConfirm(true);
        else handleSubmit(e);
      }}>
        {!hasSubmittedGoal ? (
          <>
            <input type="number" placeholder="Goal Distance" value={goalDistance} onChange={(e) => setGoalDistance(e.target.value)} required />
            <input type="number" placeholder="Goal Reps" value={goalReps} onChange={(e) => setGoalReps(e.target.value)} required />
          </>
        ) : (
          <>
            <input type="number" placeholder="Actual Distance" value={actualDistance} onChange={(e) => setActualDistance(e.target.value)} required />
            <input type="number" placeholder="Actual Reps" value={actualReps} onChange={(e) => setActualReps(e.target.value)} required />
          </>
        )}
        <button
          type="submit"
          disabled={(!hasSubmittedGoal && (!goalDistance || !goalReps)) || (hasSubmittedGoal && (!actualDistance || !actualReps))}
        >
          SUBMIT
        </button>
      </form>
      {showGoalConfirm && (
        <div className="popup-overlay">
          <div className="popup-box">
            <p>Once submitted, you can’t change your goal. Proceed?</p>
            <div className="popup-buttons">
              <button className="mission-button" onClick={() => { setShowGoalConfirm(false); handleSubmit(new Event('submit')); }}>Yes, Submit</button>
              <button className="mission-button" onClick={() => setShowGoalConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {!loading && !isFirstTimeUser && (
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
                    {getFullWeekRange(weeklyEntries).reverse().map((entry, i) => (
                      <tr key={entry.id} className="fade-in-row" style={{ animationDelay: `${i * 0.1}s` }}>
                        <td>{entry.weekId}</td>
                        <td>{entry.goalDistance?.toFixed(1) ?? '-'}</td>
                        <td>{entry.actualDistance?.toFixed(1) ?? '-'}</td>
                        <td>{entry.goalReps ?? '-'}</td>
                        <td>{entry.actualReps ?? '-'}</td>
                        <td>{entry.missing ? 'MIA' : entry.goalDistance != null && entry.actualDistance != null ? `${calculateResult(entry.goalDistance, entry.actualDistance, 'km')}, ${calculateResult(entry.goalReps, entry.actualReps, 'reps')}` : entry.weekId < currentWeekId ? 'MIA' : 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );

  const renderProgressChart = () => (
    <div className="dashboard-graph-section">
      <h2 className="dashboard-section-title">Your Progress Curve</h2>
      <div className="graph-controls">
        {['30d', '90d', '1y', 'all'].map(range => (
          <button key={range} className={`graph-button ${selectedRange === range ? 'active' : ''}`} onClick={() => setSelectedRange(range)}>
            {range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : range === '1y' ? '1 Year' : 'All Time'}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={filteredData}>
          <XAxis dataKey="name" /><YAxis /><Tooltip />
          <Area type="monotone" dataKey="points" stroke="#00FF00" fill="#00FF00" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const renderTeamTable = () => (
    team && teamStats.length > 0 && (
      <>
        <h2 className="dashboard-section-title">Your Team {team.name}</h2>
        <div className="scroll-hidden fade-in-table" style={{ maxHeight: '300px', overflowY: 'scroll' }}>
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
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
              <table className="dashboard-table">
                <tbody>
                  {teamStats.filter(m => m.memberId !== userId).map((member, i) => {
                    const isMIA = member.goalDistance && (member.actualDistance == null || member.actualReps == null);
                    const isPending = !member.goalDistance;
                    const result = !isPending && !isMIA
                      ? `${calculateResult(member.goalDistance, member.actualDistance, 'km')}, ${calculateResult(member.goalReps, member.actualReps, 'reps')}`
                      : member.weekId < getWeekId(new Date()) ? 'MIA' : 'Pending';
                    return (
                      <tr key={member.memberId} className="fade-in-row" style={{ animationDelay: `${i * 0.1}s` }} onClick={() => setSelectedUserId(member.memberId)}>
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
    )
  );

  return (
    <div className="dashboard-screen">
      <div className="community-button-container">
        <button className="admin-button" onClick={() => setView('community')}>Community</button>
      </div>
      {isAdmin && (
        <div className="admin-button-container">
          <button className="admin-button" onClick={() => setView('admin')}>Admin Dashboard</button>
        </div>
      )}
      {isMobile ? (
        <div {...swipeHandlers} className="dashboard-carousel">
          <div className="dashboard-slide-container" style={{ transform: `translateX(-${currentSlide * 100          }%)` }}>
            <div className="dashboard-slide">{renderFormAndHistory()}</div>
            <div className="dashboard-slide">{renderProgressChart()}</div>
            <div className="dashboard-slide">{renderTeamTable()}</div>
          </div>
        </div>
      ) : (
        <>
          {renderFormAndHistory()}
          {renderProgressChart()}
          {renderTeamTable()}
        </>
      )}
    </div>
  );
};

export default Dashboard;