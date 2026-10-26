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
 * CREATE TABLE ER_JOB (
 *   JOB_ID NUMBER PRIMARY KEY,
 *   JOB_TITLE VARCHAR2(100) NOT NULL,
 *   DEPT_ID NUMBER NOT NULL,
 *   JOB_DESCRIPTION VARCHAR2(500),
 *   MIN_SALARY NUMBER(10,2),
 *   MAX_SALARY NUMBER(10,2),
 *   VACANCIES NUMBER DEFAULT 1 NOT NULL,
 *   JOB_STATUS VARCHAR2(20) DEFAULT 'OPEN',
 *   POSTED_DATE DATE DEFAULT SYSDATE,
 *   CONSTRAINT ER_JOB_DEPT_FK FOREIGN KEY (DEPT_ID) REFERENCES ER_DEPARTMENT(DEPT_ID),
 *   CONSTRAINT ER_JOB_SALARY_CK CHECK (MIN_SALARY IS NULL OR MAX_SALARY IS NULL OR MIN_SALARY <= MAX_SALARY),
 *   CONSTRAINT ER_JOB_VACANCY_CK CHECK (VACANCIES >= 0),
 *   CONSTRAINT ER_JOB_STATUS_CK CHECK (JOB_STATUS IN ('OPEN', 'CLOSED', 'ON HOLD'))
 * );
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
 * CREATE TABLE ER_CANDIDATE (
 *   CANDIDATE_ID NUMBER PRIMARY KEY,
 *   FULL_NAME VARCHAR2(100) NOT NULL,
 *   EMAIL VARCHAR2(100) UNIQUE NOT NULL,
 *   PHONE VARCHAR2(15),
 *   QUALIFICATION VARCHAR2(100),
 *   EXPERIENCE_YEARS NUMBER(3,1) DEFAULT 0,
 *   CREATED_DATE DATE DEFAULT SYSDATE,
 *   CONSTRAINT ER_CAND_EXP_CK CHECK (EXPERIENCE_YEARS >= 0)
 * );
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
}

/**
 * CREATE TABLE ER_APPLICATION (
 *   APPLICATION_ID NUMBER PRIMARY KEY,
 *   CANDIDATE_ID NUMBER NOT NULL,
 *   JOB_ID NUMBER NOT NULL,
 *   APPLICATION_DATE DATE DEFAULT SYSDATE,
 *   APPLICATION_STATUS VARCHAR2(25) DEFAULT 'APPLIED',
 *   REMARKS VARCHAR2(500),
 *   CONSTRAINT ER_APP_CAND_FK FOREIGN KEY (CANDIDATE_ID) REFERENCES ER_CANDIDATE(CANDIDATE_ID),
 *   CONSTRAINT ER_APP_JOB_FK FOREIGN KEY (JOB_ID) REFERENCES ER_JOB(JOB_ID),
 *   CONSTRAINT ER_APP_UNQ UNIQUE (CANDIDATE_ID, JOB_ID),
 *   CONSTRAINT ER_APP_STATUS_CK CHECK (APPLICATION_STATUS IN ('APPLIED', 'SHORTLISTED', 'INTERVIEW', 'SELECTED', 'REJECTED', 'HIRED'))
 * );
 */
export interface ErApplication {
  APPLICATION_ID: number;
  CANDIDATE_ID: number;
  JOB_ID: number;
  APPLICATION_DATE: string; // ISO YYYY-MM-DD
  APPLICATION_STATUS: ApplicationStatus;
  REMARKS: string | null;
  _origin?: 'SQL_INSERT' | 'SQL_PROC' | 'LOCAL_DEMO';
}

/**
 * CREATE TABLE ER_INTERVIEW (
 *   INTERVIEW_ID NUMBER PRIMARY KEY,
 *   APPLICATION_ID NUMBER NOT NULL,
 *   INTERVIEW_ROUND NUMBER DEFAULT 1,
 *   INTERVIEW_DATE DATE NOT NULL,
 *   INTERVIEW_MODE VARCHAR2(20),
 *   INTERVIEWER_NAME VARCHAR2(100),
 *   SCORE NUMBER(5,2),
 *   FEEDBACK VARCHAR2(500),
 *   INTERVIEW_STATUS VARCHAR2(20) DEFAULT 'SCHEDULED',
 *   CONSTRAINT ER_INT_APP_FK FOREIGN KEY (APPLICATION_ID) REFERENCES ER_APPLICATION(APPLICATION_ID),
 *   CONSTRAINT ER_INT_UNQ UNIQUE (APPLICATION_ID, INTERVIEW_ROUND),
 *   CONSTRAINT ER_INT_SCORE_CK CHECK (SCORE IS NULL OR SCORE BETWEEN 0 AND 100),
 *   CONSTRAINT ER_INT_MODE_CK CHECK (INTERVIEW_MODE IN ('ONLINE', 'OFFLINE')),
 *   CONSTRAINT ER_INT_STATUS_CK CHECK (INTERVIEW_STATUS IN ('SCHEDULED', 'COMPLETED', 'CANCELLED'))
 * );
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
  /** Optional frontend-only presentation label for round description (not persisted in Oracle column) */
  _roundLabel?: string;
  _origin?: 'SQL_PROC' | 'SYNTHETIC_SEED' | 'LOCAL_DEMO';
}

/**
 * CREATE TABLE ER_EMPLOYEE (
 *   EMPLOYEE_ID NUMBER PRIMARY KEY,
 *   APPLICATION_ID NUMBER UNIQUE NOT NULL,
 *   CANDIDATE_ID NUMBER UNIQUE NOT NULL,
 *   JOINING_DATE DATE,
 *   DESIGNATION VARCHAR2(100),
 *   ANNUAL_SALARY NUMBER(12,2),
 *   EMPLOYMENT_STATUS VARCHAR2(20) DEFAULT 'ACTIVE',
 *   CONSTRAINT ER_EMP_APP_FK FOREIGN KEY (APPLICATION_ID) REFERENCES ER_APPLICATION(APPLICATION_ID),
 *   CONSTRAINT ER_EMP_CAND_FK FOREIGN KEY (CANDIDATE_ID) REFERENCES ER_CANDIDATE(CANDIDATE_ID),
 *   CONSTRAINT ER_EMP_STATUS_CK CHECK (EMPLOYMENT_STATUS IN ('ACTIVE', 'INACTIVE'))
 * );
 */
export interface ErEmployee {
  EMPLOYEE_ID: number;
  APPLICATION_ID: number;
  CANDIDATE_ID: number;
  JOINING_DATE: string; // ISO YYYY-MM-DD
  DESIGNATION: string;
  ANNUAL_SALARY: number;
  EMPLOYMENT_STATUS: EmploymentStatus;
  _origin?: 'SQL_PROC' | 'LOCAL_DEMO';
}

/**
 * CREATE TABLE ER_APPLICATION_AUDIT (
 *   AUDIT_ID NUMBER PRIMARY KEY,
 *   APPLICATION_ID NUMBER NOT NULL,
 *   OLD_STATUS VARCHAR2(25),
 *   NEW_STATUS VARCHAR2(25),
 *   CHANGE_DATE TIMESTAMP DEFAULT SYSTIMESTAMP,
 *   CHANGED_BY VARCHAR2(128)
 * );
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
    | 'HIRE'
    | 'DEPARTMENT'
    | 'SYSTEM';
  title: string;
  description: string;
  sqlEquivalent?: string;
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
}
