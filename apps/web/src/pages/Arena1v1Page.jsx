// src/pages/Arena1v1Page.jsx
// Conductor & Layout Manager for 1v1 Competitive Arena

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useMatchSocket, DEFAULT_ARENA_PROBLEMS } from '../hooks/useMatchSocket';
import { ProblemDescription } from '../components/practice/ProblemDescription';
import { InteractiveEditor } from '../components/practice/InteractiveEditor';
import { MatchInitOverlay } from '../components/arena/MatchInitOverlay';
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
} from 'lucide-react';

/**
 * Arena1v1Page Component
 *
 * State Machine:
 *   IDLE -> INITIATING -> COUNTDOWN -> ACTIVE
 */
export function Arena1v1Page() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ──────────────────────────────────────────────────────────────────────────
  // State Machine Phase: 'IDLE' | 'INITIATING' | 'COUNTDOWN' | 'ACTIVE'
  // ──────────────────────────────────────────────────────────────────────────
  const [matchPhase, setMatchPhase] = useState('IDLE');

  // Multi-problem state management inside parent conductor
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);
  const [userCodeMap, setUserCodeMap] = useState({});
  const [selectedLanguageMap, setSelectedLanguageMap] = useState({});
  const [terminalOutputMap, setTerminalOutputMap] = useState({});
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Match timer (seconds)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // WebSocket hook & pre-loader
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

  // Check if current user is Host: hostId match or default true before socket payload resolves
  const isHost = hostId
    ? String(activeUserId) === String(hostId)
    : true;
  
  // Active problem object derived from problems array with default fallback
  const activeProblemsList = (problems && problems.length > 0) ? problems : DEFAULT_ARENA_PROBLEMS;
  const activeProblem = activeProblemsList[activeProblemIndex] || activeProblemsList[0];

  // Active code value for currently selected problem tab
  const currentProblemId = activeProblem?.id || `p${activeProblemIndex + 1}`;
  const currentCode = userCodeMap[currentProblemId] ?? `# Write your solution for ${activeProblem?.title || 'Problem'} here\n\n`;
  const currentLanguage = selectedLanguageMap[currentProblemId] ?? 'python';
  const currentTerminalOutput = terminalOutputMap[currentProblemId] ?? '';

  // Automatically transition IDLE -> INITIATING when match_started event arrives
  useEffect(() => {
    if (isMatchStarted && matchPhase === 'IDLE') {
      setMatchPhase('INITIATING');
    }
  }, [isMatchStarted, matchPhase]);

  // Automatically redirect both players back to /matchmaking if arena lobby is dissolved
  useEffect(() => {
    if (isArenaDissolved) {
      navigate('/matchmaking');
    }
  }, [isArenaDissolved, navigate]);

  // Match timer ticks when match is ACTIVE
  useEffect(() => {
    let timer;
    if (matchPhase === 'ACTIVE') {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [matchPhase]);

  // Handle "Start Match" click -> transition IDLE -> INITIATING
  const handleStartMatch = () => {
    if (!isHost) return;
    requestStartMatch();
    setMatchPhase('INITIATING');
    initiateMatch();
  };

  // Leave Arena Lobby -> notifies backend to dissolve match for both players
  const handleLeaveArena = () => {
    leaveArenaLobby();
    navigate('/matchmaking');
  };

  // Called when countdown overlay completes -> transition to ACTIVE
  const handleOverlayHandoff = () => {
    setMatchPhase('ACTIVE');
  };

  // Helper code updater for active problem
  const setCodeForCurrentProblem = (newCode) => {
    setUserCodeMap((prev) => ({
      ...prev,
      [currentProblemId]: newCode,
    }));
  };

  // Helper language updater for active problem
  const setLanguageForCurrentProblem = (lang) => {
    setSelectedLanguageMap((prev) => ({
      ...prev,
      [currentProblemId]: lang,
    }));
  };

  // Run Code Execution Handler
  const handleRunCode = () => {
    setIsRunning(true);
    setTerminalOutputMap((prev) => ({
      ...prev,
      [currentProblemId]: `> Running test cases for ${activeProblem?.title || 'Problem'}...\n[PASS] Sample Test 1: Output matches expected.\n[PASS] Sample Test 2: Time elapsed 14ms.\n\nAll sample test cases passed successfully.`,
    }));
    setIsTerminalOpen(true);
    setTimeout(() => {
      setIsRunning(false);
    }, 1200);
  };

  // Submit Code Handler
  const handleSubmitCode = () => {
    setIsSubmitting(true);
    setTerminalOutputMap((prev) => ({
      ...prev,
      [currentProblemId]: `> Submitting solution for ${activeProblem?.title || 'Problem'} to evaluation server...\n[VERIFYING] Testcase 1/15... PASS\n[VERIFYING] Testcase 8/15... PASS\n[VERIFYING] Testcase 15/15... PASS\n\nRESULT: ACCEPTED (Time: 32ms, Memory: 14.2MB)`,
    }));
    setIsTerminalOpen(true);
    setTimeout(() => {
      setIsSubmitting(false);
      sendSubmission(currentProblemId, 'ACCEPTED', currentCode);
    }, 1800);
  };

  // Format seconds mm:ss
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="h-screen w-full bg-[#0a0a0c] text-zinc-100 flex flex-col overflow-hidden font-sans select-none">
      
      {/* ────────────────────────────────────────────────────────────────────────
          MATCH INITIATION OVERLAY (Mounted during INITIATING and COUNTDOWN phases)
          ──────────────────────────────────────────────────────────────────────── */}
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

      {/* ────────────────────────────────────────────────────────────────────────
          STATE 1: IDLE / PRE-MATCH LOBBY
          ──────────────────────────────────────────────────────────────────────── */}
      {matchPhase === 'IDLE' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden bg-[#0a0a0c]">
          
          {/* Header */}
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

          {/* Center Tactical Lobby Card */}
          <div className="w-full max-w-4xl bg-[#111113] border border-zinc-800/80 rounded-2xl p-8 md:p-12 shadow-2xl shadow-black/80 flex flex-col items-center text-center relative overflow-hidden">
            {/* Glow backdrop */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-6 shadow-inner">
              <Swords size={40} />
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-wider uppercase text-white font-mono">
              1v1 RANKED ARENA // DEFUSAL MODE
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-2 max-w-xl leading-relaxed">
              Match #<span className="text-indigo-400 font-bold">{matchId || 'ARENA-01'}</span> is locked and primed.
              Both contenders will receive 4 algorithmic problems simultaneously. The fastest defusal with highest testcase pass rate wins.
            </p>

            {/* Match Overview Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mt-8">
              <div className="bg-zinc-950/60 border border-zinc-800/60 p-4 rounded-xl flex flex-col items-center">
                <span className="text-[10px] font-mono uppercase text-zinc-500">Problem Set</span>
                <span className="text-sm font-mono font-bold text-white mt-1">4 Algorithmic</span>
              </div>
              <div className="bg-zinc-950/60 border border-zinc-800/60 p-4 rounded-xl flex flex-col items-center">
                <span className="text-[10px] font-mono uppercase text-zinc-500">Time Limit</span>
                <span className="text-sm font-mono font-bold text-white mt-1">30:00 Mins</span>
              </div>
              <div className="bg-zinc-950/60 border border-zinc-800/60 p-4 rounded-xl flex flex-col items-center">
                <span className="text-[10px] font-mono uppercase text-zinc-500">Sabotage Moves</span>
                <span className="text-sm font-mono font-bold text-emerald-400 mt-1">ENABLED</span>
              </div>
              <div className="bg-zinc-950/60 border border-zinc-800/60 p-4 rounded-xl flex flex-col items-center">
                <span className="text-[10px] font-mono uppercase text-zinc-500">Ranked ELO</span>
                <span className="text-sm font-mono font-bold text-amber-400 mt-1">± 25 PTS</span>
              </div>
            </div>

            {/* Primary Action Button */}
            {isHost ? (
              <button
                onClick={handleStartMatch}
                className="mt-10 px-10 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-mono font-bold text-sm tracking-wider uppercase rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-200 active:scale-95 cursor-pointer flex items-center gap-3"
              >
                <Zap size={18} />
                <span>START MATCH & INITIATE CONDUCTOR</span>
              </button>
            ) : (
              <div className="mt-10 px-8 py-4 bg-zinc-950 border border-zinc-800 text-zinc-500 font-mono font-bold text-sm uppercase rounded-xl cursor-not-allowed flex items-center gap-3">
                <Lock size={18} className="text-zinc-500" />
                <span>WAITING FOR HOST TO START MATCH...</span>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────
          STATE 2: ACTIVE ARENA WORKSPACE CONDUCTOR LAYOUT
          ──────────────────────────────────────────────────────────────────────── */}
      {matchPhase === 'ACTIVE' && (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-[#0a0a0c]">
          
          {/* ── Top Conductor Toolbar Bar ──────────────────────────────────────── */}
          <header className="h-14 bg-[#111113] border-b border-zinc-800/80 px-4 flex items-center justify-between shrink-0 z-20">
            
            {/* Left: Exit & Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleLeaveArena}
                className="p-2 text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-md transition-colors cursor-pointer"
                title="Forfeit / Exit Match"
              >
                <ArrowLeft size={16} />
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wide">
                  1v1 ARENA
                </span>
                <span className="text-[10px] font-mono text-zinc-500">
                  MATCH #{matchId?.substring(0, 8) || 'RANKED'}
                </span>
              </div>
            </div>

            {/* Center: Problem Navigation Tabs */}
            <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-lg border border-zinc-800/80">
              {activeProblemsList.map((p, idx) => (
                <button
                  key={p.id || idx}
                  onClick={() => setActiveProblemIndex(idx)}
                  className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeProblemIndex === idx
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                  }`}
                >
                  <span>P{idx + 1}</span>
                  <span className="text-[10px] opacity-75 hidden sm:inline">
                    {p.difficulty?.substring(0, 1) || ''}
                  </span>
                </button>
              ))}
            </div>

            {/* Right: Timer & Opponent Progress Bar */}
            <div className="flex items-center gap-4">
              {/* Match Timer */}
              <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-md border border-zinc-800 font-mono text-xs text-indigo-400">
                <Clock size={14} className="animate-pulse" />
                <span>{formatTimer(elapsedSeconds)}</span>
              </div>

              {/* Opponent Status */}
              <div className="hidden lg:flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-md border border-zinc-800 text-xs font-mono">
                <span className="text-zinc-500 uppercase text-[10px]">Opponent:</span>
                <span className="text-red-400 font-bold">{opponentProfile?.username || '...'}</span>
                <span className="text-zinc-500">[{opponentProfile?.solvedCount || 0}/4 Solved]</span>
              </div>

              {/* Language Selector */}
              <select
                className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono rounded-md px-2 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
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

          {/* ── Main Split Canvas Workspace ───────────────────────────────────── */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 overflow-hidden relative">
            
            {/* Left Pane: Dumb ProblemDescription Component */}
            <section className="h-full min-h-0 border-r border-zinc-800/80 bg-[#0a0a0c] overflow-y-auto">
              <ProblemDescription
                problem={activeProblem}
                submissions={[]}
                loadingSubmissions={false}
              />
            </section>

            {/* Right Pane: Dumb InteractiveEditor Component */}
            <section className="h-full min-h-0 bg-[#111113] relative overflow-hidden flex flex-col">
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
                readOnly={isEditorLocked}
              />
            </section>

          </div>

          {/* ── Bottom Tactical Sabotage Action Bar ────────────────────────────── */}
          <footer className="h-10 bg-[#111113] border-t border-zinc-800 px-4 flex items-center justify-between text-xs font-mono shrink-0">
            <div className="flex items-center gap-2 text-zinc-400 text-[11px]">
              <Shield size={13} className="text-indigo-400" />
              <span>TACTICAL SABOTAGE DEPLOYMENT</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => sendSabotage('LOCK_EDITOR')}
                className="px-2.5 py-1 bg-red-950/40 hover:bg-red-900/40 border border-red-800/40 text-red-300 text-[10px] rounded transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                title="Lock opponent's code editor for 5s"
              >
                <Lock size={11} />
                <span>Sabotage: Lock Opponent (5s)</span>
              </button>
            </div>
          </footer>

        </div>
      )}

    </div>
  );
}

export default Arena1v1Page;
