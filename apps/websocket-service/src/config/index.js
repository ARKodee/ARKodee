/**
 * @file apps/websocket-service/src/config/index.js
 * @description Configuration Loader
 * 
 * This file loads and exports environment variables needed by the WebSocket service,
 * such as server ports, Redis connection URLs, and security keys.
 * It uses 'dotenv' to load variables from a .env file in development.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// This is global const which is used in other file of the folder
export const config = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwtSecret: process.env.JWT_SECRET || 'your-django-jwt-secret-key',
};
