// src/pages/DebugArenaPage.jsx
// DebugArenaPage — bug bounty workspace with line edit constraints
// Uses design system tokens, no Tailwind
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useTheme } from '../store/ThemeContext';
import { ArrowLeft, Terminal, AlertTriangle, Check, X, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { InteractiveEditor } from '../components/practice/InteractiveEditor';
import { getBugDetails, runBugCode, submitBugCode } from '../lib/bugs';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import './DebugArenaPage.css';

// ─── Language Options ──────────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'python', label: 'Python 3' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'cpp', label: 'C++' },
];

// ─── Console Component ─────────────────────────────────────────────────────────
function ConsolePanel({ output, isOpen, onToggle, onClose }) {
  if (!isOpen) {
    return (
      <div className="da-terminal da-terminal--closed">
        <div className="da-terminal-header">
          <button className="da-terminal-toggle" onClick={onToggle}>
            <ChevronUp size={14} />
            <span>Console</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="da-terminal da-terminal--open">
      <div className="da-terminal-header">
        <div className="da-terminal-title">
          <Terminal size={14} />
          <span>Console</span>
        </div>
        <div className="da-terminal-actions">
          <button className="da-terminal-close" onClick={onClose}>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      <div className="da-terminal-body">
        <pre className="da-terminal-output">{output || 'Ready to run...'}</pre>
      </div>
    </div>
  );
}

// ─── Success Modal Component ───────────────────────────────────────────────────
function SuccessModal({ xp, onClose }) {
  return (
    <div className="da-modal-overlay" onClick={onClose}>
      <div className="da-modal" onClick={(e) => e.stopPropagation()}>
        <div className="da-modal-icon">
          <Check size={24} />
        </div>
        <h3 className="da-modal-title">Bug Squashed!</h3>
        <div className="da-modal-xp">
          <Zap size={16} />
          <span>+{xp} XP</span>
        </div>
        <button className="da-modal-btn" onClick={onClose}>
          Continue
        </button>
      </div>
    </div>
  );
}

// ─── Failed Modal Component ────────────────────────────────────────────────────
function FailedModal({ reason, onInspect, onRetry, onClose }) {
  return (
    <div className="da-modal-overlay" onClick={onClose}>
      <div className="da-modal" onClick={(e) => e.stopPropagation()}>
        <div className="da-modal-icon" style={{ backgroundColor: 'var(--danger-subtle)', color: 'var(--danger)' }}>
          <X size={24} />
        </div>
        <h3 className="da-modal-title">Fix Failed</h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
          Your submission failed validation checks.
        </p>
        <div style={{
          padding: 'var(--space-3)',
          backgroundColor: 'var(--bg-base)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
          maxHeight: '120px',
          overflowY: 'auto',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          color: 'var(--danger)'
        }}>
          <pre>{reason}</pre>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button
            className="da-btn da-btn--ghost"
            style={{ flex: 1 }}
            onClick={onInspect}
          >
            Inspect Console
          </button>
          <button
            className="da-btn da-btn--primary"
            style={{ flex: 1 }}
            onClick={onRetry}
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────
export function DebugArenaPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { bugId } = useParams();

  // State
  const [language, setLanguage] = useState('python');
  const [bugData, setBugData] = useState(null);
  const [codes, setCodes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [failedReason, setFailedReason] = useState('');

  // Fetch bug data
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    getBugDetails(bugId)
      .then((data) => {
        if (isMounted) {
          setBugData(data);
          if (data?.starter_codes) {
            setCodes(data.starter_codes);
          }
          setTerminalOutput(
            `Console initialized. Ready to execute visible test cases.\nTarget restriction: Max ${data?.line_budget || 3} lines modified.`
          );
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load bug telemetry.');
          setIsLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [bugId]);

  const currentCode = codes[language] ?? bugData?.starter_codes?.[language] ?? '';

  // Calculate modified line count
  const getModifiedLineCount = useCallback(() => {
    const starterLines = (bugData?.starter_codes?.[language] || '').split('\n');
    const currentLines = (currentCode || '').split('\n');
    let diff = 0;
    const maxLen = Math.max(starterLines.length, currentLines.length);
    for (let i = 0; i < maxLen; i++) {
      if (starterLines[i] !== currentLines[i]) {
        diff++;
      }
    }
    return diff;
  }, [bugData, language, currentCode]);

  const modsCount = getModifiedLineCount();
  const maxBudget = bugData?.line_budget || 3;

  // Handle code change
  const handleCodeChange = (newVal) => {
    setCodes((prev) => ({
      ...prev,
      [language]: newVal,
    }));
  };

  // Handle language change
  const handleLanguageChange = (e) => {
    setLanguage(e.target.value);
  };

  // Handle run code
  const handleRunCode = async () => {
    setIsRunning(true);
    setIsTerminalOpen(true);
    setTerminalOutput('[EXEC] Compiling & running solution code...');

    try {
      const res = await runBugCode(bugId, currentCode, language);
      setIsRunning(false);
      const mods = getModifiedLineCount();
      const outputText = res.output || (res.results ? JSON.stringify(res.results, null, 2) : 'Execution complete.');
      setTerminalOutput(`${outputText}\n[LINE BUDGET] Lines modified: ${mods}/${maxBudget}.`);
    } catch (err) {
      setIsRunning(false);
      setTerminalOutput(`[EXEC ERROR] ${err.message || 'Failed to execute code.'}`);
    }
  };

  // Handle submit code
  const handleSubmitCode = async () => {
    setIsSubmitting(true);
    setIsTerminalOpen(true);
    setTerminalOutput('[SUBMIT] Running full validation suite...');

    const mods = getModifiedLineCount();
    if (mods > maxBudget) {
      setIsSubmitting(false);
      const limitError = `Line Edit Restriction Violated! You modified ${mods} lines of code, but the maximum allowed budget is ${maxBudget} lines.`;
      setFailedReason(limitError);
      setShowFailedModal(true);
      setTerminalOutput(`[SUBMIT FAILED] Line edit limit exceeded (${mods} modified > ${maxBudget} max allowed).`);
      return;
    }

    try {
      const res = await submitBugCode(bugId, currentCode, language);
      setIsSubmitting(false);
      if (res.passed) {
        setTerminalOutput(res.output || 'All test cases passed!');
        setShowSuccessModal(true);
      } else {
        setFailedReason(res.error || res.output || 'Validation failed on test cases.');
        setTerminalOutput(res.output || res.error || 'Submission failed.');
        setShowFailedModal(true);
      }
    } catch (err) {
      setIsSubmitting(false);
      setFailedReason(err.message || 'Submission failed.');
      setShowFailedModal(true);
    }
  };

  // Get line budget status class
  const getLineBudgetClass = () => {
    if (modsCount > maxBudget) return 'da-line-budget-value--danger';
    if (modsCount >= maxBudget - 1) return 'da-line-budget-value--warning';
    return 'da-line-budget-value--safe';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="da-root">
        <div className="da-loading">
          <div className="da-loading-spinner" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !bugData) {
    return (
      <div className="da-root">
        <div className="da-error">
          <AlertTriangle size={32} />
          <p className="da-error-message">{error || 'Bug Bounty telemetry record not found.'}</p>
          <button className="da-btn da-btn--primary" onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }  const { bug_id, title, category, description, examples = [], line_budget = 3 } = bugData;

  const headerLeft = (
    <>
      <button className="da-back-btn" onClick={() => navigate('/dashboard')} title="Return to Dashboard">
        <ArrowLeft size={18} />
      </button>
      <span className="da-toolbar-sep" />
      <span className="da-title">#{bug_id}</span>
      <h1 className="da-title">{title}</h1>
      {category && (
        <span className="da-category-badge">{category}</span>
      )}
    </>
  );

  const headerRight = (
    <>
      <div className="da-line-budget">
        <span className="da-line-budget-label">Edits:</span>
        <span className={`da-line-budget-value ${getLineBudgetClass()}`}>
          {modsCount}/{line_budget}
        </span>
      </div>

      <select
        className="da-lang-select"
        value={language}
        onChange={handleLanguageChange}
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.id} value={lang.id}>{lang.label}</option>
        ))}
      </select>
    </>
  );

  const leftPane = (
    <div className="da-description">
      {/* Constraint Banner */}
      <div className="da-constraint-banner">
        <AlertTriangle size={16} />
        <div>
          <h4>Debugging Constraint</h4>
          <p>Modify <strong>no more than {line_budget} lines</strong> to pass validation.</p>
        </div>
      </div>

      {/* Problem Overview */}
      <div className="da-problem-overview">
        <h3>Problem Overview</h3>
        <p>{description}</p>
      </div>

      {/* Examples */}
      {examples.length > 0 && (
        <div className="da-examples">
          <h3>Examples</h3>
          {examples.map((ex, idx) => (
            <div key={ex.id || idx} className="da-sample">
              <div className="da-sample-header">
                <span>Example {idx + 1}</span>
                <span className="da-sample-badge">Match Case</span>
              </div>
              <div className="da-sample-block">
                <span className="da-sample-label">Input</span>
                <pre className="da-sample-pre">{ex.input}</pre>
              </div>
              <div className="da-sample-block">
                <span className="da-sample-label">Output</span>
                <pre className="da-sample-pre da-sample-pre--success">{ex.output}</pre>
              </div>
              {ex.explanation && <p className="da-sample-explanation">{ex.explanation}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const rightPane = (
    <div className="da-editor">
      <div className="da-editor-container">
        <Editor
          height="100%"
          language={language === 'cpp' ? 'cpp' : language}
          value={currentCode}
          onChange={handleCodeChange}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            automaticLayout: true,
          }}
        />
      </div>

      {/* Console */}
      <ConsolePanel
        output={terminalOutput}
        isOpen={isTerminalOpen}
        onToggle={() => setIsTerminalOpen(!isTerminalOpen)}
        onClose={() => setIsTerminalOpen(false)}
      />

      {/* Action Bar */}
      <div className="da-action-bar">
        <button
          className="da-btn da-btn--ghost"
          onClick={handleRunCode}
          disabled={isRunning || isSubmitting}
        >
          <Terminal size={14} />
          <span>Run</span>
        </button>
        <button
          className="da-btn da-btn--primary"
          onClick={handleSubmitCode}
          disabled={isRunning || isSubmitting}
        >
          <Zap size={14} />
          <span>Submit</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <WorkspaceLayout
        headerLeft={headerLeft}
        headerRight={headerRight}
        leftPane={leftPane}
        rightPane={rightPane}
      />

      {/* Success Modal */}
      {showSuccessModal && (
        <SuccessModal
          xp={bugData?.xp_reward || 100}
          onClose={() => {
            setShowSuccessModal(false);
            navigate('/dashboard');
          }}
        />
      )}

      {/* Failed Modal */}
      {showFailedModal && (
        <FailedModal
          reason={failedReason}
          onInspect={() => {
            setShowFailedModal(false);
            setIsTerminalOpen(true);
          }}
          onRetry={() => setShowFailedModal(false)}
          onClose={() => setShowFailedModal(false)}
        />
      )}
    </>
  );
}

export default DebugArenaPage;