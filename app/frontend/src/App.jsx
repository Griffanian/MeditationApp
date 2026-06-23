import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useParams } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Practices from './pages/Practices';
import Editor from './pages/Editor';
import PracticeBuilder from './pages/PracticeBuilder';
import Player from './pages/Player';
import ExercisePlayer from './pages/ExercisePlayer';
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserManagement from './pages/UserManagement';
import Account from './pages/Account';
import Clients from './pages/Clients';
import History from './pages/History';
import Home from './pages/Home';
import Preview from './pages/Preview';
import Join from './pages/Join';
import AssistantSidebar from './components/AssistantSidebar';
import { AuthProvider, buildAuth } from './AuthContext';
import { checkAuth, logoutUser } from './api';
import { initPostHog, identifyUser, resetUser } from './posthog';
import { useLocalState } from './utils';
import './styles.scss';

function AppHeader({ auth }) {
  const location = useLocation();
  const path = location.pathname;

  const isExercises = path === '/exercises' || path.startsWith('/edit/');
  const isProgrammes = path === '/practices' || path.startsWith('/practice/') || path.startsWith('/play/');

  return (
    <header className="app-header">
      <NavLink to="/" className="app-header-brand">Meditation Pro</NavLink>
      <nav className="app-header-nav">
        <NavLink to="/exercises" className={() => `app-header-link${isExercises ? ' active' : ''}`} onClick={() => {
          if (auth.canCreate) window.dispatchEvent(new CustomEvent('nav-exercises'));
        }}>
          Exercises
        </NavLink>
        {(auth.canCreate || auth.hasProgrammes) && (
          <NavLink to="/practices" className={() => `app-header-link${isProgrammes ? ' active' : ''}`}>
            Programmes
          </NavLink>
        )}
        <NavLink to="/history" className="app-header-link">
          History
        </NavLink>
        {auth.canCreate && (
          <NavLink to="/clients" className="app-header-link">
            Clients
          </NavLink>
        )}
        {auth.isAdmin && (
          <NavLink to="/users" className="app-header-link">
            Users
          </NavLink>
        )}
      </nav>
      <div className="app-header-user-chip">
        <div className="app-header-avatar">
          {auth.profilePhoto ? (
            <img src={auth.profilePhoto} alt="" className="app-header-avatar-img" />
          ) : (
            <span>{(auth.displayName || auth.username || '?')[0].toUpperCase()}</span>
          )}
        </div>
        <div className="app-header-user-info">
          <NavLink to="/account" className="app-header-name">{auth.displayName || auth.username}</NavLink>
          <button className="app-header-signout" onClick={() => { logoutUser(); window.location.href = '/'; }}>Sign out</button>
        </div>
      </div>
    </header>
  );
}

// Apply theme to <html> based on localStorage preference
function useThemeEffect() {
  useEffect(() => {
    function apply() {
      let theme;
      try { theme = JSON.parse(localStorage.getItem('theme')); } catch { theme = null; }
      if (theme === 'light' || theme === 'dark') {
        document.documentElement.setAttribute('data-theme', theme);
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
    apply();
    window.addEventListener('storage', apply);
    return () => window.removeEventListener('storage', apply);
  }, []);
}

export default function App() {
  const [auth, setAuth] = useState(null); // null = loading, false = logged out, object = logged in
  const [sidebarOpen, setSidebarOpen] = useLocalState('sidebarOpen', false);
  useThemeEffect();

  useEffect(() => {
    initPostHog();
    checkAuth()
      .then(data => {
        const a = data.authenticated ? buildAuth(data) : false;
        setAuth(a);
        if (a) identifyUser(a);
      })
      .catch(() => setAuth(false));
  }, []);

  useEffect(() => {
    function handleOpenSidebar() { setSidebarOpen(true); }
    window.addEventListener('open-sidebar', handleOpenSidebar);
    return () => window.removeEventListener('open-sidebar', handleOpenSidebar);
  }, []);

  const updateAuth = (updates) => setAuth(prev => prev ? { ...prev, ...updates } : prev);
  const authValue = useMemo(() => auth ? { ...auth, updateAuth } : { ...buildAuth({}), updateAuth }, [auth]);

  if (auth === null) {
    return <div className="loading-page"><div className="loading-spinner" /><span>Loading...</span></div>;
  }

  // Signup route is always available (even when logged out)
  if (!auth) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/signup/:token" element={<Signup onSignup={(data) => { const a = buildAuth(data); setAuth(a); identifyUser(a); }} />} />
          <Route path="/join/:token" element={<Join onSignup={(data) => { const a = buildAuth(data); setAuth(a); identifyUser(a); }} />} />
          <Route path="/preview" element={<Preview />} />
          <Route path="*" element={<Login onLogin={(data) => { const a = buildAuth(data); setAuth(a); identifyUser(a); }} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  function handleLogout() {
    resetUser();
    logoutUser();
    setAuth(false);
  }

  return (
    <AuthProvider value={authValue}>
      <BrowserRouter>
        <div className={`app-layout${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
          <AppHeader auth={authValue} />
          <button className={`sidebar-toggle${sidebarOpen ? '' : ' sidebar-toggle-closed'}`} onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? 'Hide AI assistant' : 'Show AI assistant'}>
            {sidebarOpen ? '›' : '💬'}
          </button>
          <div className="app-body">
            <div className="app-main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/exercises" element={<Dashboard />} />
                <Route path="/practices" element={<Practices />} />
                <Route path="/edit/:name" element={<Editor />} />
                <Route path="/practice/:name" element={authValue.canCreate ? <PracticeBuilder /> : <Navigate to="/practices" replace />} />
                <Route path="/play/:name" element={<Player />} />
                <Route path="/play-exercise/:name/:stageId" element={<ExercisePlayer />} />
                <Route path="/history" element={<History />} />
                <Route path="/clients" element={authValue.canCreate ? <Clients /> : <Navigate to="/" replace />} />
                <Route path="/users" element={authValue.isAdmin ? <UserManagement /> : <Navigate to="/" replace />} />
                <Route path="/account" element={<Account />} />
                <Route path="/preview" element={<Preview />} />
                <Route path="/signup/:token" element={<Navigate to="/" replace />} />
                <Route path="/join/:token" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            <AssistantSidebar />
          </div>
          <footer className="app-footer">
            © {new Date().getFullYear()} Miles Bloom. All rights reserved.
          </footer>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
