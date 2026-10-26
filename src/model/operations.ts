import {
  ALLOWED_APPLICATION_STATUSES,
  ALLOWED_EMPLOYMENT_STATUSES,
  ALLOWED_INTERVIEW_MODES,
  ALLOWED_INTERVIEW_STATUSES,
  ALLOWED_JOB_STATUSES,
  ApplicationStatus,
  CandidateResumeRecord,
  EmploymentStatus,
  EnrichedEmployee,
  ErApplication,
  ErApplicationAudit,
  ErCandidate,
  ErDepartment,
  ErEmployee,
  ErInterview,
  ErJob,
  ErVCandidateApplication,
  ErVInterviewDetails,
  InterviewMode,
  InterviewStatus,
  JobStatus,
  LocalActivityLog,
  PrototypeAccount,
  RecruitmentDatabaseState,
} from './schema';

export interface OperationResult<T = RecruitmentDatabaseState> {
  ok: boolean;
  state: T;
  error?: string;
  errorCode?: number;
  message?: string;
  createdUsername?: string;
  createdCandidateId?: number;
  createdApplicationId?: number;
}

export function getTodayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function nextCandidateId(candidates: ErCandidate[]): number {
  const max = candidates.reduce((m, c) => Math.max(m, c.CANDIDATE_ID), 1011);
  return max + 1;
}

export function nextApplicationId(applications: ErApplication[]): number {
  const max = applications.reduce((m, a) => Math.max(m, a.APPLICATION_ID), 5011);
  return max + 1;
}

export function nextInterviewId(interviews: ErInterview[]): number {
  const max = interviews.reduce((m, i) => Math.max(m, i.INTERVIEW_ID), 0);
  return max + 1;
}

export function nextEmployeeId(employees: ErEmployee[]): number {
  const max = employees.reduce((m, e) => Math.max(m, e.EMPLOYEE_ID), 0);
  return max + 1;
}

export function nextAuditId(audits: ErApplicationAudit[]): number {
  const max = audits.reduce((m, a) => Math.max(m, a.AUDIT_ID), 0);
  return max + 1;
}

export function nextDepartmentId(departments: ErDepartment[]): number {
  const max = departments.reduce((m, d) => Math.max(m, d.DEPT_ID), 0);
  return max + 1;
}

export function nextJobId(jobs: ErJob[]): number {
  const max = jobs.reduce((m, j) => Math.max(m, j.JOB_ID), 100);
  return max + 1;
}

function createActivity(
  category: LocalActivityLog['category'],
  title: string,
  description: string,
  sqlEquivalent?: string
): LocalActivityLog {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    category,
    title,
    description,
    sqlEquivalent,
  };
}

/**
 * Derive standard firstname.lastname username from full name or first/last parts
 */
