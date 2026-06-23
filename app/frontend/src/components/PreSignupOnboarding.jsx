import { useState, useEffect } from 'react';

/**
 * Onboarding slides shown before signup for builder invites.
 * Slides 0-3 are info cards. Slide 4 is the signup form (passed via renderSignup).
 * Slide 5 is the "Your turn" CTA shown after signup completes.
 *
 * Props:
 *   renderSignup(onComplete) — render the signup form fields inside the card.
 *                               Call onComplete() when signup succeeds.
 *   onDone()                 — called when the user finishes the final slide.
 *   skipSignup               — if true, omit the signup slide (for preview when viewer).
 */
export default function PreSignupOnboarding({ renderSignup, onDone, skipSignup }) {
  const [step, setStep] = useState(0);
  const [signedUp, setSignedUp] = useState(false);
  const hasSignup = !skipSignup && !!renderSignup;
  const total = hasSignup ? 6 : 4; // 4 info + signup + your turn, or just 4 info

  useEffect(() => {
    document.body.classList.add('onboarding-active');
    return () => document.body.classList.remove('onboarding-active');
  }, []);

  // After signup completes, advance to the final slide
  function handleSignupComplete() {
    setSignedUp(true);
    setStep(5);
  }

  return (
    <div className="ob-fullscreen">
      {step === 0 && (
        <div className="ob-slide">
          <div className="ob-slide-top">
            <h1 className="ob-hero">Meditation Pro</h1>
            <p className="ob-tagline">Build months of guided meditation in hours.</p>
          </div>
          <div className="ob-slide-bottom">
            <button className="ob-next" onClick={() => setStep(1)}>Get started</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="ob-slide">
          <div className="ob-slide-top">
            <div className="ob-eyebrow">The Approach</div>
            <h2 className="ob-heading">Variables First</h2>
            <p className="ob-desc">Write your script once. Use variables for breath counts, durations, and rounds. One exercise becomes an entire progression.</p>
            <div className="ob-var-demo" style={{ marginTop: 20 }}>
              <div className="ob-var-row">
                <span className="ob-var-name">breath</span>
                <div className="ob-var-progression">
                  <span>4s</span><span className="ob-var-arrow">→</span><span>6s</span><span className="ob-var-arrow">→</span><span>8s</span>
                </div>
              </div>
              <div className="ob-var-row">
                <span className="ob-var-name">rounds</span>
                <div className="ob-var-progression">
                  <span>3</span><span className="ob-var-arrow">→</span><span>5</span><span className="ob-var-arrow">→</span><span>8</span>
                </div>
              </div>
              <div className="ob-var-row">
                <span className="ob-var-name">hold</span>
                <div className="ob-var-progression">
                  <span>2s</span><span className="ob-var-arrow">→</span><span>4s</span><span className="ob-var-arrow">→</span><span>6s</span>
                </div>
              </div>
            </div>
          </div>
          <div className="ob-slide-bottom">
            <button className="ob-next" onClick={() => setStep(2)}>Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="ob-slide">
          <div className="ob-slide-top">
            <div className="ob-eyebrow">Our approach to AI</div>
            <h2 className="ob-heading">AI is a dial, not a switch.</h2>
            <p className="ob-desc">Use it for everything, nothing, or anything in between.</p>
            <div className="ob-ai-demo" style={{ marginTop: 20 }}>
              <div className="ob-ai-row">
                <span className="ob-ai-level ob-ai-full">Full AI</span>
                <span className="ob-ai-example">Paste a YouTube link → AI writes the script → AI generates the audio</span>
              </div>
              <div className="ob-ai-row">
                <span className="ob-ai-level ob-ai-mid">Mixed</span>
                <span className="ob-ai-example">Import a PDF → AI extracts the script → record your own voice</span>
              </div>
              <div className="ob-ai-row">
                <span className="ob-ai-level ob-ai-none">No AI</span>
                <span className="ob-ai-example">Write your own script → upload your own audio</span>
              </div>
            </div>
          </div>
          <div className="ob-slide-bottom">
            <button className="ob-next" onClick={() => setStep(3)}>Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="ob-slide">
          <div className="ob-slide-top">
            <div className="ob-eyebrow">Programmes</div>
            <h2 className="ob-heading">Give Students a Path</h2>
            <p className="ob-desc">Organise exercises into programmes by week and day. Your students see where they are, where they're going, and how they'll get there.</p>
            <div className="ob-prog-demo" style={{ marginTop: 20 }}>
              <div className="ob-prog-week"><span className="ob-prog-label">Week 1</span><span>4-count breathing · 3 rounds</span></div>
              <div className="ob-prog-week"><span className="ob-prog-label">Week 4</span><span>6-count breathing · 5 rounds</span></div>
              <div className="ob-prog-week"><span className="ob-prog-label">Week 8</span><span>8-count breathing · 8 rounds</span></div>
            </div>
          </div>
          <div className="ob-slide-bottom">
            <button className="ob-next" onClick={() => hasSignup ? setStep(4) : onDone?.()}>Next</button>
          </div>
        </div>
      )}

      {step === 4 && hasSignup && (
        <div className="ob-slide">
          <div className="ob-slide-top ob-signup-card">
            <div className="ob-eyebrow">Almost there</div>
            <h2 className="ob-heading">Create your account</h2>
            {renderSignup(handleSignupComplete)}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="ob-slide">
          <div className="ob-slide-top">
            <div className="ob-eyebrow">Get started</div>
            <h2 className="ob-heading">Your turn</h2>
            <p className="ob-desc">That same approach works for any exercise; from basic breathwork to advanced contemplative work. Create your first one, or explore what's already been built.</p>
          </div>
          <div className="ob-slide-bottom">
            <button className="ob-next" onClick={() => onDone?.()}>Create your first exercise</button>
          </div>
        </div>
      )}

      <div className="ob-footer">
        <div className="ob-dots">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              className={`ob-dot${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}
              onClick={() => {
                // Don't let them skip past signup or go back after signing up
                if (hasSignup && i >= 4 && !signedUp) return;
                if (signedUp && i < 5) return;
                setStep(i);
              }}
            />
          ))}
        </div>
        {step > 0 && step < 4 && (
          <button className="ob-skip" onClick={() => hasSignup ? setStep(4) : onDone?.()}>Skip</button>
        )}
      </div>
    </div>
  );
}
