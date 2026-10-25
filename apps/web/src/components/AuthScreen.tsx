import React, { useState } from 'react';
import { AuthUser } from '../types/event.types.js';
import { login, register, RegisterInput } from '../api/auth.api.js';
import { isDemoMode } from '../utils/env.utils.js';

export interface AuthScreenProps {
  initialMode?: 'login' | 'register';
  onSuccess?: (user: AuthUser) => void;
  onCancel?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'login',
  onSuccess,
  onCancel,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [skillsString, setSkillsString] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('Please provide both email and password.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await login(loginEmail, loginPassword);
      if (onSuccess) {
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    setLoginEmail(email);
    setLoginPassword('demo1234');
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, 'demo1234');
      if (onSuccess) {
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err?.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !regEmail.trim() || !regPassword) {
      setError('Please complete all required fields (first name, last name, email, password).');
      return;
    }

    if (regPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    const skills = skillsString
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const payload: RegisterInput = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      phone: phone.trim() || undefined,
      college_name: collegeName.trim() || undefined,
      skills: skills.length > 0 ? skills : undefined,
    };

    try {
      const user = await register(payload);
      if (onSuccess) {
        onSuccess(user);
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card-container" style={{ maxWidth: '480px', margin: '1rem auto', padding: '0 1rem' }}>
      <div
        className="card auth-card"
        style={{
          background: 'var(--color-bg-card, #ffffff)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--color-border, #e2e8f0)',
          boxShadow: 'var(--shadow-md)',
          padding: '2rem',
        }}
      >
        {/* Tab Toggle */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
            marginBottom: '1.5rem',
            gap: '1rem',
          }}
        >
          <button
            type="button"
            className={`btn-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: mode === 'login' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: mode === 'login' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: 600,
              fontSize: '1rem',
              padding: '0.6rem 0.5rem',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`btn-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: mode === 'register' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: mode === 'register' ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: 600,
              fontSize: '1rem',
              padding: '0.6rem 0.5rem',
              cursor: 'pointer',
              flex: 1,
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div
            className="alert alert-error"
            role="alert"
            style={{
              backgroundColor: 'var(--color-danger-light, #fee2e2)',
              color: 'var(--color-danger, #dc2626)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md, 8px)',
              marginBottom: '1.25rem',
              fontSize: '0.875rem',
              border: '1px solid #fca5a5',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {mode === 'login' ? (
          <div>
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="login-email"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}
                >
                  Email Address <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  placeholder="e.g. adwait@festconnect.edu"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label
                  htmlFor="login-password"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}
                >
                  Password <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  id="login-password"
                  type="password"
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.7rem', fontWeight: 600 }}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>

            {/* Quick Demo Logins (Enabled only in Development / Demo Mode) */}
            {isDemoMode && (
              <div style={{ marginTop: '1.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.6rem', textAlign: 'center' }}>
                  Quick Demo Accounts (Password: <code>demo1234</code>)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => handleQuickLogin('adwait@festconnect.edu')}
                    disabled={loading}
                    title="Login as Adwait Kamble (Participant & Team Leader)"
                  >
                    🎓 Student
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => handleQuickLogin('coordinator@festconnect.edu')}
                    disabled={loading}
                    title="Login as Prof. Shalu Mahajan (Event Coordinator)"
                  >
                    📋 Coordinator
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    onClick={() => handleQuickLogin('admin@festconnect.edu')}
                    disabled={loading}
                    title="Login as System Administrator"
                  >
                    ⚙️ Admin
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleRegisterSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label
                  htmlFor="reg-first-name"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}
                >
                  First Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  id="reg-first-name"
                  type="text"
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label
                  htmlFor="reg-last-name"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}
                >
                  Last Name <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input
                  id="reg-last-name"
                  type="text"
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="reg-email"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}
              >
                University Email <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="reg-email"
                type="email"
                className="form-input"
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                placeholder="e.g. yourname@festconnect.edu"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label
                htmlFor="reg-password"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}
              >
                Password (min 8 characters) <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="reg-password"
                type="password"
                className="form-input"
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                placeholder="Choose a strong password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                disabled={loading}
                required
                minLength={8}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label
                  htmlFor="reg-phone"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}
                >
                  Phone Number
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label
                  htmlFor="reg-college"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}
                >
                  College / Dept
                </label>
                <input
                  id="reg-college"
                  type="text"
                  className="form-input"
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                  placeholder="e.g. Dept. of Computer Science"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label
                htmlFor="reg-skills"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}
              >
                Skills / Interests (comma-separated)
              </label>
              <input
                id="reg-skills"
                type="text"
                className="form-input"
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                placeholder="e.g. Python, Machine Learning, UI/UX"
                value={skillsString}
                onChange={(e) => setSkillsString(e.target.value)}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.7rem', fontWeight: 600 }}
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Complete Sign Up'}
            </button>
          </form>
        )}

        {onCancel && (
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              type="button"
              className="btn btn-outline btn-xs"
              onClick={onCancel}
              style={{ color: 'var(--color-text-muted)' }}
            >
              Cancel / Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
