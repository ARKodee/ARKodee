// apps/web/src/pages/ContestsDashboard.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Swords, Flame, CalendarClock, ArchiveRestore, User, Loader2 } from 'lucide-react'
import { useContestData } from '../hooks/useContestData'
import { ContestList } from '../components/contests/ContestList'
import { Leaderboard } from '../components/contests/Leaderboard'
import { ProfileHUD } from '../components/dashboard/ProfileHUD'
import { TacticalNav } from '../components/dashboard/TacticalNav'

const FILTER_TABS = [
  { key: 'live', label: 'Live', icon: Flame },
  { key: 'upcoming', label: 'Upcoming', icon: CalendarClock },
  { key: 'past', label: 'Past', icon: ArchiveRestore },
  { key: 'my_contests', label: 'My Contests', icon: User },
]

/**
 * ContestsDashboard — Master layout assembling the contests arena
 * Left pane (2/3): Filter toolbar + ContestList
 * Right pane (1/3): Leaderboard (global standings)
 */
export function ContestsDashboard() {
  const navigate = useNavigate()
  const {
    contests,
    leaderboard,
    loading,
    error,
    activeFilter,
    setActiveFilter,
    handleRegister,
    fetchLeaderboard,
  } = useContestData()

  // Load global leaderboard on mount
  useEffect(() => {
    fetchLeaderboard('global')
  }, [fetchLeaderboard])

  // Navigate based on lifecycle status:
  // LIVE → bypass detail modal, go directly to arena
  // UPCOMING / PAST → open detail/description page
  const handleSelectContest = (contest) => {
    if (contest.runtimeStatus === 'active') {
      navigate(`/contests/${contest.slug}/arena`)
    } else {
      navigate(`/contests/${contest.slug}`)
    }
  }

  // Handle CTA button actions (isolated from row click)
  const handleActionClick = (contest) => {
    const { runtimeStatus, is_registered } = contest

    if (runtimeStatus === 'upcoming' && !is_registered) {
      handleRegister(contest.id)
      return
    }

    if (runtimeStatus === 'active') {
      // Direct arena entry — bypass detail modal entirely
      navigate(`/contests/${contest.slug}/arena`)
      return
    }

    if (runtimeStatus === 'ended') {
      // Navigate to view standings
      navigate(`/contests/${contest.slug}`)
    }
  }

  return (
    <div
      className="w-screen min-h-screen flex flex-col font-mono"
      style={{ background: '#020617', color: '#ffffff', overflowY: 'auto' }}
    >
      {/* Scanline sweep */}
      <div
        className="pointer-events-none fixed inset-x-0 z-50 animate-scan-line"
        style={{
          height: 3,
          background:
            'linear-gradient(transparent 0%, rgba(245,158,11,0.045) 50%, transparent 100%)',
        }}
      />

      {/* Dot-grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(245,158,11,0.018) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(245,158,11,0.018) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Top Header layout matching Dashboard */}
      <header className="relative z-10 flex-shrink-0 flex items-center gap-4 p-4">
        <ProfileHUD />
        <div className="flex-1 min-w-0">
          <TacticalNav />
        </div>
      </header>

      {/* Main content grid */}
      <div className="relative z-10 flex-1">
        {/* Page header */}
        <div className="border-b border-zinc-800/60 bg-[#0a0a0c]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-600/10 border border-indigo-500/20">
                <Swords className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">Contests Arena</h1>
                <p className="text-xs text-zinc-500 mt-0.5">Compete, rank, and conquer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left pane — 2/3 */}
            <div className="lg:col-span-2 space-y-4">
              {/* Filter toolbar */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#111113]/60 border border-zinc-800/60 backdrop-blur-sm">
                {FILTER_TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveFilter(key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      activeFilter === key
                        ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.08)]'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border border-transparent'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Loading state */}
              {loading && (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                </div>
              )}

              {/* Error state */}
              {error && !loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-sm text-rose-400 font-medium">{error}</p>
                    <button
                      onClick={() => setActiveFilter(activeFilter)}
                      className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {/* Contest list */}
              {!loading && !error && (
                <ContestList
                  contests={contests}
                  onSelectContest={handleSelectContest}
                  onActionClick={handleActionClick}
                />
              )}
            </div>

            {/* Right pane — 1/3 */}
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <Leaderboard leaderboard={leaderboard} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
