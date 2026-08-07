// src/components/practice/InteractiveEditor.jsx
// Interactive Development Module — right column canvas pane.
// Mounts Monaco code editor with custom IDE theme and action toolbar.
import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '../../store/ThemeContext';
import './InteractiveEditor.css';

// ─── Language → File Extension Map ─────────────────────────────────────────────
const FILE_NAMES = {
  python:     'main.py',
  cpp:        'main.cpp',
  java:       'Main.java',
  javascript: 'main.js',
};

// ─── Language → Monaco Language ID Map ─────────────────────────────────────────
const MONACO_LANG_MAP = {
  python:     'python',
  cpp:        'cpp',
  java:       'java',
  javascript: 'javascript',
};

// ─── Custom Theme Definition ───────────────────────────────────────────────────
const ARKODEE_DARK_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: '', foreground: 'e8e8f0', background: '111113' },
    { token: 'comment', foreground: '555568', fontStyle: 'italic' },
    { token: 'keyword', foreground: '818cf8' },
    { token: 'string', foreground: '34d399' },
    { token: 'number', foreground: 'fbbf24' },
    { token: 'type', foreground: '818cf8' },
    { token: 'function', foreground: 'e8e8f0' },
  ],
  colors: {
    'editor.background':                 '#111113',
    'editor.foreground':                 '#e8e8f0',
    'editor.lineHighlightBackground':    '#1a1a1f',
    'editor.selectionBackground':        '#2a2a3a',
    'editorLineNumber.foreground':       '#555568',
    'editorLineNumber.activeForeground': '#8888a0',
    'editorGutter.background':           '#111113',
    'editorWidget.background':           '#16161a',
    'editorWidget.border':               '#1f1f24',
    'editor.inactiveSelectionBackground':'#1f1f28',
    'editorCursor.foreground':           '#818cf8',
    'editorIndentGuide.background':      '#1f1f24',
    'editorIndentGuide.activeBackground':'#2a2a32',
  },
};

const ARKODEE_LIGHT_THEME = {
  base: 'vs',
  inherit: true,
  rules: [
    { token: '', foreground: '0f0f14', background: 'f9f9fb' },
    { token: 'comment', foreground: '9292a0', fontStyle: 'italic' },
    { token: 'keyword', foreground: '6d58f5' },
    { token: 'string', foreground: '059669' },
    { token: 'number', foreground: 'd97706' },
    { token: 'type', foreground: '6d58f5' },
    { token: 'function', foreground: '0f0f14' },
  ],
  colors: {
    'editor.background':                 '#f9f9fb',
    'editor.foreground':                 '#0f0f14',
    'editor.lineHighlightBackground':    '#f0f0f5',
    'editor.selectionBackground':        '#e4e4ec',
    'editorLineNumber.foreground':       '#9292a0',
    'editorLineNumber.activeForeground': '#52525e',
    'editorGutter.background':           '#f9f9fb',
    'editorWidget.background':           '#ffffff',
    'editorWidget.border':               '#e4e4ec',
    'editor.inactiveSelectionBackground':'#ededf5',
    'editorCursor.foreground':           '#6d58f5',
    'editorIndentGuide.background':      '#e4e4ec',
    'editorIndentGuide.activeBackground':'#c8c8d8',
  },
};

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * InteractiveEditor
 *
 * Props:
 *  - code {string}              Current code content state value.
 *  - setCode {Function}         State mutator function for code updates.
 *  - selectedLanguage {string}  Active language identifier string.
 */
