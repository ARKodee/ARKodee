/**
 * User API client functions
 * Handles all user-related API calls including profile stats and analytics
 */

import { apiClient } from './apiClient'

const PROFILE_CACHE_TTL_MS = 30 * 1000
const profileCache = new Map()

function getCachedResponse(key) {
  const entry = profileCache.get(key)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    profileCache.delete(key)
    return null
  }

  return entry.value
}

function setCachedResponse(key, value, ttlMs = PROFILE_CACHE_TTL_MS) {
  profileCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  })
}

export function invalidateProfileCache() {
  profileCache.delete('profile-stats')
  profileCache.delete('profile-basic')
}

/**
 * Fetch comprehensive user profile statistics
 * Includes: user info, stats, problem analytics, activity, contests
 *
 * @returns {Promise<Object>} Profile data with all user statistics
 * @throws {Error} If the request fails
 */
export const getProfileStats = async () => {
  try {
    const cached = getCachedResponse('profile-stats')
    if (cached) {
      return cached
    }

    const response = await apiClient('/auth/profile-stats/')
    setCachedResponse('profile-stats', response)
    return response
  } catch (error) {
    console.error('Failed to fetch profile stats:', error)
    throw error
  }
}

/**
 * Fetch basic user profile information
 *
 * @returns {Promise<Object>} Basic user data (email, fullName)
 * @throws {Error} If the request fails
 */
export const getUserProfile = async () => {
  try {
    const cached = getCachedResponse('profile-basic')
    if (cached) {
      return cached
    }

    const response = await apiClient('/auth/profile/')
    setCachedResponse('profile-basic', response, 2 * 60 * 1000)
    return response
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    throw error
  }
}

/**
 * Update the authenticated user's profile.
 * Supports display name and avatar URL updates.
 */
export const updateProfile = async (payload) => {
  try {
    const response = await apiClient('/auth/profile/', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    invalidateProfileCache()
    return response
  } catch (error) {
    console.error('Failed to update profile:', error)
    throw error
  }
}
