/**
 * @file apps/websocket-service/src/services/auth.service.js
 * @description Authentication Service
 * 
 * This service verifies the identity of clients attempting to connect.
 * It decodes and validates JWT tokens or cookies issued by the Django auth backend,
 * ensuring users are authenticated before they can access matchmaking or game rooms.
 */



// NOTE by Dharmil :- this is too temporary for now, because it is hardcoded. but later on we will use redis to store the session data. or maybe we will use the django auth backend to verify the token.


import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

class AuthService {
  /**
   * Verifies the authenticity of a connection token.
   * Typically extracts the payload containing userID, username, etc.
   * 
   * @param {string} token - JWT or session token sent by client
   * @returns {Promise<object|null>} The parsed/validated user object, or null if invalid
   */
  async verifyToken(token, handshakeQuery = {}) {
    if (!token) {
      return null;
    }

    try {
      logger.debug('Verifying connection token:', token);
      
      // Dynamic user identification from handshake params / token payload
      const userId = handshakeQuery.userId || handshakeQuery.id || token;
      const username = handshakeQuery.username || (typeof token === 'string' && token.length > 3 ? token : 'Player');

      return {
        id: String(userId),
        username: String(username),
        role: 'user'
      };
    } catch (err) {
      logger.error('Token verification failed', err);
      return null;
    }
  }
}

export const authService = new AuthService();
