// src/pages/ProblemWorkspace.jsx
// Split-Canvas Conductor Page Layout — master full-screen workspace manager.
// No direct inline text parsing or network states; delegates to useProblemDetails hook.
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProblemDetails } from '../hooks/useProblemDetails';
import { ProblemDescription } from '../components/practice/ProblemDescription';
import { InteractiveEditor } from '../components/practice/InteractiveEditor';

// ─── Language Options ──────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
];

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function WorkspaceSkeleton() {
  return (
    <div className="pw-skeleton-root">
      <div className="pw-skeleton-left">
        <div className="pw-skel pw-skel--title" />
        <div className="pw-skel pw-skel--badge" />
        <div className="pw-skel pw-skel--line pw-skel--w90" />
        <div className="pw-skel pw-skel--line pw-skel--w80" />
        <div className="pw-skel pw-skel--line pw-skel--w70" />
        <div className="pw-skel pw-skel--line pw-skel--w95" />
        <div className="pw-skel pw-skel--line pw-skel--w60" />
        <div className="pw-skel pw-skel--block" />
      </div>
      <div className="pw-skeleton-right">
        <div className="pw-skel pw-skel--editor" />
      </div>
    </div>
  );
}

// ─── Error State ───────────────────────────────────────────────────────────────

function WorkspaceError({ message, onRetry }) {
  return (
    <div className="pw-error-root">
      <div className="pw-error-card">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="pw-error-message">{message}</p>
        <button className="pw-error-retry" onClick={onRetry}>
          Try Again
        </button>
      </div>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────

/**
 * ProblemWorkspace
 *
 * Full-screen split-pane IDE layout.
 * URL: /practice/problems/:slug
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────────┐
 *   │  Toolbar: [← Back | Title]              [Language ▾]    │
 *   ├───────────────────────────┬──────────────────────────────┤
 *   │  ProblemDescription       │  InteractiveEditor           │
 *   │  (scroll-isolated)        │  (Monaco + Terminal)         │
 *   │                           │                              │
 *   └───────────────────────────┴──────────────────────────────┘
 */
export function ProblemWorkspace() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const {
    problem,
    loading,
    error,
    code,
    setCode,
    selectedLanguage,
    setSelectedLanguage,
    isRunning,
    isSubmitting,
    terminalOutput,
    isTerminalOpen,
    setIsTerminalOpen,
    runCode,
    submitCode,
    submissions,
    loadingSubmissions,
  } = useProblemDetails(slug);

  const handleBack = () => {
    navigate('/practice');
  };

  const handleLanguageChange = (e) => {
    setSelectedLanguage(e.target.value);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <main className="pw-root" id="problem-workspace">
      {/* ── Top Toolbar ──────────────────────────────────────────────────── */}
      <header className="pw-toolbar">
        <div className="pw-toolbar-left">
          <button
            className="pw-back-btn"
            onClick={handleBack}
            aria-label="Back to Practice Arena"
            id="btn-back-to-practice"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <span className="pw-toolbar-sep" aria-hidden="true" />

          <h1 className="pw-toolbar-title">
            {loading ? (
              <span className="pw-skel pw-skel--inline-title" />
            ) : (
              problem?.title ?? 'Problem'
            )}
          </h1>
        </div>

        <div className="pw-toolbar-right">
          <select
            className="pw-lang-select"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            aria-label="Select programming language"
            id="select-language"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* ── Content Area ─────────────────────────────────────────────────── */}
      {error ? (
        <WorkspaceError message={error} onRetry={handleRetry} />
      ) : loading ? (
        <WorkspaceSkeleton />
      ) : (
        <div className="pw-canvas">
          {/* Left Pane — Problem Description */}
          <section
            className="pw-pane-left"
            aria-label="Problem description"
          >
            <ProblemDescription
              problem={problem}
              submissions={submissions}
              loadingSubmissions={loadingSubmissions}
            />
          </section>

          {/* Right Pane — Interactive Editor */}
          <section
            className="pw-pane-right"
            aria-label="Code editor"
          >
            <InteractiveEditor
              code={code}
              setCode={setCode}
              selectedLanguage={selectedLanguage}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              terminalOutput={terminalOutput}
              isTerminalOpen={isTerminalOpen}
              setIsTerminalOpen={setIsTerminalOpen}
              onRun={runCode}
              onSubmit={submitCode}
            />
          </section>
        </div>
      )}
    </main>
  );
}
