import {
  addCandidate,
  applyForJob,
  calculatePercentageIncrease,
  getTodayIsoDate,
  hireCandidate,
  nextAuditId,
  scheduleInterview,
  selectCandidateApplicationView,
  selectInterviewDetailsView,
  updateApplicationStatus,
} from './operations';
import {
  ALLOWED_APPLICATION_STATUSES,
  ALLOWED_EMPLOYMENT_STATUSES,
  ALLOWED_INTERVIEW_MODES,
  ALLOWED_INTERVIEW_STATUSES,
  ALLOWED_JOB_STATUSES,
  ApplicationStatus,
  EmploymentStatus,
  ErApplication,
  ErCandidate,
  ErDepartment,
  ErEmployee,
  ErInterview,
  ErJob,
  InterviewMode,
  InterviewStatus,
  JobStatus,
  RecruitmentDatabaseState,
} from './schema';

export interface SqlSessionState {
  workingState: RecruitmentDatabaseState;
  committedState: RecruitmentDatabaseState;
  uncommittedCount: number;
  savepoints: Record<string, RecruitmentDatabaseState>;
  serverOutput: boolean;
  lastError: string | null;
  currentUser: string;
}

export interface SqlExecutionOptions {
  confirmedDelete?: boolean;
  autoCommit?: boolean;
}

export interface SqlExecutionResult {
  ok: boolean;
  commandType:
    | 'SELECT'
    | 'DESC'
    | 'SHOW_TABLES'
    | 'INSERT'
    | 'UPDATE'
    | 'DELETE'
    | 'COMMIT'
    | 'ROLLBACK'
    | 'SAVEPOINT'
    | 'EXEC'
    | 'SET'
    | 'SHOW_ERRORS'
    | 'MULTI'
    | 'ERROR';
  statement: string;
  columns?: string[];
  rows?: Record<string, string | number | null>[];
  rowsAffected?: number;
  message: string;
  dbmsOutput?: string[];
  errorCode?: string;
  errorDetails?: string;
  durationMs: number;
  requiresConfirmation?: boolean;
  confirmationPrompt?: {
    table: string;
    matchingRowsCount: number;
    hasWhereClause: boolean;
    statement: string;
    summary: string;
  };
  session: SqlSessionState;
  didCommitToSharedState?: boolean;
}

export interface ColumnSchemaInfo {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  NULLABLE: 'NOT NULL' | 'NULLABLE';
  KEY_TYPE: string;
  SCOPE: 'ORACLE_SCHEMA' | 'FRONTEND_METADATA';
}

const TABLE_SCHEMAS: Record<string, ColumnSchemaInfo[]> = {
  ER_DEPARTMENT: [
    {
      COLUMN_NAME: 'DEPT_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'PRIMARY KEY',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'DEPT_NAME',
      DATA_TYPE: 'VARCHAR2(50)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'UNIQUE',
      SCOPE: 'ORACLE_SCHEMA',
    },
  ],
  ER_JOB: [
    {
      COLUMN_NAME: 'JOB_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'PRIMARY KEY',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'JOB_TITLE',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'DEPT_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'FK -> ER_DEPARTMENT(DEPT_ID)',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'JOB_DESCRIPTION',
      DATA_TYPE: 'VARCHAR2(500)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'MIN_SALARY',
      DATA_TYPE: 'NUMBER(10,2)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'CHECK (MIN <= MAX)',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'MAX_SALARY',
      DATA_TYPE: 'NUMBER(10,2)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'CHECK (MIN <= MAX)',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'VACANCIES',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'CHECK (>= 0)',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'JOB_STATUS',
      DATA_TYPE: 'VARCHAR2(20)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: "CHECK IN ('OPEN','CLOSED','ON HOLD')",
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'POSTED_DATE',
      DATA_TYPE: 'DATE',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'DEFAULT SYSDATE',
      SCOPE: 'ORACLE_SCHEMA',
    },
  ],
  ER_CANDIDATE: [
    {
      COLUMN_NAME: 'CANDIDATE_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'PRIMARY KEY',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'FULL_NAME',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'EMAIL',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'UNIQUE',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'PHONE',
      DATA_TYPE: 'VARCHAR2(15)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'QUALIFICATION',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'EXPERIENCE_YEARS',
      DATA_TYPE: 'NUMBER(3,1)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'CHECK (>= 0)',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'CREATED_DATE',
      DATA_TYPE: 'DATE',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'DEFAULT SYSDATE',
      SCOPE: 'ORACLE_SCHEMA',
    },
  ],
  ER_APPLICATION: [
    {
      COLUMN_NAME: 'APPLICATION_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'PRIMARY KEY',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'CANDIDATE_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'FK -> ER_CANDIDATE(CANDIDATE_ID)',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'JOB_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'FK -> ER_JOB(JOB_ID)',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'APPLICATION_DATE',
      DATA_TYPE: 'DATE',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'DEFAULT SYSDATE',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'APPLICATION_STATUS',
      DATA_TYPE: 'VARCHAR2(25)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'CHECK (APPLIED..HIRED)',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'REMARKS',
      DATA_TYPE: 'VARCHAR2(500)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
  ],
  ER_INTERVIEW: [
    {
      COLUMN_NAME: 'INTERVIEW_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'PRIMARY KEY',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'APPLICATION_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'FK -> ER_APPLICATION(APPLICATION_ID)',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'INTERVIEW_ROUND',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'UNIQUE(APPLICATION_ID, INTERVIEW_ROUND)',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'INTERVIEW_DATE',
      DATA_TYPE: 'DATE',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'INTERVIEW_MODE',
      DATA_TYPE: 'VARCHAR2(20)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: "CHECK IN ('ONLINE','OFFLINE')",
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'INTERVIEWER_NAME',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'SCORE',
      DATA_TYPE: 'NUMBER(5,2)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'CHECK (0..100)',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'FEEDBACK',
      DATA_TYPE: 'VARCHAR2(500)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'INTERVIEW_STATUS',
      DATA_TYPE: 'VARCHAR2(20)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: "CHECK IN ('SCHEDULED','COMPLETED','CANCELLED')",
      SCOPE: 'ORACLE_SCHEMA',
    },
  ],
  ER_EMPLOYEE: [
    {
      COLUMN_NAME: 'EMPLOYEE_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'PRIMARY KEY',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'APPLICATION_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'UNIQUE, FK -> ER_APPLICATION',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'CANDIDATE_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'UNIQUE, FK -> ER_CANDIDATE',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'JOINING_DATE',
      DATA_TYPE: 'DATE',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'DESIGNATION',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'ANNUAL_SALARY',
      DATA_TYPE: 'NUMBER(12,2)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'EMPLOYMENT_STATUS',
      DATA_TYPE: 'VARCHAR2(20)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: "CHECK IN ('ACTIVE','INACTIVE')",
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: '_hierarchyLevel',
      DATA_TYPE: 'NUMBER (1..5)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'Frontend-Only Hierarchy Metadata',
      SCOPE: 'FRONTEND_METADATA',
    },
    {
      COLUMN_NAME: '_managerEmployeeId',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'Frontend-Only Reporting Manager ID',
      SCOPE: 'FRONTEND_METADATA',
    },
  ],
  ER_APPLICATION_AUDIT: [
    {
      COLUMN_NAME: 'AUDIT_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'PRIMARY KEY',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'APPLICATION_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'OLD_STATUS',
      DATA_TYPE: 'VARCHAR2(25)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'NEW_STATUS',
      DATA_TYPE: 'VARCHAR2(25)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'CHANGE_DATE',
      DATA_TYPE: 'TIMESTAMP',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'DEFAULT SYSTIMESTAMP',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'CHANGED_BY',
      DATA_TYPE: 'VARCHAR2(128)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: '-',
      SCOPE: 'ORACLE_SCHEMA',
    },
  ],
  ER_V_CANDIDATE_APPLICATION: [
    {
      COLUMN_NAME: 'CANDIDATE_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'FULL_NAME',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'EMAIL',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'PHONE',
      DATA_TYPE: 'VARCHAR2(15)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'QUALIFICATION',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'EXPERIENCE_YEARS',
      DATA_TYPE: 'NUMBER(3,1)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'APPLICATION_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'APPLICATION_DATE',
      DATA_TYPE: 'DATE',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'APPLICATION_STATUS',
      DATA_TYPE: 'VARCHAR2(25)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'JOB_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'JOB_TITLE',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'DEPT_NAME',
      DATA_TYPE: 'VARCHAR2(50)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
  ],
  ER_V_INTERVIEW_DETAILS: [
    {
      COLUMN_NAME: 'CANDIDATE_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'FULL_NAME',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'EMAIL',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'APPLICATION_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'JOB_TITLE',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'INTERVIEW_ID',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'INTERVIEW_ROUND',
      DATA_TYPE: 'NUMBER',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'INTERVIEW_DATE',
      DATA_TYPE: 'DATE',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'INTERVIEW_MODE',
      DATA_TYPE: 'VARCHAR2(20)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'INTERVIEWER_NAME',
      DATA_TYPE: 'VARCHAR2(100)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'SCORE',
      DATA_TYPE: 'NUMBER(5,2)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'FEEDBACK',
      DATA_TYPE: 'VARCHAR2(500)',
      NULLABLE: 'NULLABLE',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
    {
      COLUMN_NAME: 'INTERVIEW_STATUS',
      DATA_TYPE: 'VARCHAR2(20)',
      NULLABLE: 'NOT NULL',
      KEY_TYPE: 'VIEW COLUMN',
      SCOPE: 'ORACLE_SCHEMA',
    },
  ],
};

const READ_ONLY_VIEWS = new Set(['ER_V_CANDIDATE_APPLICATION', 'ER_V_INTERVIEW_DETAILS']);

export function cloneDatabaseState(state: RecruitmentDatabaseState): RecruitmentDatabaseState {
  return JSON.parse(JSON.stringify(state)) as RecruitmentDatabaseState;
}

export function createSqlSessionState(
  initialState: RecruitmentDatabaseState,
  currentUser = 'KARAN.SAINI'
): SqlSessionState {
  return {
    workingState: cloneDatabaseState(initialState),
    committedState: cloneDatabaseState(initialState),
    uncommittedCount: 0,
    savepoints: {},
    serverOutput: true,
    lastError: null,
    currentUser: currentUser.toUpperCase(),
  };
}

export function syncSessionWithExternalState(
  session: SqlSessionState,
  externalState: RecruitmentDatabaseState
): SqlSessionState {
  if (session.uncommittedCount === 0) {
    return {
      ...session,
      workingState: cloneDatabaseState(externalState),
      committedState: cloneDatabaseState(externalState),
    };
  }
  return {
    ...session,
    committedState: cloneDatabaseState(externalState),
  };
}

/**
 * Split multi-statement SQL input safely by top-level semicolons (ignoring semicolons inside single quotes)
 */
export function splitSqlStatements(sqlText: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inSingleQuote = false;

  const lines = sqlText
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith('--') && line.trim() !== '/');
  const cleaned = lines.join('\n');

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "'") {
      inSingleQuote = !inSingleQuote;
      current += ch;
    } else if (ch === ';' && !inSingleQuote) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

function getTableRecords(
  state: RecruitmentDatabaseState,
  tableNameUpper: string,
  currentUser: string
): Record<string, string | number | null>[] | null {
  switch (tableNameUpper) {
    case 'ER_DEPARTMENT':
      return state.departments.map((r) => ({
        DEPT_ID: r.DEPT_ID,
        DEPT_NAME: r.DEPT_NAME,
      }));
    case 'ER_JOB':
      return state.jobs.map((r) => ({
        JOB_ID: r.JOB_ID,
        JOB_TITLE: r.JOB_TITLE,
        DEPT_ID: r.DEPT_ID,
        JOB_DESCRIPTION: r.JOB_DESCRIPTION,
        MIN_SALARY: r.MIN_SALARY,
        MAX_SALARY: r.MAX_SALARY,
        VACANCIES: r.VACANCIES,
        JOB_STATUS: r.JOB_STATUS,
        POSTED_DATE: r.POSTED_DATE,
      }));
    case 'ER_CANDIDATE':
      return state.candidates.map((r) => ({
        CANDIDATE_ID: r.CANDIDATE_ID,
        FULL_NAME: r.FULL_NAME,
        EMAIL: r.EMAIL,
        PHONE: r.PHONE,
        QUALIFICATION: r.QUALIFICATION,
        EXPERIENCE_YEARS: r.EXPERIENCE_YEARS,
        CREATED_DATE: r.CREATED_DATE,
      }));
    case 'ER_APPLICATION':
      return state.applications.map((r) => ({
        APPLICATION_ID: r.APPLICATION_ID,
        CANDIDATE_ID: r.CANDIDATE_ID,
        JOB_ID: r.JOB_ID,
        APPLICATION_DATE: r.APPLICATION_DATE,
        APPLICATION_STATUS: r.APPLICATION_STATUS,
        REMARKS: r.REMARKS,
      }));
    case 'ER_INTERVIEW':
      return state.interviews.map((r) => ({
        INTERVIEW_ID: r.INTERVIEW_ID,
        APPLICATION_ID: r.APPLICATION_ID,
        INTERVIEW_ROUND: r.INTERVIEW_ROUND,
        INTERVIEW_DATE: r.INTERVIEW_DATE,
        INTERVIEW_MODE: r.INTERVIEW_MODE,
        INTERVIEWER_NAME: r.INTERVIEWER_NAME,
        SCORE: r.SCORE,
        FEEDBACK: r.FEEDBACK,
        INTERVIEW_STATUS: r.INTERVIEW_STATUS,
      }));
    case 'ER_EMPLOYEE':
      return state.employees.map((r) => ({
        EMPLOYEE_ID: r.EMPLOYEE_ID,
        APPLICATION_ID: r.APPLICATION_ID,
        CANDIDATE_ID: r.CANDIDATE_ID,
        JOINING_DATE: r.JOINING_DATE,
        DESIGNATION: r.DESIGNATION,
        ANNUAL_SALARY: r.ANNUAL_SALARY,
        EMPLOYMENT_STATUS: r.EMPLOYMENT_STATUS,
      }));
    case 'ER_APPLICATION_AUDIT':
      return state.audits.map((r) => ({
        AUDIT_ID: r.AUDIT_ID,
        APPLICATION_ID: r.APPLICATION_ID,
        OLD_STATUS: r.OLD_STATUS,
        NEW_STATUS: r.NEW_STATUS,
        CHANGE_DATE: r.CHANGE_DATE,
        CHANGED_BY: r.CHANGED_BY,
      }));
    case 'ER_V_CANDIDATE_APPLICATION':
      return selectCandidateApplicationView(state).map((r) => ({
        CANDIDATE_ID: r.CANDIDATE_ID,
        FULL_NAME: r.FULL_NAME,
        EMAIL: r.EMAIL,
        PHONE: r.PHONE,
        QUALIFICATION: r.QUALIFICATION,
        EXPERIENCE_YEARS: r.EXPERIENCE_YEARS,
        APPLICATION_ID: r.APPLICATION_ID,
        APPLICATION_DATE: r.APPLICATION_DATE,
        APPLICATION_STATUS: r.APPLICATION_STATUS,
        JOB_ID: r.JOB_ID,
        JOB_TITLE: r.JOB_TITLE,
        DEPT_NAME: r.DEPT_NAME,
      }));
    case 'ER_V_INTERVIEW_DETAILS':
      return selectInterviewDetailsView(state).map((r) => ({
        CANDIDATE_ID: r.CANDIDATE_ID,
        FULL_NAME: r.FULL_NAME,
        EMAIL: r.EMAIL,
        APPLICATION_ID: r.APPLICATION_ID,
        JOB_TITLE: r.JOB_TITLE,
        INTERVIEW_ID: r.INTERVIEW_ID,
        INTERVIEW_ROUND: r.INTERVIEW_ROUND,
        INTERVIEW_DATE: r.INTERVIEW_DATE,
        INTERVIEW_MODE: r.INTERVIEW_MODE,
        INTERVIEWER_NAME: r.INTERVIEWER_NAME,
        SCORE: r.SCORE,
        FEEDBACK: r.FEEDBACK,
        INTERVIEW_STATUS: r.INTERVIEW_STATUS,
      }));
    case 'DUAL':
      return [{ DUMMY: 'X', SYSDATE: getTodayIsoDate(), USER: currentUser }];
    case 'USER_TABLES':
      return [
        { TABLE_NAME: 'ER_APPLICATION' },
        { TABLE_NAME: 'ER_APPLICATION_AUDIT' },
        { TABLE_NAME: 'ER_CANDIDATE' },
        { TABLE_NAME: 'ER_DEPARTMENT' },
        { TABLE_NAME: 'ER_EMPLOYEE' },
        { TABLE_NAME: 'ER_INTERVIEW' },
        { TABLE_NAME: 'ER_JOB' },
      ];
    case 'USER_OBJECTS':
      return [
        { OBJECT_NAME: 'ER_ADD_CANDIDATE', OBJECT_TYPE: 'PROCEDURE', STATUS: 'VALID' },
        { OBJECT_NAME: 'ER_APPLICATION_REPORT', OBJECT_TYPE: 'PROCEDURE', STATUS: 'VALID' },
        { OBJECT_NAME: 'ER_APPLY_FOR_JOB', OBJECT_TYPE: 'PROCEDURE', STATUS: 'VALID' },
        { OBJECT_NAME: 'ER_APP_STATUS_AUDIT', OBJECT_TYPE: 'TRIGGER', STATUS: 'VALID' },
        { OBJECT_NAME: 'ER_HIRE_CANDIDATE', OBJECT_TYPE: 'PROCEDURE', STATUS: 'VALID' },
        { OBJECT_NAME: 'ER_SCHEDULE_INTERVIEW', OBJECT_TYPE: 'PROCEDURE', STATUS: 'VALID' },
        { OBJECT_NAME: 'ER_UPDATE_STATUS', OBJECT_TYPE: 'PROCEDURE', STATUS: 'VALID' },
        { OBJECT_NAME: 'ER_V_CANDIDATE_APPLICATION', OBJECT_TYPE: 'VIEW', STATUS: 'VALID' },
        { OBJECT_NAME: 'ER_V_INTERVIEW_DETAILS', OBJECT_TYPE: 'VIEW', STATUS: 'VALID' },
      ];
    case 'USER_SEQUENCES':
      return [
        { SEQUENCE_NAME: 'ER_APPLICATION_SEQ' },
        { SEQUENCE_NAME: 'ER_AUDIT_SEQ' },
        { SEQUENCE_NAME: 'ER_CANDIDATE_SEQ' },
        { SEQUENCE_NAME: 'ER_EMPLOYEE_SEQ' },
        { SEQUENCE_NAME: 'ER_INTERVIEW_SEQ' },
      ];
    default:
      return null;
  }
}

function getAllowedColumnsForObject(tableNameUpper: string): Set<string> {
  const schema = TABLE_SCHEMAS[tableNameUpper];
  if (schema) {
    return new Set(
      schema
        .filter((c) => c.SCOPE === 'ORACLE_SCHEMA')
        .map((c) => c.COLUMN_NAME.toUpperCase())
    );
  }
  if (tableNameUpper === 'DUAL') return new Set(['DUMMY', 'SYSDATE', 'USER']);
  if (tableNameUpper === 'USER_TABLES') return new Set(['TABLE_NAME']);
  if (tableNameUpper === 'USER_OBJECTS')
    return new Set(['OBJECT_NAME', 'OBJECT_TYPE', 'STATUS']);
  if (tableNameUpper === 'USER_SEQUENCES') return new Set(['SEQUENCE_NAME']);
  return new Set();
}

function parseSqlValue(
  rawExpr: string,
  currentUser: string
): { ok: boolean; value: string | number | null; error?: string } {
  const trimmed = rawExpr.trim();
  if (/^NULL$/i.test(trimmed)) {
    return { ok: true, value: null };
  }
  if (/^SYSDATE$/i.test(trimmed) || /^SYSTIMESTAMP$/i.test(trimmed)) {
    return { ok: true, value: getTodayIsoDate() };
  }
  if (/^USER$/i.test(trimmed)) {
    return { ok: true, value: currentUser };
  }
  const toDateMatch = trimmed.match(
    /^TO_DATE\s*\(\s*'([^']+)'\s*(?:,\s*'([^']+)')?\s*\)$/i
  );
  if (toDateMatch) {
    const dateVal = toDateMatch[1].trim();
    const ddmmyyyy = dateVal.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      return { ok: true, value: `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}` };
    }
    return { ok: true, value: dateVal };
  }
  const upperMatch = trimmed.match(/^UPPER\s*\(\s*'([^']*)'\s*\)$/i);
  if (upperMatch) {
    return { ok: true, value: upperMatch[1].toUpperCase() };
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
    return {
      ok: true,
      value: trimmed.slice(1, -1).replace(/''/g, "'"),
    };
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return { ok: true, value: Number(trimmed) };
  }
  return {
    ok: false,
    value: null,
    error: `ORA-SIM-00936: invalid literal expression '${trimmed}'.`,
  };
}

