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
export function InteractiveEditor({ code, setCode, selectedLanguage }) {
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const editorRef = useRef(null);

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

  /**
   * handleRunCode — Placeholder for future code execution integration.
   */
  const handleRunCode = () => {
    setIsTerminalOpen(true);
    setTerminalOutput('⏳ Running code... (execution service not yet connected)');
  };

  /**
   * handleSubmitCode — Placeholder for future submission integration.
   */
  const handleSubmitCode = () => {
    setIsTerminalOpen(true);
    setTerminalOutput('⏳ Submitting solution... (submission service not yet connected)');
  };

  return (
    <div className="ie-root" id="interactive-editor-panel">
      {/* ── File Tab Toolbar ──────────────────────────────────────────────── */}
      <div className="ie-tab-bar">
        <div className="ie-file-tab ie-file-tab--active">
          <span className="ie-file-dot" aria-hidden="true" />
          <span className="ie-file-name">{fileName}</span>
        </div>
      </div>

      {/* ── Monaco Editor Canvas ─────────────────────────────────────────── */}
      <div className="ie-editor-wrap">
        <Editor
          height="100%"
          language={monacoLang}
          value={code}
          onChange={(value) => setCode(value ?? '')}
          onMount={handleEditorMount}
          theme="arkodee-dark"
          options={{
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
          }}
        />
      </div>

      {/* ── Collapsible Terminal Output ───────────────────────────────────── */}
      {isTerminalOpen && (
        <div className="ie-terminal">
          <div className="ie-terminal-header">
            <span className="ie-terminal-title">Output</span>
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
          <pre className="ie-terminal-body">{terminalOutput || 'Ready.'}</pre>
        </div>
      )}

      {/* ── Bottom Action Toolbar ─────────────────────────────────────────── */}
      <div className="ie-action-bar">
        <div className="ie-action-spacer" />
        <div className="ie-action-buttons">
          <button
            className="ie-btn ie-btn--ghost"
            onClick={handleRunCode}
            id="btn-run-code"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run Code
          </button>
          <button
            className="ie-btn ie-btn--primary"
            onClick={handleSubmitCode}
            id="btn-submit-code"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
