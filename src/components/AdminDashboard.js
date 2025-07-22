import React from 'react';
import { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getWeekId } from './Dashboard';


const AdminDashboard = ({ setView }) => {
    const [users, setUsers] = useState([]);
    const db = getFirestore();

    const deleteUser = async (userId) => {
    await deleteDoc(doc(db, 'user_names', userId));
    // Delete all user weekly data if needed
    setUsers(prev => prev.filter(u => u.userId !== userId));
    };

    const toggleBlockUser = async (userId, shouldBlock) => {
    await updateDoc(doc(db, 'user_names', userId), { isBlocked: shouldBlock });
    setUsers(prev =>
        prev.map(u => (u.userId === userId ? { ...u, isBlocked: shouldBlock } : u))
    );
    };


    useEffect(() => {
        const fetchUsers = async () => {
        const userDocs = await getDocs(collection(db, 'user_names'));
        const usersData = [];

        for (const userDoc of userDocs.docs) {
            const userId = userDoc.id;
            const { name, joinedAt, isBlocked = false } = userDoc.data();
            const weeklySnapshot = await getDocs(collection(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances`));
            
            const currentWeekId = getWeekId(new Date());
            let miaCount = 0;
            const weekIds = new Set();
            weeklySnapshot.forEach(doc => {
            const data = doc.data();
            weekIds.add(doc.id);

            if (
                data.goalDistance &&
                (data.actualDistance == null || data.actualReps == null) &&
                doc.id < currentWeekId
            ) {
                miaCount++;
            }
            });

            // Helper to parse and generate week ranges
            const parseWeekId = (weekId) => {
            const [year, week] = weekId.split('-W').map(Number);
            return { year, week };
            };

            const getFullWeekRange = (start, end) => {
            const weeks = [];
            let current = { ...start };
            while (current.year < end.year || (current.year === end.year && current.week <= end.week)) {
                weeks.push(`${current.year}-W${String(current.week).padStart(2, '0')}`);
                current.week++;
                if (current.week > 52) {
                current.week = 1;
                current.year++;
                }
            }
            return weeks;
            };

            // Calculate full range of weeks since user joined
            if (joinedAt) {
            const startWeek = parseWeekId(getWeekId(joinedAt.toDate()));
            const endWeek = parseWeekId(currentWeekId);
            const fullWeeks = getFullWeekRange(startWeek, endWeek);

            fullWeeks.forEach((week) => {
                if (!weekIds.has(week) && week < currentWeekId) {
                miaCount++;
                }
            });
            }


            usersData.push({ userId, name, joinedAt, miaCount, isBlocked });
        }

        setUsers(usersData);
        };

        fetchUsers();
    }, [db]);

  return (
    <div className="dashboard-screen">
        <div className="admin-back-button-container">
            <button className="admin-button" onClick={() => setView('user')}>
                ← Back to Dashboard
            </button>
        </div>

        <h1 className="dashboard-title">USER MANAGEMENT</h1>
        <div className="scroll-hidden fade-in-table" style={{ maxHeight: '300px', overflowY: 'scroll' }}>
            <div className="dashboard-table-wrapper">
                <table className="dashboard-table">
                <thead>
                    <tr>
                    <th>Name</th>
                    <th>Joined</th>
                    <th>MIA Count</th>
                    <th>Status</th>
                    <th>Actions</th>
                    </tr>
                </thead>
                </table>

                <div className="dashboard-table-body scroll-hidden">
                    <table className="dashboard-table">
                        <tbody>
                        {users.map((user, index) => (
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
                            <td>
                                <button className="admin-action-button delete" onClick={(e) => { e.stopPropagation(); deleteUser(user.userId); }}>🗑️</button>
                                <button className={`admin-action-button ${user.isBlocked ? 'unblock' : 'block'}`} onClick={(e) => { e.stopPropagation(); toggleBlockUser(user.userId, !user.isBlocked); }}>
                                {user.isBlocked ? 'Unblock' : 'Block'}
                                </button>
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    </div>
  );
};

export default AdminDashboard;
