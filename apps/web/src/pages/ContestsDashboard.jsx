// apps/web/src/pages/ContestsDashboard.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Swords, Flame, CalendarClock, ArchiveRestore, User, Loader2, X, Shield, KeyRound, Check } from 'lucide-react'
import { useContestData } from '../hooks/useContestData'
import { ContestList } from '../components/contests/ContestList'
import { Leaderboard } from '../components/contests/Leaderboard'
import { ProfileHUD } from '../components/dashboard/ProfileHUD'
import { TacticalNav } from '../components/dashboard/TacticalNav'

const FILTER_TABS = [
  { key: 'all', label: 'All Contests', icon: Swords },
  { key: 'live', label: 'Live', icon: Flame },
  { key: 'upcoming', label: 'Upcoming', icon: CalendarClock },
  { key: 'past', label: 'Past', icon: ArchiveRestore },
]

/**
 * RegistrationModal Component
 * Interactive overlay modal that manages rules consent, access PIN checks, and registration trigger.
 */
function RegistrationModal({ contest, onClose, onRegisterConfirm }) {
  const [accessCode, setAccessCode] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  const handleRegister = async (e) => {
    e.preventDefault()
    if (!consent) {
      setErr('You must agree to the contest terms and conditions.')
      return
    }
    if (contest.access_code_required && !accessCode.trim()) {
      setErr('Please enter the private access PIN.')
      return
    }

    setSubmitting(true)
    setErr('')
    try {
      await onRegisterConfirm(contest.id, accessCode)
      onClose()
    } catch (error) {
      setErr(error.message || 'Registration failed. Check access PIN.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020205]/85 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#0e0e12]/95 p-6 shadow-2xl relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Contest Registration
            </span>
            <h3 className="text-lg font-bold text-white mt-2 leading-tight">
              {contest.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin text-xs text-zinc-400 leading-relaxed">
          {contest.description && (
            <div className="p-3.5 rounded-xl border border-zinc-800/60 bg-zinc-900/30">
              <h4 className="font-semibold text-zinc-200 mb-1">About this Contest</h4>
              <p className="font-mono">{contest.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl border border-zinc-800/40 bg-zinc-900/10">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Start Time</span>
              <span className="font-semibold text-zinc-300">
                {new Date(contest.start_time).toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl border border-zinc-800/40 bg-zinc-900/10">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Rated Status</span>
              <span className={`font-semibold inline-flex items-center gap-1 mt-0.5 ${contest.is_rated ? 'text-amber-400' : 'text-zinc-400'}`}>
                {contest.is_rated ? <Shield className="w-3.5 h-3.5" /> : null}
                {contest.is_rated ? 'Rated' : 'Unrated'}
              </span>
            </div>
          </div>

          {contest.eligible_class_tier && contest.eligible_class_tier !== 'all' && (
            <div>
              <h4 className="font-semibold text-zinc-300 mb-1">Eligibility requirements</h4>
              <p className="text-zinc-500">
                Restricted to participants classified in: <strong className="text-violet-400">{contest.eligible_class_tier.replace('_', ' ').toUpperCase()}</strong>.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleRegister} className="mt-5 space-y-4">
          {contest.access_code_required && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                Access PIN Code
              </label>
              <input
                type="password"
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Enter private match code..."
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          )}

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-800/40 bg-zinc-900/20 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900 cursor-pointer"
            />
            <span className="text-[11px] text-zinc-400 leading-tight">
              I agree to abide by ARKodee contest rules, honor codes, and submission regulations. I will not engage in collaborative assistance or code sharing.
            </span>
          </label>

          {err && <p className="text-xs text-rose-400 font-medium">{err}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 bg-zinc-800/40 hover:bg-zinc-800/70 border border-zinc-700/40 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                'Confirm Registration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * ContestsDashboard — Master layout assembling the contests arena
 * Left pane (2/3): Filter toolbar + ContestList (Grouped categories by default)
 * Right pane (1/3): Global ELO Standings Side HUD
 */
export function ContestsDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeFilter = searchParams.get('status') || 'all'

  const {
    contests,
    leaderboard,
    loading,
    error,
    handleRegister,
    fetchLeaderboard,
  } = useContestData(activeFilter)

  // Registration modal controller state
  const [registeringContest, setRegisteringContest] = useState(null)

  // Load global ELO leaderboard on mount
  useEffect(() => {
    fetchLeaderboard('global')
  }, [fetchLeaderboard])

  // Custom filter updater
  const handleFilterChange = (key) => {
    setSearchParams({ status: key })
  }

  // Navigate based on lifecycle status
  const handleSelectContest = (contest) => {
    const status = contest.runtimeStatus || 'ended'
    if (status === 'ended') {
      // Ended/past contests navigate to detail page for virtual practice triggers
      navigate(`/contests/${contest.slug}`)
    } else {
      // Live or upcoming: check if registered. If registered, active matches enter Arena. Otherwise, show registration modal.
      if (contest.is_registered) {
        if (status === 'active') {
          navigate(`/contests/${contest.slug}/arena`)
        } else {
          // Registered but upcoming
          setRegisteringContest(contest)
        }
      } else {
        setRegisteringContest(contest)
      }
    }
  }

  // Handle CTA button action clicks
  const handleActionClick = (contest) => {
    const status = contest.runtimeStatus || 'ended'
    if (status === 'upcoming' && !contest.is_registered) {
      setRegisteringContest(contest)
    } else if (status === 'active') {
      if (contest.is_registered) {
        navigate(`/contests/${contest.slug}/arena`)
      } else {
        setRegisteringContest(contest)
      }
    } else if (status === 'ended') {
      navigate(`/contests/${contest.slug}`)
    }
  }

  const handleConfirmRegistration = async (contestId, accessCode) => {
    await handleRegister(contestId, accessCode)
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
                    onClick={() => handleFilterChange(key)}
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
                      onClick={() => handleFilterChange(activeFilter)}
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
                  activeFilter={activeFilter}
                  onSelectContest={handleSelectContest}
                  onActionClick={handleActionClick}
                />
              )}
            </div>

            {/* Right pane — 1/3 */}
            <div className="lg:col-span-1">
              <div className="sticky top-20">
                <Leaderboard leaderboard={leaderboard} title="Global ELO Standing" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Consent Modal */}
      {registeringContest && (
        <RegistrationModal
          contest={registeringContest}
          onClose={() => setRegisteringContest(null)}
          onRegisterConfirm={handleConfirmRegistration}
        />
      )}
    </div>
  )
}
