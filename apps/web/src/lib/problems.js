// src/lib/problems.js
// Network Transport Service — pure data utility, no React code or local mocks.
import { apiClient } from './apiClient';

/**
 * Fetch the paginated/filtered list of problems from the backend.
 *
 * @param {Object} params - Optional filtration metrics.
 * @param {string} [params.search]     - Free-text search query.
 * @param {string} [params.difficulty] - Difficulty filter ("easy" | "medium" | "hard").
 * @returns {Promise<Object>} Backend JSON response (list + metadata).
 */
export const getProblemsList = async (params = {}) => {
  // Build query-string payload, mapping values to Django choice model format.
  const queryParams = new URLSearchParams();

  if (params.search && params.search.trim().length > 0) {
    queryParams.append('search', params.search.trim());
  }

  if (params.difficulty && params.difficulty.toUpperCase() !== 'ALL') {
    // Django choice model requires UPPERCASE difficulty values.
    queryParams.append('difficulty', params.difficulty.toUpperCase());
  }

  if (params.page) {
    queryParams.append('page', params.page);
  }

  if (params.page_size) {
    queryParams.append('page_size', params.page_size);
  }

  const queryString = queryParams.toString();
  const endpoint = queryString
    ? `/problems/?${queryString}`
    : '/problems/';

  return apiClient(endpoint, { method: 'GET' });
};

/**
 * Fetch the authenticated user's submission activity calendar.
 * Returns a timestamp → submission-count dictionary map.
 *
 * @returns {Promise<Object>} Activity payload: { "<unix_timestamp>": count, ... }
 */
export const getSubmissionCalendar = async () => {
  return apiClient('/problems/submission-calendar/', { method: 'GET' });
};

/**
 * Fetches the exhaustive structural dataset of a singular DSA question target via its slug.
 * Target route handles metadata, descriptions, constraints, limits, and public validation structures.
 * @param {string} slug - Unique identifier for the question route.
 * @returns {Promise<Object>} The full specification object.
 */
export const getProblemDetails = async (slug) => {
  return apiClient(`/problems/${slug}/`, { method: 'GET' });
};

/**
 * Run solution code against sample test cases.
 */
export const runProblemCode = async (slug, code, language, customCases = null) => {
  return apiClient(`/problems/${slug}/run/`, {
    method: 'POST',
    body: JSON.stringify({ code, language, custom_cases: customCases }),
  });
};

/**
 * Submit solution code for complete evaluation.
 */
export const submitProblemCode = async (slug, code, language) => {
  return apiClient(`/problems/${slug}/submit/`, {
    method: 'POST',
    body: JSON.stringify({ code, language }),
  });
};

/**
 * Fetch the authenticated user's submission history for a specific problem.
 */
export const getProblemSubmissions = async (slug) => {
  return apiClient(`/problems/${slug}/submissions/`, { method: 'GET' });
};


// ─── Moderator CRUD ───────────────────────────────────────────────────────────

/**
 * Fetch ALL problems (any status) for moderator management table.
 * Supports same search + difficulty params as player endpoint, plus status filter.
 */
export const getModProblemsList = async (params = {}) => {
  const qs = new URLSearchParams();
  if (params.search?.trim()) qs.append('search', params.search.trim());
  if (params.difficulty && params.difficulty !== 'all') qs.append('difficulty', params.difficulty);
  if (params.status && params.status !== 'all') qs.append('status', params.status);
  if (params.page && params.page > 1) qs.append('page', params.page);
  const endpoint = qs.toString() ? `/problems/mod/?${qs}` : '/problems/mod/';
  return apiClient(endpoint, { method: 'GET' });
};

/**
 * Fetch a single problem's full data (including all test cases) for editing.
 */
export const getModProblemDetail = async (id) => {
  return apiClient(`/problems/mod/${id}/`, { method: 'GET' });
};

/**
 * Create a new problem. Payload must include at least 15 test_cases.
 */
export const createModProblem = async (payload) => {
  return apiClient('/problems/mod/create/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Update an existing problem. If test_cases included, minimum 15 required.
 */
export const updateModProblem = async (id, payload) => {
  return apiClient(`/problems/mod/${id}/update/`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

/**
 * Permanently delete a problem.
 */
export const deleteModProblem = async (id) => {
  return apiClient(`/problems/mod/${id}/delete/`, { method: 'DELETE' });
};

// ─── Superadmin Approval Queue API Helpers ─────────────────────────────────────

/**
 * Fetch change requests for Superadmin review.
 */
export const getAdminRequestsList = async (params = {}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.append('status', params.status);
  if (params.entity_type && params.entity_type !== 'all') qs.append('entity_type', params.entity_type);
  const endpoint = qs.toString() ? `/problems/admin/requests/?${qs}` : '/problems/admin/requests/';
  return apiClient(endpoint, { method: 'GET' });
};

/**
 * Approve a change request.
 */
export const approveAdminRequest = async (id) => {
  return apiClient(`/problems/admin/requests/${id}/approve/`, { method: 'POST' });
};

/**
 * Reject a change request with optional reason.
 */
export const rejectAdminRequest = async (id, rejection_reason = '') => {
  return apiClient(`/problems/admin/requests/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ rejection_reason }),
  });
};


