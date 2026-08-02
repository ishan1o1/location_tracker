import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = authService.getCurrentUser();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    setSaving(true);
    try {
      const updatedUser = await authService.updateProfile(name.trim());
      setName(updatedUser.name);
      setMessage('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const displayName = user?.name || 'User';

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

        .profile-input {
          width: 100%;
          padding: 0.85rem 1rem;
          background: #1a1a1a;
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #fff;
          font-size: 0.95rem;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s;
        }
        .profile-input:focus { border-color: rgba(255,255,255,0.3); }
        .profile-input:disabled { background: #141414; color: #666; cursor: not-allowed; border-color: rgba(255,255,255,0.05); }

        .profile-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #777;
          margin-bottom: 0.45rem;
        }

        .save-btn {
          width: 100%;
          padding: 0.85rem;
          background: #fff;
          color: #111;
          border: none;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s;
        }
        .save-btn:hover { background: #e5e5e5; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .back-btn {
          background: none;
          border: none;
          color: #888;
          font-family: inherit;
          font-size: 0.85rem;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          margin-bottom: 1.5rem;
          transition: color 0.15s;
        }
        .back-btn:hover { color: #fff; }
      `}</style>

      {/* Main Container */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 2rem',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: '#0d0d0d',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button className="back-btn" onClick={() => navigate('/dashboard')} style={{ margin: 0 }}>
              ← Dashboard
            </button>
            <span style={{ color: '#444' }}>|</span>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>User Profile</span>
          </div>
          <button
            onClick={() => { authService.logout(); navigate('/'); }}
            style={{
              padding: '0.4rem 0.85rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              color: '#ccc',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', padding: '3rem 2rem', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 480 }}>
            {/* Avatar Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1.25rem',
              marginBottom: '2rem',
              padding: '1.5rem',
              background: '#1a1a1a',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: '#4f46e5',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.6rem', fontWeight: 800, color: '#fff',
              }}>
                {displayName[0]?.toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem' }}>{displayName}</h2>
                <div style={{ color: '#777', fontSize: '0.85rem' }}>{user?.email}</div>
              </div>
            </div>

            {message && (
              <div style={{
                padding: '0.8rem 1rem',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 10,
                color: '#4ade80',
                fontSize: '0.88rem',
                marginBottom: '1.5rem',
              }}>
                ✓ {message}
              </div>
            )}

            {error && (
              <div style={{
                padding: '0.8rem 1rem',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 10,
                color: '#f87171',
                fontSize: '0.88rem',
                marginBottom: '1.5rem',
              }}>
                ⚠ {error}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="profile-label">DISPLAY NAME</label>
                <input
                  id="profileNameInput"
                  className="profile-input"
                  type="text"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(''); setMessage(''); }}
                  required
                />
              </div>

              <div>
                <label className="profile-label">EMAIL ADDRESS (READ ONLY)</label>
                <input
                  className="profile-input"
                  type="email"
                  value={user?.email || ''}
                  disabled
                />
              </div>

              <button className="save-btn" type="submit" disabled={saving}>
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
