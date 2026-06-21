import { useState } from 'react';
import { verifyPassword, changePassword } from '../api';
import PasswordChecker, { passwordIsValid } from './PasswordChecker';

export default function ChangePasswordModal({ onClose, onSuccess }) {
  const [stage, setStage] = useState('verify'); // 'verify' | 'newpw' | 'done'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyPassword(currentPassword);
      setStage('newpw');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setError('');
    if (!passwordIsValid(newPassword)) {
      setError('Password does not meet requirements');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setStage('done');
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal pw-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{stage === 'done' ? 'Password Updated' : stage === 'newpw' ? 'Set New Password' : 'Change Password'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {stage === 'verify' && (
          <form className="modal-body" onSubmit={handleVerify}>
            <p className="pw-modal-desc">Please enter your current password</p>
            {error && <div className="pw-modal-error">{error}</div>}
            <div className="pw-modal-field">
              <input
                type={showPassword ? 'text' : 'password'}
                className="pw-modal-input"
                placeholder="Current password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoFocus
                autoComplete="current-password"
              />
              <button type="button" className="pw-modal-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <button className="modal-btn modal-btn-primary" type="submit" disabled={loading || !currentPassword}>
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>
        )}

        {stage === 'newpw' && (
          <form className="modal-body" onSubmit={handleChangePassword}>
            <p className="pw-modal-desc">Please enter your new password</p>
            {error && <div className="pw-modal-error">{error}</div>}
            <div className="pw-modal-field">
              <input
                type={showPassword ? 'text' : 'password'}
                className="pw-modal-input"
                placeholder="New password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                autoFocus
                autoComplete="new-password"
              />
              <button type="button" className="pw-modal-toggle" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="pw-modal-input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {newPassword && <PasswordChecker password={newPassword} />}
            <button className="modal-btn modal-btn-primary" type="submit" disabled={loading || !passwordIsValid(newPassword)}>
              {loading ? 'Saving...' : 'Update Password'}
            </button>
          </form>
        )}

        {stage === 'done' && (
          <div className="modal-body">
            <p className="pw-modal-desc">Your password has been changed successfully.</p>
            <button className="modal-btn modal-btn-primary" onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