function splitCommaSeparatedTopLevel(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;
  let parenDepth = 0;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "'") {
      inQuotes = !inQuotes;
      current += ch;
    } else if (!inQuotes && ch === '(') {
      parenDepth++;
      current += ch;
    } else if (!inQuotes && ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      current += ch;
    } else if (!inQuotes && parenDepth === 0 && ch === ',') {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function resolveRowField(
  row: Record<string, string | number | null>,
  colExpr: string,
  allowedCols: Set<string>,
  currentUser: string
): { ok: boolean; value: string | number | null; colKey?: string; error?: string } {
  const clean = colExpr.trim();
  if (/^SYSDATE$/i.test(clean)) {
    return { ok: true, value: getTodayIsoDate(), colKey: 'SYSDATE' };
  }
  if (/^USER$/i.test(clean)) {
    return { ok: true, value: currentUser, colKey: 'USER' };
  }
  // Strip optional alias prefix like C.CANDIDATE_ID -> CANDIDATE_ID
  const stripped = clean.includes('.') ? clean.split('.').pop()!.trim() : clean;
  const upperCol = stripped.toUpperCase();

  // Check if column exists in row or allowedCols
  if (upperCol in row) {
    return { ok: true, value: row[upperCol], colKey: upperCol };
  }
  if (clean.toUpperCase() in row) {
    return { ok: true, value: row[clean.toUpperCase()], colKey: clean.toUpperCase() };
  }
  if (allowedCols.has(upperCol)) {
    return { ok: true, value: row[upperCol] ?? null, colKey: upperCol };
  }
  return {
    ok: false,
    value: null,
    error: `ORA-SIM-00904: "${clean}": invalid identifier in the local simulation.`,
  };
}

/**
 * Evaluate a WHERE clause against a row without using eval/Function
 */
function evaluateWhereClause(
  whereClause: string,
  row: Record<string, string | number | null>,
  allowedCols: Set<string>,
  currentUser: string
): { ok: boolean; matches: boolean; error?: string } {
  const trimmed = whereClause.trim();
  if (!trimmed) return { ok: true, matches: true };

  // Split by top-level OR
  const orBranches = splitLogicalKeyword(trimmed, 'OR');
  if (orBranches.length > 1) {
    let anyMatch = false;
    for (const branch of orBranches) {
      const res = evaluateWhereClause(branch, row, allowedCols, currentUser);
      if (!res.ok) return res;
      if (res.matches) anyMatch = true;
    }
    return { ok: true, matches: anyMatch };
  }

  // Split by top-level AND
  const andBranches = splitLogicalKeyword(trimmed, 'AND');
  if (andBranches.length > 1) {
    let allMatch = true;
    for (const branch of andBranches) {
      const res = evaluateWhereClause(branch, row, allowedCols, currentUser);
      if (!res.ok) return res;
      if (!res.matches) allMatch = false;
    }
    return { ok: true, matches: allMatch };
  }

  // Strip enclosing parentheses if balanced
  if (trimmed.startsWith('(') && trimmed.endsWith(')') && isBalancedEnclosingParens(trimmed)) {
    return evaluateWhereClause(trimmed.slice(1, -1), row, allowedCols, currentUser);
  }

  // IS NOT NULL / IS NULL
  const isNotNullMatch = trimmed.match(/^([A-Za-z0-9_.]+)\s+IS\s+NOT\s+NULL$/i);
  if (isNotNullMatch) {
    const fieldRes = resolveRowField(row, isNotNullMatch[1], allowedCols, currentUser);
    if (!fieldRes.ok) return { ok: false, matches: false, error: fieldRes.error };
    return { ok: true, matches: fieldRes.value !== null && fieldRes.value !== undefined };
  }

  const isNullMatch = trimmed.match(/^([A-Za-z0-9_.]+)\s+IS\s+NULL$/i);
  if (isNullMatch) {
    const fieldRes = resolveRowField(row, isNullMatch[1], allowedCols, currentUser);
    if (!fieldRes.ok) return { ok: false, matches: false, error: fieldRes.error };
    return { ok: true, matches: fieldRes.value === null || fieldRes.value === undefined };
  }

  // IN (...)
  const inMatch = trimmed.match(/^([A-Za-z0-9_.]+)\s+(NOT\s+)?IN\s*\((.+)\)$/i);
  if (inMatch) {
    const fieldRes = resolveRowField(row, inMatch[1], allowedCols, currentUser);
    if (!fieldRes.ok) return { ok: false, matches: false, error: fieldRes.error };
    const isNot = Boolean(inMatch[2]);
    const listRaw = splitCommaSeparatedTopLevel(inMatch[3]);
    const listVals: (string | number | null)[] = [];
    for (const item of listRaw) {
      const parsed = parseSqlValue(item, currentUser);
      if (!parsed.ok) return { ok: false, matches: false, error: parsed.error };
      listVals.push(parsed.value);
    }
    const found = listVals.some((v) => v !== null && fieldRes.value === v);
    return { ok: true, matches: isNot ? !found : found };
  }

  // LIKE
  const likeMatch = trimmed.match(/^([A-Za-z0-9_.]+)\s+(NOT\s+)?LIKE\s+('(?:[^']|'')*')$/i);
  if (likeMatch) {
    const fieldRes = resolveRowField(row, likeMatch[1], allowedCols, currentUser);
    if (!fieldRes.ok) return { ok: false, matches: false, error: fieldRes.error };
    const isNot = Boolean(likeMatch[2]);
    const patternVal = parseSqlValue(likeMatch[3], currentUser);
    if (!patternVal.ok || typeof patternVal.value !== 'string') {
      return { ok: false, matches: false, error: 'ORA-SIM-00933: invalid LIKE pattern.' };
    }
    if (fieldRes.value === null || fieldRes.value === undefined) {
      return { ok: true, matches: false };
    }
    const regexStr =
      '^' +
      patternVal.value
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/%/g, '.*')
        .replace(/_/g, '.') +
      '$';
    const regex = new RegExp(regexStr, 'i');
    const matched = regex.test(String(fieldRes.value));
    return { ok: true, matches: isNot ? !matched : matched };
  }

  // Comparison operators: <=, >=, <>, !=, =, <, >
  const compMatch = trimmed.match(
    /^([A-Za-z0-9_.]+)\s*(<=|>=|<>|!=|=|<|>)\s*(.+)$/
  );
  if (compMatch) {
    const leftExpr = compMatch[1].trim();
    const op = compMatch[2];
    const rightRaw = compMatch[3].trim();

    const leftRes = resolveRowField(row, leftExpr, allowedCols, currentUser);
    if (!leftRes.ok) return { ok: false, matches: false, error: leftRes.error };

    let rightVal: string | number | null = null;
    const literalRes = parseSqlValue(rightRaw, currentUser);
    if (literalRes.ok) {
      rightVal = literalRes.value;
    } else if (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(rightRaw)) {
      const colRes = resolveRowField(row, rightRaw, allowedCols, currentUser);
      if (!colRes.ok) return { ok: false, matches: false, error: colRes.error };
      rightVal = colRes.value;
    } else {
      return { ok: false, matches: false, error: literalRes.error };
    }

    const lv = leftRes.value;
    if (lv === null || lv === undefined || rightVal === null || rightVal === undefined) {
      return { ok: true, matches: false };
    }

    const bothNumbers = typeof lv === 'number' && typeof rightVal === 'number';
    const numLeft = Number(lv);
    const numRight = Number(rightVal);
    switch (op) {
      case '=':
        return {
          ok: true,
          matches: bothNumbers ? numLeft === numRight : String(lv) === String(rightVal),
        };
      case '<>':
      case '!=':
        return {
          ok: true,
          matches: bothNumbers ? numLeft !== numRight : String(lv) !== String(rightVal),
        };
      case '<':
        return {
          ok: true,
          matches: bothNumbers ? numLeft < numRight : String(lv) < String(rightVal),
        };
      case '<=':
        return {
          ok: true,
          matches: bothNumbers ? numLeft <= numRight : String(lv) <= String(rightVal),
        };
      case '>':
        return {
          ok: true,
          matches: bothNumbers ? numLeft > numRight : String(lv) > String(rightVal),
        };
      case '>=':
        return {
          ok: true,
          matches: bothNumbers ? numLeft >= numRight : String(lv) >= String(rightVal),
        };
    }
  }

  return {
    ok: false,
    matches: false,
    error: `ORA-SIM-00933: SQL WHERE condition '${trimmed}' is malformed or unsupported.`,
  };
}

function isBalancedEnclosingParens(str: string): boolean {
  let depth = 0;
  let inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === "'") inQuotes = !inQuotes;
    if (!inQuotes) {
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0 && i < str.length - 1) return false;
      }
    }
  }
  return depth === 0;
}

