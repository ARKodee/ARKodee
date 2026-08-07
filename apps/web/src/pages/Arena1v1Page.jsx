// src/pages/Arena1v1Page.jsx
// Arena1v1Page — live 1v1 competitive arena with split-pane workspace
// Uses design system tokens, no Tailwind
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../store/ThemeContext';
import { useMatchSocket } from '../hooks/useMatchSocket';
import { ProblemDescription } from '../components/practice/ProblemDescription';
import { MatchInitOverlay } from '../components/arena/MatchInitOverlay';
import { runProblemCode, submitProblemCode } from '../lib/problems';
import { getUserProfile } from '../lib/auth';
import {
  ArrowLeft, Swords, Clock, Zap, Lock, Shield,
  CheckCircle2, CircleDot, Circle, ChevronDown, ChevronUp,
  Play, UploadCloud, HelpCircle, EyeOff, Keyboard, AlertTriangle,
  Sparkles, ChevronLeft, ChevronRight, Columns, Plus, X,
  Info,
} from 'lucide-react';
import './Arena1v1Page.css';

// ─── Language Options ──────────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'python',     label: 'Python 3',    monaco: 'python' },
  { id: 'cpp',        label: 'C++ 17',      monaco: 'cpp' },
  { id: 'java',       label: 'Java',        monaco: 'java' },
  { id: 'javascript', label: 'JavaScript',  monaco: 'javascript' },
];

const LANGUAGE_TEMPLATES = {
  python: `class Solution:\n    def solve(self, nums: List[int], target: int) -> List[int]:\n        # Write your solution here\n        pass\n`,
  cpp: `#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> solve(vector<int>& nums, int target) {\n        // Write your solution here\n        return {};\n    }\n};\n`,
  java: `import java.util.*;\n\nclass Solution {\n    public int[] solve(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}\n`,
  javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar solve = function(nums, target) {\n    // Write your solution here\n};\n`,
};

// ─── Monaco Custom Themes ──────────────────────────────────────────────────────
const ARKODEE_DARK_THEME = {
  base: 'vs-dark', inherit: true,
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
    'editor.background': '#111113', 'editor.foreground': '#e8e8f0',
    'editor.lineHighlightBackground': '#1a1a1f', 'editor.selectionBackground': '#2a2a3a',
    'editorLineNumber.foreground': '#555568', 'editorLineNumber.activeForeground': '#8888a0',
    'editorGutter.background': '#111113', 'editorWidget.background': '#16161a',
    'editorWidget.border': '#1f1f24', 'editor.inactiveSelectionBackground': '#1f1f28',
    'editorCursor.foreground': '#818cf8', 'editorIndentGuide.background': '#1f1f24',
    'editorIndentGuide.activeBackground': '#2a2a32',
  },
};

const ARKODEE_LIGHT_THEME = {
  base: 'vs', inherit: true,
  rules: [
    { token: '', foreground: '0f0f14', background: 'f9f9fb' },
    { token: 'comment', foreground: '9292a0', fontStyle: 'italic' },
    { token: 'keyword', foreground: '6d58f5' },
    { token: 'string', foreground: '059669' },
    { token: 'number', foreground: 'd97706' },
    { token: 'type', foreground: '6d58f5' },
    { token: 'function', foreground: '0f0f14' },
  ],
  colors: {
    'editor.background': '#f9f9fb', 'editor.foreground': '#0f0f14',
    'editor.lineHighlightBackground': '#f0f0f5', 'editor.selectionBackground': '#e4e4ec',
    'editorLineNumber.foreground': '#9292a0', 'editorLineNumber.activeForeground': '#52525e',
    'editorGutter.background': '#f9f9fb', 'editorWidget.background': '#ffffff',
    'editorWidget.border': '#e4e4ec', 'editor.inactiveSelectionBackground': '#ededf5',
    'editorCursor.foreground': '#6d58f5', 'editorIndentGuide.background': '#e4e4ec',
    'editorIndentGuide.activeBackground': '#c8c8d8',
  },
};

// ─── Sub-components ────────────────────────────────────────────────────────────
function DifficultyBadge({ difficulty }) {
  return <span className={`a1-difficulty-badge a1-difficulty-badge--${difficulty?.toLowerCase()}`}>{difficulty}</span>;
}

function ProblemStatusIcon({ status }) {
  if (status === 'solved')   return <CheckCircle2 size={14} className="a1-problem-tab-icon a1-problem-tab-icon--solved" />;
  if (status === 'attempted') return <CircleDot   size={14} className="a1-problem-tab-icon a1-problem-tab-icon--attempted" />;
  return <Circle size={14} className="a1-problem-tab-icon a1-problem-tab-icon--untouched" />;
}

// ─── Rules Modal ───────────────────────────────────────────────────────────────
function RulesModal({ onDismiss, myUsername, opponentUsername, myRating, opponentRating }) {
  return (
    <div className="a1-rules-overlay">
      <div className="a1-rules-card">
        <div className="a1-rules-accent-bar" />
        
        {/* Left Column */}
        <div className="a1-rules-col-left">
          <div className="a1-rules-header">
            <div className="a1-rules-icon"><Swords size={28} /></div>
            <div>
              <h2 className="a1-rules-title">Match Rules</h2>
              <p className="a1-rules-subtitle">Review before the duel begins</p>
            </div>
          </div>

          <div className="a1-rules-players">
            <div className="a1-rules-player">
              <div className="a1-rules-avatar">{myUsername[0].toUpperCase()}</div>
              <span className="a1-rules-player-name">{myUsername}</span>
              <span className="a1-rules-player-elo">{myRating} ELO</span>
            </div>
            <div className="a1-rules-vs">VS</div>
            <div className="a1-rules-player">
              <div className="a1-rules-avatar a1-rules-avatar--opp">{opponentUsername[0].toUpperCase()}</div>
              <span className="a1-rules-player-name">{opponentUsername}</span>
              <span className="a1-rules-player-elo">{opponentRating} ELO</span>
            </div>
          </div>

          <div className="a1-rules-grid">
            <div className="a1-rules-item">
              <Clock size={14} className="a1-rules-item-icon" />
              <div>
                <div className="a1-rules-item-label">Time Limit</div>
                <div className="a1-rules-item-value">60 Minutes</div>
              </div>
            </div>
            <div className="a1-rules-item">
              <Swords size={14} className="a1-rules-item-icon" />
              <div>
                <div className="a1-rules-item-label">Problems</div>
                <div className="a1-rules-item-value">4 Algorithmic</div>
              </div>
            </div>
            <div className="a1-rules-item">
              <Sparkles size={14} className="a1-rules-item-icon" />
              <div>
                <div className="a1-rules-item-label">AP / Sabotage</div>
                <div className="a1-rules-item-value">Enabled</div>
              </div>
            </div>
            <div className="a1-rules-item">
              <Zap size={14} className="a1-rules-item-icon" />
              <div>
                <div className="a1-rules-item-label">ELO Stakes</div>
                <div className="a1-rules-item-value">± 25 pts</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="a1-rules-col-right">
          <ul className="a1-rules-list">
            <li>Solve problems correctly to earn score points. Fastest correct solver wins.</li>
            <li>You earn AP by running code, submitting, and solving problems.</li>
            <li>Spend AP in the Tactical Shop to buy advantages or cast sabotages on your opponent.</li>
            <li>In 1v1 mode, wrong answers show only which testcase failed — not the actual input/output.</li>
            <li>If the <strong>Blindfold</strong> sabotage is active on you, even the failed testcase index is hidden.</li>
            <li>Leaving mid-match forfeits the duel and deducts ELO.</li>
          </ul>

          <button className="a1-rules-start-btn" onClick={onDismiss}>
            <Zap size={16} />
            I'm Ready — Start Match
          </button>
        </div>

      </div>
    </div>
  );
}