export function buildPrototypeUsername(firstName: string, lastName: string): string {
  const cleanFirst = (firstName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const cleanLast = (lastName ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  if (!cleanFirst && !cleanLast) return '';
  if (!cleanLast) return cleanFirst;
  return `${cleanFirst}.${cleanLast}`;
}

/**
 * Validate PDF Resume File metadata
 */
export function validatePdfResumeFile(file: {
  name: string;
  size: number;
  type?: string;
}): { ok: boolean; error?: string } {
  const name = (file.name ?? '').trim();
  if (!name.toLowerCase().endsWith('.pdf')) {
    return {
      ok: false,
      error: 'Invalid file format. Only PDF resume files (.pdf) are accepted.',
    };
  }
  if (file.type && file.type !== 'application/pdf' && file.type !== '') {
    return {
      ok: false,
      error: 'Invalid MIME type. Selected file must be a valid PDF document (application/pdf).',
    };
  }
  if (file.size <= 0) {
    return { ok: false, error: 'Selected PDF file is empty.' };
  }
  const maxBytes = 5 * 1024 * 1024; // 5 MB limit for local browser prototype
  if (file.size > maxBytes) {
    return {
      ok: false,
      error: 'Resume file exceeds the 5 MB prototype limit. Please select a smaller PDF.',
    };
  }
  return { ok: true };
}

/**
 * Procedure: ER_ADD_CANDIDATE (Pages 18-19)
 */
export interface AddCandidateInput {
  FULL_NAME: string;
  EMAIL: string;
  PHONE?: string | null;
  QUALIFICATION?: string | null;
  EXPERIENCE_YEARS: number;
  _skills?: string;
}

export function addCandidate(
  state: RecruitmentDatabaseState,
  input: AddCandidateInput
): OperationResult {
  const fullName = (input.FULL_NAME ?? '').trim();
  const email = (input.EMAIL ?? '').trim().toLowerCase();
  const phone = input.PHONE ? input.PHONE.trim() : null;
  const qualification = input.QUALIFICATION ? input.QUALIFICATION.trim() : null;
  const experience = Number(input.EXPERIENCE_YEARS);

  if (!fullName) {
    return { ok: false, state, error: 'Full name is required (NOT NULL).' };
  }
  if (fullName.length > 100) {
    return { ok: false, state, error: 'Full name must not exceed 100 characters.' };
  }
  if (!email) {
    return { ok: false, state, error: 'Email address is required (NOT NULL).' };
  }
  if (email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, state, error: 'Please enter a valid email address (max 100 characters).' };
  }
  if (phone && (phone.length > 15 || !/^[0-9+\-\s()]{7,15}$/.test(phone))) {
    return {
      ok: false,
      state,
      error: 'Phone number must be 7 to 15 valid digits/characters (VARCHAR2(15)).',
    };
  }
  if (qualification && qualification.length > 100) {
    return { ok: false, state, error: 'Qualification must not exceed 100 characters.' };
  }
  if (Number.isNaN(experience) || experience < 0 || experience > 99.9) {
    return {
      ok: false,
      state,
      error: 'Experience years must be a non-negative number (ER_CAND_EXP_CK: EXPERIENCE_YEARS >= 0).',
    };
  }

  const emailExists = state.candidates.some((c) => c.EMAIL.toLowerCase() === email);
  if (emailExists) {
    return {
      ok: false,
      state,
      errorCode: -20001,
      error: 'ORA-20001: Candidate email already exists.',
    };
  }

  const newId = nextCandidateId(state.candidates);
  const newCandidate: ErCandidate = {
    CANDIDATE_ID: newId,
    FULL_NAME: fullName,
    EMAIL: email,
    PHONE: phone,
    QUALIFICATION: qualification,
    EXPERIENCE_YEARS: Math.round(experience * 10) / 10,
    CREATED_DATE: getTodayIsoDate(),
    _origin: 'LOCAL_DEMO',
    _skills: input._skills?.trim() || undefined,
  };

  // Also ensure a prototype account exists if not already taken
  const nameParts = fullName.split(/\s+/);
  const first = nameParts[0] ?? 'candidate';
  const last = nameParts.length > 1 ? nameParts[nameParts.length - 1] : String(newId);
  let baseUsername = buildPrototypeUsername(first, last);
  if ((state.accounts ?? []).some((a) => a.username === baseUsername)) {
    baseUsername = `${baseUsername}.${newId}`;
  }
  const newAccount: PrototypeAccount = {
    username: baseUsername,
    fullName,
    role: 'CANDIDATE',
    candidateId: newId,
  };

  const activity = createActivity(
    'CANDIDATE',
    `Candidate Added (#${newId})`,
    `Candidate added successfully: ${fullName} (${email})`,
    `EXEC ER_ADD_CANDIDATE('${fullName}', '${email}', '${phone ?? ''}', '${qualification ?? ''}', ${newCandidate.EXPERIENCE_YEARS});`
  );

  return {
    ok: true,
    createdCandidateId: newId,
    createdUsername: baseUsername,
    message: `Candidate added successfully: ${fullName}`,
    state: {
      ...state,
      candidates: [...state.candidates, newCandidate],
      accounts: [...(state.accounts ?? []), newAccount],
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Complete Candidate Registration + Optional Job Application + PDF Resume Submission
 */
export interface RegisterCandidateWorkflowInput {
  firstName: string;
  lastName: string;
  customUsername?: string;
  email: string;
  phone?: string | null;
  qualification?: string | null;
  experienceYears: number;
  skills?: string;
  jobId?: number | null;
  remarks?: string | null;
  resume?: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    dataUrl?: string | null;
  } | null;
}

export function registerCandidateWorkflow(
  state: RecruitmentDatabaseState,
  input: RegisterCandidateWorkflowInput
): OperationResult {
  const first = (input.firstName ?? '').trim();
  const last = (input.lastName ?? '').trim();
  if (!first || !last) {
    return {
      ok: false,
      state,
      error: 'Both First Name and Last Name are required to generate your prototype account.',
    };
  }

  const desiredUsername = (
    input.customUsername?.trim() || buildPrototypeUsername(first, last)
  ).toLowerCase();

  if (!desiredUsername || !/^[a-z0-9]+(\.[a-z0-9]+)+$/.test(desiredUsername)) {
    return {
      ok: false,
      state,
      error: 'Username must follow the firstname.lastname format (letters, numbers, and dots).',
    };
  }

  const accounts = state.accounts ?? [];
  const usernameTaken = accounts.some((a) => a.username.toLowerCase() === desiredUsername);
  if (usernameTaken) {
    return {
      ok: false,
      state,
      error: `The username '${desiredUsername}' is already registered in this prototype. Please specify a distinct username (for example '${desiredUsername}.2').`,
    };
  }

  if (input.resume) {
    const pdfCheck = validatePdfResumeFile({
      name: input.resume.fileName,
      size: input.resume.fileSize,
      type: input.resume.mimeType,
    });
    if (!pdfCheck.ok) {
      return { ok: false, state, error: pdfCheck.error };
    }
  }

  const fullName = `${first} ${last}`.trim();
  const candRes = addCandidate(state, {
    FULL_NAME: fullName,
    EMAIL: input.email,
    PHONE: input.phone,
    QUALIFICATION: input.qualification,
    EXPERIENCE_YEARS: input.experienceYears,
    _skills: input.skills,
  });

  if (!candRes.ok || !candRes.createdCandidateId) {
    return candRes;
  }

  const newCandId = candRes.createdCandidateId;
  // Override the auto-created account username with the exact validated desiredUsername
  let nextState: RecruitmentDatabaseState = {
    ...candRes.state,
    accounts: candRes.state.accounts.map((acc) =>
      acc.candidateId === newCandId ? { ...acc, username: desiredUsername, role: 'CANDIDATE' } : acc
    ),
  };

  let createdAppId: number | undefined;
  if (input.jobId) {
    const appRes = applyForJob(nextState, {
      CANDIDATE_ID: newCandId,
      JOB_ID: Number(input.jobId),
      REMARKS: input.remarks || 'Submitted during candidate registration',
    });
    if (!appRes.ok) {
      return appRes;
    }
    nextState = appRes.state;
    createdAppId =
      nextState.applications[nextState.applications.length - 1]?.APPLICATION_ID;
  }

  if (input.resume) {
    const resumeRecord: CandidateResumeRecord = {
      CANDIDATE_ID: newCandId,
      APPLICATION_ID: createdAppId,
      fileName: input.resume.fileName,
      fileSize: input.resume.fileSize,
      mimeType: input.resume.mimeType || 'application/pdf',
      uploadedAt: new Date().toISOString(),
      dataUrl: input.resume.dataUrl ?? null,
    };
    nextState = {
      ...nextState,
      resumes: [
        ...(nextState.resumes ?? []).filter((r) => r.CANDIDATE_ID !== newCandId),
        resumeRecord,
      ],
    };
  }

  return {
    ok: true,
    state: nextState,
    createdCandidateId: newCandId,
    createdApplicationId: createdAppId,
    createdUsername: desiredUsername,
    message: `Registration complete for ${fullName}.`,
  };
}

/**
 * Upload or replace a PDF resume for an existing candidate
 */
export function saveCandidateResume(
  state: RecruitmentDatabaseState,
  candidateId: number,
  file: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    dataUrl?: string | null;
    applicationId?: number;
  }
): OperationResult {
  const candidate = state.candidates.find((c) => c.CANDIDATE_ID === candidateId);
  if (!candidate) {
    return { ok: false, state, error: `Candidate #${candidateId} does not exist.` };
  }

  const check = validatePdfResumeFile({
    name: file.fileName,
    size: file.fileSize,
    type: file.mimeType,
  });
  if (!check.ok) {
    return { ok: false, state, error: check.error };
  }

  const record: CandidateResumeRecord = {
    CANDIDATE_ID: candidateId,
    APPLICATION_ID: file.applicationId,
    fileName: file.fileName,
    fileSize: file.fileSize,
    mimeType: 'application/pdf',
    uploadedAt: new Date().toISOString(),
    dataUrl: file.dataUrl ?? null,
  };

  const activity = createActivity(
    'CANDIDATE',
    `Resume Uploaded (${candidate.FULL_NAME})`,
    `Local PDF resume '${file.fileName}' (${Math.round(file.fileSize / 1024)} KB) attached for HR review.`
  );

  return {
    ok: true,
    message: `PDF resume '${file.fileName}' saved in local prototype state.`,
    state: {
      ...state,
      resumes: [...(state.resumes ?? []).filter((r) => r.CANDIDATE_ID !== candidateId), record],
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Edit candidate details (preserving unique email and non-negative experience)
 */
export function updateCandidate(
  state: RecruitmentDatabaseState,
  candidateId: number,
  input: AddCandidateInput
): OperationResult {
  const existing = state.candidates.find((c) => c.CANDIDATE_ID === candidateId);
  if (!existing) {
    return { ok: false, state, error: `Candidate #${candidateId} does not exist.` };
  }

  const fullName = (input.FULL_NAME ?? '').trim();
  const email = (input.EMAIL ?? '').trim().toLowerCase();
  const phone = input.PHONE ? input.PHONE.trim() : null;
  const qualification = input.QUALIFICATION ? input.QUALIFICATION.trim() : null;
  const experience = Number(input.EXPERIENCE_YEARS);

  if (!fullName || fullName.length > 100) {
    return { ok: false, state, error: 'Valid full name (1-100 chars) is required.' };
  }
  if (!email || email.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, state, error: 'Valid email address is required.' };
  }
  if (phone && (phone.length > 15 || !/^[0-9+\-\s()]{7,15}$/.test(phone))) {
    return { ok: false, state, error: 'Phone must be 7-15 characters.' };
  }
  if (Number.isNaN(experience) || experience < 0 || experience > 99.9) {
    return { ok: false, state, error: 'Experience years must be >= 0.' };
  }

  const duplicateEmail = state.candidates.some(
    (c) => c.CANDIDATE_ID !== candidateId && c.EMAIL.toLowerCase() === email
  );
  if (duplicateEmail) {
    return {
      ok: false,
      state,
      errorCode: -20001,
      error: 'ORA-20001: Candidate email already exists.',
    };
  }

  const updated: ErCandidate = {
    ...existing,
    FULL_NAME: fullName,
    EMAIL: email,
    PHONE: phone,
    QUALIFICATION: qualification,
    EXPERIENCE_YEARS: Math.round(experience * 10) / 10,
    _skills: input._skills !== undefined ? input._skills.trim() : existing._skills,
  };

  const activity = createActivity(
    'CANDIDATE',
    `Candidate Updated (#${candidateId})`,
    `Updated profile for ${fullName}.`,
    `UPDATE ER_CANDIDATE SET FULL_NAME = '${fullName}' WHERE CANDIDATE_ID = ${candidateId};`
  );

  return {
    ok: true,
    message: `Candidate #${candidateId} updated successfully.`,
    state: {
      ...state,
      candidates: state.candidates.map((c) => (c.CANDIDATE_ID === candidateId ? updated : c)),
      accounts: (state.accounts ?? []).map((a) =>
        a.candidateId === candidateId ? { ...a, fullName } : a
      ),
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Create or Update Job (ER_JOB)
 */
export interface JobInput {
  JOB_TITLE: string;
  DEPT_ID: number;
  JOB_DESCRIPTION?: string | null;
  MIN_SALARY?: number | null;
  MAX_SALARY?: number | null;
  VACANCIES: number;
  JOB_STATUS?: JobStatus;
}

export function createJob(state: RecruitmentDatabaseState, input: JobInput): OperationResult {
  const title = (input.JOB_TITLE ?? '').trim();
  const deptId = Number(input.DEPT_ID);
  const desc = input.JOB_DESCRIPTION ? input.JOB_DESCRIPTION.trim() : null;
  const minSal =
    input.MIN_SALARY !== undefined && input.MIN_SALARY !== null && String(input.MIN_SALARY) !== ''
      ? Number(input.MIN_SALARY)
      : null;
  const maxSal =
    input.MAX_SALARY !== undefined && input.MAX_SALARY !== null && String(input.MAX_SALARY) !== ''
      ? Number(input.MAX_SALARY)
      : null;
  const vacancies = Number(input.VACANCIES);
  const status: JobStatus = input.JOB_STATUS ?? 'OPEN';

  if (!title || title.length > 100) {
    return { ok: false, state, error: 'Job title is required and must be <= 100 characters.' };
  }
  const dept = state.departments.find((d) => d.DEPT_ID === deptId);
  if (!dept) {
    return { ok: false, state, error: 'Selected department does not exist (ER_JOB_DEPT_FK).' };
  }
  if (desc && desc.length > 500) {
    return { ok: false, state, error: 'Job description must not exceed 500 characters.' };
  }
  if (minSal !== null && (Number.isNaN(minSal) || minSal < 0)) {
    return { ok: false, state, error: 'Minimum salary must be a non-negative number.' };
  }
  if (maxSal !== null && (Number.isNaN(maxSal) || maxSal < 0)) {
    return { ok: false, state, error: 'Maximum salary must be a non-negative number.' };
  }
  if (minSal !== null && maxSal !== null && minSal > maxSal) {
    return {
      ok: false,
      state,
      error: 'Minimum salary cannot exceed maximum salary (Constraint ER_JOB_SALARY_CK).',
    };
  }
  if (Number.isNaN(vacancies) || vacancies < 0 || !Number.isInteger(vacancies)) {
    return {
      ok: false,
      state,
      error: 'Vacancies must be a non-negative integer (Constraint ER_JOB_VACANCY_CK).',
    };
  }
  if (!ALLOWED_JOB_STATUSES.includes(status)) {
    return {
      ok: false,
      state,
      error: "Job status must be 'OPEN', 'CLOSED', or 'ON HOLD' (Constraint ER_JOB_STATUS_CK).",
    };
  }

  const newJobId = nextJobId(state.jobs);
  const newJob: ErJob = {
    JOB_ID: newJobId,
    JOB_TITLE: title,
    DEPT_ID: deptId,
    JOB_DESCRIPTION: desc,
    MIN_SALARY: minSal,
    MAX_SALARY: maxSal,
    VACANCIES: vacancies,
    JOB_STATUS: status,
    POSTED_DATE: getTodayIsoDate(),
  };

  const activity = createActivity(
    'JOB',
    `Job Created (#${newJobId})`,
    `${title} added in ${dept.DEPT_NAME} with ${vacancies} vacancies (${status}).`,
    `INSERT INTO ER_JOB (JOB_ID, JOB_TITLE, DEPT_ID, JOB_DESCRIPTION, MIN_SALARY, MAX_SALARY, VACANCIES) VALUES (${newJobId}, '${title}', ${deptId}, '${desc ?? ''}', ${minSal ?? 'NULL'}, ${maxSal ?? 'NULL'}, ${vacancies});`
  );

  return {
    ok: true,
    message: `Job #${newJobId} (${title}) created successfully.`,
    state: {
      ...state,
      jobs: [...state.jobs, newJob],
      activities: [activity, ...state.activities],
    },
  };
}

export function updateJob(
  state: RecruitmentDatabaseState,
  jobId: number,
  input: JobInput
): OperationResult {
  const existing = state.jobs.find((j) => j.JOB_ID === jobId);
  if (!existing) {
    return { ok: false, state, error: `Job #${jobId} does not exist.` };
  }

  const title = (input.JOB_TITLE ?? '').trim();
  const deptId = Number(input.DEPT_ID);
  const desc = input.JOB_DESCRIPTION ? input.JOB_DESCRIPTION.trim() : null;
  const minSal =
    input.MIN_SALARY !== undefined && input.MIN_SALARY !== null && String(input.MIN_SALARY) !== ''
      ? Number(input.MIN_SALARY)
      : null;
  const maxSal =
    input.MAX_SALARY !== undefined && input.MAX_SALARY !== null && String(input.MAX_SALARY) !== ''
      ? Number(input.MAX_SALARY)
      : null;
  const vacancies = Number(input.VACANCIES);
  const status: JobStatus = input.JOB_STATUS ?? existing.JOB_STATUS;

  if (!title || title.length > 100) {
    return { ok: false, state, error: 'Job title is required and must be <= 100 characters.' };
  }
  const dept = state.departments.find((d) => d.DEPT_ID === deptId);
  if (!dept) {
    return { ok: false, state, error: 'Selected department does not exist (ER_JOB_DEPT_FK).' };
  }
  if (minSal !== null && (Number.isNaN(minSal) || minSal < 0)) {
    return { ok: false, state, error: 'Minimum salary must be non-negative.' };
  }
  if (maxSal !== null && (Number.isNaN(maxSal) || maxSal < 0)) {
    return { ok: false, state, error: 'Maximum salary must be non-negative.' };
  }
  if (minSal !== null && maxSal !== null && minSal > maxSal) {
    return {
      ok: false,
      state,
      error: 'Minimum salary cannot exceed maximum salary (Constraint ER_JOB_SALARY_CK).',
    };
  }
  if (Number.isNaN(vacancies) || vacancies < 0 || !Number.isInteger(vacancies)) {
    return {
      ok: false,
      state,
      error: 'Vacancies must be a non-negative integer (Constraint ER_JOB_VACANCY_CK).',
    };
  }
  if (!ALLOWED_JOB_STATUSES.includes(status)) {
    return {
      ok: false,
      state,
      error: "Job status must be 'OPEN', 'CLOSED', or 'ON HOLD' (Constraint ER_JOB_STATUS_CK).",
    };
  }

  const updated: ErJob = {
    ...existing,
    JOB_TITLE: title,
    DEPT_ID: deptId,
    JOB_DESCRIPTION: desc,
    MIN_SALARY: minSal,
    MAX_SALARY: maxSal,
    VACANCIES: vacancies,
    JOB_STATUS: status,
  };

  const activity = createActivity(
    'JOB',
    `Job Updated (#${jobId})`,
    `Updated ${title} (${status}, ${vacancies} vacancies).`
  );

  return {
    ok: true,
    message: `Job #${jobId} updated successfully.`,
    state: {
      ...state,
      jobs: state.jobs.map((j) => (j.JOB_ID === jobId ? updated : j)),
      activities: [activity, ...state.activities],
    },
  };
}

export function deleteJob(state: RecruitmentDatabaseState, jobId: number): OperationResult {
  const existing = state.jobs.find((j) => j.JOB_ID === jobId);
  if (!existing) {
    return { ok: false, state, error: `Job #${jobId} not found.` };
  }
  const linkedApps = state.applications.filter((a) => a.JOB_ID === jobId);
  if (linkedApps.length > 0) {
    return {
      ok: false,
      state,
      error: `Cannot delete Job #${jobId} (${existing.JOB_TITLE}) because it is referenced by ${linkedApps.length} application(s) (Foreign Key ER_APP_JOB_FK).`,
    };
  }

  const activity = createActivity(
    'JOB',
    `Job Deleted (#${jobId})`,
    `Removed unreferenced job ${existing.JOB_TITLE}.`
  );

  return {
    ok: true,
    message: `Job #${jobId} removed.`,
    state: {
      ...state,
      jobs: state.jobs.filter((j) => j.JOB_ID !== jobId),
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Procedure: ER_APPLY_FOR_JOB (Pages 20-22)
 */
export interface ApplyForJobInput {
  CANDIDATE_ID: number;
  JOB_ID: number;
  REMARKS?: string | null;
}

export function applyForJob(
  state: RecruitmentDatabaseState,
  input: ApplyForJobInput
): OperationResult {
  const candidateId = Number(input.CANDIDATE_ID);
  const jobId = Number(input.JOB_ID);
  const remarks = input.REMARKS ? input.REMARKS.trim() : null;

  const candidate = state.candidates.find((c) => c.CANDIDATE_ID === candidateId);
  const job = state.jobs.find((j) => j.JOB_ID === jobId);

  if (!candidate || !job) {
    return {
      ok: false,
      state,
      errorCode: -20003,
      error: 'ORA-20003: Candidate or job does not exist.',
    };
  }

  if (job.JOB_STATUS !== 'OPEN') {
    return {
      ok: false,
      state,
      error: `Job #${job.JOB_ID} (${job.JOB_TITLE}) is currently '${job.JOB_STATUS}' and not accepting new applications.`,
    };
  }

  const duplicate = state.applications.some(
    (a) => a.CANDIDATE_ID === candidateId && a.JOB_ID === jobId
  );
  if (duplicate) {
    return {
      ok: false,
      state,
      errorCode: -20002,
      error:
        'ORA-20002: This candidate has already applied for this job, or an application ID conflicts (Constraint ER_APP_UNQ).',
    };
  }

  if (remarks && remarks.length > 500) {
    return { ok: false, state, error: 'Remarks must not exceed 500 characters.' };
  }

  const newAppId = nextApplicationId(state.applications);
  const newApp: ErApplication = {
    APPLICATION_ID: newAppId,
    CANDIDATE_ID: candidateId,
    JOB_ID: jobId,
    APPLICATION_DATE: getTodayIsoDate(),
    APPLICATION_STATUS: 'APPLIED',
    REMARKS: remarks ?? 'Application submitted via ER_APPLY_FOR_JOB',
    _origin: 'LOCAL_DEMO',
  };

  const activity = createActivity(
    'APPLICATION',
    `Application Submitted (#${newAppId})`,
    `${candidate.FULL_NAME} applied for ${job.JOB_TITLE} (Status: APPLIED).`,
    `EXEC ER_APPLY_FOR_JOB(${candidateId}, ${jobId});`
  );

  return {
    ok: true,
    createdApplicationId: newAppId,
    message: 'Application submitted successfully.',
    state: {
      ...state,
      applications: [...state.applications, newApp],
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Procedure: ER_UPDATE_STATUS (Pages 22-23) + Trigger: ER_APP_STATUS_AUDIT (Pages 15-16)
 */
export function updateApplicationStatus(
  state: RecruitmentDatabaseState,
  applicationId: number,
  newStatusInput: string,
  changedBy = 'HR_ADMIN',
  remarks?: string | null,
  hrNotes?: string | null
): OperationResult {
  const upperStatus = (newStatusInput ?? '').trim().toUpperCase() as ApplicationStatus;
  if (!ALLOWED_APPLICATION_STATUSES.includes(upperStatus)) {
    return {
      ok: false,
      state,
      error: `Invalid status '${newStatusInput}'. Allowed values: ${ALLOWED_APPLICATION_STATUSES.join(', ')} (Constraint ER_APP_STATUS_CK).`,
    };
  }

  const app = state.applications.find((a) => a.APPLICATION_ID === applicationId);
  if (!app) {
    return {
      ok: false,
      state,
      errorCode: -20004,
      error: 'ORA-20004: Application ID not found.',
    };
  }

  if (app.APPLICATION_STATUS === upperStatus) {
    // If only HR notes or remarks were updated without changing status, allow saving notes without a duplicate audit row
    if (hrNotes !== undefined && hrNotes !== app._hrNotes) {
      const updatedWithNotes: ErApplication = {
        ...app,
        REMARKS: remarks !== undefined && remarks !== null ? remarks.trim() : app.REMARKS,
        _hrNotes: hrNotes.trim(),
      };
      return {
        ok: true,
        message: `Saved internal HR review notes for Application #${applicationId}.`,
        state: {
          ...state,
          applications: state.applications.map((a) =>
            a.APPLICATION_ID === applicationId ? updatedWithNotes : a
          ),
        },
      };
    }

    return {
      ok: false,
      state,
      error: `Application #${applicationId} is already in '${upperStatus}' status. No change or audit entry recorded.`,
    };
  }

  const oldStatus = app.APPLICATION_STATUS;
  const updatedApp: ErApplication = {
    ...app,
    APPLICATION_STATUS: upperStatus,
    REMARKS: remarks !== undefined && remarks !== null ? remarks.trim() : app.REMARKS,
    _hrNotes: hrNotes !== undefined && hrNotes !== null ? hrNotes.trim() : app._hrNotes,
  };

  const newAuditId = nextAuditId(state.audits);
  const newAudit: ErApplicationAudit = {
    AUDIT_ID: newAuditId,
    APPLICATION_ID: applicationId,
    OLD_STATUS: oldStatus,
    NEW_STATUS: upperStatus,
    CHANGE_DATE: new Date().toISOString(),
    CHANGED_BY: changedBy,
    _origin: 'LOCAL_DEMO',
  };

  const activity = createActivity(
    'STATUS_AUDIT',
    `Application #${applicationId} Status -> ${upperStatus}`,
    `Transitioned from ${oldStatus} to ${upperStatus}. Local audit #${newAuditId} recorded.`,
    `EXEC ER_UPDATE_STATUS(${applicationId}, '${upperStatus}');`
  );

  return {
    ok: true,
    message: 'Application status updated successfully.',
    state: {
      ...state,
      applications: state.applications.map((a) =>
        a.APPLICATION_ID === applicationId ? updatedApp : a
      ),
      audits: [...state.audits, newAudit],
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Procedure: ER_SCHEDULE_INTERVIEW (Pages 25-31)
 */
export interface ScheduleInterviewInput {
  APPLICATION_ID: number;
  INTERVIEW_ROUND: number;
  INTERVIEW_DATE: string;
  INTERVIEW_MODE: string;
  INTERVIEWER_NAME: string;
  _roundLabel?: string;
}

export function scheduleInterview(
  state: RecruitmentDatabaseState,
  input: ScheduleInterviewInput
): OperationResult {
  const appId = Number(input.APPLICATION_ID);
  const round = Number(input.INTERVIEW_ROUND);
  const dateStr = (input.INTERVIEW_DATE ?? '').trim();
  const mode = (input.INTERVIEW_MODE ?? '').trim().toUpperCase() as InterviewMode;
  const interviewer = (input.INTERVIEWER_NAME ?? '').trim();

  const app = state.applications.find((a) => a.APPLICATION_ID === appId);
  if (!app) {
    return {
      ok: false,
      state,
      error: `Application #${appId} does not exist (Foreign Key ER_INT_APP_FK).`,
    };
  }

  if (Number.isNaN(round) || !Number.isInteger(round) || round < 1) {
    return {
      ok: false,
      state,
      error: 'Interview round must be a positive integer (INTERVIEW_ROUND NUMBER).',
    };
  }

  if (!dateStr || Number.isNaN(Date.parse(dateStr))) {
    return { ok: false, state, error: 'A valid interview date is required (NOT NULL).' };
  }

  if (!ALLOWED_INTERVIEW_MODES.includes(mode)) {
    return {
      ok: false,
      state,
      error: "Interview mode must be 'ONLINE' or 'OFFLINE' (Constraint ER_INT_MODE_CK).",
    };
  }

  if (!interviewer || interviewer.length > 100) {
    return {
      ok: false,
      state,
      error: 'Interviewer name is required and must not exceed 100 characters.',
    };
  }

  const duplicateRound = state.interviews.some(
    (i) => i.APPLICATION_ID === appId && i.INTERVIEW_ROUND === round
  );
  if (duplicateRound) {
    return {
      ok: false,
      state,
      errorCode: -20010,
      error: `ORA-20010: Duplicate interview record. Round ${round} already exists for Application #${appId} (Constraint ER_INT_UNQ).`,
    };
  }

  const newIntId = nextInterviewId(state.interviews);
  const newInterview: ErInterview = {
    INTERVIEW_ID: newIntId,
    APPLICATION_ID: appId,
    INTERVIEW_ROUND: round,
    INTERVIEW_DATE: dateStr,
    INTERVIEW_MODE: mode,
    INTERVIEWER_NAME: interviewer,
    SCORE: null,
    FEEDBACK: null,
    INTERVIEW_STATUS: 'SCHEDULED',
    _roundLabel: input._roundLabel?.trim() || undefined,
    _origin: 'LOCAL_DEMO',
  };

  const activity = createActivity(
    'INTERVIEW',
    `Interview Scheduled (#${newIntId})`,
    `Application #${appId}, Round ${round} (${mode}) with ${interviewer} on ${dateStr}.`,
    `EXEC ER_SCHEDULE_INTERVIEW(${appId}, ${round}, TO_DATE('${dateStr}','YYYY-MM-DD'), '${mode}', '${interviewer}');`
  );

  return {
    ok: true,
    message: 'Interview scheduled successfully.',
    state: {
      ...state,
      interviews: [...state.interviews, newInterview],
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Update Interview Feedback, Score & Status
 */
export interface UpdateInterviewFeedbackInput {
  SCORE?: number | null | string;
  FEEDBACK?: string | null;
  INTERVIEW_STATUS: InterviewStatus;
  INTERVIEWER_NAME?: string;
  INTERVIEW_DATE?: string;
  INTERVIEW_MODE?: InterviewMode;
}

export function updateInterviewFeedback(
  state: RecruitmentDatabaseState,
  interviewId: number,
  input: UpdateInterviewFeedbackInput
): OperationResult {
  const existing = state.interviews.find((i) => i.INTERVIEW_ID === interviewId);
  if (!existing) {
    return { ok: false, state, error: `Interview #${interviewId} not found.` };
  }

  let parsedScore: number | null = null;
  if (input.SCORE !== undefined && input.SCORE !== null && String(input.SCORE).trim() !== '') {
    parsedScore = Number(input.SCORE);
    if (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      return {
        ok: false,
        state,
        error: 'Score must be between 0 and 100 (Constraint ER_INT_SCORE_CK).',
      };
    }
    parsedScore = Math.round(parsedScore * 100) / 100;
  }

  const status = input.INTERVIEW_STATUS;
  if (!ALLOWED_INTERVIEW_STATUSES.includes(status)) {
    return {
      ok: false,
      state,
      error: "Interview status must be 'SCHEDULED', 'COMPLETED', or 'CANCELLED' (Constraint ER_INT_STATUS_CK).",
    };
  }

  const feedback = input.FEEDBACK ? input.FEEDBACK.trim() : null;
  if (feedback && feedback.length > 500) {
    return { ok: false, state, error: 'Feedback must not exceed 500 characters.' };
  }

  const updated: ErInterview = {
    ...existing,
    SCORE: parsedScore,
    FEEDBACK: feedback,
    INTERVIEW_STATUS: status,
    INTERVIEWER_NAME: input.INTERVIEWER_NAME
      ? input.INTERVIEWER_NAME.trim()
      : existing.INTERVIEWER_NAME,
    INTERVIEW_DATE: input.INTERVIEW_DATE || existing.INTERVIEW_DATE,
    INTERVIEW_MODE: input.INTERVIEW_MODE || existing.INTERVIEW_MODE,
  };

  const activity = createActivity(
    'INTERVIEW',
    `Interview #${interviewId} Updated`,
    `Round ${existing.INTERVIEW_ROUND} (App #${existing.APPLICATION_ID}) marked ${status}${parsedScore !== null ? ` with score ${parsedScore}/100` : ''}.`
  );

  return {
    ok: true,
    message: `Interview #${interviewId} updated successfully.`,
    state: {
      ...state,
      interviews: state.interviews.map((i) => (i.INTERVIEW_ID === interviewId ? updated : i)),
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Procedure: ER_HIRE_CANDIDATE (Pages 34-36)
 */
export interface HireCandidateInput {
  APPLICATION_ID: number;
  DESIGNATION: string;
  ANNUAL_SALARY: number;
  JOINING_DATE?: string;
  CHANGED_BY?: string;
}

export function hireCandidate(
  state: RecruitmentDatabaseState,
  input: HireCandidateInput
): OperationResult {
  const appId = Number(input.APPLICATION_ID);
  const designation = (input.DESIGNATION ?? '').trim();
  const salary = Number(input.ANNUAL_SALARY);
  const joiningDate = input.JOINING_DATE?.trim() || getTodayIsoDate();
  const changedBy = input.CHANGED_BY || 'HR_ADMIN';

  const app = state.applications.find((a) => a.APPLICATION_ID === appId);
  if (!app) {
    return {
      ok: false,
      state,
      errorCode: -20022,
      error: 'ORA-20022: Application ID does not exist.',
    };
  }

  if (app.APPLICATION_STATUS === 'HIRED') {
    return {
      ok: false,
      state,
      errorCode: -20020,
      error: 'ORA-20020: This application is already marked as hired.',
    };
  }

  const existingEmpForApp = state.employees.some((e) => e.APPLICATION_ID === appId);
  if (existingEmpForApp) {
    return {
      ok: false,
      state,
      errorCode: -20021,
      error: 'ORA-20021: An employee record already exists for this application.',
    };
  }

  const existingEmpForCand = state.employees.some((e) => e.CANDIDATE_ID === app.CANDIDATE_ID);
  if (existingEmpForCand) {
    return {
      ok: false,
      state,
      error: `Candidate #${app.CANDIDATE_ID} already has an employee record (UNIQUE constraint on ER_EMPLOYEE.CANDIDATE_ID).`,
    };
  }

  if (!designation || designation.length > 100) {
    return {
      ok: false,
      state,
      error: 'Designation is required and must not exceed 100 characters.',
    };
  }

  if (Number.isNaN(salary) || salary <= 0) {
    return {
      ok: false,
      state,
      error: 'Annual salary must be a positive number.',
    };
  }

  if (Number.isNaN(Date.parse(joiningDate))) {
    return {
      ok: false,
      state,
      error: 'Valid joining date is required.',
    };
  }

  const oldStatus = app.APPLICATION_STATUS;
  const updatedApp: ErApplication = {
    ...app,
    APPLICATION_STATUS: 'HIRED',
  };

  const newAuditId = nextAuditId(state.audits);
  const newAudit: ErApplicationAudit = {
    AUDIT_ID: newAuditId,
    APPLICATION_ID: appId,
    OLD_STATUS: oldStatus,
    NEW_STATUS: 'HIRED',
    CHANGE_DATE: new Date().toISOString(),
    CHANGED_BY: changedBy,
    _origin: 'LOCAL_DEMO',
  };

  const newEmpId = nextEmployeeId(state.employees);
  const newEmployee: ErEmployee = {
    EMPLOYEE_ID: newEmpId,
    APPLICATION_ID: appId,
    CANDIDATE_ID: app.CANDIDATE_ID,
    JOINING_DATE: joiningDate,
    DESIGNATION: designation,
    ANNUAL_SALARY: Math.round(salary * 100) / 100,
    EMPLOYMENT_STATUS: 'ACTIVE',
    _origin: 'LOCAL_DEMO',
  };

  const candidate = state.candidates.find((c) => c.CANDIDATE_ID === app.CANDIDATE_ID);
  const activity = createActivity(
    'HIRE',
    `Candidate Hired (#${app.CANDIDATE_ID} -> Employee #${newEmpId})`,
    `${candidate?.FULL_NAME ?? `Candidate #${app.CANDIDATE_ID}`} hired as ${designation}. Application #${appId} marked HIRED and Audit #${newAuditId} recorded.`,
    `EXEC ER_HIRE_CANDIDATE(${appId}, '${designation}', ${newEmployee.ANNUAL_SALARY});`
  );

  // Upgrade the candidate's prototype account role to EMPLOYEE (unless already HR)
  const updatedAccounts = (state.accounts ?? []).map((acc) =>
    acc.candidateId === app.CANDIDATE_ID && acc.role !== 'HR'
      ? { ...acc, role: 'EMPLOYEE' as const, employeeId: newEmpId }
      : acc
  );

  return {
    ok: true,
    message: `Candidate hired successfully. Candidate ID: ${app.CANDIDATE_ID}`,
    state: {
      ...state,
      applications: state.applications.map((a) => (a.APPLICATION_ID === appId ? updatedApp : a)),
      employees: [...state.employees, newEmployee],
      audits: [...state.audits, newAudit],
      accounts: updatedAccounts,
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Direct Employee Creation
 */
export interface CreateEmployeeInput {
  APPLICATION_ID: number;
  CANDIDATE_ID: number;
  DESIGNATION: string;
  JOINING_DATE: string;
  ANNUAL_SALARY: number;
  EMPLOYMENT_STATUS?: EmploymentStatus;
}

export function createEmployeeDirect(
  state: RecruitmentDatabaseState,
  input: CreateEmployeeInput
): OperationResult {
  const appId = Number(input.APPLICATION_ID);
  const candId = Number(input.CANDIDATE_ID);
  const designation = (input.DESIGNATION ?? '').trim();
  const joiningDate = (input.JOINING_DATE ?? '').trim() || getTodayIsoDate();
  const salary = Number(input.ANNUAL_SALARY);
  const status: EmploymentStatus = input.EMPLOYMENT_STATUS ?? 'ACTIVE';

  const app = state.applications.find((a) => a.APPLICATION_ID === appId);
  if (!app) {
    return { ok: false, state, error: 'Selected application does not exist (ER_EMP_APP_FK).' };
  }
  const candidate = state.candidates.find((c) => c.CANDIDATE_ID === candId);
  if (!candidate) {
    return { ok: false, state, error: 'Selected candidate does not exist (ER_EMP_CAND_FK).' };
  }
  if (app.CANDIDATE_ID !== candId) {
    return {
      ok: false,
      state,
      error: `Application #${appId} belongs to Candidate #${app.CANDIDATE_ID}, not Candidate #${candId}.`,
    };
  }
  if (state.employees.some((e) => e.APPLICATION_ID === appId)) {
    return {
      ok: false,
      state,
      error: `An employee record already exists for Application #${appId} (UNIQUE constraint).`,
    };
  }
  if (state.employees.some((e) => e.CANDIDATE_ID === candId)) {
    return {
      ok: false,
      state,
      error: `An employee record already exists for Candidate #${candId} (UNIQUE constraint).`,
    };
  }
  if (!designation || designation.length > 100) {
    return { ok: false, state, error: 'Designation is required (max 100 characters).' };
  }
  if (Number.isNaN(Date.parse(joiningDate))) {
    return { ok: false, state, error: 'Valid joining date is required.' };
  }
  if (Number.isNaN(salary) || salary < 0) {
    return { ok: false, state, error: 'Annual salary must be a non-negative amount.' };
  }
  if (!ALLOWED_EMPLOYMENT_STATUSES.includes(status)) {
    return {
      ok: false,
      state,
      error: "Employment status must be 'ACTIVE' or 'INACTIVE' (Constraint ER_EMP_STATUS_CK).",
    };
  }

  const newEmpId = nextEmployeeId(state.employees);
  const newEmployee: ErEmployee = {
    EMPLOYEE_ID: newEmpId,
    APPLICATION_ID: appId,
    CANDIDATE_ID: candId,
    JOINING_DATE: joiningDate,
    DESIGNATION: designation,
    ANNUAL_SALARY: Math.round(salary * 100) / 100,
    EMPLOYMENT_STATUS: status,
    _origin: 'LOCAL_DEMO',
  };

  const updatedAccounts = (state.accounts ?? []).map((acc) =>
    acc.candidateId === candId && acc.role !== 'HR'
      ? { ...acc, role: 'EMPLOYEE' as const, employeeId: newEmpId }
      : acc
  );

  const activity = createActivity(
    'EMPLOYEE',
    `Employee Record Created (#${newEmpId})`,
    `Created employee record for ${candidate.FULL_NAME} (${designation}, ${status}) linked to Application #${appId}.`
  );

  return {
    ok: true,
    message: `Employee #${newEmpId} created successfully.`,
    state: {
      ...state,
      employees: [...state.employees, newEmployee],
      accounts: updatedAccounts,
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Enhanced HR Employee Editing:
 * Allows HR to change Designation, Joining Date, Annual Salary, Employment Status,
 * Department assignment (DEPT_ID), Phone, and Qualification.
 */
export interface UpdateEmployeeInput {
  DESIGNATION: string;
  JOINING_DATE: string;
  ANNUAL_SALARY: number;
  EMPLOYMENT_STATUS: EmploymentStatus;
  DEPT_ID?: number;
  PHONE?: string | null;
  QUALIFICATION?: string | null;
}

export function updateEmployee(
  state: RecruitmentDatabaseState,
  employeeId: number,
  input: UpdateEmployeeInput
): OperationResult {
  const existing = state.employees.find((e) => e.EMPLOYEE_ID === employeeId);
  if (!existing) {
    return { ok: false, state, error: `Employee #${employeeId} does not exist.` };
  }

  const designation = (input.DESIGNATION ?? '').trim();
  const joiningDate = (input.JOINING_DATE ?? '').trim();
  const salary = Number(input.ANNUAL_SALARY);
  const status = input.EMPLOYMENT_STATUS;

  if (!designation || designation.length > 100) {
    return { ok: false, state, error: 'Designation is required (max 100 characters).' };
  }
  if (!joiningDate || Number.isNaN(Date.parse(joiningDate))) {
    return { ok: false, state, error: 'Valid joining date is required.' };
  }
  if (Number.isNaN(salary) || salary < 0) {
    return { ok: false, state, error: 'Annual salary must be a non-negative amount.' };
  }
  if (!ALLOWED_EMPLOYMENT_STATUSES.includes(status)) {
    return {
      ok: false,
      state,
      error: "Employment status must be 'ACTIVE' or 'INACTIVE' (Constraint ER_EMP_STATUS_CK).",
    };
  }

  let deptOverride = existing._deptIdOverride;
  if (input.DEPT_ID !== undefined && input.DEPT_ID !== null) {
    const deptIdNum = Number(input.DEPT_ID);
    const validDept = state.departments.find((d) => d.DEPT_ID === deptIdNum);
    if (!validDept) {
      return { ok: false, state, error: 'Selected department does not exist.' };
    }
    deptOverride = deptIdNum;
  }

  const updated: ErEmployee = {
    ...existing,
    DESIGNATION: designation,
    JOINING_DATE: joiningDate,
    ANNUAL_SALARY: Math.round(salary * 100) / 100,
    EMPLOYMENT_STATUS: status,
    _deptIdOverride: deptOverride,
  };

  // Also update linked candidate's PHONE / QUALIFICATION if provided by HR
  let nextCandidates = state.candidates;
  if (input.PHONE !== undefined || input.QUALIFICATION !== undefined) {
    nextCandidates = state.candidates.map((c) => {
      if (c.CANDIDATE_ID !== existing.CANDIDATE_ID) return c;
      return {
        ...c,
        PHONE: input.PHONE !== undefined ? (input.PHONE ? input.PHONE.trim() : null) : c.PHONE,
        QUALIFICATION:
          input.QUALIFICATION !== undefined
            ? input.QUALIFICATION
              ? input.QUALIFICATION.trim()
              : null
            : c.QUALIFICATION,
      };
    });
  }

  const deptName =
    deptOverride !== undefined
      ? state.departments.find((d) => d.DEPT_ID === deptOverride)?.DEPT_NAME
      : undefined;

  const activity = createActivity(
    'EMPLOYEE',
    `Employee #${employeeId} Updated by HR`,
    `Updated ${designation}${deptName ? ` (${deptName})` : ''} — Status: ${status}, Annual Salary: ₹${updated.ANNUAL_SALARY.toLocaleString('en-IN')}.`
  );

  return {
    ok: true,
    message: `Employee #${employeeId} details updated successfully.`,
    state: {
      ...state,
      employees: state.employees.map((e) => (e.EMPLOYEE_ID === employeeId ? updated : e)),
      candidates: nextCandidates,
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Remove Employee Record (with confirmation in UI)
 */
export function deleteEmployee(
  state: RecruitmentDatabaseState,
  employeeId: number
): OperationResult {
  const existing = state.employees.find((e) => e.EMPLOYEE_ID === employeeId);
  if (!existing) {
    return { ok: false, state, error: `Employee #${employeeId} not found.` };
  }

  const activity = createActivity(
    'EMPLOYEE',
    `Employee #${employeeId} Removed`,
    `Removed local employee record #${employeeId} (${existing.DESIGNATION}).`
  );

  return {
    ok: true,
    message: `Employee #${employeeId} removed from local prototype state.`,
    state: {
      ...state,
      employees: state.employees.filter((e) => e.EMPLOYEE_ID !== employeeId),
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Department Operations (ER_DEPARTMENT)
 */
export function createDepartment(
  state: RecruitmentDatabaseState,
  deptNameInput: string
): OperationResult {
  const name = (deptNameInput ?? '').trim();
  if (!name) {
    return { ok: false, state, error: 'Department name is required (NOT NULL).' };
  }
  if (name.length > 50) {
    return { ok: false, state, error: 'Department name must not exceed 50 characters.' };
  }
  const duplicate = state.departments.some(
    (d) => d.DEPT_NAME.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return {
      ok: false,
      state,
      error: `Department '${name}' already exists (UNIQUE constraint on DEPT_NAME).`,
    };
  }

  const newId = nextDepartmentId(state.departments);
  const newDept: ErDepartment = {
    DEPT_ID: newId,
    DEPT_NAME: name,
  };

  const activity = createActivity(
    'DEPARTMENT',
    `Department Created (#${newId})`,
    `Added department '${name}'.`,
    `INSERT INTO ER_DEPARTMENT VALUES (${newId}, '${name}');`
  );

  return {
    ok: true,
    message: `Department '${name}' created successfully.`,
    state: {
      ...state,
      departments: [...state.departments, newDept],
      activities: [activity, ...state.activities],
    },
  };
}

export function updateDepartment(
  state: RecruitmentDatabaseState,
  deptId: number,
  deptNameInput: string
): OperationResult {
  const existing = state.departments.find((d) => d.DEPT_ID === deptId);
  if (!existing) {
    return { ok: false, state, error: `Department #${deptId} does not exist.` };
  }
  const name = (deptNameInput ?? '').trim();
  if (!name || name.length > 50) {
    return { ok: false, state, error: 'Department name is required (1-50 chars).' };
  }
  const duplicate = state.departments.some(
    (d) => d.DEPT_ID !== deptId && d.DEPT_NAME.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) {
    return {
      ok: false,
      state,
      error: `Department '${name}' already exists (UNIQUE constraint on DEPT_NAME).`,
    };
  }

  const updated: ErDepartment = { ...existing, DEPT_NAME: name };
  const activity = createActivity(
    'DEPARTMENT',
    `Department #${deptId} Renamed`,
    `Updated department name from '${existing.DEPT_NAME}' to '${name}'.`
  );

  return {
    ok: true,
    message: `Department #${deptId} updated successfully.`,
    state: {
      ...state,
      departments: state.departments.map((d) => (d.DEPT_ID === deptId ? updated : d)),
      activities: [activity, ...state.activities],
    },
  };
}

export function deleteDepartment(
  state: RecruitmentDatabaseState,
  deptId: number
): OperationResult {
  const existing = state.departments.find((d) => d.DEPT_ID === deptId);
  if (!existing) {
    return { ok: false, state, error: `Department #${deptId} not found.` };
  }
  const linkedJobs = state.jobs.filter((j) => j.DEPT_ID === deptId);
  if (linkedJobs.length > 0) {
    return {
      ok: false,
      state,
      error: `Cannot delete Department '${existing.DEPT_NAME}' because ${linkedJobs.length} job record(s) reference it (Foreign Key ER_JOB_DEPT_FK).`,
    };
  }

  const activity = createActivity(
    'DEPARTMENT',
    `Department Deleted (#${deptId})`,
    `Removed unreferenced department '${existing.DEPT_NAME}'.`
  );

  return {
    ok: true,
    message: `Department '${existing.DEPT_NAME}' removed.`,
    state: {
      ...state,
      departments: state.departments.filter((d) => d.DEPT_ID !== deptId),
      activities: [activity, ...state.activities],
    },
  };
}

/**
 * Matches CREATE OR REPLACE VIEW ER_V_CANDIDATE_APPLICATION (Page 12)
 */
export function selectCandidateApplicationView(
  state: RecruitmentDatabaseState
): ErVCandidateApplication[] {
  const candMap = new Map(state.candidates.map((c) => [c.CANDIDATE_ID, c]));
  const jobMap = new Map(state.jobs.map((j) => [j.JOB_ID, j]));
  const deptMap = new Map(state.departments.map((d) => [d.DEPT_ID, d]));
  const resumeByCand = new Map(
    (state.resumes ?? []).map((r) => [r.CANDIDATE_ID, r])
  );

  const rows: ErVCandidateApplication[] = [];
  for (const app of state.applications) {
    const c = candMap.get(app.CANDIDATE_ID);
    const j = jobMap.get(app.JOB_ID);
    if (!c || !j) continue;
    const d = deptMap.get(j.DEPT_ID);
    if (!d) continue;

    rows.push({
      CANDIDATE_ID: c.CANDIDATE_ID,
      FULL_NAME: c.FULL_NAME,
      EMAIL: c.EMAIL,
      PHONE: c.PHONE,
      QUALIFICATION: c.QUALIFICATION,
      EXPERIENCE_YEARS: c.EXPERIENCE_YEARS,
      APPLICATION_ID: app.APPLICATION_ID,
      APPLICATION_DATE: app.APPLICATION_DATE,
      APPLICATION_STATUS: app.APPLICATION_STATUS,
      REMARKS: app.REMARKS,
      JOB_ID: j.JOB_ID,
      JOB_TITLE: j.JOB_TITLE,
      DEPT_ID: d.DEPT_ID,
      DEPT_NAME: d.DEPT_NAME,
      _hrNotes: app._hrNotes ?? null,
      _resume: resumeByCand.get(c.CANDIDATE_ID) ?? null,
    });
  }

  return rows.sort((a, b) => a.APPLICATION_ID - b.APPLICATION_ID);
}

/**
 * Matches CREATE OR REPLACE VIEW ER_V_INTERVIEW_DETAILS (Pages 13-14)
 */
export function selectInterviewDetailsView(
  state: RecruitmentDatabaseState
): ErVInterviewDetails[] {
  const appMap = new Map(state.applications.map((a) => [a.APPLICATION_ID, a]));
  const candMap = new Map(state.candidates.map((c) => [c.CANDIDATE_ID, c]));
  const jobMap = new Map(state.jobs.map((j) => [j.JOB_ID, j]));
  const deptMap = new Map(state.departments.map((d) => [d.DEPT_ID, d]));

  const rows: ErVInterviewDetails[] = [];
  for (const intv of state.interviews) {
    const app = appMap.get(intv.APPLICATION_ID);
    if (!app) continue;
    const c = candMap.get(app.CANDIDATE_ID);
    const j = jobMap.get(app.JOB_ID);
    if (!c || !j) continue;
    const d = deptMap.get(j.DEPT_ID);

    rows.push({
      CANDIDATE_ID: c.CANDIDATE_ID,
      FULL_NAME: c.FULL_NAME,
      EMAIL: c.EMAIL,
      APPLICATION_ID: app.APPLICATION_ID,
      JOB_ID: j.JOB_ID,
      JOB_TITLE: j.JOB_TITLE,
      DEPT_NAME: d?.DEPT_NAME ?? 'Unknown',
      INTERVIEW_ID: intv.INTERVIEW_ID,
      INTERVIEW_ROUND: intv.INTERVIEW_ROUND,
      INTERVIEW_DATE: intv.INTERVIEW_DATE,
      INTERVIEW_MODE: intv.INTERVIEW_MODE,
      INTERVIEWER_NAME: intv.INTERVIEWER_NAME,
      SCORE: intv.SCORE,
      FEEDBACK: intv.FEEDBACK,
      INTERVIEW_STATUS: intv.INTERVIEW_STATUS,
      _roundLabel: intv._roundLabel,
      _origin: intv._origin,
    });
  }

  return rows.sort((a, b) => a.INTERVIEW_ID - b.INTERVIEW_ID);
}

/**
 * Enriched Employees selector joining ER_EMPLOYEE -> ER_APPLICATION -> ER_CANDIDATE -> ER_JOB -> ER_DEPARTMENT
 * Respects HR department override (_deptIdOverride) when HR reassigns an employee's department.
 */
export function selectEnrichedEmployees(state: RecruitmentDatabaseState): EnrichedEmployee[] {
  const appMap = new Map(state.applications.map((a) => [a.APPLICATION_ID, a]));
  const candMap = new Map(state.candidates.map((c) => [c.CANDIDATE_ID, c]));
  const jobMap = new Map(state.jobs.map((j) => [j.JOB_ID, j]));
  const deptMap = new Map(state.departments.map((d) => [d.DEPT_ID, d]));

  const rows: EnrichedEmployee[] = [];
  for (const emp of state.employees) {
    const app = appMap.get(emp.APPLICATION_ID);
    const cand = candMap.get(emp.CANDIDATE_ID);
    const job = app ? jobMap.get(app.JOB_ID) : undefined;
    const effectiveDeptId = emp._deptIdOverride ?? job?.DEPT_ID ?? 0;
    const dept = deptMap.get(effectiveDeptId);

    rows.push({
      ...emp,
      FULL_NAME: cand?.FULL_NAME ?? `Candidate #${emp.CANDIDATE_ID}`,
      EMAIL: cand?.EMAIL ?? '',
      PHONE: cand?.PHONE ?? null,
      QUALIFICATION: cand?.QUALIFICATION ?? null,
      EXPERIENCE_YEARS: cand?.EXPERIENCE_YEARS ?? 0,
      APPLICATION_STATUS: app?.APPLICATION_STATUS ?? 'HIRED',
      JOB_ID: job?.JOB_ID ?? 0,
      JOB_TITLE: job?.JOB_TITLE ?? 'Unassigned',
      DEPT_ID: effectiveDeptId,
      DEPT_NAME: dept?.DEPT_NAME ?? 'Unassigned',
    });
  }

  return rows.sort((a, b) => a.EMPLOYEE_ID - b.EMPLOYEE_ID);
}

export interface DepartmentVacancySummary {
  DEPT_ID: number;
  DEPT_NAME: string;
  TOTAL_JOBS_ALL: number;
  OPEN_JOBS: number;
  OPEN_VACANCIES: number;
  APPLICATIONS_COUNT: number;
  EMPLOYEES_COUNT: number;
}

export function selectDepartmentSummaries(
  state: RecruitmentDatabaseState
): DepartmentVacancySummary[] {
  const enrichedEmps = selectEnrichedEmployees(state);
  const appView = selectCandidateApplicationView(state);

  return state.departments
    .map((dept) => {
      const allDeptJobs = state.jobs.filter((j) => j.DEPT_ID === dept.DEPT_ID);
      const openDeptJobs = allDeptJobs.filter((j) => j.JOB_STATUS === 'OPEN');
      const openVacancies = openDeptJobs.reduce((sum, j) => sum + j.VACANCIES, 0);
      const appsCount = appView.filter((a) => a.DEPT_ID === dept.DEPT_ID).length;
      const empsCount = enrichedEmps.filter((e) => e.DEPT_ID === dept.DEPT_ID).length;

      return {
        DEPT_ID: dept.DEPT_ID,
        DEPT_NAME: dept.DEPT_NAME,
        TOTAL_JOBS_ALL: allDeptJobs.length,
        OPEN_JOBS: openDeptJobs.length,
        OPEN_VACANCIES: openVacancies,
        APPLICATIONS_COUNT: appsCount,
        EMPLOYEES_COUNT: empsCount,
      };
    })
    .sort((a, b) => a.DEPT_NAME.localeCompare(b.DEPT_NAME));
}

export interface DashboardMetrics {
  totalCandidates: number;
  totalApplications: number;
  openJobs: number;
  openVacancies: number;
  interviewsScheduled: number;
  totalEmployees: number;
  applicationsAwaitingReview: number;
  resumesSubmitted: number;
  hiredApplicationsCount: number;
}

export function calculateDashboardMetrics(state: RecruitmentDatabaseState): DashboardMetrics {
  const openJobsList = state.jobs.filter((j) => j.JOB_STATUS === 'OPEN');
  return {
    totalCandidates: state.candidates.length,
    totalApplications: state.applications.length,
    openJobs: openJobsList.length,
    openVacancies: openJobsList.reduce((sum, j) => sum + j.VACANCIES, 0),
    interviewsScheduled: state.interviews.filter((i) => i.INTERVIEW_STATUS === 'SCHEDULED').length,
    totalEmployees: state.employees.length,
    applicationsAwaitingReview: state.applications.filter(
      (a) => a.APPLICATION_STATUS === 'APPLIED' || a.APPLICATION_STATUS === 'SHORTLISTED'
    ).length,
    resumesSubmitted: (state.resumes ?? []).length,
    hiredApplicationsCount: state.applications.filter((a) => a.APPLICATION_STATUS === 'HIRED')
      .length,
  };
}

export function generateCsvContent(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];
  return lines.join('\r\n');
}
