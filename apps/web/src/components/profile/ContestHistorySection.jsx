/**
 * ContestHistorySection - Displays contest participation history and performance
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '../ui/Skeleton'
import './ProfileComponents.css'

function ContestItem({ contest, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="contest-item contest-item--skeleton">
        <Skeleton width="200px" height="16px" />
        <Skeleton width="150px" height="14px" />
        <Skeleton width="100px" height="14px" />
      </div>
    )
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const getEloChangeColor = (change) => {
    if (change === null || change === undefined) return 'elo-neutral'
    if (change === 0) return 'elo-neutral'
    return change > 0 ? 'elo-positive' : change < 0 ? 'elo-negative' : 'elo-neutral'
  }

  const formatEloChange = (change) => {
    if (change === null || change === undefined) return 'N/A'
    return change > 0 ? `+${change}` : `${change}`
  }

  return (
    <div className="contest-item">
      <div className="contest-item__main">
        <Link
          to={`/contests/${contest.contest_slug}`}
          className="contest-item__title"
        >
          {contest.contest_title}
        </Link>
        <div className="contest-item__meta">
          {contest.rank && (
            <span className="contest-item__rank">Rank: {contest.rank}</span>
          )}
          <span className="contest-item__score">Score: {contest.total_score}</span>
        </div>
      </div>
      {contest.elo_change !== null && (
        <div className={`contest-item__elo ${getEloChangeColor(contest.elo_change)}`}>
          {formatEloChange(contest.elo_change)}
        </div>
      )}
      <div className="contest-item__date">
        {formatDate(contest.joined_at)}
      </div>
    </div>
  )
}

function ContestStats({ contestStats, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="contest-stats">
        <Skeleton width="100%" height="60px" />
      </div>
    )
  }

  return (
      <div className="contest-stats">
        <div className="contest-stat-box">
          <span className="contest-stat-label">Total Contests</span>
          <span className="contest-stat-value">{contestStats.total_contests}</span>
        </div>
      {contestStats.best_rank && (
        <div className="contest-stat-box">
          <span className="contest-stat-label">Best Rank</span>
          <span className="contest-stat-value">#{contestStats.best_rank}</span>
        </div>
      )}
      <div className="contest-stat-box">
        <span className="contest-stat-label">Avg Score</span>
        <span className="contest-stat-value">
          {contestStats.average_score}
        </span>
      </div>
        <div className="contest-stat-box">
          <span className="contest-stat-label">ELO Gained</span>
          <span
            className={`contest-stat-value ${
              contestStats.total_elo_change > 0
                ? 'elo-positive'
                : contestStats.total_elo_change < 0
                  ? 'elo-negative'
                  : 'elo-neutral'
            }`}
          >
            {contestStats.total_elo_change > 0
              ? `+${contestStats.total_elo_change}`
              : contestStats.total_elo_change === 0
                ? '0'
                : contestStats.total_elo_change}
          </span>
        </div>
      </div>
  )
}

export function ContestHistorySection({ activity, contestStats, isLoading }) {
  if (isLoading) {
    return (
      <div className="contest-history-card">
        <h3 className="card-title">Contest History</h3>
        <ContestStats isLoading={true} />
        <div className="contest-list">
          {[1, 2, 3].map((i) => (
            <ContestItem key={i} isLoading={true} />
          ))}
        </div>
      </div>
    )
  }

  if (!activity || activity.recent_contests.length === 0) {
    return (
      <div className="contest-history-card">
        <h3 className="card-title">Contest History</h3>
        <div className="empty-state">No contest participation yet</div>
      </div>
    )
  }

  return (
    <div className="contest-history-card">
      <h3 className="card-title">Contest History</h3>
      {contestStats && <ContestStats contestStats={contestStats} />}
      <div className="contest-list">
        {activity.recent_contests.map((contest) => (
          <ContestItem key={contest.id} contest={contest} />
        ))}
      </div>
      <Link to="/contests" className="view-all-link">
        View all contests →
      </Link>
    </div>
  )
}
