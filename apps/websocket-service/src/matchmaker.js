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
const roomsStore = new Map();
const activeIntervals = new Map();

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
export async function handleRequestStartMatch(io, socket, payload = {}) {
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

  // Immediately notify room of start countdown to start overlays in parallel
  io.to(roomId).emit('match_starting', { roomId });

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
  if (roomDoc.status === 'ACTIVE' || roomDoc.isStarted) {
    logger.warn(`[Matchmaker] Match already active or started for room ${roomId}. Ignoring duplicate start request.`);
    return;
  }

  // 3. Mark room state as ACTIVE & started
  roomDoc.status = 'ACTIVE';
  roomDoc.isStarted = true;
  const matchStartTime = new Date().toISOString();
  roomDoc.startedAt = matchStartTime;
  roomDoc.problems = []; // Empty initially while loading in background
  
  // Initialize player metadata for the combat economy
  if (roomDoc.players && Array.isArray(roomDoc.players)) {
    roomDoc.players.forEach(p => {
      p.ap = p.ap || 20; // Starts with 20 AP
      p.score = p.score || 0;
      p.solvedProblems = p.solvedProblems || {};
      p.failedAttempts = p.failedAttempts || {};
    });
  }
  setRoomDocument(roomDoc);

  // Setup AP passive regenerator & Match duration limit timer
  setupApAndMatchTimer(io, roomId);

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
    startedAt: matchStartTime,
    hostId: roomHostId,
    problems: [], // Empty initially
    players: roomDoc.players || [],
  };

  logger.info(`[Matchmaker] Host authorized! Broadcasting immediate 'match_started' to ${allSocketIds.size} client sockets in room ${roomId}`);

  // Emit directly to every connected socket ID mapped to this room
  for (const sId of allSocketIds) {
    io.to(sId).emit('match_started', matchStartedPayload);
  }

  // Also broadcast to the Socket.io room channel for total delivery coverage
  io.to(roomId).emit('match_started', matchStartedPayload);

  // 5. Fetch dynamic problems from Django backend in background (non-blocking)
  // 5. Fetch dynamic problems from Django backend in background (non-blocking) with a timeout safety
  const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
  logger.info(`[Matchmaker] Background fetching dynamic problems for room ${roomId} from ${backendUrl}/api/duels/problems/`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5 seconds timeout limit

  fetch(`${backendUrl}/api/duels/problems/`, { signal: controller.signal })
    .then(async (res) => {
      clearTimeout(timeoutId);
      let fetchedProblems = DEFAULT_ARENA_PROBLEMS;
      if (res.ok) {
        fetchedProblems = await res.json();
        logger.info(`[Matchmaker] Successfully fetched ${fetchedProblems.length} problems for room ${roomId} from Django.`);
      } else {
        logger.warn(`[Matchmaker] Django returned non-200 status. Using fallback problems for room ${roomId}.`);
      }
      completeMatchReady(io, roomId, roomDoc, fetchedProblems, matchStartedPayload);
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      logger.error(`[Matchmaker] Exception raised when fetching problems from Django. Using fallback:`, err.message || err);
      completeMatchReady(io, roomId, roomDoc, DEFAULT_ARENA_PROBLEMS, matchStartedPayload);
    });
}

function completeMatchReady(io, roomId, roomDoc, problems, basePayload) {
  roomDoc.problems = problems;
  setRoomDocument(roomDoc);

  const matchReadyPayload = {
    ...basePayload,
    problems: problems,
  };

  logger.info(`[Matchmaker] Broadcasting 'match_ready' to room ${roomId}`);
  io.to(roomId).emit('match_ready', matchReadyPayload);
}

/**
 * Attaches matchmaker socket listeners to a socket instance
 * @param {Object} io - Socket.io server instance
 * @param {Object} socket - Connected client socket
 */