const getProblemHint = (problemId) => {
  const hints = {
    'reverse-string': 'Swap characters in-place using two pointers (left and right) moving towards each other.',
    'move-zeroes': 'Use a write pointer to keep track of non-zero elements, then fill the remaining elements with zeroes.',
    'sort-colors': 'Use the Dutch National Flag algorithm (three pointers: low, mid, high) to sort in one pass.',
    'rotate-array': 'Try reversing parts of the array: reverse the whole array, reverse first k, then reverse the rest.',
  };
  const key = String(problemId || '').toLowerCase();
  for (const k of Object.keys(hints)) {
    if (key.includes(k)) return hints[k];
  }
  return 'Check constraint boundaries, input lengths, and handle empty/null inputs.';
};

// ─── Main Page Component ───────────────────────────────────────────────────────
export function Arena1v1Page() {
  const { theme } = useTheme();
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const editorRef = useRef(null);

  // Match phase: 'IDLE' | 'RULES' | 'INITIATING' | 'COUNTDOWN' | 'ACTIVE'
  const [matchPhase, setMatchPhase] = useState('IDLE');
  const [myProfile, setMyProfile] = useState(null);

  // Problem navigation
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);
  const [userCodeMap, setUserCodeMap] = useState({});
  const [selectedLanguageMap, setSelectedLanguageMap] = useState({});

  // Console / terminal state — practice-style
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const [activeTerminalTab, setActiveTerminalTab] = useState('testcases');
  const [terminalOutputMap, setTerminalOutputMap] = useState({});
  const [testCaseResultsMap, setTestCaseResultsMap] = useState({});
  const [visibleTestCasesMap, setVisibleTestCasesMap] = useState({});
  const [activeCaseIdx, setActiveCaseIdx] = useState(0);
  const [submissionResultMap, setSubmissionResultMap] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Layout states
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(380);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(280);

  // Right panel internal sections collapse
  const [isShopCollapsed, setIsShopCollapsed] = useState(false);
  const [isTelemetryCollapsed, setIsTelemetryCollapsed] = useState(false);

  // Submissions list
  const [submissionsList, setSubmissionsList] = useState([]);

  // Voting states for tie resolution
  const [selectedVote, setSelectedVote] = useState(null);
  const [isVoteConfirmed, setIsVoteConfirmed] = useState(false);

  // Active Powerups & Sabotages
  const [autocompleteActiveUntil, setAutocompleteActiveUntil] = useState(0);
  const [opponentSabotageActiveUntil, setOpponentSabotageActiveUntil] = useState(0);
  const [localShieldActiveUntil, setLocalShieldActiveUntil] = useState(0);

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // WebSocket hook
  const {
    problems, isMatchReady, isMatchStarted, isArenaDissolved,
    hostId, opponentProfile, opponentProgress, isEditorLocked,
    connectionState, requestStartMatch, leaveArenaLobby, initiateMatch,
    sendSubmission, sendSabotage, sendShield, startedAt,
    myScore, myAp, opponentScore, opponentAp, activeSabotage, sabotageTimeLeft,
    myShieldActiveUntil, matchFinishedData, toastMessage, setToastMessage,
    roomState, socket,
  } = useMatchSocket(matchId);

  const activeUserId = user?.id || user?.userId;
  const activeUsername = user?.firstName || user?.username || user?.name || user?.email?.split('@')[0] || 'Player';
  const submissionsStorageKey = matchId ? `arena_subs_${matchId}_${activeUserId}` : '';

  // Fetch user profile
  useEffect(() => {
    getUserProfile().then(setMyProfile).catch(() => {});
  }, []);

  // Load saved submissions
  useEffect(() => {
    if (submissionsStorageKey) {
      try {
        const saved = localStorage.getItem(submissionsStorageKey);
        if (saved) setSubmissionsList(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, [submissionsStorageKey]);

  const saveSubmissions = (newSubs) => {
    setSubmissionsList(newSubs);
    if (submissionsStorageKey) localStorage.setItem(submissionsStorageKey, JSON.stringify(newSubs));
  };

  const myRating = myProfile?.duelRating || user?.duelRating || 1200;
  const isHost = hostId ? String(activeUserId) === String(hostId) : true;
  const activeProblemsList = problems || [];
  const activeProblem = activeProblemsList[activeProblemIndex] || activeProblemsList[0];
  const currentProblemId = activeProblem?.id || `p${activeProblemIndex + 1}`;
  const currentLanguage = selectedLanguageMap[currentProblemId] ?? 'python';
  const currentCode = userCodeMap[currentProblemId] ?? activeProblem?.boilerplate?.[currentLanguage] ?? activeProblem?.templates?.[currentLanguage] ?? LANGUAGE_TEMPLATES[currentLanguage] ?? `# Write your solution here\n\n`;
  const currentTerminalOutput = terminalOutputMap[currentProblemId] ?? '';
  const currentTestCaseResults = testCaseResultsMap[currentProblemId] ?? [];
  const currentSubmissionResult = submissionResultMap[currentProblemId] ?? null;
  const currentVisibleTestCases = visibleTestCasesMap[currentProblemId] ?? (
    activeProblem?.sample_input
      ? activeProblem.sample_input.map((inp, i) => ({
          id: `sample-${i}`,
          label: `Case ${i + 1}`,
          input: inp,
          expected_output: activeProblem.sample_output?.[i] ?? '',
        }))
      : []
  );
  const problemSubmissions = submissionsList.filter(s => s.problemId === currentProblemId);
  const isSuggestionsEnabled = autocompleteActiveUntil > Date.now();
  const isBlindfolded = activeSabotage === 'blindfold';

  const hasOpponent = opponentProfile?.username && opponentProfile.username !== 'OPPONENT';
  const opponentInitial = hasOpponent ? opponentProfile.username[0].toUpperCase() : '?';
  const opponentDisplayName = hasOpponent ? opponentProfile.username : 'Challenger';
  const opponentDisplayRating = hasOpponent && opponentProfile.rating ? opponentProfile.rating : 1200;

  // ── Timers & Phase Transitions ──────────────────────────────────────────────
  useEffect(() => {
    if (!startedAt || matchPhase === 'IDLE' || matchPhase === 'RULES') return;
    
    const checkExpiry = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
      setElapsedSeconds(elapsed);

      const limit = roomState?.isOvertime ? 600 : 3600;
      const refTime = roomState?.isOvertime ? roomState.overtimeStartedAt : startedAt;
      const actualElapsed = Math.max(0, Math.floor((Date.now() - new Date(refTime).getTime()) / 1000));

      if (actualElapsed >= limit && socket && socket.connected) {
        socket.emit('check_match_expiry', { matchId });
      }
    };

    checkExpiry();
    const id = setInterval(checkExpiry, 1000);
    return () => clearInterval(id);
  }, [startedAt, matchPhase, roomState, socket, matchId]);

  useEffect(() => {
    if (isMatchStarted) {
      if (startedAt) {
        const diff = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
        // Only skip to ACTIVE if the match has been running for a long time (e.g., reconnecting after 60s)
        if (diff > 60 && matchPhase === 'IDLE') {
          setMatchPhase('ACTIVE');
          return;
        }
      }
      if (matchPhase === 'IDLE') setMatchPhase('INITIATING');
    }
  }, [isMatchStarted, startedAt, matchPhase]);

  useEffect(() => { if (isArenaDissolved) navigate('/matchmaking'); }, [isArenaDissolved, navigate]);

  useEffect(() => {
    if (toastMessage) { const t = setTimeout(() => setToastMessage(''), 5000); return () => clearTimeout(t); }
  }, [toastMessage, setToastMessage]);

  useEffect(() => {
    if (roomState?.status !== 'TIE_PROMPT') {
      setSelectedVote(null);
      setIsVoteConfirmed(false);
    }
  }, [roomState?.status]);

  // Sync visible test cases when switching problems
  useEffect(() => {
    if (!currentProblemId || visibleTestCasesMap[currentProblemId]) return;
    if (activeProblem?.sample_input?.length > 0) {
      setVisibleTestCasesMap(prev => ({
        ...prev,
        [currentProblemId]: activeProblem.sample_input.map((inp, i) => ({
          id: `sample-${i}`, label: `Case ${i + 1}`,
          input: inp, expected_output: activeProblem.sample_output?.[i] ?? '',
        })),
      }));
    }
  }, [currentProblemId, activeProblem]);

  // ── Drag Resize Handlers ────────────────────────────────────────────────────
  const startResizeLeft = (e) => {
    e.preventDefault();
    const startX = e.clientX, startWidth = leftPanelWidth;
    const doDrag = (mv) => setLeftPanelWidth(Math.max(260, Math.min(560, startWidth + (mv.clientX - startX))));
    const stopDrag = () => { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); };
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const startResizeRight = (e) => {
    e.preventDefault();
    const startX = e.clientX, startWidth = rightPanelWidth;
    const doDrag = (mv) => setRightPanelWidth(Math.max(220, Math.min(420, startWidth - (mv.clientX - startX))));
    const stopDrag = () => { document.removeEventListener('mousemove', doDrag); document.removeEventListener('mouseup', stopDrag); };
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  const handleTerminalMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizingTerminal(true);
    const startY = e.clientY;
    const termEl = e.currentTarget.parentElement;
    const startH = termEl ? termEl.offsetHeight : 220;
    const parentH = termEl?.parentElement?.offsetHeight || 600;
    const move = (mv) => setTerminalHeight(Math.min(Math.max(startH + (startY - mv.clientY), 120), parentH * 0.72));
    const up = () => { setIsResizingTerminal(false); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }, []);

  // ── Match Controls ──────────────────────────────────────────────────────────
  const handleStartMatch = () => {
    if (!isHost) return;
    requestStartMatch();
    setMatchPhase('RULES');
    // Note: initiateMatch() removed — it emitted 'initiate_match' which has no server handler
  };

  const handleLeaveArena = () => {
    if (matchPhase === 'ACTIVE' && !matchFinishedData) {
      if (!window.confirm('Are you sure you want to abandon the match? You will forfeit and lose ELO!')) return;
    }
    leaveArenaLobby();
    navigate('/matchmaking');
  };

  const handleOverlayHandoff = useCallback(() => {
    setMatchPhase('RULES');
  }, []);

  // ── Code Handlers ───────────────────────────────────────────────────────────
  const handleCodeChange = (newCode) => setUserCodeMap(prev => ({ ...prev, [currentProblemId]: newCode }));
  const handleLanguageChange = (lang) => setSelectedLanguageMap(prev => ({ ...prev, [currentProblemId]: lang }));

  // ── Run Code ────────────────────────────────────────────────────────────────
  const handleRunCode = async () => {
    const problemSlug = activeProblem?.slug || activeProblem?.id;
    if (!problemSlug) return;
    setIsRunning(true);
    setIsTerminalOpen(true);
    setActiveTerminalTab('testcases');
    setTerminalOutputMap(prev => ({ ...prev, [currentProblemId]: '> Running against sample test cases...' }));
    setTestCaseResultsMap(prev => ({ ...prev, [currentProblemId]: [] }));
    try {
      const res = await runProblemCode(problemSlug, currentCode, currentLanguage, currentVisibleTestCases);
      setTestCaseResultsMap(prev => ({ ...prev, [currentProblemId]: res.results || [] }));
      setTerminalOutputMap(prev => ({
        ...prev,
        [currentProblemId]: res.verdict === 'CE' || res.compile_error
          ? `Compilation Error\n\n${res.compile_error || 'Error during compilation.'}`
          : `RESULT: ${res.verdict === 'AC' ? 'ACCEPTED' : res.verdict || 'FAILED'}`,
      }));
      if (res.verdict === 'AC') sendSubmission(currentProblemId, 'RUN_SUCCESS', currentCode);
    } catch (err) {
      setTerminalOutputMap(prev => ({ ...prev, [currentProblemId]: `ERROR: ${err.message || 'Network error.'}` }));
    } finally {
      setIsRunning(false);
    }
  };

  // ── Submit Code ─────────────────────────────────────────────────────────────
  const handleSubmitCode = async () => {
    const problemSlug = activeProblem?.slug || activeProblem?.id;
    if (!problemSlug) return;
    setIsSubmitting(true);
    setIsTerminalOpen(true);
    setActiveTerminalTab('submission');
    setTerminalOutputMap(prev => ({ ...prev, [currentProblemId]: '> Submitting solution for full evaluation...' }));
    setSubmissionResultMap(prev => ({ ...prev, [currentProblemId]: null }));
    try {
      const res = await submitProblemCode(problemSlug, currentCode, currentLanguage);
      const isCorrect = res.verdict === 'AC';
      setSubmissionResultMap(prev => ({ ...prev, [currentProblemId]: res }));
      setTerminalOutputMap(prev => ({
        ...prev,
        [currentProblemId]: isCorrect
          ? `RESULT: ACCEPTED\nPassed all ${res.total_count} test cases!`
          : isBlindfolded
            ? `RESULT: WRONG ANSWER`
            : `RESULT: WRONG ANSWER\nFailed on testcase ${(res.passed_count ?? 0) + 1} of ${res.total_count}`,
      }));
      sendSubmission(currentProblemId, isCorrect ? 'ACCEPTED' : 'WRONG_ANSWER', currentCode);
      saveSubmissions([{
        id: `sub-${Date.now()}`, problemId: currentProblemId,
        problemTitle: activeProblem?.title || 'Problem',
        verdict: isCorrect ? 'ACCEPTED' : 'WRONG_ANSWER',
        timestamp: new Date().toLocaleTimeString(), created_at: new Date().toISOString(),
        code: currentCode, language: currentLanguage,
        test_cases_passed: res.passed_count ?? 0, total_test_cases: res.total_count ?? 0,
      }, ...submissionsList]);
    } catch (err) {
      setTerminalOutputMap(prev => ({ ...prev, [currentProblemId]: `ERROR: ${err.message || 'Submission failed.'}` }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Add testcase from failed submission ─────────────────────────────────────
  const handleAddFailedToTestcases = (failedTC) => {
    if (!failedTC?.input) return;
    const newCase = {
      id: `custom-${Date.now()}`, label: `Case ${currentVisibleTestCases.length + 1}`,
      input: failedTC.input, expected_output: failedTC.expected ?? '',
    };
    setVisibleTestCasesMap(prev => ({ ...prev, [currentProblemId]: [...currentVisibleTestCases, newCase] }));
    setActiveTerminalTab('testcases');
    setActiveCaseIdx(currentVisibleTestCases.length);
  };

  // ── Problem status ──────────────────────────────────────────────────────────
  const getProblemStatus = (probId) => {
    const subs = submissionsList.filter(s => s.problemId === probId);
    if (subs.some(s => ['accepted', 'ac', 'accepted! solution passed all test cases.'].includes(String(s.verdict).toLowerCase()))) return 'solved';
    if (subs.length > 0) return 'attempted';
    return 'untouched';
  };

  // ── Monaco Mount ────────────────────────────────────────────────────────────
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monaco.editor.defineTheme('arkodee-dark', ARKODEE_DARK_THEME);
    monaco.editor.defineTheme('arkodee-light', ARKODEE_LIGHT_THEME);
    monaco.editor.setTheme(theme === 'dark' ? 'arkodee-dark' : 'arkodee-light');
  };

  useEffect(() => {
    if (editorRef.current && window.monaco) {
      window.monaco.editor.setTheme(theme === 'dark' ? 'arkodee-dark' : 'arkodee-light');
    }
  }, [theme]);

  // Dynamically update Monaco editor suggestions when toggled
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        quickSuggestions: isSuggestionsEnabled ? { other: true, comments: false, strings: false } : false,
        parameterHints: { enabled: isSuggestionsEnabled },
        suggestOnTriggerCharacters: isSuggestionsEnabled,
        tabCompletion: isSuggestionsEnabled ? 'on' : 'off',
        wordBasedSuggestions: isSuggestionsEnabled ? 'allDocuments' : 'none',
      });
    }
  }, [isSuggestionsEnabled]);

  // ── Shop Handlers ───────────────────────────────────────────────────────────
  const handleBuyAutocomplete = () => {
    if (myAp < 30) return;
    socket?.emit('use_advantage', { matchId, advantageType: 'autocomplete' });
    setAutocompleteActiveUntil(Date.now() + 60000);
    setToastMessage('✨ Autocomplete active for 60s!');
  };

  const handleBuyHint = () => {
    if (myAp < 35) return;
    const currentProblem = activeProblemsList[activeProblemIndex] || activeProblemsList[0];
    const hintText = getProblemHint(currentProblem?.id || currentProblem?.uuid || currentProblem?.slug || currentProblem?.title);
    socket?.emit('use_advantage', { matchId, advantageType: 'hint' });
    setToastMessage(`💡 Hint: ${hintText}`);
  };

  const handleCastJam = () => { if (myAp < 50) return; sendSabotage('monaco-jam'); setOpponentSabotageActiveUntil(Date.now() + 5000); setToastMessage('💥 Jam cast on opponent (5s)!'); };
  const handleCastBlur = () => { if (myAp < 40) return; sendSabotage('blur'); setOpponentSabotageActiveUntil(Date.now() + 10000); setToastMessage('🌫️ Haze cast on opponent (10s)!'); };
  const handleCastBlindfold = () => { if (myAp < 60) return; sendSabotage('blindfold'); setOpponentSabotageActiveUntil(Date.now() + 60000); setToastMessage('🫣 Blindfold cast on opponent (60s)!'); };
  const handleCastImmunity = () => { if (myAp < 40) return; sendShield('immunity'); setLocalShieldActiveUntil(Date.now() + 15000); setToastMessage('🛡️ Immunity shield activated (15s)!'); };
  const handleCastCleanse = () => { if (myAp < 20) return; sendShield('cleanse'); setToastMessage('✨ Cleanse cast!'); };

  // ── Timer helpers ───────────────────────────────────────────────────────────
  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };
  const getDisplayTime = () => {
    if (roomState?.isOvertime) {
      const overtimeElapsed = roomState.overtimeStartedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(roomState.overtimeStartedAt).getTime()) / 1000))
        : 0;
      const remaining = Math.max(0, 600 - overtimeElapsed);
      return { text: `OT ${formatTimer(remaining)}`, secs: remaining, isOt: true };
    } else {
      const remaining = Math.max(0, 3600 - elapsedSeconds);
      return { text: formatTimer(remaining), secs: remaining, isOt: false };
    }
  };
  const displayTime = getDisplayTime();
  const getTimerClass = () => {
    if (displayTime.isOt) return 'a1-timer a1-timer--critical animate-pulse';
    if (displayTime.secs < 300) return 'a1-timer a1-timer--critical';
    if (displayTime.secs < 600) return 'a1-timer a1-timer--warning';
    return 'a1-timer a1-timer--normal';
  };

  if (connectionState === 'ERROR') {
    return (
      <div className="a1-root">
        <div className="a1-lobby" style={{ justifyContent: 'center' }}>
          <div className="a1-lobby-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '3rem', maxWidth: '480px', textAlign: 'center' }}>
            <AlertTriangle size={38} style={{ color: 'var(--danger)', animation: 'pulse 2s infinite' }} />
            <h1 className="a1-lobby-title" style={{ margin: 0 }}>Connection Failed</h1>
            <p className="a1-lobby-desc" style={{ margin: 0 }}>
              {toastMessage ? toastMessage.replace('⚠️ ', '') : 'Could not connect to the match arena. The match may have already concluded or the server restarted.'}
            </p>
            <button
              className="a1-btn a1-btn--primary"
              style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center' }}
              onClick={() => navigate('/matchmaking')}
            >
              Back to Matchmaking
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // IDLE / LOBBY RENDER
  // ════════════════════════════════════════════════════════════════════════════
  if (matchPhase === 'IDLE') {
    if (connectionState === 'CONNECTING' || connectionState === 'DISCONNECTED') {
      return (
        <div className="a1-root">
          <div className="a1-lobby" style={{ justifyContent: 'center' }}>
            <div className="a1-lobby-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '3rem' }}>
              <Swords size={38} className="animate-pulse text-indigo-400" />
              <h1 className="a1-lobby-title" style={{ margin: 0 }}>Connecting to Arena</h1>
              <p className="a1-lobby-desc" style={{ margin: 0 }}>Establishing secure uplink to match room...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="a1-root">
        <div className="a1-lobby">
          <header className="a1-lobby-header">
            <button className="a1-lobby-back" onClick={handleLeaveArena}>
              <ArrowLeft size={16} /><span>Leave Arena</span>
            </button>
            <span className="a1-lobby-status">LOBBY · {connectionState}</span>
          </header>

          <div className="a1-lobby-card">
            <div className="a1-lobby-icon"><Swords size={38} /></div>
            <h1 className="a1-lobby-title">1v1 Ranked Arena</h1>
            <p className="a1-lobby-desc">Match room ready. Both players receive 4 problems. The fastest correct solver wins.</p>

            <div className="a1-lobby-players">
              <div className="a1-lobby-player">
                <div className="a1-lobby-avatar">{activeUsername[0].toUpperCase()}</div>
                <span className="a1-lobby-player-name">{activeUsername}</span>
                <span className="a1-lobby-player-elo">{myRating} ELO</span>
              </div>
              <div className="a1-lobby-vs-badge">VS</div>
              <div className="a1-lobby-player">
                <div className="a1-lobby-avatar a1-lobby-avatar--opp">{opponentInitial}</div>
                <span className="a1-lobby-player-name">{opponentDisplayName}</span>
                <span className="a1-lobby-player-elo">{hasOpponent && opponentProfile.rating ? `${opponentProfile.rating} ELO` : 'Searching...'}</span>
              </div>
            </div>

            <div className="a1-lobby-stats">
              {[['Problems', '4 Algorithmic'], ['Time Limit', '60 Mins'], ['Sabotage', 'ENABLED'], ['ELO Stakes', 'Dynamic']].map(([l, v]) => (
                <div key={l} className="a1-lobby-stat">
                  <span className="a1-lobby-stat-label">{l}</span>
                  <span className="a1-lobby-stat-value">{v}</span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button className="a1-lobby-start" onClick={handleStartMatch}><Zap size={18} /><span>Start Match</span></button>
            ) : (
              <div className="a1-lobby-waiting"><Lock size={18} /><span>Waiting for host to start...</span></div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COUNTDOWN OVERLAY (shown right after host clicks Start)
  // ════════════════════════════════════════════════════════════════════════════
  if (matchPhase === 'INITIATING' || matchPhase === 'COUNTDOWN') {
    return (
      <div className="a1-root">
        {toastMessage && <div className="a1-toast"><span>{toastMessage}</span></div>}
        <MatchInitOverlay
          userA={{ username: activeUsername, rating: myRating }}
          userB={{ username: opponentDisplayName, rating: opponentDisplayRating }}
          onHandoff={handleOverlayHandoff}
          isReady={isMatchReady && problems?.length > 0}
        />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RULES MODAL (shown right after countdown, before editor)
  // ════════════════════════════════════════════════════════════════════════════
  if (matchPhase === 'RULES') {
    return (
      <div className="a1-root">
        <RulesModal
          myUsername={activeUsername}
          opponentUsername={opponentDisplayName}
          myRating={myRating}
          opponentRating={opponentDisplayRating}
          onDismiss={() => setMatchPhase('ACTIVE')}
        />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ACTIVE ARENA RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="a1-root">

      {/* Victory Overlay */}
      {matchFinishedData && (
        <div className="a1-victory-overlay">
          <div className="a1-victory-card">
            <div className="a1-victory-accent-bar" />
            <div className="a1-victory-icon-wrapper"><Swords size={32} /></div>
            <h2 className="a1-victory-title">
              {!matchFinishedData.winnerId ? 'Match Tied (Draw)'
                : String(matchFinishedData.winnerId) === String(activeUserId) ? '🏆 Victory' : 'Defeat'}
            </h2>
            <p className="a1-victory-subtitle">
              {matchFinishedData.reason || 'The duel has concluded.'}
            </p>

            <div className="a1-victory-stats-grid">
              <div className="a1-victory-stat-card">
                <span className="a1-victory-card-num">{myScore}</span>
                <span className="a1-victory-card-label">Your Score</span>
              </div>
              <div className="a1-victory-stat-card">
                <span className="a1-victory-card-num">{opponentScore}</span>
                <span className="a1-victory-card-label">Opponent Score</span>
              </div>
            </div>

            <div className="a1-victory-stats-box">
              {[
                ['Result', !matchFinishedData.winnerId ? 'Draw' : String(matchFinishedData.winnerId) === String(activeUserId) ? 'You Won' : 'Opponent Won'],
                ['Your Solved', `${roomState?.players?.find(p => String(p.userId) === String(activeUserId))?.solvedProblems ? Object.keys(roomState.players.find(p => String(p.userId) === String(activeUserId)).solvedProblems).filter(k => roomState.players.find(p => String(p.userId) === String(activeUserId)).solvedProblems[k]).length : 0} / 4`],
                ['Opponent Solved', `${opponentProfile?.solvedCount || 0} / 4`],
                ['Your Penalties', `${roomState?.players?.find(p => String(p.userId) === String(activeUserId))?.failedAttempts ? Object.values(roomState.players.find(p => String(p.userId) === String(activeUserId)).failedAttempts).reduce((a, b) => a + b, 0) : 0} failed`],
                ['Opponent Penalties', `${roomState?.players?.find(p => String(p.userId) !== String(activeUserId))?.failedAttempts ? Object.values(roomState.players.find(p => String(p.userId) !== String(activeUserId)).failedAttempts).reduce((a, b) => a + b, 0) : 0} failed`],
              ].map(([l, v]) => (
                <div key={l} className="a1-victory-stat-row">
                  <span className="a1-victory-stat-label">{l}</span>
                  <span className="a1-victory-stat-value">{v}</span>
                </div>
              ))}
              <div className="a1-victory-divider" />
              {(() => {
                const scoreObj = matchFinishedData.scores?.find(p => String(p.userId) === String(activeUserId));
                const delta = scoreObj?.eloDelta ?? 0;
                return (
                  <div className="a1-victory-stat-row">
                    <span className="a1-victory-stat-label">ELO Rating Change</span>
                    <span className={`a1-victory-stat-value ${delta > 0 ? 'a1-victory-stat-value--up' : delta < 0 ? 'a1-victory-stat-value--down' : ''}`}>
                      {delta > 0 ? `+${delta}` : delta} ELO
                    </span>
                  </div>
                );
              })()}
            </div>
            <button className="a1-victory-btn" onClick={() => navigate('/matchmaking')}>Return to Matchmaking</button>
          </div>
        </div>
      )}

      {/* Tie Resolution Voting Overlay */}
      {roomState?.status === 'TIE_PROMPT' && !matchFinishedData && (
        <div className="a1-tie-prompt-overlay">
          <div className="a1-tie-prompt-card">
            <div className="a1-tie-prompt-accent-bar" />
            <div className="a1-tie-prompt-icon-wrapper">
              <Clock size={32} />
            </div>
            <h2 className="a1-tie-prompt-title">Sudden Death Overtime?</h2>
            <p className="a1-tie-prompt-subtitle">
              Timer expired! Your points are tied at {myScore} pts. Vote to settle with a Draw or enter Overtime (+10 mins).
            </p>
            
            <div className="a1-tie-prompt-voting-status">
              <div className="a1-tie-prompt-vote-col">
                <span className="a1-tie-prompt-vote-label">Draw votes:</span>
                <span className="a1-tie-prompt-vote-val">{roomState.votes?.draw?.length || 0} / 2</span>
              </div>
              <div className="a1-tie-prompt-vote-col">
                <span className="a1-tie-prompt-vote-label">Overtime votes:</span>
                <span className="a1-tie-prompt-vote-val">{roomState.votes?.overtime?.length || 0} / 2</span>
              </div>
            </div>

            <div className="a1-tie-prompt-timer">
              Voting ends in: {Math.max(0, Math.ceil((roomState.tiePromptExpiresAt - Date.now()) / 1000))}s
            </div>

            {(() => {
              const myId = String(activeUserId);
              const hasVotedDraw = roomState.votes?.draw?.some(uid => String(uid) === myId);
              const hasVotedOvertime = roomState.votes?.overtime?.some(uid => String(uid) === myId);
              const hasVoted = hasVotedDraw || hasVotedOvertime;

              if (hasVoted) {
                return (
                  <div className="a1-tie-prompt-waiting">
                    <span className="a1-tie-prompt-spinner" />
                    <span>Waiting for opponent's vote...</span>
                  </div>
                );
              }

              if (selectedVote && isVoteConfirmed) {
                return (
                  <div className="a1-tie-prompt-waiting">
                    <span className="a1-tie-prompt-spinner" />
                    <span>Locking in vote for {selectedVote.toUpperCase()}...</span>
                  </div>
                );
              }

              if (selectedVote) {
                return (
                  <div className="a1-tie-prompt-confirm-box" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: '500' }}>
                      Confirm vote for: <strong style={{ color: 'var(--accent)' }}>{selectedVote === 'draw' ? 'DRAW 🤝' : 'OVERTIME 🔥'}</strong>
                    </div>
                    <div className="a1-tie-prompt-actions" style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className="a1-btn a1-btn--secondary"
                        onClick={() => setSelectedVote(null)}
                        style={{ padding: '6px 16px', fontSize: '12px' }}
                      >
                        Change
                      </button>
                      <button
                        className="a1-btn a1-btn--primary"
                        onClick={() => {
                          setIsVoteConfirmed(true);
                          socket?.emit('vote_tie_resolution', { matchId, vote: selectedVote });
                        }}
                        style={{ padding: '6px 16px', fontSize: '12px' }}
                      >
                        Confirm Lock-in
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="a1-tie-prompt-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                  <button
                    className="a1-tie-prompt-btn a1-tie-prompt-btn--draw"
                    onClick={() => setSelectedVote('draw')}
                    style={{ flex: 1, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    🤝 Vote DRAW
                  </button>
                  <button
                    className="a1-tie-prompt-btn a1-tie-prompt-btn--ot"
                    onClick={() => setSelectedVote('overtime')}
                    style={{ flex: 1, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    🔥 Vote OVERTIME
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && <div className="a1-toast"><span>{toastMessage}</span></div>}

      {/* Sabotage warning footer (rendered at root level so it overlays everything) */}
      {activeSabotage && (
        <div className="a1-sabotage-banner">
          <div className="a1-sabotage-banner-inner">
            <AlertTriangle size={13} className="a1-sabotage-icon" />
            <span>SABOTAGE ACTIVE: <strong>{activeSabotage.toUpperCase()}</strong> — {sabotageTimeLeft}s remaining</span>
          </div>
          {myAp >= 20 && (
            <button onClick={handleCastCleanse} className="a1-sabotage-cleanse-btn">Cleanse (20 AP)</button>
          )}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="a1-header">
        {/* Left */}
        <div className="a1-header-left">
          <button className="a1-back-btn" onClick={handleLeaveArena}>
            <ArrowLeft size={14} /><span>Exit</span>
          </button>
          <span className="a1-header-sep" />
          <span className="a1-match-id">#{matchId?.substring(0, 8) || 'RANKED'}</span>
        </div>

        {/* Center — Scoreboard: only scores, no progress bars */}
        <div className="a1-scoreboard">
          <div className="a1-scoreboard-me">
            <span className="a1-scoreboard-name">{activeUsername}</span>
            <span className="a1-scoreboard-score a1-scoreboard-score--me">{myScore}</span>
          </div>

          <div className="a1-scoreboard-divider">
            <span className={`a1-lead-badge ${
              myScore > opponentScore ? 'a1-lead-badge--winning'
              : myScore < opponentScore ? 'a1-lead-badge--losing'
              : 'a1-lead-badge--tied'
            }`}>
              {myScore > opponentScore ? '▲ LEADING' : myScore < opponentScore ? '▼ BEHIND' : '— TIED'}
            </span>
          </div>

          <div className="a1-scoreboard-opp">
            <span className="a1-scoreboard-name">{opponentDisplayName}</span>
            <span className="a1-scoreboard-score a1-scoreboard-score--opp">{opponentScore}</span>
          </div>
        </div>

        {/* Right — Timer (always visible) + language */}
        <div className="a1-header-right">
          <div className={getTimerClass()}>
            <Clock size={13} />
            <span>{displayTime.text}</span>
          </div>
          <select className="a1-lang-select" value={currentLanguage} onChange={e => handleLanguageChange(e.target.value)}>
            {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
          </select>
        </div>
      </header>

      {/* ── Workspace ─────────────────────────────────────────────────────── */}
      <div className="a1-workspace">

        {/* Problem Index Sidebar */}
        <aside className="a1-sidebar">
          <div className="a1-sidebar-header"><span className="a1-sidebar-title">P</span></div>
          <div className="a1-sidebar-content">
            <div className="a1-problem-tabs">
              {activeProblemsList.map((prob, idx) => {
                const status = getProblemStatus(prob.id);
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

        {/* Left Panel — Problem Description (collapsible + resizable) */}
        <section className={`a1-description ${isLeftPanelCollapsed ? 'is-collapsed' : ''}`} style={{ width: isLeftPanelCollapsed ? 0 : `${leftPanelWidth}px`, display: isLeftPanelCollapsed ? 'none' : 'flex' }}>
          {!isLeftPanelCollapsed && (
            <button
              className="a1-panel-toggle-chip a1-panel-toggle-chip--left"
              onClick={() => setIsLeftPanelCollapsed(v => !v)}
              title="Collapse problem panel"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          {!isLeftPanelCollapsed && (
            <div className="a1-description-scroll">
              {activeProblem ? (
                <ProblemDescription
                  problem={activeProblem}
                  submissions={problemSubmissions.map(sub => ({
                    id: sub.id, verdict: sub.verdict, language: sub.language,
                    created_at: sub.created_at || new Date().toISOString(),
                    code: sub.code, test_cases_passed: sub.test_cases_passed,
                    total_test_cases: sub.total_test_cases,
                  }))}
                  loadingSubmissions={false}
                />
              ) : (
                <div className="a1-empty-state">Select a problem to view details.</div>
              )}
            </div>
          )}
        </section>
        {!isLeftPanelCollapsed && (
          <div className="a1-resize-handle" onMouseDown={startResizeLeft} title="Drag to resize" />
        )}

        {/* Center — Editor + Console */}
        <div className="a1-center">
          {isLeftPanelCollapsed && (
            <button
              className="a1-collapsed-expand-btn a1-collapsed-expand-btn--left"
              onClick={() => setIsLeftPanelCollapsed(v => !v)}
              title="Expand problem panel"
            >
              <ChevronRight size={14} />
            </button>
          )}
          {isRightPanelCollapsed && (
            <button
              className="a1-collapsed-expand-btn a1-collapsed-expand-btn--right"
              onClick={() => setIsRightPanelCollapsed(v => !v)}
              title="Expand shop panel"
            >
              <ChevronLeft size={14} />
            </button>
          )}

          {/* Editor container — flex:1, takes all remaining height above console */}
          <div className="a1-editor-wrap">
            {/* Blur sabotage overlay */}
            <div className={`a1-editor-inner ${activeSabotage === 'blur' ? 'sabotage-blurred' : ''}`}>
              {(isEditorLocked || activeSabotage === 'jam') && (
                <div className="a1-editor-lock-overlay">
                  <Lock size={18} />
                  <span>Editor Locked by Sabotage</span>
                </div>
              )}
              <Editor
                height="100%"
                language={LANGUAGES.find(l => l.id === currentLanguage)?.monaco}
                value={currentCode}
                onChange={handleCodeChange}
                onMount={handleEditorMount}
                theme={theme === 'dark' ? 'arkodee-dark' : 'arkodee-light'}
                options={{
                  readOnly: isEditorLocked || activeSabotage === 'jam' || isRunning || isSubmitting,
                  contextmenu: false,
                  fontSize: 14,
                  lineHeight: 22,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                  automaticLayout: true,
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  bracketPairColorization: { enabled: true },
                  guides: { bracketPairs: true },
                  scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
                  quickSuggestions: isSuggestionsEnabled ? { other: true, comments: false, strings: false } : false,
                  parameterHints: { enabled: isSuggestionsEnabled },
                  suggestOnTriggerCharacters: isSuggestionsEnabled,
                  tabCompletion: isSuggestionsEnabled ? 'on' : 'off',
                  wordBasedSuggestions: isSuggestionsEnabled ? 'allDocuments' : 'none',
                }}
              />
            </div>
          </div>

          {/* Console Panel — practice-style, collapsible, resizable */}
          {isTerminalOpen && (
            <div className="a1-console" style={{ height: `${terminalHeight}px` }}>
              <div
                className={`a1-console-resize-handle ${isResizingTerminal ? 'a1-console-resize-handle--active' : ''}`}
                onMouseDown={handleTerminalMouseDown}
              />
              <div className="a1-console-header">
                <div className="a1-console-tabs">
                  <button
                    className={`a1-console-tab ${activeTerminalTab === 'testcases' ? 'a1-console-tab--active' : ''}`}
                    onClick={() => setActiveTerminalTab('testcases')}
                  >
                    Testcases
                  </button>
                  {(currentSubmissionResult || isSubmitting) && (
                    <button
                      className={`a1-console-tab ${activeTerminalTab === 'submission' ? 'a1-console-tab--active' : ''}`}
                      onClick={() => setActiveTerminalTab('submission')}
                    >
                      Submission
                    </button>
                  )}
                </div>
                <button className="a1-console-close-btn" onClick={() => setIsTerminalOpen(false)}>
                  <X size={13} />
                </button>
              </div>

              <div className="a1-console-body">
                {activeTerminalTab === 'testcases' ? (
                  <div className="a1-tc-root">
                    {isRunning ? (
                      <div className="a1-submission-pending">
                        <div className="a1-spinner" />
                        <span>Running code against sample testcases...</span>
                      </div>
                    ) : currentTerminalOutput && (currentTerminalOutput.includes('Compilation Error') || currentTerminalOutput.includes('Execution Error') || currentTerminalOutput.includes('ERROR:')) ? (
                      <div className="a1-tc-content" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', color: '#ef4444', fontWeight: 'bold' }}>
                          {currentTerminalOutput.includes('Compilation Error') ? 'Compilation Error' : 'Execution Error'}
                        </div>
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px', color: '#f87171', padding: '12px', backgroundColor: '#18181b', borderRadius: '6px', border: '1px solid #27272a', margin: 0 }}>
                          {currentTerminalOutput.substring(currentTerminalOutput.indexOf('\n\n') + 2) || currentTerminalOutput}
                        </pre>
                      </div>
                    ) : (
                      <>
                        {/* Testcase sub-tabs */}
                        {currentVisibleTestCases.length > 0 && (
                          <div className="a1-tc-tabs">
                            {currentVisibleTestCases.map((tc, idx) => {
                              const res = currentTestCaseResults[idx];
                              return (
                                <button
                                  key={tc.id || idx}
                                  onClick={() => setActiveCaseIdx(idx)}
                                  className={`a1-tc-tab ${activeCaseIdx === idx ? 'a1-tc-tab--active' : ''} ${res?.passed ? 'a1-tc-tab--passed' : res ? 'a1-tc-tab--failed' : ''}`}
                                >
                                  <span className="a1-tc-indicator" />
                                  {tc.label || `Case ${idx + 1}`}
                                </button>
                              );
                            })}
                            {/* Add testcase button removed */}
                          </div>
                        )}

                        {/* Active testcase detail */}
                        {currentVisibleTestCases[activeCaseIdx] ? (
                          <div className="a1-tc-content">
                            <div className="a1-tc-field">
                              <span className="a1-tc-field-label">Input</span>
                              <pre className="a1-tc-pre">{currentVisibleTestCases[activeCaseIdx].input || '(empty)'}</pre>
                            </div>
                            {currentVisibleTestCases[activeCaseIdx].expected_output && !isBlindfolded && (
                              <div className="a1-tc-field">
                                <span className="a1-tc-field-label">Expected Output</span>
                                <pre className="a1-tc-pre a1-tc-pre--expected">{currentVisibleTestCases[activeCaseIdx].expected_output}</pre>
                              </div>
                            )}
                            {currentTestCaseResults[activeCaseIdx] && (
                              <div className="a1-tc-field">
                                <span className="a1-tc-field-label">Your Output</span>
                                <pre className={`a1-tc-pre ${currentTestCaseResults[activeCaseIdx].passed ? 'a1-tc-pre--success' : 'a1-tc-pre--fail'}`}>
                                  {currentTestCaseResults[activeCaseIdx].output !== undefined && currentTestCaseResults[activeCaseIdx].output !== null
                                    ? (currentTestCaseResults[activeCaseIdx].output === "" ? "(no output)" : currentTestCaseResults[activeCaseIdx].output)
                                    : "(no output)"}
                                </pre>
                              </div>
                            )}
                            {currentTestCaseResults[activeCaseIdx]?.error && (
                              <div className="a1-tc-field" style={{ marginTop: '12px' }}>
                                <span className="a1-tc-field-label" style={{ color: '#ef4444' }}>Runtime Error / Exception</span>
                                <pre className="a1-tc-pre" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                                  {currentTestCaseResults[activeCaseIdx].error}
                                </pre>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="a1-tc-empty">Run your code to see results here.</div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  /* Submission tab */
                  <div className="a1-submission-result">
                    {isSubmitting ? (
                      <div className="a1-submission-pending">
                        <div className="a1-spinner" />
                        <span>Evaluating your solution...</span>
                      </div>
                    ) : currentTerminalOutput ? (
                      <>
                        <pre className={`a1-submission-output ${
                          currentTerminalOutput.includes('ACCEPTED') ? 'a1-submission-output--accepted'
                          : (currentTerminalOutput.includes('ERROR') || currentTerminalOutput.includes('WRONG') || currentTerminalOutput.includes('FAILED'))
                            ? 'a1-submission-output--failed'
                          : ''
                        }`}>{currentTerminalOutput}</pre>
                        {/* Show failed testcase details in non-blindfold mode */}
                        {!isBlindfolded && currentSubmissionResult?.results?.length > 0 && (() => {
                          const failedIdx = currentSubmissionResult.results.findIndex(tc => !tc.passed);
                          const failedTC = failedIdx !== -1 ? currentSubmissionResult.results[failedIdx] : null;
                          if (!failedTC) return null;
                          return (
                            <div className="a1-failed-tc-box">
                              <div className="a1-failed-tc-header">
                                <span>Failed Testcase Details</span>
                                {failedTC.input && (
                                  <button className="a1-add-tc-link" onClick={() => handleAddFailedToTestcases(failedTC)}>
                                    <Plus size={11} /> Add to Testcases
                                  </button>
                                )}
                              </div>
                              {failedTC.input && <div className="a1-failed-tc-row"><span>Input:</span><code>{failedTC.input}</code></div>}
                              {failedTC.expected && <div className="a1-failed-tc-row"><span>Expected:</span><code>{failedTC.expected}</code></div>}
                              {failedTC.output && <div className="a1-failed-tc-row"><span>Got:</span><code>{failedTC.output}</code></div>}
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="a1-tc-empty">Submit your code to see results here.</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="a1-action-bar">
            <button
              className={`a1-btn a1-btn--ghost ${isTerminalOpen ? 'a1-btn--active' : ''}`}
              onClick={() => setIsTerminalOpen(v => !v)}
              title={isTerminalOpen ? 'Close console' : 'Open console'}
            >
              <ChevronUp size={13} style={{ transform: isTerminalOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              <span>Console</span>
            </button>
            <div style={{ flex: 1 }} />
            {!isBlindfolded && (
              <button
                className="a1-btn a1-btn--ghost"
                onClick={handleRunCode}
                disabled={isRunning || isSubmitting || isEditorLocked || activeSabotage === 'jam'}
                id="btn-arena-run"
              >
                <Play size={13} />
                <span>{isRunning ? 'Running...' : 'Run'}</span>
              </button>
            )}
            <button
              className="a1-btn a1-btn--primary"
              onClick={handleSubmitCode}
              disabled={isRunning || isSubmitting || isEditorLocked || activeSabotage === 'jam'}
              id="btn-arena-submit"
            >
              <UploadCloud size={13} />
              <span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
            </button>
          </div>
        </div>

        {/* Right Panel resize handle */}
        {!isRightPanelCollapsed && (
          <div className="a1-resize-handle" onMouseDown={startResizeRight} title="Drag to resize shop panel" />
        )}

        {/* Right Panel — Telemetry + Shop (collapsible) */}
        <aside className={`a1-right-panel ${isRightPanelCollapsed ? 'is-collapsed' : ''}`} style={{ width: isRightPanelCollapsed ? 0 : `${rightPanelWidth}px` }}>
          <button
            className="a1-panel-toggle-chip a1-panel-toggle-chip--right"
            onClick={() => setIsRightPanelCollapsed(v => !v)}
            title={isRightPanelCollapsed ? "Expand shop panel" : "Collapse shop panel"}
          >
            {isRightPanelCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>

          <div
            style={{
              opacity: isRightPanelCollapsed ? 0 : 1,
              pointerEvents: isRightPanelCollapsed ? 'none' : 'auto',
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
              {/* ── Top: Opponent Telemetry ────────────────────────────────── */}
              <div className="a1-right-section">
                <button className="a1-right-section-header" aria-expanded={!isTelemetryCollapsed} onClick={() => setIsTelemetryCollapsed(v => !v)}>
                  <span className="a1-right-section-title">Telemetry</span>
                  <ChevronDown size={13} style={{ transform: isTelemetryCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

              {!isTelemetryCollapsed && (
                <div className="a1-telemetry-body">
                  {/* Me row */}
                  <div className="a1-player-row a1-player-row--me">
                    <div className="a1-player-avatar">{activeUsername[0].toUpperCase()}</div>
                    <div className="a1-player-info">
                      <span className="a1-player-name">{activeUsername} <span className="a1-you-tag">YOU</span></span>
                      <div className="a1-ap-bar-wrap">
                        <div className="a1-ap-bar-track">
                          <div className="a1-ap-bar-fill a1-ap-bar-fill--me" style={{ width: `${Math.min(myAp, 100)}%` }} />
                        </div>
                        <span className="a1-ap-label">{myAp} AP</span>
                      </div>
                    </div>
                    <span className="a1-player-score">{myScore}</span>
                  </div>

                  <div className="a1-telemetry-divider" />

                  {/* Opponent row */}
                  <div className="a1-player-row a1-player-row--opp">
                    <div className="a1-player-avatar a1-player-avatar--opp">{opponentInitial}</div>
                    <div className="a1-player-info">
                      <span className="a1-player-name">
                        {opponentDisplayName}
                        <span className="a1-pulse-container">
                          <span className="a1-pulse-ping" /><span className="a1-pulse-dot" />
                        </span>
                      </span>
                      <div className="a1-ap-bar-wrap">
                        <div className="a1-ap-bar-track">
                          <div className="a1-ap-bar-fill a1-ap-bar-fill--opp" style={{ width: `${Math.min(opponentAp ?? 0, 100)}%` }} />
                        </div>
                        <span className="a1-ap-label">{opponentAp ?? 0} AP</span>
                      </div>
                      <span className="a1-opp-solved">Solved: {opponentProfile?.solvedCount || 0} / {activeProblemsList.length}</span>
                    </div>
                    <span className="a1-player-score a1-player-score--opp">{opponentScore}</span>
                  </div>

                  {/* Shield active indicator */}
                  {myShieldActiveUntil > Date.now() && (
                    <div className="a1-shield-active">
                      <Shield size={12} /> Immunity Shield Active
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Bottom: Tactical Shop ──────────────────────────────────── */}
            <div className="a1-right-section a1-right-section--shop">
              <button className="a1-right-section-header" aria-expanded={!isShopCollapsed} onClick={() => setIsShopCollapsed(v => !v)}>
                <span className="a1-right-section-title">
                  <Sparkles size={11} style={{ color: 'var(--accent)', marginRight: 4 }} />
                  Tactical Shop
                </span>
                <ChevronDown size={13} style={{ transform: isShopCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>

              {!isShopCollapsed && (
                <div className="a1-shop-body">
                  <div className="a1-ap-badge">
                    <Zap size={11} /> {myAp} AP available
                  </div>

                  {/* Advantages */}
                  <div className="a1-shop-category">
                    <span className="a1-shop-category-label">Advantages</span>
                    <div className="a1-shop-item">
                      <div className="a1-shop-item-top">
                        <span className="a1-shop-item-name"><Keyboard size={11} /> Suggestions</span>
                        <span className="a1-shop-item-cost">30 AP</span>
                      </div>
                      <button disabled={myAp < 30 || isSuggestionsEnabled} onClick={handleBuyAutocomplete} className="a1-shop-btn">
                        {isSuggestionsEnabled ? '✓ Active' : 'Buy (60s)'}
                      </button>
                    </div>
                    <div className="a1-shop-item">
                      <div className="a1-shop-item-top">
                        <span className="a1-shop-item-name"><HelpCircle size={11} /> Problem Hint</span>
                        <span className="a1-shop-item-cost">35 AP</span>
                      </div>
                      <button disabled={myAp < 35} onClick={handleBuyHint} className="a1-shop-btn">Reveal Hint</button>
                    </div>
                    <div className="a1-shop-item">
                      <div className="a1-shop-item-top">
                        <span className="a1-shop-item-name"><Shield size={11} /> Immunity Shield</span>
                        <span className="a1-shop-item-cost">40 AP</span>
                      </div>
                      {(() => {
                        const shieldActive = (myShieldActiveUntil && myShieldActiveUntil > Date.now()) || (localShieldActiveUntil > Date.now());
                        return (
                          <button disabled={myAp < 40 || shieldActive} onClick={handleCastImmunity} className="a1-shop-btn a1-shop-btn--shield">
                            {shieldActive ? '✓ Active' : 'Activate (15s)'}
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Sabotages */}
                  <div className="a1-shop-category">
                    <span className="a1-shop-category-label">Sabotages</span>
                    <div className="a1-shop-item">
                      <div className="a1-shop-item-top">
                        <span className="a1-shop-item-name"><Lock size={11} /> Editor Jam</span>
                        <span className="a1-shop-item-cost">50 AP</span>
                      </div>
                      <button disabled={myAp < 50 || opponentSabotageActiveUntil > Date.now()} onClick={handleCastJam} className="a1-shop-btn a1-shop-btn--danger">
                        {opponentSabotageActiveUntil > Date.now() ? 'Cooldown' : 'Cast Jam (5s)'}
                      </button>
                    </div>
                    <div className="a1-shop-item">
                      <div className="a1-shop-item-top">
                        <span className="a1-shop-item-name"><EyeOff size={11} /> Haze (Blur)</span>
                        <span className="a1-shop-item-cost">40 AP</span>
                      </div>
                      <button disabled={myAp < 40 || opponentSabotageActiveUntil > Date.now()} onClick={handleCastBlur} className="a1-shop-btn a1-shop-btn--danger">
                        {opponentSabotageActiveUntil > Date.now() ? 'Cooldown' : 'Cast Haze (10s)'}
                      </button>
                    </div>
                    <div className="a1-shop-item">
                      <div className="a1-shop-item-top">
                        <span className="a1-shop-item-name"><AlertTriangle size={11} /> Blindfold</span>
                        <span className="a1-shop-item-cost">60 AP</span>
                      </div>
                      <button disabled={myAp < 60 || opponentSabotageActiveUntil > Date.now()} onClick={handleCastBlindfold} className="a1-shop-btn a1-shop-btn--danger">
                        {opponentSabotageActiveUntil > Date.now() ? 'Cooldown' : 'Cast Blindfold (60s)'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default Arena1v1Page;