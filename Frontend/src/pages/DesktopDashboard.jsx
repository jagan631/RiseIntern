import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, getSocket, disconnectSocket } from '../socket';

const ROOMS_PLACEHOLDER = [];

const DesktopDashboard = () => {
  const navigate = useNavigate();
  const [selectedRoom, setSelectedRoom] = useState({ id: 'general', name: 'General', icon: 'tag', color: '#303992' });
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentRoomRef = useRef(selectedRoom.id);
  const isTabVisible = useRef(true);

  const username = sessionStorage.getItem('username') || 'Guest';
  const token = sessionStorage.getItem('token');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const markSeen = useCallback((msgs, roomId) => {
    if (!isTabVisible.current) return;
    const socket = getSocket();
    if (!socket) return;
    
    // Batch updates to prevent DDoS
    const unseenIds = msgs
      .filter(m => m.username !== username && !m.seen)
      .map(m => m._id)
      .slice(0, 20);

    unseenIds.forEach(id => {
      socket.emit('message_seen', { messageId: id, room: roomId });
    });
  }, [username]);

  useEffect(() => {
    if (!token) { navigate('/'); return; }
    const socket = connectSocket(token);

    // Store timeouts per user to prevent flickering
    const typingTimeouts = {};

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('get_online_users');
      socket.emit('get_rooms');
      socket.emit('get_chat_history');
      socket.emit('join_room', currentRoomRef.current);
      // Join the private room for Global Notifications
      socket.emit('join_room', `user_${username}`);
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleOnlineUsers = (u) => setOnlineUsers(u);
    const handleNotification = () => socket.emit('get_chat_history');
    const handleChatHistory = (history) => {
      const mappedRooms = history.map(h => {
        const isDM = h._id.includes('-');
        if (isDM) {
          const target = h._id.split('-').find(u => u !== username) || 'Unknown';
          return { id: h._id, name: target, type: 'dm', icon: 'person', color: '#10B981', lastMsg: h.lastMessageText, lastAt: h.lastMessageAt };
        } else {
          return { id: h._id, name: h._id, icon: 'tag', color: '#303992', type: 'group', lastMsg: h.lastMessageText, lastAt: h.lastMessageAt };
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
    };

    const handleRoomsList = ({ rooms }) => {
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
    };

    const handleRoomCreated = () => {
      socket.emit('get_rooms');
      socket.emit('get_chat_history');
    };
    const handleLoadMessages = (msgs) => {
      setMessages(msgs);
      setTimeout(() => scrollToBottom(), 100);
      setTimeout(() => markSeen(msgs, currentRoomRef.current), 400);
    };
    const handleReceive = (m) => {
      setMessages(prev => {
        if (prev.find(x => x._id === m._id)) return prev;
        return [...prev, m];
      });
      setTimeout(() => scrollToBottom(), 100);
      if (isTabVisible.current && m.username !== username) {
        setTimeout(() => {
          socket.emit('message_seen', { messageId: m._id, room: currentRoomRef.current });
        }, 300);
      }
    };
    const handleTyping = (data) => {
      if (data.username === username) return;
      setTypingUsers(prev => prev.includes(data.username) ? prev : [...prev, data.username]);
      
      if (typingTimeouts[data.username]) clearTimeout(typingTimeouts[data.username]);
      typingTimeouts[data.username] = setTimeout(() => setTypingUsers(prev => prev.filter(u => u !== data.username)), 3000);
    };
    const handleSeenUpdate = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, seen: true } : m));
    };

    if (socket.connected) {
      handleConnect();
      socket.emit('get_online_users');
      socket.emit('get_rooms');
      socket.emit('get_chat_history');
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('online_users', handleOnlineUsers);
    socket.on('chat_history', handleChatHistory);
    socket.on('rooms_list', handleRoomsList);
    socket.on('room_created', handleRoomCreated);
    socket.on('new_message_notification', handleNotification);
    socket.on('refresh_chat_history', handleNotification);
    socket.on('load_messages', handleLoadMessages);
    socket.on('receive_message', handleReceive);
    socket.on('typing', handleTyping);
    socket.on('message_seen_update', handleSeenUpdate);

    const handleVis = () => { isTabVisible.current = !document.hidden; };
    document.addEventListener('visibilitychange', handleVis);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('online_users', handleOnlineUsers);
      socket.off('chat_history', handleChatHistory);
      socket.off('rooms_list', handleRoomsList);
      socket.off('room_created', handleRoomCreated);
      socket.off('new_message_notification', handleNotification);
      socket.off('refresh_chat_history', handleNotification);
      socket.off('load_messages', handleLoadMessages);
      socket.off('receive_message', handleReceive);
      socket.off('typing', handleTyping);
      socket.off('message_seen_update', handleSeenUpdate);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [token]);

  const switchRoom = (room) => {
    const socket = getSocket();
    if (!socket) return;
    if (currentRoomRef.current) socket.emit('leave_room', currentRoomRef.current);
    currentRoomRef.current = room.id;
    setSelectedRoom(room);
    setMessages([]);
    setTypingUsers([]);
    socket.emit('join_room', room.id);
  };

  const handleSend = () => {
    const trimmed = msg.trim();
    if (!trimmed || isSending) return;
    const socket = getSocket();
    if (!socket || !socket.connected) return;
    setIsSending(true);
    socket.emit('send_message', {
      room: currentRoomRef.current,
      message: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setMsg('');
    setTimeout(() => setIsSending(false), 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const emitTyping = () => {
    const socket = getSocket();
    if (socket && socket.connected) socket.emit('typing', { room: currentRoomRef.current });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const handleLogout = () => {
    disconnectSocket();
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    navigate('/');
  };

  const formatTime = (m) => {
    if (m.time) return m.time;
    if (m.createdAt) return new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return '';
  };

  // Use chatHistory directly as it now contains all server-provided rooms
  const allRooms = [...chatHistory];
  allRooms.sort((a, b) => {
    const dateA = a.lastAt ? new Date(a.lastAt) : new Date(0);
    const dateB = b.lastAt ? new Date(b.lastAt) : new Date(0);
    return dateB - dateA;
  });

  return (
    <div style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)', fontFamily: "'Inter', sans-serif", height: '100vh', display: 'flex', overflow: 'hidden' }}>

      {/* ── Far-left icon rail ── */}
      <aside style={{ width: '72px', background: 'var(--color-surface-container-lowest)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: '16px', flexShrink: 0, zIndex: 10 }}>
        {/* Logo */}
        <div
          style={{ width: '46px', height: '46px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(48,57,146,0.3)' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#fff', fontVariationSettings: "'FILL' 1" }}>forum</span>
        </div>
        <div style={{ width: '32px', height: '1.5px', background: 'var(--color-outline-variant)', borderRadius: '2px' }}></div>

        {/* Nav items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', alignItems: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
            <div style={{ position: 'absolute', left: 0, width: '3px', height: '32px', background: 'var(--color-primary)', borderRadius: '0 4px 4px 0' }}></div>
            <div style={{ width: '46px', height: '46px', background: 'var(--color-surface-container-high)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--color-primary)', fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
            </div>
          </div>
          <div style={{ width: '46px', height: '46px', background: 'var(--color-surface-container)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
               onClick={() => navigate('/notifications')} title="Notifications">
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--color-on-surface-variant)' }}>notifications</span>
          </div>
          <div style={{ width: '46px', height: '46px', background: 'var(--color-surface-container)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
               onClick={() => navigate('/settings')} title="Settings">
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--color-on-surface-variant)' }}>settings</span>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
          <button
            onClick={handleLogout}
            style={{ width: '46px', height: '46px', background: 'var(--color-surface-container)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: 'none' }}
            title="Logout"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--color-error)' }}>logout</span>
          </button>
          
          {/* User avatar */}
          <div 
            onClick={() => navigate('/profile')}
            style={{
            cursor: 'pointer',
            width: '38px', height: '38px', borderRadius: '50%',
            background: `hsl(${(username.charCodeAt(0) * 37) % 360}, 60%, 50%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '16px', color: '#fff',
            border: '2px solid rgba(186,195,255,0.25)',
          }} title="Profile">
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      </aside>

      {/* ── Chat list sidebar ── */}
      <section style={{ width: '280px', background: 'var(--color-surface-container-low)', display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: '1px solid var(--color-outline-variant)' }}>
        <div style={{ padding: '24px 20px 16px' }}>
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '22px', color: 'var(--color-primary)', margin: '0 0 16px', letterSpacing: '-0.3px' }}>Rooms</h1>
          {/* Connection badge */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: isConnected ? 'rgba(79,217,153,0.12)' : 'rgba(186,26,26,0.12)',
              color: isConnected ? '#4fd999' : '#ff8a80',
              padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isConnected ? '#4fd999' : '#ff8a80', display: 'inline-block' }}></span>
              {isConnected ? 'Connected' : 'Connecting...'}
            </span>
          </div>
          {/* Online count */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#8f909e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {onlineUsers.length} Online
            </span>
          </div>
        </div>

        {/* Room List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 16px' }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: '#8f909e', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 6px', margin: '0 0 8px' }}>Recent Chats</p>
          {allRooms.map((room) => {
            const isActive = selectedRoom.id === room.id;
            const isDM = room.type === 'dm';
            return (
              <div
                key={room.id}
                onClick={() => switchRoom(room)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '11px 12px', borderRadius: '12px',
                  background: isActive ? '#282a2c' : 'transparent',
                  cursor: 'pointer', marginBottom: '4px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#1e2022'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: isDM ? '50%' : '10px',
                    background: isDM ? `hsl(${(room.name.charCodeAt(0) * 37) % 360}, 60%, 50%)` : (isActive ? `${room.color}22` : '#282a2c'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: 700, color: '#fff'
                  }}>
                    {isDM ? room.name.charAt(0).toUpperCase() : (
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: isActive ? room.color : '#8f909e' }}>{room.icon}</span>
                    )}
                  </div>
                  {/* Status Dot */}
                  {((isDM && onlineUsers.some(u => u.username === room.name && u.isOnline)) || (!isDM && onlineUsers.some(u => u.username !== username && u.isOnline))) && (
                    <div style={{ 
                      position: 'absolute', bottom: '-1px', right: '-1px', 
                      width: '10px', height: '10px', background: '#4fd999', 
                      border: '2px solid #1a1c1e', borderRadius: '50%' 
                    }}></div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '13px', color: isActive ? '#e2e2e5' : '#c5c5d4', display: 'block' }}>
                    {isDM ? room.name : `#${room.name}`}
                  </span>
                  <p style={{ fontSize: '11px', color: '#8f909e', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isDM 
                      ? (() => {
                          const u = onlineUsers.find(x => x.username === room.name);
                          if (!u) return 'Offline';
                          if (u.isOnline) return 'Active now';
                          if (u.lastSeen) return `Seen ${new Date(u.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                          return 'Away';
                        })()
                      : (room.lastMsg || 'No messages yet')}
                  </p>
                </div>
                {isActive && (
                  <div style={{ width: '3px', height: '28px', background: room.color || '#303992', borderRadius: '2px' }}></div>
                )}
              </div>
            );
          })}

          {/* Online Users */}
          {onlineUsers.filter(u => u.isOnline).length > 0 && (
            <>
              <p style={{ fontSize: '10px', fontWeight: 700, color: '#8f909e', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 6px', margin: '16px 0 8px' }}>Members Online</p>
              {onlineUsers.filter(u => u.isOnline).map((uObj, i) => {
                const u = uObj.username;
                const isMe = u === username;
                const dmRoomId = [username, u].sort().join('-');
                return (
                <div 
                  key={i} 
                  onClick={() => {
                    if (!isMe) {
                      switchRoom({ id: dmRoomId, name: u, icon: 'person', color: '#10B981', type: 'dm' });
                    }
                  }}
                  style={{ cursor: isMe ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '10px', transition: 'background 0.2s' }}
                  onMouseEnter={e => { if(!isMe) e.currentTarget.style.background = '#282a2c'; }}
                  onMouseLeave={e => { if(!isMe) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ position: 'relative' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: `hsl(${(u.charCodeAt(0) * 37) % 360}, 60%, 50%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '13px', color: '#fff',
                    }}>
                      {u.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ position: 'absolute', bottom: 0, right: 0, width: '9px', height: '9px', background: '#4fd999', border: '2px solid #1a1c1e', borderRadius: '50%' }}></div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#c5c5d4' }}>
                    {isMe ? 'You' : u}
                  </span>
                </div>
              )})}
            </>
          )}
        </div>
      </section>

      {/* ── Main chat ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-background)', overflow: 'hidden' }}>
        {/* Chat header */}
        <header style={{
          height: '68px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', background: 'var(--color-surface)', backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--color-outline-variant)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: `${selectedRoom.color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: selectedRoom.color, fontVariationSettings: "'FILL' 1" }}>{selectedRoom.icon}</span>
            </div>
            <div>
              <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '15px', color: 'var(--color-on-surface)', margin: 0, lineHeight: 1.3 }}>
                #{selectedRoom.name}
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--color-primary)', margin: 0, fontWeight: 500 }}>
                {onlineUsers.filter(u => u.isOnline).length} members online
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Online user avatars */}
            <div style={{ display: 'flex' }}>
              {onlineUsers.filter(u => u.isOnline).slice(0, 4).map((uObj, i) => {
                const uName = (typeof uObj === 'string' ? uObj : uObj.username) || 'User';
                return (
                  <div key={i} style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: `hsl(${(uName.charCodeAt(0) * 37) % 360}, 60%, 50%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '11px', color: '#fff',
                    border: '2px solid #121416',
                    marginLeft: i > 0 ? '-8px' : '0',
                    zIndex: 4 - i,
                    position: 'relative',
                  }}>
                    {uName.charAt(0).toUpperCase()}
                  </div>
                );
              })}
            </div>
            <button onClick={() => navigate('/search')} title="Search" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>search</span>
            </button>
            <button onClick={() => navigate(`/chat-info/${selectedRoom.id}`)} title="Chat Info" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>info</span>
            </button>
          </div>
        </header>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 && isConnected && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '18px',
                background: `${selectedRoom.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: selectedRoom.color, fontVariationSettings: "'FILL' 1" }}>{selectedRoom.icon}</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '17px', color: 'var(--color-on-surface)', margin: '0 0 6px' }}>Welcome to #{selectedRoom.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', margin: 0 }}>Start the conversation! 👋</p>
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isMe = m.username === username;
            const prevMsg = messages[i - 1];
            const showSender = !prevMsg || prevMsg.username !== m.username;

            return (
              <div key={m._id || i} style={{
                display: 'flex', flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '60%', gap: '3px',
                marginTop: showSender && i > 0 ? '8px' : '0',
              }}>
                {!isMe && showSender && (
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#8f909e', paddingLeft: '4px' }}>{m.username}</span>
                )}
                <div 
                  style={{
                    background: isMe ? 'linear-gradient(140deg, var(--color-primary) 0%, var(--color-primary-container) 100%)' : 'var(--color-surface-container)',
                    color: isMe ? '#fff' : 'var(--color-on-surface)',
                    padding: '12px 16px',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    fontSize: '13px', lineHeight: 1.6,
                    boxShadow: isMe ? '0 4px 16px rgba(48,57,146,0.25)' : '0 2px 8px rgba(0,0,0,0.1)',
                    wordBreak: 'break-word',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  onClick={() => setSelectedMessage(m)}
                  onContextMenu={(e) => { e.preventDefault(); setSelectedMessage(m); }}
                >
                  {m.message}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '3px', paddingRight: '3px' }}>
                  <span style={{ fontSize: '10px', color: '#8f909e' }}>{formatTime(m)}</span>
                  {isMe && (
                    <span className="material-symbols-outlined" style={{ fontSize: '12px', color: m.seen ? '#bac3ff' : '#454652', fontVariationSettings: "'FILL' 1" }}>done_all</span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#282a2c', borderRadius: '20px', padding: '10px 16px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                {[0, 0.2, 0.4].map((d, i) => (
                  <div key={i} style={{ width: '6px', height: '6px', background: '#bac3ff', borderRadius: '50%', animation: `bounce 1s ${d}s infinite` }}></div>
                ))}
              </div>
              <span style={{ fontSize: '12px', color: '#8f909e', fontWeight: 600 }}>
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Action Menu Overlay */}
        {selectedMessage && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <div style={{ position: 'absolute', inset: 0 }} onClick={() => setSelectedMessage(null)}></div>
             <div style={{ background: '#1a1c1e', borderRadius: '20px', padding: '24px', width: '320px', position: 'relative', boxShadow: '0 12px 32px rgba(0,0,0,0.4)', animation: 'fadeIn 0.2s ease-out' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                   <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#e2e2e5' }}>Message Actions</h3>
                   <button onClick={() => setSelectedMessage(null)} style={{ background: '#282a2c', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8f909e' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                   </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                   <button style={actionBtnStyle}><span className="material-symbols-outlined" style={actionIconStyle}>reply</span> Reply</button>
                   <button style={actionBtnStyle} onClick={() => { navigator.clipboard.writeText(selectedMessage.message); setSelectedMessage(null); }}><span className="material-symbols-outlined" style={actionIconStyle}>content_copy</span> Copy</button>
                   <button style={actionBtnStyle}><span className="material-symbols-outlined" style={actionIconStyle}>forward</span> Forward</button>
                   <button style={actionBtnStyle}><span className="material-symbols-outlined" style={actionIconStyle}>add_reaction</span> React</button>
                   {selectedMessage.username === username && (
                     <>
                       <button style={{ ...actionBtnStyle, background: 'rgba(48,57,146,0.15)', color: '#bac3ff' }}><span className="material-symbols-outlined" style={{...actionIconStyle, color: '#bac3ff'}}>edit</span> Edit</button>
                       <button style={{ ...actionBtnStyle, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><span className="material-symbols-outlined" style={{...actionIconStyle, color: '#ef4444'}}>delete</span> Delete</button>
                     </>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* Input */}
        <footer style={{ padding: '14px 24px 18px', background: 'var(--color-background)', flexShrink: 0, borderTop: '1px solid var(--color-outline-variant)' }}>
          <div style={{ background: 'var(--color-surface-container)', borderRadius: '30px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--color-outline-variant)' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', display: 'flex', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>add_circle</span>
            </button>
            <input
              id="desktop-message-input"
              type="text"
              placeholder={`Message #${selectedRoom.name}... (Enter to send)`}
              value={msg}
              onChange={e => { setMsg(e.target.value); emitTyping(); }}
              onKeyDown={handleKeyDown}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: 'var(--color-on-surface)', fontFamily: "'Inter', sans-serif" }}
            />
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-on-surface-variant)', display: 'flex', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>sentiment_satisfied</span>
            </button>
            <button
              id="desktop-send-btn"
              onClick={handleSend}
              disabled={!msg.trim() || isSending}
              style={{
                width: '40px', height: '40px',
                background: msg.trim() ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)' : 'var(--color-surface-container-highest)',
                border: 'none', borderRadius: '50%', cursor: msg.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: msg.trim() ? '0 0 14px rgba(48,57,146,0.4)' : 'none',
                flexShrink: 0, transition: 'all 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: msg.trim() ? '#fff' : 'var(--color-on-surface-variant)', fontVariationSettings: "'FILL' 1" }}>send</span>
            </button>
          </div>
        </footer>
      </main>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const actionBtnStyle = { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', background: '#282a2c', color: '#e2e2e5', textAlign: 'left', transition: 'background 0.2s' };
const actionIconStyle = { fontSize: '20px', color: '#8f909e' };

export default DesktopDashboard;
