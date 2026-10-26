/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AppShell } from './components/AppShell';
import { BlueStarLogo } from './components/BlueStarLogo';
import { ToastViewport } from './components/ui';
import { RecruitmentProvider, useRecruitment } from './context/RecruitmentContext';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { DashboardPage } from './pages/DashboardPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { InterviewsPage } from './pages/InterviewsPage';
import { JobsPage } from './pages/JobsPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const PROTECTED_ROUTES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Recruitment Dashboard',
    subtitle:
      'Live executive summary of candidates, open vacancies, applications, scheduled interviews, and onboarded employees.',
  },
  '/candidates': {
    title: 'Candidate Directory (ER_CANDIDATE)',
    subtitle:
      'Manage candidate profiles, qualifications, and experience years with enforced email uniqueness.',
  },
  '/jobs': {
    title: 'Job & Vacancy Management (ER_JOB)',
    subtitle:
      'Manage department job positions, salary brackets, vacancy counts, and open/closed status.',
  },
  '/applications': {
    title: 'Application Management (ER_APPLICATION)',
    subtitle:
      'Submit job applications, transition candidate statuses with local audit logging, and execute atomic hiring.',
  },
  '/interviews': {
    title: 'Interview Management (ER_INTERVIEW)',
    subtitle:
      'Schedule numbered ONLINE or OFFLINE interview rounds and record 0–100 candidate evaluation scores.',
  },
  '/employees': {
    title: 'Employee Directory (ER_EMPLOYEE)',
    subtitle:
      'View and manage onboarded employees linked to verified applications and candidates.',
  },
  '/departments': {
    title: 'Department Directory (ER_DEPARTMENT)',
    subtitle:
      'Manage corporate departments and monitor department-wise open jobs and vacancy totals.',
  },
  '/reports': {
    title: 'Reports, Analytics & Audit Trail',
    subtitle:
      'Cross-entity relational summaries, ER_APPLICATION_AUDIT logs, ER_APPLICATION_REPORT output, and CSV exports.',
  },
  '/settings': {
    title: 'Workspace Settings & Schema Reference',
    subtitle:
      'Configure light/dark appearance, inspect local demonstration storage, or reset demonstration data to the SQL baseline.',
  },
};

function normalizePath(rawPath: string): string {
  if (!rawPath || rawPath === '') return '/';
  const cleaned = rawPath.split('?')[0].replace(/\/+$/, '');
  return cleaned === '' ? '/' : cleaned;
}

const RouterView: React.FC = () => {
  const { isAuthenticated, toasts, dismissToast } = useRecruitment();
  const [currentPath, setCurrentPath] = useState<string>(() =>
    normalizePath(window.location.pathname)
  );
  const [intendedPath, setIntendedPath] = useState<string>('/dashboard');

  // Keep HTML document title strictly set to "Blue Star's - Employee Recruitment System"
  useEffect(() => {
    document.title = "Blue Star's - Employee Recruitment System";
  }, [currentPath]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((targetPath: string) => {
    const norm = normalizePath(targetPath);
    if (window.location.pathname !== norm) {
      window.history.pushState({}, '', norm);
    }
    setCurrentPath(norm);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Public Landing Page
  if (currentPath === '/') {
    return (
      <>
        <LandingPage onNavigate={navigate} />
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Login Route
  if (currentPath === '/login') {
    return (
      <>
        <LoginPage onNavigate={navigate} intendedPath={intendedPath} />
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Check if route is a known protected route
  const routeMeta = PROTECTED_ROUTES[currentPath];
  if (routeMeta) {
    if (!isAuthenticated) {
      return (
        <>
          <LoginPage onNavigate={navigate} intendedPath={currentPath} />
          <ToastViewport toasts={toasts} onDismiss={dismissToast} />
        </>
      );
    }

    return (
      <>
        <AppShell
          currentPath={currentPath}
          onNavigate={(path) => {
            setIntendedPath(path);
            navigate(path);
          }}
          pageTitle={routeMeta.title}
          pageSubtitle={routeMeta.subtitle}
        >
          {currentPath === '/dashboard' && <DashboardPage onNavigate={navigate} />}
          {currentPath === '/candidates' && <CandidatesPage />}
          {currentPath === '/jobs' && <JobsPage />}
          {currentPath === '/applications' && <ApplicationsPage />}
          {currentPath === '/interviews' && <InterviewsPage />}
          {currentPath === '/employees' && <EmployeesPage />}
          {currentPath === '/departments' && <DepartmentsPage />}
          {currentPath === '/reports' && <ReportsPage />}
          {currentPath === '/settings' && <SettingsPage onNavigate={navigate} />}
        </AppShell>
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Unknown Route: Designed 404 Not Found Page
  return (
    <div className="min-h-screen architectural-canvas flex items-center justify-center p-6">
      <div className="max-w-md w-full facet-glass-strong rounded-2xl p-8 text-center space-y-5">
        <div className="flex justify-center">
          <BlueStarLogo className="h-8" />
        </div>
        <div className="space-y-1.5">
          <div className="text-xs font-mono-tabular uppercase tracking-widest text-[var(--brand-primary)] font-semibold">
            Route Not Found (404)
          </div>
          <h1 className="text-xl font-display font-bold text-[var(--text-primary)]">
            The requested page does not exist
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Path <code className="font-mono-tabular">{currentPath}</code> is not registered in Blue
            Star&apos;s - Employee Recruitment System.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-base btn-secondary text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Landing Page</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            className="btn-base btn-primary text-xs"
          >
            <span>Open Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <RecruitmentProvider>
      <RouterView />
    </RecruitmentProvider>
  );
}
