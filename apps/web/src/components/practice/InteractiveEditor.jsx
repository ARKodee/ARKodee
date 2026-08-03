// src/components/practice/InteractiveEditor.jsx
// Interactive Development Module — right column canvas pane.
// Mounts Monaco code editor with custom IDE theme and action toolbar.
import React, { useState, useRef } from 'react';
import Editor from '@monaco-editor/react';

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
  readOnly = false,
  enableSuggestions = true
}) {
  const editorRef = useRef(null);
  const [activeCaseIdx, setActiveCaseIdx] = useState(0);

  const fileName = FILE_NAMES[selectedLanguage] ?? 'main.py';
  const monacoLang = MONACO_LANG_MAP[selectedLanguage] ?? 'python';

  /**
   * handleEditorMount — Fires once when Monaco finishes bootstrapping.
   * Registers the custom ARKodee dark theme globally.
   */
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme('arkodee-dark', ARKODEE_DARK_THEME);
    monaco.editor.setTheme('arkodee-dark');
  };

  const handleAddFailedToTestcases = (tcResult) => {
    if (!tcResult) return;
    addFailedCaseToVisible(tcResult);
    setActiveTerminalTab('testcases');
    setActiveCaseIdx(visibleTestCases.length);
  };

  return (
    <div className={`ie-root ${readOnly ? 'ring-1 ring-red-500/50' : ''}`} id="interactive-editor-panel">
      {/* ── File Tab Toolbar ──────────────────────────────────────────────── */}
      <div className="ie-tab-bar flex items-center justify-between">
        <div className="ie-file-tab ie-file-tab--active">
          <span className="ie-file-dot" aria-hidden="true" />
          <span className="ie-file-name">{fileName}</span>
        </div>
        {readOnly && (
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-400 bg-red-950/40 border border-red-500/30 px-2 py-0.5 rounded mr-3">
            LOCKED (SABOTAGE ACTIVE)
          </span>
        )}
      </div>

      {/* ── Monaco Editor Canvas ─────────────────────────────────────────── */}
      <div className="ie-editor-wrap relative">
        {readOnly && (
          <div className="absolute inset-0 bg-red-950/10 backdrop-blur-[1px] z-10 pointer-events-none flex items-center justify-center">
            <span className="bg-zinc-950/90 border border-red-500/40 text-red-400 font-mono text-xs px-3 py-1.5 rounded-md shadow-lg font-semibold uppercase tracking-wider animate-pulse">
              🔒 Editor Sabotaged & Locked
            </span>
          </div>
        )}
        <Editor
          height="100%"
          language={monacoLang}
          value={code}
          onChange={(value) => !readOnly && setCode(value ?? '')}
          onMount={handleEditorMount}
          theme="arkodee-dark"
          options={{
            readOnly: readOnly,
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

      {/* ── Collapsible Terminal Output & Testcases Panel ───────────────────────────────────── */}
      {isTerminalOpen && (
        <div className="ie-terminal flex flex-col max-h-72">
          <div className="ie-terminal-header flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-950">
            <div className="flex items-center space-x-3 text-xs font-mono">
              <button
                className={`px-3 py-1 rounded transition-colors ${activeTerminalTab === 'testcases' ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                onClick={() => setActiveTerminalTab('testcases')}
              >
                Testcases
              </button>
              {(submissionResult || isSubmitting) && (
                <button
                  className={`px-3 py-1 rounded transition-colors ${activeTerminalTab === 'submission' ? 'bg-indigo-600 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                  onClick={() => setActiveTerminalTab('submission')}
                >
                  Submission Result
                </button>
              )}
            </div>
            <button
              className="ie-terminal-close text-zinc-400 hover:text-zinc-200"
              onClick={() => setIsTerminalOpen(false)}
              aria-label="Close terminal"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="p-4 overflow-y-auto font-mono text-xs text-zinc-300 space-y-4">
            {activeTerminalTab === 'testcases' ? (
              <div className="space-y-4">
                {/* Visible Testcases Tabs */}
                <div className="flex items-center space-x-2 border-b border-zinc-800 pb-2 overflow-x-auto">
                  {visibleTestCases.map((tc, idx) => {
                    const res = testCaseResults[idx];
                    let tabColorStyle = 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 border border-transparent';
                    if (res) {
                      if (res.passed) {
                        tabColorStyle = activeCaseIdx === idx
                          ? 'bg-emerald-950/60 text-emerald-300 font-semibold border border-emerald-500/60'
                          : 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/30';
                      } else {
                        tabColorStyle = activeCaseIdx === idx
                          ? 'bg-rose-950/60 text-rose-300 font-semibold border border-rose-500/60'
                          : 'bg-rose-950/30 text-rose-400 border border-rose-500/30';
                      }
                    } else if (activeCaseIdx === idx) {
                      tabColorStyle = 'bg-zinc-800 text-indigo-400 font-semibold border border-indigo-500/40';
                    }

                    return (
                      <button
                        key={tc.id || idx}
                        onClick={() => setActiveCaseIdx(idx)}
                        className={`px-3 py-1 text-xs rounded transition-all flex items-center gap-1.5 shrink-0 ${tabColorStyle}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${res ? (res.passed ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-zinc-500'}`} />
                        <span>{tc.label || `Case ${idx + 1}`}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Case Details */}
                {visibleTestCases[activeCaseIdx] ? (
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-zinc-500 font-bold block mb-1">Input:</span>
                      <pre className="p-3 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-200 font-mono overflow-x-auto">
                        {visibleTestCases[activeCaseIdx].input}
                      </pre>
                    </div>
                    {visibleTestCases[activeCaseIdx].expected_output && (
                      <div>
                        <span className="text-xs text-zinc-500 font-bold block mb-1">Expected Output:</span>
                        <pre className="p-3 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-emerald-300 font-mono overflow-x-auto">
                          {visibleTestCases[activeCaseIdx].expected_output}
                        </pre>
                      </div>
                    )}
                    {testCaseResults[activeCaseIdx]?.output && (
                      <div>
                        <span className="text-xs text-zinc-500 font-bold block mb-1">Your Output:</span>
                        <pre className="p-3 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-200 font-mono overflow-x-auto">
                          {testCaseResults[activeCaseIdx].output}
                        </pre>
                      </div>
                    )}
                    {testCaseResults[activeCaseIdx]?.error && (
                      <div className="p-3 bg-rose-950/20 border border-rose-500/40 rounded-md text-xs text-rose-300 font-mono">
                        <span className="font-bold text-rose-400 block mb-1">Error:</span>
                        <pre className="whitespace-pre-wrap">{testCaseResults[activeCaseIdx].error}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 italic">No test cases available.</div>
                )}
              </div>
            ) : (
              <div>
                <pre className="whitespace-pre-wrap font-mono mb-4 text-zinc-200">{terminalOutput || 'Ready.'}</pre>
                
                {submissionResult && submissionResult.results && submissionResult.results.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-zinc-800">
                    {(() => {
                      const failedIdx = submissionResult.results.findIndex(tc => !tc.passed);
                      const failedTC = failedIdx !== -1 ? submissionResult.results[failedIdx] : null;

                      if (!failedTC) {
                        return (
                          <div className="p-3 bg-emerald-950/20 border border-emerald-500/40 rounded-md text-emerald-400 font-semibold">
                            🎉 All test cases passed! Solution Accepted.
                          </div>
                        );
                      }

                      const displayIndex = submissionResult.passed_count ? submissionResult.passed_count + 1 : failedIdx + 1;

                      return (
                        <div
                          className="p-3 rounded-lg border text-xs border-rose-500/30 bg-rose-950/10"
                        >
                          <div className="flex items-center justify-between font-bold mb-2">
                            <span className="text-rose-400">
                              Testcase {displayIndex}: Failed
                            </span>
                            {failedTC.input && (
                              <button
                                onClick={() => handleAddFailedToTestcases(failedTC)}
                                className="text-[11px] font-sans bg-rose-900/40 hover:bg-rose-800/60 border border-rose-500/40 text-rose-200 px-2.5 py-1 rounded transition-all flex items-center gap-1"
                                title="Add this failed testcase to your visible testcase list"
                              >
                                <span>＋ Add to Testcase List</span>
                              </button>
                            )}
                          </div>

                          <div className="space-y-1 text-zinc-300">
                            <div><span className="text-zinc-500">Input:</span> <code className="text-zinc-200 bg-zinc-900 px-1 py-0.5 rounded">{failedTC.input}</code></div>
                            {failedTC.expected && <div><span className="text-zinc-500">Expected:</span> <code className="text-emerald-300 bg-zinc-900 px-1 py-0.5 rounded">{failedTC.expected}</code></div>}
                            {failedTC.output && <div><span className="text-zinc-500">Output:</span> <code className="text-zinc-200 bg-zinc-900 px-1 py-0.5 rounded">{failedTC.output}</code></div>}
                            {failedTC.error && <div className="text-rose-400 mt-1"><span className="text-zinc-500">Error:</span> {failedTC.error}</div>}
                          </div>
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
