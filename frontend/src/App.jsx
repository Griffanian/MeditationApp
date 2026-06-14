import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Practices from './pages/Practices';
import Editor from './pages/Editor';
import PracticeBuilder from './pages/PracticeBuilder';
import Player from './pages/Player';
import ChatSidebar from './components/ChatSidebar';
import './styles.css';

function handleGlobalMutations(mutations) {
  // Broadcast mutations to the active page via a custom event
  window.dispatchEvent(new CustomEvent('chat-mutations', { detail: mutations }));
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <div className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/practices" element={<Practices />} />
            <Route path="/edit/:name" element={<Editor />} />
            <Route path="/practice/:name" element={<PracticeBuilder />} />
            <Route path="/play/:name" element={<Player />} />
          </Routes>
        </div>
        <ChatSidebar onMutations={handleGlobalMutations} />
      </div>
    </BrowserRouter>
  );
}
