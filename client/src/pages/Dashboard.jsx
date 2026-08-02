import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import socket, { deleteRoom } from '../socket';

const getRoomNameKey = (roomId) => `roomName:${roomId}`;
const getCreatedRoomKey = (roomId) => `createdRoom:${roomId}`;

const generateId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

export default function Dashboard() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [activeRooms, setActiveRooms] = useState([]);
  const [loadingActiveRooms, setLoadingActiveRooms] = useState(true);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'create' | 'join'
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [notification, setNotification] = useState(() => {
    const pending = sessionStorage.getItem('pendingNotification');
    if (pending) {
      sessionStorage.removeItem('pendingNotification');
      return pending;
    }
    return '';
  });

  useEffect(() => {
    const handleRoomDeleted = () => {
      authService.getMyRooms().then(rooms => setActiveRooms(rooms || [])).catch(() => {});
    };
    socket.on('roomDeleted', handleRoomDeleted);
    return () => socket.off('roomDeleted', handleRoomDeleted);
  }, []);

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate('/');
      return;
    }

    const loadActiveRooms = async () => {
      try {
        const rooms = await authService.getMyRooms();
        setActiveRooms(rooms || []);
      } catch (err) {
        console.error('Failed to load active rooms:', err);
      } finally {
        setLoadingActiveRooms(false);
      }
    };

    loadActiveRooms();
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/');
  };

  const handleCreateGroup = (e) => {
    e.preventDefault();
    const name = groupName.trim();
    if (!name) return;
    const id = generateId();
    sessionStorage.setItem(getRoomNameKey(id), name);
    sessionStorage.setItem(getCreatedRoomKey(id), 'true');
    navigate(`/room/${encodeURIComponent(id)}`, {
      state: { isNewJoin: true, isCreated: true }
    });
  };

  const handleJoinGroup = (e) => {
    e.preventDefault();
    const id = joinCode.trim().toUpperCase();
    if (!id) { setJoinError('Please enter a group code.'); return; }
    navigate(`/room/${encodeURIComponent(id)}`, {
      state: { isNewJoin: true, isCreated: false }
    });
  };

  const handleResumeRoom = (room) => {
    navigate(`/room/${encodeURIComponent(room.roomId)}`, {
      state: { isNewJoin: false, isRestored: false }
    });
  };

  const handleDeleteGroup = (roomId) => {
    if (window.confirm(`Are you sure you want to delete room ${roomId}? This action cannot be undone.`)) {
      deleteRoom(roomId);
      sessionStorage.removeItem(getRoomNameKey(roomId));
      sessionStorage.removeItem(getCreatedRoomKey(roomId));
      setActiveRooms(prev => prev.filter(r => r.roomId !== roomId));
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good day';
    return 'Good evening';
  };

  const displayName = user?.name || user?.email?.split('@')[0] || 'there';

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { key: 'create', label: 'Create Group', icon: <PlusIcon /> },
    { key: 'join', label: 'Join Group', icon: <ArrowRightIcon /> },
    { key: 'profile', label: 'My Profile', icon: <ProfileIcon /> },
  ];

  const handleNavClick = (key) => {
    if (key === 'profile') {
      navigate('/profile');
    } else {
      setView(key);
      setJoinError('');
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      background: '#111',
      color: '#fff',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.88rem;
          font-weight: 500;
          color: #888;
          transition: all 0.15s;
          border: none;
          background: none;
          font-family: inherit;
          width: 100%;
          text-align: left;
        }
        .nav-item:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .nav-item.active { color: #fff; background: rgba(255,255,255,0.1); }

        .action-card {
          background: #1a1a1a;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .action-card:hover {
          border-color: rgba(255,255,255,0.18);
          background: #222;
          transform: translateY(-2px);
        }

        .icon-box {
          width: 36px; height: 36px;
          background: #2a2a2a;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
        }

        .group-card {
          background: #1a1a1a;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .group-id-badge {
          background: #2a2a2a;
          border-radius: 6px;
          padding: 0.3rem 0.6rem;
          font-size: 0.78rem;
          font-family: 'JetBrains Mono', monospace;
          color: #fff;
          display: inline-block;
          font-weight: 700;
        }

        .resume-btn {
          width: 100%;
          padding: 0.65rem;
          background: #4f46e5;
          color: #fff;
          border: none;
          border-radius: 8px;
          font-size: 0.88rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s;
        }
        .delete-group-btn {
          padding: 0.65rem 0.85rem;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          color: #f87171;
          font-size: 0.82rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .delete-group-btn:hover {
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          border-color: rgba(239, 68, 68, 0.5);
        }

        .form-input {
          width: 100%;
          padding: 0.8rem 1rem;
          background: #1a1a1a;
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #fff;
          font-size: 0.92rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-input::placeholder { color: #555; }
        .form-input:focus { border-color: rgba(255,255,255,0.3); }

        .form-label {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 0.4rem;
        }

        .submit-btn {
          width: 100%;
          padding: 0.8rem;
          background: #fff;
          color: #111;
          border: none;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }
        .submit-btn:hover { background: #e5e5e5; transform: translateY(-1px); }

        .back-link {
          background: none;
          border: none;
          color: #888;
          font-family: inherit;
          font-size: 0.82rem;
          cursor: pointer;
          padding: 0;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.35rem;
          transition: color 0.15s;
        }
        .back-link:hover { color: #fff; }
      `}</style>

      {/* Sidebar nav */}
      <aside style={{
        width: 220,
        background: '#0d0d0d',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.25rem 0.75rem',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 0.25rem', marginBottom: '1.75rem' }}>
          <div style={{
            width: 28, height: 28, background: '#fff', borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 700, color: '#111',
          }}>T</div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Spotter</span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
          {navItems.map(item => (
            <button
              key={item.key}
              className={`nav-item${view === item.key ? ' active' : ''}`}
              onClick={() => handleNavClick(item.key)}
            >
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.9rem 2rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: '#111',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#fff' }}>
              {greeting()}, {displayName}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '0.1rem' }}>
              {view === 'dashboard' ? 'Manage your active rooms and location sharing.' : ''}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              onClick={() => navigate('/profile')}
            >
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#4f46e5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: '#fff',
                border: '1.5px solid rgba(255,255,255,0.15)',
              }}>
                {displayName[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: '0.85rem', color: '#ccc', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </span>
            </div>
            <button
              id="logoutBtn"
              style={{
                padding: '0.45rem 0.9rem',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 8,
                color: '#ccc',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s',
              }}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Notification Banner */}
        {notification && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '0.75rem 2rem',
            color: '#f87171',
            fontSize: '0.88rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span>⚠ {notification}</span>
            <button
              onClick={() => setNotification('')}
              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>

          {/* ─── DASHBOARD ─── */}
          {view === 'dashboard' && (
            <div>
              {/* Action cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                <div className="action-card" id="createGroupCard" onClick={() => setView('create')}>
                  <div className="icon-box">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: '0.25rem' }}>Create a Group</div>
                    <div style={{ fontSize: '0.82rem', color: '#666' }}>Start a new room and invite friends.</div>
                  </div>
                </div>

                <div className="action-card" id="joinGroupCard" onClick={() => setView('join')}>
                  <div className="icon-box">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff', marginBottom: '0.25rem' }}>Join a Group</div>
                    <div style={{ fontSize: '0.82rem', color: '#666' }}>Enter a code to join an active room.</div>
                  </div>
                </div>
              </div>

              {/* Active Rooms */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase' }}>
                  Active Rooms
                </div>
                {activeRooms.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#555', background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '0.2rem 0.7rem' }}>
                    {activeRooms.length} room{activeRooms.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {loadingActiveRooms ? (
                <div style={{ color: '#666', fontSize: '0.85rem' }}>Loading active rooms...</div>
              ) : activeRooms.length === 0 ? (
                <div style={{
                  background: '#1a1a1a', border: '1px dashed rgba(255,255,255,0.1)',
                  borderRadius: 12, padding: '2.5rem', textAlign: 'center', color: '#444',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📍</div>
                  <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: '#555' }}>No active rooms</div>
                  <div style={{ fontSize: '0.82rem' }}>Create or join a room to get started.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {activeRooms.map(room => (
                    <div key={room.roomId} className="group-card">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="group-id-badge">Room: {room.roomId}</span>
                        {room.isOwner && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                            OWNER
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#888' }}>
                        Owner: <strong style={{ color: '#ccc' }}>{room.ownerName}</strong>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#555' }}>
                        {room.memberCount} active member{room.memberCount !== 1 ? 's' : ''}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <button className="resume-btn" style={{ flex: 1 }} onClick={() => handleResumeRoom(room)}>
                          Resume Tracking
                        </button>
                        {room.isOwner && (
                          <button
                            className="delete-group-btn"
                            onClick={() => handleDeleteGroup(room.roomId)}
                            title="Delete Group"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── CREATE GROUP ─── */}
          {view === 'create' && (
            <div style={{ maxWidth: 480 }}>
              <button className="back-link" onClick={() => setView('dashboard')}>← Dashboard</button>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.4rem' }}>Create a group</h2>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem' }}>
                Give your group a name. You'll get a unique room code to share with friends.
              </p>
              <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">GROUP NAME</label>
                  <input
                    id="groupNameInput"
                    className="form-input"
                    type="text"
                    placeholder="e.g. Weekend Trip"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <button className="submit-btn" type="submit">Create group</button>
              </form>
            </div>
          )}

          {/* ─── JOIN GROUP ─── */}
          {view === 'join' && (
            <div style={{ maxWidth: 480 }}>
              <button className="back-link" onClick={() => setView('dashboard')}>← Dashboard</button>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.4rem' }}>Join a group</h2>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem' }}>
                Paste the invite code your friend shared with you.
              </p>
              <form onSubmit={handleJoinGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">GROUP CODE</label>
                  <input
                    id="joinCodeInput"
                    className="form-input"
                    type="text"
                    placeholder="e.g. ABC123"
                    value={joinCode}
                    onChange={e => { setJoinCode(e.target.value); setJoinError(''); }}
                    autoFocus
                    required
                  />
                </div>
                {joinError && <p style={{ color: '#f87171', fontSize: '0.82rem' }}>⚠ {joinError}</p>}
                <button className="submit-btn" type="submit">Join group</button>
              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Icons
function DashboardIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="8" r="4" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
    </svg>
  );
}
