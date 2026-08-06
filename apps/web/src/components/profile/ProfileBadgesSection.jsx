/**
 * ProfileBadgesSection - Displays earned profile badges derived from stats
 */

import React from 'react'
import { Skeleton } from '../ui/Skeleton'
import './ProfileComponents.css'

function BadgePill({ badge, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="profile-badge-card profile-badge-card--skeleton">
        <div className="profile-badge-card__emblem profile-badge-card__emblem--skeleton">
          <Skeleton variant="avatar" width="52px" height="52px" />
        </div>
        <div className="profile-badge-card__content">
          <Skeleton width="96px" height="21px" />
          <Skeleton width="100%" height="14px" style={{ marginTop: '8px' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="profile-badge-card">
      <div className={`profile-badge-card__emblem profile-badge-card__emblem--${badge.variant || 'default'}`} aria-hidden="true">
        <span className="profile-badge-card__emblem-star">★</span>
        <span className="profile-badge-card__emblem-title">{badge.shortTitle || badge.title?.slice(0, 3)?.toUpperCase() || 'BAD'}</span>
      </div>
      <div className="profile-badge-card__content">
        <h4 className="profile-badge-card__title">{badge.title}</h4>
        <p className="profile-badge-card__description">{badge.description}</p>
      </div>
    </div>
  )
}

export function ProfileBadgesSection({ badges, isLoading }) {
  if (isLoading) {
    return (
      <div className="profile-badges-card">
        <h3 className="card-title">Earned Badges</h3>
        <div className="profile-badges-grid">
          {[1, 2, 3, 4].map((i) => (
            <BadgePill key={i} isLoading />
          ))}
        </div>
      </div>
    )
  }

  if (!badges || badges.length === 0) {
    return (
      <div className="profile-badges-card">
        <h3 className="card-title">Earned Badges</h3>
        <div className="empty-state">No badges earned yet</div>
      </div>
    )
  }

  return (
    <div className="profile-badges-card">
      <h3 className="card-title">Earned Badges</h3>
      <div className="profile-badges-grid">
        {badges.map((badge) => (
          <BadgePill key={badge.key} badge={badge} />
        ))}
      </div>
    </div>
  )
}