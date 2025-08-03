import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc, collection, getDocs, query, onSnapshot } from 'firebase/firestore';
import { getWeekId } from './Dashboard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const UserProfile = ({ userId, onBack }) => {
  const db = getFirestore();
  const [userName, setUserName] = useState('');
  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [team, setTeam] = useState(null);
  const [selectedRange, setSelectedRange] = useState('90d');
  const currentWeekId = getWeekId(new Date());

  const calculateResult = (goal, actual, unit = 'km') => {
  const diff = actual - goal;
  return diff >= 0 ? `+${diff.toFixed(2)} ${unit}` : `${diff.toFixed(2)} ${unit}`;
};


  useEffect(() => {
    const fetchUserData = async () => {
      const nameDoc = await getDoc(doc(db, 'user_names', userId));
      if (nameDoc.exists()) {
        setUserName(nameDoc.data().name);
      }
    };

    const fetchTeam = async () => {
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const userTeam = teamsSnapshot.docs.find(doc => (doc.data().members || []).includes(userId));
      if (userTeam) {
        setTeam({ id: userTeam.id, ...userTeam.data() });
      }
    };

    fetchUserData();
    fetchTeam();
  }, [userId]);

  useEffect(() => {
    const q = query(collection(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map(doc => {
        const data = doc.data();
        const totalPoints = (data.actualDistance || 0) + ((data.actualReps || 0) / 20);
        return {
          id: doc.id,
          ...data,
          totalPoints,
        };
      });
      setWeeklyEntries(entries);
    });
    return () => unsubscribe();
  }, [userId]);

  const getFullWeekRange = (entries) => {
    if (entries.length === 0) return [];
    const parseWeekId = (weekId) => {
      const [year, week] = weekId.split('-W').map(Number);
      return { year, week };
    };
    const toComparable = ({ year, week }) => year * 100 + week;
    const sorted = [...entries].sort((a, b) => toComparable(parseWeekId(a.weekId)) - toComparable(parseWeekId(b.weekId)));
    const { year: startYear, week: startWeek } = parseWeekId(sorted[0].weekId);
    const { year: endYear, week: endWeek } = parseWeekId(sorted[sorted.length - 1].weekId);

    const result = [];
    for (let y = startYear; y <= endYear; y++) {
      const start = y === startYear ? startWeek : 1;
      const end = y === endYear ? endWeek : 53;
      for (let w = start; w <= end; w++) {
        const weekStr = `${y}-W${w.toString().padStart(2, '0')}`;
        const found = entries.find((e) => e.weekId === weekStr);
        result.push(found || { id: weekStr, weekId: weekStr, missing: true });
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
      'all': 10000,
    }[range] || 90;
    return new Date(now.setDate(now.getDate() - days));
  };

  const filteredData = weeklyEntries.filter(entry => {
    const entryDate = entry.timestamp?.toDate?.();
    return entryDate && entryDate >= calculateDateFromRange(selectedRange);
  }).map(entry => ({
    name: entry.weekId,
    points: entry.totalPoints,
  }));

  return (
    <div className="dashboard-screen">
      <div className="admin-back-button-container">
        <button className="admin-button" onClick={onBack}>← Back</button>
      </div>
      <h1 className="dashboard-title">{userName}'s Profile</h1>

      <h2 className="dashboard-section-title">Weekly History</h2>
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
                {getFullWeekRange([...weeklyEntries]).reverse().map((entry, index) => (
                    <tr key={entry.id} className="fade-in-row" style={{ animationDelay: `${index * 0.1}s` }}>
                        <td>{entry.weekId}</td>
                        <td>{entry.goalDistance?.toFixed(1) ?? '-'}</td>
                        <td>{entry.actualDistance?.toFixed(1) ?? '-'}</td>
                        <td>{entry.goalReps ?? '-'}</td>
                        <td>{entry.actualReps ?? '-'}</td>
                        <td>
                            {entry.missing
                            ? 'MIA'
                            : entry.goalDistance != null && entry.actualDistance != null
                                ? `${calculateResult(entry.goalDistance, entry.actualDistance, 'km')}, ${calculateResult(entry.goalReps, entry.actualReps, 'reps')}`
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
        <h2 className="dashboard-section-title">Progress Curve</h2>
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
              <XAxis dataKey="name" />
              <YAxis />
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

      {team && (
        <div style={{ marginTop: '2rem' }}>
          <h2 className="dashboard-section-title">Team: {team.name}</h2>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
