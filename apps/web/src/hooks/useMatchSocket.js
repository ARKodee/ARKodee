// src/hooks/useMatchSocket.js
// Custom WebSocket listener & problem pre-loader hook for 1v1 Arena.

import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../store/AuthContext';

/**
 * Default fallback problems if backend emits incomplete problem payload
 */
export const DEFAULT_ARENA_PROBLEMS = [
  {
    id: 'p1',
    title: 'Two Sum Defusal',
    difficulty: 'EASY',
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
    constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
    input_format: 'First line contains n and target.\nSecond line contains n space-separated integers.',
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
    description: 'Given the roots of two binary trees `root` and `subRoot`, return `true` if there is a subtree of `root` with the same structure and node values of `subRoot` and `false` otherwise.',
    constraints: 'The number of nodes in root is in [1, 2000].\n-10^4 <= Node.val <= 10^4',
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
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
    input_format: 'First line contains n. Second line contains n integers.',
    output_format: 'Print the maximum subarray sum.',
    sample_input: ['9\n-2 1 -3 4 -1 2 1 -5 4'],
    sample_output: ['6'],
    time_limit_ms: 1000,
    memory_limit_mb: 128,
  },
  {
    id: 'p4',
    title: 'Network Core Flow (Hard)',
    difficulty: 'HARD',
    description: 'There are `n` servers numbered `0` to `n - 1` and an array `edges` where `edges[i] = [from, to, weight]`. Find the critical path with maximum throughput constraint under latency bounds.',
    constraints: '2 <= n <= 10^5\n1 <= edges.length <= 2 * 10^5',
    input_format: 'Standard graph adjacency specification.',
    output_format: 'Single maximum bottleneck capacity integer.',
    sample_input: ['4 5\n0 1 10\n1 2 15\n0 2 5\n2 3 10\n1 3 20'],
    sample_output: ['15'],
    time_limit_ms: 3000,
    memory_limit_mb: 512,
  },
];

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

    const activeUserId = user?.id || user?.userId || 'user-1';
    const activeUsername = user?.firstName || user?.username || user?.name || user?.email?.split('@')[0] || 'Player';

    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    const socket = io(socketUrl, {
      query: {
        token: token || `token_${activeUserId}`,
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
      
      const loadedProblems = payload?.problems && Array.isArray(payload.problems) && payload.problems.length >= 4
        ? payload.problems
        : DEFAULT_ARENA_PROBLEMS;
        
      setProblems(loadedProblems);
      setIsMatchReady(true);
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
    };

    socket.on('match_ready', handleMatchStartedOrReady);
    socket.on('match_started', handleMatchStartedOrReady);

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

    socket.on('connect_error', (err) => {
      console.warn('[useMatchSocket] Connection error (using fallback preloads):', err.message);
      setConnectionState('ERROR');
      setProblems(DEFAULT_ARENA_PROBLEMS);
      setIsMatchReady(true);
    });

    return () => {
      socket.disconnect();
    };
  }, [matchId, token, user?.id]);

  /**
   * Request start match signal from host
   */
  const requestStartMatch = useCallback(() => {
    const activeUserId = user?.id || user?.userId || 'placeholder-user-id';
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
    const activeUserId = user?.id || user?.userId || 'placeholder-user-id';
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
    // Pre-populate fallback problems immediately if not already set
    if (problems.length === 0) {
      setProblems(DEFAULT_ARENA_PROBLEMS);
      setIsMatchReady(true);
    }
  }, [matchId, user?.id, problems.length]);

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
    socket: socketRef.current,
  };
}
