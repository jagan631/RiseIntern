import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { disconnectSocket } from '../socket';
import { BACKEND_URL } from '../socket';

const Settings = () => {
  const navigate = useNavigate();
  const username = sessionStorage.getItem('username') || 'Guest User';
  const token = sessionStorage.getItem('token');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'System');

  // Apply theme transformation
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (t) => {
      if (t === 'Dark') {
        root.classList.add('dark');
      } else if (t === 'Light') {
        root.classList.remove('dark');
      } else {
        // System preference
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.toggle('dark', isDark);
      }
    };
    applyTheme(theme);
    localStorage.setItem('theme', theme);

    // Listen for system theme changes if in 'System' mode
    if (theme === 'System') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e) => root.classList.toggle('dark', e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);
  const [toggleState, setToggleState] = useState({
    message_notifications: true,
    group_notifications: false,
    last_seen_visibility: true,
    read_receipts_toggle: true,
  });
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load user profile settings on mount
  useEffect(() => {
    if (!token) return;
    fetch(`${BACKEND_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.showLastSeen !== undefined) {
          setToggleState(prev => ({
            ...prev,
            last_seen_visibility: data.showLastSeen,
            read_receipts_toggle: data.allowReadReceipts ?? true,
          }));
        }
      })
      .catch(() => {});
  }, [token]);

  const handleToggle = async (key) => {
    const newVal = !toggleState[key];
    setToggleState(prev => ({ ...prev, [key]: newVal }));

    // Persist privacy settings to backend
    if (key === 'last_seen_visibility') {
      fetch(`${BACKEND_URL}/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ showLastSeen: newVal }),
      }).catch(() => {});
    }
    if (key === 'read_receipts_toggle') {
      fetch(`${BACKEND_URL}/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ allowReadReceipts: newVal }),
      }).catch(() => {});
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg('');
    if (!currentPassword || !newPassword) {
      setPasswordMsg('Please fill in both fields.');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg('New password must be at least 4 characters.');
      return;
    }
    setIsChangingPassword(true);
    try {
      const res = await fetch(`${BACKEND_URL}/user/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordMsg('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setTimeout(() => setPasswordModal(false), 1500);
      } else {
        setPasswordMsg(data.msg || 'Failed to change password.');
      }
    } catch {
      setPasswordMsg('Cannot reach server.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    navigate('/');
  };

  return (
    <div style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)', fontFamily: "'Inter', sans-serif", minHeight: '100vh', paddingBottom: '100px' }}>

      {/* TopAppBar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--color-surface)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-primary)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>arrow_back</span>
          </button>
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--color-on-surface)', margin: 0 }}>Settings</h1>
        </div>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Profile Card Redirect */}
        <section 
          onClick={() => navigate('/profile')}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderRadius: '20px', background: 'var(--color-primary)', color: 'var(--color-on-primary)', cursor: 'pointer', boxShadow: '0 8px 24px rgba(48,57,146,0.15)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '22px', color: '#fff', border: '2px solid rgba(255,255,255,0.2)' }}>
              {username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '18px', margin: '0 0 4px' }}>{username}</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>Tap to edit profile details</p>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ color: 'var(--color-on-primary)' }}>arrow_forward_ios</span>
        </section>

        {/* Account Details */}
        <SettingsGroup label="Account Settings">
          <SettingsRow icon="password" title="Change Password" sub="Update your security info" onClick={() => setPasswordModal(true)} />
        </SettingsGroup>

        {/* Notifications */}
        <SettingsGroup label="Notifications">
          <ToggleRow icon="chat" title="Message Notifications" active={toggleState.message_notifications} onToggle={() => handleToggle('message_notifications')} />
          <ToggleRow icon="groups" title="Group Notifications" active={toggleState.group_notifications} onToggle={() => handleToggle('group_notifications')} />
        </SettingsGroup>

        {/* Privacy */}
        <SettingsGroup label="Privacy">
          <ToggleRow icon="visibility" title="Last Seen Visibility" active={toggleState.last_seen_visibility} onToggle={() => handleToggle('last_seen_visibility')} sub="Show when you were last online" />
          <ToggleRow icon="done_all" title="Read Receipts" active={toggleState.read_receipts_toggle} onToggle={() => handleToggle('read_receipts_toggle')} sub="Let others know you've read messages" />
        </SettingsGroup>

        {/* Appearance */}
        <SettingsGroup label="Appearance">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(197,197,212,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
              <div style={iconBox}><span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#303992' }}>palette</span></div>
              <p style={rowTitle}>Theme Engine</p>
            </div>
          <div style={{ background: 'var(--color-surface-container)', borderRadius: '12px', padding: '4px' }}>
            {['Light', 'Dark', 'System'].map(t => (
              <button key={t} onClick={() => setTheme(t)} style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: theme === t ? 'var(--color-surface)' : 'transparent', color: theme === t ? 'var(--color-primary)' : 'var(--color-on-surface-variant)', boxShadow: theme === t ? '0 2px 4px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}>
                {t}
              </button>
            ))}
          </div>
          </div>
        </SettingsGroup>

        {/* Logout */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '12px' }}>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ba1a1a', border: 'none', background: 'transparent', fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', padding: '14px 32px', borderRadius: '16px', cursor: 'pointer', transition: 'background 0.2s' }}>
            <span className="material-symbols-outlined">logout</span> Log Out
          </button>
        </div>
      </main>

      {/* Password Change Modal */}
      {passwordModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{ flex: 1 }} onClick={() => setPasswordModal(false)}></div>
          <div style={{ background: 'var(--color-surface)', borderRadius: '24px 24px 0 0', padding: '24px 20px 32px', boxShadow: '0 -8px 24px rgba(0,0,0,0.3)', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--color-on-surface)', fontFamily: "'Manrope', sans-serif" }}>Change Password</h3>
              <button onClick={() => setPasswordModal(false)} style={{ background: 'var(--color-surface-container)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-on-surface-variant)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            {passwordMsg && (
              <div style={{
                background: passwordMsg.includes('success') ? '#d4f2e5' : '#ffdad6',
                borderRadius: '12px', padding: '12px 16px', marginBottom: '16px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: passwordMsg.includes('success') ? '#006846' : '#ba1a1a', fontVariationSettings: "'FILL' 1" }}>
                  {passwordMsg.includes('success') ? 'check_circle' : 'error'}
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: passwordMsg.includes('success') ? '#006846' : '#93000a' }}>{passwordMsg}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>Current Password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" style={{ width: '100%', background: 'var(--color-surface-container)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', color: 'var(--color-on-surface)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>New Password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" style={{ width: '100%', background: 'var(--color-surface-container)', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '14px', color: 'var(--color-on-surface)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                style={{
                  width: '100%', background: isChangingPassword ? '#8f909e' : 'linear-gradient(135deg, #303992 0%, #4851ab 100%)',
                  color: '#fff', border: 'none', borderRadius: '14px', padding: '16px',
                  fontSize: '15px', fontWeight: 700, fontFamily: "'Manrope', sans-serif",
                  cursor: isChangingPassword ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 8px 20px rgba(48,57,146,0.3)',
                }}
              >
                {isChangingPassword ? (
                  <><span className="material-symbols-outlined" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>progress_activity</span> Updating...</>
                ) : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--color-surface)', backdropFilter: 'blur(16px)', borderTop: '1px solid var(--color-outline-variant)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', height: '72px', zIndex: 50 }}>
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', background: 'transparent', border: 'none' }} onClick={() => navigate('/dashboard')}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-on-surface-variant)' }}>chat_bubble</span>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Chats</span>
        </button>
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', background: 'transparent', border: 'none' }} onClick={() => navigate('/create-group')}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-on-surface-variant)' }}>group</span>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Rooms</span>
        </button>
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', background: 'var(--color-primary-container)', border: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-primary)', fontVariationSettings: "'FILL' 1" }}>settings</span>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-primary)' }}>Settings</span>
        </button>
      </nav>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

