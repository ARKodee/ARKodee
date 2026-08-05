/**
 * ProfilePage - Comprehensive user profile with stats, analytics, and activity
 */

import React, { useMemo, useState } from 'react'
import { Navbar } from '../components/layout/Navbar'
import { ProfileHeader } from '../components/profile/ProfileHeader'
import { StatsOverview } from '../components/profile/StatsOverview'
import { ProfileBadgesSection } from '../components/profile/ProfileBadgesSection'
import { ProfileActivityHeatmap } from '../components/profile/ProfileActivityHeatmap'
import { ProfileEditModal } from '../components/profile/ProfileEditModal'
import { ProblemStatsCard } from '../components/profile/ProblemStatsCard'
import { RecentActivitySection } from '../components/profile/RecentActivitySection'
import { ContestHistorySection } from '../components/profile/ContestHistorySection'
import { useProfileStats } from '../hooks/useProfileStats'
import { updateProfile } from '../lib/users'
import './ProfilePage.css'

export function ProfilePage() {
  const { profileData, submissionCalendar, isLoading, isLoadingCalendar, error, calendarError, refetch } = useProfileStats()
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState(null)

  const editValues = useMemo(() => ({
    fullName: profileData?.user?.fullName || '',
    avatarUrl: profileData?.stats?.avatar_url || '',
  }), [profileData?.user?.fullName, profileData?.stats?.avatar_url])

  const handleEditProfile = () => {
    setEditError(null)
    setIsEditOpen(true)
  }

  const handleSaveProfile = async (values) => {
    setIsSaving(true)
    setEditError(null)

    try {
      await updateProfile(values)
      await refetch()
      setIsEditOpen(false)
    } catch (err) {
      setEditError(err.message || 'Failed to update profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="profile-page">
      <Navbar />

      <div className="profile-body">
        {/* Error State */}
        {error && (
          <div className="profile-error" role="alert">
            <p>{error}</p>
          </div>
        )}

        <div className="profile-content">
          {/* Profile Header */}
          <div className="profile-section profile-section--header">
            <ProfileHeader
              user={profileData?.user}
              stats={profileData?.stats}
              isLoading={isLoading}
              onEditProfile={handleEditProfile}
            />
          </div>

          {/* Stats Overview */}
          <div className="profile-section profile-section--stats">
            <StatsOverview stats={profileData?.stats} isLoading={isLoading} />
          </div>

          {/* Earned Badges */}
          <div className="profile-section profile-section--badges">
            <ProfileBadgesSection
              badges={profileData?.earned_badges}
              isLoading={isLoading}
            />
          </div>

          {/* Main Content Grid */}
          <div className="profile-grid">
            {/* Left Column - Problem Stats */}
            <section className="profile-column profile-column--main" aria-label="Problem statistics">
              <ProblemStatsCard
                problemStats={profileData?.problem_stats}
                isLoading={isLoading}
              />
              <div className="profile-section profile-section--heatmap">
                <ProfileActivityHeatmap
                  calendarData={submissionCalendar}
                  isLoading={isLoadingCalendar}
                  error={calendarError}
                  anchorDate={profileData?.stats?.created_at}
                />
              </div>
            </section>

            {/* Right Column - Activity & Contests */}
            <aside className="profile-column profile-column--side" aria-label="Activity sidebar">
              <RecentActivitySection
                activity={profileData?.activity}
                isLoading={isLoading}
              />
              <ContestHistorySection
                activity={profileData?.activity}
                contestStats={profileData?.contest_stats}
                isLoading={isLoading}
              />
            </aside>
          </div>
        </div>

        <ProfileEditModal
          isOpen={isEditOpen}
          isSaving={isSaving}
          error={editError}
          initialValues={editValues}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleSaveProfile}
        />
      </div>
    </div>
  )
}
