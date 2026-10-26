import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import { StatusIndicator } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import { HIERARCHY_LEVEL_LABELS, UserRole } from '../model/schema';

export const AccountDirectoryPage: React.FC = () => {
  const { db, enrichedEmployees } = useRecruitment();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const enrichedAccounts = useMemo(() => {
    const empById = new Map(enrichedEmployees.map((e) => [e.EMPLOYEE_ID, e]));
    const empByCandId = new Map(enrichedEmployees.map((e) => [e.CANDIDATE_ID, e]));

    return (db.accounts ?? []).map((acc) => {
      const linkedEmp =
        (acc.employeeId ? empById.get(acc.employeeId) : undefined) ??
        (acc.candidateId ? empByCandId.get(acc.candidateId) : undefined) ??
        null;

      const resolvedName = acc.fullName || acc.displayName || acc.username;

      return {
        ...acc,
        resolvedName,
        linkedEmployeeId: linkedEmp ? linkedEmp.EMPLOYEE_ID : (acc.employeeId ?? null),
        currentPosition:
          acc.role === 'HR'
            ? 'HR Administrator'
            : linkedEmp
              ? linkedEmp.DESIGNATION
              : acc.role === 'CANDIDATE'
                ? 'Job Applicant'
                : 'Employee',
        hierarchyLevel: linkedEmp ? linkedEmp.HIERARCHY_LEVEL : null,
        accountStatus: linkedEmp ? linkedEmp.EMPLOYMENT_STATUS : ('ACTIVE' as const),
      };
    });
  }, [db.accounts, enrichedEmployees]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedAccounts.filter((acc) => {
      if (roleFilter !== 'ALL' && acc.role !== roleFilter) return false;
      if (q) {
        const matchName = acc.resolvedName.toLowerCase().includes(q);
        const matchUser = acc.username.toLowerCase().includes(q);
        const matchPos = acc.currentPosition.toLowerCase().includes(q);
        const matchCand = acc.candidateId ? String(acc.candidateId).includes(q) : false;
        const matchEmp = acc.linkedEmployeeId ? String(acc.linkedEmployeeId).includes(q) : false;
        if (!matchName && !matchUser && !matchPos && !matchCand && !matchEmp) return false;
      }
      return true;
    });
  }, [enrichedAccounts, searchQuery, roleFilter]);

  const roleCounts = useMemo(() => {
    return {
      total: enrichedAccounts.length,
      hr: enrichedAccounts.filter((a) => a.role === 'HR').length,
      employee: enrichedAccounts.filter((a) => a.role === 'EMPLOYEE').length,
      candidate: enrichedAccounts.filter((a) => a.role === 'CANDIDATE').length,
    };
  }, [enrichedAccounts]);

  return (
    <div className="space-y-6">
      {/* Header & Role Summary Strip */}
      <section className="surface-card rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--brand-primary)]">
            <ShieldCheck className="w-4 h-4" />
            <span>HR Internal Account Directory · Prototype Access Control</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            View all provisioned accounts in this browser&apos;s demonstration state, including
            linked <code className="font-mono-tabular">ER_CANDIDATE</code> and{' '}
            <code className="font-mono-tabular">ER_EMPLOYEE</code> identifiers and hierarchy levels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="surface-inset px-3 py-1.5 rounded-lg">
            Total Accounts:{' '}
            <strong className="font-mono-tabular text-[var(--text-primary)]">
              {roleCounts.total}
            </strong>
          </span>
          <span className="surface-inset px-3 py-1.5 rounded-lg">
            HR:{' '}
            <strong className="font-mono-tabular text-[var(--brand-primary)]">
              {roleCounts.hr}
            </strong>
          </span>
          <span className="surface-inset px-3 py-1.5 rounded-lg">
            Employees:{' '}
            <strong className="font-mono-tabular text-[var(--success)]">
              {roleCounts.employee}
            </strong>
          </span>
          <span className="surface-inset px-3 py-1.5 rounded-lg">
            Candidates:{' '}
            <strong className="font-mono-tabular text-[var(--text-primary)]">
              {roleCounts.candidate}
            </strong>
          </span>
        </div>
      </section>

      {/* Search & Filter Toolbar */}
      <section className="surface-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by full name, username, position, candidate ID, or employee ID..."
            aria-label="Search accounts"
            className="input-field !pl-10"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            aria-label="Filter accounts by role"
            className="input-field sm:w-48"
          >
            <option value="ALL">All Account Roles</option>
            <option value="HR">HR Role</option>
            <option value="EMPLOYEE">EMPLOYEE Role</option>
            <option value="CANDIDATE">CANDIDATE Role</option>
          </select>

          {(searchQuery || roleFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setRoleFilter('ALL');
              }}
              className="btn-base btn-tertiary text-xs"
            >
              Reset
            </button>
          )}
        </div>
      </section>

      {/* Accounts Table */}
      <section className="surface-card rounded-2xl overflow-hidden">
        {filteredAccounts.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="text-sm font-display font-bold text-[var(--text-primary)]">
              No matching accounts found
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Adjust your search query or role filter to view provisioned prototype accounts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Username</th>
                  <th className="py-3.5 px-4">Account Role</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Linked Candidate ID</th>
                  <th className="py-3.5 px-4">Linked Employee ID</th>
                  <th className="py-3.5 px-4">Current Position</th>
                  <th className="py-3.5 px-4">Hierarchy Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {filteredAccounts.map((acc) => {
                  const roleBadgeColor: Record<UserRole, string> = {
                    HR: 'bg-[var(--brand-subtle)] text-[var(--brand-primary)] border-[var(--border-emphasis)]',
                    EMPLOYEE:
                      'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success)]/30',
                    CANDIDATE:
                      'bg-[var(--surface-secondary)] text-[var(--text-primary)] border-[var(--border-subtle)]',
                  };

                  return (
                    <tr
                      key={acc.username}
                      className="hover:bg-[var(--surface-secondary)]/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-bold text-[var(--text-primary)]">
                        {acc.resolvedName}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular font-semibold text-[var(--brand-primary)]">
                        @{acc.username}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${roleBadgeColor[acc.role]}`}
                        >
                          {acc.role === 'HR' && <ShieldCheck className="w-3.5 h-3.5" />}
                          {acc.role === 'EMPLOYEE' && <UserCheck className="w-3.5 h-3.5" />}
                          {acc.role === 'CANDIDATE' && <Users className="w-3.5 h-3.5" />}
                          <span>{acc.role}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusIndicator status={acc.accountStatus} />
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-[var(--text-secondary)]">
                        {acc.candidateId ? `#${acc.candidateId}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono-tabular text-[var(--text-secondary)]">
                        {acc.linkedEmployeeId ? `#${acc.linkedEmployeeId}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                        {acc.currentPosition}
                      </td>
                      <td className="py-3.5 px-4">
                        {acc.role === 'HR' ? (
                          <span className="text-xs font-semibold text-[var(--brand-primary)]">
                            HR Authority (Highest)
                          </span>
                        ) : acc.hierarchyLevel ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--brand-subtle)] text-[var(--brand-primary)] font-semibold">
                            {HIERARCHY_LEVEL_LABELS[acc.hierarchyLevel]}
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Prototype Authentication Note (No Plaintext Passwords Displayed) */}
      <section className="surface-card rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-xs text-[var(--text-secondary)]">
        <KeyRound className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <span>Prototype Authentication Convention & Role Transitions</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success)]" />
          </div>
          <p className="leading-relaxed">
            For security discipline, plaintext passwords are never displayed in this directory or
            logged to the console. In this local prototype, accounts follow the{' '}
            <code className="font-mono-tabular">firstname.lastname</code> convention. When a
            candidate is hired via <code className="font-mono-tabular">ER_HIRE_CANDIDATE</code> or
            the HR Hiring workflow, their existing candidate account automatically transitions to
            the <code className="font-mono-tabular">EMPLOYEE</code> role and links to their new{' '}
            <code className="font-mono-tabular">EMPLOYEE_ID</code> without creating duplicate
            accounts.
          </p>
        </div>
      </section>
    </div>
  );
};
