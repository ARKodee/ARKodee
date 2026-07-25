// apps/web/src/components/MatchmakingLobby.jsx
// Modular 1v1 Matchmaking Lobby component enforcing Host-Only access permissions & real-time WebSocket state transition.

import React, { useState, useEffect } from 'react';
import { Swords, Shield, Users, Play, Lock, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';

/**
 * MatchmakingLobby Component
 *
 * Props:
 *  - room {Object} Current room object { id, hostId, players, status }
 *  - currentUser {Object} Authenticated user profile { id, username, rating }
 *  - socket {Object} Connected Socket.io client instance
 *  - onTransitionToArena {Function} Optional callback when match transitions to Arena state
 */
export function MatchmakingLobby({
  room = { id: 'ARENA-LOBBY', hostId: 'user-1', players: [] },
  currentUser = { id: 'user-1', username: 'YOU' },
  socket = null,
  onTransitionToArena = () => {},
}) {
  const [errorMessage, setErrorMessage] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Derive host status by checking currentUser.id === room.hostId
  const roomId = room?.id || room?.roomId || room?.roomCode || 'LOBBY-01';
  const hostId = room?.hostId || room?.host_id;
  const isHost = Boolean(
    currentUser?.id && hostId && String(currentUser.id) === String(hostId)
  );

  const players = room?.players || [];
  const hasEnoughPlayers = players.length >= 2;

  // Real-time WebSocket Event Listeners for match start transition & errors
  useEffect(() => {
    if (!socket) return;

    // Join socket room mapping if not joined
    socket.emit('join_room', { roomId });

    const handleMatchStarted = (data) => {
      console.log('[MatchmakingLobby] match_started event received:', data);
      
      // Verify match_started payload belongs to this room
      const payloadRoomId = data?.roomId || data?.roomCode;
      if (!payloadRoomId || String(payloadRoomId) === String(roomId)) {
        setIsStarting(false);
        onTransitionToArena(data);
      }
    };

    const handleMatchError = (data) => {
      console.warn('[MatchmakingLobby] match_error event received:', data);
      setIsStarting(false);
      setErrorMessage(data?.message || 'Failed to start match.');
    };

    socket.on('match_started', handleMatchStarted);
    socket.on('match_error', handleMatchError);

    return () => {
      socket.off('match_started', handleMatchStarted);
      socket.off('match_error', handleMatchError);
    };
  }, [socket, roomId, onTransitionToArena]);

  /**
   * Host Start Click Handler
   * Emits 'request_start_match' to the WebSocket server
   */
  const handleStartClick = () => {
    if (!isHost) {
      setErrorMessage('Only the lobby host can start the match.');
      return;
    }

    if (!hasEnoughPlayers) {
      setErrorMessage('Waiting for a challenger to join before starting.');
      return;
    }

    setErrorMessage('');
    setIsStarting(true);

    if (socket) {
      socket.emit('request_start_match', {
        roomId: roomId,
        userId: currentUser?.id || currentUser?.userId || 'placeholder-user-id',
      });
    } else {
      // Fallback transition if socket is disconnected in offline preview
      setTimeout(() => {
        setIsStarting(false);
        onTransitionToArena({ roomId });
      }, 500);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-[#111113] border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl text-zinc-100 flex flex-col gap-6 select-none font-sans">
      
      {/* Lobby Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Swords size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold uppercase tracking-wider text-white font-mono flex items-center gap-2">
              <span>LOBBY // {roomId}</span>
              {isHost && (
                <span className="text-[10px] bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 px-2 py-0.5 rounded font-mono uppercase tracking-widest">
                  HOST
                </span>
              )}
            </h2>
            <p className="text-xs text-zinc-400 font-mono">
              1v1 Defusal Matchmaking Chamber
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-zinc-950/60 border border-zinc-800 px-3 py-1.5 rounded-lg">
          <Clock size={14} className="text-indigo-400 animate-pulse" />
          <span className="text-zinc-400">STATUS:</span>
          <span className="text-emerald-400 font-bold uppercase">
            {hasEnoughPlayers ? 'PRIMED & READY' : 'WAITING FOR PLAYERS'}
          </span>
        </div>
      </div>

      {/* Error Alert Display */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs font-mono">
          <AlertCircle size={16} className="shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Players Roster */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Host Profile Card */}
        <div className="p-5 rounded-xl bg-zinc-950/60 border border-indigo-500/30 flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-indigo-500 flex items-center justify-center font-mono font-black text-indigo-300 text-lg">
              {(players[0]?.username || currentUser?.username || 'P1').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-sm uppercase">
                  {players[0]?.username || currentUser?.username || 'HOST'}
                </span>
                <span className="text-[9px] bg-indigo-950 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.2 rounded font-mono font-semibold">
                  HOST
                </span>
              </div>
              {players[0]?.rating != null && (
                <span className="text-xs text-zinc-500 font-mono block">
                  {players[0].rating} ELO
                </span>
              )}
            </div>
          </div>
          <CheckCircle2 size={18} className="text-indigo-400" />
        </div>

        {/* Challenger Profile Card */}
        <div
          className={`p-5 rounded-xl bg-zinc-950/60 border flex items-center justify-between relative overflow-hidden ${
            players.length >= 2
              ? 'border-red-500/30'
              : 'border-zinc-800/80 border-dashed'
          }`}
        >
          {players.length >= 2 ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-zinc-800 border border-red-500 flex items-center justify-center font-mono font-black text-red-300 text-lg">
                  {players[1]?.username?.substring(0, 2).toUpperCase() || 'P2'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-sm uppercase">
                      {players[1]?.username || 'CHALLENGER'}
                    </span>
                    <span className="text-[9px] bg-red-950 text-red-400 border border-red-500/30 px-1.5 py-0.2 rounded font-mono font-semibold">
                      GUEST
                    </span>
                  </div>
                  {players[1]?.rating != null && (
                    <span className="text-xs text-zinc-500 font-mono block">
                      {players[1].rating} ELO
                    </span>
                  )}
                </div>
              </div>
              <CheckCircle2 size={18} className="text-red-400" />
            </>
          ) : (
            <div className="flex items-center gap-3 text-zinc-500 font-mono text-xs w-full justify-center py-2">
              <Users size={18} className="animate-pulse" />
              <span>WAITING FOR CHALLENGER...</span>
            </div>
          )}
        </div>

      </div>

      {/* Host Controls & Guest Status */}
      <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
          <Shield size={14} className="text-indigo-400" />
          <span>PERMISSIONS: {isHost ? 'HOST CONTROL ACTIVE' : 'GUEST READ-ONLY'}</span>
        </div>

        {/* Start Match Action Button */}
        {isHost ? (
          <button
            onClick={handleStartClick}
            disabled={!hasEnoughPlayers || isStarting}
            className={`px-8 py-3.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-lg ${
              hasEnoughPlayers && !isStarting
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-indigo-600/30 active:scale-95'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
            }`}
          >
            <Play size={15} fill="currentColor" />
            <span>{isStarting ? 'STARTING MATCH...' : 'START MATCH'}</span>
          </button>
        ) : (
          <div className="px-6 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 font-mono text-xs uppercase tracking-wider flex items-center gap-2 cursor-not-allowed">
            <Lock size={14} className="text-zinc-500" />
            <span>WAITING FOR HOST TO START MATCH...</span>
          </div>
        )}

      </div>

    </div>
  );
}

export default MatchmakingLobby;