function splitLogicalKeyword(expr: string, keyword: 'AND' | 'OR'): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let parenDepth = 0;
  let lastIdx = 0;
  const upper = expr.toUpperCase();
  const kwLen = keyword.length;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "'") {
      inQuotes = !inQuotes;
    } else if (!inQuotes && ch === '(') {
      parenDepth++;
    } else if (!inQuotes && ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
    } else if (
      !inQuotes &&
      parenDepth === 0 &&
      upper.slice(i, i + kwLen) === keyword &&
      (i === 0 || /\s|\)/.test(expr[i - 1])) &&
      (i + kwLen < expr.length && /\s|\(/.test(expr[i + kwLen]))
    ) {
      result.push(expr.slice(lastIdx, i).trim());
      lastIdx = i + kwLen;
      i += kwLen - 1;
    }
  }
  result.push(expr.slice(lastIdx).trim());
  return result.filter(Boolean);
}

/**
 * Execute a single SQL*Plus-style command against the local session
 */
export function executeSingleSqlStatement(
  rawSql: string,
  session: SqlSessionState,
  options: SqlExecutionOptions = {}
): SqlExecutionResult {
  const startMs = performance.now();
  const stmt = rawSql.trim().replace(/;+\s*$/, '').trim();
  const elapsed = () => Math.max(1, Math.round((performance.now() - startMs) * 100) / 100);

  if (!stmt) {
    return {
      ok: false,
      commandType: 'ERROR',
      statement: rawSql,
      message: 'ORA-SIM-00900: empty SQL statement.',
      errorCode: 'ORA-SIM-00900',
      durationMs: elapsed(),
      session,
    };
  }

  // 1. SHOW TABLES
  if (/^SHOW\s+TABLES$/i.test(stmt)) {
    const ws = session.workingState;
    const rows: Record<string, string | number | null>[] = [
      {
        OBJECT_NAME: 'ER_DEPARTMENT',
        OBJECT_TYPE: 'TABLE',
        ROWS: ws.departments.length,
        DESCRIPTION: 'Oracle schema department master table',
      },
      {
        OBJECT_NAME: 'ER_JOB',
        OBJECT_TYPE: 'TABLE',
        ROWS: ws.jobs.length,
        DESCRIPTION: 'Oracle schema job openings & vacancy counts',
      },
      {
        OBJECT_NAME: 'ER_CANDIDATE',
        OBJECT_TYPE: 'TABLE',
        ROWS: ws.candidates.length,
        DESCRIPTION: 'Oracle schema registered candidates',
      },
      {
        OBJECT_NAME: 'ER_APPLICATION',
        OBJECT_TYPE: 'TABLE',
        ROWS: ws.applications.length,
        DESCRIPTION: 'Oracle schema candidate job applications',
      },
      {
        OBJECT_NAME: 'ER_INTERVIEW',
        OBJECT_TYPE: 'TABLE',
        ROWS: ws.interviews.length,
        DESCRIPTION: 'Oracle schema scheduled & scored interview rounds',
      },
      {
        OBJECT_NAME: 'ER_EMPLOYEE',
        OBJECT_TYPE: 'TABLE',
        ROWS: ws.employees.length,
        DESCRIPTION: 'Oracle schema hired employees',
      },
      {
        OBJECT_NAME: 'ER_APPLICATION_AUDIT',
        OBJECT_TYPE: 'TABLE',
        ROWS: ws.audits.length,
        DESCRIPTION: 'Status transition audit trail (ER_APP_STATUS_AUDIT)',
      },
      {
        OBJECT_NAME: 'ER_V_CANDIDATE_APPLICATION',
        OBJECT_TYPE: 'VIEW (READ-ONLY)',
        ROWS: selectCandidateApplicationView(ws).length,
        DESCRIPTION: 'Joined candidate, application, job & department view',
      },
      {
        OBJECT_NAME: 'ER_V_INTERVIEW_DETAILS',
        OBJECT_TYPE: 'VIEW (READ-ONLY)',
        ROWS: selectInterviewDetailsView(ws).length,
        DESCRIPTION: 'Joined candidate, application, job & interview details view',
      },
    ];
    return {
      ok: true,
      commandType: 'SHOW_TABLES',
      statement: stmt,
      columns: ['OBJECT_NAME', 'OBJECT_TYPE', 'ROWS', 'DESCRIPTION'],
      rows,
      rowsAffected: rows.length,
      message: `${rows.length} schema objects listed (7 tables, 2 views).`,
      durationMs: elapsed(),
      session,
    };
  }

  // 2. DESC / DESCRIBE <object>
  const descMatch = stmt.match(/^(?:DESC|DESCRIBE)\s+([A-Za-z0-9_]+)$/i);
  if (descMatch) {
    const objName = descMatch[1].toUpperCase();
    const schemaCols = TABLE_SCHEMAS[objName];
    if (!schemaCols) {
      const err = `ORA-SIM-04043: object ${objName} does not exist in the local simulation.`;
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-04043',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const rows = schemaCols.map((c) => ({
      COLUMN_NAME: c.COLUMN_NAME,
      NULLABLE: c.NULLABLE,
      DATA_TYPE: c.DATA_TYPE,
      KEY_OR_CONSTRAINT: c.KEY_TYPE,
      MODEL_LAYER:
        c.SCOPE === 'ORACLE_SCHEMA' ? 'Oracle DDL Column' : 'Frontend-Only Metadata (Not in Oracle)',
    }));
    return {
      ok: true,
      commandType: 'DESC',
      statement: stmt,
      columns: [
        'COLUMN_NAME',
        'NULLABLE',
        'DATA_TYPE',
        'KEY_OR_CONSTRAINT',
        'MODEL_LAYER',
      ],
      rows,
      rowsAffected: rows.length,
      message: `Structure described for ${objName} (${rows.length} fields).`,
      durationMs: elapsed(),
      session,
    };
  }

  // 3. SET SERVEROUTPUT ON / OFF
  const serverOutMatch = stmt.match(/^SET\s+SERVEROUTPUT\s+(ON|OFF)$/i);
  if (serverOutMatch) {
    const isOn = serverOutMatch[1].toUpperCase() === 'ON';
    return {
      ok: true,
      commandType: 'SET',
      statement: stmt,
      message: `SERVEROUTPUT set to ${isOn ? 'ON' : 'OFF'} in local SQL simulation.`,
      durationMs: elapsed(),
      session: { ...session, serverOutput: isOn },
    };
  }

  // 4. SHOW ERRORS
  if (/^SHOW\s+ERRORS(?:\s+PROCEDURE\s+[A-Za-z0-9_]+)?$/i.test(stmt)) {
    const msg = session.lastError
      ? `Last simulated error: ${session.lastError}`
      : 'No errors.';
    return {
      ok: true,
      commandType: 'SHOW_ERRORS',
      statement: stmt,
      columns: ['STATUS', 'DIAGNOSTIC'],
      rows: [{ STATUS: session.lastError ? 'ERROR' : 'VALID', DIAGNOSTIC: msg }],
      message: msg,
      durationMs: elapsed(),
      session,
    };
  }

  // 5. COMMIT
  if (/^COMMIT$/i.test(stmt)) {
    const nextSession: SqlSessionState = {
      ...session,
      committedState: cloneDatabaseState(session.workingState),
      uncommittedCount: 0,
      savepoints: {},
    };
    return {
      ok: true,
      commandType: 'COMMIT',
      statement: stmt,
      message: 'Commit complete. Local staged changes synchronised with shared browser state.',
      durationMs: elapsed(),
      session: nextSession,
      didCommitToSharedState: true,
    };
  }

  // 6. SAVEPOINT <name>
  const savepointMatch = stmt.match(/^SAVEPOINT\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (savepointMatch) {
    const spName = savepointMatch[1].toUpperCase();
    return {
      ok: true,
      commandType: 'SAVEPOINT',
      statement: stmt,
      message: `Savepoint '${spName}' created in local transaction buffer.`,
      durationMs: elapsed(),
      session: {
        ...session,
        savepoints: {
          ...session.savepoints,
          [spName]: cloneDatabaseState(session.workingState),
        },
      },
    };
  }

  // 7. ROLLBACK [TO [SAVEPOINT] <name>]
  const rollbackMatch = stmt.match(
    /^ROLLBACK(?:\s+TO(?:\s+SAVEPOINT)?\s+([A-Za-z_][A-Za-z0-9_]*))?$/i
  );
  if (rollbackMatch) {
    const spName = rollbackMatch[1]?.toUpperCase();
    if (spName) {
      const targetSp = session.savepoints[spName];
      if (!targetSp) {
        const err = `ORA-SIM-01086: savepoint '${spName}' never established in this session.`;
        return {
          ok: false,
          commandType: 'ERROR',
          statement: stmt,
          message: err,
          errorCode: 'ORA-SIM-01086',
          durationMs: elapsed(),
          session: { ...session, lastError: err },
        };
      }
      return {
        ok: true,
        commandType: 'ROLLBACK',
        statement: stmt,
        message: `Rollback to savepoint '${spName}' complete.`,
        durationMs: elapsed(),
        session: {
          ...session,
          workingState: cloneDatabaseState(targetSp),
        },
      };
    }

    return {
      ok: true,
      commandType: 'ROLLBACK',
      statement: stmt,
      message:
        'Rollback complete. Uncommitted working changes discarded; previously committed browser data preserved.',
      durationMs: elapsed(),
      session: {
        ...session,
        workingState: cloneDatabaseState(session.committedState),
        uncommittedCount: 0,
        savepoints: {},
      },
    };
  }

  // 8. EXEC / EXECUTE stored procedure simulation
  const execMatch = stmt.match(/^(?:EXEC|EXECUTE)\s+([A-Za-z0-9_]+)(?:\s*\(([\s\S]*)\))?$/i);
  if (execMatch) {
    return executeProcedureSimulation(
      stmt,
      execMatch[1].toUpperCase(),
      execMatch[2] ?? '',
      session,
      options,
      elapsed
    );
  }

  // 9. SELECT
  if (/^SELECT\s+/i.test(stmt)) {
    return executeSelectStatement(stmt, session, elapsed);
  }

  // 10. INSERT INTO
  if (/^INSERT\s+INTO\s+/i.test(stmt)) {
    return executeInsertStatement(stmt, session, options, elapsed);
  }

  // 11. UPDATE
  if (/^UPDATE\s+/i.test(stmt)) {
    return executeUpdateStatement(stmt, session, options, elapsed);
  }

  // 12. DELETE
  if (/^DELETE\s+/i.test(stmt)) {
    return executeDeleteStatement(stmt, session, options, elapsed);
  }

  const errMsg = `ORA-SIM-00900: unsupported or invalid SQL statement '${stmt.split(/\s+/)[0]}'. Only SELECT, DESC, SHOW TABLES, INSERT, UPDATE, DELETE, COMMIT, ROLLBACK, SAVEPOINT, and supported EXEC procedures are permitted in this local simulation.`;
  return {
    ok: false,
    commandType: 'ERROR',
    statement: stmt,
    message: errMsg,
    errorCode: 'ORA-SIM-00900',
    durationMs: elapsed(),
    session: { ...session, lastError: errMsg },
  };
}

