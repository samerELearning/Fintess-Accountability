import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { getWeekId } from './Dashboard';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TeamProfile = ({ teamId, onBack, setSelectedUserId }) => {
  const db = getFirestore();
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [weeklyEntries, setWeeklyEntries] = useState([]);
  const [selectedRange, setSelectedRange] = useState('90d');
  const [searchName, setSearchName] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(true);

  useEffect(() => {
    const fetchTeamData = async () => {
      const teamSnap = await getDoc(doc(db, 'teams', teamId));
      if (!teamSnap.exists()) return;

      const data = teamSnap.data();
      setTeam({ id: teamSnap.id, ...data });

      const memberData = [];
      const allEntries = [];
      for (const userId of data.members || []) {
        const userSnap = await getDoc(doc(db, 'user_names', userId));
        const name = userSnap.exists() ? userSnap.data().name : 'Unknown';
        const joinedAt = userSnap.exists() ? userSnap.data().joinedAt : null;
        memberData.push({ userId, name, joinedAt });

        const weeklyRef = collection(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances`);
        const snapshot = await getDocs(weeklyRef);
        snapshot.forEach(doc => {
          const d = doc.data();
          const points = (d.actualDistance || 0) + ((d.actualReps || 0) / 20);
          const weekId = doc.id;
          allEntries.push({ weekId, totalPoints: points });
        });
      }
      setMembers(memberData);
      setWeeklyEntries(allEntries);
      setLoadingMembers(false);
    };
    fetchTeamData();
  }, [db, teamId]);

  const getCurrentWeek = getWeekId(new Date());

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

  const aggregateByWeek = (entries) => {
  const weekMap = {};
  for (const e of entries) {
    if (!weekMap[e.weekId]) {
      weekMap[e.weekId] = { weekId: e.weekId, total: 0, count: 0 };
    }
    weekMap[e.weekId].total += e.totalPoints;
    weekMap[e.weekId].count++;
  }

  return Object.values(weekMap)
    .map(({ weekId, total, count }) => ({
      name: weekId,
      points: count ? parseFloat((total / count).toFixed(1)) : 0,
    }))
    .sort((a, b) => {
      const [ay, aw] = a.name.split('-W').map(Number);
      const [by, bw] = b.name.split('-W').map(Number);
      return ay !== by ? ay - by : aw - bw;
    });
};

  return (
    <div className="dashboard-screen">
      <div className="admin-back-button-container">
        <button className="admin-button" onClick={onBack}>← Back</button>
      </div>
      <h1 className="dashboard-title">{team?.name} Team Profile</h1>

      <h2 className="dashboard-section-title">Team Members</h2>
      <div className="admin-filters">
        <input
          type="text"
          placeholder="Search by name"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value.toLowerCase())}
        />
      </div>

      {loadingMembers ? (
        <p className="dashboard-message">Loading team members...</p>
      ) : (
        <div className="scroll-hidden fade-in-table" style={{ maxHeight: '300px', overflowY: 'scroll' }}>
          <div className="dashboard-table-wrapper">
            <table className="dashboard-table header">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Joined</th>
                </tr>
              </thead>
            </table>
            <div className="dashboard-table-body scroll-hidden">
              <table className="dashboard-table">
                <tbody>
                  {members.filter((m) => m.name.toLowerCase().includes(searchName)).map((member, index) => (
                    <tr
                      key={member.userId}
                      className="fade-in-row"
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onClick={() => setSelectedUserId && setSelectedUserId(member.userId)}
                    >
                      <td>{member.name}</td>
                      <td>{member.joinedAt?.toDate?.().toLocaleDateString() ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-graph-section">
        <h2 className="dashboard-section-title">Team Progress Curve</h2>
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
            <AreaChart data={aggregateByWeek(weeklyEntries).filter(entry => {
              const [year, week] = entry.name.split('-W').map(Number);
              const [cy, cw] = getCurrentWeek.split('-W').map(Number);
              const diff = (cy - year) * 52 + (cw - week);
              if (selectedRange === '30d') return diff <= 4;
              if (selectedRange === '90d') return diff <= 12;
              if (selectedRange === '1y') return diff <= 52;
              return true;
            })}>
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
    </div>
  );
};

export default TeamProfile;

