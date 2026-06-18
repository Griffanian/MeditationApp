import { useState, useEffect } from 'react';
import { fetchHistory } from '../api';
import { ListView, CalendarView } from '../components/HistoryViews';

export default function History() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');

  useEffect(() => {
    fetchHistory().then(s => { setSessions(Array.isArray(s) ? s : []); setLoading(false); });
  }, []);

  if (loading) return <div className="loading-page"><div className="loading-spinner" />Loading history...</div>;

  return (
    <div>
      <h1>History</h1>
      <p className="section-description">Your completed practice sessions.</p>

      <div className="group-tabs">
        <button className={`group-tab${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>List</button>
        <button className={`group-tab history-calendar-toggle${view === 'calendar' ? ' active' : ''}`} onClick={() => setView('calendar')}>Calendar</button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-text">No sessions yet. Complete a day in a programme to see it here.</p>
        </div>
      ) : view === 'list' ? (
        <ListView sessions={sessions} />
      ) : (
        <CalendarView sessions={sessions} />
      )}
    </div>
  );
}
