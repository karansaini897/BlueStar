import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialDatabaseState } from './seedData';
import {
  addCandidate,
  addPositionTitle,
  applyForJob,
  calculateDashboardMetrics,
  calculatePercentageIncrease,
  createDepartment,
  createEmployeeDirect,
  createJob,
  deleteDepartment,
  deleteEmployee,
  deleteJob,
  generateCsvContent,
  hireCandidate,
  promoteEmployee,
  registerCandidateWorkflow,
  scheduleInterview,
  selectCandidateApplicationView,
  selectDepartmentSummaries,
  selectEnrichedEmployees,
  updateApplicationStatus,
  updateEmployee,
  updateEmployeeHierarchy,
  updateInterviewFeedback,
  validatePdfResumeFile,
} from './operations';
import {
  createSqlSessionState,
  executeSingleSqlStatement,
} from './sqlInterpreter';

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

test('HR can edit employee salary, department, designation, and status, recording a salary adjustment entry with percentage increase', () => {
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
    ANNUAL_SALARY: 812500, // +25.0% increase
    EMPLOYMENT_STATUS: 'INACTIVE',
    DEPT_ID: 4, // Reassign to Data Science
    PHONE: '9000099999',
    AUTHORIZED_BY: 'Karan Anil Saini',
    AUTHORIZED_BY_USERNAME: 'karan.saini',
    SALARY_CHANGE_REASON: 'Annual compensation review and department transfer',
  });
  assert.equal(updatedRes.ok, true);

  const enriched = selectEnrichedEmployees(updatedRes.state);
  const target = enriched.find((e) => e.EMPLOYEE_ID === empId);
  assert.equal(target?.EMPLOYMENT_STATUS, 'INACTIVE');
  assert.equal(target?.ANNUAL_SALARY, 812500);
  assert.equal(target?.DEPT_ID, 4);
  assert.equal(target?.DEPT_NAME, 'Data Science');
  assert.equal(target?.PHONE, '9000099999');

  // Verify visual salary adjustment timeline entry recorded date, percentage increase (+25%), and HR authorizer
  const salTimeline = target?.SALARY_HISTORY ?? [];
  assert.equal(salTimeline.length, 2);
  const latestSal = salTimeline[salTimeline.length - 1];
  assert.equal(latestSal.previousSalary, 650000);
  assert.equal(latestSal.newSalary, 812500);
  assert.equal(latestSal.percentageIncrease, 25);
  assert.equal(latestSal.authorizedBy, 'Karan Anil Saini');
  assert.equal(latestSal.authorizedByUsername, 'karan.saini');

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

