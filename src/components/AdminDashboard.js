import React from 'react';
import { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { getWeekId } from './Dashboard';



const AdminDashboard = ({ setView, setSelectedUserId, setSelectedTeamId }) => {
    const [users, setUsers] = useState([]);
    const [searchName, setSearchName] = useState('');
    const [miaFilter, setMiaFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState(''); // 'active' | 'blocked' | ''
    const [joinedDateFilter, setJoinedDateFilter] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [pendingDeleteUserId, setPendingDeleteUserId] = useState(null);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [blockMessage, setBlockMessage] = useState('');
    const [pendingBlockUserId, setPendingBlockUserId] = useState(null);
    const [teams, setTeams] = useState([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [showCreateTeamPopup, setShowCreateTeamPopup] = useState(false);
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [editingTeamMembers, setEditingTeamMembers] = useState([]);
    const [showEditTeamPopup, setShowEditTeamPopup] = useState(false);
    const [showDeleteTeamConfirm, setShowDeleteTeamConfirm] = useState(false);
    const [pendingDeleteTeamId, setPendingDeleteTeamId] = useState(null);
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    const [editSearchTerm, setEditSearchTerm] = useState('');
    const [loadingUsers, setLoadingUsers] = useState(true);

    
    const db = getFirestore();

    const deleteUser = async (userId) => {
        // Delete user from 'user_names'
        await deleteDoc(doc(db, 'user_names', userId));

        // Delete all weekly entries from artifacts path
        const weeklyCollection = collection(db, `artifacts/default-fitness-app/users/${userId}/weekly_distances`);
        const weeklyDocs = await getDocs(weeklyCollection);

        const deletePromises = weeklyDocs.docs.map((doc) => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // Update local state
        setUsers(prev => prev.filter(u => u.userId !== userId));
    };


    const toggleBlockUser = async (userId, shouldBlock) => {
        await updateDoc(doc(db, 'user_names', userId), {
        isBlocked: shouldBlock,
        blockMessage: shouldBlock ? blockMessage : '', // Set message on block, clear on unblock
        });

        setUsers(prev =>
            prev.map(u => (u.userId === userId ? { ...u, isBlocked: shouldBlock } : u))
        );
    };


    useEffect(() => {
        const fetchTeams = async () => {
            const teamsSnapshot = await getDocs(collection(db, 'teams'));
            const teamList = [];

            for (const docSnap of teamsSnapshot.docs) {
                const data = docSnap.data();
                teamList.push({
                id: docSnap.id,
                name: data.name,
                members: data.members || [],
                createdAt: data.createdAt?.toDate() || null,
                });
            }

            setTeams(teamList);
        };

        fetchTeams();

        const fetchUsers = async () => {
            setLoadingUsers(true);
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
        setLoadingUsers(false);
        };

        fetchUsers();
    }, [db]);

    const openEditTeamPopup = (teamId, currentMembers) => {
        setEditingTeamId(teamId);
        setEditingTeamMembers(currentMembers);
        setShowEditTeamPopup(true);
    };

    const updateTeamMembers = async () => {
        const teamRef = doc(db, 'teams', editingTeamId);
        await updateDoc(teamRef, {
            members: editingTeamMembers
        });

        setTeams(prev =>
            prev.map(t =>
            t.id === editingTeamId ? { ...t, members: editingTeamMembers } : t
            )
        );

        setShowEditTeamPopup(false);
    };

    const deleteTeam = async (teamId) => {
        await deleteDoc(doc(db, 'teams', teamId));
        setTeams(prev => prev.filter(team => team.id !== teamId));
    };


  return (
    <div className="dashboard-screen">
        <div className="admin-back-button-container">
            <button className="admin-button" onClick={() => setView('user')}>
                ← Back to Dashboard
            </button>
        </div>

        <h1 className="dashboard-title">USER MANAGEMENT</h1>
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
                <table className="dashboard-table header">
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
                            <td>
                                <button
                                    className="admin-action-button delete"
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    setPendingDeleteUserId(user.userId);
                                    setShowDeleteConfirm(true);
                                    }}
                                >
                                    🗑️
                                </button>
                                <button
                                    className={`admin-action-button ${user.isBlocked ? 'unblock' : 'block'}`}
                                    onClick={(e) => {
                                    e.stopPropagation();
                                    if (user.isBlocked) {
                                        toggleBlockUser(user.userId, false);
                                    } else {
                                        setPendingBlockUserId(user.userId);
                                        setShowBlockConfirm(true);
                                    }
                                    }}
                                >
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
        )}
        {showDeleteConfirm && (
        <div className="popup-overlay">
            <div className="popup-box">
                <p>
                    This will permanently delete this user and all related data. Are you sure you want to proceed?
                </p>
                <div className="popup-buttons">
                    <button
                    className="mission-button"
                    onClick={() => {
                        deleteUser(pendingDeleteUserId);
                        setShowDeleteConfirm(false);
                        setPendingDeleteUserId(null);
                    }}
                    >
                    Yes, Delete
                    </button>
                    <button
                    className="mission-button"
                    onClick={() => {
                        setShowDeleteConfirm(false);
                        setPendingDeleteUserId(null);
                    }}
                    >
                    Cancel
                    </button>
                </div>
            </div>
        </div>
        )}
        {showBlockConfirm && (
        <div className="popup-overlay">
            <div className="popup-box">
                <p>Enter a message to show the user upon blocking:</p>
                <textarea
                    value={blockMessage}
                    onChange={(e) => setBlockMessage(e.target.value)}
                    placeholder="Reason for blocking..."
                    rows={4}
                    style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'black',
                    color: '#00FF00',
                    border: '1px solid #00FF00',
                    fontFamily: 'IBM Plex Mono, monospace',
                    marginTop: '1rem'
                    }}
                />
                <div className="popup-buttons">
                    <button
                    className="mission-button"
                    onClick={() => {
                        toggleBlockUser(pendingBlockUserId, true);
                        setShowBlockConfirm(false);
                        setBlockMessage('');
                        setPendingBlockUserId(null);
                    }}
                    >
                    Confirm Block
                    </button>
                    <button
                    className="mission-button"
                    onClick={() => {
                        setShowBlockConfirm(false);
                        setBlockMessage('');
                        setPendingBlockUserId(null);
                    }}
                    >
                    Cancel
                    </button>
                </div>
            </div>
        </div>
        )}

        <h1 className="dashboard-title" style={{ marginTop: '4rem' }}>TEAM MANAGEMENT</h1>
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <button className="admin-button" onClick={() => setShowCreateTeamPopup(true)}>
                + Create Team
            </button>
        </div>

        <div className="scroll-hidden fade-in-table" style={{ maxHeight: '300px', overflowY: 'scroll' }}>
            <div className="dashboard-table-wrapper">
                <table className="dashboard-table header">
                <thead>
                    <tr>
                    <th>Team Name</th>
                    <th>Members</th>
                    <th>Created At</th>
                    <th>Actions</th>
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
                        <td>{team.members.length}</td>
                        <td>{team.createdAt?.toLocaleDateString() ?? '-'}</td>
                        <td>
                            <button
                                className="admin-action-button delete"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPendingDeleteTeamId(team.id);
                                    setShowDeleteTeamConfirm(true);
                                }}
                                >
                                🗑️
                            </button>


                            <button
                                className="admin-action-button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openEditTeamPopup(team.id, team.members);
                                }}
                                >
                                Edit
                            </button>

                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
        {showCreateTeamPopup && (
        <div className="popup-overlay">
            <div className="popup-box">
                <h3>Create a New Team</h3>
                <input
                    type="text"
                    placeholder="Team name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    style={{
                        width: '100%',
                        margin: '1rem 0',
                        padding: '0.5rem',
                        background: 'black',
                        color: '#00FF00',
                        border: '1px solid #00FF00',
                        fontFamily: 'IBM Plex Mono, monospace'
                    }}
                />
                <p>Select Members:</p>
                <input
                    type="text"
                    placeholder="Search users..."
                    value={teamSearchTerm}
                    onChange={(e) => setTeamSearchTerm(e.target.value.toLowerCase())}
                    style={{
                        width: '100%',
                        padding: '0.4rem',
                        marginBottom: '1rem',
                        backgroundColor: 'black',
                        color: '#00FF00',
                        border: '1px solid #00FF00',
                        fontFamily: 'IBM Plex Mono, monospace'
                    }}
                />

                <div style={{ maxHeight: '150px', overflowY: 'scroll', marginBottom: '1rem' }}>
                    {users
                        .filter((user) => {
                            const isAlreadyInTeam = teams.some(team => team.members.includes(user.userId));
                            return (
                            !isAlreadyInTeam &&
                            user.name.toLowerCase().includes(teamSearchTerm)
                            );
                        })

                        .map((user) => (
                            <label key={user.userId} style={{ display: 'block' }}>
                            <input
                                type="checkbox"
                                checked={selectedMembers.includes(user.userId)}
                                onChange={(e) => {
                                const updated = e.target.checked
                                    ? [...selectedMembers, user.userId]
                                    : selectedMembers.filter((id) => id !== user.userId);
                                setSelectedMembers(updated);
                                }}
                            />
                            {user.name}
                            </label>
                    ))}
                </div>
                <div className="popup-buttons">
                    <button
                    className="mission-button"
                    onClick={async () => {
                        if (!newTeamName.trim()) return alert("Team name required!");
                        const docRef = await addDoc(collection(db, 'teams'), {
                            name: newTeamName.trim(),
                            members: selectedMembers,
                            createdAt: new Date()
                        });
                        setTeams(prev => [...prev, {
                            id: docRef.id,
                            name: newTeamName.trim(),
                            members: selectedMembers,
                            createdAt: new Date()
                        }]);
                        setNewTeamName('');
                        setSelectedMembers([]);
                        setShowCreateTeamPopup(false);
                    }}
                    >
                    Create
                    </button>
                    <button
                    className="mission-button"
                    onClick={() => setShowCreateTeamPopup(false)}
                    >
                    Cancel
                    </button>
                </div>
            </div>
        </div>
        )}
        {showEditTeamPopup && (
            <div className="popup-overlay">
                <div className="popup-box">
                    <h3>Edit Team Members</h3>
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={editSearchTerm}
                        onChange={(e) => setEditSearchTerm(e.target.value.toLowerCase())}
                        style={{
                            width: '100%',
                            padding: '0.4rem',
                            marginBottom: '1rem',
                            backgroundColor: 'black',
                            color: '#00FF00',
                            border: '1px solid #00FF00',
                            fontFamily: 'IBM Plex Mono, monospace'
                        }}
                    />

                    <div style={{ maxHeight: '150px', overflowY: 'scroll', marginBottom: '1rem' }}>
                        {users
                            .filter((user) => {
                                const isInCurrentTeam = editingTeamMembers.includes(user.userId);
                                const isInAnotherTeam = teams.some(
                                team => team.id !== editingTeamId && team.members.includes(user.userId)
                                );
                                return (
                                (isInCurrentTeam || !isInAnotherTeam) &&
                                user.name.toLowerCase().includes(editSearchTerm)
                                );
                            })

                            .map((user) => (
                                <label key={user.userId} style={{ display: 'block' }}>
                                <input
                                    type="checkbox"
                                    checked={editingTeamMembers.includes(user.userId)}
                                    onChange={(e) => {
                                    const updated = e.target.checked
                                        ? [...editingTeamMembers, user.userId]
                                        : editingTeamMembers.filter((id) => id !== user.userId);
                                    setEditingTeamMembers(updated);
                                    }}

                                />
                                {user.name}
                                </label>
                        ))}

                    </div>
                    <div className="popup-buttons">
                        <button className="mission-button" onClick={updateTeamMembers}>
                            Save Changes
                        </button>
                        <button
                        className="mission-button"
                        onClick={() => setShowEditTeamPopup(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
            )}

            {showDeleteTeamConfirm && (
                <div className="popup-overlay">
                    <div className="popup-box">
                        <p>This will permanently delete the team. Are you sure you want to proceed?</p>
                        <div className="popup-buttons">
                            <button
                                className="mission-button"
                                onClick={() => {
                                    deleteTeam(pendingDeleteTeamId);
                                    setShowDeleteTeamConfirm(false);
                                    setPendingDeleteTeamId(null);
                                }}
                                >
                                Yes, Delete
                            </button>
                            <button
                                className="mission-button"
                                onClick={() => {
                                    setShowDeleteTeamConfirm(false);
                                    setPendingDeleteTeamId(null);
                                }}
                                >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}


    </div>
  );
};

export default AdminDashboard;
