import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Moon,
  Sun,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import { AnimatedFacetBackground } from '../components/AnimatedFacetBackground';
import { BlueStarLogo } from '../components/BlueStarLogo';
import { StatusIndicator, formatInrSalary } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import { buildPrototypeUsername, validatePdfResumeFile } from '../model/operations';
import { CandidateResumeRecord } from '../model/schema';

interface RegisterPageProps {
  onNavigate: (path: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const { db, theme, toggleTheme, registerCandidate } = useRecruitment();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openJobs = useMemo(
    () => db.jobs.filter((j) => j.JOB_STATUS === 'OPEN'),
    [db.jobs]
  );

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customUsername, setCustomUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('0');
  const [selectedJobId, setSelectedJobId] = useState<string>(() =>
    String(openJobs[0]?.JOB_ID ?? db.jobs[0]?.JOB_ID ?? 101)
  );
  const [remarks, setRemarks] = useState('');

  // PDF resume upload state
  const [resumeFile, setResumeFile] = useState<{
    fileName: string;
    fileSize: number;
    mimeType: string;
    dataUrl?: string;
  } | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Submission confirmation state
  const [submittedSummary, setSubmittedSummary] = useState<{
    fullName: string;
    username: string;
    jobTitle: string;
    deptName: string;
    fileName: string;
    status: string;
  } | null>(null);

  const selectedJob = useMemo(
    () => db.jobs.find((j) => j.JOB_ID === Number(selectedJobId)) ?? null,
    [db.jobs, selectedJobId]
  );

  const selectedDepartmentName = useMemo(() => {
    if (!selectedJob) return 'Unassigned';
    return (
      db.departments.find((d) => d.DEPT_ID === selectedJob.DEPT_ID)?.DEPT_NAME ?? 'Unassigned'
    );
  }, [db.departments, selectedJob]);

  const generatedUsername = useMemo(() => {
    const combined = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!combined) return '';
    return buildPrototypeUsername(combined);
  }, [firstName, lastName]);

  const usernameCollisionExists = useMemo(() => {
    if (!generatedUsername) return false;
    const target = (customUsername.trim() || generatedUsername).toLowerCase();
    return db.accounts.some((a) => a.username.toLowerCase() === target);
  }, [db.accounts, generatedUsername, customUsername]);

