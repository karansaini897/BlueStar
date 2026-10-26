import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Award,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  GitBranch,
  HelpCircle,
  Moon,
  Save,
  Settings,
  ShieldCheck,
  Sun,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { Modal, StatusIndicator, formatInrSalary } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import { canActorPromoteEmployee, isSubordinateOf } from '../model/operations';
import {
  EnrichedEmployee,
  HIERARCHY_LEVEL_LABELS,
  HierarchyLevel,
} from '../model/schema';

interface EmployeeWorkspacePageProps {
  onNavigate: (path: string) => void;
}

export const EmployeeWorkspacePage: React.FC<EmployeeWorkspacePageProps> = ({ onNavigate }) => {
  const {
    db,
    currentUser,
    enrichedEmployees,
    updateCandidate,
    promoteEmployee,
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

  // Subordinate promotion modal state (for Level >= 2 managers)
  const [promotingSubordinate, setPromotingSubordinate] = useState<EnrichedEmployee | null>(null);
  const [promoDesignation, setPromoDesignation] = useState('');
  const [promoNewLevel, setPromoNewLevel] = useState<HierarchyLevel>(2);
  const [promoSalary, setPromoSalary] = useState('');
  const [promoNotes, setPromoNotes] = useState('');
  const [promoConfirmStep, setPromoConfirmStep] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

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

  // Subordinates in my reporting hierarchy (direct or indirect)
  const mySubordinates = useMemo(() => {
    if (!myEmployeeRecord) return [];
    return enrichedEmployees.filter(
      (emp) =>
        emp.EMPLOYEE_ID !== myEmployeeRecord.EMPLOYEE_ID &&
        isSubordinateOf(db.employees, myEmployeeRecord.EMPLOYEE_ID, emp.EMPLOYEE_ID)
    );
  }, [db.employees, enrichedEmployees, myEmployeeRecord]);

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

  const openSubordinatePromoModal = (sub: EnrichedEmployee) => {
    if (!myEmployeeRecord) return;
    setPromotingSubordinate(sub);
    setPromoDesignation(sub.DESIGNATION);
    const nextLevel = Math.min(
      myEmployeeRecord.HIERARCHY_LEVEL - 1,
      sub.HIERARCHY_LEVEL + 1
    ) as HierarchyLevel;
    setPromoNewLevel((nextLevel >= 1 ? nextLevel : sub.HIERARCHY_LEVEL) as HierarchyLevel);
    setPromoSalary(String(sub.ANNUAL_SALARY ?? 500000));
    setPromoNotes('');
    setPromoConfirmStep(false);
    setPromoError(null);
  };

  const handleConfirmSubordinatePromotion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingSubordinate || !myEmployeeRecord) return;
    setPromoError(null);

    if (!promoDesignation.trim()) {
      setPromoError('Please select or enter a valid position title.');
      return;
    }

    if (!promoConfirmStep) {
      setPromoConfirmStep(true);
      return;
    }

    const res = promoteEmployee({
      employeeId: promotingSubordinate.EMPLOYEE_ID,
      newDesignation: promoDesignation.trim(),
      newLevel: promoNewLevel,
      newSalary: promoSalary !== '' ? Number(promoSalary) : undefined,
      notes: promoNotes.trim() || undefined,
    });

    if (!res.ok) {
      setPromoError(res.error ?? 'Failed to promote subordinate.');
      setPromoConfirmStep(false);
      return;
    }

    setPromotingSubordinate(null);
    setPromoConfirmStep(false);
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
            {myEmployeeRecord.DESIGNATION} · {myEmployeeRecord.DEPT_NAME} Department ·{' '}
            <span className="font-semibold text-[var(--brand-primary)]">
              {HIERARCHY_LEVEL_LABELS[myEmployeeRecord.HIERARCHY_LEVEL]}
            </span>
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
        {/* Left Column: Employment Details, Salary Timeline & Personal Info Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Employment Details (Read-Only for Employee; Managed by HR) */}
          <section className="surface-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                  Employment Details & Organisational Hierarchy
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Official role, department, hierarchy level, and compensation records assigned by
                  HR Administration.
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
                <div className="text-[var(--text-secondary)]">Current Position / Designation</div>
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
                  <GitBranch className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                  <span>Hierarchy Level</span>
                </div>
                <div className="font-bold text-sm text-[var(--brand-primary)] mt-0.5">
                  {HIERARCHY_LEVEL_LABELS[myEmployeeRecord.HIERARCHY_LEVEL]}
                </div>
              </div>

              <div className="surface-inset rounded-xl p-3.5">
                <div className="text-[var(--text-secondary)]">Reporting Manager</div>
                <div className="font-semibold text-sm text-[var(--text-primary)] mt-0.5">
                  {myEmployeeRecord.MANAGER_NAME
                    ? `${myEmployeeRecord.MANAGER_NAME} (#${myEmployeeRecord.MANAGER_EMPLOYEE_ID})`
                    : 'Direct to HR / Department Head'}
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

          {/* Visual Timeline of Salary Adjustments (Employee Self-Service View) */}
          <section
            className="surface-card rounded-2xl p-6 space-y-4"
            data-testid="employee-salary-adjustment-timeline"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--brand-primary)]" />
                <div>
                  <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                    Visual Timeline of Salary Adjustments
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Chronological record of your compensation adjustments, percentage increases, and
                    authorizing HR users.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono-tabular text-[var(--text-secondary)]">
                {myEmployeeRecord.SALARY_HISTORY.length} adjustment(s)
              </span>
            </div>

            {myEmployeeRecord.SALARY_HISTORY.length === 0 ? (
              <div className="surface-inset rounded-xl p-4 text-xs text-[var(--text-secondary)]">
                No subsequent salary adjustments have been recorded since your initial onboarding
                compensation of{' '}
                <strong className="font-mono-tabular text-[var(--text-primary)]">
                  {formatInrSalary(myEmployeeRecord.ANNUAL_SALARY)}
                </strong>
                .
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--brand-primary)]/30">
                {myEmployeeRecord.SALARY_HISTORY.map((adj) => {
                  const isPositive = adj.percentageIncrease >= 0;
                  const formattedPct = `${isPositive ? '+' : ''}${adj.percentageIncrease.toFixed(2)}%`;
                  return (
                    <div
                      key={adj.id}
                      className="relative surface-inset rounded-xl p-4 border border-[var(--border-subtle)] space-y-2"
                    >
                      <span
                        className={`absolute -left-[19px] top-4 w-3 h-3 rounded-full border-2 border-[var(--surface-primary)] ${
                          isPositive ? 'bg-[var(--success)]' : 'bg-[var(--warning)]'
                        }`}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono-tabular font-bold text-[var(--text-primary)] flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                            {adj.date}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono-tabular font-bold ${
                              isPositive
                                ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                : 'bg-[var(--warning-bg)] text-[var(--warning)]'
                            }`}
                          >
                            <ArrowUpRight className="w-3 h-3" />
                            {formattedPct} Increase
                          </span>
                        </div>
                        <span className="text-xs text-[var(--text-secondary)]">
                          Authorized by:{' '}
                          <strong className="text-[var(--text-primary)]">
                            {adj.authorizedBy}
                          </strong>{' '}
                          <span className="font-mono-tabular">(@{adj.authorizedByUsername})</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-[var(--border-subtle)]/60">
                        <div>
                          <span className="text-[var(--text-secondary)]">Salary Transition: </span>
                          <span className="font-mono-tabular text-[var(--text-secondary)] line-through mr-1.5">
                            {formatInrSalary(adj.previousSalary)}
                          </span>
                          <span className="font-mono-tabular font-bold text-[var(--brand-primary)]">
                            → {formatInrSalary(adj.newSalary)}
                          </span>
                        </div>
                        {adj.reason && (
                          <div className="text-[var(--text-secondary)] italic">
                            &ldquo;{adj.reason}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Manager Authority Section: Subordinate Promotions (for Level >= 2 employees) */}
          {myEmployeeRecord.HIERARCHY_LEVEL >= 2 && (
            <section className="surface-card rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div>
                  <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                    My Reporting Team & Subordinate Promotions
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    As a Level {myEmployeeRecord.HIERARCHY_LEVEL} manager, you may promote active
                    subordinates in your reporting chain up to Level{' '}
                    {myEmployeeRecord.HIERARCHY_LEVEL - 1}.
                  </p>
                </div>
                <Award className="w-4 h-4 text-[var(--brand-primary)]" />
              </div>

              {mySubordinates.length === 0 ? (
                <div className="surface-inset rounded-xl p-4 text-xs text-[var(--text-secondary)]">
                  No employees are currently assigned to your reporting chain. HR Administration can
                  assign reporting relationships in the Employee Directory.
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  {mySubordinates.map((sub) => {
                    const perm = canActorPromoteEmployee(
                      db,
                      currentUser?.username || '',
                      sub.EMPLOYEE_ID
                    );
                    return (
                      <div
                        key={sub.EMPLOYEE_ID}
                        className="surface-inset rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-bold text-[var(--text-primary)]">
                            {sub.FULL_NAME} (#{sub.EMPLOYEE_ID})
                          </div>
                          <div className="text-[var(--text-secondary)]">
                            {sub.DESIGNATION} · {HIERARCHY_LEVEL_LABELS[sub.HIERARCHY_LEVEL]}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={
                            !perm.allowed ||
                            sub.HIERARCHY_LEVEL >= myEmployeeRecord.HIERARCHY_LEVEL - 1
                          }
                          onClick={() => openSubordinatePromoModal(sub)}
                          className="btn-base btn-primary !py-1.5 !px-3 text-xs"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Promote Subordinate</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

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

        {/* Right Column: Promotion History, Notifications, Quick Settings & Support (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Promotion History */}
          <section className="surface-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-base font-display font-bold text-[var(--text-primary)]">
                  Promotion History
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Recorded role progressions and hierarchy level upgrades.
                </p>
              </div>
              <Award className="w-4 h-4 text-[var(--brand-primary)]" />
            </div>

            {myEmployeeRecord.PROMOTION_HISTORY.length === 0 ? (
              <div className="surface-inset rounded-xl p-4 text-xs text-[var(--text-secondary)]">
                No promotion events recorded yet for your employee profile.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {myEmployeeRecord.PROMOTION_HISTORY.map((promo) => (
                  <div
                    key={promo.id}
                    className="surface-inset rounded-xl p-3.5 space-y-1.5 border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-tabular font-bold text-[var(--brand-primary)]">
                        {promo.timestamp.slice(0, 10)}
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        By {promo.authorizedBy}
                      </span>
                    </div>
                    <div className="font-bold text-[var(--text-primary)]">
                      {promo.previousDesignation} (Level {promo.previousLevel}) →{' '}
                      <span className="text-[var(--brand-primary)]">
                        {promo.newDesignation} (Level {promo.newLevel})
                      </span>
                    </div>
                    {promo.notes && (
                      <div className="text-[var(--text-secondary)] italic">
                        &ldquo;{promo.notes}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

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
              This Employee Workspace displays your own employment profile, salary adjustment
              timeline, and promotion history. Employees cannot promote themselves or edit their own
              hierarchy level.
            </p>
          </section>
        </div>
      </div>

      {/* Subordinate Promotion Modal (for Level >= 2 Managers) */}
      <Modal
        isOpen={promotingSubordinate !== null}
        onClose={() => {
          setPromotingSubordinate(null);
          setPromoConfirmStep(false);
        }}
        title={
          promotingSubordinate
            ? `Promote Subordinate — ${promotingSubordinate.FULL_NAME} (#${promotingSubordinate.EMPLOYEE_ID})`
            : 'Promote Subordinate'
        }
        subtitle="Managerial promotion within your reporting hierarchy. The subordinate's new level must remain strictly below your level."
        maxWidthClass="max-w-lg"
      >
        {promotingSubordinate && (
          <form onSubmit={handleConfirmSubordinatePromotion} className="space-y-4" noValidate>
            <div className="surface-inset rounded-xl p-3.5 text-xs space-y-1">
              <div className="font-bold text-[var(--text-primary)]">
                Current Position: {promotingSubordinate.DESIGNATION} · Level{' '}
                {promotingSubordinate.HIERARCHY_LEVEL}
              </div>
              <div className="text-[var(--text-secondary)]">
                Your Authority: {myEmployeeRecord.FULL_NAME} (Level{' '}
                {myEmployeeRecord.HIERARCHY_LEVEL})
              </div>
            </div>

            {!promoConfirmStep ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                      New Position Title *
                    </label>
                    <input
                      type="text"
                      list="sub-position-options"
                      value={promoDesignation}
                      onChange={(e) => setPromoDesignation(e.target.value)}
                      className="input-field"
                      required
                    />
                    <datalist id="sub-position-options">
                      {(db.positionTitles ?? []).map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                      New Hierarchy Level *
                    </label>
                    <select
                      value={promoNewLevel}
                      onChange={(e) => setPromoNewLevel(Number(e.target.value) as HierarchyLevel)}
                      className="input-field"
                    >
                      {([1, 2, 3, 4, 5] as HierarchyLevel[])
                        .filter((lvl) => lvl < myEmployeeRecord.HIERARCHY_LEVEL)
                        .map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {HIERARCHY_LEVEL_LABELS[lvl]}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Updated Annual Salary (INR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={promoSalary}
                    onChange={(e) => setPromoSalary(e.target.value)}
                    className="input-field font-mono-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Promotion Notes
                  </label>
                  <input
                    type="text"
                    value={promoNotes}
                    onChange={(e) => setPromoNotes(e.target.value)}
                    placeholder="Reason for promotion"
                    className="input-field"
                  />
                </div>
              </>
            ) : (
              <div className="rounded-xl p-4 bg-[var(--brand-subtle)] border border-[var(--border-emphasis)] space-y-2 text-xs">
                <div className="font-bold text-[var(--brand-primary)] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm Subordinate Promotion</span>
                </div>
                <p className="text-[var(--text-primary)]">
                  Promote <strong>{promotingSubordinate.FULL_NAME}</strong> to{' '}
                  <strong>{promoDesignation}</strong> (Level {promoNewLevel}) with compensation{' '}
                  <strong className="font-mono-tabular">
                    {formatInrSalary(promoSalary !== '' ? Number(promoSalary) : null)}
                  </strong>
                  ?
                </p>
              </div>
            )}

            {promoError && (
              <div
                role="alert"
                className="rounded-lg p-3 bg-[var(--danger-bg)] text-[var(--danger)] text-xs font-medium"
              >
                {promoError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => {
                  if (promoConfirmStep) setPromoConfirmStep(false);
                  else setPromotingSubordinate(null);
                }}
                className="btn-base btn-secondary text-xs"
              >
                {promoConfirmStep ? 'Back' : 'Cancel'}
              </button>
              <button type="submit" className="btn-base btn-primary text-xs">
                <Award className="w-4 h-4" />
                <span>{promoConfirmStep ? 'Confirm & Save Promotion' : 'Review Promotion'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
