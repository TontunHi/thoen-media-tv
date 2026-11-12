import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MediaManager from './components/MediaManager';
import PlaylistManager from './components/PlaylistManager';
import TvManager from './components/TvManager';
import IncidentManager from './components/IncidentManager';
import IncidentTvScreen from './components/IncidentTvScreen';
import LoginModal from './components/LoginModal';
import ErrorBoundary from './components/ErrorBoundary';
import SystemAdminPage from './features/auth/SystemAdminPage';
import { ToastProvider } from './features/common/ToastProvider';
import { api, getAuthToken, setAuthToken } from './services/api';

function StandalonePlayerRedirect() {
  useEffect(() => {
    window.location.replace(window.location.pathname + window.location.search);
  }, []);
  return null;
}

function ProtectedLayout({ children, onLogout, user }) {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex selection:bg-teal-700 selection:text-white">
      <Sidebar onLogout={onLogout} user={user} />
      <main className="flex-1 min-w-0 overflow-y-auto max-h-screen bg-[#f8fafc]">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAuthToken());
  const [currentUser, setCurrentUser] = useState({ username: 'admin', role: 'admin' });
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    if (!getAuthToken()) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }
    try {
      const res = await api.checkAuth();
      setIsAuthenticated(true);
      if (res?.user) {
        setCurrentUser({
          username: res.user.username || 'admin',
          role: res.user.role || 'admin',
        });
      }
    } catch {
      setIsAuthenticated(false);
      setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-600">
        <div className="w-7 h-7 border-2 border-slate-200 border-t-teal-700 rounded-full animate-spin" />
      </div>
    );
  }

  const isErStaffOnly = currentUser?.role === 'er_staff';
  const defaultRoute = isErStaffOnly ? '/incident' : '/upload';

  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public TV Player Route */}
            <Route path="/tv/:slug" element={<StandalonePlayerRedirect />} />

            {/* Public TV Incident Fullscreen Display Route */}
            <Route path="/tv-incident" element={<IncidentTvScreen />} />
            <Route path="/incident-display" element={<IncidentTvScreen />} />

            {/* Admin Routes with Authentication */}
            {!isAuthenticated ? (
              <Route
                path="*"
                element={
                  <LoginModal
                    onLoginSuccess={() => {
                      setIsAuthenticated(true);
                      checkUser();
                    }}
                  />
                }
              />
            ) : (
              <>
                {!isErStaffOnly && (
                  <>
                    <Route
                      path="/upload"
                      element={
                        <ProtectedLayout onLogout={handleLogout} user={currentUser}>
                          <MediaManager />
                        </ProtectedLayout>
                      }
                    />
                    <Route path="/media" element={<Navigate to="/upload" replace />} />

                    <Route
                      path="/playlist"
                      element={
                        <ProtectedLayout onLogout={handleLogout} user={currentUser}>
                          <PlaylistManager />
                        </ProtectedLayout>
                      }
                    />
                    <Route
                      path="/playlists"
                      element={<Navigate to="/playlist" replace />}
                    />

                    <Route
                      path="/tv"
                      element={
                        <ProtectedLayout onLogout={handleLogout} user={currentUser}>
                          <TvManager />
                        </ProtectedLayout>
                      }
                    />
                    <Route path="/tvs" element={<Navigate to="/tv" replace />} />

                    <Route
                      path="/system"
                      element={
                        <ProtectedLayout onLogout={handleLogout} user={currentUser}>
                          <SystemAdminPage />
                        </ProtectedLayout>
                      }
                    />
                  </>
                )}

                <Route
                  path="/incident"
                  element={
                    <ProtectedLayout onLogout={handleLogout} user={currentUser}>
                      <IncidentManager />
                    </ProtectedLayout>
                  }
                />
                <Route
                  path="/incidents"
                  element={<Navigate to="/incident" replace />}
                />

                <Route path="/" element={<Navigate to={defaultRoute} replace />} />
                <Route path="*" element={<Navigate to={defaultRoute} replace />} />
              </>
            )}
          </Routes>
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}
