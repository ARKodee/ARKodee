import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Users, Swords, X } from 'lucide-react';

export function MatchmakerControls({ socket, onOpenCustomModal }) {
  const navigate = useNavigate();
  const [queueState, setQueueState] = useState('IDLE'); // IDLE | QUEUED | FOUND
  const [searchElapsed, setSearchElapsed] = useState(0);
  const [matchInfo, setMatchInfo] = useState(null); // { roomId, opponent }
  const timerRef = useRef(null);

  const formatSearchTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Wire socket events
  useEffect(() => {
    if (!socket) return;

    const handleQueueStatus = ({ status }) => {
      if (status === 'QUEUED') {
        setQueueState('QUEUED');
      } else if (status === 'IDLE') {
        setQueueState('IDLE');
        setSearchElapsed(0);
      }
    };

    const handleMatchFound = ({ roomId, opponent }) => {
      setMatchInfo({ roomId, opponent });
      setQueueState('FOUND');
      clearInterval(timerRef.current);
    };

    socket.on('queue_status', handleQueueStatus);
    socket.on('match_found', handleMatchFound);

    return () => {
      socket.off('queue_status', handleQueueStatus);
      socket.off('match_found', handleMatchFound);
    };
  }, [socket]);

  // Elapsed timer while searching
  useEffect(() => {
    clearInterval(timerRef.current);
    if (queueState === 'QUEUED') {
      setSearchElapsed(0);
      timerRef.current = setInterval(() => setSearchElapsed(p => p + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [queueState]);

  // Auto-navigate once match is found
  useEffect(() => {
    if (queueState === 'FOUND' && matchInfo?.roomId) {
      // Brief 1.5s to show "Match Found!" before redirecting
      const t = setTimeout(() => {
        navigate(`/arena/${matchInfo.roomId}`);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [queueState, matchInfo, navigate]);

  const handleJoinQueue = () => {
    if (!socket) return;
    socket.emit('join_queue');
  };

  const handleLeaveQueue = () => {
    if (!socket) return;
    socket.emit('leave_queue');
    setQueueState('IDLE');
    setSearchElapsed(0);
    setMatchInfo(null);
    clearInterval(timerRef.current);
  };

  return (
    <div className="mac-container">
      {/* Mode Configuration Lock Tag */}
      <div className="mac-header">
        <h2 className="mac-title">
          1v1 Arena Defusal Mode
        </h2>
        <p className="mac-desc">
          Deploy to competitive matchmaking arenas to rank up, or launch a
          secure private custom room to challenge code contenders directly in
          real-time.
        </p>
      </div>

      {/* Action Sections */}
      <div className="mac-list">
        {/* Section 1: Public Matchmaking */}
        <div className="mac-section">
          <div className="mac-section-header">
            <Zap
              size={14}
              className={
                queueState === 'QUEUED'
                  ? 'animate-pulse text-red-400'
                  : queueState === 'FOUND'
                  ? 'text-emerald-400'
                  : 'text-indigo-400'
              }
            />
            <span className="mac-section-label">Public Queue</span>
          </div>

          {queueState === 'FOUND' ? (
            <div className="mac-queue-box mac-queue-box--success">
              <div className="mac-queue-status">
                <span className="mac-queue-status-ping mac-queue-status-ping--success" />
                <span className="mac-queue-status-text mac-queue-status-text--success">
                  Match Found!
                </span>
              </div>
              <span className="mac-queue-timer">
                vs <strong>{matchInfo?.opponent?.username || 'Opponent'}</strong> — Entering arena...
              </span>
            </div>
          ) : queueState === 'QUEUED' ? (
            <div className="mac-queue-box">
              <div className="mac-queue-status">
                <span className="mac-queue-status-ping" />
                <span className="mac-queue-status-text">
                  Searching for opponent...
                </span>
              </div>
              <span className="mac-queue-timer">
                [{formatSearchTime(searchElapsed)}]
              </span>
              <div className="mac-queue-actions">
                <button onClick={handleLeaveQueue} className="mac-btn-danger w-full">
                  <X size={12} /> Cancel Queue
                </button>
              </div>
            </div>
          ) : (
            <button onClick={handleJoinQueue} className="mac-btn-large" disabled={!socket}>
              <Zap size={14} />
              <span>Find &amp; Start 1v1 Match</span>
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="mac-divider" />

        {/* Section 2: Custom Private Lobby */}
        <div className="mac-section">
          <div className="mac-section-header">
            <Users size={14} className="text-purple-400" />
            <span className="mac-section-label">Private Lobby</span>
          </div>

          <button
            onClick={onOpenCustomModal}
            className="mac-btn-large-outline"
            disabled={queueState === 'QUEUED'}
          >
            Configure Private Custom Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
