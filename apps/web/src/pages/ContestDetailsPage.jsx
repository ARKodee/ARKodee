// apps/web/src/pages/ContestDetailsPage.jsx
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Shield,
  GraduationCap,
  Hash,
  ChevronRight,
  Loader2,
  AlertCircle,
  Trophy,
} from 'lucide-react'
import { getContestDetails, startVirtualContest } from '../lib/contests'

/**
 * Format an ISO date string for display
 */
const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Compute the time remaining or elapsed
 */
const getTimeLabel = (startTime, endTime) => {
  const now = Date.now()
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()

  if (now < start) {
    const diff = start - now
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return { label: `Starts in ${hours}h ${mins}m`, status: 'upcoming' }
  }
  if (now >= start && now <= end) {
    const diff = end - now
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return { label: `${hours}h ${mins}m remaining`, status: 'active' }
  }
  return { label: 'Contest ended', status: 'ended' }
}

export function ContestDetailsPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [contest, setContest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [virtualLoading, setVirtualLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchDetails = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getContestDetails(slug)
        if (!cancelled) setContest(data)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Contest details could not be loaded.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDetails()
    return () => { cancelled = true }
  }, [slug])

  // Handles virtual practice triggers for past matches
  const handleStartVirtual = async () => {
    setVirtualLoading(true)
    try {
      await startVirtualContest(slug)
      navigate(`/contests/${slug}/arena?virtual=true`)
    } catch (err) {
      // In case registration fails, still try to route to practice arena
      navigate(`/contests/${slug}/arena?virtual=true`)
    } finally {
      setVirtualLoading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center bg-[#0e0e12] border border-zinc-800 p-6 rounded-2xl max-w-sm">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
          <p className="text-sm text-rose-400 font-medium mb-4">{error}</p>
          <button
            onClick={() => navigate('/contests')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl transition-all"
          >
            Back to Contests
          </button>
        </div>
      </div>
    )
  }

  if (!contest) return null

  const timeInfo = getTimeLabel(contest.start_time, contest.end_time)
  const problems = contest.problems || []

  return (
    <div className="min-h-screen bg-[#020617] font-mono">
      {/* Header with back navigation */}
      <div className="border-b border-zinc-800/60 bg-[#0a0a0c]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/contests')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/40 transition-all duration-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Contests
              </button>

              <div className="h-5 w-px bg-zinc-800" />

              <h1 className="text-[15px] font-bold text-white truncate max-w-md">
                {contest.title}
              </h1>
            </div>

            {/* Time status pill */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                timeInfo.status === 'active'
                  ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/30'
                  : timeInfo.status === 'upcoming'
                    ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30'
                    : 'bg-zinc-800/40 text-zinc-500 border-zinc-700/40'
              }`}
            >
              <Clock className="w-3 h-3" />
              {timeInfo.label}
            </div>
          </div>
        </div>
      </div>

      {/* Split workspace */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-6 pt-6">
          {/* Left side — 65% — Description & Rules */}
          <div className="flex-1 lg:w-[65%] pr-2 pb-12">
            {/* Meta info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl border border-zinc-800/60 bg-[#111113]/60">
                <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Start</span>
                </div>
                <p className="text-xs font-semibold text-zinc-300">{formatDateTime(contest.start_time)}</p>
              </div>
              <div className="p-3 rounded-xl border border-zinc-800/60 bg-[#111113]/60">
                <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">End</span>
                </div>
                <p className="text-xs font-semibold text-zinc-300">{formatDateTime(contest.end_time)}</p>
              </div>
              <div className="p-3 rounded-xl border border-zinc-800/60 bg-[#111113]/60">
                <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Registered</span>
                </div>
                <p className="text-xs font-semibold text-zinc-300">{contest.participant_count ?? 0} participants</p>
              </div>
            </div>

            {/* Tags / Eligibility */}
            <div className="flex flex-wrap gap-2 mb-6">
              {contest.is_rated && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.05)]">
                  <Shield className="w-3.5 h-3.5" />
                  Rated Contest
                </span>
              )}
              {contest.eligible_class_tier && contest.eligible_class_tier !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {contest.eligible_class_tier.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="rounded-xl border border-zinc-800/60 bg-[#111113]/60 p-5 mb-6">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-3">Description</h2>
              <div className="text-zinc-300 leading-relaxed text-[13px] whitespace-pre-wrap">
                {contest.description || 'No description provided.'}
              </div>
            </div>

            {/* Scoring Rules */}
            <div className="rounded-xl border border-zinc-800/60 bg-[#111113]/60 p-5 mb-6">
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-zinc-400 mb-3 font-mono">Scoring Rules ({contest.scoring_mode || 'ICPC'})</h2>
              <div className="text-[13px] text-zinc-400 leading-relaxed font-mono">
                {contest.scoring_mode === 'codeforces' ? (
                  <p>• Time-based Penalty Engine (ACM-ICPC Style).<br />• Penalty = (T_elapsed - T_start) + (Wrong attempts * 20 minutes) for accepted solutions.<br />• Only fully correct submissions yield score points.</p>
                ) : (
                  <p>• LeetCode score rules apply.<br />• Speed and point allocation per problem.<br />• Penalty of 5-10 minutes per wrong submission on eventually accepted problems.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right side — 35% — Problem Set or Standings */}
          <div className="w-full lg:w-[35%] pb-12">
            {/* Virtual practice mode box for ended contests */}
            {timeInfo.status === 'ended' && (
              <div className="mb-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col gap-2 shadow-[0_0_24px_rgba(245,158,11,0.03)]">
                <div>
                  <h4 className="text-xs font-bold text-amber-300 uppercase tracking-widest">Virtual Practice Mode</h4>
                  <p className="text-[11px] text-zinc-400 mt-1">This contest has ended. Start a virtual simulation to solve problems under simulated exam conditions (0 ELO impact).</p>
                </div>
                <button
                  onClick={handleStartVirtual}
                  disabled={virtualLoading}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition-all shadow-lg flex items-center justify-center gap-1.5"
                >
                  {virtualLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                  Start Virtual Contest
                </button>
              </div>
            )}

            <div className="rounded-xl border border-zinc-800/80 bg-[#111113]/60 backdrop-blur-sm overflow-hidden sticky top-20">
              {/* Problem set header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60 bg-[#0e0e11]/80">
                <Hash className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-200">
                  Problems
                  <span className="ml-2 text-xs font-normal text-zinc-600">
                    {problems.length} {problems.length === 1 ? 'problem' : 'problems'}
                  </span>
                </h3>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[40px_1fr_64px] gap-2 px-4 py-2.5 text-[11px] font-medium text-zinc-600 uppercase tracking-wider border-b border-zinc-800/40">
                <span>#</span>
                <span>Title</span>
                <span className="text-right">Points</span>
              </div>

              {/* Problem rows */}
              {problems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                  <Hash className="w-8 h-8 mb-2 text-zinc-700" />
                  <p className="text-xs">Problems are only visible during active matches</p>
                </div>
              ) : (
                problems.map((problem, idx) => (
                  <div
                    key={problem.id || idx}
                    onClick={() => {
                      if (timeInfo.status === 'ended') {
                        // For ended contests, clicking a problem takes them directly to standard practice workspace or virtual arena
                        navigate(`/practice/problems/${problem.slug}`)
                      }
                    }}
                    className={`group grid grid-cols-[40px_1fr_64px] gap-2 items-center px-4 py-3 border-b border-zinc-800/30 last:border-b-0 transition-all duration-150 ${timeInfo.status === 'ended' ? 'cursor-pointer hover:bg-indigo-500/[0.04]' : 'cursor-not-allowed opacity-50'}`}
                  >
                    {/* Index */}
                    <span className="text-xs font-semibold text-zinc-600 group-hover:text-indigo-400 transition-colors">
                      {problem.order_index != null ? String.fromCharCode(65 + problem.order_index) : String.fromCharCode(65 + idx)}
                    </span>

                    {/* Title */}
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm text-zinc-300 group-hover:text-white truncate transition-colors">
                        {problem.title}
                      </p>
                      {timeInfo.status === 'ended' && (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0" />
                      )}
                    </div>

                    {/* Points */}
                    <p className="text-xs font-semibold text-emerald-400 text-right tabular-nums">
                      {problem.points ?? '—'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
