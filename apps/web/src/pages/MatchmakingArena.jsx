// src/pages/MatchmakingArena.jsx
// Matchmaking Arena Page — 1v1 matchmaking lobby
// Uses design system tokens, no Tailwind
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../store/AuthContext';
import { Swords, Trophy } from 'lucide-react';
import { MatchmakerControls } from '../components/arena/MatchmakerControls';
import { PastMatchesList } from '../components/arena/PastMatchesList';
import { CustomRoomModal } from '../components/arena/CustomRoomModal';
import { getDuelHistory, getUserProfile } from '../lib/auth';
import './MatchmakingArena.css';

export function MatchmakingArena() {
  const { token, user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const socketRef = useRef(null);

  // Past matches data (fetched from Python backend API)
  const [pastMatches, setPastMatches] = useState([]);
  const [eloRating, setEloRating] = useState(1200);

  useEffect(() => {
    getDuelHistory()
      .then((data) => {
        setPastMatches(data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch duel history:', err);
      });

    getUserProfile()
      .then((profile) => {
        if (profile && profile.duelRating !== undefined) {
          setEloRating(profile.duelRating);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch profile stats:', err);
      });
  }, []);

  // Initialize socket connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_WS_URL || 'http://127.0.0.1:3000';
    const activeUserId = user?.id || user?.userId || 'user-1';
    const activeUsername = user?.firstName || user?.username || user?.name || user?.email?.split('@')[0] || 'Player';

    const socket = io(socketUrl, {
      query: {
        token: token || `token_${activeUserId}`,
        userId: activeUserId,
        username: activeUsername,
      },
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('MatchmakingArena: Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('MatchmakingArena: Socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user]);

  return (
    <div className="ma-root">
      <div className="ma-body">
        {/* Header */}
        <header className="ma-header">
          <div className="ma-header-left">
            <div className="ma-header-icon">
              <Swords size={20} />
            </div>
            <div>
              <h1 className="ma-title">Combat Headquarters</h1>
              <p className="ma-subtitle">NODE GATEWAY: ONLINE // USER: {(user?.firstName || user?.username || 'Guest').toUpperCase()}</p>
            </div>
          </div>
          <div className="ma-elo-badge">
            <Trophy size={16} />
            <div className="ma-elo-label">
              <span className="ma-elo-label-text">Global ELO</span>
              <span className="ma-elo-value">{eloRating.toLocaleString()} pts</span>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="ma-grid">
          {/* Left: Matchmaker Controls */}
          <div className="ma-controls">
            <MatchmakerControls
              onOpenCustomModal={() => setIsModalOpen(true)}
            />
          </div>

          {/* Right: Past Matches */}
          <div className="ma-past-matches">
            <PastMatchesList matches={pastMatches} />
          </div>
        </div>

        {/* Custom Room Modal */}
        {isModalOpen && (
          <CustomRoomModal
            socket={socketRef.current}
            user={user}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

export default MatchmakingArena;