// apps/web/src/components/contests/Leaderboard.jsx
import React from 'react'
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
 * Leaderboard — Standing HUD panel
 * @param {Object} props
 * @param {Array} props.leaderboard - Standing entries
 * @param {string} props.title - Standing panel title
 */
export function Leaderboard({ leaderboard, title = 'Global Standings' }) {
  const isElo = title.toLowerCase().includes('elo') || title.toLowerCase().includes('rating')

  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#111113]/40 backdrop-blur-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-zinc-850 bg-[#0e0e11]/60">
        <Trophy className="w-4 h-4 text-indigo-400" />
        <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{title}</h3>
      </div>

      {/* Column headers */}
      {isElo ? (
        <div className="grid grid-cols-[50px_1fr_80px] gap-2 px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/40 bg-zinc-900/10">
          <span>#</span>
          <span>Coder</span>
          <span className="text-right">Rating</span>
        </div>
      ) : (
        <div className="grid grid-cols-[50px_1fr_64px_64px] gap-2 px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-800/40 bg-zinc-900/10">
          <span>#</span>
          <span>User</span>
          <span className="text-right">Score</span>
          <span className="text-right">Penalty</span>
        </div>
      )}

      {/* Rows */}
      <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
        {(!leaderboard || leaderboard.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <Trophy className="w-8 h-8 mb-2 text-zinc-700" />
            <p className="text-xs font-mono">No standings available</p>
          </div>
        ) : (
          leaderboard.map((entry, idx) => {
            const rank = entry.rank || idx + 1
            const isTopThree = rank <= 3

            return (
              <div
                key={entry.username || idx}
                className={`group transition-all duration-150 hover:bg-indigo-500/[0.03] cursor-default ${
                  isElo
                    ? 'grid grid-cols-[50px_1fr_80px] gap-2 items-center px-4 py-3'
                    : 'grid grid-cols-[50px_1fr_64px_64px] gap-2 items-center px-4 py-3 border-b border-zinc-800/20 last:border-b-0'
                }`}
              >
                {/* Rank */}
                <div>
                  <TierBadge rank={rank} />
                </div>

                {/* Username + shift */}
                <div className="min-w-0">
                  <p className={`text-xs font-bold truncate ${
                    rank === 1
                      ? 'text-amber-400'
                      : rank === 2
                        ? 'text-zinc-350'
                        : rank === 3
                          ? 'text-amber-600'
                          : 'text-zinc-300'
                  }`}>
                    {entry.username}
                  </p>
                  {entry.elo_shift !== undefined && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <EloShift shift={entry.elo_shift} />
                    </div>
                  )}
                </div>

                {/* Score / Rating columns */}
                {isElo ? (
                  <p className="text-xs font-semibold text-indigo-400 text-right tabular-nums">
                    {entry.elo_rating ?? 1500}
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-emerald-400 text-right tabular-nums">
                      {entry.score ?? 0}
                    </p>
                    <p className="text-[11px] text-zinc-500 text-right tabular-nums">
                      {entry.penalty ?? 0}m
                    </p>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
