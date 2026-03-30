import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'mention', title: 'Sarah J. mentioned you', sub: '"Hey, can you review the latest Figma file?"', time: '2m ago', read: false },
  { id: 2, type: 'message', title: 'New message from Marcus L.', sub: '"Are we still on for the 3PM sync?"', time: '1h ago', read: false },
  { id: 3, type: 'group', title: 'Engineering Channel', sub: 'David R. shared a file "Sprint_Planning.pdf"', time: 'Yesterday', read: true },
  { id: 4, type: 'mention', title: 'Aria K. replied to you', sub: '"I agree, let\'s proceed with option B."', time: 'Monday', read: true }
];

const Notifications = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // all, unread
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS);

  const filteredNotifs = notifs.filter(n => filter === 'all' || !n.read);

  const handleMarkAsRead = (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleClearAll = () => {
    setNotifs([]);
  };

  const markAllAsRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type) => {
    switch(type) {
      case 'mention': return { icon: 'alternate_email', color: '#8B5CF6' };
      case 'group': return { icon: 'tag', color: '#10B981' };
      default: return { icon: 'chat_bubble', color: 'var(--color-primary)' };
    }
  };

  return (
    <div style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)', fontFamily: "'Inter', sans-serif", minHeight: '100vh', paddingBottom: '20px' }}>
      
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--color-surface)', padding: '14px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', border: 'none', background: 'var(--color-surface-container-high)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-primary)' }}>
               <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
            </button>
            <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--color-on-surface)', margin: 0 }}>Notifications</h1>
          </div>
          <button onClick={handleClearAll} style={{ background: 'none', border: 'none', color: '#ba1a1a', fontWeight: 700, fontSize: '12px', cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Clear All
          </button>
        </div>

        {/* Filters & Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px', background: 'var(--color-surface-container)', padding: '4px', borderRadius: '20px' }}>
            <button
               onClick={() => setFilter('all')}
               style={{ padding: '6px 14px', border: 'none', borderRadius: '16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: filter === 'all' ? 'var(--color-surface)' : 'transparent', color: filter === 'all' ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)', boxShadow: filter === 'all' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
            >
               All
            </button>
            <button
               onClick={() => setFilter('unread')}
               style={{ padding: '6px 14px', border: 'none', borderRadius: '16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: filter === 'unread' ? 'var(--color-surface)' : 'transparent', color: filter === 'unread' ? 'var(--color-on-surface)' : 'var(--color-on-surface-variant)', boxShadow: filter === 'unread' ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}
            >
               Unread
            </button>
          </div>
          <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>done_all</span> Mark Read
          </button>
        </div>
      </header>

      {/* List */}
      <main style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredNotifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-on-surface-variant)' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', background: 'var(--color-surface-container-high)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>notifications_off</span>
            </div>
            <h3 style={{ fontSize: '16px', color: 'var(--color-on-surface)', margin: '0 0 8px' }}>You're all caught up!</h3>
            <p style={{ fontSize: '13px', margin: 0 }}>No new notifications.</p>
          </div>
        ) : (
          filteredNotifs.map(n => {
            const { icon, color } = getIcon(n.type);
            return (
              <div key={n.id} onClick={() => handleMarkAsRead(n.id)} style={{ padding: '16px', background: n.read ? 'var(--color-surface)' : 'var(--color-primary-container)', borderRadius: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px', cursor: 'pointer', border: n.read ? '1px solid transparent' : '1px solid var(--color-outline-variant)', transition: 'background 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                {/* Icon */}
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ color: color, fontSize: '20px', fontVariationSettings: !n.read ? "'FILL' 1" : "'FILL' 0" }}>{icon}</span>
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                     <h4 style={{ margin: 0, fontSize: '14px', fontWeight: n.read ? 600 : 700, color: 'var(--color-on-surface)' }}>{n.title}</h4>
                     <span style={{ fontSize: '11px', fontWeight: 600, color: n.read ? 'var(--color-on-surface-variant)' : 'var(--color-primary)', flexShrink: 0 }}>{n.time}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: n.read ? 'var(--color-on-surface-variant)' : 'var(--color-on-primary-container)', lineHeight: 1.4 }}>{n.sub}</p>
                </div>
                {/* Dot */}
                {!n.read && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary)', marginTop: '6px', flexShrink: 0 }}></div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};

export default Notifications;
