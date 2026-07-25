/**
 * @file apps/websocket-service/src/utils/logger.js
 * @description Logger Utility
 * 
 * Provides consistent console logging formats across the application.
 * In production, this can be integrated with libraries like Winston or Pino,
 * but currently uses styled console outputs for simple logging.
 */

export const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] [${new Date().toISOString()}]: ${message}`, ...args);
  },
  error: (message, error, ...args) => {
    console.error(`[ERROR] [${new Date().toISOString()}]: ${message}`, error, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] [${new Date().toISOString()}]: ${message}`, ...args);
  },
  debug: (message, ...args) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] [${new Date().toISOString()}]: ${message}`, ...args);
    }
  }
};