export function InteractiveEditor({
  code,
  setCode,
  selectedLanguage,
  isRunning = false,
  isSubmitting = false,
  terminalOutput = '',
  isTerminalOpen = false,
  setIsTerminalOpen = () => {},
  activeTerminalTab = 'testcases',
  setActiveTerminalTab = () => {},
  testCaseResults = [],
  submissionResult = null,
  visibleTestCases = [],
  addFailedCaseToVisible = () => {},
  onRun = () => {},
  onSubmit = () => {},
  onReset = null,
  readOnly = false,
  enableSuggestions = true
}) {
  const { theme } = useTheme();
  const editorRef = useRef(null);
  const [activeCaseIdx, setActiveCaseIdx] = useState(0);
  const [terminalHeight, setTerminalHeight] = useState('38%');
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);

  const handleTerminalMouseDown = (e) => {
    e.preventDefault();
    setIsResizingTerminal(true);
    const startY = e.clientY;

    const terminalElement = e.currentTarget.parentElement;
    const startHeight = terminalElement ? terminalElement.offsetHeight : 250;
    const parentElement = terminalElement ? terminalElement.parentElement : null;
    const parentHeight = parentElement ? parentElement.offsetHeight : 600;

    const handleMouseMove = (moveEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.min(Math.max(startHeight + deltaY, 120), parentHeight * 0.75);
      setTerminalHeight(`${newHeight}px`);
    };

    const handleMouseUp = () => {
      setIsResizingTerminal(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const fileName = FILE_NAMES[selectedLanguage] ?? 'main.py';
  const monacoLang = MONACO_LANG_MAP[selectedLanguage] ?? 'python';

  /**
   * handleEditorMount — Fires once when Monaco finishes bootstrapping.
   * Registers custom light and dark themes.
   */
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme('arkodee-dark', ARKODEE_DARK_THEME);
    monaco.editor.defineTheme('arkodee-light', ARKODEE_LIGHT_THEME);
    monaco.editor.setTheme(theme === 'dark' ? 'arkodee-dark' : 'arkodee-light');
  };

  const handleAddFailedToTestcases = (tcResult) => {
    if (!tcResult) return;
    addFailedCaseToVisible(tcResult);
    setActiveTerminalTab('testcases');
    setActiveCaseIdx(visibleTestCases.length);
  };

  return (
    <div className="ie-root" id="interactive-editor-panel">
      {/* ── File Tab Toolbar ──────────────────────────────────────────────── */}
      <div className="ie-tab-bar">
        <div className="ie-file-tab ie-file-tab--active">
          <span className="ie-file-dot" aria-hidden="true" />
          <span className="ie-file-name">{fileName}</span>
        </div>
        {onReset && !readOnly && (
          <button
            onClick={onReset}
            className="ie-reset-btn"
            title="Reset code to original starter template"
            style={{
              marginLeft: 'var(--space-2)',
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '2px 8px',
              fontSize: '10px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🔄 Reset Code
          </button>
        )}
        {readOnly && (
          <span style={{
            fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: 'var(--danger)', background: 'var(--danger-subtle)',
            border: '1px solid var(--danger-border)',
            padding: '2px 8px', borderRadius: 'var(--radius-sm)', marginRight: 'var(--space-3)'
          }}>
            LOCKED (SABOTAGE ACTIVE)
          </span>
        )}
      </div>

      {/* ── Monaco Editor Canvas ─────────────────────────────────────────── */}
      <div className="ie-editor-wrap">
        {readOnly && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(248,113,113,0.06)', backdropFilter: 'blur(1px)',
            zIndex: 10, pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span className="ie-locked-badge">🔒 Editor Sabotaged &amp; Locked</span>
          </div>
        )}
        <Editor
          height="100%"
          language={monacoLang}
          value={code}
          onChange={(value) => !readOnly && setCode(value ?? '')}
          onMount={handleEditorMount}
          theme={theme === 'dark' ? 'arkodee-dark' : 'arkodee-light'}
          options={{
            readOnly: readOnly || isRunning || isSubmitting,
            contextmenu: false,
            minimap: { enabled: false },
            automaticLayout: true,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 14,
            lineHeight: 22,
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'line',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
            quickSuggestions: enableSuggestions ? { other: true, comments: false, strings: false } : false,
            parameterHints: { enabled: enableSuggestions },
            suggestOnTriggerCharacters: enableSuggestions,
            tabCompletion: enableSuggestions ? "on" : "off",
            wordBasedSuggestions: enableSuggestions ? "allDocuments" : "none",
          }}
        />
      </div>

      {/* ── Collapsible Terminal Panel ─────────────────────────────────────── */}
      {isTerminalOpen && (
        <div className="ie-terminal" style={{ height: terminalHeight, maxHeight: 'none', position: 'relative' }}>
          <div
            className={`ie-terminal-resize-handle ${isResizingTerminal ? 'ie-terminal-resize-handle--active' : ''}`}
            onMouseDown={handleTerminalMouseDown}
          />
          <div className="ie-terminal-header">
            <div className="ie-terminal-tabs">
              <button
                className={`ie-terminal-tab${activeTerminalTab === 'testcases' ? ' ie-terminal-tab--active' : ''}`}
                onClick={() => setActiveTerminalTab('testcases')}
              >
                Testcases
              </button>
              {(submissionResult || isSubmitting) && (
                <button
                  className={`ie-terminal-tab${activeTerminalTab === 'submission' ? ' ie-terminal-tab--active' : ''}`}
                  onClick={() => setActiveTerminalTab('submission')}
                >
                  Submission Result
                </button>
              )}
            </div>
            <button
              className="ie-terminal-close"
              onClick={() => setIsTerminalOpen(false)}
              aria-label="Close terminal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="ie-terminal-body">
            {isRunning || isSubmitting ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                minHeight: '140px',
                gap: 'var(--space-3)',
                color: 'var(--text-secondary)'
              }}>
                <div className="ie-spinner" />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                  {isRunning ? 'Running visible test cases...' : 'Submitting code to evaluation suite...'}
                </span>
              </div>
            ) : activeTerminalTab === 'testcases' ? (
              <div>
                {/* Global error fallback (Compilation Error / Execution Error) */}
                {terminalOutput && (terminalOutput.includes('Compilation Error') || terminalOutput.includes('Execution Error')) ? (
                  <div className="ie-testcase-content">
                    <div className="ie-result-banner ie-result-banner--error" style={{ marginBottom: 'var(--space-3)' }}>
                      <strong>{terminalOutput.split('\n\n')[0] || 'Error Occurred'}</strong>
                    </div>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--danger)', padding: 'var(--space-3)', backgroundColor: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger-border)' }}>
                      {terminalOutput.substring(terminalOutput.indexOf('\n\n') + 2) || terminalOutput}
                    </pre>
                  </div>
                ) : (
                  <>
                    {/* Testcase tabs */}
                    <div className="ie-testcase-tabs">
                      {visibleTestCases.map((tc, idx) => {
                        const res = testCaseResults[idx];
                        let tabClass = 'ie-testcase-tab';
                        if (res?.passed) tabClass += ' ie-testcase-tab--passed';
                        else if (res && !res.passed) tabClass += ' ie-testcase-tab--failed';
                        if (activeCaseIdx === idx) tabClass += ' ie-testcase-tab--active';

                        return (
                          <button
                            key={tc.id || idx}
                            onClick={() => setActiveCaseIdx(idx)}
                            className={tabClass}
                          >
                            <span className="ie-testcase-indicator" />
                            <span>{tc.label || `Case ${idx + 1}`}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Active case detail */}
                    {visibleTestCases[activeCaseIdx] ? (
                      <div className="ie-testcase-content">
                        <div>
                          <span className="ie-testcase-label">Input:</span>
                          <pre className="ie-testcase-pre">{visibleTestCases[activeCaseIdx].input}</pre>
                        </div>
                        {visibleTestCases[activeCaseIdx].expected_output && (
                          <div>
                            <span className="ie-testcase-label">Expected Output:</span>
                            <pre className="ie-testcase-pre ie-testcase-pre--expected">{visibleTestCases[activeCaseIdx].expected_output}</pre>
                          </div>
                        )}
                        {/* Always show "Your Output" if testCaseResults has been populated */}
                        {testCaseResults[activeCaseIdx] && (
                          <div>
                            <span className="ie-testcase-label">Your Output:</span>
                            <pre className="ie-testcase-pre ie-testcase-pre--output">
                              {testCaseResults[activeCaseIdx].output !== undefined && testCaseResults[activeCaseIdx].output !== null
                                ? (testCaseResults[activeCaseIdx].output === "" ? "(no output)" : testCaseResults[activeCaseIdx].output)
                                : "(no output)"}
                            </pre>
                          </div>
                        )}
                        {testCaseResults[activeCaseIdx]?.error && (
                          <div className="ie-testcase-error">
                            <span className="ie-testcase-error-title">Error:</span>
                            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{testCaseResults[activeCaseIdx].error}</pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="ie-empty">
                        <span className="ie-empty-text">No test cases available.</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginBottom: 'var(--space-4)' }}>{terminalOutput || 'Ready.'}</pre>

                {submissionResult?.results?.length > 0 && (
                  <div>
                    {(() => {
                      const failedIdx = submissionResult.results.findIndex(tc => !tc.passed);
                      const failedTC = failedIdx !== -1 ? submissionResult.results[failedIdx] : null;

                      if (!failedTC) {
                        return (
                          <div className="ie-result-banner ie-result-banner--success">
                            🎉 All test cases passed! Solution Accepted.
                          </div>
                        );
                      }

                      const displayIndex = submissionResult.passed_count != null
                        ? submissionResult.passed_count + 1
                        : failedIdx + 1;

                      return (
                        <div className="ie-result-banner ie-result-banner--error">
                          <div style={{ flex: 1 }}>
                            <strong>Testcase {displayIndex}: Failed</strong>
                            {failedTC.input && <div style={{ marginTop: 'var(--space-1)' }}>Input: <code>{failedTC.input}</code></div>}
                            {failedTC.expected && <div>Expected: <code>{failedTC.expected}</code></div>}
                            {failedTC.output && <div>Output: <code>{failedTC.output}</code></div>}
                            {failedTC.error && <div style={{ color: 'var(--danger)' }}>Error: {failedTC.error}</div>}
                          </div>
                          {failedTC.input && (
                            <button
                              onClick={() => handleAddFailedToTestcases(failedTC)}
                              className="ie-result-add-btn"
                              title="Add this failed testcase to visible list"
                            >
                              + Add to Testcases
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom Action Toolbar ─────────────────────────────────────────── */}
      <div className="ie-action-bar">
        <button
          className={`ie-btn ie-btn--ghost ${isTerminalOpen ? 'ie-btn--active' : ''}`}
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          title={isTerminalOpen ? "Close console panel" : "Open console panel"}
          id="btn-toggle-console"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: isTerminalOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', marginRight: '4px' }}>
            <polyline points="18 15 12 9 6 15" />
          </svg>
          Console
        </button>
        <div className="ie-action-spacer" />
        <div className="ie-action-buttons">
          <button
            className="ie-btn ie-btn--ghost"
            onClick={onRun}
            disabled={isRunning || isSubmitting || readOnly}
            id="btn-run-code"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {isRunning ? 'Running...' : 'Run Code'}
          </button>
          <button
            className="ie-btn ie-btn--primary"
            onClick={onSubmit}
            disabled={isRunning || isSubmitting || readOnly}
            id="btn-submit-code"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
