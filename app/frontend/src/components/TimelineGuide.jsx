import { useState } from 'react';

const STEPS = [
  {
    title: 'What are stages?',
    body: 'An exercise can have one or more stages. Each stage represents a complete practice, they build on each other so users can progress over time. Each stage has its own script.',
    example: (
      <div className="guide-example">
        <div className="guide-programme">
          <div className="guide-programme-row">
            <span className="guide-programme-label">Stage 1</span>
            <span className="guide-programme-exercise">Preparatory Practise.</span>
          </div>
          <div className="guide-programme-row">
            <span className="guide-programme-label">Stage 2</span>
            <span className="guide-programme-exercise">First version of Practise.</span>
          </div>
          <div className="guide-programme-row">
            <span className="guide-programme-label">Stage 3</span>
            <span className="guide-programme-exercise">Second version of Practise.</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'What is a timeline?',
    body: 'A timeline is the structured script that plays for the user. It\'s built from segments. Segments are individual pieces that play one after another.',
    example: (
      <div className="guide-example">
        <div className="guide-seg speech">
          <span className="guide-seg-icon">🤖</span>
          <span>Close your eyes and settle in</span>
        </div>
        <div className="guide-seg pause">
          <span className="guide-seg-icon">⏸</span>
          <span>Pause</span>
          <span className="guide-seg-dur">5s</span>
        </div>
        <div className="guide-seg speech">
          <span className="guide-seg-icon">🤖</span>
          <span>Take a deep breath in</span>
        </div>
        <div className="guide-seg asset">
          <span className="guide-seg-icon">🔊</span>
          <span>bell.mp3</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Segment types',
    body: 'There are three basic segment types. Speech is read aloud by AI or can be recorded by you. Pauses add silence for a set duration. Assets play a sound file like a bell or music.',
    example: (
      <div className="guide-example">
        <div className="guide-seg speech">
          <span className="guide-seg-icon">🤖</span>
          <span><strong>Speech</strong> — spoken aloud to the user</span>
        </div>
        <div className="guide-seg pause">
          <span className="guide-seg-icon">⏸</span>
          <span><strong>Pause</strong> — silence for a set time</span>
        </div>
        <div className="guide-seg asset">
          <span className="guide-seg-icon">🔊</span>
          <span><strong>Asset</strong> — plays a sound file</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Sections & Loops',
    body: 'Sections group segments together under a label. Loops are a type of section that repeat their contents a set number of times. You can nest them inside each other.',
    example: (
      <div className="guide-example">
        <div className="guide-seg section">
          <span className="guide-seg-icon">▼</span>
          <span><strong>Warm Up</strong></span>
        </div>
        <div className="guide-section-body">
          <div className="guide-seg speech">
            <span className="guide-seg-icon">🤖</span>
            <span>Breathe in deeply</span>
          </div>
          <div className="guide-seg loop">
            <span className="guide-seg-icon">↻</span>
            <span>Repeat <strong>3</strong> times</span>
          </div>
          <div className="guide-loop-body">
            <div className="guide-seg speech">
              <span className="guide-seg-icon">🤖</span>
              <span>In... and out...</span>
            </div>
            <div className="guide-seg pause">
              <span className="guide-seg-icon">⏸</span>
              <span>Pause</span>
              <span className="guide-seg-dur">4s</span>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Variables',
    body: 'Variables are at the heart of how we build programmes. They allow you to adjust the difficulty and create progressive meditations in a structured way. This allows us to use same script for weeks or months of guided progression. There are two types: durations and numbers.',
    example: (
      <div className="guide-example">
        <div className="guide-var-table">
          <div className="guide-var-row">
            <span className="guide-var-name">holdTime</span>
            <span className="guide-var-val">30</span>
            <span className="guide-var-unit">Secs</span>
          </div>
          <div className="guide-var-row">
            <span className="guide-var-name">rounds</span>
            <span className="guide-var-val">5</span>
            <span className="guide-var-unit">Times</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Using Variables',
    body: 'To use a variable in your script, wrap its name in curly brackets. When the script plays, the variable is replaced with its value.',
    example: (
      <div className="guide-example">
        <div className="guide-seg speech">
          <span className="guide-seg-icon">🤖</span>
          <span>Hold for <span className="guide-var">{'{holdTime}'}</span> seconds</span>
        </div>
        <div className="guide-arrow">plays as</div>
        <div className="guide-seg speech">
          <span className="guide-seg-icon">🤖</span>
          <span>Hold for <strong>30</strong> seconds</span>
        </div>
        <div style={{ height: 8 }} />
        <div className="guide-seg pause">
          <span className="guide-seg-icon">⏸</span>
          <span>Pause — <span className="guide-var">{'{holdTime}'}</span></span>
          <span className="guide-seg-dur">30s</span>
        </div>
        <div className="guide-arrow">pauses for 30 seconds</div>
      </div>
    ),
  },
  {
    title: 'Variable Names vs Display Names',
    body: 'Each variable has two names. The variable name is what you use in the script. This name goes inside the curly brackets. The display name is what the user sees when they adjust it.',
    example: (
      <div className="guide-example">
        <div className="guide-var-table">
          <div className="guide-var-row">
            <span className="guide-var-label-col">Variable name</span>
            <span className="guide-var-name">holdTime</span>
          </div>
          <div className="guide-var-row">
            <span className="guide-var-label-col">Display name</span>
            <span>Hold Duration</span>
          </div>
        </div>
        <div style={{ height: 8 }} />
        <div className="guide-arrow">In the script:</div>
        <div className="guide-seg speech">
          <span className="guide-seg-icon">🤖</span>
          <span>Hold for <span className="guide-var">{'{holdTime}'}</span> seconds</span>
        </div>
        <div className="guide-arrow">What the user sees:</div>
        <div className="guide-user-panel">
          <div className="guide-user-row">
            <span>Hold Duration</span>
            <input type="number" value={30} readOnly />
            <span className="guide-var-unit">sec</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Duration Variables',
    body: 'Duration variables control how long pauses, sections, and loops last. Set the unit to seconds, minutes, or hours.',
    example: (
      <div className="guide-example">
        <div className="guide-var-table">
          <div className="guide-var-row">
            <span className="guide-var-name">holdTime</span>
            <span className="guide-var-val">30</span>
            <span className="guide-var-unit">sec</span>
          </div>
        </div>
        <div className="guide-arrow">used in</div>
        <div className="guide-seg pause">
          <span className="guide-seg-icon">⏸</span>
          <span>Pause — <span className="guide-var">holdTime</span></span>
          <span className="guide-seg-dur">30s</span>
        </div>
        <div className="guide-seg speech">
          <span className="guide-seg-icon">🤖</span>
          <span>Hold for <span className="guide-var">holdTime</span> seconds</span>
        </div>
      </div>
    ),
  },
  {
    title: 'Number Variables',
    body: 'Number variables control how many times a loop repeats. A beginner might do 3 rounds while an advanced user does 10.',
    example: (
      <div className="guide-example">
        <div className="guide-var-table">
          <div className="guide-var-row">
            <span className="guide-var-name">rounds</span>
            <span className="guide-var-val">5</span>
            <span className="guide-var-unit">—</span>
          </div>
        </div>
        <div className="guide-arrow">used in</div>
        <div className="guide-seg loop">
          <span className="guide-seg-icon">↻</span>
          <span>Repeat <span className="guide-var">rounds</span> times</span>
        </div>
        <div className="guide-loop-body">
          <div className="guide-seg speech">
            <span className="guide-seg-icon">🤖</span>
            <span>Breathe in deeply</span>
          </div>
          <div className="guide-seg pause">
            <span className="guide-seg-icon">⏸</span>
            <span>Pause</span>
            <span className="guide-seg-dur">5s</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Split Markers',
    body: 'Split markers automatically divide silence evenly within a section. Place them inside a section with a duration variable, and the remaining time is split equally between markers. The multiplier controls the ratio.',
    example: (
      <div className="guide-example">
        <div className="guide-seg section">
          <span className="guide-seg-icon">▼</span>
          <span><strong>Body Scan</strong> — duration: <span className="guide-var">scanTime</span></span>
        </div>
        <div className="guide-section-body">
          <div className="guide-seg speech">
            <span className="guide-seg-icon">🤖</span>
            <span>Focus on your feet</span>
          </div>
          <div className="guide-seg split-marker">
            <span className="guide-seg-icon">◆</span>
            <span>Split Marker × 1</span>
            <span className="guide-seg-dur">auto</span>
          </div>
          <div className="guide-seg speech">
            <span className="guide-seg-icon">🤖</span>
            <span>Move your attention to your legs</span>
          </div>
          <div className="guide-seg split-marker">
            <span className="guide-seg-icon">◆</span>
            <span>Split Marker × 1</span>
            <span className="guide-seg-dur">auto</span>
          </div>
          <div className="guide-seg speech">
            <span className="guide-seg-icon">🤖</span>
            <span>Now focus on your torso</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Standalone Exercises',
    body: 'When a user plays an exercise on its own, they can adjust the variables themselves before pressing play. This lets them tailor the session to their current level.',
    example: (
      <div className="guide-example">
        <div className="guide-user-panel">
          <div className="guide-user-row">
            <span>Rounds</span>
            <input type="number" value={5} readOnly />
          </div>
          <div className="guide-user-row">
            <span>Hold duration</span>
            <input type="number" value={30} readOnly />
            <span className="guide-var-unit">sec</span>
          </div>
        </div>
        <div className="guide-arrow">user adjusts these before pressing play</div>
      </div>
    ),
  },
  {
    title: 'Variables in Programmes',
    body: 'In a programme, variables can be set to progress over time. The same exercise appears across weeks with increasing difficulty. This way, the user is guided through a structured journey without needing to adjust anything themselves.',
    example: (
      <div className="guide-example">
        <div className="guide-programme">
          <div className="guide-programme-row">
            <span className="guide-programme-label">Week 1, Day 1</span>
            <span className="guide-programme-exercise">Breathing</span>
            <span className="guide-programme-vars"><span className="guide-var">duration</span> = 5 min</span>
          </div>
          <div className="guide-programme-row">
            <span className="guide-programme-label">Week 2, Day 1</span>
            <span className="guide-programme-exercise">Breathing</span>
            <span className="guide-programme-vars"><span className="guide-var">duration</span> = 10 min</span>
          </div>
          <div className="guide-programme-row">
            <span className="guide-programme-label">Week 4, Day 1</span>
            <span className="guide-programme-exercise">Breathing</span>
            <span className="guide-programme-vars"><span className="guide-var">duration</span> = 20 min</span>
          </div>
        </div>
        <div className="guide-arrow">same script, progressing over weeks</div>
      </div>
    ),
  },
];

function openAIChat() {
  window.dispatchEvent(new CustomEvent('open-sidebar'));
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('assistant-greeting', {
      detail: 'Hey! I see you have questions about the exercise builder. What would you like help with?'
    }));
  }, 200);
}

export default function TimelineGuide({ onClose, startStep = 0 }) {
  const [step, setStep] = useState(startStep);
  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal guide-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{current.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <p className="guide-body">{current.body}</p>
          {current.example}
          {step === startStep && startStep > 0 && (
            <p className="guide-start-link">New to timelines and segments? <span className="empty-hint-link" onClick={() => setStep(0)}>Start from the beginning</span>.</p>
          )}
          {isLastStep && (
            <p className="guide-start-link">Still confused? <span className="empty-hint-link" onClick={() => { openAIChat(); onClose(); }}>Discuss with the AI</span>.</p>
          )}
        </div>

        <div className="guide-footer">
          <div className="guide-dots">
            {STEPS.map((_, i) => (
              <span key={i} className={`guide-dot ${i === step ? 'active' : ''}`} onClick={() => setStep(i)} />
            ))}
          </div>
          <div className="guide-nav">
            {step > 0 && <button className="modal-btn" onClick={() => setStep(step - 1)}>Back</button>}
            {step < STEPS.length - 1 ? (
              <button className="modal-btn modal-btn-primary" onClick={() => setStep(step + 1)}>Next</button>
            ) : (
              <button className="modal-btn modal-btn-primary" onClick={onClose}>Got it</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
