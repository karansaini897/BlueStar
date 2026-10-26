import React, { useMemo, useRef, useState } from 'react';
import { HelpCircle, MessageSquare, Send, Sparkles, X } from 'lucide-react';
import { useRecruitment } from '../context/RecruitmentContext';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

const ROLE_PROMPTS: Record<'VISITOR' | 'CANDIDATE' | 'EMPLOYEE' | 'HR', string[]> = {
  VISITOR: [
    'What does this platform do?',
    'How do I apply for a job?',
    'How do I create an account?',
    'Where can I find the FAQs?',
  ],
  CANDIDATE: [
    'How do I upload my resume?',
    'How can I check my application status?',
    'Can I update my profile?',
    'What happens after I submit my application?',
    'Why is my resume still under review?',
  ],
  EMPLOYEE: [
    'How do I view my profile?',
    'Where can I find my employment details?',
    'How do I change the theme?',
    'How do I navigate my workspace?',
  ],
  HR: [
    'How do I review candidate applications?',
    'Where can I find the employee directory?',
    'How do I open an employee profile?',
    'How do I update an application status?',
    'How do I hire an eligible candidate?',
  ],
};

function generateAssistantReply(
  question: string,
  roleKey: 'VISITOR' | 'CANDIDATE' | 'EMPLOYEE' | 'HR'
): string {
  const q = question.trim().toLowerCase();

  // Security & privacy guardrails
  if (
    q.includes('password') ||
    q.includes('credential') ||
    q.includes('login details') ||
    q.includes('username list')
  ) {
    return 'For privacy and security reasons, the assistant never displays account usernames, passwords, or private credentials. Please sign in through the Sign In page or register a new candidate profile if you are a job applicant.';
  }

  // Visitor prompts & general platform questions
  if (q.includes('what does this platform do') || q.includes('about')) {
    return 'Blue Star Employee Recruitment System is an interactive recruitment management platform prototype. It connects candidate registration, PDF resume submission, HR application review, interview scheduling, and employee directory management within one role-based interface.';
  }
  if (q.includes('how do i apply for a job') || q.includes('apply')) {
    return 'To apply for an open position, open the Candidate Registration page ("Apply as Candidate"), fill in your profile details, select an open job position, and attach your resume in PDF format. Once submitted, you can track your status in your Candidate Workspace.';
  }
  if (q.includes('how do i create an account') || q.includes('register')) {
    return 'Click "Register as Candidate" on the landing page or sign-in screen. Enter your first and last name, email address, qualification, experience, and PDF resume. Your local prototype account will be created with the Candidate role by default.';
  }
  if (q.includes('where can i find the faqs') || q.includes('faq')) {
    return 'You can access the FAQs section directly from the top navigation bar or footer on the public landing page (#faqs). It covers candidate registration, PDF resume handling, theme switching, and prototype boundaries.';
  }

  // Candidate prompts
  if (q.includes('how do i upload my resume') || q.includes('pdf') || q.includes('resume')) {
    if (roleKey === 'HR') {
      return 'HR can inspect submitted candidate PDF resumes inside the "Resume Review" workspace (/resume-review). Select any application row to open the candidate review pane and preview their uploaded PDF document.';
    }
    return 'You can upload or replace your PDF resume during Candidate Registration (/register) or inside your Candidate Workspace (/candidate-workspace) under the "Resume Submission" section. Only valid .pdf files up to 5 MB are accepted in this local browser prototype.';
  }
  if (q.includes('check my application status') || q.includes('why is my resume still under review')) {
    return 'Your Candidate Workspace (/candidate-workspace) displays your real-time local application status (APPLIED, SHORTLISTED, INTERVIEW, SELECTED, REJECTED, or HIRED). An application remains in APPLIED or SHORTLISTED until HR reviews the submission in the HR Resume Review workspace.';
  }
  if (q.includes('can i update my profile')) {
    return 'Yes. In your Candidate Workspace (/candidate-workspace) or Employee Workspace (/employee-workspace), use the "Edit Profile Information" form to update your phone number, qualification, or experience years. Updating your profile keeps your application linked without resetting its status.';
  }
  if (q.includes('what happens after i submit my application')) {
    return 'After submission, your application is recorded with status APPLIED in local prototype state and appears in the HR Resume Review queue. HR can review your PDF resume, move your application to SHORTLISTED, INTERVIEW, or SELECTED, and complete the hiring workflow.';
  }

  // Employee prompts
  if (q.includes('how do i view my profile') || q.includes('where can i find my employment details')) {
    return 'In the Employee Workspace (/employee-workspace), the "My Profile" and "Employment Details" sections display your Employee ID, Designation, Department, Joining Date, Employment Status, and linked qualification details.';
  }
  if (q.includes('how do i change the theme') || q.includes('dark mode') || q.includes('light mode')) {
    return 'Click the Sun/Moon theme toggle button in the top navigation bar, sidebar footer, or Settings page (/settings). Your preference is saved in browser storage and applies across all pages and dialogs.';
  }
  if (q.includes('how do i navigate my workspace')) {
    return 'Use the left sidebar on desktop (which can be expanded or collapsed to icon-only mode) or the menu drawer on mobile devices to switch between your workspace and Settings.';
  }

  // HR prompts
  if (q.includes('how do i review candidate applications')) {
    return 'Open "Resume Review" (/resume-review) from the HR sidebar. Select any submitted candidate application from the list to inspect their qualification, preview their PDF resume if uploaded in this session, add HR-only internal review notes, and update their status.';
  }
  if (q.includes('where can i find the employee directory') || q.includes('open an employee profile')) {
    return 'Navigate to "Employees" (/employees) in the HR sidebar. You can search by employee name, ID, or designation, filter by department or status, click "Details" to inspect an employee profile, or click "Edit" to update salary, department, designation, joining date, and status.';
  }
  if (q.includes('update an application status')) {
    return 'In "Resume Review" (/resume-review) or "Applications" (/applications), select an application and choose an allowed Oracle schema status (APPLIED, SHORTLISTED, INTERVIEW, SELECTED, REJECTED, or HIRED). Each change is recorded in the local ER_APPLICATION_AUDIT trail.';
  }
  if (q.includes('how do i hire an eligible candidate') || q.includes('hire')) {
    return 'Open "Applications" (/applications) or "Resume Review" (/resume-review) and click "Hire" on an eligible application. Enter the employee Designation, Annual Salary, and Joining Date. This atomically updates the application status to HIRED and creates the linked ER_EMPLOYEE record.';
  }
  if (q.includes('oracle') || q.includes('database') || q.includes('simulated')) {
    return 'This application is a frontend-only prototype modeled on the supplied Oracle SQL*Plus schema (ER_DEPARTMENT, ER_JOB, ER_CANDIDATE, ER_APPLICATION, ER_INTERVIEW, ER_EMPLOYEE, and ER_APPLICATION_AUDIT). All mutations occur in local browser state without a live Oracle server connection.';
  }

  return 'I am the rule-based platform assistant for the Blue Star Employee Recruitment System prototype. I can help you navigate candidate registration, PDF resume uploads, application status tracking, HR resume review, employee directory management, and theme preferences. Select one of the suggested prompts above or ask about a specific workflow.';
}

