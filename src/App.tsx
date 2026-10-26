/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AnimatedFacetBackground } from './components/AnimatedFacetBackground';
import { AppShell } from './components/AppShell';
import { BlueStarLogo } from './components/BlueStarLogo';
import { ChatbotWidget } from './components/ChatbotWidget';
import { ToastViewport } from './components/ui';
import { RecruitmentProvider, useRecruitment } from './context/RecruitmentContext';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CandidateWorkspacePage } from './pages/CandidateWorkspacePage';
import { CandidatesPage } from './pages/CandidatesPage';
import { DashboardPage } from './pages/DashboardPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { EmployeeWorkspacePage } from './pages/EmployeeWorkspacePage';
import { EmployeesPage } from './pages/EmployeesPage';
import { InterviewsPage } from './pages/InterviewsPage';
import { JobsPage } from './pages/JobsPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReportsPage } from './pages/ReportsPage';
import { ResumeReviewPage } from './pages/ResumeReviewPage';
import { SettingsPage } from './pages/SettingsPage';

const PROTECTED_ROUTES: Record<
  string,
  { title: string; subtitle: string; allowedRoles: Array<'HR' | 'EMPLOYEE' | 'CANDIDATE'> }
> = {
  '/dashboard': {
    title: 'HR Recruitment Dashboard',
    subtitle:
      'Executive summary of candidates, open vacancies, applications, scheduled interviews, and onboarded employees.',
    allowedRoles: ['HR'],
  },
  '/resume-review': {
    title: 'HR Resume Review & Submission Queue',
    subtitle:
      'Inspect submitted candidate applications, preview uploaded PDF resumes, record private HR notes, and update status.',
    allowedRoles: ['HR'],
  },
  '/candidates': {
    title: 'Candidate Directory (ER_CANDIDATE)',
    subtitle:
      'Manage candidate profiles, qualifications, and experience years with enforced email uniqueness.',
    allowedRoles: ['HR'],
  },
  '/jobs': {
    title: 'Job & Vacancy Management (ER_JOB)',
    subtitle:
      'Manage department job positions, salary brackets, vacancy counts, and open/closed status.',
    allowedRoles: ['HR'],
  },
  '/applications': {
    title: 'Application Management (ER_APPLICATION)',
    subtitle:
      'Submit job applications, transition candidate statuses with local audit logging, and execute atomic hiring.',
    allowedRoles: ['HR'],
  },
  '/interviews': {
    title: 'Interview Management (ER_INTERVIEW)',
    subtitle:
      'Schedule numbered ONLINE or OFFLINE interview rounds and record 0–100 candidate evaluation scores.',
    allowedRoles: ['HR'],
  },
  '/employees': {
    title: 'Employee Directory (ER_EMPLOYEE)',
    subtitle:
      'View employee profiles and manage salary, department assignment, designation, joining date, and employment status.',
    allowedRoles: ['HR'],
  },
  '/departments': {
    title: 'Department Directory (ER_DEPARTMENT)',
    subtitle:
      'Manage corporate departments and monitor department-wise open jobs and vacancy totals.',
    allowedRoles: ['HR'],
  },
  '/reports': {
    title: 'Reports, Analytics & Audit Trail',
    subtitle:
      'Cross-entity relational summaries, ER_APPLICATION_AUDIT logs, ER_APPLICATION_REPORT output, and CSV exports.',
    allowedRoles: ['HR'],
  },
  '/employee-workspace': {
    title: 'Employee Self-Service Workspace',
    subtitle:
      'View your personal employment record, department assignment, compensation details, and update your contact profile.',
    allowedRoles: ['EMPLOYEE', 'HR'],
  },
  '/candidate-workspace': {
    title: 'Candidate Application Workspace',
    subtitle:
      'Track your submitted job application status, upload or replace your PDF resume, and manage your applicant profile.',
    allowedRoles: ['CANDIDATE', 'HR'],
  },
  '/settings': {
    title: 'Workspace Settings & Schema Reference',
    subtitle:
      'Configure light/dark appearance, inspect local demonstration storage, or reset demonstration data to the SQL baseline.',
    allowedRoles: ['HR', 'EMPLOYEE', 'CANDIDATE'],
  },
};

