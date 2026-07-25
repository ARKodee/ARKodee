/**
 * @file apps/websocket-service/src/index.js
 * @description Application Entry Point
 * 
 * Boots up the websocket microservice. It establishes connections to 
 * external dependencies (such as Redis) and starts the HTTP/WebSocket server.
 */

import { config } from './config/index.js';
import { startServer } from './server.js';
// import { redisService } from './services/redis.service.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    logger.info('Starting WebSocket Service...');

    // 1. Connect to Redis Pub/Sub
    // await redisService.connect();

    // 2. Start HTTP & Socket Servers
    startServer(config.port);

    logger.info(`WebSocket Service bootstrapped successfully in [${config.env}] mode`);
  } catch (err) {
    logger.error('Failed to start WebSocket Service. Exiting...', err);
    process.exit(1);
  }
}


// NOTE by Dharmil :- Dont know what this is actually :
// Global unhandled error boundaries
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception occurred', err);
});

bootstrap();
