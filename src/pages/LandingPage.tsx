import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Database,
  FileCheck2,
  Layers,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { BlueStarLogo } from '../components/BlueStarLogo';
import { StatusIndicator } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const {
    theme,
    toggleTheme,
    isAuthenticated,
    metrics,
    candidateApplicationView,
    interviewDetailsView,
    departmentSummaries,
  } = useRecruitment();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleOpenWorkspace = () => {
    onNavigate(isAuthenticated ? '/dashboard' : '/login');
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const previewApplications = candidateApplicationView.slice(0, 4);
  const previewInterviews = interviewDetailsView.slice(0, 2);

  return (
    <div className="min-h-screen architectural-canvas text-[var(--text-primary)] relative">
      {/* Subtle Architectural Grid Overlay */}
      <div className="fixed inset-0 architectural-grid-overlay pointer-events-none z-0" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 facet-glass border-b border-[var(--border-subtle)]">
        <div className="max-w-[1360px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
            className="flex items-center gap-3 shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--brand-primary)] rounded"
          >
            <BlueStarLogo className="h-8" />
          </a>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav
            aria-label="Landing page navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--text-secondary)]"
          >
            <a
              href="#overview"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('overview');
              }}
              className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              Overview
            </a>
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('features');
              }}
              className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#workflow"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('workflow');
              }}
              className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              Workflow
            </a>
            <a
              href="#platform"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('platform');
              }}
              className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              Platform
            </a>
          </nav>

          {/* Zone 3: Theme Toggle + Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              className="btn-base btn-secondary !px-2.5 !py-2"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleOpenWorkspace}
              className="btn-base btn-primary hidden sm:inline-flex"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="btn-base btn-secondary !p-2 md:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Collapsible Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--surface-primary)] px-6 py-4 space-y-3">
            <div className="flex flex-col space-y-2 text-sm font-medium">
              <button
                type="button"
                onClick={() => scrollToSection('overview')}
                className="text-left py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="text-left py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Features
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('workflow')}
                className="text-left py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Workflow
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('platform')}
                className="text-left py-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Platform
              </button>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={handleOpenWorkspace}
                className="btn-base btn-primary w-full"
              >
                <span>Open Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10">
        {/* HERO SECTION — MotionSites Facet-Glass Inspired Composition */}
        <section
          id="overview"
          className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-[var(--border-subtle)]"
        >
          {/* Layer A: Background Oversized Architectural Facet Geometry */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden select-none"
          >
            <svg
              className="absolute -top-20 right-[-6%] w-[760px] h-[680px] opacity-65 animate-facet-slow"
              viewBox="0 0 800 700"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <polygon
                points="420,20 760,140 680,520 310,640 110,360"
                fill="var(--brand-subtle)"
                stroke="var(--border-emphasis)"
                strokeWidth="1.2"
              />
              <polygon
                points="420,20 680,520 310,640"
                fill="rgba(7, 87, 166, 0.04)"
                stroke="var(--border-subtle)"
                strokeWidth="1"
              />
              <polygon
                points="220,90 620,70 730,380 460,590 150,430"
                fill="rgba(234, 229, 218, 0.28)"
                stroke="var(--border-emphasis)"
                strokeWidth="1"
              />
              <line
                x1="420"
                y1="20"
                x2="310"
                y2="640"
                stroke="var(--border-emphasis)"
                strokeDasharray="4 4"
              />
              <line
                x1="110"
                y1="360"
                x2="760"
                y2="140"
                stroke="var(--border-subtle)"
                strokeWidth="0.8"
              />
            </svg>
          </div>

          <div className="max-w-[1360px] mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
              {/* Left Column: Message & Primary Actions */}
              <div className="lg:col-span-6 space-y-6 animate-hero-enter">
                <div className="inline-flex items-center gap-2.5 text-xs font-mono-tabular tracking-widest uppercase text-[var(--brand-primary)] font-semibold">
                  <span>EMPLOYEE RECRUITMENT SYSTEM</span>
                  <span aria-hidden="true" className="text-[var(--border-emphasis)]">
                    ·
                  </span>
                  <span className="text-[var(--text-secondary)]">BLUE STAR ENTERPRISE</span>
                </div>

                <h1
                  className="font-display font-bold tracking-tight text-[var(--text-primary)] leading-[1.08]"
                  style={{ fontSize: 'clamp(2.35rem, 4.2vw, 3.75rem)', textWrap: 'balance' }}
                >
                  Building Teams. Shaping Tomorrow.
                </h1>

                <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
                  A unified recruitment workspace for managing candidates, applications, interviews
                  and employee records with greater clarity and control.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3.5">
                  <button
                    type="button"
                    onClick={handleOpenWorkspace}
                    className="btn-base btn-primary !px-6 !py-3 text-sm"
                  >
                    <span>Explore the Platform</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToSection('workflow')}
                    className="btn-base btn-secondary !px-5 !py-3 text-sm"
                  >
                    <span>View Recruitment Workflow</span>
                  </button>
                </div>

                {/* Unboxed Quiet Architectural Metadata Strip */}
                <div className="pt-6 border-t border-[var(--border-subtle)] grid grid-cols-3 gap-6 max-w-lg">
                  <div>
                    <div className="text-2xl font-display font-bold font-mono-tabular text-[var(--text-primary)]">
                      {departmentSummaries.length}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Core Departments
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-display font-bold font-mono-tabular text-[var(--text-primary)]">
                      {metrics.openVacancies}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Active Vacancies
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-display font-bold font-mono-tabular text-[var(--text-primary)]">
                      {metrics.totalCandidates}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      Candidate Profiles
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Layered Facet-Glass Visual Composition */}
              <div className="lg:col-span-6 relative">
                {/* Layer B: Dimensional Angled Back Glass Plane */}
                <div
                  aria-hidden="true"
                  className="hidden sm:block absolute -inset-3 rounded-2xl facet-glass -rotate-1 translate-x-2 translate-y-2 pointer-events-none opacity-80"
                />

                {/* Layer C: Primary Facet-Glass Recruitment Interface Preview */}
                <div className="relative rounded-2xl facet-glass-strong p-5 sm:p-6 space-y-5">
                  {/* Top Bar of Preview */}
                  <div className="flex items-center justify-between gap-4 pb-3.5 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2.5">
                      <BlueStarLogo compact className="h-6" />
                      <div>
                        <div className="text-xs font-semibold text-[var(--text-primary)]">
                          Recruitment Operations Preview
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] font-mono-tabular">
                          ER_V_CANDIDATE_APPLICATION · Local Demonstration State
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenWorkspace}
                      className="text-xs font-medium text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <span>Live Workspace</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Miniature Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="surface-card rounded-lg p-3">
                      <div className="text-[11px] text-[var(--text-secondary)]">Applications</div>
                      <div className="text-lg font-display font-bold font-mono-tabular mt-0.5">
                        {metrics.totalApplications}
                      </div>
                    </div>
                    <div className="surface-card rounded-lg p-3">
                      <div className="text-[11px] text-[var(--text-secondary)]">Open Jobs</div>
                      <div className="text-lg font-display font-bold font-mono-tabular mt-0.5">
                        {metrics.openJobs}
                      </div>
                    </div>
                    <div className="surface-card rounded-lg p-3">
                      <div className="text-[11px] text-[var(--text-secondary)]">Interviews</div>
                      <div className="text-lg font-display font-bold font-mono-tabular mt-0.5">
                        {metrics.interviewsScheduled}
                      </div>
                    </div>
                    <div className="surface-card rounded-lg p-3">
                      <div className="text-[11px] text-[var(--text-secondary)]">Employees</div>
                      <div className="text-lg font-display font-bold font-mono-tabular mt-0.5">
                        {metrics.totalEmployees}
                      </div>
                    </div>
                  </div>

                  {/* Miniature Candidate Application Pipeline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span className="font-medium text-[var(--text-primary)]">
                        Active Candidate Pipeline
                      </span>
                      <span className="font-mono-tabular">
                        Showing {previewApplications.length} of {metrics.totalApplications} records
                      </span>
                    </div>
                    <div className="surface-card rounded-xl divide-y divide-[var(--border-subtle)] overflow-hidden">
                      {previewApplications.map((row) => (
                        <div
                          key={row.APPLICATION_ID}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-[var(--text-primary)] truncate">
                              {row.FULL_NAME}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] truncate">
                              #{row.APPLICATION_ID} · {row.JOB_TITLE} · {row.DEPT_NAME}
                            </div>
                          </div>
                          <StatusIndicator status={row.APPLICATION_STATUS} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Layer D: Compact Interview Schedule & Audit Accent Footer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="surface-inset rounded-xl p-3">
                      <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1.5">
                        Upcoming Interviews (ER_INTERVIEW)
                      </div>
                      {previewInterviews.map((intv) => (
                        <div
                          key={intv.INTERVIEW_ID}
                          className="flex items-center justify-between text-xs py-1"
                        >
                          <span className="truncate font-medium text-[var(--text-primary)]">
                            {intv.FULL_NAME} (R{intv.INTERVIEW_ROUND})
                          </span>
                          <span className="font-mono-tabular text-[11px] text-[var(--text-secondary)]">
                            {intv.INTERVIEW_MODE} · {intv.INTERVIEW_DATE}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="surface-inset rounded-xl p-3 flex flex-col justify-between">
                      <div className="text-[11px] font-medium text-[var(--text-secondary)]">
                        Status Audit Simulation
                      </div>
                      <div className="text-xs text-[var(--text-primary)] font-medium mt-1">
                        ER_APP_STATUS_AUDIT Trigger Active
                      </div>
                      <div className="text-[11px] font-mono-tabular text-[var(--text-secondary)] mt-1">
                        Every status transition logs OLD_STATUS → NEW_STATUS
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: CORE CAPABILITIES (Asymmetric Bento Grid) */}
        <section
          id="features"
          className="py-20 max-w-[1360px] mx-auto px-6 border-b border-[var(--border-subtle)]"
        >
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-mono-tabular uppercase tracking-widest text-[var(--brand-primary)] font-semibold">
               Core Capabilities
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">
              Structured Around the Blue Star Recruitment Data Model
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Every module maps directly to the normalized entities, relational constraints, and
              stored procedures defined in the Oracle SQL*Plus specification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Item 1 (2 cols) */}
            <div className="md:col-span-2 surface-card rounded-2xl p-7 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-semibold text-[var(--brand-primary)]">
                    01. Candidate & Application Pipeline
                  </span>
                  <Users className="w-5 h-5 text-[var(--brand-primary)]" />
                </div>
                <h3 className="text-xl font-display font-semibold text-[var(--text-primary)]">
                  Normalized Candidate Profiles & Unique Job Applications
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                  Manage candidate records (<code className="font-mono-tabular">ER_CANDIDATE</code>)
                  with enforced email uniqueness and non-negative experience validation. Submit
                  applications (<code className="font-mono-tabular">ER_APPLICATION</code>) linked to
                  specific department vacancies while preventing duplicate candidate-job pairs via{' '}
                  <code className="font-mono-tabular">ER_APP_UNQ</code>.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
                <span>
                  Allowed Statuses: APPLIED · SHORTLISTED · INTERVIEW · SELECTED · REJECTED · HIRED
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate(isAuthenticated ? '/applications' : '/login')}
                  className="font-semibold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Inspect Applications</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bento Item 2 (1 col) */}
            <div className="surface-card rounded-2xl p-7 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-semibold text-[var(--brand-primary)]">
                    02. Vacancy Control
                  </span>
                  <Building2 className="w-5 h-5 text-[var(--brand-primary)]" />
                </div>
                <h3 className="text-xl font-display font-semibold text-[var(--text-primary)]">
                  Department & Job Requisitions
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Track open requisitions across all 7 corporate departments with salary range
                  checks (<code className="font-mono-tabular">MIN_SALARY &lt;= MAX_SALARY</code>)
                  and live open-vacancy rollups.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] text-xs font-mono-tabular text-[var(--text-secondary)]">
                ER_DEPARTMENT · ER_JOB
              </div>
            </div>

            {/* Bento Item 3 (1 col) */}
            <div className="surface-card rounded-2xl p-7 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-semibold text-[var(--brand-primary)]">
                    03. Interview Evaluation
                  </span>
                  <CalendarCheck className="w-5 h-5 text-[var(--brand-primary)]" />
                </div>
                <h3 className="text-xl font-display font-semibold text-[var(--text-primary)]">
                  Round-Based Scoring & Feedback
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Schedule <code className="font-mono-tabular">ONLINE</code> or{' '}
                  <code className="font-mono-tabular">OFFLINE</code> interview rounds with numeric
                  round uniqueness per application and validated 0–100 evaluation scores.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] text-xs font-mono-tabular text-[var(--text-secondary)]">
                ER_INTERVIEW · ER_V_INTERVIEW_DETAILS
              </div>
            </div>

            {/* Bento Item 4 (2 cols) */}
            <div className="md:col-span-2 surface-card rounded-2xl p-7 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tabular font-semibold text-[var(--brand-primary)]">
                    04. Atomic Onboarding & Status Audit Trail
                  </span>
                  <UserCheck className="w-5 h-5 text-[var(--brand-primary)]" />
                </div>
                <h3 className="text-xl font-display font-semibold text-[var(--text-primary)]">
                  Transactional Hiring & Automatic Status Auditing
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
                  Executing the hiring workflow (<code className="font-mono-tabular">ER_HIRE_CANDIDATE</code>)
                  verifies eligibility, transitions the application to{' '}
                  <code className="font-mono-tabular">HIRED</code>, records an audit entry in{' '}
                  <code className="font-mono-tabular">ER_APPLICATION_AUDIT</code>, and creates the
                  linked <code className="font-mono-tabular">ER_EMPLOYEE</code> record in a single
                  atomic state transition.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
                <span>Enforces unique APPLICATION_ID and CANDIDATE_ID across employee records</span>
                <button
                  type="button"
                  onClick={() => onNavigate(isAuthenticated ? '/employees' : '/login')}
                  className="font-semibold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
                >
                  <span>View Employee Directory</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: RECRUITMENT WORKFLOW */}
        <section
          id="workflow"
          className="py-20 max-w-[1360px] mx-auto px-6 border-b border-[var(--border-subtle)]"
        >
          <div className="max-w-2xl mb-12">
            <div className="text-xs font-mono-tabular uppercase tracking-widest text-[var(--brand-primary)] font-semibold">
              End-to-End Lifecycle
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">
              Recruitment Workflow & Procedure Architecture
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              From candidate registration to employee onboarding, every stage validates relational
              integrity before committing changes to the workspace store.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[
              {
                step: 'Stage 01',
                proc: 'ER_ADD_CANDIDATE',
                title: 'Candidate Registration',
                desc: 'Validates unique email and experience years, assigning the next sequence ID from ER_CANDIDATE_SEQ.',
              },
              {
                step: 'Stage 02',
                proc: 'ER_APPLY_FOR_JOB',
                title: 'Job Application',
                desc: 'Links candidate to an open department job. Enforces ER_APP_UNQ so a candidate applies once per job.',
              },
              {
                step: 'Stage 03',
                proc: 'ER_UPDATE_STATUS',
                title: 'Screening & Audit',
                desc: 'Updates status across allowed values and fires ER_APP_STATUS_AUDIT to log the transition.',
              },
              {
                step: 'Stage 04',
                proc: 'ER_SCHEDULE_INTERVIEW',
                title: 'Interview Rounds',
                desc: 'Schedules numbered ONLINE or OFFLINE rounds and records 0–100 assessment scores and feedback.',
              },
              {
                step: 'Stage 05',
                proc: 'ER_HIRE_CANDIDATE',
                title: 'Employee Onboarding',
                desc: 'Atomically marks the application HIRED and creates the linked ACTIVE employee record in ER_EMPLOYEE.',
              },
            ].map((item) => (
              <div key={item.step} className="facet-glass rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-mono-tabular text-[var(--brand-primary)] font-semibold">
                    {item.step}
                  </div>
                  <h3 className="mt-1.5 text-base font-display font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] text-[11px] font-mono-tabular text-[var(--text-secondary)]">
                  {item.proc}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: PLATFORM ARCHITECTURE & THREE LAYERS OF TRUTH */}
        <section id="platform" className="py-20 max-w-[1360px] mx-auto px-6">
          <div className="facet-glass-strong rounded-2xl p-8 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="text-xs font-mono-tabular uppercase tracking-widest text-[var(--brand-primary)] font-semibold">
                Architectural Transparency
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">
                Built for Demonstration Clarity and Future Backend Integration
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                This workspace operates as a self-contained browser application. It preserves a
                strict separation between the supplied Oracle SQL*Plus schema (Layer A), the
                interactive browser demonstration state persisted in local storage (Layer B), and
                future database service connectivity (Layer C).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="surface-card rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <Database className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span>Layer A: SQL Schema</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                    7 tables, 2 relational views, 5 sequences, 6 procedures, and 1 status audit
                    trigger.
                  </p>
                </div>
                <div className="surface-card rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <Layers className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span>Layer B: Local State</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                    In-memory + localStorage persistence with instant reset to the SQL baseline.
                  </p>
                </div>
                <div className="surface-card rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
                    <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
                    <span>Constraint Guardrails</span>
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                    Validates primary keys, foreign keys, and check constraints before every state
                    update.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 surface-card rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <span className="text-sm font-display font-semibold text-[var(--text-primary)]">
                  Workspace Access
                </span>
                <span className="text-xs font-mono-tabular text-[var(--text-secondary)]">
                  Local Demo Mode
                </span>
              </div>
              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center justify-between py-1">
                  <span>Demonstration Username:</span>
                  <code className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                    demo.employee
                  </code>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Demonstration Password:</span>
                  <code className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                    demo.employee
                  </code>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span>Initial SQL Seed Records:</span>
                  <span className="font-mono-tabular text-[var(--text-primary)]">
                    7 Depts · 7 Jobs · 12 Candidates
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenWorkspace}
                className="btn-base btn-primary w-full !py-2.5"
              >
                <span>{isAuthenticated ? 'Continue to Dashboard' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Corporate Footer */}
      <footer className="relative z-10 border-t border-[var(--border-subtle)] bg-[var(--surface-primary)] py-10">
        <div className="max-w-[1360px] mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BlueStarLogo className="h-7" />
            <span className="text-xs text-[var(--text-secondary)]">
              Employee Recruitment System · Frontend Demonstration Workspace
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--text-secondary)]">
            <a
              href="https://www.bluestarindia.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Blue Star Corporate Reference
            </a>
            <button
              type="button"
              onClick={handleOpenWorkspace}
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Open Workspace
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
