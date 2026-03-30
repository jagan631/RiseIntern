import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { connectSocket, getSocket } from '../socket';

const SHARED_MEDIA = [
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
  'https://images.unsplash.com/photo-1498050108023-c5249f4df085',
  'https://images.unsplash.com/photo-1461749280684-dccba630e2f6',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97'
];

const ChatInfo = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isMuted, setIsMuted] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const isDM = id ? id.includes('-') : false;
  const username = sessionStorage.getItem('username');
  const token = sessionStorage.getItem('token');
  const dmTarget = isDM && id ? id.split('-').find(u => u !== username) : null;
  const displayName = dmTarget || id || 'general';

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    socket.emit('get_online_users');
    socket.on('online_users', (users) => setOnlineUsers(users));
    return () => { socket.off('online_users'); };
  }, [token]);

  const isTargetOnline = dmTarget ? onlineUsers.find(u => u.username === dmTarget)?.isOnline : false;
  
  // Real participants list
  const activeParticipants = isDM 
    ? [ { name: username, sub: 'You', img: `hsl(${(username.charCodeAt(0) * 37) % 360}, 60%, 50%)` },
        { name: dmTarget, sub: isTargetOnline ? 'Online' : 'Offline', img: `hsl(${(dmTarget.charCodeAt(0) * 37) % 360}, 60%, 50%)` } ]
    : [ { name: username, sub: 'You', img: `hsl(${(username.charCodeAt(0) * 37) % 360}, 60%, 50%)` } ]; // Add others if needed later for group member listing

  return (
    <div style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)', fontFamily: "'Inter', sans-serif", minHeight: '100vh', paddingBottom: '40px' }}>
      
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--color-surface)', backdropFilter: 'blur(12px)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', border: 'none', background: 'var(--color-primary-container)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-primary)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
        </button>
        <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '18px', color: 'var(--color-primary)', margin: 0 }}>Details</h1>
        <button style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-primary)' }}>
          <span className="material-symbols-outlined">more_vert</span>
        </button>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Chat Avatar & Name */}
        <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '120px', height: '120px', borderRadius: '32px', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(48,57,146,0.3)', position: 'relative' }}>
             <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '48px', fontVariationSettings: "'FILL' 1" }}>groups</span>
             <button style={{ position: 'absolute', bottom: '-10px', right: '-10px', width: '36px', height: '36px', background: 'var(--color-surface)', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: 'var(--color-primary)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
             </button>
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '24px', color: 'var(--color-on-surface)', margin: '0 0 4px' }}>
              {isDM ? displayName : `#${displayName}`}
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
              {isDM ? 'Direct Message' : 'Active group chat'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
            <button style={actionBtn}><span className="material-symbols-outlined" style={actionIcon}>call</span><span style={actionLabel}>Call</span></button>
            <button style={actionBtn}><span className="material-symbols-outlined" style={actionIcon}>videocam</span><span style={actionLabel}>Video</span></button>
            <button style={actionBtn}><span className="material-symbols-outlined" style={actionIcon}>search</span><span style={actionLabel}>Search</span></button>
          </div>
        </section>

        {/* Quick Settings */}
        <section style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--color-outline-variant)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
               <div style={iconBox}><span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '22px' }}>notifications_off</span></div>
               <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-on-surface)' }}>Mute Chat</p>
            </div>
            <div onClick={() => setIsMuted(!isMuted)} style={{ width: '52px', height: '30px', borderRadius: '15px', background: isMuted ? '#ef4444' : 'var(--color-outline-variant)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: '3px', left: isMuted ? '25px' : '3px', width: '24px', height: '24px', background: '#fff', borderRadius: '50%', transition: 'left 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div>
            </div>
          </div>
          <button style={rowBtn}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
               <div style={iconBox}><span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '22px' }}>wallpaper</span></div>
               <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-on-surface)' }}>Wallpaper</p>
            </div>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)' }}>chevron_right</span>
          </button>
        </section>

        {/* Media & Files */}
        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 12px' }}>
            <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface)' }}>Shared Media</h3>
            <button style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>See All</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', padding: '0 20px 20px' }}>
             {SHARED_MEDIA.map((src, i) => (
                <div key={i} style={{ aspectRatio: '1/1', background: '#e0e3e5', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}>
                   <img src={`${src}?auto=format&fit=crop&q=80&w=200`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
             ))}
          </div>
        </section>

        {/* Participants */}
        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 16px' }}>
            <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface)' }}>{activeParticipants.length} Participant{activeParticipants.length !== 1 ? 's' : ''}</h3>
            <button style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
               <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
            </button>
          </div>
          <div>
            {activeParticipants.map((p, i) => (
               <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px', cursor: 'pointer', transition: 'background 0.2s', borderTop: i > 0 ? '1px solid var(--color-outline-variant)' : 'none' }}>
                  <div style={{ 
                    width: '48px', height: '48px', borderRadius: '50%', background: p.img, 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontWeight: 700, fontSize: '16px', color: '#fff' 
                  }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                     <p style={{ margin: '0 0 2px', fontSize: '15px', fontWeight: 600, color: 'var(--color-on-surface)' }}>{p.name}</p>
                     <p style={{ margin: 0, fontSize: '13px', color: p.sub === 'Online' ? '#10B981' : 'var(--color-on-surface-variant)' }}>{p.sub}</p>
                  </div>
               </div>
            ))}
          </div>
        </section>

        {/* Danger Zone */}
        <section style={{ ...card, padding: '8px 0' }}>
          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
             <span className="material-symbols-outlined" style={{ color: '#ba1a1a', fontSize: '24px' }}>block</span>
             <span style={{ fontSize: '15px', fontWeight: 700, color: '#ba1a1a' }}>Block User</span>
          </button>
          <div style={{ height: '1px', background: 'var(--color-outline-variant)', margin: '0 20px' }}></div>
          <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
             <span className="material-symbols-outlined" style={{ color: '#ba1a1a', fontSize: '24px' }}>report</span>
             <span style={{ fontSize: '15px', fontWeight: 700, color: '#ba1a1a' }}>Report Issue</span>
          </button>
        </section>

      </main>
    </div>
  );
};

/* Mini styles */
/* Mini styles */
const card = { background: 'var(--color-surface)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' };
const iconBox = { width: '40px', height: '40px', borderRadius: '12px', background: 'var(--color-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const rowBtn = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer' };
const actionBtn = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 20px', background: 'var(--color-surface)', border: 'none', borderRadius: '20px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', flex: 1 };
const actionIcon = { fontSize: '24px', color: 'var(--color-primary)', fontVariationSettings: "'FILL' 1" };
const actionLabel = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--color-on-surface-variant)', textTransform: 'uppercase' };

export default ChatInfo;
