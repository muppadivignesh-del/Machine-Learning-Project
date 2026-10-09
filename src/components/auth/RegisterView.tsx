import React, { useState } from 'react';
import { Shield, Lock, User, Mail, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';

interface RegisterViewProps {
  onRegisterSuccess: () => void;
  onNavigateToLogin: () => void;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  onRegisterSuccess,
  onNavigateToLogin
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Compute password strength
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { level: 0, text: 'None', color: 'transparent' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: 1, text: 'Weak', color: '#f43f5e' };
    if (score <= 4) return { level: 2, text: 'Good', color: '#f59e0b' };
    return { level: 3, text: 'Strong', color: '#10b981' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim() || !email.trim() || !username.trim() || !password) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify confirmation.');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      await api.register(fullName.trim(), email.trim(), username.trim(), password);
      setSuccessMessage('Account created successfully. Please log in.');
      setTimeout(() => {
        onRegisterSuccess();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {/* Brand Shield & Header */}
        <div className="auth-header">
          <div className="auth-logo-shield">
            <Shield size={28} className="shield-icon" />
          </div>
          <h1 className="auth-brand-name">
            Create Fraud<span className="text-primary-accent">Guard</span> Account
          </h1>
          <p className="auth-subtitle">Register new security analyst credentials</p>
        </div>

        {error && (
          <div className="auth-error-box">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="auth-success-box">
            <CheckCircle size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="reg-fullname">Full Name</label>
            <div className="input-icon-wrapper">
              <User size={16} className="input-icon" />
              <input
                id="reg-fullname"
                type="text"
                className="auth-input"
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Work Email</label>
            <div className="input-icon-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="reg-email"
                type="email"
                className="auth-input"
                placeholder="analyst@bank.internal"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-username">Username</label>
            <div className="input-icon-wrapper">
              <User size={16} className="input-icon" />
              <input
                id="reg-username"
                type="text"
                className="auth-input"
                placeholder="Choose username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="reg-password">Password</label>
              {password && (
                <span style={{ fontSize: '0.72rem', color: strength.color, fontWeight: 700 }}>
                  Strength: {strength.text}
                </span>
              )}
            </div>
            <div className="input-icon-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="reg-password"
                type="password"
                className="auth-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm">Confirm Password</label>
            <div className="input-icon-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="reg-confirm"
                type="password"
                className="auth-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-spinner-text">Creating Account...</span>
            ) : (
              <>
                <span>Create FraudGuard Account</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have registered credentials?</span>{' '}
          <button
            type="button"
            className="auth-link-btn"
            onClick={onNavigateToLogin}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
