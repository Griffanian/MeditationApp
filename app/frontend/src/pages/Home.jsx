import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { fetchHistory, fetchPractices, fetchMyViewers } from '../api';
import { formatDuration, formatDate } from '../components/HistoryViews';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function computeStreak(sessions) {
  if (sessions.length === 0) return 0;
  const daySet = new Set();
  for (const s of sessions) {
    const d = new Date(s.completed_at);
    d.setHours(0, 0, 0, 0);
    daySet.add(d.getTime());
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let check = new Date(today);
  // Count from today backwards
  while (daySet.has(check.getTime())) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  // If nothing today, check from yesterday
  if (streak === 0) {
    check = new Date(today);
    check.setDate(check.getDate() - 1);
    while (daySet.has(check.getTime())) {
      streak++;
      check.setDate(check.getDate() - 1);
    }
  }
  return streak;
}

function getProgress(pracName, weeks) {
  try {
    const stored = localStorage.getItem(`player:${pracName}:completed`);
    if (!stored) return null;
    const completed = JSON.parse(stored);
    const completedCount = Object.keys(completed).filter(k => completed[k]).length;
    if (completedCount === 0) return null;
    const hasWeeks = weeks.length > 0 && weeks[0]?.days;
    const totalDays = hasWeeks ? weeks.reduce((sum, w) => sum + (w.days?.length || 0), 0) : weeks.length;
    if (totalDays === 0) return null;
    return { done: completedCount, total: totalDays, pct: Math.round((completedCount / totalDays) * 100) };
  } catch { return null; }
}

function getMotivationalMessage(streak, totalSessions) {
  if (totalSessions === 0) return 'Welcome to Progress Meditation. Start your first session today.';
  if (streak > 1) return `${streak} day streak — keep it going!`;
  if (streak === 1) return 'You practised today. Nice work.';
  return 'Ready to get back on track?';
}

function formatHours(secs) {
  if (!secs) return '0m';
  const hours = Math.floor(secs / 3600);
  const mins = Math.round((secs % 3600) / 60);
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

function sessionTotalSecs(s) {
  if (s.exercises && s.exercises.length > 0) {
    const total = s.exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0);
    if (total > 0) return total;
  }
  return s.duration || 0;
}

export default function Home() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [practices, setPractices] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);

  useEffect(() => {
    const promises = [
      fetchHistory().then(s => setSessions(Array.isArray(s) ? s : [])),
      fetchPractices().then(setPractices),
    ];
    if (auth.canCreate) {
      promises.push(fetchMyViewers().then(v => setViewerCount(Array.isArray(v) ? v.length : 0)));
    }
    Promise.all(promises).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-page"><div className="loading-spinner" />Loading...</div>;

  const name = auth.displayName || auth.username;
  const streak = computeStreak(sessions);
  const totalSessions = sessions.length;
  const totalSeconds = sessions.reduce((sum, s) => sum + sessionTotalSecs(s), 0);
  const recentSessions = [...sessions]
    .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    .slice(0, auth.canCreate ? 5 : 3);

  // Find the viewer's current programme (in-progress, or most recently played)
  const currentProgramme = (() => {
    if (auth.canCreate) return null;
    let best = null;
    let bestScore = -1;
    for (const p of practices) {
      const weeks = p.items || [];
      const prog = getProgress(p.name, weeks);
      if (prog && prog.pct < 100) {
        // Prefer higher progress
        if (prog.pct > bestScore) { best = { practice: p, progress: prog }; bestScore = prog.pct; }
      }
    }
    // Fallback: most recent session's programme
    if (!best && recentSessions.length > 0) {
      const recentPrac = practices.find(p => p.name === recentSessions[0].practice);
      if (recentPrac) {
        const prog = getProgress(recentPrac.name, recentPrac.items || []);
        best = { practice: recentPrac, progress: prog };
      }
    }
    // Fallback: first available programme
    if (!best && practices.length > 0) {
      best = { practice: practices[0], progress: null };
    }
    return best;
  })();

  return (
    <div className="home-page">
      <div className="home-greeting">
        <h1 className="home-greeting-title">{getGreeting()}, {name}</h1>
        <p className="home-greeting-sub">{getMotivationalMessage(streak, totalSessions)}</p>
        {streak > 0 && <span className="home-streak-badge">{streak} day streak</span>}
      </div>

      {auth.canCreate ? (
        <>
          <div className="home-stats">
            <div className="home-stat-card">
              <div className="home-stat-value">{totalSessions}</div>
              <div className="home-stat-label">Sessions</div>
            </div>
            <div className="home-stat-card">
              <div className="home-stat-value">{streak}</div>
              <div className="home-stat-label">Day Streak</div>
            </div>
            <div className="home-stat-card">
              <div className="home-stat-value">{formatHours(totalSeconds)}</div>
              <div className="home-stat-label">Total Time</div>
            </div>
          </div>

          {recentSessions.length > 0 && (
            <div className="home-section">
              <h2 className="home-section-title">Recent Activity</h2>
              <div className="home-session-list">
                {recentSessions.map(s => (
                  <div key={s.id} className="home-session-item">
                    <div>
                      <div className="home-session-name">{s.practice_display}</div>
                      <div className="home-session-detail">{s.day_label}{sessionTotalSecs(s) > 0 ? ` · ${formatDuration(sessionTotalSecs(s))}` : ''}</div>
                    </div>
                    <span className="home-session-date">{formatDate(s.completed_at)}</span>
                  </div>
                ))}
              </div>
              <Link to="/history" className="home-view-all">View all history</Link>
            </div>
          )}

          <div className="home-section">
            <h2 className="home-section-title">Quick Links</h2>
            <div className="home-quick-links">
              <Link to="/exercises" className="home-quick-link">Exercises</Link>
              <Link to="/practices" className="home-quick-link">Programmes</Link>
              <Link to="/clients" className="home-quick-link">Clients{viewerCount > 0 ? ` (${viewerCount})` : ''}</Link>
            </div>
          </div>
        </>
      ) : (
        <>
          {currentProgramme && (
            <div className="home-section">
              <div className="home-programme-card">
                <div className="home-programme-name">{currentProgramme.practice.display_name}</div>
                {currentProgramme.progress && (
                  <div className="prog-card-progress">
                    <div className="prog-card-progress-bar">
                      <div className="prog-card-progress-fill" style={{ width: `${currentProgramme.progress.pct}%` }} />
                    </div>
                    <span className="prog-card-progress-label">{currentProgramme.progress.done}/{currentProgramme.progress.total} days</span>
                  </div>
                )}
                <div className="home-programme-actions">
                  <Link to={`/play/${currentProgramme.practice.name}`} className="home-programme-btn home-programme-btn-primary">Continue Practice</Link>
                  <Link to="/exercises" className="home-programme-btn home-programme-btn-secondary">Browse Exercises</Link>
                </div>
              </div>
            </div>
          )}

          {recentSessions.length > 0 && (
            <div className="home-section">
              <h2 className="home-section-title">Recent Sessions</h2>
              <div className="home-session-list">
                {recentSessions.map(s => (
                  <div key={s.id} className="home-session-item">
                    <div>
                      <div className="home-session-name">{s.practice_display}</div>
                      <div className="home-session-detail">{s.day_label}{sessionTotalSecs(s) > 0 ? ` · ${formatDuration(sessionTotalSecs(s))}` : ''}</div>
                    </div>
                    <span className="home-session-date">{formatDate(s.completed_at)}</span>
                  </div>
                ))}
              </div>
              <Link to="/history" className="home-view-all">View all history</Link>
            </div>
          )}

          {!currentProgramme && recentSessions.length === 0 && (
            <div className="home-section">
              <div className="home-empty">
                <p>No sessions yet. Browse the exercise bank to get started.</p>
                <Link to="/exercises" className="home-programme-btn home-programme-btn-primary">Browse Exercises</Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
