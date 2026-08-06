// apps/web/src/lib/auth.js
import { apiClient, getTokenStatus } from './apiClient'
import { invalidateProfileCache } from './users'

/**
 * Step 1: Check if email exists in the database
 * ✅ No token needed - PUBLIC endpoint
 * Django DRF will return: { exists: true/false }
 */
export const checkEmailExists = async (email) => {
  return apiClient('/auth/check-email/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
};

/**
 * Step 2 (Existing User): Login & Get Token
 * ✅ No token needed - PUBLIC endpoint
 * Django DRF will return: { token: 'xyz123...', user: {...} }
 * 
 * Flow:
 * 1. Send email + password to backend
 * 2. Backend validates credentials
 * 3. If valid → Returns token + user data
 * 4. Save token to localStorage
 */
export const loginUser = async (email, password) => {
  return apiClient('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

/**
 * Step 2 (New User): Register & Get Token
 * ✅ No token needed - PUBLIC endpoint
 * Django DRF will return: { token: 'xyz123...', user: {...} }
 * 
 * Flow:
 * 1. Send user registration data to backend
 * 2. Backend validates data & creates user
 * 3. If valid → Returns token + user data
 * 4. Save token to localStorage
 */
export const registerUser = async (userData) => {
  return apiClient('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

/**
 * Google Sign-In login/register
 * ✅ No token needed - PUBLIC endpoint
 * Backend verifies Google token and returns app token + user payload.
 */
export const googleLoginUser = async (idToken) => {
  return apiClient('/auth/google/', {
    method: 'POST',
    body: JSON.stringify({ id_token: idToken }),
  });
};

/**
 * Logout: Clear token & user data
 * ✅ Can use token or without (depending on backend)
 * 
 * Flow:
 * 1. Clear localStorage (token + user)
 * 2. Redirect to login page
 */
export const logoutUser = async () => {
  try {
    // Optional: Notify backend that user is logging out
    // This requires token, so apiClient will add it automatically
    await apiClient('/auth/logout/', {
      method: 'POST',
    });
  } catch (error) {
    console.warn('Logout API call failed, clearing local data anyway:', error.message);
  } finally {
    invalidateProfileCache()
    // Always clear local storage even if API call fails
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    // Redirect to login
    window.location.href = '/auth';
  }
};

/**
 * Get current user profile (Protected - requires token)
 * ❌ Requires valid token in header
 * 
 * Flow:
 * 1. apiClient automatically adds "Authorization: Token xyz" header
 * 2. If no token or invalid token → 401 response
 * 3. apiClient catches 401 & clears auth
 */
export const getUserProfile = async () => {
  return apiClient('/auth/profile/', {
    method: 'GET',
  });
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user has valid token
 */
export const isUserAuthenticated = () => {
  const { isAuthenticated } = getTokenStatus();
  return isAuthenticated;
};

/**
 * Fetch authenticated user's 1v1 duel matches history.
 * @returns {Promise<Array>} List of duel history entries.
 */
export const getDuelHistory = async () => {
  return apiClient('/auth/duels/history/', {
    method: 'GET',
  });
};

/* ─── Superadmin Player Management API ─────────────────────────────────────── */
export const getAdminPlayersList = async (params = {}) => {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.append('search', params.search.trim())
  if (params.role)           qs.append('role', params.role)
  if (params.status)         qs.append('status', params.status)
  if (params.page)           qs.append('page', params.page)
  if (params.pageSize)       qs.append('page_size', params.pageSize)

  return apiClient(`/auth/admin/players/?${qs}`, { method: 'GET' })
}

export const updateAdminPlayerRole = async (userId, role) => {
  return apiClient(`/auth/admin/players/${userId}/role/`, {
    method: 'POST',
    body: JSON.stringify({ role }),
  })
}

export const toggleAdminPlayerBan = async (userId) => {
  return apiClient(`/auth/admin/players/${userId}/ban/`, {
    method: 'POST',
  })
}

export const toggleAdminPlayerFlag = async (userId, reason = '') => {
  return apiClient(`/auth/admin/players/${userId}/flag/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export const adjustAdminPlayerRating = async (userId, ratingType, newRating) => {
  return apiClient(`/auth/admin/players/${userId}/rating/`, {
    method: 'POST',
    body: JSON.stringify({ rating_type: ratingType, new_rating: newRating }),
  })
}
