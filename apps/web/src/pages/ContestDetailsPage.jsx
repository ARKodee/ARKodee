// apps/web/src/pages/ContestDetailsPage.jsx
import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { getContestDetails } from '../lib/contests'

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔴 TEMP DUMMY DATA — Remove this entire block when backend is connected
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DUMMY_CONTEST_DETAILS = {
  'weekly-challenge-42': {
    id: 1,
    slug: 'weekly-challenge-42',
    title: 'Weekly Challenge #42 — Data Structures Edition',
    description: 'Put your data structures knowledge to the test! This weekly challenge features 4 problems covering arrays, hash maps, linked lists, and caches. Problems range from easy to hard, with partial scoring enabled.\n\nAll problems must be solved within the contest window. Late submissions are not accepted.',
    start_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    participant_count: 284,
    is_rated: true,
    tier: 'Division 2',
    scoring_rules: '• Each problem has a fixed point value (100–400 pts)\n• Partial scoring is NOT enabled — only fully correct solutions earn points\n• Penalty: +10 minutes per wrong submission on accepted problems\n• Ties broken by total penalty time (lower is better)',
    eligibility: '• Open to all registered ARKodee users\n• Division 2: Rating below 1600\n• You must be registered before contest start time',
    problems: [
      { id: 'p1', slug: 'two-sum', index: 'A', title: 'Two Sum', points: 100 },
      { id: 'p2', slug: 'longest-substring', index: 'B', title: 'Longest Substring Without Repeating Characters', points: 200 },
      { id: 'p3', slug: 'lru-cache', index: 'C', title: 'LRU Cache', points: 250 },
      { id: 'p4', slug: 'merge-k-sorted-lists', index: 'D', title: 'Merge K Sorted Linked Lists', points: 400 },
    ],
  },
  'algo-sprint-15': {
    id: 2,
    slug: 'algo-sprint-15',
    title: 'Algorithm Sprint #15 — Graph Theory',
    description: 'Deep dive into graph algorithms! Tackle problems involving BFS, DFS, shortest paths, and minimum spanning trees. This sprint is designed for experienced competitive programmers.',
    start_time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 75 * 60 * 1000).toISOString(),
    participant_count: 156,
    is_rated: true,
    tier: 'Division 1',
    scoring_rules: '• ICPC-style scoring\n• Problems ordered by difficulty\n• Penalty: +20 minutes per wrong submission\n• Fastest solver wins ties',
    eligibility: '• Division 1: Rating 1600 and above\n• Must have completed at least 2 prior contests',
    problems: [
      { id: 'g1', slug: 'bfs-shortest-path', index: 'A', title: 'BFS Shortest Path', points: 150 },
      { id: 'g2', slug: 'cycle-detection', index: 'B', title: 'Cycle Detection in Directed Graph', points: 200 },
      { id: 'g3', slug: 'dijkstra-network', index: 'C', title: 'Network Delay Time', points: 300 },
    ],
  },
  'monthly-contest-july': {
    id: 3,
    slug: 'monthly-contest-july',
    title: 'Monthly Contest — July 2026',
    description: 'The flagship monthly contest! A balanced mix of 5 problems across all difficulty levels. Top performers earn rating boosts and badges.\n\nThis is a rated contest — your performance directly impacts your ARKodee rating.',
    start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
    participant_count: 512,
    is_rated: true,
    tier: 'Open',
    scoring_rules: '• 5 problems, 2 hours\n• Partial scoring enabled on problems D and E\n• Penalty: +5 minutes per wrong submission\n• Rating changes applied within 24 hours after contest',
    eligibility: '• Open to all divisions\n• Registration closes 1 hour before start',
    problems: [],
  },
  'dp-deep-dive': {
    id: 4,
    slug: 'dp-deep-dive',
    title: 'DP Deep Dive — Dynamic Programming Masterclass',
    description: 'An unrated practice contest focused entirely on dynamic programming techniques. Perfect for building your DP skills with problems covering memoization, tabulation, bitmask DP, and interval DP.',
    start_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    participant_count: 89,
    is_rated: false,
    tier: 'Division 2',
    scoring_rules: '• Practice mode — no rating impact\n• All problems available after contest ends\n• Partial scoring on all problems',
    eligibility: '• Requires access code from instructor\n• Designed for classroom use',
    problems: [],
  },
  'beginner-bootcamp-3': {
    id: 5,
    slug: 'beginner-bootcamp-3',
    title: 'Beginner Bootcamp #3 — Arrays & Strings',
    description: 'Welcome to the beginner series! This bootcamp features gentle problems designed to help you build confidence with arrays and string manipulation. No prior contest experience needed.',
    start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    participant_count: 340,
    is_rated: false,
    tier: null,
    scoring_rules: '• 3 easy problems, 1 hour\n• No penalty for wrong submissions\n• Designed for learning, not competition',
    eligibility: '• Open to everyone\n• Recommended for beginners (rating < 1200)',
    problems: [],
  },
  'weekly-challenge-41': {
    id: 6,
    slug: 'weekly-challenge-41',
    title: 'Weekly Challenge #41 — Sorting & Searching',
    description: 'Last week\'s challenge focused on sorting algorithms and binary search techniques. View the editorial and standings below.',
    start_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(),
    participant_count: 310,
    is_rated: true,
    tier: 'Division 2',
    scoring_rules: '• Standard scoring rules applied\n• Results are final',
    eligibility: null,
    problems: [
      { id: 's1', slug: 'merge-sort', index: 'A', title: 'Merge Sort Implementation', points: 100 },
      { id: 's2', slug: 'binary-search-rotated', index: 'B', title: 'Search in Rotated Sorted Array', points: 200 },
      { id: 's3', slug: 'kth-largest', index: 'C', title: 'Kth Largest Element', points: 250 },
      { id: 's4', slug: 'median-two-sorted', index: 'D', title: 'Median of Two Sorted Arrays', points: 400 },
    ],
  },
  'algo-sprint-14': {
    id: 7,
    slug: 'algo-sprint-14',
    title: 'Algorithm Sprint #14 — Tree Traversals',
    description: 'A past sprint covering tree traversal algorithms including inorder, preorder, postorder, and level-order traversals with advanced applications.',
    start_time: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    participant_count: 198,
    is_rated: true,
    tier: 'Division 1',
    scoring_rules: '• ICPC-style scoring\n• Results are final',
    eligibility: null,
    problems: [
      { id: 't1', slug: 'inorder-traversal', index: 'A', title: 'Binary Tree Inorder Traversal', points: 100 },
      { id: 't2', slug: 'level-order', index: 'B', title: 'Level Order Traversal', points: 150 },
      { id: 't3', slug: 'serialize-tree', index: 'C', title: 'Serialize and Deserialize Binary Tree', points: 350 },
    ],
  },
}
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔴 END TEMP DUMMY DATA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * ContestDetailsPage — Single contest detail view
 * Left (65%): Description, rules, schedules, eligibility
 * Right (35%): Problem set table
 */
