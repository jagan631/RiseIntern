import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, getSocket, disconnectSocket } from '../socket';



const Dashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All Chats');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({}); // { room: count }
  const socketRef = useRef(null);

  const username = sessionStorage.getItem('username') || 'Guest';
  const token = sessionStorage.getItem('token');

  useEffect(() => {
    if (!token) { navigate('/'); return; }

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      // console.log('Dashboard: Socket connected');
      socket.emit('get_online_users');
      socket.emit('get_rooms');
      socket.emit('get_chat_history');
      socket.emit('get_unread_counts');
      // Join a private room to receive real-time updates for notifications
      socket.emit('join_room', `user_${username}`);
    });

    socket.on('online_users', (users) => {
      setOnlineUsers(users);
    });

    // Real-time unread count updates from server
    socket.on('unread_counts', (counts) => {
      // console.log('Received unread counts:', counts);
      setUnreadCounts(counts);
    });

    socket.on('new_message_notification', (msg) => {
      // console.log('New global message notification:', msg);
      socket.emit('get_chat_history');
      // Server will also push updated unread_counts automatically
    });

    socket.on('refresh_chat_history', () => {
      socket.emit('get_chat_history');
      socket.emit('get_rooms');
    });

    socket.on('room_created', () => {
      socket.emit('get_rooms');
      socket.emit('get_chat_history');
    });

    socket.on('rooms_list', ({ rooms }) => {
      const dynamicRooms = rooms.map(r => ({
        id: r.name,
        name: r.name,
        type: r.type || 'group',
        icon: r.icon || 'tag',
        color: r.color || '#303992'
      }));
      setChatHistory(prev => {
        const next = [...prev];
        dynamicRooms.forEach(dr => {
          const idx = next.findIndex(n => n.id === dr.id || n.name === dr.name);
          if (idx === -1) next.push(dr);
          else next[idx] = { ...next[idx], ...dr };
        });
        return next;
      });
    });

    socket.on('chat_history', (history) => {
      // history is array of { _id, lastMessageAt, lastMessageText, lastMessageUser }
      const mappedRooms = history.map(h => {
        const isDM = h._id.includes('-');
        if (isDM) {
          const target = h._id.split('-').find(u => u !== username) || 'Unknown';
          return { id: h._id, name: target, type: 'dm', icon: 'person', color: '#10B981', lastMsg: h.lastMessageText, lastAt: h.lastMessageAt, lastUser: h.lastMessageUser };
        } else {
          return { id: h._id, name: h._id, icon: 'tag', color: '#303992', type: 'group', lastMsg: h.lastMessageText, lastAt: h.lastMessageAt, lastUser: h.lastMessageUser };
        }
      });
      setChatHistory(prev => {
        const next = [...prev];
        mappedRooms.forEach(mr => {
          const idx = next.findIndex(n => n.id === mr.id || n.name === mr.name);
          if (idx === -1) next.push(mr);
          else next[idx] = { ...next[idx], ...mr };
        });
        return next;
      });
    });

    socket.emit('get_online_users');
    socket.emit('get_rooms');
    socket.emit('get_chat_history');
    socket.emit('get_unread_counts');

    socket.on('connect_error', (err) => {
      // console.error('Socket connection error:', err.message);
      if (err.message.includes('Unauthorized')) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('username');
        navigate('/');
      }
    });

    return () => {
      socket.off('connect');
      socket.off('online_users');
      socket.off('chat_history');
      socket.off('rooms_list');
      socket.off('room_created');
      socket.off('unread_counts');
      socket.off('new_message_notification');
      socket.off('refresh_chat_history');
      socket.off('connect_error');
    };
  }, []);

  const handleLogout = () => {
    disconnectSocket();
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    navigate('/');
  };

  const handleRoomClick = (roomId) => {
    navigate(`/chat/${roomId}`);
  };

  // Use chatHistory directly as it now contains all server-provided rooms
  const allRooms = [...chatHistory];

  // Sort by latest message date
  allRooms.sort((a, b) => {
    const dateA = a.lastAt ? new Date(a.lastAt) : new Date(0);
    const dateB = b.lastAt ? new Date(b.lastAt) : new Date(0);
    return dateB - dateA;
  });

  const filteredRooms = allRooms.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'All Chats' || (activeTab === 'Groups' && r.type === 'group');
    return matchesSearch && matchesTab;
  });

  const onlineCount = onlineUsers.filter(u => u.username !== username && u.isOnline).length;
  const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);

  return (
    <div style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--color-surface)', backdropFilter: 'blur(14px)',
        padding: '12px 20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', boxShadow: '0 1px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)',
            borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(48,57,146,0.25)',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#fff', fontVariationSettings: "'FILL' 1" }}>forum</span>
          </div>
          <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--color-primary)', letterSpacing: '-0.3px' }}>FluidChat</span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={handleLogout}
            style={{ width: '38px', height: '38px', border: 'none', background: 'transparent', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)', transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(186,26,26,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            title="Logout"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>logout</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <main style={{ paddingTop: '72px', paddingBottom: '96px', padding: '72px 16px 96px' }}>

        {/* Bento Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
          {/* Blue welcome card */}
          <div style={{
            background: 'linear-gradient(160deg, #303992 0%, #4851ab 100%)',
            borderRadius: '20px', padding: '24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px',
          }}>
            <div>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'rgba(255,255,255,0.6)', fontVariationSettings: "'FILL' 1" }}>waving_hand</span>
            </div>
            <div>
              <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '17px', color: '#fff', margin: '0 0 4px', lineHeight: 1.3 }}>
                Hey, {username}!
              </h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', margin: 0, fontWeight: 500 }}>
                {totalUnread > 0
                  ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}`
                  : (onlineCount > 0 ? `${onlineCount} user${onlineCount > 1 ? 's' : ''} online` : 'No one else online')}
              </p>
            </div>
          </div>
          {/* Online users card */}
          <div style={{ background: '#6ffbbe', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#002113', fontVariationSettings: "'FILL' 1" }}>group</span>
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(0,104,70,0.15)', color: '#002113', padding: '3px 8px', borderRadius: '6px' }}>Live</span>
            </div>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(0,33,19,0.6)', margin: '0 0 4px' }}>Online Now</p>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '24px', color: '#002113', margin: 0 }}>
                {onlineUsers.filter(u => u.isOnline).length}
              </p>
            </div>
          </div>
        </div>

        {/* Online Users Strip */}
        {onlineUsers.filter(u => u.isOnline).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#757684', marginBottom: '10px' }}>Active Members</p>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {onlineUsers.filter(u => u.isOnline).map((uObj, i) => {
                const u = uObj.username;
                const isMe = u === username;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <div
                      onClick={() => !isMe && navigate(`/chat/${[username, u].sort().join('-')}`)}
                      style={{ position: 'relative', cursor: isMe ? 'default' : 'pointer' }}
                    >
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '15px',
                        background: `hsl(${(u.charCodeAt(0) * 37) % 360}, 60%, 50%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '16px', color: '#fff',
                        border: isMe ? '2.5px solid #303992' : '2.5px solid transparent',
                      }}>
                        {u.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', background: '#6ffbbe', border: '2px solid #f7f9fb', borderRadius: '50%' }}></div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#454652', maxWidth: '48px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {isMe ? 'You' : u}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: 'var(--color-outline)' }}>search</span>
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', background: 'var(--color-surface)', border: 'none', borderRadius: '14px', padding: '13px 16px 13px 42px', fontSize: '14px', color: 'var(--color-on-surface)', outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}
          />
        </div>

        {/* Tabs */}
        <div style={{ background: 'var(--color-surface-container)', borderRadius: '14px', padding: '4px', display: 'flex', gap: '4px', marginBottom: '20px' }}>
          {['All Chats', 'Groups'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: '10px 0', border: 'none',
                background: activeTab === tab ? 'var(--color-surface)' : 'transparent',
                borderRadius: '10px',
                fontSize: '13px', fontWeight: 600,
                color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                cursor: 'pointer',
                boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Room List */}
        <div>
          {filteredRooms.map(room => {
            const isDM = room.type === 'dm';
            const userData = isDM ? onlineUsers.find(u => u.username === room.name) : null;
            const isOnlineInRoom = isDM
              ? !!userData?.isOnline
              : onlineUsers.some(u => u.username !== username && u.isOnline);
            const roomUnread = unreadCounts[room.id] || 0;
            return (
              <div
                key={room.id}
                id={`room-${room.id}`}
                onClick={() => handleRoomClick(room.id)}
                style={{
                  background: 'var(--color-surface-container-low)', borderRadius: '16px', padding: '16px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  cursor: 'pointer', transition: 'all 0.15s', marginBottom: '10px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(48,57,146,0.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '54px', height: '54px', borderRadius: '14px',
                    background: `${room.color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `2px solid ${room.color}22`,
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: room.color, fontVariationSettings: "'FILL' 1" }}>{room.icon}</span>
                  </div>
                  {isOnlineInRoom && (
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '14px', height: '14px', background: '#6ffbbe', border: '2px solid #fff', borderRadius: '50%' }}></div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '15px', color: 'var(--color-on-surface)' }}>
                      #{room.name}
                    </span>
                    {room.lastAt && (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: roomUnread > 0 ? 'var(--color-primary)' : 'var(--color-on-surface-variant)', flexShrink: 0 }}>
                        {new Date(room.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: '13px', color: roomUnread > 0 ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)', margin: 0, fontWeight: roomUnread > 0 ? 600 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, marginRight: '8px' }}>
                      {isDM
                        ? (userData?.isOnline ? 'Online' : (userData?.lastSeen ? `Last seen ${new Date(userData.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Tap to start chatting'))
                        : (room.lastMsg
                          ? (room.lastUser ? `${room.lastUser === username ? 'You' : room.lastUser}: ${room.lastMsg}` : room.lastMsg)
                          : 'Tap to join room')}
                    </p>
                    {/* ── UNREAD BADGE ── */}
                    {roomUnread > 0 && (
                      <div style={{
                        minWidth: '22px', height: '22px', borderRadius: '11px',
                        background: 'linear-gradient(135deg, #303992 0%, #4851ab 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 6px', flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(48,57,146,0.3)',
                        animation: 'badgePop 0.3s ease-out',
                      }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
                          {roomUnread > 99 ? '99+' : roomUnread}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#c5c5d4' }}>chevron_right</span>
              </div>
            );
          })}
        </div>
      </main>

      {/* FAB */}
      <button
        id="fab-new-room"
        onClick={() => navigate('/create-group')}
        style={{
          position: 'fixed', right: '20px', bottom: '84px',
          width: '56px', height: '56px',
          background: 'linear-gradient(135deg, #303992 0%, #4851ab 100%)',
          borderRadius: '50%', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', boxShadow: '0 8px 24px rgba(48,57,146,0.35)',
          transition: 'transform 0.2s', zIndex: 40,
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '26px', color: '#fff', fontVariationSettings: "'FILL' 1" }}>add_comment</span>
      </button>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--color-surface)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--color-outline-variant)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: '72px', zIndex: 50,
      }}>
        <button
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', background: 'rgba(48,57,146,0.12)', border: 'none', position: 'relative' }}
          onClick={() => navigate('/dashboard')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-primary)', fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-primary)' }}>Chats</span>
          {/* Total unread badge on nav */}
          {totalUnread > 0 && (
            <div style={{
              position: 'absolute', top: '2px', right: '6px',
              minWidth: '16px', height: '16px', borderRadius: '8px',
              background: 'var(--color-error)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 4px',
            }}>
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#fff' }}>
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            </div>
          )}
        </button>
        <button
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', background: 'transparent', border: 'none' }}
          onClick={() => navigate('/create-group')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-on-surface-variant)' }}>group</span>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Rooms</span>
        </button>
        <button
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', background: 'transparent', border: 'none' }}
          onClick={() => navigate('/settings')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '24px', color: 'var(--color-on-surface-variant)' }}>settings</span>
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>Settings</span>
        </button>
      </nav>

      {/* Badge animation */}
      <style>{`
        @keyframes badgePop {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
