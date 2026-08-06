// src/pages/ContestArenaPage.jsx
// Contest Arena Page — resizable split-pane contest IDE layout
// Uses design system tokens, no Tailwind
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useTheme } from '../store/ThemeContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  Columns,
  Play,
} from 'lucide-react';
import { getContestDetails, submitContestSolution, getContestLeaderboard, runContestCode } from '../lib/contests';
import { getProblemDetails } from '../lib/problems';
import { useContestTimer } from '../hooks/useContestTimer';
import { useAuth } from '../store/AuthContext';
import { Leaderboard } from '../components/contests/Leaderboard';
import { ProblemDescription } from '../components/practice/ProblemDescription';
import './ContestArenaPage.css';

// Helper to pre-process raw compiler output, keeping only errors belonging to user code
function filterCompileError(errorText) {
  if (!errorText) return '';
  
  const userFiles = [
    'Solution.java', 'solution.java', 'Main.java', 'main.java', 'DriverMain.java', 'DriverMain',
    'Solution.cpp', 'solution.cpp', 'main.cpp', 'Main.cpp',
    'solution.py', 'main.py', 'Main.py',
    'solution.js', 'Solution.js', 'main.js', 'Main.js'
  ];
  const lines = errorText.split('\n');
  const filteredLines = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const isErrorLine = line.includes(': error:') || line.includes(': warning:') || line.includes('.java:') || line.includes('.cpp:') || line.includes('.py:');
    
    if (isErrorLine) {
      const isUserFile = userFiles.some(f => line.includes(f));
      
      if (isUserFile) {
        filteredLines.push(line);
        i++;
        while (i < lines.length) {
          const subLine = lines[i];
          const nextIsError = subLine.includes(': error:') || subLine.includes(': warning:') || subLine.includes('.java:') || subLine.includes('.cpp:') || subLine.includes('.py:');
          if (nextIsError) {
            break;
          }
          filteredLines.push(subLine);
          i++;
        }
      } else {
        i++;
        while (i < lines.length) {
          const subLine = lines[i];
          const nextIsError = subLine.includes(': error:') || subLine.includes(': warning:') || subLine.includes('.java:') || subLine.includes('.cpp:') || subLine.includes('.py:');
          if (nextIsError) {
            break;
          }
          i++;
        }
      }
    } else {
      i++;
    }
  }
  
  return filteredLines.join('\n').trim();
}

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
function CountdownClock({ timer, isVirtual, virtualCompleted }) {
  const { formatted, isExpired, isWarning, isCritical } = timer;

  let timerClass = 'ca-timer ca-timer--normal';
  if (isExpired || (isVirtual && virtualCompleted)) timerClass = 'ca-timer ca-timer--expired';
  else if (isCritical) timerClass = 'ca-timer ca-timer--critical';
  else if (isWarning) timerClass = 'ca-timer ca-timer--warning';

  return (
    <div className={timerClass}>
      <Clock size={14} />
      <span className="ca-timer-value">
        {isVirtual ? 'Virtual Time: ' : 'Time Left: '}
        {isVirtual && virtualCompleted ? 'VP Ended' : (isExpired ? '00:00:00' : formatted)}
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
  const { theme } = useTheme();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isVirtual = new URLSearchParams(window.location.search).get('virtual') === 'true';
  const editorRef = useRef(null);

  // Core Data State
  const [contest, setContest] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Overview Tab & Submissions list
  const [overviewTab, setOverviewTab] = useState('dashboard');
  const [mySubmissions, setMySubmissions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Workspace State
  const [activeProblemIdx, setActiveProblemIdx] = useState(null);
  const [language, setLanguage] = useState(() => localStorage.getItem('preferredLanguage') || 'python');
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [descriptionCollapsed, setDescriptionCollapsed] = useState(false);

  // Split resize state — description panel width %
  const splitContainerRef = useRef(null);
  const [descWidth, setDescWidth] = useState(38);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState('38%');
  const [isResizingTerminal, setIsResizingTerminal] = useState(false);
  const descDragState = useRef(null);
  const DESC_MIN = 25;
  const DESC_MAX = 65;

  const handleDescResizeStart = useCallback((e) => {
    e.preventDefault();
    descDragState.current = { startX: e.clientX, startPct: descWidth };

    const onMove = (mv) => {
      if (!descDragState.current || !splitContainerRef.current) return;
      const w = splitContainerRef.current.offsetWidth;
      if (!w) return;
      const delta = ((mv.clientX - descDragState.current.startX) / w) * 100;
      setDescWidth(Math.min(Math.max(descDragState.current.startPct + delta, DESC_MIN), DESC_MAX));
    };
    const onUp = () => {
      descDragState.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [descWidth]);

  // Terminal drag resize handler
  const handleTerminalMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizingTerminal(true);
    const startY = e.clientY;

    const terminalElement = e.currentTarget.parentElement;
    const startHeight = terminalElement ? terminalElement.offsetHeight : 250;
    const parentElement = terminalElement ? terminalElement.parentElement : null;
    const parentHeight = parentElement ? parentElement.offsetHeight : 600;

    const handleMouseMove = (moveEvent) => {
      const deltaY = startY - moveEvent.clientY;
      const newHeight = Math.min(Math.max(startHeight + deltaY, 120), parentHeight * 0.75);
      setTerminalHeight(`${newHeight}px`);
    };

    const handleMouseUp = () => {
      setIsResizingTerminal(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  // Code State
  const [code, setCode] = useState('');

  // Execution State
  const [problemRunResults, setProblemRunResults] = useState({});
  const [problemSubmitting, setProblemSubmitting] = useState({});
  const [problemRunning, setProblemRunning] = useState({});

  // Problem Status Tracking
  const [problemStatuses, setProblemStatuses] = useState({});

  // Congratulations / Performance Stats Screen
  const [showCongrats, setShowCongrats] = useState(false);
  const [showLiveComplete, setShowLiveComplete] = useState(false);
  const [showLiveExpired, setShowLiveExpired] = useState(false);
  const [virtualCompleted, setVirtualCompleted] = useState(false);

  const getVirtualStartMs = useCallback(() => {
    if (!contest) return Date.now();
    const storageKey = `virtual_start_${contest.slug}`;
    const startTimeStr = localStorage.getItem(storageKey);
    return startTimeStr ? parseInt(startTimeStr, 10) : Date.now();
  }, [contest]);

  const formatDuration = useCallback((ms) => {
    if (ms <= 0) return '0s';
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    let parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0) parts.push(`${mins}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    return parts.join(' ');
  }, []);

  const getLastAcTime = useCallback(() => {
    const acSubs = mySubmissions.filter((sub) => ['accepted', 'ac', 'accepted! solution passed all test cases.'].includes(String(sub.verdict).toLowerCase()));
    if (acSubs.length === 0) return Date.now();
    const sortedAc = [...acSubs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const lastAcSub = sortedAc[sortedAc.length - 1];
    return new Date(lastAcSub.created_at).getTime();
  }, [mySubmissions]);

  const getVirtualRank = useCallback((virtualUser, currentLeaderboard) => {
    if (!virtualUser || !user) return 1;
    let rank = 1;
    currentLeaderboard.forEach((entry) => {
      if (entry.username === user.username) return;
      if (entry.total_score > virtualUser.total_score) {
        rank++;
      } else if (entry.total_score === virtualUser.total_score) {
        if (entry.penalty_minutes < virtualUser.penalty_minutes) {
          rank++;
        }
      }
    });
    return rank;
  }, [user]);

  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });

  // Derived values
  const activeProblem = activeProblemIdx !== null ? problems[activeProblemIdx] || null : null;
  const runResult = activeProblem ? problemRunResults[activeProblem.id || activeProblem.slug] || null : null;
  const activeSubmitting = activeProblem ? problemSubmitting[activeProblem.id || activeProblem.slug] || false : false;
  const activeRunning = activeProblem ? problemRunning[activeProblem.id || activeProblem.slug] || false : false;
  const langConfig = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0];

  const sessionStartMs = getVirtualStartMs();
  const sessionSubs = mySubmissions.filter((sub) => new Date(sub.created_at).getTime() >= sessionStartMs);
  const sessionAcCount = sessionSubs.filter((sub) => ['accepted', 'ac', 'accepted! solution passed all test cases.'].includes(String(sub.verdict).toLowerCase())).length;
  const sessionWrongCount = sessionSubs.length - sessionAcCount;

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
    if (isVirtual) {
      setVirtualCompleted(true);
      setShowCongrats(true);
    } else {
      setShowLiveExpired(true);
    }
  }, [activeProblem, contest, slug, language, code, isVirtual, showToast]);

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

  const submissionsStorageKey = (contest && user) ? `submissions_${contest.slug}_${user.username}` : '';

  // Load session submissions on mount
  useEffect(() => {
    if (submissionsStorageKey) {
      const saved = localStorage.getItem(submissionsStorageKey);
      if (saved) {
        try {
          setMySubmissions(JSON.parse(saved));
        } catch (e) {
          // noop
        }
      }
    }
  }, [submissionsStorageKey]);

  // Update session submissions helper
  const saveSubmissions = (newSubs) => {
    setMySubmissions(newSubs);
    if (submissionsStorageKey) {
      localStorage.setItem(submissionsStorageKey, JSON.stringify(newSubs));
    }
  };

  // Calculate elapsed time string relative to start time
  const getElapsedString = (subTimeStr) => {
    if (!contest) return '00:00';
    const storageKey = `virtual_start_${contest.slug}`;
    const startTimeStr = localStorage.getItem(storageKey);
    const startMs = isVirtual
      ? (startTimeStr ? parseInt(startTimeStr, 10) : Date.now())
      : new Date(contest.start_time).getTime();
    
    const diffMs = new Date(subTimeStr).getTime() - startMs;
    if (diffMs < 0) return '00:00';
    
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Fetch standings
  const fetchStandings = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const data = await getContestLeaderboard(slug);
      setLeaderboard(data || []);
    } catch (err) {
      console.warn('Failed to load standings in arena:', err);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [slug]);

  // Fetch leaderboard standings in Arena on overview tab change
  useEffect(() => {
    if (activeProblemIdx === null && overviewTab === 'standings') {
      fetchStandings();
    }
  }, [activeProblemIdx, overviewTab, fetchStandings]);

  // Calculate virtual score/penalty
  const getVirtualUserData = () => {
    if (!contest || !user) return null;
    const storageKey = `virtual_start_${contest.slug}`;
    const startTimeStr = localStorage.getItem(storageKey);
    const virtualStart = startTimeStr ? parseInt(startTimeStr, 10) : Date.now();

    const problemSubMap = {};
    mySubmissions.forEach((sub) => {
      const pId = sub.problem_id;
      if (!problemSubMap[pId]) problemSubMap[pId] = [];
      problemSubMap[pId].push(sub);
    });

    let totalScore = 0;
    let totalPenalty = 0;

    problems.forEach((p) => {
      const subs = problemSubMap[p.id || p.slug] || [];
      const sortedSubs = [...subs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      const firstAcIdx = sortedSubs.findIndex((s) => ['accepted', 'AC'].includes(String(s.verdict).toUpperCase()));
      if (firstAcIdx !== -1) {
        totalScore += (p.points || 100);
        const acSub = sortedSubs[firstAcIdx];
        const elapsedMinutes = Math.floor((new Date(acSub.created_at).getTime() - virtualStart) / 60000);
        const wrongAttempts = firstAcIdx;
        totalPenalty += elapsedMinutes + (wrongAttempts * 20);
      }
    });

    return {
      username: user.username,
      total_score: totalScore,
      penalty_minutes: totalPenalty,
      is_current_user: true,
      rank: 1,
    };
  };

  // Merge virtual user entry into the standings list
  const getMergedLeaderboard = () => {
    let list = [...leaderboard];
    if (isVirtual && user) {
      const virtualUser = getVirtualUserData();
      if (virtualUser) {
        list = list.filter((e) => e.username !== user.username);
        list.push(virtualUser);
      }
    }
    list.sort((a, b) => {
      const bScore = b.total_score ?? b.score ?? 0;
      const aScore = a.total_score ?? a.score ?? 0;
      if (bScore !== aScore) {
        return bScore - aScore;
      }
      const aPenalty = a.penalty_minutes ?? a.penalty ?? 0;
      const bPenalty = b.penalty_minutes ?? b.penalty ?? 0;
      return aPenalty - bPenalty;
    });
    return list.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  };

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

  // Sync language on problem change
  useEffect(() => {
    if (!contest || activeProblemIdx === null) return;
    const currentProb = problems[activeProblemIdx];
    if (!currentProb) return;

    const savedLang = localStorage.getItem(`contest_lang_${contest.slug}_${currentProb.slug}`);
    if (savedLang) {
      setLanguage(savedLang);
    } else {
      const prefLang = localStorage.getItem('preferredLanguage') || 'python';
      setLanguage(prefLang);
    }
  }, [activeProblemIdx, contest, problems]);

  // Handle language change
  const handleLanguageChange = useCallback((newLang) => {
    setLanguage(newLang);
    localStorage.setItem('preferredLanguage', newLang);
    
    if (contest && activeProblemIdx !== null) {
      const currentProb = problems[activeProblemIdx];
      if (currentProb) {
        localStorage.setItem(`contest_lang_${contest.slug}_${currentProb.slug}`, newLang);
      }
    }
  }, [contest, activeProblemIdx, problems]);

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

        const rawStatus = data.status_label || data.status || 'ended';
        const runtimeStatus = rawStatus.toLowerCase();
        const isEndedStatus = ['ended', 'past', 'completed', 'finished', 'closed'].includes(runtimeStatus);

        // Non-virtual: attempt auto-registration for public live matches if not registered
        if (!isVirtual && runtimeStatus === 'live' && !data.is_registered) {
          if (!data.access_code_required) {
            try {
              await registerForContest(slug);
              data.is_registered = true;
            } catch (regErr) {
              console.warn('Auto registration failed:', regErr);
            }
          }
        }

        // Non-virtual: redirect if not yet started, not registered for live, or already ended
        if (!isVirtual) {
          if (runtimeStatus === 'upcoming' || (runtimeStatus === 'live' && !data.is_registered) || isEndedStatus) {
            setLoading(false);
            navigate(`/contests/${slug}`);
            return;
          }
        }

        // Virtual mode: only allow for ended/past/completed contests
        if (isVirtual && !isEndedStatus) {
          setLoading(false);
          navigate(`/contests/${slug}`);
          return;
        }

        setContest(data);
        const contestProblems = data.problems || [];
        setProblems((prev) => {
          return contestProblems.map((p) => {
            const existing = prev.find((ep) => ep.slug === p.slug || ep.id === p.id);
            if (existing && existing.description) {
              return { ...p, ...existing };
            }
            return p;
          });
        });

        const statuses = {};
        contestProblems.forEach((p) => {
          if (isVirtual) {
            const hasAc = mySubmissions.some(
              (sub) =>
                (sub.problem_id === p.id || sub.problem_id === p.slug) &&
                ['accepted', 'ac', 'accepted! solution passed all test cases.'].includes(String(sub.verdict).toLowerCase()) &&
                new Date(sub.created_at).getTime() >= sessionStartMs
            );
            const hasAttempt = mySubmissions.some(
              (sub) =>
                (sub.problem_id === p.id || sub.problem_id === p.slug) &&
                new Date(sub.created_at).getTime() >= sessionStartMs
            );
            statuses[p.id || p.slug] = hasAc ? 'solved' : (hasAttempt ? 'attempted' : 'untouched');
          } else {
            statuses[p.id || p.slug] = p.user_status || 'untouched';
          }
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
  }, [slug, isVirtual]);



  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!activeProblem || timer.isExpired) return;
    const problemKey = activeProblem.id || activeProblem.slug;
    setProblemSubmitting((prev) => ({ ...prev, [problemKey]: true }));
    setConsoleOpen(true);

    showToast('Submitted — Queued for Evaluation.', 'info');

    try {
      const codeValue = editorRef.current?.getValue?.() || code;
      const result = await submitContestSolution(
        contest?.slug || slug,
        activeProblem.id || activeProblem.slug,
        { language, code: codeValue }
      );

      // Save output in the run result dictionary
      setProblemRunResults((prev) => ({ ...prev, [problemKey]: result }));

      const isAccepted = ['accepted', 'ac', 'accepted! solution passed all test cases.'].includes(String(result.verdict || result.status).toLowerCase());

      // Create new submission record with saved code and passed testcase metrics
      const elapsed = getElapsedString(new Date().toISOString());
      const newSub = {
        id: result.submission_id || Date.now(),
        problem_id: activeProblem.id || activeProblem.slug,
        problem_title: activeProblem.title,
        problem_index: String.fromCharCode(65 + activeProblemIdx),
        language: language,
        code: codeValue,
        verdict: result.verdict || result.status || 'Failed',
        created_at: new Date().toISOString(),
        elapsed_time: elapsed,
        score: isAccepted ? (activeProblem.points || 100) : 0,
        test_cases_passed: result.passed_count ?? 0,
        total_test_cases: result.total_count ?? 0,
      };

      const updatedSubs = [newSub, ...mySubmissions];
      saveSubmissions(updatedSubs);

      if (isAccepted) {
        setProblemStatuses((prev) => {
          const nextStatuses = { ...prev, [problemKey]: 'solved' };
          // Check if all problems are now solved!
          if (problems.length > 0) {
            const allSolved = problems.every((p) => nextStatuses[p.id || p.slug] === 'solved');
            if (allSolved) {
              if (isVirtual) {
                showToast('Congratulations! You solved all problems. Virtual contest completed!', 'success', 6000);
                setVirtualCompleted(true);
                setShowCongrats(true);
              } else {
                showToast('Congratulations! You solved all problems in the contest!', 'success', 6000);
                setShowLiveComplete(true);
              }
            }
          }
          return nextStatuses;
        });
        showToast('Accepted! Solution passed all test cases.', 'success');
      } else {
        setProblemStatuses((prev) => ({ ...prev, [problemKey]: 'attempted' }));
        showToast(`Verdict: ${result.verdict || result.status || 'Not accepted'}`, 'error');
      }
    } catch (err) {
      setProblemRunResults((prev) => ({
        ...prev,
        [problemKey]: { error: true, stderr: err.message || 'Submission failed.' }
      }));
      setProblemStatuses((prev) => ({ ...prev, [problemKey]: 'attempted' }));
      showToast('Evaluation updated with error.', 'error');
    } finally {
      setProblemSubmitting((prev) => ({ ...prev, [problemKey]: false }));
    }
  }, [activeProblem, timer.isExpired, code, contest, slug, language, showToast, activeProblemIdx, mySubmissions, isVirtual, problems]);

  // Handle run code against sample cases
  const handleRun = useCallback(async () => {
    if (!activeProblem || timer.isExpired) return;
    const problemKey = activeProblem.id || activeProblem.slug;
    setProblemRunning((prev) => ({ ...prev, [problemKey]: true }));
    setConsoleOpen(true);
    showToast('Running code against sample testcases...', 'info');

    try {
      const codeValue = editorRef.current?.getValue?.() || code;
      const result = await runContestCode(
        contest?.slug || slug,
        activeProblem.id || activeProblem.slug,
        { language, code: codeValue }
      );

      setProblemRunResults((prev) => ({ ...prev, [problemKey]: result }));

      if (result.status === 'success' || result.verdict === 'Accepted') {
        showToast('Execution finished successfully.', 'success');
      } else {
        showToast(`Execution status: ${result.status || result.verdict || 'finished'}`, 'warning');
      }
    } catch (err) {
      setProblemRunResults((prev) => ({
        ...prev,
        [problemKey]: { error: true, stderr: err.message || 'Execution failed.' }
      }));
      showToast('Execution failed.', 'error');
    } finally {
      setProblemRunning((prev) => ({ ...prev, [problemKey]: false }));
    }
  }, [activeProblem, timer.isExpired, code, contest, slug, language, showToast]);

  // Select problem
  const handleSelectProblem = useCallback(async (idx) => {
    setActiveProblemIdx(idx);

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
          {isVirtual ? (
            <span className="ca-mode-badge ca-mode-badge--virtual">VIRTUAL</span>
          ) : (
            <span className="ca-mode-badge ca-mode-badge--live">
              <span className="ca-ping-dot" /> LIVE
            </span>
          )}

          {/* Collapse Description Toggle Button (only when editing a problem) */}
          {activeProblemIdx !== null && (
            <>
              <span className="ca-header-sep" />
              <button
                className="ca-back-btn"
                onClick={() => setDescriptionCollapsed(!descriptionCollapsed)}
                title={descriptionCollapsed ? "Show description panel" : "Hide description panel"}
                style={{ color: !descriptionCollapsed ? 'var(--accent)' : 'var(--text-secondary)' }}
              >
                <Columns size={14} />
              </button>
            </>
          )}

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
          <CountdownClock timer={timer} isVirtual={isVirtual} virtualCompleted={virtualCompleted} />
        </div>
      </header>

      {/* Workspace */}
      <div className="ca-body">
        <div className="ca-workspace">
          {/* Sidebar - Problem List */}
          {/* When collapsed, a thin restore tab remains visible */}
          <aside className={`ca-sidebar ${sidebarCollapsed ? 'ca-sidebar--collapsed' : ''}`}>
            {sidebarCollapsed ? (
              /* Restore button — always visible even when sidebar is 0-width */
              <button
                className="ca-sidebar-restore"
                onClick={() => setSidebarCollapsed(false)}
                title="Show problem list"
                aria-label="Expand problem list"
              >
                <LayoutGrid size={14} />
              </button>
            ) : (
              <>
                <div className="ca-sidebar-header">
                  <span className="ca-sidebar-title">Problem List</span>
                  <button className="ca-sidebar-toggle" onClick={() => setSidebarCollapsed(true)} title="Hide problem list">
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
              </>
            )}
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

                  {/* Overview Tabs Selector */}
                  <div className="ca-overview-tabs">
                    <button
                      className={`ca-overview-tab ${overviewTab === 'dashboard' ? 'ca-overview-tab--active' : ''}`}
                      onClick={() => setOverviewTab('dashboard')}
                    >
                      Dashboard
                    </button>
                    <button
                      className={`ca-overview-tab ${overviewTab === 'standings' ? 'ca-overview-tab--active' : ''}`}
                      onClick={() => setOverviewTab('standings')}
                    >
                      Standings
                    </button>
                    <button
                      className={`ca-overview-tab ${overviewTab === 'submissions' ? 'ca-overview-tab--active' : ''}`}
                      onClick={() => setOverviewTab('submissions')}
                    >
                      My Submissions ({mySubmissions.length})
                    </button>
                  </div>

                  {/* Tab Contents */}
                  {overviewTab === 'dashboard' && (
                    <div className="ca-tab-content">
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
                            <li>Standings update automatically as you solve</li>
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
                            <li>Session drafts are auto-saved locally</li>
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
                  )}

                  {overviewTab === 'standings' && (
                    <div className="ca-tab-content ca-tab-content--standings">
                      {leaderboardLoading ? (
                        <div className="ca-tab-loading">
                          <Loader2 size={24} className="ca-loading-spinner" />
                          <span>Loading standings...</span>
                        </div>
                      ) : (
                        <Leaderboard
                          leaderboard={getMergedLeaderboard().map((entry) => ({
                            username: entry.username,
                            score: entry.total_score,
                            penalty: entry.penalty_minutes,
                            rank: entry.rank,
                            elo_shift: entry.elo_change,
                            is_current_user: entry.username === user?.username,
                          }))}
                          title={isVirtual ? "Virtual Standings" : "Live Standings"}
                        />
                      )}
                    </div>
                  )}

                  {overviewTab === 'submissions' && (
                    <div className="ca-tab-content">
                      <div className="ca-submissions-table">
                        <div className="ca-submissions-header">
                          <span>Time</span>
                          <span>Problem</span>
                          <span>Language</span>
                          <span>Verdict</span>
                          <span>Score</span>
                        </div>
                        {mySubmissions.length === 0 ? (
                          <div className="ca-submissions-empty">
                            <Terminal size={24} />
                            <p>No submissions in this session yet.</p>
                          </div>
                        ) : (
                          mySubmissions.map((sub) => (
                            <div key={sub.id} className="ca-submissions-row">
                              <span className="ca-sub-time">{sub.elapsed_time || '—'}</span>
                              <span className="ca-sub-prob">{sub.problem_index}. {sub.problem_title}</span>
                              <span className="ca-sub-lang">{sub.language}</span>
                              <span className={`ca-sub-verdict ${sub.verdict.toLowerCase() === 'accepted' || sub.verdict.toLowerCase() === 'ac' ? 'ca-sub-verdict--success' : 'ca-sub-verdict--error'}`}>
                                {sub.verdict}
                              </span>
                              <span className="ca-sub-score">{sub.score} pts</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Split Layout - Problem + Editor
              <div className="ca-split" ref={splitContainerRef}>
                {/* Left - Problem Description */}
                <section
                  className={`ca-description ${descriptionCollapsed ? 'ca-description--collapsed' : ''}`}
                  style={!descriptionCollapsed ? { width: `${descWidth}%` } : undefined}
                >
                  {/* Collapse toggle — always visible on description edge */}
                  <button
                    className="ca-desc-toggle"
                    onClick={() => setDescriptionCollapsed(!descriptionCollapsed)}
                    title={descriptionCollapsed ? 'Expand problem description' : 'Collapse problem description'}
                    aria-label={descriptionCollapsed ? 'Expand problem description' : 'Collapse problem description'}
                  >
                    {descriptionCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
                  </button>
                  {!descriptionCollapsed && activeProblem && (
                    <ProblemDescription
                      problem={activeProblem}
                      submissions={mySubmissions.filter((sub) => {
                        const isForThisProblem = sub.problem_id === activeProblem.id || sub.problem_id === activeProblem.slug;
                        const sessionStart = isVirtual ? getVirtualStartMs() : new Date(contest?.start_time || 0).getTime();
                        return isForThisProblem && new Date(sub.created_at).getTime() >= sessionStart;
                      })}
                      maxExamples={1}
                    />
                  )}
                </section>

                {/* Resize handle between description and editor */}
                {!descriptionCollapsed && (
                  <div
                    className="ca-split-handle"
                    onMouseDown={handleDescResizeStart}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Drag to resize"
                    title="Drag to resize"
                  />
                )}

                {/* Right - Editor + Console */}
                <div className="ca-editor">
                  <div className="ca-editor-container" style={{ height: consoleOpen ? `calc(100% - ${terminalHeight})` : '100%' }}>
                    <Editor
                      height="100%"
                      language={langConfig.monaco}
                      value={code}
                      onChange={handleCodeChange}
                      onMount={handleEditorMount}
                      theme={theme === 'dark' ? 'vs-dark' : 'light'}
                      options={{
                        readOnly: timer.isExpired,
                        fontSize: 14,
                        fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        padding: { top: 16, bottom: 16 },
                        lineNumbers: 'on',
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
                        quickSuggestions: false,
                        parameterHints: { enabled: false },
                        suggestOnTriggerCharacters: false,
                        tabCompletion: "off",
                        wordBasedSuggestions: "none",
                        contextmenu: false, // Disables the right click context menu completely!
                        automaticLayout: true,
                      }}
                    />
                  </div>

                  {/* Console — header always visible, only body collapses */}
                  <div className="ca-console" style={{ height: consoleOpen ? terminalHeight : 'auto' }}>
                    {consoleOpen && (
                      <div
                        className={`ca-console-resize-handle ${isResizingTerminal ? 'ca-console-resize-handle--active' : ''}`}
                        onMouseDown={handleTerminalMouseDown}
                      />
                    )}
                    <div className="ca-console-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        <Terminal size={13} style={{ color: 'var(--accent)' }} />
                        <span>Console Output</span>
                      </div>
                      <div className="ca-console-actions">
                        <button
                          className="ca-btn ca-btn--primary"
                          onClick={handleSubmit}
                          disabled={timer.isExpired || activeSubmitting || !activeProblem}
                        >
                          {activeSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          <span>Submit Solution</span>
                        </button>
                        <button
                          className="ca-console-close"
                          onClick={() => setConsoleOpen(!consoleOpen)}
                          title={consoleOpen ? 'Minimize console' : 'Expand console'}
                          aria-label={consoleOpen ? 'Minimize console' : 'Expand console'}
                        >
                          {consoleOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                        </button>
                      </div>
                    </div>
 
                    <div className={`ca-console-body-wrap${consoleOpen ? ' ca-console-body-wrap--open' : ''}`} style={{ flex: 1 }}>
                      <div className="ca-console-body">
                        {activeSubmitting && (
                          <div className="ca-console-loading">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Submitting solution...</span>
                          </div>
                        )}
 
                        {runResult && !activeSubmitting && (
                          <div className="ca-console-results">
                            {(runResult.verdict || runResult.status) && (
                              <div className={`ca-console-result ca-console-result--${['accepted', 'ac', 'accepted! solution passed all test cases.'].includes(String(runResult.verdict || runResult.status).toLowerCase()) ? 'success' : 'error'}`}>
                                Verdict: {runResult.verdict || runResult.status}
                              </div>
                            )}
 
                            {/* Compilation Error details */}
                            {runResult.compile_error && (
                              <div style={{ marginTop: 'var(--space-2)' }}>
                                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--danger)', display: 'block', marginBottom: '4px' }}>Compilation Error Trace:</span>
                                <pre className="ca-console-output ca-console-output--error" style={{ whiteSpace: 'pre-wrap' }}>{filterCompileError(runResult.compile_error)}</pre>
                              </div>
                            )}
 
                            {/* Runtime Error details inside results list */}
                            {runResult.results?.map((res, i) => {
                              if (res.error) {
                                  return (
                                    <div key={i} style={{ marginTop: 'var(--space-2)' }}>
                                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--danger)', display: 'block', marginBottom: '4px' }}>Testcase {i + 1} Execution Error:</span>
                                      <pre className="ca-console-output ca-console-output--error" style={{ whiteSpace: 'pre-wrap' }}>{res.error}</pre>
                                    </div>
                                  );
                                }
                                return null;
                              })}
  
                              {runResult.stdout && (
                                <pre className="ca-console-output">{runResult.stdout}</pre>
                              )}
                              {runResult.stderr && (
                                <pre className="ca-console-output ca-console-output--error">{runResult.stderr}</pre>
                              )}
                            </div>
                          )}
  
                          {!runResult && !activeSubmitting && (
                          <div className="ca-console-empty">
                            <Terminal size={20} />
                            <p>Submit code to see evaluation results</p>
                          </div>
                        )}
                      </div>
                    </div>{/* /ca-console-body-wrap */}
                  </div>{/* /ca-console */}
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
            {/* Danger accent bar */}
            <div className="ca-modal-accent-bar" />

            <div className="ca-modal-header">
              <div className="ca-modal-icon-wrap">
                <AlertTriangle size={22} />
              </div>
              <div className="ca-modal-header-text">
                <h3 className="ca-modal-title">Exit Virtual Simulation?</h3>
                <p className="ca-modal-subtitle">This action cannot be undone</p>
              </div>
            </div>

            <div className="ca-modal-body">
              <p>Exiting will <strong>terminate your simulation session</strong>, reset the countdown timer, and permanently delete all drafted solutions for this contest.</p>
            </div>

            <div className="ca-modal-actions">
              <button
                className="ca-modal-btn ca-modal-btn--ghost"
                onClick={() => setShowExitConfirm(false)}
              >
                Stay and Code
              </button>
              <button
                className="ca-modal-btn ca-modal-btn--danger"
                onClick={() => {
                  resetVirtualContestData(contest?.slug, problems);
                  setShowExitConfirm(false);
                  navigate('/contests');
                }}
              >
                <AlertTriangle size={13} />
                Confirm Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Congratulations Overlay */}
      {showCongrats && (
        <div className="ca-congrats-overlay">
          <div className="ca-congrats-card animate-fade-in">
            <div className="ca-congrats-trophy">🏆</div>
            <h1 className="ca-congrats-title">Congratulations!</h1>
            <p className="ca-congrats-subtitle">
              You successfully solved all problems in the virtual contest!
            </p>
            
            <div className="ca-congrats-contest-name">
              {contest?.title || 'Contest Simulation'}
            </div>

            <div className="ca-stats-grid">
              <div className="ca-stat-item">
                <span className="ca-stat-label">Completion Time</span>
                <span className="ca-stat-value">
                  {formatDuration(getLastAcTime() - sessionStartMs)}
                </span>
                <span className="ca-stat-desc">from start</span>
              </div>
              <div className="ca-stat-item">
                <span className="ca-stat-label">Score Earned</span>
                <span className="ca-stat-value">
                  {getVirtualUserData()?.total_score || 0} pts
                </span>
                <span className="ca-stat-desc">max points</span>
              </div>
              <div className="ca-stat-item">
                <span className="ca-stat-label">Total Attempts</span>
                <span className="ca-stat-value">
                  {sessionSubs.length}
                </span>
                <span className="ca-stat-desc">
                  ({sessionWrongCount} wrong attempts)
                </span>
              </div>
            </div>

            <div className="ca-congrats-actions">
              <button 
                className="ca-congrats-btn ca-btn ca-btn--primary"
                onClick={() => {
                  resetVirtualContestData(contest?.slug, problems);
                  navigate('/contests');
                }}
              >
                Return to Contests
              </button>
              <button 
                className="ca-congrats-btn ca-btn ca-btn--secondary"
                style={{ marginLeft: 'var(--space-2)' }}
                onClick={() => {
                  setShowCongrats(false);
                }}
              >
                Review Code / Standings
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Live Contest Solved All Overlay */}
      {showLiveComplete && (
        <div className="ca-live-complete-overlay">
          <div className="ca-live-card animate-fade-in">
            <div className="ca-live-icon">🎉</div>
            <h1 className="ca-live-title">Contest Completed!</h1>
            <p className="ca-live-desc">
              Congratulations! You have successfully solved all problems in this live contest. You can leave now and wait for the final results to be calculated, or you can keep reviewing your code until the schedule clock ends.
            </p>
            <div className="ca-live-actions">
              <button 
                className="ca-congrats-btn ca-btn ca-btn--primary"
                onClick={() => {
                  navigate('/contests');
                }}
              >
                Exit Contest
              </button>
              <button 
                className="ca-congrats-btn ca-btn ca-btn--secondary"
                style={{ marginLeft: 'var(--space-2)' }}
                onClick={() => {
                  setShowLiveComplete(false);
                }}
              >
                Keep Reviewing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Contest Timer Expired Overlay */}
      {showLiveExpired && (
        <div className="ca-live-expired-overlay">
          <div className="ca-live-card ca-live-card--expired animate-fade-in">
            <div className="ca-live-icon">⏱️</div>
            <h1 className="ca-live-title">Contest Has Ended</h1>
            <p className="ca-live-desc">
              The contest duration has expired. Thank you for your participation! The evaluation window is now closed, and final official rankings will be announced shortly.
            </p>
            <div className="ca-live-actions">
              <button 
                className="ca-congrats-btn ca-btn ca-btn--primary"
                style={{ width: '100%' }}
                onClick={() => {
                  navigate('/contests');
                }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContestArenaPage;