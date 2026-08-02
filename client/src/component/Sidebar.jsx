import React, { useState, useEffect, useRef } from 'react';
import socket, { sendChatMessage, listenForMessages } from '../socket';

const getInitial = (name) => String(name || '?')[0].toUpperCase();

const Sidebar = ({
  users = [],
  leftUsers = [],
  onSelectUser,
  selectedUserId,
  isOpen,
  setIsOpen,
  windowWidth,
  mySocketId,
  roomId,
}) => {
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Listen for incoming chat messages
  useEffect(() => {
    const handler = (msg) => {
      setMessages(prev => [...prev, msg]);
    };
    socket.on('receiveMessage', handler);
    return () => socket.off('receiveMessage', handler);
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e?.preventDefault();
    const text = msgInput.trim();
    if (!text) return;
    sendChatMessage(text);
    setMsgInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUserSelect = (user) => {
    if (!user.isMe) {
      onSelectUser(user);
      if (windowWidth < 768) setIsOpen(false);
    }
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isExpanded = isOpen;

  if (!isExpanded) {
    // Collapsed state — mini icon strip
    return (
      <aside style={{
        width: 56,
        background: '#0d0d0d',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '1rem',
        gap: '0.75rem',
        flexShrink: 0,
        height: '100%',
        zIndex: 20,
      }}>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#aaa', cursor: 'pointer',
          }}
          title="Expand panel"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <div style={{ fontSize: '0.6rem', color: '#555', fontWeight: 700 }}>{users.length}</div>
        {users.slice(0, 5).map(u => (
          <button
            key={u.userId}
            title={u.isMe ? 'You' : u.name}
            onClick={() => handleUserSelect(u)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: u.isMe ? '#4f46e5' : '#2a2a2a',
              border: selectedUserId === u.userId ? '2px solid #fff' : '2px solid rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 700, color: '#fff',
              cursor: 'pointer',
            }}
          >
            {getInitial(u.name)}
          </button>
        ))}
      </aside>
    );
  }

  return (
    <>
      {/* Mobile backdrop */}
      {windowWidth < 768 && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }}
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside style={{
        width: windowWidth < 768 ? '85vw' : 300,
        maxWidth: 320,
        background: '#111',
        borderLeft: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100%',
        zIndex: 40,
        position: windowWidth < 768 ? 'fixed' : 'relative',
        right: windowWidth < 768 ? 0 : 'auto',
        top: 0,
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        overflow: 'hidden',
      }}>
        <style>{`
          .sidebar-scroll::-webkit-scrollbar { width: 3px; }
          .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
          .sidebar-scroll::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }

          .user-row {
            display: flex;
            align-items: center;
            gap: 0.65rem;
            padding: 0.5rem 0.75rem;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.15s;
          }
          .user-row:hover { background: rgba(255,255,255,0.04); }
          .user-row.selected { background: rgba(255,255,255,0.07); }

          .chat-bubble {
            padding: 0.5rem 0;
          }

          .msg-input {
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: #fff;
            font-size: 0.88rem;
            font-family: inherit;
            resize: none;
            min-height: 36px;
            max-height: 80px;
            padding: 0.25rem 0;
          }
          .msg-input::placeholder { color: #444; }

          .send-btn {
            padding: 0.45rem 0.9rem;
            background: #fff;
            color: #111;
            border: none;
            border-radius: 8px;
            font-size: 0.82rem;
            font-weight: 700;
            font-family: inherit;
            cursor: pointer;
            flex-shrink: 0;
            transition: background 0.15s;
          }
          .send-btn:hover { background: #ddd; }
          .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        `}</style>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.85rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Panel
          </span>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none', border: 'none', color: '#555', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* ── ONLINE USERS ── */}
        <div style={{
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem 0.5rem',
          }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#888' }}>
              Online ({users.length})
            </span>
            {users.length > 0 && (
              <button
                style={{
                  background: 'none', border: 'none', color: '#555', cursor: 'pointer',
                  fontSize: '0.7rem',
                }}
              >▲</button>
            )}
          </div>

          <div style={{ padding: '0 0.25rem 0.75rem' }}>
            {users.length === 0 ? (
              <div style={{ padding: '0.5rem 0.75rem', color: '#444', fontSize: '0.8rem' }}>
                No users online yet…
              </div>
            ) : (
              users.map(user => (
                <button
                  key={user.userId}
                  className={`user-row${selectedUserId === user.userId ? ' selected' : ''}`}
                  style={{ width: '100%', border: 'none', background: selectedUserId === user.userId ? 'rgba(255,255,255,0.07)' : 'transparent', textAlign: 'left' }}
                  onClick={() => handleUserSelect(user)}
                  title={user.isMe ? 'You' : user.name}
                >
                  {/* Online dot */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: user.isMe ? '#4f46e5' : '#2a2a2a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.72rem', fontWeight: 700, color: '#fff',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                    }}>
                      {getInitial(user.name)}
                    </div>
                    <div style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 9, height: 9, borderRadius: '50%',
                      background: '#22c55e',
                      border: '1.5px solid #111',
                    }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: 600, color: '#e5e5e5',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {user.name}{user.isMe ? ' (you)' : ''}
                    </div>
                    {user.distance && (
                      <div style={{ fontSize: '0.7rem', color: '#555' }}>{user.distance} · {user.eta}</div>
                    )}
                  </div>
                </button>
              ))
            )}

            {/* Left users */}
            {leftUsers.map(u => (
              <div key={`${u.userId}-${u.leftAt}`} style={{
                display: 'flex', alignItems: 'center', gap: '0.65rem',
                padding: '0.4rem 0.75rem', opacity: 0.45,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: '#1f1f1f',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.68rem', fontWeight: 700, color: '#666',
                }}>
                  {getInitial(u.name)}
                </div>
                <span style={{ fontSize: '0.78rem', color: '#555' }}>{u.name} left</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── MESSAGES ── */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          flex: 1, overflow: 'hidden',
        }}>
          <div style={{ padding: '0.75rem 1rem 0.4rem', flexShrink: 0 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#888' }}>Messages</span>
          </div>

          <div
            className="sidebar-scroll"
            style={{ flex: 1, overflowY: 'auto', padding: '0 1rem' }}
          >
            {messages.length === 0 ? (
              <div style={{ color: '#444', fontSize: '0.8rem', paddingTop: '0.5rem' }}>
                No messages yet. Say hi! 👋
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.name === users.find(u => u.userId === mySocketId)?.name;
                return (
                  <div key={i} className="chat-bubble">
                    <div style={{
                      fontSize: '0.72rem', fontWeight: 700,
                      color: isMe ? '#a5b4fc' : '#aaa',
                      marginBottom: '0.15rem',
                    }}>
                      {msg.name}
                      <span style={{ fontWeight: 400, color: '#444', marginLeft: '0.35rem' }}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '0.88rem', color: '#e0e0e0',
                      lineHeight: 1.5,
                      wordBreak: 'break-word',
                    }}>
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'flex-end', gap: '0.6rem',
            flexShrink: 0,
            background: '#111',
          }}>
            <textarea
              ref={inputRef}
              className="msg-input"
              placeholder="Message…"
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={!msgInput.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;