/* Helper Sub-Components */
const iconBox = { width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(48,57,146,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const rowTitle = { fontWeight: 700, fontSize: '15px', color: 'var(--color-on-surface)', margin: '0 0 2px' };
const rowSub = { fontSize: '12px', color: 'var(--color-on-surface-variant)', margin: 0, fontWeight: 500 };

const SettingsGroup = ({ label, children }) => (
  <div style={{ background: 'var(--color-surface-container-low)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
    <div style={{ padding: '16px 20px 8px' }}>
      <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-primary)' }}>{label}</span>
    </div>
    <div>{children}</div>
  </div>
);

const SettingsRow = ({ icon, title, sub, badge, danger, divider = true, onClick }) => (
  <div onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: divider ? '1px solid var(--color-outline-variant)' : 'none', cursor: 'pointer', boxSizing: 'border-box' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ ...iconBox, background: danger ? 'rgba(dora1a1a,0.12)' : iconBox.background }}>
        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: danger ? 'var(--color-error)' : 'var(--color-primary)' }}>{icon}</span>
      </div>
      <div style={{ textAlign: 'left' }}>
        <p style={{ ...rowTitle, color: danger ? 'var(--color-error)' : 'var(--color-on-surface)' }}>{title}</p>
        {sub && <p style={rowSub}>{sub}</p>}
      </div>
    </div>
    {badge ? (
      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-on-surface-variant)', background: 'var(--color-surface-container-high)', padding: '4px 10px', borderRadius: '8px' }}>{badge}</span>
    ) : (
      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-on-surface-variant)' }}>chevron_right</span>
    )}
  </div>
);

const ToggleRow = ({ icon, title, sub, active, onToggle, divider = true }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: divider ? '1px solid var(--color-outline-variant)' : 'none' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={iconBox}><span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-primary)' }}>{icon}</span></div>
      <div>
        <p style={rowTitle}>{title}</p>
        {sub && <p style={rowSub}>{sub}</p>}
      </div>
    </div>
    <div onClick={onToggle} style={{ width: '48px', height: '28px', borderRadius: '14px', background: active ? 'var(--color-primary)' : 'var(--color-outline-variant)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: '3px', left: active ? '23px' : '3px', width: '22px', height: '22px', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div>
    </div>
  </div>
);

export default Settings;
