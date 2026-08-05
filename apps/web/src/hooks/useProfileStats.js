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

    const fetchProfileData = () => {
      setIsLoading(true)
      setIsLoadingCalendar(true)
      setError(null)
      setCalendarError(null)

      // 1. Fetch main profile stats (renders header, problem stats, badges immediately)
      getProfileStats()
        .then((data) => {
          if (isMounted) {
            setProfileData(data)
            setIsLoading(false)
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err.message ?? 'Failed to load profile data.')
            setProfileData(null)
            setIsLoading(false)
          }
        })

      // 2. Fetch submission calendar (heatmap) concurrently
      getSubmissionCalendar()
        .then((cal) => {
          if (isMounted) {
            setSubmissionCalendar(cal ?? {})
            setIsLoadingCalendar(false)
          }
        })
        .catch((err) => {
          if (isMounted) {
            setSubmissionCalendar({})
            setCalendarError(err.message ?? 'Failed to load activity heatmap.')
            setIsLoadingCalendar(false)
          }
        })
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
