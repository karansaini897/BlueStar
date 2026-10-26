/**
 * Layer A: Supplied Oracle SQL*Plus Database Model (Source of Truth: MiniProject Code.pdf)
 * Every interface and union type below maps directly to the Oracle DDL definitions,
 * primary keys, foreign keys, unique constraints, and check constraints.
 */

export type JobStatus = 'OPEN' | 'CLOSED' | 'ON HOLD';

export type ApplicationStatus =
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'INTERVIEW'
  | 'SELECTED'
  | 'REJECTED'
  | 'HIRED';

export type InterviewMode = 'ONLINE' | 'OFFLINE';

export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export type EmploymentStatus = 'ACTIVE' | 'INACTIVE';

export type UserRole = 'HR' | 'EMPLOYEE' | 'CANDIDATE';

export const ALLOWED_JOB_STATUSES: readonly JobStatus[] = ['OPEN', 'CLOSED', 'ON HOLD'];
export const ALLOWED_APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  'APPLIED',
  'SHORTLISTED',
  'INTERVIEW',
  'SELECTED',
  'REJECTED',
  'HIRED',
];
export const ALLOWED_INTERVIEW_MODES: readonly InterviewMode[] = ['ONLINE', 'OFFLINE'];
export const ALLOWED_INTERVIEW_STATUSES: readonly InterviewStatus[] = [
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
];
export const ALLOWED_EMPLOYMENT_STATUSES: readonly EmploymentStatus[] = ['ACTIVE', 'INACTIVE'];

/**
 * CREATE TABLE ER_DEPARTMENT (
 *   DEPT_ID NUMBER PRIMARY KEY,
 *   DEPT_NAME VARCHAR2(50) UNIQUE NOT NULL
 * );
 */
export interface ErDepartment {
  DEPT_ID: number;
  DEPT_NAME: string;
}

/**
 * CREATE TABLE ER_JOB
 */
export interface ErJob {
  JOB_ID: number;
  JOB_TITLE: string;
  DEPT_ID: number;
  JOB_DESCRIPTION: string | null;
  MIN_SALARY: number | null;
  MAX_SALARY: number | null;
  VACANCIES: number;
  JOB_STATUS: JobStatus;
  POSTED_DATE: string; // ISO YYYY-MM-DD representing Oracle DATE
}

/**
 * CREATE TABLE ER_CANDIDATE
 */
export interface ErCandidate {
  CANDIDATE_ID: number;
  FULL_NAME: string;
  EMAIL: string;
  PHONE: string | null;
  QUALIFICATION: string | null;
  EXPERIENCE_YEARS: number;
  CREATED_DATE: string; // ISO YYYY-MM-DD
  /** Frontend-only metadata indicating whether record came from SQL INSERT or procedure execution */
  _origin?: 'SQL_INSERT' | 'SQL_PROC' | 'LOCAL_DEMO';
  /** Frontend-only skills summary optional metadata */
  _skills?: string;
}

/**
 * CREATE TABLE ER_APPLICATION
 */
export interface ErApplication {
  APPLICATION_ID: number;
  CANDIDATE_ID: number;
  JOB_ID: number;
  APPLICATION_DATE: string; // ISO YYYY-MM-DD
  APPLICATION_STATUS: ApplicationStatus;
  REMARKS: string | null;
  _origin?: 'SQL_INSERT' | 'SQL_PROC' | 'LOCAL_DEMO';
  /** Frontend-only HR internal review notes (never shown to candidates) */
  _hrNotes?: string | null;
}

/**
 * Frontend-only local PDF resume metadata (Layer B browser simulation)
 */
export interface CandidateResumeRecord {
  CANDIDATE_ID: number;
  APPLICATION_ID?: number;
  fileName: string;
  fileSize: number; // in bytes
  mimeType: string;
  uploadedAt: string;
  /** In-memory or session data URL for local PDF preview by HR */
  dataUrl?: string | null;
}

