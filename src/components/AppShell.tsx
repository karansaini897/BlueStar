import React, { useState } from 'react';
import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  RefreshCw,
  Settings,
  Sun,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
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
    demoUser,
    logout,
    metrics,
    db,
    refreshSummaries,
    lastRefreshedAt,
  } = useRecruitment();

  const [sidebarCompact, setSidebarCompact] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      path: '/candidates',
      label: 'Candidates',
      icon: Users,
      badgeCount: metrics.totalCandidates,
    },
    {
      path: '/jobs',
      label: 'Jobs & Vacancies',
      icon: Briefcase,
      badgeCount: metrics.openJobs,
    },
    {
      path: '/applications',
      label: 'Applications',
      icon: FileText,
      badgeCount: metrics.totalApplications,
    },
    {
      path: '/interviews',
      label: 'Interviews',
      icon: CalendarCheck,
      badgeCount: db.interviews.length,
    },
    {
      path: '/employees',
      label: 'Employees',
      icon: UserCheck,
      badgeCount: metrics.totalEmployees,
    },
    {
      path: '/departments',
      label: 'Departments',
      icon: Building2,
      badgeCount: db.departments.length,
    },
    { path: '/reports', label: 'Reports & Audit', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (path: string) => {
    setMobileDrawerOpen(false);
    onNavigate(path);
  };

  const handleSignOut = () => {
    setMobileDrawerOpen(false);
    logout();
    onNavigate('/login');
  };

  return (
    <div className="min-h-screen architectural-canvas flex text-[var(--text-primary)] relative">
      <div className="fixed inset-0 architectural-grid-overlay pointer-events-none z-0" />

      {/* Desktop Sidebar */}
      <aside
        aria-label="Workspace sidebar navigation"
        className={`hidden lg:flex flex-col justify-between shrink-0 z-30 border-r border-[var(--border-subtle)] bg-[var(--surface-primary)] transition-all duration-200 ${
          sidebarCompact ? 'w-20' : 'w-64'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-[var(--border-subtle)]">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/');
              }}
              className="flex items-center gap-2.5 overflow-hidden"
              title="Blue Star's - Employee Recruitment System (Landing Page)"
            >
              <BlueStarLogo compact={sidebarCompact} className="h-8" />
            </a>
            <button
              type="button"
              onClick={() => setSidebarCompact((v) => !v)}
              aria-label={sidebarCompact ? 'Expand sidebar' : 'Collapse sidebar'}
              className="btn-base btn-tertiary !p-1.5 rounded-lg"
            >
              {sidebarCompact ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  title={sidebarCompact ? item.label : undefined}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--brand-primary)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    {!sidebarCompact && <span className="truncate">{item.label}</span>}
                  </div>
                  {!sidebarCompact && item.badgeCount !== undefined && (
                    <span
                      className={`text-xs font-mono-tabular ${
                        isActive ? 'text-white/90' : 'text-[var(--text-secondary)]'
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

        {/* Sidebar Footer: Demo Account Indicator & Theme */}
        <div className="p-3 border-t border-[var(--border-subtle)] space-y-2">
          {!sidebarCompact && (
            <div className="surface-inset rounded-lg p-2.5 text-xs">
              <div className="font-semibold text-[var(--text-primary)] truncate">
                {demoUser?.username ?? 'demo.employee'}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] truncate">
                Local Browser Demo Mode
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              className="btn-base btn-secondary flex-1 !py-2 text-xs"
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
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive
                          ? 'bg-[var(--brand-primary)] text-white'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]'
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
              <div className="text-xs text-[var(--text-secondary)]">
                Account: <strong className="text-[var(--text-primary)]">{demoUser?.username}</strong>
              </div>
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
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  Blue Star ERS
                </button>
                <span aria-hidden="true">/</span>
                <span className="text-[var(--text-primary)] font-medium truncate">{pageTitle}</span>
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
            {headerActions}
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1400px] w-full mx-auto space-y-6">
          {pageSubtitle && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] -mt-2">{pageSubtitle}</p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};