function executeProcedureSimulation(
  stmt: string,
  procName: string,
  rawArgs: string,
  session: SqlSessionState,
  options: SqlExecutionOptions,
  elapsed: () => number
): SqlExecutionResult {
  const argsList = rawArgs.trim() ? splitCommaSeparatedTopLevel(rawArgs) : [];
  const parsedArgs: (string | number | null)[] = [];

  for (const arg of argsList) {
    const p = parseSqlValue(arg, session.currentUser);
    if (!p.ok) {
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: p.error || 'ORA-SIM-06550: invalid procedure argument.',
        errorCode: 'ORA-SIM-06550',
        durationMs: elapsed(),
        session: { ...session, lastError: p.error || null },
      };
    }
    parsedArgs.push(p.value);
  }

  const ws = cloneDatabaseState(session.workingState);

  if (procName === 'ER_ADD_CANDIDATE') {
    if (parsedArgs.length !== 5) {
      const err =
        'ORA-SIM-06550: ER_ADD_CANDIDATE requires 5 arguments: (P_FULL_NAME, P_EMAIL, P_PHONE, P_QUALIFICATION, P_EXPERIENCE).';
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-06550',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const res = addCandidate(ws, {
      FULL_NAME: String(parsedArgs[0] ?? ''),
      EMAIL: String(parsedArgs[1] ?? ''),
      PHONE: parsedArgs[2] !== null ? String(parsedArgs[2]) : null,
      QUALIFICATION: parsedArgs[3] !== null ? String(parsedArgs[3]) : null,
      EXPERIENCE_YEARS: Number(parsedArgs[4]),
    });
    if (!res.ok) {
      const err = res.error || 'ORA-SIM-20001: Candidate email already exists.';
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-20001',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const nextWs = res.state;
    const shouldCommit = Boolean(options.autoCommit);
    return {
      ok: true,
      commandType: 'EXEC',
      statement: stmt,
      rowsAffected: 1,
      dbmsOutput: session.serverOutput
        ? [`Candidate added successfully: ${String(parsedArgs[0])}`]
        : [],
      message: `PL/SQL procedure ER_ADD_CANDIDATE simulated successfully (Candidate #${res.createdCandidateId}).`,
      durationMs: elapsed(),
      didCommitToSharedState: shouldCommit,
      session: {
        ...session,
        workingState: nextWs,
        committedState: shouldCommit ? cloneDatabaseState(nextWs) : session.committedState,
        uncommittedCount: shouldCommit ? 0 : session.uncommittedCount + 1,
      },
    };
  }

  if (procName === 'ER_APPLY_FOR_JOB') {
    if (parsedArgs.length !== 2) {
      const err =
        'ORA-SIM-06550: ER_APPLY_FOR_JOB requires 2 arguments: (P_CANDIDATE_ID, P_JOB_ID).';
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-06550',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const res = applyForJob(ws, {
      CANDIDATE_ID: Number(parsedArgs[0]),
      JOB_ID: Number(parsedArgs[1]),
    });
    if (!res.ok) {
      const err = res.error || 'ORA-SIM-20002: Application failed validation.';
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-20002',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const nextWs = res.state;
    const shouldCommit = Boolean(options.autoCommit);
    return {
      ok: true,
      commandType: 'EXEC',
      statement: stmt,
      rowsAffected: 1,
      dbmsOutput: session.serverOutput ? ['Application submitted successfully.'] : [],
      message: `PL/SQL procedure ER_APPLY_FOR_JOB simulated successfully (Application #${res.createdApplicationId}).`,
      durationMs: elapsed(),
      didCommitToSharedState: shouldCommit,
      session: {
        ...session,
        workingState: nextWs,
        committedState: shouldCommit ? cloneDatabaseState(nextWs) : session.committedState,
        uncommittedCount: shouldCommit ? 0 : session.uncommittedCount + 1,
      },
    };
  }

  if (procName === 'ER_UPDATE_STATUS') {
    if (parsedArgs.length !== 2) {
      const err =
        'ORA-SIM-06550: ER_UPDATE_STATUS requires 2 arguments: (P_APPLICATION_ID, P_NEW_STATUS).';
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-06550',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const res = updateApplicationStatus(
      ws,
      Number(parsedArgs[0]),
      String(parsedArgs[1] ?? ''),
      session.currentUser
    );
    if (!res.ok) {
      const err = res.error || 'ORA-SIM-20004: Application status update failed.';
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-20004',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const nextWs = res.state;
    const shouldCommit = Boolean(options.autoCommit);
    return {
      ok: true,
      commandType: 'EXEC',
      statement: stmt,
      rowsAffected: 1,
      dbmsOutput: session.serverOutput ? ['Application status updated successfully.'] : [],
      message: `PL/SQL procedure ER_UPDATE_STATUS simulated successfully (audit record created).`,
      durationMs: elapsed(),
      didCommitToSharedState: shouldCommit,
      session: {
        ...session,
        workingState: nextWs,
        committedState: shouldCommit ? cloneDatabaseState(nextWs) : session.committedState,
        uncommittedCount: shouldCommit ? 0 : session.uncommittedCount + 1,
      },
    };
  }

  if (procName === 'ER_SCHEDULE_INTERVIEW') {
    if (parsedArgs.length !== 5) {
      const err =
        'ORA-SIM-06550: ER_SCHEDULE_INTERVIEW requires 5 arguments: (P_APPLICATION_ID, P_INTERVIEW_ROUND, P_INTERVIEW_DATE, P_INTERVIEW_MODE, P_INTERVIEWER_NAME).';
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-06550',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const rawRound = parsedArgs[1];
    const numericRound =
      typeof rawRound === 'number'
        ? rawRound
        : /^\d+$/.test(String(rawRound))
          ? Number(rawRound)
          : 1;
    const roundLabel =
      typeof rawRound === 'string' && !/^\d+$/.test(rawRound) ? rawRound : undefined;

    const res = scheduleInterview(ws, {
      APPLICATION_ID: Number(parsedArgs[0]),
      INTERVIEW_ROUND: numericRound,
      INTERVIEW_DATE: String(parsedArgs[2] ?? ''),
      INTERVIEW_MODE: String(parsedArgs[3] ?? ''),
      INTERVIEWER_NAME: String(parsedArgs[4] ?? ''),
      _roundLabel: roundLabel,
    });
    if (!res.ok) {
      const err = res.error || 'ORA-SIM-20010: Interview scheduling failed.';
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-20010',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const nextWs = res.state;
    const shouldCommit = Boolean(options.autoCommit);
    return {
      ok: true,
      commandType: 'EXEC',
      statement: stmt,
      rowsAffected: 1,
      dbmsOutput: session.serverOutput ? ['Interview scheduled successfully.'] : [],
      message: 'PL/SQL procedure ER_SCHEDULE_INTERVIEW simulated successfully.',
      durationMs: elapsed(),
      didCommitToSharedState: shouldCommit,
      session: {
        ...session,
        workingState: nextWs,
        committedState: shouldCommit ? cloneDatabaseState(nextWs) : session.committedState,
        uncommittedCount: shouldCommit ? 0 : session.uncommittedCount + 1,
      },
    };
  }

  if (procName === 'ER_HIRE_CANDIDATE') {
    if (parsedArgs.length !== 3) {
      const err =
        'ORA-SIM-06550: ER_HIRE_CANDIDATE requires 3 arguments: (P_APPLICATION_ID, P_DESIGNATION, P_ANNUAL_SALARY).';
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-06550',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const res = hireCandidate(ws, {
      APPLICATION_ID: Number(parsedArgs[0]),
      DESIGNATION: String(parsedArgs[1] ?? ''),
      ANNUAL_SALARY: Number(parsedArgs[2]),
      CHANGED_BY: session.currentUser.toLowerCase(),
      AUTHORIZED_BY_NAME: 'Karan Anil Saini (SQL Console)',
    });
    if (!res.ok) {
      const err = res.error || 'ORA-SIM-20020: Candidate hiring procedure failed.';
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-20020',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const nextWs = res.state;
    const shouldCommit = Boolean(options.autoCommit);
    return {
      ok: true,
      commandType: 'EXEC',
      statement: stmt,
      rowsAffected: 1,
      dbmsOutput: session.serverOutput ? [res.message || 'Candidate hired successfully.'] : [],
      message: res.message || 'PL/SQL procedure ER_HIRE_CANDIDATE simulated successfully.',
      durationMs: elapsed(),
      didCommitToSharedState: shouldCommit,
      session: {
        ...session,
        workingState: nextWs,
        committedState: shouldCommit ? cloneDatabaseState(nextWs) : session.committedState,
        uncommittedCount: shouldCommit ? 0 : session.uncommittedCount + 1,
      },
    };
  }

  if (procName === 'ER_APPLICATION_REPORT') {
    const viewRows = selectCandidateApplicationView(ws);
    const lines = viewRows.map(
      (r) =>
        `Application ID: ${r.APPLICATION_ID} | Candidate: ${r.FULL_NAME} | Job: ${r.JOB_TITLE} | Department: ${r.DEPT_NAME} | Status: ${r.APPLICATION_STATUS} | Date: ${r.APPLICATION_DATE}`
    );
    const tableRows = viewRows.map((r) => ({
      APPLICATION_ID: r.APPLICATION_ID,
      CANDIDATE: r.FULL_NAME,
      JOB: r.JOB_TITLE,
      DEPARTMENT: r.DEPT_NAME,
      STATUS: r.APPLICATION_STATUS,
      APPLICATION_DATE: r.APPLICATION_DATE,
    }));
    return {
      ok: true,
      commandType: 'EXEC',
      statement: stmt,
      columns: ['APPLICATION_ID', 'CANDIDATE', 'JOB', 'DEPARTMENT', 'STATUS', 'APPLICATION_DATE'],
      rows: tableRows,
      rowsAffected: viewRows.length,
      dbmsOutput: session.serverOutput ? lines : [],
      message: `PL/SQL cursor procedure ER_APPLICATION_REPORT simulated (${viewRows.length} rows).`,
      durationMs: elapsed(),
      session,
    };
  }

  const errMsg = `ORA-SIM-06550: procedure '${procName}' is not supported in the local SQL simulation. Supported procedures: ER_ADD_CANDIDATE, ER_APPLY_FOR_JOB, ER_UPDATE_STATUS, ER_SCHEDULE_INTERVIEW, ER_APPLICATION_REPORT, ER_HIRE_CANDIDATE.`;
  return {
    ok: false,
    commandType: 'ERROR',
    statement: stmt,
    message: errMsg,
    errorCode: 'ORA-SIM-06550',
    durationMs: elapsed(),
    session: { ...session, lastError: errMsg },
  };
}

function executeSelectStatement(
  stmt: string,
  session: SqlSessionState,
  elapsed: () => number
): SqlExecutionResult {
  // Normalize whitespace outside quotes
  const fromMatch = stmt.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+([\s\S]+)$/i);
  if (!fromMatch) {
    const err = 'ORA-SIM-00923: FROM keyword not found where expected.';
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: err,
      errorCode: 'ORA-SIM-00923',
      durationMs: elapsed(),
      session: { ...session, lastError: err },
    };
  }

  const selectProjectionRaw = fromMatch[1].trim();
  let rest = fromMatch[2].trim();

  // Extract ORDER BY
  let orderByRaw = '';
  const orderIdx = findTopLevelClauseIndex(rest, 'ORDER BY');
  if (orderIdx !== -1) {
    orderByRaw = rest.slice(orderIdx + 'ORDER BY'.length).trim();
    rest = rest.slice(0, orderIdx).trim();
  }

  // Extract GROUP BY
  let groupByRaw = '';
  const groupIdx = findTopLevelClauseIndex(rest, 'GROUP BY');
  if (groupIdx !== -1) {
    groupByRaw = rest.slice(groupIdx + 'GROUP BY'.length).trim();
    rest = rest.slice(0, groupIdx).trim();
  }

  // Extract WHERE
  let whereRaw = '';
  const whereIdx = findTopLevelClauseIndex(rest, 'WHERE');
  if (whereIdx !== -1) {
    whereRaw = rest.slice(whereIdx + 'WHERE'.length).trim();
    rest = rest.slice(0, whereIdx).trim();
  }

  // Parse FROM + optional JOINs
  const joinResult = evaluateFromAndJoins(rest, session.workingState, session.currentUser);
  if (!joinResult.ok) {
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: joinResult.error || 'ORA-SIM-00942: table or view does not exist.',
      errorCode: joinResult.errorCode || 'ORA-SIM-00942',
      durationMs: elapsed(),
      session: { ...session, lastError: joinResult.error || null },
    };
  }

  let workingRows = joinResult.rows;
  const allowedCols = joinResult.allowedColumns;

  // Apply WHERE filter
  if (whereRaw) {
    const filtered: Record<string, string | number | null>[] = [];
    for (const row of workingRows) {
      const wRes = evaluateWhereClause(whereRaw, row, allowedCols, session.currentUser);
      if (!wRes.ok) {
        return {
          ok: false,
          commandType: 'ERROR',
          statement: stmt,
          message: wRes.error || 'ORA-SIM-00904: invalid identifier in WHERE clause.',
          errorCode: 'ORA-SIM-00904',
          durationMs: elapsed(),
          session: { ...session, lastError: wRes.error || null },
        };
      }
      if (wRes.matches) filtered.push(row);
    }
    workingRows = filtered;
  }

  // Parse projection expressions
  const projItems = splitCommaSeparatedTopLevel(selectProjectionRaw);
  const hasAggregate = projItems.some((item) =>
    /(?:COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(item)
  );

  let projectedRows: Record<string, string | number | null>[] = [];
  let outputColumns: string[] = [];

  if (groupByRaw || hasAggregate) {
    const groupCols = groupByRaw
      ? splitCommaSeparatedTopLevel(groupByRaw).map((c) =>
          (c.includes('.') ? c.split('.').pop()! : c).trim().toUpperCase()
        )
      : [];

    for (const gc of groupCols) {
      if (!allowedCols.has(gc)) {
        const err = `ORA-SIM-00904: "${gc}": invalid identifier in GROUP BY clause.`;
        return {
          ok: false,
          commandType: 'ERROR',
          statement: stmt,
          message: err,
          errorCode: 'ORA-SIM-00904',
          durationMs: elapsed(),
          session: { ...session, lastError: err },
        };
      }
    }

    const groups = new Map<string, Record<string, string | number | null>[]>();
    if (groupCols.length === 0) {
      groups.set('__ALL__', workingRows);
    } else {
      for (const r of workingRows) {
        const key = groupCols.map((gc) => String(r[gc] ?? 'NULL')).join('||');
        const list = groups.get(key) ?? [];
        list.push(r);
        groups.set(key, list);
      }
    }

    for (const [, groupRows] of groups.entries()) {
      const outRow: Record<string, string | number | null> = {};
      for (const expr of projItems) {
        const { exprBody, alias } = splitColumnAlias(expr);
        const evalRes = evaluateAggregateOrGroupField(
          exprBody,
          alias,
          groupRows,
          allowedCols,
          session.currentUser
        );
        if (!evalRes.ok) {
          return {
            ok: false,
            commandType: 'ERROR',
            statement: stmt,
            message: evalRes.error || 'ORA-SIM-00904: invalid aggregate expression.',
            errorCode: 'ORA-SIM-00904',
            durationMs: elapsed(),
            session: { ...session, lastError: evalRes.error || null },
          };
        }
        if (!outputColumns.includes(evalRes.columnName)) {
          outputColumns.push(evalRes.columnName);
        }
        outRow[evalRes.columnName] = evalRes.value;
      }
      projectedRows.push(outRow);
    }
  } else {
    // Non-aggregate SELECT
    if (projItems.length === 1 && projItems[0].trim() === '*') {
      outputColumns = Array.from(joinResult.defaultColumnOrder);
      projectedRows = workingRows.map((r) => {
        const obj: Record<string, string | number | null> = {};
        for (const col of outputColumns) {
          obj[col] = r[col] ?? null;
        }
        return obj;
      });
    } else {
      // Validate projections first even if workingRows is empty
      const parsedProj: {
        exprBody: string;
        outCol: string;
        nvlInner?: { col: string; fallback: string | number | null };
      }[] = [];

      for (const item of projItems) {
        const { exprBody, alias } = splitColumnAlias(item);
        const nvlMatch = exprBody.match(/^NVL\s*\(\s*([^,]+)\s*,\s*(.+)\s*\)$/i);
        if (nvlMatch) {
          const innerCol = nvlMatch[1].trim();
          const stripped = innerCol.includes('.')
            ? innerCol.split('.').pop()!.trim().toUpperCase()
            : innerCol.toUpperCase();
          if (!allowedCols.has(stripped)) {
            const err = `ORA-SIM-00904: "${innerCol}": invalid identifier in NVL.`;
            return {
              ok: false,
              commandType: 'ERROR',
              statement: stmt,
              message: err,
              errorCode: 'ORA-SIM-00904',
              durationMs: elapsed(),
              session: { ...session, lastError: err },
            };
          }
          const fb = parseSqlValue(nvlMatch[2], session.currentUser);
          if (!fb.ok) {
            return {
              ok: false,
              commandType: 'ERROR',
              statement: stmt,
              message: fb.error || 'ORA-SIM-00936: invalid NVL fallback.',
              errorCode: 'ORA-SIM-00936',
              durationMs: elapsed(),
              session: { ...session, lastError: fb.error || null },
            };
          }
          const outCol = (alias || `NVL(${stripped})`).toUpperCase();
          parsedProj.push({
            exprBody,
            outCol,
            nvlInner: { col: stripped, fallback: fb.value },
          });
          if (!outputColumns.includes(outCol)) outputColumns.push(outCol);
          continue;
        }

        if (/^SYSDATE$/i.test(exprBody) || /^USER$/i.test(exprBody)) {
          const outCol = (alias || exprBody).toUpperCase();
          parsedProj.push({ exprBody: exprBody.toUpperCase(), outCol });
          if (!outputColumns.includes(outCol)) outputColumns.push(outCol);
          continue;
        }

        const stripped = exprBody.includes('.')
          ? exprBody.split('.').pop()!.trim().toUpperCase()
          : exprBody.toUpperCase();
        if (!allowedCols.has(stripped)) {
          const err = `ORA-SIM-00904: "${exprBody}": invalid identifier in SELECT list.`;
          return {
            ok: false,
            commandType: 'ERROR',
            statement: stmt,
            message: err,
            errorCode: 'ORA-SIM-00904',
            durationMs: elapsed(),
            session: { ...session, lastError: err },
          };
        }
        const outCol = (alias || stripped).toUpperCase();
        parsedProj.push({ exprBody: stripped, outCol });
        if (!outputColumns.includes(outCol)) outputColumns.push(outCol);
      }

      for (const r of workingRows) {
        const outRow: Record<string, string | number | null> = {};
        for (const p of parsedProj) {
          if (p.nvlInner) {
            const rawVal = r[p.nvlInner.col];
            outRow[p.outCol] =
              rawVal !== null && rawVal !== undefined ? rawVal : p.nvlInner.fallback;
          } else if (p.exprBody === 'SYSDATE') {
            outRow[p.outCol] = getTodayIsoDate();
          } else if (p.exprBody === 'USER') {
            outRow[p.outCol] = session.currentUser;
          } else {
            outRow[p.outCol] = r[p.exprBody] ?? null;
          }
        }
        projectedRows.push(outRow);
      }
    }
  }

  // Apply ORDER BY
  if (orderByRaw) {
    const orderSpecs = splitCommaSeparatedTopLevel(orderByRaw).map((spec) => {
      const parts = spec.trim().split(/\s+/);
      const rawCol = parts[0];
      const stripped = rawCol.includes('.')
        ? rawCol.split('.').pop()!.trim().toUpperCase()
        : rawCol.toUpperCase();
      const dir = parts[1]?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      return { col: stripped, dir };
    });

    for (const spec of orderSpecs) {
      if (!allowedCols.has(spec.col) && !outputColumns.includes(spec.col)) {
        const err = `ORA-SIM-00904: "${spec.col}": invalid identifier in ORDER BY clause.`;
        return {
          ok: false,
          commandType: 'ERROR',
          statement: stmt,
          message: err,
          errorCode: 'ORA-SIM-00904',
          durationMs: elapsed(),
          session: { ...session, lastError: err },
        };
      }
    }

    projectedRows.sort((a, b) => {
      for (const spec of orderSpecs) {
        const va = a[spec.col];
        const vb = b[spec.col];
        if (va === vb) continue;
        if (va === null || va === undefined) return spec.dir === 'ASC' ? 1 : -1;
        if (vb === null || vb === undefined) return spec.dir === 'ASC' ? -1 : 1;
        const cmp =
          typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : String(va).localeCompare(String(vb));
        if (cmp !== 0) return spec.dir === 'ASC' ? cmp : -cmp;
      }
      return 0;
    });
  }

  return {
    ok: true,
    commandType: 'SELECT',
    statement: stmt,
    columns: outputColumns,
    rows: projectedRows,
    rowsAffected: projectedRows.length,
    message: `${projectedRows.length} row(s) selected.`,
    durationMs: elapsed(),
    session,
  };
}