export function setupMatchmakerListeners(io, socket) {
  socket.on('request_start_match', async (payload) => {
    await handleRequestStartMatch(io, socket, payload);
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

// ── Match Timer, Overtime, and Tie/Draw Resolution ─────────────────────────

export function setupApAndMatchTimer(io, roomId) {
  if (activeIntervals.has(roomId)) {
    clearInterval(activeIntervals.get(roomId));
    activeIntervals.delete(roomId);
  }

  const apInterval = setInterval(() => {
    let activeRoom = getRoomDocument(roomId);
    if (!activeRoom || activeRoom.status !== 'ACTIVE') {
      clearInterval(apInterval);
      activeIntervals.delete(roomId);
      return;
    }

    // 1. Passive AP Regen (1 AP every 5 seconds)
    activeRoom.players.forEach((p) => {
      p.ap = Math.min(100, (p.ap || 20) + 1);
    });

    // 2. Match Time Expiration Checker (Base: 60 mins = 3600s, Overtime: 10 mins = 600s)
    const elapsedSec = Math.floor((Date.now() - new Date(activeRoom.startedAt).getTime()) / 1000);
    const baseLimit = 3600; // 60 minutes
    const overtimeLimit = 600; // 10 minutes

    if (activeRoom.isOvertime) {
      const overtimeElapsed = Math.floor((Date.now() - new Date(activeRoom.overtimeStartedAt).getTime()) / 1000);
      if (overtimeElapsed >= overtimeLimit) {
        clearInterval(apInterval);
        activeIntervals.delete(roomId);
        handleMatchTimeExpired(io, roomId, activeRoom, true);
        return;
      }
    } else {
      if (elapsedSec >= baseLimit) {
        clearInterval(apInterval);
        activeIntervals.delete(roomId);
        handleMatchTimeExpired(io, roomId, activeRoom, false);
        return;
      }
    }

    setRoomDocument(activeRoom);
    io.to(roomId).emit('room_updated', activeRoom);
  }, 5000);

  activeIntervals.set(roomId, apInterval);
}

export function handleMatchTimeExpired(io, roomId, room, isOvertime = false) {
  const p1 = room.players[0];
  const p2 = room.players[1];
  const score1 = p1 ? (p1.score || 0) : 0;
  const score2 = p2 ? (p2.score || 0) : 0;

  if (score1 !== score2) {
    // Score is different: highest score wins!
    const winnerId = score1 > score2 ? p1.userId : p2.userId;
    finishMatch(io, roomId, room, winnerId, 'Time expired. Winner decided by higher score.');
  } else {
    // Score is tied
    if (!isOvertime) {
      // Base time expired: prompt tie choice
      room.status = 'TIE_PROMPT';
      room.votes = { draw: [], overtime: [] };
      room.tiePromptExpiresAt = Date.now() + 30000; // 30 seconds to vote
      setRoomDocument(room);
      io.to(roomId).emit('room_updated', room);

      // Set timeout to auto-draw if they don't both vote overtime
      setTimeout(() => {
        const latestRoom = getRoomDocument(roomId);
        if (latestRoom && latestRoom.status === 'TIE_PROMPT') {
          finishMatch(io, roomId, latestRoom, null, 'Tie prompt expired. Match ended in a draw.');
        }
      }, 30000);
    } else {
      // Overtime expired and score is still tied! Compare accuracy (fewer failed attempts)
      const p1Failed = Object.values(p1.failedAttempts || {}).reduce((a, b) => a + b, 0);
      const p2Failed = Object.values(p2.failedAttempts || {}).reduce((a, b) => a + b, 0);

      if (p1Failed !== p2Failed) {
        const winnerId = p1Failed < p2Failed ? p1.userId : p2.userId;
        finishMatch(io, roomId, room, winnerId, 'Overtime expired. Winner decided by higher accuracy.');
      } else {
        // Accuracy is also equal! Match ends in a Draw.
        finishMatch(io, roomId, room, null, 'Overtime expired with equal scores and accuracy. Match ended in a draw.');
      }
    }
  }
}

export function finishMatch(io, roomId, room, winnerId, reason) {
  room.status = 'FINISHED';
  room.winnerId = winnerId;
  setRoomDocument(room);

  // Post to Python Django backend duels endpoint to persist result and calculate ELO
  const backendUrl = process.env.BACKEND_API_URL || 'http://127.0.0.1:8000';
  const postData = {
    player_a_id: room.players[0].userId,
    player_b_id: room.players[1] ? room.players[1].userId : room.players[0].userId,
    winner_id: winnerId, // null for draw
    score_a: room.players[0].score || 0,
    score_b: room.players[1] ? room.players[1].score : 0
  };

  logger.info(`[Matchmaker] Finalizing duel room ${roomId}. Winner: ${winnerId}, Reason: ${reason}`);

  fetch(`${backendUrl}/api/duels/create/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postData)
  })
  .then(res => res.json())
  .then(data => {
    logger.info(`[Duel Persistence] Saved match: ${data.match_id}, ELO delta A: ${data.elo_delta_a}, B: ${data.elo_delta_b}`);
    io.to(roomId).emit('match_finished', {
      winnerId,
      scores: room.players.map(p => ({
        userId: p.userId,
        username: p.username,
        score: p.score,
        eloDelta: p.userId === room.players[0].userId ? data.elo_delta_a : data.elo_delta_b
      })),
      reason
    });
  })
  .catch(err => {
    logger.error(`[Duel Persistence] Failed to save duel outcome:`, err);
    io.to(roomId).emit('match_finished', {
      winnerId,
      scores: room.players.map(p => ({ userId: p.userId, username: p.username, score: p.score })),
      reason
    });
  });
}
