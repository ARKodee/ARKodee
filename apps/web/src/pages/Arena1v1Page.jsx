// src/pages/Arena1v1Page.jsx
// Conductor & Layout Manager for 1v1 Competitive Arena

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useMatchSocket, DEFAULT_ARENA_PROBLEMS } from '../hooks/useMatchSocket';
import { ProblemDescription } from '../components/practice/ProblemDescription';
import { InteractiveEditor } from '../components/practice/InteractiveEditor';
import { MatchInitOverlay } from '../components/arena/MatchInitOverlay';
import { runProblemCode, submitProblemCode } from '../lib/problems';
import './Arena1v1Page.css';
import {
  Swords,
  ArrowLeft,
  Clock,
  Shield,
  Zap,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  AlertTriangle,
  Lock,
  Sparkles,
  HelpCircle,
  EyeOff,
  Keyboard,
  Info,
  Layers,
  Code,
} from 'lucide-react';

export function Arena1v1Page() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // State Machine Phase: 'IDLE' | 'INITIATING' | 'COUNTDOWN' | 'ACTIVE'
  const [matchPhase, setMatchPhase] = useState('IDLE');

  // Multi-problem state management inside parent conductor
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

  // Match timer (seconds)
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
  const activeUsername = user?.username || user?.name || user?.email?.split('@')[0] || 'Player';

  const isHost = hostId
    ? String(activeUserId) === String(hostId)
    : true;
  
  const activeProblemsList = (problems && problems.length > 0) ? problems : DEFAULT_ARENA_PROBLEMS;
  const activeProblem = activeProblemsList[activeProblemIndex] || activeProblemsList[0];

  const currentProblemId = activeProblem?.id || `p${activeProblemIndex + 1}`;
  const currentCode = userCodeMap[currentProblemId] ?? `# Write your solution for ${activeProblem?.title || 'Problem'} here\n\n`;
  const currentLanguage = selectedLanguageMap[currentProblemId] ?? 'python';
  const currentTerminalOutput = terminalOutputMap[currentProblemId] ?? '';

  // Local timer update from startedAt timestamp (Resolves page refresh bug)
  useEffect(() => {
    if (!startedAt || matchPhase === 'IDLE') return;

    // Calculate actual elapsed seconds
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

  // Redirect if lobby dissolved
  useEffect(() => {
    if (isArenaDissolved) {
      navigate('/matchmaking');
    }
  }, [isArenaDissolved, navigate]);

  // Auto-dismiss toast messages after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
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

  // Start match action
  const handleStartMatch = () => {
    if (!isHost) return;
    requestStartMatch();
    setMatchPhase('INITIATING');
    initiateMatch();
  };

  const handleLeaveArena = () => {
    leaveArenaLobby();
    navigate('/matchmaking');
  };

  // Wrapped in useCallback to prevent child render/timer glitches
  const handleOverlayHandoff = useCallback(() => {
    setMatchPhase('ACTIVE');
  }, []);

  const setCodeForCurrentProblem = (newCode) => {
    setUserCodeMap((prev) => ({
      ...prev,
      [currentProblemId]: newCode,
    }));
  };

  const setLanguageForCurrentProblem = (lang) => {
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
          : `RESULT: ${res.verdict || 'WRONG ANSWER'}\nFailed on Testcase ${res.passed_count + 1} of ${res.total_count}`;

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

  // Powerups & Sabotages Purchase triggers
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
    sendSabotage('monaco-jam');
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

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Monaco autocomplete is active if timer is not expired
  const isSuggestionsEnabled = autocompleteActiveUntil > Date.now();

  // Filter submissions by current problem
  const problemSubmissions = submissionsList.filter(s => s.problemId === currentProblemId);

  return (
    <div className="h-screen w-full bg-[#030307] text-zinc-100 flex flex-col overflow-hidden font-sans select-none arena-cockpit">
      
      {/* Toast Notification HUD Banner */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-zinc-950 border border-indigo-500/40 text-indigo-200 px-6 py-2.5 rounded-lg shadow-xl shadow-black/80 font-mono text-xs flex items-center gap-2 max-w-md animate-bounce animate-pulse">
          <Info size={14} className="text-indigo-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Match Finished Victory overlay portal */}
      {matchFinishedData && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#0b0b10] border border-zinc-800 p-8 rounded-2xl w-full max-w-md text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="inline-flex p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-6">
              <Swords size={32} />
            </div>

            <h2 className="text-xl font-black uppercase tracking-wider text-white font-mono">
              Match Completed // Defusal Concluded
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
                    const scoreObj = matchFinishedData.scores?.find(p => String(p.userId) === String(activeUserId));
                    const delta = scoreObj ? scoreObj.eloDelta : 0;
                    return delta >= 0 ? 'text-emerald-400' : 'text-red-400';
                  })()
                }`}>
                  {(() => {
                    const scoreObj = matchFinishedData.scores?.find(p => String(p.userId) === String(activeUserId));
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

      {/* Match initial layout transition overlay */}
      {(matchPhase === 'INITIATING' || matchPhase === 'COUNTDOWN') && (
        <MatchInitOverlay
          userA={{
            username: activeUsername,
            rating: user?.elo || user?.rating || 1482,
          }}
          userB={{
            username: opponentProfile?.username || 'Challenger',
            rating: opponentProfile?.rating || 1540,
          }}
          onHandoff={handleOverlayHandoff}
        />
      )}

      {/* Lobby dashboard state */}
      {matchPhase === 'IDLE' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden bg-[#030307]">
          <div className="w-full max-w-4xl flex items-center justify-between mb-8">
            <button
              onClick={handleLeaveArena}
              className="flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors bg-zinc-900/80 border border-zinc-800 px-4 py-2 rounded-lg cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>LEAVE ARENA LOBBY</span>
            </button>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/50 border border-indigo-500/20 px-3 py-1 rounded-full uppercase tracking-widest">
              LOBBY STATUS: {connectionState}
            </span>
          </div>

          <div className="w-full max-w-4xl bg-[#0a0a10] border border-zinc-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden text-center">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-6 inline-flex">
              <Swords size={32} />
            </div>

            <h1 className="text-xl md:text-2xl font-black tracking-wider uppercase text-white font-mono">
              1v1 RANKED COMBAT ARENA
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-2 max-w-lg mx-auto leading-relaxed">
              Secure custom sandbox room code: <span className="text-indigo-400 font-bold">{matchId}</span>.
              <br />
              Speed & accuracy determine points. Speed threshold rule is active.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-8 text-left max-w-2xl mx-auto">
              <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl">
                <span className="text-[9px] font-mono uppercase text-zinc-500">Problem Set</span>
                <div className="text-xs font-mono font-bold text-white mt-1">4 Algorithmic</div>
              </div>
              <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl">
                <span className="text-[9px] font-mono uppercase text-zinc-500">Shop Buffs</span>
                <div className="text-xs font-mono font-bold text-emerald-400 mt-1">AP ACTIVE</div>
              </div>
              <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl">
                <span className="text-[9px] font-mono uppercase text-zinc-500">Immunities</span>
                <div className="text-xs font-mono font-bold text-indigo-400 mt-1">ENABLED</div>
              </div>
              <div className="bg-zinc-950/60 border border-zinc-900 p-4 rounded-xl">
                <span className="text-[9px] font-mono uppercase text-zinc-500">Winner Cap</span>
                <div className="text-xs font-mono font-bold text-amber-400 mt-1">ELO ± 25</div>
              </div>
            </div>

            {isHost ? (
              <button
                onClick={handleStartMatch}
                className="mt-10 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs tracking-wider uppercase rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Zap size={14} />
                <span>START MATCH & PRIMING COMPILER</span>
              </button>
            ) : (
              <div className="mt-10 px-8 py-3.5 bg-zinc-950 border border-zinc-900 text-zinc-500 font-mono font-bold text-xs uppercase rounded-xl inline-flex items-center gap-2 cursor-not-allowed">
                <Lock size={14} />
                <span>WAITING FOR HOST TO TRIGGER START COMMAND...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main active arena cockpit view */}
      {matchPhase === 'ACTIVE' && (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
          
          {/* Top Panel HUD Header */}
          <header className="h-14 bg-[#0a0a0f] border-b border-zinc-900 px-4 flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLeaveArena}
                className="p-1.5 text-zinc-400 hover:text-white bg-zinc-950 border border-zinc-900 rounded-md transition-colors"
                title="Forfeit Match"
              >
                <ArrowLeft size={14} />
              </button>
              
              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-bold text-white uppercase tracking-wider">
                  1v1 Combat Dashboard
                </span>
                <span className="text-[9px] font-mono text-zinc-500">
                  ROOM ID: {matchId}
                </span>
              </div>
            </div>

            {/* Timer HUD */}
            <div className="flex items-center gap-2 bg-zinc-950 px-3 py-1 rounded-md border border-zinc-900 font-mono text-xs text-indigo-400">
              <Clock size={12} className="animate-pulse text-indigo-500" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            {/* Language Selection */}
            <div className="flex items-center gap-3">
              <select
                className="bg-zinc-950 border border-zinc-900 text-xs text-zinc-300 font-mono rounded-md px-2 py-1 focus:outline-none focus:border-indigo-500"
                value={currentLanguage}
                onChange={(e) => setLanguageForCurrentProblem(e.target.value)}
              >
                <option value="python">Python 3</option>
                <option value="cpp">C++ 17</option>
                <option value="java">Java</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>
          </header>

          {/* Core Arena Splitting Workspace */}
          <div className="flex-1 min-h-0 flex overflow-hidden relative">
            
            {/* LEFT COLUMN: Problems & Submissions Panel (Resizable / Collapsible) */}
            <div 
              className={`resizable-panel h-full min-h-0 border-r border-zinc-900 bg-[#07070a] flex flex-col shrink-0 ${
                isLeftPanelCollapsed ? 'w-0 opacity-0 pointer-events-none' : ''
              }`}
              style={{ width: isLeftPanelCollapsed ? 0 : `${leftPanelWidth}px` }}
            >
              {/* Problem Switcher Tabs inside Panel */}
              <div className="p-3 bg-zinc-950 border-b border-zinc-900 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  // Core Workspace Panel
                </span>
                <button
                  onClick={() => setIsLeftPanelCollapsed(true)}
                  className="p-1 hover:text-white text-zinc-500 rounded bg-zinc-900 transition-colors"
                  title="Collapse panel"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>

              {/* Problem Select Grid Switcher */}
              <div className="grid grid-cols-4 gap-1 p-2 bg-[#09090d] border-b border-zinc-900 shrink-0">
                {activeProblemsList.map((p, idx) => (
                  <button
                    key={p.id || idx}
                    onClick={() => setActiveProblemIndex(idx)}
                    className={`py-1.5 rounded text-[10px] font-mono transition-all uppercase ${
                      activeProblemIndex === idx
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-900'
                    }`}
                  >
                    P{idx + 1}
                  </button>
                ))}
              </div>

              {/* Internal Tab Bar: Description vs Submissions */}
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

              {/* Viewport content */}
              <div className="flex-1 overflow-y-auto min-h-0 select-text bg-[#07070a] p-4">
                {activeLeftTab === 'description' ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        P{activeProblemIndex + 1}: {activeProblem?.title}
                      </span>
                      <span className={`difficulty-badge ${activeProblem?.difficulty?.toLowerCase() || 'easy'}`}>
                        {activeProblem?.difficulty || 'EASY'}
                      </span>
                    </div>
                    <ProblemDescription
                      problem={activeProblem}
                      submissions={[]}
                      loadingSubmissions={false}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 font-mono">
                    <h3 className="text-xs font-bold text-zinc-300 uppercase mb-1">
                      Submission Ledger for P{activeProblemIndex + 1}
                    </h3>
                    
                    {problemSubmissions.length === 0 ? (
                      <div className="text-zinc-500 text-[10px] py-8 text-center border border-dashed border-zinc-900 rounded">
                        No submissions recorded for this problem yet. Correct solutions add ELO points!
                      </div>
                    ) : (
                      problemSubmissions.map((sub, sIdx) => {
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
            </div>

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
                className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-zinc-950 hover:bg-zinc-900 border-r border-t border-b border-zinc-800 text-zinc-400 hover:text-white px-1.5 py-4 rounded-r-md flex flex-col items-center gap-2 text-[10px] font-mono tracking-widest cursor-pointer"
              >
                <ChevronRight size={14} />
                <span className="writing-mode-vertical uppercase">Problems</span>
              </button>
            )}

            {/* CENTER COLUMN: Monaco Editor Workspace Area (With min-w-0 for proper fluid shrinking) */}
            <div className="flex-1 min-h-0 min-w-0 bg-[#050509] flex flex-col relative">
              <div className={`flex-1 min-h-0 ${activeSabotage === 'blur' ? 'sabotage-blurred' : ''}`}>
                <InteractiveEditor
                  code={currentCode}
                  setCode={setCodeForCurrentProblem}
                  selectedLanguage={currentLanguage}
                  isRunning={isRunning}
                  isSubmitting={isSubmitting}
                  terminalOutput={currentTerminalOutput}
                  isTerminalOpen={isTerminalOpen}
                  setIsTerminalOpen={setIsTerminalOpen}
                  onRun={handleRunCode}
                  onSubmit={handleSubmitCode}
                  readOnly={isEditorLocked || activeSabotage === 'monaco-jam'}
                  enableSuggestions={isSuggestionsEnabled}
                />
              </div>

              {/* Sabotage Overlay Warning Banner on screen bottom */}
              {activeSabotage && (
                <div className="absolute bottom-16 left-4 right-4 z-20 p-3 rounded-lg border flex items-center justify-between font-mono text-xs sabotage-overlay bg-red-950/80 border-red-500/30 text-red-300">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400 animate-pulse animate-bounce" />
                    <span>
                      WARNING: Opponent cast <span className="font-bold uppercase">{activeSabotage}</span>! Duration remaining: {sabotageTimeLeft}s
                    </span>
                  </div>
                  {myAp >= 20 && (
                    <button
                      onClick={handleCastCleanse}
                      className="px-3 py-1 bg-red-500 hover:bg-red-400 text-white rounded text-[10px] font-bold uppercase transition-all shadow-md cursor-pointer"
                    >
                      Use Cleanse (20 AP)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Drag Resizer Bar */}
            <div 
              onMouseDown={startResizeRight} 
              className="resize-handle"
              title="Drag to resize telemetry panel"
            />

            {/* RIGHT COLUMN: Telemetry and Shop HUD Dashboard */}
            <div 
              className="h-full min-h-0 border-l border-zinc-900 bg-[#07070a] flex flex-col p-4 gap-4 shrink-0 overflow-y-auto select-none"
              style={{ width: `${rightPanelWidth}px` }}
            >
              
              {/* Telemetry section: Scores */}
              <div className="bg-zinc-950/80 border border-zinc-900 rounded-xl p-4 flex flex-col gap-3 shrink-0">
                <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                  // Combat Telemetry
                </span>
                
                {/* Me Score */}
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-mono font-bold text-white">{activeUsername} (You)</span>
                    <span className="text-[9px] font-mono text-zinc-500">Status: Active</span>
                  </div>
                  <span className="text-lg font-mono font-black text-indigo-400 score-value">{myScore} pts</span>
                </div>

                {/* Mana AP Bar */}
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex justify-between text-[9px] font-mono text-zinc-400">
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
                    <span className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1.5">
                      {opponentProfile?.username || 'Opponent'}
                      <span className="relative flex w-1.5 h-1.5">
                        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative block w-1.5 h-1.5 rounded-full bg-emerald-500 active-typing-pulse"></span>
                      </span>
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500">
                      Problems: [{opponentProfile?.solvedCount || 0}/4]
                    </span>
                  </div>
                  <span className="text-base font-mono font-bold text-zinc-400">{opponentScore} pts</span>
                </div>
              </div>

              {/* TACTICAL SHOP PANEL */}
              <div className="flex-1 flex flex-col bg-zinc-950/80 border border-zinc-900 rounded-xl p-4 gap-3 min-h-[280px]">
                <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={11} className="text-indigo-400 font-bold" />
                  <span>Tactical Conductor Shop</span>
                </span>

                <div className="flex flex-col gap-2 overflow-y-auto">
                  {/* Shop Item: Autocomplete */}
                  <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-zinc-200 flex items-center gap-1">
                        <Keyboard size={11} className="text-emerald-400" />
                        Monaco Suggestions
                      </span>
                      <span className="text-[9px] font-mono text-indigo-400">30 AP</span>
                    </div>
                    <button
                      disabled={myAp < 30 || isSuggestionsEnabled}
                      onClick={handleBuyAutocomplete}
                      className="w-full mt-1.5 py-1.5 bg-zinc-950 hover:bg-zinc-900 disabled:bg-zinc-950/20 disabled:text-zinc-600 disabled:border-zinc-950/10 text-white border border-zinc-800 rounded text-[9px] font-mono uppercase font-bold cursor-pointer"
                    >
                      {isSuggestionsEnabled ? 'Active' : 'Buy Autocomplete (60s)'}
                    </button>
                  </div>

                  {/* Shop Item: Hint */}
                  <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-zinc-200 flex items-center gap-1">
                        <HelpCircle size={11} className="text-amber-400" />
                        Unlock Problem Hint
                      </span>
                      <span className="text-[9px] font-mono text-indigo-400">35 AP</span>
                    </div>
                    <button
                      disabled={myAp < 35}
                      onClick={handleBuyHint}
                      className="w-full mt-1.5 py-1.5 bg-zinc-950 hover:bg-zinc-900 disabled:bg-zinc-950/20 disabled:text-zinc-600 disabled:border-zinc-950/10 text-white border border-zinc-800 rounded text-[9px] font-mono uppercase font-bold cursor-pointer"
                    >
                      Reveal Hint
                    </button>
                  </div>

                  {/* Shop Item: Editor lock */}
                  <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-zinc-200 flex items-center gap-1">
                        <Lock size={11} className="text-red-400" />
                        Editor Jam (Sabotage)
                      </span>
                      <span className="text-[9px] font-mono text-indigo-400">50 AP</span>
                    </div>
                    <button
                      disabled={myAp < 50}
                      onClick={handleCastJam}
                      className="w-full mt-1.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 disabled:bg-zinc-950/20 disabled:text-zinc-600 disabled:border-zinc-950/10 text-red-300 border border-red-900/20 rounded text-[9px] font-mono uppercase font-bold cursor-pointer"
                    >
                      Cast Keyboard Jam (5s)
                    </button>
                  </div>

                  {/* Shop Item: Blur screen */}
                  <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-zinc-200 flex items-center gap-1">
                        <EyeOff size={11} className="text-red-400" />
                        Blur Canvas (Sabotage)
                      </span>
                      <span className="text-[9px] font-mono text-indigo-400">40 AP</span>
                    </div>
                    <button
                      disabled={myAp < 40}
                      onClick={handleCastBlur}
                      className="w-full mt-1.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 disabled:bg-zinc-950/20 disabled:text-zinc-600 disabled:border-zinc-950/10 text-red-300 border border-red-900/20 rounded text-[9px] font-mono uppercase font-bold cursor-pointer"
                    >
                      Cast Haze (10s)
                    </button>
                  </div>

                  {/* Shop Item: Blindfold */}
                  <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-zinc-200 flex items-center gap-1">
                        <AlertTriangle size={11} className="text-red-400" />
                        Blindfold (Sabotage)
                      </span>
                      <span className="text-[9px] font-mono text-indigo-400">60 AP</span>
                    </div>
                    <button
                      disabled={myAp < 60}
                      onClick={handleCastBlindfold}
                      className="w-full mt-1.5 py-1.5 bg-red-950/20 hover:bg-red-950/40 disabled:bg-zinc-950/20 disabled:text-zinc-600 disabled:border-zinc-950/10 text-red-300 border border-red-900/20 rounded text-[9px] font-mono uppercase font-bold cursor-pointer"
                    >
                      Cast Blindfold (60s)
                    </button>
                  </div>

                  {/* Shop Item: Shield */}
                  <div className="flex flex-col gap-1 p-2 bg-zinc-900/40 border border-zinc-900/60 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold text-zinc-200 flex items-center gap-1">
                        <Shield size={11} className="text-indigo-400" />
                        Immunity Shield
                      </span>
                      <span className="text-[9px] font-mono text-indigo-400">40 AP</span>
                    </div>
                    <button
                      disabled={myAp < 40}
                      onClick={handleCastImmunity}
                      className="w-full mt-1.5 py-1.5 bg-indigo-950/20 hover:bg-indigo-950/40 disabled:bg-zinc-950/20 disabled:text-zinc-600 disabled:border-zinc-950/10 text-indigo-300 border border-indigo-900/20 rounded text-[9px] font-mono uppercase font-bold cursor-pointer"
                    >
                      Activate Shield (15s)
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default Arena1v1Page;
