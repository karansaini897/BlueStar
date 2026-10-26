import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Moon, Sun, UserPlus } from 'lucide-react';
import { AnimatedFacetBackground } from '../components/AnimatedFacetBackground';
import { BlueStarLogo } from '../components/BlueStarLogo';
import { useRecruitment } from '../context/RecruitmentContext';

interface LoginPageProps {
  onNavigate: (path: string) => void;
  intendedPath?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, intendedPath }) => {
  const { login, theme, toggleTheme } = useRecruitment();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = login(username, password);
    if (res.ok && res.account) {
      if (res.account.role === 'EMPLOYEE') {
        onNavigate('/employee-workspace');
      } else if (res.account.role === 'CANDIDATE') {
        onNavigate('/candidate-workspace');
      } else {
        onNavigate(
          intendedPath &&
            intendedPath !== '/login' &&
            intendedPath !== '/employee-workspace' &&
            intendedPath !== '/candidate-workspace'
            ? intendedPath
            : '/dashboard'
        );
      }
    } else {
      setError(res.error ?? 'Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen architectural-canvas flex flex-col justify-between relative">
      <AnimatedFacetBackground />

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

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('/register')}
            className="btn-base btn-secondary text-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>Register as Candidate</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="btn-base btn-secondary !p-2"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Login Card (Zero Exposed Demo Credentials per Section 11) */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md facet-glass-strong rounded-2xl p-7 sm:p-8 space-y-6 animate-hero-enter">
          <div className="space-y-3">
            <BlueStarLogo className="h-9" />
            <div className="pt-2">
              <h1 className="text-xl font-display font-bold text-[var(--text-primary)]">
                Sign In to Your Workspace
              </h1>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Enter your account username and password to access your HR, Employee, or Candidate
                workspace.
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
                placeholder="Enter your username"
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="input-field !pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle secret visibility"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
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
              <span>Sign In</span>
            </button>
          </form>

          {/* New Candidate Registration Entry Point */}
          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 text-xs">
            <span className="text-[var(--text-secondary)]">Applying for an open position?</span>
            <button
              type="button"
              onClick={() => onNavigate('/register')}
              className="font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer"
            >
              Create Candidate Account →
            </button>
          </div>

          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
            Prototype Notice: Role-based sessions are simulated locally in the browser for
            demonstration purposes and do not perform server-side authentication.
          </p>
        </div>
      </main>

      <footer className="relative z-10 py-4 text-center text-xs text-[var(--text-secondary)]">
        Blue Star&apos;s - Employee Recruitment System ·{' '}
        <button
          type="button"
          onClick={() => onNavigate('/privacy')}
          className="hover:text-[var(--brand-primary)] underline cursor-pointer"
        >
          Privacy Policy
        </button>
      </footer>
    </div>
  );
};
