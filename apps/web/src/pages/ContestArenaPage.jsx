// src/pages/ContestArenaPage.jsx
// Contest Arena Page — resizable split-pane contest IDE layout
// Uses design system tokens, no Tailwind
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  AlertCircle,
  Terminal,
  Send,
  Check,
  X,
  LayoutGrid,
  Shield,
  Trophy,
  CheckCircle2,
  CircleDot,
  Circle,
} from 'lucide-react';
import { getContestDetails, submitContestSolution } from '../lib/contests';
import { getProblemDetails } from '../lib/problems';
import { useContestTimer } from '../hooks/useContestTimer';
import './ContestArenaPage.css';

// ─── Language Configuration ────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'python', label: 'Python 3', monaco: 'python', template: '# Write your solution here\n\n' },
  { id: 'cpp', label: 'C++ 17', monaco: 'cpp', template: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n' },
  { id: 'java', label: 'Java', monaco: 'java', template: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n        Scanner sc = new Scanner(System.in);\n    }\n}\n' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript', template: '// Write your solution here\n\n' },
];

// ─── Difficulty Color Map ──────────────────────────────────────────────────────
const DIFFICULTY_COLORS = {
  easy: 'easy',
  medium: 'medium',
  hard: 'hard',
};

// ─── Toast Notification Component ──────────────────────────────────────────────
function Toast({ message, type = 'info', visible, onDismiss }) {
  if (!visible) return null;

  return (
    <div className={`ca-toast ca-toast--${type}`}>
      {type === 'success' && <Check size={14} />}
      {type === 'warning' && <AlertCircle size={14} />}
      {type === 'error' && <X size={14} />}
      {type === 'info' && <Clock size={14} />}
      <span>{message}</span>
    </div>
  );
}

// ─── Copy Button Component ─────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };

  return (
    <button
      className="ca-copy-btn"
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? <Check size={12} /> : null}
    </button>
  );
}

// ─── Countdown Clock Display ───────────────────────────────────────────────────
function CountdownClock({ timer }) {
  const { formatted, isExpired, isWarning, isCritical } = timer;

  let timerClass = 'ca-timer ca-timer--normal';
  if (isExpired) timerClass = 'ca-timer ca-timer--expired';
  else if (isCritical) timerClass = 'ca-timer ca-timer--critical';
  else if (isWarning) timerClass = 'ca-timer ca-timer--warning';

  return (
    <div className={timerClass}>
      <Clock size={14} />
      <span className="ca-timer-value">
        {isExpired ? '00:00' : formatted}
      </span>
    </div>
  );
}