function findTopLevelClauseIndex(sqlFragment: string, clauseUpper: string): number {
  let inQuotes = false;
  let parenDepth = 0;
  const upper = sqlFragment.toUpperCase();
  const len = clauseUpper.length;

  for (let i = 0; i <= sqlFragment.length - len; i++) {
    const ch = sqlFragment[i];
    if (ch === "'") inQuotes = !inQuotes;
    else if (!inQuotes && ch === '(') parenDepth++;
    else if (!inQuotes && ch === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (
      !inQuotes &&
      parenDepth === 0 &&
      upper.slice(i, i + len) === clauseUpper &&
      (i === 0 || /\s|\)/.test(sqlFragment[i - 1])) &&
      (i + len === sqlFragment.length || /\s|\(/.test(sqlFragment[i + len]))
    ) {
      return i;
    }
  }
  return -1;
}

function splitColumnAlias(expr: string): { exprBody: string; alias?: string } {
  const trimmed = expr.trim();
  const asMatch = trimmed.match(/^([\s\S]+?)\s+AS\s+([A-Za-z_][A-Za-z0-9_]*)$/i);
  if (asMatch) {
    return { exprBody: asMatch[1].trim(), alias: asMatch[2].trim() };
  }
  // Check trailing identifier after closing paren e.g. COUNT(*) TOTAL
  const parenAliasMatch = trimmed.match(/^([\s\S]+\))\s+([A-Za-z_][A-Za-z0-9_]*)$/);
  if (parenAliasMatch) {
    return { exprBody: parenAliasMatch[1].trim(), alias: parenAliasMatch[2].trim() };
  }
  return { exprBody: trimmed };
}

function evaluateAggregateOrGroupField(
  exprBody: string,
  alias: string | undefined,
  groupRows: Record<string, string | number | null>[],
  allowedCols: Set<string>,
  currentUser: string
): { ok: boolean; columnName: string; value: string | number | null; error?: string } {
  const trimmed = exprBody.trim();

  // NVL(SUM(...), 0)
  const nvlMatch = trimmed.match(/^NVL\s*\(\s*([\s\S]+?)\s*,\s*([^)]+)\s*\)$/i);
  if (nvlMatch) {
    const innerRes = evaluateAggregateOrGroupField(
      nvlMatch[1],
      undefined,
      groupRows,
      allowedCols,
      currentUser
    );
    if (!innerRes.ok) return innerRes;
    const fb = parseSqlValue(nvlMatch[2], currentUser);
    if (!fb.ok) {
      return { ok: false, columnName: '', value: null, error: fb.error };
    }
    const outCol = (alias || `NVL(${innerRes.columnName})`).toUpperCase();
    return {
      ok: true,
      columnName: outCol,
      value:
        innerRes.value !== null && innerRes.value !== undefined ? innerRes.value : fb.value,
    };
  }

  const aggMatch = trimmed.match(/^(COUNT|SUM|AVG|MIN|MAX)\s*\(\s*([^)]+)\s*\)$/i);
  if (aggMatch) {
    const fn = aggMatch[1].toUpperCase();
    const arg = aggMatch[2].trim();
    const outCol = (alias || `${fn}(${arg.toUpperCase()})`).toUpperCase();

    if (fn === 'COUNT' && arg === '*') {
      const nonEmptyRows = groupRows.filter((r) => r.__IS_LEFT_EMPTY__ !== 1);
      return {
        ok: true,
        columnName: outCol,
        value: groupRows.some((r) => r.__IS_LEFT_EMPTY__ === 1)
          ? nonEmptyRows.length
          : groupRows.length,
      };
    }

    const stripped = arg.includes('.')
      ? arg.split('.').pop()!.trim().toUpperCase()
      : arg.toUpperCase();
    if (!allowedCols.has(stripped)) {
      return {
        ok: false,
        columnName: '',
        value: null,
        error: `ORA-SIM-00904: "${arg}": invalid identifier inside ${fn}().`,
      };
    }

    const nonNullVals = groupRows
      .map((r) => r[stripped])
      .filter((v): v is string | number => v !== null && v !== undefined);

    if (fn === 'COUNT') {
      return { ok: true, columnName: outCol, value: nonNullVals.length };
    }
    if (nonNullVals.length === 0) {
      return { ok: true, columnName: outCol, value: null };
    }
    const numVals = nonNullVals.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
    if (fn === 'SUM') {
      return {
        ok: true,
        columnName: outCol,
        value: numVals.reduce((s, n) => s + n, 0),
      };
    }
    if (fn === 'AVG') {
      return {
        ok: true,
        columnName: outCol,
        value:
          numVals.length > 0
            ? Math.round((numVals.reduce((s, n) => s + n, 0) / numVals.length) * 100) / 100
            : null,
      };
    }
    if (fn === 'MIN') {
      return {
        ok: true,
        columnName: outCol,
        value: numVals.length > 0 ? Math.min(...numVals) : nonNullVals.sort()[0],
      };
    }
    if (fn === 'MAX') {
      return {
        ok: true,
        columnName: outCol,
        value:
          numVals.length > 0
            ? Math.max(...numVals)
            : nonNullVals.sort()[nonNullVals.length - 1],
      };
    }
  }

  // Plain grouped column
  const stripped = trimmed.includes('.')
    ? trimmed.split('.').pop()!.trim().toUpperCase()
    : trimmed.toUpperCase();
  if (!allowedCols.has(stripped)) {
    return {
      ok: false,
      columnName: '',
      value: null,
      error: `ORA-SIM-00904: "${trimmed}": invalid identifier in SELECT list.`,
    };
  }
  const outCol = (alias || stripped).toUpperCase();
  return {
    ok: true,
    columnName: outCol,
    value: groupRows[0]?.[stripped] ?? null,
  };
}

function evaluateFromAndJoins(
  fromClause: string,
  state: RecruitmentDatabaseState,
  currentUser: string
): {
  ok: boolean;
  rows: Record<string, string | number | null>[];
  allowedColumns: Set<string>;
  defaultColumnOrder: string[];
  error?: string;
  errorCode?: string;
} {
  // Tokenize by JOIN / INNER JOIN / LEFT JOIN
  const joinRegex = /\b(?:(INNER|LEFT(?:\s+OUTER)?)\s+)?JOIN\b/gi;
  const segments: { joinType: 'BASE' | 'INNER' | 'LEFT'; text: string }[] = [];
  let lastIndex = 0;
  let pendingType: 'BASE' | 'INNER' | 'LEFT' = 'BASE';
  let match: RegExpExecArray | null;

  while ((match = joinRegex.exec(fromClause)) !== null) {
    segments.push({
      joinType: pendingType,
      text: fromClause.slice(lastIndex, match.index).trim(),
    });
    const prefix = (match[1] ?? '').toUpperCase();
    pendingType = prefix.startsWith('LEFT') ? 'LEFT' : 'INNER';
    lastIndex = match.index + match[0].length;
  }
  segments.push({
    joinType: pendingType,
    text: fromClause.slice(lastIndex).trim(),
  });

  const baseTokens = segments[0].text.split(/\s+/);
  const baseTable = baseTokens[0]?.toUpperCase();
  const baseRows = getTableRecords(state, baseTable, currentUser);
  if (!baseRows) {
    return {
      ok: false,
      rows: [],
      allowedColumns: new Set(),
      defaultColumnOrder: [],
      error: `ORA-SIM-00942: table or view '${baseTable}' does not exist in the local simulation.`,
      errorCode: 'ORA-SIM-00942',
    };
  }

  const allowedColumns = new Set<string>(getAllowedColumnsForObject(baseTable));
  const defaultColumnOrder = Array.from(allowedColumns);
  let currentRows = baseRows.map((r) => ({ ...r }));

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const onIdx = findTopLevelClauseIndex(seg.text, 'ON');
    if (onIdx === -1) {
      return {
        ok: false,
        rows: [],
        allowedColumns,
        defaultColumnOrder,
        error: 'ORA-SIM-00905: missing ON keyword in JOIN clause.',
        errorCode: 'ORA-SIM-00905',
      };
    }
    const tablePart = seg.text.slice(0, onIdx).trim();
    const onCondition = seg.text.slice(onIdx + 2).trim();
    const joinTable = tablePart.split(/\s+/)[0]?.toUpperCase();
    const joinTableRows = getTableRecords(state, joinTable, currentUser);
    if (!joinTableRows) {
      return {
        ok: false,
        rows: [],
        allowedColumns,
        defaultColumnOrder,
        error: `ORA-SIM-00942: joined table or view '${joinTable}' does not exist in the local simulation.`,
        errorCode: 'ORA-SIM-00942',
      };
    }

    const joinCols = getAllowedColumnsForObject(joinTable);
    for (const c of joinCols) {
      allowedColumns.add(c);
      if (!defaultColumnOrder.includes(c)) defaultColumnOrder.push(c);
    }

    const nextRows: Record<string, string | number | null>[] = [];
    for (const leftRow of currentRows) {
      let matchedAny = false;
      for (const rightRow of joinTableRows) {
        const combined: Record<string, string | number | null> = {
          ...rightRow,
          ...leftRow,
        };
        // Also populate table/alias qualified keys if needed, and ensure rightRow keys exist
        for (const [k, v] of Object.entries(rightRow)) {
          if (combined[k] === undefined || combined[k] === null) {
            combined[k] = v;
          }
        }
        const condRes = evaluateJoinOnCondition(
          onCondition,
          leftRow,
          rightRow,
          combined,
          allowedColumns,
          currentUser
        );
        if (!condRes.ok) {
          return {
            ok: false,
            rows: [],
            allowedColumns,
            defaultColumnOrder,
            error: condRes.error,
            errorCode: 'ORA-SIM-00904',
          };
        }
        if (condRes.matches) {
          matchedAny = true;
          nextRows.push(combined);
        }
      }
      if (!matchedAny && seg.joinType === 'LEFT') {
        const nullRight: Record<string, string | number | null> = {
          ...leftRow,
          __IS_LEFT_EMPTY__: 1,
        };
        for (const c of joinCols) {
          if (!(c in nullRight)) nullRight[c] = null;
        }
        nextRows.push(nullRight);
      }
    }
    currentRows = nextRows;
  }

  return {
    ok: true,
    rows: currentRows,
    allowedColumns,
    defaultColumnOrder,
  };
}

function evaluateJoinOnCondition(
  onCondition: string,
  leftRow: Record<string, string | number | null>,
  rightRow: Record<string, string | number | null>,
  combinedRow: Record<string, string | number | null>,
  allowedCols: Set<string>,
  currentUser: string
): { ok: boolean; matches: boolean; error?: string } {
  const andParts = splitLogicalKeyword(onCondition, 'AND');
  for (const part of andParts) {
    const eqMatch = part.match(/^([A-Za-z0-9_.]+)\s*=\s*([A-Za-z0-9_.]+)$/);
    if (eqMatch) {
      const colA = (eqMatch[1].includes('.') ? eqMatch[1].split('.').pop()! : eqMatch[1])
        .trim()
        .toUpperCase();
      const colB = (eqMatch[2].includes('.') ? eqMatch[2].split('.').pop()! : eqMatch[2])
        .trim()
        .toUpperCase();
      if (!allowedCols.has(colA) || !allowedCols.has(colB)) {
        return {
          ok: false,
          matches: false,
          error: `ORA-SIM-00904: invalid JOIN identifier '${colA}' or '${colB}'.`,
        };
      }
      const valLeft = leftRow[colA] !== undefined ? leftRow[colA] : rightRow[colA];
      const valRight = rightRow[colB] !== undefined ? rightRow[colB] : leftRow[colB];
      if (valLeft === null || valRight === null || valLeft !== valRight) {
        return { ok: true, matches: false };
      }
    } else {
      const wRes = evaluateWhereClause(part, combinedRow, allowedCols, currentUser);
      if (!wRes.ok) return wRes;
      if (!wRes.matches) return { ok: true, matches: false };
    }
  }
  return { ok: true, matches: true };
}

