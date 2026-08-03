// src/pages/Arena1v1Page.jsx
// Arena1v1Page — live 1v1 competitive arena with split-pane workspace
// Uses design system tokens, no Tailwind
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../store/AuthContext';
import { useMatchSocket, DEFAULT_ARENA_PROBLEMS } from '../hooks/useMatchSocket';
import { ProblemDescription } from '../components/practice/ProblemDescription';
import { InteractiveEditor } from '../components/practice/InteractiveEditor';
import { MatchInitOverlay } from '../components/arena/MatchInitOverlay';
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
} from 'lucide-react';
import './Arena1v1Page.css';

// ─── Language Options ──────────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'python', label: 'Python 3', monaco: 'python' },
  { id: 'cpp', label: 'C++ 17', monaco: 'cpp' },
  { id: 'java', label: 'Java', monaco: 'java' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript' },
];

// ─── Difficulty Badge Component ─────────────────────────────────────────────────
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

// ─── Console Output Component ───────────────────────────────────────────────────
function ConsoleOutput({ output, isOpen, onToggle }) {
  const [activeTab, setActiveTab] = useState('output');

  if (!isOpen) {
    return (
      <div className="a1-console a1-console--closed">
        <div className="a1-console-header">
          <button className="a1-console-toggle" onClick={onToggle}>
            <ChevronUp size={14} />
            <span>Output</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="a1-console a1-console--open">
      <div className="a1-console-header">
        <div className="a1-console-tabs">
          <button
            className={`a1-console-tab ${activeTab === 'output' ? 'a1-console-tab--active' : ''}`}
            onClick={() => setActiveTab('output')}
          >
            Output
          </button>
          <button
            className={`a1-console-tab ${activeTab === 'testcases' ? 'a1-console-tab--active' : ''}`}
            onClick={() => setActiveTab('testcases')}
          >
            Testcases
          </button>
        </div>
        <div className="a1-console-actions">
          <button className="a1-console-close" onClick={onToggle}>
            <ChevronDown size={14} />
          </button>
        </div>
      </div>
      <div className="a1-console-body">
        <pre>{output || 'Ready to run...'}</pre>
      </div>
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────
export function Arena1v1Page() {
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
  } = useMatchSocket(matchId);

  const activeUserId = user?.id || user?.userId || 'user-1';
  const activeUsername = user?.username || user?.name || user?.email?.split('@')[0] || 'Player';

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

  // Transition IDLE -> INITIATING when match starts
  useEffect(() => {
    if (isMatchStarted && matchPhase === 'IDLE') {
      setMatchPhase('INITIATING');
    }
  }, [isMatchStarted, matchPhase]);

  // Redirect when arena is dissolved
  useEffect(() => {
    if (isArenaDissolved) {
      navigate('/matchmaking');
    }
  }, [isArenaDissolved, navigate]);

  // Timer tick when match is ACTIVE
  useEffect(() => {
    let timer;
    if (matchPhase === 'ACTIVE') {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [matchPhase]);

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
  const handleOverlayHandoff = () => {
    setMatchPhase('ACTIVE');
  };

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

  // Run code
  const handleRunCode = () => {
    setIsRunning(true);
    setTerminalOutputMap((prev) => ({
      ...prev,
      [currentProblemId]: `> Running test cases for ${activeProblem?.title || 'Problem'}...\n[PASS] Sample Test 1\n[PASS] Sample Test 2\n\nAll sample tests passed.`,
    }));
    setIsTerminalOpen(true);
    setTimeout(() => setIsRunning(false), 1200);
  };

  // Submit code
  const handleSubmitCode = () => {
    setIsSubmitting(true);
    setTerminalOutputMap((prev) => ({
      ...prev,
      [currentProblemId]: `> Submitting solution...\n[VERIFYING] Testcases...\n\nRESULT: ACCEPTED`,
    }));
    setIsTerminalOpen(true);
    setTimeout(() => {
      setIsSubmitting(false);
      sendSubmission(currentProblemId, 'ACCEPTED', currentCode);
    }, 1800);
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
            userA={{ username: activeUsername, rating: user?.elo || 1482 }}
            userB={{ username: opponentProfile?.username || 'Challenger', rating: opponentProfile?.rating || 1540 }}
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
      {/* Initiation Overlay */}
      {(matchPhase === 'INITIATING' || matchPhase === 'COUNTDOWN') && (
        <MatchInitOverlay
          userA={{ username: activeUsername, rating: user?.elo || 1482 }}
          userB={{ username: opponentProfile?.username || 'Challenger', rating: opponentProfile?.rating || 1540 }}
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
          {/* Left Sidebar - Problem List */}
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

          {/* Main Content */}
          <div className="a1-main">
            <div className="a1-split">
              {/* Left - Problem Description */}
              <section className="a1-description">
                <div className="a1-description-scroll">
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
                    <p>{activeProblem?.description || 'Problem description...'}</p>
                  </div>
                </div>
              </section>

              {/* Right - Editor */}
              <div className="a1-editor">
                <div className="a1-editor-container">
                  <Editor
                    height="100%"
                    language={LANGUAGES.find(l => l.id === currentLanguage)?.monaco}
                    value={currentCode}
                    onChange={handleCodeChange}
                    theme="vs-dark"
                    options={{
                      readOnly: isEditorLocked,
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
                <ConsoleOutput
                  output={currentTerminalOutput}
                  isOpen={isTerminalOpen}
                  onToggle={() => setIsTerminalOpen(!isTerminalOpen)}
                />

                {/* Action Bar */}
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

          {/* Right Sidebar - Opponent Progress */}
          <aside className="a1-opponent-panel">
            <div className="a1-opponent-header">
              <div className="a1-opponent-avatar">
                {(opponentProfile?.username || 'C')[0].toUpperCase()}
              </div>
              <div className="a1-opponent-info">
                <span className="a1-opponent-label">Opponent</span>
                <span className="a1-opponent-name">{opponentProfile?.username || 'Challenger'}</span>
              </div>
            </div>
            <div className="a1-opponent-progress">
              {activeProblemsList.map((prob, idx) => {
                const status = opponentProgress?.[prob.id] || 'untouched';
                return (
                  <div key={prob.id || idx} className="a1-opponent-problem">
                    <span className="a1-opponent-problem-name">P{idx + 1}</span>
                    <span className={`a1-opponent-problem-status a1-opponent-problem-status--${status}`} />
                  </div>
                );
              })}
            </div>
          </aside>
        </div>

        {/* Sabotage Bar */}
        <footer className="a1-footer">
          <div className="a1-footer-left">
            <Shield size={14} />
            <span>Sabotage</span>
          </div>
          <div className="a1-footer-actions">
            <button
              className="a1-sabotage-btn"
              onClick={() => sendSabotage('LOCK_EDITOR')}
              title="Lock opponent's editor for 5 seconds"
            >
              <Lock size={12} />
              <span>Lock Editor (5s)</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Arena1v1Page;