import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Edit3,
  Eye,
  Plus,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { CsvExportButton, Modal, StatusIndicator, formatInrSalary } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import {
  ALLOWED_EMPLOYMENT_STATUSES,
  EmploymentStatus,
  EnrichedEmployee,
} from '../model/schema';
import { getTodayIsoDate } from '../model/operations';

export const EmployeesPage: React.FC = () => {
  const {
    db,
    candidateApplicationView,
    enrichedEmployees,
    createEmployeeDirect,
    updateEmployee,
    deleteEmployee,
    notify,
  } = useRecruitment();

  // Search, Filters, Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<
    'EMPLOYEE_ID' | 'JOINING_DATE' | 'ANNUAL_SALARY' | 'DESIGNATION'
  >('EMPLOYEE_ID');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Create Employee Modal (Part XVI.16.2)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('');
  const [createDesignation, setCreateDesignation] = useState('');
  const [createJoiningDate, setCreateJoiningDate] = useState(getTodayIsoDate());
  const [createSalary, setCreateSalary] = useState('600000');
  const [createStatus, setCreateStatus] = useState<EmploymentStatus>('ACTIVE');
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Employee Modal (HR has full rights to edit Salary, Department, Designation, Joining Date, Status, Phone, Qualification)
  const [editingEmployee, setEditingEmployee] = useState<EnrichedEmployee | null>(null);
  const [editDesignation, setEditDesignation] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editJoiningDate, setEditJoiningDate] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editStatus, setEditStatus] = useState<EmploymentStatus>('ACTIVE');
  const [editPhone, setEditPhone] = useState('');
  const [editQualification, setEditQualification] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Employee Confirmation Modal
  const [deletingEmployee, setDeletingEmployee] = useState<EnrichedEmployee | null>(null);

  // Employee Details Profile Modal (Part XVI.16.5)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = enrichedEmployees.filter((emp) => {
      if (q) {
        const matchId = String(emp.EMPLOYEE_ID).includes(q);
        const matchName = emp.FULL_NAME.toLowerCase().includes(q);
        const matchDesig = emp.DESIGNATION.toLowerCase().includes(q);
        const matchDept = emp.DEPT_NAME.toLowerCase().includes(q);
        if (!matchId && !matchName && !matchDesig && !matchDept) return false;
      }
      if (statusFilter !== 'ALL' && emp.EMPLOYMENT_STATUS !== statusFilter) return false;
      if (deptFilter !== 'ALL' && emp.DEPT_ID !== Number(deptFilter)) return false;
      return true;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'JOINING_DATE') {
        cmp = a.JOINING_DATE.localeCompare(b.JOINING_DATE);
      } else if (sortBy === 'ANNUAL_SALARY') {
        cmp = a.ANNUAL_SALARY - b.ANNUAL_SALARY;
      } else if (sortBy === 'DESIGNATION') {
        cmp = a.DESIGNATION.localeCompare(b.DESIGNATION);
      } else {
        cmp = a.EMPLOYEE_ID - b.EMPLOYEE_ID;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [enrichedEmployees, searchQuery, statusFilter, deptFilter, sortBy, sortDir]);

  // Eligible applications for creating a new employee (where neither APPLICATION_ID nor CANDIDATE_ID already exists in ER_EMPLOYEE)
  const eligibleApplications = useMemo(() => {
    const usedAppIds = new Set(db.employees.map((e) => e.APPLICATION_ID));
    const usedCandIds = new Set(db.employees.map((e) => e.CANDIDATE_ID));
    return candidateApplicationView.filter(
      (a) => !usedAppIds.has(a.APPLICATION_ID) && !usedCandIds.has(a.CANDIDATE_ID)
    );
  }, [candidateApplicationView, db.employees]);

  const linkedAppForCreate = useMemo(() => {
    return (
      candidateApplicationView.find(
        (a) => a.APPLICATION_ID === Number(selectedApplicationId)
      ) ?? null
    );
  }, [candidateApplicationView, selectedApplicationId]);

  const openCreateModal = () => {
    const firstEligible = eligibleApplications[0] ?? candidateApplicationView[0];
    setSelectedApplicationId(String(firstEligible?.APPLICATION_ID ?? ''));
    setCreateDesignation(firstEligible?.JOB_TITLE ?? 'Software Developer');
    setCreateJoiningDate(getTodayIsoDate());
    setCreateSalary('600000');
    setCreateStatus('ACTIVE');
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleApplicationSelectionChange = (appIdStr: string) => {
    setSelectedApplicationId(appIdStr);
    const found = candidateApplicationView.find((a) => a.APPLICATION_ID === Number(appIdStr));
    if (found) {
      setCreateDesignation(found.JOB_TITLE);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!linkedAppForCreate) {
      setCreateError('Please select a valid application linked to a candidate.');
      return;
    }

    const res = createEmployeeDirect({
      APPLICATION_ID: linkedAppForCreate.APPLICATION_ID,
      CANDIDATE_ID: linkedAppForCreate.CANDIDATE_ID,
      DESIGNATION: createDesignation,
      JOINING_DATE: createJoiningDate,
      ANNUAL_SALARY: Number(createSalary),
      EMPLOYMENT_STATUS: createStatus,
    });

    if (!res.ok) {
      setCreateError(res.error ?? 'Failed to create employee record.');
      return;
    }
    setIsCreateOpen(false);
  };

  const openEditModal = (emp: EnrichedEmployee) => {
    setEditingEmployee(emp);
    setEditDesignation(emp.DESIGNATION);
    setEditDeptId(String(emp.DEPT_ID));
    setEditJoiningDate(emp.JOINING_DATE);
    setEditSalary(String(emp.ANNUAL_SALARY));
    setEditStatus(emp.EMPLOYMENT_STATUS);
    setEditPhone(emp.PHONE ?? '');
    setEditQualification(emp.QUALIFICATION ?? '');
    setEditError(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setEditError(null);

    const res = updateEmployee(editingEmployee.EMPLOYEE_ID, {
      DESIGNATION: editDesignation,
      DEPT_ID: Number(editDeptId),
      JOINING_DATE: editJoiningDate,
      ANNUAL_SALARY: Number(editSalary),
      EMPLOYMENT_STATUS: editStatus,
      PHONE: editPhone,
      QUALIFICATION: editQualification,
    });

    if (!res.ok) {
      setEditError(res.error ?? 'Failed to update employee.');
      return;
    }
    setEditingEmployee(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingEmployee) return;
    const res = deleteEmployee(deletingEmployee.EMPLOYEE_ID);
    if (res.ok) {
      if (selectedEmployeeId === deletingEmployee.EMPLOYEE_ID) {
        setSelectedEmployeeId(null);
      }
      setDeletingEmployee(null);
    }
  };

  const selectedEmployee = useMemo(
    () => enrichedEmployees.find((e) => e.EMPLOYEE_ID === selectedEmployeeId) ?? null,
    [enrichedEmployees, selectedEmployeeId]
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
              aria-label="Search employees by ID, candidate name, designation, or department"
              placeholder="Search by employee ID, employee name, designation, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field !pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CsvExportButton
              filename="er_employees_export.csv"
              headers={[
                'EMPLOYEE_ID',
                'CANDIDATE_ID',
                'FULL_NAME',
                'APPLICATION_ID',
                'DESIGNATION',
                'DEPT_NAME',
                'JOINING_DATE',
                'ANNUAL_SALARY',
                'EMPLOYMENT_STATUS',
              ]}
              rows={filteredEmployees.map((e) => [
                e.EMPLOYEE_ID,
                e.CANDIDATE_ID,
                e.FULL_NAME,
                e.APPLICATION_ID,
                e.DESIGNATION,
                e.DEPT_NAME,
                e.JOINING_DATE,
                e.ANNUAL_SALARY,
                e.EMPLOYMENT_STATUS,
              ])}
              onExported={(c) =>
                notify('info', 'CSV Exported', `Exported ${c} employee record(s).`)
              }
            />

            <button type="button" onClick={openCreateModal} className="btn-base btn-primary">
              <Plus className="w-4 h-4" />
              <span>Create Employee</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="emp-status-filter" className="text-[var(--text-secondary)] font-medium">
                Employment Status:
              </label>
              <select
                id="emp-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="ALL">All Statuses</option>
                {ALLOWED_EMPLOYMENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="emp-dept-filter" className="text-[var(--text-secondary)] font-medium">
                Department:
              </label>
              <select
                id="emp-dept-filter"
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
              <label htmlFor="emp-sort" className="text-[var(--text-secondary)] font-medium">
                Sort by:
              </label>
              <select
                id="emp-sort"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | 'EMPLOYEE_ID'
                      | 'JOINING_DATE'
                      | 'ANNUAL_SALARY'
                      | 'DESIGNATION'
                  )
                }
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="EMPLOYEE_ID">Employee ID</option>
                <option value="JOINING_DATE">Joining Date</option>
                <option value="ANNUAL_SALARY">Annual Salary</option>
                <option value="DESIGNATION">Designation</option>
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

            {(searchQuery !== '' || statusFilter !== 'ALL' || deptFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setDeptFilter('ALL');
                }}
                className="btn-base btn-tertiary !py-1 !px-2 text-xs"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="font-mono-tabular text-[var(--text-secondary)]">
            Showing <strong className="text-[var(--text-primary)]">{filteredEmployees.length}</strong> of{' '}
            {enrichedEmployees.length} employees (ER_EMPLOYEE)
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="surface-card rounded-xl overflow-hidden">
        {filteredEmployees.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              No employee records match the selected filters.
            </p>
            <button type="button" onClick={openCreateModal} className="btn-base btn-primary text-xs">
              <UserCheck className="w-4 h-4" />
              <span>Create Employee</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)] font-semibold">
                  <th className="py-3 px-3 font-mono-tabular">EMP_ID</th>
                  <th className="py-3 px-3">EMPLOYEE NAME</th>
                  <th className="py-3 px-3 font-mono-tabular">APP_ID</th>
                  <th className="py-3 px-3">DESIGNATION</th>
                  <th className="py-3 px-3">DEPARTMENT</th>
                  <th className="py-3 px-3 font-mono-tabular">JOINING_DATE</th>
                  <th className="py-3 px-3 font-mono-tabular text-right">ANNUAL_SALARY</th>
                  <th className="py-3 px-3">STATUS</th>
                  <th className="py-3 px-3 text-right">HR Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.EMPLOYEE_ID}
                    className="hover:bg-[var(--surface-secondary)]/40 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono-tabular font-semibold text-[var(--brand-primary)]">
                      #{emp.EMPLOYEE_ID}
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeId(emp.EMPLOYEE_ID)}
                        className="font-semibold text-[var(--text-primary)] hover:underline text-left cursor-pointer"
                      >
                        {emp.FULL_NAME}
                      </button>
                      <div className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
                        Cand #{emp.CANDIDATE_ID} · {emp.EMAIL}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono-tabular">#{emp.APPLICATION_ID}</td>
                    <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">
                      {emp.DESIGNATION}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-primary)]">
                      <div className="font-semibold">{emp.DEPT_NAME}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        Job: {emp.JOB_TITLE}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono-tabular text-[var(--text-secondary)] whitespace-nowrap">
                      {emp.JOINING_DATE}
                    </td>
                    <td className="py-3 px-3 font-mono-tabular text-right font-semibold whitespace-nowrap">
                      {formatInrSalary(emp.ANNUAL_SALARY)}
                    </td>
                    <td className="py-3 px-3">
                      <StatusIndicator status={emp.EMPLOYMENT_STATUS} />
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeeId(emp.EMPLOYEE_ID)}
                          aria-label={`View profile for Employee #${emp.EMPLOYEE_ID}`}
                          className="btn-base btn-secondary !py-1 !px-2 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profile</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          aria-label={`Edit Employee #${emp.EMPLOYEE_ID}`}
                          title="Edit salary, department, designation, joining date, or status"
                          className="btn-base btn-secondary !py-1 !px-2 text-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingEmployee(emp)}
                          aria-label={`Remove Employee #${emp.EMPLOYEE_ID}`}
                          title="Remove employee record"
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

      {/* Create Employee Modal (Enforcing ER_EMP_APP_FK and ER_EMP_CAND_FK) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Employee Record (ER_EMPLOYEE)"
        subtitle="Requires a valid APPLICATION_ID and its linked CANDIDATE_ID per ER_EMP_APP_FK and ER_EMP_CAND_FK."
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="emp-app-select"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Select Application & Linked Candidate (APPLICATION_ID) *
            </label>
            <select
              id="emp-app-select"
              value={selectedApplicationId}
              onChange={(e) => handleApplicationSelectionChange(e.target.value)}
              className="input-field"
              required
            >
              {candidateApplicationView.map((app) => (
                <option key={app.APPLICATION_ID} value={String(app.APPLICATION_ID)}>
                  App #{app.APPLICATION_ID} · {app.FULL_NAME} (Cand #{app.CANDIDATE_ID}) —{' '}
                  {app.JOB_TITLE} [{app.APPLICATION_STATUS}]
                </option>
              ))}
            </select>
          </div>

          {linkedAppForCreate && (
            <div className="surface-inset rounded-xl p-3.5 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Linked Candidate (Auto-bound):</span>
                <strong className="font-mono-tabular text-[var(--text-primary)]">
                  #{linkedAppForCreate.CANDIDATE_ID} · {linkedAppForCreate.FULL_NAME}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Linked Job & Department:</span>
                <span className="text-[var(--text-primary)]">
                  {linkedAppForCreate.JOB_TITLE} ({linkedAppForCreate.DEPT_NAME})
                </span>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="emp-designation-input"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Designation (DESIGNATION) *
            </label>
            <input
              id="emp-designation-input"
              type="text"
              value={createDesignation}
              onChange={(e) => setCreateDesignation(e.target.value)}
              placeholder="e.g. Software Developer"
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="emp-joining-date"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Joining Date *
              </label>
              <input
                id="emp-joining-date"
                type="date"
                value={createJoiningDate}
                onChange={(e) => setCreateJoiningDate(e.target.value)}
                className="input-field font-mono-tabular"
                required
              />
            </div>

            <div>
              <label
                htmlFor="emp-salary-input"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Annual Salary (INR) *
              </label>
              <input
                id="emp-salary-input"
                type="number"
                min="0"
                step="10000"
                value={createSalary}
                onChange={(e) => setCreateSalary(e.target.value)}
                className="input-field font-mono-tabular"
                required
              />
            </div>

            <div>
              <label
                htmlFor="emp-status-select"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Employment Status *
              </label>
              <select
                id="emp-status-select"
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value as EmploymentStatus)}
                className="input-field"
              >
                {ALLOWED_EMPLOYMENT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {createError && (
            <div
              role="alert"
              className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
            >
              {createError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="btn-base btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-base btn-primary">
              Create Employee
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Employee Modal (HR Can Change Salary, Department, Designation, Joining Date, Employment Status, Phone & Qualification) */}
      <Modal
        isOpen={editingEmployee !== null}
        onClose={() => setEditingEmployee(null)}
        title={
          editingEmployee
            ? `HR Edit Employee #${editingEmployee.EMPLOYEE_ID} · ${editingEmployee.FULL_NAME}`
            : 'Edit Employee Details'
        }
        subtitle="HR can update Annual Salary, Department, Designation, Joining Date, Contact Phone, Qualification, and Employment Status ('ACTIVE' / 'INACTIVE')."
        maxWidthClass="max-w-xl"
      >
        {editingEmployee && (
          <form onSubmit={handleEditSubmit} className="space-y-4" noValidate>
            <div className="surface-inset rounded-xl p-3.5 text-xs space-y-1">
              <div className="font-semibold text-[var(--text-primary)]">
                Verified Foreign Keys: APPLICATION_ID #{editingEmployee.APPLICATION_ID} ·
                CANDIDATE_ID #{editingEmployee.CANDIDATE_ID}
              </div>
              <div className="text-[var(--text-secondary)]">
                Employee: {editingEmployee.FULL_NAME} ({editingEmployee.EMAIL})
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="edit-emp-designation"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Designation (DESIGNATION) *
                </label>
                <input
                  id="edit-emp-designation"
                  type="text"
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="edit-emp-dept"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Department (ER_DEPARTMENT) *
                </label>
                <select
                  id="edit-emp-dept"
                  value={editDeptId}
                  onChange={(e) => setEditDeptId(e.target.value)}
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="edit-emp-salary"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Annual Salary (INR) *
                </label>
                <input
                  id="edit-emp-salary"
                  type="number"
                  min="0"
                  step="10000"
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  className="input-field font-mono-tabular"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="edit-emp-date"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Joining Date *
                </label>
                <input
                  id="edit-emp-date"
                  type="date"
                  value={editJoiningDate}
                  onChange={(e) => setEditJoiningDate(e.target.value)}
                  className="input-field font-mono-tabular"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="edit-emp-status"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Employment Status *
                </label>
                <select
                  id="edit-emp-status"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as EmploymentStatus)}
                  className="input-field"
                >
                  {ALLOWED_EMPLOYMENT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)]">
              <div>
                <label
                  htmlFor="edit-emp-phone"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Contact Phone (Linked ER_CANDIDATE.PHONE)
                </label>
                <input
                  id="edit-emp-phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="input-field font-mono-tabular"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-emp-qualification"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Qualification (Linked ER_CANDIDATE.QUALIFICATION)
                </label>
                <input
                  id="edit-emp-qualification"
                  type="text"
                  value={editQualification}
                  onChange={(e) => setEditQualification(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {editError && (
              <div
                role="alert"
                className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
              >
                {editError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="btn-base btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-base btn-primary">
                Save Employee Changes
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete / Remove Employee Confirmation Modal */}
      <Modal
        isOpen={deletingEmployee !== null}
        onClose={() => setDeletingEmployee(null)}
        title="Confirm Employee Record Removal"
        subtitle="Removes the local ER_EMPLOYEE record while preserving the candidate and application history."
      >
        {deletingEmployee && (
          <div className="space-y-4 text-xs">
            <div className="rounded-xl p-3.5 bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold">
                  Remove Employee #{deletingEmployee.EMPLOYEE_ID} ({deletingEmployee.FULL_NAME})?
                </div>
                <p className="leading-relaxed">
                  This action removes the employee entry from the local prototype directory. To
                  keep an employee on file without deleting their record, edit their status to{' '}
                  <code className="font-mono-tabular">INACTIVE</code> instead.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEmployee(null)}
                className="btn-base btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="btn-base btn-destructive"
              >
                Confirm Remove Employee
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Employee Details Modal (Distinguishing Stored vs Derived Values + Direct Edit Trigger) */}
      <Modal
        isOpen={selectedEmployee !== null}
        onClose={() => setSelectedEmployeeId(null)}
        title={
          selectedEmployee
            ? `Employee Profile #${selectedEmployee.EMPLOYEE_ID} · ${selectedEmployee.FULL_NAME}`
            : 'Employee Record'
        }
        subtitle="Distinguishes stored ER_EMPLOYEE columns from relational attributes derived via ER_APPLICATION, ER_CANDIDATE, and ER_JOB."
        maxWidthClass="max-w-xl"
      >
        {selectedEmployee && (
          <div className="space-y-5 text-xs">
            <div className="space-y-2">
              <div className="font-semibold text-[var(--brand-primary)] font-mono-tabular">
                1. Stored Employment Record (ER_EMPLOYEE)
              </div>
              <div className="surface-inset rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <div className="text-[var(--text-secondary)]">EMPLOYEE_ID</div>
                  <div className="font-mono-tabular font-bold mt-0.5">
                    #{selectedEmployee.EMPLOYEE_ID}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">APPLICATION_ID (UQ)</div>
                  <div className="font-mono-tabular font-semibold mt-0.5">
                    #{selectedEmployee.APPLICATION_ID}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">CANDIDATE_ID (UQ)</div>
                  <div className="font-mono-tabular font-semibold mt-0.5">
                    #{selectedEmployee.CANDIDATE_ID}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">DESIGNATION</div>
                  <div className="font-semibold mt-0.5">{selectedEmployee.DESIGNATION}</div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">JOINING_DATE</div>
                  <div className="font-mono-tabular mt-0.5">{selectedEmployee.JOINING_DATE}</div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">ANNUAL_SALARY (HR View)</div>
                  <div className="font-mono-tabular font-bold text-[var(--brand-primary)] mt-0.5">
                    {formatInrSalary(selectedEmployee.ANNUAL_SALARY)}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">EMPLOYMENT_STATUS</div>
                  <div className="mt-1">
                    <StatusIndicator status={selectedEmployee.EMPLOYMENT_STATUS} />
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-[var(--text-secondary)]">ASSIGNED DEPARTMENT</div>
                  <div className="font-semibold mt-0.5">
                    {selectedEmployee.DEPT_NAME} (DEPT_ID #{selectedEmployee.DEPT_ID})
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-semibold text-[var(--text-primary)] font-mono-tabular">
                2. Linked Candidate & Application Information
              </div>
              <div className="surface-card rounded-xl p-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[var(--text-secondary)]">FULL_NAME (ER_CANDIDATE)</div>
                  <div className="font-semibold mt-0.5">{selectedEmployee.FULL_NAME}</div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">EMAIL & PHONE</div>
                  <div className="mt-0.5">
                    {selectedEmployee.EMAIL} · {selectedEmployee.PHONE ?? 'Not provided'}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">QUALIFICATION & EXPERIENCE</div>
                  <div className="mt-0.5">
                    {selectedEmployee.QUALIFICATION ?? 'Not provided'} (
                    {selectedEmployee.EXPERIENCE_YEARS} yrs)
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">INITIAL APPLIED POSITION</div>
                  <div className="mt-0.5">{selectedEmployee.JOB_TITLE}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => {
                  const emp = selectedEmployee;
                  setSelectedEmployeeId(null);
                  openEditModal(emp);
                }}
                className="btn-base btn-primary text-xs"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Salary, Department & Details</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedEmployeeId(null)}
                className="btn-base btn-secondary text-xs"
              >
                Close Profile
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