// ─── Language Dropdown Component ───────────────────────────────────────────────
function LanguageSelect({ selectedId, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = LANGUAGES.find((l) => l.id === selectedId) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="ca-lang-dropdown">
      <button
        className="ca-lang-trigger"
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        <span>{selected.label}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="ca-lang-menu">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              className={`ca-lang-option ${lang.id === selectedId ? 'ca-lang-option--active' : ''}`}
              onClick={() => {
                onChange(lang.id);
                setOpen(false);
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Problem Status Icon Component ──────────────────────────────────────────────
function ProblemStatusIcon({ status }) {
  if (status === 'solved') return <CheckCircle2 size={14} className="ca-status-icon ca-status-icon--solved" />;
  if (status === 'attempted') return <CircleDot size={14} className="ca-status-icon ca-status-icon--attempted" />;
  return <Circle size={14} className="ca-status-icon ca-status-icon--untouched" />;
}

// ─── Main Page Component ───────────────────────────────────────────────────────
export function ContestArenaPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isVirtual = new URLSearchParams(window.location.search).get('virtual') === 'true';
  const editorRef = useRef(null);

  // Core Data State
  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Workspace State
  const [activeProblemIdx, setActiveProblemIdx] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('preferredLanguage') || 'python');
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [descriptionCollapsed, setDescriptionCollapsed] = useState(false);

  // Code State
  const [code, setCode] = useState('');

  // Execution State
  const [runResult, setRunResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Problem Status Tracking
  const [problemStatuses, setProblemStatuses] = useState({});

  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  // Derived values
  const activeProblem = activeProblemIdx !== null ? problems[activeProblemIdx] || null : null;
  const langConfig = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];

  // Show toast notification
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), duration);
  }, []);

  // Timer expiry handler
  const handleTimerExpire = useCallback(async () => {
    const code = editorRef.current?.getValue?.() || code;
    if (activeProblem && code.trim()) {
      try {
        await submitContestSolution(
          contest?.slug || slug,
          activeProblem.id || activeProblem.slug,
          { language, code }
        );
      } catch {
        // noop
      }
    }
    showToast('Match session ended! Standings will update shortly.', 'warning', 5000);
    setTimeout(() => navigate('/contests', { replace: true }), 3000);
  }, [activeProblem, contest, slug, language, code, navigate, showToast]);

  // Calculate contest end time
  const getTargetEndTime = () => {
    if (!contest) return null;
    if (isVirtual) {
      const durationMs = new Date(contest.end_time).getTime() - new Date(contest.start_time).getTime();
      const storageKey = `virtual_start_${contest.slug}`;
      let startTimeStr = localStorage.getItem(storageKey);
      if (!startTimeStr) {
        startTimeStr = String(Date.now());
        localStorage.setItem(storageKey, startTimeStr);
      }
      return new Date(parseInt(startTimeStr, 10) + durationMs).toISOString();
    }
    return contest.end_time;
  };

  const computedEndTime = getTargetEndTime();
  const timer = useContestTimer(computedEndTime, handleTimerExpire);

  // Load/save code from localStorage
  useEffect(() => {
    if (!contest || activeProblemIdx === null) return;
    const currentProb = problems[activeProblemIdx];
    if (!currentProb) return;

    const draftKey = `contest_draft_${contest.slug}_${currentProb.slug}_${language}`;
    const savedDraft = localStorage.getItem(draftKey);

    if (savedDraft !== null) {
      setCode(savedDraft);
    } else {
      setCode(currentProb.boilerplate?.[language] || langConfig.template);
    }
  }, [activeProblemIdx, language, contest, problems, langConfig.template]);

  // Handle language change
  const handleLanguageChange = useCallback((newLang) => {
    setLanguage(newLang);
    localStorage.setItem('preferredLanguage', newLang);
  }, []);

  // Handle code change
  const handleCodeChange = useCallback((value) => {
    setCode(value || '');
    if (!contest || activeProblemIdx === null) return;
    const currentProb = problems[activeProblemIdx];
    if (!currentProb) return;

    const draftKey = `contest_draft_${contest.slug}_${currentProb.slug}_${language}`;
    localStorage.setItem(draftKey, value || '');
  }, [contest, activeProblemIdx, problems, language]);

  // Handle editor mount
  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  // Virtual contest: prevent accidental exit
  useEffect(() => {
    if (!isVirtual || timer.isExpired) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Are you sure you want to exit the virtual contest? Timer continues ticking.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isVirtual, timer.isExpired]);

  // Reset virtual contest data
  const resetVirtualContestData = useCallback((contestSlug, contestProblems) => {
    if (!contestSlug) return;
    localStorage.removeItem(`virtual_start_${contestSlug}`);
    const languagesList = ['python', 'cpp', 'java', 'javascript'];
    if (contestProblems && Array.isArray(contestProblems)) {
      contestProblems.forEach((p) => {
        languagesList.forEach((lang) => {
          localStorage.removeItem(`contest_draft_${contestSlug}_${p.slug}_${lang}`);
        });
      });
    }
  }, []);

  // Fetch contest data
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getContestDetails(slug);
        if (cancelled) return;

        const runtimeStatus = data.status_label || 'ended';

        if (runtimeStatus === 'upcoming' || (runtimeStatus === 'live' && !data.is_registered)) {
          navigate(`/contests/${slug}`);
          return;
        }

        if (isVirtual && runtimeStatus !== 'past' && runtimeStatus !== 'ended') {
          navigate(`/contests/${slug}`);
          return;
        }

        setContest(data);
        const contestProblems = data.problems || [];
        setProblems(contestProblems);

        const statuses = {};
        contestProblems.forEach((p) => {
          statuses[p.id || p.slug] = p.user_status || 'untouched';
        });
        setProblemStatuses(statuses);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load contest.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; }
  }, [slug, isVirtual, navigate]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!activeProblem || timer.isExpired) return;
    setSubmitting(true);
    setConsoleOpen(true);

    showToast('Submitted — Queued for Evaluation.', 'info');
    const problemKey = activeProblem.id || activeProblem.slug;

    try {
      const code = editorRef.current?.getValue?.() || code;
      const result = await submitContestSolution(
        contest?.slug || slug,
        activeProblem.id || activeProblem.slug,
        { language, code }
      );

      setRunResult(result);

      if (['accepted', 'AC'].includes(result.verdict || result.status)) {
        setProblemStatuses((prev) => ({ ...prev, [problemKey]: 'solved' }));
        showToast('Accepted! Solution passed all test cases.', 'success');
      } else {
        setProblemStatuses((prev) => ({ ...prev, [problemKey]: 'attempted' }));
        showToast(`Verdict: ${result.verdict || result.status || 'Not accepted'}`, 'error');
      }
    } catch (err) {
      setRunResult({ error: true, stderr: err.message || 'Submission failed.' });
      setProblemStatuses((prev) => ({ ...prev, [problemKey]: 'attempted' }));
      showToast('Evaluation updated with error.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [activeProblem, timer.isExpired, code, contest, slug, language, showToast]);

  // Select problem
  const handleSelectProblem = useCallback(async (idx) => {
    setActiveProblemIdx(idx);
    setRunResult(null);

    const selected = problems[idx];
    if (selected && !selected.description) {
      try {
        const details = await getProblemDetails(selected.slug);
        setProblems((prev) => {
          const next = [...prev];
          next[idx] = { ...selected, ...details };
          return next;
        });
      } catch (err) {
        console.warn('Failed to load problem details:', err);
      }
    }
  }, [problems]);

  // Sample test cases
  const sampleInputs = activeProblem?.sample_input || activeProblem?.examples?.map((e) => e.input) || [];
  const sampleOutputs = activeProblem?.sample_output || activeProblem?.examples?.map((e) => e.output) || [];

  // Loading state
  if (loading) {
    return (
      <div className="ca-root">
        <div className="ca-loading">
          <Loader2 size={24} className="ca-loading-spinner" />
          <span className="ca-loading-text">Entering arena...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="ca-root">
        <div className="ca-error">
          <AlertCircle size={32} className="ca-error-icon" />
          <p className="ca-error-message">{error}</p>
          <button className="ca-error-link" onClick={() => navigate('/contests')}>
            Back to Contests
          </button>
        </div>
      </div>
    );
  }

  if (!contest) return null;

  return (
    <div className="ca-root">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onDismiss={() => setToast((t) => ({ ...t, visible: false }))} />

      {/* Header */}
      <header className="ca-header">
        <div className="ca-header-left">
          <button
            className="ca-back-btn"
            onClick={() => {
              if (isVirtual && !timer.isExpired) {
                setShowExitConfirm(true);
              } else {
                navigate('/contests');
              }
            }}
          >
            <ArrowLeft size={14} />
            <span>Exit</span>
          </button>
          <span className="ca-header-sep" />
          <h1 className="ca-title">{contest?.title}</h1>

          {/* Problem Switcher */}
          {activeProblemIdx !== null && (
            <div className="ca-problem-switcher">
              <button
                className={`ca-problem-btn ca-problem-btn--overview ${activeProblemIdx === null ? 'ca-problem-btn--active' : ''}`}
                onClick={() => setActiveProblemIdx(null)}
              >
                Overview
              </button>
              {problems.map((p, idx) => (
                <button
                  key={p.id || idx}
                  className={`ca-problem-btn ${idx === activeProblemIdx ? 'ca-problem-btn--active' : ''}`}
                  onClick={() => handleSelectProblem(idx)}
                >
                  {String.fromCharCode(65 + idx)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ca-header-right">
          {activeProblemIdx !== null && (
            <LanguageSelect selectedId={language} onChange={handleLanguageChange} disabled={timer.isExpired} />
          )}
          <CountdownClock timer={timer} />
        </div>
      </header>

      {/* Workspace */}
      <div className="ca-body">
        <div className="ca-workspace">
          {/* Sidebar - Problem List */}
          <aside className={`ca-sidebar ${sidebarCollapsed ? 'ca-sidebar--collapsed' : ''}`}>
            <div className="ca-sidebar-header">
              <span className="ca-sidebar-title">Problem List</span>
              <button className="ca-sidebar-toggle" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
                <LayoutGrid size={16} />
              </button>
            </div>
            <div className="ca-sidebar-content">
              <div className="ca-problem-list">
                {problems.map((prob, idx) => {
                  const key = prob.id || prob.slug;
                  const status = problemStatuses[key] || 'untouched';
                  const isActive = idx === activeProblemIdx;

                  return (
                    <button
                      key={key || idx}
                      className={`ca-problem-item ${isActive ? 'ca-problem-item--active' : ''}`}
                      onClick={() => handleSelectProblem(idx)}
                    >
                      <ProblemStatusIcon status={status} />
                      <span className="ca-problem-item-name">
                        {String.fromCharCode(65 + idx)}. {prob.title}
                      </span>
                      <span className="ca-problem-item-points">{prob.points} pt</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="ca-main">
            {activeProblemIdx === null ? (
              // Overview Screen
              <div className="ca-main--overview">
                <div className="ca-overview">
                  <div className="ca-overview-header">
                    <span className={`ca-overview-badge ${isVirtual ? 'ca-overview-badge--virtual' : 'ca-overview-badge--live'}`}>
                      {isVirtual ? 'Virtual Simulation Mode' : 'Live Contest Hub'}
                    </span>
                    <h2 className="ca-overview-title">{contest?.title}</h2>
                    <p className="ca-overview-meta">
                      {new Date(contest?.start_time).toLocaleString()} — {new Date(contest?.end_time).toLocaleString()}
                    </p>
                  </div>

                  {contest?.description && (
                    <div className="ca-overview-desc">
                      <p>{contest.description}</p>
                    </div>
                  )}

                  <div className="ca-overview-cards">
                    <div className="ca-overview-card">
                      <div className="ca-overview-card-title">
                        <Shield size={16} className="ca-icon--info" />
                        <span>Instructions</span>
                      </div>
                      <ul className="ca-overview-card-list">
                        <li>Select problems from the sidebar to begin coding</li>
                        <li>Submissions are queued instantly on clicking Submit</li>
                        <li>Live standings are locked during contest</li>
                      </ul>
                    </div>
                    <div className="ca-overview-card">
                      <div className="ca-overview-card-title">
                        <Trophy size={16} className="ca-icon--warning" />
                        <span>Scoring</span>
                      </div>
                      <ul className="ca-overview-card-list">
                        <li>Points vary per problem difficulty</li>
                        <li>Penalty applies for wrong submissions</li>
                        <li>Rating updates after contest ends</li>
                      </ul>
                    </div>
                  </div>

                  <div className="ca-overview-cta">
                    <button className="ca-btn-primary" onClick={() => handleSelectProblem(0)}>
                      <span>Start Coding</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Split Layout - Problem + Editor
              <div className="ca-split">
                {/* Left - Problem Description */}
                <section className={`ca-description ${descriptionCollapsed ? 'ca-description--collapsed' : ''}`}>
                  <div className="ca-description-scroll">
                    <div className="ca-problem-header">
                      <div className="ca-problem-title-row">
                        <span className="ca-problem-index">{String.fromCharCode(65 + activeProblemIdx)}.</span>
                        <h2 className="ca-problem-title">{activeProblem?.title}</h2>
                      </div>
                      <div className="ca-problem-meta">
                        {activeProblem?.difficulty && (
                          <span className={`ca-difficulty-badge ca-difficulty-badge--${activeProblem.difficulty?.toLowerCase()}`}>
                            {activeProblem.difficulty}
                          </span>
                        )}
                        {activeProblem?.points != null && (
                          <span className="ca-problem-points">{activeProblem.points} Points</span>
                        )}
                      </div>
                    </div>

                    <div className="ca-problem-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {activeProblem?.description || 'Loading specifications...'}
                      </ReactMarkdown>
                    </div>

                    {activeProblem?.constraints && (
                      <div className="ca-constraints">
                        <h3 className="ca-constraints-title">Constraints</h3>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {activeProblem.constraints}
                        </ReactMarkdown>
                      </div>
                    )}

                    {/* Sample Cases */}
                    {sampleInputs.map((input, i) => (
                      <div key={i} className="ca-sample">
                        <h3 className="ca-sample-title">Sample {i + 1}</h3>
                        <div className="ca-sample-block">
                          <span className="ca-sample-label">Input</span>
                          <CopyButton text={String(input)} />
                          <pre className="ca-sample-pre">{String(input)}</pre>
                        </div>
                        {sampleOutputs[i] && (
                          <div className="ca-sample-block">
                            <span className="ca-sample-label">Output</span>
                            <CopyButton text={String(sampleOutputs[i])} />
                            <pre className="ca-sample-pre">{String(sampleOutputs[i])}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                {/* Right - Editor + Console */}
                <div className="ca-editor">
                  <div className="ca-editor-container">
                    <Editor
                      height="100%"
                      language={langConfig.monaco}
                      value={code}
                      onChange={handleCodeChange}
                      onMount={handleEditorMount}
                      theme="vs-dark"
                      options={{
                        readOnly: timer.isExpired,
                        fontSize: 13,
                        fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        padding: { top: 12, bottom: 12 },
                        lineNumbers: 'on',
                        renderLineHighlight: 'line',
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on',
                        tabSize: 4,
                        wordWrap: 'off',
                        automaticLayout: true,
                      }}
                    />
                  </div>

                  {/* Console */}
                  <div className={`ca-console ca-console--${consoleOpen ? 'open' : 'closed'}`}>
                    <div className="ca-console-header">
                      <div className="ca-console-tabs">
                        <span className="ca-console-tab ca-console-tab--active">
                          <Terminal size={12} />
                          <span>Submission Status</span>
                        </span>
                      </div>
                      <div className="ca-console-actions">
                        <button
                          className="ca-btn ca-btn--primary"
                          onClick={handleSubmit}
                          disabled={timer.isExpired || submitting || !activeProblem}
                        >
                          {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          <span>Submit</span>
                        </button>
                        <button className="ca-console-close" onClick={() => setConsoleOpen(!consoleOpen)}>
                          {consoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </button>
                      </div>
                    </div>

                    {consoleOpen && (
                      <div className="ca-console-body">
                        {submitting && (
                          <div className="ca-console-loading">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Submitting solution...</span>
                          </div>
                        )}

                        {runResult && !submitting && (
                          <div className="ca-console-results">
                            {(runResult.verdict || runResult.status) && (
                              <div className={`ca-console-result ca-console-result--${['accepted', 'AC'].includes(runResult.verdict || runResult.status) ? 'success' : 'error'}`}>
                                Verdict: {runResult.verdict || runResult.status}
                              </div>
                            )}
                            {runResult.stdout && (
                              <pre className="ca-console-output">{runResult.stdout}</pre>
                            )}
                            {runResult.stderr && (
                              <pre className="ca-console-output ca-console-output--error">{runResult.stderr}</pre>
                            )}
                          </div>
                        )}

                        {!runResult && !submitting && (
                          <div className="ca-console-empty">
                            <Terminal size={20} />
                            <p>Submit code to see evaluation results</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="ca-modal-overlay" onClick={() => setShowExitConfirm(false)}>
          <div className="ca-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ca-modal-header">
              <AlertTriangle size={20} />
              <h3>Exit Virtual Simulation?</h3>
            </div>
            <p className="ca-modal-body">
              Exiting will terminate your simulation session, reset the timer, and delete your drafted solutions.
            </p>
            <div className="ca-modal-actions">
              <button className="ca-btn ca-btn--ghost" onClick={() => setShowExitConfirm(false)}>
                Stay and Code
              </button>
              <button
                className="ca-btn ca-btn--danger"
                onClick={() => {
                  resetVirtualContestData(contest?.slug, problems);
                  setShowExitConfirm(false);
                  navigate('/contests');
                }}
              >
                Confirm Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContestArenaPage;