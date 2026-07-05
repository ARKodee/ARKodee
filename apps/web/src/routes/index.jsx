import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ContestsDashboard } from '../pages/ContestsDashboard'
import { ContestDetailsPage } from '../pages/ContestDetailsPage'
import { ContestArenaPage } from '../pages/ContestArenaPage'
import { AuthForm } from '../components/auth/AuthForm'
import { useAuth } from '../store/AuthContext'
import { Dashboard } from '../pages/Dashboard'
import { PracticeDashboard } from '../pages/PracticeDashboard'
import { ProblemWorkspace } from '../pages/ProblemWorkspace'

function RequireAuth() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth" replace />
}

function RequireGuest() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RequireGuest />}>
        <Route path="/auth" element={<AuthForm />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contests" element={<ContestsDashboard />} />
        <Route path="/contests/:slug" element={<ContestDetailsPage />} />
        <Route path="/contests/:slug/arena" element={<ContestArenaPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/practice" element={<PracticeDashboard />} />
        <Route path="/practice/problems/:slug" element={<ProblemWorkspace />} />
      </Route>
    </Routes>
  )
}
