import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthPage } from '../components/AuthPage'
import { Dashboard } from '../pages/Dashboard'
import { ContestsDashboard } from '../pages/ContestsDashboard'
import { ContestDetailsPage } from '../pages/ContestDetailsPage'
import { ContestArenaPage } from '../pages/ContestArenaPage'
import { useAuth } from '../store/AuthContext'

function RequireAuth() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth" replace />
}

function RequireGuest() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<RequireGuest />}>
        <Route path="/auth" element={<AuthPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contests" element={<ContestsDashboard />} />
        <Route path="/contests/:slug" element={<ContestDetailsPage />} />
        <Route path="/contests/:slug/arena" element={<ContestArenaPage />} />
      </Route>
    </Routes>
  )
}

