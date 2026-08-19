/**
 * ProblemStatsCard - Displays problem solving statistics by difficulty level
 */

import React from 'react'
import { Skeleton } from '../ui/Skeleton'
import './ProfileComponents.css'

function DifficultyBar({ difficulty, solved, attempted, total, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="difficulty-bar difficulty-bar--skeleton">
        <Skeleton width="60px" height="16px" />
        <Skeleton width="100%" height="24px" style={{ marginTop: '6px' }} />
        <Skeleton width="100px" height="14px" style={{ marginTop: '4px' }} />
      </div>
    )
  }

  const getDifficultyClass = (diff) => {
    const map = {
      easy: 'difficulty-easy',
      medium: 'difficulty-medium',
      hard: 'difficulty-hard',
    }
    return map[diff] || 'difficulty-default'
  }

  const solvePercentage = total > 0 ? (solved / total) * 100 : 0
  const attemptPercentage = total > 0 ? ((solved + attempted) / total) * 100 : 0

  return (
    <div className={`difficulty-bar ${getDifficultyClass(difficulty)}`}>
      <div className="difficulty-bar__header">
        <span className="difficulty-bar__label">
          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </span>
        <span className="difficulty-bar__count">{solved} / {total}</span>
      </div>
      <div className="difficulty-bar__progress-container">
        <div className="difficulty-bar__progress-background">
          <div
            className="difficulty-bar__progress-attempt"
            style={{ width: `${attemptPercentage}%` }}
          />
          <div
            className="difficulty-bar__progress-solved"
            style={{ width: `${solvePercentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

export function ProblemStatsCard({ problemStats, isLoading }) {
  if (isLoading) {
    return (
      <div className="problem-stats-card">
        <h3 className="card-title">Problem Statistics</h3>
        <div className="problem-stats__content">
          {[1, 2, 3].map((i) => (
            <DifficultyBar key={i} isLoading={true} />
          ))}
          <Skeleton width="100%" height="40px" style={{ marginTop: '16px' }} />
        </div>
      </div>
    )
  }

  if (!problemStats) {
    return (
      <div className="problem-stats-card">
        <h3 className="card-title">Problem Statistics</h3>
        <div className="empty-state">No problem data available</div>
      </div>
    )
  }

  const { by_difficulty, total_solved, success_rate } = problemStats

  return (
    <div className="problem-stats-card">
      <h3 className="card-title">Problem Statistics</h3>
      <div className="problem-stats__content">
        {/* Difficulty breakdowns */}
        <DifficultyBar
          difficulty="easy"
          solved={by_difficulty.easy.solved}
          attempted={by_difficulty.easy.attempted}
          total={by_difficulty.easy.solved + by_difficulty.easy.attempted}
        />
        <DifficultyBar
          difficulty="medium"
          solved={by_difficulty.medium.solved}
          attempted={by_difficulty.medium.attempted}
          total={by_difficulty.medium.solved + by_difficulty.medium.attempted}
        />
        <DifficultyBar
          difficulty="hard"
          solved={by_difficulty.hard.solved}
          attempted={by_difficulty.hard.attempted}
          total={by_difficulty.hard.solved + by_difficulty.hard.attempted}
        />

        {/* Overall summary */}
        <div className="problem-stats__summary">
          <div className="summary-item">
            <span className="summary-label">Total Solved:</span>
            <span className="summary-value">{total_solved}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Success Rate:</span>
            <span className="summary-value">{success_rate}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
