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
export const runProblemCode = async (slug, code, language) => {
  return apiClient(`/problems/${slug}/run/`, {
    method: 'POST',
    body: JSON.stringify({ code, language }),
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
