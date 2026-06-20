const BASE_URL = 'http://localhost:8000/api'

/**
 * Retrieve token from localStorage
 * @returns {string|null} Token if exists, null otherwise
 */
const getToken = () => {
  return localStorage.getItem('authToken');
};

/**
 * Check if valid token exists in header
 * @returns {boolean} True if token exists
 */
const hasValidToken = () => {
  const token = getToken();
  return !!token && token.trim().length > 0;
};

/**
 * Clear authentication - called when token is invalid
 */
const clearAuth = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  // Redirect to login page
  window.location.href = '/auth';
};

/**
 * Build headers with token if available
 */
const buildHeaders = (customHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  const token = getToken();

  // ✅ Check if token exists and add to Authorization header
  // DRF Token Auth format: "Token <your-token-here>"
  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  return headers;
};

/**
 * Main API client with intelligent token handling
 * @param {string} endpoint - API endpoint (e.g., '/auth/login/')
 * @param {object} options - fetch options (method, body, headers, etc.)
 * @returns {Promise} Response JSON
 */
export const apiClient = async (endpoint, options = {}) => {
  const config = {
    ...options,
    headers: buildHeaders(options.headers),
  };

  try {
    // Make the actual network call
    const response = await fetch(`${BASE_URL}${endpoint}`, config);

    // ❌ Handle 401 Unauthorized - Token invalid/expired
    if (response.status === 401) {
      console.warn('⚠️ Token invalid or expired. Clearing auth...');
      clearAuth();
      throw new Error('Your session has expired. Please login again.');
    }

    // ❌ Handle other error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    // ✅ Success: Return parsed JSON
    return await response.json();
  } catch (error) {
    console.error('❌ API Error:', error.message);
    throw error;
  }
};

/**
 * Check token status - useful for conditional rendering
 * @returns {object} Token status info
 */
export const getTokenStatus = () => {
  const hasToken = hasValidToken();
  const token = getToken();

  return {
    isAuthenticated: hasToken,
    hasToken: hasToken,
    token: token ? '***' : null, // Don't expose actual token
  };
};