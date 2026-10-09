import React, { useState } from 'react';
import { Shield, Lock, User, Eye, EyeOff, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { api, AuthResponse } from '../../services/api';

interface LoginViewProps {
  onLoginSuccess: (authData: AuthResponse) => void;
  onNavigateToRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onNavigateToRegister
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('FraudGuard@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.login(username.trim(), password);
      onLoginSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemoCredentials = () => {
    setUsername('admin');
    setPassword('FraudGuard@2026');
    setError(null);
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
            Fraud<span className="text-primary-accent">Guard</span>
          </h1>
          <p className="auth-subtitle">DBSCAN-Based Transaction Anomaly Detection</p>
        </div>

        {/* Demo Credentials Quick-Fill Banner */}
        <div className="demo-credentials-banner">
          <div className="demo-badge">
            <Sparkles size={13} />
            <span>COLLEGE DEMO CREDENTIALS</span>
          </div>
          <div className="demo-creds-details">
            <div>Username: <code>admin</code></div>
            <div>Password: <code>FraudGuard@2026</code></div>
          </div>
          <button
            type="button"
            className="demo-autofill-btn"
            onClick={handleUseDemoCredentials}
          >
            Auto-Fill Demo Credentials
          </button>
        </div>

        {error && (
          <div className="auth-error-box">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="login-username">Username or Corporate Email</label>
            <div className="input-icon-wrapper">
              <User size={16} className="input-icon" />
              <input
                id="login-username"
                type="text"
                className="auth-input"
                placeholder="Enter username (e.g. admin)"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <div className="input-icon-wrapper">
              <Lock size={16} className="input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-input"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-row-remember">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span>Remember me for 24 hours</span>
            </label>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-spinner-text">Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Surveillance Terminal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer switch to register */}
        <div className="auth-footer">
          <span>Need a new analyst account?</span>{' '}
          <button
            type="button"
            className="auth-link-btn"
            onClick={onNavigateToRegister}
          >
            Register Here
          </button>
        </div>
      </div>
    </div>
  );
};