test('Employee Hierarchy, Reporting Relationships, and Promotion Permission Rules (All 13 Scenarios)', () => {
  let state = createInitialDatabaseState();

  // Add Position Title test
  const posRes = addPositionTitle(state, 'Principal Architect');
  assert.equal(posRes.ok, true);
  state = posRes.state;

  // Create Employee #2 (Yug Prajapati, Cand 1006, App 5006) as Level 1 reporting to Employee #1 (Diksha, Level 2)
  const emp2Res = createEmployeeDirect(state, {
    APPLICATION_ID: 5006,
    CANDIDATE_ID: 1006,
    DESIGNATION: 'Software Developer',
    JOINING_DATE: '2026-10-20',
    ANNUAL_SALARY: 500000,
    HIERARCHY_LEVEL: 1,
    MANAGER_EMPLOYEE_ID: 1,
  });
  assert.equal(emp2Res.ok, true);
  state = emp2Res.state;

  // Hire Candidate #1005 (Gauri Sardal, App 5005) as Employee #3 at Level 1 reporting to Employee #2
  const emp3Res = hireCandidate(state, {
    APPLICATION_ID: 5005,
    DESIGNATION: 'Financial Analyst',
    ANNUAL_SALARY: 450000,
    HIERARCHY_LEVEL: 1,
    MANAGER_EMPLOYEE_ID: 2,
  });
  assert.equal(emp3Res.ok, true);
  state = emp3Res.state;

  // Scenario 1: HR can promote any eligible employee (Promote Employee #1 Diksha from Level 2 to Level 3 Manager)
  const hrPromo = promoteEmployee(state, {
    employeeId: 1,
    newDesignation: 'Software Engineering Manager',
    newLevel: 3,
    newSalary: 750000,
    notes: 'Promoted to Engineering Manager by HR',
    actorUsername: 'karan.saini',
  });
  assert.equal(hrPromo.ok, true);
  state = hrPromo.state;
  const emp1After = state.employees.find((e) => e.EMPLOYEE_ID === 1)!;
  assert.equal(emp1After._hierarchyLevel, 3);
  assert.equal(emp1After.DESIGNATION, 'Software Engineering Manager');
  assert.equal(emp1After._promotionHistory?.length, 2);
  assert.equal(
    emp1After._salaryHistory?.[emp1After._salaryHistory.length - 1]?.percentageIncrease,
    calculatePercentageIncrease(600000, 750000)
  );

  // Scenario 2: A Level 1 employee (Yug, Employee #2) cannot promote another employee (Employee #3)
  const lvl1PromoAttempt = promoteEmployee(state, {
    employeeId: 3,
    newDesignation: 'Senior Financial Analyst',
    newLevel: 2,
    actorUsername: 'yug.prajapati',
  });
  assert.equal(lvl1PromoAttempt.ok, false);

  // Scenario 3 & 4: A Level 3 manager (Diksha, Employee #1) can promote an eligible Level 1 subordinate (Yug, Employee #2) to Level 2
  const lvl3PromotesSub = promoteEmployee(state, {
    employeeId: 2,
    newDesignation: 'Senior Software Developer',
    newLevel: 2,
    newSalary: 600000,
    notes: 'Promoted to Team Lead by Manager',
    actorUsername: 'diksha.rajwani',
  });
  assert.equal(lvl3PromotesSub.ok, true);
  state = lvl3PromotesSub.state;
  assert.equal(state.employees.find((e) => e.EMPLOYEE_ID === 2)?._hierarchyLevel, 2);

  // Now Yug (Employee #2) is Level 2, and Employee #3 (Gauri, Level 1) reports to Yug.
  // Scenario 8: A Level 2 manager (Yug) cannot promote subordinate #3 to Level 2 (manager's own level) or above
  const exceedLevelAttempt = promoteEmployee(state, {
    employeeId: 3,
    newDesignation: 'Finance Manager',
    newLevel: 2,
    actorUsername: 'yug.prajapati',
  });
  assert.equal(exceedLevelAttempt.ok, false);

  // But Yug (Level 2) CAN promote subordinate #3 within Level 1 (new position title / salary increase)
  const lvl2ValidPromo = promoteEmployee(state, {
    employeeId: 3,
    newDesignation: 'Senior Financial Analyst',
    newLevel: 1,
    newSalary: 500000,
    actorUsername: 'yug.prajapati',
  });
  assert.equal(lvl2ValidPromo.ok, true);
  state = lvl2ValidPromo.state;

  // Scenario 5: An employee cannot promote themselves
  const selfPromo = promoteEmployee(state, {
    employeeId: 1,
    newDesignation: 'VP Engineering',
    newLevel: 4,
    actorUsername: 'diksha.rajwani',
  });
  assert.equal(selfPromo.ok, false);

  // Scenario 6: An employee (Yug, #2) cannot promote their manager (Diksha, #1)
  const promoteManagerAttempt = promoteEmployee(state, {
    employeeId: 1,
    newDesignation: 'Director',
    newLevel: 4,
    actorUsername: 'yug.prajapati',
  });
  assert.equal(promoteManagerAttempt.ok, false);

  // Scenario 7: An employee cannot promote someone outside their reporting hierarchy
  // Remove Employee #3 from reporting to #2 (set manager to null via HR)
  const detachRes = updateEmployeeHierarchy(state, {
    employeeId: 3,
    hierarchyLevel: 1,
    managerEmployeeId: null,
    actorUsername: 'karan.saini',
  });
  assert.equal(detachRes.ok, true);
  state = detachRes.state;

  const outOfHierarchyAttempt = promoteEmployee(state, {
    employeeId: 3,
    newDesignation: 'Lead Analyst',
    newLevel: 2,
    actorUsername: 'diksha.rajwani',
  });
  assert.equal(outOfHierarchyAttempt.ok, false);

  // Scenario 9 & 10: Invalid reporting relationship (non-existent manager or circular reporting hierarchy) is rejected
  const nonExistentMgr = updateEmployeeHierarchy(state, {
    employeeId: 1,
    hierarchyLevel: 3,
    managerEmployeeId: 999,
    actorUsername: 'karan.saini',
  });
  assert.equal(nonExistentMgr.ok, false);

  // Employee #2 reports to Employee #1. Attempting to make Employee #1 report to Employee #2 creates a cycle!
  const circularAttempt = updateEmployeeHierarchy(state, {
    employeeId: 1,
    hierarchyLevel: 3,
    managerEmployeeId: 2,
    actorUsername: 'karan.saini',
  });
  assert.equal(circularAttempt.ok, false);

  // Self-reporting is also rejected
  const selfReportAttempt = updateEmployeeHierarchy(state, {
    employeeId: 1,
    hierarchyLevel: 3,
    managerEmployeeId: 1,
    actorUsername: 'karan.saini',
  });
  assert.equal(selfReportAttempt.ok, false);

  // Scenario 11: Unauthorised candidate user cannot invoke promotion or hierarchy update directly
  const candPromoAttempt = promoteEmployee(state, {
    employeeId: 2,
    newDesignation: 'Director',
    newLevel: 3,
    actorUsername: 'chahat.tekwani',
  });
  assert.equal(candPromoAttempt.ok, false);

  // Scenario 12 & 13: Verify promotion history recorded successful changes and failed promotions left state unchanged
  const finalEmp2 = state.employees.find((e) => e.EMPLOYEE_ID === 2)!;
  assert.equal(finalEmp2.DESIGNATION, 'Senior Software Developer');
  assert.equal(finalEmp2._promotionHistory?.length, 1);
  assert.equal(finalEmp2._promotionHistory?.[0].authorizedByUsername, 'diksha.rajwani');
});

