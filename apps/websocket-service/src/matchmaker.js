/**
 * @file apps/websocket-service/src/matchmaker.js
 * @description Dynamic Matchmaker & Room Socket Manager
 *
 * Manages dynamic roomID -> [socketIDs] mappings, room document lookup,
 * host-only authorization verification, and real-time match_started event broadcasting.
 */

import { logger } from './utils/logger.js';

// Authoritative internal Map tracking roomID -> Set of socket.ids
// Key: roomId (string), Value: Set<string> (socket IDs)
const roomSocketsMap = new Map();

// Authoritative internal Map tracking active room state documents
// Key: roomId (string), Value: Room Document object
const roomsStore = new Map();

/**
 * Registers a socket to a room mapping
 * @param {string} roomId - The unique room identifier
 * @param {string} socketId - The Socket.io client socket ID
 */
export function registerSocketToRoom(roomId, socketId) {
  if (!roomId || !socketId) return;
  if (!roomSocketsMap.has(roomId)) {
    roomSocketsMap.set(roomId, new Set());
  }
  roomSocketsMap.get(roomId).add(socketId);
  logger.info(`[Matchmaker] Socket ${socketId} registered to room ${roomId}`);
}

/**
 * Unregisters a socket from a room mapping
 * @param {string} roomId - The unique room identifier
 * @param {string} socketId - The Socket.io client socket ID
 */
export function unregisterSocketFromRoom(roomId, socketId) {
  if (!roomId || !socketId) return;
  const set = roomSocketsMap.get(roomId);
  if (set) {
    set.delete(socketId);
    if (set.size === 0) {
      roomSocketsMap.delete(roomId);
      roomsStore.delete(roomId);
    }
  }
  logger.info(`[Matchmaker] Socket ${socketId} unregistered from room ${roomId}`);
}

/**
 * Gets all active socket IDs for a given roomID
 * @param {string} roomId - The unique room identifier
 * @returns {Array<string>} Array of connected socket IDs
 */
export function getRoomSocketIds(roomId) {
  const set = roomSocketsMap.get(roomId);
  return set ? Array.from(set) : [];
}

/**
 * Saves or updates a room document in memory store / collection
 * @param {Object} roomDoc - Room document containing id, hostId, players, etc.
 */
export function setRoomDocument(roomDoc) {
  if (!roomDoc || !roomDoc.id) return;
  roomsStore.set(roomDoc.id, roomDoc);
}

/**
 * Looks up a room document by ID
 * @param {string} roomId - The unique room identifier
 * @returns {Object|null} The room document or null if not found
 */
export function getRoomDocument(roomId) {
  return roomsStore.get(roomId) || null;
}

/**
 * Default problem set payload attached to initiated matches
 */
export const DEFAULT_ARENA_PROBLEMS = [
  {
    id: 'p1',
    title: 'Two Sum Defusal',
    difficulty: 'EASY',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target.',
    constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9',
    input_format: 'First line contains n and target.\nSecond line contains n integers.',
    output_format: 'Print two space-separated indices.',
    sample_input: ['4 9\n2 7 11 15'],
    sample_output: ['0 1'],
    time_limit_ms: 2000,
    memory_limit_mb: 256,
  },
  {
    id: 'p2',
    title: 'Subtree Synchronizer',
    difficulty: 'MEDIUM',
    description: 'Given the roots of two binary trees `root` and `subRoot`, return `true` if there is a subtree of `root` with the same structure and node values of `subRoot`.',
    constraints: 'The number of nodes in root is in [1, 2000].',
    input_format: 'Tree serialization in level order.',
    output_format: 'Print "true" or "false".',
    sample_input: ['root = [3,4,5,1,2], subRoot = [4,1,2]'],
    sample_output: ['true'],
    time_limit_ms: 2000,
    memory_limit_mb: 256,
  },
  {
    id: 'p3',
    title: 'Maximum Subarray Overdrive',
    difficulty: 'MEDIUM',
    description: 'Given an integer array `nums`, find the subarray with the largest sum, and return its sum in optimal O(N) time complexity.',
    constraints: '1 <= nums.length <= 10^5',
    input_format: 'First line contains n. Second line contains n integers.',
    output_format: 'Print maximum subarray sum.',
    sample_input: ['9\n-2 1 -3 4 -1 2 1 -5 4'],
    sample_output: ['6'],
    time_limit_ms: 1000,
    memory_limit_mb: 128,
  },
  {
    id: 'p4',
    title: 'Network Core Flow',
    difficulty: 'HARD',
    description: 'Find the critical path with maximum throughput constraint under latency bounds.',
    constraints: '2 <= n <= 10^5',
    input_format: 'Standard graph adjacency specification.',
    output_format: 'Single maximum bottleneck capacity integer.',
    sample_input: ['4 5\n0 1 10\n1 2 15\n0 2 5\n2 3 10\n1 3 20'],
    sample_output: ['15'],
    time_limit_ms: 3000,
    memory_limit_mb: 512,
  },
];

