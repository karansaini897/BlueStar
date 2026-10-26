import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CalendarPlus,
  Edit3,
  List,
  Search,
} from 'lucide-react';
import { CsvExportButton, Modal, StatusIndicator } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import {
  ALLOWED_INTERVIEW_MODES,
  ALLOWED_INTERVIEW_STATUSES,
  ErVInterviewDetails,
  InterviewMode,
  InterviewStatus,
} from '../model/schema';
import { getTodayIsoDate } from '../model/operations';

export const InterviewsPage: React.FC = () => {
  const {
    candidateApplicationView,
    interviewDetailsView,
    scheduleInterview,
    updateInterviewFeedback,
    notify,
  } = useRecruitment();

  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');

  // Schedule Interview Modal (ER_SCHEDULE_INTERVIEW)
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [schedAppId, setSchedAppId] = useState('');
  const [schedRound, setSchedRound] = useState('1');
  const [schedDate, setSchedDate] = useState(getTodayIsoDate());
  const [schedMode, setSchedMode] = useState<InterviewMode>('ONLINE');
  const [schedInterviewer, setSchedInterviewer] = useState('');
  const [schedRoundLabel, setSchedRoundLabel] = useState('');
  const [schedError, setSchedError] = useState<string | null>(null);

  // Edit Feedback & Score Modal
  const [editingInterview, setEditingInterview] = useState<ErVInterviewDetails | null>(null);
  const [fbScore, setFbScore] = useState('');
  const [fbText, setFbText] = useState('');
  const [fbStatus, setFbStatus] = useState<InterviewStatus>('COMPLETED');
  const [fbInterviewer, setFbInterviewer] = useState('');
  const [fbDate, setFbDate] = useState('');
  const [fbMode, setFbMode] = useState<InterviewMode>('ONLINE');
  const [fbError, setFbError] = useState<string | null>(null);

  const filteredInterviews = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return interviewDetailsView.filter((i) => {
      if (q) {
        const matchCand = i.FULL_NAME.toLowerCase().includes(q);
        const matchInt = (i.INTERVIEWER_NAME ?? '').toLowerCase().includes(q);
        const matchJob = i.JOB_TITLE.toLowerCase().includes(q);
        const matchId =
          String(i.INTERVIEW_ID).includes(q) || String(i.APPLICATION_ID).includes(q);
        if (!matchCand && !matchInt && !matchJob && !matchId) return false;
      }
      if (statusFilter !== 'ALL' && i.INTERVIEW_STATUS !== statusFilter) return false;
      if (modeFilter !== 'ALL' && i.INTERVIEW_MODE !== modeFilter) return false;
      return true;
    });
  }, [interviewDetailsView, searchQuery, statusFilter, modeFilter]);

  // Date-grouped interviews for Calendar/Schedule View
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, ErVInterviewDetails[]>();
    const sorted = [...filteredInterviews].sort((a, b) =>
      a.INTERVIEW_DATE.localeCompare(b.INTERVIEW_DATE)
    );
    for (const item of sorted) {
      const list = groups.get(item.INTERVIEW_DATE) ?? [];
      list.push(item);
      groups.set(item.INTERVIEW_DATE, list);
    }
    return Array.from(groups.entries());
  }, [filteredInterviews]);

  const openScheduleModal = () => {
    const firstApp = candidateApplicationView[0];
    setSchedAppId(String(firstApp?.APPLICATION_ID ?? '5001'));
    setSchedRound('1');
    setSchedDate(getTodayIsoDate());
    setSchedMode('ONLINE');
    setSchedInterviewer('Rahul Mehta');
    setSchedRoundLabel('Technical Round');
    setSchedError(null);
    setIsScheduleOpen(true);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSchedError(null);

    const res = scheduleInterview({
      APPLICATION_ID: Number(schedAppId),
      INTERVIEW_ROUND: Number(schedRound),
      INTERVIEW_DATE: schedDate,
      INTERVIEW_MODE: schedMode,
      INTERVIEWER_NAME: schedInterviewer,
      _roundLabel: schedRoundLabel || undefined,
    });

    if (!res.ok) {
      setSchedError(res.error ?? 'Failed to schedule interview.');
      return;
    }
    setIsScheduleOpen(false);
  };

  const openFeedbackModal = (intv: ErVInterviewDetails) => {
    setEditingInterview(intv);
    setFbScore(intv.SCORE !== null ? String(intv.SCORE) : '');
    setFbText(intv.FEEDBACK ?? '');
    setFbStatus(intv.INTERVIEW_STATUS);
    setFbInterviewer(intv.INTERVIEWER_NAME ?? '');
    setFbDate(intv.INTERVIEW_DATE);
    setFbMode(intv.INTERVIEW_MODE);
    setFbError(null);
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInterview) return;
    setFbError(null);

    const res = updateInterviewFeedback(editingInterview.INTERVIEW_ID, {
      SCORE: fbScore,
      FEEDBACK: fbText,
      INTERVIEW_STATUS: fbStatus,
      INTERVIEWER_NAME: fbInterviewer,
      INTERVIEW_DATE: fbDate,
      INTERVIEW_MODE: fbMode,
    });

    if (!res.ok) {
      setFbError(res.error ?? 'Failed to update interview.');
      return;
    }
    setEditingInterview(null);
  };

  return (
    <div className="space-y-5">
      {/* Top Action & Filter Bar */}
      <div className="surface-card rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Search interviews by candidate, interviewer, job, or ID"
              placeholder="Search by candidate, interviewer, job title, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field !pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Toggle */}
            <div className="inline-flex items-center p-1 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Date Schedule</span>
              </button>
            </div>

            <CsvExportButton
              filename="er_interviews_export.csv"
              headers={[
                'INTERVIEW_ID',
                'APPLICATION_ID',
                'CANDIDATE_ID',
                'FULL_NAME',
                'JOB_TITLE',
                'INTERVIEW_ROUND',
                'INTERVIEW_DATE',
                'INTERVIEW_MODE',
                'INTERVIEWER_NAME',
                'SCORE',
                'FEEDBACK',
                'INTERVIEW_STATUS',
              ]}
              rows={filteredInterviews.map((i) => [
                i.INTERVIEW_ID,
                i.APPLICATION_ID,
                i.CANDIDATE_ID,
                i.FULL_NAME,
                i.JOB_TITLE,
                i.INTERVIEW_ROUND,
                i.INTERVIEW_DATE,
                i.INTERVIEW_MODE,
                i.INTERVIEWER_NAME,
                i.SCORE,
                i.FEEDBACK,
                i.INTERVIEW_STATUS,
              ])}
              onExported={(c) =>
                notify('info', 'CSV Exported', `Exported ${c} interview record(s).`)
              }
            />

            <button type="button" onClick={openScheduleModal} className="btn-base btn-primary">
              <CalendarPlus className="w-4 h-4" />
              <span>Schedule Interview</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)] text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="int-status-filter" className="text-[var(--text-secondary)] font-medium">
                Status:
              </label>
              <select
                id="int-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="ALL">All Statuses</option>
                {ALLOWED_INTERVIEW_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="int-mode-filter" className="text-[var(--text-secondary)] font-medium">
                Mode:
              </label>
              <select
                id="int-mode-filter"
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value)}
                className="input-field !w-auto !py-1 !px-2.5 text-xs"
              >
                <option value="ALL">All Modes</option>
                {ALLOWED_INTERVIEW_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {(searchQuery !== '' || statusFilter !== 'ALL' || modeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setModeFilter('ALL');
                }}
                className="btn-base btn-tertiary !py-1 !px-2 text-xs"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="font-mono-tabular text-[var(--text-secondary)]">
            Showing <strong className="text-[var(--text-primary)]">{filteredInterviews.length}</strong> of{' '}
            {interviewDetailsView.length} interviews (ER_V_INTERVIEW_DETAILS)
          </div>
        </div>
      </div>

      {/* Main Content: Table or Date-Grouped Schedule View */}
      {filteredInterviews.length === 0 ? (
        <div className="surface-card rounded-xl p-10 text-center space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            No interview sessions match your current filter selection.
          </p>
          <button
            type="button"
            onClick={openScheduleModal}
            className="btn-base btn-primary text-xs"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>Schedule Interview</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="surface-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-secondary)]/60 text-[var(--text-secondary)] font-semibold">
                  <th className="py-3.5 px-4 font-mono-tabular">INTERVIEW_ID</th>
                  <th className="py-3.5 px-4">CANDIDATE</th>
                  <th className="py-3.5 px-4 font-mono-tabular">APP_ID</th>
                  <th className="py-3.5 px-4">JOB_TITLE</th>
                  <th className="py-3.5 px-4 font-mono-tabular text-center">ROUND</th>
                  <th className="py-3.5 px-4 font-mono-tabular">DATE</th>
                  <th className="py-3.5 px-4">MODE</th>
                  <th className="py-3.5 px-4">INTERVIEWER</th>
                  <th className="py-3.5 px-4 font-mono-tabular text-right">SCORE</th>
                  <th className="py-3.5 px-4">FEEDBACK</th>
                  <th className="py-3.5 px-4">STATUS</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredInterviews.map((intv) => (
                  <tr
                    key={intv.INTERVIEW_ID}
                    className="hover:bg-[var(--surface-secondary)]/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono-tabular font-semibold text-[var(--brand-primary)]">
                      #{intv.INTERVIEW_ID}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {intv.FULL_NAME}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">{intv.EMAIL}</div>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular">#{intv.APPLICATION_ID}</td>
                    <td className="py-3 px-4 font-medium">{intv.JOB_TITLE}</td>
                    <td className="py-3 px-4 font-mono-tabular text-center">
                      <span className="font-bold">{intv.INTERVIEW_ROUND}</span>
                      {intv._roundLabel && (
                        <div className="text-[10px] text-[var(--text-secondary)]">
                          {intv._roundLabel}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-[var(--text-secondary)]">
                      {intv.INTERVIEW_DATE}
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={intv.INTERVIEW_MODE} />
                    </td>
                    <td className="py-3 px-4 font-medium">{intv.INTERVIEWER_NAME ?? '—'}</td>
                    <td className="py-3 px-4 font-mono-tabular text-right font-semibold">
                      {intv.SCORE !== null ? `${intv.SCORE} / 100` : '—'}
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)] max-w-[180px] truncate">
                      {intv.FEEDBACK ?? '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusIndicator status={intv.INTERVIEW_STATUS} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openFeedbackModal(intv)}
                        aria-label={`Evaluate or edit Interview #${intv.INTERVIEW_ID}`}
                        className="btn-base btn-secondary !py-1 !px-2.5 text-xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Score / Feedback</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedByDate.map(([dateStr, items]) => (
            <div key={dateStr} className="surface-card rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
                <span className="font-mono-tabular font-bold text-sm text-[var(--brand-primary)]">
                  {dateStr}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {items.length} session{items.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="space-y-2.5">
                {items.map((intv) => (
                  <div
                    key={intv.INTERVIEW_ID}
                    className="surface-inset rounded-xl p-3.5 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {intv.FULL_NAME} · Round {intv.INTERVIEW_ROUND}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          App #{intv.APPLICATION_ID} · {intv.JOB_TITLE}
                        </div>
                      </div>
                      <StatusIndicator status={intv.INTERVIEW_STATUS} />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border-subtle)]">
                      <span>Interviewer: {intv.INTERVIEWER_NAME}</span>
                      <span className="font-mono-tabular">
                        {intv.INTERVIEW_MODE} ·{' '}
                        {intv.SCORE !== null ? `${intv.SCORE}/100` : 'Unscored'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openFeedbackModal(intv)}
                      className="btn-base btn-secondary w-full !py-1 text-xs"
                    >
                      Update Score & Feedback
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Interview Modal (ER_SCHEDULE_INTERVIEW) */}
      <Modal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Schedule Interview (ER_SCHEDULE_INTERVIEW)"
        subtitle="Inserts into ER_INTERVIEW with numeric INTERVIEW_ROUND and enforces UNIQUE (APPLICATION_ID, INTERVIEW_ROUND)."
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="sched-app-select"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Select Application (APPLICATION_ID) *
            </label>
            <select
              id="sched-app-select"
              value={schedAppId}
              onChange={(e) => setSchedAppId(e.target.value)}
              className="input-field"
              required
            >
              {candidateApplicationView.map((app) => (
                <option key={app.APPLICATION_ID} value={String(app.APPLICATION_ID)}>
                  App #{app.APPLICATION_ID} · {app.FULL_NAME} — {app.JOB_TITLE} (
                  {app.APPLICATION_STATUS})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="sched-round-input"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Interview Round (Numeric) *
              </label>
              <input
                id="sched-round-input"
                type="number"
                min="1"
                max="10"
                step="1"
                value={schedRound}
                onChange={(e) => setSchedRound(e.target.value)}
                className="input-field font-mono-tabular"
                required
              />
            </div>

            <div>
              <label
                htmlFor="sched-mode-select"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Interview Mode (ONLINE / OFFLINE) *
              </label>
              <select
                id="sched-mode-select"
                value={schedMode}
                onChange={(e) => setSchedMode(e.target.value as InterviewMode)}
                className="input-field"
              >
                {ALLOWED_INTERVIEW_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="sched-date-input"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Interview Date (INTERVIEW_DATE) *
              </label>
              <input
                id="sched-date-input"
                type="date"
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                className="input-field font-mono-tabular"
                required
              />
            </div>

            <div>
              <label
                htmlFor="sched-interviewer-input"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Interviewer Name *
              </label>
              <input
                id="sched-interviewer-input"
                type="text"
                value={schedInterviewer}
                onChange={(e) => setSchedInterviewer(e.target.value)}
                placeholder="e.g. Rahul Mehta"
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="sched-round-label"
              className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
            >
              Display Round Label (Frontend-Only Metadata, Optional)
            </label>
            <input
              id="sched-round-label"
              type="text"
              value={schedRoundLabel}
              onChange={(e) => setSchedRoundLabel(e.target.value)}
              placeholder="e.g. Technical Round"
              className="input-field"
            />
          </div>

          {schedError && (
            <div
              role="alert"
              className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
            >
              {schedError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setIsScheduleOpen(false)}
              className="btn-base btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-base btn-primary">
              Schedule Interview
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Score & Feedback Modal */}
      <Modal
        isOpen={editingInterview !== null}
        onClose={() => setEditingInterview(null)}
        title={
          editingInterview
            ? `Evaluate Interview #${editingInterview.INTERVIEW_ID} (Round ${editingInterview.INTERVIEW_ROUND})`
            : 'Update Interview Feedback'
        }
        subtitle="Enforces ER_INT_SCORE_CK (SCORE IS NULL OR SCORE BETWEEN 0 AND 100) and ER_INT_STATUS_CK."
      >
        {editingInterview && (
          <form onSubmit={handleFeedbackSubmit} className="space-y-4" noValidate>
            <div className="surface-inset rounded-xl p-3.5 text-xs space-y-1">
              <div className="font-semibold text-[var(--text-primary)]">
                Candidate: {editingInterview.FULL_NAME} (App #{editingInterview.APPLICATION_ID})
              </div>
              <div className="text-[var(--text-secondary)]">
                Job: {editingInterview.JOB_TITLE} · Round {editingInterview.INTERVIEW_ROUND}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="fb-score-input"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Score (0 – 100, or leave empty)
                </label>
                <input
                  id="fb-score-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={fbScore}
                  onChange={(e) => setFbScore(e.target.value)}
                  placeholder="e.g. 85"
                  className="input-field font-mono-tabular"
                />
              </div>

              <div>
                <label
                  htmlFor="fb-status-select"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Interview Status (INTERVIEW_STATUS) *
                </label>
                <select
                  id="fb-status-select"
                  value={fbStatus}
                  onChange={(e) => setFbStatus(e.target.value as InterviewStatus)}
                  className="input-field"
                >
                  {ALLOWED_INTERVIEW_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="fb-interviewer-input"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Interviewer Name
                </label>
                <input
                  id="fb-interviewer-input"
                  type="text"
                  value={fbInterviewer}
                  onChange={(e) => setFbInterviewer(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label
                  htmlFor="fb-date-input"
                  className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
                >
                  Interview Date
                </label>
                <input
                  id="fb-date-input"
                  type="date"
                  value={fbDate}
                  onChange={(e) => setFbDate(e.target.value)}
                  className="input-field font-mono-tabular"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="fb-text-input"
                className="block text-xs font-semibold text-[var(--text-primary)] mb-1"
              >
                Feedback (FEEDBACK VARCHAR2(500))
              </label>
              <textarea
                id="fb-text-input"
                rows={3}
                value={fbText}
                onChange={(e) => setFbText(e.target.value)}
                placeholder="Enter evaluation summary and technical notes..."
                className="input-field"
              />
            </div>

            {fbError && (
              <div
                role="alert"
                className="rounded-lg p-3 text-xs bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger)]/30"
              >
                {fbError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setEditingInterview(null)}
                className="btn-base btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-base btn-primary">
                Save Evaluation
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
