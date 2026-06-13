import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { fetchMeditations, updateLoops, assembleAudio } from '../api';

const CATEGORIES = {
  pranayama: { label: 'Pranayama', icon: '🌬️' },
  pratyahara: { label: 'Pratyahara', icon: '👁️' },
  uncategorised: { label: 'Other', icon: '🧘' },
};

function LoopInputs({ loops, onChange }) {
  if (!loops || loops.length === 0) return null;

  return loops.map((loop, i) => (
    <span key={i} className="loop-input-group">
      {loop.variable && <span className="loop-var-label">{loop.displayName || loop.variable}: </span>}
      <input
        className="dash-loop-input"
        type="number"
        value={loop.repeat}
        min="1"
        onClick={e => e.preventDefault()}
        onChange={e => {
          const val = parseInt(e.target.value);
          if (isNaN(val) || val < 1) return;
          const updated = loops.map((l, j) => j === i ? { ...l, repeat: val } : l);
          onChange(updated);
        }}
      />
      {loop.children && loop.children.length > 0 && (
        <>
          <span className="loop-input-sep">×</span>
          <LoopInputs
            loops={loop.children}
            onChange={newChildren => {
              const updated = loops.map((l, j) =>
                j === i ? { ...l, children: newChildren } : l
              );
              onChange(updated);
            }}
          />
        </>
      )}
    </span>
  ));
}

export default function Dashboard() {
  const [meditations, setMeditations] = useState([]);
  const [assembling, setAssembling] = useState(null);
  const [playing, setPlaying] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchMeditations().then(setMeditations);
  }, []);

  function updateMedLoops(name, newLoops) {
    setMeditations(meds =>
      meds.map(m => m.name === name ? { ...m, loops: newLoops } : m)
    );
  }

  async function handlePlay(med) {
    if (playing === med.name) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlaying(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlaying(null);

    await updateLoops(med.name, med.loops);

    setAssembling(med.name);
    const data = await assembleAudio(med.name);
    setAssembling(null);

    const audio = new Audio(`/audio/meditation/${med.name}/output/${data.filename}?t=${Date.now()}`);
    audioRef.current = audio;
    setPlaying(med.name);
    audio.onended = () => {
      setPlaying(null);
      audioRef.current = null;
    };
    audio.play();
  }

  function buttonLabel(med) {
    if (assembling === med.name) return 'Assembling...';
    if (playing === med.name) return '■ Playing';
    return '▶ Play';
  }

  // Group meditations by category
  const grouped = {};
  for (const med of meditations) {
    const cat = med.category || 'uncategorised';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(med);
  }

  // Render categories in defined order, then any extras
  const categoryOrder = Object.keys(CATEGORIES);
  const allCats = [...new Set([...categoryOrder, ...Object.keys(grouped)])];

  return (
    <div>
      <h1>Meditations</h1>

      {allCats.map(cat => {
        const meds = grouped[cat];
        if (!meds || meds.length === 0) return null;
        const info = CATEGORIES[cat] || { label: cat, icon: '🧘' };

        return (
          <div key={cat} className="category-section">
            <h2 className="category-header">
              <span className="category-icon">{info.icon}</span>
              {info.label}
            </h2>
            <div className="med-grid">
              {meds.map(med => (
                <div key={med.name} className="med-card">
                  <Link to={`/edit/${med.name}`} className="med-card-link">
                    <span className="med-card-name">{med.display_name}</span>
                  </Link>
                  {med.loops && med.loops.length > 0 && (
                    <div className="med-card-loops">
                      <span className="loop-label">↻</span>
                      <LoopInputs
                        loops={med.loops}
                        onChange={newLoops => updateMedLoops(med.name, newLoops)}
                      />
                    </div>
                  )}
                  <button
                    className={`med-card-play ${playing === med.name ? 'playing' : ''}`}
                    onClick={() => handlePlay(med)}
                    disabled={assembling === med.name}
                  >
                    {buttonLabel(med)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