/**
 * CREATE TABLE ER_INTERVIEW
 */
export interface ErInterview {
  INTERVIEW_ID: number;
  APPLICATION_ID: number;
  INTERVIEW_ROUND: number; // Strictly numeric per ER_INTERVIEW table definition
  INTERVIEW_DATE: string; // ISO YYYY-MM-DD
  INTERVIEW_MODE: InterviewMode;
  INTERVIEWER_NAME: string | null;
  SCORE: number | null;
  FEEDBACK: string | null;
  INTERVIEW_STATUS: InterviewStatus;
  _roundLabel?: string;
  _origin?: 'SQL_PROC' | 'SYNTHETIC_SEED' | 'LOCAL_DEMO';
}

/**
 * Frontend-only Organisational Hierarchy Level (1 to 5)
 */
export type HierarchyLevel = 1 | 2 | 3 | 4 | 5;

export const HIERARCHY_LEVEL_LABELS: Record<HierarchyLevel, string> = {
  1: 'Level 1 · Individual Contributor',
  2: 'Level 2 · Senior Employee / Team Lead',
  3: 'Level 3 · Manager',
  4: 'Level 4 · Senior Manager / Department Leader',
  5: 'Level 5 · Executive',
};

/**
 * Frontend-only Salary Adjustment Record for the Employee Profile Visual Timeline
 */
export interface SalaryAdjustmentRecord {
  id: string;
  employeeId: number;
  date: string; // ISO YYYY-MM-DD or timestamp
  previousSalary: number;
  newSalary: number;
  percentageIncrease: number; // e.g. 15.38 for +15.38%
  authorizedBy: string; // Display name of HR or promoting manager
  authorizedByUsername: string;
  reason?: string;
}

/**
 * Frontend-only Promotion Record
 */
export interface PromotionRecord {
  id: string;
  employeeId: number;
  employeeName: string;
  previousDesignation: string;
  newDesignation: string;
  previousLevel: HierarchyLevel;
  newLevel: HierarchyLevel;
  previousSalary: number;
  newSalary: number;
  authorizedBy: string;
  authorizedByUsername: string;
  timestamp: string;
  notes?: string;
}

/**
 * CREATE TABLE ER_EMPLOYEE
 */
export interface ErEmployee {
  EMPLOYEE_ID: number;
  APPLICATION_ID: number;
  CANDIDATE_ID: number;
  JOINING_DATE: string; // ISO YYYY-MM-DD
  DESIGNATION: string;
  ANNUAL_SALARY: number;
  EMPLOYMENT_STATUS: EmploymentStatus;
  /** Optional frontend-only department override when HR reassigns an employee's department directly */
  _deptIdOverride?: number;
  _origin?: 'SQL_PROC' | 'LOCAL_DEMO';
  /** Frontend-only hierarchy level (1-5) */
  _hierarchyLevel?: HierarchyLevel;
  /** Frontend-only reporting manager employee ID */
  _managerEmployeeId?: number | null;
  /** Frontend-only promotion history */
  _promotionHistory?: PromotionRecord[];
  /** Frontend-only visual timeline of salary adjustments */
  _salaryHistory?: SalaryAdjustmentRecord[];
  /** Frontend-only last promotion date */
  _lastPromotionDate?: string | null;
}

/**
 * CREATE TABLE ER_APPLICATION_AUDIT
 */
export interface ErApplicationAudit {
  AUDIT_ID: number;
  APPLICATION_ID: number;
  OLD_STATUS: ApplicationStatus;
  NEW_STATUS: ApplicationStatus;
  CHANGE_DATE: string; // ISO timestamp
  CHANGED_BY: string;
  _origin?: 'SQL_TRIGGER' | 'LOCAL_DEMO';
}

/**
 * View: ER_V_CANDIDATE_APPLICATION (Pages 12-13 of MiniProject Code.pdf)
 */
