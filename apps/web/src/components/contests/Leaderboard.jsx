// apps/web/src/components/contests/Leaderboard.jsx
import React from 'react'
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import './Leaderboard.css'

/**
 * Tier badge for top 3 ranks
 */
const TierBadge = ({ rank }) => {
  if (rank === 1) {
    return (
      <span className="lbd-badge lbd-badge--1">
        <span>1</span>
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="lbd-badge lbd-badge--2">
        <span>2</span>
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="lbd-badge lbd-badge--3">
        <span>3</span>
      </span>
    )
  }
  return (
    <span className="lbd-badge lbd-badge--other">
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
      <span className="lbd-shift lbd-shift--up">
        <TrendingUp className="lbd-shift-icon" />
        +{shift}
      </span>
    )
  }
  if (shift < 0) {
    return (
      <span className="lbd-shift lbd-shift--down">
        <TrendingDown className="lbd-shift-icon" />
        {shift}
      </span>
    )
  }
  return (
    <span className="lbd-shift lbd-shift--flat">
      <Minus className="lbd-shift-icon" />
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
    <div className="lbd-root">
      {/* Header */}
      <div className="lbd-header">
        <Trophy className="lbd-header-icon" />
        <h3 className="lbd-header-title">{title}</h3>
      </div>

      {/* Column headers */}
      {isElo ? (
        <div className="lbd-columns lbd-columns--elo">
          <span>#</span>
          <span>Coder</span>
          <span style={{ textAlign: 'right' }}>Rating</span>
        </div>
      ) : (
        <div className="lbd-columns lbd-columns--scores">
          <span>#</span>
          <span>User</span>
          <span style={{ textAlign: 'right' }}>Score</span>
          <span style={{ textAlign: 'right' }}>Penalty</span>
        </div>
      )}

      {/* Rows */}
      <div className="lbd-body">
        {(!leaderboard || leaderboard.length === 0) ? (
          <div className="lbd-placeholder">
            <Trophy className="lbd-placeholder-icon" />
            <p className="lbd-placeholder-text">No standings available</p>
          </div>
        ) : (
          leaderboard.map((entry, idx) => {
            const rank = entry.rank || idx + 1
            const rankClass = rank === 1 ? '1' : rank === 2 ? '2' : rank === 3 ? '3' : 'other';

            return (
              <div
                key={entry.username || idx}
                className={`lbd-row ${isElo ? 'lbd-row--elo' : 'lbd-row--scores'}`}
              >
                {/* Rank */}
                <div className="lbd-rank-cell">
                  <TierBadge rank={rank} />
                </div>

                {/* Username + shift */}
                <div className="lbd-info-cell">
                  <div className="lbd-username-wrapper">
                    <p className={`lbd-username lbd-username--${rankClass}`}>
                      {entry.username}
                    </p>
                    {entry.badge_title && (
                      <span className="lbd-title-badge">
                        {entry.badge_title}
                      </span>
                    )}
                    {(entry.elo_change !== undefined || entry.elo_shift !== undefined) && (
                      <EloShift shift={entry.elo_change ?? entry.elo_shift} />
                    )}
                  </div>
                </div>

                {/* Score / Rating columns */}
                {isElo ? (
                  <p className="lbd-value lbd-value--rating">
                    {entry.elo_rating ?? entry.contest_rating ?? 1200}
                  </p>
                ) : (
                  <>
                    <p className="lbd-value lbd-value--score">
                      {entry.total_score ?? entry.score ?? 0}
                    </p>
                    <p className="lbd-value lbd-value--penalty">
                      {entry.penalty_minutes ?? entry.penalty ?? 0}m
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

export default Leaderboard
