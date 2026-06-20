import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

export function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/auth')
  }

  return (
    <div className="dashboard">
      <h1>Welcome, {user?.name || user?.fullName || 'User'}! 🎉</h1>
      <p>Email: {user?.email}</p>

      <button onClick={handleLogout} className="logout-btn">
        Logout
      </button>
    </div>
  )
}