function executeInsertStatement(
  stmt: string,
  session: SqlSessionState,
  options: SqlExecutionOptions,
  elapsed: () => number
): SqlExecutionResult {
  const match = stmt.match(
    /^INSERT\s+INTO\s+([A-Za-z0-9_]+)\s*(?:\(([^)]+)\))?\s*VALUES\s*\(([\s\S]+)\)$/i
  );
  if (!match) {
    const err =
      'ORA-SIM-00926: malformed INSERT statement. Expected INSERT INTO <table> [(cols)] VALUES (...).';
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: err,
      errorCode: 'ORA-SIM-00926',
      durationMs: elapsed(),
      session: { ...session, lastError: err },
    };
  }

  const tableName = match[1].toUpperCase();
  if (READ_ONLY_VIEWS.has(tableName)) {
    const err = `ORA-SIM-01732: data manipulation operation not legal on read-only view '${tableName}'.`;
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: err,
      errorCode: 'ORA-SIM-01732',
      durationMs: elapsed(),
      session: { ...session, lastError: err },
    };
  }

  const schemaCols = TABLE_SCHEMAS[tableName]?.filter((c) => c.SCOPE === 'ORACLE_SCHEMA');
  if (!schemaCols) {
    const err = `ORA-SIM-00942: table '${tableName}' does not exist in the local simulation.`;
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: err,
      errorCode: 'ORA-SIM-00942',
      durationMs: elapsed(),
      session: { ...session, lastError: err },
    };
  }

  const allowedColSet = new Set(schemaCols.map((c) => c.COLUMN_NAME));
  const targetCols = match[2]
    ? splitCommaSeparatedTopLevel(match[2]).map((c) => c.trim().toUpperCase())
    : schemaCols.map((c) => c.COLUMN_NAME);

  for (const col of targetCols) {
    if (!allowedColSet.has(col)) {
      const err = `ORA-SIM-00904: "${col}": invalid identifier for table ${tableName}.`;
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-00904',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
  }

  const rawValues = splitCommaSeparatedTopLevel(match[3]);
  if (rawValues.length !== targetCols.length) {
    const err = `ORA-SIM-00947: column count (${targetCols.length}) does not match value count (${rawValues.length}).`;
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: err,
      errorCode: 'ORA-SIM-00947',
      durationMs: elapsed(),
      session: { ...session, lastError: err },
    };
  }

  const recordMap: Record<string, string | number | null> = {};
  for (let i = 0; i < targetCols.length; i++) {
    const parsed = parseSqlValue(rawValues[i], session.currentUser);
    if (!parsed.ok) {
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: parsed.error || 'ORA-SIM-00936: invalid value in INSERT.',
        errorCode: 'ORA-SIM-00936',
        durationMs: elapsed(),
        session: { ...session, lastError: parsed.error || null },
      };
    }
    recordMap[targetCols[i]] = parsed.value;
  }

  const ws = cloneDatabaseState(session.workingState);
  const validation = applyValidatedInsert(ws, tableName, recordMap);
  if (!validation.ok) {
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: validation.error,
      errorCode: validation.errorCode,
      durationMs: elapsed(),
      session: { ...session, lastError: validation.error },
    };
  }

  const shouldCommit = Boolean(options.autoCommit);
  return {
    ok: true,
    commandType: 'INSERT',
    statement: stmt,
    rowsAffected: 1,
    message: `1 row created in ${tableName}.`,
    durationMs: elapsed(),
    didCommitToSharedState: shouldCommit,
    session: {
      ...session,
      workingState: ws,
      committedState: shouldCommit ? cloneDatabaseState(ws) : session.committedState,
      uncommittedCount: shouldCommit ? 0 : session.uncommittedCount + 1,
    },
  };
}

function applyValidatedInsert(
  ws: RecruitmentDatabaseState,
  tableName: string,
  row: Record<string, string | number | null>
): { ok: true } | { ok: false; error: string; errorCode: string } {
  if (tableName === 'ER_DEPARTMENT') {
    const id = Number(row.DEPT_ID);
    const name = String(row.DEPT_NAME ?? '').trim();
    if (!row.DEPT_ID || Number.isNaN(id)) {
      return {
        ok: false,
        error: 'ORA-SIM-01400: cannot insert NULL or non-numeric into ER_DEPARTMENT.DEPT_ID.',
        errorCode: 'ORA-SIM-01400',
      };
    }
    if (!name) {
      return {
        ok: false,
        error: 'ORA-SIM-01400: cannot insert NULL into ER_DEPARTMENT.DEPT_NAME.',
        errorCode: 'ORA-SIM-01400',
      };
    }
    if (ws.departments.some((d) => d.DEPT_ID === id)) {
      return {
        ok: false,
        error: `ORA-SIM-00001: duplicate identifier — DEPT_ID ${id} already exists in ER_DEPARTMENT.`,
        errorCode: 'ORA-SIM-00001',
      };
    }
    if (ws.departments.some((d) => d.DEPT_NAME.toLowerCase() === name.toLowerCase())) {
      return {
        ok: false,
        error: `ORA-SIM-00001: unique constraint violated — DEPT_NAME '${name}' already exists.`,
        errorCode: 'ORA-SIM-00001',
      };
    }
    ws.departments.push({ DEPT_ID: id, DEPT_NAME: name });
    return { ok: true };
  }

  if (tableName === 'ER_JOB') {
    const jobId = Number(row.JOB_ID);
    const title = String(row.JOB_TITLE ?? '').trim();
    const deptId = Number(row.DEPT_ID);
    const desc = row.JOB_DESCRIPTION !== null && row.JOB_DESCRIPTION !== undefined ? String(row.JOB_DESCRIPTION) : null;
    const minSal = row.MIN_SALARY !== null && row.MIN_SALARY !== undefined ? Number(row.MIN_SALARY) : null;
    const maxSal = row.MAX_SALARY !== null && row.MAX_SALARY !== undefined ? Number(row.MAX_SALARY) : null;
    const vacancies = row.VACANCIES !== null && row.VACANCIES !== undefined ? Number(row.VACANCIES) : 1;
    const status = String(row.JOB_STATUS ?? 'OPEN').toUpperCase() as JobStatus;
    const postedDate = String(row.POSTED_DATE ?? getTodayIsoDate());

    if (!row.JOB_ID || Number.isNaN(jobId) || !title || !row.DEPT_ID || Number.isNaN(deptId)) {
      return {
        ok: false,
        error: 'ORA-SIM-01400: JOB_ID, JOB_TITLE, and DEPT_ID are required (NOT NULL).',
        errorCode: 'ORA-SIM-01400',
      };
    }
    if (ws.jobs.some((j) => j.JOB_ID === jobId)) {
      return {
        ok: false,
        error: `ORA-SIM-00001: duplicate identifier — JOB_ID ${jobId} already exists.`,
        errorCode: 'ORA-SIM-00001',
      };
    }
    if (!ws.departments.some((d) => d.DEPT_ID === deptId)) {
      return {
        ok: false,
        error: `ORA-SIM-02291: simulated integrity constraint (ER_JOB_DEPT_FK) violated — parent DEPT_ID ${deptId} not found.`,
        errorCode: 'ORA-SIM-02291',
      };
    }
    if (minSal !== null && maxSal !== null && minSal > maxSal) {
      return {
        ok: false,
        error: 'ORA-SIM-02290: check constraint (ER_JOB_SALARY_CK) violated — MIN_SALARY > MAX_SALARY.',
        errorCode: 'ORA-SIM-02290',
      };
    }
    if (Number.isNaN(vacancies) || vacancies < 0) {
      return {
        ok: false,
        error: 'ORA-SIM-02290: check constraint (ER_JOB_VACANCY_CK) violated — VACANCIES must be >= 0.',
        errorCode: 'ORA-SIM-02290',
      };
    }
    if (!ALLOWED_JOB_STATUSES.includes(status)) {
      return {
        ok: false,
        error: `ORA-SIM-02290: check constraint (ER_JOB_STATUS_CK) violated — invalid JOB_STATUS '${status}'.`,
        errorCode: 'ORA-SIM-02290',
      };
    }
    ws.jobs.push({
      JOB_ID: jobId,
      JOB_TITLE: title,
      DEPT_ID: deptId,
      JOB_DESCRIPTION: desc,
      MIN_SALARY: minSal,
      MAX_SALARY: maxSal,
      VACANCIES: vacancies,
      JOB_STATUS: status,
      POSTED_DATE: postedDate,
    });
    return { ok: true };
  }

  if (tableName === 'ER_CANDIDATE') {
    const candId = Number(row.CANDIDATE_ID);
    const fullName = String(row.FULL_NAME ?? '').trim();
    const email = String(row.EMAIL ?? '').trim().toLowerCase();
    const phone = row.PHONE !== null && row.PHONE !== undefined ? String(row.PHONE) : null;
    const qual = row.QUALIFICATION !== null && row.QUALIFICATION !== undefined ? String(row.QUALIFICATION) : null;
    const exp = row.EXPERIENCE_YEARS !== null && row.EXPERIENCE_YEARS !== undefined ? Number(row.EXPERIENCE_YEARS) : 0;
    const createdDate = String(row.CREATED_DATE ?? getTodayIsoDate());

    if (!row.CANDIDATE_ID || Number.isNaN(candId) || !fullName || !email) {
      return {
        ok: false,
        error: 'ORA-SIM-01400: CANDIDATE_ID, FULL_NAME, and EMAIL are required (NOT NULL).',
        errorCode: 'ORA-SIM-01400',
      };
    }
    if (ws.candidates.some((c) => c.CANDIDATE_ID === candId)) {
      return {
        ok: false,
        error: `ORA-SIM-00001: duplicate identifier — CANDIDATE_ID ${candId} already exists.`,
        errorCode: 'ORA-SIM-00001',
      };
    }
    if (ws.candidates.some((c) => c.EMAIL.toLowerCase() === email)) {
      return {
        ok: false,
        error: `ORA-SIM-00001: unique constraint violated — EMAIL '${email}' already exists.`,
        errorCode: 'ORA-SIM-00001',
      };
    }
    if (Number.isNaN(exp) || exp < 0) {
      return {
        ok: false,
        error: 'ORA-SIM-02290: check constraint (ER_CAND_EXP_CK) violated — EXPERIENCE_YEARS must be >= 0.',
        errorCode: 'ORA-SIM-02290',
      };
    }
    ws.candidates.push({
      CANDIDATE_ID: candId,
      FULL_NAME: fullName,
      EMAIL: email,
      PHONE: phone,
      QUALIFICATION: qual,
      EXPERIENCE_YEARS: exp,
      CREATED_DATE: createdDate,
      _origin: 'SQL_INSERT',
    });
    return { ok: true };
  }

  if (tableName === 'ER_APPLICATION') {
    const appId = Number(row.APPLICATION_ID);
    const candId = Number(row.CANDIDATE_ID);
    const jobId = Number(row.JOB_ID);
    const appDate = String(row.APPLICATION_DATE ?? getTodayIsoDate());
    const status = String(row.APPLICATION_STATUS ?? 'APPLIED').toUpperCase() as ApplicationStatus;
    const remarks = row.REMARKS !== null && row.REMARKS !== undefined ? String(row.REMARKS) : null;

    if (!row.APPLICATION_ID || Number.isNaN(appId) || !row.CANDIDATE_ID || !row.JOB_ID) {
      return {
        ok: false,
        error: 'ORA-SIM-01400: APPLICATION_ID, CANDIDATE_ID, and JOB_ID are required (NOT NULL).',
        errorCode: 'ORA-SIM-01400',
      };
    }
    if (ws.applications.some((a) => a.APPLICATION_ID === appId)) {
      return {
        ok: false,
        error: `ORA-SIM-00001: duplicate identifier — APPLICATION_ID ${appId} already exists.`,
        errorCode: 'ORA-SIM-00001',
      };
    }
    if (!ws.candidates.some((c) => c.CANDIDATE_ID === candId)) {
      return {
        ok: false,
        error: `ORA-SIM-02291: simulated integrity constraint (ER_APP_CAND_FK) violated — CANDIDATE_ID ${candId} not found.`,
        errorCode: 'ORA-SIM-02291',
      };
    }
    if (!ws.jobs.some((j) => j.JOB_ID === jobId)) {
      return {
        ok: false,
        error: `ORA-SIM-02291: simulated integrity constraint (ER_APP_JOB_FK) violated — JOB_ID ${jobId} not found.`,
        errorCode: 'ORA-SIM-02291',
      };
    }
    if (ws.applications.some((a) => a.CANDIDATE_ID === candId && a.JOB_ID === jobId)) {
      return {
        ok: false,
        error: `ORA-SIM-00001: unique constraint (ER_APP_UNQ) violated — Candidate ${candId} already applied to Job ${jobId}.`,
        errorCode: 'ORA-SIM-00001',
      };
    }
    if (!ALLOWED_APPLICATION_STATUSES.includes(status)) {
      return {
        ok: false,
        error: `ORA-SIM-02290: check constraint (ER_APP_STATUS_CK) violated — invalid APPLICATION_STATUS '${status}'.`,
        errorCode: 'ORA-SIM-02290',
      };
    }
    ws.applications.push({
      APPLICATION_ID: appId,
      CANDIDATE_ID: candId,
      JOB_ID: jobId,
      APPLICATION_DATE: appDate,
      APPLICATION_STATUS: status,
      REMARKS: remarks,
      _origin: 'SQL_INSERT',
    });
    return { ok: true };
  }

  if (tableName === 'ER_INTERVIEW') {
    const intId = Number(row.INTERVIEW_ID);
    const appId = Number(row.APPLICATION_ID);
    const round = row.INTERVIEW_ROUND !== null && row.INTERVIEW_ROUND !== undefined ? Number(row.INTERVIEW_ROUND) : 1;
    const intDate = String(row.INTERVIEW_DATE ?? '');
    const mode = String(row.INTERVIEW_MODE ?? 'ONLINE').toUpperCase() as InterviewMode;
    const interviewer = row.INTERVIEWER_NAME !== null && row.INTERVIEWER_NAME !== undefined ? String(row.INTERVIEWER_NAME) : null;
    const score = row.SCORE !== null && row.SCORE !== undefined ? Number(row.SCORE) : null;
    const feedback = row.FEEDBACK !== null && row.FEEDBACK !== undefined ? String(row.FEEDBACK) : null;
    const status = String(row.INTERVIEW_STATUS ?? 'SCHEDULED').toUpperCase() as InterviewStatus;

    if (!row.INTERVIEW_ID || Number.isNaN(intId) || !row.APPLICATION_ID || !intDate) {
      return {
        ok: false,
        error: 'ORA-SIM-01400: INTERVIEW_ID, APPLICATION_ID, and INTERVIEW_DATE are required (NOT NULL).',
        errorCode: 'ORA-SIM-01400',
      };
    }
    if (ws.interviews.some((i) => i.INTERVIEW_ID === intId)) {
      return {
        ok: false,
        error: `ORA-SIM-00001: duplicate identifier — INTERVIEW_ID ${intId} already exists.`,
        errorCode: 'ORA-SIM-00001',
      };
    }
    if (!ws.applications.some((a) => a.APPLICATION_ID === appId)) {
      return {
        ok: false,
        error: `ORA-SIM-02291: simulated integrity constraint (ER_INT_APP_FK) violated — APPLICATION_ID ${appId} not found.`,
        errorCode: 'ORA-SIM-02291',
      };
    }
    if (ws.interviews.some((i) => i.APPLICATION_ID === appId && i.INTERVIEW_ROUND === round)) {
      return {
        ok: false,
        error: `ORA-SIM-00001: unique constraint (ER_INT_UNQ) violated — Round ${round} already exists for Application ${appId}.`,
        errorCode: 'ORA-SIM-00001',
      };
    }
    if (!ALLOWED_INTERVIEW_MODES.includes(mode)) {
      return {
        ok: false,
        error: `ORA-SIM-02290: check constraint (ER_INT_MODE_CK) violated — invalid INTERVIEW_MODE '${mode}'.`,
        errorCode: 'ORA-SIM-02290',
      };
    }
    if (!ALLOWED_INTERVIEW_STATUSES.includes(status)) {
      return {
        ok: false,
        error: `ORA-SIM-02290: check constraint (ER_INT_STATUS_CK) violated — invalid INTERVIEW_STATUS '${status}'.`,
        errorCode: 'ORA-SIM-02290',
      };
    }
    if (score !== null && (Number.isNaN(score) || score < 0 || score > 100)) {
      return {
        ok: false,
        error: 'ORA-SIM-02290: check constraint (ER_INT_SCORE_CK) violated — SCORE must be between 0 and 100.',
        errorCode: 'ORA-SIM-02290',
      };
    }
    ws.interviews.push({
      INTERVIEW_ID: intId,
      APPLICATION_ID: appId,
      INTERVIEW_ROUND: round,
      INTERVIEW_DATE: intDate,
      INTERVIEW_MODE: mode,
      INTERVIEWER_NAME: interviewer,
      SCORE: score,
      FEEDBACK: feedback,
      INTERVIEW_STATUS: status,
      _origin: 'LOCAL_DEMO',
    });
    return { ok: true };
  }

  if (tableName === 'ER_EMPLOYEE') {
    const empId = Number(row.EMPLOYEE_ID);
    const appId = Number(row.APPLICATION_ID);
    const candId = Number(row.CANDIDATE_ID);
    const joiningDate = String(row.JOINING_DATE ?? getTodayIsoDate());
    const designation = String(row.DESIGNATION ?? 'Associate').trim();
    const salary = Number(row.ANNUAL_SALARY ?? 0);
    const status = String(row.EMPLOYMENT_STATUS ?? 'ACTIVE').toUpperCase() as EmploymentStatus;

    if (!row.EMPLOYEE_ID || Number.isNaN(empId) || !row.APPLICATION_ID || !row.CANDIDATE_ID) {
      return {
        ok: false,
        error: 'ORA-SIM-01400: EMPLOYEE_ID, APPLICATION_ID, and CANDIDATE_ID are required (NOT NULL).',
        errorCode: 'ORA-SIM-01400',
      };
    }
    if (ws.employees.some((e) => e.EMPLOYEE_ID === empId)) {
      return {
        ok: false,
        error: `ORA-SIM-00001: duplicate identifier — EMPLOYEE_ID ${empId} already exists.`,
        errorCode: 'ORA-SIM-00001',
      };
    }
    if (ws.employees.some((e) => e.APPLICATION_ID === appId)) {
      return {
        ok: false,
        error: `ORA-SIM-00001: unique constraint violated — APPLICATION_ID ${appId} already has an employee record.`,
        errorCode: 'ORA-SIM-00001',
      };
    }
    if (ws.employees.some((e) => e.CANDIDATE_ID === candId)) {
      return {
        ok: false,
        error: `ORA-SIM-00001: unique constraint violated — CANDIDATE_ID ${candId} already has an employee record.`,
        errorCode: 'ORA-SIM-00001',
      };
    }
    const app = ws.applications.find((a) => a.APPLICATION_ID === appId);
    if (!app) {
      return {
        ok: false,
        error: `ORA-SIM-02291: simulated integrity constraint (ER_EMP_APP_FK) violated — APPLICATION_ID ${appId} not found.`,
        errorCode: 'ORA-SIM-02291',
      };
    }
    if (!ws.candidates.some((c) => c.CANDIDATE_ID === candId)) {
      return {
        ok: false,
        error: `ORA-SIM-02291: simulated integrity constraint (ER_EMP_CAND_FK) violated — CANDIDATE_ID ${candId} not found.`,
        errorCode: 'ORA-SIM-02291',
      };
    }
    if (!ALLOWED_EMPLOYMENT_STATUSES.includes(status)) {
      return {
        ok: false,
        error: `ORA-SIM-02290: check constraint (ER_EMP_STATUS_CK) violated — invalid EMPLOYMENT_STATUS '${status}'.`,
        errorCode: 'ORA-SIM-02290',
      };
    }
    ws.employees.push({
      EMPLOYEE_ID: empId,
      APPLICATION_ID: appId,
      CANDIDATE_ID: candId,
      JOINING_DATE: joiningDate,
      DESIGNATION: designation,
      ANNUAL_SALARY: salary,
      EMPLOYMENT_STATUS: status,
      _hierarchyLevel: 1,
      _managerEmployeeId: null,
      _promotionHistory: [],
      _salaryHistory: [
        {
          id: `sal-sql-${empId}-${Date.now()}`,
          employeeId: empId,
          date: joiningDate,
          previousSalary: salary,
          newSalary: salary,
          percentageIncrease: 0,
          authorizedBy: 'Karan Anil Saini (SQL Console)',
          authorizedByUsername: 'karan.saini',
          reason: 'Inserted via SQL Console INSERT INTO ER_EMPLOYEE.',
        },
      ],
    });
    return { ok: true };
  }

  return {
    ok: false,
    error: `ORA-SIM-01732: INSERT into '${tableName}' is not permitted directly.`,
    errorCode: 'ORA-SIM-01732',
  };
}

