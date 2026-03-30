import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const CallScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [callStatus, setCallStatus] = useState('ringing'); // ringing, ongoing, ended
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Mock ringing effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setCallStatus('ongoing');
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => {
      navigate(-1);
    }, 1500);
  };

  return (
    <div style={{ background: '#000', fontFamily: "'Inter', sans-serif", width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background (User Video Map) */}
      {callStatus !== 'ended' ? (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
           {!isVideoOff ? (
             <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=600" alt="Remote User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
           ) : (
             <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1c1e' }}>
               <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#303992', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', color: '#fff', fontWeight: 800 }}>
                 {id ? id.charAt(0).toUpperCase() : 'U'}
               </div>
             </div>
           )}
           {/* Dark Overlay gradient */}
           <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 20%, transparent 70%, rgba(0,0,0,0.8) 100%)' }}></div>
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: '#121416', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: '#fff', fontSize: '18px', fontWeight: 600 }}>Call Ended</p>
        </div>
      )}

      {/* Header Info */}
      <header style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 700, fontSize: '24px', color: '#fff', margin: '0 0 8px', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
          {id || 'Unknown Caller'}
        </h1>
        <p style={{ fontSize: '14px', fontWeight: 600, color: callStatus === 'ringing' ? '#6ffbbe' : 'rgba(255,255,255,0.8)', letterSpacing: '0.05em', margin: 0 }}>
          {callStatus === 'ringing' ? 'Ringing...' : callStatus === 'ongoing' ? '02:45' : 'Ended'}
        </p>
      </header>

      {/* Self Video (PiP) */}
      {(callStatus === 'ongoing' || callStatus === 'ringing') && (
        <div style={{ position: 'absolute', top: '24px', right: '24px', width: '100px', height: '140px', borderRadius: '16px', border: '2px solid rgba(255,255,255,0.2)', overflow: 'hidden', zIndex: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', background: '#282a2c' }}>
           <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200" alt="Self Video" style={{ border: 'none', width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Call Controls */}
      <footer style={{ position: 'absolute', bottom: '48px', left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '24px' }}>
        <button
          onClick={() => setIsMuted(!isMuted)}
          style={{ width: '56px', height: '56px', borderRadius: '50%', background: isMuted ? '#fff' : 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '28px', color: isMuted ? '#191c1e' : '#fff' }}>{isMuted ? 'mic_off' : 'mic'}</span>
        </button>

        <button
          onClick={() => setIsVideoOff(!isVideoOff)}
          style={{ width: '56px', height: '56px', borderRadius: '50%', background: isVideoOff ? '#fff' : 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '28px', color: isVideoOff ? '#191c1e' : '#fff' }}>{isVideoOff ? 'videocam_off' : 'videocam'}</span>
        </button>

        <button
          onClick={handleEndCall}
          style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#ef4444', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}
        >
           <span className="material-symbols-outlined" style={{ fontSize: '36px', color: '#fff' }}>call_end</span>
        </button>

        <button
          onClick={() => setIsSpeakerOn(!isSpeakerOn)}
          style={{ width: '56px', height: '56px', borderRadius: '50%', background: !isSpeakerOn ? '#fff' : 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '28px', color: !isSpeakerOn ? '#191c1e' : '#fff' }}>{isSpeakerOn ? 'volume_up' : 'volume_off'}</span>
        </button>
      </footer>
    </div>
  );
};

export default CallScreen;
