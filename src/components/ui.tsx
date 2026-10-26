import React, { useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Info,
  X,
} from 'lucide-react';
import {
  ApplicationStatus,
  EmploymentStatus,
  InterviewMode,
  InterviewStatus,
  JobStatus,
} from '../model/schema';
import { generateCsvContent } from '../model/operations';
import { ToastItem } from '../context/RecruitmentContext';

/**
 * Accessible Dialog / Modal component with Escape key handling and backdrop click
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-lg',
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-xl facet-glass-strong p-6 animate-hero-enter`}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h2 id="modal-title" className="text-lg font-display font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="btn-base btn-tertiary !p-1.5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
};

/**
 * Semantic Status Label (pair color with explicit text & icon/symbol, avoiding pill-sandwich clutter)
 */
export const StatusIndicator: React.FC<{
  status: ApplicationStatus | JobStatus | InterviewStatus | EmploymentStatus | InterviewMode;
}> = ({ status }) => {
  let colorClass = 'text-[var(--text-secondary)] bg-[var(--surface-secondary)] border-[var(--border-subtle)]';

  switch (status) {
    case 'HIRED':
    case 'SELECTED':
    case 'COMPLETED':
    case 'ACTIVE':
    case 'OPEN':
      colorClass = 'text-[var(--success)] bg-[var(--success-bg)] border-[var(--success)]/30';
      break;
    case 'SHORTLISTED':
    case 'INTERVIEW':
    case 'SCHEDULED':
    case 'ONLINE':
      colorClass = 'text-[var(--brand-primary)] bg-[var(--brand-subtle)] border-[var(--brand-primary)]/30';
      break;
    case 'APPLIED':
    case 'ON HOLD':
    case 'OFFLINE':
      colorClass = 'text-[var(--warning)] bg-[var(--warning-bg)] border-[var(--warning)]/30';
      break;
    case 'REJECTED':
    case 'CANCELLED':
    case 'CLOSED':
    case 'INACTIVE':
      colorClass = 'text-[var(--danger)] bg-[var(--danger-bg)] border-[var(--danger)]/30';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono-tabular font-medium rounded border whitespace-nowrap shrink-0 ${colorClass}`}
    >
      {status}
    </span>
  );
};

/**
 * Toast Notifications Container
 */
export const ToastViewport: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto facet-glass-strong rounded-xl p-3.5 flex items-start gap-3 shadow-lg"
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" />
          )}
          {toast.type === 'info' && (
            <Info className="w-5 h-5 text-[var(--brand-primary)] shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{toast.title}</p>
            {toast.message && (
              <p className="mt-0.5 text-xs text-[var(--text-secondary)] break-words">
                {toast.message}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

/**
 * Trigger real browser download of CSV data
 */
export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const csvContent = generateCsvContent(headers, rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format Indian Rupee Salary cleanly with tabular figures
 */
export function formatInrSalary(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
}

/**
 * Reusable CSV Export Button
 */
export const CsvExportButton: React.FC<{
  filename: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
  label?: string;
  onExported?: (count: number) => void;
}> = ({ filename, headers, rows, label = 'Export CSV', onExported }) => {
  return (
    <button
      type="button"
      onClick={() => {
        downloadCsvFile(filename, headers, rows);
        onExported?.(rows.length);
      }}
      className="btn-base btn-secondary text-xs"
    >
      <Download className="w-4 h-4" />
      <span>{label}</span>
    </button>
  );
};
