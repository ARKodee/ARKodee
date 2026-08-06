/**
 * ProfileHeader - Displays user profile header with avatar, name, role, and basic info
 */

import React from 'react'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import './ProfileComponents.css'

export function ProfileHeader({ user, stats, isLoading, onEditProfile }) {
  if (isLoading) {
    return (
      <div className="profile-header profile-header--skeleton">
        <div className="profile-header__avatar">
          <Skeleton width="120px" height="120px" />
        </div>
        <div className="profile-header__info">
          <Skeleton width="200px" height="32px" />
          <Skeleton width="150px" height="20px" />
          <Skeleton width="300px" height="16px" />
        </div>
      </div>
    )
  }

  const getRoleBadgeClass = (role) => {
    const roleMap = {
      competitor: 'role-badge--competitor',
      moderator: 'role-badge--moderator',
      superadmin: 'role-badge--superadmin',
    }
    return roleMap[role] || 'role-badge--competitor'
  }

  return (
    <div className="profile-header">
      {/* Avatar Section */}
      <div className="profile-header__avatar">
        {stats?.avatar_url ? (
          <img
            src={stats.avatar_url}
            alt={user?.fullName || 'User'}
            className="profile-avatar"
          />
        ) : (
          <div className="profile-avatar profile-avatar--placeholder">
            {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        )}
      </div>

      {/* User Info Section */}
      <div className="profile-header__info">
        <div className="profile-header__name-row">
          <h1 className="profile-header__name">{user?.fullName || 'User'}</h1>
          {stats && (
            <span className={`role-badge ${getRoleBadgeClass(stats.role)}`}>
              {stats.role === 'competitor'
                ? 'Competitor'
                : stats.role === 'moderator'
                ? 'Moderator'
                : 'Superadmin'}
            </span>
          )}
        </div>
        <p className="profile-header__email">{user?.email}</p>
        {stats && (
          <p className="profile-header__member-since">
            Member since {new Date(stats.created_at).toLocaleDateString()}
          </p>
        )}
        <div className="profile-header__actions">
          <Button variant="outline" size="sm" onClick={onEditProfile}>
            Edit profile
          </Button>
        </div>
      </div>
    </div>
  )
}
