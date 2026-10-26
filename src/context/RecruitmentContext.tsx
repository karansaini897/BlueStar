import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  AddCandidateInput,
  ApplyForJobInput,
  CreateEmployeeInput,
  DashboardMetrics,
  DepartmentVacancySummary,
  HireCandidateInput,
  JobInput,
  OperationResult,
  PromoteEmployeeInput,
  RegisterCandidateInput,
  ScheduleInterviewInput,
  UpdateEmployeeHierarchyInput,
  UpdateEmployeeInput,
  UpdateInterviewFeedbackInput,
  addCandidate as opAddCandidate,
  addPositionTitle as opAddPositionTitle,
  applyForJob as opApplyForJob,
  buildPrototypeUsername,
  calculateDashboardMetrics,
  createDepartment as opCreateDepartment,
  createEmployeeDirect as opCreateEmployeeDirect,
  createJob as opCreateJob,
  deleteDepartment as opDeleteDepartment,
  deleteEmployee as opDeleteEmployee,
  deleteJob as opDeleteJob,
  hireCandidate as opHireCandidate,
  promoteEmployee as opPromoteEmployee,
  registerCandidateWorkflow as opRegisterCandidateWorkflow,
  saveCandidateResume as opSaveCandidateResume,
  scheduleInterview as opScheduleInterview,
  selectCandidateApplicationView,
  selectDepartmentSummaries,
  selectEnrichedEmployees,
  selectInterviewDetailsView,
  updateApplicationStatus as opUpdateApplicationStatus,
  updateCandidate as opUpdateCandidate,
  updateDepartment as opUpdateDepartment,
  updateEmployee as opUpdateEmployee,
  updateEmployeeHierarchy as opUpdateEmployeeHierarchy,
  updateInterviewFeedback as opUpdateInterviewFeedback,
  updateJob as opUpdateJob,
} from '../model/operations';
import {
  CandidateResumeRecord,
  EnrichedEmployee,
  ErVCandidateApplication,
  ErVInterviewDetails,
  PrototypeAccount,
  RecruitmentDatabaseState,
} from '../model/schema';
import { createInitialDatabaseState } from '../model/seedData';

const STORAGE_KEY_DB = 'bluestar_ers_db_v2';
const STORAGE_KEY_THEME = 'bluestar_ers_theme_v1';
const STORAGE_KEY_AUTH_USER = 'bluestar_ers_auth_user_v2';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface RecruitmentContextValue {
  db: RecruitmentDatabaseState;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (t: 'light' | 'dark') => void;
  isAuthenticated: boolean;
  currentUser: PrototypeAccount | null;
  demoUser: PrototypeAccount | null;
  login: (
    username: string,
    password: string
  ) => { ok: boolean; error?: string; account?: PrototypeAccount };
  logout: () => void;
  toasts: ToastItem[];
  dismissToast: (id: string) => void;
  notify: (type: ToastItem['type'], title: string, message?: string) => void;
  // Derived views & metrics
  metrics: DashboardMetrics;
  candidateApplicationView: ErVCandidateApplication[];
  interviewDetailsView: ErVInterviewDetails[];
  enrichedEmployees: EnrichedEmployee[];
  departmentSummaries: DepartmentVacancySummary[];
  lastRefreshedAt: string;
  refreshSummaries: () => void;
  // Operations
  addCandidate: (input: AddCandidateInput) => OperationResult;
  updateCandidate: (candidateId: number, input: AddCandidateInput) => OperationResult;
  registerCandidate: (
    input: RegisterCandidateInput
  ) => OperationResult & { createdUsername?: string; createdCandidateId?: number };
  saveCandidateResume: (resume: CandidateResumeRecord) => OperationResult;
  createJob: (input: JobInput) => OperationResult;
  updateJob: (jobId: number, input: JobInput) => OperationResult;
  deleteJob: (jobId: number) => OperationResult;
  applyForJob: (input: ApplyForJobInput) => OperationResult;
  updateApplicationStatus: (
    applicationId: number,
    newStatus: string,
    remarks?: string | null,
    hrNotes?: string | null
  ) => OperationResult;
  scheduleInterview: (input: ScheduleInterviewInput) => OperationResult;
  updateInterviewFeedback: (
    interviewId: number,
    input: UpdateInterviewFeedbackInput
  ) => OperationResult;
  hireCandidate: (input: HireCandidateInput) => OperationResult;
  createEmployeeDirect: (input: CreateEmployeeInput) => OperationResult;
  updateEmployee: (employeeId: number, input: UpdateEmployeeInput) => OperationResult;
  deleteEmployee: (employeeId: number) => OperationResult;
  promoteEmployee: (input: Omit<PromoteEmployeeInput, 'actorUsername'> & { actorUsername?: string }) => OperationResult;
  updateEmployeeHierarchy: (
    input: Omit<UpdateEmployeeHierarchyInput, 'actorUsername'> & { actorUsername?: string }
  ) => OperationResult;
  addPositionTitle: (title: string) => OperationResult;
  replaceDatabaseState: (nextState: RecruitmentDatabaseState, summaryMessage?: string) => void;
  createDepartment: (deptName: string) => OperationResult;
  updateDepartment: (deptId: number, deptName: string) => OperationResult;
  deleteDepartment: (deptId: number) => OperationResult;
  resetDemoData: () => void;
}

