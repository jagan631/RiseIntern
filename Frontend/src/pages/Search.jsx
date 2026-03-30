import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BACKEND_URL } from '../socket';

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [userResults, setUserResults] = useState([]);
  const [messageResults, setMessageResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);

  const token = sessionStorage.getItem('token');
  const username = sessionStorage.getItem('username');

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'users', label: 'Users' },
    { id: 'messages', label: 'Messages' },
  ];

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setUserResults([]);
      setMessageResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // Search users and messages in parallel
        const [usersRes, msgsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/search/users?query=${encodeURIComponent(query)}`, { headers }),
          fetch(`${BACKEND_URL}/search/messages?query=${encodeURIComponent(query)}`, { headers }),
        ]);

        const users = await usersRes.json();
        const msgs = await msgsRes.json();

        setUserResults(Array.isArray(users) ? users : []);
        setMessageResults(Array.isArray(msgs) ? msgs : []);
      } catch (err) {
        // console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, token]);

  // Start DM with a user
  const startDM = (targetUser) => {
    const dmRoomId = [username, targetUser].sort().join('-');
    navigate(`/chat/${dmRoomId}`);
  };

  // Navigate to message in room
  const goToMessage = (msg) => {
    navigate(`/chat/${msg.room}`);
  };

  // Highlight matching text
  const HighlightMatch = ({ text }) => {
    if (!query) return <>{text}</>;
    try {
      const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
      return (
        <>
          {parts.map((part, i) =>
            part.toLowerCase() === query.toLowerCase() ? (
              <span key={i} style={{ background: 'var(--color-primary-container)', color: 'var(--color-on-primary-container)', padding: '0 2px', borderRadius: '4px' }}>{part}</span>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </>
      );
    } catch {
      return <>{text}</>;
    }
  };

  const showUsers = activeFilter === 'all' || activeFilter === 'users';
  const showMessages = activeFilter === 'all' || activeFilter === 'messages';

  return (
    <div style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)', fontFamily: "'Inter', sans-serif", minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Search Bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--color-surface)', padding: '16px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
        </button>
        <div style={{ flex: 1, position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-variant)', fontSize: '20px' }}>search</span>
          <input 
            type="text" 
            placeholder="Search users and messages..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', padding: '14px 14px 14px 46px', background: 'var(--color-surface-container)', border: 'none', borderRadius: '20px', fontSize: '15px', color: 'var(--color-on-surface)', outline: 'none', boxSizing: 'border-box' }}
            autoFocus
          />
          {query && (
             <button onClick={() => setQuery('')} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-on-surface-variant)', cursor: 'pointer', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
             </button>
          )}
        </div>
      </header>

      {/* Filters */}
      <div style={{ padding: '16px 20px 8px', display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', background: activeFilter === f.id ? 'var(--color-primary)' : 'var(--color-surface-container-high)', color: activeFilter === f.id ? '#fff' : 'var(--color-on-surface-variant)', boxShadow: activeFilter === f.id ? '0 4px 12px rgba(48,57,146,0.3)' : 'none' }}
          >
            {f.label}
            {f.id === 'users' && userResults.length > 0 && ` (${userResults.length})`}
            {f.id === 'messages' && messageResults.length > 0 && ` (${messageResults.length})`}
          </button>
        ))}
      </div>

      <main style={{ flex: 1, padding: '16px 20px', overflowY: 'auto' }}>
        
        {/* Empty state */}
        {!query && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '60px', gap: '16px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'var(--color-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'var(--color-primary)' }}>search</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '18px', color: 'var(--color-on-surface)', margin: '0 0 8px' }}>Search FluidChat</h3>
              <p style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', margin: 0 }}>Find users to start a conversation with, or search through your message history.</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && query && (
          <div style={{ textAlign: 'center', padding: '24px', color: '#757684' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '24px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
            <p style={{ fontSize: '13px', margin: '8px 0 0' }}>Searching...</p>
          </div>
        )}

        {/* User Results */}
        {query && !isLoading && showUsers && userResults.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
              Users ({userResults.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {userResults.map((u) => (
                <div key={u._id} onClick={() => startDM(u.username)} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', background: 'var(--color-surface)', borderRadius: '20px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'transform 0.15s' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: `hsl(${(u.username.charCodeAt(0) * 37) % 360}, 60%, 50%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '18px', color: '#fff', flexShrink: 0,
                  }}>
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                      <HighlightMatch text={u.username} />
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>{u.bio || 'FluidChat User'}</p>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-primary)' }}>chat</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Message Results */}
        {query && !isLoading && showMessages && messageResults.length > 0 && (
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-on-surface-variant)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat_bubble</span>
              Messages ({messageResults.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {messageResults.map((msg) => (
                <div key={msg._id} onClick={() => goToMessage(msg)} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px', background: 'var(--color-surface)', borderRadius: '20px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--color-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>chat_bubble</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                        {msg.username} <span style={{ fontWeight: 500, color: 'var(--color-on-surface-variant)' }}>in #{msg.room}</span>
                      </h4>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-on-surface-variant)', flexShrink: 0 }}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-on-surface-variant)', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                      <HighlightMatch text={msg.message} />
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {query && !isLoading && userResults.length === 0 && messageResults.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--color-on-surface-variant)' }}>
            <div style={{ width: '64px', height: '64px', margin: '0 auto 16px', background: 'var(--color-surface-container-high)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>search_off</span>
            </div>
            <h3 style={{ fontSize: '16px', color: 'var(--color-on-surface)', margin: '0 0 8px' }}>No results found</h3>
            <p style={{ fontSize: '13px', margin: 0 }}>Try a different search term.</p>
          </div>
        )}
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

export default Search;
