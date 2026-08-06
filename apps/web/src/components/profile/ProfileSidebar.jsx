/**
 * ProfileSidebar - Left rail for profile summary and quick actions
 */

import React from 'react'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import './ProfileComponents.css'

export function ProfileSidebar({ user, stats, badges, isLoading, onEditProfile, onRefresh }) {
  if (isLoading) {
    return (
      <div className="profile-rail">
        <Card className="profile-rail__card">
          <CardBody>
            <div className="profile-rail__summary profile-rail__summary--skeleton">
              <Skeleton variant="avatar" width="88px" height="88px" />
              <div className="profile-rail__summary-copy">
                <Skeleton width="160px" height="24px" />
                <Skeleton width="120px" height="16px" />
                <Skeleton width="100px" height="21px" />
              </div>
            </div>
            <div className="profile-rail__metrics">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} width="100%" height="48px" />
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  const metricItems = [
    { label: 'Contest rating', value: stats?.contest_rating ?? '—' },
    { label: 'Duel rating', value: stats?.duel_rating ?? '—' },
    { label: 'Streak', value: stats?.streak ?? 0 },
    { label: 'Badges', value: badges?.length ?? 0 },
  ]

  return (
    <div className="profile-rail">
      <Card className="profile-rail__card">
        <CardBody>
          <div className="profile-rail__summary">
            <Avatar
              name={user?.fullName || 'User'}
              src={stats?.avatar_url || ''}
              size="md"
              className="profile-rail__avatar"
            />
            <div className="profile-rail__summary-copy">
              <p className="profile-rail__name">{user?.fullName || 'User'}</p>
              <p className="profile-rail__email">{user?.email || 'No email available'}</p>
              {stats && (
                <Badge variant="accent">{stats.role}</Badge>
              )}
            </div>
          </div>

          <div className="profile-rail__metrics">
            {metricItems.map((item) => (
              <div key={item.label} className="profile-rail__metric">
                <span className="profile-rail__metric-label">{item.label}</span>
                <span className="profile-rail__metric-value">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="profile-rail__actions">
            <Button variant="primary" size="sm" onClick={onEditProfile}>
              Edit profile
            </Button>
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              Refresh data
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="profile-rail__card">
        <CardHeader>
          <CardTitle>Profile notes</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="profile-rail__note">
            Use the editor to update your display name and avatar. The rest of the page remains synced with your profile stats.
          </p>
          <p className="profile-rail__note profile-rail__note--subtle">
            Tip: keep the avatar URL public so the image can load in the dashboard and profile views.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}