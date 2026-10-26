import React, { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Filter,
  Terminal,
} from 'lucide-react';
import { CsvExportButton, StatusIndicator, formatInrSalary } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import {
  ALLOWED_APPLICATION_STATUSES,
  ALLOWED_EMPLOYMENT_STATUSES,
  ALLOWED_INTERVIEW_STATUSES,
} from '../model/schema';

export const ReportsPage: React.FC = () => {
  const {
    db,
    candidateApplicationView,
    interviewDetailsView,
    enrichedEmployees,
    departmentSummaries,
    notify,
  } = useRecruitment();

  // Interactive Filters (Part XIX.19.1)
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [appStatusFilter, setAppStatusFilter] = useState('ALL');
  const [intStatusFilter, setIntStatusFilter] = useState('ALL');
  const [empStatusFilter, setEmpStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Filtered Views
  const filteredApps = useMemo(() => {
    return candidateApplicationView.filter((a) => {
      if (deptFilter !== 'ALL' && a.DEPT_ID !== Number(deptFilter)) return false;
      if (appStatusFilter !== 'ALL' && a.APPLICATION_STATUS !== appStatusFilter) return false;
      if (dateFrom && a.APPLICATION_DATE < dateFrom) return false;
      if (dateTo && a.APPLICATION_DATE > dateTo) return false;
      return true;
    });
  }, [candidateApplicationView, deptFilter, appStatusFilter, dateFrom, dateTo]);

  const filteredInterviews = useMemo(() => {
    return interviewDetailsView.filter((i) => {
      if (deptFilter !== 'ALL') {
        const deptObj = db.departments.find((d) => d.DEPT_ID === Number(deptFilter));
        if (deptObj && i.DEPT_NAME !== deptObj.DEPT_NAME) return false;
      }
      if (intStatusFilter !== 'ALL' && i.INTERVIEW_STATUS !== intStatusFilter) return false;
      if (dateFrom && i.INTERVIEW_DATE < dateFrom) return false;
      if (dateTo && i.INTERVIEW_DATE > dateTo) return false;
      return true;
    });
  }, [interviewDetailsView, db.departments, deptFilter, intStatusFilter, dateFrom, dateTo]);

  const filteredEmployees = useMemo(() => {
    return enrichedEmployees.filter((e) => {
      if (deptFilter !== 'ALL' && e.DEPT_ID !== Number(deptFilter)) return false;
      if (empStatusFilter !== 'ALL' && e.EMPLOYMENT_STATUS !== empStatusFilter) return false;
      if (dateFrom && e.JOINING_DATE < dateFrom) return false;
      if (dateTo && e.JOINING_DATE > dateTo) return false;
      return true;
    });
  }, [enrichedEmployees, deptFilter, empStatusFilter, dateFrom, dateTo]);

  // 1. Applications by Status Summary
  const appsByStatusReport = useMemo(() => {
    return ALLOWED_APPLICATION_STATUSES.map((status) => {
      const total = filteredApps.filter((a) => a.APPLICATION_STATUS === status).length;
      return {
        APPLICATION_STATUS: status,
        TOTAL: total,
        SHARE_PCT: `${Math.round((total / Math.max(1, filteredApps.length)) * 100)}%`,
      };
    });
  }, [filteredApps]);

  // 4. Interview Status Distribution
  const interviewsByStatusReport = useMemo(() => {
    return ALLOWED_INTERVIEW_STATUSES.map((status) => {
      const matching = filteredInterviews.filter((i) => i.INTERVIEW_STATUS === status);
      const scored = matching.filter((i) => i.SCORE !== null);
      const avgScore =
        scored.length > 0
          ? Math.round(
              (scored.reduce((s, i) => s + (i.SCORE ?? 0), 0) / scored.length) * 10
            ) / 10
          : null;
      return {
        INTERVIEW_STATUS: status,
        TOTAL: matching.length,
        AVG_SCORE: avgScore !== null ? `${avgScore} / 100` : '—',
      };
    });
  }, [filteredInterviews]);

  // 5. Employee Counts by Employment Status
  const employeesByStatusReport = useMemo(() => {
    return ALLOWED_EMPLOYMENT_STATUSES.map((status) => {
      const matching = filteredEmployees.filter((e) => e.EMPLOYMENT_STATUS === status);
      const totalPayroll = matching.reduce((s, e) => s + e.ANNUAL_SALARY, 0);
      return {
        EMPLOYMENT_STATUS: status,
        EMPLOYEE_COUNT: matching.length,
        TOTAL_ANNUAL_PAYROLL: totalPayroll,
      };
    });
  }, [filteredEmployees]);

  // ER_APPLICATION_REPORT Cursor Output Simulation (Pages 27-33)
  const cursorReportLines = useMemo(() => {
    return filteredApps.map(
      (a) =>
        `Application: ${a.APPLICATION_ID} | Candidate: ${a.FULL_NAME} | Job: ${a.JOB_TITLE} | Department: ${a.DEPT_NAME} | Status: ${a.APPLICATION_STATUS} | Date: ${a.APPLICATION_DATE}`
    );
  }, [filteredApps]);

  const hasActiveFilters =
    deptFilter !== 'ALL' ||
    appStatusFilter !== 'ALL' ||
    intStatusFilter !== 'ALL' ||
    empStatusFilter !== 'ALL' ||
    dateFrom !== '' ||
    dateTo !== '';

  return (
    <div className="space-y-6">
      {/* Global Report Filters Bar (Part XIX.19.1) */}
      <section className="surface-card rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
            <Filter className="w-4 h-4 text-[var(--brand-primary)]" />
            <span>Analytical Report Filters (Applies to Tables & CSV Exports)</span>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setDeptFilter('ALL');
                  setAppStatusFilter('ALL');
                  setIntStatusFilter('ALL');
                  setEmpStatusFilter('ALL');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="btn-base btn-tertiary text-xs !py-1.5"
              >
                Reset All Filters
              </button>
            )}

            <CsvExportButton
              filename="er_application_report_full.csv"
              label="Export Filtered Pipeline CSV"
              headers={[
                'APPLICATION_ID',
                'CANDIDATE_ID',
                'FULL_NAME',
                'EMAIL',
                'JOB_ID',
                'JOB_TITLE',
                'DEPT_NAME',
                'APPLICATION_STATUS',
                'APPLICATION_DATE',
                'REMARKS',
              ]}
              rows={filteredApps.map((a) => [
                a.APPLICATION_ID,
                a.CANDIDATE_ID,
                a.FULL_NAME,
                a.EMAIL,
                a.JOB_ID,
                a.JOB_TITLE,
                a.DEPT_NAME,
                a.APPLICATION_STATUS,
                a.APPLICATION_DATE,
                a.REMARKS,
              ])}
              onExported={(c) =>
                notify('info', 'Report Exported', `Downloaded ${c} filtered application row(s).`)
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label
              htmlFor="rep-dept"
              className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1"
            >
              Department
            </label>
            <select
              id="rep-dept"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="input-field !py-1.5 text-xs"
            >
              <option value="ALL">All Departments</option>
              {db.departments.map((d) => (
                <option key={d.DEPT_ID} value={String(d.DEPT_ID)}>
                  {d.DEPT_NAME}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="rep-app-status"
              className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1"
            >
              Application Status
            </label>
            <select
              id="rep-app-status"
              value={appStatusFilter}
              onChange={(e) => setAppStatusFilter(e.target.value)}
              className="input-field !py-1.5 text-xs"
            >
              <option value="ALL">All App Statuses</option>
              {ALLOWED_APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="rep-int-status"
              className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1"
            >
              Interview Status
            </label>
            <select
              id="rep-int-status"
              value={intStatusFilter}
              onChange={(e) => setIntStatusFilter(e.target.value)}
              className="input-field !py-1.5 text-xs"
            >
              <option value="ALL">All Interview Statuses</option>
              {ALLOWED_INTERVIEW_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="rep-emp-status"
              className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1"
            >
              Employment Status
            </label>
            <select
              id="rep-emp-status"
              value={empStatusFilter}
              onChange={(e) => setEmpStatusFilter(e.target.value)}
              className="input-field !py-1.5 text-xs"
            >
              <option value="ALL">All Emp Statuses</option>
              {ALLOWED_EMPLOYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="rep-date-from"
              className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1"
            >
              From Date
            </label>
            <input
              id="rep-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input-field !py-1.5 text-xs font-mono-tabular"
            />
          </div>

          <div>
            <label
              htmlFor="rep-date-to"
              className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1"
            >
              To Date
            </label>
            <input
              id="rep-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input-field !py-1.5 text-xs font-mono-tabular"
            />
          </div>
        </div>
      </section>

      {/* Grid of Reports 1, 4, 5 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report 1: Applications by Status */}
        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-display font-semibold text-[var(--text-primary)]">
                1. Applications by Status
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono-tabular">
                GROUP BY APPLICATION_STATUS
              </p>
            </div>
            <CsvExportButton
              filename="report_applications_by_status.csv"
              label="CSV"
              headers={['APPLICATION_STATUS', 'TOTAL', 'SHARE_PCT']}
              rows={appsByStatusReport.map((r) => [
                r.APPLICATION_STATUS,
                r.TOTAL,
                r.SHARE_PCT,
              ])}
            />
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                <th className="py-2">APPLICATION_STATUS</th>
                <th className="py-2 text-right font-mono-tabular">TOTAL</th>
                <th className="py-2 text-right font-mono-tabular">SHARE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {appsByStatusReport.map((r) => (
                <tr key={r.APPLICATION_STATUS}>
                  <td className="py-2">
                    <StatusIndicator status={r.APPLICATION_STATUS} />
                  </td>
                  <td className="py-2 text-right font-mono-tabular font-semibold">{r.TOTAL}</td>
                  <td className="py-2 text-right font-mono-tabular text-[var(--text-secondary)]">
                    {r.SHARE_PCT}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Report 4: Interview Status Distribution */}
        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-display font-semibold text-[var(--text-primary)]">
                2. Interview Status & Scores
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono-tabular">
                ER_INTERVIEW Summary
              </p>
            </div>
            <CsvExportButton
              filename="report_interviews_by_status.csv"
              label="CSV"
              headers={['INTERVIEW_STATUS', 'TOTAL', 'AVG_SCORE']}
              rows={interviewsByStatusReport.map((r) => [
                r.INTERVIEW_STATUS,
                r.TOTAL,
                r.AVG_SCORE,
              ])}
            />
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                <th className="py-2">INTERVIEW_STATUS</th>
                <th className="py-2 text-right font-mono-tabular">TOTAL</th>
                <th className="py-2 text-right font-mono-tabular">AVG SCORE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {interviewsByStatusReport.map((r) => (
                <tr key={r.INTERVIEW_STATUS}>
                  <td className="py-2">
                    <StatusIndicator status={r.INTERVIEW_STATUS} />
                  </td>
                  <td className="py-2 text-right font-mono-tabular font-semibold">{r.TOTAL}</td>
                  <td className="py-2 text-right font-mono-tabular text-[var(--text-secondary)]">
                    {r.AVG_SCORE}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Report 5: Employee Counts & Payroll by Employment Status */}
        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-display font-semibold text-[var(--text-primary)]">
                3. Employees & Hiring Outcomes
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono-tabular">
                ER_EMPLOYEE by EMPLOYMENT_STATUS
              </p>
            </div>
            <CsvExportButton
              filename="report_employees_by_status.csv"
              label="CSV"
              headers={['EMPLOYMENT_STATUS', 'EMPLOYEE_COUNT', 'TOTAL_ANNUAL_PAYROLL']}
              rows={employeesByStatusReport.map((r) => [
                r.EMPLOYMENT_STATUS,
                r.EMPLOYEE_COUNT,
                r.TOTAL_ANNUAL_PAYROLL,
              ])}
            />
          </div>

          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                <th className="py-2">STATUS</th>
                <th className="py-2 text-right font-mono-tabular">COUNT</th>
                <th className="py-2 text-right font-mono-tabular">ANNUAL PAYROLL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {employeesByStatusReport.map((r) => (
                <tr key={r.EMPLOYMENT_STATUS}>
                  <td className="py-2">
                    <StatusIndicator status={r.EMPLOYMENT_STATUS} />
                  </td>
                  <td className="py-2 text-right font-mono-tabular font-semibold">
                    {r.EMPLOYEE_COUNT}
                  </td>
                  <td className="py-2 text-right font-mono-tabular text-[var(--text-secondary)]">
                    {formatInrSalary(r.TOTAL_ANNUAL_PAYROLL)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Report 2, 3, 6 Combined: Department-Wise Jobs, Open Vacancies, Candidates & Employees */}
      <section className="surface-card rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-display font-semibold text-[var(--text-primary)]">
              4. Department-Wise Jobs, Vacancies, Candidate Pipeline & Employee Distribution
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Matches SQL query on Pages 38–39: LEFT JOIN ER_JOB ON D.DEPT_ID = J.DEPT_ID AND
              J.JOB_STATUS = &apos;OPEN&apos;
            </p>
          </div>
          <CsvExportButton
            filename="report_department_distribution.csv"
            headers={[
              'DEPT_ID',
              'DEPT_NAME',
              'OPEN_JOBS',
              'OPEN_VACANCIES',
              'ASSOCIATED_APPLICATIONS',
              'ONBOARDED_EMPLOYEES',
            ]}
            rows={departmentSummaries.map((d) => [
              d.DEPT_ID,
              d.DEPT_NAME,
              d.OPEN_JOBS,
              d.OPEN_VACANCIES,
              d.APPLICATIONS_COUNT,
              d.EMPLOYEES_COUNT,
            ])}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)] font-semibold">
                <th className="py-3 px-4 font-mono-tabular">DEPT_ID</th>
                <th className="py-3 px-4">DEPT_NAME</th>
                <th className="py-3 px-4 font-mono-tabular text-right">TOTAL_JOBS (OPEN)</th>
                <th className="py-3 px-4 font-mono-tabular text-right">TOTAL_VACANCIES (OPEN)</th>
                <th className="py-3 px-4 font-mono-tabular text-right">CANDIDATE APPLICATIONS</th>
                <th className="py-3 px-4 font-mono-tabular text-right">LINKED EMPLOYEES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {departmentSummaries.map((d) => (
                <tr key={d.DEPT_ID}>
                  <td className="py-3 px-4 font-mono-tabular font-semibold">#{d.DEPT_ID}</td>
                  <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                    {d.DEPT_NAME}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-right">{d.OPEN_JOBS}</td>
                  <td className="py-3 px-4 font-mono-tabular text-right font-bold text-[var(--success)]">
                    {d.OPEN_VACANCIES}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-right">{d.APPLICATIONS_COUNT}</td>
                  <td className="py-3 px-4 font-mono-tabular text-right font-semibold">
                    {d.EMPLOYEES_COUNT}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Report 7 & 8: ER_APPLICATION_AUDIT & ER_APPLICATION_REPORT Cursor Output */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ER_APPLICATION_AUDIT Table */}
        <div className="lg:col-span-6 surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-display font-semibold text-[var(--text-primary)]">
                5. Application Status Audit Trail (ER_APPLICATION_AUDIT)
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Local simulation of trigger ER_APP_STATUS_AUDIT
              </p>
            </div>
            <CsvExportButton
              filename="er_application_audit_export.csv"
              label="Export Audit CSV"
              headers={[
                'AUDIT_ID',
                'APPLICATION_ID',
                'OLD_STATUS',
                'NEW_STATUS',
                'CHANGE_DATE',
                'CHANGED_BY',
              ]}
              rows={db.audits.map((a) => [
                a.AUDIT_ID,
                a.APPLICATION_ID,
                a.OLD_STATUS,
                a.NEW_STATUS,
                a.CHANGE_DATE,
                a.CHANGED_BY,
              ])}
            />
          </div>

          <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-xl max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)]">
                  <th className="py-2.5 px-3 font-mono-tabular">AUDIT_ID</th>
                  <th className="py-2.5 px-3 font-mono-tabular">APP_ID</th>
                  <th className="py-2.5 px-3">TRANSITION</th>
                  <th className="py-2.5 px-3 font-mono-tabular">CHANGED_BY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {[...db.audits]
                  .sort((a, b) => b.AUDIT_ID - a.AUDIT_ID)
                  .map((aud) => (
                    <tr key={aud.AUDIT_ID}>
                      <td className="py-2.5 px-3 font-mono-tabular font-semibold">
                        #{aud.AUDIT_ID}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular">#{aud.APPLICATION_ID}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <StatusIndicator status={aud.OLD_STATUS} />
                          <span>→</span>
                          <StatusIndicator status={aud.NEW_STATUS} />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-[var(--text-secondary)]">
                        {aud.CHANGED_BY}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ER_APPLICATION_REPORT Procedure Cursor Simulation */}
        <div className="lg:col-span-6 surface-card rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[var(--brand-primary)]" />
              <div>
                <h2 className="text-sm font-display font-semibold text-[var(--text-primary)]">
                  6. EXEC ER_APPLICATION_REPORT Output Preview
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Formatted DBMS_OUTPUT cursor simulation from Pages 27–33
                </p>
              </div>
            </div>
            <FileSpreadsheet className="w-4 h-4 text-[var(--text-secondary)]" />
          </div>

          <div className="surface-inset rounded-xl p-4 font-mono-tabular text-[11px] space-y-1.5 max-h-72 overflow-y-auto text-[var(--text-primary)]">
            {cursorReportLines.length === 0 ? (
              <div className="text-[var(--text-secondary)]">No matching rows in cursor.</div>
            ) : (
              cursorReportLines.map((line, idx) => (
                <div key={idx} className="leading-relaxed border-b border-[var(--border-subtle)]/50 pb-1">
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
