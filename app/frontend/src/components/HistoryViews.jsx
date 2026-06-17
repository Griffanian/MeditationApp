import { useState } from 'react';

export function formatDuration(secs) {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function ExerciseBars({ exercises }) {
  if (!exercises || exercises.length === 0) return null;
  return (
    <div className="history-exercises">
      {exercises.map((ex, j) => (
        <div key={j} className="history-exercise-bar">
          <div className="history-exercise-top">
            <span className="history-exercise-name">{ex.meditation_display}{ex.stage_name ? ` — ${ex.stage_name}` : ''}</span>
            {ex.duration != null && ex.duration > 0 && <span className="history-exercise-dur">{formatDuration(ex.duration)}</span>}
          </div>
          {ex.variables && Object.keys(ex.variables).length > 0 && (
            <div className="history-exercise-vars">
              {Object.entries(ex.variables).map(([k, v]) => (
                <span key={k} className="history-exercise-var">{k}: {v}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function ListView({ sessions }) {
  const grouped = {};
  for (const s of sessions) {
    const dateKey = new Date(s.completed_at).toLocaleDateString();
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(s);
  }

  return (
    <div className="history-list">
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} className="history-date-group">
          <h3 className="history-date-heading">{formatDate(items[0].completed_at)}</h3>
          {items.map(s => (
            <div key={s.id} className="history-item">
              <div className="history-item-top">
                <span className="history-item-name">{s.practice_display}</span>
                <div className="history-item-meta">
                  {s.duration > 0 && <span className="history-item-duration">{formatDuration(s.duration)}</span>}
                  <span className="history-item-time">{formatTime(s.completed_at)}</span>
                </div>
              </div>
              <div className="history-item-detail">{s.day_label || `Week ${s.week + 1}, Day ${s.day + 1}`}</div>
              <ExerciseBars exercises={s.exercises} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const PRACTICE_COLORS = ['#2d4a7a', '#4a2d6a', '#2d6a4a', '#6a4a2d', '#2d5a6a', '#6a2d4a', '#5a6a2d', '#3d3d7a'];
function practiceColor(name, map) {
  if (!map.has(name)) map.set(name, PRACTICE_COLORS[map.size % PRACTICE_COLORS.length]);
  return map.get(name);
}

export function CalendarView({ sessions }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(null);

  const now = new Date();
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const dayMap = {};
  for (const s of sessions) {
    const d = new Date(s.completed_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(s);
    }
  }

  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const colorMap = new Map();

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(<div key={`empty-${i}`} className="cal-cell cal-empty" />);
  for (let d = 1; d <= daysInMonth; d++) {
    const daySessions = dayMap[d] || [];
    const isToday = isCurrentMonth && d === today;
    cells.push(
      <div key={d} className={`cal-cell${isToday ? ' cal-today' : ''}${daySessions.length > 0 ? ' cal-has-sessions' : ''}`}
        onClick={() => daySessions.length > 0 && setSelectedDay(d)}>
        <span className="cal-day">{d}</span>
        <div className="cal-sessions">
          {daySessions.map((s, i) => (
            <div key={i} className="cal-session-bar" style={{ background: practiceColor(s.practice_display, colorMap) }}>
              <span className="cal-session-label">{s.day_label}</span>
              <span className="cal-session-time">{formatDuration(s.duration)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const practiceNames = [...colorMap.entries()];

  return (
    <div className="history-calendar">
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={() => setMonthOffset(o => o - 1)}>&lsaquo;</button>
        <span className="cal-month">{monthName}</span>
        <button className="cal-nav-btn" onClick={() => setMonthOffset(o => o + 1)} disabled={monthOffset >= 0}>&rsaquo;</button>
      </div>
      {practiceNames.length > 0 && (
        <div className="cal-legend">
          {practiceNames.map(([name, color]) => (
            <span key={name} className="cal-legend-item">
              <span className="cal-legend-swatch" style={{ background: color }} />
              {name}
            </span>
          ))}
        </div>
      )}
      <div className="cal-header">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="cal-header-cell">{d}</div>
        ))}
      </div>
      <div className="cal-grid">{cells}</div>

      {selectedDay && dayMap[selectedDay] && (
        <div className="modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="modal cal-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{new Date(year, month, selectedDay).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
              <button className="modal-close" onClick={() => setSelectedDay(null)}>&times;</button>
            </div>
            <div className="cal-modal-list">
              {dayMap[selectedDay].map((s, i) => (
                <div key={i} className="cal-detail-item">
                  <span className="cal-detail-swatch" style={{ background: practiceColor(s.practice_display, colorMap) }} />
                  <div className="cal-detail-info">
                    <span className="cal-detail-name">{s.practice_display}</span>
                    <span className="cal-detail-sub">{s.day_label} {s.duration > 0 ? `· ${formatDuration(s.duration)}` : ''} · {formatTime(s.completed_at)}</span>
                    <ExerciseBars exercises={s.exercises} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
