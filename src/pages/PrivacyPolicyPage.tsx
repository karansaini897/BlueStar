import React from 'react';
import { ArrowLeft, Moon, ShieldAlert, Sun } from 'lucide-react';
import { AnimatedFacetBackground } from '../components/AnimatedFacetBackground';
import { BlueStarLogo } from '../components/BlueStarLogo';
import { useRecruitment } from '../context/RecruitmentContext';

interface PrivacyPolicyPageProps {
  onNavigate: (path: string) => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onNavigate }) => {
  const { theme, toggleTheme } = useRecruitment();

  return (
    <div className="min-h-screen architectural-canvas text-[var(--text-primary)] relative flex flex-col">
      <AnimatedFacetBackground />

      {/* Top Bar */}
      <header className="sticky top-0 z-30 facet-glass border-b border-[var(--border-subtle)]">
        <div className="max-w-[1160px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="btn-base btn-secondary text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Home</span>
            </button>
            <div className="hidden sm:block">
              <BlueStarLogo className="h-7" />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              className="btn-base btn-secondary !p-2"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="btn-base btn-primary text-xs"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Editorial Body */}
      <main className="relative z-10 flex-1 max-w-[960px] w-full mx-auto px-4 sm:px-8 py-12 space-y-10 pb-24">
        <div className="space-y-3 border-b border-[var(--border-subtle)] pb-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]">
            Privacy Policy & Prototype Data Governance
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-[var(--text-primary)]">
            Blue Star Employee Recruitment System — Privacy & Technical Scope Statement
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            This page explains how information is handled inside the Blue Star Employee Recruitment
            System frontend prototype, the distinction between simulated browser state and real
            server-side processing, and important limitations regarding local storage and file
            previews.
          </p>
        </div>

        <div className="surface-inset rounded-xl p-5 flex items-start gap-3 text-xs sm:text-sm">
          <ShieldAlert className="w-5 h-5 text-[var(--brand-primary)] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-[var(--text-primary)]">
              Important Prototype Notice (No Live Server or Oracle Database Connection)
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              This application is a client-side educational and engineering prototype. No data
              entered here is transmitted to an external server, cloud storage service, or live
              Oracle SQL*Plus database. Do not enter sensitive real-world personal identification
              numbers, confidential financial records, or real production passwords.
            </p>
          </div>
        </div>

        {/* Editorial Sections */}
        <article className="surface-card rounded-2xl p-6 sm:p-10 space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]">
          <section className="space-y-2">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              1. Purpose of the Recruitment System
            </h2>
            <p>
              The Blue Star Employee Recruitment System is an interactive recruitment management
              prototype designed to demonstrate the end-to-end workflow defined in the companion
              Oracle SQL*Plus database project (<code className="font-mono-tabular">ER_DEPARTMENT</code>,{' '}
              <code className="font-mono-tabular">ER_JOB</code>,{' '}
              <code className="font-mono-tabular">ER_CANDIDATE</code>,{' '}
              <code className="font-mono-tabular">ER_APPLICATION</code>,{' '}
              <code className="font-mono-tabular">ER_INTERVIEW</code>,{' '}
              <code className="font-mono-tabular">ER_EMPLOYEE</code>, and{' '}
              <code className="font-mono-tabular">ER_APPLICATION_AUDIT</code>).
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              2. Information Candidates May Enter
            </h2>
            <p>
              When testing the Candidate Registration or Candidate Workspace workflows, users may
              enter demonstration candidate details corresponding to the{' '}
              <code className="font-mono-tabular">ER_CANDIDATE</code> and{' '}
              <code className="font-mono-tabular">ER_APPLICATION</code> tables, including full name,
              email address, phone number, academic qualification, years of experience, and job
              selection. Because this is a demonstration environment, users should use fictional or
              sample applicant details.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              3. Resume and Document Submission
            </h2>
            <p>
              The candidate registration and workspace screens accept PDF files (<code className="font-mono-tabular">.pdf</code>)
              to demonstrate resume validation and HR document review. Selected PDF files are
              validated client-side for file extension, MIME type, and size, and are held only in
              local browser state for the current prototype workflow. Selecting or previewing a PDF
              in this interface does not upload the document to a remote HR server.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              4. Employee Profile Information
            </h2>
            <p>
              Demonstration employee records model the <code className="font-mono-tabular">ER_EMPLOYEE</code>{' '}
              schema, linking an employee identifier to a verified application and candidate record
              along with joining date, designation, annual compensation, department, and employment
              status (<code className="font-mono-tabular">ACTIVE</code> or{' '}
              <code className="font-mono-tabular">INACTIVE</code>). Initial records are synthetic
              demonstration entries from the SQL project script.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              5. How Information Is Displayed Within the Prototype
            </h2>
            <p>
              Public pages (the Landing Page, About Us, Contact Us, FAQs, and this Privacy Policy)
              never display candidate names, employee names, emails, phone numbers, salaries, or
              login credentials. Internal demonstration records are displayed only after signing in
              to the appropriate role workspace within the browser session.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              6. Role-Based Access Intentions
            </h2>
            <p>
              The user interface models four distinct roles: Public Visitor, Candidate, Employee,
              and HR Administrator. In the UI, candidates view only their own application and
              profile; employees view only their own employment profile; and HR administrators
              manage the recruitment pipeline and employee directory. However, because all state
              lives in the browser without a backend server, these role separations represent
              frontend interface boundaries rather than cryptographic or server-enforced access
              control.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              7. Local Demo Data & Reset Capability
            </h2>
            <p>
              The prototype initializes with the seed departments, jobs, candidates, applications,
              interviews, and employees defined in the supplied SQL*Plus script. An administrator
              can restore the baseline dataset at any time using the &ldquo;Reset Demo Data&rdquo;
              control inside the workspace Settings page.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              8. Local Storage and Browser Limitations
            </h2>
            <p>
              Non-sensitive demonstration state and theme preferences (<code className="font-mono-tabular">light</code>{' '}
              or <code className="font-mono-tabular">dark</code>) are stored in your browser&apos;s{' '}
              <code className="font-mono-tabular">localStorage</code> so changes survive page
              refreshes on the same device and browser profile. Clearing browser site data or
              opening a private browsing window resets the state to its initial defaults. Large PDF
              previews retained in memory may require re-selection after a full browser reload if
              browser storage quotas are exceeded.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              9. Distinction Between Simulated and Real Data Processing
            </h2>
            <p>
              Actions such as registering an account, submitting a PDF resume, updating an
              application status, recording an audit log entry, hiring a candidate, editing employee
              salary/department fields, or submitting the Contact Us form are simulated locally in
              JavaScript. No emails, SMS messages, or database network queries are dispatched.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              10. Data Retention Limitations
            </h2>
            <p>
              Data entered into the prototype remains solely inside the local browser environment
              until the user clicks &ldquo;Reset Demo Data&rdquo; in Settings or clears browser
              storage. Changes made on one computer or browser are never visible to other users or
              devices.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              11. Security Limitations of a Frontend-Only Application
            </h2>
            <p>
              A browser-only application cannot provide production-grade authentication, server-side
              session encryption, or database access control. The prototype naming convention is
              used strictly to demonstrate role routing in an academic setting and must never be
              used in a production deployment.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              12. Contact or Feedback Options
            </h2>
            <p>
              Visitors can test the interactive Contact Us form on the public landing page (<code className="font-mono-tabular">/#contact</code>)
              or use the built-in Platform Assistant chatbot to explore how workflows operate in
              this prototype.
            </p>
          </section>

          <section className="space-y-2 pt-4 border-t border-[var(--border-subtle)]">
            <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
              13. Prototype Status and Legal Disclaimer
            </h2>
            <p>
              This project is an educational software prototype and does not constitute a legally
              binding privacy contract or an official corporate service of Blue Star Limited.
            </p>
          </section>
        </article>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="btn-base btn-secondary text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Platform Home</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/register')}
            className="btn-base btn-primary text-xs"
          >
            <span>Open Candidate Registration</span>
          </button>
        </div>
      </main>
    </div>
  );
};
