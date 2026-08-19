import React, { createContext, useState, useContext, useCallback } from 'react'
import { invalidateProfileCache } from '../lib/users'

// Create Auth Context
const AuthContext = createContext(null)

/**
 * ROLE TIER CONSTANTS
 * These must match the values returned by the backend UserSerializer.get_role()
 */
export const ROLES = {
  COMPETITOR: 'competitor',
  MODERATOR: 'moderator',
  SUPERADMIN: 'superadmin',
}

/**
 * AuthProvider - Wraps the app and manages authentication state.
 * Provides: token, user, isAuthenticated, role helpers, setAuth, logout
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState(() => {
    return localStorage.getItem('authToken') || null
  })

  // ==========================================
  // ✅ Derived state
  // ==========================================
  const isAuthenticated = !!token

  /**
   * Canonical role tier string from the backend.
   * Values: 'competitor' | 'moderator' | 'superadmin'
   */
  const role = user?.role ?? ROLES.COMPETITOR

  /** True ONLY if the user is a Moderator / Problem Setter (not superadmin) */
  const isModerator = role === ROLES.MODERATOR

  /** True ONLY if the user is the top-tier Superadmin / Platform Governor */
  const isSuperadmin = role === ROLES.SUPERADMIN

  /** Alias for isSuperadmin — the admin role is exclusively the superadmin tier */
  const isAdmin = isSuperadmin

  /** True for any elevated role (either moderator OR superadmin) */
  const isElevated = isModerator || isSuperadmin

  // ==========================================
  // ✅ Actions
  // ==========================================

  /** Call this after successful login / register to persist session */
  const setAuth = useCallback((authToken, userData) => {
    invalidateProfileCache()
    setToken(authToken)
    setUser(userData)
    localStorage.setItem('authToken', authToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }, [])

  /** Wipes session from memory and localStorage */
  const logout = useCallback(() => {
    invalidateProfileCache()
    setToken(null)
    setUser(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  }, [])

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        // Role helpers
        role,
        isModerator,
        isSuperadmin,
        isAdmin,
        isElevated,
        // Actions
        setAuth,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth - Hook to access auth context anywhere in the app.
 * Throws if used outside <AuthProvider />.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
