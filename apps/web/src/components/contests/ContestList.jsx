// apps/web/src/components/contests/ContestList.jsx
import { Users, Clock, Shield, KeyRound, GraduationCap, Check, ArrowRight, Trophy } from 'lucide-react'

/**
 * Resolve the CTA button configuration based on contest runtime status and registration
 */
const getCtaConfig = (contest) => {
  const { runtimeStatus, is_registered } = contest

  if (runtimeStatus === 'upcoming' && !is_registered) {
    return {
      text: 'Register',
      className:
        'bg-indigo-600/10 text-indigo-400 border border-indigo-500/40 hover:bg-indigo-600/20 hover:border-indigo-400/70 hover:shadow-[0_0_16px_rgba(99,102,241,0.15)]',
      icon: <ArrowRight className="w-3.5 h-3.5" />,
      disabled: false,
    }
  }

  if (runtimeStatus === 'upcoming' && is_registered) {
    return {
      text: 'Registered',
      className:
        'bg-zinc-800/50 text-zinc-500 border border-zinc-700/50 cursor-default',
      icon: <Check className="w-3.5 h-3.5" />,
      disabled: true,
    }
  }

  if (runtimeStatus === 'active') {
    return {
      text: 'Join Arena',
      className:
        'bg-emerald-600/10 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-600/20 hover:border-emerald-400/70 hover:shadow-[0_0_16px_rgba(16,185,129,0.2)] animate-pulse-subtle',
      icon: <ArrowRight className="w-3.5 h-3.5" />,
      disabled: false,
    }
  }

  // ended
  return {
    text: 'View Standings',
    className:
      'bg-zinc-800/30 text-zinc-500 border border-zinc-700/40 hover:bg-zinc-800/50 hover:text-zinc-400',
    icon: <Trophy className="w-3.5 h-3.5" />,
    disabled: false,
  }
}

/**
 * Render dynamic badges based on contest properties
 */
const ContestBadges = ({ contest }) => {
  const badges = []

  if (contest.is_rated) {
    badges.push(
      <span
        key="rated"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
      >
        <Shield className="w-3 h-3" />
        Rated
      </span>
    )
  }

  if (contest.requires_access_code) {
    badges.push(
      <span
        key="access"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"
      >
        <KeyRound className="w-3 h-3" />
        Access Code
      </span>
    )
  }

  if (contest.tier) {
    badges.push(
      <span
        key="tier"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-violet-500/10 text-violet-400 border border-violet-500/20"
      >
        <GraduationCap className="w-3 h-3" />
        {contest.tier}
      </span>
    )
  }

  return badges.length > 0 ? <div className="flex flex-wrap gap-1.5 mt-2">{badges}</div> : null
}

/**
 * Format a date for display
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get a status indicator dot + label for the contest runtime status
 */
const StatusIndicator = ({ status }) => {
  const config = {
    active: { color: 'bg-emerald-400', glow: 'shadow-[0_0_6px_rgba(16,185,129,0.6)]', label: 'Live' },
    upcoming: { color: 'bg-indigo-400', glow: 'shadow-[0_0_6px_rgba(99,102,241,0.5)]', label: 'Upcoming' },
    ended: { color: 'bg-zinc-600', glow: '', label: 'Ended' },
  }

  const c = config[status] || config.ended

  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${c.color} ${c.glow}`} />
      <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{c.label}</span>
    </div>
  )
}

/**
 * ContestList — Interactive card list rendering contests
 * @param {Object} props
 * @param {Array} props.contests - Contest objects array
 * @param {Function} props.onSelectContest - Fired when a card row is clicked
 * @param {Function} props.onActionClick - Fired when the CTA button is clicked (isolated)
 */
export function ContestList({ contests, onSelectContest, onActionClick }) {
  if (!contests || contests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-600">
        <Trophy className="w-10 h-10 mb-3 text-zinc-700" />
        <p className="text-sm font-medium">No contests found</p>
        <p className="text-xs text-zinc-700 mt-1">Try switching filters above</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {contests.map((contest) => {
        const cta = getCtaConfig(contest)

        return (
          <div
            key={contest.id}
            onClick={() => onSelectContest(contest)}
            className="group relative flex items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800/80 bg-[#111113]/60 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:border-indigo-500/40 hover:bg-[#111113] hover:shadow-[0_0_24px_rgba(99,102,241,0.06)]"
          >
            {/* Left content block */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <StatusIndicator status={contest.runtimeStatus} />
              </div>

              <h3 className="text-[15px] font-semibold text-zinc-100 group-hover:text-white truncate mt-1.5">
                {contest.title}
              </h3>

              <ContestBadges contest={contest} />

              <div className="flex items-center gap-4 mt-2.5 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(contest.start_time)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {contest.participant_count ?? 0} participants
                </span>
              </div>
            </div>

            {/* CTA Button — isolated click */}
            <button
              disabled={cta.disabled}
              onClick={(e) => {
                e.stopPropagation()
                if (!cta.disabled) onActionClick(contest)
              }}
              className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${cta.className}`}
            >
              {cta.text}
              {cta.icon}
            </button>
          </div>
        )
      })}
    </div>
  )
}