function executeUpdateStatement(
  stmt: string,
  session: SqlSessionState,
  options: SqlExecutionOptions,
  elapsed: () => number
): SqlExecutionResult {
  const match = stmt.match(/^UPDATE\s+([A-Za-z0-9_]+)\s+SET\s+([\s\S]+)$/i);
  if (!match) {
    const err = 'ORA-SIM-00971: missing SET keyword in UPDATE statement.';
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: err,
      errorCode: 'ORA-SIM-00971',
      durationMs: elapsed(),
      session: { ...session, lastError: err },
    };
  }

  const tableName = match[1].toUpperCase();
  if (READ_ONLY_VIEWS.has(tableName)) {
    const err = `ORA-SIM-01732: data manipulation operation not legal on read-only view '${tableName}'.`;
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: err,
      errorCode: 'ORA-SIM-01732',
      durationMs: elapsed(),
      session: { ...session, lastError: err },
    };
  }

  const schemaCols = TABLE_SCHEMAS[tableName]?.filter((c) => c.SCOPE === 'ORACLE_SCHEMA');
  if (!schemaCols) {
    const err = `ORA-SIM-00942: table '${tableName}' does not exist in the local simulation.`;
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: err,
      errorCode: 'ORA-SIM-00942',
      durationMs: elapsed(),
      session: { ...session, lastError: err },
    };
  }

  const allowedColSet = new Set(schemaCols.map((c) => c.COLUMN_NAME));
  let setPart = match[2].trim();
  let wherePart = '';
  const whereIdx = findTopLevelClauseIndex(setPart, 'WHERE');
  if (whereIdx !== -1) {
    wherePart = setPart.slice(whereIdx + 'WHERE'.length).trim();
    setPart = setPart.slice(0, whereIdx).trim();
  }

  const assignmentsRaw = splitCommaSeparatedTopLevel(setPart);
  const updates: Record<string, string | number | null> = {};

  for (const assign of assignmentsRaw) {
    const eqIdx = assign.indexOf('=');
    if (eqIdx === -1) {
      const err = `ORA-SIM-00927: missing equal sign in SET assignment '${assign}'.`;
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-00927',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const col = assign.slice(0, eqIdx).trim().toUpperCase();
    const valExpr = assign.slice(eqIdx + 1).trim();
    if (!allowedColSet.has(col)) {
      const err = `ORA-SIM-00904: "${col}": invalid identifier in UPDATE SET clause for ${tableName}.`;
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: err,
        errorCode: 'ORA-SIM-00904',
        durationMs: elapsed(),
        session: { ...session, lastError: err },
      };
    }
    const parsedVal = parseSqlValue(valExpr, session.currentUser);
    if (!parsedVal.ok) {
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: parsedVal.error || 'ORA-SIM-00936: invalid value in SET clause.',
        errorCode: 'ORA-SIM-00936',
        durationMs: elapsed(),
        session: { ...session, lastError: parsedVal.error || null },
      };
    }
    updates[col] = parsedVal.value;
  }

  const ws = cloneDatabaseState(session.workingState);
  const tableRows = getTableRecords(ws, tableName, session.currentUser) ?? [];

  // Identify matching primary keys
  const pkCol = schemaCols[0].COLUMN_NAME;
  const matchingPks = new Set<number | string>();

  for (const r of tableRows) {
    const wRes = evaluateWhereClause(wherePart, r, allowedColSet, session.currentUser);
    if (!wRes.ok) {
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: wRes.error || 'ORA-SIM-00904: invalid WHERE condition in UPDATE.',
        errorCode: 'ORA-SIM-00904',
        durationMs: elapsed(),
        session: { ...session, lastError: wRes.error || null },
      };
    }
    if (wRes.matches && r[pkCol] !== null && r[pkCol] !== undefined) {
      matchingPks.add(r[pkCol]!);
    }
  }

  const applyRes = applyValidatedUpdate(ws, tableName, matchingPks, updates, session.currentUser);
  if (!applyRes.ok) {
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: applyRes.error,
      errorCode: applyRes.errorCode,
      durationMs: elapsed(),
      session: { ...session, lastError: applyRes.error },
    };
  }

  const shouldCommit = Boolean(options.autoCommit);
  return {
    ok: true,
    commandType: 'UPDATE',
    statement: stmt,
    rowsAffected: matchingPks.size,
    message: `${matchingPks.size} row(s) updated in ${tableName}.`,
    durationMs: elapsed(),
    didCommitToSharedState: shouldCommit,
    session: {
      ...session,
      workingState: ws,
      committedState: shouldCommit ? cloneDatabaseState(ws) : session.committedState,
      uncommittedCount:
        shouldCommit ? 0 : session.uncommittedCount + (matchingPks.size > 0 ? 1 : 0),
    },
  };
}

