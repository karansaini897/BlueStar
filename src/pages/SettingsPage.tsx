import React, { useState } from 'react';
import {
  AlertTriangle,
  Database,
  Layers,
  LogOut,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import { Modal } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';

interface SettingsPageProps {
  onNavigate: (path: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const {
    db,
    theme,
    setTheme,
    currentUser,
    logout,
    resetDemoData,
  } = useRecruitment();

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleConfirmReset = () => {
    resetDemoData();
    setIsResetModalOpen(false);
  };

  const handleSignOut = () => {
    logout();
    onNavigate('/login');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. Theme Preference */}
      <section className="surface-card rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">
            Appearance & Theme System
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Switch between the warm architectural beige light theme and the deep charcoal-blue dark
            theme. Your selection is persisted locally in browser storage.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              theme === 'light'
                ? 'border-[var(--brand-primary)] bg-[var(--brand-subtle)]'
                : 'border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:border-[var(--border-emphasis)]'
            }`}
          >
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Sun className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Warm Architectural Light</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Warm beige canvas (#F3F0E8) + Blue Star corporate blue (#0757A6)
              </p>
            </div>
            {theme === 'light' && (
              <span className="text-xs font-mono-tabular font-semibold text-[var(--brand-primary)]">
                ACTIVE
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
              theme === 'dark'
                ? 'border-[var(--brand-primary)] bg-[var(--brand-subtle)]'
                : 'border-[var(--border-subtle)] bg-[var(--surface-primary)] hover:border-[var(--border-emphasis)]'
            }`}
          >
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Moon className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>Charcoal-Blue Dark</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Deep blue-charcoal surfaces (#13171D) + accessible steel-blue accents
              </p>
            </div>
            {theme === 'dark' && (
              <span className="text-xs font-mono-tabular font-semibold text-[var(--brand-primary)]">
                ACTIVE
              </span>
            )}
          </button>
        </div>
      </section>

      {/* 2. Local Data Status & Reset Demonstration Data */}
      <section className="surface-card rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">
              Local Demonstration Dataset (Layer B)
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 max-w-xl">
              This frontend operates entirely in your browser using in-memory state and{' '}
              <code className="font-mono-tabular">localStorage</code>. It is not connected to a
              live Oracle SQL*Plus database server.
            </p>
          </div>
          {currentUser?.role === 'HR' && (
            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="btn-base btn-destructive text-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Demo Data</span>
            </button>
          )}
        </div>

        <div className="surface-inset rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
          <div>
            <div className="text-[var(--text-secondary)]">ER_DEPARTMENT</div>
            <div className="font-mono-tabular font-bold text-sm mt-0.5">
              {db.departments.length}
            </div>
          </div>
          <div>
            <div className="text-[var(--text-secondary)]">ER_JOB</div>
            <div className="font-mono-tabular font-bold text-sm mt-0.5">{db.jobs.length}</div>
          </div>
          <div>
            <div className="text-[var(--text-secondary)]">ER_CANDIDATE</div>
            <div className="font-mono-tabular font-bold text-sm mt-0.5">
              {db.candidates.length}
            </div>
          </div>
          <div>
            <div className="text-[var(--text-secondary)]">ER_APPLICATION</div>
            <div className="font-mono-tabular font-bold text-sm mt-0.5">
              {db.applications.length}
            </div>
          </div>
          <div>
            <div className="text-[var(--text-secondary)]">ER_INTERVIEW</div>
            <div className="font-mono-tabular font-bold text-sm mt-0.5">
              {db.interviews.length}
            </div>
          </div>
          <div>
            <div className="text-[var(--text-secondary)]">ER_EMPLOYEE</div>
            <div className="font-mono-tabular font-bold text-sm mt-0.5">{db.employees.length}</div>
          </div>
          <div>
            <div className="text-[var(--text-secondary)]">ER_APP_AUDIT</div>
            <div className="font-mono-tabular font-bold text-sm mt-0.5">{db.audits.length}</div>
          </div>
        </div>
      </section>

      {/* 3. Demonstration Account & Session */}
      <section className="surface-card rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-subtle)] text-[var(--brand-primary)] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">
                Active Demonstration Session
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Signed in as:{' '}
                <strong className="text-[var(--text-primary)]">
                  {currentUser?.displayName ?? 'Demonstration User'}
                </strong>{' '}
                · Role: <strong className="text-[var(--brand-primary)]">{currentUser?.role ?? 'HR'}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="btn-base btn-secondary text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </section>

      {/* 4. Architectural Layers & Documented SQL Notes */}
      <section className="surface-card rounded-xl p-6 space-y-4 text-xs">
        <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">
          Three Layers of Truth & SQL Specification Notes
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="surface-inset rounded-xl p-4 space-y-1.5">
            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Layer A: Supplied Database Model</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Models all tables, check constraints, unique keys, views (
              <code className="font-mono-tabular">ER_V_CANDIDATE_APPLICATION</code>,{' '}
              <code className="font-mono-tabular">ER_V_INTERVIEW_DETAILS</code>), and stored
              procedures from <code className="font-mono-tabular">MiniProject Code.pdf</code>.
            </p>
          </div>

          <div className="surface-inset rounded-xl p-4 space-y-1.5">
            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Layer B: Frontend Demo State</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              All mutations execute synchronously in browser memory and persist to{' '}
              <code className="font-mono-tabular">localStorage</code>. Status updates simulate the{' '}
              <code className="font-mono-tabular">ER_APP_STATUS_AUDIT</code> trigger locally.
            </p>
          </div>

          <div className="surface-inset rounded-xl p-4 space-y-1.5">
            <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Layer C: Future Integration</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Centralized operations in <code className="font-mono-tabular">src/model/operations.ts</code>{' '}
              can later be connected to an API service without rewriting UI components.
            </p>
          </div>
        </div>
      </section>

      {/* Reset Demo Data Confirmation Dialog (Part XII.12.2) */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Demonstration Dataset"
        subtitle="Restores the initial Oracle SQL*Plus seed records and discards local demonstration changes."
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-xl p-3.5 bg-[var(--warning-bg)] text-[var(--warning)] border border-[var(--warning)]/30 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold">Confirm Local State Reset</div>
              <p className="leading-relaxed">
                All candidates, jobs, applications, interviews, employees, departments, resumes, and
                audit entries created or modified during this browser demonstration will be
                discarded and restored to the initial SQL baseline.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsResetModalOpen(false)}
              className="btn-base btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmReset}
              className="btn-base btn-destructive"
            >
              Confirm Reset Demo Data
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
