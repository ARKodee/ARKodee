// apps/web/src/pages/ContestArenaPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft,
  ChevronDown,
  Trophy,
  FileText,
  Send,
  Check,
  X,
  Clock,
  Loader2,
  AlertCircle,
  Terminal,
  ChevronUp,
  Copy,
  CheckCheck,
  Circle,
  CircleDot,
  CheckCircle2,
  LayoutGrid,
  Shield,
} from 'lucide-react'
import { getContestDetails, submitContestSolution } from '../lib/contests'
import { getProblemDetails } from '../lib/problems'
import { useContestTimer } from '../hooks/useContestTimer'

// ─── Language Configuration ────────────────────────────────────────────────────
const LANGUAGES = [
  { id: 'python', label: 'Python 3', monaco: 'python', template: '# Write your solution here\n\n' },
  { id: 'cpp', label: 'C++ 17', monaco: 'cpp', template: '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n' },
  { id: 'java', label: 'Java', monaco: 'java', template: 'import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n        Scanner sc = new Scanner(System.in);\n    }\n}\n' },
  { id: 'javascript', label: 'JavaScript', monaco: 'javascript', template: '// Write your solution here\n\n' },
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

export function ContestArenaPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const isVirtual = new URLSearchParams(window.location.search).get('virtual') === 'true'

  // ─── Core Data State ───────────────────────────────────────────────────
  const [contest, setContest] = useState(null)
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ─── Workspace State ───────────────────────────────────────────────────
  const [activeProblemIdx, setActiveProblemIdx] = useState(null)
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('preferredLanguage') || 'python'
  })
  const [consoleOpen, setConsoleOpen] = useState(true)

  // ─── Active Code State ────────────────────────────────────────────────
  const [code, setCode] = useState('')

  // ─── Execution State ───────────────────────────────────────────────────
  const [runResult, setRunResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // ─── Problem Solve Status Tracking ─────────────────────────────────────
  const [problemStatuses, setProblemStatuses] = useState({})

  // ─── Toast State ───────────────────────────────────────────────────────
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' })

  const editorRef = useRef(null)

  // Derived values
  const activeProblem = activeProblemIdx !== null ? problems[activeProblemIdx] || null : null
  const langConfig = LANGUAGES.find((l) => l.id === language) || LANGUAGES[0]

  // Sync / Load code draft from localStorage
  useEffect(() => {
    if (!contest || activeProblemIdx === null) return
    const currentProb = problems[activeProblemIdx]
    if (!currentProb) return

    const draftKey = `contest_draft_${contest.slug}_${currentProb.slug}_${language}`
    const savedDraft = localStorage.getItem(draftKey)

    if (savedDraft !== null) {
      setCode(savedDraft)
    } else {
      const template =
        currentProb.boilerplate?.[language] ||
        LANGUAGES.find((l) => l.id === language)?.template ||
        '# Write your solution here\n'
      setCode(template)
    }
  }, [activeProblemIdx, language, contest, problems])

  const handleLanguageChange = useCallback((newLang) => {
    setLanguage(newLang)
    localStorage.setItem('preferredLanguage', newLang)
  }, [])

  const currentCode = code

  // ─── Toast Helper ──────────────────────────────────────────────────────
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    setToast({ visible: true, message, type })
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), duration)
  }, [])

  // ─── Timer Expiry Handler ──────────────────────────────────────────────
  const handleTimerExpire = useCallback(async () => {
    const code = editorRef.current?.getValue?.() || currentCode

    if (activeProblem && code.trim()) {
      try {
        await submitContestSolution(
          contest?.slug || slug,
          activeProblem.id || activeProblem.slug,
          { language, code }
        )
      } catch { /* noop */ }
    }

    showToast("⏰ Match session ended! Standings will update shortly.", 'warning', 5000)
    setTimeout(() => {
      navigate('/contests', { replace: true })
    }, 3000)
  }, [activeProblem, contest, slug, language, currentCode, navigate, showToast])

  // Resolve absolute countdown end target dynamically (local simulation for Virtual practice)
  const getTargetEndTime = () => {
    if (!contest) return null
    if (isVirtual) {
      const durationMs = new Date(contest.end_time).getTime() - new Date(contest.start_time).getTime()
      const storageKey = `virtual_start_${contest.slug}`
      let startTimeStr = localStorage.getItem(storageKey)
      if (!startTimeStr) {
        startTimeStr = String(Date.now())
        localStorage.setItem(storageKey, startTimeStr)
      }
      const virtualEndTime = parseInt(startTimeStr, 10) + durationMs
      return new Date(virtualEndTime).toISOString()
    }
    return contest.end_time
  }

  const computedEndTime = getTargetEndTime()
  const timer = useContestTimer(computedEndTime, handleTimerExpire)

  // Exit prompt handler for virtual mode
  useEffect(() => {
    if (!isVirtual) return

    const handleBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = 'Are you sure you want to exit the virtual contest? Timer continues ticking.'
      return e.returnValue
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isVirtual])

  // ─── Fetch Contest Data ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getContestDetails(slug)
        if (cancelled) return

        const runtimeStatus = data.status_label || 'ended'

        // Guard: Prevent entering upcoming matches
        if (runtimeStatus === 'upcoming') {
          navigate(`/contests/${slug}`)
          return
        }

        // Guard: Live contest requires registration
        if (runtimeStatus === 'live' && !data.is_registered) {
          navigate(`/contests/${slug}`)
          return
        }

        // Guard: Virtual mode is only for past contests
        if (isVirtual && runtimeStatus !== 'past' && runtimeStatus !== 'ended') {
          navigate(`/contests/${slug}`)
          return
        }

        setContest(data)
        const contestProblems = data.problems || []
        setProblems(contestProblems)

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
  }, [slug, isVirtual, navigate])

  const handleCodeChange = useCallback((value) => {
    setCode(value || '')
    if (!contest || activeProblemIdx === null) return
    const currentProb = problems[activeProblemIdx]
    if (!currentProb) return

    const draftKey = `contest_draft_${contest.slug}_${currentProb.slug}_${language}`
    localStorage.setItem(draftKey, value || '')
  }, [contest, activeProblemIdx, problems, language])

  const handleEditorMount = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  // ─── Non-blocking Queued Submissions ────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!activeProblem || timer.isExpired) return
    setSubmitting(true)
    setConsoleOpen(true)

    showToast('Submitted — Queued for Evaluation.', 'info')
    const problemKey = activeProblem.id || activeProblem.slug

    try {
      const code = editorRef.current?.getValue?.() || currentCode
      const result = await submitContestSolution(
        contest?.slug || slug,
        activeProblem.id || activeProblem.slug,
        { language, code }
      )

      setRunResult(result)

      if (result.verdict === 'accepted' || result.status === 'accepted' || result.verdict === 'AC') {
        setProblemStatuses((prev) => ({ ...prev, [problemKey]: 'solved' }))
        showToast('Accepted! Solution passed all test cases.', 'success')
      } else {
        setProblemStatuses((prev) => ({ ...prev, [problemKey]: 'attempted' }))
        showToast(`Verdict: ${result.verdict || result.status || 'Not accepted'}`, 'error')
      }
    } catch (err) {
      setRunResult({ error: true, stderr: err.message || 'Submission failed.' })
      setProblemStatuses((prev) => ({ ...prev, [problemKey]: 'attempted' }))
      showToast('Evaluation updated with error.', 'error')
    } finally {
      setSubmitting(false)
    }
  }, [activeProblem, timer.isExpired, currentCode, contest, slug, language, showToast])

  // Dynamically load detailed description, constraints, and samples on problem selection
  const handleSelectProblem = useCallback(async (idx) => {
    setActiveProblemIdx(idx)
    setRunResult(null)

    const selected = problems[idx]
    if (selected && !selected.description) {
      try {
        const details = await getProblemDetails(selected.slug)
        setProblems((prev) => {
          const next = [...prev]
          next[idx] = { ...selected, ...details }
          return next
        })
      } catch (err) {
        console.warn('Failed to load problem details:', err)
      }
    }
  }, [problems])

  if (loading) {
    return (
      <div className="h-screen bg-[#020617] flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
          <p className="text-xs text-zinc-500 font-medium">Entering arena…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen bg-[#020617] flex items-center justify-center font-mono">
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

  const sampleInputs = activeProblem?.sample_input || activeProblem?.examples?.map((e) => e.input) || []
  const sampleOutputs = activeProblem?.sample_output || activeProblem?.examples?.map((e) => e.output) || []

  return (
    <div className="h-screen flex flex-col bg-[#08080c] text-white font-mono overflow-hidden">
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />

      {/* TOP HEADER RIBBON HUD */}
      <header className="shrink-0 h-12 flex items-center justify-between px-4 border-b border-zinc-900 bg-[#0a0a0d] z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/contests')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/40 transition-all duration-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit</span>
          </button>

          <div className="h-4 w-px bg-zinc-800" />

          <h1 className="text-xs font-bold text-zinc-300 truncate max-w-[200px]">
            {contest?.title}
          </h1>

          {/* Dynamic Switcher in Top Bar when a problem is selected */}
          {activeProblemIdx !== null && (
            <div className="hidden md:flex items-center gap-1 bg-[#121216] border border-zinc-800/80 p-0.5 rounded-lg ml-2">
              <button
                onClick={() => setActiveProblemIdx(null)}
                className="px-2.5 py-1 rounded-md text-[10px] font-bold text-zinc-500 hover:text-zinc-300 transition-all"
              >
                Overview
              </button>
              {problems.map((p, idx) => (
                <button
                  key={p.id || idx}
                  onClick={() => handleSelectProblem(idx)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                    idx === activeProblemIdx
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {p.index || String.fromCharCode(65 + idx)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right HUD info */}
        <div className="flex items-center gap-3">
          {activeProblemIdx !== null && (
            <LanguageSelect
              selectedId={language}
              onChange={handleLanguageChange}
              disabled={timer.isExpired}
            />
          )}
          <CountdownClock timer={timer} />
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex min-h-0">
        
        {/* LEFT NAV PANEL (List of problems, points) */}
        <div className="w-64 shrink-0 flex flex-col border-r border-zinc-800/60 bg-[#0a0a0d]/40 min-h-0">
          <div className="shrink-0 p-3 border-b border-zinc-900 bg-[#0a0a0d]/80 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Problem List</span>
            <button
              onClick={() => setActiveProblemIdx(null)}
              className={`p-1 rounded hover:bg-zinc-800/40 text-zinc-500 hover:text-zinc-300 transition-all ${activeProblemIdx === null ? 'text-indigo-400 bg-indigo-500/10' : ''}`}
              title="Overview"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
            {problems.map((prob, idx) => {
              const key = prob.id || prob.slug
              const status = problemStatuses[key] || 'untouched'
              const isActive = idx === activeProblemIdx

              return (
                <button
                  key={key || idx}
                  onClick={() => handleSelectProblem(idx)}
                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl border text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/10 border-indigo-500/40 text-white'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ProblemStatusIcon status={status} />
                    <span className="text-xs font-bold font-mono">
                      {String.fromCharCode(65 + idx)}. {prob.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-400 shrink-0 font-mono">
                    {prob.points} pt
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* MAIN PANEL CONTENT */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#020205]">
          {activeProblemIdx === null ? (
            /* 1. LOBBY LANDING SCREEN OVERVIEW */
            <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-3xl mx-auto scrollbar-thin">
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20">
                  {isVirtual ? 'Virtual Simulation Mode' : 'Live Contest Hub'}
                </span>
                <h2 className="text-xl font-extrabold text-white mt-1.5">{contest?.title}</h2>
                <p className="text-xs text-zinc-500 leading-relaxed font-mono mt-1">
                  Time bounds: {new Date(contest?.start_time).toLocaleString()} to {new Date(contest?.end_time).toLocaleString()}
                </p>
              </div>

              {contest?.description && (
                <div className="p-5 rounded-2xl border border-zinc-800 bg-[#0e0e12]/60 leading-relaxed">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Contest Overview</h3>
                  <p className="text-xs text-zinc-400 font-mono whitespace-pre-wrap">{contest.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-zinc-800/60 bg-[#0e0e12]/40 space-y-2">
                  <h4 className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-500" />
                    Interactive Instructions
                  </h4>
                  <ul className="text-xs text-zinc-500 space-y-1.5 list-disc pl-4 font-mono">
                    <li>Select problems from the left-hand navigation list to begin.</li>
                    <li>No previous draft/history is loaded. You start completely fresh.</li>
                    <li>Direct submissions are queued instantly on clicking "Submit".</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl border border-zinc-800/60 bg-[#0e0e12]/40 space-y-2">
                  <h4 className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-indigo-400" />
                    Standings Gating
                  </h4>
                  <p className="text-xs text-zinc-500 leading-relaxed font-mono">
                    To maintain maximum focus during competition, live standings are locked. Results and ratings adjustments will be processed and published shortly after the contest has ended.
                  </p>
                </div>
              </div>

              {/* Call to action to open first problem */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => handleSelectProblem(0)}
                  className="px-6 py-3 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg hover:shadow-indigo-600/10"
                >
                  Start Coding Problems
                </button>
              </div>
            </div>
          ) : (
            /* 2. SPLIT LAYOUT WORKSPACE FOR SELECTED PROBLEM */
            <div className="flex-1 flex min-h-0">
              
              {/* Left problem description */}
              <div className="w-[45%] shrink-0 flex flex-col border-r border-zinc-800/60 min-h-0 bg-[#0a0a0d]/20">
                <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <h2 className="text-sm font-extrabold text-zinc-100">
                        {String.fromCharCode(65 + activeProblemIdx)}. {activeProblem?.title}
                      </h2>
                      {activeProblem?.difficulty && (
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${DIFFICULTY_COLORS[activeProblem.difficulty?.toLowerCase()] || DIFFICULTY_COLORS.medium}`}>
                          {activeProblem.difficulty}
                        </span>
                      )}
                    </div>
                    {activeProblem?.points != null && (
                      <p className="text-xs text-emerald-400 font-semibold">{activeProblem.points} Points</p>
                    )}
                  </div>

                  {/* Problem details description */}
                  <div className="prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed text-[13px] font-mono">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {activeProblem?.description || 'Loading challenge specifications...'}
                    </ReactMarkdown>
                  </div>

                  {activeProblem?.constraints && (
                    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/10 p-4">
                      <h3 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest mb-2 font-mono">Constraints</h3>
                      <div className="text-[11px] text-zinc-500 leading-relaxed font-mono">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {activeProblem.constraints}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Sample test cases info */}
                  {sampleInputs.length > 0 && sampleInputs.map((input, i) => (
                    <div key={i} className="rounded-xl border border-zinc-800/60 bg-zinc-900/20 p-4 space-y-3">
                      <h3 className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest">
                        Sample Input/Output {i + 1}
                      </h3>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider font-mono">Input</span>
                          <CopyButton text={String(input)} />
                        </div>
                        <pre className="px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800/40 text-xs text-zinc-300 font-mono overflow-x-auto whitespace-pre">{String(input)}</pre>
                      </div>
                      {sampleOutputs[i] && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider font-mono">Output</span>
                            <CopyButton text={String(sampleOutputs[i])} />
                          </div>
                          <pre className="px-3 py-2 rounded-xl bg-zinc-950/80 border border-zinc-800/40 text-xs text-emerald-400/80 font-mono overflow-x-auto whitespace-pre">
                            {String(sampleOutputs[i])}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right editor & terminal console */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 min-h-0 border-b border-zinc-850">
                  <Editor
                    height="100%"
                    language={langConfig.monaco}
                    value={currentCode}
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
                      suggest: { showKeywords: true },
                    }}
                  />
                </div>

                {/* Console tabs and action buttons */}
                <div className={`shrink-0 flex flex-col bg-[#07070a] transition-all duration-300 ${consoleOpen ? 'h-[240px]' : 'h-10'}`}>
                  <div className="shrink-0 flex items-center justify-between px-3 h-10 border-t border-zinc-800/50">
                    <div className="flex items-center gap-1">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 rounded">
                        <Terminal className="w-3.5 h-3.5" />
                        Submission Status
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSubmit}
                        disabled={timer.isExpired || submitting || !activeProblem}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-emerald-300 bg-emerald-600/10 border border-emerald-500/40 hover:bg-emerald-600/20 hover:border-emerald-400/60 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Submit
                      </button>

                      <button
                        onClick={() => setConsoleOpen(!consoleOpen)}
                        className="p-1 rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 transition-all"
                      >
                        {consoleOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {consoleOpen && (
                    <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
                      <div className="pt-3">
                        {submitting && (
                          <div className="flex items-center gap-2 py-6">
                            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                            <span className="text-xs text-zinc-500 font-mono">Submitting solution asynchronously...</span>
                          </div>
                        )}

                        {runResult && !submitting && (
                          <div className="space-y-3 font-mono">
                            {(runResult.verdict || runResult.status) && (
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                                ['accepted', 'AC'].includes(runResult.verdict || runResult.status)
                                  ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-600/10 text-rose-400 border-rose-500/30'
                              }`}>
                                {['accepted', 'AC'].includes(runResult.verdict || runResult.status)
                                  ? <Check className="w-3.5 h-3.5" />
                                  : <X className="w-3.5 h-3.5" />}
                                Verdict: {runResult.verdict || runResult.status}
                              </div>
                            )}

                            {runResult.stdout && (
                              <div>
                                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Stdout</p>
                                <pre className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-900 text-xs text-zinc-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto scrollbar-thin">{runResult.stdout}</pre>
                              </div>
                            )}

                            {runResult.stderr && (
                              <div>
                                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Stderr</p>
                                <pre className="px-3 py-2 rounded-xl bg-rose-950/20 border border-rose-800/30 text-xs text-rose-300/80 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto scrollbar-thin">{runResult.stderr}</pre>
                              </div>
                            )}
                          </div>
                        )}

                        {!runResult && !submitting && (
                          <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
                            <Terminal className="w-6 h-6 mb-2 text-zinc-700" />
                            <p className="text-xs">Submit code to see evaluation results</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
