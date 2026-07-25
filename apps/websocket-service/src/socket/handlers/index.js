/**
 * @file apps/websocket-service/src/socket/handlers/index.js
 * @description WebSocket Event Handlers Entrypoint
 * 
 * This file registers and dispatches incoming WebSocket events to their respective logic.
 * You can implement event-specific functions here (e.g., matchmaking, gameplay, chats)
 * or import them from sub-modules when the logic grows.
 */

import { INCOMING_EVENTS } from '../events';
import { logger } from '../../utils/logger';

/**
 * Handle incoming socket messages and dispatch them to corresponding handlers.
 * 
 * @param {WebSocket} ws - The client's WebSocket instance
 * @param {object} user - The authenticated user object associated with the socket
 * @param {object} payload - The message payload sent by the client
 */
export function handleSocketMessage(ws, user, payload) {
  const { event, data } = payload;

  logger.debug(`Received event "${event}" from user ${user.username}`);

  switch (event) {
    case INCOMING_EVENTS.JOIN_QUEUE:
      handleJoinQueue(ws, user, data);
      break;

    case INCOMING_EVENTS.LEAVE_QUEUE:
      handleLeaveQueue(ws, user, data);
      break;

    case INCOMING_EVENTS.USE_SABOTAGE:
      handleUseSabotage(ws, user, data);
      break;

    default:
      logger.warn(`Unhandled socket event type: ${event}`);
      break;
  }
}

// --- Handler Placeholders ---

function handleJoinQueue(ws, user, data) {
  logger.info(`User ${user.username} requested to join matchmaking queue.`);
  // TODO: Add matchmaking queue logic or publish to Redis for Django to handle
}

function handleLeaveQueue(ws, user, data) {
  logger.info(`User ${user.username} requested to leave matchmaking queue.`);
  // TODO: Add leave queue logic
}

function handleUseSabotage(ws, user, data) {
  logger.info(`User ${user.username} used sabotage: ${data?.sabotageType}`);
  // TODO: Implement sabotage trigger logic
}
