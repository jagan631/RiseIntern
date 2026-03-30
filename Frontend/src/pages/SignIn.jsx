import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL, connectSocket } from '../socket';

const SignIn = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);

    const endpoint = mode === 'login' ? '/login' : '/register';

    // Client-side validation for registration
    if (mode === 'register') {
      const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!specialCharRegex.test(password)) {
        setError('Password must contain at least one special character.');
        return;
      }
    }

    try {
      const res = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.msg || 'Something went wrong.');
        setLoading(false);
        return;
      }

      if (mode === 'register') {
        setSuccess('Account created! You can now sign in.');
        setMode('login');
        setUsername('');
        setPassword('');
      } else {
        // Login success — store token + username
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('username', username.trim());
        connectSocket(data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Cannot reach server. Make sure backend is running on port 5001.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'var(--color-background-gradient)',
      minHeight: '100vh',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '48px 24px',
      color: 'var(--color-on-surface)',
    }}>

      {/* Brand + Tagline */}
      <div style={{ width: '100%', maxWidth: '480px', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{
            width: '52px', height: '52px',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)',
            borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(48,57,146,0.3)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#fff', fontVariationSettings: "'FILL' 1" }}>forum</span>
          </div>
          <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '28px', color: 'var(--color-primary)', letterSpacing: '-0.5px' }}>FluidChat</span>
        </div>

        <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '42px', lineHeight: 1.1, color: 'var(--color-on-surface)', marginBottom: '16px', letterSpacing: '-1px' }}>
          {mode === 'login' ? 'The architect of\nreal-time flow.' : 'Join the\nconversation.'}
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--color-on-surface-variant)', lineHeight: 1.6, margin: 0 }}>
          {mode === 'login'
            ? 'Designed for teams that value precision and breathable communication.'
            : 'Create your account and start connecting with your team in real-time.'}
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'var(--color-surface-container-low)',
        borderRadius: '28px',
        padding: '40px',
        boxShadow: '0px 12px 48px rgba(0,0,0,0.2)',
        border: '1px solid var(--color-outline-variant)',
      }}>
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '22px', color: 'var(--color-on-surface)', marginBottom: '6px' }}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            {mode === 'login' ? 'Enter your details to continue' : 'Fill in the details below to get started'}
          </p>
        </div>

        {/* Error / Success banners */}
        {error && (
          <div style={{ background: 'var(--color-error-container)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-error)', fontVariationSettings: "'FILL' 1" }}>error</span>
            <span style={{ fontSize: '13px', color: 'var(--color-on-error-container)', fontWeight: 600 }}>{error}</span>
          </div>
        )}
        {success && (
          <div style={{ background: 'var(--color-tertiary-container)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--color-tertiary-fixed)', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span style={{ fontSize: '13px', color: 'var(--color-tertiary-fixed)', fontWeight: 600 }}>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Username */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', background: 'var(--color-surface-container)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '14px', color: 'var(--color-on-surface)', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.background = 'var(--color-surface)'; e.target.style.boxShadow = '0 0 0 2px var(--color-primary)'; }}
              onBlur={e => { e.target.style.background = 'var(--color-surface-container)'; e.target.style.boxShadow = 'none'; }}
              required
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', background: 'var(--color-surface-container)', border: 'none', borderRadius: '12px', padding: '16px', fontSize: '14px', color: 'var(--color-on-surface)', outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.background = 'var(--color-surface)'; e.target.style.boxShadow = '0 0 0 2px var(--color-primary)'; }}
              onBlur={e => { e.target.style.background = 'var(--color-surface-container)'; e.target.style.boxShadow = 'none'; }}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {mode === 'register' && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: password.length >= 8 ? 'var(--color-tertiary-fixed)' : 'var(--color-on-surface-variant)', opacity: password.length >= 8 ? 1 : 0.6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{password.length >= 8 ? 'check_circle' : 'circle'}</span>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>At least 8 characters</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: /[!@#$%^&*(),.?":{}|<> ]/.test(password) ? 'var(--color-tertiary-fixed)' : 'var(--color-on-surface-variant)', opacity: /[!@#$%^&*(),.?":{}|<> ]/.test(password) ? 1 : 0.6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{/[!@#$%^&*(),.?":{}|<> ]/.test(password) ? 'check_circle' : 'circle'}</span>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>One special character (!@#$%^ etc.)</span>
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            id="submit-btn"
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? 'var(--color-outline)' : 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '14px',
              padding: '18px',
              fontSize: '16px',
              fontWeight: 700,
              fontFamily: "'Manrope', sans-serif",
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: loading ? 'none' : '0 8px 20px rgba(48,57,146,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-outline-variant)' }}></div>
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--color-outline-variant)' }}></div>
          </div>

          <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--color-on-surface-variant)', margin: 0 }}>
            {mode === 'login' ? "New to FluidChat? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError('');
                setSuccess('');
                setUsername('');
                setPassword('');
              }}
              style={{ color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: 0 }}
            >
              {mode === 'login' ? 'Create an Account' : 'Sign In'}
            </button>
          </p>
        </form>

        {/* Footer Meta */}
        <div style={{ marginTop: '36px', display: 'flex', justifyContent: 'center', gap: '28px' }}>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SignIn;
