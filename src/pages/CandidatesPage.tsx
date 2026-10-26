import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Edit3,
  Eye,
  Plus,
  Search,
  UserPlus,
} from 'lucide-react';
import { CsvExportButton, Modal, StatusIndicator, formatInrSalary } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import { ErCandidate } from '../model/schema';

export const CandidatesPage: React.FC = () => {
  const {
    db,
    candidateApplicationView,
    interviewDetailsView,
    enrichedEmployees,
    addCandidate,
    updateCandidate,
    notify,
  } = useRecruitment();

  // Search, Filters, Sorting, Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [qualificationFilter, setQualificationFilter] = useState('ALL');
  const [experienceFilter, setExperienceFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<'CANDIDATE_ID' | 'FULL_NAME' | 'CREATED_DATE' | 'EXPERIENCE_YEARS'>('CANDIDATE_ID');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [visibleLimit, setVisibleLimit] = useState(15);

  // Add / Edit Candidate Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<ErCandidate | null>(null);
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formQualification, setFormQualification] = useState('');
  const [formExperience, setFormExperience] = useState('0');
  const [formError, setFormError] = useState<string | null>(null);

  // Candidate Details Profile Modal
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);

  // Application counts map
  const appCountsByCandidate = useMemo(() => {
    const map = new Map<number, number>();
    for (const app of db.applications) {
      map.set(app.CANDIDATE_ID, (map.get(app.CANDIDATE_ID) ?? 0) + 1);
    }
    return map;
  }, [db.applications]);

  // Unique qualifications for filter dropdown
  const uniqueQualifications = useMemo(() => {
    const set = new Set<string>();
    for (const c of db.candidates) {
      if (c.QUALIFICATION) set.add(c.QUALIFICATION);
    }
    return Array.from(set).sort();
  }, [db.candidates]);

  const filteredCandidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = db.candidates.filter((c) => {
      if (q) {
        const matchesName = c.FULL_NAME.toLowerCase().includes(q);
        const matchesEmail = c.EMAIL.toLowerCase().includes(q);
        const matchesId = String(c.CANDIDATE_ID).includes(q);
        if (!matchesName && !matchesEmail && !matchesId) return false;
      }
      if (qualificationFilter !== 'ALL' && c.QUALIFICATION !== qualificationFilter) {
        return false;
      }
      if (experienceFilter === '0-1' && c.EXPERIENCE_YEARS > 1) return false;
      if (experienceFilter === '2+' && c.EXPERIENCE_YEARS < 2) return false;
      return true;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'FULL_NAME') {
        cmp = a.FULL_NAME.localeCompare(b.FULL_NAME);
      } else if (sortBy === 'CREATED_DATE') {
        cmp = a.CREATED_DATE.localeCompare(b.CREATED_DATE);
      } else if (sortBy === 'EXPERIENCE_YEARS') {
        cmp = a.EXPERIENCE_YEARS - b.EXPERIENCE_YEARS;
      } else {
        cmp = a.CANDIDATE_ID - b.CANDIDATE_ID;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [db.candidates, searchQuery, qualificationFilter, experienceFilter, sortBy, sortDir]);

  const openAddDialog = () => {
    setEditingCandidate(null);
    setFormFullName('');
    setFormEmail('');
    setFormPhone('');
    setFormQualification('');
    setFormExperience('1');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditDialog = (cand: ErCandidate) => {
    setEditingCandidate(cand);
    setFormFullName(cand.FULL_NAME);
    setFormEmail(cand.EMAIL);
    setFormPhone(cand.PHONE ?? '');
    setFormQualification(cand.QUALIFICATION ?? '');
    setFormExperience(String(cand.EXPERIENCE_YEARS));
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      FULL_NAME: formFullName,
      EMAIL: formEmail,
      PHONE: formPhone || null,
      QUALIFICATION: formQualification || null,
      EXPERIENCE_YEARS: Number(formExperience),
    };

    const res = editingCandidate
      ? updateCandidate(editingCandidate.CANDIDATE_ID, payload)
      : addCandidate(payload);

    if (!res.ok) {
      setFormError(res.error ?? 'Validation failed.');
      return;
    }

    setIsAddModalOpen(false);
  };

  const selectedCandidate = useMemo(
    () => db.candidates.find((c) => c.CANDIDATE_ID === selectedCandidateId) ?? null,
    [db.candidates, selectedCandidateId]
  );

  const selectedCandidateApps = useMemo(
    () =>
      candidateApplicationView.filter((a) => a.CANDIDATE_ID === selectedCandidateId),
    [candidateApplicationView, selectedCandidateId]
  );

  const selectedCandidateInterviews = useMemo(
    () =>
      interviewDetailsView.filter((i) => i.CANDIDATE_ID === selectedCandidateId),
    [interviewDetailsView, selectedCandidateId]
  );

  const selectedCandidateEmployee = useMemo(
    () =>
      enrichedEmployees.find((e) => e.CANDIDATE_ID === selectedCandidateId) ?? null,
    [enrichedEmployees, selectedCandidateId]
  );

  const hasFilters =
    searchQuery.trim() !== '' || qualificationFilter !== 'ALL' || experienceFilter !== 'ALL';

  return (
    <div className="space-y-5">
      {/* Top Action & Filter Bar */}
      <div className="surface-card rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search candidates by name, email, or candidate ID"
              placeholder="Search by candidate name, email, or ID (e.g. 1003, Karan)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field !pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <CsvExportButton
              filename="er_candidates_export.csv"
              headers={[
                'CANDIDATE_ID',
                'FULL_NAME',
                'EMAIL',
                'PHONE',
                'QUALIFICATION',
                'EXPERIENCE_YEARS',
                'CREATED_DATE',
                'APPLICATIONS_COUNT',
              ]}
              rows={filteredCandidates.map((c) => [
                c.CANDIDATE_ID,
                c.FULL_NAME,
                c.EMAIL,
                c.PHONE,
                c.QUALIFICATION,
                c.EXPERIENCE_YEARS,
                c.CREATED_DATE,
                appCountsByCandidate.get(c.CANDIDATE_ID) ?? 0,
              ])}
              onExported={(count) =>
                notify('info', 'CSV Exported', `Exported ${count} candidate record(s).`)
              }
            />

            <button
              type="button"
              onClick={openAddDialog}
              className="btn-base btn-primary"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Candidate</span>
            </button>
          </div>
        </div>

        {/* Secondary Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="cand-qual-filter" className="text-[var(--text-secondary)] font-medium">
                Qualification:
              </label>
              <select
                id="cand-qual-filter"
                value={qualificationFilter}
                onChange={(e) => setQualificationFilter(e.target.value)}
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="ALL">All Qualifications</option>
                {uniqueQualifications.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="cand-exp-filter" className="text-[var(--text-secondary)] font-medium">
                Experience:
              </label>
              <select
                id="cand-exp-filter"
                value={experienceFilter}
                onChange={(e) => setExperienceFilter(e.target.value)}
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="ALL">All Experience Levels</option>
                <option value="0-1">0 – 1 Year</option>
                <option value="2+">2+ Years</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="cand-sort" className="text-[var(--text-secondary)] font-medium">
                Sort by:
              </label>
              <select
                id="cand-sort"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as
                      | 'CANDIDATE_ID'
                      | 'FULL_NAME'
                      | 'CREATED_DATE'
                      | 'EXPERIENCE_YEARS'
                  )
                }
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="CANDIDATE_ID">Candidate ID</option>
                <option value="FULL_NAME">Full Name</option>
                <option value="EXPERIENCE_YEARS">Experience Years</option>
                <option value="CREATED_DATE">Created Date</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                aria-label="Toggle sort direction"
                className="btn-base btn-secondary !py-1 !px-2 text-xs"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{sortDir.toUpperCase()}</span>
              </button>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setQualificationFilter('ALL');
                  setExperienceFilter('ALL');
                }}
                className="btn-base btn-tertiary !py-1 !px-2 text-xs"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="font-mono-tabular text-[var(--text-secondary)]">
            Showing <strong className="text-[var(--text-primary)]">{filteredCandidates.length}</strong> of{' '}
            {db.candidates.length} candidates (ER_CANDIDATE)
          </div>
        </div>
      </div>

      {/* Candidate Directory Table */}
      <div className="surface-card rounded-xl overflow-hidden">
        {filteredCandidates.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              No candidate records match your current search or filter criteria.
            </p>
            <button
              type="button"
              onClick={openAddDialog}
              className="btn-base btn-primary text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Candidate</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)] font-semibold">
                  <th className="py-3.5 px-4 font-mono-tabular">CANDIDATE_ID</th>
                  <th className="py-3.5 px-4">FULL_NAME</th>
                  <th className="py-3.5 px-4">EMAIL</th>
                  <th className="py-3.5 px-4 font-mono-tabular">PHONE</th>
                  <th className="py-3.5 px-4">QUALIFICATION</th>
                  <th className="py-3.5 px-4 font-mono-tabular text-right">EXPERIENCE</th>
                  <th className="py-3.5 px-4 font-mono-tabular">CREATED_DATE</th>
                  <th className="py-3.5 px-4 font-mono-tabular text-center">APPLICATIONS</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredCandidates.slice(0, visibleLimit).map((cand) => {
                  const appCount = appCountsByCandidate.get(cand.CANDIDATE_ID) ?? 0;
                  return (
                    <tr
                      key={cand.CANDIDATE_ID}
                      className="hover:bg-[var(--surface-secondary)]/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono-tabular font-semibold text-[var(--brand-primary)]">
                        #{cand.CANDIDATE_ID}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                        <button
                          type="button"
                          onClick={() => setSelectedCandidateId(cand.CANDIDATE_ID)}
                          className="hover:underline text-left cursor-pointer"
                        >
                          {cand.FULL_NAME}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{cand.EMAIL}</td>
                      <td className="py-3 px-4 font-mono-tabular text-[var(--text-secondary)]">
                        {cand.PHONE ?? '—'}
                      </td>
                      <td className="py-3 px-4">{cand.QUALIFICATION ?? '—'}</td>
                      <td className="py-3 px-4 font-mono-tabular text-right">
                        {cand.EXPERIENCE_YEARS} yr{cand.EXPERIENCE_YEARS === 1 ? '' : 's'}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-[var(--text-secondary)]">
                        {cand.CREATED_DATE}
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-center font-semibold">
                        {appCount}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCandidateId(cand.CANDIDATE_ID)}
                            aria-label={`View profile for ${cand.FULL_NAME}`}
                            className="btn-base btn-secondary !py-1 !px-2.5 text-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Profile</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditDialog(cand)}
                            aria-label={`Edit ${cand.FULL_NAME}`}
                            className="btn-base btn-tertiary !p-1.5"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
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

        {filteredCandidates.length > visibleLimit && (
          <div className="p-3 border-t border-[var(--border-subtle)] text-center">
            <button
              type="button"
              onClick={() => setVisibleLimit((l) => l + 15)}
              className="btn-base btn-secondary text-xs"
            >
              Load More Candidates ({filteredCandidates.length - visibleLimit} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Candidate Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={
          editingCandidate
            ? `Edit Candidate #${editingCandidate.CANDIDATE_ID}`
            : 'Add Candidate (ER_ADD_CANDIDATE)'
        }
        subtitle="Inserts or updates a record in ER_CANDIDATE enforcing EMAIL UNIQUE NOT NULL and EXPERIENCE_YEARS >= 0."
      >
        <form onSubmit={handleSaveCandidate} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="cand-fullname"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Full Name (FULL_NAME) *
            </label>
            <input
              id="cand-fullname"
              type="text"
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              placeholder="e.g. Rohan Verma"
              className="input-field"
              required
            />
          </div>

          <div>
            <label
              htmlFor="cand-email"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Email Address (EMAIL UNIQUE) *
            </label>
            <input
              id="cand-email"
              type="email"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="e.g. rohan.verma@example.com"
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="cand-phone"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Phone (VARCHAR2(15))
              </label>
              <input
                id="cand-phone"
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="e.g. 9000000012"
                className="input-field font-mono-tabular"
              />
            </div>

            <div>
              <label
                htmlFor="cand-experience"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Experience in Years (&gt;= 0) *
              </label>
              <input
                id="cand-experience"
                type="number"
                step="0.5"
                min="0"
                max="60"
                value={formExperience}
                onChange={(e) => setFormExperience(e.target.value)}
                className="input-field font-mono-tabular"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="cand-qualification"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Qualification (QUALIFICATION)
            </label>
            <input
              id="cand-qualification"
              type="text"
              value={formQualification}
              onChange={(e) => setFormQualification(e.target.value)}
              placeholder="e.g. BTech Computer Engineering"
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
              onClick={() => setIsAddModalOpen(false)}
              className="btn-base btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-base btn-primary">
              {editingCandidate ? 'Save Changes' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Candidate Profile Details Modal */}
      <Modal
        isOpen={selectedCandidate !== null}
        onClose={() => setSelectedCandidateId(null)}
        title={
          selectedCandidate
            ? `${selectedCandidate.FULL_NAME} (#${selectedCandidate.CANDIDATE_ID})`
            : 'Candidate Profile'
        }
        subtitle="Normalized ER_CANDIDATE record and derived relationships from ER_APPLICATION, ER_INTERVIEW, and ER_EMPLOYEE."
        maxWidthClass="max-w-2xl"
      >
        {selectedCandidate && (
          <div className="space-y-5 text-xs">
            {/* Stored Model Attributes */}
            <div className="surface-inset rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <div className="text-[var(--text-secondary)]">CANDIDATE_ID</div>
                <div className="font-mono-tabular font-semibold text-sm mt-0.5">
                  #{selectedCandidate.CANDIDATE_ID}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">EMAIL</div>
                <div className="font-medium mt-0.5 break-all">{selectedCandidate.EMAIL}</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">PHONE</div>
                <div className="font-mono-tabular mt-0.5">{selectedCandidate.PHONE ?? '—'}</div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">QUALIFICATION</div>
                <div className="font-medium mt-0.5">
                  {selectedCandidate.QUALIFICATION ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">EXPERIENCE_YEARS</div>
                <div className="font-mono-tabular mt-0.5">
                  {selectedCandidate.EXPERIENCE_YEARS} Years
                </div>
              </div>
              <div>
                <div className="text-[var(--text-secondary)]">CREATED_DATE</div>
                <div className="font-mono-tabular mt-0.5">{selectedCandidate.CREATED_DATE}</div>
              </div>
            </div>

            {/* Associated Applications */}
            <div className="space-y-2">
              <div className="font-semibold text-[var(--text-primary)]">
                Associated Applications ({selectedCandidateApps.length})
              </div>
              {selectedCandidateApps.length === 0 ? (
                <div className="surface-card rounded-lg p-3 text-[var(--text-secondary)]">
                  No applications submitted by this candidate yet.
                </div>
              ) : (
                <div className="surface-card rounded-xl divide-y divide-[var(--border-subtle)]">
                  {selectedCandidateApps.map((app) => (
                    <div
                      key={app.APPLICATION_ID}
                      className="p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          Application #{app.APPLICATION_ID} · {app.JOB_TITLE}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          Department: {app.DEPT_NAME} · Applied: {app.APPLICATION_DATE} · Remarks:{' '}
                          {app.REMARKS ?? '—'}
                        </div>
                      </div>
                      <StatusIndicator status={app.APPLICATION_STATUS} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Associated Interviews */}
            <div className="space-y-2">
              <div className="font-semibold text-[var(--text-primary)]">
                Linked Interview Rounds ({selectedCandidateInterviews.length})
              </div>
              {selectedCandidateInterviews.length === 0 ? (
                <div className="surface-card rounded-lg p-3 text-[var(--text-secondary)]">
                  No interviews scheduled for this candidate.
                </div>
              ) : (
                <div className="surface-card rounded-xl divide-y divide-[var(--border-subtle)]">
                  {selectedCandidateInterviews.map((intv) => (
                    <div
                      key={intv.INTERVIEW_ID}
                      className="p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          Interview #{intv.INTERVIEW_ID} · Round {intv.INTERVIEW_ROUND} (
                          {intv.INTERVIEW_MODE})
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          Date: {intv.INTERVIEW_DATE} · Interviewer: {intv.INTERVIEWER_NAME} ·
                          Score: {intv.SCORE !== null ? `${intv.SCORE}/100` : 'Pending'}
                        </div>
                      </div>
                      <StatusIndicator status={intv.INTERVIEW_STATUS} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Associated Employee Record */}
            <div className="space-y-2">
              <div className="font-semibold text-[var(--text-primary)]">
                Linked Employee Record (ER_EMPLOYEE)
              </div>
              {!selectedCandidateEmployee ? (
                <div className="surface-card rounded-lg p-3 text-[var(--text-secondary)]">
                  No onboarded employee record associated with this candidate.
                </div>
              ) : (
                <div className="surface-card rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[var(--text-primary)]">
                      Employee #{selectedCandidateEmployee.EMPLOYEE_ID} ·{' '}
                      {selectedCandidateEmployee.DESIGNATION}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)]">
                      Joined: {selectedCandidateEmployee.JOINING_DATE} · Salary:{' '}
                      {formatInrSalary(selectedCandidateEmployee.ANNUAL_SALARY)} · Linked App #
                      {selectedCandidateEmployee.APPLICATION_ID}
                    </div>
                  </div>
                  <StatusIndicator status={selectedCandidateEmployee.EMPLOYMENT_STATUS} />
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