export const ChatbotWidget: React.FC = () => {
  const { currentUser } = useRecruitment();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const roleKey: 'VISITOR' | 'CANDIDATE' | 'EMPLOYEE' | 'HR' = useMemo(() => {
    if (!currentUser) return 'VISITOR';
    return currentUser.role;
  }, [currentUser]);

  const roleLabel = useMemo(() => {
    if (roleKey === 'HR') return 'HR Administration Assistant';
    if (roleKey === 'EMPLOYEE') return 'Employee Workspace Assistant';
    if (roleKey === 'CANDIDATE') return 'Candidate Application Assistant';
    return 'Visitor & Platform Guide';
  }, [roleKey]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: 'Welcome to the Blue Star Employee Recruitment System assistant. Choose a suggested question below or type a question about platform navigation, resume submissions, or workspace workflows.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const sendQuestion = (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: now,
    };
    const replyText = generateAssistantReply(trimmed, roleKey);
    const botMsg: ChatMessage = {
      id: `b-${Date.now() + 1}`,
      sender: 'assistant',
      text: replyText,
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInputValue('');
    window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 60);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(inputValue);
  };

  const suggestedPrompts = ROLE_PROMPTS[roleKey];

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {isOpen && (
        <section
          role="dialog"
          aria-label="Platform Workflow Assistant"
          className="mb-3 w-[calc(100vw-2.5rem)] sm:w-[390px] max-h-[80vh] facet-glass-strong rounded-2xl border border-[var(--border-emphasis)] shadow-2xl flex flex-col overflow-hidden animate-hero-enter"
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-[var(--border-subtle)] bg-[var(--surface-primary)]/90 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)] text-white flex items-center justify-center shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-display font-bold text-[var(--text-primary)] truncate">
                  Workflow Assistant
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  {roleLabel} · Rule-Based Guide
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant panel"
              className="btn-base btn-tertiary !p-1.5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pre-generated Role-Specific Prompts */}
          <div className="px-4 py-2.5 bg-[var(--surface-secondary)]/65 border-b border-[var(--border-subtle)] space-y-1.5">
            <div className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[var(--brand-primary)]" />
              <span>Suggested Prompts ({roleKey === 'VISITOR' ? 'Public Visitor' : roleKey}):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendQuestion(prompt)}
                  className="text-left text-xs px-2.5 py-1 rounded-lg bg-[var(--surface-primary)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[290px] bg-[var(--surface-primary)]/70">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'surface-card text-[var(--text-primary)]'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-[var(--text-secondary)] mt-1 px-1">
                  {msg.sender === 'user' ? 'You' : 'Assistant'} · {msg.timestamp}
                </span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleFormSubmit}
            className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-primary)] flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about resumes, status, or navigation..."
              aria-label="Ask a question to the workflow assistant"
              className="input-field !py-1.5 text-xs"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              aria-label="Send message"
              className="btn-base btn-primary !py-1.5 !px-3 text-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </section>
      )}

      {/* Floating Glassmorphic Launcher */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Toggle workflow assistant"
        className="btn-base btn-primary !rounded-full !px-4 !py-3 shadow-lg flex items-center gap-2"
      >
        {isOpen ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
        <span className="text-xs font-semibold">
          {isOpen ? 'Close Assistant' : 'Platform Assistant'}
        </span>
      </button>
    </div>
  );
};
