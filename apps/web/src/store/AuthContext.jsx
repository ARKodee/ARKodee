import React, { createContext, useState, useContext } from 'react'

// Create Auth Context
const AuthContext = createContext(null)

/**
 * AuthProvider - Wraps the app and manages authentication state
 * Provides: token, user, isAuthenticated, logout
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState(() => {
    return localStorage.getItem('authToken') || null
  })

  const isAuthenticated = !!token

  // Call this after successful login/register
  const setAuth = (authToken, userData) => {
    setToken(authToken)
    setUser(userData)
    localStorage.setItem('authToken', authToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  // Logout user
  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth - Hook to access auth context anywhere in the app
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
