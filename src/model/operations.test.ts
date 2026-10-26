import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialDatabaseState } from './seedData';
import {
  addCandidate,
  applyForJob,
  calculateDashboardMetrics,
  createDepartment,
  createEmployeeDirect,
  createJob,
  deleteDepartment,
  deleteJob,
  generateCsvContent,
  hireCandidate,
  scheduleInterview,
  selectCandidateApplicationView,
  selectDepartmentSummaries,
  updateApplicationStatus,
  updateEmployee,
  updateInterviewFeedback,
} from './operations';

test('initial SQL seed state matches MiniProject Code.pdf counts and metrics', () => {
  const state = createInitialDatabaseState();
  assert.equal(state.departments.length, 7);
  assert.equal(state.jobs.length, 7);
  assert.equal(state.candidates.length, 12); // 1001..1012
  assert.equal(state.applications.length, 12); // 5001..5012
  assert.equal(state.employees.length, 1); // Employee #1 for App #5012

  const metrics = calculateDashboardMetrics(state);
  assert.equal(metrics.totalCandidates, 12);
  assert.equal(metrics.totalApplications, 12);
  assert.equal(metrics.openJobs, 7);
  assert.equal(metrics.openVacancies, 19); // 3+4+2+3+2+3+2
  assert.equal(metrics.totalEmployees, 1);
  // APPLIED (5010, 5011) + SHORTLISTED (5001, 5002, 5004, 5009) = 6
  assert.equal(metrics.applicationsAwaitingReview, 6);
});

test('ER_ADD_CANDIDATE adds valid candidate and rejects duplicate email (-20001)', () => {
  const state = createInitialDatabaseState();
  const res1 = addCandidate(state, {
    FULL_NAME: 'Rohan Verma',
    EMAIL: 'rohan.verma@example.com',
    PHONE: '9876543210',
    QUALIFICATION: 'MTech Computer Science',
    EXPERIENCE_YEARS: 3.5,
  });
  assert.equal(res1.ok, true);
  assert.equal(res1.state.candidates.length, 13);
  assert.equal(res1.state.candidates[12].CANDIDATE_ID, 1013);

  // Duplicate email check
  const resDup = addCandidate(res1.state, {
    FULL_NAME: 'Another Rohan',
    EMAIL: 'ROHAN.VERMA@example.com',
    PHONE: '9123456789',
    QUALIFICATION: 'BSc IT',
    EXPERIENCE_YEARS: 1,
  });
  assert.equal(resDup.ok, false);
  assert.equal(resDup.errorCode, -20001);
  assert.equal(resDup.state.candidates.length, 13);
});

test('ER_JOB creation enforces salary check constraint (MIN_SALARY <= MAX_SALARY) and department FK', () => {
  const state = createInitialDatabaseState();
  const badSalary = createJob(state, {
    JOB_TITLE: 'Senior Architect',
    DEPT_ID: 2,
    MIN_SALARY: 1200000,
    MAX_SALARY: 800000,
    VACANCIES: 2,
  });
  assert.equal(badSalary.ok, false);

  const validJob = createJob(state, {
    JOB_TITLE: 'Cloud Engineer',
    DEPT_ID: 2,
    MIN_SALARY: 600000,
    MAX_SALARY: 1100000,
    VACANCIES: 2,
    JOB_STATUS: 'OPEN',
  });
  assert.equal(validJob.ok, true);
  assert.equal(validJob.state.jobs.length, 8);

  // Deleting referenced job should be blocked
  const delRef = deleteJob(validJob.state, 101);
  assert.equal(delRef.ok, false);
});

test('ER_APPLY_FOR_JOB enforces unique (CANDIDATE_ID, JOB_ID) (-20002) and valid references (-20003)', () => {
  const state = createInitialDatabaseState();
  // Candidate 1001 already applied to Job 101 (Application 5001)
  const dupApp = applyForJob(state, { CANDIDATE_ID: 1001, JOB_ID: 101 });
  assert.equal(dupApp.ok, false);
  assert.equal(dupApp.errorCode, -20002);

  // Non-existent job
  const badFk = applyForJob(state, { CANDIDATE_ID: 1001, JOB_ID: 999 });
  assert.equal(badFk.ok, false);
  assert.equal(badFk.errorCode, -20003);

  // Valid new application: Candidate 1001 applies to Job 102
  const validApp = applyForJob(state, { CANDIDATE_ID: 1001, JOB_ID: 102 });
  assert.equal(validApp.ok, true);
  assert.equal(validApp.state.applications.length, 13);
  assert.equal(validApp.state.applications[12].APPLICATION_ID, 5013);
  assert.equal(validApp.state.applications[12].APPLICATION_STATUS, 'APPLIED');
});

test('ER_UPDATE_STATUS updates status and records ER_APPLICATION_AUDIT entry on change', () => {
  const state = createInitialDatabaseState();
  const initialAudits = state.audits.length;

  // Update 5010 from APPLIED to SHORTLISTED
  const updated = updateApplicationStatus(state, 5010, 'SHORTLISTED', 'HR_ADMIN');
  assert.equal(updated.ok, true);
  assert.equal(updated.state.audits.length, initialAudits + 1);
  const latestAudit = updated.state.audits[updated.state.audits.length - 1];
  assert.equal(latestAudit.APPLICATION_ID, 5010);
  assert.equal(latestAudit.OLD_STATUS, 'APPLIED');
  assert.equal(latestAudit.NEW_STATUS, 'SHORTLISTED');

  // No-op status update should be rejected without creating duplicate audit
  const noop = updateApplicationStatus(updated.state, 5010, 'SHORTLISTED', 'HR_ADMIN');
  assert.equal(noop.ok, false);
  assert.equal(noop.state.audits.length, initialAudits + 1);
});

