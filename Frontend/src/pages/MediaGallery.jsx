import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_FILES = [
  { id: 1, type: 'image', name: 'UI_Mockup.png', url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=200', size: '2.4 MB', date: 'Today' },
  { id: 2, type: 'video', name: 'Onboarding_Demo.mp4', url: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=200', size: '14.2 MB', date: 'Yesterday' },
  { id: 3, type: 'document', name: 'Q3_Financials.pdf', url: '', size: '840 KB', date: 'Oct 12' },
  { id: 4, type: 'image', name: 'Avatar_Asset.jpg', url: 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&q=80&w=200', size: '1.1 MB', date: 'Oct 10' }
];

const MediaGallery = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('images');
  const [search, setSearch] = useState('');
  const [previewFile, setPreviewFile] = useState(null);

  const tabs = [
    { id: 'images', icon: 'image', label: 'Images' },
    { id: 'videos', icon: 'movie', label: 'Videos' },
    { id: 'documents', icon: 'description', label: 'Docs' }
  ];

  const filteredFiles = MOCK_FILES.filter(f => f.type + 's' === activeTab || (activeTab === 'documents' && f.type === 'document'));

  return (
    <div style={{ background: 'var(--color-background)', color: 'var(--color-on-surface)', fontFamily: "'Inter', sans-serif", minHeight: '100vh', paddingBottom: '20px' }}>
      
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'var(--color-surface)', backdropFilter: 'blur(16px)', padding: '14px 20px', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', border: 'none', background: 'transparent', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-primary)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>arrow_back</span>
            </button>
            <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 800, fontSize: '18px', color: 'var(--color-on-surface)', margin: 0 }}>Shared Media</h1>
          </div>
          <button style={{ background: 'none', border: 'none', color: 'var(--color-primary)' }}>
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-on-surface-variant)', fontSize: '20px' }}>search</span>
          <input 
            type="text" 
            placeholder="Search files..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 46px', background: 'var(--color-surface-container)', border: 'none', borderRadius: '16px', fontSize: '14px', color: 'var(--color-on-surface)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{ flex: 1, padding: '10px 0', border: 'none', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', fontWeight: 700, fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'all 0.2s', background: activeTab === t.id ? 'var(--color-primary)' : 'transparent', color: activeTab === t.id ? 'var(--color-on-primary)' : 'var(--color-on-surface-variant)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Grid View */}
      <main style={{ padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'documents' ? '1fr' : 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
          {filteredFiles.map(file => (
            <div 
              key={file.id} 
              onClick={() => setPreviewFile(file)}
              style={{ background: 'var(--color-surface)', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: activeTab === 'documents' ? 'row' : 'column', alignItems: activeTab === 'documents' ? 'center' : 'stretch', gap: activeTab === 'documents' ? '16px' : '0', padding: activeTab === 'documents' ? '16px' : '0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            >
              {/* Thumbnail */}
              <div style={{ width: activeTab === 'documents' ? '48px' : '100%', height: activeTab === 'documents' ? '48px' : '100px', background: 'var(--color-surface-container-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderRadius: activeTab === 'documents' ? '12px' : '0' }}>
                {file.url ? (
                  <img src={file.url} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: activeTab === 'documents' ? '12px' : '0' }} />
                ) : (
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-on-surface-variant)', fontSize: '24px' }}>description</span>
                )}
                {file.type === 'video' && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
                    <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: '32px' }}>play_circle</span>
                  </div>
                )}
              </div>
              
              {/* Info */}
              {activeTab === 'documents' ? (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>{file.size} • {file.date}</p>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </main>

      {/* File Preview Modal */}
      {previewFile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column' }}>
          <header style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <button onClick={() => setPreviewFile(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                <span className="material-symbols-outlined">close</span>
             </button>
             <button style={{ background: 'var(--color-primary)', color: 'var(--color-on-primary)', border: 'none', borderRadius: '20px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span> Download
             </button>
          </header>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            {previewFile.url ? (
              <img src={previewFile.url.replace('&w=200', '&w=800')} alt={previewFile.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} />
            ) : (
              <div style={{ color: '#fff', textAlign: 'center' }}>
                 <span className="material-symbols-outlined" style={{ fontSize: '64px', marginBottom: '16px' }}>description</span>
                 <h2>{previewFile.name}</h2>
                 <p>{previewFile.size}</p>
              </div>
            )}
          </div>
          <footer style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
             Shared {previewFile.date}
          </footer>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
