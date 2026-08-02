import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from "react-router-dom";
import Map from './component/Map';
import Sidebar from './component/Sidebar';
import socket, {
  API_URL,
  emitLocationUpdate,
  joinRoom,
  resumeRoomSession,
  leaveRoom,
  deleteRoom,
  listenForRoomUsers,
  listenForUserLeft,
  listenForRoomError,
  listenForRoomDeleted,
} from "./socket";
import authService from "./services/authService";
import apiFetch from "./services/api";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";

// ─── Session helpers ──────────────────────────────────────────────────────────
const getRoomNameKey = (roomId) => `roomName:${roomId}`;
const getCreatedRoomKey = (roomId) => `createdRoom:${roomId}`;

function getHaversineDistanceInMeters(lat1, lon1, lat2, lon2) {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') return 0;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── Protected route wrapper ──────────────────────────────────────────────────
function RequireAuth({ children }) {
  if (!authService.isAuthenticated()) return <Navigate to="/" replace />;
  return children;
}

// ─── Room view (map + sidebar) ────────────────────────────────────────────────
function RoomView() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = authService.getCurrentUser();

  const [users, setUsers] = useState(() => location.state?.initialUsers || []);
  const [leftUsers, setLeftUsers] = useState([]);
  const [roomName] = useState(() => sessionStorage.getItem(getRoomNameKey(roomId)) || user?.name || 'Guest');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [copied, setCopied] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [route, setRoute] = useState(null);
  const [mySocketId, setMySocketId] = useState(socket.id);
  const [showOwnerConfirmModal, setShowOwnerConfirmModal] = useState(false);

  const isNewJoin = Boolean(location.state?.isNewJoin);
  const isRestored = Boolean(location.state?.isRestored);
  const isCreated = location.state?.isCreated ?? (sessionStorage.getItem(getCreatedRoomKey(roomId)) === 'true');

  const [restorationState, setRestorationState] = useState(() => {
    if (isNewJoin || isRestored || socket.roomId === roomId) {
      return 'ready';
    }
    return 'restoring'; // 'restoring' | 'ready' | 'failed'
  });

  const restorationStateRef = React.useRef(restorationState);
  useEffect(() => {
    restorationStateRef.current = restorationState;
  }, [restorationState]);

  // Ensure user is logged in
  useEffect(() => {
    if (!authService.isAuthenticated()) { navigate('/'); return; }

    if (!sessionStorage.getItem(getRoomNameKey(roomId))) {
      sessionStorage.setItem(getRoomNameKey(roomId), user?.name || 'Guest');
    }
  }, [user, roomId, navigate]);

  useEffect(() => {
    const updateId = () => setMySocketId(socket.id);
    updateId();
    socket.on("connect", updateId);
    return () => socket.off("connect", updateId);
  }, []);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!roomId || !roomName) return;

    const handleRoomUsers = (roomUsers) => {
      const nextUsers = roomUsers || [];
      setUsers(nextUsers);
      setLeftUsers(curr =>
        curr.filter(lu => !nextUsers.some(u => u.userId === lu.userId))
      );
    };

    const handleUserLeft = ({ userId, name }) => {
      if (!userId || userId === socket.id) return;
      setSelectedUser(curr => curr?.userId === userId ? null : curr);
      setLeftUsers(curr => [
        { userId, name, leftAt: Date.now() },
        ...curr.filter(u => u.userId !== userId),
      ].slice(0, 5));
    };

    const handleRoomError = ({ message }) => {
      if (restorationStateRef.current === 'restoring') {
        // Ignore room authorization errors while session restoration is still in progress
        return;
      }
      sessionStorage.removeItem(getRoomNameKey(roomId));
      sessionStorage.removeItem(getCreatedRoomKey(roomId));
      sessionStorage.setItem('pendingNotification', message || 'Room error.');
      navigate('/dashboard');
    };

    const handleRoomDeleted = ({ message }) => {
      sessionStorage.setItem('pendingNotification', message || 'The room has been deleted by its owner.');
      sessionStorage.removeItem(getRoomNameKey(roomId));
      sessionStorage.removeItem(getCreatedRoomKey(roomId));
      navigate('/dashboard');
    };

    const handlePageHide = () => socket.disconnect();

    setLeftUsers([]);
    listenForRoomUsers(handleRoomUsers);
    listenForUserLeft(handleUserLeft);
    listenForRoomError(handleRoomError);
    listenForRoomDeleted(handleRoomDeleted);
    window.addEventListener("pagehide", handlePageHide);

    if (!socket.connected) socket.connect();

    if (isNewJoin) {
      // Flow 1 & 2: Explicit room creation or room join from Dashboard
      joinRoom(roomId, { create: isCreated });
      setRestorationState('ready');
    } else if (isRestored || socket.roomId === roomId) {
      setRestorationState('ready');
    } else {
      // Flow 3: Session Restoration (Page Refresh or Direct URL Navigation)
      setRestorationState('restoring');
      resumeRoomSession(roomId).then(res => {
        if (res && res.success) {
          setUsers(res.users || []);
          setRestorationState('ready');
        } else {
          setRestorationState('failed');
          sessionStorage.setItem('pendingNotification', res?.error || 'The room has been deleted or you are no longer a member.');
          navigate('/dashboard');
        }
      });
    }

    // Post-mount GPS update
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => emitLocationUpdate({ lat: coords.latitude, lng: coords.longitude }),
        () => console.warn("Location permission denied."),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    return () => {
      socket.off("roomUsers", handleRoomUsers);
      socket.off("userLeft", handleUserLeft);
      socket.off("roomError", handleRoomError);
      socket.off("roomDeleted", handleRoomDeleted);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [roomId, roomName, navigate, isNewJoin, isRestored, isCreated]);

  const [routeInfo, setRouteInfo] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [routeNotification, setRouteNotification] = useState(null);
  const lastRouteFetchRef = React.useRef({ startLat: null, startLng: null, endLat: null, endLng: null, timestamp: 0 });

  const currentUserId = user?.id || mySocketId;
  const currentUserObj = users.find(u => u.userId === currentUserId || u.userId === mySocketId);
  const isOwner = Boolean(currentUserObj?.isOwner);

  const selectedRoomUser = selectedUser
    ? users.find(u => u.userId === selectedUser.userId) || null
    : null;

  const handleClearRoute = React.useCallback(() => {
    setRoute(null);
    setRouteInfo(null);
    setSelectedUser(null);
    setLoadingRoute(false);
    setRouteError(null);
    lastRouteFetchRef.current = { startLat: null, startLng: null, endLat: null, endLng: null, timestamp: 0 };
  }, []);

  const fetchRouteForUsers = React.useCallback(async (me, target) => {
    if (!me?.lat || !me?.lng || !target?.lat || !target?.lng) {
      setRouteError("Coordinates missing for selected user.");
      return;
    }

    setLoadingRoute(true);
    setRouteError(null);

    try {
      const res = await apiFetch(`${API_URL}/api/location/getRoute`, {
        method: 'POST',
        body: JSON.stringify({
          start: { lat: me.lat, lng: me.lng },
          end: { lat: target.lat, lng: target.lng },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoute(data);
        const feature = data.features?.[0];
        if (feature?.properties) {
          const summary = feature.properties.summary || feature.properties.segments?.[0] || {};
          let distStr = 'Unknown';
          let durStr = 'Unknown';
          if (typeof summary.distance === 'number') {
            distStr = summary.distance >= 1000 ? `${(summary.distance / 1000).toFixed(2)} km` : `${Math.round(summary.distance)} m`;
          }
          if (typeof summary.duration === 'number') {
            const mins = Math.round(summary.duration / 60);
            durStr = `${mins} min${mins !== 1 ? 's' : ''}`;
          }
          setRouteInfo({ distance: distStr, duration: durStr });
        }
        lastRouteFetchRef.current = {
          startLat: me.lat,
          startLng: me.lng,
          endLat: target.lat,
          endLng: target.lng,
          timestamp: Date.now(),
        };
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || "Failed to calculate route.";
        setRouteError(errMsg);
        setRouteNotification(errMsg);
      }
    } catch {
      setRouteError("Network error while fetching route.");
      setRouteNotification("Network error while fetching route.");
    } finally {
      setLoadingRoute(false);
    }
  }, []);

  const handleShowRoute = (targetUser) => {
    setSelectedUser(targetUser);
    const me = users.find(u => u.userId === currentUserId || u.userId === mySocketId);
    if (me) {
      fetchRouteForUsers(me, targetUser);
    }
  };

  // Automatically clear route if selected user disconnects or leaves room
  useEffect(() => {
    if (selectedUser) {
      const exists = users.some(u => u.userId === selectedUser.userId);
      if (!exists) {
        handleClearRoute();
        setRouteNotification("The selected user is no longer available.");
      }
    }
  }, [users, selectedUser, handleClearRoute]);

  // Throttled automatic route refresh when user moves > 20 meters
  useEffect(() => {
    if (!selectedUser || !route) return;

    const me = users.find(u => u.userId === currentUserId || u.userId === mySocketId);
    const target = users.find(u => u.userId === selectedUser.userId);

    if (!me?.lat || !me?.lng || !target?.lat || !target?.lng) return;

    const { startLat, startLng, endLat, endLng, timestamp } = lastRouteFetchRef.current;
    if (!startLat || !startLng || !endLat || !endLng) return;

    const now = Date.now();
    if (now - timestamp < 3000) return; // 3 second throttle limit

    const meMoved = getHaversineDistanceInMeters(me.lat, me.lng, startLat, startLng);
    const targetMoved = getHaversineDistanceInMeters(target.lat, target.lng, endLat, endLng);

    if (meMoved > 20 || targetMoved > 20) {
      fetchRouteForUsers(me, target);
    }
  }, [users, selectedUser, route, currentUserId, mySocketId, fetchRouteForUsers]);

  if (restorationState === 'restoring') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0d0d0d',
        color: '#fff',
        fontFamily: "'Inter', sans-serif",
        gap: '1rem',
      }}>
        <div style={{
          width: 44,
          height: 44,
          border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#aaa' }}>
          Restoring room session...
        </div>
      </div>
    );
  }

  const userWithMe = users.map(u => ({ ...u, isMe: u.userId === currentUserId || u.userId === mySocketId }));

  const handleLeaveClick = () => {
    if (isOwner) {
      setShowOwnerConfirmModal(true);
    } else {
      leaveRoom(roomId);
      navigate('/dashboard');
    }
  };

  const handleConfirmOwnerLeaveAndDelete = () => {
    setShowOwnerConfirmModal(false);
    deleteRoom(roomId);
    navigate('/dashboard');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#0d0d0d',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }

        .room-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.25rem;
          height: 52px;
          background: #111;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          flex-shrink: 0;
          z-index: 30;
        }

        .back-btn {
          display: flex; align-items: center; gap: 0.4rem;
          background: none; border: none;
          color: #777; font-size: 0.82rem; font-family: inherit;
          cursor: pointer; padding: 0;
          transition: color 0.15s;
        }
        .back-btn:hover { color: #fff; }

        .room-title {
          display: flex; align-items: center; gap: 0.75rem;
          position: absolute; left: 50%; transform: translateX(-50%);
        }

        .room-code-pill {
          display: inline-flex; align-items: center;
          padding: 0.2rem 0.6rem;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.78rem; color: #aaa;
          letter-spacing: 0.06em;
        }

        .copy-btn {
          padding: 0.3rem 0.7rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 7px;
          color: #888; font-size: 0.75rem; font-family: inherit;
          cursor: pointer; transition: all 0.15s;
        }
        .copy-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }
        .copy-btn.copied { color: #22c55e; border-color: rgba(34,197,94,0.3); }

        .action-btn-leave {
          padding: 0.35rem 0.75rem;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 7px;
          color: #ddd; font-size: 0.78rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .action-btn-leave:hover { background: rgba(255, 255, 255, 0.15); color: #fff; }

        .action-btn-delete {
          padding: 0.35rem 0.75rem;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 7px;
          color: #f87171; font-size: 0.78rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .action-btn-delete:hover { background: rgba(239, 68, 68, 0.25); color: #fca5a5; }

        .sidebar-toggle {
          padding: 0.35rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 7px;
          color: #888; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s;
        }
        .sidebar-toggle:hover { background: rgba(255,255,255,0.1); color: #fff; }
      `}</style>

      {/* Header */}
      <header className="room-header" style={{ position: 'relative' }}>
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>

        <div className="room-title">
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e0e0e0' }}>Room</span>
          <span className="room-code-pill">{roomId}</span>
          <button
            className={`copy-btn${copied ? ' copied' : ''}`}
            onClick={() => {
              navigator.clipboard.writeText(roomId);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button className="action-btn-leave" onClick={handleLeaveClick}>
            Leave Room
          </button>

          {isOwner && (
            <button className="action-btn-delete" onClick={() => setShowOwnerConfirmModal(true)}>
              Delete Room
            </button>
          )}

          <button
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(v => !v)}
            title={isSidebarOpen ? 'Hide panel' : 'Show panel'}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          {loadingRoute && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            }}>
              <div style={{
                width: 40, height: 40,
                border: '3px solid rgba(255,255,255,0.1)',
                borderTopColor: '#fff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
            </div>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          {routeNotification && (
            <div style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 2000,
              background: 'rgba(127, 29, 29, 0.95)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '0.55rem 1.1rem',
              borderRadius: 10,
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
            }}>
              <span>⚠️ {routeNotification}</span>
              <button
                onClick={() => setRouteNotification(null)}
                style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
              >
                ✕
              </button>
            </div>
          )}
          <Map
            users={userWithMe}
            mySocketId={mySocketId}
            route={route}
            routeInfo={routeInfo}
            routeLoading={loadingRoute}
            selectedUser={selectedRoomUser}
            selectedUserId={selectedRoomUser?.userId}
            onSelectUser={setSelectedUser}
            onShowRoute={handleShowRoute}
            onClearRoute={handleClearRoute}
          />
        </div>

        {/* Sidebar — right side */}
        {isSidebarOpen && (
          <Sidebar
            users={userWithMe}
            leftUsers={leftUsers}
            onSelectUser={setSelectedUser}
            selectedUserId={selectedRoomUser?.userId}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
            windowWidth={windowWidth}
            mySocketId={mySocketId}
            roomId={roomId}
          />
        )}
      </div>

      {/* Owner Confirmation Modal */}
      {showOwnerConfirmModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14, padding: '1.75rem', maxWidth: 440, width: '100%',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f87171', marginBottom: '0.75rem' }}>
              Warning: Room Owner Action
            </h3>
            <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.75rem' }}>
              You are the owner of this room. If you leave, the room and all shared locations will be permanently deleted for everyone. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowOwnerConfirmModal(false)}
                style={{
                  padding: '0.65rem 1.25rem', background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
                  color: '#aaa', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOwnerLeaveAndDelete}
                style={{
                  padding: '0.65rem 1.25rem', background: '#ef4444',
                  border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Confirm & Delete Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("RoomView ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#111', color: '#f87171', fontFamily: 'monospace' }}>
          <h2>An error occurred in RoomView:</h2>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
          <button onClick={() => window.location.href = '/dashboard'} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Go to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Root App with routing ────────────────────────────────────────────────────
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginOrDashboard />} />
        <Route path="/dashboard" element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        } />
        <Route path="/profile" element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        } />
        <Route path="/room/:roomId" element={
          <RequireAuth>
            <ErrorBoundary>
              <RoomView />
            </ErrorBoundary>
          </RequireAuth>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function LoginOrDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!authService.isAuthenticated()) return;

    authService.getMyRooms().then((myRooms) => {
      if (myRooms && myRooms.length > 0) {
        const activeRoomId = myRooms[0].roomId;
        resumeRoomSession(activeRoomId).then((res) => {
          if (res && res.success) {
            navigate(`/room/${encodeURIComponent(activeRoomId)}`, {
              state: { initialUsers: res.users || [] },
              replace: true,
            });
          } else {
            sessionStorage.setItem('pendingNotification', 'The room has been deleted or your session expired.');
            navigate('/dashboard', { replace: true });
          }
        });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }).catch(() => {
      navigate('/dashboard', { replace: true });
    });
  }, [navigate]);

  if (!authService.isAuthenticated()) return <LoginPage />;
  return <div style={{ background: '#111', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Checking active session...</div>;
}

export default App;