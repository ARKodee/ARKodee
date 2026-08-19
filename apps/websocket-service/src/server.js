/**
 * @file apps/websocket-service/src/server.js
 * @description HTTP & Application Server Wrapper using Express and Socket.io
 * 
 * Initializes the Express application, sets up middleware/routes,
 * creates the HTTP server, and attaches the Socket.io manager.
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { socketManager } from './socket/index.js';
import { logger } from './utils/logger.js';

/**
 * Creates and starts the Express and Socket.io servers.
 * @param {number} port - The port number to listen to
 * @returns {http.Server} The running HTTP server instance
 */
export function startServer(port) {
  const app = express();

  // Apply standard middleware hooks
  app.use(cors({ origin: "http://localhost:5173", credentials: true }));
  app.use(express.json());

  // Structured HTTP utility routes
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'websocket-service' });
  });

  // Initialize the system server instance securely
  const server = http.createServer(app);

  // Inject our external socket manager setup
  socketManager.init(server);

  server.listen(port, () => {
    logger.info(`Server is running and listening on port ${port}`);
  });

  return server;
}
