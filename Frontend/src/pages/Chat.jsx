import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { connectSocket, getSocket } from '../socket';

const ROOM_META = {
  'general':      { name: 'General',       icon: 'tag',     color: '#303992' },
  'design-team':  { name: 'Design Team',   icon: 'palette', color: '#8B5CF6' },
  'engineering':  { name: 'Engineering',   icon: 'code',    color: '#10B981' },
};

const Chat = () => {
  const navigate = useNavigate();
  const { id: roomId } = useParams();
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const textareaRef = useRef(null);
  const isTabVisible = useRef(true);
  const socketRef = useRef(null);

  const username = sessionStorage.getItem('username') || 'Guest';
  const token = sessionStorage.getItem('token');
  
  // Dynamically resolve room meta (Support direct messages)
  const isDM = roomId.includes('-');
  const dmTarget = isDM ? roomId.split('-').find(u => u !== username) : null;
  const roomMeta = ROOM_META[roomId] || { 
    name: dmTarget || roomId, 
    icon: isDM ? 'person' : 'chat_bubble', 
    color: isDM ? '#10B981' : '#303992' 
  };

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Mark messages as seen (Batched)
  const markMessagesSeen = useCallback((msgs) => {
    if (!isTabVisible.current) return;
    const socket = getSocket();
    if (!socket) return;
    
    const unseenIds = msgs
      .filter(msg => msg.username !== username && !msg.seen)
      .map(msg => msg._id)
      .slice(0, 20);

    unseenIds.forEach(id => {
      socket.emit('message_seen', { messageId: id, room: roomId });
    });
  }, [username, roomId]);

  useEffect(() => {
    if (!token) { navigate('/'); return; }

    const socket = connectSocket(token);
    socketRef.current = socket;

    // We store timeouts per user to prevent flickering
    const typingTimeouts = {};

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('get_online_users');
      // Join the chat room → server will reset unread count & bulk-mark seen
      socket.emit('join_room', roomId);
    };

    const handleDisconnect = () => setIsConnected(false);

    const handleOnlineUsers = (users) => setOnlineUsers(users);

    const handleLoadMessages = (msgs) => {
      setMessages(msgs);
      setTimeout(() => scrollToBottom(), 100);
      // No need to manually call markMessagesSeen — server does bulk-mark on join_room
    };

    const handleReceiveMessage = (msg) => {
      setMessages(prev => {
        const exists = prev.find(m => m._id === msg._id);
        if (exists) return prev;
        return [...prev, msg];
      });
      setTimeout(() => scrollToBottom(), 100);
      // If tab is visible and user is in this room, mark as seen
      if (isTabVisible.current && msg.username !== username) {
        setTimeout(() => {
          socket.emit('message_seen', { messageId: msg._id, room: roomId });
        }, 300);
      }
    };

    const handleTyping = (data) => {
      if (data.username === username) return;
      setTypingUsers(prev => {
        if (prev.includes(data.username)) return prev;
        return [...prev, data.username];
      });
      
      if (typingTimeouts[data.username]) {
        clearTimeout(typingTimeouts[data.username]);
      }
      
      typingTimeouts[data.username] = setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u !== data.username));
      }, 3000);
    };

    const handleMessageSeenUpdate = ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, seen: true } : m));
    };

    // Bulk seen: when another user opens the room all at once
    const handleBulkSeen = ({ room }) => {
      if (room === roomId) {
        setMessages(prev => prev.map(m => ({ ...m, seen: true })));
      }
    };

    // Phase 2: Edit/Delete listeners
    const handleMessageEdited = (updatedMsg) => {
      setMessages(prev => prev.map(m => m._id === updatedMsg._id ? updatedMsg : m));
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => prev.filter(m => m._id !== messageId));
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('online_users', handleOnlineUsers);
    socket.on('load_messages', handleLoadMessages);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('typing', handleTyping);
    socket.on('message_seen_update', handleMessageSeenUpdate);
    socket.on('messages_bulk_seen', handleBulkSeen);
    socket.on('message_edited', handleMessageEdited);
    socket.on('message_deleted', handleMessageDeleted);

    // Tab visibility tracking
    const handleVisibility = () => {
      isTabVisible.current = !document.hidden;
      // If user comes back to this tab, re-mark unseen messages
      if (!document.hidden) {
        const socket = getSocket();
        if (socket && socket.connected) {
          // Re-join room to reset unread count (in case they tabbed away)
          socket.emit('join_room', roomId);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      // Leave the chat room when navigating away → server clears active room
      if (socket && socket.connected) {
        socket.emit('leave_room', roomId);
      }
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('online_users', handleOnlineUsers);
      socket.off('load_messages', handleLoadMessages);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.off('message_seen_update', handleMessageSeenUpdate);
      socket.off('messages_bulk_seen', handleBulkSeen);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [roomId, token, username]);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;
    const socket = getSocket();
    if (!socket || !socket.connected) return;

    setIsSending(true);
    socket.emit('send_message', {
      room: roomId,
      message: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setTimeout(() => setIsSending(false), 500);
  };

  // Phase 2: Edit handler
  const handleEditMessage = () => {
    if (!editingMessage || !editText.trim()) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit('edit_message', { messageId: editingMessage._id, newText: editText.trim(), room: roomId });
    setEditingMessage(null);
    setEditText('');
    setSelectedMessage(null);
  };

  // Phase 2: Delete handler
  const handleDeleteMessage = (msg) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('delete_message', { messageId: msg._id, room: roomId });
    setSelectedMessage(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTypingInput = (e) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    // Emit typing
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('typing', { room: roomId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const formatTime = (msg) => {
    if (msg.time) return msg.time;
    if (msg.createdAt) return new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return '';
  };

  const onlineCount = onlineUsers.filter(u => u.isOnline).length;

  return (
    <div style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)', minHeight: '100vh', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--color-surface)', backdropFilter: 'blur(16px)',
        padding: '10px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', boxShadow: '0 1px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            id="back-btn"
            onClick={() => navigate('/dashboard')}
            style={{ width: '38px', height: '38px', border: 'none', background: 'transparent', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#757684', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#eceef0'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>arrow_back</span>
          </button>
          <div style={{
            width: '40px', height: '40px', borderRadius: '11px',
            background: `${roomMeta.color}18`,
            border: `2px solid ${roomMeta.color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: roomMeta.color, fontVariationSettings: "'FILL' 1" }}>{roomMeta.icon}</span>
          </div>
          <div>
            <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '15px', color: 'var(--color-primary)', margin: 0, lineHeight: 1.2 }}>
              #{roomMeta.name}
            </h1>
            <p style={{ fontSize: '11px', fontWeight: 600, color: (isDM ? (onlineUsers.find(u => u.username === dmTarget)?.isOnline ? '#006846' : 'var(--color-on-surface-variant)') : (isConnected ? '#006846' : 'var(--color-error)')), margin: 0, letterSpacing: '0.04em' }}>
              {isDM 
                ? (onlineUsers.find(u => u.username === dmTarget)?.isOnline ? 'Online' : (onlineUsers.find(u => u.username === dmTarget)?.lastSeen ? `Last seen ${new Date(onlineUsers.find(u => u.username === dmTarget).lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline')) 
                : (isConnected ? `${onlineCount} member${onlineCount !== 1 ? 's' : ''} here` : 'Connecting...')}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => navigate(`/chat-info/${roomId}`)} style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>group</span>
          </button>
          <button onClick={() => navigate(`/chat-info/${roomId}`)} style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>more_vert</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <main style={{
        flex: 1,
        paddingTop: '72px',
        paddingBottom: '88px',
        padding: '72px 16px 88px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '760px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>

        {/* Connection status */}
        {!isConnected && (
          <div style={{ textAlign: 'center', padding: '12px', background: '#fff3e0', borderRadius: '12px', fontSize: '13px', color: '#8f4700' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '6px' }}>wifi_off</span>
            Connecting to room...
          </div>
        )}

        {/* Date pill */}
        {messages.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 8px' }}>
            <span style={{ background: 'var(--color-surface-container)', borderRadius: '20px', padding: '4px 14px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)' }}>
              {messages.length > 0 && new Date(messages[0].createdAt || Date.now()).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}

        {/* Empty state */}
        {messages.length === 0 && isConnected && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, paddingTop: '60px', gap: '16px' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px',
              background: `${roomMeta.color}12`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: roomMeta.color, fontVariationSettings: "'FILL' 1" }}>{roomMeta.icon}</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '18px', color: 'var(--color-on-surface)', margin: '0 0 8px' }}>
                Welcome to #{roomMeta.name}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', margin: 0 }}>
                This is the beginning of the channel. Say hello! 👋
              </p>
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, idx) => {
          const isMe = msg.username === username;
          const prevMsg = messages[idx - 1];
          const showAvatar = !prevMsg || prevMsg.username !== msg.username;

          return (
            <div
              key={msg._id || idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
                alignSelf: isMe ? 'flex-end' : 'flex-start',
                maxWidth: '78%',
                gap: '2px',
                marginTop: showAvatar && idx > 0 ? '8px' : '0',
              }}
            >
              {/* Sender name (for group display, non-me) */}
              {!isMe && showAvatar && (
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#757684', paddingLeft: '4px', letterSpacing: '0.03em' }}>
                  {msg.username}
                </span>
              )}

              <div 
                style={{
                  background: isMe ? 'linear-gradient(140deg, var(--color-primary) 0%, var(--color-primary-container) 100%)' : 'var(--color-surface-container-high)',
                  color: isMe ? '#fff' : 'var(--color-on-surface)',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  lineHeight: 1.55,
                  boxShadow: isMe ? '0 4px 12px rgba(48,57,146,0.2)' : '0 2px 6px rgba(0,0,0,0.1)',
                  wordBreak: 'break-word',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onClick={() => setSelectedMessage(msg)}
                onContextMenu={(e) => { e.preventDefault(); setSelectedMessage(msg); }}
              >
                {msg.message}
                {msg.edited && (
                  <span style={{ fontSize: '10px', fontStyle: 'italic', opacity: 0.7, marginLeft: '6px' }}>(edited)</span>
                )}
              </div>

              {/* Time + seen */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingLeft: '4px', paddingRight: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-on-surface-variant)', letterSpacing: '0.05em' }}>
                  {formatTime(msg)}
                </span>
                {isMe && (
                  <span className="material-symbols-outlined" style={{ fontSize: '13px', color: msg.seen ? 'var(--color-primary)' : 'var(--color-outline-variant)', fontVariationSettings: "'FILL' 1" }}>
                    done_all
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', gap: '4px', maxWidth: '78%' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-on-surface-variant)', paddingLeft: '4px' }}>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </span>
            <div style={{ background: 'var(--color-surface-container-high)', borderRadius: '18px 18px 18px 4px', padding: '12px 18px', display: 'flex', gap: '5px', alignItems: 'center' }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <div key={i} style={{ width: '7px', height: '7px', background: 'var(--color-on-surface-variant)', borderRadius: '50%', animation: `bounce 1s ${delay}s infinite` }}></div>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Message Action Menu Overlay */}
      {selectedMessage && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
           <div style={{ flex: 1 }} onClick={() => setSelectedMessage(null)}></div>
           <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '24px 20px', boxShadow: '0 -8px 24px rgba(0,0,0,0.1)', animation: 'slideUp 0.3s ease-out' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                 <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#191c1e' }}>Message Actions</h3>
                 <button onClick={() => setSelectedMessage(null)} style={{ background: '#f2f4f6', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#454652' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
                 </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                 <button style={{ ...actionBtnStyle, background: '#f2f4f6' }}><span className="material-symbols-outlined" style={actionIconStyle}>reply</span> Reply</button>
                 <button style={{ ...actionBtnStyle, background: '#f2f4f6' }} onClick={() => { navigator.clipboard.writeText(selectedMessage.message); setSelectedMessage(null); }}><span className="material-symbols-outlined" style={actionIconStyle}>content_copy</span> Copy</button>
                 <button style={{ ...actionBtnStyle, background: '#f2f4f6' }}><span className="material-symbols-outlined" style={actionIconStyle}>forward</span> Forward</button>
                 <button style={{ ...actionBtnStyle, background: '#f2f4f6' }}><span className="material-symbols-outlined" style={actionIconStyle}>add_reaction</span> React</button>
                 {selectedMessage.username === username && (
                   <>
                     <button style={{ ...actionBtnStyle, background: 'rgba(48,57,146,0.08)', color: '#303992' }} onClick={() => { setEditingMessage(selectedMessage); setEditText(selectedMessage.message); setSelectedMessage(null); }}><span className="material-symbols-outlined" style={{...actionIconStyle, color: '#303992'}}>edit</span> Edit</button>
                     <button style={{ ...actionBtnStyle, background: 'rgba(186,26,26,0.08)', color: '#ba1a1a' }} onClick={() => handleDeleteMessage(selectedMessage)}><span className="material-symbols-outlined" style={{...actionIconStyle, color: '#ba1a1a'}}>delete</span> Delete</button>
                   </>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Edit Bar (appears above input when editing) */}
      {editingMessage && (
        <div style={{
          position: 'fixed', bottom: '80px', left: 0, right: 0,
          background: 'rgba(48,57,146,0.06)', borderTop: '2px solid #303992',
          padding: '10px 16px', zIndex: 51,
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#303992' }}>edit</span>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#303992', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Editing message</span>
            <p style={{ fontSize: '13px', color: '#454652', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{editingMessage.message}</p>
          </div>
          <input
            type="text"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleEditMessage(); if (e.key === 'Escape') { setEditingMessage(null); setEditText(''); } }}
            style={{ flex: 2, padding: '10px 14px', border: '1px solid #303992', borderRadius: '12px', fontSize: '14px', outline: 'none', background: '#fff' }}
            autoFocus
          />
          <button onClick={handleEditMessage} style={{ background: '#303992', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Save</button>
          <button onClick={() => { setEditingMessage(null); setEditText(''); }} style={{ background: '#f2f4f6', color: '#454652', border: 'none', borderRadius: '10px', padding: '10px 14px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      {/* Input Footer */}
      <footer style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--color-surface)', backdropFilter: 'blur(16px)',
        padding: '10px 16px 14px', zIndex: 50,
        borderTop: '1px solid var(--color-outline-variant)',
      }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
          <button style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface-variant)', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>add_circle</span>
          </button>
          <div style={{ flex: 1 }}>
            <textarea
              ref={textareaRef}
              id="message-input"
              rows={1}
              value={message}
              onChange={handleTypingInput}
              onKeyDown={handleKeyDown}
              placeholder="Write a message... (Enter to send)"
              style={{
                width: '100%', background: 'var(--color-surface-container)', border: 'none',
                borderRadius: '20px', padding: '12px 18px',
                fontSize: '14px', fontFamily: "'Inter', sans-serif",
                color: 'var(--color-on-surface)', outline: 'none', resize: 'none',
                maxHeight: '120px', overflowY: 'auto',
                boxSizing: 'border-box', lineHeight: 1.5,
                transition: 'box-shadow 0.2s',
              }}
              onFocus={e => { e.target.style.background = 'var(--color-surface)'; e.target.style.boxShadow = '0 0 0 2px rgba(48,57,146,0.2)'; }}
              onBlur={e => { e.target.style.background = 'var(--color-surface-container)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
          <button
            id="send-btn"
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            style={{
              width: '48px', height: '48px',
              background: message.trim()
                ? 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)'
                : 'var(--color-surface-container-high)',
              border: 'none', borderRadius: '50%', cursor: message.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: message.trim() ? '0 4px 14px rgba(48,57,146,0.3)' : 'none',
              transition: 'all 0.2s', flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px', color: message.trim() ? '#fff' : 'var(--color-outline-variant)', fontVariationSettings: "'FILL' 1" }}>
              {isSending ? 'hourglass_empty' : 'send'}
            </span>
          </button>
        </div>
      </footer>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

/* Styles for modal */
const actionBtnStyle = { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px', border: 'none', borderRadius: '16px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', color: '#191c1e', textAlign: 'left' };
const actionIconStyle = { fontSize: '24px', color: '#191c1e' };

export default Chat;
