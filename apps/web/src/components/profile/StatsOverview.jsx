/**
 * StatsOverview - Displays user competitive statistics (ELO, wins/losses, streak)
 */

import React from 'react'
import { Skeleton } from '../ui/Skeleton'
import './ProfileComponents.css'

function StatBox({ label, value, subtext, variant = 'default', isLoading = false }) {
  if (isLoading) {
    return (
      <div className={`stat-box stat-box--${variant}`}>
        <Skeleton width="60px" height="32px" />
        <Skeleton width="80px" height="16px" style={{ marginTop: '8px' }} />
      </div>
    )
  }

  return (
    <div className={`stat-box stat-box--${variant}`}>
      <div className="stat-box__value">{value}</div>
      <div className="stat-box__label">{label}</div>
      {subtext && <div className="stat-box__subtext">{subtext}</div>}
    </div>
  )
}

export function StatsOverview({ stats, isLoading }) {
  if (isLoading) {
    return (
      <div className="stats-overview">
        <StatBox isLoading={true} />
        <StatBox isLoading={true} />
        <StatBox isLoading={true} />
        <StatBox isLoading={true} />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="stats-overview">
        <div className="empty-state">No stats available</div>
      </div>
    )
  }

  const winRate =
    stats.total_wins + stats.total_losses > 0
      ? (
          (stats.total_wins / (stats.total_wins + stats.total_losses)) *
          100
        ).toFixed(1)
      : 0

  return (
    <div className="stats-overview">
      <StatBox
        label="Contest ELO"
        value={stats.contest_rating}
        subtext="Rating"
        variant="elo-contest"
      />
      <StatBox
        label="Duel ELO"
        value={stats.duel_rating}
        subtext="Rating"
        variant="elo-duel"
      />
      <StatBox
        label="Win Rate"
        value={`${winRate}%`}
        subtext={`${stats.total_wins}W - ${stats.total_losses}L - ${stats.total_draws}D`}
        variant="win-rate"
      />
      <StatBox
        label="Streak"
        value={stats.streak}
        subtext="Current"
        variant="streak"
      />
    </div>
  )
}
