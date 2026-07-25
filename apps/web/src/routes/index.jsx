import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ContestsDashboard } from '../pages/ContestsDashboard'
import { ContestDetailsPage } from '../pages/ContestDetailsPage'
import { ContestArenaPage } from '../pages/ContestArenaPage'
import { AuthForm } from '../components/auth/AuthForm'
import { useAuth } from '../store/AuthContext'
import { Dashboard } from '../pages/Dashboard'
import { PracticeDashboard } from '../pages/PracticeDashboard'
import { ProblemWorkspace } from '../pages/ProblemWorkspace'
import { MatchmakingArena } from '../pages/MatchmakingArena'
import { Arena1v1Page } from '../pages/Arena1v1Page'

function RequireAuth() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth" replace />
}

function RequireGuest() {
  const { isAuthenticated } = useAuth()
  // Prevent logged-in users from accessing the auth page
  // If they are already authenticated, redirect them to the dashboard
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}

export function AppRoutes() {
  return (
    <Routes>
      {/* 
        Guest routes: Only accessible if NOT logged in.
        By wrapping /auth in RequireGuest, we ensure logged-in users can't see the signup page.
      */}
      <Route element={<RequireGuest />}>
        <Route path="/auth" element={<AuthForm />} />
      </Route>

      {/* 
        Protected routes: Only accessible if logged in.
        If an unauthenticated user visits "/", RequireAuth will intercept and redirect them to "/auth".
      */}
      <Route element={<RequireAuth />}>
        {/* Redirect the root path to the dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contests" element={<ContestsDashboard />} />
        <Route path="/contests/:slug" element={<ContestDetailsPage />} />
        <Route path="/contests/:slug/arena" element={<ContestArenaPage />} />
        <Route path="/matchmaking" element={<MatchmakingArena />} />
        <Route path="/arena/:matchId" element={<Arena1v1Page />} />
        <Route path="/arena" element={<Arena1v1Page />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/practice" element={<PracticeDashboard />} />
        <Route path="/practice/problems/:slug" element={<ProblemWorkspace />} />
      </Route>
    </Routes>
  )
}
