/**
 * @file apps/websocket-service/src/socket/index.js
 * @description WebSocket Connection Manager using Socket.io
 * 
 * Manages Socket.io server connection state, client authentication, and event handling.
 */

import { Server } from 'socket.io';
import { authService } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';
import {
  registerSocketToRoom,
  setRoomDocument,
  getRoomDocument,
  DEFAULT_ARENA_PROBLEMS,
  setupMatchmakerListeners,
  handleRequestStartMatch,
} from '../matchmaker.js';

// Authoritative state tracking map instance directly inside memory module scope
const customRooms = new Map();

/**
 * Generates a unique 5-character uppercase room code.
 * Ensures no collisions within the active customRooms map.
 * @returns {string} The unique room code
 */
function generateRoomCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  let collision = true;
  while (collision) {
    result = '';
    for (let i = 0; i < 5; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    collision = customRooms.has(result);
  }
  return result;
}

class SocketManager {
  constructor() {
    this.io = null;
  }

  /**
   * Initializes the Socket.io Server attached to the httpServer container.
   * @param {HttpServer} httpServer - The HTTP server instance
   */
  init(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // Handle authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.query.token || socket.handshake.auth?.token;
        const queryUserId = socket.handshake.query.userId || socket.handshake.auth?.userId;
        const queryUsername = socket.handshake.query.username || socket.handshake.auth?.username;

        if (!token) {
          logger.warn('Socket connection rejected: Missing token');
          return next(new Error('Authentication error: Missing token'));
        }

        const user = await authService.verifyToken(token, {
          userId: queryUserId,
          username: queryUsername,
        });

        if (!user) {
          logger.warn('Socket connection rejected: Invalid token');
          return next(new Error('Authentication error: Invalid token'));
        }

        socket.user = user;
        next();
      } catch (err) {
        logger.error('Error during socket handshake authentication:', err);
        next(new Error('Internal authentication error'));
      }
    });

    // Bind standard logging listeners to catch player client connect and disconnect events
    this.io.on('connection', (socket) => {
      const user = socket.user;
      logger.info(`Player client connected: ${user.username} (Socket ID: ${socket.id}, User ID: ${user.id})`);

      // Automatically join a room specific to the user ID to facilitate targeted messages
      socket.join(`user_${user.id}`);

      // Attach matchmaker socket listeners (request_start_match, join_room, leave_room, disconnect cleanup)
      setupMatchmakerListeners(this.io, socket);

      // 1. socket.on('create_custom_room', (payload) => { ... })
      socket.on('create_custom_room', (payload = {}) => {
        const hostUserId = payload.userId || socket.user?.id || 'placeholder-user-id';
        const hostUsername = payload.username || socket.user?.username || 'Host';

        logger.info(`Player ${hostUsername} (ID: ${hostUserId}) requested to create custom room`);
        const roomCode = generateRoomCode();

        const roomEntry = {
          id: roomCode,
          hostId: hostUserId,
          hostName: hostUsername,
          players: [
            {
              socketId: socket.id,
              userId: hostUserId,
              username: hostUsername
            }
          ]
        };

        customRooms.set(roomCode, roomEntry);
        setRoomDocument(roomEntry);
        socket.join(roomCode);
        registerSocketToRoom(roomCode, socket.id);
        socket.emit('room_updated', roomEntry);
        logger.info(`Custom private room created successfully with code: ${roomCode}`);
      });

      // 2. socket.on('join_custom_room', (payload) => { ... })
      socket.on('join_custom_room', (payload = {}) => {
        const roomCode = payload.roomCode ? payload.roomCode.toUpperCase() : '';
        const guestUserId = payload.userId || socket.user?.id || `guest-${socket.id}`;
        const guestUsername = payload.username || socket.user?.username || 'Guest';

        logger.info(`Player ${guestUsername} (ID: ${guestUserId}) attempting to join room: ${roomCode}`);

        const room = customRooms.get(roomCode);
        if (!room) {
          logger.warn(`Join failed: room code ${roomCode} not found`);
          socket.emit('room_error', "Lobby code not found");
          return;
        }

        if (room.players.length >= 2) {
          logger.warn(`Join failed: room ${roomCode} is full`);
          socket.emit('room_error', "Lobby is full");
          return;
        }

        const newPlayer = {
          socketId: socket.id,
          userId: guestUserId,
          username: guestUsername
        };

        room.players.push(newPlayer);
        setRoomDocument(room);
        socket.join(roomCode);
        registerSocketToRoom(roomCode, socket.id);
        this.io.to(roomCode).emit('room_updated', room);
        logger.info(`Player ${guestUsername} successfully joined room ${roomCode}`);
      });

      // 2b. socket.on('client_ready', (payload) => { ... })
      socket.on('client_ready', (payload = {}) => {
        const roomId = payload.matchId || payload.roomId || payload.roomCode;
        if (!roomId) return;

        socket.join(roomId);
        registerSocketToRoom(roomId, socket.id);

        let room = customRooms.get(roomId) || getRoomDocument(roomId);

        if (room) {
          logger.info(`[Socket] client_ready for room ${roomId} from ${socket.user?.username}. Emitting match_ready`);
          
          const pIdx = room.players.findIndex(
            (p) => String(p.userId) === String(socket.user?.id)
          );
          if (pIdx !== -1) {
            room.players[pIdx].socketId = socket.id;
          }

          socket.emit('match_ready', {
            success: true,
            roomId: roomId,
            roomCode: roomId,
            hostId: room.hostId,
            hostName: room.hostName,
            players: room.players,
            status: room.status,
            isStarted: Boolean(room.isStarted),
            problems: DEFAULT_ARENA_PROBLEMS,
          });

          this.io.to(roomId).emit('room_updated', room);
        } else {
          logger.info(`[Socket] client_ready for new room ${roomId}. Registering ${socket.user?.username} as host.`);
          const newRoom = {
            id: roomId,
            hostId: socket.user?.id || 'user-1',
            hostName: socket.user?.username || 'Host',
            players: [
              {
                socketId: socket.id,
                userId: socket.user?.id || 'user-1',
                username: socket.user?.username || 'Host',
              }
            ],
            status: 'WAITING',
          };
          customRooms.set(roomId, newRoom);
          setRoomDocument(newRoom);
          socket.emit('match_ready', {
            success: true,
            roomId: roomId,
            roomCode: roomId,
            hostId: newRoom.hostId,
            hostName: newRoom.hostName,
            players: newRoom.players,
            status: newRoom.status,
            problems: DEFAULT_ARENA_PROBLEMS,
          });
        }
      });

      // 3. socket.on('request_start_match' or 'start_custom_match', (payload) => { ... })
      socket.on('start_custom_match', (payload) => {
        const roomCode = payload?.roomId || payload?.roomCode;
        if (roomCode && customRooms.has(roomCode)) {
          const cRoom = customRooms.get(roomCode);
          cRoom.status = 'ACTIVE';
          cRoom.isStarted = true;
        }
        handleRequestStartMatch(this.io, socket, payload);
      });

      // 4. socket.on('leave_custom_room', (payload) => { ... })
      socket.on('leave_custom_room', (payload = {}) => {
        const { roomCode, userId } = payload;
        const room = customRooms.get(roomCode);
        if (!room) {
          logger.warn(`Leave request failed: room ${roomCode} not found`);
          return;
        }

        if (room.isStarted || room.status === 'ACTIVE') {
          logger.info(`Match active in room ${roomCode}. Preserving room for player ${userId}.`);
          return;
        }

        const hostPlayer = room.players[0];
        const guestPlayer = room.players[1];
        const isHostLeaving =
          (socket.id && hostPlayer && socket.id === hostPlayer.socketId) ||
          (userId && room.hostId && String(userId) === String(room.hostId) && (!guestPlayer || socket.id !== guestPlayer.socketId));

        if (isHostLeaving) {
          // Disconnect Rule 2 (Host leaves): broadcast room_dissolved, clear rooms, remove sockets
          logger.info(`Host ${user.username} left room ${roomCode}. Dissolving lobby.`);
          this.io.to(roomCode).emit('room_dissolved');

          const socketsInRoom = this.io.sockets.adapter.rooms.get(roomCode);
          if (socketsInRoom) {
            for (const socketId of socketsInRoom) {
              const clientSocket = this.io.sockets.sockets.get(socketId);
              if (clientSocket) {
                clientSocket.leave(roomCode);
              }
            }
          }
          customRooms.delete(roomCode);
        } else {
          // Disconnect Rule 1 (Guest leaves): splice player, notify host of opponent departure
          const playerIndex = room.players.findIndex(
            (p) => String(p.userId) === String(userId) || p.socketId === socket.id
          );
          if (playerIndex > 0) {
            logger.info(`Guest ${user.username} left room ${roomCode}. Returning host to waiting state.`);
            room.players.splice(playerIndex, 1);
            socket.leave(roomCode);
            this.io.to(roomCode).emit('opponent_left_lobby');
            this.io.to(roomCode).emit('room_updated', room);
          }
        }
      });

      // 5. socket.on('leave_arena_lobby', (payload) => { ... })
      socket.on('leave_arena_lobby', (payload = {}) => {
        const roomId = payload.matchId || payload.roomId || payload.roomCode;
        logger.info(`Player ${user.username} left arena lobby: ${roomId}. Dissolving arena for all contenders.`);

        this.io.to(roomId).emit('arena_lobby_dissolved', {
          roomId,
          message: `Player ${user.username} left the arena.`,
        });

        if (roomId && customRooms.has(roomId)) {
          customRooms.delete(roomId);
        }
      });

      // 6. socket.on('submit_code', (payload) => { ... })
      socket.on('submit_code', (payload = {}) => {
        const { matchId, problemId, status, code } = payload;
        const roomId = matchId;
        const room = customRooms.get(roomId);
        if (!room || room.status !== 'ACTIVE') return;

        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) return;

        // Initialize tracking maps if missing
        if (!player.solvedProblems) player.solvedProblems = {};
        if (!player.failedAttempts) player.failedAttempts = {};
        if (player.score === undefined) player.score = 0;

        const problemList = room.problems || DEFAULT_ARENA_PROBLEMS;
        const problemObj = problemList.find(p => p.id === problemId);
        const difficulty = problemObj ? problemObj.difficulty.toUpperCase() : 'EASY';

        if (status === 'ACCEPTED') {
          // If already solved, do not score again
          if (!player.solvedProblems[problemId]) {
            player.solvedProblems[problemId] = true;

            // Score addition based on difficulty
            let baseScore = 100;
            if (difficulty === 'MEDIUM') baseScore = 200;
            if (difficulty === 'HARD') baseScore = 400;
            player.score += baseScore;

            // Speed bonus check
            if (room.startedAt) {
              const elapsedMs = Date.now() - new Date(room.startedAt).getTime();
              let speedLimitMs = 180000; // Easy: 3 mins
              if (difficulty === 'MEDIUM') speedLimitMs = 480000; // Medium: 8 mins
              if (difficulty === 'HARD') speedLimitMs = 900000; // Hard: 15 mins

              if (elapsedMs < speedLimitMs) {
                player.score += 50; // +50 points speed bonus
              }
            }

            // AP bonus
            player.ap = Math.min(100, (player.ap || 0) + 50); // +50 AP for solve
          }
        } else {
          // Wrong Answer / Penalty
          player.failedAttempts[problemId] = (player.failedAttempts[problemId] || 0) + 1;
          player.score = (player.score || 0) - 15; // Deduct 15 points
        }

        setRoomDocument(room);
        this.io.to(roomId).emit('room_updated', room);

        // Check if player has solved all 4 problems
        const totalProblemsToSolve = problemList.length;
        const solvedCount = Object.keys(player.solvedProblems).filter(k => player.solvedProblems[k]).length;
        
        if (solvedCount >= totalProblemsToSolve) {
          // Run the 80-point threshold victory check!
          const opponent = room.players.find(p => p.socketId !== socket.id);
          const oppPoints = opponent ? (opponent.score || 0) : 0;
          const playerPoints = player.score || 0;
          
          let winnerId = player.userId;
          if (opponent && oppPoints - playerPoints >= 80) {
            winnerId = opponent.userId; // Opponent wins because of higher points quality
          }

          room.status = 'FINISHED';
          room.winnerId = winnerId;
          setRoomDocument(room);

          // Post to Python Django backend duels endpoint to persist result and calculate ELO
          const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:8000';
          const postData = {
            player_a_id: room.players[0].userId,
            player_b_id: room.players[1] ? room.players[1].userId : room.players[0].userId,
            winner_id: winnerId,
            score_a: room.players[0].score || 0,
            score_b: room.players[1] ? room.players[1].score : 0
          };

          fetch(`${backendUrl}/api/auth/duels/create/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
          })
          .then(res => res.json())
          .then(data => {
            logger.info(`[Duel Persistence] Saved match: ${data.match_id}, ELO delta A: ${data.elo_delta_a}, B: ${data.elo_delta_b}`);
            
            // Broadcast final results including real ELO changes from Python DB!
            this.io.to(roomId).emit('match_finished', {
              winnerId,
              scores: room.players.map(p => ({
                userId: p.userId,
                username: p.username,
                score: p.score,
                eloDelta: p.userId === room.players[0].userId ? data.elo_delta_a : data.elo_delta_b
              })),
              reason: 'All problems solved by a contender.'
            });
          })
          .catch(err => {
            logger.error(`[Duel Persistence] Failed to save duel outcome:`, err);
            // Fallback to broadcasting without ELO changes if API fails
            this.io.to(roomId).emit('match_finished', {
              winnerId,
              scores: room.players.map(p => ({ userId: p.userId, username: p.username, score: p.score })),
              reason: 'All problems solved by a contender.'
            });
          });
        }
      });

      // 7. socket.on('use_sabotage', (payload) => { ... })
      socket.on('use_sabotage', (payload = {}) => {
        const { matchId, sabotageType } = payload;
        const room = customRooms.get(matchId);
        if (!room || room.status !== 'ACTIVE') return;

        const player = room.players.find(p => p.socketId === socket.id);
        const opponent = room.players.find(p => p.socketId !== socket.id);
        if (!player || !opponent) return;

        // Map types and costs
        const costs = {
          'monaco-jam': 50,
          'blur': 40,
          'blindfold': 60
        };
        const cost = costs[sabotageType] || 40;

        if ((player.ap || 0) < cost) {
          socket.emit('room_error', 'Not enough AP to use sabotage');
          return;
        }

        // Deduct AP
        player.ap -= cost;

        // Check if opponent has active immunity shield
        if (opponent.shieldActiveUntil && opponent.shieldActiveUntil > Date.now()) {
          logger.info(`[Sabotage] Sabotage ${sabotageType} cast by ${player.username} blocked by ${opponent.username}'s shield.`);
          socket.emit('sabotage_blocked', { message: 'Opponent blocked your attack with a shield!' });
          setRoomDocument(room);
          this.io.to(matchId).emit('room_updated', room);
          return;
        }

        // Apply sabotage
        let durationMs = 5000;
        if (sabotageType === 'blur') durationMs = 10000;
        if (sabotageType === 'blindfold') durationMs = 60000;

        this.io.to(opponent.socketId).emit('opponent_sabotaged', {
          type: sabotageType,
          durationMs,
          castBy: player.username
        });

        logger.info(`[Sabotage] Player ${player.username} cast ${sabotageType} on ${opponent.username} for ${durationMs}ms`);

        setRoomDocument(room);
        this.io.to(matchId).emit('room_updated', room);
      });

      // 8. socket.on('use_shield', (payload) => { ... })
      socket.on('use_shield', (payload = {}) => {
        const { matchId, shieldType } = payload;
        const room = customRooms.get(matchId);
        if (!room || room.status !== 'ACTIVE') return;

        const player = room.players.find(p => p.socketId === socket.id);
        if (!player) return;

        if (shieldType === 'immunity') {
          const cost = 40;
          if ((player.ap || 0) < cost) {
            socket.emit('room_error', 'Not enough AP to buy shield');
            return;
          }
          player.ap -= cost;
          player.shieldActiveUntil = Date.now() + 15000; // 15 seconds immunity
          logger.info(`[Shield] Player ${player.username} activated immunity shield for 15s`);
        } else if (shieldType === 'cleanse') {
          const cost = 20;
          if ((player.ap || 0) < cost) {
            socket.emit('room_error', 'Not enough AP to buy cleanse');
            return;
          }
          player.ap -= cost;
          // Notify target client to reduce sabotage duration
          socket.emit('reduce_sabotage');
          logger.info(`[Shield] Player ${player.username} used cleanse`);
        }

        setRoomDocument(room);
        this.io.to(matchId).emit('room_updated', room);
      });

      // 4. socket.on('disconnect', () => { ... })
      socket.on('disconnect', (reason) => {
        logger.info(`Player client disconnected: ${user.username} (Socket ID: ${socket.id}, Reason: ${reason})`);

        // Loop through the entire authoritative state map memory layout list container space
        for (const [roomCode, room] of customRooms.entries()) {
          const playerIndex = room.players.findIndex((p) => p.socketId === socket.id);
          if (playerIndex !== -1) {
            const player = room.players[playerIndex];

            if (room.isStarted || room.status === 'ACTIVE') {
              logger.info(`Match active in room ${roomCode}. Disconnect transition preserved for player ${player.username}.`);
              continue;
            }

            const hostPlayer = room.players[0];
            const guestPlayer = room.players[1];
            const isHost =
              socket.id === hostPlayer?.socketId ||
              (player.userId === room.hostId && (!guestPlayer || socket.id !== guestPlayer.socketId));

            if (isHost) {
              // Disconnect Rule 2 (Host leaves): broadcast room_dissolved, clear rooms, remove sockets
              logger.info(`Host disconnected from room ${roomCode}. Dissolving lobby.`);
              this.io.to(roomCode).emit('room_dissolved');

              const socketsInRoom = this.io.sockets.adapter.rooms.get(roomCode);
              if (socketsInRoom) {
                for (const socketId of socketsInRoom) {
                  const clientSocket = this.io.sockets.sockets.get(socketId);
                  if (clientSocket) {
                    clientSocket.leave(roomCode);
                  }
                }
              }
              customRooms.delete(roomCode);
            } else {
              // Disconnect Rule 1 (Guest leaves): splice player, notify host of opponent departure
              logger.info(`Challenger disconnected from room ${roomCode}. Removing challenger.`);
              room.players.splice(playerIndex, 1);
              socket.leave(roomCode);
              this.io.to(roomCode).emit('opponent_left_lobby');
              this.io.to(roomCode).emit('room_updated', room);
            }
          }
        }
      });
    });

    logger.info('Socket.io Server initialized and attached to httpServer');
  }

  /**
   * Sends an event message to a specific user.
   * @param {string} userId - Target user ID
   * @param {string} event - Event name/type
   * @param {object} data - Payload data
   */
  sendToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(event, data);
    } else {
      logger.error(`Cannot send event ${event} to user ${userId}: Socket.io not initialized`);
    }
  }

  /**
   * Broadcasts an event to all connected clients.
   * @param {string} event - Event name/type
   * @param {object} data - Payload data
   */
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    } else {
      logger.error(`Cannot broadcast event ${event}: Socket.io not initialized`);
    }
  }
}

// Create a singleton instance managing the global Socket.io 'Server'
export const socketManager = new SocketManager();
