// src/pages/Arena1v1Page.jsx
// Arena1v1Page — live 1v1 competitive arena with split-pane workspace
// Uses design system tokens, no Tailwind
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { useMatchSocket, DEFAULT_ARENA_PROBLEMS } from '../hooks/useMatchSocket';
import { ProblemDescription } from '../components/practice/ProblemDescription';
import { InteractiveEditor } from '../components/practice/InteractiveEditor';
import { MatchInitOverlay } from '../components/arena/MatchInitOverlay';
import { runProblemCode, submitProblemCode } from '../lib/problems';
import {
  ArrowLeft,
  Swords,
  Clock,
  Zap,
  Lock,
  Shield,
  CheckCircle2,
  CircleDot,
  Circle,
  ChevronDown,
  ChevronUp,
  Play,
  Send,
  HelpCircle,
  EyeOff,
  Keyboard,
  Info,
  Layers,
  Code,
  AlertTriangle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import './Arena1v1Page.css';

// ─── Language Options ──────────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'python', label: 'Python 3', monaco: 'python' },
  { id: 'cpp', label: 'C++ 17', monaco: 'cpp' },
  { id: 'java', label: 'Java', monaco: 'java' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
];

// ─── Difficulty Badge Component ────────────────────────────────────────────────
function DifficultyBadge({ difficulty }) {
  const className = `a1-difficulty-badge a1-difficulty-badge--${difficulty?.toLowerCase()}`;
  return <span className={className}>{difficulty}</span>;
}

// ─── Problem Status Icon Component ──────────────────────────────────────────────
function ProblemStatusIcon({ status }) {
  if (status === 'solved') return <CheckCircle2 size={14} className="a1-problem-tab-icon a1-problem-tab-icon--solved" />;
  if (status === 'attempted') return <CircleDot size={14} className="a1-problem-tab-icon a1-problem-tab-icon--attempted" />;
  return <Circle size={14} className="a1-problem-tab-icon a1-problem-tab-icon--untouched" />;
}

// ─── Main Page Component ───────────────────────────────────────────────────────
export function Arena1v1Page() {
  const { theme } = useTheme();
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Match phase state: 'IDLE' | 'INITIATING' | 'COUNTDOWN' | 'ACTIVE'
  const [matchPhase, setMatchPhase] = useState('IDLE');

  // Problem navigation
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);
  const [userCodeMap, setUserCodeMap] = useState({});
  const [selectedLanguageMap, setSelectedLanguageMap] = useState({});
  const [terminalOutputMap, setTerminalOutputMap] = useState({});
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Layout states: left panel collapsibility and width sizing
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(360);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);

  // Left panel view tabs: 'description' | 'submissions'
  const [activeLeftTab, setActiveLeftTab] = useState('description');
  const [submissionsList, setSubmissionsList] = useState([]); // List of { id, problemId, verdict, timestamp, code, language }

  // Expanded code view index inside submissions list
  const [expandedSubId, setExpandedSubId] = useState(null);

  // Active Powerups purchased locally
  const [autocompleteActiveUntil, setAutocompleteActiveUntil] = useState(0);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // WebSocket hook
  const {
    problems,
    isMatchReady,
    isMatchStarted,
    isArenaDissolved,
    hostId,
    opponentProfile,
    opponentProgress,
    isEditorLocked,
    connectionState,
    requestStartMatch,
    leaveArenaLobby,
    initiateMatch,
    sendSubmission,
    sendSabotage,
    sendShield,
    startedAt,
    myScore,
    myAp,
    opponentScore,
    opponentAp,
    activeSabotage,
    sabotageTimeLeft,
    myShieldActiveUntil,
    matchFinishedData,
    toastMessage,
    setToastMessage,
  } = useMatchSocket(matchId);

  const activeUserId = user?.id || user?.userId || 'user-1';
  const activeUsername = user?.firstName || user?.username || user?.name || user?.email?.split('@')[0] || 'Player';

  // Check if current user is host
  const isHost = hostId
    ? String(activeUserId) === String(hostId)
    : true;

  // Get active problems list
  const activeProblemsList = (problems && problems.length > 0) ? problems : DEFAULT_ARENA_PROBLEMS;
  const activeProblem = activeProblemsList[activeProblemIndex] || activeProblemsList[0];

  // Get current problem ID
  const currentProblemId = activeProblem?.id || `p${activeProblemIndex + 1}`;

  // Get current code and language
  const currentCode = userCodeMap[currentProblemId] ?? `# Write your solution for ${activeProblem?.title || 'Problem'} here\n\n`;
  const currentLanguage = selectedLanguageMap[currentProblemId] ?? 'python';
  const currentTerminalOutput = terminalOutputMap[currentProblemId] ?? '';

  const problemSubmissions = submissionsList.filter((s) => s.problemId === currentProblemId);
  const isSuggestionsEnabled = autocompleteActiveUntil > Date.now();

  // Local timer update from startedAt timestamp (Resolves page refresh bug)
  useEffect(() => {
    if (!startedAt || matchPhase === 'IDLE') return;

    const calcElapsed = () => {
      const diffSecs = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
      setElapsedSeconds(diffSecs);
    };

    calcElapsed();
    const interval = setInterval(calcElapsed, 1000);
    return () => clearInterval(interval);
  }, [startedAt, matchPhase]);

  // Handle phase transitions and animations on page load/refresh
  useEffect(() => {
    if (isMatchStarted) {
      if (startedAt) {
        const diffSecs = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
        // If match has been active for more than 5 seconds, skip transition animations
        if (diffSecs > 5) {
          setMatchPhase('ACTIVE');
        } else if (matchPhase === 'IDLE') {
          setMatchPhase('INITIATING');
        }
      } else if (matchPhase === 'IDLE') {
        setMatchPhase('INITIATING');
      }
    }
  }, [isMatchStarted, startedAt, matchPhase]);

  // Redirect when arena is dissolved
  useEffect(() => {
    if (isArenaDissolved) {
      navigate('/matchmaking');
    }
  }, [isArenaDissolved, navigate]);

  // Toast message cleanup autotimer
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(''), 5000);
      return () => clearTimeout(t);
    }
  }, [toastMessage, setToastMessage]);

  // Drag resizer handlers
  const startResizeLeft = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const doDrag = (moveEvent) => {
      const newWidth = Math.max(250, Math.min(500, startWidth + (moveEvent.clientX - startX)));
      setLeftPanelWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const startResizeRight = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const doDrag = (moveEvent) => {
      const newWidth = Math.max(240, Math.min(400, startWidth - (moveEvent.clientX - startX)));
      setRightPanelWidth(newWidth);
    };

    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  // Start match
  const handleStartMatch = () => {
    if (!isHost) return;
    requestStartMatch();
    setMatchPhase('INITIATING');
    initiateMatch();
  };

  // Leave arena
  const handleLeaveArena = () => {
    leaveArenaLobby();
    navigate('/matchmaking');
  };

  // Countdown complete -> ACTIVE
  const handleOverlayHandoff = useCallback(() => {
    setMatchPhase('ACTIVE');
  }, []);

  // Update code for current problem
  const handleCodeChange = (newCode) => {
    setUserCodeMap((prev) => ({
      ...prev,
      [currentProblemId]: newCode,
    }));
  };

  // Update language for current problem
  const handleLanguageChange = (lang) => {
    setSelectedLanguageMap((prev) => ({
      ...prev,
      [currentProblemId]: lang,
    }));
  };

  // Run Code logic via Django backend sandbox
  const handleRunCode = async () => {
    setIsRunning(true);
    setTerminalOutputMap((prev) => ({
      ...prev,
      [currentProblemId]: `> Compiling and running code against sample test cases...`,
    }));
    setIsTerminalOpen(true);
    try {
      const res = await runProblemCode(activeProblem.slug, currentCode, currentLanguage);
      if (res.verdict === 'CE' || res.compile_error) {
        setTerminalOutputMap((prev) => ({
          ...prev,
          [currentProblemId]: `RESULT: COMPILATION ERROR\n\n${res.compile_error || 'An error occurred during compilation.'}`,
        }));
      } else if (res.verdict === 'AC') {
        setTerminalOutputMap((prev) => ({
          ...prev,
          [currentProblemId]: `RESULT: ACCEPTED\n\nPassed all sample test cases.`,
        }));
        // Emit RUN_SUCCESS to get +20 AP milestone
        sendSubmission(currentProblemId, 'RUN_SUCCESS', currentCode);
      } else {
        setTerminalOutputMap((prev) => ({
          ...prev,
          [currentProblemId]: `RESULT: ${res.verdict || 'FAILED'}\n(Failed sample test case)`,
        }));
      }
    } catch (err) {
      setTerminalOutputMap((prev) => ({
        ...prev,
        [currentProblemId]: `ERROR: Execution failed.\n${err.message || 'Unknown network error.'}`,
      }));
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Code logic via Django backend sandbox
  const handleSubmitCode = async () => {
    setIsSubmitting(true);
    setTerminalOutputMap((prev) => ({
      ...prev,
      [currentProblemId]: `> Submitting solution for complete evaluation...`,
    }));
    setIsTerminalOpen(true);

    const isBlindfolded = activeSabotage === 'blindfold';

    try {
      const res = await submitProblemCode(activeProblem.slug, currentCode, currentLanguage);
      const isCorrect = res.verdict === 'AC';
      const finalVerdict = isCorrect ? 'ACCEPTED' : 'WRONG_ANSWER';

      // Format visual output for console
      if (isCorrect) {
        setTerminalOutputMap((prev) => ({
          ...prev,
          [currentProblemId]: `RESULT: ACCEPTED\nPassed all ${res.total_count} test cases successfully!`,
        }));
        sendSubmission(currentProblemId, 'ACCEPTED', currentCode);
      } else {
        const terminalText = isBlindfolded
          ? `RESULT: WRONG ANSWER\n(Failed testcase details hidden by BLINDFOLD sabotage)`
          : `RESULT: ${res.verdict || 'WRONG_ANSWER'}\nFailed on Testcase ${res.passed_count + 1} of ${res.total_count}`;

        setTerminalOutputMap((prev) => ({
          ...prev,
          [currentProblemId]: terminalText,
        }));
        sendSubmission(currentProblemId, 'WRONG_ANSWER', currentCode);
      }

      // Add to our left-panel submissions list
      const newSubmission = {
        id: `sub-${Date.now()}`,
        problemId: currentProblemId,
        problemTitle: activeProblem?.title || 'Problem',
        verdict: finalVerdict,
        timestamp: new Date().toLocaleTimeString(),
        code: currentCode,
        language: currentLanguage,
      };
      setSubmissionsList((prev) => [newSubmission, ...prev]);

    } catch (err) {
      setTerminalOutputMap((prev) => ({
        ...prev,
        [currentProblemId]: `ERROR: Submission failed.\n${err.message || 'Unknown network error.'}`,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tactical Conductors Purchase
  const handleBuyAutocomplete = () => {
    if (myAp < 30) return;
    setAutocompleteActiveUntil(Date.now() + 60000); // 60 seconds
    setToastMessage('✨ Autocomplete powerup activated for 60 seconds!');
    sendShield('cleanse');
  };

  const handleBuyHint = () => {
    if (myAp < 35) return;
    setToastMessage(`💡 Hint for ${activeProblem?.title}: Focus on the constraints and corner values!`);
    sendShield('cleanse');
  };

  const handleCastJam = () => {
    if (myAp < 50) return;
    sendSabotage('jam');
  };

  const handleCastBlur = () => {
    if (myAp < 40) return;
    sendSabotage('blur');
  };

  const handleCastBlindfold = () => {
    if (myAp < 60) return;
    sendSabotage('blindfold');
  };

  const handleCastImmunity = () => {
    if (myAp < 40) return;
    sendShield('immunity');
  };

  const handleCastCleanse = () => {
    if (myAp < 20) return;
    sendShield('cleanse');
  };

  // Format timer
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Get timer class
  const getTimerClass = () => {
    const mins = Math.floor(elapsedSeconds / 60);
    if (mins >= 25) return 'a1-timer a1-timer--critical';
    if (mins >= 20) return 'a1-timer a1-timer--warning';
    return 'a1-timer a1-timer--normal';
  };

  // Render IDLE state
  if (matchPhase === 'IDLE') {
    return (
      <div className="a1-root">
        {/* Initiation Overlay */}
        {(matchPhase === 'INITIATING' || matchPhase === 'COUNTDOWN') && (
          <MatchInitOverlay
            userA={{ username: activeUsername, rating: user?.duelRating || 1200 }}
            userB={{ username: opponentProfile?.username || 'Challenger', rating: opponentProfile?.rating || 1200 }}
            onHandoff={handleOverlayHandoff}
          />
        )}

        <div className="a1-lobby">
          {/* Header */}
          <header className="a1-lobby-header">
            <button className="a1-lobby-back" onClick={handleLeaveArena}>
              <ArrowLeft size={16} />
              <span>Leave Arena</span>
            </button>
            <span className="a1-lobby-status">LOBBY STATUS: {connectionState}</span>
          </header>

          {/* Main Card */}
          <div className="a1-lobby-card">
            <div className="a1-lobby-icon">
              <Swords size={40} />
            </div>

            <h1 className="a1-lobby-title">1v1 Ranked Arena</h1>
            <p className="a1-lobby-desc">
              Match #{matchId?.substring(0, 8) || 'ARENA-01'} is ready. Both players receive 4 problems.
              The fastest correct solution wins.
            </p>

            {/* Match Info Grid */}
            <div className="a1-lobby-stats">
              <div className="a1-lobby-stat">
                <span className="a1-lobby-stat-label">Problems</span>
                <span className="a1-lobby-stat-value">4 Algorithmic</span>
              </div>
              <div className="a1-lobby-stat">
                <span className="a1-lobby-stat-label">Time Limit</span>
                <span className="a1-lobby-stat-value">30:00 Mins</span>
              </div>
              <div className="a1-lobby-stat">
                <span className="a1-lobby-stat-label">Sabotage</span>
                <span className="a1-lobby-stat-value a1-lobby-stat-value--accent">ENABLED</span>
              </div>
              <div className="a1-lobby-stat">
                <span className="a1-lobby-stat-label">Ranked ELO</span>
                <span className="a1-lobby-stat-value a1-lobby-stat-value--warning">± 25 PTS</span>
              </div>
            </div>

            {/* Start Button */}
            {isHost ? (
              <button className="a1-lobby-start" onClick={handleStartMatch}>
                <Zap size={18} />
                <span>Start Match</span>
              </button>
            ) : (
              <div className="a1-lobby-waiting">
                <Lock size={18} />
                <span>Waiting for host to start...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render ACTIVE state
  return (
    <div className="a1-root">
      {/* Match Finished Victory overlay portal */}
      {matchFinishedData && (
        <div className="a1-victory-overlay">
          <div className="a1-victory-card">
            <div className="a1-victory-icon-wrapper">
              <Swords size={32} />
            </div>

            <h2 className="a1-victory-title">
              Match Completed
            </h2>
            <p className="a1-victory-subtitle">
              Authoritative points evaluation threshold checked.
            </p>

            <div className="a1-victory-stats-box">
              <div className="a1-victory-stat-row">
                <span className="a1-victory-stat-label">Winner:</span>
                <span className="a1-victory-stat-value a1-victory-stat-value--winner">
                  {matchFinishedData.winnerId === activeUserId ? activeUsername : (opponentProfile?.username || 'Opponent')}
                </span>
              </div>
              <div className="a1-victory-divider" />
              <div className="a1-victory-stat-row">
                <span className="a1-victory-stat-label">Your Final Score:</span>
                <span className="a1-victory-stat-value a1-victory-stat-value--me">{myScore} pts</span>
              </div>
              <div className="a1-victory-stat-row">
                <span className="a1-victory-stat-label">Opponent Score:</span>
                <span className="a1-victory-stat-value a1-victory-stat-value--opponent">{opponentScore} pts</span>
              </div>
              <div className="a1-victory-divider" />
              <div className="a1-victory-stat-row">
                <span className="a1-victory-stat-label">ELO Adjustment:</span>
                <span className={`a1-victory-stat-value ${
                  (() => {
                    const scoreObj = matchFinishedData.scores?.find((p) => String(p.userId) === String(activeUserId));
                    const delta = scoreObj ? scoreObj.eloDelta : 0;
                    return delta >= 0 ? 'a1-victory-stat-value--up' : 'a1-victory-stat-value--down';
                  })()
                }`}>
                  {(() => {
                    const scoreObj = matchFinishedData.scores?.find((p) => String(p.userId) === String(activeUserId));
                    const delta = scoreObj ? scoreObj.eloDelta : 0;
                    return delta >= 0 ? `+${delta} ELO` : `${delta} ELO`;
                  })()}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate('/matchmaking')}
              className="a1-victory-btn"
            >
              Return to Matchmaking Arena
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification HUD */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl border font-mono text-xs shadow-2xl bg-indigo-950/90 border-indigo-500/30 text-indigo-300 animate-pulse">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Initiation Overlay */}
      {(matchPhase === 'INITIATING' || matchPhase === 'COUNTDOWN') && (
        <MatchInitOverlay
          userA={{ username: activeUsername, rating: user?.duelRating || 1200 }}
          userB={{ username: opponentProfile?.username || 'Challenger', rating: opponentProfile?.rating || 1200 }}
          onHandoff={handleOverlayHandoff}
        />
      )}

      <div className="a1-body">
        {/* Header */}
        <header className="a1-header">
          <div className="a1-header-left">
            <button className="a1-back-btn" onClick={handleLeaveArena}>
              <ArrowLeft size={14} />
              <span>Exit</span>
            </button>
            <span className="a1-header-sep" />
            <div className="a1-match-info">
              <span className="a1-match-id">#{matchId?.substring(0, 8) || 'RANKED'}</span>
              <span className="a1-vs-divider">vs</span>
              <span className="a1-opponent-name">{opponentProfile?.username || 'Challenger'}</span>
            </div>
          </div>

          <div className="a1-header-right">
            <div className={getTimerClass()}>
              <Clock size={14} />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            <select
              className="a1-lang-select"
              value={currentLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.id} value={lang.id}>{lang.label}</option>
              ))}
            </select>
          </div>
        </header>

        {/* Workspace */}
        <div className="a1-workspace">
          {/* Left Sidebar - Problem switcher tabs list */}
          <aside className="a1-sidebar">
            <div className="a1-sidebar-header">
              <span className="a1-sidebar-title">Problems</span>
            </div>
            <div className="a1-sidebar-content">
              <div className="a1-problem-tabs">
                {activeProblemsList.map((prob, idx) => {
                  const status = opponentProgress?.[prob.id] || 'untouched';
                  return (
                    <button
                      key={prob.id || idx}
                      className={`a1-problem-tab ${idx === activeProblemIndex ? 'a1-problem-tab--active' : ''}`}
                      onClick={() => setActiveProblemIndex(idx)}
                    >
                      <ProblemStatusIcon status={status} />
                      <span className="a1-problem-tab-name">P{idx + 1}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Main Content Pane */}
          <div className="a1-main">
            <div className="a1-split">
              
              {/* Left Pane - Problem Description & Submissions Tabs (Resizable / Collapsible) */}
              <section
                className={`a1-description resizable-panel ${isLeftPanelCollapsed ? 'w-0 opacity-0 pointer-events-none' : ''}`}
                style={{ width: isLeftPanelCollapsed ? 0 : `${leftPanelWidth}px` }}
              >
                {/* Collapsible Header */}
                <div className="a1-workspace-panel-header">
                  <span className="a1-workspace-panel-title">
                    // Workspace Panel
                  </span>
                  <button
                    onClick={() => setIsLeftPanelCollapsed(true)}
                    className="a1-workspace-panel-close"
                  >
                    <ChevronLeft size={14} />
                  </button>
                </div>

                {/* Sub-Tab selection */}
                <div className="a1-subtabs">
                  <button
                    onClick={() => setActiveLeftTab('description')}
                    className={`a1-subtab ${activeLeftTab === 'description' ? 'a1-subtab--active' : ''}`}
                  >
                    Description
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('submissions')}
                    className={`a1-subtab ${activeLeftTab === 'submissions' ? 'a1-subtab--active' : ''}`}
                  >
                    Submissions ({problemSubmissions.length})
                  </button>
                </div>

                {/* Left Pane Viewport scroll area */}
                <div className="a1-description-scroll select-text p-4">
                  {activeLeftTab === 'description' ? (
                    <div>
                      <div className="a1-problem-header">
                        <div className="a1-problem-title-row">
                          <span className="a1-problem-index">P{activeProblemIndex + 1}.</span>
                          <h2 className="a1-problem-title">{activeProblem?.title}</h2>
                        </div>
                        <div className="a1-problem-meta">
                          <DifficultyBadge difficulty={activeProblem?.difficulty} />
                        </div>
                      </div>
                      <div className="a1-problem-content">
                        <ProblemDescription
                          problem={activeProblem}
                          submissions={[]}
                          loadingSubmissions={false}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="a1-submissions-ledger">
                      <h3 className="a1-submissions-title">
                        Submission Ledger for P{activeProblemIndex + 1}
                      </h3>
                      
                      {problemSubmissions.length === 0 ? (
                        <div className="a1-submissions-empty">
                          No submissions recorded for this problem yet.
                        </div>
                      ) : (
                        problemSubmissions.map((sub) => {
                          const isExpanded = expandedSubId === sub.id;
                          const verdictLower = String(sub.verdict).toLowerCase();
                          const isAccepted = ['accepted', 'ac', 'accepted! solution passed all test cases.'].includes(verdictLower);
                          return (
                            <div
                              key={sub.id}
                              className={`a1-submission-item ${
                                isAccepted
                                  ? 'a1-submission-item--accepted'
                                  : 'a1-submission-item--rejected'
                              }`}
                            >
                              <div className="a1-submission-item-header">
                                <span className="a1-submission-verdict-wrapper">
                                  {isAccepted ? (
                                    <CheckCircle2 size={12} />
                                  ) : (
                                    <AlertTriangle size={12} />
                                  )}
                                  {sub.verdict}
                                </span>
                                <span className="a1-submission-time">{sub.timestamp}</span>
                              </div>
                              
                              <div className="a1-submission-item-meta">
                                <span>Lang: {sub.language?.toUpperCase()}</span>
                                <button
                                  onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                                  className="a1-submission-item-toggle"
                                >
                                  <Code size={10} />
                                  {isExpanded ? 'Hide Code' : 'View Code'}
                                </button>
                              </div>

                              {isExpanded && (
                                <pre className="a1-submission-item-code">
                                  {sub.code}
                                </pre>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* Left Drag Resizer Bar */}
              {!isLeftPanelCollapsed && (
                <div 
                  onMouseDown={startResizeLeft} 
                  className="resize-handle"
                  title="Drag to resize problems panel"
                />
              )}

              {/* Floating Left Panel Toggle Tab when collapsed */}
              {isLeftPanelCollapsed && (
                <button
                  onClick={() => {
                    setIsLeftPanelCollapsed(false);
                    setActiveLeftTab('description');
                  }}
                  className="a1-restore-tab"
                >
                  <ChevronRight size={14} />
                  <span className="a1-restore-tab-text">Problems</span>
                </button>
              )}

              {/* Center Pane - Editor & Console */}
              <div className="a1-editor min-w-0 flex-1">
                <div className={`a1-editor-container ${activeSabotage === 'blur' ? 'sabotage-blurred' : ''}`}>
                  <Editor
                    height="100%"
                    language={LANGUAGES.find((l) => l.id === currentLanguage)?.monaco}
                    value={currentCode}
                    onChange={handleCodeChange}
                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                    options={{
                      readOnly: isEditorLocked || activeSabotage === 'jam',
                      fontSize: 13,
                      fontFamily: "'JetBrains Mono', monospace",
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      padding: { top: 12, bottom: 12 },
                      automaticLayout: true,
                      quickSuggestions: isSuggestionsEnabled,
                      parameterHints: isSuggestionsEnabled,
                      suggestOnTriggerCharacters: isSuggestionsEnabled,
                      wordBasedSuggestions: isSuggestionsEnabled,
                    }}
                  />
                </div>

                {/* Console Output Tab */}
                <div className={`a1-console ${isTerminalOpen ? 'a1-console--open' : 'a1-console--closed'}`}>
                  <div className="a1-console-header">
                    <div className="a1-console-tabs">
                      <button className="a1-console-tab a1-console-tab--active">
                        Console Terminal Output
                      </button>
                    </div>
                    <div className="a1-console-actions">
                      <button className="a1-console-close" onClick={() => setIsTerminalOpen(!isTerminalOpen)}>
                        {isTerminalOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                      </button>
                    </div>
                  </div>
                  {isTerminalOpen && (
                    <div className="a1-console-body">
                      <pre className="select-text whitespace-pre-wrap">{currentTerminalOutput || 'Ready to run compiler tests...'}</pre>
                    </div>
                  )}
                </div>

                {/* Code action run controls */}
                <div className="a1-action-bar">
                  <button
                    className="a1-btn a1-btn--ghost"
                    onClick={handleRunCode}
                    disabled={isRunning || isSubmitting}
                  >
                    <Play size={14} />
                    <span>Run</span>
                  </button>
                  <button
                    className="a1-btn a1-btn--primary"
                    onClick={handleSubmitCode}
                    disabled={isRunning || isSubmitting}
                  >
                    <Send size={14} />
                    <span>Submit</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Right Drag Resizer Bar */}
          <div 
            onMouseDown={startResizeRight} 
            className="resize-handle"
            title="Drag to resize telemetry panel"
          />

          {/* Right Sidebar - Telemetry & Shop Panel */}
          <aside className="a1-opponent-panel" style={{ width: `${rightPanelWidth}px` }}>
            {/* Opponent Identity Details */}
            <div className="a1-opponent-header">
              <div className="a1-opponent-avatar">
                {(opponentProfile?.username || 'C')[0].toUpperCase()}
              </div>
              <div className="a1-opponent-info">
                <span className="a1-opponent-label">Opponent</span>
                <span className="a1-opponent-name">{opponentProfile?.username || 'Challenger'}</span>
              </div>
            </div>

            {/* Telemetry section: Scores */}
            <div className="a1-telemetry">
              <span className="a1-telemetry-section-title">
                // Combat Telemetry
              </span>
              
              {/* Me Score */}
              <div className="a1-telemetry-row">
                <div className="a1-telemetry-user">
                  <span className="a1-telemetry-user-name">{activeUsername} (You)</span>
                  <span className="a1-telemetry-user-status">Status: Active</span>
                </div>
                <span className="a1-telemetry-score">{myScore} pts</span>
              </div>

              {/* Mana AP Bar */}
              <div className="a1-mana-container">
                <div className="a1-mana-header">
                  <span>AP (Mana) Bar:</span>
                  <span>{myAp} / 100</span>
                </div>
                <div className="a1-mana-track">
                  <div className="a1-mana-fill" style={{ width: `${myAp}%` }} />
                </div>
              </div>

              <div className="a1-telemetry-divider" />

              {/* Opponent Score */}
              <div className="a1-telemetry-row">
                <div className="a1-telemetry-user">
                  <span className="a1-telemetry-user-name flex-row">
                    {opponentProfile?.username || 'Opponent'}
                    <span className="a1-pulse-container">
                      <span className="a1-pulse-ping"></span>
                      <span className="a1-pulse-dot"></span>
                    </span>
                  </span>
                  <span className="a1-telemetry-user-status">
                    Problems: [{opponentProfile?.solvedCount || 0}/4]
                  </span>
                </div>
                <span className="a1-telemetry-score-opp">{opponentScore} pts</span>
              </div>
            </div>

            {/* Tactical Shop controls */}
            <div className="a1-shop">
              <span className="a1-shop-title">
                <Sparkles size={11} className="a1-shop-title-icon" />
                <span>Tactical Shop</span>
              </span>

              <div className="a1-shop-items">
                {/* Autocomplete */}
                <div className="a1-shop-item">
                  <div className="a1-shop-item-header">
                    <span className="a1-shop-item-name">
                      <Keyboard size={11} />
                      Suggestions
                    </span>
                    <span className="a1-shop-item-cost">30 AP</span>
                  </div>
                  <button
                    disabled={myAp < 30 || isSuggestionsEnabled}
                    onClick={handleBuyAutocomplete}
                    className="a1-shop-btn"
                  >
                    {isSuggestionsEnabled ? 'Active' : 'Buy (60s)'}
                  </button>
                </div>

                {/* Hint */}
                <div className="a1-shop-item">
                  <div className="a1-shop-item-header">
                    <span className="a1-shop-item-name">
                      <HelpCircle size={11} />
                      Problem Hint
                    </span>
                    <span className="a1-shop-item-cost">35 AP</span>
                  </div>
                  <button
                    disabled={myAp < 35}
                    onClick={handleBuyHint}
                    className="a1-shop-btn"
                  >
                    Reveal Hint
                  </button>
                </div>

                {/* Editor Lock */}
                <div className="a1-shop-item">
                  <div className="a1-shop-item-header">
                    <span className="a1-shop-item-name">
                      <Lock size={11} />
                      Editor Jam
                    </span>
                    <span className="a1-shop-item-cost">50 AP</span>
                  </div>
                  <button
                    disabled={myAp < 50}
                    onClick={handleCastJam}
                    className="a1-shop-btn a1-shop-btn--danger"
                  >
                    Cast Jam (5s)
                  </button>
                </div>

                {/* Blur screen */}
                <div className="a1-shop-item">
                  <div className="a1-shop-item-header">
                    <span className="a1-shop-item-name">
                      <EyeOff size={11} />
                      Blur Canvas
                    </span>
                    <span className="a1-shop-item-cost">40 AP</span>
                  </div>
                  <button
                    disabled={myAp < 40}
                    onClick={handleCastBlur}
                    className="a1-shop-btn a1-shop-btn--danger"
                  >
                    Cast Haze (10s)
                  </button>
                </div>

                {/* Blindfold */}
                <div className="a1-shop-item">
                  <div className="a1-shop-item-header">
                    <span className="a1-shop-item-name">
                      <AlertTriangle size={11} />
                      Blindfold
                    </span>
                    <span className="a1-shop-item-cost">60 AP</span>
                  </div>
                  <button
                    disabled={myAp < 60}
                    onClick={handleCastBlindfold}
                    className="a1-shop-btn a1-shop-btn--danger"
                  >
                    Cast Blindfold (60s)
                  </button>
                </div>

                {/* Shield */}
                <div className="a1-shop-item">
                  <div className="a1-shop-item-header">
                    <span className="a1-shop-item-name">
                      <Shield size={11} />
                      Immunity Shield
                    </span>
                    <span className="a1-shop-item-cost">40 AP</span>
                  </div>
                  <button
                    disabled={myAp < 40}
                    onClick={handleCastImmunity}
                    className="a1-shop-btn a1-shop-btn--shield"
                  >
                    Activate (15s)
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Sabotage overlay warning banner on screen bottom */}
        {activeSabotage && (
          <footer className="a1-footer">
            <div className="a1-footer-info">
              <AlertTriangle size={14} className="a1-footer-warning-icon" />
              <span>
                WARNING: Casted {activeSabotage?.toUpperCase()}! Time left: {sabotageTimeLeft}s
              </span>
            </div>
            {myAp >= 20 && (
              <button
                onClick={handleCastCleanse}
                className="a1-footer-cleanse-btn"
              >
                Cleanse (20 AP)
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

export default Arena1v1Page;