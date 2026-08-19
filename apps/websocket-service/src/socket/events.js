/**
 * @file apps/websocket-service/src/socket/events.js
 * @description Socket Event Type Constants
 * 
 * Declares all inbound and outbound WebSocket event type names.
 * Centralizing these constants prevents string typos and ensures
 * consistency between the frontend client and the backend websocket handlers.
 */

export const INCOMING_EVENTS = {
  JOIN_QUEUE: 'join-queue',
  LEAVE_QUEUE: 'leave-queue',
  SEND_CHAT: 'send-chat',
  USE_SABOTAGE: 'use-sabotage',
  SUBMIT_CODE: 'submit-code',
};

export const OUTGOING_EVENTS = {
  MATCH_FOUND: 'match-found',
  MATCH_UPDATE: 'match-update',
  OPPONENT_SABOTAGED: 'opponent-sabotaged',
  BROADCAST_CHAT: 'broadcast-chat',
  CONTEST_SCOREBOARD_UPDATE: 'contest-scoreboard-update',
  ERROR: 'socket-error',
};
