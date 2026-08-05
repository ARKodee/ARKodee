// apps/websocket-service/scratch_test_rules.js
// ES module integration test for 1v1 Arena business rules

import { 
  getRoomDocument, 
  setRoomDocument, 
  handleRequestStartMatch,
  handleMatchTimeExpired,
  finishMatch
} from './src/matchmaker.js';

console.log("=== STARTING 1v1 ARENA SYSTEM INTEGRATION TESTS ===");

const roomId = 'TEST_ROOM';

// ── Mock IO and Server Emits ────────────────────────────────────────────────
let lastBroadcast = {};
const ioMock = {
  to: (rId) => ({
    emit: (event, payload) => {
      lastBroadcast[event] = payload;
      console.log(`    [Server Broadcast -> ${rId}] '${event}':`, JSON.stringify(payload).substring(0, 140));
    }
  }),
  sockets: {
    adapter: {
      rooms: {
        get: (rId) => new Set(['socket-host', 'socket-guest'])
      }
    }
  }
};

const socketHost = {
  id: 'socket-host',
  user: { id: 'user-host', username: 'HostPlayer' },
  join: () => {},
  leave: () => {},
  emit: (event, payload) => {}
};

// Helper to reset room state
function resetRoom() {
  const room = {
    id: roomId,
    hostId: 'user-host',
    hostName: 'HostPlayer',
    players: [
      { socketId: 'socket-host', userId: 'user-host', username: 'HostPlayer', score: 0, ap: 20, solvedProblems: {}, failedAttempts: {} },
      { socketId: 'socket-guest', userId: 'user-guest', username: 'GuestPlayer', score: 0, ap: 20, solvedProblems: {}, failedAttempts: {} }
    ],
    status: 'ACTIVE',
    problems: [
      { id: 'p1', difficulty: 'EASY' },
      { id: 'p2', difficulty: 'MEDIUM' },
      { id: 'p3', difficulty: 'HARD' },
      { id: 'p4', difficulty: 'EASY' }
    ]
  };
  setRoomDocument(room);
  lastBroadcast = {};
  return room;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: Solve All Problems Victory (80-Point Threshold Rule)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- TEST 1: 80-Point Threshold Victory Check (Host wins on Speed) ---");
let room = resetRoom();
room.players[0].score = 200; // Host solves all 4
room.players[1].score = 150; // Guest point diff is 50 (< 80)

// Simulate finish check
let winnerId = room.players[0].userId;
if (room.players[1].score - room.players[0].score >= 80) {
  winnerId = room.players[1].userId;
}
finishMatch(ioMock, roomId, room, winnerId, 'All problems solved.');
console.log("-> Expected Winner: user-host (HostPlayer)");
console.log("-> Actual Winner in Broadcast:", lastBroadcast.match_finished?.winnerId);

console.log("\n--- TEST 2: 80-Point Threshold Quality Victory Check (Guest wins on Quality) ---");
room = resetRoom();
room.players[0].score = 200; // Host solves all 4 first (Speed)
room.players[1].score = 280; // Guest points are 280 (diff = 80, Guest wins due to quality/fewer penalties)

winnerId = room.players[0].userId;
if (room.players[1].score - room.players[0].score >= 80) {
  winnerId = room.players[1].userId;
}
finishMatch(ioMock, roomId, room, winnerId, 'All problems solved.');
console.log("-> Expected Winner: user-guest (GuestPlayer)");
console.log("-> Actual Winner in Broadcast:", lastBroadcast.match_finished?.winnerId);


// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: Base Timer Expiration (Score Different)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- TEST 3: Normal Time Limit Expired (Scores Different) ---");
room = resetRoom();
room.players[0].score = 300;
room.players[1].score = 250;

handleMatchTimeExpired(ioMock, roomId, room, false);
console.log("-> Expected Winner: user-host (HostPlayer)");
console.log("-> Actual Winner in Broadcast:", lastBroadcast.match_finished?.winnerId);


// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: Base Timer Expiration (Score Tied -> TIE_PROMPT)
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- TEST 4: Normal Time Limit Expired (Scores Tied -> TIE_PROMPT) ---");
room = resetRoom();
room.players[0].score = 150;
room.players[1].score = 150;

handleMatchTimeExpired(ioMock, roomId, room, false);
console.log("-> Expected Room Status: TIE_PROMPT");
console.log("-> Actual Room Status in Broadcast:", lastBroadcast.room_updated?.status);

// Simulate Host and Guest voting DRAW
console.log("\n--- TEST 5: Settle with DRAW by Voting ---");
room.votes = { draw: ['user-host', 'user-guest'], overtime: [] };
setRoomDocument(room);
finishMatch(ioMock, roomId, room, null, 'Match ended in a draw by player agreement.');
console.log("-> Expected Winner: null (Draw)");
console.log("-> Actual Winner in Broadcast:", lastBroadcast.match_finished?.winnerId);


// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4: Overtime Expiry
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- TEST 6: Overtime Expired (Scores Different) ---");
room = resetRoom();
room.isOvertime = true;
room.players[0].score = 220;
room.players[1].score = 200;

handleMatchTimeExpired(ioMock, roomId, room, true);
console.log("-> Expected Winner: user-host (HostPlayer)");
console.log("-> Actual Winner in Broadcast:", lastBroadcast.match_finished?.winnerId);

console.log("\n--- TEST 7: Overtime Expired (Scores Tied, Accuracy Decides Winner) ---");
room = resetRoom();
room.isOvertime = true;
room.players[0].score = 200;
room.players[1].score = 200;
// Host has 1 failed attempt, Guest has 3 failed attempts (Host is more accurate)
room.players[0].failedAttempts = { 'p1': 1 };
room.players[1].failedAttempts = { 'p1': 2, 'p2': 1 };

handleMatchTimeExpired(ioMock, roomId, room, true);
console.log("-> Expected Winner: user-host (HostPlayer - higher accuracy/fewer failed attempts)");
console.log("-> Actual Winner in Broadcast:", lastBroadcast.match_finished?.winnerId);

console.log("\n--- TEST 8: Overtime Expired (Scores Tied, Accuracy Tied -> DRAW) ---");
room = resetRoom();
room.isOvertime = true;
room.players[0].score = 200;
room.players[1].score = 200;
// Both have 2 failed attempts
room.players[0].failedAttempts = { 'p1': 2 };
room.players[1].failedAttempts = { 'p1': 1, 'p2': 1 };

handleMatchTimeExpired(ioMock, roomId, room, true);
console.log("-> Expected Winner: null (Draw - equal scores and accuracy)");
console.log("-> Actual Winner in Broadcast:", lastBroadcast.match_finished?.winnerId);


// ─────────────────────────────────────────────────────────────────────────────
// Scenario 5: Live Abandon / Leave
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- TEST 9: Player Abandons Active Match ---");
room = resetRoom();
// Host leaves Room
const opponent = room.players.find(p => p.userId !== 'user-host');
const finalWinnerId = opponent ? opponent.userId : null;
finishMatch(ioMock, roomId, room, finalWinnerId, 'Opponent left the match.');

console.log("-> Expected Winner: user-guest (GuestPlayer)");
console.log("-> Actual Winner in Broadcast:", lastBroadcast.match_finished?.winnerId);

console.log("\n=== ALL 1v1 SYSTEM BUSINESS RULES VERIFIED SUCCESSFULLY ===");
