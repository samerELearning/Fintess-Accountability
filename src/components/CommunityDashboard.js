import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getWeekId } from './Dashboard';



const CommunityPage = ({ setView }) => {

    const [users, setUsers] = useState([]);
    const db = getFirestore();
    const [searchName, setSearchName] = useState('');
    const [miaFilter, setMiaFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [joinedDateFilter, setJoinedDateFilter] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);

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


  return (
    <div className="dashboard-screen">
  <div className="admin-back-button-container">
    <button className="admin-button" onClick={() => setView('dashboard')}>
      ← Back to Dashboard
    </button>
  </div>

  <h1 className="dashboard-title">COMMUNITY</h1>
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
                                onClick={() => alert(`Open profile for ${user.name}`)}
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
</div>
 );
}

export default CommunityPage;