const RecruitmentContext = createContext<RecruitmentContextValue | null>(null);

function loadStoredDatabase(): RecruitmentDatabaseState {
  const initial = createInitialDatabaseState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DB);
    if (!raw) return initial;
    const parsed = JSON.parse(raw) as RecruitmentDatabaseState;
    if (
      !parsed ||
      parsed.version !== 1 ||
      !Array.isArray(parsed.departments) ||
      !Array.isArray(parsed.jobs) ||
      !Array.isArray(parsed.candidates) ||
      !Array.isArray(parsed.applications) ||
      !Array.isArray(parsed.interviews) ||
      !Array.isArray(parsed.employees) ||
      !Array.isArray(parsed.audits)
    ) {
      return initial;
    }
    const seedEmpMap = new Map(initial.employees.map((e) => [e.EMPLOYEE_ID, e]));
    return {
      ...parsed,
      employees: parsed.employees.map((emp) => {
        const seedEmp = seedEmpMap.get(emp.EMPLOYEE_ID);
        return {
          ...emp,
          _hierarchyLevel: emp._hierarchyLevel ?? seedEmp?._hierarchyLevel ?? 1,
          _managerEmployeeId:
            emp._managerEmployeeId !== undefined
              ? emp._managerEmployeeId
              : (seedEmp?._managerEmployeeId ?? null),
          _promotionHistory: Array.isArray(emp._promotionHistory)
            ? emp._promotionHistory
            : (seedEmp?._promotionHistory ?? []),
          _salaryHistory:
            Array.isArray(emp._salaryHistory) && emp._salaryHistory.length > 0
              ? emp._salaryHistory
              : (seedEmp?._salaryHistory ?? [
                  {
                    id: `sal-mig-${emp.EMPLOYEE_ID}`,
                    employeeId: emp.EMPLOYEE_ID,
                    date: emp.JOINING_DATE,
                    previousSalary: emp.ANNUAL_SALARY,
                    newSalary: emp.ANNUAL_SALARY,
                    percentageIncrease: 0,
                    authorizedBy: 'Karan Anil Saini',
                    authorizedByUsername: 'karan.saini',
                    reason: 'Initial compensation baseline.',
                  },
                ]),
        };
      }),
      resumes: Array.isArray(parsed.resumes) ? parsed.resumes : initial.resumes,
      accounts:
        Array.isArray(parsed.accounts) && parsed.accounts.length > 0
          ? parsed.accounts
          : initial.accounts,
      positionTitles:
        Array.isArray(parsed.positionTitles) && parsed.positionTitles.length > 0
          ? parsed.positionTitles
          : initial.positionTitles,
    };
  } catch {
    return initial;
  }
}

function loadStoredTheme(): 'light' | 'dark' {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
  } catch {
    // ignore
  }
  return 'light';
}

function loadStoredUser(db: RecruitmentDatabaseState): PrototypeAccount | null {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      const hrAccount =
        db.accounts.find((a) => a.role === 'HR') ?? {
          username: 'karan.saini',
          fullName: 'Karan Saini',
          displayName: 'Karan Saini',
          role: 'HR' as const,
          candidateId: 1003,
        };
      window.localStorage.setItem(STORAGE_KEY_AUTH_USER, hrAccount.username);
      return { ...hrAccount, displayName: hrAccount.displayName ?? hrAccount.fullName };
    }
    const savedUsername = window.localStorage.getItem(STORAGE_KEY_AUTH_USER);
    if (!savedUsername) return null;
    const found = db.accounts.find(
      (a) => a.username.toLowerCase() === savedUsername.toLowerCase()
    );
    return found ? { ...found, displayName: found.displayName ?? found.fullName } : null;
  } catch {
    return null;
  }
}

