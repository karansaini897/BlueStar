import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Edit3,
  Eye,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { CsvExportButton, Modal, StatusIndicator, formatInrSalary } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import { ALLOWED_JOB_STATUSES, ErJob, JobStatus } from '../model/schema';

export const JobsPage: React.FC = () => {
  const { db, createJob, updateJob, deleteJob, notify } = useRecruitment();

  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'JOB_ID' | 'JOB_TITLE' | 'VACANCIES'>('JOB_ID');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<ErJob | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMinSalary, setFormMinSalary] = useState('');
  const [formMaxSalary, setFormMaxSalary] = useState('');
  const [formVacancies, setFormVacancies] = useState('1');
  const [formStatus, setFormStatus] = useState<JobStatus>('OPEN');
  const [formError, setFormError] = useState<string | null>(null);

  // Job Details Modal
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  // Delete Confirmation Modal
  const [deletingJob, setDeletingJob] = useState<ErJob | null>(null);

  const deptMap = useMemo(
    () => new Map(db.departments.map((d) => [d.DEPT_ID, d.DEPT_NAME])),
    [db.departments]
  );

  const appCountsByJob = useMemo(() => {
    const map = new Map<number, number>();
    for (const app of db.applications) {
      map.set(app.JOB_ID, (map.get(app.JOB_ID) ?? 0) + 1);
    }
    return map;
  }, [db.applications]);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = db.jobs.filter((j) => {
      if (q) {
        const deptName = (deptMap.get(j.DEPT_ID) ?? '').toLowerCase();
        if (
          !j.JOB_TITLE.toLowerCase().includes(q) &&
          !deptName.includes(q) &&
          !String(j.JOB_ID).includes(q)
        ) {
          return false;
        }
      }
      if (deptFilter !== 'ALL' && j.DEPT_ID !== Number(deptFilter)) return false;
      if (statusFilter !== 'ALL' && j.JOB_STATUS !== statusFilter) return false;
      return true;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'JOB_TITLE') {
        cmp = a.JOB_TITLE.localeCompare(b.JOB_TITLE);
      } else if (sortBy === 'VACANCIES') {
        cmp = a.VACANCIES - b.VACANCIES;
      } else {
        cmp = a.JOB_ID - b.JOB_ID;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [db.jobs, deptMap, searchQuery, deptFilter, statusFilter, sortBy, sortDir]);

  const openCreateModal = () => {
    setEditingJob(null);
    setFormTitle('');
    setFormDeptId(String(db.departments[0]?.DEPT_ID ?? 1));
    setFormDescription('');
    setFormMinSalary('350000');
    setFormMaxSalary('700000');
    setFormVacancies('2');
    setFormStatus('OPEN');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (job: ErJob) => {
    setEditingJob(job);
    setFormTitle(job.JOB_TITLE);
    setFormDeptId(String(job.DEPT_ID));
    setFormDescription(job.JOB_DESCRIPTION ?? '');
    setFormMinSalary(job.MIN_SALARY !== null ? String(job.MIN_SALARY) : '');
    setFormMaxSalary(job.MAX_SALARY !== null ? String(job.MAX_SALARY) : '');
    setFormVacancies(String(job.VACANCIES));
    setFormStatus(job.JOB_STATUS);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveJob = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      JOB_TITLE: formTitle,
      DEPT_ID: Number(formDeptId),
      JOB_DESCRIPTION: formDescription || null,
      MIN_SALARY: formMinSalary !== '' ? Number(formMinSalary) : null,
      MAX_SALARY: formMaxSalary !== '' ? Number(formMaxSalary) : null,
      VACANCIES: Number(formVacancies),
      JOB_STATUS: formStatus,
    };

    const res = editingJob ? updateJob(editingJob.JOB_ID, payload) : createJob(payload);
    if (!res.ok) {
      setFormError(res.error ?? 'Failed to save job.');
      return;
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingJob) return;
    const res = deleteJob(deletingJob.JOB_ID);
    if (res.ok) {
      setDeletingJob(null);
    }
  };

  const selectedJob = useMemo(
    () => db.jobs.find((j) => j.JOB_ID === selectedJobId) ?? null,
    [db.jobs, selectedJobId]
  );

  return (
    <div className="space-y-5">
      {/* Search & Controls */}
      <div className="surface-card rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search jobs by title, department, or job ID"
              placeholder="Search by job title, department, or ID (e.g. 102, Software Developer)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field !pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CsvExportButton
              filename="er_jobs_export.csv"
              headers={[
                'JOB_ID',
                'JOB_TITLE',
                'DEPT_ID',
                'DEPT_NAME',
                'JOB_DESCRIPTION',
                'MIN_SALARY',
                'MAX_SALARY',
                'VACANCIES',
                'JOB_STATUS',
                'POSTED_DATE',
              ]}
              rows={filteredJobs.map((j) => [
                j.JOB_ID,
                j.JOB_TITLE,
                j.DEPT_ID,
                deptMap.get(j.DEPT_ID) ?? '',
                j.JOB_DESCRIPTION,
                j.MIN_SALARY,
                j.MAX_SALARY,
                j.VACANCIES,
                j.JOB_STATUS,
                j.POSTED_DATE,
              ])}
              onExported={(c) => notify('info', 'CSV Exported', `Exported ${c} job record(s).`)}
            />

            <button type="button" onClick={openCreateModal} className="btn-base btn-primary">
              <Plus className="w-4 h-4" />
              <span>Create Job</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="job-dept-filter" className="text-[var(--text-secondary)] font-medium">
                Department:
              </label>
              <select
                id="job-dept-filter"
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
              <label htmlFor="job-status-filter" className="text-[var(--text-secondary)] font-medium">
                Status:
              </label>
              <select
                id="job-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="ALL">All Statuses</option>
                {ALLOWED_JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="job-sort" className="text-[var(--text-secondary)] font-medium">
                Sort by:
              </label>
              <select
                id="job-sort"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'JOB_ID' | 'JOB_TITLE' | 'VACANCIES')
                }
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="JOB_ID">Job ID</option>
                <option value="JOB_TITLE">Job Title</option>
                <option value="VACANCIES">Vacancies</option>
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

            {(searchQuery !== '' || deptFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDeptFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="btn-base btn-tertiary !py-1 !px-2 text-xs"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="font-mono-tabular text-[var(--text-secondary)]">
            Showing <strong className="text-[var(--text-primary)]">{filteredJobs.length}</strong> of{' '}
            {db.jobs.length} jobs (ER_JOB)
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="surface-card rounded-xl overflow-hidden">
        {filteredJobs.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              No job positions match the selected filters.
            </p>
            <button type="button" onClick={openCreateModal} className="btn-base btn-primary text-xs">
              <Plus className="w-4 h-4" />
              <span>Create Job</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)] font-semibold">
                  <th className="py-3.5 px-4 font-mono-tabular">JOB_ID</th>
                  <th className="py-3.5 px-4">JOB_TITLE</th>
                  <th className="py-3.5 px-4">DEPARTMENT</th>
                  <th className="py-3.5 px-4 font-mono-tabular">SALARY RANGE (INR)</th>
                  <th className="py-3.5 px-4 font-mono-tabular text-center">VACANCIES</th>
                  <th className="py-3.5 px-4">JOB_STATUS</th>
                  <th className="py-3.5 px-4 font-mono-tabular">POSTED_DATE</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredJobs.map((job) => (
                  <tr
                    key={job.JOB_ID}
                    className="hover:bg-[var(--surface-secondary)]/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-[var(--brand-primary)]">
                      #{job.JOB_ID}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {job.JOB_TITLE}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] max-w-xs truncate">
                        {job.JOB_DESCRIPTION ?? '—'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {deptMap.get(job.DEPT_ID) ?? `Dept #${job.DEPT_ID}`}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-[var(--text-secondary)]">
                      {formatInrSalary(job.MIN_SALARY)} – {formatInrSalary(job.MAX_SALARY)}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-center font-bold text-sm">
                      {job.VACANCIES}
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={job.JOB_STATUS} />
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-[var(--text-secondary)]">
                      {job.POSTED_DATE}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedJobId(job.JOB_ID)}
                          aria-label={`View details for ${job.JOB_TITLE}`}
                          className="btn-base btn-secondary !py-1 !px-2.5 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(job)}
                          aria-label={`Edit ${job.JOB_TITLE}`}
                          className="btn-base btn-tertiary !p-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingJob(job)}
                          aria-label={`Delete ${job.JOB_TITLE}`}
                          className="btn-base btn-tertiary !p-1.5 text-[var(--danger)]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Job Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingJob ? `Edit Job #${editingJob.JOB_ID}` : 'Create Job Position (ER_JOB)'}
        subtitle="Enforces ER_JOB_DEPT_FK, ER_JOB_SALARY_CK (MIN_SALARY <= MAX_SALARY), ER_JOB_VACANCY_CK (VACANCIES >= 0), and ER_JOB_STATUS_CK."
      >
        <form onSubmit={handleSaveJob} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="job-title-input"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Job Title (JOB_TITLE) *
            </label>
            <input
              id="job-title-input"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Cloud Systems Engineer"
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="job-dept-select"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Department (DEPT_ID) *
              </label>
              <select
                id="job-dept-select"
                value={formDeptId}
                onChange={(e) => setFormDeptId(e.target.value)}
                className="input-field"
                required
              >
                {db.departments.map((d) => (
                  <option key={d.DEPT_ID} value={String(d.DEPT_ID)}>
                    #{d.DEPT_ID} · {d.DEPT_NAME}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="job-status-select"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Job Status (JOB_STATUS) *
              </label>
              <select
                id="job-status-select"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as JobStatus)}
                className="input-field"
              >
                {ALLOWED_JOB_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="job-min-salary"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Min Salary (INR)
              </label>
              <input
                id="job-min-salary"
                type="number"
                min="0"
                step="10000"
                value={formMinSalary}
                onChange={(e) => setFormMinSalary(e.target.value)}
                className="input-field font-mono-tabular"
              />
            </div>

            <div>
              <label
                htmlFor="job-max-salary"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Max Salary (INR)
              </label>
              <input
                id="job-max-salary"
                type="number"
                min="0"
                step="10000"
                value={formMaxSalary}
                onChange={(e) => setFormMaxSalary(e.target.value)}
                className="input-field font-mono-tabular"
              />
            </div>

            <div>
              <label
                htmlFor="job-vacancies"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Vacancies (&gt;= 0) *
              </label>
              <input
                id="job-vacancies"
                type="number"
                min="0"
                step="1"
                value={formVacancies}
                onChange={(e) => setFormVacancies(e.target.value)}
                className="input-field font-mono-tabular"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="job-desc-input"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Job Description (VARCHAR2(500))
            </label>
            <textarea
              id="job-desc-input"
              rows={3}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe responsibilities and technical requirements..."
              className="input-field"
            />
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
            >
              {formError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn-base btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-base btn-primary">
              {editingJob ? 'Save Changes' : 'Create Job'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Job Details Modal */}
      <Modal
        isOpen={selectedJob !== null}
        onClose={() => setSelectedJobId(null)}
        title={selectedJob ? `${selectedJob.JOB_TITLE} (#${selectedJob.JOB_ID})` : 'Job Details'}
        subtitle="ER_JOB schema details and linked application count."
      >
        {selectedJob && (
          <div className="space-y-4 text-xs">
            <div className="surface-inset rounded-xl p-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[var(--text-secondary)]">JOB_ID</div>
                <div className="font-mono-tabular font-semibold text-sm mt-0.5">
                  #{selectedJob.JOB_ID}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">DEPARTMENT</div>
                <div className="font-semibold mt-0.5">
                  {deptMap.get(selectedJob.DEPT_ID)} (#{selectedJob.DEPT_ID})
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">SALARY RANGE</div>
                <div className="font-mono-tabular mt-0.5">
                  {formatInrSalary(selectedJob.MIN_SALARY)} –{' '}
                  {formatInrSalary(selectedJob.MAX_SALARY)}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">VACANCIES</div>
                <div className="font-mono-tabular font-semibold mt-0.5">
                  {selectedJob.VACANCIES}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">JOB_STATUS</div>
                <div className="mt-1">
                  <StatusIndicator status={selectedJob.JOB_STATUS} />
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">LINKED APPLICATIONS</div>
                <div className="font-mono-tabular font-semibold mt-0.5">
                  {appCountsByJob.get(selectedJob.JOB_ID) ?? 0} application(s)
                </div>
              </div>
            </div>

            <div className="surface-card rounded-xl p-4">
              <div className="text-[var(--text-secondary)] font-medium mb-1">JOB_DESCRIPTION</div>
              <p className="text-[var(--text-primary)] leading-relaxed">
                {selectedJob.JOB_DESCRIPTION ?? 'No description provided.'}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingJob !== null}
        onClose={() => setDeletingJob(null)}
        title="Confirm Job Removal"
        subtitle="Checks ER_APP_JOB_FK foreign key references before deleting."
      >
        {deletingJob && (
          <div className="space-y-4 text-xs">
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to remove Job{' '}
              <strong className="text-[var(--text-primary)]">
                #{deletingJob.JOB_ID} ({deletingJob.JOB_TITLE})
              </strong>
              ? If any applications reference this job, deletion will be blocked to preserve
              relational integrity.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingJob(null)}
                className="btn-base btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn-base btn-destructive"
              >
                Remove Job
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
