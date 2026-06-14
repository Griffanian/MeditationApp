import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
          <div className="app-main">
            <div className="app-top-bar">
              <button className="logout-btn" onClick={handleLogout}>Sign out</button>
            </div>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/practices" element={<Practices />} />
              <Route path="/edit/:name" element={<Editor />} />
              <Route path="/practice/:name" element={authValue.isAdmin ? <PracticeBuilder /> : <Navigate to="/practices" replace />} />
              <Route path="/play/:name" element={<Player />} />
            </Routes>
          </div>
          {authValue.isAdmin && <ChatSidebar onMutations={handleGlobalMutations} />}
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
