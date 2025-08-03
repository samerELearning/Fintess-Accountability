import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getWeekId } from './Dashboard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';





const CommunityPage = ({ setView, setSelectedUserId, setSelectedTeamId }) => {

    const [users, setUsers] = useState([]);
    const db = getFirestore();
    const [searchName, setSearchName] = useState('');
    const [miaFilter, setMiaFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [joinedDateFilter, setJoinedDateFilter] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [globalProgress, setGlobalProgress] = useState([]);
    const [selectedRange, setSelectedRange] = useState('30d');
    const [summary, setSummary] = useState(null);
    const [teams, setTeams] = useState([]);





    useEffect(() => {
        const calculateGlobalProgress = async () => {
            const userDocs = await getDocs(collection(db, 'user_names'));
            const weekStats = {}; // ✅ now defined

            for (const userDoc of userDocs.docs) {
            const userId = userDoc.id;
            const weeklyRef = collection(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances`);
            const weeklySnapshot = await getDocs(weeklyRef);

            weeklySnapshot.forEach(doc => {
                const data = doc.data();
                const weekId = doc.id;

                if (data.actualDistance != null || data.actualReps != null) {
                const points = (data.actualDistance || 0) + (data.actualReps || 0) / 20;

                if (!weekStats[weekId]) {
                    weekStats[weekId] = { totalPoints: 0, count: 0 };
                }

                weekStats[weekId].totalPoints += points;
                weekStats[weekId].count += 1;
                }
            });
            }

            const progressArray = Object.entries(weekStats)
            .map(([weekId, { totalPoints, count }]) => ({
                weekId,
                points: count > 0 ? parseFloat((totalPoints / count).toFixed(1)) : 0,
            }))
            .sort((a, b) => {
                const aNum = parseInt(a.weekId.split('-')[1]);
                const bNum = parseInt(b.weekId.split('-')[1]);
                return aNum - bNum;
            });

            setGlobalProgress(progressArray);
        };

        calculateGlobalProgress();
        }, [db]);



    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingUsers(true);
            const userDocs = await getDocs(collection(db, 'user_names'));
            const usersData = [];

            for (const userDoc of userDocs.docs) {
            const userId = userDoc.id;
            const { name, joinedAt, isBlocked = false } = userDoc.data();
            const weeklySnapshot = await getDocs(
                collection(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances`)
            );

            const currentWeekId = getWeekId(new Date());
            let miaCount = 0;

            weeklySnapshot.forEach(doc => {
                const data = doc.data();
                if (
                data.goalDistance &&
                (data.actualDistance == null || data.actualReps == null) &&
                doc.id < currentWeekId
                ) {
                miaCount++;
                }
            });

            usersData.push({ userId, name, joinedAt, miaCount, isBlocked });
            }

            setUsers(usersData);
            setLoadingUsers(false);
        };

        fetchUsers();
        }, []);

        useEffect(() => {
            const calculateWeeklySummary = async () => {
                const userDocs = await getDocs(collection(db, 'user_names'));
                const currentWeekId = getWeekId(new Date());
                const [year, week] = currentWeekId.split('-W').map(Number);

                const previousWeekId = week > 1
                ? `${year}-W${String(week - 1).padStart(2, '0')}`
                : `${year - 1}-W52`;

                let totalGoalDistance = 0;
                let totalGoalReps = 0;
                let totalActualDistance = 0;
                let totalActualReps = 0;
                let miaCount = 0;

                for (const userDoc of userDocs.docs) {
                const userId = userDoc.id; // ✅ declared here

                const weekDocRef = doc(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances/${previousWeekId}`);
                const weekSnap = await getDoc(weekDocRef);

                if (weekSnap.exists()) {
                    const data = weekSnap.data();
                    const hadGoal = data.goalDistance || data.goalReps;
                    const hadNoActuals = data.actualDistance == null && data.actualReps == null;

                    if (hadGoal) {
                    totalGoalDistance += data.goalDistance || 0;
                    totalGoalReps += data.goalReps || 0;
                    }

                    if (hadGoal && hadNoActuals) {
                    miaCount++;
                    }

                    totalActualDistance += data.actualDistance || 0;
                    totalActualReps += data.actualReps || 0;
                } else {
                    miaCount++;
                }
                }

                const totalGoalPoints = totalGoalDistance + totalGoalReps / 20;
                const totalActualPoints = totalActualDistance + totalActualReps / 20;
                const resultPercentage = totalGoalPoints > 0
                ? ((totalActualPoints - totalGoalPoints) / totalGoalPoints) * 100
                : 0;

                const status = resultPercentage >= 0 ? 'Surplus' : 'Deficiency';

                setSummary({
                previousWeekId,
                totalGoalPoints,
                totalActualPoints,
                resultPercentage,
                status,
                miaCount
                });
            };

            calculateWeeklySummary();
            }, []);



        const getDaysAgo = (days) => {
        const now = new Date();
        now.setDate(now.getDate() - days);
        return now;
        };

        const currentWeek = getWeekId(new Date());

        const filteredData = globalProgress.filter((entry) => {
        const [year, week] = entry.weekId.split('-W').map(Number);

        const getWeekDifference = (current, past) => {
            return (current.year - past.year) * 52 + (current.week - past.week);
        };

        const currentSplit = currentWeek.split('-W').map(Number);
        const diff = getWeekDifference(
            { year: currentSplit[0], week: currentSplit[1] },
            { year, week }
        );

        if (selectedRange === '30d') return diff <= 4;
        if (selectedRange === '90d') return diff <= 12;
        if (selectedRange === '1y') return diff <= 52;
        return true; // all
        });

        useEffect(() => {
            const fetchTeams = async () => {
                const snapshot = await getDocs(collection(db, 'teams'));
                const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                }));
                setTeams(list);
            };
            fetchTeams();
        }, [db]);



  return (
    <div className="dashboard-screen">
        <div className="admin-back-button-container">
            <button className="admin-button" onClick={() => setView('dashboard')}>
            ← Back to Dashboard
            </button>
        </div>
        {summary && (
                    <div className="left-summary-card desktop-only">
                        <h3>Week {summary.previousWeekId.split('-W')[1]} Summary</h3>
                        <p><strong>Goal:</strong> {summary.totalGoalPoints.toFixed(1)} points</p>
                        <p><strong>Actual:</strong> {summary.totalActualPoints.toFixed(1)} points</p>
                        <p><strong>{summary.status}:</strong> {Math.abs(summary.resultPercentage).toFixed(1)}%</p>
                        <p><strong>MIA:</strong> {summary.miaCount} users</p>
                    </div>
                )}
        <h1 className="dashboard-title">GLOBAL COMMUNITY</h1>
                <div className="admin-filters">
                    <input
                        type="text"
                        placeholder="Search by name"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value.toLowerCase())}
                    />
                    <input
                        type="number"
                        placeholder="MIA count"
                        value={miaFilter}
                        onChange={(e) => setMiaFilter(e.target.value)}
                    />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">All</option>
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                    </select>
                    <input
                        type="date"
                        placeholder="Joined At"
                        value={joinedDateFilter}
                        onChange={(e) => setJoinedDateFilter(e.target.value)}
                    />
                </div>

                {loadingUsers ? (
                <p className="dashboard-message">Loading users...</p>
                ) : (
                <div className="scroll-hidden fade-in-table" style={{ maxHeight: '300px', overflowY: 'scroll' }}>
                    <div className="dashboard-table-wrapper">
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                <th>Name</th>
                                <th>Joined</th>
                                <th>MIA Count</th>
                                <th>Status</th>
                                </tr>
                            </thead>
                        </table>

                        <div className="dashboard-table-body scroll-hidden">
                            <table className="dashboard-table">
                                <tbody>
                                {users
                                .filter((user) => {
                                    const matchName = searchName === '' || user.name.toLowerCase().includes(searchName);
                                    const matchMIA = miaFilter === '' || user.miaCount === parseInt(miaFilter);
                                    const matchStatus =
                                    statusFilter === '' ||
                                    (statusFilter === 'active' && !user.isBlocked) ||
                                    (statusFilter === 'blocked' && user.isBlocked);
                                    const matchDate =
                                    joinedDateFilter === '' ||
                                    user.joinedAt?.toDate().toISOString().split('T')[0] === joinedDateFilter;

                                    return matchName && matchMIA && matchStatus && matchDate;
                                })
                                .map((user, index) => (

                                    <tr
                                        key={user.userId}
                                        className="fade-in-row"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                        onClick={() => setSelectedUserId(user.userId)}
                                        >
                                        <td>{user.name}</td>
                                        <td>{user.joinedAt?.toDate().toLocaleDateString() ?? '-'}</td>
                                        <td>{user.miaCount}</td>
                                        <td>{user.isBlocked ? 'Blocked' : 'Active'}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                )}

                <div className="dashboard-graph-section">
                    <h2 className="dashboard-section-title">GLOBAL PROGRESS CURVE</h2>
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
                            <XAxis dataKey="weekId" />
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

                <h2 className="dashboard-section-title">All Teams</h2>
                <div className="scroll-hidden fade-in-table" style={{ maxHeight: '300px', overflowY: 'scroll' }}>
                    <div className="dashboard-table-wrapper">
                        <table className="dashboard-table">
                            <thead>
                                <tr>
                                <th>Team Name</th>
                                <th>Members</th>
                                <th>Created At</th>
                                </tr>
                            </thead>
                        </table>

                        <div className="dashboard-table-body scroll-hidden">
                            <table className="dashboard-table">
                                <tbody>
                                {teams.map((team, index) => (
                                    <tr
                                    key={team.id}
                                    className="fade-in-row"
                                    style={{ animationDelay: `${index * 0.1}s` }}
                                    onClick={() => setSelectedTeamId(team.id)}
                                    >
                                        <td>{team.name}</td>
                                        <td>{team.members?.length ?? 0}</td>
                                        <td>{team.createdAt?.toDate?.().toLocaleDateString() ?? '-'}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                
                    {summary && (
                    <div className="left-summary-card mobile-only">
                        <h3>Week {summary.previousWeekId.split('-W')[1]} Summary</h3>
                        <p><strong>Goal:</strong> {summary.totalGoalPoints.toFixed(1)} points</p>
                        <p><strong>Actual:</strong> {summary.totalActualPoints.toFixed(1)} points</p>
                        <p><strong>{summary.status}:</strong> {Math.abs(summary.resultPercentage).toFixed(1)}%</p>
                        <p><strong>MIA:</strong> {summary.miaCount} users</p>
                    </div>
                    )}
   
</div>
 );
}

export default CommunityPage;
