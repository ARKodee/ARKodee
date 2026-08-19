// src/pages/DebugArenaPage.jsx
// DebugArenaPage — bug bounty workspace with line edit constraints
// Uses design system tokens, no Tailwind
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useTheme } from '../store/ThemeContext';
import { ArrowLeft, Terminal, AlertTriangle, Check, X, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { InteractiveEditor } from '../components/practice/InteractiveEditor';
import { getDailyBug, getBugDetails, runBugCode, submitBugCode } from '../lib/bugs';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import './DebugArenaPage.css';

// ─── Language Options ──────────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'python', label: 'Python 3' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'java', label: 'Java' },
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
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('da_last_lang') || 'python';
  });
  const [bugData, setBugData] = useState(null);
  const [codes, setCodes] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // InteractiveEditor terminal states
  const [activeTerminalTab, setActiveTerminalTab] = useState('testcases');
  const [testCaseResults, setTestCaseResults] = useState([]);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Modal States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [failedReason, setFailedReason] = useState('');

  // Fetch bug data
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const fetchDetails = async () => {
      try {
        let activeBugId = bugId;
        if (!activeBugId) {
          const activeBug = await getDailyBug();
          activeBugId = activeBug?.bug_id;
          if (activeBugId && isMounted) {
            navigate(`/debug/${activeBugId}`, { replace: true });
            return;
          }
        }

        if (!activeBugId) {
          throw new Error('No active bug bounty today.');
        }

        const data = await getBugDetails(activeBugId);
        if (isMounted) {
          setBugData(data);
          
          // Load draft codes from localStorage, fallback to data starter_codes
          const localDraft = localStorage.getItem(`da_draft_${activeBugId}`);
          const draftCodes = localDraft ? JSON.parse(localDraft) : {};
          const mergedCodes = {
            ...(data?.starter_codes || {}),
            ...draftCodes
          };
          setCodes(mergedCodes);

          setTerminalOutput(
            `Console initialized. Ready to execute visible test cases.\nTarget restriction: Max ${data?.line_budget || 3} lines modified.`
          );
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load bug telemetry.');
          setIsLoading(false);
        }
      }
    };

    fetchDetails();
    return () => { isMounted = false; };
  }, [bugId, navigate]);

  const currentCode = codes[language] ?? bugData?.starter_codes?.[language] ?? '';

  // Calculate modified line count using Levenshtein distance on line arrays
  const getModifiedLineCount = useCallback(() => {
    const starterLines = (bugData?.starter_codes?.[language] || '')
      .replace(/\r/g, '')
      .split('\n')
      .map(line => line.trimEnd());
    const currentLines = (currentCode || '')
      .replace(/\r/g, '')
      .split('\n')
      .map(line => line.trimEnd());

    const a = starterLines;
    const b = currentLines;
    const dp = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // deletion
            dp[i][j - 1] + 1,    // insertion
            dp[i - 1][j - 1] + 1 // substitution
          );
        }
      }
    }
    return dp[a.length][b.length];
  }, [bugData, language, currentCode]);

  const modsCount = getModifiedLineCount();
  const maxBudget = bugData?.line_budget || 3;

  // Handle code change
  const handleCodeChange = (newVal) => {
    setCodes((prev) => {
      const updated = {
        ...prev,
        [language]: newVal,
      };
      if (bugId) {
        localStorage.setItem(`da_draft_${bugId}`, JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Handle language change
  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    localStorage.setItem('da_last_lang', newLang);
  };

  // Handle reset code
  const handleResetCode = () => {
    if (window.confirm("Are you sure you want to reset today's draft code back to the original template? All your modifications for this language will be discarded.")) {
      const originalCode = bugData?.starter_codes?.[language] || '';
      setCodes((prev) => {
        const updated = {
          ...prev,
          [language]: originalCode,
        };
        if (bugId) {
          localStorage.setItem(`da_draft_${bugId}`, JSON.stringify(updated));
        }
        return updated;
      });
    }
  };

  // Handle run code
  const handleRunCode = async () => {
    setIsRunning(true);
    setIsTerminalOpen(true);
    setActiveTerminalTab('testcases');
    setTerminalOutput('[EXEC] Compiling & running solution code...');

    try {
      const res = await runBugCode(bugId, currentCode, language);
      setIsRunning(false);
      const mods = getModifiedLineCount();

      if (res.compile_error) {
        setTerminalOutput(`❌ Compilation Error:\n\n${res.compile_error}`);
        setTestCaseResults([]);
        return;
      }

      // Map run results to testCaseResults for InteractiveEditor tabs
      const mappedResults = (res.results || []).map(r => ({
        passed: r.passed,
        output: r.user_output || '',
        error: r.runtime_error || null
      }));
      setTestCaseResults(mappedResults);

      const firstFailedCase = res.results?.find(r => !r.passed);
      if (firstFailedCase) {
        const errType = firstFailedCase.runtime_error ? "Runtime Error" : "Wrong Answer";
        setTerminalOutput(
          `❌ ${errType} on Sample Case:\n\n` +
          `Input:    ${firstFailedCase.input}\n` +
          `Expected: ${firstFailedCase.expected_output}\n` +
          `Received: ${firstFailedCase.user_output || '(no output)'}\n` +
          (firstFailedCase.runtime_error ? `\nError details:\n${firstFailedCase.runtime_error}` : '') +
          `\n\n[LINE BUDGET] Lines modified: ${mods}/${maxBudget}.`
        );
        return;
      }

      const passedCount = res.results?.length || 0;
      setTerminalOutput(
        `✅ Success: All ${passedCount} sample cases passed!\n` +
        (res.output ? `\nOutput:\n${res.output}\n` : '') +
        `\n[LINE BUDGET] Lines modified: ${mods}/${maxBudget}.`
      );
    } catch (err) {
      setIsRunning(false);
      setTerminalOutput(`❌ System Execution Error:\n${err.message || 'Failed to execute code.'}`);
      setTestCaseResults([]);
    }
  };

  // Handle submit code
  const handleSubmitCode = async () => {
    setIsSubmitting(true);
    setIsTerminalOpen(true);
    setActiveTerminalTab('submission');
    setSubmissionResult(null);
    setTerminalOutput('[SUBMIT] Running full validation suite...');

    const mods = getModifiedLineCount();
    if (mods > maxBudget) {
      setIsSubmitting(false);
      const limitError = `Line Edit Restriction Violated! You modified ${mods} lines of code, but the maximum allowed budget is ${maxBudget} lines.`;
      setFailedReason(limitError);
      setShowFailedModal(true);
      setTerminalOutput(`❌ [SUBMIT FAILED] Line edit limit exceeded (${mods} modified > ${maxBudget} max allowed).`);
      return;
    }

    try {
      const res = await submitBugCode(bugId, currentCode, language);
      setIsSubmitting(false);
      if (res.passed) {
        setTerminalOutput(
          `✅ Submission Successful!\n` +
          `All hidden validation test cases passed.\n` +
          `XP reward of ${bugData?.xp_reward || 100} XP claimed!`
        );
        setSubmissionResult({
          passed_count: bugData?.test_cases_json?.length || 1,
          results: []
        });
        setShowSuccessModal(true);
      } else {
        setFailedReason(res.error || 'Validation failed on test cases.');
        setTerminalOutput(
          `❌ Submission Failed:\n\n` +
          `${res.error || 'Validation failed on hidden test cases.'}\n\n` +
          `[LINE BUDGET] Lines modified: ${mods}/${maxBudget}.`
        );
        setSubmissionResult({
          passed_count: 0,
          results: [{ passed: false, error: res.error || 'Validation failed' }]
        });
        setShowFailedModal(true);
      }
    } catch (err) {
      setIsSubmitting(false);
      setFailedReason(err.message || 'Submission failed.');
      setTerminalOutput(`❌ System Submission Error:\n${err.message || 'Submission failed.'}`);
      setSubmissionResult({
        passed_count: 0,
        results: [{ passed: false, error: err.message || 'Submission failed.' }]
      });
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
  }

  const { bug_id, title, category, description, examples = [], line_budget = 3 } = bugData;

  const headerLeft = (
    <>
      <button className="da-back-btn" onClick={() => navigate('/dashboard')} title="Return to Dashboard">
        <ArrowLeft size={18} />
      </button>
      <span className="da-toolbar-sep" />
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
      {/* Solved Status Banner */}
      {bugData?.is_solved && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          backgroundColor: 'var(--success-subtle)',
          border: '1px solid var(--success-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-4)',
          color: 'var(--success)'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'rgba(52, 211, 153, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}>🏆</div>
          <div>
            <h4 style={{ fontWeight: 700, fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bounty Completed</h4>
            <p style={{ fontSize: 'var(--text-nano)', color: 'var(--text-secondary)', marginTop: '2px' }}>
              You have already solved today's bug bounty challenge. Good job!
            </p>
          </div>
        </div>
      )}

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

  const visibleTestCases = (bugData?.examples || []).map((ex, idx) => ({
    id: ex.id || idx,
    input: ex.input,
    expected_output: ex.output || ex.expected_output,
    label: `Example ${idx + 1}`
  }));

  const rightPane = (
    <InteractiveEditor
      code={currentCode}
      setCode={handleCodeChange}
      selectedLanguage={language}
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
      onRun={handleRunCode}
      onSubmit={handleSubmitCode}
      onReset={handleResetCode}
      readOnly={!!bugData?.is_solved}
    />
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