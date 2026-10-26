import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  Lock,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { Modal, StatusIndicator, formatInrSalary } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import { getTodayIsoDate } from '../model/operations';
import { ALLOWED_APPLICATION_STATUSES, ApplicationStatus } from '../model/schema';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const ResumeReviewPage: React.FC = () => {
  const {
    db,
    candidateApplicationView,
    updateApplicationStatus,
    hireCandidate,
  } = useRecruitment();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [resumeFilter, setResumeFilter] = useState<'ALL' | 'WITH_PDF' | 'WITHOUT_PDF'>('ALL');

  const [selectedAppId, setSelectedAppId] = useState<number>(() => {
    return candidateApplicationView[0]?.APPLICATION_ID ?? 5001;
  });

  // Candidate-facing remarks & HR-only private notes
  const [publicRemarks, setPublicRemarks] = useState('');
  const [hrPrivateNotes, setHrPrivateNotes] = useState('');

  // PDF Preview Modal
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  // Reject Confirmation Modal
  const [isRejectConfirmOpen, setIsRejectConfirmOpen] = useState(false);

  // Hire Modal
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [hireDesignation, setHireDesignation] = useState('');
  const [hireSalary, setHireSalary] = useState('600000');
  const [hireJoiningDate, setHireJoiningDate] = useState(getTodayIsoDate());
  const [hireError, setHireError] = useState<string | null>(null);

  const resumeByCandidateOrApp = useMemo(() => {
    const map = new Map<number, (typeof db.resumes)[number]>();
    for (const r of db.resumes) {
      map.set(r.APPLICATION_ID, r);
    }
    return map;
  }, [db.resumes]);

  const filteredSubmissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return candidateApplicationView.filter((app) => {
      if (q) {
        const matchName = app.FULL_NAME.toLowerCase().includes(q);
        const matchJob = app.JOB_TITLE.toLowerCase().includes(q);
        const matchDept = app.DEPT_NAME.toLowerCase().includes(q);
        const matchId = String(app.APPLICATION_ID).includes(q);
        if (!matchName && !matchJob && !matchDept && !matchId) return false;
      }
      if (statusFilter !== 'ALL' && app.APPLICATION_STATUS !== statusFilter) return false;

      const hasResume =
        resumeByCandidateOrApp.has(app.APPLICATION_ID) ||
        db.resumes.some((r) => r.CANDIDATE_ID === app.CANDIDATE_ID);
      if (resumeFilter === 'WITH_PDF' && !hasResume) return false;
      if (resumeFilter === 'WITHOUT_PDF' && hasResume) return false;
      return true;
    });
  }, [candidateApplicationView, searchQuery, statusFilter, resumeFilter, resumeByCandidateOrApp, db.resumes]);

  const activeSubmission = useMemo(() => {
    const found =
      filteredSubmissions.find((a) => a.APPLICATION_ID === selectedAppId) ??
      candidateApplicationView.find((a) => a.APPLICATION_ID === selectedAppId) ??
      filteredSubmissions[0] ??
      null;
    return found;
  }, [filteredSubmissions, candidateApplicationView, selectedAppId]);

  const activeRawApplication = useMemo(() => {
    if (!activeSubmission) return null;
    return (
      db.applications.find((a) => a.APPLICATION_ID === activeSubmission.APPLICATION_ID) ?? null
    );
  }, [db.applications, activeSubmission]);

  const activeResume = useMemo(() => {
    if (!activeSubmission) return null;
    return (
      db.resumes.find((r) => r.APPLICATION_ID === activeSubmission.APPLICATION_ID) ??
      db.resumes.find((r) => r.CANDIDATE_ID === activeSubmission.CANDIDATE_ID) ??
      null
    );
  }, [db.resumes, activeSubmission]);

  const isAlreadyEmployee = useMemo(() => {
    if (!activeSubmission) return false;
    return db.employees.some(
      (e) =>
        e.APPLICATION_ID === activeSubmission.APPLICATION_ID ||
        e.CANDIDATE_ID === activeSubmission.CANDIDATE_ID
    );
  }, [db.employees, activeSubmission]);

  const handleSelectSubmission = (appId: number) => {
    setSelectedAppId(appId);
    const raw = db.applications.find((a) => a.APPLICATION_ID === appId);
    setPublicRemarks(raw?.REMARKS ?? '');
    setHrPrivateNotes(raw?._hrNotes ?? '');
  };

  const handleStatusDecision = (newStatus: ApplicationStatus) => {
    if (!activeSubmission) return;
    updateApplicationStatus(
      activeSubmission.APPLICATION_ID,
      newStatus,
      publicRemarks.trim() || activeRawApplication?.REMARKS || `Status updated to ${newStatus}`,
      hrPrivateNotes.trim() || activeRawApplication?._hrNotes
    );
  };

  const handleSaveNotesOnly = () => {
    if (!activeSubmission || !activeRawApplication) return;
    updateApplicationStatus(
      activeSubmission.APPLICATION_ID,
      activeSubmission.APPLICATION_STATUS,
      publicRemarks.trim() || activeRawApplication.REMARKS,
      hrPrivateNotes.trim()
    );
  };

  const openHireDialog = () => {
    if (!activeSubmission) return;
    setHireDesignation(activeSubmission.JOB_TITLE);
    const job = db.jobs.find((j) => j.JOB_ID === activeSubmission.JOB_ID);
    setHireSalary(String(job?.MIN_SALARY ?? 600000));
    setHireJoiningDate(getTodayIsoDate());
    setHireError(null);
    setIsHireModalOpen(true);
  };

  const handleConfirmHire = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmission) return;
    setHireError(null);

    const res = hireCandidate({
      APPLICATION_ID: activeSubmission.APPLICATION_ID,
      DESIGNATION: hireDesignation,
      ANNUAL_SALARY: Number(hireSalary),
      JOINING_DATE: hireJoiningDate,
    });

    if (!res.ok) {
      setHireError(res.error ?? 'Could not complete hiring.');
      return;
    }
    setIsHireModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="surface-card rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search candidate submissions by name, position, department, or application ID"
              placeholder="Search submissions by candidate name, job title, department, or #ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field !pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label htmlFor="rr-status-filter" className="text-[var(--text-secondary)] font-medium">
                Status:
              </label>
              <select
                id="rr-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field !w-auto !py-1.5 !px-2.5 text-xs"
              >
                <option value="ALL">All Statuses</option>
                {ALLOWED_APPLICATION_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="rr-pdf-filter" className="text-[var(--text-secondary)] font-medium">
                Resume PDF:
              </label>
              <select
                id="rr-pdf-filter"
                value={resumeFilter}
                onChange={(e) =>
                  setResumeFilter(e.target.value as 'ALL' | 'WITH_PDF' | 'WITHOUT_PDF')
                }
                className="input-field !w-auto !py-1.5 !px-2.5 text-xs"
              >
                <option value="ALL">All Submissions</option>
                <option value="WITH_PDF">PDF Resume Attached</option>
                <option value="WITHOUT_PDF">Seed Record (No PDF File)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Split-Pane Review Layout (Not Flashcards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Searchable Submission List (5 cols) */}
        <div className="lg:col-span-5 surface-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--text-primary)]">
              Submitted Applications ({filteredSubmissions.length})
            </span>
            <span className="text-[var(--text-secondary)]">Select row to review</span>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
              No candidate submissions match the current filter criteria.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] max-h-[640px] overflow-y-auto">
              {filteredSubmissions.map((app) => {
                const isSelected = activeSubmission?.APPLICATION_ID === app.APPLICATION_ID;
                const hasPdf =
                  resumeByCandidateOrApp.has(app.APPLICATION_ID) ||
                  db.resumes.some((r) => r.CANDIDATE_ID === app.CANDIDATE_ID);
                return (
                  <button
                    key={app.APPLICATION_ID}
                    type="button"
                    onClick={() => handleSelectSubmission(app.APPLICATION_ID)}
                    className={`w-full p-4 text-left transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-[var(--brand-subtle)] border-l-2 border-[var(--brand-primary)]'
                        : 'hover:bg-[var(--surface-secondary)]/50'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tabular text-xs font-bold text-[var(--brand-primary)]">
                          #{app.APPLICATION_ID}
                        </span>
                        <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {app.FULL_NAME}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] truncate">
                        {app.JOB_TITLE} · {app.DEPT_NAME}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-2">
                        <span>Submitted {app.APPLICATION_DATE}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            hasPdf
                              ? 'text-[var(--brand-primary)] font-semibold'
                              : 'text-[var(--text-secondary)]'
                          }
                        >
                          {hasPdf ? 'PDF Attached' : 'No PDF File'}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <StatusIndicator status={app.APPLICATION_STATUS} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Candidate & Resume Review Pane (7 cols) */}
        <div className="lg:col-span-7 surface-card rounded-xl p-6 space-y-6">
          {!activeSubmission ? (
            <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
              Select a candidate application from the left list to review their submission.
            </div>
          ) : (
            <>
              {/* Identity Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
                <div>
                  <div className="text-xs font-mono-tabular text-[var(--brand-primary)] font-semibold">
                    APPLICATION_ID #{activeSubmission.APPLICATION_ID} · CANDIDATE_ID #
                    {activeSubmission.CANDIDATE_ID}
                  </div>
                  <h2 className="text-xl font-display font-bold text-[var(--text-primary)] mt-0.5">
                    {activeSubmission.FULL_NAME}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Applied for <strong className="text-[var(--text-primary)]">{activeSubmission.JOB_TITLE}</strong>{' '}
                    ({activeSubmission.DEPT_NAME}) on {activeSubmission.APPLICATION_DATE}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusIndicator status={activeSubmission.APPLICATION_STATUS} />
                </div>
              </div>

              {/* Candidate Profile Summary */}
              <div className="surface-inset rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[var(--text-secondary)]">Email Address</div>
                  <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                    {activeSubmission.EMAIL}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">Phone Number</div>
                  <div className="font-mono-tabular font-semibold text-[var(--text-primary)] mt-0.5">
                    {activeSubmission.PHONE ?? 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">Qualification (ER_CANDIDATE)</div>
                  <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                    {activeSubmission.QUALIFICATION ?? 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">Experience</div>
                  <div className="font-mono-tabular font-semibold text-[var(--text-primary)] mt-0.5">
                    {activeSubmission.EXPERIENCE_YEARS} year(s)
                  </div>
                </div>
              </div>

              {/* PDF Resume Inspection Panel */}
              <div className="space-y-2">
                <h3 className="text-sm font-display font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Submitted PDF Resume Document</span>
                </h3>

                {activeResume ? (
                  <div className="surface-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 border border-[var(--border-emphasis)]">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        {activeResume.fileName}
                      </div>
                      <div className="text-xs text-[var(--text-secondary)] font-mono-tabular">
                        {formatBytes(activeResume.fileSize)} · Uploaded{' '}
                        {new Date(activeResume.uploadedAt).toLocaleString()}
                      </div>
                    </div>

                    {activeResume.dataUrl ? (
                      <button
                        type="button"
                        onClick={() => setIsPdfPreviewOpen(true)}
                        className="btn-base btn-primary text-xs"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Preview PDF Resume</span>
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--warning)]">
                        PDF metadata recorded (re-upload in current session to preview binary content)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="surface-inset rounded-xl p-4 text-xs text-[var(--text-secondary)] leading-relaxed">
                    No PDF resume file is attached to this baseline SQL seed application (#
                    {activeSubmission.APPLICATION_ID}). Candidates who register or upload a PDF
                    resume through the Candidate Portal will have their verifiable PDF available for
                    preview here.
                  </div>
                )}
              </div>

              {/* Remarks & Private HR Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)]">
                <div>
                  <label
                    htmlFor="rr-public-remarks"
                    className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                  >
                    Application Remarks (ER_APPLICATION.REMARKS)
                  </label>
                  <textarea
                    id="rr-public-remarks"
                    rows={3}
                    value={publicRemarks || activeRawApplication?.REMARKS || ''}
                    onChange={(e) => setPublicRemarks(e.target.value)}
                    placeholder="Status remarks visible in application summary..."
                    className="input-field text-xs"
                  />
                </div>

                <div>
                  <label
                    htmlFor="rr-hr-notes"
                    className="block text-xs font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-1"
                  >
                    <Lock className="w-3 h-3 text-[var(--brand-primary)]" />
                    <span>HR-Only Review Notes (Hidden from Candidate)</span>
                  </label>
                  <textarea
                    id="rr-hr-notes"
                    rows={3}
                    value={hrPrivateNotes || activeRawApplication?._hrNotes || ''}
                    onChange={(e) => setHrPrivateNotes(e.target.value)}
                    placeholder="Private HR evaluation notes (never shown to candidates)..."
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotesOnly}
                  className="btn-base btn-secondary text-xs"
                >
                  Save Remarks & HR Notes
                </button>
              </div>

              {/* HR Review Decision Actions */}
              <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    HR Review Workflow Decisions (ER_UPDATE_STATUS / ER_HIRE_CANDIDATE)
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Updates status & writes to ER_APPLICATION_AUDIT
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    disabled={activeSubmission.APPLICATION_STATUS === 'SHORTLISTED'}
                    onClick={() => handleStatusDecision('SHORTLISTED')}
                    className="btn-base btn-secondary text-xs"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                    <span>Mark Shortlisted</span>
                  </button>

                  <button
                    type="button"
                    disabled={activeSubmission.APPLICATION_STATUS === 'INTERVIEW'}
                    onClick={() => handleStatusDecision('INTERVIEW')}
                    className="btn-base btn-secondary text-xs"
                  >
                    <span>Move to Interview</span>
                  </button>

                  <button
                    type="button"
                    disabled={activeSubmission.APPLICATION_STATUS === 'SELECTED'}
                    onClick={() => handleStatusDecision('SELECTED')}
                    className="btn-base btn-secondary text-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
                    <span>Approve / Select</span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      activeSubmission.APPLICATION_STATUS === 'HIRED' || isAlreadyEmployee
                    }
                    onClick={openHireDialog}
                    className="btn-base btn-primary text-xs"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>
                      {activeSubmission.APPLICATION_STATUS === 'HIRED' || isAlreadyEmployee
                        ? 'Already Hired'
                        : 'Hire Candidate'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      activeSubmission.APPLICATION_STATUS === 'REJECTED' ||
                      activeSubmission.APPLICATION_STATUS === 'HIRED'
                    }
                    onClick={() => setIsRejectConfirmOpen(true)}
                    className="btn-base btn-destructive text-xs"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* PDF Resume Preview Modal */}
      <Modal
        isOpen={isPdfPreviewOpen && Boolean(activeResume?.dataUrl)}
        onClose={() => setIsPdfPreviewOpen(false)}
        title={activeResume ? `PDF Preview: ${activeResume.fileName}` : 'PDF Resume Preview'}
        subtitle="Local browser session PDF preview. Not uploaded to an external server."
        maxWidthClass="max-w-4xl"
      >
        {activeResume?.dataUrl && (
          <div className="space-y-4">
            <div className="w-full h-[540px] rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
              <iframe
                src={activeResume.dataUrl}
                title={`PDF Resume for ${activeSubmission?.FULL_NAME ?? 'Candidate'}`}
                className="w-full h-full"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <span>
                File: <strong className="text-[var(--text-primary)]">{activeResume.fileName}</strong>{' '}
                ({formatBytes(activeResume.fileSize)})
              </span>
              <button
                type="button"
                onClick={() => setIsPdfPreviewOpen(false)}
                className="btn-base btn-secondary text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Confirmation Dialog */}
      <Modal
        isOpen={isRejectConfirmOpen}
        onClose={() => setIsRejectConfirmOpen(false)}
        title="Confirm Application Rejection"
        subtitle="Transitions APPLICATION_STATUS to 'REJECTED' and records a local audit entry."
      >
        {activeSubmission && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl p-3.5 bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">
                  Reject Application #{activeSubmission.APPLICATION_ID} ({activeSubmission.FULL_NAME})?
                </div>
                <p className="mt-1 leading-relaxed">
                  The candidate&apos;s application status for{' '}
                  <strong>{activeSubmission.JOB_TITLE}</strong> will be updated to{' '}
                  <code className="font-mono-tabular">REJECTED</code> in local prototype state.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectConfirmOpen(false)}
                className="btn-base btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleStatusDecision('REJECTED');
                  setIsRejectConfirmOpen(false);
                }}
                className="btn-base btn-destructive"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Atomic Hiring Modal (ER_HIRE_CANDIDATE) */}
      <Modal
        isOpen={isHireModalOpen}
        onClose={() => setIsHireModalOpen(false)}
        title="Hire Candidate (Simulated ER_HIRE_CANDIDATE)"
        subtitle="Atomically updates APPLICATION_STATUS to 'HIRED' and creates the linked ER_EMPLOYEE record."
      >
        {activeSubmission && (
          <form onSubmit={handleConfirmHire} className="space-y-4 text-xs" noValidate>
            <div className="surface-inset rounded-xl p-3.5 space-y-1">
              <div className="font-bold text-[var(--text-primary)]">
                Candidate: {activeSubmission.FULL_NAME} (CANDIDATE_ID #{activeSubmission.CANDIDATE_ID})
              </div>
              <div className="text-[var(--text-secondary)]">
                Application #{activeSubmission.APPLICATION_ID} · {activeSubmission.JOB_TITLE} (
                {activeSubmission.DEPT_NAME})
              </div>
            </div>

            <div>
              <label
                htmlFor="rr-hire-designation"
                className="block font-semibold text-[var(--text-primary)] mb-1"
              >
                Designation (P_DESIGNATION) *
              </label>
              <input
                id="rr-hire-designation"
                type="text"
                value={hireDesignation}
                onChange={(e) => setHireDesignation(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="rr-hire-salary"
                  className="block font-semibold text-[var(--text-primary)] mb-1"
                >
                  Annual Salary in INR (P_ANNUAL_SALARY) *
                </label>
                <input
                  id="rr-hire-salary"
                  type="number"
                  min="0"
                  step="10000"
                  value={hireSalary}
                  onChange={(e) => setHireSalary(e.target.value)}
                  className="input-field font-mono-tabular"
                  required
                />
                <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Formatted: {formatInrSalary(Number(hireSalary) || 0)}
                </div>
              </div>

              <div>
                <label
                  htmlFor="rr-hire-date"
                  className="block font-semibold text-[var(--text-primary)] mb-1"
                >
                  Joining Date (JOINING_DATE) *
                </label>
                <input
                  id="rr-hire-date"
                  type="date"
                  value={hireJoiningDate}
                  onChange={(e) => setHireJoiningDate(e.target.value)}
                  className="input-field font-mono-tabular"
                  required
                />
              </div>
            </div>

            {hireError && (
              <div
                role="alert"
                className="rounded-lg p-3 bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
              >
                {hireError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setIsHireModalOpen(false)}
                className="btn-base btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-base btn-primary">
                <UserCheck className="w-4 h-4" />
                <span>Confirm Hiring</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
