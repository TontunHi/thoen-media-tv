import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MediaManager from './components/MediaManager';
import PlaylistManager from './components/PlaylistManager';
import TvManager from './components/TvManager';
import TvPlayer from './components/TvPlayer';
import LoginModal from './components/LoginModal';
import { api, getAuthToken, setAuthToken } from './services/api';

function ProtectedLayout({ children, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 flex selection:bg-indigo-600 selection:text-white">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 min-w-0 overflow-y-auto max-h-screen bg-slate-50/60">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      if (!getAuthToken()) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      try {
        await api.checkAuth();
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
        setAuthToken(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    const handleAuthChange = () => {
      setIsAuthenticated(!!getAuthToken());
    };
    window.addEventListener('auth_change', handleAuthChange);
    return () => window.removeEventListener('auth_change', handleAuthChange);
  }, []);

  const handleLogout = () => {
    setAuthToken(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
        <div className="w-9 h-9 border-3 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public TV Player Route */}
        <Route path="/tv/:slug" element={<TvPlayer />} />

        {/* Admin Routes with Authentication */}
        {!isAuthenticated ? (
          <Route
            path="*"
            element={<LoginModal onLoginSuccess={() => setIsAuthenticated(true)} />}
          />
        ) : (
          <>
            <Route
              path="/upload"
              element={
                <ProtectedLayout onLogout={handleLogout}>
                  <MediaManager />
                </ProtectedLayout>
              }
            />
            <Route path="/media" element={<Navigate to="/upload" replace />} />

            <Route
              path="/playlist"
              element={
                <ProtectedLayout onLogout={handleLogout}>
                  <PlaylistManager />
                </ProtectedLayout>
              }
            />
            <Route path="/playlists" element={<Navigate to="/playlist" replace />} />

            <Route
              path="/tv"
              element={
                <ProtectedLayout onLogout={handleLogout}>
                  <TvManager />
                </ProtectedLayout>
              }
            />
            <Route path="/tvs" element={<Navigate to="/tv" replace />} />

            {/* Default redirect to /upload */}
            <Route path="/" element={<Navigate to="/upload" replace />} />
            <Route path="*" element={<Navigate to="/upload" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}
