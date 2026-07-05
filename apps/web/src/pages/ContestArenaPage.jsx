// apps/web/src/pages/ContestArenaPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  ChevronDown,
  Trophy,
  FileText,
  Play,
  Send,
  Check,
  X,
  Clock,
  Loader2,
  AlertCircle,
  Terminal,
  FlaskConical,
  ChevronUp,
  Copy,
  CheckCheck,
  Circle,
  CircleDot,
  CheckCircle2,
} from 'lucide-react'
import { getContestDetails, getContestLeaderboard, submitContestSolution, runContestCode } from '../lib/contests'
import { useContestTimer } from '../hooks/useContestTimer'

// ─── Language Configuration ────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'python', label: 'Python 3', monaco: 'python', template: '# Write your solution here\n\n' },
  { id: 'cpp', label: 'C++ 17', monaco: 'cpp', template: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n' },
  { id: 'java', label: 'Java', monaco: 'java', template: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}\n' },
]

// ─── Difficulty Color Map ──────────────────────────────────────────────────────
const DIFFICULTY_COLORS = {
  easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  hard: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
}

// ─── Toast Notification Component ──────────────────────────────────────────────
function Toast({ message, type = 'info', visible, onDismiss }) {
  if (!visible) return null

  const colors = {
    info: 'bg-indigo-950/90 border-indigo-500/40 text-indigo-200',
    success: 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200',
    warning: 'bg-amber-950/90 border-amber-500/40 text-amber-200',
    error: 'bg-rose-950/90 border-rose-500/40 text-rose-200',
  }

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-in-top`}>
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl ${colors[type] || colors.info}`}>
        {type === 'success' && <Check className="w-4 h-4 shrink-0" />}
        {type === 'warning' && <AlertCircle className="w-4 h-4 shrink-0" />}
        {type === 'error' && <X className="w-4 h-4 shrink-0" />}
        {type === 'info' && <Clock className="w-4 h-4 shrink-0" />}
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onDismiss} className="ml-2 p-0.5 rounded hover:bg-white/10 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Copy Button ───────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* noop */ }
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/60 transition-all"
      title="Copy"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

