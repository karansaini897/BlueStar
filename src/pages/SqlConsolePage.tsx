import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Database,
  History,
  Play,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Terminal,
  Trash2,
} from 'lucide-react';
import { Modal } from '../components/ui';
import { useRecruitment } from '../context/RecruitmentContext';
import {
  createSqlSessionState,
  executeSingleSqlStatement,
  SqlExecutionResult,
  SqlSessionState,
} from '../model/sqlInterpreter';

interface ConsoleHistoryEntry {
  id: string;
  commandText: string;
  timestamp: string;
  ok: boolean;
  rowCount: number;
  durationMs: number;
  summary: string;
}

const SAMPLE_SQL_SNIPPETS: Array<{ label: string; category: string; sql: string }> = [
  {
    label: 'SELECT Candidates',
    category: 'Query',
    sql: 'SELECT CANDIDATE_ID, FULL_NAME, EMAIL, QUALIFICATION, EXPERIENCE_YEARS FROM ER_CANDIDATE ORDER BY CANDIDATE_ID;',
  },
  {
    label: 'View: Candidate Applications',
    category: 'View',
    sql: 'SELECT * FROM ER_V_CANDIDATE_APPLICATION ORDER BY APPLICATION_ID;',
  },
  {
    label: 'View: Interview Details',
    category: 'View',
    sql: 'SELECT * FROM ER_V_INTERVIEW_DETAILS;',
  },
  {
    label: 'Group By Application Status',
    category: 'Aggregate',
    sql: 'SELECT APPLICATION_STATUS, COUNT(*) AS TOTAL FROM ER_APPLICATION GROUP BY APPLICATION_STATUS ORDER BY APPLICATION_STATUS;',
  },
  {
    label: 'Dept Open Vacancies (LEFT JOIN)',
    category: 'Join',
    sql: "SELECT D.DEPT_NAME, COUNT(J.JOB_ID) AS TOTAL_JOBS, NVL(SUM(J.VACANCIES), 0) AS TOTAL_VACANCIES FROM ER_DEPARTMENT D LEFT JOIN ER_JOB J ON D.DEPT_ID = J.DEPT_ID AND J.JOB_STATUS = 'OPEN' GROUP BY D.DEPT_ID, D.DEPT_NAME ORDER BY D.DEPT_NAME;",
  },
  {
    label: 'DESC ER_EMPLOYEE',
    category: 'Schema',
    sql: 'DESC ER_EMPLOYEE;',
  },
  {
    label: 'SHOW TABLES',
    category: 'Schema',
    sql: 'SHOW TABLES;',
  },
  {
    label: 'EXEC ER_APPLICATION_REPORT',
    category: 'Procedure',
    sql: 'EXEC ER_APPLICATION_REPORT;',
  },
  {
    label: 'EXEC ER_ADD_CANDIDATE',
    category: 'Procedure',
    sql: "EXEC ER_ADD_CANDIDATE('Rohan Mehta', 'rohan.mehta@example.com', '9876543210', 'MTech Software Engineering', 3);",
  },
  {
    label: 'UPDATE Job Title',
    category: 'DML',
    sql: "UPDATE ER_JOB SET JOB_TITLE = 'Senior Software Developer' WHERE JOB_ID = 102;",
  },
  {
    label: 'INSERT Department',
    category: 'DML',
    sql: "INSERT INTO ER_DEPARTMENT (DEPT_ID, DEPT_NAME) VALUES (8, 'Quality Assurance');",
  },
];

