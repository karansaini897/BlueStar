import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sun,
  Terminal,
  UserCheck,
  UserCircle2,
  Users,
  X,
} from 'lucide-react';
import { AnimatedFacetBackground } from './AnimatedFacetBackground';
import { BlueStarLogo } from './BlueStarLogo';
import { useRecruitment } from '../context/RecruitmentContext';

export interface NavItem {
  path: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  badgeCount?: number;
}

interface AppShellProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  pageTitle: string;
  pageSubtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

const SIDEBAR_STORAGE_KEY = 'bluestar_ers_sidebar_compact_v1';

export const AppShell: React.FC<AppShellProps> = ({
  currentPath,
  onNavigate,
  pageTitle,
  pageSubtitle,
  headerActions,
  children,
}) => {
  const {
    theme,
    toggleTheme,
    currentUser,
    logout,
    metrics,
    db,
    refreshSummaries,
    lastRefreshedAt,
  } = useRecruitment();

  const [sidebarCompact, setSidebarCompact] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleSidebarCompact = () => {
    setSidebarCompact((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const role = currentUser?.role ?? 'HR';

  const navItems: NavItem[] = useMemo(() => {
    if (role === 'EMPLOYEE') {
      return [
        {
          path: '/employee-workspace',
          label: 'My Workspace',
          icon: UserCircle2,
        },
        { path: '/settings', label: 'Settings', icon: Settings },
      ];
    }

    if (role === 'CANDIDATE') {
      return [
        {
          path: '/candidate-workspace',
          label: 'Candidate Workspace',
          icon: FileText,
        },
        { path: '/settings', label: 'Settings', icon: Settings },
      ];
    }

    return [
      { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      {
        path: '/candidates',
        label: 'Candidates',
        icon: Users,
        badgeCount: metrics.totalCandidates,
      },
      {
        path: '/resume-review',
        label: 'Resume Review',
        icon: ClipboardCheck,
        badgeCount: metrics.applicationsAwaitingReview,
      },
      {
        path: '/applications',
        label: 'Applications',
        icon: FileText,
        badgeCount: metrics.totalApplications,
      },
      {
        path: '/employees',
        label: 'Employees',
        icon: UserCheck,
        badgeCount: metrics.totalEmployees,
      },
      {
        path: '/interviews',
        label: 'Interviews',
        icon: CalendarCheck,
        badgeCount: db.interviews.length,
      },
      {
        path: '/jobs',
        label: 'Jobs & Vacancies',
        icon: Briefcase,
        badgeCount: metrics.openJobs,
      },
      {
        path: '/departments',
        label: 'Departments',
        icon: Building2,
        badgeCount: db.departments.length,
      },
      {
        path: '/sql-console',
        label: 'SQL Console',
        icon: Terminal,
      },
      {
        path: '/accounts',
        label: 'Account Directory',
        icon: ShieldCheck,
        badgeCount: db.accounts.length,
      },
      { path: '/reports', label: 'Reports & Audit', icon: BarChart3 },
      { path: '/settings', label: 'Settings', icon: Settings },
    ];
  }, [
    role,
    metrics.totalCandidates,
    metrics.applicationsAwaitingReview,
    metrics.totalApplications,
    metrics.totalEmployees,
    metrics.openJobs,
    db.interviews.length,
    db.departments.length,
    db.accounts.length,
  ]);

  const handleNavClick = (path: string) => {
    setMobileDrawerOpen(false);
    onNavigate(path);
  };

  const handleSignOut = () => {
    setMobileDrawerOpen(false);
    logout();
    onNavigate('/login');
  };

  const workspaceRoleBadge =
    role === 'HR'
      ? 'HR Administration'
      : role === 'EMPLOYEE'
        ? 'Employee Portal'
        : 'Candidate Portal';

  return (
    <div className="min-h-screen architectural-canvas flex text-[var(--text-primary)] relative">
      <AnimatedFacetBackground />

      {/* Desktop Sidebar */}
      <aside
        aria-label="Workspace sidebar navigation"
        className={`hidden lg:flex flex-col justify-between shrink-0 z-30 border-r border-[var(--border-subtle)] bg-[var(--surface-primary)]/95 backdrop-blur-md transition-[width] duration-200 ${
          sidebarCompact ? 'w-16' : 'w-64'
        }`}
      >
        <div>
          {/* Brand Header: In collapsed mode, remove the logo completely per Section 20 */}
          <div
            className={`h-16 px-3 flex items-center border-b border-[var(--border-subtle)] ${
              sidebarCompact ? 'justify-center' : 'justify-between'
            }`}
          >
            {!sidebarCompact && (
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/');
                }}
                className="flex items-center gap-2.5 overflow-hidden"
                title="Blue Star's - Employee Recruitment System (Landing Page)"
              >
                <BlueStarLogo className="h-8" />
              </a>
            )}
            <button
              type="button"
              onClick={toggleSidebarCompact}
              aria-label={sidebarCompact ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCompact ? 'Expand sidebar' : 'Collapse sidebar'}
              className="btn-base btn-tertiary !p-2 rounded-lg"
            >
              {sidebarCompact ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {!sidebarCompact && (
            <div className="px-4 pt-3 pb-1 text-xs text-[var(--text-secondary)] flex items-center justify-between">
              <span className="font-semibold text-[var(--brand-primary)]">{workspaceRoleBadge}</span>
              <span>Prototype</span>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-2.5 space-y-1" aria-label="Workspace modules">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  title={sidebarCompact ? item.label : undefined}
                  aria-label={item.label}
                  className={`group relative w-full flex items-center ${
                    sidebarCompact ? 'justify-center px-2' : 'justify-between px-3'
                  } gap-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--brand-subtle)] hover:text-[var(--brand-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCompact && <span className="truncate">{item.label}</span>}
                  </div>
                  {!sidebarCompact && item.badgeCount !== undefined && (
                    <span
                      className={`text-xs font-mono-tabular ${
                        isActive ? 'text-white/90' : 'text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)]'
                      }`}
                    >
                      {item.badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Account Indicator & Theme */}
        <div className="p-2.5 border-t border-[var(--border-subtle)] space-y-2">
          {!sidebarCompact && currentUser && (
            <div className="surface-inset rounded-lg p-2.5 text-xs">
              <div className="font-semibold text-[var(--text-primary)] truncate">
                {currentUser.displayName}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] truncate">
                {workspaceRoleBadge} · Local Session
              </div>
            </div>
          )}

          <div className={`flex ${sidebarCompact ? 'flex-col' : 'items-center'} gap-1.5`}>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className="btn-base btn-secondary flex-1 !py-2 !px-2.5 text-xs"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {!sidebarCompact && <span>{theme === 'light' ? 'Dark' : 'Light'}</span>}
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out of demonstration session"
              title="Sign Out"
              className="btn-base btn-secondary !px-2.5 !py-2 text-xs"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation drawer"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-[var(--surface-primary)] border-r border-[var(--border-subtle)] flex flex-col justify-between z-10 p-4">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
                <BlueStarLogo className="h-7" />
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close navigation menu"
                  className="btn-base btn-tertiary !p-1.5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => handleNavClick(item.path)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[var(--brand-primary)] text-white'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--brand-subtle)] hover:text-[var(--brand-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badgeCount !== undefined && (
                        <span className="text-xs font-mono-tabular">{item.badgeCount}</span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
              {currentUser && (
                <div className="text-xs text-[var(--text-secondary)]">
                  Signed in as:{' '}
                  <strong className="text-[var(--text-primary)]">{currentUser.displayName}</strong>{' '}
                  ({workspaceRoleBadge})
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="btn-base btn-secondary flex-1 text-xs"
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="btn-base btn-destructive text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Top Bar Contract for Workspace */}
        <header className="sticky top-0 z-20 h-16 px-4 sm:px-8 facet-glass border-b border-[var(--border-subtle)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation drawer"
              className="btn-base btn-secondary !p-2 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <button
                  type="button"
                  onClick={() => onNavigate('/')}
                  className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
                >
                  Blue Star ERS
                </button>
                <span aria-hidden="true">/</span>
                <span className="text-[var(--text-primary)] font-medium truncate">
                  {pageTitle}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-display font-bold text-[var(--text-primary)] truncate">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <span className="hidden xl:inline-block text-xs text-[var(--text-secondary)] font-mono-tabular">
              Synced {lastRefreshedAt}
            </span>
            <button
              type="button"
              onClick={refreshSummaries}
              aria-label="Refresh locally calculated summaries"
              title="Recalculate summaries from local state"
              className="btn-base btn-secondary !px-2.5 !py-2 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className="btn-base btn-secondary !p-2 text-xs"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            {headerActions}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1400px] w-full mx-auto space-y-6 pb-24">
          {pageSubtitle && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] -mt-2">{pageSubtitle}</p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
