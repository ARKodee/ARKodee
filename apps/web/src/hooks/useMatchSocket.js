// src/hooks/useMatchSocket.js
// Custom WebSocket listener & problem pre-loader hook for 1v1 Arena.

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../store/AuthContext';


/**
 * useMatchSocket Hook
 *
 * @param {string} matchId - Unique identifier of the 1v1 match
 * @returns {Object} Socket connection state, preloaded problem payload, and match controls
 */
export function useMatchSocket(matchId) {
  const { token, user } = useAuth();
  
  const [problems, setProblems] = useState([]);
  const [isMatchReady, setIsMatchReady] = useState(false);
  const [isMatchStarted, setIsMatchStarted] = useState(false);
  const [isArenaDissolved, setIsArenaDissolved] = useState(false);
  const [hostId, setHostId] = useState(null);
  const [opponentProfile, setOpponentProfile] = useState({
    username: 'OPPONENT',
    rating: null,
    avatar: null,
    score: 0,
    solvedCount: 0,
  });
  const [opponentProgress, setOpponentProgress] = useState({});
  const [isEditorLocked, setIsEditorLocked] = useState(false);
  const [connectionState, setConnectionState] = useState('DISCONNECTED');
  const [roomState, setRoomState] = useState(null);
  
  // Real-time Combat telemetry states
  const [startedAt, setStartedAt] = useState(null);
  const [myScore, setMyScore] = useState(0);
  const [myAp, setMyAp] = useState(20);
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentAp, setOpponentAp] = useState(20);
  const [activeSabotage, setActiveSabotage] = useState(null);
  const [sabotageTimeLeft, setSabotageTimeLeft] = useState(0);
  const [myShieldActiveUntil, setMyShieldActiveUntil] = useState(0);
  const [matchFinishedData, setMatchFinishedData] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const socketRef = useRef(null);

  // Handle active sabotage countdown tick
  useEffect(() => {
    if (sabotageTimeLeft <= 0) {
      if (activeSabotage) {
        setActiveSabotage(null);
        if (activeSabotage === 'monaco-jam') {
          setIsEditorLocked(false);
        }
      }
      return;
    }
    const timer = setInterval(() => {
      setSabotageTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [sabotageTimeLeft, activeSabotage]);

  useEffect(() => {
    if (!matchId) return;

    const activeUserId = user?.id || user?.userId;
    const activeUsername = user?.firstName || user?.username || user?.name || user?.email?.split('@')[0] || 'Player';

    // Don't connect if no real token or user id — prevents unauthenticated socket sessions
    if (!token || !activeUserId) {
      setConnectionState('ERROR');
      return;
    }

    const socketUrl = import.meta.env.VITE_WS_URL || 'http://127.0.0.1:3000';
    const socket = io(socketUrl, {
      query: {
        token,
        matchId,
        userId: activeUserId,
        username: activeUsername,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;
    setConnectionState('CONNECTING');

    socket.on('connect', () => {
      console.log(`[useMatchSocket] Socket connected for match ${matchId}`);
      setConnectionState('CONNECTED');

      // Notify backend client is ready for match initialization
      socket.emit('client_ready', { matchId, userId: user?.id });
    });

    socket.on('disconnect', () => {
      console.log(`[useMatchSocket] Socket disconnected`);
      setConnectionState('DISCONNECTED');
    });

    const handleMatchStartedOrReady = (payload) => {
      console.log('[useMatchSocket] Match payload received:', payload);
      
      const hasProblems = payload?.problems && Array.isArray(payload.problems) && payload.problems.length > 0;
      
      if (hasProblems) {
        setProblems(payload.problems);
        setIsMatchReady(true);
      } else {
        setIsMatchReady(false);
      }
      setIsMatchStarted(true);

      if (payload?.startedAt) {
        setStartedAt(payload.startedAt);
      }

      if (payload?.hostId) {
        setHostId(payload.hostId);
      } else if (payload?.players && Array.isArray(payload.players) && payload.players.length > 0) {
        setHostId(payload.players[0].userId);
      }

      // Read initial scores/AP from payload players list
      if (payload?.players && Array.isArray(payload.players)) {
        const me = payload.players.find((p) => String(p.userId) === String(user?.id));
        const opp = payload.players.find((p) => String(p.userId) !== String(user?.id));
        
        if (me) {
          setMyScore(me.score || 0);
          setMyAp(me.ap || 20);
        }
        if (opp) {
          setOpponentScore(opp.score || 0);
          setOpponentAp(opp.ap || 20);
          setOpponentProfile({
            username: opp.username || 'OPPONENT',
            rating: opp.rating || null,
            avatar: opp.avatar || null,
            score: opp.score || 0,
            solvedCount: Object.keys(opp.solvedProblems || {}).filter(k => opp.solvedProblems[k]).length,
          });
        }
      }

      setRoomState(payload);
    };

    socket.on('match_ready', handleMatchStartedOrReady);
    socket.on('match_started', handleMatchStartedOrReady);
    
    socket.on('match_starting', (payload) => {
      console.log('[useMatchSocket] Match starting signal received:', payload);
      setIsMatchStarted(true);
    });

    socket.on('room_updated', (updatedRoom) => {
      console.log('[useMatchSocket] room_updated received:', updatedRoom);
      if (updatedRoom.startedAt) {
        setStartedAt(updatedRoom.startedAt);
      }
      if (updatedRoom.players && Array.isArray(updatedRoom.players)) {
        const me = updatedRoom.players.find((p) => String(p.userId) === String(user?.id));
        const opp = updatedRoom.players.find((p) => String(p.userId) !== String(user?.id));
        
        if (me) {
          setMyScore(me.score || 0);
          setMyAp(me.ap || 20);
          setMyShieldActiveUntil(me.shieldActiveUntil || 0);
        }
        if (opp) {
          setOpponentScore(opp.score || 0);
          setOpponentAp(opp.ap || 20);
          setOpponentProfile({
            username: opp.username || 'OPPONENT',
            rating: opp.rating || null,
            avatar: opp.avatar || null,
            score: opp.score || 0,
            solvedCount: Object.keys(opp.solvedProblems || {}).filter(k => opp.solvedProblems[k]).length,
          });
          setOpponentProgress(opp.solvedProblems || {});
        }
      }
      setRoomState(updatedRoom);
    });

    socket.on('opponent_sabotaged', (payload) => {
      console.log('[useMatchSocket] Sabotage received:', payload);
      const sabType = payload.type;
      const durationSec = Math.ceil((payload.durationMs || 5000) / 1000);
      
      setActiveSabotage(sabType);
      setSabotageTimeLeft(durationSec);

      if (sabType === 'monaco-jam') {
        setIsEditorLocked(true);
      }
      setToastMessage(`⚠️ Opponent cast ${sabType.toUpperCase()} on you for ${durationSec}s!`);
    });

    socket.on('sabotage_blocked', (payload) => {
      setToastMessage(`🛡️ Attack Blocked: ${payload.message || 'Opponent has active shield.'}`);
    });

    socket.on('reduce_sabotage', () => {
      setSabotageTimeLeft((prev) => Math.max(0, Math.floor(prev / 2)));
      setToastMessage(`✨ Cleanse activated! Sabotage duration reduced by 50%.`);
    });

    socket.on('match_finished', (payload) => {
      console.log('[useMatchSocket] match_finished received:', payload);
      setMatchFinishedData(payload);
    });

    socket.on('arena_lobby_dissolved', (payload) => {
      console.log('[useMatchSocket] arena_lobby_dissolved received:', payload);
      setIsArenaDissolved(true);
    });

    socket.on('match_error', (payload) => {
      console.warn('[useMatchSocket] match_error received:', payload?.message);
      setConnectionState('ERROR');
      setToastMessage(`⚠️ ${payload?.message || 'Match error. Room may have expired.'}`);
    });

    socket.on('connect_error', (err) => {
      console.warn('[useMatchSocket] Connection error:', err.message);
      setConnectionState('ERROR');
      // Do NOT load fake problems — let the UI show a proper error/reconnect state
    });

    return () => {
      socket.disconnect();
    };
  }, [matchId, token, user?.id]);

  /**
   * Request start match signal from host
   */
  const requestStartMatch = useCallback(() => {
    const activeUserId = user?.id || user?.userId;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('request_start_match', {
        roomId: matchId,
        roomCode: matchId,
        userId: activeUserId,
      });
      socketRef.current.emit('start_custom_match', {
        roomId: matchId,
        roomCode: matchId,
        userId: activeUserId,
      });
    }
  }, [matchId, user?.id, user?.userId]);

  /**
   * Leave arena lobby signal (dissolves match for both host & guest)
   */
  const leaveArenaLobby = useCallback(() => {
    const activeUserId = user?.id || user?.userId;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('leave_arena_lobby', {
        matchId,
        roomId: matchId,
        userId: activeUserId,
      });
    }
  }, [matchId, user?.id, user?.userId]);

  /**
   * Initiate match signal to backend socket
   */
  const initiateMatch = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('initiate_match', { matchId, userId: user?.id });
    }
    // Problems come from the server via match_ready — do not pre-populate with fallbacks
  }, [matchId, user?.id]);

  /**
   * Emit code submission progress
   */
  const sendSubmission = useCallback((problemId, status, code) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('submit_code', { matchId, problemId, status, code });
    }
  }, [matchId]);

  /**
   * Emit sabotage move to opponent
   */
  const sendSabotage = useCallback((sabotageType) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('use_sabotage', { matchId, sabotageType });
    }
  }, [matchId]);

  /**
   * Emit shield activation
   */
  const sendShield = useCallback((shieldType) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('use_shield', { matchId, shieldType });
    }
  }, [matchId]);

  return {
    problems,
    isMatchReady,
    isMatchStarted,
    isArenaDissolved,
    hostId,
    opponentProfile,
    opponentProgress,
    isEditorLocked,
    connectionState,
    requestStartMatch,
    leaveArenaLobby,
    initiateMatch,
    sendSubmission,
    sendSabotage,
    sendShield,
    startedAt,
    myScore,
    myAp,
    opponentScore,
    opponentAp,
    activeSabotage,
    sabotageTimeLeft,
    myShieldActiveUntil,
    matchFinishedData,
    toastMessage,
    setToastMessage,
    roomState,
    socket: socketRef.current,
  };
}
