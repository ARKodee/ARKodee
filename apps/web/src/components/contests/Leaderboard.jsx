// apps/web/src/components/contests/Leaderboard.jsx
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * Tier badge for top 3 ranks
 */
const TierBadge = ({ rank }) => {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30">
        <span className="text-sm font-bold text-amber-400">1</span>
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-400/10 border border-zinc-400/30">
        <span className="text-sm font-bold text-zinc-300">2</span>
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-700/10 border border-amber-700/30">
        <span className="text-sm font-bold text-amber-600">3</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-medium text-zinc-500">
      {rank}
    </span>
  )
}

/**
 * ELO shift indicator
 */
const EloShift = ({ shift }) => {
  if (!shift && shift !== 0) return null

  if (shift > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-400">
        <TrendingUp className="w-3 h-3" />
        +{shift}
      </span>
    )
  }
  if (shift < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-rose-400">
        <TrendingDown className="w-3 h-3" />
        {shift}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-zinc-600">
      <Minus className="w-3 h-3" />
      0
    </span>
  )
}

/**
 * Leaderboard — Space-efficient standings card panel
 * @param {Object} props
 * @param {Array} props.leaderboard - Array of {rank, username, score, penalty, elo_shift}
 * @param {string} [props.title] - Panel title
 */
export function Leaderboard({ leaderboard, title = 'Global Standings' }) {
  return (
    <div className="rounded-xl border border-zinc-800/80 bg-[#111113]/60 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60">
        <Trophy className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[40px_1fr_64px_64px] gap-2 px-4 py-2 text-[11px] font-medium text-zinc-600 uppercase tracking-wider border-b border-zinc-800/40">
        <span>#</span>
        <span>User</span>
        <span className="text-right">Score</span>
        <span className="text-right">Penalty</span>
      </div>

      {/* Rows */}
      <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
        {(!leaderboard || leaderboard.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
            <Trophy className="w-8 h-8 mb-2 text-zinc-700" />
            <p className="text-xs">No standings yet</p>
          </div>
        ) : (
          leaderboard.map((entry, idx) => {
            const rank = entry.rank || idx + 1
            const isTopThree = rank <= 3

            return (
              <div
                key={entry.username || idx}
                className={`group grid grid-cols-[40px_1fr_64px_64px] gap-2 items-center px-4 py-2.5 transition-all duration-150 hover:bg-indigo-500/[0.04] cursor-default ${
                  isTopThree ? 'border-l-2 border-l-transparent hover:border-l-indigo-500/40' : ''
                }`}
              >
                {/* Rank */}
                <div>
                  <TierBadge rank={rank} />
                </div>

                {/* Username + ELO Shift */}
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${
                    rank === 1
                      ? 'text-amber-400'
                      : rank === 2
                        ? 'text-zinc-300'
                        : rank === 3
                          ? 'text-amber-600'
                          : 'text-zinc-400'
                  }`}>
                    {entry.username}
                  </p>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <EloShift shift={entry.elo_shift} />
                  </div>
                </div>

                {/* Score */}
                <p className="text-sm font-semibold text-emerald-400 text-right tabular-nums">
                  {entry.score ?? 0}
                </p>

                {/* Penalty */}
                <p className="text-xs text-zinc-500 text-right tabular-nums">
                  {entry.penalty ?? 0}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
