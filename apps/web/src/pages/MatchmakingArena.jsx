import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../store/AuthContext';
import { PastMatchesList } from '../components/arena/PastMatchesList';
import { MatchmakerControls } from '../components/arena/MatchmakerControls';
import { CustomRoomModal } from '../components/arena/CustomRoomModal';
import { Swords, Trophy } from 'lucide-react';

export function MatchmakingArena() {
  const { token, user } = useAuth();

  // Modal visibility flag
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Socket reference
  const socketRef = useRef(null);

  // Past matches data (will be fetched from API later)
  const pastMatches = [
    { id: 1, mode: '1v1 Ranked', status: 'Victory', eloDelta: '+18 ELO', date: '2026-07-09' },
    { id: 2, mode: '1v1 Ranked', status: 'Defeat', eloDelta: '-15 ELO', date: '2026-07-08' },
    { id: 3, mode: 'Custom Arena', status: 'Victory', eloDelta: '0 ELO (Unranked)', date: '2026-07-07' },
    { id: 4, mode: '1v1 Ranked', status: 'Victory', eloDelta: '+22 ELO', date: '2026-07-05' },
    { id: 5, mode: '1v1 Ranked', status: 'Victory', eloDelta: '+14 ELO', date: '2026-07-04' },
    { id: 6, mode: '1v1 Ranked', status: 'Defeat', eloDelta: '-11 ELO', date: '2026-07-02' }
  ];

  // Initialize socket.io-client connection
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_WS_URL || 'http://localhost:3000';
    const activeUserId = user?.id || user?.userId || 'user-1';
    const activeUsername = user?.username || user?.name || user?.email?.split('@')[0] || 'Player';
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
  }, [token]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">

      {/* Header Status Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-md border border-indigo-500/20 text-indigo-400">
            <Swords size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white uppercase">
              Combat Headquarters
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono">
              NODE GATEWAY: ONLINE // USER: {user?.username?.toUpperCase()}
            </p>
          </div>
        </div>

        {/* ELO Badge */}
        <div className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800 rounded-md px-4 py-2">
          <Trophy size={16} className="text-indigo-400" />
          <div className="font-mono">
            <span className="text-[9px] block text-zinc-500 uppercase tracking-widest leading-none">
              Global ELO
            </span>
            <span className="text-xs font-black text-indigo-400 mt-0.5 block leading-none">
              1,482 pts
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left section (Span 2): Matchmaker Controls */}
        <div className="lg:col-span-2">
          <MatchmakerControls
            onOpenCustomModal={() => setIsModalOpen(true)}
          />
        </div>

        {/* Right section (Span 1): Past Matches Ledger */}
        <div className="lg:col-span-1">
          <PastMatchesList matches={pastMatches} />
        </div>

      </div>

      {/* Conditional Modal Mount */}
      {isModalOpen && (
        <CustomRoomModal
          socket={socketRef.current}
          user={user}
          onClose={() => setIsModalOpen(false)}
        />
      )}

    </div>
  );
}

export default MatchmakingArena;
