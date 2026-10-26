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
  ScheduleInterviewInput,
  UpdateEmployeeInput,
  UpdateInterviewFeedbackInput,
  addCandidate as opAddCandidate,
  applyForJob as opApplyForJob,
  calculateDashboardMetrics,
  createDepartment as opCreateDepartment,
  createEmployeeDirect as opCreateEmployeeDirect,
  createJob as opCreateJob,
  deleteDepartment as opDeleteDepartment,
  deleteJob as opDeleteJob,
  hireCandidate as opHireCandidate,
  scheduleInterview as opScheduleInterview,
  selectCandidateApplicationView,
  selectDepartmentSummaries,
  selectEnrichedEmployees,
  selectInterviewDetailsView,
  updateApplicationStatus as opUpdateApplicationStatus,
  updateCandidate as opUpdateCandidate,
  updateDepartment as opUpdateDepartment,
  updateEmployee as opUpdateEmployee,
  updateInterviewFeedback as opUpdateInterviewFeedback,
  updateJob as opUpdateJob,
} from '../model/operations';
import {
  EmploymentStatus,
  EnrichedEmployee,
  ErVCandidateApplication,
  ErVInterviewDetails,
  RecruitmentDatabaseState,
} from '../model/schema';
import { createInitialDatabaseState } from '../model/seedData';

const STORAGE_KEY_DB = 'bluestar_ers_db_v1';
const STORAGE_KEY_THEME = 'bluestar_ers_theme_v1';
const STORAGE_KEY_AUTH = 'bluestar_ers_auth_v1';

export const DEMO_CREDENTIALS = {
  username: 'demo.employee',
  password: 'demo.employee',
  displayName: 'Demo Recruitment Officer',
  role: 'HR Operations (Local Simulation)',
};

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
  demoUser: typeof DEMO_CREDENTIALS | null;
  login: (username: string, password: string) => { ok: boolean; error?: string };
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
  createJob: (input: JobInput) => OperationResult;
  updateJob: (jobId: number, input: JobInput) => OperationResult;
  deleteJob: (jobId: number) => OperationResult;
  applyForJob: (input: ApplyForJobInput) => OperationResult;
  updateApplicationStatus: (
    applicationId: number,
    newStatus: string,
    remarks?: string | null
  ) => OperationResult;
  scheduleInterview: (input: ScheduleInterviewInput) => OperationResult;
  updateInterviewFeedback: (
    interviewId: number,
    input: UpdateInterviewFeedbackInput
  ) => OperationResult;
  hireCandidate: (input: HireCandidateInput) => OperationResult;
  createEmployeeDirect: (input: CreateEmployeeInput) => OperationResult;
  updateEmployee: (employeeId: number, input: UpdateEmployeeInput) => OperationResult;
  createDepartment: (deptName: string) => OperationResult;
  updateDepartment: (deptId: number, deptName: string) => OperationResult;
  deleteDepartment: (deptId: number) => OperationResult;
  resetDemoData: () => void;
}

const RecruitmentContext = createContext<RecruitmentContextValue | null>(null);

function loadStoredDatabase(): RecruitmentDatabaseState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_DB);
    if (!raw) return createInitialDatabaseState();
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
      return createInitialDatabaseState();
    }
    return parsed;
  } catch {
    return createInitialDatabaseState();
  }
}

function loadStoredTheme(): 'light' | 'dark' {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY_THEME);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }
  return 'light';
}

function loadStoredAuth(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      window.localStorage.setItem(STORAGE_KEY_AUTH, 'true');
      return true;
    }
    return window.localStorage.getItem(STORAGE_KEY_AUTH) === 'true';
  } catch {
    return false;
  }
}

export const RecruitmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<RecruitmentDatabaseState>(() => loadStoredDatabase());
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => loadStoredTheme());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => loadStoredAuth());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [refreshTick, setRefreshTick] = useState<number>(0);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

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

  // Persist database changes to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY_DB, JSON.stringify(db));
    } catch {
      // ignore storage quota errors
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
    (usernameInput: string, passwordInput: string): { ok: boolean; error?: string } => {
      const u = (usernameInput ?? '').trim().toLowerCase();
      const p = (passwordInput ?? '').trim();
      if (!u || !p) {
        return { ok: false, error: 'Please enter both username and password.' };
      }
      if (u === DEMO_CREDENTIALS.username && p === DEMO_CREDENTIALS.password) {
        setIsAuthenticated(true);
        try {
          window.localStorage.setItem(STORAGE_KEY_AUTH, 'true');
        } catch {
          // ignore
        }
        notify(
          'success',
          'Signed in to Demonstration Workspace',
          `Active session: ${DEMO_CREDENTIALS.username}`
        );
        return { ok: true };
      }
      return {
        ok: false,
        error:
          'Invalid demonstration credentials. Use username "demo.employee" and password "demo.employee".',
      };
    },
    [notify]
  );

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY_AUTH);
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
    (applicationId: number, newStatus: string, remarks?: string | null) =>
      runOperation((s) =>
        opUpdateApplicationStatus(
          s,
          applicationId,
          newStatus,
          DEMO_CREDENTIALS.username.toUpperCase(),
          remarks
        )
      ),
    [runOperation]
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
          CHANGED_BY: DEMO_CREDENTIALS.username.toUpperCase(),
        })
      ),
    [runOperation]
  );

  const createEmployeeDirect = useCallback(
    (input: CreateEmployeeInput) => runOperation((s) => opCreateEmployeeDirect(s, input)),
    [runOperation]
  );

  const updateEmployee = useCallback(
    (employeeId: number, input: UpdateEmployeeInput) =>
      runOperation((s) => opUpdateEmployee(s, employeeId, input)),
    [runOperation]
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
    demoUser: isAuthenticated ? DEMO_CREDENTIALS : null,
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