export function ContestDetailsPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [contest, setContest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    const fetchDetails = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getContestDetails(slug)
        if (!cancelled) setContest(data)
      } catch {
        // 🔴 TEMP: Fall back to dummy details when backend is unavailable
        if (!cancelled) {
          const dummy = DUMMY_CONTEST_DETAILS[slug]
          if (dummy) {
            setContest(dummy)
          } else {
            setError('Contest not found.')
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDetails()
    return () => { cancelled = true }
  }, [slug])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center">
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

  if (!contest) return null

  const timeInfo = getTimeLabel(contest.start_time, contest.end_time)
  const problems = contest.problems || []

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
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
        <div className="flex gap-6 pt-6">
          {/* Left side — 65% — Description & Rules */}
          <div className="w-[65%] shrink-0 overflow-y-auto h-[calc(100vh-64px)] pr-2 pb-12 scrollbar-thin">
            {/* Meta info cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-xl border border-zinc-800/60 bg-[#111113]/60">
                <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium uppercase tracking-wider">Start</span>
                </div>
                <p className="text-xs font-semibold text-zinc-300">{formatDateTime(contest.start_time)}</p>
              </div>
              <div className="p-3 rounded-xl border border-zinc-800/60 bg-[#111113]/60">
                <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium uppercase tracking-wider">End</span>
                </div>
                <p className="text-xs font-semibold text-zinc-300">{formatDateTime(contest.end_time)}</p>
              </div>
              <div className="p-3 rounded-xl border border-zinc-800/60 bg-[#111113]/60">
                <div className="flex items-center gap-1.5 text-zinc-600 mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium uppercase tracking-wider">Registered</span>
                </div>
                <p className="text-xs font-semibold text-zinc-300">{contest.participant_count ?? 0} participants</p>
              </div>
            </div>

            {/* Tags / Eligibility */}
            <div className="flex flex-wrap gap-2 mb-6">
              {contest.is_rated && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Shield className="w-3 h-3" />
                  Rated Contest
                </span>
              )}
              {contest.tier && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <GraduationCap className="w-3 h-3" />
                  {contest.tier}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="rounded-xl border border-zinc-800/60 bg-[#111113]/60 p-5 mb-6">
              <h2 className="text-sm font-semibold text-zinc-200 mb-3">Description</h2>
              <div className="prose prose-invert prose-sm max-w-none text-zinc-400 leading-relaxed text-[13px]">
                {contest.description || 'No description provided.'}
              </div>
            </div>

            {/* Scoring Rules */}
            {contest.scoring_rules && (
              <div className="rounded-xl border border-zinc-800/60 bg-[#111113]/60 p-5 mb-6">
                <h2 className="text-sm font-semibold text-zinc-200 mb-3">Scoring Rules</h2>
                <div className="text-[13px] text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {contest.scoring_rules}
                </div>
              </div>
            )}

            {/* Eligibility */}
            {contest.eligibility && (
              <div className="rounded-xl border border-zinc-800/60 bg-[#111113]/60 p-5">
                <h2 className="text-sm font-semibold text-zinc-200 mb-3">Eligibility</h2>
                <div className="text-[13px] text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {contest.eligibility}
                </div>
              </div>
            )}
          </div>

          {/* Right side — 35% — Problem Set */}
          <div className="flex-1 overflow-y-auto h-[calc(100vh-64px)] pb-12 scrollbar-thin">
            <div className="rounded-xl border border-zinc-800/80 bg-[#111113]/60 backdrop-blur-sm overflow-hidden sticky top-0">
              {/* Problem set header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60">
                <Hash className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-200">
                  Problem Set
                  <span className="ml-2 text-xs font-normal text-zinc-600">
                    {problems.length} {problems.length === 1 ? 'problem' : 'problems'}
                  </span>
                </h3>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[40px_1fr_64px] gap-2 px-4 py-2 text-[11px] font-medium text-zinc-600 uppercase tracking-wider border-b border-zinc-800/40">
                <span>#</span>
                <span>Title</span>
                <span className="text-right">Points</span>
              </div>

              {/* Problem rows */}
              {problems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
                  <Hash className="w-8 h-8 mb-2 text-zinc-700" />
                  <p className="text-xs">Problems not available yet</p>
                </div>
              ) : (
                problems.map((problem, idx) => (
                  <div
                    key={problem.id || idx}
                    onClick={() => navigate(`/problems/${problem.slug}`)}
                    className="group grid grid-cols-[40px_1fr_64px] gap-2 items-center px-4 py-3 border-b border-zinc-800/30 last:border-b-0 cursor-pointer transition-all duration-150 hover:bg-indigo-500/[0.04]"
                  >
                    {/* Index */}
                    <span className="text-xs font-semibold text-zinc-600 group-hover:text-indigo-400 transition-colors">
                      {problem.index || String.fromCharCode(65 + idx)}
                    </span>

                    {/* Title */}
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm text-zinc-300 group-hover:text-white truncate transition-colors">
                        {problem.title}
                      </p>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0" />
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

