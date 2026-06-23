import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import posthog from 'posthog-js';
import { submitFeedback } from '../api';

export default function FeedbackModal({ onClose }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    setError('');
    try {
      const sessionId = posthog.get_session_id?.() || '';
      await submitFeedback(message.trim(), location.pathname, sessionId);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="feedback-overlay" onClick={onClose}>
      <div className="feedback-modal" onClick={e => e.stopPropagation()}>
        {sent ? (
          <>
            <h3>Thanks for your feedback!</h3>
            <p className="feedback-sent-msg">Your message has been received.</p>
            <button className="feedback-close-btn" onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <h3>Send Feedback</h3>
            <form onSubmit={handleSubmit}>
              <textarea
                className="feedback-textarea"
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="What's on your mind? Bug reports, feature ideas, or general thoughts..."
                rows={5}
                autoFocus
              />
              {error && <p className="feedback-error">{error}</p>}
              <div className="feedback-actions">
                <button type="button" className="feedback-cancel-btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="feedback-submit-btn" disabled={sending || !message.trim()}>
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
