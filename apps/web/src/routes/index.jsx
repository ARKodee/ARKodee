import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ContestsDashboard } from '../pages/ContestsDashboard'
import { ContestDetailsPage } from '../pages/ContestDetailsPage'
import { ContestArenaPage } from '../pages/ContestArenaPage'
import { AuthForm } from '../components/auth/AuthForm'
import { useAuth } from '../store/AuthContext'
import { Dashboard } from '../pages/Dashboard'
import { ModeratorDashboard } from '../pages/ModeratorDashboard'
import { ModeratorProblems }  from '../pages/ModeratorProblems'
import { ModeratorContests }  from '../pages/ModeratorContests'
import { SuperadminRequests }  from '../pages/SuperadminRequests'
import { SuperadminDashboard } from '../pages/SuperadminDashboard'
import { SuperadminPlayers }   from '../pages/SuperadminPlayers'
import { PracticeDashboard } from '../pages/PracticeDashboard'
import { ProblemWorkspace } from '../pages/ProblemWorkspace'
import { MatchmakingArena } from '../pages/MatchmakingArena'
import { Arena1v1Page } from '../pages/Arena1v1Page'
import { DebugArenaPage } from '../pages/DebugArenaPage'


// =========================================================
// 🔐 RequireGuest
// Blocks logged-in users from revisiting /auth.
// Routes each role to their dedicated home on login.
// =========================================================
function RequireGuest() {
  const { isAuthenticated, isModerator, isSuperadmin } = useAuth()

  if (!isAuthenticated) return <Outlet />

  if (isSuperadmin) return <Navigate to="/admin/dashboard" replace />
  if (isModerator)  return <Navigate to="/moderator/dashboard" replace />
  return                   <Navigate to="/dashboard" replace />
}


// =========================================================
// 🔐 RequireAuth (Competitor tier)
// Any authenticated user. Guests → /auth.
// =========================================================
function RequireAuth() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/auth" replace />
}


// =========================================================
// 🔐 RequireModerator (Contributor tier — EXACT)
// ONLY users with role === 'moderator' can pass.
// Guests       → /auth
// Competitors  → /dashboard
// Superadmins  → /admin/dashboard  (they have their own separate panel)
// =========================================================
function RequireModerator() {
  const { isAuthenticated, isModerator, isSuperadmin } = useAuth()

  if (!isAuthenticated) return <Navigate to="/auth" replace />
  // Superadmins & Moderators can both access Moderator management tools
  if (!isModerator && !isSuperadmin) return <Navigate to="/dashboard" replace />
  return <Outlet />
}


// =========================================================
// 🔐 RequireSuperadmin (Admin tier — EXACT)
// ONLY users with role === 'superadmin' can pass.
// Guests       → /auth
// Competitors  → /dashboard
// Moderators   → /moderator/dashboard  (they have their own separate panel)
// =========================================================
function RequireSuperadmin() {
  const { isAuthenticated, isSuperadmin, isModerator } = useAuth()

  if (!isAuthenticated)  return <Navigate to="/auth" replace />
  if (isModerator)       return <Navigate to="/moderator/dashboard" replace />
  if (!isSuperadmin)     return <Navigate to="/dashboard" replace />
  return <Outlet />
}


// =========================================================
// 🗺️ App Routes
// =========================================================
export function AppRoutes() {
  return (
    <Routes>

      {/* ─────────────────────────────────────────
          GUEST ROUTES
          ───────────────────────────────────────── */}
      <Route element={<RequireGuest />}>
        <Route path="/auth" element={<AuthForm />} />
      </Route>


      {/* ─────────────────────────────────────────
          COMPETITOR ROUTES
          Role: 'competitor'
          Home: /dashboard
          ───────────────────────────────────────── */}
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/debug/:bugId" element={<DebugArenaPage />} />
        <Route path="/debug" element={<DebugArenaPage />} />
        <Route path="/contests" element={<ContestsDashboard />} />
        <Route path="/contests/:slug" element={<ContestDetailsPage />} />
        <Route path="/contests/:slug/arena" element={<ContestArenaPage />} />
        <Route path="/matchmaking" element={<MatchmakingArena />} />
        <Route path="/arena/:matchId" element={<Arena1v1Page />} />
        <Route path="/arena" element={<Arena1v1Page />} />
        <Route path="/practice" element={<PracticeDashboard />} />
        <Route path="/practice/problems/:slug" element={<ProblemWorkspace />} />
      </Route>


      {/* ─────────────────────────────────────────
          MODERATOR / CONTRIBUTOR ROUTES
          Role: 'moderator' (EXACT — superadmins are blocked here)
          Home: /moderator/dashboard
          Scope: Problem Bank, Contest Management
          ───────────────────────────────────────── */}
      <Route element={<RequireModerator />}>
        <Route path="/moderator/dashboard" element={<ModeratorDashboard />} />
        <Route path="/moderator/problems" element={<ModeratorProblems />} />
        <Route path="/moderator/contests" element={<ModeratorContests />} />
      </Route>


      {/* ─────────────────────────────────────────
          SUPERADMIN / ADMIN ROUTES
          Role: 'superadmin' (EXACT — moderators are blocked here)
          Home: /admin/dashboard
          Scope: Contributor Management, Player Moderation, Audit Logs
          ───────────────────────────────────────── */}
      <Route element={<RequireSuperadmin />}>
        <Route path="/admin/dashboard" element={<SuperadminDashboard />} />
        <Route path="/admin/requests" element={<SuperadminRequests />} />
        <Route path="/admin/problems" element={<ModeratorProblems />} />
        <Route path="/admin/contests" element={<ModeratorContests />} />
        <Route path="/admin/contributors" element={<div>Contributor Workforce (Placeholder)</div>} />
        <Route path="/admin/players" element={<SuperadminPlayers />} />
        <Route path="/admin/audit-logs" element={<div>Audit Logs (Placeholder)</div>} />
      </Route>

    </Routes>
  )
}
