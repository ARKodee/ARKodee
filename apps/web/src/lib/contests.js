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
export const registerForContest = async (contestId) => {
  return apiClient(`/contests/${contestId}/register/`, {
    method: 'POST',
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
export const submitContestSolution = async (contestId, problemId, payload) => {
  return apiClient(`/contests/${contestId}/problems/${problemId}/submit/`, {
    method: 'POST',
    body: JSON.stringify(payload),
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
