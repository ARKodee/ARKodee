import { useState, useEffect, useCallback } from 'react'
import { getContestsList, registerForContest, getContestLeaderboard, getGlobalLeaderboard } from '../lib/contests'

/**
 * Compute runtime status from contest time bounds
 * @param {string} startTime - ISO datetime string
 * @param {string} endTime - ISO datetime string
 * @returns {'upcoming'|'active'|'ended'}
 */
const computeRuntimeStatus = (startTime, endTime) => {
  const now = Date.now()
  const start = new Date(startTime).getTime()
  const end = new Date(endTime).getTime()

  if (now < start) return 'upcoming'
  if (now >= start && now <= end) return 'active'
  return 'ended'
}

/**
 * Unified custom hook for contest state lifecycle
 * Manages contests list, leaderboard, loading, and error states
 */
export function useContestData(activeFilter = 'all') {
  const [contests, setContests] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch contests whenever the active filter changes
  useEffect(() => {
    let cancelled = false

    const fetchContests = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await getContestsList(activeFilter)
        if (cancelled) return

        // Enrich each contest with a computed runtimeStatus
        const enriched = (data.results || data || []).map((contest) => ({
          ...contest,
          runtimeStatus: computeRuntimeStatus(contest.start_time, contest.end_time),
        }))

        setContests(enriched)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load contests.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchContests()
    return () => { cancelled = true }
  }, [activeFilter])

  // Register for a contest
  const handleRegister = useCallback(async (contestId, accessCode = '') => {
    try {
      // Pass optional access code to register API
      await registerForContest(contestId, accessCode)
      // Optimistically update the registered state in local list
      setContests((prev) =>
        prev.map((c) =>
          (c.id === contestId || c.slug === contestId) ? { ...c, is_registered: true } : c
        )
      )
      return { success: true }
    } catch (err) {
      throw new Error(err.message || 'Registration failed.')
    }
  }, [])

  // Fetch leaderboard for a specific contest (or global)
  const fetchLeaderboard = useCallback(async (contestId) => {
    try {
      const data = contestId === 'global'
        ? await getGlobalLeaderboard()
        : await getContestLeaderboard(contestId)
      setLeaderboard(data.results || data || [])
    } catch (err) {
      // Silent catch: Do not set master dashboard error if ELO leaderboard loading fails
      console.warn('Failed to load standings:', err)
    }
  }, [])

  return {
    contests,
    leaderboard,
    loading,
    error,
    handleRegister,
    fetchLeaderboard,
  }
}