export const SqlConsolePage: React.FC = () => {
  const { db, replaceDatabaseState, currentUser, notify } = useRecruitment();

  const [sqlInput, setSqlInput] = useState<string>(
    'SELECT * FROM ER_V_CANDIDATE_APPLICATION ORDER BY APPLICATION_ID;'
  );
  const [autoCommitShared, setAutoCommitShared] = useState<boolean>(true);
  const [session, setSession] = useState<SqlSessionState>(() =>
    createSqlSessionState(db, currentUser?.username?.toUpperCase() || 'KARAN.SAINI')
  );
  const [history, setHistory] = useState<ConsoleHistoryEntry[]>([]);
  const [lastResult, setLastResult] = useState<SqlExecutionResult | null>(null);
  const [pendingConfirmSql, setPendingConfirmSql] = useState<{
    sql: string;
    promptText: string;
  } | null>(null);

  // Keep session's base committed state synced when external pages mutate db and no uncommitted changes are pending
  const effectiveSession: SqlSessionState = useMemo(() => {
    if (session.uncommittedCount === 0) {
      return {
        ...session,
        committedState: db,
        workingState: db,
      };
    }
    return session;
  }, [db, session]);

  const runSqlStatement = (statementToRun: string, confirmedDelete = false) => {
    const result = executeSingleSqlStatement(statementToRun, effectiveSession, {
      confirmedDelete,
      autoCommit: autoCommitShared,
    });

    if (result.requiresConfirmation && result.confirmationPrompt) {
      setPendingConfirmSql({
        sql: statementToRun,
        promptText: result.confirmationPrompt.summary,
      });
      return;
    }

    setLastResult(result);
    setSession(result.session);

    const historyItem: ConsoleHistoryEntry = {
      id: `sql-hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      commandText: statementToRun.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ok: result.ok,
      rowCount: result.rows ? result.rows.length : (result.rowsAffected ?? 0),
      durationMs: result.durationMs,
      summary: result.message,
    };
    setHistory((prev) => [historyItem, ...prev].slice(0, 30));

    // If committed to shared state (via autoCommit or explicit COMMIT), update shared RecruitmentContext
    if (result.ok && (result.didCommitToSharedState || result.commandType === 'COMMIT')) {
      replaceDatabaseState(
        result.session.committedState,
        `SQL Console (${result.commandType}) applied to shared recruitment state.`
      );
    }
  };

  const handleExecuteClick = () => {
    if (!sqlInput.trim()) return;
    runSqlStatement(sqlInput, false);
  };

  const handleQuickTransaction = (cmd: string) => {
    runSqlStatement(cmd, false);
  };

  const handleCopyResults = () => {
    if (!lastResult) return;
    const text =
      lastResult.rows && lastResult.columns
        ? [
            lastResult.columns.join('\t'),
            ...lastResult.rows.map((r) => lastResult.columns!.map((c) => r[c] ?? 'NULL').join('\t')),
          ].join('\n')
        : lastResult.message;
    navigator.clipboard?.writeText(text);
    notify('info', 'Output Copied', 'SQL console output copied to clipboard.');
  };

  return (
    <div className="space-y-6">
      {/* Mandatory Simulation Disclosure Banner */}
      <section
        aria-label="Database simulation disclosure"
        className="surface-card rounded-2xl p-4 sm:p-5 border-l-4 border-l-[var(--brand-primary)] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-mono-tabular font-bold uppercase tracking-wider text-[var(--brand-primary)]">
            <Database className="w-4 h-4" />
            <span>LOCAL SQL SIMULATION · NOT CONNECTED TO ORACLE</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Commands run against this browser&apos;s local recruitment data. Changes are shared with
            the website&apos;s interfaces but are not synchronised with a live Oracle database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 text-xs">
          <label className="surface-inset px-3 py-1.5 rounded-lg flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCommitShared}
              onChange={(e) => setAutoCommitShared(e.target.checked)}
              className="rounded border-[var(--border-subtle)]"
            />
            <span className="font-semibold text-[var(--text-primary)]">
              Auto-Commit to Shared State
            </span>
          </label>
          <span className="surface-inset px-3 py-1.5 rounded-lg font-mono-tabular text-[var(--text-secondary)]">
            SERVEROUTPUT:{' '}
            <strong className="text-[var(--brand-primary)]">
              {effectiveSession.serverOutput ? 'ON' : 'OFF'}
            </strong>
          </span>
          <span className="surface-inset px-3 py-1.5 rounded-lg font-mono-tabular text-[var(--text-secondary)]">
            Staged Changes:{' '}
            <strong className="text-[var(--text-primary)]">
              {effectiveSession.uncommittedCount}
            </strong>
          </span>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: SQL Editor & Output Panel */}
        <div className="lg:col-span-8 space-y-6">
          {/* SQL Editor Card */}
          <section className="surface-card rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[var(--brand-primary)]" />
                <h2 className="text-sm font-display font-bold text-[var(--text-primary)]">
                  SQL*Plus Command Editor
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickTransaction('COMMIT;')}
                  className="btn-base btn-secondary !py-1 !px-2.5 text-xs font-mono-tabular"
                  title="Commit staged changes to shared state"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>COMMIT</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTransaction('ROLLBACK;')}
                  className="btn-base btn-secondary !py-1 !px-2.5 text-xs font-mono-tabular"
                  title="Rollback uncommitted changes"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ROLLBACK</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTransaction('SAVEPOINT sp_console;')}
                  className="btn-base btn-secondary !py-1 !px-2.5 text-xs font-mono-tabular"
                  title="Create local savepoint sp_console"
                >
                  <span>SAVEPOINT</span>
                </button>
              </div>
            </div>

            {/* Quick-Insert Sample Queries */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                <span>Quick-Load Supplied SQL*Plus Statements:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_SQL_SNIPPETS.map((snip) => (
                  <button
                    key={snip.label}
                    type="button"
                    onClick={() => setSqlInput(snip.sql)}
                    className="text-xs px-2.5 py-1 rounded-lg surface-inset hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] border border-transparent transition-colors cursor-pointer"
                  >
                    <span className="font-semibold">{snip.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="sql-console-editor" className="sr-only">
                SQL Command Input
              </label>
              <textarea
                id="sql-console-editor"
                rows={5}
                value={sqlInput}
                onChange={(e) => setSqlInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    handleExecuteClick();
                  }
                }}
                placeholder="Enter SQL*Plus statement (e.g., SELECT * FROM ER_CANDIDATE; or EXEC ER_APPLICATION_REPORT;)..."
                className="input-field font-mono-tabular text-xs leading-relaxed bg-[var(--surface-secondary)]/70"
                spellCheck={false}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-[var(--text-secondary)]">
                Tip: Press{' '}
                <kbd className="font-mono-tabular px-1.5 py-0.5 surface-inset rounded">
                  Ctrl+Enter
                </kbd>{' '}
                or click Execute.
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setSqlInput('')}
                  className="btn-base btn-secondary text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Editor</span>
                </button>
                <button
                  type="button"
                  onClick={handleExecuteClick}
                  data-testid="sql-execute-btn"
                  className="btn-base btn-primary text-xs"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Execute SQL</span>
                </button>
              </div>
            </div>
          </section>

          {/* Execution Status & Results Panel */}
          <section className="surface-card rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-display font-bold text-[var(--text-primary)]">
                  Query Output & Execution Results
                </h3>
                {lastResult && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono-tabular font-bold ${
                      lastResult.ok
                        ? 'bg-[var(--success-bg)] text-[var(--success)]'
                        : 'bg-[var(--danger-bg)] text-[var(--danger)]'
                    }`}
                  >
                    {lastResult.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {lastResult.ok ? 'SUCCESS' : lastResult.errorCode || 'ERROR'} ·{' '}
                      {lastResult.durationMs}ms
                    </span>
                  </span>
                )}
              </div>

              {lastResult && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyResults}
                    className="btn-base btn-secondary !py-1 !px-2.5 text-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Output</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLastResult(null)}
                    className="btn-base btn-tertiary !py-1 !px-2 text-xs"
                  >
                    Clear Output
                  </button>
                </div>
              )}
            </div>

            {!lastResult ? (
              <div className="surface-inset rounded-xl p-6 text-center text-xs text-[var(--text-secondary)]">
                Run a query, <code className="font-mono-tabular">DESC</code>,{' '}
                <code className="font-mono-tabular">UPDATE</code>,{' '}
                <code className="font-mono-tabular">INSERT</code>, or stored procedure to inspect
                live results from the shared recruitment dataset.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Status / Error Message Banner */}
                <div
                  role={lastResult.ok ? 'status' : 'alert'}
                  className={`rounded-xl p-3.5 text-xs font-mono-tabular border ${
                    lastResult.ok
                      ? 'surface-inset border-[var(--border-subtle)] text-[var(--text-primary)]'
                      : 'bg-[var(--danger-bg)] border-[var(--danger)]/40 text-[var(--danger)] font-semibold'
                  }`}
                >
                  {lastResult.message}
                </div>

                {/* DBMS_OUTPUT Buffer */}
                {lastResult.dbmsOutput && lastResult.dbmsOutput.length > 0 && (
                  <div className="surface-inset rounded-xl p-4 space-y-1.5 border border-[var(--border-emphasis)]">
                    <div className="text-[11px] font-mono-tabular font-bold uppercase tracking-wider text-[var(--brand-primary)]">
                      DBMS_OUTPUT.PUT_LINE Buffer ({lastResult.dbmsOutput.length} lines)
                    </div>
                    <pre className="text-xs font-mono-tabular text-[var(--text-primary)] whitespace-pre-wrap overflow-x-auto leading-relaxed">
                      {lastResult.dbmsOutput.join('\n')}
                    </pre>
                  </div>
                )}

                {/* Result Set Table */}
                {lastResult.columns && lastResult.rows && (
                  <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                    <table className="w-full text-left border-collapse text-xs font-mono-tabular">
                      <thead>
                        <tr className="bg-[var(--surface-secondary)] border-b border-[var(--border-subtle)]">
                          {lastResult.columns.map((col) => (
                            <th
                              key={col}
                              className="py-2.5 px-3 font-bold text-[var(--text-primary)] whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {lastResult.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={lastResult.columns.length}
                              className="py-4 px-3 text-center text-[var(--text-secondary)]"
                            >
                              No rows selected (0 rows).
                            </td>
                          </tr>
                        ) : (
                          lastResult.rows.map((row, idx) => (
                            <tr
                              key={idx}
                              className="hover:bg-[var(--surface-secondary)]/50 transition-colors"
                            >
                              {lastResult.columns!.map((col) => (
                                <td
                                  key={col}
                                  className="py-2 px-3 text-[var(--text-primary)] whitespace-nowrap"
                                >
                                  {row[col] === null || row[col] === undefined ? (
                                    <span className="text-[var(--text-secondary)] italic">NULL</span>
                                  ) : (
                                    String(row[col])
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right 4 Cols: Command History & Supported Syntax Reference */}
        <div className="lg:col-span-4 space-y-6">
          {/* Command History */}
          <section className="surface-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[var(--brand-primary)]" />
                <h3 className="text-sm font-display font-bold text-[var(--text-primary)]">
                  Command History ({history.length})
                </h3>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-xs text-[var(--text-secondary)] hover:text-[var(--danger)] cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)] py-3">
                Executed statements in this session will appear here. Click any history item to load
                it into the editor.
              </p>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {history.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSqlInput(h.commandText)}
                    className="w-full text-left surface-inset rounded-xl p-3 space-y-1 hover:border-[var(--brand-primary)] border border-transparent transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span
                        className={`font-mono-tabular font-bold ${
                          h.ok ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                        }`}
                      >
                        {h.ok ? 'OK' : 'ERR'} · {h.rowCount} row(s)
                      </span>
                      <span className="font-mono-tabular text-[var(--text-secondary)]">
                        {h.timestamp} ({h.durationMs}ms)
                      </span>
                    </div>
                    <div className="font-mono-tabular text-xs text-[var(--text-primary)] truncate">
                      {h.commandText}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] truncate">
                      {h.summary}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Supported Commands & Objects Reference */}
          <section className="surface-card rounded-2xl p-5 space-y-3 text-xs">
            <h3 className="text-sm font-display font-bold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2.5">
              Supported SQL*Plus Simulation Subset
            </h3>

            <div className="space-y-2.5">
              <div>
                <div className="font-semibold text-[var(--text-primary)]">Oracle Tables (7)</div>
                <p className="font-mono-tabular text-[11px] text-[var(--text-secondary)] mt-0.5">
                  ER_DEPARTMENT, ER_JOB, ER_CANDIDATE, ER_APPLICATION, ER_INTERVIEW, ER_EMPLOYEE,
                  ER_APPLICATION_AUDIT
                </p>
              </div>

              <div>
                <div className="font-semibold text-[var(--text-primary)]">Read-Only Views (2)</div>
                <p className="font-mono-tabular text-[11px] text-[var(--text-secondary)] mt-0.5">
                  ER_V_CANDIDATE_APPLICATION, ER_V_INTERVIEW_DETAILS
                </p>
              </div>

              <div>
                <div className="font-semibold text-[var(--text-primary)]">
                  Simulated Stored Procedures (6)
                </div>
                <ul className="font-mono-tabular text-[11px] text-[var(--text-secondary)] space-y-1 mt-0.5">
                  <li>EXEC ER_ADD_CANDIDATE(name, email, phone, qual, exp)</li>
                  <li>EXEC ER_APPLY_FOR_JOB(cand_id, job_id)</li>
                  <li>EXEC ER_UPDATE_STATUS(app_id, status)</li>
                  <li>EXEC ER_SCHEDULE_INTERVIEW(app_id, round, date, mode, interviewer)</li>
                  <li>EXEC ER_APPLICATION_REPORT</li>
                  <li>EXEC ER_HIRE_CANDIDATE(app_id, designation, salary)</li>
                </ul>
              </div>

              <div>
                <div className="font-semibold text-[var(--text-primary)]">
                  Queries, DML & Transactions
                </div>
                <p className="text-[var(--text-secondary)] leading-relaxed mt-0.5">
                  Supports <code className="font-mono-tabular">SELECT</code> (projections, aliases,{' '}
                  <code className="font-mono-tabular">WHERE</code>,{' '}
                  <code className="font-mono-tabular">JOIN</code>,{' '}
                  <code className="font-mono-tabular">GROUP BY</code>,{' '}
                  <code className="font-mono-tabular">ORDER BY</code>,{' '}
                  <code className="font-mono-tabular">COUNT/SUM/NVL</code>),{' '}
                  <code className="font-mono-tabular">DESC</code>,{' '}
                  <code className="font-mono-tabular">SHOW TABLES</code>,{' '}
                  <code className="font-mono-tabular">INSERT INTO</code>,{' '}
                  <code className="font-mono-tabular">UPDATE</code>,{' '}
                  <code className="font-mono-tabular">DELETE</code>,{' '}
                  <code className="font-mono-tabular">COMMIT</code>,{' '}
                  <code className="font-mono-tabular">ROLLBACK</code>, and{' '}
                  <code className="font-mono-tabular">SAVEPOINT</code>.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Confirmation Modal for Destructive DELETE Statements */}
      <Modal
        isOpen={pendingConfirmSql !== null}
        onClose={() => setPendingConfirmSql(null)}
        title="Confirm Destructive SQL DELETE"
        subtitle="Please confirm before applying this DELETE operation to the local recruitment dataset."
        maxWidthClass="max-w-md"
      >
        {pendingConfirmSql && (
          <div className="space-y-4 text-xs">
            <div className="surface-inset rounded-xl p-3.5 text-[var(--text-primary)] leading-relaxed">
              {pendingConfirmSql.promptText}
            </div>
            <pre className="surface-inset rounded-xl p-3 font-mono-tabular text-[11px] overflow-x-auto text-[var(--danger)]">
              {pendingConfirmSql.sql}
            </pre>
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={() => setPendingConfirmSql(null)}
                className="btn-base btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const sqlToRun = pendingConfirmSql.sql;
                  setPendingConfirmSql(null);
                  runSqlStatement(sqlToRun, true);
                }}
                className="btn-base btn-destructive text-xs"
              >
                Confirm & Execute DELETE
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
