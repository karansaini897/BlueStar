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
  deleteEmployee,
  deleteJob,
  generateCsvContent,
  hireCandidate,
  registerCandidateWorkflow,
  scheduleInterview,
  selectCandidateApplicationView,
  selectDepartmentSummaries,
  selectEnrichedEmployees,
  updateApplicationStatus,
  updateEmployee,
  updateInterviewFeedback,
  validatePdfResumeFile,
} from './operations';

test('initial SQL seed state matches MiniProject Code.pdf counts, metrics, and role assignments', () => {
  const state = createInitialDatabaseState();
  assert.equal(state.departments.length, 7);
  assert.equal(state.jobs.length, 7);
  assert.equal(state.candidates.length, 12);
  assert.equal(state.applications.length, 12);
  assert.equal(state.employees.length, 1);

  // Verify Karan Saini has HR role
  const karanAccount = state.accounts.find((a) => a.username === 'karan.saini');
  assert.equal(karanAccount?.role, 'HR');

  const metrics = calculateDashboardMetrics(state);
  assert.equal(metrics.totalCandidates, 12);
  assert.equal(metrics.totalApplications, 12);
  assert.equal(metrics.openJobs, 7);
  assert.equal(metrics.openVacancies, 19);
  assert.equal(metrics.totalEmployees, 1);
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

  const resDup = addCandidate(res1.state, {
    FULL_NAME: 'Another Rohan',
    EMAIL: 'ROHAN.VERMA@example.com',
    PHONE: '9123456789',
    QUALIFICATION: 'BSc IT',
    EXPERIENCE_YEARS: 1,
  });
  assert.equal(resDup.ok, false);
  assert.equal(resDup.errorCode, -20001);
});

test('Candidate registration workflow enforces PDF validation, unique username, and Candidate default role', () => {
  const state = createInitialDatabaseState();

  // Reject non-PDF resume
  const badPdf = validatePdfResumeFile({
    name: 'resume.exe',
    size: 1024,
    type: 'application/x-msdownload',
  });
  assert.equal(badPdf.ok, false);

  const goodPdf = validatePdfResumeFile({
    name: 'Priya_Sharma_Resume.pdf',
    size: 120400,
    type: 'application/pdf',
  });
  assert.equal(goodPdf.ok, true);

  // Register Priya Sharma
  const regRes = registerCandidateWorkflow(state, {
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya.sharma@example.com',
    phone: '9888777666',
    qualification: 'BTech Information Technology',
    experienceYears: 2,
    jobId: 102,
    resume: {
      fileName: 'Priya_Sharma_Resume.pdf',
      fileSize: 120400,
      mimeType: 'application/pdf',
    },
  });
  assert.equal(regRes.ok, true);
  assert.equal(regRes.createdUsername, 'priya.sharma');
  const createdAccount = regRes.state.accounts.find((a) => a.username === 'priya.sharma');
  assert.equal(createdAccount?.role, 'CANDIDATE');
  assert.equal(regRes.state.resumes.length, 1);

  // Duplicate username should be rejected unless customUsername is provided
  const dupUser = registerCandidateWorkflow(regRes.state, {
    firstName: 'Priya',
    lastName: 'Sharma',
    email: 'priya.sharma2@example.com',
    experienceYears: 1,
  });
  assert.equal(dupUser.ok, false);
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

  const delRef = deleteJob(validJob.state, 101);
  assert.equal(delRef.ok, false);
});

test('ER_APPLY_FOR_JOB enforces unique (CANDIDATE_ID, JOB_ID) (-20002) and valid references (-20003)', () => {
  const state = createInitialDatabaseState();
  const dupApp = applyForJob(state, { CANDIDATE_ID: 1001, JOB_ID: 101 });
  assert.equal(dupApp.ok, false);
  assert.equal(dupApp.errorCode, -20002);

  const badFk = applyForJob(state, { CANDIDATE_ID: 1001, JOB_ID: 999 });
  assert.equal(badFk.ok, false);
  assert.equal(badFk.errorCode, -20003);

  const validApp = applyForJob(state, { CANDIDATE_ID: 1001, JOB_ID: 102 });
  assert.equal(validApp.ok, true);
  assert.equal(validApp.state.applications.length, 13);
});

test('ER_UPDATE_STATUS updates status and records ER_APPLICATION_AUDIT entry on change', () => {
  const state = createInitialDatabaseState();
  const initialAudits = state.audits.length;

  const updated = updateApplicationStatus(state, 5010, 'SHORTLISTED', 'KARAN.SAINI');
  assert.equal(updated.ok, true);
  assert.equal(updated.state.audits.length, initialAudits + 1);
  const latestAudit = updated.state.audits[updated.state.audits.length - 1];
  assert.equal(latestAudit.APPLICATION_ID, 5010);
  assert.equal(latestAudit.OLD_STATUS, 'APPLIED');
  assert.equal(latestAudit.NEW_STATUS, 'SHORTLISTED');

  const noop = updateApplicationStatus(updated.state, 5010, 'SHORTLISTED', 'KARAN.SAINI');
  assert.equal(noop.ok, false);
  assert.equal(noop.state.audits.length, initialAudits + 1);
});

