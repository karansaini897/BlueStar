import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, Moon, Sun, UserCheck } from 'lucide-react';
import { BlueStarLogo } from '../components/BlueStarLogo';
import { DEMO_CREDENTIALS, useRecruitment } from '../context/RecruitmentContext';

interface LoginPageProps {
  onNavigate: (path: string) => void;
  intendedPath?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigate,
  intendedPath = '/dashboard',
}) => {
  const { login, theme, toggleTheme } = useRecruitment();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = login(username, password);
    if (res.ok) {
      onNavigate(intendedPath && intendedPath !== '/login' ? intendedPath : '/dashboard');
    } else {
      setError(res.error ?? 'Invalid demonstration credentials.');
    }
  };

  const handleFillDemo = () => {
    setUsername(DEMO_CREDENTIALS.username);
    setPassword(DEMO_CREDENTIALS.password);
    setError(null);
  };

  return (
    <div className="min-h-screen architectural-canvas flex flex-col justify-between relative">
      <div className="fixed inset-0 architectural-grid-overlay pointer-events-none z-0" />

      {/* Header */}
      <header className="relative z-10 max-w-[1360px] w-full mx-auto px-6 py-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="btn-base btn-secondary text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Landing Page</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          className="btn-base btn-secondary !p-2"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md facet-glass-strong rounded-2xl p-7 sm:p-8 space-y-6 animate-hero-enter">
          <div className="space-y-3">
            <BlueStarLogo className="h-9" />
            <div className="pt-2">
              <h1 className="text-xl font-display font-bold text-[var(--text-primary)]">
                Blue Star's - Employee Recruitment System
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                Sign in with the local demonstration account to access candidate, job, application,
                interview, and employee records.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="login-username"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5"
              >
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="demo.employee"
                autoComplete="username"
                className="input-field"
                required
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="demo.employee"
                  autoComplete="current-password"
                  className="input-field !pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
              >
                {error}
              </div>
            )}

            <button type="submit" className="btn-base btn-primary w-full !py-2.5">
              <Lock className="w-4 h-4" />
              <span>Sign In to Workspace</span>
            </button>
          </form>

          {/* Local Demo Credentials Helper Box */}
          <div className="surface-inset rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Demonstration Credentials</span>
              </span>
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-xs font-semibold text-[var(--brand-primary)] hover:underline"
              >
                Fill Credentials
              </button>
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-mono-tabular space-y-1">
              <div>Username: {DEMO_CREDENTIALS.username}</div>
              <div>Password: {DEMO_CREDENTIALS.password}</div>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] leading-normal">
              Frontend-only demonstration session. No server-side authentication or live Oracle
              database connection is performed.
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-4 text-center text-xs text-[var(--text-secondary)]">
        Blue Star's - Employee Recruitment System · Local Browser Demonstration
      </footer>
    </div>
  );
};
