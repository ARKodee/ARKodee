// apps/web/src/lib/auth.js
import { apiClient } from './apiClient';

// Step 1: Check if email is in the DB
export const checkEmailExists = async (email) => {
  return apiClient('/api/auth/check-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

// Step 2 (Existing User): Login
export const loginUser = async (email, password) => {
  return apiClient('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

// Step 2 (New User): Register
export const registerUser = async (userData) => {
  return apiClient('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};