export const RecruitmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<RecruitmentDatabaseState>(() => loadStoredDatabase());
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => loadStoredTheme());
  const [currentUsername, setCurrentUsername] = useState<string | null>(() => {
    const initialUser = loadStoredUser(loadStoredDatabase());
    return initialUser?.username ?? null;
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  const currentUser = useMemo<PrototypeAccount | null>(() => {
    if (!currentUsername) return null;
    const u = currentUsername.toLowerCase();
    const fromAccounts = db.accounts.find((a) => a.username.toLowerCase() === u);
    if (fromAccounts) {
      return {
        ...fromAccounts,
        displayName: fromAccounts.displayName ?? fromAccounts.fullName,
      };
    }
    return null;
  }, [db.accounts, currentUsername]);

  const isAuthenticated = currentUser !== null;

  // Sync theme with document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  // Persist database changes to localStorage (excluding large dataUrls if quota is exceeded)
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(db));
    } catch {
      try {
        const compactDb: RecruitmentDatabaseState = {
          ...db,
          resumes: db.resumes.map((r) => ({ ...r, dataUrl: undefined })),
        };
        window.localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(compactDb));
      } catch {
        // ignore storage quota errors
      }
    }
  }, [db]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (type: ToastItem['type'], title: string, message?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, message }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast]
  );

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((t: 'light' | 'dark') => {
    setThemeState(t);
  }, []);

  const login = useCallback(
    (
      usernameInput: string,
      passwordInput: string
    ): { ok: boolean; error?: string; account?: PrototypeAccount } => {
      const u = (usernameInput ?? '').trim().toLowerCase();
      const p = (passwordInput ?? '').trim().toLowerCase();
      if (!u || !p) {
        return { ok: false, error: 'Please enter both username and password.' };
      }

      // Prototype convention: username is firstname.lastname and initial password equals username
      if (u !== p) {
        return {
          ok: false,
          error: 'Invalid username or password. Please verify your credentials and try again.',
        };
      }

      // Support legacy demo.employee alias mapped to HR for backward compatibility
      if (u === 'demo.employee') {
        const hrAcc =
          db.accounts.find((a) => a.role === 'HR') ?? {
            username: 'karan.saini',
            fullName: 'Karan Saini',
            displayName: 'Karan Saini',
            role: 'HR' as const,
            candidateId: 1003,
          };
        const normalizedHr = { ...hrAcc, displayName: hrAcc.displayName ?? hrAcc.fullName };
        setCurrentUsername(normalizedHr.username);
        try {
          window.localStorage.setItem(STORAGE_KEY_AUTH_USER, normalizedHr.username);
        } catch {
          // ignore
        }
        notify('success', 'Signed in to HR Workspace', `Welcome back, ${normalizedHr.fullName}`);
        return { ok: true, account: normalizedHr };
      }

      // Find in registered prototype accounts
      let matched = db.accounts.find((a) => a.username.toLowerCase() === u);

      // Or match dynamically against ER_CANDIDATE by firstname.lastname convention
      if (!matched) {
        const candidateMatch = db.candidates.find(
          (c) => buildPrototypeUsername(c.FULL_NAME) === u
        );
        if (candidateMatch) {
          const empMatch = db.employees.find(
            (e) => e.CANDIDATE_ID === candidateMatch.CANDIDATE_ID
          );
          matched = {
            username: u,
            fullName: candidateMatch.FULL_NAME,
            displayName: candidateMatch.FULL_NAME,
            role: empMatch ? 'EMPLOYEE' : 'CANDIDATE',
            candidateId: candidateMatch.CANDIDATE_ID,
            employeeId: empMatch?.EMPLOYEE_ID,
          };
        }
      }

      if (!matched) {
        return {
          ok: false,
          error:
            'Account not found in the local prototype directory. New applicants can register a candidate profile first.',
        };
      }

      const normalizedAccount: PrototypeAccount = {
        ...matched,
        displayName: matched.displayName ?? matched.fullName,
      };

      setCurrentUsername(normalizedAccount.username);
      try {
        window.localStorage.setItem(STORAGE_KEY_AUTH_USER, normalizedAccount.username);
      } catch {
        // ignore
      }
      notify(
        'success',
        `Signed in (${normalizedAccount.role} Workspace)`,
        `Welcome, ${normalizedAccount.fullName}`
      );
      return { ok: true, account: normalizedAccount };
    },
    [db.accounts, db.candidates, db.employees, notify]
  );

  const logout = useCallback(() => {
    setCurrentUsername(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    } catch {
      // ignore
    }
    notify('info', 'Signed out', 'Demonstration session closed.');
  }, [notify]);

  const runOperation = useCallback(
    (fn: (current: RecruitmentDatabaseState) => OperationResult): OperationResult => {
      const result = fn(db);
      if (result.ok) {
        setDb(result.state);
        setLastRefreshedAt(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        if (result.message) {
          notify('success', result.message);
        }
      } else if (result.error) {
        notify('error', 'Operation Rejected', result.error);
      }
      return result;
    },
    [db, notify]
  );

  const addCandidate = useCallback(
    (input: AddCandidateInput) => runOperation((s) => opAddCandidate(s, input)),
    [runOperation]
  );

  const updateCandidate = useCallback(
    (candidateId: number, input: AddCandidateInput) =>
      runOperation((s) => opUpdateCandidate(s, candidateId, input)),
    [runOperation]
  );

  const registerCandidate = useCallback(
    (input: RegisterCandidateInput) => {
      const result = opRegisterCandidateWorkflow(db, input);
      if (result.ok) {
        setDb(result.state);
        if (result.createdUsername) {
          setCurrentUsername(result.createdUsername);
          try {
            window.localStorage.setItem(STORAGE_KEY_AUTH_USER, result.createdUsername);
          } catch {
            // ignore
          }
        }
        setLastRefreshedAt(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
        if (result.message) {
          notify('success', result.message);
        }
      } else if (result.error) {
        notify('error', 'Registration Validation Error', result.error);
      }
      return result;
    },
    [db, notify]
  );

  const saveCandidateResume = useCallback(
    (resume: CandidateResumeRecord) =>
      runOperation((s) => opSaveCandidateResume(s, resume)),
    [runOperation]
  );

  const createJob = useCallback(
    (input: JobInput) => runOperation((s) => opCreateJob(s, input)),
    [runOperation]
  );

  const updateJob = useCallback(
    (jobId: number, input: JobInput) => runOperation((s) => opUpdateJob(s, jobId, input)),
    [runOperation]
  );

  const deleteJob = useCallback(
    (jobId: number) => runOperation((s) => opDeleteJob(s, jobId)),
    [runOperation]
  );

  const applyForJob = useCallback(
    (input: ApplyForJobInput) => runOperation((s) => opApplyForJob(s, input)),
    [runOperation]
  );

  const updateApplicationStatus = useCallback(
    (
      applicationId: number,
      newStatus: string,
      remarks?: string | null,
      hrNotes?: string | null
    ) =>
      runOperation((s) =>
        opUpdateApplicationStatus(
          s,
          applicationId,
          newStatus,
          (currentUser?.username ?? 'HR_ADMIN').toUpperCase(),
          remarks,
          hrNotes
        )
      ),
    [runOperation, currentUser]
  );

  const scheduleInterview = useCallback(
    (input: ScheduleInterviewInput) => runOperation((s) => opScheduleInterview(s, input)),
    [runOperation]
  );

  const updateInterviewFeedback = useCallback(
    (interviewId: number, input: UpdateInterviewFeedbackInput) =>
      runOperation((s) => opUpdateInterviewFeedback(s, interviewId, input)),
    [runOperation]
  );

  const hireCandidate = useCallback(
    (input: HireCandidateInput) =>
      runOperation((s) =>
        opHireCandidate(s, {
          ...input,
          CHANGED_BY: currentUser?.username ?? 'karan.saini',
          AUTHORIZED_BY_NAME: currentUser?.fullName ?? 'Karan Anil Saini',
        })
      ),
    [runOperation, currentUser]
  );

  const createEmployeeDirect = useCallback(
    (input: CreateEmployeeInput) =>
      runOperation((s) =>
        opCreateEmployeeDirect(s, {
          ...input,
          AUTHORIZED_BY: input.AUTHORIZED_BY ?? currentUser?.fullName ?? 'Karan Anil Saini',
          AUTHORIZED_BY_USERNAME:
            input.AUTHORIZED_BY_USERNAME ?? currentUser?.username ?? 'karan.saini',
        })
      ),
    [runOperation, currentUser]
  );

  const updateEmployee = useCallback(
    (employeeId: number, input: UpdateEmployeeInput) =>
      runOperation((s) =>
        opUpdateEmployee(s, employeeId, {
          ...input,
          AUTHORIZED_BY: input.AUTHORIZED_BY ?? currentUser?.fullName ?? 'Karan Anil Saini',
          AUTHORIZED_BY_USERNAME:
            input.AUTHORIZED_BY_USERNAME ?? currentUser?.username ?? 'karan.saini',
        })
      ),
    [runOperation, currentUser]
  );

  const deleteEmployee = useCallback(
    (employeeId: number) => runOperation((s) => opDeleteEmployee(s, employeeId)),
    [runOperation]
  );

  const promoteEmployee = useCallback(
    (input: Omit<PromoteEmployeeInput, 'actorUsername'> & { actorUsername?: string }) =>
      runOperation((s) =>
        opPromoteEmployee(s, {
          ...input,
          actorUsername: input.actorUsername ?? currentUser?.username ?? '',
        })
      ),
    [runOperation, currentUser]
  );

  const updateEmployeeHierarchy = useCallback(
    (
      input: Omit<UpdateEmployeeHierarchyInput, 'actorUsername'> & { actorUsername?: string }
    ) =>
      runOperation((s) =>
        opUpdateEmployeeHierarchy(s, {
          ...input,
          actorUsername: input.actorUsername ?? currentUser?.username ?? '',
        })
      ),
    [runOperation, currentUser]
  );

  const addPositionTitle = useCallback(
    (title: string) => runOperation((s) => opAddPositionTitle(s, title)),
    [runOperation]
  );

  const replaceDatabaseState = useCallback(
    (nextState: RecruitmentDatabaseState, summaryMessage?: string) => {
      setDb(nextState);
      setLastRefreshedAt(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      if (summaryMessage) {
        notify('success', 'SQL Changes Synchronised', summaryMessage);
      }
    },
    [notify]
  );

  const createDepartment = useCallback(
    (deptName: string) => runOperation((s) => opCreateDepartment(s, deptName)),
    [runOperation]
  );

  const updateDepartment = useCallback(
    (deptId: number, deptName: string) =>
      runOperation((s) => opUpdateDepartment(s, deptId, deptName)),
    [runOperation]
  );

  const deleteDepartment = useCallback(
    (deptId: number) => runOperation((s) => opDeleteDepartment(s, deptId)),
    [runOperation]
  );

  const resetDemoData = useCallback(() => {
    const fresh = createInitialDatabaseState();
    setDb(fresh);
    try {
      window.localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(fresh));
    } catch {
      // ignore
    }
    setLastRefreshedAt(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
    notify(
      'success',
      'Demonstration data reset successfully',
      'Restored initial Oracle SQL*Plus seed records and cleared local mutations.'
    );
  }, [notify]);

  const refreshSummaries = useCallback(() => {
    setRefreshTick((t) => t + 1);
    setLastRefreshedAt(
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
    notify('info', 'Summaries Recalculated', 'All metrics and views verified against local state.');
  }, [notify]);

  const metrics = useMemo(() => {
    void refreshTick;
    return calculateDashboardMetrics(db);
  }, [db, refreshTick]);

  const candidateApplicationView = useMemo(() => {
    void refreshTick;
    return selectCandidateApplicationView(db);
  }, [db, refreshTick]);

  const interviewDetailsView = useMemo(() => {
    void refreshTick;
    return selectInterviewDetailsView(db);
  }, [db, refreshTick]);

  const enrichedEmployees = useMemo(() => {
    void refreshTick;
    return selectEnrichedEmployees(db);
  }, [db, refreshTick]);

  const departmentSummaries = useMemo(() => {
    void refreshTick;
    return selectDepartmentSummaries(db);
  }, [db, refreshTick]);

  const value: RecruitmentContextValue = {
    db,
    theme,
    toggleTheme,
    setTheme,
    isAuthenticated,
    currentUser,
    demoUser: currentUser,
    login,
    logout,
    toasts,
    dismissToast,
    notify,
    metrics,
    candidateApplicationView,
    interviewDetailsView,
    enrichedEmployees,
    departmentSummaries,
    lastRefreshedAt,
    refreshSummaries,
    addCandidate,
    updateCandidate,
    registerCandidate,
    saveCandidateResume,
    createJob,
    updateJob,
    deleteJob,
    applyForJob,
    updateApplicationStatus,
    scheduleInterview,
    updateInterviewFeedback,
    hireCandidate,
    createEmployeeDirect,
    updateEmployee,
    deleteEmployee,
    promoteEmployee,
    updateEmployeeHierarchy,
    addPositionTitle,
    replaceDatabaseState,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    resetDemoData,
  };

  return <RecruitmentContext.Provider value={value}>{children}</RecruitmentContext.Provider>;
};

export function useRecruitment(): RecruitmentContextValue {
  const ctx = useContext(RecruitmentContext);
  if (!ctx) {
    throw new Error('useRecruitment must be used inside a RecruitmentProvider');
  }
  return ctx;
}