test('SQL Interpreter: All 24 Required SQL*Plus Simulation Scenarios', () => {
  const initialState = createInitialDatabaseState();
  let session = createSqlSessionState(initialState, 'KARAN.SAINI');

  // 1. SELECT * FROM ER_DEPARTMENT;
  let res = executeSingleSqlStatement('SELECT * FROM ER_DEPARTMENT;', session);
  assert.equal(res.ok, true);
  assert.equal(res.rows?.length, 7);

  // 2. SELECT * FROM ER_JOB;
  res = executeSingleSqlStatement('SELECT * FROM ER_JOB;', session);
  assert.equal(res.ok, true);
  assert.equal(res.rows?.length, 7);

  // 3. SELECT * FROM ER_CANDIDATE;
  res = executeSingleSqlStatement('SELECT * FROM ER_CANDIDATE;', session);
  assert.equal(res.ok, true);
  assert.equal(res.rows?.length, 12);

  // 4. SELECT * FROM ER_APPLICATION;
  res = executeSingleSqlStatement('SELECT * FROM ER_APPLICATION;', session);
  assert.equal(res.ok, true);
  assert.equal(res.rows?.length, 12);

  // 5. SELECT * FROM ER_EMPLOYEE;
  res = executeSingleSqlStatement('SELECT * FROM ER_EMPLOYEE;', session);
  assert.equal(res.ok, true);
  assert.equal(res.rows?.length, 1);

  // 6. DESC ER_CANDIDATE;
  res = executeSingleSqlStatement('DESC ER_CANDIDATE;', session);
  assert.equal(res.ok, true);
  assert.equal(res.rows?.length, 7);

  // 7. SHOW TABLES;
  res = executeSingleSqlStatement('SHOW TABLES;', session);
  assert.equal(res.ok, true);
  assert.equal(res.rows?.length, 9);

  // 8. Valid SELECT with WHERE clause
  res = executeSingleSqlStatement(
    "SELECT JOB_ID, JOB_TITLE, JOB_STATUS FROM ER_JOB WHERE JOB_STATUS = 'OPEN' AND VACANCIES >= 3;",
    session
  );
  assert.equal(res.ok, true);
  assert.equal(res.rows?.length, 4);

  // 9. Valid ORDER BY query
  res = executeSingleSqlStatement(
    'SELECT DEPT_ID, DEPT_NAME FROM ER_DEPARTMENT ORDER BY DEPT_ID DESC;',
    session
  );
  assert.equal(res.ok, true);
  assert.equal(res.rows?.[0]?.DEPT_ID, 7);

  // 10. Valid INSERT
  res = executeSingleSqlStatement(
    "INSERT INTO ER_DEPARTMENT (DEPT_ID, DEPT_NAME) VALUES (8, 'Quality Assurance');",
    session
  );
  assert.equal(res.ok, true);
  assert.equal(res.rowsAffected, 1);
  session = res.session;
  assert.equal(session.uncommittedCount, 1);

  // 11. Valid UPDATE
  res = executeSingleSqlStatement(
    "UPDATE ER_JOB SET JOB_TITLE = 'Senior Software Developer' WHERE JOB_ID = 102;",
    session
  );
  assert.equal(res.ok, true);
  assert.equal(res.rowsAffected, 1);
  session = res.session;

  // 12. Valid DELETE with confirmation check first, then confirmed execution
  const unconfirmedDel = executeSingleSqlStatement(
    'DELETE FROM ER_DEPARTMENT WHERE DEPT_ID = 8;',
    session
  );
  assert.equal(unconfirmedDel.ok, false);
  assert.equal(unconfirmedDel.requiresConfirmation, true);

  const confirmedDel = executeSingleSqlStatement(
    'DELETE FROM ER_DEPARTMENT WHERE DEPT_ID = 8;',
    session,
    { confirmedDelete: true }
  );
  assert.equal(confirmedDel.ok, true);
  assert.equal(confirmedDel.rowsAffected, 1);
  session = confirmedDel.session;

  // Re-insert Department 8 so we can test COMMIT & visibility
  res = executeSingleSqlStatement(
    "INSERT INTO ER_DEPARTMENT (DEPT_ID, DEPT_NAME) VALUES (8, 'Quality Assurance');",
    session
  );
  assert.equal(res.ok, true);
  session = res.session;

  // 13. Invalid table name
  const badTable = executeSingleSqlStatement('SELECT * FROM ER_NON_EXISTENT;', session);
  assert.equal(badTable.ok, false);
  assert.equal(badTable.errorCode, 'ORA-SIM-00942');

  // 14. Invalid column name
  const badCol = executeSingleSqlStatement('SELECT BAD_COLUMN FROM ER_JOB;', session);
  assert.equal(badCol.ok, false);
  assert.equal(badCol.errorCode, 'ORA-SIM-00904');

  // 15. Duplicate primary key
  const dupPk = executeSingleSqlStatement(
    "INSERT INTO ER_DEPARTMENT VALUES (1, 'Duplicate HR');",
    session
  );
  assert.equal(dupPk.ok, false);
  assert.equal(dupPk.errorCode, 'ORA-SIM-00001');

  // 16. Invalid foreign key
  const badFk = executeSingleSqlStatement(
    "INSERT INTO ER_JOB (JOB_ID, JOB_TITLE, DEPT_ID, VACANCIES) VALUES (199, 'Ghost Job', 999, 1);",
    session
  );
  assert.equal(badFk.ok, false);
  assert.equal(badFk.errorCode, 'ORA-SIM-02291');

  // 17. Invalid status value
  const badStatus = executeSingleSqlStatement(
    "UPDATE ER_APPLICATION SET APPLICATION_STATUS = 'PENDING_INVALID' WHERE APPLICATION_ID = 5001;",
    session
  );
  assert.equal(badStatus.ok, false);
  assert.equal(badStatus.errorCode, 'ORA-SIM-02290');

  // 18. Unsupported command
  const unsupportedCmd = executeSingleSqlStatement('DROP TABLE ER_DEPARTMENT;', session);
  assert.equal(unsupportedCmd.ok, false);
  assert.equal(unsupportedCmd.errorCode, 'ORA-SIM-00900');

  // 19. COMMIT
  const commitRes = executeSingleSqlStatement('COMMIT;', session);
  assert.equal(commitRes.ok, true);
  assert.equal(commitRes.didCommitToSharedState, true);
  session = commitRes.session;
  assert.equal(session.uncommittedCount, 0);
  assert.equal(session.committedState.departments.length, 8);

  // 20. ROLLBACK (stage an update, then rollback and verify committed state is untouched)
  const tempUpdate = executeSingleSqlStatement(
    "UPDATE ER_JOB SET JOB_STATUS = 'CLOSED' WHERE JOB_ID = 101;",
    session
  );
  assert.equal(tempUpdate.ok, true);
  session = tempUpdate.session;
  assert.equal(
    session.workingState.jobs.find((j) => j.JOB_ID === 101)?.JOB_STATUS,
    'CLOSED'
  );

  const rollbackRes = executeSingleSqlStatement('ROLLBACK;', session);
  assert.equal(rollbackRes.ok, true);
  session = rollbackRes.session;
  assert.equal(
    session.workingState.jobs.find((j) => j.JOB_ID === 101)?.JOB_STATUS,
    'OPEN'
  );
  // Previously committed Department 8 is still present!
  assert.equal(session.workingState.departments.length, 8);

  // 21. Supported stored-procedure simulation (EXEC ER_HIRE_CANDIDATE)
  const procRes = executeSingleSqlStatement(
    "EXEC ER_HIRE_CANDIDATE(5005, 'Financial Analyst', 560000);",
    session
  );
  assert.equal(procRes.ok, true);
  session = procRes.session;
  assert.equal(session.workingState.employees.length, 2);

  // 22. Rejected unsupported stored procedure
  const badProc = executeSingleSqlStatement('EXEC ER_DROP_ALL_DATA(123);', session);
  assert.equal(badProc.ok, false);
  assert.equal(badProc.errorCode, 'ORA-SIM-06550');

  // 23. Query against each supported view (ER_V_CANDIDATE_APPLICATION and ER_V_INTERVIEW_DETAILS)
  const view1 = executeSingleSqlStatement(
    'SELECT CANDIDATE_ID, FULL_NAME, JOB_TITLE, APPLICATION_STATUS FROM ER_V_CANDIDATE_APPLICATION WHERE APPLICATION_ID = 5005;',
    session
  );
  assert.equal(view1.ok, true);
  assert.equal(view1.rows?.[0]?.APPLICATION_STATUS, 'HIRED');

  const view2 = executeSingleSqlStatement(
    'SELECT * FROM ER_V_INTERVIEW_DETAILS;',
    session
  );
  assert.equal(view2.ok, true);
  assert.equal(view2.rows?.length, 3);

  // 24. Query after a successful mutation to confirm the changed data is visible
  const verifyJob = executeSingleSqlStatement(
    'SELECT JOB_ID, JOB_TITLE FROM ER_JOB WHERE JOB_ID = 102;',
    session
  );
  assert.equal(verifyJob.ok, true);
  assert.equal(verifyJob.rows?.[0]?.JOB_TITLE, 'Senior Software Developer');
});

