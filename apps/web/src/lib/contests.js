// apps/web/src/lib/contests.js
import { apiClient } from './apiClient'

/**
 * Fetch list of contests filtered by type
 * @param {string} filterType - 'live' | 'upcoming' | 'past' | 'my_contests'
 * @returns {Promise<Array>} List of contest objects
 */
export const getContestsList = async (filterType) => {
  return apiClient(`/contests/?filter=${filterType}`, {
    method: 'GET',
  })
}

/**
 * Register the authenticated user for a specific contest
 * @param {string|number} contestId - The contest ID
 * @returns {Promise<Object>} Registration confirmation
 */
export const registerForContest = async (contestId, accessCode = '') => {
  const payload = accessCode ? { access_code: accessCode } : {}
  return apiClient(`/contests/${contestId}/register/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Fetch leaderboard standings for a contest
 * @param {string|number} contestId - The contest ID
 * @returns {Promise<Array>} Leaderboard entries with rank, username, score, penalty
 */
export const getContestLeaderboard = async (contestId) => {
  return apiClient(`/contests/${contestId}/leaderboard/`, {
    method: 'GET',
  })
}

/**
 * Fetch global competitive standings (top ELO ratings)
 * @returns {Promise<Array>} List of global rankings
 */
export const getGlobalLeaderboard = async () => {
  return apiClient('/leaderboard/global/', {
    method: 'GET',
  })
}

/**
 * Fetch full contest details by slug
 * @param {string} slug - The contest slug identifier
 * @returns {Promise<Object>} Full contest detail including description, rules, problems
 */
export const getContestDetails = async (slug) => {
  return apiClient(`/contests/${slug}/`, {
    method: 'GET',
  })
}

/**
 * Submit a solution for a specific problem within a contest
 * @param {string|number} contestId - The contest ID or slug
 * @param {string|number} problemId - The problem ID or slug
 * @param {{ language: string, code: string }} payload - Submission data
 * @returns {Promise<Object>} Submission result with verdict
 */
export const submitContestSolution = async (contestSlug, problemSlug, { language, code }) => {
  return apiClient(`/problems/${problemSlug}/submit/`, {
    method: 'POST',
    body: JSON.stringify({
      code,
      language,
      contest_slug: contestSlug,
    }),
  })
}

/**
 * Run code against sample/custom test cases (non-submission execution)
 * @param {string|number} contestId - The contest ID or slug
 * @param {string|number} problemId - The problem ID or slug
 * @param {{ language: string, code: string, input?: string }} payload
 * @returns {Promise<Object>} Execution output with stdout, stderr, status
 */
export const runContestCode = async (contestId, problemId, payload) => {
  return apiClient(`/contests/${contestId}/problems/${problemId}/run/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Start a virtual practice session for an ended contest
 * @param {string} slug - Contest slug
 * @returns {Promise<Object>} Session details
 */
export const startVirtualContest = async (slug) => {
  return apiClient(`/contests/${slug}/start-virtual/`, {
    method: 'POST',
  })
}


// ─── Moderator CRUD ───────────────────────────────────────────────────────────

/** Fetch ALL contests for moderator management. Supports search + status filter. */
export const getModContestsList = async (params = {}) => {
  const qs = new URLSearchParams()
  if (params.search?.trim()) qs.append('search', params.search.trim())
  if (params.status && params.status !== 'all') qs.append('status', params.status)
  const endpoint = qs.toString() ? `/contests/mod/?${qs}` : '/contests/mod/'
  return apiClient(endpoint, { method: 'GET' })
}

/** Fetch full contest detail (including assigned problems) for editing. */
export const getModContestDetail = async (id) =>
  apiClient(`/contests/mod/${id}/`, { method: 'GET' })

/** Create a new contest. */
export const createModContest = async (payload) =>
  apiClient('/contests/mod/create/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

/** Update an existing contest. */
export const updateModContest = async (id, payload) =>
  apiClient(`/contests/mod/${id}/update/`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

/** Delete a contest permanently. */
export const deleteModContest = async (id) =>
  apiClient(`/contests/mod/${id}/delete/`, { method: 'DELETE' })

/** Fetch approved problems for problem picker inside contest builder with pagination support. */
export const getModContestProblemsPool = async (search = '', page = 1) => {
  const qs = new URLSearchParams()
  qs.append('status', 'approved')  // Only approved problems are contest-eligible
  if (search.trim()) qs.append('search', search.trim())
  if (page > 1) qs.append('page', page)
  return apiClient(`/problems/mod/?${qs}`, { method: 'GET' })
}

