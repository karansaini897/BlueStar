import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Award,
  Briefcase,
  CheckCircle2,
  Edit3,
  Eye,
  GitBranch,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { CsvExportButton, Modal, StatusIndicator, formatInrSalary } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import {
  ALLOWED_EMPLOYMENT_STATUSES,
  EmploymentStatus,
  EnrichedEmployee,
  HIERARCHY_LEVEL_LABELS,
  HierarchyLevel,
} from '../model/schema';
import { calculatePercentageIncrease, getTodayIsoDate } from '../model/operations';

export const EmployeesPage: React.FC = () => {
  const {
    db,
    currentUser,
    candidateApplicationView,
    enrichedEmployees,
    createEmployeeDirect,
    updateEmployee,
    deleteEmployee,
    promoteEmployee,
    addPositionTitle,
    notify,
  } = useRecruitment();

  // Search, Filters, Sorting, and View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<
    'EMPLOYEE_ID' | 'JOINING_DATE' | 'ANNUAL_SALARY' | 'DESIGNATION' | 'HIERARCHY_LEVEL'
  >('EMPLOYEE_ID');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [activeViewMode, setActiveViewMode] = useState<'DIRECTORY' | 'HIERARCHY'>('DIRECTORY');

  // Position Titles Catalogue Modal
  const [isPositionsModalOpen, setIsPositionsModalOpen] = useState(false);
  const [newPositionTitle, setNewPositionTitle] = useState('');
  const [positionError, setPositionError] = useState<string | null>(null);

  // Create Employee Modal (Part XVI.16.2)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>('');
  const [createDesignation, setCreateDesignation] = useState('');
  const [createJoiningDate, setCreateJoiningDate] = useState(getTodayIsoDate());
  const [createSalary, setCreateSalary] = useState('600000');
  const [createStatus, setCreateStatus] = useState<EmploymentStatus>('ACTIVE');
  const [createHierarchyLevel, setCreateHierarchyLevel] = useState<HierarchyLevel>(1);
  const [createManagerId, setCreateManagerId] = useState<string>('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Employee Modal (HR has full rights to edit Salary, Department, Designation, Hierarchy Level, Manager, Joining Date, Status, Phone, Qualification)
  const [editingEmployee, setEditingEmployee] = useState<EnrichedEmployee | null>(null);
  const [editDesignation, setEditDesignation] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editJoiningDate, setEditJoiningDate] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editSalaryReason, setEditSalaryReason] = useState('');
  const [editStatus, setEditStatus] = useState<EmploymentStatus>('ACTIVE');
  const [editHierarchyLevel, setEditHierarchyLevel] = useState<HierarchyLevel>(1);
  const [editManagerId, setEditManagerId] = useState<string>('');
  const [editPhone, setEditPhone] = useState('');
  const [editQualification, setEditQualification] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Promote Employee Modal (Section 8 & 9)
  const [promotingEmployee, setPromotingEmployee] = useState<EnrichedEmployee | null>(null);
  const [promoDesignation, setPromoDesignation] = useState('');
  const [promoLevel, setPromoLevel] = useState<HierarchyLevel>(2);
  const [promoSalary, setPromoSalary] = useState('');
  const [promoManagerId, setPromoManagerId] = useState<string>('');
  const [promoNotes, setPromoNotes] = useState('');
  const [promoConfirmStep, setPromoConfirmStep] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Delete Employee Confirmation Modal
  const [deletingEmployee, setDeletingEmployee] = useState<EnrichedEmployee | null>(null);

  // Employee Details Profile Modal (Part XVI.16.5 + Visual Salary Timeline + Promotion History)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  const positionTitles = useMemo(() => db.positionTitles ?? [], [db.positionTitles]);

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
      if (levelFilter !== 'ALL' && emp.HIERARCHY_LEVEL !== Number(levelFilter)) return false;
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
      } else if (sortBy === 'HIERARCHY_LEVEL') {
        cmp = a.HIERARCHY_LEVEL - b.HIERARCHY_LEVEL;
      } else {
        cmp = a.EMPLOYEE_ID - b.EMPLOYEE_ID;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [enrichedEmployees, searchQuery, statusFilter, deptFilter, levelFilter, sortBy, sortDir]);

  // Eligible applications for creating a new employee
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
    setCreateHierarchyLevel(1);
    setCreateManagerId('');
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
      HIERARCHY_LEVEL: createHierarchyLevel,
      MANAGER_EMPLOYEE_ID: createManagerId ? Number(createManagerId) : null,
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
    setEditSalaryReason('');
    setEditStatus(emp.EMPLOYMENT_STATUS);
    setEditHierarchyLevel(emp.HIERARCHY_LEVEL);
    setEditManagerId(emp.MANAGER_EMPLOYEE_ID ? String(emp.MANAGER_EMPLOYEE_ID) : '');
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
      HIERARCHY_LEVEL: editHierarchyLevel,
      MANAGER_EMPLOYEE_ID: editManagerId ? Number(editManagerId) : null,
      PHONE: editPhone,
      QUALIFICATION: editQualification,
      SALARY_CHANGE_REASON: editSalaryReason.trim() || undefined,
    });

    if (!res.ok) {
      setEditError(res.error ?? 'Failed to update employee.');
      return;
    }
    setEditingEmployee(null);
  };

  const openPromoteModal = (emp: EnrichedEmployee) => {
    setPromotingEmployee(emp);
    const nextLvl = Math.min(5, emp.HIERARCHY_LEVEL + 1) as HierarchyLevel;
    setPromoLevel(nextLvl);
    setPromoDesignation(emp.DESIGNATION);
    setPromoSalary(String(Math.round(emp.ANNUAL_SALARY * 1.15)));
    setPromoManagerId(emp.MANAGER_EMPLOYEE_ID ? String(emp.MANAGER_EMPLOYEE_ID) : '');
    setPromoNotes('');
    setPromoConfirmStep(false);
    setPromoError(null);
  };

  const handlePromoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promotingEmployee) return;
    setPromoError(null);

    if (!promoDesignation.trim()) {
      setPromoError('Please select or enter a valid new position title.');
      return;
    }

    if (!promoConfirmStep) {
      setPromoConfirmStep(true);
      return;
    }

    const res = promoteEmployee({
      employeeId: promotingEmployee.EMPLOYEE_ID,
      newDesignation: promoDesignation.trim(),
      newLevel: promoLevel,
      newSalary: Number(promoSalary),
      newManagerEmployeeId: promoManagerId ? Number(promoManagerId) : null,
      notes: promoNotes.trim() || undefined,
    });

    if (!res.ok) {
      setPromoError(res.error ?? 'Promotion validation failed.');
      setPromoConfirmStep(false);
      return;
    }

    setPromotingEmployee(null);
    setPromoConfirmStep(false);
  };

  const handleAddPositionTitle = (e: React.FormEvent) => {
    e.preventDefault();
    setPositionError(null);
    const res = addPositionTitle(newPositionTitle);
    if (!res.ok) {
      setPositionError(res.error ?? 'Could not add position title.');
      return;
    }
    setNewPositionTitle('');
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

  const editSalaryPreviewPct = useMemo(() => {
    if (!editingEmployee) return 0;
    const nextSal = Number(editSalary);
    if (Number.isNaN(nextSal) || nextSal <= 0) return 0;
    return calculatePercentageIncrease(editingEmployee.ANNUAL_SALARY, nextSal);
  }, [editingEmployee, editSalary]);

  const promoSalaryPreviewPct = useMemo(() => {
    if (!promotingEmployee) return 0;
    const nextSal = Number(promoSalary);
    if (Number.isNaN(nextSal) || nextSal <= 0) return 0;
    return calculatePercentageIncrease(promotingEmployee.ANNUAL_SALARY, nextSal);
  }, [promotingEmployee, promoSalary]);

  return (
    <div className="space-y-5">
      {/* Search, View Switcher & Primary Controls */}
      <div className="surface-card rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search employees by ID, candidate name, designation, or department"
              placeholder="Search by employee ID, employee name, position, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field !pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle: Directory Table vs Reporting Hierarchy */}
            <div className="inline-flex rounded-lg p-0.5 bg-[var(--surface-secondary)] border border-[var(--border-subtle)] text-xs">
              <button
                type="button"
                onClick={() => setActiveViewMode('DIRECTORY')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                  activeViewMode === 'DIRECTORY'
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Directory Table
              </button>
              <button
                type="button"
                onClick={() => setActiveViewMode('HIERARCHY')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeViewMode === 'HIERARCHY'
                    ? 'bg-[var(--brand-primary)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Reporting Hierarchy</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setPositionError(null);
                setIsPositionsModalOpen(true);
              }}
              className="btn-base btn-secondary text-xs"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Position Titles ({positionTitles.length})</span>
            </button>

            <CsvExportButton
              filename="er_employees_export.csv"
              headers={[
                'EMPLOYEE_ID',
                'CANDIDATE_ID',
                'FULL_NAME',
                'APPLICATION_ID',
                'DESIGNATION',
                'DEPT_NAME',
                'HIERARCHY_LEVEL',
                'REPORTING_MANAGER',
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
                `Level ${e.HIERARCHY_LEVEL}`,
                e.MANAGER_NAME ?? 'Top-Level / HR Direct',
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
                Status:
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
              <label htmlFor="emp-level-filter" className="text-[var(--text-secondary)] font-medium">
                Hierarchy:
              </label>
              <select
                id="emp-level-filter"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="ALL">All Levels (1–5)</option>
                {([1, 2, 3, 4, 5] as HierarchyLevel[]).map((lvl) => (
                  <option key={lvl} value={String(lvl)}>
                    {HIERARCHY_LEVEL_LABELS[lvl]}
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
                      | 'HIERARCHY_LEVEL'
                  )
                }
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="EMPLOYEE_ID">Employee ID</option>
                <option value="HIERARCHY_LEVEL">Hierarchy Level</option>
                <option value="JOINING_DATE">Joining Date</option>
                <option value="ANNUAL_SALARY">Annual Salary</option>
                <option value="DESIGNATION">Position / Designation</option>
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
              levelFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setDeptFilter('ALL');
                  setLevelFilter('ALL');
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

      {/* View Mode 1: Reporting Hierarchy & Organisational Structure */}
      {activeViewMode === 'HIERARCHY' ? (
        <div className="surface-card rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h2 className="text-sm font-display font-bold text-[var(--text-primary)]">
                Organisational Reporting Hierarchy & Authority Levels
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Frontend-only hierarchy metadata layered over ER_EMPLOYEE. Employees at Level 2 or
                above can promote eligible subordinates within their reporting chain.
              </p>
            </div>
            <span className="text-[11px] font-mono-tabular px-2.5 py-1 rounded-md bg-[var(--surface-secondary)] text-[var(--brand-primary)] font-semibold">
              HR Authority: Full Organisational Control
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)] font-semibold">
                  <th className="py-2.5 px-3">EMPLOYEE</th>
                  <th className="py-2.5 px-3">CURRENT POSITION</th>
                  <th className="py-2.5 px-3">HIERARCHY LEVEL</th>
                  <th className="py-2.5 px-3">REPORTING MANAGER</th>
                  <th className="py-2.5 px-3 text-center">DIRECT REPORTS</th>
                  <th className="py-2.5 px-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredEmployees.map((emp) => (
                  <tr
                    key={emp.EMPLOYEE_ID}
                    className="hover:bg-[var(--surface-secondary)]/40 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeId(emp.EMPLOYEE_ID)}
                        className="font-semibold text-[var(--text-primary)] hover:underline text-left cursor-pointer"
                      >
                        #{emp.EMPLOYEE_ID} · {emp.FULL_NAME}
                      </button>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {emp.DEPT_NAME} · <StatusIndicator status={emp.EMPLOYMENT_STATUS} />
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-[var(--text-primary)]">
                      {emp.DESIGNATION}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-semibold text-[11px]">
                        Level {emp.HIERARCHY_LEVEL}
                      </span>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        {HIERARCHY_LEVEL_LABELS[emp.HIERARCHY_LEVEL].split('·')[1]?.trim()}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[var(--text-primary)]">
                      {emp.MANAGER_NAME ? (
                        <span className="font-medium">{emp.MANAGER_NAME}</span>
                      ) : (
                        <span className="text-[var(--text-secondary)] italic">
                          None (Reports to HR / Executive)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono-tabular font-semibold">
                      {emp.DIRECT_REPORTS_COUNT}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeeId(emp.EMPLOYEE_ID)}
                          className="btn-base btn-secondary !py-1 !px-2 text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Profile & Timeline</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openPromoteModal(emp)}
                          disabled={emp.EMPLOYMENT_STATUS !== 'ACTIVE'}
                          className="btn-base btn-primary !py-1 !px-2.5 text-xs"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Promote</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* View Mode 2: Standard Employees Directory Table */
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
                    <th className="py-3 px-3">CURRENT POSITION</th>
                    <th className="py-3 px-3">DEPARTMENT</th>
                    <th className="py-3 px-3">HIERARCHY & MANAGER</th>
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
                          App #{emp.APPLICATION_ID} · Cand #{emp.CANDIDATE_ID}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {emp.DESIGNATION}
                        </div>
                        {emp.PROMOTION_HISTORY.length > 0 && (
                          <div className="text-[10px] text-[var(--success)] font-medium">
                            {emp.PROMOTION_HISTORY.length} promotion(s) on file
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-primary)]">
                        <div className="font-semibold">{emp.DEPT_NAME}</div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          Job: {emp.JOB_TITLE}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] font-semibold text-[11px]">
                          Level {emp.HIERARCHY_LEVEL}
                        </span>
                        <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          {emp.MANAGER_NAME
                            ? `Reports to: ${emp.MANAGER_NAME.split('(')[0].trim()}`
                            : 'Reports to: HR / Top-Level'}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono-tabular text-[var(--text-secondary)] whitespace-nowrap">
                        {emp.JOINING_DATE}
                      </td>
                      <td className="py-3 px-3 font-mono-tabular text-right font-semibold whitespace-nowrap">
                        <div>{formatInrSalary(emp.ANNUAL_SALARY)}</div>
                        {emp.SALARY_HISTORY.length > 0 && (
                          <div className="text-[10px] text-[var(--text-secondary)]">
                            {emp.SALARY_HISTORY.length} timeline entry(s)
                          </div>
                        )}
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
                            onClick={() => openPromoteModal(emp)}
                            disabled={emp.EMPLOYMENT_STATUS !== 'ACTIVE'}
                            aria-label={`Promote Employee #${emp.EMPLOYEE_ID}`}
                            title="Promote employee position, hierarchy level, and salary"
                            className="btn-base btn-secondary !py-1 !px-2 text-xs"
                          >
                            <Award className="w-3.5 h-3.5 text-[var(--success)]" />
                            <span>Promote</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            aria-label={`Edit Employee #${emp.EMPLOYEE_ID}`}
                            title="Edit salary, department, designation, hierarchy level, or status"
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
      )}

      {/* Position Titles Catalogue Modal (Section 8.3) */}
      <Modal
        isOpen={isPositionsModalOpen}
        onClose={() => setIsPositionsModalOpen(false)}
        title="Manage Organisation Position Titles"
        subtitle="Define standard position titles available when onboarding, editing, or promoting employees."
      >
        <div className="space-y-4 text-xs">
          <form onSubmit={handleAddPositionTitle} className="flex items-center gap-2">
            <input
              type="text"
              value={newPositionTitle}
              onChange={(e) => setNewPositionTitle(e.target.value)}
              placeholder="Add custom position title (e.g. Principal Data Architect)..."
              className="input-field flex-1"
            />
            <button type="submit" className="btn-base btn-primary shrink-0">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Position</span>
            </button>
          </form>

          {positionError && (
            <div className="rounded-lg p-2.5 bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30">
              {positionError}
            </div>
          )}

          <div className="surface-inset rounded-xl p-3.5 max-h-60 overflow-y-auto">
            <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Configured Position Titles ({positionTitles.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {positionTitles.map((title) => (
                <span
                  key={title}
                  className="px-2.5 py-1 rounded-md bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium"
                >
                  {title}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsPositionsModalOpen(false)}
              className="btn-base btn-secondary"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="emp-designation-input"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Position / Designation (DESIGNATION) *
              </label>
              <input
                id="emp-designation-input"
                list="position-titles-datalist"
                type="text"
                value={createDesignation}
                onChange={(e) => setCreateDesignation(e.target.value)}
                placeholder="e.g. Software Developer"
                className="input-field"
                required
              />
              <datalist id="position-titles-datalist">
                {positionTitles.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                htmlFor="emp-create-level"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Initial Hierarchy Level (Frontend Metadata)
              </label>
              <select
                id="emp-create-level"
                value={String(createHierarchyLevel)}
                onChange={(e) => setCreateHierarchyLevel(Number(e.target.value) as HierarchyLevel)}
                className="input-field"
              >
                {([1, 2, 3, 4, 5] as HierarchyLevel[]).map((lvl) => (
                  <option key={lvl} value={String(lvl)}>
                    {HIERARCHY_LEVEL_LABELS[lvl]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="emp-create-manager"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Reporting Manager (Optional)
            </label>
            <select
              id="emp-create-manager"
              value={createManagerId}
              onChange={(e) => setCreateManagerId(e.target.value)}
              className="input-field"
            >
              <option value="">None (Reports directly to HR / Leadership)</option>
              {enrichedEmployees.map((mgr) => (
                <option key={mgr.EMPLOYEE_ID} value={String(mgr.EMPLOYEE_ID)}>
                  Emp #{mgr.EMPLOYEE_ID} · {mgr.FULL_NAME} ({mgr.DESIGNATION}, Level{' '}
                  {mgr.HIERARCHY_LEVEL})
                </option>
              ))}
            </select>
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

      {/* Promote Employee Modal with Confirmation Step (Section 9) */}
      <Modal
        isOpen={promotingEmployee !== null}
        onClose={() => {
          setPromotingEmployee(null);
          setPromoConfirmStep(false);
        }}
        title={
          promotingEmployee
            ? `Promote Employee #${promotingEmployee.EMPLOYEE_ID} · ${promotingEmployee.FULL_NAME}`
            : 'Promote Employee'
        }
        subtitle="Updates position title, organisational hierarchy level, and annual salary while recording Promotion History and Salary Adjustment Timeline entries."
        maxWidthClass="max-w-xl"
      >
        {promotingEmployee && (
          <form onSubmit={handlePromoteSubmit} className="space-y-4 text-xs" noValidate>
            <div className="surface-inset rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-[var(--text-secondary)]">Current Position</div>
                <div className="font-semibold text-[var(--text-primary)] mt-0.5">
                  {promotingEmployee.DESIGNATION}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Current Hierarchy Level</div>
                <div className="font-semibold text-[var(--brand-primary)] mt-0.5">
                  Level {promotingEmployee.HIERARCHY_LEVEL}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">Current Annual Salary</div>
                <div className="font-mono-tabular font-semibold text-[var(--text-primary)] mt-0.5">
                  {formatInrSalary(promotingEmployee.ANNUAL_SALARY)}
                </div>
              </div>
            </div>

            {!promoConfirmStep ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="promo-designation"
                      className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                    >
                      New Position / Designation *
                    </label>
                    <input
                      id="promo-designation"
                      list="position-titles-datalist"
                      type="text"
                      value={promoDesignation}
                      onChange={(e) => setPromoDesignation(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="promo-level"
                      className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                    >
                      New Hierarchy Level (1–5) *
                    </label>
                    <select
                      id="promo-level"
                      value={String(promoLevel)}
                      onChange={(e) => setPromoLevel(Number(e.target.value) as HierarchyLevel)}
                      className="input-field"
                    >
                      {([1, 2, 3, 4, 5] as HierarchyLevel[]).map((lvl) => (
                        <option key={lvl} value={String(lvl)}>
                          {HIERARCHY_LEVEL_LABELS[lvl]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label
                        htmlFor="promo-salary"
                        className="block text-xs font-semibold text-[var(--text-primary)]"
                      >
                        New Annual Salary (INR) *
                      </label>
                      <span
                        className={`font-mono-tabular font-bold text-[11px] ${
                          promoSalaryPreviewPct > 0
                            ? 'text-[var(--success)]'
                            : promoSalaryPreviewPct < 0
                              ? 'text-[var(--warning)]'
                              : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {promoSalaryPreviewPct >= 0 ? `+${promoSalaryPreviewPct}%` : `${promoSalaryPreviewPct}%`}
                      </span>
                    </div>
                    <input
                      id="promo-salary"
                      type="number"
                      min="1"
                      step="10000"
                      value={promoSalary}
                      onChange={(e) => setPromoSalary(e.target.value)}
                      className="input-field font-mono-tabular"
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="promo-manager"
                      className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                    >
                      Reporting Manager
                    </label>
                    <select
                      id="promo-manager"
                      value={promoManagerId}
                      onChange={(e) => setPromoManagerId(e.target.value)}
                      className="input-field"
                    >
                      <option value="">None (Reports directly to HR / Leadership)</option>
                      {enrichedEmployees
                        .filter((e) => e.EMPLOYEE_ID !== promotingEmployee.EMPLOYEE_ID)
                        .map((mgr) => (
                          <option key={mgr.EMPLOYEE_ID} value={String(mgr.EMPLOYEE_ID)}>
                            Emp #{mgr.EMPLOYEE_ID} · {mgr.FULL_NAME} (Level {mgr.HIERARCHY_LEVEL})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="promo-notes"
                    className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                  >
                    Promotion Justification / Notes
                  </label>
                  <textarea
                    id="promo-notes"
                    rows={2}
                    value={promoNotes}
                    onChange={(e) => setPromoNotes(e.target.value)}
                    placeholder="Record reason for promotion and salary adjustment..."
                    className="input-field"
                  />
                </div>
              </>
            ) : (
              <div className="rounded-xl p-4 bg-[var(--surface-secondary)] border border-[var(--brand-primary)]/40 space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-[var(--brand-primary)]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Employee Promotion Summary</span>
                </div>
                <p className="text-[var(--text-secondary)]">
                  Please review and confirm the following promotion for{' '}
                  <strong className="text-[var(--text-primary)]">{promotingEmployee.FULL_NAME}</strong>:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono-tabular">
                  <div>
                    Position: {promotingEmployee.DESIGNATION} →{' '}
                    <strong className="text-[var(--text-primary)]">{promoDesignation}</strong>
                  </div>
                  <div>
                    Hierarchy: Level {promotingEmployee.HIERARCHY_LEVEL} →{' '}
                    <strong className="text-[var(--brand-primary)]">Level {promoLevel}</strong>
                  </div>
                  <div>
                    Salary: {formatInrSalary(promotingEmployee.ANNUAL_SALARY)} →{' '}
                    <strong className="text-[var(--success)]">
                      {formatInrSalary(Number(promoSalary))} (
                      {promoSalaryPreviewPct >= 0
                        ? `+${promoSalaryPreviewPct}%`
                        : `${promoSalaryPreviewPct}%`}
                      )
                    </strong>
                  </div>
                  <div>
                    Authorised By:{' '}
                    <strong className="text-[var(--text-primary)]">
                      {currentUser?.fullName ?? 'Karan Anil Saini'}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {promoError && (
              <div
                role="alert"
                className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
              >
                {promoError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
              {promoConfirmStep ? (
                <>
                  <button
                    type="button"
                    onClick={() => setPromoConfirmStep(false)}
                    className="btn-base btn-secondary"
                  >
                    Back to Edit
                  </button>
                  <button type="submit" className="btn-base btn-primary">
                    <Award className="w-4 h-4" />
                    <span>Confirm & Save Promotion</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPromotingEmployee(null)}
                    className="btn-base btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-base btn-primary">
                    Review Promotion
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Employee Modal (HR Can Change Salary, Department, Designation, Hierarchy, Manager, Joining Date, Employment Status, Phone & Qualification) */}
      <Modal
        isOpen={editingEmployee !== null}
        onClose={() => setEditingEmployee(null)}
        title={
          editingEmployee
            ? `HR Edit Employee #${editingEmployee.EMPLOYEE_ID} · ${editingEmployee.FULL_NAME}`
            : 'Edit Employee Details'
        }
        subtitle="HR can update Annual Salary (automatically logged to the Salary Adjustment Timeline), Department, Position, Hierarchy Level, Reporting Manager, and Status."
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
                  list="position-titles-datalist"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="edit-emp-level"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Hierarchy Level (1–5)
                </label>
                <select
                  id="edit-emp-level"
                  value={String(editHierarchyLevel)}
                  onChange={(e) => setEditHierarchyLevel(Number(e.target.value) as HierarchyLevel)}
                  className="input-field"
                >
                  {([1, 2, 3, 4, 5] as HierarchyLevel[]).map((lvl) => (
                    <option key={lvl} value={String(lvl)}>
                      {HIERARCHY_LEVEL_LABELS[lvl]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="edit-emp-manager"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Reporting Manager
                </label>
                <select
                  id="edit-emp-manager"
                  value={editManagerId}
                  onChange={(e) => setEditManagerId(e.target.value)}
                  className="input-field"
                >
                  <option value="">None (Top-Level / Reports to HR)</option>
                  {enrichedEmployees
                    .filter((e) => e.EMPLOYEE_ID !== editingEmployee.EMPLOYEE_ID)
                    .map((mgr) => (
                      <option key={mgr.EMPLOYEE_ID} value={String(mgr.EMPLOYEE_ID)}>
                        Emp #{mgr.EMPLOYEE_ID} · {mgr.FULL_NAME} (Level {mgr.HIERARCHY_LEVEL})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="edit-emp-salary"
                    className="block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Annual Salary (INR) *
                  </label>
                  {Number(editSalary) !== editingEmployee.ANNUAL_SALARY && (
                    <span
                      className={`font-mono-tabular font-bold text-[11px] ${
                        editSalaryPreviewPct >= 0
                          ? 'text-[var(--success)]'
                          : 'text-[var(--warning)]'
                      }`}
                    >
                      {editSalaryPreviewPct >= 0
                        ? `+${editSalaryPreviewPct}%`
                        : `${editSalaryPreviewPct}%`}
                    </span>
                  )}
                </div>
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

            {Number(editSalary) !== editingEmployee.ANNUAL_SALARY && (
              <div>
                <label
                  htmlFor="edit-emp-salary-reason"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Salary Adjustment Reason (Displayed on Employee Salary Timeline)
                </label>
                <input
                  id="edit-emp-salary-reason"
                  type="text"
                  value={editSalaryReason}
                  onChange={(e) => setEditSalaryReason(e.target.value)}
                  placeholder="e.g. Annual merit appraisal and compensation revision"
                  className="input-field"
                />
              </div>
            )}

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

      {/* Employee Details Profile Modal (Stored vs Derived + Visual Timeline of Salary Adjustments + Promotion History) */}
      <Modal
        isOpen={selectedEmployee !== null}
        onClose={() => setSelectedEmployeeId(null)}
        title={
          selectedEmployee
            ? `Employee Profile #${selectedEmployee.EMPLOYEE_ID} · ${selectedEmployee.FULL_NAME}`
            : 'Employee Record'
        }
        subtitle="Displays stored ER_EMPLOYEE columns, hierarchy & reporting relationships, visual timeline of salary adjustments, and promotion history."
        maxWidthClass="max-w-2xl"
      >
        {selectedEmployee && (
          <div className="space-y-5 text-xs">
            {/* Section 1: Stored ER_EMPLOYEE + Hierarchy Metadata */}
            <div className="space-y-2">
              <div className="font-semibold text-[var(--brand-primary)] font-mono-tabular">
                1. Stored Employment Record (ER_EMPLOYEE) & Hierarchy Authority
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
                  <div className="text-[var(--text-secondary)]">CURRENT POSITION</div>
                  <div className="font-semibold mt-0.5">{selectedEmployee.DESIGNATION}</div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">HIERARCHY LEVEL</div>
                  <div className="font-semibold text-[var(--brand-primary)] mt-0.5">
                    {selectedEmployee.HIERARCHY_LABEL}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">REPORTING MANAGER</div>
                  <div className="font-medium mt-0.5">
                    {selectedEmployee.MANAGER_NAME ?? 'None (Reports to HR)'}
                  </div>
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
                <div className="col-span-2 sm:col-span-3 pt-1 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[var(--text-secondary)]">ASSIGNED DEPARTMENT: </span>
                    <strong className="text-[var(--text-primary)]">
                      {selectedEmployee.DEPT_NAME} (DEPT_ID #{selectedEmployee.DEPT_ID})
                    </strong>
                  </div>
                  <div className="font-mono-tabular text-[var(--text-secondary)]">
                    Direct Reports: <strong>{selectedEmployee.DIRECT_REPORTS_COUNT}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Visual Timeline of Salary Adjustments */}
            <div className="space-y-2.5" data-testid="salary-adjustment-timeline">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-[var(--brand-primary)] font-mono-tabular flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  <span>2. Visual Timeline of Salary Adjustments</span>
                </div>
                <span className="text-[11px] font-mono-tabular text-[var(--text-secondary)]">
                  {selectedEmployee.SALARY_HISTORY.length} recorded adjustment(s)
                </span>
              </div>

              {selectedEmployee.SALARY_HISTORY.length === 0 ? (
                <div className="surface-card rounded-xl p-4 text-[var(--text-secondary)] italic">
                  No salary adjustment records available for this employee yet.
                </div>
              ) : (
                <div className="surface-card rounded-xl p-4">
                  <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-[var(--brand-primary)]/30">
                    {selectedEmployee.SALARY_HISTORY.map((adj, index) => {
                      const isPositive = adj.percentageIncrease > 0;
                      const isNegative = adj.percentageIncrease < 0;
                      return (
                        <div key={adj.id} className="relative">
                          {/* Timeline Node Dot */}
                          <div
                            className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              index === selectedEmployee.SALARY_HISTORY.length - 1
                                ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                                : 'bg-[var(--surface-primary)] border-[var(--brand-primary)]'
                            }`}
                          />

                          <div className="surface-inset rounded-xl p-3.5 space-y-2 border border-[var(--border-subtle)]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono-tabular font-bold text-[var(--text-primary)]">
                                  {adj.date}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono-tabular font-bold text-[11px] ${
                                    isPositive
                                      ? 'bg-[var(--success-bg)] text-[var(--success)]'
                                      : isNegative
                                        ? 'bg-[var(--danger-bg)] text-[var(--danger)]'
                                        : 'bg-[var(--surface-secondary)] text-[var(--text-secondary)]'
                                  }`}
                                >
                                  {isPositive
                                    ? `+${adj.percentageIncrease.toFixed(2)}% Increase`
                                    : isNegative
                                      ? `${adj.percentageIncrease.toFixed(2)}% Adjustment`
                                      : '0.00% Baseline'}
                                </span>
                              </div>

                              <div className="text-[11px] text-[var(--text-secondary)]">
                                Authorized by:{' '}
                                <strong className="text-[var(--text-primary)]">
                                  {adj.authorizedBy}
                                </strong>{' '}
                                <span className="font-mono-tabular">
                                  (@{adj.authorizedByUsername})
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <div className="font-mono-tabular text-xs">
                                <span className="text-[var(--text-secondary)]">
                                  {formatInrSalary(adj.previousSalary)}
                                </span>
                                <span className="mx-2 text-[var(--text-secondary)]">→</span>
                                <strong className="text-[var(--brand-primary)]">
                                  {formatInrSalary(adj.newSalary)}
                                </strong>
                              </div>
                              {adj.reason && (
                                <div className="text-[11px] text-[var(--text-secondary)]">
                                  {adj.reason}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Promotion History */}
            <div className="space-y-2">
              <div className="font-semibold text-[var(--text-primary)] font-mono-tabular flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>3. Promotion & Role Progression History</span>
              </div>
              {selectedEmployee.PROMOTION_HISTORY.length === 0 ? (
                <div className="surface-card rounded-xl p-3.5 text-[var(--text-secondary)]">
                  No promotions recorded after initial onboarding.
                </div>
              ) : (
                <div className="surface-card rounded-xl p-3.5 space-y-2.5">
                  {selectedEmployee.PROMOTION_HISTORY.map((promo) => (
                    <div
                      key={promo.id}
                      className="surface-inset rounded-lg p-3 border border-[var(--border-subtle)] space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {promo.previousDesignation} (L{promo.previousLevel}) →{' '}
                          <span className="text-[var(--brand-primary)]">
                            {promo.newDesignation} (L{promo.newLevel})
                          </span>
                        </div>
                        <span className="font-mono-tabular text-[11px] text-[var(--text-secondary)]">
                          {promo.timestamp.split('T')[0]}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
                        <span>
                          Salary: {formatInrSalary(promo.previousSalary)} →{' '}
                          <strong className="text-[var(--text-primary)]">
                            {formatInrSalary(promo.newSalary)}
                          </strong>
                        </span>
                        <span>
                          Authorized by: <strong>{promo.authorizedBy}</strong> (@
                          {promo.authorizedByUsername})
                        </span>
                      </div>
                      {promo.notes && (
                        <div className="text-[11px] text-[var(--text-secondary)] pt-0.5">
                          Note: {promo.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4: Linked Candidate & Application Information */}
            <div className="space-y-2">
              <div className="font-semibold text-[var(--text-primary)] font-mono-tabular">
                4. Linked Candidate & Application Information
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

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <div className="flex flex-wrap items-center gap-2">
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
                {selectedEmployee.EMPLOYMENT_STATUS === 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => {
                      const emp = selectedEmployee;
                      setSelectedEmployeeId(null);
                      openPromoteModal(emp);
                    }}
                    className="btn-base btn-secondary text-xs"
                  >
                    <Award className="w-3.5 h-3.5 text-[var(--success)]" />
                    <span>Promote Employee</span>
                  </button>
                )}
              </div>
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
