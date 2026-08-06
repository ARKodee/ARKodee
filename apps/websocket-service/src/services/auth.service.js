/**
 * @file apps/websocket-service/src/services/auth.service.js
 * @description Authentication Service
 * 
 * Verifies user connection tokens against the Django Auth REST backend.
 */

import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

class AuthService {
  /**
   * Verifies the authenticity of a connection token against the Django backend.
   * Typically extracts the payload containing userID, username, etc.
   * 
   * @param {string} token - JWT or session token sent by client
   * @param {object} handshakeQuery - Query parameters from socket handshake
   * @returns {Promise<object|null>} The parsed/validated user object, or null if invalid
   */
  async verifyToken(token, handshakeQuery = {}) {
    if (!token) {
      return null;
    }

    // Mock token handling — DEVELOPMENT ONLY. Never active in production.
    if ((config.env === 'development' || config.env === 'test') &&
        (String(token).startsWith('token_') || String(token).startsWith('mock_'))) {
      const userId = handshakeQuery.userId || handshakeQuery.id || token.replace('token_', '');
      const username = handshakeQuery.username || 'DevPlayer';
      logger.warn(`[AuthService] DEV mock token accepted for user: ${username} (${userId})`);
      return {
        id: String(userId),
        username: String(username),
        role: 'user'
      };
    }

    try {
      const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
      const cleanToken = String(token).startsWith('Token ') ? token : `Token ${token}`;
      
      const response = await fetch(`${backendUrl}/api/auth/profile/`, {
        method: 'GET',
        headers: {
          'Authorization': cleanToken
        }
      });

      if (response.ok) {
        const userData = await response.json();
        logger.info(`[AuthService] Token verified successfully via Django: ${userData.username} (ID: ${userData.id})`);
        return {
          id: String(userData.id),
          username: userData.username,
          role: 'user',
          firstName: userData.firstName,
          duelRating: userData.duelRating
        };
      } else {
        logger.warn(`[AuthService] Token verification failed on Django backend: status ${response.status}`);
        
        // Fallback for robust dev experience if backend is unreachable but handshake query has fallback info
        if (config.env === 'development' || config.env === 'test') {
          logger.warn('[AuthService] Falling back to query params in development/test mode.');
          const userId = handshakeQuery.userId || handshakeQuery.id || 'dev-user';
          const username = handshakeQuery.username || 'DevPlayer';
          return {
            id: String(userId),
            username: String(username),
            role: 'user'
          };
        }
        return null;
      }
    } catch (err) {
      logger.error('[AuthService] Error communicating with Django backend for verification:', err);
      
      // Fallback in development
      if (config.env === 'development' || config.env === 'test') {
        logger.warn('[AuthService] Falling back to query params in development/test mode due to communication error.');
        const userId = handshakeQuery.userId || handshakeQuery.id || 'dev-user';
        const username = handshakeQuery.username || 'DevPlayer';
        return {
          id: String(userId),
          username: String(username),
          role: 'user'
        };
      }
      return null;
    }
  }
}

export const authService = new AuthService();