export interface ErVCandidateApplication {
  CANDIDATE_ID: number;
  FULL_NAME: string;
  EMAIL: string;
  PHONE: string | null;
  QUALIFICATION: string | null;
  EXPERIENCE_YEARS: number;
  APPLICATION_ID: number;
  APPLICATION_DATE: string;
  APPLICATION_STATUS: ApplicationStatus;
  REMARKS: string | null;
  JOB_ID: number;
  JOB_TITLE: string;
  DEPT_ID: number;
  DEPT_NAME: string;
  _hrNotes?: string | null;
  _resume?: CandidateResumeRecord | null;
}

/**
 * View: ER_V_INTERVIEW_DETAILS (Pages 13-14 of MiniProject Code.pdf)
 */
export interface ErVInterviewDetails {
  CANDIDATE_ID: number;
  FULL_NAME: string;
  EMAIL: string;
  APPLICATION_ID: number;
  JOB_ID: number;
  JOB_TITLE: string;
  DEPT_NAME: string;
  INTERVIEW_ID: number;
  INTERVIEW_ROUND: number;
  INTERVIEW_DATE: string;
  INTERVIEW_MODE: InterviewMode;
  INTERVIEWER_NAME: string | null;
  SCORE: number | null;
  FEEDBACK: string | null;
  INTERVIEW_STATUS: InterviewStatus;
  _roundLabel?: string;
  _origin?: 'SQL_PROC' | 'SYNTHETIC_SEED' | 'LOCAL_DEMO';
}

/**
 * Derived Presentation Model for Employee Directory
 */
export interface EnrichedEmployee extends ErEmployee {
  FULL_NAME: string;
  EMAIL: string;
  PHONE: string | null;
  QUALIFICATION: string | null;
  EXPERIENCE_YEARS: number;
  APPLICATION_STATUS: ApplicationStatus;
  JOB_ID: number;
  JOB_TITLE: string;
  DEPT_ID: number;
  DEPT_NAME: string;
  HIERARCHY_LEVEL: HierarchyLevel;
  HIERARCHY_LABEL: string;
  MANAGER_EMPLOYEE_ID: number | null;
  MANAGER_NAME: string | null;
  DIRECT_REPORTS_COUNT: number;
  PROMOTION_HISTORY: PromotionRecord[];
  SALARY_HISTORY: SalaryAdjustmentRecord[];
}

/**
 * Frontend-only local activity log entry (Layer B demonstration metadata)
 */
export interface LocalActivityLog {
  id: string;
  timestamp: string;
  category:
    | 'CANDIDATE'
    | 'JOB'
    | 'APPLICATION'
    | 'STATUS_AUDIT'
    | 'INTERVIEW'
    | 'EMPLOYEE'
    | 'PROMOTION'
    | 'SQL_CONSOLE'
    | 'HIRE'
    | 'DEPARTMENT'
    | 'SYSTEM';
  title: string;
  description: string;
  sqlEquivalent?: string;
  entity?: string;
}

/**
 * Internal Prototype Account Record (Layer B local role simulation)
 * Follows the firstname.lastname convention without storing plain-text passwords in public UI.
 */
export interface PrototypeAccount {
  username: string; // e.g. 'karan.saini'
  fullName: string;
  displayName?: string;
  role: UserRole;
  candidateId?: number;
  employeeId?: number;
}

/**
 * Complete Normalised Frontend Store State (Layer B)
 */
export interface RecruitmentDatabaseState {
  version: number;
  departments: ErDepartment[];
  jobs: ErJob[];
  candidates: ErCandidate[];
  applications: ErApplication[];
  interviews: ErInterview[];
  employees: ErEmployee[];
  audits: ErApplicationAudit[];
  activities: LocalActivityLog[];
  resumes: CandidateResumeRecord[];
  accounts: PrototypeAccount[];
  /** Frontend-only configurable list of organisation position titles */
  positionTitles?: string[];
}
