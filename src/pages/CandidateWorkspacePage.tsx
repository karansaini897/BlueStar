import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  Eye,
  FileText,
  HelpCircle,
  Moon,
  Plus,
  Save,
  Sun,
  Upload,
} from 'lucide-react';
import { Modal, StatusIndicator, formatInrSalary } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import { validatePdfResumeFile } from '../model/operations';

interface CandidateWorkspacePageProps {
  onNavigate: (path: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getNextStepGuidance(status: string): string {
  switch (status) {
    case 'APPLIED':
      return 'Your application and resume are queued for HR screening in the Resume Review workspace.';
    case 'SHORTLISTED':
      return 'HR has shortlisted your application. An interview round may be scheduled next.';
    case 'INTERVIEW':
      return 'Your application is in the Interview evaluation stage. Check scheduled interview rounds below.';
    case 'SELECTED':
      return 'You have been selected for the role! HR can now complete the onboarding and hiring step.';
    case 'HIRED':
      return 'Congratulations! Your application is marked HIRED and your employee record has been created.';
    case 'REJECTED':
      return 'This application was not selected to move forward. You may apply to another open position.';
    default:
      return 'Your application is active in the local prototype pipeline.';
  }
}

export const CandidateWorkspacePage: React.FC<CandidateWorkspacePageProps> = ({ onNavigate }) => {
  const {
    db,
    currentUser,
    candidateApplicationView,
    interviewDetailsView,
    updateCandidate,
    applyForJob,
    saveCandidateResume,
    theme,
    toggleTheme,
  } = useRecruitment();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Locate only the signed-in candidate's own profile (strictly isolated from other candidates)
  const myCandidate = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.candidateId) {
      const found = db.candidates.find((c) => c.CANDIDATE_ID === currentUser.candidateId);
      if (found) return found;
    }
    return db.candidates[0] ?? null;
  }, [currentUser, db.candidates]);

  const myApplications = useMemo(() => {
    if (!myCandidate) return [];
    return candidateApplicationView.filter((a) => a.CANDIDATE_ID === myCandidate.CANDIDATE_ID);
  }, [candidateApplicationView, myCandidate]);

  const myInterviews = useMemo(() => {
    if (!myCandidate) return [];
    return interviewDetailsView.filter((i) => i.CANDIDATE_ID === myCandidate.CANDIDATE_ID);
  }, [interviewDetailsView, myCandidate]);

  const myResumes = useMemo(() => {
    if (!myCandidate) return [];
    return db.resumes.filter((r) => r.CANDIDATE_ID === myCandidate.CANDIDATE_ID);
  }, [db.resumes, myCandidate]);

  const primaryApplication = myApplications[0] ?? null;
  const primaryResume = useMemo(() => {
    if (!myCandidate) return null;
    if (primaryApplication) {
      const byApp = myResumes.find((r) => r.APPLICATION_ID === primaryApplication.APPLICATION_ID);
      if (byApp) return byApp;
    }
    return myResumes[0] ?? null;
  }, [myCandidate, primaryApplication, myResumes]);

  // Profile editor state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  // Resume upload state
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // New application modal state
  const [isNewAppModalOpen, setIsNewAppModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [newAppRemarks, setNewAppRemarks] = useState('');
  const [newAppError, setNewAppError] = useState<string | null>(null);

  useEffect(() => {
    if (myCandidate) {
      setFullName(myCandidate.FULL_NAME);
      setEmail(myCandidate.EMAIL);
      setPhone(myCandidate.PHONE ?? '');
      setQualification(myCandidate.QUALIFICATION ?? '');
      setExperienceYears(String(myCandidate.EXPERIENCE_YEARS ?? 0));
    }
  }, [myCandidate]);

  const availableOpenJobs = useMemo(() => {
    const appliedJobIds = new Set(myApplications.map((a) => a.JOB_ID));
    return db.jobs.filter((j) => j.JOB_STATUS === 'OPEN' && !appliedJobIds.has(j.JOB_ID));
  }, [db.jobs, myApplications]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myCandidate) return;
    setProfileError(null);
    setProfileSaved(false);

    const res = updateCandidate(myCandidate.CANDIDATE_ID, {
      FULL_NAME: fullName,
      EMAIL: email,
      PHONE: phone,
      QUALIFICATION: qualification,
      EXPERIENCE_YEARS: Number(experienceYears),
    });

    if (!res.ok) {
      setProfileError(res.error ?? 'Failed to update profile.');
      return;
    }
    setProfileSaved(true);
  };

  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResumeError(null);
    const file = e.target.files?.[0];
    if (!file || !myCandidate) return;

    const validationRes = validatePdfResumeFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!validationRes.ok) {
      setResumeError(validationRes.error ?? 'Invalid PDF file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const targetAppId = primaryApplication?.APPLICATION_ID ?? 0;
    const reader = new FileReader();
    reader.onload = () => {
      saveCandidateResume({
        CANDIDATE_ID: myCandidate.CANDIDATE_ID,
        APPLICATION_ID: targetAppId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/pdf',
        uploadedAt: new Date().toISOString(),
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
    };
    reader.readAsDataURL(file);
  };

  const openNewApplicationDialog = () => {
    const firstJob = availableOpenJobs[0];
    setSelectedJobId(String(firstJob?.JOB_ID ?? ''));
    setNewAppRemarks('');
    setNewAppError(null);
    setIsNewAppModalOpen(true);
  };

  const handleNewApplicationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myCandidate) return;
    setNewAppError(null);

    const res = applyForJob({
      CANDIDATE_ID: myCandidate.CANDIDATE_ID,
      JOB_ID: Number(selectedJobId),
      REMARKS: newAppRemarks.trim() || 'Submitted from Candidate Workspace',
    });

    if (!res.ok) {
      setNewAppError(res.error ?? 'Could not submit application.');
      return;
    }
    setIsNewAppModalOpen(false);
  };

  if (!myCandidate) {
    return (
      <div className="surface-card rounded-2xl p-8 text-center space-y-3">
        <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
          Candidate Profile Not Found
        </h2>
        <p className="text-xs text-[var(--text-secondary)]">
          Please register a candidate profile or sign in again.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <section className="surface-card rounded-2xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]">
            Candidate Applicant Portal · CANDIDATE_ID #{myCandidate.CANDIDATE_ID}
          </div>
          <h2 className="text-2xl font-display font-bold text-[var(--text-primary)]">
            Welcome, {myCandidate.FULL_NAME}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {myCandidate.QUALIFICATION ?? 'Qualification on file'} · {myCandidate.EXPERIENCE_YEARS}{' '}
            year(s) experience · Registered {myCandidate.CREATED_DATE}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {availableOpenJobs.length > 0 && (
            <button
              type="button"
              onClick={openNewApplicationDialog}
              className="btn-base btn-primary text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Apply for Another Open Role</span>
            </button>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="btn-base btn-secondary text-xs"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span>{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
          </button>
        </div>
      </section>

      {/* Main Two-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Application Status & PDF Resume Management (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Application Status Section */}
          <section className="surface-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                  My Job Applications & Status (ER_APPLICATION)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Real-time status from the local recruitment pipeline.
                </p>
              </div>
              <Briefcase className="w-4 h-4 text-[var(--brand-primary)]" />
            </div>

            {myApplications.length === 0 ? (
              <div className="surface-inset rounded-xl p-6 text-center space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  You have not submitted a job application yet.
                </p>
                {availableOpenJobs.length > 0 && (
                  <button
                    type="button"
                    onClick={openNewApplicationDialog}
                    className="btn-base btn-primary text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Submit Job Application</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {myApplications.map((app) => (
                  <div
                    key={app.APPLICATION_ID}
                    className="surface-inset rounded-xl p-4 space-y-3 border border-[var(--border-subtle)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-mono-tabular text-[var(--brand-primary)] font-semibold">
                          APPLICATION_ID #{app.APPLICATION_ID} · Submitted {app.APPLICATION_DATE}
                        </div>
                        <h4 className="text-base font-display font-bold text-[var(--text-primary)] mt-0.5">
                          {app.JOB_TITLE}
                        </h4>
                        <div className="text-xs text-[var(--text-secondary)]">
                          Department: <strong className="text-[var(--text-primary)]">{app.DEPT_NAME}</strong>
                        </div>
                      </div>
                      <StatusIndicator status={app.APPLICATION_STATUS} />
                    </div>

                    <div className="pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                      <strong className="text-[var(--text-primary)]">Next Expected Step: </strong>
                      {getNextStepGuidance(app.APPLICATION_STATUS)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* PDF Resume Submission & Replacement Section */}
          <section className="surface-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                  Resume Submission & Document Status (PDF Only)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Upload or replace your PDF resume for HR evaluation.
                </p>
              </div>
              <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleResumeFileChange}
              className="sr-only"
            />

            {primaryResume ? (
              <div className="surface-inset rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-[var(--text-primary)]">
                    {primaryResume.fileName}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] font-mono-tabular">
                    {formatFileSize(primaryResume.fileSize)} · Uploaded{' '}
                    {new Date(primaryResume.uploadedAt).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {primaryApplication?.APPLICATION_STATUS === 'APPLIED'
                      ? 'Status: Submitted and awaiting HR review'
                      : `Status: Application currently marked ${primaryApplication?.APPLICATION_STATUS ?? 'APPLIED'}`}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {primaryResume.dataUrl ? (
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      className="btn-base btn-secondary text-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                      <span>Preview PDF</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-[var(--warning)]">
                      Re-upload PDF to preview after browser refresh
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-base btn-primary text-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Replace PDF Resume</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="surface-inset rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-[var(--text-primary)]">
                    No PDF resume uploaded in this session
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    Attach a valid <code className="font-mono-tabular">.pdf</code> file (up to 5 MB)
                    so HR can preview your resume in the Resume Review workspace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-base btn-primary text-xs shrink-0"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload PDF Resume</span>
                </button>
              </div>
            )}

            {resumeError && (
              <div
                role="alert"
                className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
              >
                {resumeError}
              </div>
            )}
          </section>

          {/* Scheduled Interviews Section */}
          {myInterviews.length > 0 && (
            <section className="surface-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div>
                  <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                    Scheduled Interviews (ER_INTERVIEW)
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Interview rounds linked to your application.
                  </p>
                </div>
                <CalendarCheck className="w-4 h-4 text-[var(--brand-primary)]" />
              </div>

              <div className="space-y-3 text-xs">
                {myInterviews.map((intv) => (
                  <div
                    key={intv.INTERVIEW_ID}
                    className="surface-inset rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-[var(--text-primary)]">
                        Round {intv.INTERVIEW_ROUND} · {intv.JOB_TITLE}
                      </div>
                      <div className="text-[var(--text-secondary)]">
                        Date: <strong className="font-mono-tabular">{intv.INTERVIEW_DATE}</strong> ·
                        Mode: <strong>{intv.INTERVIEW_MODE}</strong> · Interviewer:{' '}
                        <strong>{intv.INTERVIEWER_NAME ?? 'TBA'}</strong>
                      </div>
                    </div>
                    <StatusIndicator status={intv.INTERVIEW_STATUS} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Candidate Profile Editor & Help (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <section className="surface-card rounded-2xl p-6 space-y-4">
            <div className="border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                Edit Candidate Profile (ER_CANDIDATE)
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Keep your contact details and qualification accurate. Editing your profile does not
                reset your application status.
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs" noValidate>
              <div>
                <label
                  htmlFor="cand-self-name"
                  className="block font-semibold text-[var(--text-primary)] mb-1"
                >
                  Full Name *
                </label>
                <input
                  id="cand-self-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="cand-self-email"
                  className="block font-semibold text-[var(--text-primary)] mb-1"
                >
                  Email Address *
                </label>
                <input
                  id="cand-self-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="cand-self-phone"
                    className="block font-semibold text-[var(--text-primary)] mb-1"
                  >
                    Phone Number
                  </label>
                  <input
                    id="cand-self-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field font-mono-tabular"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cand-self-exp"
                    className="block font-semibold text-[var(--text-primary)] mb-1"
                  >
                    Experience (Years)
                  </label>
                  <input
                    id="cand-self-exp"
                    type="number"
                    min="0"
                    step="0.5"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="input-field font-mono-tabular"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="cand-self-qual"
                  className="block font-semibold text-[var(--text-primary)] mb-1"
                >
                  Educational Qualification
                </label>
                <input
                  id="cand-self-qual"
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="input-field"
                />
              </div>

              {profileError && (
                <div
                  role="alert"
                  className="rounded-lg p-3 bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
                >
                  {profileError}
                </div>
              )}

              {profileSaved && (
                <div className="rounded-lg p-3 bg-[var(--success-bg)] text-[var(--success)] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Candidate profile updated successfully.</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button type="submit" className="btn-base btn-primary text-xs">
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile Changes</span>
                </button>
              </div>
            </form>
          </section>

          <section className="surface-card rounded-2xl p-6 space-y-3 text-xs">
            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Candidate Privacy & Prototype Notice</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Your Candidate Workspace displays only your own profile, resume, and application
              status. Other applicants cannot view your information. All submissions and PDF
              previews operate locally within your browser session.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onNavigate('/settings')}
                className="btn-base btn-secondary text-xs w-full"
              >
                Open Account & Theme Settings
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <Modal
        isOpen={isPreviewOpen && Boolean(primaryResume?.dataUrl)}
        onClose={() => setIsPreviewOpen(false)}
        title={primaryResume ? `Resume Preview: ${primaryResume.fileName}` : 'PDF Preview'}
        subtitle="Local browser session PDF preview."
        maxWidthClass="max-w-4xl"
      >
        {primaryResume?.dataUrl && (
          <div className="space-y-4">
            <div className="w-full h-[520px] rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--surface-muted)]">
              <iframe
                src={primaryResume.dataUrl}
                title="Candidate PDF Resume Preview"
                className="w-full h-full"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="btn-base btn-secondary text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Apply for Another Open Job Modal */}
      <Modal
        isOpen={isNewAppModalOpen}
        onClose={() => setIsNewAppModalOpen(false)}
        title="Submit New Job Application (ER_APPLICATION)"
        subtitle="Apply your candidate profile to an open job requisition."
      >
        <form onSubmit={handleNewApplicationSubmit} className="space-y-4 text-xs" noValidate>
          <div>
            <label
              htmlFor="cand-new-job"
              className="block font-semibold text-[var(--text-primary)] mb-1"
            >
              Select Open Position *
            </label>
            <select
              id="cand-new-job"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="input-field"
              required
            >
              {availableOpenJobs.map((j) => {
                const dept = db.departments.find((d) => d.DEPT_ID === j.DEPT_ID);
                return (
                  <option key={j.JOB_ID} value={String(j.JOB_ID)}>
                    {j.JOB_TITLE} — {dept?.DEPT_NAME ?? 'Department'} ({formatInrSalary(j.MIN_SALARY)}–
                    {formatInrSalary(j.MAX_SALARY)})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label
              htmlFor="cand-new-remarks"
              className="block font-semibold text-[var(--text-primary)] mb-1"
            >
              Application Note (Optional REMARKS)
            </label>
            <input
              id="cand-new-remarks"
              type="text"
              value={newAppRemarks}
              onChange={(e) => setNewAppRemarks(e.target.value)}
              placeholder="Optional note for HR..."
              className="input-field"
            />
          </div>

          {newAppError && (
            <div
              role="alert"
              className="rounded-lg p-3 bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
            >
              {newAppError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsNewAppModalOpen(false)}
              className="btn-base btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-base btn-primary">
              Submit Application
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