function applyValidatedUpdate(
  ws: RecruitmentDatabaseState,
  tableName: string,
  matchingPks: Set<number | string>,
  updates: Record<string, string | number | null>,
  currentUser: string
): { ok: true } | { ok: false; error: string; errorCode: string } {
  if (matchingPks.size === 0) return { ok: true };

  if (tableName === 'ER_DEPARTMENT') {
    for (const d of ws.departments) {
      if (!matchingPks.has(d.DEPT_ID)) continue;
      const newName = updates.DEPT_NAME !== undefined ? String(updates.DEPT_NAME ?? '').trim() : d.DEPT_NAME;
      if (!newName) {
        return {
          ok: false,
          error: 'ORA-SIM-01407: cannot update ER_DEPARTMENT.DEPT_NAME to NULL.',
          errorCode: 'ORA-SIM-01407',
        };
      }
      if (
        ws.departments.some(
          (other) => other.DEPT_ID !== d.DEPT_ID && other.DEPT_NAME.toLowerCase() === newName.toLowerCase()
        )
      ) {
        return {
          ok: false,
          error: `ORA-SIM-00001: unique constraint violated — DEPT_NAME '${newName}' already exists.`,
          errorCode: 'ORA-SIM-00001',
        };
      }
      d.DEPT_NAME = newName;
    }
    return { ok: true };
  }

  if (tableName === 'ER_JOB') {
    for (const j of ws.jobs) {
      if (!matchingPks.has(j.JOB_ID)) continue;
      const nextTitle = updates.JOB_TITLE !== undefined ? String(updates.JOB_TITLE ?? '').trim() : j.JOB_TITLE;
      const nextDept = updates.DEPT_ID !== undefined ? Number(updates.DEPT_ID) : j.DEPT_ID;
      const nextMin =
        updates.MIN_SALARY !== undefined
          ? updates.MIN_SALARY === null
            ? null
            : Number(updates.MIN_SALARY)
          : j.MIN_SALARY;
      const nextMax =
        updates.MAX_SALARY !== undefined
          ? updates.MAX_SALARY === null
            ? null
            : Number(updates.MAX_SALARY)
          : j.MAX_SALARY;
      const nextVac = updates.VACANCIES !== undefined ? Number(updates.VACANCIES) : j.VACANCIES;
      const nextStatus =
        updates.JOB_STATUS !== undefined
          ? (String(updates.JOB_STATUS).toUpperCase() as JobStatus)
          : j.JOB_STATUS;

      if (!nextTitle) {
        return {
          ok: false,
          error: 'ORA-SIM-01407: JOB_TITLE cannot be empty.',
          errorCode: 'ORA-SIM-01407',
        };
      }
      if (!ws.departments.some((d) => d.DEPT_ID === nextDept)) {
        return {
          ok: false,
          error: `ORA-SIM-02291: foreign key (ER_JOB_DEPT_FK) violated — DEPT_ID ${nextDept} does not exist.`,
          errorCode: 'ORA-SIM-02291',
        };
      }
      if (nextMin !== null && nextMax !== null && nextMin > nextMax) {
        return {
          ok: false,
          error: 'ORA-SIM-02290: check constraint (ER_JOB_SALARY_CK) violated — MIN_SALARY > MAX_SALARY.',
          errorCode: 'ORA-SIM-02290',
        };
      }
      if (Number.isNaN(nextVac) || nextVac < 0) {
        return {
          ok: false,
          error: 'ORA-SIM-02290: check constraint (ER_JOB_VACANCY_CK) violated — VACANCIES must be >= 0.',
          errorCode: 'ORA-SIM-02290',
        };
      }
      if (!ALLOWED_JOB_STATUSES.includes(nextStatus)) {
        return {
          ok: false,
          error: `ORA-SIM-02290: check constraint (ER_JOB_STATUS_CK) violated — invalid JOB_STATUS '${nextStatus}'.`,
          errorCode: 'ORA-SIM-02290',
        };
      }
      j.JOB_TITLE = nextTitle;
      j.DEPT_ID = nextDept;
      j.MIN_SALARY = nextMin;
      j.MAX_SALARY = nextMax;
      j.VACANCIES = nextVac;
      j.JOB_STATUS = nextStatus;
      if (updates.JOB_DESCRIPTION !== undefined) {
        j.JOB_DESCRIPTION = updates.JOB_DESCRIPTION === null ? null : String(updates.JOB_DESCRIPTION);
      }
    }
    return { ok: true };
  }

  if (tableName === 'ER_CANDIDATE') {
    for (const c of ws.candidates) {
      if (!matchingPks.has(c.CANDIDATE_ID)) continue;
      const nextName = updates.FULL_NAME !== undefined ? String(updates.FULL_NAME ?? '').trim() : c.FULL_NAME;
      const nextEmail =
        updates.EMAIL !== undefined ? String(updates.EMAIL ?? '').trim().toLowerCase() : c.EMAIL;
      const nextExp =
        updates.EXPERIENCE_YEARS !== undefined ? Number(updates.EXPERIENCE_YEARS) : c.EXPERIENCE_YEARS;

      if (!nextName || !nextEmail) {
        return {
          ok: false,
          error: 'ORA-SIM-01407: FULL_NAME and EMAIL cannot be updated to NULL.',
          errorCode: 'ORA-SIM-01407',
        };
      }
      if (
        ws.candidates.some(
          (other) => other.CANDIDATE_ID !== c.CANDIDATE_ID && other.EMAIL.toLowerCase() === nextEmail
        )
      ) {
        return {
          ok: false,
          error: `ORA-SIM-00001: unique constraint violated — EMAIL '${nextEmail}' already exists.`,
          errorCode: 'ORA-SIM-00001',
        };
      }
      if (Number.isNaN(nextExp) || nextExp < 0) {
        return {
          ok: false,
          error: 'ORA-SIM-02290: check constraint (ER_CAND_EXP_CK) violated — EXPERIENCE_YEARS >= 0.',
          errorCode: 'ORA-SIM-02290',
        };
      }
      c.FULL_NAME = nextName;
      c.EMAIL = nextEmail;
      c.EXPERIENCE_YEARS = nextExp;
      if (updates.PHONE !== undefined) c.PHONE = updates.PHONE === null ? null : String(updates.PHONE);
      if (updates.QUALIFICATION !== undefined) {
        c.QUALIFICATION = updates.QUALIFICATION === null ? null : String(updates.QUALIFICATION);
      }
    }
    return { ok: true };
  }

  if (tableName === 'ER_APPLICATION') {
    for (const a of ws.applications) {
      if (!matchingPks.has(a.APPLICATION_ID)) continue;
      const nextStatus =
        updates.APPLICATION_STATUS !== undefined
          ? (String(updates.APPLICATION_STATUS).toUpperCase() as ApplicationStatus)
          : a.APPLICATION_STATUS;

      if (!ALLOWED_APPLICATION_STATUSES.includes(nextStatus)) {
        return {
          ok: false,
          error: `ORA-SIM-02290: check constraint (ER_APP_STATUS_CK) violated — invalid APPLICATION_STATUS '${nextStatus}'.`,
          errorCode: 'ORA-SIM-02290',
        };
      }

      if (nextStatus !== a.APPLICATION_STATUS) {
        const auditId = nextAuditId(ws.audits);
        ws.audits.push({
          AUDIT_ID: auditId,
          APPLICATION_ID: a.APPLICATION_ID,
          OLD_STATUS: a.APPLICATION_STATUS,
          NEW_STATUS: nextStatus,
          CHANGE_DATE: new Date().toISOString(),
          CHANGED_BY: currentUser,
          _origin: 'SQL_TRIGGER',
        });
        a.APPLICATION_STATUS = nextStatus;
      }

      if (updates.REMARKS !== undefined) {
        a.REMARKS = updates.REMARKS === null ? null : String(updates.REMARKS);
      }
    }
    return { ok: true };
  }

  if (tableName === 'ER_INTERVIEW') {
    for (const i of ws.interviews) {
      if (!matchingPks.has(i.INTERVIEW_ID)) continue;
      const nextMode =
        updates.INTERVIEW_MODE !== undefined
          ? (String(updates.INTERVIEW_MODE).toUpperCase() as InterviewMode)
          : i.INTERVIEW_MODE;
      const nextStatus =
        updates.INTERVIEW_STATUS !== undefined
          ? (String(updates.INTERVIEW_STATUS).toUpperCase() as InterviewStatus)
          : i.INTERVIEW_STATUS;
      const nextScore =
        updates.SCORE !== undefined
          ? updates.SCORE === null
            ? null
            : Number(updates.SCORE)
          : i.SCORE;

      if (!ALLOWED_INTERVIEW_MODES.includes(nextMode)) {
        return {
          ok: false,
          error: `ORA-SIM-02290: check constraint (ER_INT_MODE_CK) violated — invalid INTERVIEW_MODE '${nextMode}'.`,
          errorCode: 'ORA-SIM-02290',
        };
      }
      if (!ALLOWED_INTERVIEW_STATUSES.includes(nextStatus)) {
        return {
          ok: false,
          error: `ORA-SIM-02290: check constraint (ER_INT_STATUS_CK) violated — invalid INTERVIEW_STATUS '${nextStatus}'.`,
          errorCode: 'ORA-SIM-02290',
        };
      }
      if (nextScore !== null && (Number.isNaN(nextScore) || nextScore < 0 || nextScore > 100)) {
        return {
          ok: false,
          error: 'ORA-SIM-02290: check constraint (ER_INT_SCORE_CK) violated — SCORE must be 0..100.',
          errorCode: 'ORA-SIM-02290',
        };
      }
      i.INTERVIEW_MODE = nextMode;
      i.INTERVIEW_STATUS = nextStatus;
      i.SCORE = nextScore;
      if (updates.FEEDBACK !== undefined) {
        i.FEEDBACK = updates.FEEDBACK === null ? null : String(updates.FEEDBACK);
      }
      if (updates.INTERVIEWER_NAME !== undefined) {
        i.INTERVIEWER_NAME =
          updates.INTERVIEWER_NAME === null ? null : String(updates.INTERVIEWER_NAME);
      }
      if (updates.INTERVIEW_DATE !== undefined && updates.INTERVIEW_DATE !== null) {
        i.INTERVIEW_DATE = String(updates.INTERVIEW_DATE);
      }
    }
    return { ok: true };
  }

  if (tableName === 'ER_EMPLOYEE') {
    for (const e of ws.employees) {
      if (!matchingPks.has(e.EMPLOYEE_ID)) continue;
      const nextStatus =
        updates.EMPLOYMENT_STATUS !== undefined
          ? (String(updates.EMPLOYMENT_STATUS).toUpperCase() as EmploymentStatus)
          : e.EMPLOYMENT_STATUS;
      const nextSalary =
        updates.ANNUAL_SALARY !== undefined ? Number(updates.ANNUAL_SALARY) : e.ANNUAL_SALARY;
      const nextDesig =
        updates.DESIGNATION !== undefined ? String(updates.DESIGNATION ?? '').trim() : e.DESIGNATION;

      if (!ALLOWED_EMPLOYMENT_STATUSES.includes(nextStatus)) {
        return {
          ok: false,
          error: `ORA-SIM-02290: check constraint (ER_EMP_STATUS_CK) violated — invalid EMPLOYMENT_STATUS '${nextStatus}'.`,
          errorCode: 'ORA-SIM-02290',
        };
      }
      if (Number.isNaN(nextSalary) || nextSalary < 0) {
        return {
          ok: false,
          error: 'ORA-SIM-02290: ANNUAL_SALARY must be a non-negative number.',
          errorCode: 'ORA-SIM-02290',
        };
      }

      if (nextSalary !== e.ANNUAL_SALARY) {
        e._salaryHistory = [
          ...(e._salaryHistory ?? []),
          {
            id: `sal-sql-upd-${e.EMPLOYEE_ID}-${Date.now()}`,
            employeeId: e.EMPLOYEE_ID,
            date: getTodayIsoDate(),
            previousSalary: e.ANNUAL_SALARY,
            newSalary: nextSalary,
            percentageIncrease: calculatePercentageIncrease(e.ANNUAL_SALARY, nextSalary),
            authorizedBy: 'Karan Anil Saini (SQL Console)',
            authorizedByUsername: currentUser.toLowerCase(),
            reason: 'Updated via SQL Console UPDATE ER_EMPLOYEE statement.',
          },
        ];
      }

      e.EMPLOYMENT_STATUS = nextStatus;
      e.ANNUAL_SALARY = nextSalary;
      e.DESIGNATION = nextDesig;
      if (updates.JOINING_DATE !== undefined && updates.JOINING_DATE !== null) {
        e.JOINING_DATE = String(updates.JOINING_DATE);
      }
    }
    return { ok: true };
  }

  return {
    ok: false,
    error: `ORA-SIM-01732: UPDATE on '${tableName}' is not permitted.`,
    errorCode: 'ORA-SIM-01732',
  };
}

function executeDeleteStatement(
  stmt: string,
  session: SqlSessionState,
  options: SqlExecutionOptions,
  elapsed: () => number
): SqlExecutionResult {
  const match = stmt.match(/^DELETE\s+FROM\s+([A-Za-z0-9_]+)(?:\s+WHERE\s+([\s\S]+))?$/i);
  if (!match) {
    const err = 'ORA-SIM-00933: malformed DELETE statement. Expected DELETE FROM <table> [WHERE ...].';
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: err,
      errorCode: 'ORA-SIM-00933',
      durationMs: elapsed(),
      session: { ...session, lastError: err },
    };
  }

  const tableName = match[1].toUpperCase();
  const wherePart = (match[2] ?? '').trim();

  if (READ_ONLY_VIEWS.has(tableName)) {
    const err = `ORA-SIM-01732: data manipulation operation not legal on read-only view '${tableName}'.`;
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: err,
      errorCode: 'ORA-SIM-01732',
      durationMs: elapsed(),
      session: { ...session, lastError: err },
    };
  }

  const schemaCols = TABLE_SCHEMAS[tableName]?.filter((c) => c.SCOPE === 'ORACLE_SCHEMA');
  if (!schemaCols) {
    const err = `ORA-SIM-00942: table '${tableName}' does not exist in the local simulation.`;
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: err,
      errorCode: 'ORA-SIM-00942',
      durationMs: elapsed(),
      session: { ...session, lastError: err },
    };
  }

  const allowedColSet = new Set(schemaCols.map((c) => c.COLUMN_NAME));
  const ws = cloneDatabaseState(session.workingState);
  const tableRows = getTableRecords(ws, tableName, session.currentUser) ?? [];
  const pkCol = schemaCols[0].COLUMN_NAME;
  const matchingPks = new Set<number | string>();

  for (const r of tableRows) {
    const wRes = evaluateWhereClause(wherePart, r, allowedColSet, session.currentUser);
    if (!wRes.ok) {
      return {
        ok: false,
        commandType: 'ERROR',
        statement: stmt,
        message: wRes.error || 'ORA-SIM-00904: invalid WHERE condition in DELETE.',
        errorCode: 'ORA-SIM-00904',
        durationMs: elapsed(),
        session: { ...session, lastError: wRes.error || null },
      };
    }
    if (wRes.matches && r[pkCol] !== null && r[pkCol] !== undefined) {
      matchingPks.add(r[pkCol]!);
    }
  }

  // Referential integrity check BEFORE asking confirmation or mutating
  const refCheck = validateReferentialDelete(ws, tableName, matchingPks);
  if (!refCheck.ok) {
    return {
      ok: false,
      commandType: 'ERROR',
      statement: stmt,
      message: refCheck.error,
      errorCode: 'ORA-SIM-02292',
      durationMs: elapsed(),
      session: { ...session, lastError: refCheck.error },
    };
  }

  if (matchingPks.size > 0 && !options.confirmedDelete) {
    return {
      ok: false,
      commandType: 'DELETE',
      statement: stmt,
      rowsAffected: 0,
      requiresConfirmation: true,
      confirmationPrompt: {
        table: tableName,
        matchingRowsCount: matchingPks.size,
        hasWhereClause: Boolean(wherePart),
        statement: stmt,
        summary: wherePart
          ? `This DELETE statement will remove ${matchingPks.size} record(s) from ${tableName} matching WHERE ${wherePart}.`
          : `WARNING: This DELETE statement has NO WHERE clause and will delete ALL ${matchingPks.size} record(s) from ${tableName}.`,
      },
      message: 'Confirmation required before executing destructive DELETE statement.',
      durationMs: elapsed(),
      session,
    };
  }

  applyDeleteMutation(ws, tableName, matchingPks);
  const shouldCommit = Boolean(options.autoCommit);
  return {
    ok: true,
    commandType: 'DELETE',
    statement: stmt,
    rowsAffected: matchingPks.size,
    message: `${matchingPks.size} row(s) deleted from ${tableName}.`,
    durationMs: elapsed(),
    didCommitToSharedState: shouldCommit,
    session: {
      ...session,
      workingState: ws,
      committedState: shouldCommit ? cloneDatabaseState(ws) : session.committedState,
      uncommittedCount:
        shouldCommit ? 0 : session.uncommittedCount + (matchingPks.size > 0 ? 1 : 0),
    },
  };
}

function validateReferentialDelete(
  ws: RecruitmentDatabaseState,
  tableName: string,
  matchingPks: Set<number | string>
): { ok: true } | { ok: false; error: string } {
  if (tableName === 'ER_DEPARTMENT') {
    for (const id of matchingPks) {
      const childJobs = ws.jobs.filter((j) => j.DEPT_ID === Number(id));
      if (childJobs.length > 0) {
        return {
          ok: false,
          error: `ORA-SIM-02292: simulated integrity constraint (ER_JOB_DEPT_FK) violated — child job record(s) found for DEPT_ID ${id}.`,
        };
      }
    }
  }
  if (tableName === 'ER_JOB') {
    for (const id of matchingPks) {
      const childApps = ws.applications.filter((a) => a.JOB_ID === Number(id));
      if (childApps.length > 0) {
        return {
          ok: false,
          error: `ORA-SIM-02292: simulated integrity constraint (ER_APP_JOB_FK) violated — ${childApps.length} child application(s) reference JOB_ID ${id}.`,
        };
      }
    }
  }
  if (tableName === 'ER_CANDIDATE') {
    for (const id of matchingPks) {
      const childApps = ws.applications.filter((a) => a.CANDIDATE_ID === Number(id));
      const childEmps = ws.employees.filter((e) => e.CANDIDATE_ID === Number(id));
      if (childApps.length > 0 || childEmps.length > 0) {
        return {
          ok: false,
          error: `ORA-SIM-02292: simulated integrity constraint (ER_APP_CAND_FK / ER_EMP_CAND_FK) violated — child records exist for CANDIDATE_ID ${id}.`,
        };
      }
    }
  }
  if (tableName === 'ER_APPLICATION') {
    for (const id of matchingPks) {
      const childInts = ws.interviews.filter((i) => i.APPLICATION_ID === Number(id));
      const childEmps = ws.employees.filter((e) => e.APPLICATION_ID === Number(id));
      if (childInts.length > 0 || childEmps.length > 0) {
        return {
          ok: false,
          error: `ORA-SIM-02292: simulated integrity constraint (ER_INT_APP_FK / ER_EMP_APP_FK) violated — child interview or employee records exist for APPLICATION_ID ${id}.`,
        };
      }
    }
  }
  return { ok: true };
}

function applyDeleteMutation(
  ws: RecruitmentDatabaseState,
  tableName: string,
  matchingPks: Set<number | string>
) {
  if (tableName === 'ER_DEPARTMENT') {
    ws.departments = ws.departments.filter((d) => !matchingPks.has(d.DEPT_ID));
  } else if (tableName === 'ER_JOB') {
    ws.jobs = ws.jobs.filter((j) => !matchingPks.has(j.JOB_ID));
  } else if (tableName === 'ER_CANDIDATE') {
    ws.candidates = ws.candidates.filter((c) => !matchingPks.has(c.CANDIDATE_ID));
  } else if (tableName === 'ER_APPLICATION') {
    ws.applications = ws.applications.filter((a) => !matchingPks.has(a.APPLICATION_ID));
  } else if (tableName === 'ER_INTERVIEW') {
    ws.interviews = ws.interviews.filter((i) => !matchingPks.has(i.INTERVIEW_ID));
  } else if (tableName === 'ER_EMPLOYEE') {
    ws.employees = ws.employees.filter((e) => !matchingPks.has(e.EMPLOYEE_ID));
  } else if (tableName === 'ER_APPLICATION_AUDIT') {
    ws.audits = ws.audits.filter((a) => !matchingPks.has(a.AUDIT_ID));
  }
}
