import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const pendingError = sessionStorage.getItem('pendingAuthError');
    if (pendingError) {
      setInfoMessage(pendingError);
      sessionStorage.removeItem('pendingAuthError');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (mode === 'signup' && !name.trim()) {
      setError('Display name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (mode === 'signup' && password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await authService.login(email.trim(), password);
      } else {
        await authService.register(name.trim(), email.trim(), password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-input {
          width: 100%;
          padding: 0.85rem 1rem;
          background: #f5f5f5;
          border: 1.5px solid #e0e0e0;
          border-radius: 12px;
          font-size: 0.95rem;
          font-family: inherit;
          color: #111;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .auth-input:focus {
          border-color: #555;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.07);
        }

        .auth-btn-primary {
          width: 100%;
          padding: 0.9rem;
          background: #111;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .auth-btn-primary:hover { background: #333; transform: translateY(-1px); }
        .auth-btn-primary:active { transform: translateY(0); }
        .auth-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

        .auth-btn-secondary {
          width: 100%;
          padding: 0.9rem;
          background: transparent;
          color: #111;
          border: 1.5px solid #ddd;
          border-radius: 12px;
          font-size: 0.95rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .auth-btn-secondary:hover { background: #f5f5f5; border-color: #bbb; }

        .auth-label {
          display: block;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #888;
          margin-bottom: 0.45rem;
        }

        .field-row {
          position: relative;
          display: flex;
          align-items: center;
        }

        .eye-btn {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          cursor: pointer;
          color: #888;
          display: flex;
          align-items: center;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          color: #bbb;
          font-size: 0.8rem;
        }
        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e0e0e0;
        }

        .mode-link {
          background: none;
          border: none;
          font-family: inherit;
          font-size: 0.9rem;
          font-weight: 600;
          color: #111;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
        }
        .mode-link:hover { color: #555; }
      `}</style>

      {/* Left panel — brand */}
      <div style={{
        flex: 1,
        background: '#f0f0f0',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '4rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative bar */}
        <div style={{
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 4,
          background: '#111',
        }} />

        <div style={{ marginLeft: 8 }}>
          <h1 style={{
            fontSize: 'clamp(3.5rem, 8vw, 6rem)',
            fontWeight: 900,
            lineHeight: 0.92,
            color: '#111',
            letterSpacing: '-0.02em',
          }}>
            Track<br />N<br />Talk
          </h1>
          <p style={{
            marginTop: '1.5rem',
            fontSize: '1rem',
            color: '#777',
            maxWidth: 260,
            lineHeight: 1.6,
          }}>
            Real-time location sharing and group chat.
          </p>
        </div>
      </div>

      {/* Right panel — auth form */}
      <div style={{
        width: 'min(480px, 100%)',
        background: '#111',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '3rem 3rem',
        position: 'relative',
      }}>
        {/* Star icon top-right */}
        <button style={{
          position: 'absolute', top: '1.5rem', right: '1.5rem',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50%',
          width: 36, height: 36,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#fff', fontSize: '1rem',
        }}>✦</button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.9rem',
          }}>T</div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>TrackNTalk</span>
        </div>

        <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '1.7rem', marginBottom: '0.4rem' }}>
          {mode === 'login' ? 'Welcome back' : 'Create account'}
        </h2>
        <p style={{ color: '#888', fontSize: '0.88rem', marginBottom: '2rem' }}>
          {mode === 'login'
            ? 'Sign in to continue to your dashboard.'
            : 'Set up your free account in seconds.'}
        </p>

        {infoMessage && (
          <div style={{
            padding: '0.75rem 1rem',
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: 8,
            color: '#fde047',
            fontSize: '0.85rem',
            marginBottom: '1rem',
          }}>
            ℹ {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {mode === 'signup' && (
            <div>
              <label className="auth-label" style={{ color: '#aaa' }}>DISPLAY NAME</label>
              <input
                id="nameInput"
                className="auth-input"
                type="text"
                placeholder="e.g. You"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(''); }}
                required
              />
            </div>
          )}

          <div>
            <label className="auth-label" style={{ color: '#aaa' }}>EMAIL</label>
            <input
              id="emailInput"
              className="auth-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              required
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
              <label className="auth-label" style={{ color: '#aaa', marginBottom: 0 }}>PASSWORD</label>
            </div>
            <div className="field-row">
              <input
                id="passwordInput"
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                style={{ paddingRight: '2.8rem' }}
                required
              />
              <button type="button" className="eye-btn" onClick={() => setShowPassword(v => !v)}>
                {showPassword ? (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p style={{ color: '#f87171', fontSize: '0.82rem' }}>⚠ {error}</p>
          )}

          <button type="submit" className="auth-btn-primary" disabled={loading} style={{
            marginTop: '0.5rem',
            background: '#fff', color: '#111',
          }}>
            {loading ? 'Processing...' : (mode === 'login' ? 'Sign in' : 'Create account')}
          </button>
        </form>

        <div className="divider" style={{ margin: '1.5rem 0', color: '#444' }}>
          {mode === 'login' ? 'No account?' : 'Already have an account?'}
        </div>

        <button
          id="switchModeBtn"
          className="auth-btn-secondary"
          style={{
            background: 'transparent',
            border: '1.5px solid rgba(255,255,255,0.15)',
            color: '#fff',
          }}
          onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); setInfoMessage(''); }}
        >
          {mode === 'login' ? 'Create an account' : 'Sign in instead'}
        </button>
      </div>
    </div>
  );
}