test('ER_SCHEDULE_INTERVIEW enforces unique (APPLICATION_ID, INTERVIEW_ROUND) and score 0..100', () => {
  const state = createInitialDatabaseState();
  const dupRound = scheduleInterview(state, {
    APPLICATION_ID: 5012,
    INTERVIEW_ROUND: 1,
    INTERVIEW_DATE: '2026-11-01',
    INTERVIEW_MODE: 'ONLINE',
    INTERVIEWER_NAME: 'Anita Desai',
  });
  assert.equal(dupRound.ok, false);
  assert.equal(dupRound.errorCode, -20010);

  const round2 = scheduleInterview(state, {
    APPLICATION_ID: 5012,
    INTERVIEW_ROUND: 2,
    INTERVIEW_DATE: '2026-11-02',
    INTERVIEW_MODE: 'OFFLINE',
    INTERVIEWER_NAME: 'Anita Desai',
  });
  assert.equal(round2.ok, true);
  const newIntId = round2.state.interviews[round2.state.interviews.length - 1].INTERVIEW_ID;

  const badScore = updateInterviewFeedback(round2.state, newIntId, {
    SCORE: 105,
    FEEDBACK: 'Invalid score',
    INTERVIEW_STATUS: 'COMPLETED',
  });
  assert.equal(badScore.ok, false);

  const goodScore = updateInterviewFeedback(round2.state, newIntId, {
    SCORE: 92,
    FEEDBACK: 'Excellent domain knowledge',
    INTERVIEW_STATUS: 'COMPLETED',
  });
  assert.equal(goodScore.ok, true);
});

test('ER_HIRE_CANDIDATE atomically updates application, creates employee, records audit, and promotes account role', () => {
  const state = createInitialDatabaseState();
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

  // Verify Gauri Sardal's account promoted to EMPLOYEE
  const gauriAcc = hired.state.accounts.find((a) => a.candidateId === 1005);
  assert.equal(gauriAcc?.role, 'EMPLOYEE');

  const repeatHire = hireCandidate(hired.state, {
    APPLICATION_ID: 5005,
    DESIGNATION: 'Financial Analyst',
    ANNUAL_SALARY: 550000,
  });
  assert.equal(repeatHire.ok, false);
  assert.equal(repeatHire.errorCode, -20020);
});

test('HR can edit employee salary, department, designation, and status, and delete employee after confirmation', () => {
  const state = createInitialDatabaseState();
  const validEmp = createEmployeeDirect(state, {
    APPLICATION_ID: 5006,
    CANDIDATE_ID: 1006,
    DESIGNATION: 'Software Developer',
    JOINING_DATE: '2026-10-20',
    ANNUAL_SALARY: 650000,
  });
  assert.equal(validEmp.ok, true);

  const empId = validEmp.state.employees[validEmp.state.employees.length - 1].EMPLOYEE_ID;
  const updatedRes = updateEmployee(validEmp.state, empId, {
    DESIGNATION: 'Lead Data Engineer',
    JOINING_DATE: '2026-10-20',
    ANNUAL_SALARY: 820000,
    EMPLOYMENT_STATUS: 'INACTIVE',
    DEPT_ID: 4, // Reassign to Data Science
    PHONE: '9000099999',
  });
  assert.equal(updatedRes.ok, true);

  const enriched = selectEnrichedEmployees(updatedRes.state);
  const target = enriched.find((e) => e.EMPLOYEE_ID === empId);
  assert.equal(target?.EMPLOYMENT_STATUS, 'INACTIVE');
  assert.equal(target?.ANNUAL_SALARY, 820000);
  assert.equal(target?.DEPT_ID, 4);
  assert.equal(target?.DEPT_NAME, 'Data Science');
  assert.equal(target?.PHONE, '9000099999');

  const delRes = deleteEmployee(updatedRes.state, empId);
  assert.equal(delRes.ok, true);
  assert.equal(delRes.state.employees.length, 1);
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
  const blockedDelete = deleteDepartment(state, 1);
  assert.equal(blockedDelete.ok, false);

  const created = createDepartment(state, 'Cyber Security');
  assert.equal(created.ok, true);
  const newDeptId = created.state.departments[created.state.departments.length - 1].DEPT_ID;

  const allowedDelete = deleteDepartment(created.state, newDeptId);
  assert.equal(allowedDelete.ok, true);
});