test('ER_SCHEDULE_INTERVIEW enforces unique (APPLICATION_ID, INTERVIEW_ROUND) and score 0..100', () => {
  const state = createInitialDatabaseState();
  // Application 5012 already has Round 1
  const dupRound = scheduleInterview(state, {
    APPLICATION_ID: 5012,
    INTERVIEW_ROUND: 1,
    INTERVIEW_DATE: '2026-11-01',
    INTERVIEW_MODE: 'ONLINE',
    INTERVIEWER_NAME: 'Anita Desai',
  });
  assert.equal(dupRound.ok, false);
  assert.equal(dupRound.errorCode, -20010);

  // Schedule Round 2 for 5012
  const round2 = scheduleInterview(state, {
    APPLICATION_ID: 5012,
    INTERVIEW_ROUND: 2,
    INTERVIEW_DATE: '2026-11-02',
    INTERVIEW_MODE: 'OFFLINE',
    INTERVIEWER_NAME: 'Anita Desai',
  });
  assert.equal(round2.ok, true);
  const newIntId = round2.state.interviews[round2.state.interviews.length - 1].INTERVIEW_ID;

  // Invalid score > 100
  const badScore = updateInterviewFeedback(round2.state, newIntId, {
    SCORE: 105,
    FEEDBACK: 'Invalid score',
    INTERVIEW_STATUS: 'COMPLETED',
  });
  assert.equal(badScore.ok, false);

  // Valid score 92
  const goodScore = updateInterviewFeedback(round2.state, newIntId, {
    SCORE: 92,
    FEEDBACK: 'Excellent domain knowledge',
    INTERVIEW_STATUS: 'COMPLETED',
  });
  assert.equal(goodScore.ok, true);
});

test('ER_HIRE_CANDIDATE atomically updates application, creates employee, and records audit', () => {
  const state = createInitialDatabaseState();
  // Hire Application 5005 (Gauri Sardal, currently SELECTED for Financial Analyst)
  const hired = hireCandidate(state, {
    APPLICATION_ID: 5005,
    DESIGNATION: 'Financial Analyst',
    ANNUAL_SALARY: 550000,
    JOINING_DATE: '2026-11-01',
  });
  assert.equal(hired.ok, true);
  const app5005 = hired.state.applications.find((a) => a.APPLICATION_ID === 5005);
  assert.equal(app5005?.APPLICATION_STATUS, 'HIRED');
  assert.equal(hired.state.employees.length, state.employees.length + 1);
  assert.equal(hired.state.audits.length, state.audits.length + 1);

  // Hiring again should be blocked with -20020
  const repeatHire = hireCandidate(hired.state, {
    APPLICATION_ID: 5005,
    DESIGNATION: 'Financial Analyst',
    ANNUAL_SALARY: 550000,
  });
  assert.equal(repeatHire.ok, false);
  assert.equal(repeatHire.errorCode, -20020);
});

test('Direct employee creation and editing enforce valid application-candidate linkage', () => {
  const state = createInitialDatabaseState();
  // Mismatched candidate and application should fail
  const mismatch = createEmployeeDirect(state, {
    APPLICATION_ID: 5001, // belongs to 1001
    CANDIDATE_ID: 1002,
    DESIGNATION: 'HR Executive',
    JOINING_DATE: '2026-11-01',
    ANNUAL_SALARY: 400000,
  });
  assert.equal(mismatch.ok, false);

  // Valid direct employee creation for 5006 (Yug Prajapati, already HIRED in SQL INSERTs)
  const validEmp = createEmployeeDirect(state, {
    APPLICATION_ID: 5006,
    CANDIDATE_ID: 1006,
    DESIGNATION: 'Software Developer',
    JOINING_DATE: '2026-10-20',
    ANNUAL_SALARY: 650000,
  });
  assert.equal(validEmp.ok, true);

  // Changing status to INACTIVE preserves employee record
  const empId = validEmp.state.employees[validEmp.state.employees.length - 1].EMPLOYEE_ID;
  const inactiveRes = updateEmployee(validEmp.state, empId, {
    DESIGNATION: 'Senior Software Developer',
    JOINING_DATE: '2026-10-20',
    ANNUAL_SALARY: 700000,
    EMPLOYMENT_STATUS: 'INACTIVE',
  });
  assert.equal(inactiveRes.ok, true);
  const updatedEmp = inactiveRes.state.employees.find((e) => e.EMPLOYEE_ID === empId);
  assert.equal(updatedEmp?.EMPLOYMENT_STATUS, 'INACTIVE');
});

test('Views and CSV export format properly', () => {
  const state = createInitialDatabaseState();
  const appView = selectCandidateApplicationView(state);
  assert.equal(appView.length, 12);
  const deptSummary = selectDepartmentSummaries(state);
  assert.equal(deptSummary.length, 7);

  const csv = generateCsvContent(
    ['ID', 'Name', 'Notes'],
    [
      [1, 'Karan Anil Saini', 'Role, "Senior"'],
      [2, 'Diksha Rajwani', 'Line 1\nLine 2'],
    ]
  );
  assert.ok(csv.includes('"Role, ""Senior"""'));
  assert.ok(csv.includes('"Line 1\nLine 2"'));
});

test('Department creation and deletion protection', () => {
  const state = createInitialDatabaseState();
  const blockedDelete = deleteDepartment(state, 1); // Referenced by Job 101
  assert.equal(blockedDelete.ok, false);

  const created = createDepartment(state, 'Cyber Security');
  assert.equal(created.ok, true);
  const newDeptId = created.state.departments[created.state.departments.length - 1].DEPT_ID;

  const allowedDelete = deleteDepartment(created.state, newDeptId);
  assert.equal(allowedDelete.ok, true);
});
