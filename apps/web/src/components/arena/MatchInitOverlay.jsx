// src/components/arena/MatchInitOverlay.jsx
// Cinematic Match Initiation Overlay & Countdown Screen for 1v1 Arena

import React, { useState, useEffect, useRef } from 'react';
import { Swords, Shield, Zap, Flame, UserCheck } from 'lucide-react';

/**
 * MatchInitOverlay Component
 *
 * Props:
 *  - userA {Object} Current authenticated user profile { username, rating, avatar }
 *  - userB {Object} Opponent user profile { username, rating, avatar }
 *  - onHandoff {Function} Callback invoked when countdown reaches zero and overlay completes fade-out
 *  - isFadingOut {boolean} Controlled fade-out state flag
 */
export function MatchInitOverlay({
  userA = { username: 'PLAYER 1', rating: null },
  userB = { username: 'OPPONENT', rating: null },
  onHandoff = () => {},
}) {
  const [phase, setPhase] = useState('ENTRANCE'); // 'ENTRANCE' | 'COUNTDOWN' | 'HANDOFF'
  const [countdown, setCountdown] = useState(3);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const audioPlayedRef = useRef(false);

  // Triggered when player card entrance animation ends
  const handleCardAnimationEnd = () => {
    if (phase === 'ENTRANCE') {
      setPhase('COUNTDOWN');
    }
  };

  // Fallback timer for card entrance if onAnimationEnd doesn't fire
  useEffect(() => {
    const timer = setTimeout(() => {
      if (phase === 'ENTRANCE') {
        setPhase('COUNTDOWN');
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [phase]);

  // Countdown timer logic (3 -> 2 -> 1 -> 0 -> Handoff)
  useEffect(() => {
    if (phase !== 'COUNTDOWN') return;

    // NOTE: Sound effect can be added here using new Audio('/sounds/countdown_beep.mp3').play();
    if (!audioPlayedRef.current) {
      audioPlayedRef.current = true;
    }

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Countdown reached 0 -> initiate fade-out & handoff to ACTIVE state
      setIsFadingOut(true);

      // NOTE: Final GO sound effect can be added here using new Audio('/sounds/match_start.mp3').play();

      const handoffTimer = setTimeout(() => {
        onHandoff();
      }, 400); // 400ms fade-out transition

      return () => clearTimeout(handoffTimer);
    }
  }, [phase, countdown, onHandoff]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0c]/85 backdrop-blur-[10px] transition-all duration-500 overflow-hidden select-none ${
        isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Inline styles for custom entrance keyframe animations */}
      <style>{`
        @keyframes slideInLeft {
          0% { transform: translateX(-120%) scale(0.9); opacity: 0; }
          70% { transform: translateX(5%) scale(1.02); opacity: 1; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes slideInRight {
          0% { transform: translateX(120%) scale(0.9); opacity: 0; }
          70% { transform: translateX(-5%) scale(1.02); opacity: 1; }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }
        @keyframes vsPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.6)); }
          50% { transform: scale(1.15); filter: drop-shadow(0 0 30px rgba(239, 68, 68, 0.9)); }
        }
        @keyframes numScale {
          0% { transform: scale(2.2); opacity: 0; }
          30% { transform: scale(1); opacity: 1; }
          80% { transform: scale(0.95); opacity: 1; }
          100% { transform: scale(0.7); opacity: 0; }
        }
        .anim-card-left {
          animation: slideInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-card-right {
          animation: slideInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-vs-icon {
          animation: vsPulse 2s infinite ease-in-out;
        }
        .anim-countdown-num {
          animation: numScale 0.95s ease-out forwards;
        }
      `}</style>

      {/* Top Banner Tag */}
      <div className="absolute top-12 flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-900/80 border border-indigo-500/30 text-indigo-400 font-mono text-xs uppercase tracking-widest shadow-lg shadow-indigo-950/40">
        <Zap size={14} className="animate-pulse text-indigo-400" />
        <span>1v1 Tactical Defusal Matchmaking</span>
      </div>

      {/* Center Stage: Player Cards & VS Emblem */}
      <div className="w-full max-w-5xl px-6 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4 relative">
        
        {/* User A Card (Left) */}
        <div
          onAnimationEnd={handleCardAnimationEnd}
          className="anim-card-left w-full md:w-80 p-6 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-[#111113] border border-indigo-500/30 shadow-2xl shadow-indigo-950/50 flex flex-col items-center text-center relative overflow-hidden group"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-indigo-500 flex items-center justify-center text-2xl font-black text-white font-mono shadow-inner shadow-indigo-500/40">
              {userA.username?.substring(0, 2).toUpperCase() || 'P1'}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-indigo-600 p-1 rounded-full text-white">
              <UserCheck size={12} />
            </div>
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight uppercase font-mono">
            {userA.username || 'PLAYER 1'}
          </h3>
          
          <div className="mt-1 flex items-center gap-1.5 text-xs text-indigo-400 font-mono font-semibold">
            <Shield size={13} />
            <span>{userA.rating || 1482} ELO</span>
          </div>

          <div className="mt-4 w-full py-1.5 bg-indigo-950/40 border border-indigo-500/20 rounded text-[10px] font-mono text-indigo-300 uppercase tracking-wider">
            READY // LOCAL OPERATIVE
          </div>
        </div>

        {/* Center VS Icon & Status */}
        <div className="flex flex-col items-center justify-center my-2 md:my-0 z-10">
          <div className="anim-vs-icon w-16 h-16 rounded-full bg-zinc-950 border-2 border-red-500/50 flex items-center justify-center text-red-500 font-black text-xl font-mono shadow-xl shadow-red-950/60">
            VS
          </div>
        </div>

        {/* User B Card (Right) */}
        <div
          className="anim-card-right w-full md:w-80 p-6 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-[#111113] border border-red-500/30 shadow-2xl shadow-red-950/50 flex flex-col items-center text-center relative overflow-hidden group"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-red-500 flex items-center justify-center text-2xl font-black text-white font-mono shadow-inner shadow-red-500/40">
              {userB.username?.substring(0, 2).toUpperCase() || 'P2'}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-red-600 p-1 rounded-full text-white">
              <Flame size={12} />
            </div>
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight uppercase font-mono">
            {userB.username || 'OPPONENT'}
          </h3>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-red-400 font-mono font-semibold">
            <Shield size={13} />
            <span>{userB.rating != null ? `${userB.rating} ELO` : 'UNRANKED'}</span>
          </div>

          <div className="mt-4 w-full py-1.5 bg-red-950/40 border border-red-500/20 rounded text-[10px] font-mono text-red-300 uppercase tracking-wider">
            LOCKED // OPPONENT CONNECTED
          </div>
        </div>

      </div>

      {/* Countdown Display Area */}
      <div className="h-32 mt-8 flex flex-col items-center justify-center">
        {phase === 'COUNTDOWN' && countdown > 0 && (
          <div key={countdown} className="anim-countdown-num flex flex-col items-center">
            <span className="text-7xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-200 to-indigo-500 drop-shadow-[0_0_35px_rgba(99,102,241,0.8)]">
              {countdown}
            </span>
            <span className="mt-2 text-xs font-mono tracking-widest text-zinc-400 uppercase">
              PREPARING ARENA WORKSPACE
            </span>
          </div>
        )}

        {(phase === 'HANDOFF' || countdown === 0) && (
          <div className="flex flex-col items-center animate-bounce">
            <span className="text-6xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-rose-300 to-amber-400 drop-shadow-[0_0_40px_rgba(239,68,68,0.9)]">
              GO!
            </span>
            <span className="mt-2 text-xs font-mono tracking-widest text-red-400 uppercase font-bold">
              ENGAGING COMBAT ENVIRONMENT
            </span>
          </div>
        )}

        {phase === 'ENTRANCE' && (
          <div className="flex items-center gap-3 text-zinc-400 font-mono text-xs uppercase tracking-wider animate-pulse">
            <Swords size={16} className="text-indigo-400" />
            <span>MATCH IDENTIFIED // INITIALIZING OPERATIVE PROFILES...</span>
          </div>
        )}
      </div>

    </div>
  );
}
