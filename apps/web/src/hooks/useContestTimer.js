// apps/web/src/hooks/useContestTimer.js
import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Threshold constants (in seconds)
 */
const WARNING_THRESHOLD = 300  // 5 minutes
const CRITICAL_THRESHOLD = 60  // 60 seconds

/**
 * Decompose total seconds into hours, minutes, seconds
 * @param {number} totalSec - Total remaining seconds (non-negative)
 * @returns {{ hours: number, minutes: number, seconds: number }}
 */
const decompose = (totalSec) => {
  const clamped = Math.max(0, totalSec)
  return {
    hours: Math.floor(clamped / 3600),
    minutes: Math.floor((clamped % 3600) / 60),
    seconds: Math.floor(clamped % 60),
  }
}

/**
 * useContestTimer — Precise countdown state machine
 *
 * Ticks every 1 second against an absolute `endTime` timestamp.
 * Exposes decomposed time, urgency flags, and fires `onExpire` exactly once
 * at the absolute millisecond the clock reaches zero.
 *
 * @param {string|null} endTime   - ISO 8601 datetime string for contest end
 * @param {Function}    onExpire  - Callback invoked exactly once when timer hits 0
 */
export function useContestTimer(endTime, onExpire) {
  // Compute remaining seconds helper
  const computeRemaining = useCallback(() => {
    if (!endTime) return 0
    const diff = new Date(endTime).getTime() - Date.now()
    return Math.max(0, Math.floor(diff / 1000))
  }, [endTime])

  const [totalSeconds, setTotalSeconds] = useState(computeRemaining)
  const [isExpired, setIsExpired] = useState(() => {
    const init = computeRemaining()
    return init <= 0
  })

  // Stable ref for the onExpire callback to avoid re-creating intervals
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  // Track whether we've already fired the expiry callback
  const hasFiredRef = useRef(false)

  // Combined tick interval & initial setter (eliminates race condition)
  useEffect(() => {
    if (!endTime) {
      setTotalSeconds(0)
      setIsExpired(true)
      hasFiredRef.current = true
      return
    }

    const tick = () => {
      const remaining = computeRemaining()
      setTotalSeconds(remaining)

      if (remaining <= 0) {
        setIsExpired(true)
        if (!hasFiredRef.current) {
          hasFiredRef.current = true
          // Fire the expiry callback exactly once
          if (typeof onExpireRef.current === 'function') {
            onExpireRef.current()
          }
        }
      } else {
        setIsExpired(false)
        hasFiredRef.current = false
      }
    }

    // Tick immediately on mount or update, then every 1s
    tick()
    const intervalId = setInterval(tick, 1000)

    return () => clearInterval(intervalId)
  }, [endTime, computeRemaining])

  // Derived state
  const { hours, minutes, seconds } = decompose(totalSeconds)
  const isWarning = !isExpired && totalSeconds > 0 && totalSeconds <= WARNING_THRESHOLD
  const isCritical = !isExpired && totalSeconds > 0 && totalSeconds <= CRITICAL_THRESHOLD

  // Formatted display string: "01:23:45" or "23:45" when < 1 hour
  const formatted = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired,
    isWarning,
    isCritical,
    formatted,
  }
}