  const processSelectedFile = (file: File | undefined | null) => {
    setResumeError(null);
    if (!file) return;

    const validationRes = validatePdfResumeFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!validationRes.ok) {
      setResumeFile(null);
      setResumeError(validationRes.error ?? 'Invalid PDF file.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setResumeFile({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/pdf',
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
      });
    };
    reader.onerror = () => {
      setResumeFile({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/pdf',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    processSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    processSelectedFile(file);
  };

  const handleRemoveResume = () => {
    setResumeFile(null);
    setResumeError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const fName = firstName.trim();
    const lName = lastName.trim();
    if (!fName || !lName) {
      setFormError('Both First Name and Last Name are required.');
      return;
    }

    if (!resumeFile) {
      setFormError('Please select a valid PDF resume (.pdf) before submitting your application.');
      return;
    }

    const fullName = `${fName} ${lName}`;
    const resumePayload: Omit<CandidateResumeRecord, 'CANDIDATE_ID' | 'APPLICATION_ID'> = {
      fileName: resumeFile.fileName,
      fileSize: resumeFile.fileSize,
      mimeType: resumeFile.mimeType,
      uploadedAt: new Date().toISOString(),
      dataUrl: resumeFile.dataUrl,
    };

    const res = registerCandidate({
      FULL_NAME: fullName,
      EMAIL: email,
      PHONE: phone,
      QUALIFICATION: qualification,
      EXPERIENCE_YEARS: Number(experienceYears),
      JOB_ID: Number(selectedJobId),
      REMARKS: remarks.trim() || 'Submitted via Candidate Registration Portal',
      customUsername: customUsername.trim() || undefined,
      resume: resumePayload,
    });

    if (!res.ok) {
      setFormError(res.error ?? 'Registration could not be completed.');
      return;
    }

    setSubmittedSummary({
      fullName,
      username: res.createdUsername ?? generatedUsername,
      jobTitle: selectedJob?.JOB_TITLE ?? 'Selected Position',
      deptName: selectedDepartmentName,
      fileName: resumeFile.fileName,
      status: 'APPLIED',
    });
  };

  return (
    <div className="min-h-screen architectural-canvas flex flex-col justify-between relative">
      <AnimatedFacetBackground />

      {/* Top Header */}
      <header className="relative z-10 max-w-[1200px] w-full mx-auto px-4 sm:px-8 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="btn-base btn-secondary text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>
          <div className="hidden sm:block">
            <BlueStarLogo className="h-7" />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            className="btn-base btn-secondary text-xs"
          >
            <span>Existing Account Sign In</span>
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className="btn-base btn-secondary !p-2"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-[960px] w-full mx-auto px-4 sm:px-8 py-6 pb-20">
        {submittedSummary ? (
          <div className="facet-glass-strong rounded-2xl p-7 sm:p-10 space-y-6 animate-hero-enter">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--success-bg)] text-[var(--success)] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]">
                  Local Prototype Submission Complete
                </div>
                <h1 className="text-2xl font-display font-bold text-[var(--text-primary)]">
                  Candidate Profile & Application Received
                </h1>
              </div>
            </div>

            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Thank you, <strong className="text-[var(--text-primary)]">{submittedSummary.fullName}</strong>.
              Your candidate record (<code className="font-mono-tabular">ER_CANDIDATE</code>), job
              application (<code className="font-mono-tabular">ER_APPLICATION</code>), and PDF resume
              have been recorded in the local prototype state.
            </p>

            <div className="surface-card rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-[var(--text-secondary)]">Assigned Role</div>
                <div className="font-bold text-[var(--text-primary)] mt-0.5">
                  Candidate (Applicant Workspace)
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Account Username</div>
                <div className="font-mono-tabular font-bold text-[var(--brand-primary)] mt-0.5">
                  {submittedSummary.username}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Applied Position & Department</div>
                <div className="font-bold text-[var(--text-primary)] mt-0.5">
                  {submittedSummary.jobTitle} · {submittedSummary.deptName}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Current Application Status</div>
                <div className="mt-1">
                  <StatusIndicator status="APPLIED" />
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Attached PDF Resume</div>
                <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                  {submittedSummary.fileName}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Next Expected Step</div>
                <div className="text-[var(--text-primary)] mt-0.5">
                  HR Resume Review & Shortlisting Evaluation
                </div>
              </div>
            </div>

            <div className="surface-inset rounded-xl p-4 text-xs text-[var(--text-secondary)] leading-relaxed">
              <strong>Prototype Storage Notice:</strong> Your application and resume preview are
              stored locally in this browser session and have not been transmitted to an external
              HR server or live Oracle database.
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="btn-base btn-secondary text-xs"
              >
                Return to Landing Page
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/candidate-workspace')}
                className="btn-base btn-primary text-xs"
              >
                <span>Open My Candidate Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="facet-glass-strong rounded-2xl p-6 sm:p-9 space-y-6 animate-hero-enter">
            <div className="space-y-2 border-b border-[var(--border-subtle)] pb-5">
              <div className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]">
                New Applicant Registration · ER_CANDIDATE & ER_APPLICATION
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--text-primary)]">
                Candidate Profile & PDF Resume Submission
              </h1>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                Complete the fields below to create your candidate profile, select an open position,
                and submit a PDF resume for HR review. Newly registered applicants are assigned the
                Candidate role by default.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Section 1: Personal & Academic Information */}
              <div className="space-y-4">
                <h2 className="text-sm font-display font-bold text-[var(--text-primary)]">
                  1. Candidate Identity & Contact Details (ER_CANDIDATE)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="reg-first-name"
                      className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                    >
                      First Name *
                    </label>
                    <input
                      id="reg-first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Priya"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-last-name"
                      className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                    >
                      Last Name *
                    </label>
                    <input
                      id="reg-last-name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Sharma"
                      className="input-field"
                      required
                    />
                  </div>
                </div>

                {/* Username preview & collision handler */}
                {generatedUsername && (
                  <div className="surface-inset rounded-xl p-3.5 text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[var(--text-secondary)]">
                        Prototype Account Username (<code className="font-mono-tabular">firstname.lastname</code>):
                      </span>
                      <span className="font-mono-tabular font-bold text-[var(--brand-primary)]">
                        {customUsername.trim() || generatedUsername}
                      </span>
                    </div>
                    {usernameCollisionExists && (
                      <div className="pt-1">
                        <label
                          htmlFor="reg-custom-username"
                          className="block text-xs font-semibold text-[var(--warning)] mb-1"
                        >
                          This username is already taken. Please specify an alternative username *
                        </label>
                        <input
                          id="reg-custom-username"
                          type="text"
                          value={customUsername}
                          onChange={(e) => setCustomUsername(e.target.value)}
                          placeholder={`${generatedUsername}.2`}
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="reg-email"
                      className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                    >
                      Email Address (Unique) *
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="applicant@example.com"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-phone"
                      className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                    >
                      Phone Number *
                    </label>
                    <input
                      id="reg-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit contact number"
                      className="input-field font-mono-tabular"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="reg-qualification"
                      className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                    >
                      Educational Qualification *
                    </label>
                    <input
                      id="reg-qualification"
                      type="text"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      placeholder="e.g. BTech Computer Engineering, MBA Finance"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="reg-experience"
                      className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                    >
                      Experience (Years) *
                    </label>
                    <input
                      id="reg-experience"
                      type="number"
                      min="0"
                      step="0.5"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      className="input-field font-mono-tabular"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Position Selection */}
              <div className="space-y-4 pt-4 border-t border-[var(--border-subtle)]">
                <h2 className="text-sm font-display font-bold text-[var(--text-primary)]">
                  2. Position & Department Selection (ER_JOB & ER_APPLICATION)
                </h2>

                <div>
                  <label
                    htmlFor="reg-job-select"
                    className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                  >
                    Open Position Being Applied For *
                  </label>
                  <select
                    id="reg-job-select"
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="input-field"
                    required
                  >
                    {openJobs.map((job) => {
                      const dept = db.departments.find((d) => d.DEPT_ID === job.DEPT_ID);
                      return (
                        <option key={job.JOB_ID} value={String(job.JOB_ID)}>
                          {job.JOB_TITLE} — {dept?.DEPT_NAME ?? 'Department'} ({job.VACANCIES}{' '}
                          vacancies · {formatInrSalary(job.MIN_SALARY)}–
                          {formatInrSalary(job.MAX_SALARY)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedJob && (
                  <div className="surface-inset rounded-xl p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[var(--text-secondary)]">Department: </span>
                      <strong className="text-[var(--text-primary)]">{selectedDepartmentName}</strong>
                      <span className="mx-2 text-[var(--text-secondary)]">·</span>
                      <span className="text-[var(--text-secondary)]">
                        {selectedJob.JOB_DESCRIPTION}
                      </span>
                    </div>
                    <span className="font-mono-tabular text-[var(--brand-primary)] font-semibold">
                      JOB_ID #{selectedJob.JOB_ID}
                    </span>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="reg-remarks"
                    className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                  >
                    Application Summary / Cover Note (Optional REMARKS)
                  </label>
                  <input
                    id="reg-remarks"
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Brief note regarding your background or availability"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Section 3: PDF Resume Upload */}
              <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-display font-bold text-[var(--text-primary)]">
                    3. Resume Submission (PDF Only) *
                  </h2>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Accepted format: .pdf (Max 5 MB)
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  id="reg-resume-upload"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                />

                {!resumeFile ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
                      isDragging
                        ? 'border-[var(--brand-primary)] bg-[var(--brand-subtle)]'
                        : 'border-[var(--border-emphasis)] bg-[var(--surface-primary)]'
                    }`}
                  >
                    <Upload className="w-6 h-6 text-[var(--brand-primary)] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Drag and drop your PDF resume here, or browse your computer
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      Only PDF documents (.pdf) are accepted. Executable, HTML, or image files are
                      rejected.
                    </p>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-base btn-secondary text-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                        <span>Select PDF Resume</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="surface-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[var(--brand-subtle)] text-[var(--brand-primary)] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {resumeFile.fileName}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] font-mono-tabular">
                          {formatFileSize(resumeFile.fileSize)} · PDF Verified for Local Prototype
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-base btn-secondary !py-1.5 !px-3 text-xs"
                      >
                        Replace PDF
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveResume}
                        aria-label="Remove selected PDF resume"
                        className="btn-base btn-destructive !py-1.5 !px-2.5 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
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
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
                >
                  {formError}
                </div>
              )}

              <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4">
                <p className="text-xs text-[var(--text-secondary)] max-w-md">
                  By submitting, your profile and PDF resume are retained in local browser prototype
                  storage for HR review demonstration.
                </p>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onNavigate('/')}
                    className="btn-base btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-base btn-primary">
                    <UserPlus className="w-4 h-4" />
                    <span>Submit Application & Resume</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      <footer className="relative z-10 py-4 text-center text-xs text-[var(--text-secondary)]">
        Blue Star&apos;s - Employee Recruitment System · Local Prototype Registration
      </footer>
    </div>
  );
};