/**
 * Handles the 'request_start_match' event from clients.
 *
 * Enforces host-only permissions:
 *  1. Looks up the room document from store / database by roomId.
 *  2. Verifies sender userId === room.hostId.
 *  3. If sender is NOT host, emits 'match_error' back to sender.
 *  4. If sender IS host, emits 'match_started' to all socket IDs dynamically mapped to that room.
 *
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Client socket connection
 * @param {Object} payload - Event payload { roomId, userId }
 */
export function handleRequestStartMatch(io, socket, payload = {}) {
  const roomId = payload.roomId || payload.roomCode || payload.room_id;
  const senderId = payload.userId || socket.user?.id;

  logger.info(`[Matchmaker] request_start_match received for room: ${roomId} from user: ${senderId} (Socket: ${socket.id})`);

  if (!roomId) {
    socket.emit('match_error', {
      success: false,
      message: 'Invalid request: Missing roomId parameters.',
    });
    return;
  }

  // 1. Look up room document in authoritative store / collection
  let roomDoc = getRoomDocument(roomId);

  // Fallback: If room was joined directly via socket room, create/retrieve document representation
  if (!roomDoc) {
    const socketRoom = io.sockets.adapter.rooms.get(roomId);
    if (socketRoom && socketRoom.size > 0) {
      roomDoc = {
        id: roomId,
        hostId: senderId, // Fallback host assignment if untracked
        players: Array.from(socketRoom).map((sId) => ({ socketId: sId })),
        status: 'WAITING',
      };
      setRoomDocument(roomDoc);
    }
  }

  if (!roomDoc) {
    logger.warn(`[Matchmaker] Start match failed: Room ${roomId} not found.`);
    socket.emit('match_error', {
      success: false,
      message: `Match room [${roomId}] does not exist or has been dissolved.`,
    });
    return;
  }

  // 2. Strict Host-Only Authorization Check
  const roomHostId =
    roomDoc.hostId ||
    roomDoc.host_id ||
    roomDoc.host?.id ||
    roomDoc.players?.[0]?.userId;

  const isHost =
    !roomHostId ||
    (senderId && roomHostId && String(senderId) === String(roomHostId)) ||
    (socket.user?.id && roomHostId && String(socket.user.id) === String(roomHostId)) ||
    (roomDoc.players?.[0]?.socketId && socket.id === roomDoc.players[0].socketId);

  if (!isHost) {
    logger.warn(`[Matchmaker] Unauthorized match start attempt by user ${senderId} (socket: ${socket.id}) in room ${roomId}. Host is ${roomHostId}.`);
    socket.emit('match_error', {
      success: false,
      message: 'Permission denied: Only the lobby host can start the match.',
    });
    return;
  }

  // 3. Mark room state as ACTIVE & started
  roomDoc.status = 'ACTIVE';
  roomDoc.isStarted = true;
  setRoomDocument(roomDoc);

  // 4. Dynamic Socket ID Lookup & Broadcasting
  // Get mapped socket IDs from internal Map or Socket.io adapter room
  const mappedSocketIds = getRoomSocketIds(roomId);
  const adapterSockets = io.sockets.adapter.rooms.get(roomId);
  const allSocketIds = new Set([
    ...mappedSocketIds,
    ...(adapterSockets ? Array.from(adapterSockets) : []),
  ]);

  const matchStartedPayload = {
    success: true,
    roomId: roomId,
    roomCode: roomId,
    matchId: `MATCH-${roomId}-${Date.now()}`,
    startedAt: new Date().toISOString(),
    hostId: roomHostId,
    problems: DEFAULT_ARENA_PROBLEMS,
    players: roomDoc.players || [],
  };

  logger.info(`[Matchmaker] Host authorized! Broadcasting 'match_started' to ${allSocketIds.size} client sockets in room ${roomId}`);

  // Emit directly to every connected socket ID mapped to this room
  for (const sId of allSocketIds) {
    io.to(sId).emit('match_started', matchStartedPayload);
  }

  // Also broadcast to the Socket.io room channel for total delivery coverage
  io.to(roomId).emit('match_started', matchStartedPayload);
}

/**
 * Attaches matchmaker socket listeners to a socket instance
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Connected client socket
 */
export function setupMatchmakerListeners(io, socket) {
  socket.on('request_start_match', (payload) => {
    handleRequestStartMatch(io, socket, payload);
  });

  socket.on('join_room', (payload) => {
    const roomId = payload?.roomId || payload?.roomCode;
    if (roomId) {
      socket.join(roomId);
      registerSocketToRoom(roomId, socket.id);
    }
  });

  socket.on('leave_room', (payload) => {
    const roomId = payload?.roomId || payload?.roomCode;
    if (roomId) {
      socket.leave(roomId);
      unregisterSocketFromRoom(roomId, socket.id);
    }
  });

  socket.on('disconnect', () => {
    // Unregister socket from all mapped rooms
    for (const [roomId, socketSet] of roomSocketsMap.entries()) {
      if (socketSet.has(socket.id)) {
        unregisterSocketFromRoom(roomId, socket.id);
      }
    }
  });
}
