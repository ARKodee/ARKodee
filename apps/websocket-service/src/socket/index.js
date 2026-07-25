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

        const isHostLeaving =
          (userId && room.hostId && String(userId) === String(room.hostId)) ||
          (socket.id && room.players[0]?.socketId && socket.id === room.players[0].socketId);

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

            if (player.userId === room.hostId) {
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
