// src/pages/ProblemWorkspace.jsx
// Split-Canvas Conductor Page Layout — resizable IDE workspace.
// Uses design system tokens and provides collapsible/collapsible panels.
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useProblemDetails } from '../hooks/useProblemDetails';
import { ProblemDescription } from '../components/practice/ProblemDescription';
import { InteractiveEditor } from '../components/practice/InteractiveEditor';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Columns } from 'lucide-react';
import './ProblemWorkspace.css';

// ─── Language Options ──────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
];

// ─── Initial Panel Widths ──────────────────────────────────────────────────────
const INITIAL_LEFT_WIDTH = 38;
const MIN_LEFT_WIDTH = 30;
const MAX_LEFT_WIDTH = 60;

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

// ─── Resize Handle Component ───────────────────────────────────────────────────
function ResizeHandle({ onResize, containerRef, currentWidth }) {
  const [isActive, setIsActive] = useState(false);
  const dragState = useRef(null); // { startX, startPercent }

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsActive(true);

    // Capture start position and the CURRENT percentage (not pixel width)
    dragState.current = {
      startX: e.clientX,
      startPercent: currentWidth,
    };

    const handleMouseMove = (moveEvent) => {
      if (!dragState.current || !containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      if (containerWidth === 0) return;

      const deltaX = moveEvent.clientX - dragState.current.startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      const newPercent = Math.min(
        Math.max(dragState.current.startPercent + deltaPercent, MIN_LEFT_WIDTH),
        MAX_LEFT_WIDTH
      );
      onResize(newPercent);
    };

    const handleMouseUp = () => {
      setIsActive(false);
      dragState.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [containerRef, onResize, currentWidth]);

  return (
    <div
      className={`pw-resize-handle ${isActive ? 'pw-resize-handle--active' : ''}`}
      onMouseDown={handleMouseDown}
      role="separator"
      tabIndex={0}
      aria-orientation="vertical"
      aria-label="Drag to resize panels"
    />
  );
}


// ─── Collapse Toggle Component ─────────────────────────────────────────────────
function CollapseToggle({ isCollapsed, onToggle }) {
  return (
    <button
      className="pw-collapse-toggle"
      onClick={onToggle}
      title={isCollapsed ? 'Expand panel' : 'Collapse panel'}
      aria-label={isCollapsed ? 'Expand problem description' : 'Collapse problem description'}
    >
      {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
    </button>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────
export function ProblemWorkspace() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);
  const [leftWidth, setLeftWidth] = useState(INITIAL_LEFT_WIDTH);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);

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

  const handleResize = useCallback((width) => {
    setLeftWidth(width);
  }, []);

  const handleCollapseToggle = () => {
    setIsLeftCollapsed(!isLeftCollapsed);
  };

  // Calculate actual left panel width
  const actualLeftWidth = isLeftCollapsed ? 0 : leftWidth;

  return (
    <main className="pw-root" id="problem-workspace">
      {/* Navbar is rendered by the app shell */}

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <header className="pw-toolbar">
        <div className="pw-toolbar-left">
          <button
            className="pw-back-btn"
            onClick={handleBack}
            aria-label="Back to Practice Arena"
            id="btn-back-to-practice"
          >
            <ChevronLeft size={18} />
          </button>
          
          <span className="pw-toolbar-sep" aria-hidden="true" />
          
          {/* Centralized explicit show/hide description toggle */}
          <button
            onClick={handleCollapseToggle}
            className="pw-back-btn"
            title={isLeftCollapsed ? "Show description panel" : "Hide description panel"}
            style={{ color: !isLeftCollapsed ? 'var(--accent)' : 'var(--text-secondary)' }}
          >
            <Columns size={16} />
          </button>
          
          <span className="pw-toolbar-sep" aria-hidden="true" />
          
          <h1 className="pw-toolbar-title">
            {loading ? (
              <span className="pw-skel pw-skel--inline-title" />
            ) : (
              problem ? `#${problem.serial_no} ${problem.title}` : 'Problem'
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

      {/* ── Content Area ─────────────────────────────────────────────────────── */}
      {error ? (
        <WorkspaceError message={error} onRetry={handleRetry} />
      ) : loading ? (
        <WorkspaceSkeleton />
      ) : (
        <div className="pw-canvas" ref={containerRef}>
          {/* Left Pane — Problem Description (Resizable, hides completely when collapsed) */}
          <section
            className="pw-pane pw-pane--left"
            style={{ width: isLeftCollapsed ? '0%' : `${leftWidth}%`, display: isLeftCollapsed ? 'none' : 'flex' }}
            aria-label="Problem description"
          >
            <ProblemDescription
              problem={problem}
              submissions={submissions}
              loadingSubmissions={loadingSubmissions}
            />
            {!isLeftCollapsed && (
              <>
                <ResizeHandle
                  onResize={handleResize}
                  containerRef={containerRef}
                  currentWidth={leftWidth}
                />
                <CollapseToggle
                  isCollapsed={isLeftCollapsed}
                  onToggle={handleCollapseToggle}
                  position="right"
                />
              </>
            )}
          </section>

          {/* Right Pane — Interactive Editor */}
          <section
            className="pw-pane pw-pane--right"
            style={{ width: isLeftCollapsed ? '100%' : `${100 - leftWidth}%` }}
            aria-label="Code editor"
          >
            {isLeftCollapsed && (
              <button
                className="pw-collapsed-expand-btn"
                onClick={handleCollapseToggle}
                title="Expand problem description"
              >
                <ChevronRight size={14} />
              </button>
            )}
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
          </section>
        </div>
      )}
    </main>
  );
}

export default ProblemWorkspace;