// ─── Countdown Clock Display ───────────────────────────────────────────────────
function CountdownClock({ timer }) {
  const { formatted, isExpired, isWarning, isCritical } = timer

  let borderClass = 'border-zinc-700/60'
  let textClass = 'text-zinc-300'
  let bgClass = 'bg-zinc-900/60'
  let glowStyle = {}

  if (isExpired) {
    borderClass = 'border-rose-500/60'
    textClass = 'text-rose-400'
    bgClass = 'bg-rose-950/30'
  } else if (isCritical) {
    borderClass = 'border-rose-500/60'
    textClass = 'text-rose-400'
    bgClass = 'bg-rose-950/20'
    glowStyle = { textShadow: '0 0 12px rgba(244,63,94,0.4)' }
  } else if (isWarning) {
    borderClass = 'border-amber-500/50'
    textClass = 'text-amber-400'
    bgClass = 'bg-amber-950/20'
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border ${borderClass} ${bgClass} transition-all duration-500`}>
      <Clock className={`w-3.5 h-3.5 ${textClass} transition-colors duration-500`} />
      <span
        className={`text-sm font-mono font-bold tabular-nums tracking-wider ${textClass} transition-colors duration-500`}
        style={glowStyle}
      >
        {isExpired ? '00:00' : formatted}
      </span>
    </div>
  )
}

// ─── Language Dropdown ─────────────────────────────────────────────────────────
function LanguageSelect({ selectedId, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selected = LANGUAGES.find((l) => l.id === selectedId) || LANGUAGES[0]

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-900/60 border border-zinc-700/60 hover:border-zinc-600 hover:bg-zinc-800/60 transition-all duration-200 disabled:opacity-50"
      >
        {selected.label}
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 w-40 rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-md shadow-2xl overflow-hidden z-40">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => { onChange(lang.id); setOpen(false) }}
              className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-all duration-150 ${
                lang.id === selectedId
                  ? 'bg-indigo-500/10 text-indigo-400'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Problem Status Icon ───────────────────────────────────────────────────────
function ProblemStatusIcon({ status }) {
  if (status === 'solved') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
  if (status === 'attempted') return <CircleDot className="w-4 h-4 text-amber-400" />
  return <Circle className="w-4 h-4 text-zinc-700" />
}

// ─── Compact Arena Leaderboard ─────────────────────────────────────────────────
function ArenaLeaderboard({ leaderboard, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
        <Trophy className="w-8 h-8 mb-2 text-zinc-700" />
        <p className="text-xs">No standings yet</p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto flex-1">
      {/* Column headers */}
      <div className="grid grid-cols-[32px_1fr_52px_52px] gap-1.5 px-3 py-2 text-[10px] font-medium text-zinc-600 uppercase tracking-wider border-b border-zinc-800/40 sticky top-0 bg-[#0e0e11]">
        <span>#</span>
        <span>User</span>
        <span className="text-right">Score</span>
        <span className="text-right">Pen.</span>
      </div>

      {leaderboard.slice(0, 50).map((entry, idx) => {
        const rank = entry.rank || idx + 1
        return (
          <div
            key={entry.username || idx}
            className="grid grid-cols-[32px_1fr_52px_52px] gap-1.5 items-center px-3 py-2 text-xs border-b border-zinc-800/20 last:border-b-0 hover:bg-indigo-500/[0.03] transition-colors"
          >
            <span className={`font-semibold tabular-nums ${rank <= 3 ? 'text-amber-400' : 'text-zinc-600'}`}>{rank}</span>
            <span className="text-zinc-400 truncate">{entry.username}</span>
            <span className="text-right text-emerald-400 font-semibold tabular-nums">{entry.score ?? 0}</span>
            <span className="text-right text-zinc-500 tabular-nums">{entry.penalty ?? 0}</span>
          </div>
        )
      })}
    </div>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT — ContestArenaPage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function ContestArenaPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  // ─── Core Data State ───────────────────────────────────────────────────
  const [contest, setContest] = useState(null)
  const [problems, setProblems] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [error, setError] = useState(null)

  // ─── Workspace State ───────────────────────────────────────────────────
  const [activeProblemIdx, setActiveProblemIdx] = useState(0)
  const [activeLeftTab, setActiveLeftTab] = useState('problems') // 'problems' | 'standings'
  const [language, setLanguage] = useState('python')
  const [consoleOpen, setConsoleOpen] = useState(true)
  const [consoleTab, setConsoleTab] = useState('testcases') // 'testcases' | 'output'

  // ─── Editor Code Buffers (per-problem, per-language) ───────────────────
  const [codeBuffers, setCodeBuffers] = useState({})

  // ─── Execution State ───────────────────────────────────────────────────
  const [runResult, setRunResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [running, setRunning] = useState(false)
  const [customInput, setCustomInput] = useState('')

  // ─── Problem Solve Status Tracking ─────────────────────────────────────
  const [problemStatuses, setProblemStatuses] = useState({})

  // ─── Toast State ───────────────────────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' })

  const editorRef = useRef(null)

  // ─── Derived Values ────────────────────────────────────────────────────
  const activeProblem = problems[activeProblemIdx] || null
  const langConfig = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0]

  // Build a unique buffer key for current problem + language
  const bufferKey = activeProblem ? `${activeProblem.id || activeProblemIdx}__${language}` : null

  // Get current code from buffer, or initialize with template
  const currentCode = bufferKey
    ? (codeBuffers[bufferKey] ?? langConfig.template)
    : langConfig.template

  // ─── Toast Helper ──────────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    setToast({ visible: true, message, type })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), duration)
  }, [])

  // ─── Timer Expiry Handler ──────────────────────────────────────────────
  const handleTimerExpire = useCallback(async () => {
    // Capture current editor buffer
    const code = editorRef.current?.getValue?.() || currentCode

    if (activeProblem && code.trim()) {
      try {
        await submitContestSolution(
          contest?.slug || slug,
          activeProblem.id || activeProblem.slug,
          { language, code }
        )
      } catch {
        // Silent fail — we still want to redirect
      }
    }

    showToast("⏰ Time's up! Your solution has been auto-submitted.", 'warning', 5000)

    // Redirect after short delay
    setTimeout(() => {
      navigate('/contests', { replace: true })
    }, 2500)
  }, [activeProblem, contest, slug, language, currentCode, navigate, showToast])

  // ─── Timer Hook ────────────────────────────────────────────────────────
  const timer = useContestTimer(contest?.end_time || null, handleTimerExpire)

  // ─── Fetch Contest Data ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getContestDetails(slug)
        if (cancelled) return

        setContest(data)
        const contestProblems = data.problems || []
        setProblems(contestProblems)

        // Initialize status tracking
        const statuses = {}
        contestProblems.forEach((p) => {
          statuses[p.id || p.slug] = p.user_status || 'untouched'
        })
        setProblemStatuses(statuses)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load contest.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [slug])

  // ─── Fetch Leaderboard ─────────────────────────────────────────────────
  useEffect(() => {
    if (!contest) return

    let cancelled = false
    const fetchLB = async () => {
      setLeaderboardLoading(true)
      try {
        const data = await getContestLeaderboard(contest.id || slug)
        if (!cancelled) setLeaderboard(data.results || data || [])
      } catch {
        // Non-critical — don't set error
      } finally {
        if (!cancelled) setLeaderboardLoading(false)
      }
    }

    fetchLB()
    // Refresh leaderboard every 60s during live contest
    const interval = setInterval(fetchLB, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [contest, slug])

  // ─── Code Buffer Management ────────────────────────────────────────────
  const handleCodeChange = useCallback((value) => {
    if (!bufferKey) return
    setCodeBuffers((prev) => ({ ...prev, [bufferKey]: value || '' }))
  }, [bufferKey])

  // ─── Editor Mount ──────────────────────────────────────────────────────
  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  // ─── Run Code ──────────────────────────────────────────────────────────
  const handleRunCode = useCallback(async () => {
    if (!activeProblem || timer.isExpired) return
    setRunning(true)
    setConsoleTab('output')
    setConsoleOpen(true)
    setRunResult(null)

    try {
      const code = editorRef.current?.getValue?.() || currentCode
      const result = await runContestCode(
        contest?.slug || slug,
        activeProblem.id || activeProblem.slug,
        { language, code, input: customInput || undefined }
      )
      setRunResult(result)
    } catch (err) {
      setRunResult({ error: true, stderr: err.message || 'Execution failed.' })
    } finally {
      setRunning(false)
    }
  }, [activeProblem, timer.isExpired, currentCode, contest, slug, language, customInput])

  // ─── Submit Code ───────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!activeProblem || timer.isExpired) return
    setSubmitting(true)
    setConsoleTab('output')
    setConsoleOpen(true)

    try {
      const code = editorRef.current?.getValue?.() || currentCode
      const result = await submitContestSolution(
        contest?.slug || slug,
        activeProblem.id || activeProblem.slug,
        { language, code }
      )
      setRunResult(result)

      // Update problem status
      const problemKey = activeProblem.id || activeProblem.slug
      if (result.verdict === 'accepted' || result.status === 'accepted') {
        setProblemStatuses((prev) => ({ ...prev, [problemKey]: 'solved' }))
        showToast('Accepted! Solution passed all test cases.', 'success')
      } else {
        setProblemStatuses((prev) => ({ ...prev, [problemKey]: 'attempted' }))
        showToast(`Verdict: ${result.verdict || result.status || 'Not accepted'}`, 'error')
      }
    } catch (err) {
      setRunResult({ error: true, stderr: err.message || 'Submission failed.' })
      showToast('Submission failed. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }, [activeProblem, timer.isExpired, currentCode, contest, slug, language, showToast])

  // ─── Problem Selection ─────────────────────────────────────────────────
  const handleSelectProblem = useCallback((idx) => {
    setActiveProblemIdx(idx)
    setRunResult(null)
    setConsoleTab('testcases')
  }, [])

  // ─── Loading State ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
          <p className="text-xs text-zinc-500 font-medium">Loading arena…</p>
        </div>
      </div>
    )
  }

  // ─── Error State ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="h-screen bg-[#0a0a0c] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm text-rose-400 font-medium">{error}</p>
          <button
            onClick={() => navigate('/contests')}
            className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
          >
            Back to Contests
          </button>
        </div>
      </div>
    )
  }

  // ─── Sample I/O from active problem ────────────────────────────────────
  const sampleInputs = activeProblem?.sample_input || activeProblem?.examples?.map((e) => e.input) || []
  const sampleOutputs = activeProblem?.sample_output || activeProblem?.examples?.map((e) => e.output) || []

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  return (
    <div className="h-screen flex flex-col bg-[#0a0a0c] overflow-hidden">
      {/* ─── Toast ──────────────────────────────────────────────────────── */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />

      {/* ═══ TOP HEADER RIBBON HUD ══════════════════════════════════════ */}
      <header className="shrink-0 h-12 flex items-center justify-between px-4 border-b border-zinc-800/60 bg-[#0a0a0c]/90 backdrop-blur-md z-20">
        {/* Left cluster */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/contests')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/60 hover:border-zinc-700 transition-all duration-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </button>

          <div className="h-4 w-px bg-zinc-800/60" />

          <h1 className="text-[13px] font-bold text-zinc-200 truncate max-w-[280px]">
            {contest?.title || 'Contest Arena'}
          </h1>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-3">
          <LanguageSelect
            selectedId={language}
            onChange={setLanguage}
            disabled={timer.isExpired}
          />
          <CountdownClock timer={timer} />
        </div>
      </header>

      {/* ═══ MAIN SPLIT WORKSPACE ═══════════════════════════════════════ */}
      <div className="flex-1 flex min-h-0">

        {/* ─── LEFT PANE (45%) ────────────────────────────────────────── */}
        <div className="w-[45%] shrink-0 flex flex-col border-r border-zinc-800/60 min-h-0">
          {/* Tab bar */}
          <div className="shrink-0 flex border-b border-zinc-800/50 bg-[#0c0c0f]">
            <button
              onClick={() => setActiveLeftTab('problems')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all duration-200 border-b-2 ${
                activeLeftTab === 'problems'
                  ? 'text-indigo-400 border-indigo-500'
                  : 'text-zinc-500 border-transparent hover:text-zinc-400'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Problems
            </button>
            <button
              onClick={() => setActiveLeftTab('standings')}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold transition-all duration-200 border-b-2 ${
                activeLeftTab === 'standings'
                  ? 'text-indigo-400 border-indigo-500'
                  : 'text-zinc-500 border-transparent hover:text-zinc-400'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Standings
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeLeftTab === 'standings' ? (
              <div className="h-full flex flex-col bg-[#0e0e11]">
                <ArenaLeaderboard leaderboard={leaderboard} loading={leaderboardLoading} />
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Problem index list */}
                <div className="shrink-0 border-b border-zinc-800/40 bg-[#0c0c0f]">
                  <div className="flex flex-wrap gap-1 p-2">
                    {problems.map((problem, idx) => {
                      const key = problem.id || problem.slug
                      const status = problemStatuses[key] || 'untouched'
                      const isActive = idx === activeProblemIdx

                      return (
                        <button
                          key={key || idx}
                          onClick={() => handleSelectProblem(idx)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                            isActive
                              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border border-transparent'
                          }`}
                        >
                          <ProblemStatusIcon status={status} />
                          <span>{problem.index || String.fromCharCode(65 + idx)}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Problem description panel */}
                <div className="flex-1 overflow-y-auto p-4 arena-scrollbar">
                  {activeProblem ? (
                    <div className="space-y-4">
                      {/* Title + difficulty */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-base font-bold text-zinc-100">
                            {activeProblem.index || String.fromCharCode(65 + activeProblemIdx)}. {activeProblem.title}
                          </h2>
                          {activeProblem.difficulty && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${DIFFICULTY_COLORS[activeProblem.difficulty?.toLowerCase()] || DIFFICULTY_COLORS.medium}`}>
                              {activeProblem.difficulty}
                            </span>
                          )}
                        </div>
                        {activeProblem.points != null && (
                          <p className="text-xs text-emerald-400 font-medium mt-1">{activeProblem.points} pts</p>
                        )}
                      </div>

                      {/* Description (Markdown) */}
                      <div className="rounded-lg border border-zinc-800/50 bg-[#111113]/60 p-4">
                        <div className="prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed text-[13px] arena-markdown">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {activeProblem.description || 'No description provided.'}
                          </ReactMarkdown>
                        </div>
                      </div>

                      {/* Constraints */}
                      {activeProblem.constraints && (
                        <div className="rounded-lg border border-zinc-800/50 bg-[#111113]/60 p-4">
                          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Constraints</h3>
                          <div className="prose prose-invert prose-sm max-w-none text-zinc-500 text-[12px] leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {activeProblem.constraints}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Sample I/O */}
                      {(Array.isArray(sampleInputs) ? sampleInputs : [sampleInputs]).filter(Boolean).map((input, i) => (
                        <div key={i} className="rounded-lg border border-zinc-800/50 bg-[#111113]/60 p-4 space-y-3">
                          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                            Sample {i + 1}
                          </h3>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Input</span>
                              <CopyButton text={String(input)} />
                            </div>
                            <pre className="px-3 py-2 rounded bg-zinc-950/60 border border-zinc-800/30 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre">{String(input)}</pre>
                          </div>
                          {(Array.isArray(sampleOutputs) ? sampleOutputs[i] : sampleOutputs) && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Output</span>
                                <CopyButton text={String(Array.isArray(sampleOutputs) ? sampleOutputs[i] : sampleOutputs)} />
                              </div>
                              <pre className="px-3 py-2 rounded bg-zinc-950/60 border border-zinc-800/30 text-xs text-emerald-300/80 font-mono overflow-x-auto whitespace-pre">
                                {String(Array.isArray(sampleOutputs) ? sampleOutputs[i] : sampleOutputs)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                      <FileText className="w-8 h-8 mb-2 text-zinc-700" />
                      <p className="text-xs">Select a problem to view</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── RIGHT PANE (55%) ───────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0">

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-0 border-b border-zinc-800/40">
            <Editor
              height="100%"
              language={langConfig.monaco}
              value={currentCode}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                readOnly: timer.isExpired,
                fontSize: 13.5,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
                lineNumbers: 'on',
                renderLineHighlight: 'line',
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                smoothScrolling: true,
                tabSize: 4,
                wordWrap: 'off',
                automaticLayout: true,
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true },
                suggest: { showKeywords: true },
              }}
            />
          </div>

          {/* ─── Evaluation Console ─────────────────────────────────── */}
          <div className={`shrink-0 flex flex-col bg-[#0c0c0f] transition-all duration-300 ${consoleOpen ? 'h-[240px]' : 'h-10'}`}>
            {/* Console header bar */}
            <div className="shrink-0 flex items-center justify-between px-3 h-10 border-t border-zinc-800/50">
              {/* Left — tabs */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setConsoleTab('testcases'); setConsoleOpen(true) }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                    consoleTab === 'testcases' && consoleOpen
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  <FlaskConical className="w-3 h-3" />
                  Test Cases
                </button>
                <button
                  onClick={() => { setConsoleTab('output'); setConsoleOpen(true) }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                    consoleTab === 'output' && consoleOpen
                      ? 'text-indigo-400 bg-indigo-500/10'
                      : 'text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  <Terminal className="w-3 h-3" />
                  Console
                </button>
              </div>

              {/* Right — action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunCode}
                  disabled={timer.isExpired || running || !activeProblem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-300 bg-zinc-800/60 border border-zinc-700/60 hover:bg-zinc-700/60 hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  Run
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={timer.isExpired || submitting || !activeProblem}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-300 bg-emerald-600/10 border border-emerald-500/40 hover:bg-emerald-600/20 hover:border-emerald-400/60 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Submit
                </button>

                {/* Collapse toggle */}
                <button
                  onClick={() => setConsoleOpen(!consoleOpen)}
                  className="p-1 rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 transition-all"
                >
                  {consoleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Console body */}
            {consoleOpen && (
              <div className="flex-1 overflow-y-auto px-3 pb-3 arena-scrollbar">
                {consoleTab === 'testcases' ? (
                  <div className="space-y-3 pt-2">
                    {/* Custom input */}
                    <div>
                      <label className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1 block">
                        Custom Input
                      </label>
                      <textarea
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        disabled={timer.isExpired}
                        placeholder="Enter custom input…"
                        className="w-full h-20 px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/40 text-xs text-zinc-300 font-mono placeholder-zinc-700 resize-none focus:outline-none focus:border-zinc-600 transition-colors disabled:opacity-50"
                      />
                    </div>

                    {/* Sample test cases */}
                    {(Array.isArray(sampleInputs) ? sampleInputs : [sampleInputs]).filter(Boolean).map((input, i) => (
                      <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-zinc-950/40 border border-zinc-800/20">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Case {i + 1} — Input</p>
                          <pre className="text-xs text-zinc-400 font-mono truncate">{String(input).substring(0, 80)}</pre>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Expected</p>
                          <pre className="text-xs text-emerald-400/70 font-mono truncate">
                            {String(Array.isArray(sampleOutputs) ? sampleOutputs[i] : sampleOutputs || '').substring(0, 80)}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Output tab */
                  <div className="pt-2">
                    {(running || submitting) && (
                      <div className="flex items-center gap-2 py-6">
                        <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                        <span className="text-xs text-zinc-500">{submitting ? 'Submitting…' : 'Running…'}</span>
                      </div>
                    )}

                    {runResult && !running && !submitting && (
                      <div className="space-y-3">
                        {/* Verdict */}
                        {(runResult.verdict || runResult.status) && (
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                            ['accepted', 'AC'].includes(runResult.verdict || runResult.status)
                              ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-600/10 text-rose-400 border-rose-500/30'
                          }`}>
                            {['accepted', 'AC'].includes(runResult.verdict || runResult.status)
                              ? <Check className="w-3.5 h-3.5" />
                              : <X className="w-3.5 h-3.5" />}
                            {runResult.verdict || runResult.status}
                          </div>
                        )}

                        {/* Stdout */}
                        {runResult.stdout && (
                          <div>
                            <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Output</p>
                            <pre className="px-3 py-2 rounded-lg bg-zinc-950/60 border border-zinc-800/30 text-xs text-zinc-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto arena-scrollbar">{runResult.stdout}</pre>
                          </div>
                        )}

                        {/* Stderr */}
                        {runResult.stderr && (
                          <div>
                            <p className="text-[10px] font-medium text-rose-500/80 uppercase tracking-wider mb-1">Error</p>
                            <pre className="px-3 py-2 rounded-lg bg-rose-950/20 border border-rose-800/30 text-xs text-rose-300/80 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto arena-scrollbar">{runResult.stderr}</pre>
                          </div>
                        )}

                        {/* Execution time / memory */}
                        {(runResult.time != null || runResult.memory != null) && (
                          <div className="flex items-center gap-4 text-[11px] text-zinc-500">
                            {runResult.time != null && <span>Runtime: <strong className="text-zinc-400">{runResult.time}ms</strong></span>}
                            {runResult.memory != null && <span>Memory: <strong className="text-zinc-400">{runResult.memory}KB</strong></span>}
                          </div>
                        )}
                      </div>
                    )}

                    {!runResult && !running && !submitting && (
                      <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
                        <Terminal className="w-6 h-6 mb-2 text-zinc-700" />
                        <p className="text-xs">Run or submit code to see output</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
