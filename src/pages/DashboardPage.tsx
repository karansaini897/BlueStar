import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  ClipboardCheck,
  FileText,
  Filter,
  Plus,
  UserCheck,
} from 'lucide-react';
import { StatusIndicator } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import { ALLOWED_APPLICATION_STATUSES, ApplicationStatus } from '../model/schema';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const {
    db,
    currentUser,
    metrics,
    candidateApplicationView,
    interviewDetailsView,
    enrichedEmployees,
    departmentSummaries,
  } = useRecruitment();

  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Filtered application view for dashboard analytics & table
  const filteredApps = useMemo(() => {
    return candidateApplicationView.filter((row) => {
      if (selectedDeptId !== 'ALL' && row.DEPT_ID !== Number(selectedDeptId)) return false;
      if (selectedStatus !== 'ALL' && row.APPLICATION_STATUS !== selectedStatus) return false;
      if (dateFrom && row.APPLICATION_DATE < dateFrom) return false;
      if (dateTo && row.APPLICATION_DATE > dateTo) return false;
      return true;
    });
  }, [candidateApplicationView, selectedDeptId, selectedStatus, dateFrom, dateTo]);

  // Applications by status distribution
  const statusDistribution = useMemo(() => {
    const counts: Record<ApplicationStatus, number> = {
      APPLIED: 0,
      SHORTLISTED: 0,
      INTERVIEW: 0,
      SELECTED: 0,
      REJECTED: 0,
      HIRED: 0,
    };
    for (const app of filteredApps) {
      counts[app.APPLICATION_STATUS] = (counts[app.APPLICATION_STATUS] || 0) + 1;
    }
    const maxCount = Math.max(1, ...Object.values(counts));
    return ALLOWED_APPLICATION_STATUSES.map((status) => ({
      status,
      count: counts[status],
      pct: Math.round((counts[status] / Math.max(1, filteredApps.length)) * 100),
      barPct: Math.round((counts[status] / maxCount) * 100),
    }));
  }, [filteredApps]);

  // Interview status distribution
  const interviewDistribution = useMemo(() => {
    const total = Math.max(1, db.interviews.length);
    const scheduled = db.interviews.filter((i) => i.INTERVIEW_STATUS === 'SCHEDULED').length;
    const completed = db.interviews.filter((i) => i.INTERVIEW_STATUS === 'COMPLETED').length;
    const cancelled = db.interviews.filter((i) => i.INTERVIEW_STATUS === 'CANCELLED').length;
    return [
      { label: 'SCHEDULED', count: scheduled, pct: Math.round((scheduled / total) * 100) },
      { label: 'COMPLETED', count: completed, pct: Math.round((completed / total) * 100) },
      { label: 'CANCELLED', count: cancelled, pct: Math.round((cancelled / total) * 100) },
    ];
  }, [db.interviews]);

  // Upcoming scheduled interviews
  const upcomingInterviews = useMemo(() => {
    return interviewDetailsView
      .filter((i) => i.INTERVIEW_STATUS === 'SCHEDULED')
      .sort((a, b) => a.INTERVIEW_DATE.localeCompare(b.INTERVIEW_DATE));
  }, [interviewDetailsView]);

  const maxDeptVacancy = useMemo(() => {
    return Math.max(1, ...departmentSummaries.map((d) => d.OPEN_VACANCIES));
  }, [departmentSummaries]);

  const hasActiveFilters =
    selectedDeptId !== 'ALL' || selectedStatus !== 'ALL' || dateFrom !== '' || dateTo !== '';

  return (
    <div className="space-y-6">
      {/* HR Welcome & Contextual Actions Header */}
      <div className="facet-glass rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-mono-tabular uppercase tracking-wider text-[var(--brand-primary)] font-semibold">
            HR Administration Workspace · {currentUser?.displayName ?? 'Karan Saini'}
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            Manage candidate submissions, review PDF resumes, transition application statuses, and
            update employee profiles.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('/candidates')}
            className="btn-base btn-secondary text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Candidate</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/resume-review')}
            className="btn-base btn-secondary text-xs"
          >
            <ClipboardCheck className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>Review Resumes ({metrics.applicationsAwaitingReview})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/employees')}
            className="btn-base btn-secondary text-xs"
          >
            <UserCheck className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
            <span>Employee Directory</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/applications')}
            className="btn-base btn-primary text-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Manage Applications</span>
          </button>
        </div>
      </div>

      {/* Unified Summary Metrics Strip (Structured Dividers Instead of Repetitive Flashcards) */}
      <section
        aria-label="Recruitment summary metrics"
        className="surface-card rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 overflow-hidden"
      >
        {[
          {
            label: 'Total Candidates',
            value: metrics.totalCandidates,
            sub: 'ER_CANDIDATE',
            path: '/candidates',
          },
          {
            label: 'Applications Received',
            value: metrics.totalApplications,
            sub: 'ER_APPLICATION',
            path: '/applications',
          },
          {
            label: 'Awaiting Review',
            value: metrics.applicationsAwaitingReview,
            sub: 'RESUME QUEUE',
            path: '/resume-review',
          },
          {
            label: 'Open Jobs',
            value: metrics.openJobs,
            sub: 'STATUS: OPEN',
            path: '/jobs',
          },
          {
            label: 'Open Vacancies',
            value: metrics.openVacancies,
            sub: 'SUM(VACANCIES)',
            path: '/jobs',
          },
          {
            label: 'Interviews Scheduled',
            value: metrics.interviewsScheduled,
            sub: 'ER_INTERVIEW',
            path: '/interviews',
          },
          {
            label: 'Total Employees',
            value: metrics.totalEmployees,
            sub: 'ER_EMPLOYEE',
            path: '/employees',
          },
        ].map((metric) => (
          <button
            key={metric.label}
            type="button"
            onClick={() => onNavigate(metric.path)}
            className="p-4 text-left hover:bg-[var(--surface-secondary)]/50 transition-colors cursor-pointer flex flex-col justify-between group"
          >
            <span className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)]">
              {metric.label}
            </span>
            <div className="mt-2">
              <div className="text-2xl font-display font-bold font-mono-tabular text-[var(--text-primary)]">
                {metric.value}
              </div>
              <div className="text-[11px] font-mono-tabular text-[var(--text-secondary)] mt-0.5 truncate">
                {metric.sub}
              </div>
            </div>
          </button>
        ))}
      </section>

      {/* Dashboard Filter Bar (Part X.10.5) */}
      <section
        aria-label="Dashboard analytical filters"
        className="surface-card rounded-xl p-4 flex flex-wrap items-end gap-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)] mr-2 self-center">
          <Filter className="w-4 h-4 text-[var(--brand-primary)]" />
          <span>Filter Pipeline Analytics</span>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label
            htmlFor="dash-dept-filter"
            className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1"
          >
            Department
          </label>
          <select
            id="dash-dept-filter"
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="input-field !py-1.5 text-xs"
          >
            <option value="ALL">All Departments ({db.departments.length})</option>
            {db.departments.map((d) => (
              <option key={d.DEPT_ID} value={String(d.DEPT_ID)}>
                {d.DEPT_NAME}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[160px]">
          <label
            htmlFor="dash-status-filter"
            className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1"
          >
            Application Status
          </label>
          <select
            id="dash-status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field !py-1.5 text-xs"
          >
            <option value="ALL">All Statuses</option>
            {ALLOWED_APPLICATION_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="w-40">
          <label
            htmlFor="dash-date-from"
            className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1"
          >
            From Date
          </label>
          <input
            id="dash-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input-field !py-1.5 text-xs font-mono-tabular"
          />
        </div>

        <div className="w-40">
          <label
            htmlFor="dash-date-to"
            className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1"
          >
            To Date
          </label>
          <input
            id="dash-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input-field !py-1.5 text-xs font-mono-tabular"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSelectedDeptId('ALL');
              setSelectedStatus('ALL');
              setDateFrom('');
              setDateTo('');
            }}
            className="btn-base btn-tertiary text-xs !py-1.5"
          >
            Clear Filters
          </button>
        )}
      </section>

      {/* Analytical Charts Row (Part X.10.3) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Applications by Status */}
        <div className="lg:col-span-6 surface-card rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">
                Applications by Status
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                GROUP BY APPLICATION_STATUS ({filteredApps.length} matching records)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/resume-review')}
              className="text-xs font-semibold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Open Resume Review</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {statusDistribution.map((item) => (
              <div key={item.status} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <StatusIndicator status={item.status} />
                  </div>
                  <div className="font-mono-tabular text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">{item.count}</strong> (
                    {item.pct}%)
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-300"
                    style={{ width: `${item.barPct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Open Vacancies & Jobs by Department */}
        <div className="lg:col-span-6 surface-card rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">
                Open Vacancies & Employees by Department
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                LEFT JOIN ER_JOB WHERE JOB_STATUS = &apos;OPEN&apos;
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/departments')}
              className="text-xs font-semibold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Departments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {departmentSummaries.map((dept) => {
              const barPct = Math.round((dept.OPEN_VACANCIES / maxDeptVacancy) * 100);
              return (
                <div key={dept.DEPT_ID} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)] truncate">
                      {dept.DEPT_NAME}
                    </span>
                    <span className="font-mono-tabular text-[var(--text-secondary)] shrink-0">
                      {dept.OPEN_JOBS} job(s) ·{' '}
                      <strong className="text-[var(--text-primary)]">
                        {dept.OPEN_VACANCIES} vacancies
                      </strong>{' '}
                      · {dept.EMPLOYEES_COUNT} emp
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--surface-secondary)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--success)] transition-all duration-300"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Secondary Row: Interview Distribution + Upcoming Interviews + Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upcoming Interviews & Interview Status Breakdown */}
        <div className="lg:col-span-6 surface-card rounded-xl p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">
                  Interview Schedule & Status
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Derived from ER_V_INTERVIEW_DETAILS ({db.interviews.length} total)
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/interviews')}
                className="text-xs font-semibold text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Manage Interviews</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Compact Status Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {interviewDistribution.map((st) => (
                <div key={st.label} className="surface-inset rounded-lg p-3">
                  <div className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
                    {st.label}
                  </div>
                  <div className="text-lg font-display font-bold font-mono-tabular mt-0.5">
                    {st.count}{' '}
                    <span className="text-xs font-normal text-[var(--text-secondary)]">
                      ({st.pct}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Upcoming Scheduled List */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                Upcoming Scheduled Sessions ({upcomingInterviews.length})
              </div>
              {upcomingInterviews.length === 0 ? (
                <div className="surface-inset rounded-lg p-4 text-xs text-[var(--text-secondary)] text-center">
                  No interviews currently in SCHEDULED status.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                  {upcomingInterviews.map((intv) => (
                    <div
                      key={intv.INTERVIEW_ID}
                      className="p-3 flex items-center justify-between gap-3 text-xs bg-[var(--surface-primary)]"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[var(--text-primary)] truncate">
                          {intv.FULL_NAME} · Round {intv.INTERVIEW_ROUND}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)] truncate">
                          App #{intv.APPLICATION_ID} · {intv.JOB_TITLE} · Interviewer:{' '}
                          {intv.INTERVIEWER_NAME}
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <StatusIndicator status={intv.INTERVIEW_MODE} />
                        <div className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
                          {intv.INTERVIEW_DATE}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Employee Distribution Summary Footer */}
          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>
              Onboarded Employees (<code className="font-mono-tabular">ER_EMPLOYEE</code>):{' '}
              <strong className="text-[var(--text-primary)]">{enrichedEmployees.length}</strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigate('/employees')}
              className="text-[var(--brand-primary)] font-semibold hover:underline cursor-pointer"
            >
              Open Employee Directory
            </button>
          </div>
        </div>

        {/* Recent Local Activity Log (Part X.10.4) */}
        <div className="lg:col-span-6 surface-card rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">
                Recent Local Demonstration Activity
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Live operations log recorded during this demonstration session
              </p>
            </div>
            <span className="text-xs font-mono-tabular text-[var(--text-secondary)]">
              {db.activities.length} entries
            </span>
          </div>

          <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-subtle)] rounded-xl max-h-80 overflow-y-auto">
            {db.activities.slice(0, 8).map((act) => (
              <div key={act.id} className="p-3.5 space-y-1 bg-[var(--surface-primary)]">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">{act.title}</span>
                  <span className="text-[11px] font-mono-tabular text-[var(--text-secondary)] shrink-0">
                    {new Date(act.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{act.description}</p>
                {act.sqlEquivalent && (
                  <div className="text-[11px] font-mono-tabular text-[var(--brand-primary)] truncate pt-0.5">
                    {act.sqlEquivalent}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Applications Table (Part X.10.2) */}
      <section className="surface-card rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">
              Candidate Applications Overview (ER_V_CANDIDATE_APPLICATION)
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Showing {Math.min(8, filteredApps.length)} of {filteredApps.length} filtered
              application records
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('/resume-review')}
              className="btn-base btn-secondary text-xs"
            >
              <span>Review Resumes</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/applications')}
              className="btn-base btn-secondary text-xs"
            >
              <span>Full Applications Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {filteredApps.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text-secondary)]">
            No applications match the active dashboard filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)] font-semibold">
                  <th className="py-3 px-4 font-mono-tabular">APP_ID</th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Job Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 font-mono-tabular">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredApps.slice(0, 8).map((row) => (
                  <tr
                    key={row.APPLICATION_ID}
                    className="hover:bg-[var(--surface-secondary)]/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono-tabular font-semibold">
                      #{row.APPLICATION_ID}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {row.FULL_NAME}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{row.EMAIL}</div>
                    </td>
                    <td className="py-3 px-4 font-medium">{row.JOB_TITLE}</td>
                    <td className="py-3 px-4 text-[var(--text-secondary)]">{row.DEPT_NAME}</td>
                    <td className="py-3 px-4 font-mono-tabular text-[var(--text-secondary)]">
                      {row.APPLICATION_DATE}
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={row.APPLICATION_STATUS} />
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)] max-w-xs truncate">
                      {row.REMARKS ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
