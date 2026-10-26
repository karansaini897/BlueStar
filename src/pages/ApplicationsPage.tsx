import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  FilePlus,
  History,
  RefreshCw,
  Search,
  UserCheck,
} from 'lucide-react';
import { CsvExportButton, Modal, StatusIndicator } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import {
  ALLOWED_APPLICATION_STATUSES,
  ApplicationStatus,
  ErVCandidateApplication,
} from '../model/schema';
import { getTodayIsoDate } from '../model/operations';

export const ApplicationsPage: React.FC = () => {
  const {
    db,
    candidateApplicationView,
    applyForJob,
    updateApplicationStatus,
    hireCandidate,
    notify,
  } = useRecruitment();

  // Search, Filters, Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState<'APPLICATION_ID' | 'APPLICATION_DATE' | 'APPLICATION_STATUS'>('APPLICATION_ID');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Add Application Modal (ER_APPLY_FOR_JOB)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyCandidateId, setApplyCandidateId] = useState('');
  const [applyJobId, setApplyJobId] = useState('');
  const [applyRemarks, setApplyRemarks] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);

  // Status Change Modal (ER_UPDATE_STATUS + ER_APP_STATUS_AUDIT)
  const [statusTarget, setStatusTarget] = useState<ErVCandidateApplication | null>(null);
  const [newStatusVal, setNewStatusVal] = useState<ApplicationStatus>('SHORTLISTED');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);

  // Hire Candidate Modal (ER_HIRE_CANDIDATE)
  const [hireTarget, setHireTarget] = useState<ErVCandidateApplication | null>(null);
  const [hireDesignation, setHireDesignation] = useState('');
  const [hireSalary, setHireSalary] = useState('');
  const [hireJoiningDate, setHireJoiningDate] = useState(getTodayIsoDate());
  const [hireError, setHireError] = useState<string | null>(null);

  // Audit Log Viewer Modal
  const [auditFilterAppId, setAuditFilterAppId] = useState<number | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = candidateApplicationView.filter((row) => {
      if (q) {
        const matchId = String(row.APPLICATION_ID).includes(q);
        const matchCand = row.FULL_NAME.toLowerCase().includes(q);
        const matchJob = row.JOB_TITLE.toLowerCase().includes(q);
        if (!matchId && !matchCand && !matchJob) return false;
      }
      if (statusFilter !== 'ALL' && row.APPLICATION_STATUS !== statusFilter) return false;
      if (deptFilter !== 'ALL' && row.DEPT_ID !== Number(deptFilter)) return false;
      if (dateFilter && row.APPLICATION_DATE !== dateFilter) return false;
      return true;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'APPLICATION_DATE') {
        cmp = a.APPLICATION_DATE.localeCompare(b.APPLICATION_DATE);
      } else if (sortBy === 'APPLICATION_STATUS') {
        cmp = a.APPLICATION_STATUS.localeCompare(b.APPLICATION_STATUS);
      } else {
        cmp = a.APPLICATION_ID - b.APPLICATION_ID;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [candidateApplicationView, searchQuery, statusFilter, deptFilter, dateFilter, sortBy, sortDir]);

  // Open Apply Modal
  const openApplyModal = () => {
    const openJobs = db.jobs.filter((j) => j.JOB_STATUS === 'OPEN');
    setApplyCandidateId(String(db.candidates[0]?.CANDIDATE_ID ?? ''));
    setApplyJobId(String(openJobs[0]?.JOB_ID ?? db.jobs[0]?.JOB_ID ?? ''));
    setApplyRemarks('');
    setApplyError(null);
    setIsApplyModalOpen(true);
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError(null);
    const res = applyForJob({
      CANDIDATE_ID: Number(applyCandidateId),
      JOB_ID: Number(applyJobId),
      REMARKS: applyRemarks || null,
    });
    if (!res.ok) {
      setApplyError(res.error ?? 'Failed to submit application.');
      return;
    }
    setIsApplyModalOpen(false);
  };

  // Open Status Update Modal
  const openStatusModal = (row: ErVCandidateApplication) => {
    setStatusTarget(row);
    const nextSuggested =
      row.APPLICATION_STATUS === 'APPLIED'
        ? 'SHORTLISTED'
        : row.APPLICATION_STATUS === 'SHORTLISTED'
          ? 'INTERVIEW'
          : row.APPLICATION_STATUS === 'INTERVIEW'
            ? 'SELECTED'
            : 'SHORTLISTED';
    setNewStatusVal(nextSuggested);
    setStatusRemarks(row.REMARKS ?? '');
    setStatusError(null);
  };

  const handleStatusSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusTarget) return;
    setStatusError(null);

    const res = updateApplicationStatus(
      statusTarget.APPLICATION_ID,
      newStatusVal,
      statusRemarks
    );
    if (!res.ok) {
      setStatusError(res.error ?? 'Failed to update status.');
      return;
    }
    setStatusTarget(null);
  };

  // Open Hire Candidate Modal
  const openHireModal = (row: ErVCandidateApplication) => {
    setHireTarget(row);
    const job = db.jobs.find((j) => j.JOB_ID === row.JOB_ID);
    setHireDesignation(row.JOB_TITLE);
    setHireSalary(String(job?.MIN_SALARY ?? 500000));
    setHireJoiningDate(getTodayIsoDate());
    setHireError(null);
  };

  const handleHireSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hireTarget) return;
    setHireError(null);

    const res = hireCandidate({
      APPLICATION_ID: hireTarget.APPLICATION_ID,
      DESIGNATION: hireDesignation,
      ANNUAL_SALARY: Number(hireSalary),
      JOINING_DATE: hireJoiningDate,
    });

    if (!res.ok) {
      setHireError(res.error ?? 'Hiring transaction rejected.');
      return;
    }
    setHireTarget(null);
  };

  const displayedAudits = useMemo(() => {
    const list =
      auditFilterAppId !== null
        ? db.audits.filter((a) => a.APPLICATION_ID === auditFilterAppId)
        : db.audits;
    return [...list].sort((a, b) => b.AUDIT_ID - a.AUDIT_ID);
  }, [db.audits, auditFilterAppId]);

  const employeeByAppId = useMemo(() => {
    return new Set(db.employees.map((e) => e.APPLICATION_ID));
  }, [db.employees]);

  const employeeByCandidateId = useMemo(() => {
    return new Set(db.employees.map((e) => e.CANDIDATE_ID));
  }, [db.employees]);

  return (
    <div className="space-y-5">
      {/* Search & Action Header */}
      <div className="surface-card rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search applications by application ID, candidate name, or job title"
              placeholder="Search by Application ID, candidate name, or job title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field !pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setAuditFilterAppId(null);
                setIsAuditModalOpen(true);
              }}
              className="btn-base btn-secondary text-xs"
            >
              <History className="w-4 h-4" />
              <span>Audit Log ({db.audits.length})</span>
            </button>

            <CsvExportButton
              filename="er_applications_export.csv"
              headers={[
                'APPLICATION_ID',
                'CANDIDATE_ID',
                'FULL_NAME',
                'JOB_ID',
                'JOB_TITLE',
                'DEPT_NAME',
                'APPLICATION_DATE',
                'APPLICATION_STATUS',
                'REMARKS',
              ]}
              rows={filteredApplications.map((r) => [
                r.APPLICATION_ID,
                r.CANDIDATE_ID,
                r.FULL_NAME,
                r.JOB_ID,
                r.JOB_TITLE,
                r.DEPT_NAME,
                r.APPLICATION_DATE,
                r.APPLICATION_STATUS,
                r.REMARKS,
              ])}
              onExported={(c) =>
                notify('info', 'CSV Exported', `Exported ${c} application record(s).`)
              }
            />

            <button type="button" onClick={openApplyModal} className="btn-base btn-primary">
              <FilePlus className="w-4 h-4" />
              <span>Add Application</span>
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="app-status-filter" className="text-[var(--text-secondary)] font-medium">
                Status:
              </label>
              <select
                id="app-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
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
              <label htmlFor="app-dept-filter" className="text-[var(--text-secondary)] font-medium">
                Department:
              </label>
              <select
                id="app-dept-filter"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="ALL">All Departments</option>
                {db.departments.map((d) => (
                  <option key={d.DEPT_ID} value={String(d.DEPT_ID)}>
                    {d.DEPT_NAME}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="app-date-filter" className="text-[var(--text-secondary)] font-medium">
                Date:
              </label>
              <input
                id="app-date-filter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="input-field !w-auto !py-1 !px-2.5 text-xs font-mono-tabular"
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="app-sort" className="text-[var(--text-secondary)] font-medium">
                Sort by:
              </label>
              <select
                id="app-sort"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as 'APPLICATION_ID' | 'APPLICATION_DATE' | 'APPLICATION_STATUS'
                  )
                }
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="APPLICATION_ID">Application ID</option>
                <option value="APPLICATION_DATE">Application Date</option>
                <option value="APPLICATION_STATUS">Application Status</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="btn-base btn-secondary !py-1 !px-2 text-xs"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{sortDir.toUpperCase()}</span>
              </button>
            </div>

            {(searchQuery !== '' ||
              statusFilter !== 'ALL' ||
              deptFilter !== 'ALL' ||
              dateFilter !== '') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setDeptFilter('ALL');
                  setDateFilter('');
                }}
                className="btn-base btn-tertiary !py-1 !px-2 text-xs"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="font-mono-tabular text-[var(--text-secondary)]">
            Showing <strong className="text-[var(--text-primary)]">{filteredApplications.length}</strong> of{' '}
            {candidateApplicationView.length} applications
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="surface-card rounded-xl overflow-hidden">
        {filteredApplications.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              No applications match the active filters.
            </p>
            <button type="button" onClick={openApplyModal} className="btn-base btn-primary text-xs">
              <FilePlus className="w-4 h-4" />
              <span>Add Application</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)] font-semibold">
                  <th className="py-3 px-3 font-mono-tabular">APP_ID</th>
                  <th className="py-3 px-3">CANDIDATE</th>
                  <th className="py-3 px-3">JOB &amp; DEPARTMENT</th>
                  <th className="py-3 px-3 font-mono-tabular">APPLIED DATE</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-3">REMARKS</th>
                  <th className="py-3 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredApplications.map((row) => {
                  const isAlreadyHired =
                    row.APPLICATION_STATUS === 'HIRED' ||
                    employeeByAppId.has(row.APPLICATION_ID) ||
                    employeeByCandidateId.has(row.CANDIDATE_ID);

                  return (
                    <tr
                      key={row.APPLICATION_ID}
                      className="hover:bg-[var(--surface-secondary)]/40 transition-colors"
                    >
                      <td className="py-3 px-3 font-mono-tabular font-semibold text-[var(--brand-primary)] whitespace-nowrap">
                        #{row.APPLICATION_ID}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {row.FULL_NAME}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
                          #{row.CANDIDATE_ID} · {row.EMAIL}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-[var(--text-primary)]">
                          {row.JOB_TITLE}{' '}
                          <span className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
                            (#{row.JOB_ID})
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          {row.DEPT_NAME}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono-tabular text-[var(--text-secondary)] whitespace-nowrap">
                        {row.APPLICATION_DATE}
                      </td>
                      <td className="py-3 px-3">
                        <StatusIndicator status={row.APPLICATION_STATUS} />
                      </td>
                      <td className="py-3 px-3 text-[var(--text-secondary)] max-w-[170px] truncate">
                        {row.REMARKS ?? '—'}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openStatusModal(row)}
                            aria-label={`Change status for Application #${row.APPLICATION_ID}`}
                            className="btn-base btn-secondary !py-1 !px-2 text-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Status</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openHireModal(row)}
                            disabled={isAlreadyHired}
                            aria-label={`Hire candidate for Application #${row.APPLICATION_ID}`}
                            title={
                              isAlreadyHired
                                ? 'Application is already HIRED or candidate already has an employee record'
                                : 'Execute ER_HIRE_CANDIDATE workflow'
                            }
                            className="btn-base btn-primary !py-1 !px-2.5 text-xs"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>{row.APPLICATION_STATUS === 'HIRED' ? 'Hired' : 'Hire'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAuditFilterAppId(row.APPLICATION_ID);
                              setIsAuditModalOpen(true);
                            }}
                            aria-label={`View audit log for Application #${row.APPLICATION_ID}`}
                            title="View status audit history"
                            className="btn-base btn-tertiary !p-1.5"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Application Modal (ER_APPLY_FOR_JOB) */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        title="Add Application (ER_APPLY_FOR_JOB)"
        subtitle="Creates a record in ER_APPLICATION with status 'APPLIED'. Enforces unique (CANDIDATE_ID, JOB_ID) via ER_APP_UNQ."
      >
        <form onSubmit={handleApplySubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="apply-candidate-select"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Select Candidate (CANDIDATE_ID) *
            </label>
            <select
              id="apply-candidate-select"
              value={applyCandidateId}
              onChange={(e) => setApplyCandidateId(e.target.value)}
              className="input-field"
              required
            >
              {db.candidates.map((c) => (
                <option key={c.CANDIDATE_ID} value={String(c.CANDIDATE_ID)}>
                  #{c.CANDIDATE_ID} · {c.FULL_NAME} ({c.EMAIL})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="apply-job-select"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Select Job Position (JOB_ID) *
            </label>
            <select
              id="apply-job-select"
              value={applyJobId}
              onChange={(e) => setApplyJobId(e.target.value)}
              className="input-field"
              required
            >
              {db.jobs.map((j) => (
                <option key={j.JOB_ID} value={String(j.JOB_ID)}>
                  #{j.JOB_ID} · {j.JOB_TITLE} ({j.JOB_STATUS} · {j.VACANCIES} vacancies)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="apply-remarks"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Remarks (Optional, max 500 chars)
            </label>
            <textarea
              id="apply-remarks"
              rows={2}
              value={applyRemarks}
              onChange={(e) => setApplyRemarks(e.target.value)}
              placeholder="Application received..."
              className="input-field"
            />
          </div>

          {applyError && (
            <div
              role="alert"
              className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
            >
              {applyError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(false)}
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

      {/* Update Application Status Modal (ER_UPDATE_STATUS) */}
      <Modal
        isOpen={statusTarget !== null}
        onClose={() => setStatusTarget(null)}
        title={
          statusTarget
            ? `Update Status · Application #${statusTarget.APPLICATION_ID}`
            : 'Update Application Status'
        }
        subtitle="Simulates ER_UPDATE_STATUS and records a local audit row in ER_APPLICATION_AUDIT when the status changes."
      >
        {statusTarget && (
          <form onSubmit={handleStatusSubmit} className="space-y-4" noValidate>
            <div className="surface-inset rounded-xl p-3.5 text-xs space-y-1">
              <div className="font-semibold text-[var(--text-primary)]">
                Candidate: {statusTarget.FULL_NAME} (#{statusTarget.CANDIDATE_ID})
              </div>
              <div className="text-[var(--text-secondary)]">
                Job: {statusTarget.JOB_TITLE} · Department: {statusTarget.DEPT_NAME}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[var(--text-secondary)]">Current Status:</span>
                <StatusIndicator status={statusTarget.APPLICATION_STATUS} />
              </div>
            </div>

            <div>
              <label
                htmlFor="status-new-select"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                New Status (ER_APP_STATUS_CK) *
              </label>
              <select
                id="status-new-select"
                value={newStatusVal}
                onChange={(e) => setNewStatusVal(e.target.value as ApplicationStatus)}
                className="input-field"
              >
                {ALLOWED_APPLICATION_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status-remarks-input"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Updated Remarks
              </label>
              <input
                id="status-remarks-input"
                type="text"
                value={statusRemarks}
                onChange={(e) => setStatusRemarks(e.target.value)}
                className="input-field"
              />
            </div>

            {statusError && (
              <div
                role="alert"
                className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
              >
                {statusError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setStatusTarget(null)}
                className="btn-base btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-base btn-primary">
                Save Status & Log Audit
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Atomic Hiring Workflow Modal (ER_HIRE_CANDIDATE) */}
      <Modal
        isOpen={hireTarget !== null}
        onClose={() => setHireTarget(null)}
        title="Hire Candidate (ER_HIRE_CANDIDATE)"
        subtitle="Atomic local transaction: updates ER_APPLICATION status to HIRED, logs an ER_APPLICATION_AUDIT entry, and creates an ACTIVE record in ER_EMPLOYEE."
      >
        {hireTarget && (
          <form onSubmit={handleHireSubmit} className="space-y-4" noValidate>
            <div className="surface-inset rounded-xl p-4 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Candidate:</span>
                <strong className="text-[var(--text-primary)]">
                  {hireTarget.FULL_NAME} (#{hireTarget.CANDIDATE_ID})
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Application Reference:</span>
                <strong className="font-mono-tabular text-[var(--text-primary)]">
                  #{hireTarget.APPLICATION_ID} ({hireTarget.APPLICATION_STATUS})
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Job & Department:</span>
                <strong className="text-[var(--text-primary)]">
                  {hireTarget.JOB_TITLE} · {hireTarget.DEPT_NAME}
                </strong>
              </div>
            </div>

            <div>
              <label
                htmlFor="hire-designation"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Employee Designation (P_DESIGNATION) *
              </label>
              <input
                id="hire-designation"
                type="text"
                value={hireDesignation}
                onChange={(e) => setHireDesignation(e.target.value)}
                placeholder="e.g. Financial Analyst"
                className="input-field"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="hire-salary"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Annual Salary in INR (P_ANNUAL_SALARY) *
                </label>
                <input
                  id="hire-salary"
                  type="number"
                  min="1"
                  step="10000"
                  value={hireSalary}
                  onChange={(e) => setHireSalary(e.target.value)}
                  className="input-field font-mono-tabular"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="hire-joining-date"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Joining Date (JOINING_DATE) *
                </label>
                <input
                  id="hire-joining-date"
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
                className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
              >
                {hireError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setHireTarget(null)}
                className="btn-base btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-base btn-primary">
                Confirm Hiring
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ER_APPLICATION_AUDIT Viewer Modal */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title={
          auditFilterAppId !== null
            ? `Status Audit Log · Application #${auditFilterAppId}`
            : 'Application Status Audit Log (ER_APPLICATION_AUDIT)'
        }
        subtitle="Local simulation of the Oracle trigger ER_APP_STATUS_AUDIT (AFTER UPDATE OF APPLICATION_STATUS ON ER_APPLICATION)."
        maxWidthClass="max-w-2xl"
      >
        <div className="space-y-4 text-xs">
          {auditFilterAppId !== null && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setAuditFilterAppId(null)}
                className="btn-base btn-secondary text-xs !py-1"
              >
                Show All Audit Entries ({db.audits.length})
              </button>
            </div>
          )}

          {displayedAudits.length === 0 ? (
            <div className="surface-inset rounded-xl p-6 text-center text-[var(--text-secondary)]">
              No status transition audit entries recorded for this selection.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[var(--border-subtle)] rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)] font-semibold">
                    <th className="py-2.5 px-3 font-mono-tabular">AUDIT_ID</th>
                    <th className="py-2.5 px-3 font-mono-tabular">APP_ID</th>
                    <th className="py-2.5 px-3">OLD_STATUS</th>
                    <th className="py-2.5 px-3">NEW_STATUS</th>
                    <th className="py-2.5 px-3 font-mono-tabular">CHANGE_DATE</th>
                    <th className="py-2.5 px-3 font-mono-tabular">CHANGED_BY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {displayedAudits.map((aud) => (
                    <tr key={aud.AUDIT_ID}>
                      <td className="py-2.5 px-3 font-mono-tabular font-semibold">
                        #{aud.AUDIT_ID}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular">#{aud.APPLICATION_ID}</td>
                      <td className="py-2.5 px-3">
                        <StatusIndicator status={aud.OLD_STATUS} />
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusIndicator status={aud.NEW_STATUS} />
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-[var(--text-secondary)]">
                        {new Date(aud.CHANGE_DATE).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono-tabular text-[var(--text-secondary)]">
                        {aud.CHANGED_BY}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
