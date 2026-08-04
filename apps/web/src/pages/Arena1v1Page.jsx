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
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#0b0b10] border border-zinc-800 p-8 rounded-2xl w-full max-w-md text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="inline-flex p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-6">
              <Swords size={32} />
            </div>

            <h2 className="text-xl font-black uppercase tracking-wider text-white font-mono">
              Match Completed
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-2">
              Authoritative points evaluation threshold checked.
            </p>

            <div className="bg-zinc-950/60 border border-zinc-900 rounded-xl p-4 my-6 flex flex-col gap-3 font-mono">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase">Winner:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {matchFinishedData.winnerId === activeUserId ? activeUsername : (opponentProfile?.username || 'Opponent')}
                </span>
              </div>
              <div className="border-t border-zinc-900 my-1" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase">Your Final Score:</span>
                <span className="text-indigo-300 font-bold">{myScore} pts</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase">Opponent Score:</span>
                <span className="text-zinc-300 font-bold">{opponentScore} pts</span>
              </div>
              <div className="border-t border-zinc-900 my-1" />
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase">ELO Adjustment:</span>
                <span className={`font-bold ${
                  (() => {
                    const scoreObj = matchFinishedData.scores?.find((p) => String(p.userId) === String(activeUserId));
                    const delta = scoreObj ? scoreObj.eloDelta : 0;
                    return delta >= 0 ? 'text-emerald-400' : 'text-red-400';
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
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs uppercase rounded-xl transition-all"
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
                <div className="p-3 bg-zinc-950/80 border-b border-zinc-900 flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                    // Workspace Panel
                  </span>
                  <button
                    onClick={() => setIsLeftPanelCollapsed(true)}
                    className="p-1 hover:text-white text-zinc-500 rounded bg-zinc-900 transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                </div>

                {/* Sub-Tab selection */}
                <div className="flex border-b border-zinc-900 bg-zinc-950 text-[10px] font-mono shrink-0">
                  <button
                    onClick={() => setActiveLeftTab('description')}
                    className={`flex-1 py-2 text-center border-b-2 uppercase font-bold transition-all ${
                      activeLeftTab === 'description'
                        ? 'border-indigo-500 text-indigo-400 bg-zinc-900/40'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Description
                  </button>
                  <button
                    onClick={() => setActiveLeftTab('submissions')}
                    className={`flex-1 py-2 text-center border-b-2 uppercase font-bold transition-all ${
                      activeLeftTab === 'submissions'
                        ? 'border-indigo-500 text-indigo-400 bg-zinc-900/40'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
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
                    <div className="flex flex-col gap-3 font-mono">
                      <h3 className="text-xs font-bold text-zinc-300 uppercase mb-1">
                        Submission Ledger for P{activeProblemIndex + 1}
                      </h3>
                      
                      {problemSubmissions.length === 0 ? (
                        <div className="text-zinc-500 text-[10px] py-8 text-center border border-dashed border-zinc-900 rounded">
                          No submissions recorded for this problem yet.
                        </div>
                      ) : (
                        problemSubmissions.map((sub) => {
                          const isExpanded = expandedSubId === sub.id;
                          return (
                            <div
                              key={sub.id}
                              className={`border rounded p-3 flex flex-col gap-2 transition-all ${
                                sub.verdict === 'ACCEPTED'
                                  ? 'bg-emerald-950/10 border-emerald-900/40 text-emerald-400'
                                  : 'bg-red-950/10 border-red-900/40 text-red-400'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold flex items-center gap-1">
                                  {sub.verdict === 'ACCEPTED' ? (
                                    <CheckCircle2 size={12} className="text-emerald-400" />
                                  ) : (
                                    <AlertTriangle size={12} className="text-red-400" />
                                  )}
                                  {sub.verdict}
                                </span>
                                <span className="text-zinc-500">{sub.timestamp}</span>
                              </div>
                              
                              <div className="flex justify-between items-center text-[9px] text-zinc-500">
                                <span>Lang: {sub.language?.toUpperCase()}</span>
                                <button
                                  onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                                  className="text-indigo-400 hover:text-indigo-300 font-bold underline flex items-center gap-0.5"
                                >
                                  <Code size={10} />
                                  {isExpanded ? 'Hide Code' : 'View Code'}
                                </button>
                              </div>

                              {isExpanded && (
                                <pre className="mt-1.5 p-2 bg-zinc-950 text-[9px] text-zinc-300 border border-zinc-900 rounded overflow-x-auto select-text font-mono max-h-40 leading-relaxed whitespace-pre-wrap">
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
                  className="absolute left-[36px] top-1/2 -translate-y-1/2 z-30 bg-zinc-950 hover:bg-zinc-900 border-r border-t border-b border-zinc-800 text-zinc-400 hover:text-white px-1.5 py-4 rounded-r-md flex flex-col items-center gap-2 text-[10px] font-mono tracking-widest cursor-pointer"
                >
                  <ChevronRight size={14} />
                  <span className="writing-mode-vertical uppercase">Problems</span>
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
          <aside className="a1-opponent-panel flex flex-col p-4 gap-4 shrink-0 overflow-y-auto" style={{ width: `${rightPanelWidth}px` }}>
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
            <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-4 flex flex-col gap-3 shrink-0 font-mono text-xs">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                // Combat Telemetry
              </span>
              
              {/* Me Score */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-bold text-white">{activeUsername} (You)</span>
                  <span className="text-[9px] text-zinc-500">Status: Active</span>
                </div>
                <span className="text-base font-black text-indigo-400 score-value">{myScore} pts</span>
              </div>

              {/* Mana AP Bar */}
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex justify-between text-[9px] text-zinc-400">
                  <span>AP (Mana) Bar:</span>
                  <span>{myAp} / 100</span>
                </div>
                <div className="w-full h-2 rounded-full mana-bar-track relative overflow-hidden">
                  <div className="h-full rounded-full mana-bar-fill" style={{ width: `${myAp}%` }} />
                </div>
              </div>

              <div className="border-t border-zinc-900/60 my-1" />

              {/* Opponent Score */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                    {opponentProfile?.username || 'Opponent'}
                    <span className="relative flex w-1.5 h-1.5">
                      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative block w-1.5 h-1.5 rounded-full bg-emerald-500 active-typing-pulse"></span>
                    </span>
                  </span>
                  <span className="text-[9px] text-zinc-500">
                    Problems: [{opponentProfile?.solvedCount || 0}/4]
                  </span>
                </div>
                <span className="font-bold text-zinc-400">{opponentScore} pts</span>
              </div>
            </div>

            {/* Tactical Shop controls */}
            <div className="flex-1 flex flex-col bg-zinc-950/80 border border-zinc-900 rounded-xl p-4 gap-3 min-h-[280px] font-mono text-xs">
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                <Sparkles size={11} className="text-indigo-400 font-bold" />
                <span>Tactical Shop</span>
              </span>

              <div className="flex flex-col gap-2 overflow-y-auto pr-1">
                {/* Autocomplete */}
                <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-200 flex items-center gap-1">
                      <Keyboard size={11} className="text-emerald-400" />
                      Suggestions
                    </span>
                    <span className="text-[9px] text-indigo-400">30 AP</span>
                  </div>
                  <button
                    disabled={myAp < 30 || isSuggestionsEnabled}
                    onClick={handleBuyAutocomplete}
                    className="w-full mt-1.5 py-1.5 bg-zinc-950 hover:bg-zinc-900 disabled:bg-zinc-950/20 disabled:text-zinc-600 disabled:border-zinc-950/10 text-white border border-zinc-800 rounded text-[9px] uppercase font-bold cursor-pointer"
                  >
                    {isSuggestionsEnabled ? 'Active' : 'Buy (60s)'}
                  </button>
                </div>

                {/* Hint */}
                <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-200 flex items-center gap-1">
                      <HelpCircle size={11} className="text-amber-400" />
                      Problem Hint
                    </span>
                    <span className="text-[9px] text-indigo-400">35 AP</span>
                  </div>
                  <button
                    disabled={myAp < 35}
                    onClick={handleBuyHint}
                    className="w-full mt-1.5 py-1.5 bg-zinc-950 hover:bg-zinc-900 disabled:bg-zinc-950/20 disabled:text-zinc-600 disabled:border-zinc-950/10 text-white border border-zinc-800 rounded text-[9px] uppercase font-bold cursor-pointer"
                  >
                    Reveal Hint
                  </button>
                </div>

                {/* Editor Lock */}
                <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-200 flex items-center gap-1">
                      <Lock size={11} className="text-red-400" />
                      Editor Jam
                    </span>
                    <span className="text-[9px] text-indigo-400">50 AP</span>
                  </div>
                  <button
                    disabled={myAp < 50}
                    onClick={handleCastJam}
                    className="w-full mt-1.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 disabled:bg-zinc-950/20 disabled:text-zinc-600 disabled:border-zinc-950/10 text-red-300 border border-red-900/20 rounded text-[9px] uppercase font-bold cursor-pointer"
                  >
                    Cast Jam (5s)
                  </button>
                </div>

                {/* Blur screen */}
                <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-200 flex items-center gap-1">
                      <EyeOff size={11} className="text-red-400" />
                      Blur Canvas
                    </span>
                    <span className="text-[9px] text-indigo-400">40 AP</span>
                  </div>
                  <button
                    disabled={myAp < 40}
                    onClick={handleCastBlur}
                    className="w-full mt-1.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 disabled:bg-zinc-950/20 disabled:text-zinc-600 disabled:border-zinc-950/10 text-red-300 border border-red-900/20 rounded text-[9px] uppercase font-bold cursor-pointer"
                  >
                    Cast Haze (10s)
                  </button>
                </div>

                {/* Blindfold */}
                <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-200 flex items-center gap-1">
                      <AlertTriangle size={11} className="text-red-400" />
                      Blindfold
                    </span>
                    <span className="text-[9px] text-indigo-400">60 AP</span>
                  </div>
                  <button
                    disabled={myAp < 60}
                    onClick={handleCastBlindfold}
                    className="w-full mt-1.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 disabled:bg-zinc-950/20 disabled:text-zinc-600 disabled:border-zinc-950/10 text-red-300 border border-red-900/20 rounded text-[9px] uppercase font-bold cursor-pointer"
                  >
                    Cast Blindfold (60s)
                  </button>
                </div>

                {/* Shield */}
                <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-200 flex items-center gap-1">
                      <Shield size={11} className="text-indigo-400" />
                      Immunity Shield
                    </span>
                    <span className="text-[9px] text-indigo-400">40 AP</span>
                  </div>
                  <button
                    disabled={myAp < 40}
                    onClick={handleCastImmunity}
                    className="w-full mt-1.5 py-1.5 bg-indigo-950/20 hover:bg-indigo-950/40 disabled:bg-zinc-950/20 disabled:text-zinc-600 disabled:border-zinc-950/10 text-indigo-300 border border-indigo-900/20 rounded text-[9px] uppercase font-bold cursor-pointer"
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
          <footer className="a1-footer font-mono text-xs bg-red-950/80 border-t border-red-900/40 text-red-300 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400 animate-bounce" />
              <span>
                WARNING: Casted {activeSabotage?.toUpperCase()}! Time left: {sabotageTimeLeft}s
              </span>
            </div>
            {myAp >= 20 && (
              <button
                onClick={handleCastCleanse}
                className="px-3 py-1 bg-red-500 hover:bg-red-400 text-white rounded text-[10px] font-bold uppercase transition-all shadow-md cursor-pointer"
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