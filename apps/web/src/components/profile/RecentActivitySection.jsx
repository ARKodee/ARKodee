/**
 * RecentActivitySection - Displays recent user submissions
 */

import React from 'react'
import { Link } from 'react-router-dom'
import { Skeleton } from '../ui/Skeleton'
import './ProfileComponents.css'

function ActivityItem({ submission, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="activity-item activity-item--skeleton">
        <Skeleton width="200px" height="16px" />
        <Skeleton width="100px" height="14px" />
        <Skeleton width="80px" height="14px" />
      </div>
    )
  }

  const getVerdictClass = (verdict) => {
    const map = {
      AC: 'verdict-ac',
      WA: 'verdict-wa',
      TLE: 'verdict-tle',
      MLE: 'verdict-mle',
      RE: 'verdict-re',
      CE: 'verdict-ce',
      PENDING: 'verdict-pending',
    }
    return map[verdict] || 'verdict-default'
  }

  const getVerdictLabel = (verdict) => {
    const map = {
      AC: 'Accepted',
      WA: 'Wrong Answer',
      TLE: 'Time Limit Exceeded',
      MLE: 'Memory Limit Exceeded',
      RE: 'Runtime Error',
      CE: 'Compile Error',
      PENDING: 'Pending',
    }
    return map[verdict] || verdict
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="activity-item">
      <div className="activity-item__main">
        <Link
          to={`/practice/problems/${submission.problem_slug}`}
          className="activity-item__problem-title"
        >
          {submission.problem_title}
        </Link>
        <div className="activity-item__meta">
          <span className="activity-item__language">{submission.language}</span>
          {submission.runtime_ms && (
            <span className="activity-item__runtime">
              {submission.runtime_ms}ms
            </span>
          )}
        </div>
      </div>
      <div className={`activity-item__verdict ${getVerdictClass(submission.verdict)}`}>
        {getVerdictLabel(submission.verdict)}
      </div>
      <div className="activity-item__date">
        {formatDate(submission.submitted_at)}
      </div>
    </div>
  )
}

export function RecentActivitySection({ activity, isLoading }) {
  if (isLoading) {
    return (
      <div className="recent-activity-card">
        <h3 className="card-title">Recent Submissions</h3>
        <div className="activity-list">
          {[1, 2, 3, 4, 5].map((i) => (
            <ActivityItem key={i} isLoading={true} />
          ))}
        </div>
      </div>
    )
  }

  if (!activity || activity.recent_submissions.length === 0) {
    return (
      <div className="recent-activity-card">
        <h3 className="card-title">Recent Submissions</h3>
        <div className="empty-state">No recent submissions</div>
      </div>
    )
  }

  return (
    <div className="recent-activity-card">
      <h3 className="card-title">Recent Submissions</h3>
      <div className="activity-list">
        {activity.recent_submissions.map((submission) => (
          <ActivityItem key={submission.id} submission={submission} />
        ))}
      </div>
      <Link to="/practice" className="view-all-link">
        View all submissions →
      </Link>
    </div>
  )
}