function normalizePath(rawPath: string): string {
  if (!rawPath || rawPath === '') return '/';
  const cleaned = rawPath.split('?')[0].replace(/\/+$/, '');
  return cleaned === '' ? '/' : cleaned;
}

const RouterView: React.FC = () => {
  const { isAuthenticated, currentUser, toasts, dismissToast } = useRecruitment();
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

  const getDefaultHomeForRole = () => {
    if (!currentUser) return '/login';
    if (currentUser.role === 'EMPLOYEE') return '/employee-workspace';
    if (currentUser.role === 'CANDIDATE') return '/candidate-workspace';
    return '/dashboard';
  };

  // Public Landing Page
  if (currentPath === '/') {
    return (
      <>
        <LandingPage onNavigate={navigate} />
        <ChatbotWidget />
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Public Privacy Policy Page
  if (currentPath === '/privacy') {
    return (
      <>
        <PrivacyPolicyPage onNavigate={navigate} />
        <ChatbotWidget />
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Public Candidate Registration & Resume Submission Page
  if (currentPath === '/register') {
    return (
      <>
        <RegisterPage onNavigate={navigate} />
        <ChatbotWidget />
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Login Route
  if (currentPath === '/login') {
    return (
      <>
        <LoginPage onNavigate={navigate} intendedPath={intendedPath} />
        <ChatbotWidget />
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Check if route is a known protected route
  const routeMeta = PROTECTED_ROUTES[currentPath];
  if (routeMeta) {
    if (!isAuthenticated || !currentUser) {
      return (
        <>
          <LoginPage onNavigate={navigate} intendedPath={currentPath} />
          <ChatbotWidget />
          <ToastViewport toasts={toasts} onDismiss={dismissToast} />
        </>
      );
    }

    // Enforce role-specific boundaries (Employees and Candidates do not access HR-only screens)
    if (!routeMeta.allowedRoles.includes(currentUser.role)) {
      const targetHome = getDefaultHomeForRole();
      const fallbackMeta = PROTECTED_ROUTES[targetHome];
      return (
        <>
          <AppShell
            currentPath={targetHome}
            onNavigate={(path) => {
              setIntendedPath(path);
              navigate(path);
            }}
            pageTitle={fallbackMeta.title}
            pageSubtitle={fallbackMeta.subtitle}
          >
            {targetHome === '/employee-workspace' && (
              <EmployeeWorkspacePage onNavigate={navigate} />
            )}
            {targetHome === '/candidate-workspace' && (
              <CandidateWorkspacePage onNavigate={navigate} />
            )}
            {targetHome === '/dashboard' && <DashboardPage onNavigate={navigate} />}
          </AppShell>
          <ChatbotWidget />
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
          {currentPath === '/resume-review' && <ResumeReviewPage />}
          {currentPath === '/candidates' && <CandidatesPage />}
          {currentPath === '/jobs' && <JobsPage />}
          {currentPath === '/applications' && <ApplicationsPage />}
          {currentPath === '/interviews' && <InterviewsPage />}
          {currentPath === '/employees' && <EmployeesPage />}
          {currentPath === '/departments' && <DepartmentsPage />}
          {currentPath === '/reports' && <ReportsPage />}
          {currentPath === '/employee-workspace' && (
            <EmployeeWorkspacePage onNavigate={navigate} />
          )}
          {currentPath === '/candidate-workspace' && (
            <CandidateWorkspacePage onNavigate={navigate} />
          )}
          {currentPath === '/settings' && <SettingsPage onNavigate={navigate} />}
        </AppShell>
        <ChatbotWidget />
        <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // Unknown Route: Designed 404 Not Found Page
  return (
    <div className="min-h-screen architectural-canvas flex items-center justify-center p-6 relative">
      <AnimatedFacetBackground />
      <div className="relative z-10 max-w-md w-full facet-glass-strong rounded-2xl p-8 text-center space-y-5">
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
            onClick={() => navigate(isAuthenticated ? getDefaultHomeForRole() : '/login')}
            className="btn-base btn-primary text-xs"
          >
            <span>Open Workspace</span>
          </button>
        </div>
      </div>
      <ChatbotWidget />
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
