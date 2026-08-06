import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProblemDetails } from '../hooks/useProblemDetails';
import { ProblemDescription } from '../components/practice/ProblemDescription';
import { InteractiveEditor } from '../components/practice/InteractiveEditor';
import { ChevronLeft, ChevronRight, Columns } from 'lucide-react';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import './ProblemWorkspace.css';

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
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
export function ProblemWorkspace() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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
    activeTerminalTab,
    setActiveTerminalTab,
    testCaseResults,
    submissionResult,
    visibleTestCases,
    addFailedCaseToVisible,
    customTestInput,
    setCustomTestInput,
    addFailedCaseToCustom,
    runCode,
    submitCode,
    submissions,
    loadingSubmissions,
  } = useProblemDetails(slug);

  const handleBack = () => {
    if (location.state?.fromContest) {
      navigate(`/contests/${location.state.fromContest}`);
    } else {
      navigate('/practice');
    }
  };

  const handleLanguageChange = (e) => {
    setSelectedLanguage(e.target.value);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  if (error) {
    return <WorkspaceError message={error} onRetry={handleRetry} />;
  }

  if (loading) {
    return <WorkspaceSkeleton />;
  }

  const headerLeft = (
    <>
      <button
        className="pw-back-btn"
        onClick={handleBack}
        aria-label="Back to Practice Arena"
        id="btn-back-to-practice"
      >
        <ChevronLeft size={18} />
      </button>
      
      <span className="pw-toolbar-sep" aria-hidden="true" />
      
      <h1 className="pw-toolbar-title">
        {problem ? `#${problem.serial_no} ${problem.title}` : 'Problem'}
      </h1>
    </>
  );

  const headerRight = (
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
  );

  const leftPane = (
    <ProblemDescription
      problem={problem}
      submissions={submissions}
      loadingSubmissions={loadingSubmissions}
    />
  );

  const rightPane = (
    <InteractiveEditor
      code={code}
      setCode={setCode}
      selectedLanguage={selectedLanguage}
      isRunning={isRunning}
      isSubmitting={isSubmitting}
      terminalOutput={terminalOutput}
      isTerminalOpen={isTerminalOpen}
      setIsTerminalOpen={setIsTerminalOpen}
      activeTerminalTab={activeTerminalTab}
      setActiveTerminalTab={setActiveTerminalTab}
      testCaseResults={testCaseResults}
      submissionResult={submissionResult}
      visibleTestCases={visibleTestCases}
      addFailedCaseToVisible={addFailedCaseToVisible}
      customTestInput={customTestInput}
      setCustomTestInput={setCustomTestInput}
      addFailedCaseToCustom={addFailedCaseToCustom}
      onRun={runCode}
      onSubmit={submitCode}
    />
  );

  return (
    <WorkspaceLayout
      headerLeft={headerLeft}
      headerRight={headerRight}
      leftPane={leftPane}
      rightPane={rightPane}
      className="pw-root-override"
    />
  );
}

export default ProblemWorkspace;