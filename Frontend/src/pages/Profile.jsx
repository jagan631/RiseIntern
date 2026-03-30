import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { disconnectSocket } from '../socket';
import { BACKEND_URL } from '../socket';

const Profile = () => {
  const navigate = useNavigate();
  const [name] = useState(sessionStorage.getItem('username') || 'Guest User');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const token = sessionStorage.getItem('token');

  // Load profile on mount
  useEffect(() => {
    if (!token) { navigate('/'); return; }
    fetch(`${BACKEND_URL}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.bio !== undefined) setBio(data.bio);
      })
      .catch(() => {});
  }, [token]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch(`${BACKEND_URL}/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bio }),
      });
      if (res.ok) {
        setSaveMsg('Profile saved!');
        setTimeout(() => setSaveMsg(''), 3000);
      } else {
        const data = await res.json();
        setSaveMsg(data.msg || 'Failed to save');
      }
    } catch {
      setSaveMsg('Cannot reach server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    navigate('/');
  };

  return (
    <div style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)', fontFamily: "'Inter', sans-serif", minHeight: '100vh', paddingBottom: '90px', overflowX: 'hidden' }}>
      
      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'var(--color-surface)', backdropFilter: 'blur(12px)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', border: 'none', background: 'var(--color-primary-container)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-primary)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>arrow_back</span>
        </button>
        <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '18px', color: 'var(--color-primary)' }}>Edit Profile</span>
        <button
          onClick={handleSave}
          disabled={isSaving}
          style={{
            background: 'none', border: 'none',
            color: isSaving ? 'var(--color-on-surface-variant)' : 'var(--color-primary)',
            fontWeight: 700, fontSize: '14px', cursor: isSaving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          {isSaving ? (
            <><span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span> Saving</>
          ) : 'Save'}
        </button>
      </header>

      {/* Banner & Avatar */}
      <div style={{ position: 'relative', height: '180px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)', marginTop: '68px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle at 20px 20px, #ffffff 2px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        
        {/* Avatar */}
        <div style={{ position: 'absolute', bottom: '-45px', width: '100px', height: '100px', borderRadius: '50%', padding: '4px', background: 'var(--color-background)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: `hsl(${(name.charCodeAt(0) * 37) % 360}, 60%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 800, color: '#fff' }}>
            {name.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Details Form */}
      <main style={{ padding: '64px 24px 24px', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Save confirmation */}
        {saveMsg && (
          <div style={{
            background: saveMsg.includes('saved') ? '#d4f2e5' : '#ffdad6',
            borderRadius: '12px', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: saveMsg.includes('saved') ? '#006846' : '#ba1a1a', fontVariationSettings: "'FILL' 1" }}>
              {saveMsg.includes('saved') ? 'check_circle' : 'error'}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: saveMsg.includes('saved') ? '#006846' : '#93000a' }}>{saveMsg}</span>
          </div>
        )}

        {/* Username (read-only) */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Username</label>
          <div style={{ width: '100%', padding: '16px', borderRadius: '14px', background: 'var(--color-surface-container)', fontSize: '15px', color: 'var(--color-on-surface-variant)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px', boxSizing: 'border-box' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock</span> {name}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Bio</label>
          <textarea
            rows={3}
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell the world about yourself..."
            style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--color-surface)', fontSize: '14px', color: 'var(--color-on-surface)', lineHeight: 1.5, resize: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', outline: 'none', boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)', margin: '4px 0 0', textAlign: 'right' }}>{bio.length}/200</p>
        </div>

        {/* Logout */}
        <button onClick={handleLogout} style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', background: 'rgba(186,26,26,0.08)', color: '#ba1a1a', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>logout</span> Sign Out
        </button>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Profile;
