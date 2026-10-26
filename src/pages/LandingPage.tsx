import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileCheck2,
  Layers,
  Lock,
  Mail,
  Menu,
  Moon,
  Send,
  ShieldCheck,
  Sun,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { AnimatedFacetBackground } from '../components/AnimatedFacetBackground';
import { BlueStarLogo } from '../components/BlueStarLogo';
import { useRecruitment } from '../context/RecruitmentContext';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: '1. How do candidates register on the platform?',
    answer:
      'Job applicants can select "Register as Candidate" from the landing page or sign-in screen. Completing the registration form creates a local candidate profile (ER_CANDIDATE), links it to the selected job opening, and assigns the Candidate role by default.',
  },
  {
    question: '2. How do candidates submit their resumes?',
    answer:
      'During candidate registration—or afterward inside the Candidate Workspace—applicants can select or drag-and-drop a PDF resume (.pdf up to 5 MB). The system validates the file extension, MIME type, and file size before recording the submission.',
  },
  {
    question: '3. What happens after a resume is submitted?',
    answer:
      'Once submitted, the application is recorded with status APPLIED in local prototype state and queued in the HR Resume Review interface. HR can inspect the candidate qualification, preview the uploaded PDF resume in the current browser session, and transition the application status.',
  },
  {
    question: '4. How can candidates check their application status?',
    answer:
      'Candidates can sign in to open their dedicated Candidate Workspace (/candidate-workspace), which displays their submitted position, department, current application status (APPLIED, SHORTLISTED, INTERVIEW, SELECTED, REJECTED, or HIRED), and next steps.',
  },
  {
    question: '5. How does HR review candidate submissions?',
    answer:
      'Authenticated HR administrators use the HR Resume Review workspace (/resume-review) and Application Management view (/applications) to inspect applicant qualifications, open session PDF resumes, record internal HR review notes, and update application statuses.',
  },
  {
    question: '6. How do employees access their workspace?',
    answer:
      'Authenticated employees sign in through the Sign In page and are routed to the Employee Workspace (/employee-workspace). There they can view their own profile, designation, department, joining date, and permitted personal details without seeing other employees’ private records.',
  },
  {
    question: '7. How do users navigate between the public site and their workspace?',
    answer:
      'Every workspace header includes a breadcrumb link back to the public landing page, and the public navigation bar includes a workspace action button that routes signed-in users directly to their role-specific workspace (HR, Employee, or Candidate).',
  },
  {
    question: '8. Is information connected to a live Oracle SQL*Plus database?',
    answer:
      'No. While all entities, constraints, and status workflows strictly model the supplied Oracle SQL*Plus schema (ER_DEPARTMENT, ER_JOB, ER_CANDIDATE, ER_APPLICATION, ER_INTERVIEW, ER_EMPLOYEE, and ER_APPLICATION_AUDIT), this prototype runs entirely in browser memory and local storage.',
  },
  {
    question: '9. Are uploaded PDF resumes sent to an external HR server?',
    answer:
      'No. Uploaded PDF files are validated and retained locally within your browser session for prototype demonstration and HR preview. No files are transmitted to an external cloud bucket or corporate server.',
  },
  {
    question: '10. How do I switch between Light Mode and Dark Mode?',
    answer:
      'Use the Sun/Moon toggle button in the top navigation bar, workspace sidebar, or Settings page. Your selection persists in browser localStorage and defaults to your operating system preference when first opened.',
  },
  {
    question: '11. What should I do if I cannot sign in?',
    answer:
      'Verify that your username and password match the prototype account convention for your registered profile, or create a new applicant account via the Candidate Registration page. If local demonstration state was modified, HR can reset the dataset in Settings.',
  },
  {
    question: '12. Which features are currently simulated locally?',
    answer:
      'Authentication, role checks, candidate registration, PDF resume previews, application status transitions, audit logging, interview scheduling, atomic candidate hiring, employee directory updates, and the Contact Us form all operate locally in the browser.',
  },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { theme, toggleTheme, isAuthenticated, currentUser, notify } = useRecruitment();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Contact Us form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  const getWorkspacePath = () => {
    if (!isAuthenticated || !currentUser) return '/login';
    if (currentUser.role === 'EMPLOYEE') return '/employee-workspace';
    if (currentUser.role === 'CANDIDATE') return '/candidate-workspace';
    return '/dashboard';
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);

    const name = contactName.trim();
    const email = contactEmail.trim();
    const subject = contactSubject.trim();
    const message = contactMessage.trim();

    if (!name || !email || !subject || !message) {
      setContactError('All fields (Name, Email, Subject, and Message) are required.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setContactError('Please enter a valid email address format (e.g., applicant@domain.com).');
      return;
    }

    setContactSubmitted(true);
    notify(
      'success',
      'Inquiry Recorded (Local Prototype Simulation)',
      'Your message was validated locally. No external email was transmitted.'
    );
  };

  return (
    <div className="min-h-screen architectural-canvas text-[var(--text-primary)] relative flex flex-col">
      <AnimatedFacetBackground />

      {/* A. Top Navigation Bar (Strict 3-Zone Contract + Mobile Menu) */}
      <header className="sticky top-0 z-30 facet-glass border-b border-[var(--border-subtle)]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 whitespace-nowrap shrink-0"
            aria-label="Blue Star Employee Recruitment System Home"
          >
            <BlueStarLogo className="h-8" />
          </a>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav
            aria-label="Public site navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--text-secondary)]"
          >
            <a
              href="#platform"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('platform');
              }}
              className="hover:text-[var(--brand-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              Platform
            </a>
            <a
              href="#workflow"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('workflow');
              }}
              className="hover:text-[var(--brand-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              Workflow
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('about');
              }}
              className="hover:text-[var(--brand-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              About Us
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('contact');
              }}
              className="hover:text-[var(--brand-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              Contact Us
            </a>
            <a
              href="#faqs"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection('faqs');
              }}
              className="hover:text-[var(--brand-primary)] transition-colors whitespace-nowrap shrink-0"
            >
              FAQs
            </a>
          </nav>

          {/* Zone 3: Theme Toggle & Sign In / Workspace Entry */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              className="btn-base btn-secondary !p-2"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => onNavigate(getWorkspacePath())}
              className="hidden sm:inline-flex btn-base btn-primary text-xs"
            >
              <span>{isAuthenticated ? 'Open Workspace' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="btn-base btn-secondary !p-2 md:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--surface-primary)] px-6 py-4 space-y-3">
            <div className="flex flex-col space-y-2 text-sm font-medium">
              <button
                type="button"
                onClick={() => scrollToSection('platform')}
                className="text-left py-1.5 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
              >
                Platform
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('workflow')}
                className="text-left py-1.5 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
              >
                Workflow
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('about')}
                className="text-left py-1.5 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
              >
                About Us
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('contact')}
                className="text-left py-1.5 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
              >
                Contact Us
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('faqs')}
                className="text-left py-1.5 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
              >
                FAQs
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/privacy');
                }}
                className="text-left py-1.5 text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
              >
                Privacy Policy
              </button>
            </div>
            <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/register');
                }}
                className="btn-base btn-secondary flex-1 text-xs"
              >
                Register as Candidate
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate(getWorkspacePath());
                }}
                className="btn-base btn-primary flex-1 text-xs"
              >
                {isAuthenticated ? 'Open Workspace' : 'Sign In'}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 flex-1">
        {/* B. Facet-Glass Hero Section (Zero Private Data) */}
        <section className="max-w-[1360px] mx-auto px-4 sm:px-8 pt-10 pb-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Column: Core Proposition & Actions */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6 animate-hero-enter">
              <div className="text-xs font-semibold tracking-widest uppercase text-[var(--brand-primary)]">
                EMPLOYEE RECRUITMENT SYSTEM
              </div>

              <h1
                className="font-display font-bold text-[var(--text-primary)] tracking-tight leading-[1.12]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)', textWrap: 'balance' }}
              >
                Building Teams. Shaping Tomorrow.
              </h1>

              <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed max-w-xl">
                A unified recruitment workspace for managing candidate registrations, PDF resume
                submissions, structured HR evaluations, and employee records with clarity and
                role-based control.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate(getWorkspacePath())}
                  className="btn-base btn-primary !px-5 !py-3 text-sm"
                >
                  <span>{isAuthenticated ? 'Open Active Workspace' : 'Explore the Platform'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate('/register')}
                  className="btn-base btn-secondary !px-5 !py-3 text-sm"
                >
                  <UserPlus className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Apply as Candidate</span>
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('workflow')}
                  className="btn-base btn-tertiary !px-4 !py-3 text-sm"
                >
                  <span>View Recruitment Workflow</span>
                </button>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--text-secondary)]">
                <span>Role-Separated Portals (HR · Employee · Candidate)</span>
                <span aria-hidden="true">·</span>
                <span>PDF Resume Validation</span>
                <span aria-hidden="true">·</span>
                <span>Oracle SQL*Plus Schema Fidelity</span>
              </div>
            </div>

            {/* Right Column: Faceted-Glass Architectural Composition (Abstract & Non-Confidential) */}
            <div className="lg:col-span-6 relative flex items-center justify-center">
              <div className="w-full facet-glass-strong rounded-2xl p-6 sm:p-7 space-y-5 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                  <div>
                    <div className="text-xs font-semibold text-[var(--brand-primary)]">
                      Architectural Workflow Preview
                    </div>
                    <h2 className="text-base font-display font-bold text-[var(--text-primary)] mt-0.5">
                      Role-Synchronized Recruitment Pipeline
                    </h2>
                  </div>
                  <span className="text-xs text-[var(--text-secondary)] font-mono-tabular">
                    Schema Architecture
                  </span>
                </div>

                {/* Layered Relational Pipeline Diagram (No private names or salaries) */}
                <div className="space-y-3">
                  <div className="surface-card rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-[var(--brand-primary)]">
                        Stage 01 · Candidate Portal
                      </div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        Profile Registration & PDF Resume Submission
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Applicants register their qualification, select an open department requisition,
                        and attach a validated PDF resume.
                      </p>
                    </div>
                    <span className="text-xs font-mono-tabular text-[var(--text-secondary)] shrink-0">
                      ER_CANDIDATE
                    </span>
                  </div>

                  <div className="surface-card rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-[var(--brand-primary)]">
                        Stage 02 · HR Administration
                      </div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        Resume Review, Interview Evaluation & Status Audit
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        HR reviews submitted PDFs, records private evaluation notes, schedules
                        interviews, and transitions status with automatic audit logging.
                      </p>
                    </div>
                    <span className="text-xs font-mono-tabular text-[var(--text-secondary)] shrink-0">
                      ER_APPLICATION
                    </span>
                  </div>

                  <div className="surface-card rounded-xl p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-[var(--brand-primary)]">
                        Stage 03 · Employee Onboarding & Directory
                      </div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        Atomic Hiring & Role-Protected Employee Workspace
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Selected applicants are onboarded into the employee directory with verified
                        application links and dedicated employee self-service access.
                      </p>
                    </div>
                    <span className="text-xs font-mono-tabular text-[var(--text-secondary)] shrink-0">
                      ER_EMPLOYEE
                    </span>
                  </div>
                </div>

                {/* Bottom Architectural Metadata Strip */}
                <div className="surface-inset rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
                  <span>Zero public exposure of candidate or employee records</span>
                  <button
                    type="button"
                    onClick={() => scrollToSection('platform')}
                    className="font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer"
                  >
                    Inspect Capabilities →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* C. Platform Overview (Asymmetric Editorial & Bento Layout — Not Flashcards) */}
        <section
          id="platform"
          className="py-16 border-t border-[var(--border-subtle)] bg-[var(--surface-primary)]/60"
        >
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8 space-y-12">
            <div className="max-w-2xl space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]">
                Platform Capabilities
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">
                Designed around four distinct role experiences
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Instead of presenting a single generic dashboard to every visitor, the platform
                separates public information, candidate applications, employee self-service, and HR
                administration into tailored interfaces.
              </p>
            </div>

            {/* Asymmetric Bento Grid (col-span-7 + col-span-5, then col-span-5 + col-span-7) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Primary Editorial Feature Block (7 cols) */}
              <div className="lg:col-span-7 surface-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--brand-primary)]">
                      01. HR Recruitment & Employee Administration
                    </span>
                    <span>HR Workspace</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-[var(--text-primary)]">
                    End-to-End Application Tracking, PDF Resume Review, and Employee Management
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    HR administrators can filter candidates by qualification, open submitted PDF
                    resumes inside a split-pane review workspace, record HR-only assessment notes,
                    schedule numbered interview rounds, and execute atomic candidate hiring. Within
                    the Employee Directory, HR has full authority to update employee designations,
                    departments, annual compensation, and active status.
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">Resume Review Queue</div>
                    <div className="text-[var(--text-secondary)] mt-0.5">
                      Split-pane PDF preview & status transitions
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">Employee Directory</div>
                    <div className="text-[var(--text-secondary)] mt-0.5">
                      Edit salary, department, designation & status
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">Audit Trail</div>
                    <div className="text-[var(--text-secondary)] mt-0.5">
                      Simulated ER_APP_STATUS_AUDIT history
                    </div>
                  </div>
                </div>
              </div>

              {/* Secondary Feature Block (5 cols) */}
              <div className="lg:col-span-5 surface-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--brand-primary)]">
                      02. Candidate Registration & Resume Upload
                    </span>
                    <span>Candidate Portal</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-[var(--text-primary)]">
                    Structured Job Applications with Validated PDF Resumes
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Applicants register their profile, select an open job position, and upload a
                    validated PDF resume. Candidates can sign in at any time to track their real
                    application status or replace their resume without seeing internal HR notes or
                    other applicants.
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)]">
                    Supports .pdf validation up to 5 MB
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/register')}
                    className="btn-base btn-secondary text-xs"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    <span>Open Registration</span>
                  </button>
                </div>
              </div>

              {/* Third Feature Block (5 cols) */}
              <div className="lg:col-span-5 surface-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--brand-primary)]">
                      03. Dedicated Employee Self-Service
                    </span>
                    <span>Employee Portal</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-[var(--text-primary)]">
                    Focused Personal Profile & Employment Overview
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Onboarded employees access a dedicated workspace displaying their own employee
                    ID, designation, department, joining date, profile completion status, and
                    editable contact details—strictly isolated from HR administration screens and
                    other employees&apos; private compensation records.
                  </p>
                </div>
                <div className="pt-3 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                  Role-isolated view · Personal profile editor · Theme persistence
                </div>
              </div>

              {/* Fourth Feature Block (7 cols) */}
              <div className="lg:col-span-7 surface-card rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span className="font-semibold text-[var(--brand-primary)]">
                      04. Relational Integrity & Interactive Assistant
                    </span>
                    <span>Oracle SQL*Plus Aligned</span>
                  </div>
                  <h3 className="text-xl font-display font-bold text-[var(--text-primary)]">
                    Built on Enforced Foreign Keys, Check Constraints, and Contextual Guidance
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    Every form and workflow enforces the underlying relational rules from the
                    supplied SQL specification: unique candidate emails, unique candidate-job
                    applications, valid 0–100 interview scores, and verified application-to-employee
                    links. An integrated rule-based assistant offers tailored prompts for visitors,
                    candidates, employees, and HR.
                  </p>
                </div>
                <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
                  <span>7 Relational Tables · 2 Derived Views · Local Audit Simulation</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('/privacy')}
                    className="font-semibold text-[var(--brand-primary)] hover:underline cursor-pointer"
                  >
                    Read Prototype Privacy & Architecture Notes →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* D. How the Platform Works (6-Step Editorial Timeline) */}
        <section id="workflow" className="py-16 border-t border-[var(--border-subtle)]">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-2xl">
                <div className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]">
                  How the Platform Works
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">
                  Six connected stages from candidate registration to onboarding
                </h2>
              </div>
              <p className="text-xs text-[var(--text-secondary)] max-w-md">
                Note: All workflow transitions execute synchronously in local browser state for
                demonstration purposes and do not modify an external Oracle database server.
              </p>
            </div>

            <div className="surface-card rounded-2xl divide-y divide-[var(--border-subtle)]">
              {[
                {
                  step: '01',
                  title: 'Candidate Creates a Profile',
                  actor: 'Candidate',
                  detail:
                    'A job applicant opens the registration page, enters their contact details, qualification, and experience years, and receives a Candidate role profile.',
                },
                {
                  step: '02',
                  title: 'Candidate Submits Job Selection & PDF Resume',
                  actor: 'Candidate',
                  detail:
                    'The candidate selects an open job requisition and attaches a validated PDF resume (.pdf). The application is recorded with status APPLIED.',
                },
                {
                  step: '03',
                  title: 'HR Reviews the Submitted Application & Resume',
                  actor: 'HR Administrator',
                  detail:
                    'HR opens the Resume Review workspace, inspects the candidate profile, previews the session PDF resume, and records internal HR assessment notes.',
                },
                {
                  step: '04',
                  title: 'Application Status Is Updated Across the Pipeline',
                  actor: 'HR Administrator',
                  detail:
                    'HR transitions the application through SHORTLISTED, INTERVIEW, SELECTED, REJECTED, or HIRED. Each change is logged in the local audit trail and reflected in the Candidate Workspace.',
                },
                {
                  step: '05',
                  title: 'HR Hires Eligible Candidates & Manages Employee Details',
                  actor: 'HR Administrator',
                  detail:
                    'Hiring an eligible candidate atomically marks the application HIRED and creates a linked employee record. HR can subsequently edit salary, department, designation, and employment status.',
                },
                {
                  step: '06',
                  title: 'Employees Access Their Own Workspace',
                  actor: 'Employee',
                  detail:
                    'Employees sign in to their dedicated workspace to inspect their employment details and update permitted personal contact information.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
                >
                  <div className="md:col-span-2 flex items-center gap-3">
                    <span className="text-lg font-display font-bold text-[var(--brand-primary)] font-mono-tabular">
                      Step {item.step}
                    </span>
                  </div>
                  <div className="md:col-span-4">
                    <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                      {item.title}
                    </h3>
                    <span className="text-xs text-[var(--text-secondary)]">{item.actor}</span>
                  </div>
                  <div className="md:col-span-6 text-sm text-[var(--text-secondary)] leading-relaxed">
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* E. About Us Section */}
        <section
          id="about"
          className="py-16 border-t border-[var(--border-subtle)] bg-[var(--surface-primary)]/60"
        >
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]">
                About Us
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">
                Purpose of the Blue Star Employee Recruitment System Prototype
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Structured to demonstrate how relational database design and role-aware frontend
                engineering work together in a cohesive recruitment environment.
              </p>
            </div>

            <div className="lg:col-span-7 surface-card rounded-2xl p-6 sm:p-8 space-y-4 text-sm text-[var(--text-secondary)] leading-relaxed">
              <p className="text-[var(--text-primary)] font-semibold">
                Organizing the recruitment lifecycle for candidates, HR, and employees
              </p>
              <p>
                The Blue Star Employee Recruitment System is an interactive academic and
                engineering prototype modeled on an Oracle SQL*Plus relational database project. Its
                goal is to organize job requisitions, candidate registrations, PDF resume
                submissions, interview evaluations, and employee onboarding within a calm,
                high-clarity interface.
              </p>
              <p>
                By separating the experience into four distinct interfaces—Public Visitor,
                Candidate, Employee, and HR Administrator—the platform demonstrates how each
                participant interacts with recruitment records appropriate to their role while
                preserving relational integrity across departments, jobs, applications, interviews,
                and employees.
              </p>
              <div className="surface-inset rounded-xl p-4 text-xs space-y-1">
                <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Prototype Scope & Corporate Disclaimer</span>
                </div>
                <p>
                  This application is an independent frontend software prototype created for
                  educational and demonstration purposes. It uses Blue Star visual branding as
                  requested by the project specification, but it is not an officially operated
                  internal corporate system of Blue Star Limited, and all operations run locally in
                  the browser.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* F. Contact Us Section (Interactive Local Simulation Form) */}
        <section id="contact" className="py-16 border-t border-[var(--border-subtle)]">
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-4">
              <div className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]">
                Contact Us
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">
                Questions or Feedback About the Recruitment Prototype
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Have a question about candidate registration, resume submission formats, or
                navigating the demonstration workspaces? Submit a message using the form.
              </p>
              <div className="surface-inset rounded-xl p-4 text-xs text-[var(--text-secondary)] space-y-1.5">
                <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Simulated Local Submission Notice</span>
                </div>
                <p>
                  Because this is a frontend-only prototype with no backend mail server connected,
                  submitting this form validates your input and simulates a confirmation locally in
                  your browser without sending an external email.
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 surface-card rounded-2xl p-6 sm:p-8">
              {contactSubmitted ? (
                <div className="space-y-4 py-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--success-bg)] text-[var(--success)] flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-display font-bold text-[var(--text-primary)]">
                      Simulated Inquiry Recorded Locally
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      Thank you, <strong className="text-[var(--text-primary)]">{contactName}</strong>
                      . Your message regarding{' '}
                      <strong className="text-[var(--text-primary)]">{contactSubject}</strong> has
                      been validated in the local prototype session. No external email was sent.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setContactSubmitted(false);
                      setContactName('');
                      setContactEmail('');
                      setContactSubject('');
                      setContactMessage('');
                    }}
                    className="btn-base btn-secondary text-xs"
                  >
                    Submit Another Simulated Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4" noValidate>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="contact-name"
                        className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                      >
                        Full Name *
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="Enter your name"
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                      >
                        Email Address *
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="input-field"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-subject"
                      className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                    >
                      Subject *
                    </label>
                    <input
                      id="contact-subject"
                      type="text"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="e.g. Candidate Registration or Resume Upload Inquiry"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                    >
                      Message *
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Describe your question or feedback about the recruitment platform prototype..."
                      className="input-field"
                      required
                    />
                  </div>

                  {contactError && (
                    <div
                      role="alert"
                      className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
                    >
                      {contactError}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 pt-2">
                    <span className="text-xs text-[var(--text-secondary)]">
                      Local frontend simulation only
                    </span>
                    <button type="submit" className="btn-base btn-primary">
                      <Send className="w-4 h-4" />
                      <span>Submit Message</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* G. FAQs Section (12 Interactive Accordion Items) */}
        <section
          id="faqs"
          className="py-16 border-t border-[var(--border-subtle)] bg-[var(--surface-primary)]/60"
        >
          <div className="max-w-[1360px] mx-auto px-4 sm:px-8 space-y-8">
            <div className="max-w-2xl space-y-2">
              <div className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]">
                Frequently Asked Questions
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">
                Platform Guidance, Role Access & Prototype Boundaries
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Select any question below to expand details on candidate registration, PDF resumes,
                HR review workflows, and local browser storage.
              </p>
            </div>

            <div className="surface-card rounded-2xl divide-y divide-[var(--border-subtle)]">
              {FAQ_ITEMS.map((item, idx) => {
                const isExpanded = openFaqIndex === idx;
                return (
                  <div key={item.question}>
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isExpanded ? null : idx)}
                      aria-expanded={isExpanded}
                      className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-[var(--surface-secondary)]/50 transition-colors cursor-pointer"
                    >
                      <span className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                        {item.question}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[var(--brand-primary)] shrink-0 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-5 pt-1 text-sm text-[var(--text-secondary)] leading-relaxed">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* H. Quiet Editorial Footer */}
      <footer className="relative z-10 border-t border-[var(--border-subtle)] bg-[var(--surface-primary)] py-10">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <BlueStarLogo className="h-7" />
              <div className="text-sm font-bold text-[var(--text-primary)] pt-1">
                Blue Star Employee Recruitment System
              </div>
              <p className="text-xs text-[var(--text-secondary)] max-w-md">
                Frontend recruitment management prototype modeled on the Oracle SQL*Plus
                specification. All data operations are simulated locally in the browser.
              </p>
            </div>

            <nav
              aria-label="Footer navigation"
              className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-[var(--text-secondary)]"
            >
              <a
                href="#platform"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('platform');
                }}
                className="hover:text-[var(--brand-primary)] transition-colors"
              >
                Platform
              </a>
              <a
                href="#workflow"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('workflow');
                }}
                className="hover:text-[var(--brand-primary)] transition-colors"
              >
                Workflow
              </a>
              <a
                href="#about"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('about');
                }}
                className="hover:text-[var(--brand-primary)] transition-colors"
              >
                About Us
              </a>
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('contact');
                }}
                className="hover:text-[var(--brand-primary)] transition-colors"
              >
                Contact Us
              </a>
              <a
                href="#faqs"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('faqs');
                }}
                className="hover:text-[var(--brand-primary)] transition-colors"
              >
                FAQs
              </a>
              <button
                type="button"
                onClick={() => onNavigate('/privacy')}
                className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/register')}
                className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
              >
                Candidate Registration
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </nav>
          </div>

          <div className="pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
            <span>
              Blue Star&apos;s - Employee Recruitment System · Academic & Engineering Prototype
            </span>
            <span>
              Not an official corporate system · Local browser demonstration state only
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
