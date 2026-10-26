import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  HelpCircle,
  Moon,
  Save,
  Settings,
  Sun,
  UserCheck,
} from 'lucide-react';
import { StatusIndicator, formatInrSalary } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';

interface EmployeeWorkspacePageProps {
  onNavigate: (path: string) => void;
}

export const EmployeeWorkspacePage: React.FC<EmployeeWorkspacePageProps> = ({ onNavigate }) => {
  const {
    db,
    currentUser,
    enrichedEmployees,
    updateCandidate,
    theme,
    toggleTheme,
  } = useRecruitment();

  // Locate the signed-in employee's own record only (never expose other employees' private records)
  const myEmployeeRecord = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.employeeId) {
      const byEmpId = enrichedEmployees.find((e) => e.EMPLOYEE_ID === currentUser.employeeId);
      if (byEmpId) return byEmpId;
    }
    if (currentUser.candidateId) {
      const byCandId = enrichedEmployees.find((e) => e.CANDIDATE_ID === currentUser.candidateId);
      if (byCandId) return byCandId;
    }
    return enrichedEmployees[0] ?? null;
  }, [currentUser, enrichedEmployees]);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState('1');
  const [formError, setFormError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (myEmployeeRecord) {
      setFullName(myEmployeeRecord.FULL_NAME);
      setEmail(myEmployeeRecord.EMAIL);
      setPhone(myEmployeeRecord.PHONE ?? '');
      setQualification(myEmployeeRecord.QUALIFICATION ?? '');
      setExperienceYears(String(myEmployeeRecord.EXPERIENCE_YEARS ?? 0));
    }
  }, [myEmployeeRecord]);

  // Calculate profile completion percentage from real fields
  const profileCompletion = useMemo(() => {
    if (!myEmployeeRecord) return 0;
    const checks = [
      Boolean(myEmployeeRecord.FULL_NAME),
      Boolean(myEmployeeRecord.EMAIL),
      Boolean(myEmployeeRecord.PHONE),
      Boolean(myEmployeeRecord.QUALIFICATION),
      Boolean(myEmployeeRecord.DESIGNATION),
      Boolean(myEmployeeRecord.JOINING_DATE),
    ];
    const completed = checks.filter(Boolean).length;
    return Math.round((completed / checks.length) * 100);
  }, [myEmployeeRecord]);

  const myRecentActivities = useMemo(() => {
    if (!myEmployeeRecord) return [];
    return db.activities
      .filter(
        (act) =>
          act.description.includes(`#${myEmployeeRecord.EMPLOYEE_ID}`) ||
          act.description.includes(`#${myEmployeeRecord.CANDIDATE_ID}`) ||
          act.description.includes(`#${myEmployeeRecord.APPLICATION_ID}`) ||
          act.entity === 'EMPLOYEE'
      )
      .slice(0, 4);
  }, [db.activities, myEmployeeRecord]);

  const handleSavePersonalProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myEmployeeRecord) return;
    setFormError(null);
    setSavedNotice(false);

    const res = updateCandidate(myEmployeeRecord.CANDIDATE_ID, {
      FULL_NAME: fullName,
      EMAIL: email,
      PHONE: phone,
      QUALIFICATION: qualification,
      EXPERIENCE_YEARS: Number(experienceYears),
    });

    if (!res.ok) {
      setFormError(res.error ?? 'Failed to update personal information.');
      return;
    }
    setSavedNotice(true);
  };

  if (!myEmployeeRecord) {
    return (
      <div className="surface-card rounded-2xl p-8 text-center space-y-3">
        <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">
          Employee Profile Not Found
        </h2>
        <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
          No employee record (<code className="font-mono-tabular">ER_EMPLOYEE</code>) is currently
          linked to this demonstration session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome & Identity Banner */}
      <section className="surface-card rounded-2xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-widest text-[var(--brand-primary)]">
            Employee Self-Service Workspace · Employee #{myEmployeeRecord.EMPLOYEE_ID}
          </div>
          <h2 className="text-2xl font-display font-bold text-[var(--text-primary)]">
            Welcome, {myEmployeeRecord.FULL_NAME}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {myEmployeeRecord.DESIGNATION} · {myEmployeeRecord.DEPT_NAME} Department
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="surface-inset rounded-xl px-4 py-2.5 text-xs">
            <div className="text-[var(--text-secondary)]">Profile Completion</div>
            <div className="font-mono-tabular font-bold text-sm text-[var(--brand-primary)] mt-0.5">
              {profileCompletion}% Complete
            </div>
          </div>
          <StatusIndicator status={myEmployeeRecord.EMPLOYMENT_STATUS} />
        </div>
      </section>

      {/* Main Two-Column Structured Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Employment Details & Personal Info Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Employment Details (Read-Only for Employee; Managed by HR) */}
          <section className="surface-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                  Employment Details (ER_EMPLOYEE)
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Official role, department, and compensation records assigned by HR Administration.
                </p>
              </div>
              <Briefcase className="w-4 h-4 text-[var(--brand-primary)]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="surface-inset rounded-xl p-3.5">
                <div className="text-[var(--text-secondary)]">Employee ID</div>
                <div className="font-mono-tabular font-bold text-sm text-[var(--text-primary)] mt-0.5">
                  #{myEmployeeRecord.EMPLOYEE_ID}
                </div>
              </div>

              <div className="surface-inset rounded-xl p-3.5">
                <div className="text-[var(--text-secondary)]">Designation</div>
                <div className="font-bold text-sm text-[var(--text-primary)] mt-0.5">
                  {myEmployeeRecord.DESIGNATION}
                </div>
              </div>

              <div className="surface-inset rounded-xl p-3.5">
                <div className="text-[var(--text-secondary)] flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                  <span>Department</span>
                </div>
                <div className="font-bold text-sm text-[var(--text-primary)] mt-0.5">
                  {myEmployeeRecord.DEPT_NAME}
                </div>
              </div>

              <div className="surface-inset rounded-xl p-3.5">
                <div className="text-[var(--text-secondary)] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                  <span>Joining Date</span>
                </div>
                <div className="font-mono-tabular font-bold text-sm text-[var(--text-primary)] mt-0.5">
                  {myEmployeeRecord.JOINING_DATE}
                </div>
              </div>

              <div className="surface-inset rounded-xl p-3.5">
                <div className="text-[var(--text-secondary)]">Annual Compensation (Personal View)</div>
                <div className="font-mono-tabular font-bold text-sm text-[var(--brand-primary)] mt-0.5">
                  {formatInrSalary(myEmployeeRecord.ANNUAL_SALARY)}
                </div>
              </div>

              <div className="surface-inset rounded-xl p-3.5">
                <div className="text-[var(--text-secondary)]">Linked Application & Candidate ID</div>
                <div className="font-mono-tabular font-semibold text-sm text-[var(--text-primary)] mt-0.5">
                  App #{myEmployeeRecord.APPLICATION_ID} · Cand #{myEmployeeRecord.CANDIDATE_ID}
                </div>
              </div>
            </div>
          </section>

          {/* Personal Information Editor */}
          <section className="surface-card rounded-2xl p-6 space-y-4">
            <div className="border-b border-[var(--border-subtle)] pb-3">
              <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                My Personal & Academic Information
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Update your contact details, qualification, or experience years stored in your
                linked profile.
              </p>
            </div>

            <form onSubmit={handleSavePersonalProfile} className="space-y-4 text-xs" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="emp-self-name"
                    className="block font-semibold text-[var(--text-primary)] mb-1"
                  >
                    Full Name *
                  </label>
                  <input
                    id="emp-self-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="emp-self-email"
                    className="block font-semibold text-[var(--text-primary)] mb-1"
                  >
                    Email Address *
                  </label>
                  <input
                    id="emp-self-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="emp-self-phone"
                    className="block font-semibold text-[var(--text-primary)] mb-1"
                  >
                    Phone Number
                  </label>
                  <input
                    id="emp-self-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field font-mono-tabular"
                  />
                </div>

                <div>
                  <label
                    htmlFor="emp-self-qual"
                    className="block font-semibold text-[var(--text-primary)] mb-1"
                  >
                    Qualification
                  </label>
                  <input
                    id="emp-self-qual"
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label
                    htmlFor="emp-self-exp"
                    className="block font-semibold text-[var(--text-primary)] mb-1"
                  >
                    Experience (Years)
                  </label>
                  <input
                    id="emp-self-exp"
                    type="number"
                    min="0"
                    step="0.5"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="input-field font-mono-tabular"
                  />
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-lg p-3 bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
                >
                  {formError}
                </div>
              )}

              {savedNotice && (
                <div className="rounded-lg p-3 bg-[var(--success-bg)] text-[var(--success)] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Your personal profile details have been updated in local state.</span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button type="submit" className="btn-base btn-primary text-xs">
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Personal Information</span>
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Right Column: Notifications, Quick Settings & Support (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Notifications & Recent Activity */}
          <section className="surface-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                  Notifications & Workspace Activity
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Recent updates related to your employment record in this prototype session.
                </p>
              </div>
              <Bell className="w-4 h-4 text-[var(--brand-primary)]" />
            </div>

            <div className="space-y-3 text-xs">
              <div className="surface-inset rounded-xl p-3.5 space-y-1">
                <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[var(--success)]" />
                  <span>Employment Status: {myEmployeeRecord.EMPLOYMENT_STATUS}</span>
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Your employee profile (#{myEmployeeRecord.EMPLOYEE_ID}) is linked to the{' '}
                  <strong>{myEmployeeRecord.DEPT_NAME}</strong> department as{' '}
                  <strong>{myEmployeeRecord.DESIGNATION}</strong>.
                </p>
              </div>

              {myRecentActivities.map((act) => (
                <div key={act.id} className="surface-inset rounded-xl p-3.5 space-y-1">
                  <div className="font-semibold text-[var(--text-primary)]">{act.title}</div>
                  <div className="text-[var(--text-secondary)]">{act.description}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Account Settings & Theme */}
          <section className="surface-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                  Account Preferences
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Appearance and session controls.
                </p>
              </div>
              <Settings className="w-4 h-4 text-[var(--brand-primary)]" />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-base btn-secondary flex-1 text-xs"
              >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <span>Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/settings')}
                className="btn-base btn-secondary text-xs"
              >
                <span>Open Settings</span>
              </button>
            </div>
          </section>

          {/* Help & Support */}
          <section className="surface-card rounded-2xl p-6 space-y-2 text-xs">
            <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Help & Role Permissions</span>
            </div>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              This Employee Workspace displays only your own employment and personal profile. Changes
              to designation, department, or salary are managed by HR Administration. Use the
              Platform Assistant button in the bottom-right corner for guided answers.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
