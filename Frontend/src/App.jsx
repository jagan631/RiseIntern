import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import SignIn from './pages/SignIn';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import CreateGroup from './pages/CreateGroup';
import DesktopDashboard from './pages/DesktopDashboard';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Search from './pages/Search';
import MediaGallery from './pages/MediaGallery';
import CallScreen from './pages/CallScreen';
import Notifications from './pages/Notifications';
import ChatInfo from './pages/ChatInfo';

function App() {
  // Global theme initialization
  useEffect(() => {
    const root = window.document.documentElement;
    const theme = localStorage.getItem('theme') || 'System';
    if (theme === 'Dark') {
      root.classList.add('dark');
    } else if (theme === 'Light') {
      root.classList.remove('dark');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<SignIn />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="/create-group" element={<CreateGroup />} />
        <Route path="/desktop" element={<DesktopDashboard />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* New UI Screens */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/search" element={<Search />} />
        <Route path="/media" element={<MediaGallery />} />
        <Route path="/call/:id" element={<CallScreen />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/chat-info/:id" element={<ChatInfo />} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
