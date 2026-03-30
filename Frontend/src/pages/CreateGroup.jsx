import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, getSocket } from '../socket';
import { BACKEND_URL } from '../socket';

const COLORS = ['#303992', '#8B5CF6', '#10B981', '#EF4444', '#F59E0B', '#6366F1', '#EC4899', '#14B8A6'];
const ICONS = ['group', 'tag', 'code', 'palette', 'school', 'work', 'sports_esports', 'music_note'];

const CreateGroup = () => {
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const username = sessionStorage.getItem('username');
  const token = sessionStorage.getItem('token');

  // Fetch all users on mount
  useEffect(() => {
    if (!token) { navigate('/'); return; }
    const socket = connectSocket(token);

    socket.emit('get_all_users');
    socket.on('all_users', (users) => {
      setAllUsers(users);
      setSearchResults(users);
    });

    socket.on('room_created', (room) => {
      setIsCreating(false);
      navigate('/dashboard');
    });

    return () => {
      socket.off('all_users');
      socket.off('room_created');
    };
  }, [token]);

  // Search users
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(allUsers);
    } else {
      const q = searchQuery.toLowerCase();
      setSearchResults(allUsers.filter(u => u.username.toLowerCase().includes(q)));
    }
  }, [searchQuery, allUsers]);

  const toggleUser = (user) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u.username === user.username);
      if (exists) return prev.filter(u => u.username !== user.username);
      return [...prev, user];
    });
  };

  const handleCreate = () => {
    setError('');
    if (!groupName.trim()) {
      setError('Please enter a room name.');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('Please select at least one participant.');
      return;
    }

    const socket = getSocket();
    if (!socket) return;

    setIsCreating(true);
    socket.emit('create_room', {
      name: groupName.trim(),
      participants: selectedUsers.map(u => u.username),
      type: 'group',
      icon: selectedIcon,
      color: selectedColor,
    });

    // Fallback timeout in case event doesn't come back
    setTimeout(() => {
      if (isCreating) {
        setIsCreating(false);
        navigate('/dashboard');
      }
    }, 3000);
  };

  return (
    <div style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: 'var(--color-surface)', backdropFilter: 'blur(14px)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ width: '38px', height: '38px', border: 'none', background: 'transparent', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>arrow_back</span>
          </button>
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '18px', color: 'var(--color-primary)', margin: 0 }}>Create New Room</h1>
        </div>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          style={{
            background: isCreating ? 'var(--color-outline)' : 'var(--color-primary)',
            color: '#fff', border: 'none', borderRadius: '12px',
            padding: '10px 22px', fontSize: '14px', fontWeight: 700,
            cursor: isCreating ? 'not-allowed' : 'pointer',
            fontFamily: "'Manrope', sans-serif",
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          {isCreating ? (
            <><span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span> Creating...</>
          ) : 'Create Room'}
        </button>
      </header>

      <main style={{ paddingTop: '68px', paddingBottom: '90px', maxWidth: '560px', margin: '0 auto' }}>

        {/* Error */}
        {error && (
          <div style={{ margin: '16px 20px 0', background: '#ffdad6', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ba1a1a', fontVariationSettings: "'FILL' 1" }}>error</span>
            <span style={{ fontSize: '13px', color: '#93000a', fontWeight: 600 }}>{error}</span>
          </div>
        )}

        {/* Group Identity */}
        <section style={{ background: 'var(--color-surface-container)', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          {/* Room icon preview */}
          <div style={{
            width: '96px', height: '96px', borderRadius: '24px',
            background: `${selectedColor}18`, border: `2px solid ${selectedColor}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '42px', color: selectedColor, fontVariationSettings: "'FILL' 1" }}>{selectedIcon}</span>
          </div>

          {/* Room name */}
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>Room Name</label>
            <input
              type="text"
              placeholder="Enter a name for your room..."
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              style={{ width: '100%', background: 'var(--color-surface)', border: 'none', borderRadius: '14px', padding: '16px', fontSize: '14px', color: 'var(--color-on-surface)', outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
            />
          </div>

          {/* Color picker */}
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#454652', marginBottom: '8px' }}>Room Color</label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: c, cursor: 'pointer',
                    border: selectedColor === c ? '3px solid #191c1e' : '3px solid transparent',
                    boxShadow: selectedColor === c ? '0 0 0 2px #fff, 0 0 0 4px ' + c : 'none',
                    transition: 'all 0.2s',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Icon picker */}
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: '8px' }}>Room Icon</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ICONS.map(ic => (
                <div
                  key={ic}
                  onClick={() => setSelectedIcon(ic)}
                  style={{
                    width: '44px', height: '44px', borderRadius: '12px',
                    background: selectedIcon === ic ? selectedColor : 'var(--color-surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: selectedIcon === ic ? `0 4px 12px ${selectedColor}40` : '0 1px 4px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '22px', color: selectedIcon === ic ? '#fff' : 'var(--color-on-surface-variant)' }}>{ic}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Selected Participants */}
        {selectedUsers.length > 0 && (
          <section style={{ padding: '24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '18px', color: 'var(--color-primary)', margin: 0 }}>Selected Participants</h2>
              <span style={{ background: 'var(--color-surface-container-high)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>{selectedUsers.length} Selected</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {selectedUsers.map((u) => (
                <div
                  key={u.username}
                  onClick={() => toggleUser(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--color-primary-container)', borderRadius: '20px',
                    padding: '6px 12px 6px 6px', cursor: 'pointer',
                    border: '1px solid var(--color-outline-variant)',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: `hsl(${(u.username.charCodeAt(0) * 37) % 360}, 60%, 50%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: '#fff',
                  }}>
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-primary-container)' }}>{u.username}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--color-on-surface-variant)' }}>close</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Search + User List */}
        <section style={{ padding: '0 20px 24px' }}>
          <div style={{ position: 'relative', marginBottom: '20px', marginTop: selectedUsers.length === 0 ? '24px' : '0' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '20px', color: 'var(--color-on-surface-variant)' }}>search</span>
            <input
              type="text"
              placeholder="Search users to add..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ width: '100%', background: 'var(--color-surface-container-high)', border: 'none', borderRadius: '20px', padding: '16px 16px 16px 48px', fontSize: '14px', color: 'var(--color-on-surface)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#454652', marginBottom: '12px' }}>
            {searchQuery ? `Results (${searchResults.length})` : `All Users (${allUsers.length})`}
          </p>

          {searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#757684' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', marginBottom: '8px', display: 'block' }}>person_search</span>
              <p style={{ fontSize: '14px', margin: 0 }}>No users found</p>
            </div>
          )}

          <div style={{ background: '#f2f4f6', borderRadius: '20px', overflow: 'hidden' }}>
            {searchResults.map((u, i) => {
              const isSelected = selectedUsers.some(s => s.username === u.username);
              return (
                <div
                  key={u.username}
                  onClick={() => toggleUser(u)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px',
                    background: isSelected ? 'rgba(48,57,146,0.05)' : 'transparent',
                    borderBottom: i < searchResults.length - 1 ? '1px solid rgba(197,197,212,0.15)' : 'none',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ position: 'relative' }}>
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: `hsl(${(u.username.charCodeAt(0) * 37) % 360}, 60%, 50%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '18px', color: '#fff',
                      }}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      {isSelected && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(48,57,146,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#fff', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '14px', color: isSelected ? 'var(--color-primary)' : 'var(--color-on-surface)', margin: '0 0 2px' }}>{u.username}</p>
                      <p style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', margin: 0 }}>{u.bio || 'FluidChat User'}</p>
                    </div>
                  </div>

                  {isSelected ? (
                    <div style={{ width: '24px', height: '24px', background: 'var(--color-primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#fff', fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                  ) : (
                    <div style={{ width: '24px', height: '24px', border: '2px solid var(--color-outline-variant)', borderRadius: '50%', flexShrink: 0 }}></div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--color-surface)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--color-outline-variant)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: '72px', zIndex: 50,
      }}>
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', background: 'transparent', border: 'none' }} onClick={() => navigate('/dashboard')}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-on-surface-variant)' }}>chat_bubble</span>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Chats</span>
        </button>
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', background: 'var(--color-primary-container)', border: 'none' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-primary)', fontVariationSettings: "'FILL' 1" }}>group</span>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-primary)' }}>Rooms</span>
        </button>
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', background: 'transparent', border: 'none' }} onClick={() => navigate('/settings')}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-on-surface-variant)' }}>settings</span>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Settings</span>
        </button>
      </nav>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CreateGroup;
