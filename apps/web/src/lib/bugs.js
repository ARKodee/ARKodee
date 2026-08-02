// src/lib/bugs.js
// Network Transport Service for Daily Bug Bounty features.
// Consumes backend endpoints exclusively via the central apiClient wrapper.
import { apiClient } from './apiClient';

/**
 * Fetch the active Daily Bug Bounty challenge payload from the backend.
 * @returns {Promise<Object>} The daily bug object.
 */
export const getDailyBug = async () => {
  return apiClient('/problems/daily-bug/', { method: 'GET' });
};

/**
 * Fetch structural details for a specific bug bounty challenge by ID.
 * @param {string} bugId - The unique identifier of the target bug.
 * @returns {Promise<Object>} Structural specifications for the target bug.
 */
export const getBugDetails = async (bugId) => {
  return apiClient(`/problems/daily-bug/${bugId}/`, { method: 'GET' });
};

/**
 * Execute solution code against visible sample test cases for a bug challenge.
 * @param {string} bugId
 * @param {string} code
 * @param {string} language
 * @returns {Promise<Object>} Execution result log payload.
 */
export const runBugCode = async (bugId, code, language) => {
  return apiClient(`/problems/daily-bug/${bugId}/run/`, {
    method: 'POST',
    body: JSON.stringify({ code, language }),
  });
};

/**
 * Submit solution code for full validation against hidden test cases & line modification budget.
 * @param {string} bugId
 * @param {string} code
 * @param {string} language
 * @returns {Promise<Object>} Submission verdict payload.
 */
export const submitBugCode = async (bugId, code, language) => {
  return apiClient(`/problems/daily-bug/${bugId}/submit/`, {
    method: 'POST',
    body: JSON.stringify({ code, language }),
  });
};
