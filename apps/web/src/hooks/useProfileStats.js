/**
 * useProfileStats - Hook for fetching and managing user profile statistics
 *
 * Handles:
 * - Fetching comprehensive profile data from backend
 * - Managing loading and error states
 * - Aggregated user statistics including contests, problems, activity
 */

import { useState, useEffect } from 'react'
import { getProfileStats } from '../lib/users'
import { getSubmissionCalendar } from '../lib/problems'

/**
 * Custom hook to fetch and manage user profile statistics
 *
 * @returns {Object} Profile data, loading state, error state, and refetch function
 */
export function useProfileStats() {
  // ─── Data State ──────────────────────────────────────────────────────────────
  const [profileData, setProfileData] = useState(null)
  const [submissionCalendar, setSubmissionCalendar] = useState({})

  // ─── Loading / Error States ───────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true)
  const [error, setError] = useState(null)
  const [calendarError, setCalendarError] = useState(null)

  // ─── Effect: Initial Profile Data Fetch ──────────────────────────────────────
  useEffect(() => {
    let isMounted = true

    const fetchProfileData = async () => {
      setIsLoading(true)
      setIsLoadingCalendar(true)
      setError(null)
      setCalendarError(null)

      try {
        const [profileResult, calendarResult] = await Promise.allSettled([
          getProfileStats(),
          getSubmissionCalendar(),
        ])

        if (!isMounted) return

        if (profileResult.status === 'fulfilled') {
          setProfileData(profileResult.value)
        } else {
          console.error('Profile fetch error:', profileResult.reason)
          setError(profileResult.reason.message ?? 'Failed to load profile data.')
          setProfileData(null)
        }

        if (calendarResult.status === 'fulfilled') {
          setSubmissionCalendar(calendarResult.value ?? {})
        } else {
          console.warn('Profile calendar fetch error:', calendarResult.reason)
          setSubmissionCalendar({})
          setCalendarError(calendarResult.reason.message ?? 'Failed to load activity heatmap.')
        }
      } catch (err) {
        if (!isMounted) return

        setError(err.message ?? 'Failed to load profile data.')
        setProfileData(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
          setIsLoadingCalendar(false)
        }
      }
    }

    fetchProfileData()

    return () => {
      isMounted = false
    }
  }, [])

  // ─── Refetch Function ─────────────────────────────────────────────────────────
  const refetch = async () => {
    setIsLoading(true)
    setIsLoadingCalendar(true)
    setError(null)
    setCalendarError(null)

    try {
      const [profileResult, calendarResult] = await Promise.allSettled([
        getProfileStats(),
        getSubmissionCalendar(),
      ])

      if (profileResult.status === 'fulfilled') {
        setProfileData(profileResult.value)
      } else {
        throw profileResult.reason
      }

      if (calendarResult.status === 'fulfilled') {
        setSubmissionCalendar(calendarResult.value ?? {})
      } else {
        setSubmissionCalendar({})
        setCalendarError(calendarResult.reason.message ?? 'Failed to load activity heatmap.')
      }
    } catch (err) {
      console.error('Profile refetch error:', err)
      setError(err.message ?? 'Failed to reload profile data.')
    } finally {
      setIsLoading(false)
      setIsLoadingCalendar(false)
    }
  }

  // ─── Packaged Contract ────────────────────────────────────────────────────────
  return {
    profileData,
    submissionCalendar,
    isLoading,
    isLoadingCalendar,
    error,
    calendarError,
    refetch,
  }
}
