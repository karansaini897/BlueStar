import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Building2,
  Edit3,
  Eye,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { CsvExportButton, Modal, StatusIndicator, formatInrSalary } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import { DepartmentVacancySummary } from '../model/operations';

export const DepartmentsPage: React.FC = () => {
  const {
    db,
    departmentSummaries,
    candidateApplicationView,
    enrichedEmployees,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    notify,
  } = useRecruitment();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'DEPT_ID' | 'DEPT_NAME' | 'OPEN_VACANCIES'>('DEPT_ID');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentVacancySummary | null>(null);
  const [deptNameInput, setDeptNameInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Details Modal
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);

  // Delete Confirmation Modal
  const [deletingDept, setDeletingDept] = useState<DepartmentVacancySummary | null>(null);

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = departmentSummaries.filter((d) => {
      if (!q) return true;
      return (
        d.DEPT_NAME.toLowerCase().includes(q) || String(d.DEPT_ID).includes(q)
      );
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'DEPT_NAME') {
        cmp = a.DEPT_NAME.localeCompare(b.DEPT_NAME);
      } else if (sortBy === 'OPEN_VACANCIES') {
        cmp = a.OPEN_VACANCIES - b.OPEN_VACANCIES;
      } else {
        cmp = a.DEPT_ID - b.DEPT_ID;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [departmentSummaries, searchQuery, sortBy, sortDir]);

  const openCreateModal = () => {
    setEditingDept(null);
    setDeptNameInput('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dept: DepartmentVacancySummary) => {
    setEditingDept(dept);
    setDeptNameInput(dept.DEPT_NAME);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const res = editingDept
      ? updateDepartment(editingDept.DEPT_ID, deptNameInput)
      : createDepartment(deptNameInput);

    if (!res.ok) {
      setFormError(res.error ?? 'Failed to save department.');
      return;
    }
    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deletingDept) return;
    const res = deleteDepartment(deletingDept.DEPT_ID);
    if (res.ok) {
      setDeletingDept(null);
    }
  };

  const selectedDeptSummary = useMemo(
    () => departmentSummaries.find((d) => d.DEPT_ID === selectedDeptId) ?? null,
    [departmentSummaries, selectedDeptId]
  );

  const selectedDeptJobs = useMemo(
    () => db.jobs.filter((j) => j.DEPT_ID === selectedDeptId),
    [db.jobs, selectedDeptId]
  );

  const selectedDeptApps = useMemo(
    () => candidateApplicationView.filter((a) => a.DEPT_ID === selectedDeptId),
    [candidateApplicationView, selectedDeptId]
  );

  const selectedDeptEmployees = useMemo(
    () => enrichedEmployees.filter((e) => e.DEPT_ID === selectedDeptId),
    [enrichedEmployees, selectedDeptId]
  );

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="surface-card rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search departments by name or ID"
              placeholder="Search department by name or DEPT_ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field !pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CsvExportButton
              filename="er_departments_export.csv"
              headers={[
                'DEPT_ID',
                'DEPT_NAME',
                'TOTAL_JOBS',
                'OPEN_JOBS',
                'OPEN_VACANCIES',
                'APPLICATIONS_COUNT',
                'EMPLOYEES_COUNT',
              ]}
              rows={filteredDepartments.map((d) => [
                d.DEPT_ID,
                d.DEPT_NAME,
                d.TOTAL_JOBS_ALL,
                d.OPEN_JOBS,
                d.OPEN_VACANCIES,
                d.APPLICATIONS_COUNT,
                d.EMPLOYEES_COUNT,
              ])}
              onExported={(c) =>
                notify('info', 'CSV Exported', `Exported ${c} department record(s).`)
              }
            />

            <button type="button" onClick={openCreateModal} className="btn-base btn-primary">
              <Plus className="w-4 h-4" />
              <span>Create Department</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex items-center gap-2">
            <label htmlFor="dept-sort" className="text-[var(--text-secondary)] font-medium">
              Sort by:
            </label>
            <select
              id="dept-sort"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'DEPT_ID' | 'DEPT_NAME' | 'OPEN_VACANCIES')
              }
              className="input-field !w-auto !py-1 !px-2.5 text-xs"
            >
              <option value="DEPT_ID">Department ID</option>
              <option value="DEPT_NAME">Department Name</option>
              <option value="OPEN_VACANCIES">Open Vacancies</option>
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

          <div className="font-mono-tabular text-[var(--text-secondary)]">
            Showing <strong className="text-[var(--text-primary)]">{filteredDepartments.length}</strong> of{' '}
            {departmentSummaries.length} departments (ER_DEPARTMENT)
          </div>
        </div>
      </div>

      {/* Departments Table */}
      <div className="surface-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)] font-semibold">
                <th className="py-3.5 px-4 font-mono-tabular">DEPT_ID</th>
                <th className="py-3.5 px-4">DEPT_NAME (UNIQUE)</th>
                <th className="py-3.5 px-4 font-mono-tabular text-center">OPEN JOBS / TOTAL</th>
                <th className="py-3.5 px-4 font-mono-tabular text-center">OPEN VACANCIES</th>
                <th className="py-3.5 px-4 font-mono-tabular text-center">APPLICATIONS</th>
                <th className="py-3.5 px-4 font-mono-tabular text-center">EMPLOYEES</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredDepartments.map((dept) => (
                <tr
                  key={dept.DEPT_ID}
                  className="hover:bg-[var(--surface-secondary)]/40 transition-colors"
                >
                  <td className="py-3 px-4 font-mono-tabular font-semibold text-[var(--brand-primary)]">
                    #{dept.DEPT_ID}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[var(--brand-primary)] shrink-0" />
                      <span>{dept.DEPT_NAME}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-center">
                    <strong>{dept.OPEN_JOBS}</strong> / {dept.TOTAL_JOBS_ALL}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-center font-bold text-sm text-[var(--success)]">
                    {dept.OPEN_VACANCIES}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-center">
                    {dept.APPLICATIONS_COUNT}
                  </td>
                  <td className="py-3 px-4 font-mono-tabular text-center font-semibold">
                    {dept.EMPLOYEES_COUNT}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedDeptId(dept.DEPT_ID)}
                        aria-label={`View details for ${dept.DEPT_NAME}`}
                        className="btn-base btn-secondary !py-1 !px-2.5 text-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(dept)}
                        aria-label={`Edit ${dept.DEPT_NAME}`}
                        className="btn-base btn-tertiary !p-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingDept(dept)}
                        aria-label={`Delete ${dept.DEPT_NAME}`}
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
      </div>

      {/* Create / Edit Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingDept
            ? `Edit Department #${editingDept.DEPT_ID}`
            : 'Create Department (ER_DEPARTMENT)'
        }
        subtitle="Enforces DEPT_NAME VARCHAR2(50) UNIQUE NOT NULL."
      >
        <form onSubmit={handleSave} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="dept-name-input"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Department Name (DEPT_NAME) *
            </label>
            <input
              id="dept-name-input"
              type="text"
              value={deptNameInput}
              onChange={(e) => setDeptNameInput(e.target.value)}
              placeholder="e.g. Cloud Infrastructure"
              className="input-field"
              required
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
              {editingDept ? 'Save Changes' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Department Details Modal */}
      <Modal
        isOpen={selectedDeptSummary !== null}
        onClose={() => setSelectedDeptId(null)}
        title={
          selectedDeptSummary
            ? `${selectedDeptSummary.DEPT_NAME} (#${selectedDeptSummary.DEPT_ID})`
            : 'Department Details'
        }
        subtitle="Department jobs, vacancies, applications, and onboarded employees."
        maxWidthClass="max-w-2xl"
      >
        {selectedDeptSummary && (
          <div className="space-y-5 text-xs">
            <div className="surface-inset rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <div className="text-[var(--text-secondary)]">DEPT_ID</div>
                <div className="font-mono-tabular font-bold text-sm mt-0.5">
                  #{selectedDeptSummary.DEPT_ID}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">OPEN VACANCIES</div>
                <div className="font-mono-tabular font-bold text-sm mt-0.5 text-[var(--success)]">
                  {selectedDeptSummary.OPEN_VACANCIES}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">APPLICATIONS</div>
                <div className="font-mono-tabular font-bold text-sm mt-0.5">
                  {selectedDeptApps.length}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">EMPLOYEES</div>
                <div className="font-mono-tabular font-bold text-sm mt-0.5">
                  {selectedDeptEmployees.length}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-[var(--text-primary)]">
                Linked Jobs in ER_JOB ({selectedDeptJobs.length})
              </div>
              {selectedDeptJobs.length === 0 ? (
                <div className="surface-card rounded-lg p-3 text-[var(--text-secondary)]">
                  No jobs linked to this department.
                </div>
              ) : (
                <div className="surface-card rounded-xl divide-y divide-[var(--border-subtle)]">
                  {selectedDeptJobs.map((j) => (
                    <div
                      key={j.JOB_ID}
                      className="p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          #{j.JOB_ID} · {j.JOB_TITLE}
                        </div>
                        <div className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
                          Salary: {formatInrSalary(j.MIN_SALARY)} –{' '}
                          {formatInrSalary(j.MAX_SALARY)} · Vacancies: {j.VACANCIES}
                        </div>
                      </div>
                      <StatusIndicator status={j.JOB_STATUS} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingDept !== null}
        onClose={() => setDeletingDept(null)}
        title="Confirm Department Removal"
        subtitle="Checks ER_JOB_DEPT_FK foreign key references before deleting."
      >
        {deletingDept && (
          <div className="space-y-4 text-xs">
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to remove Department{' '}
              <strong className="text-[var(--text-primary)]">
                #{deletingDept.DEPT_ID} ({deletingDept.DEPT_NAME})
              </strong>
              ? If any job records reference this department, deletion will be blocked.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingDept(null)}
                className="btn-base btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn-base btn-destructive"
              >
                Remove Department
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
