import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Practices from './pages/Practices';
import Editor from './pages/Editor';
import PracticeBuilder from './pages/PracticeBuilder';
import Player from './pages/Player';
import Login from './pages/Login';
import ChatSidebar from './components/ChatSidebar';
import { AuthProvider } from './AuthContext';
import { checkAuth, logoutUser } from './api';
import './styles.css';

function handleGlobalMutations(mutations) {
  // Broadcast mutations to the active page via a custom event
  window.dispatchEvent(new CustomEvent('chat-mutations', { detail: mutations }));
}

function AppHeader({ isAdmin, onLogout }) {
  const location = useLocation();
  const path = location.pathname;

  // Determine which top-level section is active
  const isExercises = path === '/' || path === '/exercises' || path.startsWith('/edit/');
  const isProgrammes = path === '/practices' || path.startsWith('/practice/') || path.startsWith('/play/');

  return (
    <header className="app-header">
      <span className="app-header-brand">Progress Meditation</span>
      <nav className="app-header-nav">
        <NavLink to="/exercises" className={() => `app-header-link${isExercises ? ' active' : ''}`}>
          Exercise Bank
        </NavLink>
        <NavLink to="/practices" className={() => `app-header-link${isProgrammes ? ' active' : ''}`}>
          Programmes
        </NavLink>
      </nav>
      <button className="logout-btn" onClick={onLogout}>Sign out</button>
    </header>
  );
}

export default function App() {
  const [auth, setAuth] = useState(null); // null = loading, false = logged out, { isAdmin } = logged in

  useEffect(() => {
    checkAuth()
      .then(data => setAuth(data.authenticated ? { isAdmin: !!data.is_admin } : false))
      .catch(() => setAuth(false));
  }, []);

  const authValue = useMemo(() => auth || { isAdmin: false }, [auth]);

  if (auth === null) {
    return <div className="loading-page"><div className="loading-spinner" /><span>Loading…</span></div>;
  }

  if (!auth) {
    return <Login onLogin={(data) => setAuth({ isAdmin: !!data.is_admin })} />;
  }

  function handleLogout() {
    logoutUser();
    setAuth(false);
  }

  return (
    <AuthProvider value={authValue}>
      <BrowserRouter>
        <div className="app-layout">
          <AppHeader isAdmin={authValue.isAdmin} onLogout={handleLogout} />
          <div className="app-body">
            <div className="app-main">
              <Routes>
                <Route path="/" element={authValue.isAdmin ? <Dashboard /> : <Navigate to="/practices" replace />} />
                <Route path="/exercises" element={<Dashboard />} />
                <Route path="/practices" element={<Practices />} />
                <Route path="/edit/:name" element={<Editor />} />
                <Route path="/practice/:name" element={authValue.isAdmin ? <PracticeBuilder /> : <Navigate to="/practices" replace />} />
                <Route path="/play/:name" element={<Player />} />
              </Routes>
            </div>
            <ChatSidebar onMutations={authValue.isAdmin ? handleGlobalMutations : null} readOnly={!authValue.isAdmin} />
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
