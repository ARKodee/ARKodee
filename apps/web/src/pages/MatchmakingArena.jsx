// src/pages/MatchmakingArena.jsx
import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../store/AuthContext';
import { MatchmakerControls } from '../components/arena/MatchmakerControls';
import { PastMatchesList } from '../components/arena/PastMatchesList';
import { CustomRoomModal } from '../components/arena/CustomRoomModal';
import { getDuelHistory, getUserProfile } from '../lib/auth';
import { Navbar } from '../components/layout/Navbar';
import { Skeleton } from '../components/ui/Skeleton';
import './MatchmakingArena.css';

const RATING_TIERS = [
  { min: 2100, label: 'Grandmaster', color: 'var(--danger)'  },
  { min: 1900, label: 'Master',      color: 'var(--warning)' },
  { min: 1600, label: 'Expert',      color: 'var(--accent)'  },
  { min: 1400, label: 'Specialist',  color: 'var(--info)'    },
  { min: 1200, label: 'Pupil',       color: 'var(--success)' },
  { min: 0,    label: 'Newbie',      color: 'var(--text-muted)' },
];

function getTier(rating = 1200) {
  return RATING_TIERS.find((t) => rating >= t.min) ?? RATING_TIERS[RATING_TIERS.length - 1];
}

/* ── SVG Icons ──────────────────────────────────────────────────────────────── */
const IconSwords  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/><line x1="19" y1="21" x2="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="21" x2="21" y2="7"/></svg>

export function MatchmakingArena() {
  const { token, user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const socketRef = useRef(null);

  const [pastMatches, setPastMatches]   = useState([]);
  const [eloRating, setEloRating]       = useState(1200);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      getDuelHistory(),
      getUserProfile(),
    ]).then(([histRes, profileRes]) => {
      if (histRes.status === 'fulfilled') setPastMatches(histRes.value || []);
      if (profileRes.status === 'fulfilled' && profileRes.value?.duelRating !== undefined) {
        setEloRating(profileRes.value.duelRating);
      }
      setProfileLoading(false);
    });
  }, []);

  // Socket connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_WS_URL || 'http://127.0.0.1:3000';
    const activeUserId = user?.id || user?.userId || 'user-1';
    const activeUsername = user?.firstName || user?.username || user?.name || user?.email?.split('@')[0] || 'Player';

    const socket = io(socketUrl, {
      query: { token: token || `token_${activeUserId}`, userId: activeUserId, username: activeUsername },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [token, user]);

  const tier = getTier(eloRating);
  const username = user?.username || user?.name || user?.email?.split('@')[0] || 'Player';
  const initial  = username[0].toUpperCase();

  return (
    <div className="ma-root">
      <Navbar />

      <div className="ma-body">
        {/* Page header */}
        <header className="ma-header">
          <h1 className="ma-title">
            <span className="ma-title-icon"><IconSwords /></span>
            1v1 Arena
          </h1>
          <p className="ma-subtitle">
            Real-time ranked matchmaking. Challenge other players, earn ELO, and climb the ladder.
          </p>
        </header>

        {/* Main grid */}
        <div className="ma-grid">

          {/* Left — profile + controls */}
          <div className="ma-controls">

            {/* Profile card */}
            <div className="ma-profile-card">
              <div className="ma-profile-avatar">{initial}</div>
              <div className="ma-profile-details">
                <span className="ma-profile-title">Signed in as</span>
                {profileLoading
                  ? <Skeleton width="120px" height="var(--text-base)" />
                  : <span className="ma-profile-username">{username}</span>
                }
              </div>
              <div className="ma-profile-rank">
                {profileLoading ? (
                  <Skeleton width="60px" height="var(--text-xs)" />
                ) : (
                  <>
                    <span className="ma-profile-tier" style={{ color: tier.color }}>{tier.label}</span>
                    <span className="ma-profile-elo">{eloRating.toLocaleString()} ELO</span>
                  </>
                )}
              </div>
            </div>

            {/* Matchmaker controls (queue, custom room) */}
            <MatchmakerControls onOpenCustomModal={() => setIsModalOpen(true)} />
          </div>

          {/* Right — past matches */}
          <div className="ma-past-matches">
            <PastMatchesList matches={pastMatches} />
          </div>
        </div>

        {/* Custom room modal */}
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