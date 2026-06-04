const BASE_URL = 'http://localhost:5000';

export const apiClient = async (endpoint, options = {}) => {
  // 1. Merge default configurations with custom request options
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // You can automatically attach your Auth Token here later! 🔐
      ...options.headers,
    },
  };

  // 2. Make the actual network call
  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  // 3. Centralized error handling
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Something went wrong with the network request');
  }

  return response.json();
};